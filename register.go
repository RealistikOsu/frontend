package main

import (
	"database/sql"
	"fmt"
	"net/url"
	"strconv"
	"strings"
	"time"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/asaskevich/govalidator"
	"github.com/gin-gonic/gin"
	schiavo "zxq.co/ripple/schiavolib"
)

func register(c *gin.Context) {
	if getContext(c).User.ID != 0 {
		resp403(c)
		return
	}
	if c.Query("stopsign") != "1" {
		u, _ := tryBotnets(c)
		if u != "" {
			simple(c, getSimpleByFilename("register/peppy.html"), nil, map[string]interface{}{
				"Username": u,
			})
			return
		}
	}
	registerResp(c)
}

func registerSubmit(c *gin.Context) {
	if getContext(c).User.ID != 0 {
		resp403(c)
		return
	}
	// check registrations are enabled
	if !registrationsEnabled() {
		registerResp(c, errorMessage{T(c, "Sorry, it's not possible to register at the moment. Please try again later.")})
		return
	}

	// check username is valid by our criteria
	username := strings.TrimSpace(c.PostForm("username"))
	if !usernameRegex.MatchString(username) {
		registerResp(c, errorMessage{T(c, "Your username must contain alphanumerical characters, spaces, or any of <code>_[]-</code>")})
		return
	}

	// check whether an username is e.g. cookiezi, shigetora, peppy, wubwoofwolf, loctav
	if in(strings.ToLower(username), forbiddenUsernames) {
		registerResp(c, errorMessage{T(c, "You're not allowed to register with that username.")})
		return
	}

	// check email is valid
	if !govalidator.IsEmail(c.PostForm("email")) {
		registerResp(c, errorMessage{T(c, "Please pass a valid email address.")})
		return
	}

	// passwords check (too short/too common)
	if x := validatePassword(c.PostForm("password")); x != "" {
		registerResp(c, errorMessage{T(c, x)})
		return
	}

	// usernames with both _ and spaces are not allowed
	if strings.Contains(username, "_") && strings.Contains(username, " ") {
		registerResp(c, errorMessage{T(c, "An username can't contain both underscores and spaces.")})
		return
	}

	// check whether username already exists
	if db.QueryRow("SELECT 1 FROM users WHERE username_safe = ?", safeUsername(username)).
		Scan(new(int)) != sql.ErrNoRows {
		registerResp(c, errorMessage{T(c, "An user with that username already exists!")})
		return
	}

	// check whether an user with that email already exists
	if db.QueryRow("SELECT 1 FROM users WHERE email = ?", c.PostForm("email")).
		Scan(new(int)) != sql.ErrNoRows {
		registerResp(c, errorMessage{T(c, "An user with that email address already exists!")})
		return
	}

	// Username history. Maybe add some time logic later.
	if db.QueryRow("SELECT 1 FROM user_name_history WHERE username LIKE ? LIMIT 1", username).Scan(new(int)) != sql.ErrNoRows {
		registerResp(c, errorMessage{T(c, "This username has been reserved by another user.")})
		return
	}

	// recaptcha verify
	if config.RecaptchaPrivate != "" && !recaptchaCheck(c) {
		registerResp(c, errorMessage{T(c, "Captcha check failed, please try again.")})
		return
	}

	uMulti, criteria := tryBotnets(c)
	if criteria != "" {
		schiavo.CMs.Send(
			fmt.Sprintf(
				"User **%s** registered with the same %s as %s (%s/u/%s). **POSSIBLE MULTIACCOUNT!!!**. Waiting for ingame verification...",
				username, criteria, uMulti, config.BaseURL, url.QueryEscape(uMulti),
			),
		)
	}

	// The actual registration.
	pass, err := generatePassword(c.PostForm("password"))
	if err != nil {
		resp500(c)
		return
	}

	// Generate a random api key

	res, err := db.Exec(`INSERT INTO users(username, username_safe, password_md5, salt, email, register_datetime, privileges, password_version, api_key)
							  VALUES (?,        ?,             ?,            '',   ?,     ?,                 ?,          2, ?);`,
		username, safeUsername(username), pass, c.PostForm("email"), time.Now().Unix(), common.UserPrivilegePendingVerification, randSeq(64))
	if err != nil {
		registerResp(c, errorMessage{T(c, "Whoops, an error slipped in. You might have been registered, though. I don't know.")})
		return
	}
	lid, _ := res.LastInsertId()

	res, err = db.Exec("INSERT INTO `users_stats`(id, username, user_color, user_style, ranked_score_std, playcount_std, total_score_std, ranked_score_taiko, playcount_taiko, total_score_taiko, ranked_score_ctb, playcount_ctb, total_score_ctb, ranked_score_mania, playcount_mania, total_score_mania) VALUES (?, ?, 'black', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);", lid, username)
	res, err = db.Exec("INSERT INTO `rx_stats`(id, username, user_color, user_style, ranked_score_std, playcount_std, total_score_std, ranked_score_taiko, playcount_taiko, total_score_taiko, ranked_score_ctb, playcount_ctb, total_score_ctb, ranked_score_mania, playcount_mania, total_score_mania) VALUES (?, ?, 'black', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);", lid, username)
	res, err = db.Exec("INSERT INTO `ap_stats`(id, username, user_color, user_style, ranked_score_std, playcount_std, total_score_std, ranked_score_taiko, playcount_taiko, total_score_taiko, ranked_score_ctb, playcount_ctb, total_score_ctb, ranked_score_mania, playcount_mania, total_score_mania) VALUES (?, ?, 'black', '', 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0);", lid, username)
	if err != nil {
		fmt.Println(err)
	}
	schiavo.CMs.Send(fmt.Sprintf("User (**%s** | %s) registered from %s", username, c.PostForm("email"), clientIP(c)))

	setYCookie(int(lid), c)
	logIP(c, int(lid))

	rd.Incr("ripple:registered_users")

	addMessage(c, successMessage{T(c, "You have been successfully registered on RealistikOsu! You now need to verify your account.")})
	getSession(c).Save()
	c.Redirect(302, "/register/verify?u="+strconv.Itoa(int(lid)))
}

