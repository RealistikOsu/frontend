"use strict";

let commentsCache = [];
let removed = 0;
let cparams = {
    p: 1,
    l: 5,
};

const vd = {
    max: "comment-max",
    submit: "comment-submit",
    comments: "comments",
    list: "comments-list",
    load: "comment-load",
    text: "comment-text",
    total: "total-comments",
};

const updateMax = function () {
    vd.max.innerHTML = `${this.value.length}/380`;
    if (this.value.length < 3) {
        vd.submit.classList.add("disabled");
        return;
    }

    vd.submit.classList.remove("disabled");
};

const updateList = () => {
    vd.list.innerHTML = null;

    // don't you just LOVE js
    commentsCache = [...new Set(commentsCache.map(JSON.stringify))]
        .map(JSON.parse)
        .sort((a, b) => b.postedAt - a.postedAt);

    // prettier-ignore
    for (const { userid, username, message, postedAt, id } of commentsCache) {
        const posted = new Date(postedAt * 1000)
        const dateNow = new Date()

        let year = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(posted);
        let yearNow = new Intl.DateTimeFormat('en', { year: 'numeric' }).format(dateNow);

        let month = new Intl.DateTimeFormat('en', { month: 'short' }).format(posted);
        let day = new Intl.DateTimeFormat('en', { day: 'numeric' }).format(posted);

        let hour = new Intl.DateTimeFormat('en', { hour: 'numeric', minute: 'numeric', hour12: true }).format(posted);
        hour = hour.toLocaleLowerCase().replace(' ', ''); // steam style comments time.

        let postDate = `${day} ${month}${year == yearNow ? '' : `, ${year}`} @ ${hour}`;

        const canDelete =
            window.hasAdmin || // if admin
            (window.userID == window.currentUserID && window.currentUserID != 0) || // if profile is mine
            (userid == window.currentUserID && window.currentUserID != 0); // if comment id matches mine

        vd.list.innerHTML += `
            <div class="ui comments">
                <div class="comment">
                    <a class="avatar">
                        <img src="https://a.ussr.pl/${userid}" />
                    </a>
                    <div class="content">
                        <a class="author" href="/users/${userid}">
                            ${escapeHTML(username)}
                        </a>
                        <div class="metadata">
                            <div class="date">${postDate}</div>
                        </div>
                        <div class="text">${escapeHTML(message)}</div>
                        <div class="actions">
                            <a class="delete ${
                                canDelete ? "" : "c-hidden"
                            }" href="javascript:deleteComment(${id})">Delete</a>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }
};

async function moreComments(page = 0) {
    const res = await fetch(
        `/api/v1/users/comments?id=${userID}&p=${page || cparams.p++}&l=${
            cparams.l
        }`
    ).then((o) => o.json());

    if (res.code != 200) {
        showMessage(
            "error",
            "Error loading comments. Please report this to a RealistikOsu developer!"
        );
    }

    if (!res.comments || res.comments.length < cparams.l) {
        vd.load.classList.add("disabled");
        $("#comment-load-container").css("display", "none")
        if (!res.comments) return;
    }

    for (const comment of res.comments) {
        commentsCache.push({
            userid: comment.op,
            username: comment.username,
            message: comment.message,
            postedAt: comment.posted_at,
            id: comment.id,
        });
    }

    updateList();
}

async function info() {
    const res = await fetch(`/api/v1/users/comments/info?id=${userID}`).then(
        (o) => o.json()
    );

    return res.disabled;
}

async function post() {
    if (vd.text.value.length < 3 || vd.text.value > 380) {
        showMessage("error", "Invalid comment. Text too big/small.");
        return;
    }

    const data = await fetch(`/api/v1/users/comments?id=${userID}`, {
        body: vd.text.value,
        method: "POST",
    }).then((o) => o.json());

    if (data.code != 200) {
        return showMessage(
            "error",
            "Error posting comment. Please report this to a RealistikOsu developer!"
        );
    }

    vd.text.value = null;
    vd.submit.classList.add("disabled");
    vd.total.innerHTML = parseInt(vd.total.innerHTML) + 1;
    moreComments(1);
}

async function deleteComment(id) {
    if (!confirm("Are you sure?")) return;

    const data = await fetch(`/api/v1/users/comments/delete?id=${id}`, {
        method: "POST",
    }).then((o) => o.json());

    if (data.code != 200) {
        return showMessage(
            "error",
            "Error removing comment. Please report this to a RealistikOsu developer!"
        );
    }

    commentsCache.splice(commentsCache.map((o) => o.id).indexOf(id), 1);
    vd.total.innerHTML = parseInt(vd.total.innerHTML) - 1;
    
    if (++removed >= 5) {
        cparams.p--;
    }

    updateList();
}

onload = async () => {
    for (const [k, v] of Object.entries(vd)) {
        vd[k] = document.getElementById(v);
    }

    if (!(await info())) {
        if (currentUserID != 0) {
            vd.text.oninput = updateMax;
        }

        return moreComments();
    }
};
