// code that is executed on every user profile
$(document).ready(function() {
	var wl = window.location;
	var newPathName = wl.pathname;
	// userID is defined in profile.html
	if (newPathName.split("/")[2] != userID) {
		newPathName = "/u/" + userID;
	}
	// if there's no mode parameter in the querystring, add it
	let markBool = wl.search.indexOf("?") !== -1
	let searchQuery = wl.search;
	if (wl.search.indexOf("mode=") === -1)
		if (markBool) {
			searchQuery += `&mode=${favouriteMode}`;
		} else {
			searchQuery = `?mode=${favouriteMode}`;
		}
	if (wl.search.indexOf("rx=") === -1)
		searchQuery += `&rx=${preferRelax}`;
	if (wl.search != searchQuery)
		window.history.replaceState('', document.title, newPathName + searchQuery + wl.hash);
	else if (wl.pathname != newPathName)
		window.history.replaceState('', document.title, newPathName + wl.search + wl.hash);
	setDefaultScoreTable();
	if (window.chart == null)
		initialiseChart(favouriteMode, preferRelax);
	// Credits to Akatsuki here :D
	$("#rx-menu>.item").click(function(e) {
        e.preventDefault();
        if ($(this).hasClass("active"))
            return;
        preferRelax = $(this).data("rx");
        updateChartData(favouriteMode, preferRelax);
        $("[data-mode]:not(.item):not([hidden])").attr("hidden", "");
        $("[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]:not(.item)").removeAttr("hidden");
        $("#rx-menu>.active.item").removeClass("active");
        var needsLoad = $("#scores-zone>[data-mode=" + favouriteMode + "][data-loaded=0][data-rx=" + preferRelax + "]");
        if (needsLoad.length > 0)
            initialiseScores(needsLoad, favouriteMode);
        $(this).addClass("active");
        window.history.replaceState('', document.title, `${wl.pathname}?mode=${favouriteMode}&rx=${preferRelax}${wl.hash}`)
    });
	$("#mode-menu>.item").click(function(e) {
        e.preventDefault();
        if ($(this).hasClass("active"))
            return;
        var m = $(this).data("mode");
        favouriteMode = m;
        updateChartData(favouriteMode, preferRelax);
        $("[data-mode]:not(.item):not([hidden])").attr("hidden", "");
        $("[data-mode=" + m + "][data-rx=" + preferRelax + "]:not(.item)").removeAttr("hidden");
        $("#mode-menu>.active.item").removeClass("active");
        var needsLoad = $("#scores-zone>[data-mode=" + m + "][data-loaded=0][data-rx=" + preferRelax + "]");
        if (needsLoad.length > 0)
            initialiseScores(needsLoad, m);
        $(this).addClass("active");
        window.history.replaceState('', document.title, `${wl.pathname}?mode=${m}&rx=${preferRelax}${wl.hash}`);
    });
	initialiseFriends();
	// load scores page for the current favourite mode
	var i = function(){
		initialiseScores($("#scores-zone>div[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]"), favouriteMode)
	};
	if (i18nLoaded)
		i();
	else
		i18next.on("loaded", function() {
			i();
		});
	loadOnlineStatus();
	setInterval(loadOnlineStatus, 10000);
});

function updateChartData(mode, rx) {
	var relax
	switch (rx) {
		case 1:
			relax = "Relax";
			break;
		case 2:
			relax = "Autopilot";
			break;
		default:
			relax = "Vanilla";
	}
	fetch(`https://ussr.pl/api2/getuser/${userID}`)
	.then(res => res.json())
	.then((out) => {
		var label;
		switch (mode) {
			case 1:
				label = out[relax]["RankTAI"];
				break;
			case 2:
				label = out[relax]["RankCTB"];
				break;
			case 3:
				label = out[relax]["RankMAN"];
				break;
			default:
				label = out[relax]["RankSTD"];
		}

	    window.chart.data.datasets[0].data = label;
	    window.chart.options.scales.yAxes[0].ticks.max = Math.max(...label) + 10;
	    window.chart.update();
	})
	.catch(err => { throw err }); 
}

