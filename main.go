package main

// about using johnniedoe/contrib/gzip:
// johnniedoe's fork fixes a critical issue for which .String resulted in
// an ERR_DECODING_FAILED. This is an actual pull request on the contrib
// repo, but apparently, gin is dead.

import (
	"encoding/gob"
	"fmt"
	"log/slog"
	"os"
	"sort"
	"strconv"
	"time"

	"math/rand"

	"github.com/RealistikOsu/frontend/routers/pagemappings"
	"github.com/RealistikOsu/frontend/services"
	"github.com/RealistikOsu/frontend/services/cieca"
	"github.com/RealistikOsu/frontend/state"
	"github.com/fatih/structs"
	"github.com/gin-gonic/contrib/sessions"
	"github.com/gin-gonic/gin"
	_ "github.com/go-sql-driver/mysql"
	"github.com/jmoiron/sqlx"
	"github.com/johnniedoe/contrib/gzip"
	"github.com/thehowl/qsql"
	"gopkg.in/mailgun/mailgun-go.v1"
	"gopkg.in/redis.v5"
)

// Services etc
var (
	configMap map[string]interface{}

	CSRF services.CSRF
	db   *sqlx.DB
	qb   *qsql.DB
	mg   mailgun.Mailgun
	rd   *redis.Client
)

func main() {
	logger := slog.New(slog.NewJSONHandler(os.Stdout, nil))

	slog.SetDefault(logger)

	slog.Info("frontend service starting up on", "version", version)

	settings := state.LoadSettings()
	configMap = structs.Map(settings)

	// initialise db
	dsn := fmt.Sprintf("%s:%s@tcp(%s:%d)/%s?parseTime=true",
		settings.DB_USER,
		settings.DB_PASS,
		settings.DB_HOST,
		settings.DB_PORT,
		settings.DB_NAME,
	)

	// initialise db
	var err error
	db, err = sqlx.Open(settings.DB_SCHEME, dsn)
	if err != nil {
		panic(err)
	}
	qb = qsql.New(db.DB)

	// set it to random
	rand.Seed(time.Now().Unix())

	// initialise mailgun
	mg = mailgun.NewMailgun(
		settings.MAILGUN_DOMAIN,
		settings.MAILGUN_API_KEY,
		settings.MAILGUN_PUBLIC_KEY,
	)

	// initialise CSRF service
	CSRF = cieca.NewCSRF()

	if gin.Mode() == gin.DebugMode {
		slog.Info("Development environment detected. Starting fsnotify on template folder...")
		err := reloader()
		if err != nil {
			slog.Error("Failed to start template reload watcher", "error", err.Error())
		}
	}

	// initialise redis
	rd = redis.NewClient(&redis.Options{
		Addr:     fmt.Sprintf("%s:%d", settings.REDIS_HOST, settings.REDIS_PORT),
		Password: settings.REDIS_PASS,
		DB:       settings.REDIS_DB,
	})

	// even if it's not release, we say that it's release
	// so that gin doesn't spam
	gin.SetMode(gin.ReleaseMode)

	gobRegisters := []interface{}{
		[]message{},
		errorMessage{},
		infoMessage{},
		neutralMessage{},
		warningMessage{},
		successMessage{},
	}
	for _, el := range gobRegisters {
		gob.Register(el)
	}

	slog.Info("Importing templates...")
	loadTemplates("")

	slog.Info("Setting up rate limiter...")
	setUpLimiter()

	r := generateEngine()
	slog.Info("Listening on port", "port", settings.APP_PORT)

	err = r.Run(fmt.Sprintf(":%d", settings.APP_PORT))
	if err != nil {
		slog.Error("Failed to start server", "error", err.Error())
		panic(err)
	}
}

