package main

import (
	"bytes"
	"crypto/md5"
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"net/url"
	"strings"
	"time"

	"github.com/RealistikOsu/hanayo/modules/bbcode"
	tp "github.com/RealistikOsu/hanayo/modules/top-passwords"
	"github.com/gin-gonic/gin"
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
	f.Add("response", c.PostForm("h-captcha-response"))
	f.Add("remoteip", clientIP(c))

	req, err := http.Post("https://hcaptcha.com/siteverify",
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

func mustCSRFGenerate(u int) string {
	v, err := CSRF.Generate(u)
	if err != nil {
		panic(err)
	}
	return v
}

// Discord integration stuff.
func discordUnlink(c *gin.Context) {
	ctx := getContext(c)
	if ctx.User.ID == 0 {
		resp403(c)
		return
	}

	var m message
	defer func() {
		addMessage(c, m)
		getSession(c).Save()
		c.Redirect(302, "/settings/discord-integration")
	}()

	// Now we do some checks.
	var checkInt int
	err := db.QueryRow("SELECT 1 FROM discord_oauth WHERE user_id = ?", ctx.User.ID).Scan(&checkInt)
	if err != nil && err == sql.ErrNoRows {
		m = errorMessage{T(c, "You have no discord account linked to your RealistikOsu account!")}
		return
	} else if err != nil {
		c.Error(err)
		m = errorMessage{T(c, "An error occurred. Please report this to RealistikOsu developer!")}
		return
	}

	_, err = db.Exec("DELETE FROM discord_oauth WHERE user_id = ?", ctx.User.ID)
	if err != nil && err == sql.ErrNoRows {
		m = errorMessage{T(c, "You have no discord account linked to your RealistikOsu account!")}
		return
	} else if err != nil {
		c.Error(err)
		m = errorMessage{T(c, "An error occurred. Please report this to RealistikOsu developer!")}
		return
	}

	m = successMessage{T(c, "Successfully unlinked your discord account!")}
}

type TokenStuff struct {
	TokenType   string `json:"token_type"`
	AccessToken string `json:"access_token"`
}

func getCodeAccess(code string) (token TokenStuff, err error) {
	data := url.Values{}
	data.Set("client_id", "936211493874188349")
	data.Set("client_secret", "VEYXgaj0dcA8l-Q8T_nsElZUAVXhi1ZO")
	data.Set("grant_type", "authorization_code")
	data.Set("code", code)
	data.Set("redirect_uri", "https://ussr.pl/settings/discord-integration/redirect")
	responseBody := bytes.NewBuffer([]byte(data.Encode()))

	resp, err := http.Post(
		"https://discord.com/api/v8/oauth2/token",
		"application/x-www-form-urlencoded",
		responseBody,
	)
	if err != nil {
		return token, err
	}

	defer resp.Body.Close()
	//Read the response body
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return token, err
	}

	err = json.Unmarshal(body, &token)
	if err != nil {
		return token, err
	}
	return token, nil
}

type DCUser struct {
	DiscordID            string `json:"id"`
	DiscordName          string `json:"username"`
	DiscordDiscriminator string `json:"discriminator"`
}

func getUserData(accessType string, accessToken string) (data DCUser, err error) {
	client := &http.Client{
		Timeout: time.Second * 10,
	}
	req, err := http.NewRequest("GET", "https://discord.com/api/users/@me", nil)

	if err != nil {
		return data, err
	}
	// Curseddddddd
	req.Header.Add("Authorization", accessType+" "+accessToken)
	resp, err := client.Do(req)
	if err != nil {
		return data, err
	}

	defer resp.Body.Close()
	//Read the response body
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return data, err
	}

	err = json.Unmarshal(body, &data)
	if err != nil {
		return data, err
	}
	return data, nil
}

func discordRedirCheck(c *gin.Context) {
	ctx := getContext(c)
	if ctx.User.ID == 0 {
		resp403(c)
		return
	}

	var m message
	defer func() {
		addMessage(c, m)
		getSession(c).Save()
		c.Redirect(302, "/settings/discord-integration")
	}()

	code := c.DefaultQuery("code", "")
	if code == "" {
		// No code, prob self inserting :thinking:.
		m = errorMessage{T(c, "No code specified, linking failed!")}
		return
	}

	tokenData, err := getCodeAccess(code)
	if err != nil {
		// No code, prob self inserting :thinking:.
		c.Error(err)
		m = errorMessage{T(c, "An error occurred. Please report this to RealistikOsu developer!")}
		return
	}

	data, err := getUserData(tokenData.TokenType, tokenData.AccessToken)
	if err != nil {
		// No code, prob self inserting :thinking:.
		c.Error(err)
		m = errorMessage{T(c, "An error occurred. Please report this to RealistikOsu developer!")}
		return
	}

	_, err = db.Exec(`
		INSERT INTO discord_oauth(id, discord_id, user_id)
		VALUES (NULL, ?, ?)`, data.DiscordID, ctx.User.ID,
	)
	if err != nil {
		// No code, prob self inserting :thinking:.
		m = errorMessage{T(c, "An error occurred. Please report this to RealistikOsu developer!")}
		return
	}

	m = successMessage{T(c, fmt.Sprintf("You have successfully linked %s#%s to your RealistikOsu account!", data.DiscordName, data.DiscordDiscriminator))}
}
