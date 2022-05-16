"use strict";

const comma = n => n.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const scores = [];
const wsurl = "wss://ussr.pl/ws/scores/feed";
const filters = {
    type: "all",
    mode: "all"
}

const toImageMod = {
    "NF": "no-fail", "EZ": "easy",
    "TD": "touchdevice", // Previously used for NV
    "HD": "hidden", "HR": "hard-rock",
    "SD": "sudden-death", "DT": "double-time",
    "RX": "relax", "HT": "half",
    "NC": "nightcore", "FL": "flashlight",
    "AU": "auto", "AP": "autopilot",
    "PF": "perfect", "SO": "spun-out",
    "K4": "4Kc", "K5": "5Kc",
    "K6": "6Kc", "K7": "7Kc",
    "K8": "8Kc", "FI": "fader",
    "RN": "random", "LM": "",
    "K9": "9Kc", "K1": "1Kc",
    "K3": "3Kc", "K2": "2Kc",
    "S2": "", "MR": "mirror"
};

function getScoreMods(n) {
    const modsObj = {
        "NF": 1, "EZ": 2,
        "TD": 4, // Previously used for NV
        "HD": 8, "HR": 16,
        "SD": 32, "DT": 64,
        "RX": 128, "HT": 256,
        "NC": 512, "FL": 1024,
        "AU": 2048, "AP": 8192,
        "PF": 16384, "SO": 4096,
        "K4": 32768, "K5": 65536,
        "K6": 131072, "K7": 262144,
        "K8": 524288, "FI": 1048576,
        "RN": 2097152, "LM": 4194304,
        "K9": 16777216, "K1": 33554432,
        "K3": 67108864, "K2": 134217728,
        "S2": 536870912, "MR": 1073741824
    };    

    const _modsString = Object.keys(modsObj);
    const mods = JSON.parse(JSON.stringify(modsObj));
    const playmods = [];

    // has nc => remove dt
    if (n & mods.NC) {
        playmods.push("NC");
        mods.NC = 0;
        mods.DT = 0;
    } else if (n & mods.DT) {
        playmods.push("DT");
        mods.NC = 0;
        mods.DT = 0;
    }

    // has pf => remove sd
    if (n & mods.PF) {
        playmods.push("PF")
        mods.PF = 0;
        mods.SD = 0;
    } else if (n & mods.SD) {
        playmods.push("SD")
        mods.PF = 0;
        mods.SD = 0;
    }

    for (let mod = 0; mod < _modsString.length; mod++) {
        if (mods[_modsString[mod]] != 0 && (n & mods[_modsString[mod]])) {
            playmods.push(_modsString[mod]);
        }
    }

    return playmods;
}