function initialiseChart(mode, rx) {
	var relax
	switch (rx) {
		case 1:
			relax = "Relax";
			break;
		case 2:
			relax = "Autopilot";
			break;
		default:
			relax = "Vanilla";
	}
	fetch(`https://ussr.pl/api2/getuser/${userID}`)
	.then(res => res.json())
	.then((out) => {
		var graphCtx = document.getElementById('ProfileGraph').getContext('2d');

		var label;
		switch (mode) {
			case 1:
				label = out[relax]["RankTAI"];
				break;
			case 2:
				label = out[relax]["RankCTB"];
				break;
			case 3:
				label = out[relax]["RankMAN"];
				break;
			default:
				label = out[relax]["RankSTD"];
		}

		var data = {
			labels: out.Labels.VanillaLabel,
			datasets: [{
				label: "Rank",
				data: label,
				borderWidth: 2,
				backgroundColor: 'rgba(15, 151, 255, 0.73)',
				borderWidth: 0,
				borderColor: 'transparent',
				pointBorderWidth: 0,
				pointRadius: 3.5,
				pointBackgroundColor: 'transparent',
				pointHoverBackgroundColor: 'rgba(15, 151, 255, 0.73)',
				fill: "start"
			}]
		}

		window.chart = new Chart(graphCtx, {
			type: 'line',
			data: data,
			options: {
				legend: {
					display: false
				},
				scales: {
					yAxes: [{
						ticks: {
							beginAtZero: true,
							reverse: true,
							max: Math.max(...data.datasets[0].data) + 10
						}
					}],
					xAxes: [
						{
							ticks: {
								display: false
							}
						}
					]
				}
			}
		});
	})
	.catch(err => { throw err }); 
}

function formatOnlineStatusBeatmap(a) {
	var hasLink = a.beatmap.id > 0;
	//return "<i>" + (hasLink ? "<a href='/b/" + escapeHTML(a.beatmap.id) + "'>" : "") + escapeHTML(a.text) + (hasLink ? '</a>' : '' ) + "</i>";
	return escapeHTML(a.text)
}

