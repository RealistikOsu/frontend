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

	// Credits to Akatsuki here :D
	$("#rx-menu>.item").click(function (e) {
		e.preventDefault();
		if ($(this).hasClass("active"))
			return;

		if ($(this).hasClass("disabled"))
			return;

		preferRelax = $(this).data("rx");

		initialiseScores($("#scores-zone>div[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]"), favouriteMode)
		initialiseChartGraph(graphType, true);
		applyPeakRankLabel()
		toggleModeAvailability(favouriteMode, preferRelax)
		$("[data-mode]:not(.item):not([hidden])").attr("hidden", "");
		$("[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]:not(.item)").removeAttr("hidden");
		$("#rx-menu>.active.item").removeClass("active");
		$(this).addClass("active");
		window.history.replaceState('', document.title, `${wl.pathname}?mode=${favouriteMode}&rx=${preferRelax}${wl.hash}`)

	});
	$("#mode-menu>.item").click(function (e) {
		e.preventDefault();
		if ($(this).hasClass("active"))
			return;

		if ($(this).hasClass("disabled"))
			return;

		var m = $(this).data("mode");

		favouriteMode = m;
		initialiseScores($("#scores-zone>div[data-mode=" + favouriteMode + "][data-rx=" + preferRelax + "]"), favouriteMode)
		initialiseChartGraph(graphType, true);
		applyPeakRankLabel()
		toggleModeAvailability(favouriteMode, preferRelax)
		$("[data-mode]:not(.item):not([hidden])").attr("hidden", "");
		$("[data-mode=" + m + "][data-rx=" + preferRelax + "]:not(.item)").removeAttr("hidden");
		$("#mode-menu>.active.item").removeClass("active");
		$(this).addClass("active");
		window.history.replaceState('', document.title, `${wl.pathname}?mode=${m}&rx=${preferRelax}${wl.hash}`);

	});

	initialiseChartGraph(graphType, false);
	applyPeakRankLabel()
	toggleModeAvailability(favouriteMode, preferRelax)

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
});

function applyPeakRankLabel() {
	var modeVal = favouriteMode;
	if (preferRelax == 1) {
		modeVal += 4;
	} else if (preferRelax == 2) {
		modeVal += 7;
	}

	var rankLabel = $(`#global-rank-${preferRelax}-${favouriteMode}`)
	if (!rankLabel) return

	api("profile-history/peak-rank", { user_id: userID, mode: modeVal }, (resp) => {
		if (!resp.data) {
			return
		}

		var rank = addCommas(resp.data.rank)
		var date = Date.parse(resp.data.captured_at)

		// using en-gb because we want `09 Mar 2022` syntax.
		var formatter = new Intl.DateTimeFormat('en-gb', { day: 'numeric', month: 'short', year: 'numeric' })
		var formattedDate = formatter.format(date)
		rankLabel.attr("data-tooltip", `Peak rank: #${rank} on ${formattedDate}`)
	});

}


function getCountryRank(idx) {
	// country ranks are inconsistient because for now they are missing 1 day off

	var rank = window.countryRankPoints[idx]
	if (rank == undefined || rank == null) {
		return "N/A"
	}

	return addCommas(rank)
}

function createLabels(dataLength) {
	var labels = ["Today"]
	for (var i = 1; i < dataLength; i++) {
		if (i == 1) {
			labels.push(`1 day ago`)
		} else {
			labels.push(`${i} days ago`)
		}
	}
	return labels.reverse()
}

function changeChart(type) {
	if (graphType == type) return;

	$(`#chart-btn-${graphType}`).removeClass("active");
	$(`#chart-btn-${type}`).addClass("active");

	graphType = type;
	initialiseChartGraph(type, true);
}