function injectScore(elm, data, newScore) {
    const scoreMods = getScoreMods(data.mods);
    const passed = data.placement != 0;
	const rank = data.placement || "??";
    const userRank = data.user.rank || "??";
    const userCountryRank = data.user.c_rank || "??"

    const miss_or_fc = data.count_miss > 0 // If missed.
        ? `<b style="color: #BB5050">${data.count_miss}x Miss</b>` : data.max_combo > 0.97 * data.bmap.max_combo // If "fc"
        ? `<b style="color: #2BFF35">FC</b>` : `<b style="color: #CDE7E7">Sliderbreak</b>`;

    // format html based on data
    const infos = [
        data.accuracy.toFixed(2) + "%",
        miss_or_fc,
        comma(data.score),
        comma(data.pp.toFixed(2)) + "pp"
    ].map(o => `<span class="info-data-score">${o}</span>`).join("");

    const bgimg = passed ? 
        `linear-gradient(to left, rgba(0, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url('https://assets.ppy.sh/beatmaps/${data.bmap.set_id}/covers/cover.jpg')` :
        `linear-gradient(to left, rgba(80, 0, 0, 0.7), rgba(0, 0, 0, 0.9)), url('https://assets.ppy.sh/beatmaps/${data.bmap.set_id}/covers/cover.jpg')`;

    const mods = scoreMods.map(m => 
        `<img src="https://ussr.pl/static/images/mods/mod_${toImageMod[m]}.png" />`    
    ).join("");

    elm.innerHTML += `
        <div class="score-wrapper ${newScore ? 'slide slide-in' : ''}">
            <div class="score-item ui grid"
                style="background-image: ${bgimg}"
            >
                <div class="two wide column score-rank">
                    <div>
                        <h2>Map Rank</h2>
                        <h2>#${rank}</h2>
                    </div>
                </div>

                <div class="twelve wide column score-info">
                    <table class="user-data">
                        <td><img src="https://a.ussr.pl/${data.user_id}" class="avatar" /></td>
                        <td>
                            <h2 class="username">
                                <a href="/u/${data.user_id}" target="_blank">${data.username}</a>
                            </h2>
                            <div class="flags">
                                <div class="user-flags">
                                    <img src="https://ussr.pl/static/images/new-flags/xx.png" class="new-flag nopad" />
                                    <span>#${userRank}</span>
                                </div>

                                <div class="user-flags">
                                    <img src="https://ussr.pl/static/images/new-flags/flag-${data.user.country.toLowerCase()}.svg" class="new-flag nopad" />
                                    <span>#${userCountryRank}</span>
                                </div>
                            </div>
                        </td>
                    </table>

                    <div class="user-info">
                        <h1>
                            <a href="/beatmaps/${data.bmap.id}" target="_blank">${data.bmap.song_name}</a>
                            <span class="m-mods">+ ${scoreMods.join(", ")}</span>
                        </h1>
                        <div class="imgmods">${mods}</div>
                        <div class="infos">
                            <span class="m-placement info-data-score">#${rank}</span>
                            ${infos}
                        </div>
                    </div>
                </div>
            </div>

            <b class="m-global">#${rank}</b>
            <b class="rank rank-${data.grade.toLowerCase()}">${data.grade}</b>
        </div>
    `;
}

function render(newScore) {
    const container = document.getElementById("score-container");

    if (scores.length == 0) {
        container.innerHTML = `
            <div class="ui segment" id="loading-score">
                <div class="ui active dimmer">
                    <div class="ui text loader">Waiting for scores...</div>
                </div>
                <p></p>
            </div>	
        `;

        return;
    }

    let newScores = JSON.parse(JSON.stringify(scores)); // dup json
    container.innerHTML = null;

    // filter passed
    if (filters.type != "all") {
        newScores = newScores.filter(o => (o.passed && !o.quit));
    }

    // filter mode
    switch (filters.mode) {
        case "all":
            break;
        case "vn":
            newScores = newScores.filter(o => {
                const m = getScoreMods(o.mods);
                return !m.includes("RX") && !m.includes("AP");
            });

            break;
        case "rx":
            newScores = newScores.filter(o => getScoreMods(o.mods).includes("RX"));
            break;
        case "ap":
            newScores = newScores.filter(o => getScoreMods(o.mods).includes("AP"));
            break;
    }

    if (newScores.length == 0) {
        container.innerHTML = `
            <div id="no-scores">
                <h2>No scores yet...</h2>
                <h4>Try chaning some filters?</h4>
            </div>
        `;

        return;
    }

    for (const data of newScores.reverse()) {
        injectScore(container, data, (newScore && data == newScores[0]));
    }
}

function setMode(k, v) {
    console.log("set: ", k, v);
    filters[k] = v;

    document.querySelectorAll(".filter-btn").forEach(o => o.classList.remove("active"));
    document.querySelector(`#t_${filters.type}`).classList.add("active");
    document.querySelector(`#m_${filters.mode}`).classList.add("active");

    render(false);
}

onload = () => {
    const ws = new WebSocket(wsurl);

    ws.onopen = () => console.log("Connected to live server!");
    ws.onmessage = (e) => {
        scores.push(JSON.parse(e.data));

        render(true);
    }
}