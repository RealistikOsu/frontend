package main

import (
	"encoding/json"
	"fmt"
	"io/ioutil"
	"net/http"
	"sort"
	"strconv"
        "errors"
	"math/rand"
  	//"time"

	"github.com/gin-gonic/gin"
	//"github.com/osuripple/cheesegull/models"
)

type Beatmap struct {
	BeatmapSetID int `json:"beatmapset_id,string"`
	BeatmapID int `json:"beatmap_id,string"`
	Approved int `json:"approved,string"`
	TotalLength int `json:"total_length,string"`
	HitLength int `json:"hit_length,string"`
	Version string `json:"version"`
	FileMD5 string `json:"file_md5"`
	CS float32 `json:"diff_size,string"`
	OD float32 `json:"diff_overall,string"`
	AR float32 `json:"diff_approach,string"`
	HP float32 `json:"diff_drain,string"`
	Mode int `json:"mode,string"`
	Artist string `json:"artist"`
	Title string `json:"title"`
	Creator string `json:"creator"`
	CreatorID int `json:"creator_id,string"`
	BPM float64 `json:"bpm,string"`
	Source string `json:"source"`
	MaxCombo int `json:"max_combo,string"`
	DifficultyRating float64 `json:"difficultyrating,string"`
	Playcount int `json:"playcount,string"`
	Passcount int `json:"passcount,string"`
}

type beatmapPageData struct {
	baseTemplateData

	Found      bool
	ReqBeatmap Beatmap
	Beatmaps []Beatmap
	SetJSON    string
}

var API_KEYS = []string{"bb79d81daaefcfa10ed39136db4fe997cbec38ea", "6c9c565908a6fff57c5e9acbf1793ccb768672b0", "9db8857cd803dfa3cdb83458ce6bceacc48dff7d", "5b598b94f20cc872ee503169457f9c9f1f3c34e9", "e4d093e76d78ca463e302608c8ec3fde564da1b5"}

// func getFromDatabase(bmapID int) (bset models.Set, err error) {

// 	var songName string
// 	var fileName string
// 	err = db.QueryRow("SELECT beatmapset_id, ranked, song_name, file_name FROM beatmaps WHERE beatmap_id = ? LIMIT 1", bmapID).Scan(&bset.ID, &bset.RankedStatus, &songName, &fileName)
// 	if err != nil {
// 		return bset, err
// 	}
// 	if fileName == "" {
// 		idx := strings.Index(songName, "[")
// 		halfString := songName[:idx]
// 		split := strings.Split(halfString, "-")
// 		bset.Artist = strings.TrimSpace(split[0])
// 		bset.Title = strings.TrimSpace(split[1])
// 		bset.Creator = "Unknown"
// 	} else {
// 		idxCreator := strings.Index(fileName, "(")
// 		idxCreatorEnd := strings.Index(fileName, ")")
// 		bset.Creator = fileName[idxCreator+1 : idxCreatorEnd]
// 		halfString := fileName[:idxCreator]
// 		split := strings.Split(halfString, "-")
// 		bset.Artist = strings.TrimSpace(split[0])
// 		bset.Title = strings.TrimSpace(split[1])
// 	}
// 	rows, err := db.Query("SELECT beatmap_id, beatmapset_id, beatmap_md5, mode, bpm, ar, od, hit_length, playcount, passcount, max_combo FROM beatmaps WHERE beatmapset_id = ?", bset.ID)
// 	if err != nil {
// 		return bset, err
// 	}
// 	var bmaps []models.Beatmap
// 	for rows.Next() {
// 		var b models.Beatmap
// 		err = rows.Scan(&b.ID, &b.ParentSetID, &b.FileMD5, &b.Mode, &b.BPM, &b.AR, &b.OD, &b.HitLength, &b.Playcount, &b.Passcount, &b.MaxCombo)
// 		if err != nil {
// 			return bset, err
// 		}

