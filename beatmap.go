package main

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sort"
	"strconv"
	"time"

	"github.com/RealistikOsu/frontend/state"
	"github.com/gin-gonic/gin"
)

type Beatmap struct {
	ID               int `json:"BeatmapID"`
	ParentSetID      int
	DiffName         string
	FileMD5          string
	Mode             int
	BPM              float64
	AR               float32
	OD               float32
	CS               float32
	HP               float32
	TotalLength      int
	HitLength        int
	Playcount        int
	Passcount        int
	MaxCombo         int
	DifficultyRating float64
}

type BeatmapSet struct {
	ID               int `json:"SetID"`
	ChildrenBeatmaps []Beatmap
	RankedStatus     int
	ApprovedDate     time.Time
	LastUpdate       time.Time
	LastChecked      time.Time
	Artist           string
	Title            string
	Creator          string
	Source           string
	Tags             string
}

type beatmapPageData struct {
	baseTemplateData

	Found      bool
	ReqBeatmap Beatmap
	Beatmaps   BeatmapSet
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

func getBeatmapData(b string) (beatmap Beatmap, err error) {
	settings := state.GetSettings()
	resp, err := http.Get(settings.BEATMAP_MIRROR_API_URL + "/b/" + b)
	if err != nil {
		return beatmap, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return beatmap, err
	}

	err = json.Unmarshal(body, &beatmap)
	if err != nil {
		return beatmap, err
	}

	return beatmap, nil
}

func getBeatmapSetData(parentID string) (bset BeatmapSet, err error) {
	settings := state.GetSettings()
	resp, err := http.Get(settings.BEATMAP_MIRROR_API_URL + "/s/" + parentID)
	if err != nil {
		return bset, err
	}
	defer resp.Body.Close()
	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return bset, err
	}

	err = json.Unmarshal(body, &bset)
	if err != nil {
		return bset, err
	}

	return bset, nil
}