function loadOnlineStatus() {
	// load in-game status through delta api
	banchoAPI('clients/' + userID, {}, function(resp) {

		var client = null;
		resp.clients.forEach(function (el) {
			if (el.type === 0 || client === null) {
				client = el
			}
		});
		if (client !== null) {
			var innerHtml, hexColour;
			switch (client.type) {
				case 0: {
					// bancho
					switch (client.action.id) {
						case 1: {
							// AFK
							hexColour = "rgb(10, 10, 10)"
							innerHtml = `<span class data-tooltip="AFK"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break
						case 2: {
							// Playing
							hexColour = "rgb(140, 160, 160)"
							innerHtml = `<span class data-tooltip="Playing ${formatOnlineStatusBeatmap(client.action)}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break
						case 3: {
							// Editing
							hexColour = "rgb(160, 60, 60)"
							innerHtml = `<span class data-tooltip="Editing ${formatOnlineStatusBeatmap(client.action)}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 4: {
							// Modding
							hexColour = "rgb(60, 160, 60)"
							innerHtml = `<span class data-tooltip="Modding ${formatOnlineStatusBeatmap(client.action)}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 5: {
							// In match
							hexColour = "rgb(164, 108, 28)"
							innerHtml = `<span class data-tooltip="In Multiplayer Match"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 12: {
							// Playing multi
							hexColour = "rgb(221, 190, 0)"
							innerHtml = `<span class data-tooltip="Multiplaying ${formatOnlineStatusBeatmap(client.action)}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 11: {
							// In lobby
							hexColour = "rgb(164, 108, 28)"
							innerHtml = `<span class data-tooltip="In Multiplayer Lobby"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 6: {
							// Spectating.
							innerHtml = `<span class data-tooltip="Spectating ${formatOnlineStatusBeatmap(client.action)}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						default: {
							// online
							hexColour = "rgb(10, 29, 75)"
							innerHtml = `<span class data-tooltip="Online"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						};
					}
				}; break;
			}
		} else {
			// offline
			// we wont pulse if they are offline.
			innerHtml = `<span class data-tooltip="Offline"><img alt="avatar" src="https://a.ussr.pl/${userID}" style="border-radius: 100%;width: 125px;margin-top: -6rem; box-shadow: 0px 0px 15px #000000;">`;
		}

		document.documentElement.style.setProperty('--pulse-color', hexColour);
		$('#avatar-canvas').html(innerHtml);
	});
}

function loadMostPlayedBeatmaps(mode) {
	var mostPlayedTable = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] table[data-type='most-played']");
	currentPage[preferRelax][mode].mostPlayed++
	api('users/most_played', {id: userID, mode: mode, p: currentPage[preferRelax][mode].mostPlayed, l: 5, rx: preferRelax}, function (resp) {
		if (resp.beatmaps === null) {
			return;
		}

		document.getElementById("mostplayedbmaps").innerHTML = resp.total
		resp.beatmaps.forEach(function(el, idx) {
			mostPlayedTable.children('tbody').append(
				$("<tr />").append(
					$("<td />").append(
						$("<h4 class='ui image header' />").append(
							$("<img src='https://assets.ppy.sh/beatmaps/" + el.beatmap.beatmapset_id + "/covers/list.jpg' class='ui mini rounded image'>"),
							$("<div class='content' />").append(
								$("<a href='/beatmaps/" + el.beatmap.beatmap_id + "' />").append(
									$('<b />').text(el.beatmap.song_name)
								)
							)
						)
					),
					$("<td class='right aligned' />").append(
						$('<i class="play circle icon" />'),
						$('<b />').text(el.playcount)
					)
				)
			)
		})
		if (resp.beatmaps.length === 5) {
			mostPlayedTable.find('.load-more').removeClass('disabled')
		}
	})
}

function initialiseAchievements() {
	api('users/achievements' + (currentUserID == userID ? '?all' : ''),
		{id: userID}, function (resp) {
		var achievements = resp.achievements;
		// no achievements -- show default message
		if (achievements.length === 0) {
			$("#achievements")
				.append($("<div class='ui sixteen wide column'>")
					.text(T("Nothing here. Yet.")));
			$("#load-more-achievements").remove();
			return;
		}

		var displayAchievements = function(limit, achievedOnly) {
			var $ach = $("#achievements").empty();
			limit = limit < 0 ? achievements.length : limit;
			var shown = 0;
			for (var i = 0; i < achievements.length; i++) {
				var ach = achievements[i];
				if (shown >= limit || (achievedOnly && !ach.achieved)) {
					continue;
				}
				shown++;
				$ach.append(
					$("<div class='ui two wide column'>").append(
						$("<img src='https://s.ripple.moe/images/medals-" +
							"client/" + ach.icon + ".png' alt='" + ach.name +
							"' class='" +
							(!ach.achieved ? "locked-achievement" : "achievement") +
							"'>").popup({
							title: ach.name,
							content: ach.description,
							position: "bottom center",
							distanceAway: 10
						})
					)
				);
			}
			// if we've shown nothing, and achievedOnly is enabled, try again
			// this time disabling it.
			if (shown == 0 && achievedOnly) {
				displayAchievements(limit, false);
			}
		};

		// only 8 achievements - we can remove the button completely, because
		// it won't be used (no more achievements).
		// otherwise, we simply remove the disabled class and add the click handler
		// to activate it.
		if (achievements.length <= 8) {
			$("#load-more-achievements").remove();
		} else {
			$("#load-more-achievements")
				.removeClass("disabled")
				.click(function() {
				$(this).remove();
				displayAchievements(-1, false);
			});
		}
		displayAchievements(8, true);
	});
}

function initialiseFriends() {
	var b = $("#add-friend-button");
	if (b.length == 0) return;
	api('friends/with', {id: userID}, setFriendOnResponse);
	b.click(friendClick);
}
function setFriendOnResponse(r) {
	var x = 0;
	if (r.friend) x++;
	if (r.mutual) x++;
	setFriend(x);
}
function setFriend(i) {
	var b = $("#add-friend-button");
	b.removeClass("loading green blue red");
	switch (i) {
	case 0:
		b
			.addClass("blue")
			.attr("title", T("Add friend"))
			.html("<i class='plus icon'></i>");
		break;
	case 1:
		b
			.addClass("green")
			.attr("title", T("Remove friend"))
			.html("<i class='minus icon'></i>");
		break;
	case 2:
		b
			.addClass("red")
			.attr("title", T("Unmutual friend"))
			.html("<i class='heart icon'></i>");
		break;
	}
	b.attr("data-friends", i > 0 ? 1 : 0)
}
function friendClick() {
	var t = $(this);
	if (t.hasClass("loading")) return;
	t.addClass("loading");
	api("friends/" + (t.attr("data-friends") == 1 ? "del" : "add"), {user: userID}, setFriendOnResponse, true);
}

var defaultScoreTable;
function setDefaultScoreTable() {
	defaultScoreTable = $("<table class='ui table score-table' />")
		.append(
			$("<thead />").append(
				$("<tr />").append(
					$("<th>" + T("General info") + "</th>"),
					$("<th>"+ T("Score") + "</th>")
				)
			)
		)
		.append(
			$("<tbody />")
		)
		.append(
			$("<tfoot />").append(
				$("<tr />").append(
					$("<th colspan=2 />").append(
						$("<div class='ui floated pagination' />").append(
							$("<a class='ui button load-more-button inverted violet disabled'>" + T("Load more") + "</a>").click(loadMoreClick)
						)
					)
				)
			)
		)
	;
}
i18next.on('loaded', function(loaded) {
	setDefaultScoreTable();
});
function initialiseScores(el, mode) {
	el.attr("data-loaded", "1");
	var best = defaultScoreTable.clone(true).addClass("purple");
	var recent = defaultScoreTable.clone(true).addClass("blue");
	var first = defaultScoreTable.clone(true).addClass("red");
	var mostPlayedBeatmapsTable = $("<table class='ui table F-table green' data-mode='" + mode + "' data-rx='" + preferRelax + "' />")
			.append(
					$("<thead />").append(
							$("<tr />").append(
									$("<th>"+ T("Beatmap") + "</th>"),
									$("<th class='right aligned'>"+ T("Plays") + "</th>")
							)
					)
			)
			.append(
					$('<tbody />')
			)
			.append(
					$("<tfoot />").append(
							$("<tr />").append(
									$("<th colspan=2 />").append(
											$("<div class='ui floated pagination' />").append(
													$("<a class='ui button load-more inverted violet disabled'>" + T("Load more") + "</a>").click(loadMoreMostPlayed)
											).append(
												$('<div class="ui label inverted violet" style="background-color: #A291FB !important" id="mostplayedbmaps">0</div>')
											)
									)
							)
					)
			)
	best.attr("data-type", "best");
	recent.attr("data-type", "recent");
	first.attr("data-type", "first");
	mostPlayedBeatmapsTable.attr("data-type", "most-played");
	first.addClass("no bottom margin");
	el.append($("<div class='ui segments no bottom margin' />").append(
		$("<div class='ui segment' />").append('<h4 class="ui horizontal divider header"><i class="angle double up icon"></i>Best Scores</h4>', best),
		$("<div class='ui segment' />").append('<h4 class="ui horizontal divider header"><i class="play icon"></i>Most Played Beatmaps</h4>', mostPlayedBeatmapsTable),
		$("<div class='ui segment' />").append('<h4 class="ui horizontal divider header"><i class="history icon"></i>Recent Scores</h4>', recent),
		$("<div class='ui segment' />").append('<h4 class="ui horizontal divider header"><i class="trophy icon"></i>First Places</h4>', first)
	));
	loadScoresPage("best", mode);
	loadScoresPage("recent", mode);
	loadScoresPage("first", mode);
	loadMostPlayedBeatmaps(mode);
};
function loadMoreClick() {
	var t = $(this);
	if (t.hasClass("disabled"))
		return;
	t.addClass("disabled");
	var type = t.parents("table[data-type]").data("type");
	var mode = t.parents("div[data-mode]").data("mode");
	loadScoresPage(type, mode);
}
function loadMoreMostPlayed() {
	var t = $(this);
	if (t.hasClass("disabled"))
		return;
	t.addClass("disabled");
	var mode = t.parents("div[data-mode]").data("mode");
	loadMostPlayedBeatmaps(mode);
}
// currentPage for each mode
var currentPage = {
	0: {0: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		1: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		2: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		3: {best: 0, recent: 0, mostPlayed: 0, first: 0}
	},
	1: {0: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		1: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		2: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		3: {best: 0, recent: 0, mostPlayed: 0, first: 0}
	},
	2: {0: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		1: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		2: {best: 0, recent: 0, mostPlayed: 0, first: 0},
		3: {best: 0, recent: 0, mostPlayed: 0, first: 0}
	}
};

var scoreStore = {};
const DIFF_MAX_LEN = 32;
function loadScoresPage(type, mode) {
	var table = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] table[data-type=" + type + "] tbody");
	var page = ++currentPage[preferRelax][mode][type];
	console.log("loadScoresPage with", {
		page: page,
		type: type,
		mode: mode,
		rx: preferRelax
	});
	var limit = type === 'best' ? 10 : 5;
	api("users/scores/" + type, {
		mode: mode,
		p: page,
		l: limit,
		rx: preferRelax,
		id: userID
	}, function(r) {
		if (r.scores == null) {
			disableLoadMoreButton(type, mode);
			return;
		}
		//if (type == "first"){
			//screw jqery, webjs god
		//	document.getElementById("firstplace-text").innerHTML = T("First Places") + ` (${r.total})`;
		//}
		r.scores.forEach(function(v, idx){
			scoreStore[v.id] = v;
			var scoreRank = getRank(mode, v.mods, v.accuracy, v.count_300, v.count_100, v.count_50, v.count_miss);
			var scoreRankIcon = "<img src='/static/ranking-icons/ranking-" + scoreRank + "-small.png' class='score rank' alt='" + scoreRank + "'> ";
			var rowColor = '';
			// Please at least credit if you steal this :(
			if (v.completed < 2){
				var StyleCol = "#6b201f"; // jajajaja
			} else {
				var StyleCol = "#212121";
			}
			
			if (type === 'recent') {
				rowColor = v.completed === 3 ? 'positive' : v.completed < 2 ? 'error' : '';
			}

			// THIS IS RETARDED. IDK REGEX. WHY IS SONG_NAME ALL IN ONE???
			let song_name_f = v.beatmap.song_name;
			let fufrieu = song_name_f.split("[");
			let acc_song_name = song_name_f[0].substring(0, fufrieu[0].length - 1);
			let diff_name = song_name_f[1].substring(1, fufrieu[1].length - 1);

			if (diff_name.length > DIFF_MAX_LEN) {
				// Heck. Gotta reconstruct the bmap name.
				v.beatmap.song_name = `${acc_song_name} [${diff_name.substring(0, DIFF_MAX_LEN - 3) + "..."}]`
			}

			table.append($("<tr class='new score-row " + rowColor + "' data-scoreid='" + v.id + "' style='background: linear-gradient(90deg," + StyleCol + ", #00000087," + StyleCol + "), url(https://assets.ppy.sh/beatmaps/" + v.beatmap.beatmapset_id + "/covers/cover.jpg) no-repeat right !important; background-size: cover !important;' />").append(
				$(
					"<td>" + (v.completed < 2 ? '' : scoreRankIcon) +
					escapeHTML(v.beatmap.song_name) + " <b>" + getScoreMods(v.mods) + "</b> <i>(" + v.accuracy.toFixed(2) + "%)</i><br />" +
					"<div class='subtitle'><time class='new timeago' datetime='" + v.time + "'>" + v.time + "</time></div></td>"
				),
				$("<td><b>" + ppOrScore(v.pp, v.score) + "</b> " + weightedPP(type, page, idx, v.pp) +	(v.completed == 3 ? "<br>" + downloadStar(v.id) : "") +	"</td>")
			));
		});
		$(".new.timeago").timeago().removeClass("new");
		$(".new.score-row").click(viewScoreInfo).removeClass("new");
		$(".new.downloadstar").click(function(e) {
			e.stopPropagation();
		}).removeClass("new");
		var enable = true;
		if (r.scores.length !== limit)
			enable = false;
		disableLoadMoreButton(type, mode, enable);
	});
}
function downloadStar(id) {
	return "<a href='/web/replays/" + id + "' class='new downloadstar'><i class='star icon'></i>" + T("Get") + "</a>";
}
function weightedPP(type, page, idx, pp) {
	if (type != "best" || pp == 0)
		return "";
	var perc = Math.pow(0.95, ((page - 1) * 20) + idx);
	var wpp = pp * perc;
	return "<i title='Weighted PP, " + Math.round(perc*100) + "%'>(" + wpp.toFixed(2) + "pp)</i>";
}
function disableLoadMoreButton(type, mode, enable) {
	var button = $("#scores-zone div[data-mode=" + mode + "] table[data-type=" + type + "] .load-more-button");
	if (enable) button.removeClass("disabled");
	else button.addClass("disabled");
}
function viewScoreInfo() {
	var scoreid = $(this).data("scoreid");
	if (!scoreid && scoreid !== 0) return;
	var s = scoreStore[scoreid];
	if (s === undefined) return;

	// data to be displayed in the table.
	var data = {
		"Points":			 addCommas(s.score),
		"PP":					 addCommas(s.pp),
		"Beatmap":			"<a href='/beatmaps/" + s.beatmap.beatmap_id + "'>" + escapeHTML(s.beatmap.song_name) + "</a>",
		"Accuracy":		 s.accuracy + "%",
		"Max combo":		addCommas(s.max_combo) + "/" + addCommas(s.beatmap.max_combo)
											+ (s.full_combo ? " " + T("(full combo)") : ""),
		"Difficulty":	 T("{{ stars }} star", {
			stars: s.beatmap.difficulty2[modesShort[s.play_mode]],
			count: Math.round(s.beatmap.difficulty2[modesShort[s.play_mode]]),
	 }),
		"Mods":				 getScoreMods(s.mods, true),
		"Passed":			 T(s.completed >= 2 ? "Yes" : "No"),
		"Personal high score": T(s.completed === 3 ? "Yes" : "No")
	};

	// hits data
	var hd = {};
	var trans = modeTranslations[s.play_mode];
	[
		s.count_300,
		s.count_100,
		s.count_50,
		s.count_geki,
		s.count_katu,
		s.count_miss,
	].forEach(function(val, i) {
		hd[trans[i]] = val;
	});

	data = $.extend(data, hd, {
		"Ranked?":			T(s.completed == 3 ? "Yes" : "No"),
		"Achieved":		 s.time,
		"Mode":				 modes[s.play_mode],
	});

	var els = [];
	$.each(data, function(key, value) {
		els.push(
			$("<tr />").append(
				$("<td>" + T(key) + "</td>"),
				$("<td>" + value + "</td>")
			)
		);
	});

	$("#score-data-table tr").remove();
	$("#score-data-table").append(els);
	$(".ui.modal").modal("show");
}

var modeTranslations = [
	[
		"300s",
		"100s",
		"50s",
		"Gekis",
		"Katus",
		"Misses"
	],
	[
		"GREATs",
		"GOODs",
		"50s",
		"GREATs (Gekis)",
		"GOODs (Katus)",
		"Misses"
	],
	[
		"Fruits (300s)",
		"Ticks (100s)",
		"Droplets",
		"Gekis",
		"Droplet misses",
		"Misses"
	],
	[
		"300s",
		"200s",
		"50s",
		"Max 300s",
		"100s",
		"Misses"
	]
];

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

function ppOrScore(pp, score) {
	if (pp != 0)
		return addCommas(pp.toFixed(2)) + "pp";
	return addCommas(score);
}

function beatmapLink(type, id) {
	if (type == "s")
		return "<a href='/s/" + id + "'>" + id + '</a>';
	return "<a href='/beatmaps/" + id + "'>" + id + '</a>';
}
