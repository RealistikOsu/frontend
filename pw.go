package main

import (
	ct "context"
	"database/sql"
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/gin-gonic/gin"
	"golang.org/x/crypto/bcrypt"
	"zxq.co/x/rs"
)

func passwordReset(c *gin.Context) {
	ctx := getContext(c)
	if ctx.User.ID != 0 {
		simpleReply(c, errorMessage{T(c, "You're already logged in!")})
		return
	}

	field := "username"
	if strings.Contains(c.PostForm("username"), "@") {
		field = "email"
	}

	var (
		id       int
		username string
		email    string
	)

	err := db.QueryRow("SELECT id, username, email FROM users WHERE "+field+" = ?",
		c.PostForm("username")).
		Scan(&id, &username, &email)

	switch err {
	case nil:
		// ignore
	case sql.ErrNoRows:
		simpleReply(c, errorMessage{T(c, "That user could not be found.")})
		return
	default:
		c.Error(err)
		resp500(c)
		return
	}

	// recaptcha verify
	if config.RecaptchaPrivate != "" && !recaptchaCheck(c) {
		simpleReply(c, errorMessage{T(c, "Captcha check failed, please try again.")})
		return
	}

	// generate key
	key := rs.String(50)

	// TODO: WHY THE FUCK DOES THIS USE USERNAME AND NOT ID PLEASE WRITE MIGRATION
	_, err = db.Exec("INSERT INTO password_recovery(k, u) VALUES (?, ?)", key, common.SafeUsername(username))

	if err != nil {
		c.Error(err)
		resp500(c)
		return
	}

	content := fmt.Sprintf(
		"Hey %s!<br><br>We've heard you forgot your RealistikOsu! account password, it can happen to the best of us. You can change it by <a href='%s'>clicking here</a>!<br><br>If you didn't request a password reset, you don't have to do anything. Just ignore this email.",
		username,
		config.BaseURL+"/pwreset/continue?k="+key,
	)

	msg := mg.NewMessage(
		config.MailgunFrom,
		"RealistikOsu! - Password recovery!",
		content,
		email,
	)
	msg.SetHtml(content)
	ctxx, cancel := ct.WithTimeout(ct.Background(), time.Second*10)
	defer cancel()
	_, _, err = mg.Send(ctxx, msg)

	if err != nil {
		c.Error(err)
		resp500(c)
		return
	}

	addMessage(c, successMessage{"Done! You should receive an email to your original mailbox shortly!"})
	getSession(c).Save()
	c.Redirect(302, "/")
}

func passwordResetContinue(c *gin.Context) {
	k := c.Query("k")

	// todo: check logged in
	if k == "" {
		respEmpty(c, T(c, "Password reset"), errorMessage{T(c, "Nope.")})
		return
	}

	var username string
	switch err := db.QueryRow("SELECT u FROM password_recovery WHERE k = ? LIMIT 1", k).
		Scan(&username); err {
	case nil:
		// move on
	case sql.ErrNoRows:
		respEmpty(c, T(c, "Reset password"), errorMessage{T(c, "That key could not be found. Perhaps it expired?")})
		return
	default:
		c.Error(err)
		resp500(c)
		return
	}

	renderResetPassword(c, username, k)
}

