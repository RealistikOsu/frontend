package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sort"
	"strconv"

	//"time"

	"github.com/gin-gonic/gin"
	cheesegull "github.com/osuripple/cheesegull/models"
)

// type Beatmap struct {
// 	BeatmapSetID     int     `json:"beatmapset_id,string"`
// 	BeatmapID        int     `json:"beatmap_id,string"`
// 	Approved         int     `json:"approved,string"`
// 	TotalLength      int     `json:"total_length,string"`
// 	HitLength        int     `json:"hit_length,string"`
// 	Version          string  `json:"version"`
// 	FileMD5          string  `json:"file_md5"`
// 	CS               float32 `json:"diff_size,string"`
// 	OD               float32 `json:"diff_overall,string"`
// 	AR               float32 `json:"diff_approach,string"`
// 	HP               float32 `json:"diff_drain,string"`
// 	Mode             int     `json:"mode,string"`
// 	Artist           string  `json:"artist"`
// 	Title            string  `json:"title"`
// 	Creator          string  `json:"creator"`
// 	CreatorID        int     `json:"creator_id,string"`
// 	BPM              float64 `json:"bpm,string"`
// 	Source           string  `json:"source"`
// 	MaxCombo         int     `json:"max_combo,string"`
// 	DifficultyRating float64 `json:"difficultyrating,string"`
// 	Playcount        int     `json:"playcount,string"`
// 	Passcount        int     `json:"passcount,string"`
// }

type beatmapPageData struct {
	baseTemplateData

	Found      bool
	ReqBeatmap cheesegull.Beatmap
	Beatmaps   cheesegull.Set
	SetJSON    string
}

func beatmapInfo(c *gin.Context) {
	data := new(beatmapPageData)
	defer resp(c, 200, "beatmap.html", data)

	b := c.Param("bid")
	if _, err := strconv.Atoi(b); err != nil {
		c.Error(err)
	} else {
		data.ReqBeatmap, err = getBeatmapData(b)

		if err != nil {
			c.Error(err)
			return
		}
		data.Beatmaps, err = getBeatmapSetData(strconv.Itoa(data.ReqBeatmap.ParentSetID))

		if err != nil {
			c.Error(err)
			return
		}

		sort.Slice(data.Beatmaps.ChildrenBeatmaps, func(i, j int) bool {
			if data.Beatmaps.ChildrenBeatmaps[i].Mode != data.Beatmaps.ChildrenBeatmaps[j].Mode {
				return data.Beatmaps.ChildrenBeatmaps[i].Mode < data.Beatmaps.ChildrenBeatmaps[j].Mode
			}
			return data.Beatmaps.ChildrenBeatmaps[i].DifficultyRating < data.Beatmaps.ChildrenBeatmaps[j].DifficultyRating
		})
	}

	if data.Beatmaps.ID == 0 {
		data.TitleBar = T(c, "Beatmap not found.")
		data.Messages = append(data.Messages, errorMessage{T(c, "Beatmap could not be found.")})
		return
	}

	for i := range data.Beatmaps.ChildrenBeatmaps {
		err := db.QueryRow("SELECT playcount, passcount FROM beatmaps WHERE beatmap_md5 = ?", data.Beatmaps.ChildrenBeatmaps[i].FileMD5).Scan(&data.Beatmaps.ChildrenBeatmaps[i].Playcount, &data.Beatmaps.ChildrenBeatmaps[i].Passcount)
		if err != nil {
			data.Beatmaps.ChildrenBeatmaps[i].Playcount = 0
			data.Beatmaps.ChildrenBeatmaps[i].Passcount = 0
		}
	}

	data.KyutGrill = fmt.Sprintf("https://assets.ppy.sh/beatmaps/%d/covers/cover.jpg", data.Beatmaps.ID)
	data.KyutGrillAbsolute = true

	setJSON, err := json.Marshal(data.Beatmaps.ChildrenBeatmaps)
	if err == nil {
		data.SetJSON = string(setJSON)
	} else {
		data.SetJSON = "[]"
	}

	data.TitleBar = T(c, "%s - %s", data.Beatmaps.Artist, data.Beatmaps.Title)
	data.Scripts = append(data.Scripts, "/static/tablesort.js", "/static/beatmap.js")
}

func getBeatmapData(b string) (beatmap cheesegull.Beatmap, err error) {
	resp, err := http.Get(config.CheesegullAPI + "/b/" + b)
	if err != nil {
		return beatmap, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return beatmap, err
	}

	err = json.Unmarshal(body, &beatmap)
	if err != nil {
		return beatmap, err
	}

	return beatmap, nil
}

func getBeatmapSetData(parentID string) (bset cheesegull.Set, err error) {
	resp, err := http.Get(config.CheesegullAPI + "/s/" + parentID)
	if err != nil {
		return bset, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return bset, err
	}

	err = json.Unmarshal(body, &bset)
	if err != nil {
		return bset, err
	}

	return bset, nil
}