function getGraphTooltip({ series, seriesIndex, dataPointIndex, w }) {
	var prefix = graphType == "rank" ? "#" : ""
	return ` 
		<div 
		class="apexcharts-tooltip-title" 
		style="font-family: "Poppins", sans-serif; font-size: 12px;"
		>${window.graphLabels[dataPointIndex]}</div>
		<div class="apexcharts-tooltip-series-group apexcharts-active" style="order: 1; display: flex;">
		  <span class="apexcharts-tooltip-marker" style="background-color: ${graphColor};"></span>
		  <div class="apexcharts-tooltip-text" style="font-family: "Poppins", sans-serif; font-size: 12px;">
			<div class="apexcharts-tooltip-y-group">
			  <span class="apexcharts-tooltip-text-y-label">${graphName}: </span>
			  <span class="apexcharts-tooltip-text-y-value">${prefix}${addCommas(series[seriesIndex][dataPointIndex])}</span>
			</div>
			${graphType == 'rank' ? `<div class="apexcharts-tooltip-y-group">
			  <span class="apexcharts-tooltip-text-y-label">Country Rank: </span>
			  <span class="apexcharts-tooltip-text-y-value">#${getCountryRank(dataPointIndex)}</span>
			</div>` : ''}
			<div class="apexcharts-tooltip-goals-group">
			  <span class="apexcharts-tooltip-text-goals-label"></span>
			  <span class="apexcharts-tooltip-text-goals-value"></span>
			</div>
			<div class="apexcharts-tooltip-z-group">
			  <span class="apexcharts-tooltip-text-z-label"></span>
			  <span class="apexcharts-tooltip-text-z-value"></span>
			</div>
		  </div>
		</div>
	  `
}

function initialiseChartGraph(graphType, udpate) {
	var modeVal = favouriteMode;
	if (preferRelax == 1) {
		modeVal += 4;
	} else if (preferRelax == 2) {
		modeVal += 7;
	}

	window.graphPoints = []
	window.countryRankPoints = []
	window.graphName = graphType == "pp" ? "Performance Points" : "Global Rank"
	window.graphColor = graphType == "pp" ? '#e03997' : '#2185d0'
	var yaxisReverse = graphType == "pp" ? false : true

	api(`profile-history/${graphType}`, { user_id: userID, mode: modeVal }, (resp) => {
		var chartCanvas = document.querySelector("#profile-history-graph");
		var chartNotFound = document.querySelector("#profile-history-not-found");

		if (resp.status == "error") {
			chartNotFound.style.display = "block";
			chartCanvas.style.display = "none";
			return;
		}

		chartNotFound.style.display = "none";
		chartCanvas.style.display = "block";
		if (graphType === "rank") {
			window.graphPoints = resp.data.captures.map((x) => x.overall);
			window.countryRankPoints = resp.data.captures.map((x) => x.country);
		} else {
			window.graphPoints = resp.data.captures.map((x) => x.pp);
		}

		var minGraphOffset = Math.min(...window.graphPoints)
		var maxGraphOffset = Math.max(...window.graphPoints)
		var minMaxGraphOffset = minGraphOffset == maxGraphOffset ? 10 : 1

		window.graphLabels = createLabels(window.graphPoints.length)
		var options = {
			series: [
				{
					name: graphName,
					data: window.graphPoints
				},
			],
			grid: {
				show: true,
				borderColor: '#383838',
				position: 'back',
				xaxis: {
					lines: {
						show: false
					}
				},
				yaxis: {
					lines: {
						show: true
					}
				},
			},
			chart: {
				height: 160,
				type: 'line',
				fontFamily: '"Poppins", sans-serif',
				zoom: {
					enabled: false
				},
				toolbar: {
					show: false,
				},
				background: 'rgba(0,0,0,0)'
			},
			stroke: {
				curve: 'smooth',
				width: 4,
			},
			colors: [graphColor],
			theme: {
				mode: 'dark',
			},
			xaxis: {
				labels: { show: false },
				categories: window.graphLabels,
				axisTicks: {
					show: false,
				},
				tooltip: {
					enabled: false,
				}
			},
			yaxis: [
				{
					max: maxGraphOffset + minMaxGraphOffset,
					min: minGraphOffset - minMaxGraphOffset,
					reversed: yaxisReverse,
					labels: { show: false },
					tickAmount: 4,
				},
			],
			tooltip: {
				custom: getGraphTooltip,
			},
			markers: {
				size: 0,
				fillColor: graphColor,
				strokeWidth: 0,
				hover: { size: 7 }
			},
		};

		if (udpate) {
			if ("chart" in window) {
				window.chart.updateOptions(options)
			} else {
				window.chart = new ApexCharts(chartCanvas, options);
				window.chart.render();
			}
		} else {
			window.chart = new ApexCharts(chartCanvas, options);
			window.chart.render();
		}
	});
}

