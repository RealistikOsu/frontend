// The RealistikOsu beatmap search!
// Credits to Kaimi for this rewrite!
const beatmapAudios = [];
const searchSettings = {
    mode: 0,
    status: 1,
    offset: 0,
    amount: 20
};

let beatmapTimer;

const mirror_api = "https://osu.direct/api"; // we rlly do need our own

function buttons() {
    const modes = document.querySelectorAll("#mode-button");
    const status = document.querySelectorAll("#status-button");
    let typeTimer;

    for (let elm of modes) {
        elm.addEventListener("click", function () {
            for (let others of modes) {
                others.classList.remove("clicked");
            };

            this.classList.add("clicked");
            searchSettings.mode = this.dataset.modeosu;

            search(searchSettings, 0, false);
        });
    };

    for (let elm of status) {
        elm.addEventListener("click", function () {
            for (let others of status) {
                others.classList.remove("clicked");
            };

            this.classList.add("clicked");
            searchSettings.status = this.dataset.rankstatus;

            search(searchSettings, 0, false);
        });
    };

    document.querySelector("#searchTerms").addEventListener("keyup", () => {
        clearTimeout(typeTimer);
        typeTimer = setTimeout(() => {
            search(searchSettings, 0, false);
        }, 1000);
    });

    document.querySelector("#searchTerms").addEventListener("keydown", () => {
        clearTimeout(typeTimer);
    });

    document.querySelector("a[data-modeosu='0']").classList.add("clicked");
    document.querySelector("a[data-rankstatus='1']").classList.add("clicked");
};

function toggleBeatmap(id, elm) {
    for (let map of document.querySelectorAll(".beatmapPlay")) map.innerHTML = '<i class="fa fa-play" style="font-size:48px;border-radius: 70%;"></i>';
    for (let map of document.querySelectorAll(".map")) map.classList.remove("musicPlaying");

    if (beatmapTimer) clearInterval(beatmapTimer);

    for (let i in beatmapAudios) {
        if (beatmapAudios[i].id == id) {
            if (!beatmapAudios[i].playing) {
                beatmapAudios[i].audio.volume = 0.2;
                beatmapAudios[i].audio.currentTime = 0;
                beatmapAudios[i].audio.play();

                elm.innerHTML = '<i class="fa fa-stop" style="font-size:48px;border-radius: 70%;"></i>';
                elm.parentElement.classList.add("musicPlaying");

                const audio = beatmapAudios[i].audio;
                beatmapTimer = setInterval(() => {
                    const played = 100 * audio.currentTime / audio.duration;

                    document.querySelector("#progressCSS").innerHTML = `
                        .musicPlaying:after {
                            width: ${played.toFixed(2)}%;
                        }
                    `;
                    if (audio.currentTime == audio.duration) {
                        // Beatmap has finished playing.
                        audio.currentTime = 0;
                        beatmapAudios[i].playing = false;
                        elm.innerHTML = '<i class="fa fa-play" style="font-size:48px;border-radius: 70%;"></i>';
                        elm.parentElement.classList.remove("musicPlaying");
                    }
                }, 1);
            } else {
                beatmapAudios[i].audio.pause();

                elm.innerHTML = '<i class="fa fa-play" style="font-size:48px;border-radius: 70%;"></i>';
                elm.parentElement.classList.remove("musicPlaying");
            };

            beatmapAudios[i].playing = !beatmapAudios[i].playing;
        } else {
            beatmapAudios[i].audio.currentTime = 0;
            beatmapAudios[i].audio.pause();
            beatmapAudios[i].playing = false;
        };
    };
};

