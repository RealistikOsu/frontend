package main

import (
	gocontext "context"
	"crypto/md5"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"bytes"

	"github.com/gin-gonic/gin"
	"github.com/RealistikOsu/hanayo/modules/bbcode"
	tp "github.com/RealistikOsu/hanayo/modules/top-passwords"
	"github.com/RealistikOsu/RealistikAPI/common"
)

//go:generate go run scripts/generate_mappings.go -g
//go:generate go run scripts/top_passwords.go

func clientIP(c *gin.Context) string {
	ff := c.Request.Header.Get("X-Real-IP")
	if ff != "" {
		return ff
	}
	return c.ClientIP()
}

func cmd5(s string) string {
	return fmt.Sprintf("%x", md5.Sum([]byte(s)))
}

func validatePassword(p string) string {
	if len(p) < 8 {
		return "Your password is too short! It must be at least 8 characters long."
	}

	for _, k := range tp.TopPasswords {
		if k == p {
			return "Your password is one of the most common passwords on the entire internet. No way we're letting you use that!"
		}
	}

	return ""
}

func recaptchaCheck(c *gin.Context) bool {
	f := make(url.Values)
	f.Add("secret", config.RecaptchaPrivate)
	f.Add("response", c.PostForm("g-recaptcha-response"))
	f.Add("remoteip", clientIP(c))

	req, err := http.Post("https://www.google.com/recaptcha/api/siteverify",
		"application/x-www-form-urlencoded", strings.NewReader(f.Encode()))
	if err != nil {
		c.Error(err)
		return false
	}

	data, err := ioutil.ReadAll(req.Body)
	if err != nil {
		c.Error(err)
		return false
	}

	var e struct {
		Success bool `json:"success"`
	}
	err = json.Unmarshal(data, &e)
	if err != nil {
		c.Error(err)
		return false
	}

	return e.Success
}

func parseBBCode(c *gin.Context) {
	body, err := ioutil.ReadAll(c.Request.Body)
	if err != nil {
		c.Error(err)
		c.String(200, "Error")
		return
	}
	d := bbcode.Compile(string(body))
	c.String(200, d)
}

func discordFinish(c *gin.Context) {
	sess := getSession(c)
	defer func() {
		sess.Save()
		c.Redirect(302, "/settings/discord")
	}()

	ctx := getContext(c)
	if ok, _ := CSRF.Validate(ctx.User.ID, c.Query("state")); !ok {
		addMessage(c, errorMessage{T(c, "Your session has expired. Please try redoing what you were trying to do.")})
		return
	}

	if ctx.User.Privileges&common.UserPrivilegeDonor == 0 {
		addMessage(c, errorMessage{T(c, "You're not a donor!")})
		return
	}

	reqCtx, _ := gocontext.WithTimeout(gocontext.Background(), time.Second*20)
	tok, err := getDiscord().Exchange(reqCtx, c.Query("code"))
	if err != nil {
		c.Error(err)
		addMessage(c, errorMessage{T(c, "An error occurred.")})
		return
	}

	// Yoloest error handling ever
	// Here we're getting the user ID of our user on discord
	req, _ := http.NewRequest("GET", "https://discordapp.com/api/users/@me", nil)
	req.Header.Set("Authorization", "Bearer "+tok.AccessToken)
	resp, _ := http.DefaultClient.Do(req)
	rawData, _ := ioutil.ReadAll(resp.Body)
	var x struct {
		ID string `json:"id"`
	}
	err = json.Unmarshal(rawData, &x)
	if err != nil {
		c.Error(err)
		addMessage(c, errorMessage{T(c, "An error occurred.")})
		return
	}

	// Here, instead, we're telling donorbot about the user.
	// setup post data
	vals := make(url.Values, 2)
	vals.Set("discord_id", x.ID)
	vals.Set("secret", config.DonorBotSecret)
	// send request
	resp, err = http.Post(config.DonorBotURL+"/api/v1/give_donor", "application/x-www-form-urlencoded", bytes.NewReader([]byte(vals.Encode())))
	if err != nil {
		c.Error(err)
		addMessage(c, errorMessage{T(c, "An error occurred.")})
		return
	}

	var o struct {
		Status int `json:"status"`
	}
	json.NewDecoder(resp.Body).Decode(&o)

	switch o.Status {
	case 200:
		// move on
	case 404:
		addMessage(c, errorMessage{T(c, "You've not joined the discord server! Links to it are below on the page. Please join the server before attempting to connect your account to Discord.")})
	default:
		c.Error(fmt.Errorf("donorbot: %d", resp.StatusCode))
		addMessage(c, errorMessage{T(c, "An error occurred.")})
		return
	}

	db.Exec("INSERT INTO discord_roles (id, userid, discordid, roleid) VALUES (NULL, ?, ?, 0)", ctx.User.ID, x.ID)

	addMessage(c, successMessage{T(c, "Your account has been linked successfully!")})
}

func mustCSRFGenerate(u int) string {
	v, err := CSRF.Generate(u)
	if err != nil {
		panic(err)
	}
	return v
}