function formatOnlineStatusBeatmap(a) {
	var hasLink = a.beatmap.id > 0;
	//return "<i>" + (hasLink ? "<a href='/b/" + escapeHTML(a.beatmap.id) + "'>" : "") + escapeHTML(a.text) + (hasLink ? '</a>' : '' ) + "</i>";
	return escapeHTML(a.text)
}

function loadMostPlayedBeatmaps(mode) {
	var mostPlayedTable = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] div[data-type='most-played']");
	currentPage[preferRelax][mode].mostPlayed++

	var mixedMode = favouriteMode;
	if (preferRelax == 1) {
		mixedMode += 4;
	} else if (preferRelax == 2) {
		mixedMode += 7;
	}

	api('users/most_played', { id: userID, mode: mode, p: currentPage[preferRelax][mode].mostPlayed, l: 5, rx: preferRelax }, function (resp) {
		if (resp.beatmaps === null) {
			mostPlayedTable.html(scoreNotFoundElement)
			return;
		}

		var label = $("#mostplayed-text-" + mixedMode)
		label.empty()
		label.html(`<div style="display: flex; align-items: center; gap: 0.5em; font-weight: 600;"><i class="fa-solid fa-play"></i> ${T("Most Played Beatmaps")} (${resp.total})</div>`)

		resp.beatmaps.forEach(function (el, idx) {
			mostPlayedTable.children('.profile-scores-container').append(
				$(`<div class="score-row score-row-most-played score-view-desktop" style='--gradient-colour: rgba(33, 33, 33, 0.8); --background-url: url("https://assets.ppy.sh/beatmaps/${el.beatmap.beatmapset_id}/covers/cover.jpg")' />`)
					.append(
						$(`<div class="score-row-info score-row-info-most-played" />`).append(
							$("<div class='row-info-container row-info-container-most-played' />").append(
								`<a class="link-text" href="/b/${el.beatmap.beatmap_id}">${escapeHTML(el.beatmap.song_name)}</a>`,
							),
						),
						$("<div class='score-row-pp' />").append(
							$("<div class='row-pp-pp' />").append(
								$(`<b><span class="fas fa-play" /> ${el.playcount}</b>`)
							),
						),
					),

				$(`<div class="score-row-mobile score-row-most-played score-view-mobile" style='--gradient-colour: rgba(33, 33, 33, 0.8); --background-url: url("https://assets.ppy.sh/beatmaps/${el.beatmap.beatmapset_id}/covers/cover.jpg")' />`)
					.append(
						$("<div class='score-mobile-top' />").append(
							$(`<div class="score-row-info-mobile score-row-info-most-played" />`).append(
								$("<div class='row-info-container row-info-container-most-played row-info-container-most-played-mobile' />").append(
									`<a class="link-text" href="/b/${el.beatmap.beatmap_id}">${escapeHTML(el.beatmap.song_name)}</a>`,
								),
							),
						),
						$("<div class='score-mobile-bottom' />").append(
							$("<div class='score-row-pp-mobile' />").append(
								$("<div class='row-pp-pp-mobile' />").append(
									$(`<b><span class="fas fa-play" /> ${el.playcount}</b>`)
								),
							),
						),
					),
			)
		})
		var enable = true;
		var limit = 5;
		if (resp.beatmaps.length !== limit)
			enable = false;
		disableLoadMoreButton("most-played", mode, enable);
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
	defaultScoreTable = $("<div class='profile-scores-segment' />")
		.append(
			$("<div class='profile-scores-container' />")
		)
		.append(
			$("<div class='profile-scores-btn-container' />").append(
				$("<div class='ui floated pagination' />").append(
					$("<a class='ui button load-more-button inverted violet disabled'>" + T("Load more") + "</a>").click(loadMoreClick)
				)
			)
		)
}
i18next.on('loaded', function (loaded) {
	setDefaultScoreTable();
});

function recentOnClick() {
	$("#recent-table > .profile-scores-container").empty();

	var oldPagesCount = currentPage[preferRelax][favouriteMode]["recent"]
	currentPage[preferRelax][favouriteMode]["recent"] = 0

	for (let i = 0; i < oldPagesCount; i++) {
		loadScoresPage("recent", favouriteMode);
	}
}

function recentFilter(recent) {
	$(recent).find(".profile-scores-btn-container").prepend(`
		<div class="ui checkbox">
			<input onclick="recentOnClick()" id="filter-failed" type="checkbox">
			<label>Hide failed scores.</label>
		</div>
    `);
}

function initialiseScores(el, mode) {
	el.attr("data-loaded", "1");
	el.empty();
	var pinned = defaultScoreTable.clone(true)
	var best = defaultScoreTable.clone(true)
	var recent = defaultScoreTable.clone(true).attr('id', 'recent-table')
	var first = defaultScoreTable.clone(true)
	var mostPlayed = defaultScoreTable.clone(true)
	mostPlayed.find(".load-more-button").unbind().click(loadMoreMostPlayed);

	recentFilter(recent);

	pinned.attr("data-type", "pinned");
	best.attr("data-type", "best");
	recent.attr("data-type", "recent");
	first.attr("data-type", "first");
	mostPlayed.attr("data-type", "most-played");
	first.addClass("no bottom margin");

	for (const i in currentPage) {
		for (const j in currentPage[i]) {
			for (const k of Object.keys(currentPage[i][j])) {
				currentPage[i][j][k] = 0;
			}
		}
	}

	let mixedMode = favouriteMode;
	if (preferRelax == 1) {
		mixedMode += 4;
	} else if (preferRelax == 2) {
		mixedMode += 7;
	}

	el.append(
		$("<div class='t-pinned ui segment' style='display: none' />").append('<h4 class="ui horizontal divider header"><div style="display: flex; align-items: center; gap: 0.5em; font-weight: 600;"><i class="fa-solid fa-star"></i> Pinned Scores</div></h4>', pinned),
		$("<div class='t-best ui segment' />").append('<h4 class="ui horizontal divider header"><div style="display: flex; align-items: center; gap: 0.5em; font-weight: 600;"><i class="fa-solid fa-angles-up"></i> Best Scores</div></h4>', best),
		$("<div class='t-most ui segment' />").append(`<h4 id="mostplayed-text-${mixedMode}" class="ui horizontal divider header"><div style="display: flex; align-items: center; gap: 0.5em; font-weight: 600;"><i class="fa-solid fa-play"></i> Most Played Beatmaps</div></h4>`, mostPlayed),
		$("<div class='t-recent ui segment' />").append(`<h4 class="ui horizontal divider header"><div style="display: flex; align-items: center; gap: 0.5em; font-weight: 600;"><i class="fa-solid fa-clock-rotate-left"></i> Recent Scores</div></h4>`, recent),
		$("<div class='t-first ui segment' />").append(`<h4 id="firstplace-text-${mixedMode}" class="ui horizontal divider header"><div style="display: flex; align-items: center; gap: 0.5em; font-weight: 600;"><i class="fa-solid fa-trophy"></i> First Places</div></h4>`, first)
	);

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
	var type = t.parents("div[data-type]").data("type");
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
	var table = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] div[data-type=" + type + "] .profile-scores-container");
	var page = ++currentPage[preferRelax][mode][type];

	console.log("loadScoresPage with", {
		page: page,
		type: type,
		mode: mode,
		rx: preferRelax
	});

	var limit = type === 'best' ? 10 : 5;
	params = { mode: mode, p: page, l: limit, rx: preferRelax, id: userID }

	filterBool = $('#filter-failed').prop('checked')
	if (filterBool && type == "recent") {
		params.filter = "recent";
	}

	fetch("https://ussr.pl" + `/api/v1/users/scores/${type}?mode=${params.mode}&p=${params.p}&l=${params.l}&rx=${params.rx}&id=${params.id}${params.filter ? `&filter=${params.filter}` : ''}`).then(o => o.json()).then(r =>
		buildPlays(r, type, mode, table, page, limit)
	);
}