func registerResp(c *gin.Context, messages ...message) {
	resp(c, 200, "register/register.html", &baseTemplateData{
		TitleBar:  "Register",
		KyutGrill: "register.jpg",
		Scripts:   []string{"https://js.hcaptcha.com/1/api.js"},
		Messages:  messages,
		FormData:  normaliseURLValues(c.Request.PostForm),
	})
}

func registrationsEnabled() bool {
	var enabled bool
	db.QueryRow("SELECT value_int FROM system_settings WHERE name = 'registrations_enabled'").Scan(&enabled)
	return enabled
}

func verifyAccount(c *gin.Context) {
	if getContext(c).User.ID != 0 {
		resp403(c)
		return
	}

	i, ret := checkUInQS(c)
	if ret {
		return
	}

	sess := getSession(c)
	var rPrivileges uint64
	db.Get(&rPrivileges, "SELECT privileges FROM users WHERE id = ?", i)
	if common.UserPrivileges(rPrivileges)&common.UserPrivilegePendingVerification == 0 {
		addMessage(c, warningMessage{T(c, "Nope.")})
		sess.Save()
		c.Redirect(302, "/")
		return
	}

	resp(c, 200, "register/verify.html", &baseTemplateData{
		TitleBar:       "Verify account",
		HeadingOnRight: true,
		KyutGrill:      "welcome.jpg",
	})
}

func welcome(c *gin.Context) {
	if getContext(c).User.ID != 0 {
		resp403(c)
		return
	}

	i, ret := checkUInQS(c)
	if ret {
		return
	}

	var rPrivileges uint64
	db.Get(&rPrivileges, "SELECT privileges FROM users WHERE id = ?", i)
	if common.UserPrivileges(rPrivileges)&common.UserPrivilegePendingVerification > 0 {
		c.Redirect(302, "/register/verify?u="+c.Query("u"))
		return
	}

	t := T(c, "Welcome!")
	if common.UserPrivileges(rPrivileges)&common.UserPrivilegeNormal == 0 {
		// if the user has no UserNormal, it means they're banned = they multiaccounted
		t = T(c, "Welcome back!")
	}

	resp(c, 200, "register/welcome.html", &baseTemplateData{
		TitleBar:       t,
		HeadingOnRight: true,
		KyutGrill:      "welcome.jpg",
	})
}

// Check User In Query Is Same As User In Y Cookie
func checkUInQS(c *gin.Context) (int, bool) {
	sess := getSession(c)

	i, _ := strconv.Atoi(c.Query("u"))
	y, _ := c.Cookie("y")
	err := db.QueryRow("SELECT 1 FROM identity_tokens WHERE token = ? AND userid = ?", y, i).Scan(new(int))
	if err == sql.ErrNoRows {
		addMessage(c, warningMessage{T(c, "Nope.")})
		sess.Save()
		c.Redirect(302, "/")
		return 0, true
	}
	return i, false
}

func tryBotnets(c *gin.Context) (string, string) {
	var username string

	err := db.QueryRow("SELECT u.username FROM ip_user i INNER JOIN users u ON u.id = i.userid WHERE i.ip = ?", clientIP(c)).Scan(&username)
	if err != nil {
		if err != sql.ErrNoRows {
			c.Error(err)
		}
		return "", ""
	}
	if username != "" {
		return username, "IP"
	}

	cook, _ := c.Cookie("y")
	err = db.QueryRow("SELECT u.username FROM identity_tokens i INNER JOIN users u ON u.id = i.userid WHERE i.token = ?",
		cook).Scan(&username)
	if err != nil {
		if err != sql.ErrNoRows {
			c.Error(err)
		}
		return "", ""
	}
	if username != "" {
		return username, "username"
	}

	return "", ""
}

func in(s string, ss []string) bool {
	for _, x := range ss {
		if x == s {
			return true
		}
	}
	return false
}

var forbiddenUsernames = []string{
	"whitecat",
	"merami",
	"ppy",
	"peppy",
	"varvallian",
	"spare",
	"beasttroll",
	"beasttrollmc",
	"wubwubwolf",
	"whitew0lf",
	"vaxei",
	"alumetri",
	"mathi",
	"flyingtuna",
	"idke",
	"fgsky",
	"dxrkify",
	"karthy",
	"osu!",
	"freddie benson",
	"micca",
	"ryuk",
	"azr8",
	"toy",
	"fieryrage",
	"firebat92",
	"umbre",
	"mouseeasy",
	"bartek22830",
	"gashi",
	"moeyandere",
	"piggey",
	"angelism",
	"cookiezi",
	"nathan on osu",
	"chocomint",
	"wakson",
	"karuna",
	"monko2k",
	"koifishu",
	"bananya",
	"hvick",
	"hvick225",
	"sotarks",
	"rrtyui",
	"armin",
	"a r m i n",
	"rustbell",
	"thelewa",
	"happystick",
	"cptnxn",
	"reimu-desu",
	"bahamete",
	"azer",
	"axarious",
	"oxycodone",
	"sayonara-bye",
	"sapphireghost",
	"adamqs",
	"_index",
	"-gn",
	"rafis",
}
