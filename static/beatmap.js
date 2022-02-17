
function getScoreModsHtml(e, t) {
    var n = [];
    return 512 == (512 & e) && (e &= -65), 16384 == (16384 & e) && (e &= -33), modsHtml.forEach(function(t, i) {
        (e & 1 << i) > 0 && n.push(t)
    }), n.length > 0 ? (t ? "" : "+ ") + n.join(" ") : t ? T("") : ""
}

var modsHtml = [
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_no-fail.ca1a6374.png'>",
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_easy.076c7e8c.png'>",
"NV", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_hidden.cfc32448.png'>", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_flashlight.be8ff220.png'>", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_sudden-death.d0df65c7.png'>",
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_double-time.348a64d3.png'>", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_relax.dbcfb8d8.png'>", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_half.3e707fd4.png'>",
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_nightcore.240c22f2.png'>", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_flashlight.be8ff220.png'>", 
"AU", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_spun-out.989be71e.png'>",
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_autopilot.31c6ca71.png'>", 
"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_perfect.460b6e49.png'>",
"K4", 
"K5", 
"K6", 
"K7", 
"K8", 
"K9", 
"RN", 
"LM", 
"K9", 
"K0", 
"K1", 
"K3", 
"K2"
]

function getRank(gameMode, mods, acc, c300, c100, c50, cmiss) {
  var total = c300+c100+c50+cmiss;

  // Hidden | Flashlight | FadeIn
  var hdfl = (mods & (1049608)) > 0;

  var ss = hdfl ? "SSHD" : "SS";
  var s = hdfl ? "SHD" : "S";

  switch(gameMode) {
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

function FillScores(rx) {
  var mapset = {};
  setData.forEach(function(diff) {
    mapset[diff.beatmap_id] = diff;
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
      mode : m,
      b : b,
      p : 1,
      l : 50,
      rx: rx
    },
    function(data) {
      //console.log(data);
      var tb = $(".ui.table tbody");
      tb.find("tr").remove();
      if (data.scores == null) {
        data.scores = [];
      }
      var i = 0;
      data.scores.sort(function(a, b) { return b.Score - a.Score; });
      data.scores.forEach(function(score) {
        var user = score.user;
        var scoreRank = getRank(m, score.mods, score.accuracy, score.count_300, score.count_100, score.count_50, score.count_miss);
        var scoreRankIcon = "<img style='margin-bottom: -2.3px;' src='/static/ranking-icons/ranking-" + scoreRank + "-small.png' class='score rank' alt='" + scoreRank + "'> ";
        tb.append($("<tr />").append(

          $("<td style='font-size: 15px;' data-sort-value=" + (++i) + " />")
            .html(`#${((page - 1) * 50 + i)}`),
          $("<td />").html(scoreRankIcon),
          $("<td style='font-size: 15px;' data-sort-value=" + score.score + " />")
            .html(addCommas(score.score)),
          $("<td style='font-size: 15px;' data-sort-value=" + score.accuracy + " />")
            .text(score.accuracy.toFixed(2) + "%"),
          $("<td style='font-size: 15px;' />").html("<a href='/u/" + user.id +
                                 "' title='View profile'><img src='https://ussr.pl/static/images/new-flags/flag-" +
                                 user.country.toLowerCase() + ".svg' class='new-flag nopad' style='margin-bottom: -0.25em !important;'></img>" +
                                 " " + escapeHTML(user.username) + "</a>"),
          $("<td style='font-size: 15px;' data-sort-value=" + score.max_combo + " />")
            .text(addCommas(score.max_combo) + "x"),
          $("<td style='font-size: 15px;' data-sort-value=" + score.pp + " />")
            .html(score.pp.toFixed(2)),
          $("<td />").html(getScoreModsHtml(score.mods, true)),
          $("<td style='font-size: 15px;' />").html(timeSince(Date.parse(score.time))),
          $("<td />").html(`<a href="/web/replays/${score.id}" class="downloadstar"><i class="star icon"></i>Get</a>`)));
          // $("<td data-sort-value=" + score.score + " />")
          //   .html(addCommas(score.score)),
          // $("<td />").html(getScoreMods(score.mods, true)),
          // $("<td data-sort-value=" + score.accuracy + " />")
          //   .text(score.accuracy.toFixed(2) + "%"),
          // $("<td data-sort-value=" + score.max_combo + " />")
          //   .text(addCommas(score.max_combo)),
          // $("<td data-sort-value=" + score.pp + " />")
          //   .html(score.pp.toFixed(2)),
          // $("<td />").html(`<a href="/web/replays/${score.id}" class="downloadstar"><i class="star icon"></i>Get</a>`)));
      });
    });
  }
  function changeDifficulty(bid) {
    // load info
    var diff = mapset[bid];

    // column 2
    $("#cs").html(diff.diff_size);
    $("#hp").html(diff.diff_drain);
    $("#od").html(diff.diff_overall);
    $("#passcount").html(addCommas(parseInt(diff.passcount)));
    $("#playcount").html(addCommas(parseInt(diff.playcount)));

    // column 3
    $("#ar").html(diff.diff_approach);
    $("#stars").html(parseFloat(diff.difficultyrating).toFixed(2));
    $("#length").html(timeFormat(parseInt(diff.total_length)));
    $("#drainLength").html(timeFormat(parseInt(diff.hit_length)));
    $("#bpm").html(diff.bpm);

    // hide mode for non-std maps
    if (parseInt(diff.mode) != 0) {
      $("#mode-menu").hide();
    } else {
      $("#mode-menu").show();
    }

    // update mode menu
    $("#mode-menu .active.item").removeClass("active");
    $("#mode-" + currentMode).addClass("active");

    currentMode = parseInt(diff.mode);
    loadLeaderboard(bid, currentMode);
  }
  window.loadLeaderboard = loadLeaderboard;
  window.changeDifficulty = changeDifficulty;
  changeDifficulty(beatmapID);
  // loadLeaderboard(beatmapID, currentMode);
  $("#diff-menu .item")
    .click(function(e) {
      e.preventDefault();
      $(this).addClass("active");
      beatmapID = $(this).data("bid");
      changeDifficulty(beatmapID);
    });
  $("#mode-menu .item")
    .click(function(e) {
      e.preventDefault();
      $("#mode-menu .active.item").removeClass("active");
      $(this).addClass("active");
      currentMode = $(this).data("mode");
      loadLeaderboard(beatmapID, currentMode);
      currentModeChanged = true;
    });
  $("table.sortable").tablesort();
};
