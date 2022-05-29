package main

import (
	"database/sql"
	"net/url"

	"github.com/RealistikOsu/RealistikAPI/common"
	"github.com/gin-gonic/gin"
)

// TODO: replace with simple ResponseInfo containing userid
type profileData struct {
	baseTemplateData
	UserID int
	Frozen bool
}

func userProfile(c *gin.Context) {
	var (
		userID     int
		username   string
		privileges uint64
		frozen     bool
	)

	ctx := getContext(c)
 	u, error := url.PathUnescape(c.Param("user")) // Unquote it.
 	if error != nil {
 		c.Error(error)
 	}
	 
	err := db.QueryRow("SELECT id, username, privileges, frozen FROM users WHERE username_safe IN (?) OR id IN (?) AND "+ctx.OnlyUserPublic()+" LIMIT 1", common.SafeUsername(u), u).Scan(&userID, &username, &privileges, &frozen)
	if err != nil && err != sql.ErrNoRows {
		c.Error(err)
	}
	
	data := new(profileData)
	data.UserID = userID
	data.Frozen = frozen

	defer resp(c, 200, "profile.html", data)

	if data.UserID == 0 {
		data.TitleBar = "User not found"
		data.Messages = append(data.Messages, warningMessage{T(c, "That user could not be found.")})
		return
	}

	if common.UserPrivileges(privileges)&common.UserPrivilegeDonor > 0 {
		var profileBackground struct {
			Type  int
			Value string
		}
		db.Get(&profileBackground, "SELECT type, value FROM profile_backgrounds WHERE uid = ?", data.UserID)
		switch profileBackground.Type {
		case 1:
			// data.KyutGrill = "/static/profbackgrounds/" + profileBackground.Value
			// data.KyutGrillAbsolute = true
			data.ProfileBackground = "/static/profbackgrounds/" + profileBackground.Value
		case 2:
			// data.SolidColour = profileBackground.Value
			data.ProfileColour = profileBackground.Value
		}
	}

	data.TitleBar = T(c, "%s's profile", username)
	data.DisableHH = true
	data.Scripts = append(data.Scripts, "/static/profiles/profile.js")
}