// 		suffix := "std"
// 		if b.Mode == 1 {
// 			suffix = "taiko"
// 		} else if b.Mode == 2 {
// 			suffix = "ctb"
// 		} else if b.Mode == 3 {
// 			suffix = "mania"
// 		}
// 		var song_name string
// 		var file_name string
// 		err = db.QueryRow(fmt.Sprintf("SELECT difficulty_%s, song_name, file_name FROM beatmaps WHERE beatmap_md5 = ?", suffix), b.FileMD5).Scan(&b.DifficultyRating, &song_name, &file_name)
// 		if file_name == "" && song_name == "" {
// 			b.DiffName = "Unknown"
// 		} 
// 		if file_name == "" {
// 			index := strings.Index(song_name, "[")
// 			b.DiffName = song_name[index+1 : len(song_name)-1]
// 			fmt.Printf("Using song name")
// 			fmt.Println(song_name[index+1 : len(song_name)-1])
// 		} else {
// 			index := strings.Index(file_name, "[")
// 			b.DiffName = file_name[index+1 : len(file_name)-5]
// 			fmt.Printf("Using file name")
// 			fmt.Println(file_name[index+1 : len(file_name)-5])
// 		}
// 		bmaps = append(bmaps, b)
// 	}

// 	bset.ChildrenBeatmaps = bmaps
// 	return bset, nil
// }


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
		data.Beatmaps, err = getBeatmapSetData(strconv.Itoa(data.ReqBeatmap.BeatmapSetID))

		if err != nil {
			c.Error(err)
			return
		}

		sort.Slice(data.Beatmaps, func(i, j int) bool {
			if data.Beatmaps[i].Mode != data.Beatmaps[j].Mode {
				return data.Beatmaps[i].Mode < data.Beatmaps[j].Mode
			}
			return data.Beatmaps[i].DifficultyRating < data.Beatmaps[j].DifficultyRating
		})
	}

	if data.Beatmaps[0].BeatmapSetID == 0 {
		data.TitleBar = T(c, "Beatmap not found.")
		data.Messages = append(data.Messages, errorMessage{T(c, "Beatmap could not be found.")})
		return
	}

	for i, _ := range data.Beatmaps {
		err := db.QueryRow("SELECT playcount, passcount FROM beatmaps WHERE beatmap_md5 = ?", data.Beatmaps[i].FileMD5).Scan(&data.Beatmaps[i].Playcount, &data.Beatmaps[i].Passcount)
		if err != nil {
			data.Beatmaps[i].Playcount = 0
			data.Beatmaps[i].Passcount = 0
		}
	}

	data.KyutGrill = fmt.Sprintf("https://assets.ppy.sh/beatmaps/%d/covers/cover.jpg", data.Beatmaps[0].BeatmapSetID)
	data.KyutGrillAbsolute = true

	setJSON, err := json.Marshal(data.Beatmaps)
	if err == nil {
		data.SetJSON = string(setJSON)
	} else {
		data.SetJSON = "[]"
	}

	data.TitleBar = T(c, "%s - %s", data.Beatmaps[0].Artist, data.Beatmaps[0].Title)
	data.Scripts = append(data.Scripts, "/static/tablesort.js", "/static/beatmap.js")
}

func getBeatmapData(b string) (beatmap Beatmap, err error) {
	resp, err := http.Get("https://old.ppy.sh/api/get_beatmaps?k="+API_KEYS[rand.Intn(len(API_KEYS))]+"&b="+b)
	if err != nil {
		return beatmap, err
	}
	defer resp.Body.Close()
	body, err := ioutil.ReadAll(resp.Body)
	if err != nil {
		return beatmap, err
	}

	var bmap []Beatmap
	err = json.Unmarshal(body, &bmap)
	if err != nil {
		return beatmap, err
	}
	if len(bmap) == 0 {
		err = errors.New("No beatmap found.")
		return beatmap, err
	}
	beatmap = bmap[0]
	return beatmap, nil
}

func getBeatmapSetData(parentID string) (bset []Beatmap, err error) {
	//rand.Seed(time.Now().Unix())
	resp, err := http.Get("https://old.ppy.sh/api/get_beatmaps?k="+API_KEYS[rand.Intn(len(API_KEYS))]+"&s="+parentID)
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