const scoreNotFoundElement = `
<div class="ui segment comment-login" style="border-radius: 1rem !important;">
	<div class="ui icon message black ds" style="border-radius: 1rem;">
		<p>No scores have been found :(</p>
	</div>
</div>
`

function buildPlays(r, type, mode, table, page, limit) {
	if (r.scores == null && params.p <= 1) {
		$(".t-pinned").hide()
	} else if (type == "pinned") {
		$(".t-pinned").show()
	}

	if (r.scores == null) {
		disableLoadMoreButton(type, mode);
		table.html(scoreNotFoundElement);
		return;
	}

	var mixedMode = favouriteMode;
	if (preferRelax == 1) {
		mixedMode += 4;
	} else if (preferRelax == 2) {
		mixedMode += 7;
	}


	if (type == "first") {
		var label = $("#firstplace-text-" + mixedMode)
		label.empty()
		label.html('<div style="display: flex; align-items: center; gap: 0.5em; font-weight: 600;"><i class="fa-solid fa-trophy"></i> ' + T("First Places") + ` (${r.total})</div>`);
	}

	r.scores.forEach(function (v, idx) {
		// Filter dupes, XXX: temponary fix
		if (!type == "recent" && idx > 0 && v.beatmap_md5 === r.scores[idx - 1].beatmap_md5) return;

		scoreStore[v.id] = v;
		var scoreRank = getRank(mode, v.mods, v.accuracy, v.count_300, v.count_100, v.count_50, v.count_miss);
		var scoreRankIcon = `<a class="score-rank rank-${scoreRank.toLowerCase().replace("+", "h")} profile-score-rank">${scoreRank}</a>`

		// Please at least credit if you steal this :(
		if (v.completed < 2) {
			var styleColour = "rgba(107, 32, 31, 0.6)"; // jajajaja
		} else {
			var styleColour = "rgba(33, 33, 33, 0.8)";
		}

		const lookinAtMyProfile = currentUserID == userID && v.completed != 0;
		const apiImageParams = v.completed < 2 ? "?filter=grayscale" : "";

		table.append(
			$(`<div class="score-row score-view-desktop" data-scoreid="${v.id}" style='--gradient-colour: ${styleColour}; --background-url: url("https://i0.wp.com/assets.ppy.sh/beatmaps/${v.beatmap.beatmapset_id}/covers/cover.jpg${apiImageParams}")' />`)
				.append(
					$("<div class='score-row-rank' />").append(scoreRankIcon),
					$(`<div class="score-row-info" />`).append(
						$("<div class='row-info-container' />").append(
							`<a class="link-text" href="/b/${v.beatmap.beatmap_id}">${escapeHTML(v.beatmap.song_name)}</a>`,
							"<br>",
							`${addCommas(v.score)} / ${addCommas(v.max_combo)}x / <b>${getScoreMods(v.mods, true)}</b>`,
							"<br>",
							$("<div class='row-info-timeago' />").append(
								$(`<time class="timeago" datetime="${v.time}">${v.time}</time>`),
							),
						),
					),
					$("<div class='score-row-pp' />").append(
						$("<div class='row-pp-pp' />").append(
							$(`<b>${ppOrScore(v.pp, v.score, v.beatmap.ranked)}</b>`)
						),
						$("<span class='row-pp-acc' />").append(
							"accuracy: ",
							$(`<b>${v.accuracy.toFixed(2)}%</b>`)
						)
					),
					$("<div class='ui dropdown item score-row-options' />").append(
						$('<i class="fa-solid fa-ellipsis-vertical"></i>'),
						$("<div class='menu' />").append(
							$(`<a class="item" data-scoreid="${v.id}" />`).append(
								T("View Details")
							).click(viewScoreInfo),
							v.completed == 3 ? $(`<a class="item" href="/web/replays/${v.id}" />`).append(
								T("Download Replay")
							) : "",
							(lookinAtMyProfile && v.completed >= 2) ? $(`<a class="item" href='javascript:postPin(${v.id}, "${escapeHTML(v.beatmap.song_name)}")' />`).append(
								T("Pin Score")
							) : ""
						),
					),
				),

			$(`<div class="score-row-mobile score-view-mobile" data-scoreid="${v.id}" style='--gradient-colour: ${styleColour}; --background-url: url("https://i0.wp.com/assets.ppy.sh/beatmaps/${v.beatmap.beatmapset_id}/covers/cover.jpg${apiImageParams}")' />`)
				.append(
					$("<div class='score-mobile-top' />").append(
						$("<div class='score-row-rank-mobile' />").append(scoreRankIcon),
						$(`<div class="score-row-info-mobile" />`).append(
							$("<div class='row-info-container' />").append(
								`<a class="link-text" href="/b/${v.beatmap.beatmap_id}">${escapeHTML(v.beatmap.song_name)}</a>`,
								"<br>",
								`${addCommas(v.score)} / ${addCommas(v.max_combo)}x / <b>${getScoreMods(v.mods, true)}</b>`,
								"<br>",
								$("<div class='row-info-timeago' />").append(
									$(`<time class="timeago" datetime="${v.time}">${v.time}</time>`),
								),
							),
						),
					),
					$("<div class='score-mobile-bottom' />").append(
						$("<div class='score-row-pp-mobile' />").append(
							$("<div class='row-pp-pp-mobile' />").append(
								$(`<b>${ppOrScore(v.pp, v.score, v.beatmap.ranked)}</b>`)
							),
							$("<span class='row-pp-acc-mobile' />").append(
								"accuracy: ",
								$(`<b>${v.accuracy.toFixed(2)}%</b>`)
							)
						),
						$("<div class='ui right pointing dropdown item score-row-options' />").append(
							$('<i class="fa-solid fa-ellipsis-vertical"></i>'),
							$("<div class='menu' />").append(
								$(`<a class="item" data-scoreid="${v.id}" />`).append(
									T("View Details")
								).click(viewScoreInfo),
								v.completed == 3 ? $(`<a class="item" href="/web/replays/${v.id}" />`).append(
									T("Download Replay")
								) : "",
								(lookinAtMyProfile && v.completed >= 2) ? $(`<a class="item" href='javascript:postPin(${v.id}, "${escapeHTML(v.beatmap.song_name)}")' />`).append(
									T("Pin Score")
								) : ""
							),
						),
					),
				),
		)
	})

	$('.score-row-options').dropdown();
	$(".timeago").timeago()

	var enable = true;
	if (r.scores.length !== limit)
		enable = false;
	disableLoadMoreButton(type, mode, enable);
}

