// code that is executed on every user profile
$(document).ready(function () {
	var wl = window.location;
	var newPathName = wl.pathname;
	// clanID is defined in profile.html
	if (newPathName.split("/")[2] != clanID) {
		newPathName = "/c/" + clanID;
	}
	// if there's no mode parameter in the querystring, add it
	let markBool = wl.search.indexOf("?") !== -1
	let searchQuery = wl.search;
	if (wl.search.indexOf("mode=") === -1)
		if (markBool) {
			searchQuery += `&mode=${mode}`;
		} else {
			searchQuery = `?mode=${mode}`;
		}
	if (wl.search.indexOf("rx=") === -1)
		searchQuery += `&rx=${relax}`;
	if (wl.search != searchQuery)
		window.history.replaceState('', document.title, newPathName + searchQuery + wl.hash);
	else if (wl.pathname != newPathName)
		window.history.replaceState('', document.title, newPathName + wl.search + wl.hash);
    
    setDefaultScoreTable()
	$("#relax-menu>.item").click(function (e) {
		e.preventDefault();
		if ($(this).hasClass("active"))
			return;

		relax = $(this).data("rx");
		$("#clickAutopilot").removeClass("disabled");
		$("#clickRelax").removeClass("disabled");

		$("#clickTaiko").removeClass("disabled");
		$("#clickCatch").removeClass("disabled");
		$("#clickMania").removeClass("disabled");

		switch (relax) {
			case 1:
				$("#clickMania").addClass("disabled");
				break;
			case 2:
				$("#clickTaiko").addClass("disabled");
				$("#clickCatch").addClass("disabled");
				$("#clickMania").addClass("disabled");
				break;
		}

		$("[data-mode]:not(.item):not([hidden])").attr("hidden", "");
		$("[data-mode=" + mode + "][data-rx=" + relax + "]:not(.item)").removeAttr("hidden");
		$("#relax-menu>.active.item").removeClass("active");
		var needsLoad = $("#stats-zone>[data-mode=" + mode + "][data-loaded=0][data-rx=" + relax + "]");
		if (needsLoad.length > 0)
            initialiseStats(needsLoad, mode);
		$(this).addClass("active");
		window.history.replaceState('', document.title, `${wl.pathname}?mode=${mode}&rx=${relax}${wl.hash}`)
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

		mode = m;
		$("[data-mode]:not(.item):not([hidden])").attr("hidden", "");
		$("[data-mode=" + mode + "][data-rx=" + relax + "]:not(.item)").removeAttr("hidden");
		$("#mode-menu>.active.item").removeClass("active");
		var needsLoad = $("#stats-zone>[data-mode=" + mode + "][data-loaded=0][data-rx=" + relax + "]");
		if (needsLoad.length > 0)
			initialiseStats(needsLoad, mode);
		$(this).addClass("active");
		window.history.replaceState('', document.title, `${wl.pathname}?mode=${mode}&rx=${relax}${wl.hash}`);

	});

    // load scores page for the current favourite mode
	var i = function () {
		initialiseStats($("#stats-zone>div[data-mode=" + mode + "][data-rx=" + relax + "]"), mode)
	};

    if (i18nLoaded)
		i();
	else
		i18next.on("loaded", function () {
			i();
		});
})

var defaultScoreTable;
function setDefaultScoreTable() {
	defaultScoreTable = $("<table class='ui very basic two column compact table nopad' />")
		.append(
			$("<tbody />")
		);
}

function initialiseStats(el, mode) {
    el.attr("data-loaded", "1");
    stats = defaultScoreTable.clone(true)

    el.append(stats)
    loadStats(mode)
}

function loadStats(mode) {
    var table = $("#stats-zone div[data-mode=" + mode + "][data-rx=" + relax + "] tbody");

    api("clans/stats", {
        id: clanID,
        m: mode,
        rx: relax
    }, function (r) {
        table.append($(
            `<td></td>
            <tr>
                <td><b>Global Rank</b></td>
                <td class="right aligned">#${r.rank}</td>
            </tr>
            <tr>
                <td><b>PP</b></td>
                <td class="right aligned">${r.chosen_mode.pp}</td>
            </tr>
            <tr>
                <td><b>Ranked Score</b></td>
                <td class="right aligned">${r.chosen_mode.ranked_score}</td>
            </tr>
            
            <tr>
                <td><b>Total Score</b></td>
                <td class="right aligned">${r.chosen_mode.total_score}</td>
            </tr>
            <tr>
                <td><b>Total Playcount</b></td>
                <td class="right aligned">${r.chosen_mode.playcount}</td>
            </tr>
            <tr>
                <td><b>Total Replays Watched</b></td>
                <td class="right aligned">${r.chosen_mode.replays_watched}</td>
            </tr>
            <tr>
                <td><b>Total Hits</b></td>
                <td class="right aligned">${r.chosen_mode.total_hits}</td>
            </tr>`
        ))
    })
}