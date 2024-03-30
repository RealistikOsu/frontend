package main

import (
	"fmt"
	"image"
	"image/gif"
	"image/jpeg"
	"os"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
)

var hexColourRegex = regexp.MustCompile("^#([a-fA-F0-9]{6}|[a-fA-F0-9]{3})$")

func profBackground(c *gin.Context) {
	ctx := getContext(c)
	if ctx.User.ID == 0 {
		resp403(c)
		return
	}
	var m message = successMessage{T(c, "Your profile banner has been saved.")}
	defer func() {
		addMessage(c, m)
		getSession(c).Save()
		c.Redirect(302, "/settings/profbanner")
	}()
	if ok, _ := CSRF.Validate(ctx.User.ID, c.PostForm("csrf")); !ok {
		m = errorMessage{T(c, "Your session has expired. Please try redoing what you were trying to do.")}
		return
	}
	t := c.Param("type")
	switch t {
	case "0":
		db.Exec("DELETE FROM profile_backgrounds WHERE uid = ?", ctx.User.ID)
	case "1":
		// image
		file, _, err := c.Request.FormFile("value")
		if err != nil {
			m = errorMessage{T(c, "An error occurred.")}
			return
		}
		img, _, err := image.Decode(file)
		if err != nil {
			m = errorMessage{T(c, "An error occurred.")}
			return
		}
		//img = resize.Thumbnail(2496, 1404, img, resize.Bilinear)
		// Check whether it's a gif
		gif_f, err := gif.Decode(file)
		if err != nil {
			// Nope, not a gif, log it and continue
			fmt.Print("Not a gif: " + err.Error() + "\n")
			f, err := os.Create(fmt.Sprintf("static/profbackgrounds/%d.jpg", ctx.User.ID))
			defer f.Close()
			if err != nil {
				m = errorMessage{T(c, "An error occurred.")}
				c.Error(err)
				return
			}
			fmt.Printf("Saving profile background for %d", ctx.User.ID)

			err = jpeg.Encode(f, img, &jpeg.Options{
				Quality: 88,
			})
			if err != nil {
				m = errorMessage{T(c, "We were not able to save your profile banner.")}
				c.Error(err)
				return
			}
			saveProfileBackground(ctx, 1, fmt.Sprintf("%d.jpg?%d", ctx.User.ID, time.Now().Unix()))
		} else {
			// It's a gif, save it as a gif
			f, err := os.Create(fmt.Sprintf("static/profbackgrounds/%d.gif", ctx.User.ID))
			defer f.Close()
			if err != nil {
				m = errorMessage{T(c, "An error occurred.")}
				c.Error(err)
				return
			}
			fmt.Printf("Saving profile background for %d", ctx.User.ID)
			err = gif.Encode(f, gif_f, &gif.Options{
				NumColors: 256,
			})
			if err != nil {
				m = errorMessage{T(c, "We were not able to save your profile banner.")}
				c.Error(err)
				return
			}
			saveProfileBackground(ctx, 1, fmt.Sprintf("%d.gif?%d", ctx.User.ID, time.Now().Unix()))
			return
		}
	case "2":
		// solid colour
		col := strings.ToLower(c.PostForm("value"))
		// verify it's valid
		if !hexColourRegex.MatchString(col) {
			m = errorMessage{T(c, "Colour is invalid")}
			return
		}
		saveProfileBackground(ctx, 2, col)
	}
}

func saveProfileBackground(ctx context, t int, val string) {
	db.Exec(`INSERT INTO profile_backgrounds(uid, time, type, value)
		VALUES (?, ?, ?, ?)
		ON DUPLICATE KEY UPDATE
			time = VALUES(time),
			type = VALUES(type),
			value = VALUES(value)
	`, ctx.User.ID, time.Now().Unix(), t, val)
}