function fastloadPinned(mode) {
	const table = $("#scores-zone div[data-mode=" + mode + "][data-rx=" + preferRelax + "] div[data-type=pinned] .profile-scores-container");

	table.html(null);
	currentPage[preferRelax][mode].pinned = 1;
	params.p = 1;


	fetch("https://ussr.pl" + `/api/v1/users/scores/pinned?mode=${params.mode}&p=${params.p}&l=5&rx=${params.rx}&id=${params.id}`).then(o => o.json()).then(r =>
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
	const score = await fetch("https://ussr.pl" + `/api/v1/users/scores/pinned/info?id=${id}`).then(o => o.json());
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
	const req = await fetch("https://ussr.pl" + `/api/v1/users/scores/pinned?score_id=${id}&rx=${params.rx || 0}`, {
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
	const req = await fetch("https://ussr.pl" + `/api/v1/users/scores/pinned/delete?score_id=${id}`, {
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
	var button = $("#scores-zone div[data-mode=" + mode + "] div[data-type=" + type + "] .load-more-button");
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
	console.log("viewScoreInfo")
	var scoreid = $(this).data("scoreid");
	console.log(scoreid)
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
	const txt = ranked == 5 ? "pp <i class='heart icon small'></i>" : "pp";

	if (pp != 0) {
		return addCommas(pp.toFixed(0)) + txt;
	}

	return addCommas(score);
}

function beatmapLink(type, id) {
	if (type == "s")
		return "<a href='/s/" + id + "'>" + id + '</a>';
	return "<a href='/beatmaps/" + id + "'>" + id + '</a>';
}