func passwordResetContinueSubmit(c *gin.Context) {
	// todo: check logged in
	var username string
	switch err := db.QueryRow("SELECT u FROM password_recovery WHERE k = ? LIMIT 1", c.PostForm("k")).
		Scan(&username); err {
	case nil:
		// move on
	case sql.ErrNoRows:
		respEmpty(c, T(c, "Reset password"), errorMessage{T(c, "That key could not be found. Perhaps it expired?")})
		return
	default:
		c.Error(err)
		resp500(c)
		return
	}

	p := c.PostForm("password")

	if s := validatePassword(p); s != "" {
		renderResetPassword(c, username, c.PostForm("k"), errorMessage{T(c, s)})
		return
	}

	pass, err := generatePassword(p)
	if err != nil {
		c.Error(err)
		resp500(c)
		return
	}

	_, err = db.Exec("UPDATE users SET password_md5 = ?, salt = '', password_version = '2' WHERE username = ?",
		pass, username)
	if err != nil {
		c.Error(err)
		resp500(c)
		return
	}

	var userID int
	err = db.QueryRow("SELECT id FROM users WHERE username_safe = ? LIMIT 1", username).Scan(&userID)
	if err != nil {
		c.Error(err)
		resp500(c)
		return
	}

	redisData, _ := json.Marshal(map[string]int{
		"user_id": userID,
	})
	rd.Publish("peppy:change_pass", string(redisData))

	_, err = db.Exec("DELETE FROM password_recovery WHERE k = ? LIMIT 1", c.PostForm("k"))
	if err != nil {
		c.Error(err)
		resp500(c)
		return
	}

	addMessage(c, successMessage{T(c, "We have changed your password and you should now be able to login! Have fun!")})
	getSession(c).Save()
	c.Redirect(302, "/login")
}

func renderResetPassword(c *gin.Context, username, k string, messages ...message) {
	simple(c, getSimpleByFilename("pwreset/continue.html"), messages, map[string]interface{}{
		"Username": username,
		"Key":      k,
	})
}

func generatePassword(p string) (string, error) {
	s, err := bcrypt.GenerateFromPassword([]byte(cmd5(p)), bcrypt.DefaultCost)
	return string(s), err
}

func changePassword(c *gin.Context) {
	ctx := getContext(c)
	if ctx.User.ID == 0 {
		resp403(c)
	}
	s, err := qb.QueryRow("SELECT email FROM users WHERE id = ?", ctx.User.ID)
	if err != nil {
		c.Error(err)
	}
	simple(c, getSimpleByFilename("settings/password.html"), nil, map[string]interface{}{
		"email": s["email"],
	})
}

func changePasswordSubmit(c *gin.Context) {
	var messages []message
	ctx := getContext(c)
	if ctx.User.ID == 0 {
		resp403(c)
	}
	defer func() {
		s, err := qb.QueryRow("SELECT email FROM users WHERE id = ?", ctx.User.ID)
		if err != nil {
			c.Error(err)
		}
		simple(c, getSimpleByFilename("settings/password.html"), messages, map[string]interface{}{
			"email": s["email"],
		})
	}()

	if ok, _ := CSRF.Validate(ctx.User.ID, c.PostForm("csrf")); !ok {
		addMessage(c, errorMessage{T(c, "Your session has expired. Please try redoing what you were trying to do.")})
		return
	}

	var password string
	db.Get(&password, "SELECT password_md5 FROM users WHERE id = ? LIMIT 1", ctx.User.ID)

	if err := bcrypt.CompareHashAndPassword(
		[]byte(password),
		[]byte(cmd5(c.PostForm("currentpassword"))),
	); err != nil {
		messages = append(messages, errorMessage{T(c, "Wrong password.")})
		return
	}

	uq := new(common.UpdateQuery)
	uq.Add("email", c.PostForm("email"))
	if c.PostForm("newpassword") != "" {
		if s := validatePassword(c.PostForm("newpassword")); s != "" {
			messages = append(messages, errorMessage{T(c, s)})
			return
		}
		pw, err := generatePassword(c.PostForm("newpassword"))
		if err == nil {
			uq.Add("password_md5", pw)
		}
		sess := getSession(c)
		sess.Set("pw", cmd5(pw))
		sess.Save()
	}
	_, err := db.Exec("UPDATE users SET "+uq.Fields()+" WHERE id = ? LIMIT 1", append(uq.Parameters, ctx.User.ID)...)
	if err != nil {
		c.Error(err)
	}

	redisData, _ := json.Marshal(map[string]int{
		"user_id": ctx.User.ID,
	})

	rd.Publish("peppy:change_pass", string(redisData))

	db.Exec("UPDATE users SET flags = flags & ~3 WHERE id = ? LIMIT 1", ctx.User.ID)

	messages = append(messages, successMessage{T(c, "Your settings have been saved.")})
}