func generateEngine() *gin.Engine {
	slog.Info("Starting session system...")
	settings := state.GetSettings()
	var store sessions.Store
	var err error
	if settings.REDIS_MAX_CONNECTIONS != 0 {
		store, err = sessions.NewRedisStore(
			settings.REDIS_MAX_CONNECTIONS,
			settings.REDIS_NETWORK_TYPE,
			fmt.Sprintf("%s:%d", settings.REDIS_HOST, settings.REDIS_PORT),
			settings.REDIS_PASS,
			[]byte(settings.APP_COOKIE_SECRET),
		)
	} else {
		store = sessions.NewCookieStore([]byte(settings.APP_COOKIE_SECRET))
	}

	if err != nil {
		slog.Error("Failed to crreate redis store", "error", err.Error())
		panic(err)
	}

	r := gin.Default()

	r.Use(
		gzip.Gzip(gzip.DefaultCompression),
		pagemappings.CheckRedirect,
		sessions.Sessions("session", store),
		sessionInitializer(),
		rateLimiter(false),
	)

	r.Static("/static", "static")
	r.StaticFile("/favicon.ico", "static/favicon.ico")

	r.POST("/login", loginSubmit)
	r.GET("/logout", logout)

	r.GET("/register", register)
	r.POST("/register", registerSubmit)
	r.GET("/register/verify", verifyAccount)
	r.GET("/register/welcome", welcome)

	r.GET("/clans/create", ccreate)
	r.POST("/clans/create", ccreateSubmit)

	r.GET("/users/:user", userProfile)
	r.GET("/u/:user", func(c *gin.Context) {
		user := c.Param("user")
		c.Redirect(301, "/users/"+user)
	})

	r.GET("/rank_request", func(c *gin.Context) {
		c.Redirect(301, "/rank-request")
	})

	// Redirectors to our old /rx/u /ap/u routes.
	r.GET("/rx/u/:user", func(c *gin.Context) {
		user := c.Param("user")
		c.Redirect(301, "/u/"+user+"?rx=1")
	})
	r.GET("/ap/u/:user", func(c *gin.Context) {
		user := c.Param("user")
		c.Redirect(301, "/u/"+user+"?rx=2")
	})

	r.GET("/b/:bid", func(c *gin.Context) {
		bid := c.Param("bid")
		c.Redirect(301, "/beatmaps/"+bid)
	})

	r.GET("/beatmapsets/:bsetid", func(c *gin.Context) {
		bsetid := c.Param("bsetid")
		data, err := getBeatmapSetData(bsetid)

		if err != nil {
			return
		}

		sort.Slice(data.ChildrenBeatmaps, func(i, j int) bool {
			if data.ChildrenBeatmaps[i].Mode != data.ChildrenBeatmaps[j].Mode {
				return data.ChildrenBeatmaps[i].Mode < data.ChildrenBeatmaps[j].Mode
			}
			return data.ChildrenBeatmaps[i].DifficultyRating < data.ChildrenBeatmaps[j].DifficultyRating
		})

		c.Redirect(301, "/beatmaps/"+strconv.Itoa(data.ChildrenBeatmaps[len(data.ChildrenBeatmaps)-1].ID))
	})

	r.GET("/c/:cid", clanPage)
	r.GET("/beatmaps/:bid", beatmapInfo)

	r.POST("/pwreset", passwordReset)
	r.GET("/pwreset/continue", passwordResetContinue)
	r.POST("/pwreset/continue", passwordResetContinueSubmit)

	r.GET("/settings/password", changePassword)
	r.POST("/settings/password", changePasswordSubmit)
	r.POST("/settings/userpage/parse", parseBBCode)
	r.POST("/settings/avatar", avatarSubmit)
	r.POST("/settings/profbanner/:type", profBackground)
	r.POST("/settings/change-username", changeUsername)

	// Discord integration.
	r.GET("/settings/discord-integration/unlink", discordUnlink)
	r.GET("/settings/discord-integration/redirect", discordRedirCheck)

	r.POST("/settings/clan", createInvite)
	r.POST("settings/clansettings/k", clanKick)
	r.GET("/clans/invite/:inv", clanInvite)
	r.POST("/c/:cid", leaveClan)

	r.GET("/help", func(c *gin.Context) {
		c.Redirect(301, settings.DISCORD_SERVER_URL)
	})

	r.GET("/discord", func(c *gin.Context) {
		c.Redirect(301, settings.DISCORD_SERVER_URL)
	})

	loadSimplePages(r)

	r.NoRoute(notFound)

	return r
}
