"use strict";

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

function getRank(gameMode, mods, acc, c300, c100, c50, cmiss) {
  var total = c300 + c100 + c50 + cmiss;

  // Hidden | Flashlight | FadeIn
  var hdfl = (mods & (1049608)) > 0;

  var ss = hdfl ? "SS+" : "SS";
  var s = hdfl ? "S+" : "S";

  switch (gameMode) {
    case 0:
    case 1:
      var ratio300 = c300 / total;
      var ratio50 = c50 / total;

      if (ratio300 == 1)
        return ss;

      if (ratio300 > 0.9 && ratio50 <= 0.01 && cmiss == 0)
        return s;

      if ((ratio300 > 0.8 && cmiss == 0) || (ratio300 > 0.9))
        return "A";

      if ((ratio300 > 0.7 && cmiss == 0) || (ratio300 > 0.8))
        return "B";

      if (ratio300 > 0.6)
        return "C";

      return "D";

    case 2:
      if (acc == 100)
        return ss;

      if (acc > 98)
        return s;

      if (acc > 94)
        return "A";

      if (acc > 90)
        return "B";

      if (acc > 85)
        return "C";

      return "D";

    case 3:
      if (acc == 100)
        return ss;

      if (acc > 95)
        return s;

      if (acc > 90)
        return "A";

      if (acc > 80)
        return "B";

      if (acc > 70)
        return "C";

      return "D";
  }
}

function timeSince(date) {

  var seconds = Math.floor((new Date() - date) / 1000);

  var interval = seconds / 31536000;

  if (interval > 1) {
    return Math.floor(interval) + "y";
  }
  interval = seconds / 2592000;
  if (interval > 1) {
    return Math.floor(interval) + "m";
  }
  interval = seconds / 86400;
  if (interval > 1) {
    return Math.floor(interval) + "d";
  }
  interval = seconds / 3600;
  if (interval > 1) {
    return Math.floor(interval) + "h";
  }
  interval = seconds / 60
  if (interval > 1) {
    return Math.floor(interval) + "min";
  }
  return "now"
}

var mapset = {};

function FillScores(rx) {
  setData.forEach(function (diff) {
    mapset[diff.BeatmapID] = diff;
  });

  console.log(mapset);
  function loadLeaderboard(b, m) {
    var wl = window.location;
    window.history.replaceState('', document.title,
      "/beatmaps/" + b + "?mode=" + m + wl.hash);
    var Score = "pp";
    switch (rx) {
      case 0: //vanilla, default to score
        Score = "score"
        break;
      default: //rx + ap, use pp as score makes no sense in them
        Score = "pp";
        break;
    }
    api(`scores?sort=${Score},desc&sort=id,asc`, {
      mode: m,
      b: b,
      p: 1,
      l: 50,
      rx: rx
    },
      function (data) {
        //console.log(data);
        var tb = $(".ui.table tbody");
        tb.find("tr").remove();
        if (data.scores == null) {
          data.scores = [];
        }
        var i = 0;
        data.scores.sort(function (a, b) { return b.Score - a.Score; });
        data.scores.forEach(function (score) {

          const scoreMods = getScoreMods(score.mods).join("");

          var user = score.user;
          var scoreRank = getRank(m, score.mods, score.accuracy, score.count_300, score.count_100, score.count_50, score.count_miss);
          var scoreRankIcon = `<a class="score-rank rank-${scoreRank.toLowerCase().replace("+", "h")}">${scoreRank}</a>`
          tb.append(
            $("<tr class='l-player' />").append(
              $("<td data-sort-value=" + ++i + " />").html(
                `#${(page - 1) * 50 + i}`
              ),
              $("<td />").html(
                "<a class='link-text l-player-data' style='display: flex;align-items: center;gap: 0.5rem;' href='/u/" +
                user.id +
                "' title='View profile'><img src='/static/images/new-flags/flag-" +
                user.country.toLowerCase() +
                ".svg' class='new-flag nopad'></img>" +
                " " +
                escapeHTML(user.username) +
                "</a>"
              ),
              $("<td class='center aligned' />").html(scoreRankIcon),
              $("<td class='center aligned' data-sort-value=" + score.score + " />").html(
                addCommas(score.score)
              ),
              $("<td class='center aligned' data-sort-value=" + score.accuracy + " />").text(
                score.accuracy.toFixed(2) + "%"
              ),
              $("<td class='center aligned' data-sort-value=" + score.max_combo + " />").text(
                addCommas(score.max_combo) + "x"
              ),
              $("<td class='center aligned' data-sort-value=" + score.pp.toFixed(0) + " />").html(
                score.pp.toFixed(0) + "pp"
              ),
              $("<td class='center aligned' />").html(getScoreMods(score.mods, true)),
              $("<td class='center aligned' data-sort-value=" + Date.parse(score.time).valueOf() + " />").html(timeSince(Date.parse(score.time))),
              $("<td class='center aligned' />").html(
                "<a href='/web/replays/" +
                score.id +
                "' title='Download Replay' class='new downloadstar'><i class='fa-solid fa-download icon'></i>Get</a>"
              )
            )
          );
        });
      });
  }
  function changeDifficulty(bid) {
    // load info
    var diff = mapset[bid];

    // column 2
    $("#cs").html(diff.CS);
    $("#hp").html(diff.HP);
    $("#od").html(diff.OD);
    $("#passcount").html(addCommas(parseInt(diff.Passcount)));
    $("#playcount").html(addCommas(parseInt(diff.Playcount)));

    // column 3
    $("#ar").html(diff.AR);
    $("#stars").html(parseFloat(diff.DifficultyRating).toFixed(2));
    $("#length").html(timeFormat(parseInt(diff.TotalLength)));
    $("#drainLength").html(timeFormat(parseInt(diff.HitLength)));
    $("#bpm").html(diff.BPM);

    // hide mode for non-std maps
    if (parseInt(diff.Mode) != 0) {
      $("#mode-menu").hide();
    } else {
      $("#mode-menu").show();
    }

    // update mode menu
    $("#mode-menu .active.item").removeClass("active");
    $("#mode-" + currentMode).addClass("active");

    currentMode = parseInt(diff.Mode);
    loadLeaderboard(bid, currentMode);
  }
  window.loadLeaderboard = loadLeaderboard;
  window.changeDifficulty = changeDifficulty;
  changeDifficulty(beatmapID);
  // loadLeaderboard(beatmapID, currentMode);
  $("#diff-menu .item")
    .click(function (e) {
      e.preventDefault();
      $(this).addClass("active");
      beatmapID = $(this).data("bid");
      changeDifficulty(beatmapID);
    });
  $("#mode-menu .item")
    .click(function (e) {
      e.preventDefault();
      $("#mode-menu .active.item").removeClass("active");
      $(this).addClass("active");
      currentMode = $(this).data("mode");
      loadLeaderboard(beatmapID, currentMode);
      currentModeChanged = true;
    });
  $("table.sortable").tablesort();
};