async function search(options, offset = 0, r = false) {
    //console.log(`searching mode ${options.mode} with a status of ${options.status} and query ${options.terms}`);

    const querys = encodeURI(document.querySelector("#searchTerms").value) || "";
    const Mode = ["osu", "taiko", "fruits", "mania"];
    const Status = {
        "-2": "Graveyard",
        "-1": "WIP",
        "0": "Pending",
        "1": "Ranked",
        "3": "Qualified",
        "4": "Loved"
    };

    const Colors = {
        "138, 174, 23": [0.0, 1.99],
        "154, 212, 223": [2.0, 2.69],
        "222, 179, 42": [2.7, 3.99],
        "235, 105, 164": [4.0, 5.29],
        "114, 100, 181": [5.3, 6.49],
        "5, 5, 5": [6.5, Infinity],
    };

    const sources = [
        { name: "RealistikOsu", mirror: "https://ussr.pl/d/" },
        { name: "Beatconnect", mirror: "https://beatconnect.io/b/" },
        { name: "Mino", mirror: "https://catboy.best/d/" },
        { name: "osu.direct", mirror: "https://osu.direct/d/" },
    ];

    options.offset = (r ? options.offset + offset : 0);
    if (!r) document.querySelector("#maps").innerHTML = null;

    /*
        Green Easy: 0.0*–1.99* up 0.5
        color: rgb(138, 174, 23);

        Blue Normal: 2.0*–2.69* up 0.45
        color: rgb(154, 212, 223);

        Yellow Hard: 2.7*–3.99* up 0.25
        color: rgb(222, 179, 42);

        Pink Insane: 4.0*–5.29* up 0.05
        color: rgb(235, 105, 164);

        Purple Expert: 5.3*–6.49* up 0.05
        color: rgb(114, 100, 181);

        Black Expert+: >6.5*
        color: rgb(5, 5, 5);
    */

    var link = `${mirror_api}/search?offset=${options.offset || 0}&amount=${options.amount || 20}&query=${querys}`
    if (options.mode != "NaN" && options.mode == "") {
        link += `&mode=`
    } else if (options.mode != "NaN") {
        link += `&mode=${options.mode || 0}`
    }

    if (options.status != "NaN") {
        link += `&status=${options.status || 0}`
    }

    try {
        var res = await fetch(link).then(o => o.json());
    }
    catch {
        showMessage("error", "There has been an error while searching for beatmaps! Please notify a RealistikOsu developer!");
        return;
    }


    // adding time :(
    //console.log(querys);
    //console.log(res);

    for (let beatmap of res) {
        const diffsHTML = [];
        // Bubble sort to sort diffs.
        const diffs = beatmap.ChildrenBeatmaps;
        diffs.sort(function (a, b) { return a.DifficultyRating - b.DifficultyRating });
        const date = new Date(beatmap.LastUpdate).toUTCString
        let mapSection = "";


        if (beatmapAudios.filter(o => o.id == beatmap.SetID).length == 0) {
            beatmapAudios.push({
                id: beatmap.SetID,
                audio: new Audio(`https://b.ppy.sh/preview/${beatmap.SetID}.mp3`),
                playing: false
            });
        };

        mapSection += `
            <div class="eight wide column">
                <div class="map">
                    <div class="map-header">
                        <a href="/b/${beatmap.ChildrenBeatmaps[0].BeatmapID}">
                            <img src="https://assets.ppy.sh/beatmaps/${beatmap.SetID}/covers/cover.jpg" alt="">
                        </a>
                    </div>
                    <button class="beatmapPlay" onclick="toggleBeatmap(${beatmap.SetID}, this)"><i class="fa fa-play" style="font-size:48px;border-radius: 70%;"></i></button>
                    <div class="status">
                        <span style="color: white; cursor: default">${Status[beatmap.RankedStatus]}</span>
                    </div>
                    <div class="name">
                        <a class="bnName" href="/b/${beatmap.ChildrenBeatmaps[0].BeatmapID}">${beatmap.Title}</a>
                    </div>
                    <div class="artist">${beatmap.Artist}</div>
                    <div class="creator">by <a class="link-text" href="https://osu.ppy.sh/u/${encodeURI(beatmap.Creator)}"><b>${beatmap.Creator}</b></a></div>
                    <div class="downloadlist">
        `;

        for (let source of sources) {
            mapSection += `
                <a title="Download beatmap (${source.name})" href="${source.mirror + String(beatmap.SetID)}" class="download">
                   <i class="fa fa-download" style="color:white;"></i>
                </a>
            `;
        };

        mapSection += `
            </div>
            <div id="alldiff">
        `;

        for (let diff of diffs) {
            const sr = diff.DifficultyRating.toFixed(2);
            let colorOfChoice;

            for (let i in Colors) {
                if (sr >= Colors[i][0] && sr <= Colors[i][1]) {
                    colorOfChoice = i;
                };
            };

            diffsHTML.push(`
                <div class="diff2">
                    <div class="faa fal fa-extra-mode-${Mode[beatmap.ChildrenBeatmaps[0].Mode]} tooltip" style="color: rgb(${colorOfChoice});">
                        <span class="tooltiptext">${diff.DiffName} - ${sr}*</span>
                    </div>
                </div>
            `);
        };

        mapSection += `
                        ${diffsHTML.reverse().join("\n")}
                    </div>
                </div>
            </div>
        `;

        document.querySelector("#maps").innerHTML += mapSection;
    };
};

window.onscroll = () => {
    if ((window.innerHeight + window.scrollY) >= document.body.scrollHeight && document.querySelectorAll(".map").length > 0) {
        search(searchSettings, 20, true);
    };
};

window.onload = () => {
    buttons();

    search(searchSettings, 0, false);
};
