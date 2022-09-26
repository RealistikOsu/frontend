// code that is executed on every user profile
$(document).ready(function () {
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
	$("#rx-menu>.item").click(function (e) {
		e.preventDefault();
		if ($(this).hasClass("active"))
			return;

		preferRelax = $(this).data("rx");
		$("#clickAutopilot").removeClass("disabled");
		$("#clickRelax").removeClass("disabled");

		$("#clickTaiko").removeClass("disabled");
		$("#clickCatch").removeClass("disabled");
		$("#clickMania").removeClass("disabled");

		switch (preferRelax) {
			case 1:
				$("#clickMania").addClass("disabled");
				break;
			case 2:
				$("#clickTaiko").addClass("disabled");
				$("#clickCatch").addClass("disabled");
				$("#clickMania").addClass("disabled");
				break;
		}
		initialiseScores($("#scores-zone>div[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]"), favouriteMode)
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
	$("#mode-menu>.item").click(function (e) {
		e.preventDefault();
		if ($(this).hasClass("active"))
			return;

		var m = $(this).data("mode");
		$("#clickAutopilot").removeClass("disabled");
		$("#clickRelax").removeClass("disabled");

		$("#clickTaiko").removeClass("disabled");
		$("#clickCatch").removeClass("disabled");
		$("#clickMania").removeClass("disabled");

		switch (m) {
			case 1:
				$("#clickAutopilot").addClass("disabled");
				break;
			case 2:
				$("#clickAutopilot").addClass("disabled");
				break;
			case 3:
				$("#clickRelax").addClass("disabled");
				$("#clickAutopilot").addClass("disabled");
				break;
		}
		favouriteMode = m;
		initialiseScores($("#scores-zone>div[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]"), favouriteMode)
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
	// This is such a mess...
	$("#clickAutopilot").removeClass("disabled");
	$("#clickRelax").removeClass("disabled");

	$("#clickTaiko").removeClass("disabled");
	$("#clickCatch").removeClass("disabled");
	$("#clickMania").removeClass("disabled");

	switch (preferRelax) {
		case 1:
			$("#clickMania").addClass("disabled");
			break;
		case 2:
			$("#clickTaiko").addClass("disabled");
			$("#clickCatch").addClass("disabled");
			$("#clickMania").addClass("disabled");
			break;
	}

	switch (favouriteMode) {
		case 1:
			$("#clickAutopilot").addClass("disabled");
			break;
		case 2:
			$("#clickAutopilot").addClass("disabled");
			break;
		case 3:
			$("#clickRelax").addClass("disabled");
			$("#clickAutopilot").addClass("disabled");
			break;
	}

	initialiseFriends();
	// load scores page for the current favourite mode
	var i = function () {
		initialiseScores($("#scores-zone>div[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]"), favouriteMode)
	};
	if (i18nLoaded)
		i();
	else
		i18next.on("loaded", function () {
			i();
		});
	//loadOnlineStatus();
	//setInterval(loadOnlineStatus, 10000);
});

function updateChartData(mode, rx) {
	fetch(`https://api.ussr.pl/users/rank_graph?id=${userID}&relax=${rx}&mode=${mode}`)
		.then(res => res.json())
		.then((out) => {
			let node = document.getElementById("graphNoData");
			if (node !== null && node.parentNode) {
				node.parentNode.removeChild(node);
			}

			window.chart.data.labels = createLabels(out.data)
			window.chart.data.datasets[0].data = out.data;
			window.chart.options.scales.yAxes[0].ticks.min = Math.min(...out.data);
			window.chart.options.scales.yAxes[0].ticks.max = Math.max(...out.data);
			window.chart.update();

			if (!out.data.length > 0) {
				var element = document.getElementById("GraphSegment");
				let msg = document.createElement("h3")
				msg.setAttribute("id", "graphNoData");
				msg.append("No data to display!")
				element.append(msg)
				return
			}

		})
		.catch(err => { throw err });
}

function createLabels(data) {
	var labels = ["now"]
	for (var i = 1; i < data.length; i++) {
		if (i == 1) {
			labels.push(`1 day ago`)
		} else {
			labels.push(`${i} days ago`)
		}
	}
	return labels.reverse()
}

function initialiseChart(mode, rx) {
	fetch(`https://api.ussr.pl/users/rank_graph?id=${userID}&relax=${rx}&mode=${mode}`)
		.then(res => res.json())
		.then((out) => {
			var graphCtx = document.getElementById('ProfileGraph').getContext('2d');

			let node = document.getElementById("graphNoData");
			if (node !== null && node.parentNode) {
				node.parentNode.removeChild(node);
			}

			var data = {
				labels: createLabels(out.data),
				datasets: [{
					fill: false,
					label: "Global Rank",
					data: out.data,
					lineTension: 0.3,
					borderWidth: 3.5,
					//backgroundColor: 'rgba(15, 151, 255, 0.73)',
					//borderWidth: 0,
					borderColor: 'rgba(15, 151, 255, 0.73)',
					//pointBorderWidth: 0,
					pointRadius: 8,
					pointBorderColor: 'transparent',
					pointBackgroundColor: 'transparent',
					pointHoverBackgroundColor: 'transparent',
					pointHoverBorderColor: 'rgba(15, 151, 255, 0.73)',
					pointHoverBorderWidth: 5,
					pointHoverRadius: 8
				}]
			}

			window.chart = new Chart(graphCtx, {
				type: 'line',
				data: data,
				bezierCurve: false,
				options: {
					legend: {
						display: false
					},
					scales: {
						yAxes: [{
							ticks: {
								beginAtZero: true,
								reverse: true,
								min: Math.min(...out.data),
								max: Math.max(...out.data),
								userCallback: function (label, index, labels) {
									// when the floored value is the same as the value we have a whole number
									if (Math.floor(label) === label) {
										return label;
									}

								},
							},
							gridLines: {
								display: false
							}
						}],
						xAxes: [
							{
								ticks: {
									display: false
								},
								gridLines: {
									display: false
								}
							}
						]
					}
				}
			});

			if (!out.data.length > 0) {
				var element = document.getElementById("GraphSegment");
				let msg = document.createElement("h3")
				msg.setAttribute("id", "graphNoData");
				msg.append("No data to display!")
				element.append(msg)
				return
			}

		})
		.catch(err => { throw err });
}

function formatOnlineStatusBeatmap(a) {
	var hasLink = a.beatmap.id > 0;
	//return "<i>" + (hasLink ? "<a href='/b/" + escapeHTML(a.beatmap.id) + "'>" : "") + escapeHTML(a.text) + (hasLink ? '</a>' : '' ) + "</i>";
	return escapeHTML(a.text)
}

function loadOnlineStatus() {
	return
	// load in-game status through delta api
	regularAPI('status/' + userID, {}, function (resp) {
		if (resp?.code === 200) {
			var innerHtml, hexColour;
					// bancho
					switch (resp.action.id) {
						case 1: {
							// AFK
							hexColour = "rgb(10, 10, 10)"
							innerHtml = `<span class data-tooltip="AFK"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break
						case 2: {
							// Playing
							hexColour = "rgb(140, 160, 160)"
							innerHtml = `<span class data-tooltip="${resp.action.text}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break
						case 3: {
							// Editing
							hexColour = "rgb(160, 60, 60)"
							innerHtml = `<span class data-tooltip="${resp.action.text}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 4: {
							// Modding
							hexColour = "rgb(60, 160, 60)"
							innerHtml = `<span class data-tooltip="${resp.action.text}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 5: {
							// In match
							hexColour = "rgb(164, 108, 28)"
							innerHtml = `<span class data-tooltip="In Multiplayer Match"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 12: {
							// Playing multi
							hexColour = "rgb(221, 190, 0)"
							innerHtml = `<span class data-tooltip="${resp.action.text}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 11: {
							// In lobby
							hexColour = "rgb(164, 108, 28)"
							innerHtml = `<span class data-tooltip="In Multiplayer Lobby"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						case 6: {
							// Spectating.
							innerHtml = `<span class data-tooltip="${resp.action.text}"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						}; break;
						default: {
							// online
							hexColour = "rgb(10, 29, 75)"
							innerHtml = `<span class data-tooltip="Online"><img class="pulse-avatar" alt="avatar" src="https://a.ussr.pl/${userID}">`;
						};
					}
			
		} else {
			// offline
			// we wont pulse if they are offline.
			hexColour = "rgb(10, 10, 10)"
			innerHtml = `<span class data-tooltip="Offline">`;
		}

		document.documentElement.style.setProperty('--pulse-color', hexColour);
		$('#avatar-canvas').html(innerHtml);
	});
}

function loadMostPlayedBeatmaps(mode) {
	var mostPlayedTable = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] table[data-type='most-played']");
	currentPage[preferRelax][mode].mostPlayed++
	api('users/most_played', { id: userID, mode: mode, p: currentPage[preferRelax][mode].mostPlayed, l: 5, rx: preferRelax }, function (resp) {
		if (resp.beatmaps === null) {
			return;
		}

		document.getElementById("mostplayed-text").innerHTML = '<i class="play icon"></i>' + T("Most Played Beatmaps") + ` (${resp.total})`;
		resp.beatmaps.forEach(function (el, idx) {
			mostPlayedTable.children('tbody').append(
				$("<tr style='background: linear-gradient(90deg,#212121,#00000087,#212121), url(https://assets.ppy.sh/beatmaps/"+ el.beatmap.beatmapset_id +"/covers/cover.jpg) no-repeat right !important; background-size: cover !important;' />").append(
					$("<td />").append(
						//$("<h4 class='ui image header' />").append(
						//$("<img src='https://assets.ppy.sh/beatmaps/" + el.beatmap.beatmapset_id + "/covers/list.jpg' class='ui mini rounded image'>"),
						$("<div class='content' />").append(
							$("<a href='/beatmaps/" + el.beatmap.beatmap_id + "' />").append(
								$('<b />').text(el.beatmap.song_name)
							)
						)
						//)
					),
					$("<td class='right aligned' />").append(
						$('<span style="margin-right: 5px;margin-top: 0.2em;"><span class="fas fa-play" /></span>'),
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
		{ id: userID }, function (resp) {
			var achievements = resp.achievements;
			// no achievements -- show default message
			if (achievements.length === 0) {
				$("#achievements")
					.append($("<div class='ui sixteen wide column'>")
						.text(T("Nothing here. Yet.")));
				$("#load-more-achievements").remove();
				return;
			}

			var displayAchievements = function (limit, achievedOnly) {
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
					.click(function () {
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
	api('friends/with', { id: userID }, setFriendOnResponse);
	b.click(friendClick);
}
function setFriendOnResponse(r) {
	var x = 0;
	if (r.friend) {
		if (window.relation != null && window.relation.friend != r.friend)
			window.followers++;
		x++;
	} else {
		if (window.relation != null && window.relation.friend != r.friend)
			window.followers--;
	}
	if (r.mutual) x++;
	window.relation = r;
	setFriend(x);
}
function setFriend(i) {
	var b = $("#add-friend-button");
	b.removeClass("loading green blue red");
	switch (i) {
		case 0:
			b
				.addClass("blue")
				.html(`<i class="fas fa-user-plus"></i>  ${window.followers}`);
			break;
		case 1:
			b
				.addClass("green")
				.html(`<i class="fas fa-user-times"></i>  ${window.followers}`);
			break;
		case 2:
			b
				.addClass("red")
				.html(`<i class="fas fa-user-friends"></i>  ${window.followers}`);
			break;
	}
	b.attr("data-friends", i > 0 ? 1 : 0)
}
function friendClick() {
	var t = $(this);
	if (t.hasClass("loading")) return;
	t.addClass("loading");
	api("friends/" + (t.attr("data-friends") == 1 ? "del" : "add"), { user: userID }, setFriendOnResponse, true);
}

var defaultScoreTable;
function setDefaultScoreTable() {
	defaultScoreTable = $("<table class='ui table score-table profile-table' />")
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
i18next.on('loaded', function (loaded) {
	setDefaultScoreTable();
});

function recentOnClick() {
	var value = $('#filter-failed').prop('checked')
	$("#recent-table").remove()
	var recent = defaultScoreTable.clone(true).addClass("blue").attr('id', 'recent-table');
	recentFilter(recent)
	recent.attr("data-type", "recent");
	var howManyTimes = currentPage[preferRelax][favouriteMode]["recent"]
	currentPage[preferRelax][favouriteMode]["recent"] = 0

	$(recent).insertAfter("#recenttable-text")
	$("#filter-failed").attr('checked', value);
	for (let i = 0; i < howManyTimes; i++) {
		loadScoresPage("recent", favouriteMode);
	}
}

function recentFilter(recent) {
	$(recent).find(".load-more-button").parent().append(`
		<div class="ui checkbox">
			<input onclick="recentOnClick()" id="filter-failed" type="checkbox">
			<label>Hide failed scores.</label>
		</div>
    `);
}

function initialiseScores(el, mode) {
	el.attr("data-loaded", "1");
	var pinned = defaultScoreTable.clone(true).addClass("t-pinned orange");
	var best = defaultScoreTable.clone(true).addClass("t-best purple");
	var recent = defaultScoreTable.clone(true).addClass("t-recent blue").attr('id', 'recent-table');
	var first = defaultScoreTable.clone(true).addClass("t-first red");

	recentFilter(recent);
	var mostPlayedBeatmapsTable = $("<table class='ui table F-table green profile-table' data-mode='" + mode + "' data-rx='" + preferRelax + "' />")
		.append(
			$('<tbody />')
		)
		.append(
			$("<tfoot />").append(
				$("<tr />").append(
					$("<th colspan=2 />").append(
						$("<div class='ui floated pagination' />").append(
							$("<a class='ui button load-more inverted violet disabled'>" + T("Load more") + "</a>").click(loadMoreMostPlayed)
						)
					)
				)
			)
		)
	
	pinned.attr("data-type", "pinned");
	best.attr("data-type", "best");
	recent.attr("data-type", "recent");
	first.attr("data-type", "first");
	mostPlayedBeatmapsTable.attr("data-type", "most-played");
	first.addClass("no bottom margin");
	
	for (const i in currentPage) {
		for (const j in currentPage[i]) {
			for (const k of Object.keys(currentPage[i][j])) {
				currentPage[i][j][k] = 0;
			}
		}
	}

	el.html($("<div id='scores-container' class='ui segments no bottom margin' />").append(
		$("<div class='t-pinned ui segment' style='display: none' />").append('<h4 class="ui horizontal divider header"><i class="star icon"></i>Pinned Scores</h4>', pinned),
		$("<div class='t-best ui segment' />").append('<h4 class="ui horizontal divider header"><i class="angle double up icon"></i>Best Scores</h4>', best),
		$("<div class='t-most ui segment' />").append('<h4 id="mostplayed-text" class="ui horizontal divider header"><i class="play icon"></i>Most Played Beatmaps</h4>', mostPlayedBeatmapsTable),
		$("<div class='t-recent ui segment' />").append('<h4 id="recenttable-text" class="ui horizontal divider header"><i class="history icon"></i>Recent Scores</h4>', recent),
		$("<div class='t-first ui segment' />").append('<h4 id="firstplace-text" class="ui horizontal divider header"><i class="trophy icon"></i>First Places</h4>', first)
	));

	loadScoresPage("pinned", mode);
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
var currentPage = [
	[
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 }
	],
	[
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 }
	],
	[	
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 },
		{ pinned: 0, best: 0, recent: 0, mostPlayed: 0, first: 0 }
	]
];

var scoreStore = {};
const DIFF_MAX_LEN = 32;

async function loadScoresPage(type, mode) {
	var table = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] table[data-type=" + type + "] tbody");
	var page = ++currentPage[preferRelax][mode][type];

	console.log("loadScoresPage with", {
		page: page,
		type: type,
		mode: mode,
		rx: preferRelax
	});

	var limit = type === 'best' ? 10 : 5;
	params = { mode: mode, p: page, l: limit, rx: preferRelax, id: userID }

	if ($('#filter-failed').prop('checked') && type === "recent") {
		params = { mode: mode, p: page, l: limit, rx: preferRelax, id: userID, filter: "recent" }
	}

	fetch(`/api/v1/users/scores/${type}?mode=${params.mode}&p=${params.p}&l=${params.l}&rx=${params.rx}&id=${params.id}`).then(o => o.json()).then(r => 
		buildPlays(r, type, mode, table, page, limit)	
	);
}

function buildPlays(r, type, mode, table, page, limit) {
	if (r.scores == null && params.p <= 1) {
		$(".t-pinned").hide()
	} else if (type == "pinned") {
		$(".t-pinned").show()
	}

	if (r.scores == null) {
		disableLoadMoreButton(type, mode);
		return;
	}

	if (type == "first") {
		//screw jqery, webjs god
		document.getElementById("firstplace-text").innerHTML = '<i class="trophy icon"></i>' + T("First Places") + ` (${r.total})`;
	}

	r.scores.forEach(function (v, idx) {
		// Filter dupes, XXX: temponary fix
		if (!type == "recent" && idx > 0 && v.beatmap_md5 === r.scores[idx-1].beatmap_md5) return;

		scoreStore[v.id] = v;
		var scoreRank = getRank(mode, v.mods, v.accuracy, v.count_300, v.count_100, v.count_50, v.count_miss);
		var scoreRankIcon = `<a style="margin-right: 0.2em !important;" class="score-rank rank-${scoreRank.toLowerCase().replace("+", "h")}">${scoreRank}</a>`
		var rowColor = '';
		// Please at least credit if you steal this :(
		if (v.completed < 2) {
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
		let acc_song_name = fufrieu[0].substring(0, fufrieu[0].length - 1);
		let diff_name = fufrieu[1].substring(1, fufrieu[1].length - 1);
		let failedClass = v.completed < 2 ? "score-failed-recent" : "";
		let apiImageParams = v.completed < 2 ? "?filter=grayscale" : "";

		if (diff_name.length > DIFF_MAX_LEN) {
			// Heck. Gotta reconstruct the bmap name.
			v.beatmap.song_name = `${acc_song_name} [${diff_name.substring(0, DIFF_MAX_LEN - 3) + "..."}]`
		}

		const lookinAtMyProfile = currentUserID == userID && v.completed != 0;
		const dlText = !lookinAtMyProfile ? "Get" : "";

		table.append($("<tr class='new score-row " + rowColor + " " + failedClass + "' data-scoreid='" + v.id + "' style='background: linear-gradient(90deg," + StyleCol + ", #00000087," + StyleCol + "), url(https://i0.wp.com/assets.ppy.sh/beatmaps/"+ v.beatmap.beatmapset_id +"/covers/cover.jpg"+apiImageParams+") no-repeat right !important; background-size: cover !important;' />").append(
			$(
				"<td>" + (v.completed < 2 ? '' : scoreRankIcon) +
				escapeHTML(v.beatmap.song_name) + " <b>" + getScoreMods(v.mods) + "</b> <i>(" + v.accuracy.toFixed(2) + "%)</i><br />" +
				"<div class='subtitle'><time class='new timeago' datetime='" + v.time + "'>" + v.time + "</time></div></td>"
			),
			$("<td><b>" + ppOrScore(v.pp, v.score, v.beatmap.ranked) + "</b> " + weightedPP(type, page, idx, v.pp) + `<div class="dl-pin">${v.completed == 3 ? downloadStar(v.id)+dlText : ""} ${lookinAtMyProfile ? pinScore(v.id, escapeHTML(acc_song_name)) : ""}</div>` + "</td>")
		));
	});
	$(".new.timeago").timeago().removeClass("new");
	$(".new.score-row").click(viewScoreInfo).removeClass("new");
	$(".new.downloadstar").click(function (e) {
		e.stopPropagation();
	}).removeClass("new");
	var enable = true;
	if (r.scores.length !== limit)
		enable = false;
	disableLoadMoreButton(type, mode, enable);	
}

function fastloadPinned(mode) {
	const table = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] table[data-type=pinned] tbody");

	table.html(null);
	currentPage[preferRelax][mode].pinned = 1;
	params.p = 1;


	fetch(`/api/v1/users/scores/pinned?mode=${params.mode}&p=${params.p}&l=5&rx=${params.rx}&id=${params.id}`).then(o => o.json()).then(r => 
		buildPlays(r, "pinned", mode, table, 1, 5)	
	);
}

function downloadStar(id) {
	return "<a href='/web/replays/" + id + "' class='new downloadstar'><i class='download icon'></i></a>";
}

function pinScore(id, bmapTitle) {
	// beatmap title is only required for ui reasons
	// all we really need is the id

	return `
		<a href="javascript:postPin(${id}, '${bmapTitle}')" class="new downloadstar">
			<i class="pin icon"></i>
		</a>
	`;
}

async function postPin(id, bmapTitle) {
	const score = await fetch(`/api/v1/users/scores/pinned/info?id=${id}`).then(o => o.json());
	const pinned = score.code == 200;

	score.pinned.pinned_at = new Date(score.pinned.pinned_at * 1000).toISOString();

	const els = [
		$("<tr />").append(
			$(`<td>Beatmap</td>`),
			$(`<td>${bmapTitle}</td>`),
		)
	];

	const data = {
		"Pinned": pinned ? "Yes" : "No",
		"Pin Date": pinned ? 
				`<time class="new timeago" datetime="${score.pinned.pinned_at}">${score.pinned.pinned_at}</time>`
				: "Never"
	}

	$.each(data, (key, value) => {
		els.push(
			$("<tr />").append(
				$("<td>" + T(key) + "</td>"),
				$("<td>" + value + "</td>")
			)
		);
	});

	$("#score-data-table tr").remove();
	$(".pinned-popup").remove();
	$("#score-data-table").append(
		els,
		`<a href="javascript:${pinned ? "Unpin" : "Pin"}(${id})" class="pinned-popup ui button ${pinned ? "red" : "blue"} inverted">${pinned ? "Unpin" : "Pin"} Score!</a>`
	);

	$("#score-data-table").addClass("pinnedtbl");
	$(".new.timeago").timeago().removeClass("new");
	$(".ui.modal").modal("show");
}

async function Pin(id) {
	const req = await fetch(`/api/v1/users/scores/pinned?score_id=${id}&rx=${params.rx || 0}`, {
		method: "POST"
	}).then(o => o.json());

	if (req.code != 200) {
		showMessage("error", "Error pinning score. Please report this to a RealistikOsu developer!");
		return;
	}

	$(".message.success").remove();
	$(".ui.modal").modal("hide");

	showMessage("success", "Pinned!");
	fastloadPinned(params.mode);
}

async function Unpin(id) {
	const req = await fetch(`/api/v1/users/scores/pinned/delete?score_id=${id}`, {
		method: "POST"
	}).then(o => o.json());

	if (req.code != 200) {
		showMessage("error", "Error unpinning score. Please report this to a RealistikOsu developer!");
		return;
	}

	$(".message.success").remove();
	$(".ui.modal").modal("hide");

	showMessage("success", "Unpinned!");
	fastloadPinned(params.mode);
}

function weightedPP(type, page, idx, pp) {
	if (type != "best" || pp == 0)
		return "";
	var perc = Math.pow(0.95, ((page - 1) * 20) + idx);
	var wpp = pp * perc;
	return "<i title='Weighted PP, " + Math.round(perc * 100) + "%'>(" + wpp.toFixed(2) + "pp)</i>";
}
function disableLoadMoreButton(type, mode, enable) {
	var button = $("#scores-zone div[data-mode=" + mode + "] table[data-type=" + type + "] .load-more-button");
	if (enable) button.removeClass("disabled");
	else button.addClass("disabled");
}

function getScoreModsHtml(e, t) {
	var n = [];
	return 512 == (512 & e) && (e &= -65), 16384 == (16384 & e) && (e &= -33), modsHtml.forEach(function (t, i) {
		(e & 1 << i) > 0 && n.push(t)
	}), n.length > 0 ? (t ? "" : "+ ") + n.join(" ") : t ? T("") : ""
}

var modsHtml = [
	"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_no-fail.ca1a6374.png'>",
	"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_easy.076c7e8c.png'>",
	"TD",
	"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_hidden.cfc32448.png'>",
	"<img style='height: 18px;width: calc(18px*45/32)' src='https://osu.ppy.sh/assets/images/mod_hard-rock.52c35a3a.png'>",
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

function timeSince(date) {

	var seconds = Math.floor((new Date() - date) / 1000);

	var interval = seconds / 31536000;

	if (interval > 1) {
		return Math.floor(interval) + " years ago";
	}
	interval = seconds / 2592000;
	if (interval > 1) {
		return Math.floor(interval) + " months ago";
	}
	interval = seconds / 86400;
	if (interval > 1) {
		return Math.floor(interval) + " days ago";
	}
	interval = seconds / 3600;
	if (interval > 1) {
		return Math.floor(interval) + " hours ago";
	}
	interval = seconds / 60
	if (interval > 1) {
		return Math.floor(interval) + " minutes ago";
	}
	return "now"
}

function viewScoreInfo() {
	var scoreid = $(this).data("scoreid");
	if (!scoreid && scoreid !== 0) return;
	var s = scoreStore[scoreid];
	if (s === undefined) return;

	// data to be displayed in the table.
	var data = {
		"Score": addCommas(s.score),
		"PP": addCommas(s.pp.toFixed(2)),
		"Beatmap": "<a href='/beatmaps/" + s.beatmap.beatmap_id + "'>" + escapeHTML(s.beatmap.song_name) + "</a>",
		"Accuracy": s.accuracy.toFixed(2) + "%",
		"Max Combo": addCommas(s.max_combo) + "/" + addCommas(s.beatmap.max_combo) + "x" + (s.full_combo || s.max_combo > 0.97 * (s.beatmap.max_combo)
			&& s.count_miss == 0 ? " " + T("(FC)") : ""),
		"Difficutly": `${s.beatmap.difficulty2[modesShort[s.play_mode]].toFixed(2)}` + ' <i class="fas fa-star"></i>',
		"Mods": getScoreModsHtml(s.mods, true),
		"Passed": T(s.completed >= 2 ? "Yes" : "No"),
		"Personal Best": T(s.completed === 3 ? "Yes" : "No")
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
	].forEach(function (val, i) {
		data[trans[i]] = val;
	});

	data = $.extend(data, {
		"Achieved": timeSince(Date.parse(s.time)),
		"Mode": modes[s.play_mode],
	});

	var els = [];
	$.each(data, function (key, value) {
		els.push(
			$("<tr />").append(
				$("<td>" + T(key) + "</td>"),
				$("<td>" + value + "</td>")
			)
		);
	});
	
	$(".pinned-popup").remove();
	$("#score-data-table").removeClass("pinnedtbl");
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
		"Droplet Misses",
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

function ppOrScore(pp, score, ranked) {
	const txt = ranked == 5 ? " <i class='heart icon small'></i>" : "pp";

	if (pp != 0)
		return addCommas(pp.toFixed(2)) + txt;
	return addCommas(score);
}

function beatmapLink(type, id) {
	if (type == "s")
		return "<a href='/s/" + id + "'>" + id + '</a>';
	return "<a href='/beatmaps/" + id + "'>" + id + '</a>';
}
