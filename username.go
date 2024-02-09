package main

import (
	"database/sql"
	"fmt"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var usernameRegex = regexp.MustCompile(`^[A-Za-z0-9 _\[\]-]{2,15}$`)
var StatsTables = [...]string{"users_stats", "rx_stats", "ap_stats"}

func changeUsername(c *gin.Context) {
	ctx := getContext(c)
	if ctx.User.ID == 0 {
		resp403(c)
		return
	}

	var m message = successMessage{T(c, "Your username has been changed.")}

	defer func() {
		addMessage(c, m)
		getSession(c).Save()
		c.Redirect(302, "/settings/change-username")
	}()

	if ok, _ := CSRF.Validate(ctx.User.ID, c.PostForm("csrf")); !ok {
		m = errorMessage{T(c, "Your session has expired. Please try redoing what you were trying to do.")}
		return
	}

	if db.QueryRow("SELECT replaced_at FROM user_name_history WHERE user_id = ? AND replaced_at > ? AND replaced_at < ? LIMIT 1",
		c.User.ID, time.Now().Unix(), (time.Now().Unix() + 7 * 60 * 60 * 24 /* 7 days */)).Scan(new(int) != sql.ErrNoRows) {
			m = errorMessage{T(c, "You can't change your username just yet.")}
			return
		}

	newUsername := strings.TrimSpace(c.Param("newuser"))
	if !usernameRegex.MatchString(newUsername) {
		m = errorMessage{T(c, "Your username must contain alphanumerical characters, spaces, or any of <code>_[]-</code>")}
		return
	}

	// usernames with both _ and spaces are not allowed
	if strings.Contains(newUsername, "_") && strings.Contains(newUsername, " ") {
		m = errorMessage{T(c, "An username can't contain both underscores and spaces.")}
		return
	}

	if db.QueryRow("SELECT 1 FROM users WHERE username_safe = ?", safeUsername(newUsername)).
		Scan(new(int)) != sql.ErrNoRows {
		registerResp(c, errorMessage{T(c, "An user with that username already exists!")})
		return
	}

	if db.QueryRow("SELECT 1 FROM user_name_history WHERE username LIKE ? AND user_id != ? LIMIT 1", newUsername, ctx.User.ID).Scan(new(int)) != sql.ErrNoRows {
		registerResp(c, errorMessage{T(c, "This username has been reserved by another user.")})
		return
	}

	if newUsername == ctx.User.Username {
		m = errorMessage{T(c, "You already have this username.")}
		return
	}

	saveNewUsername(ctx, newUsername)
	rd.Publish(
		"peppy:disconnect",
		fmt.Sprintf(
			"{'userID': %d, 'reason': 'Your username has changed.'}",
			ctx.User.ID,
		),
	)
}

func saveNewUsername(ctx context, newUsername string) {
	db.Exec(`INSERT INTO user_name_history (user_id, username, replaced_at)
		VALUES (?, ?, UNIX_TIMESTAMP())
	`, ctx.User.ID, ctx.User.Username)

	db.Exec(`DELETE FROM user_name_history
		WHERE username LIKE ? AND user_id = ?
	`, newUsername, ctx.User.ID)

	db.Exec(`UPDATE users SET username = ?, username_safe = ? WHERE id = ?`,
		newUsername, safeUsername(newUsername), ctx.User.ID)

	for _, table := range StatsTables {
		db.Exec(fmt.Sprintf(`UPDATE %s SET username = ? WHERE id = ?`,
			table), newUsername, ctx.User.ID)
	}
}
