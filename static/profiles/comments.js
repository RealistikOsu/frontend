"use strict";

// TODO: settings to disable comments
// TODO: show message for disabled comments
// TODO: Let admin, op, and profile owner delete comments

const cparams = {
    p: 1,
    l: 5,
};

const updateMax = function () {
    document.getElementById(
        "comment-max"
    ).innerHTML = `${this.value.length}/380`;

    if (this.value.length < 3) {
        document.getElementById("comment-submit").classList.add("disabled");
        return;
    }

    document.getElementById("comment-submit").classList.remove("disabled");
};

function addComment(id, username, message, postedAt, before = false) {
    const list = document.getElementById("comments-list");
    const posted = new Date(postedAt * 1000).toISOString().slice(0, 10);

    const html = `
        <div class="ui comments">
            <div class="comment">
                <a class="avatar">
                    <img src="https://a.ussr.pl/${id}" />
                </a>
                <div class="content">
                    <a class="author" href="/u/${id}">${escapeHTML(
        username
    )}</a>
                    <div class="metadata">
                        <div class="date">${posted}</div>
                    </div>
                    <div class="text">${escapeHTML(message)}</div>
                </div>
            </div>
        </div>
    `;

    list.innerHTML = before ? html + list.innerHTML : list.innerHTML + html;
}

async function moreComments(add = false) {
    if (add) cparams.p++;
    const res = await fetch(
        `/api/v1/users/comments?id=${userID}&p=${cparams.p}&l=${cparams.l}`
    ).then((o) => o.json());

    if (res.code != 200) {
        showMessage(
            "error",
            "Error loading comments. Please report this to a RealistikOsu developer!"
        );
    }

    if (!res.comments || res.comments.length < cparams.l) {
        document.getElementById("comment-load").classList.add("disabled");

        if (!res.comments) return;
    }

    for (const comment of res.comments) {
        addComment(
            comment.op,
            comment.username,
            comment.message,
            comment.posted_at
        );
    }
}

async function info() {
    const res = await fetch(`/api/v1/users/comments/info?id=${userID}`).then(
        (o) => o.json()
    );

    document.getElementById("total-comments").innerHTML = res.total;

    return res.disabled;
}

async function post() {
    const total = document.getElementById("total-comments");
    const text = document.getElementById("comment-text");

    if (text.value.length < 3 || text.value > 380) {
        showMessage("error", "Invalid comment. Text too big/small.");
        return;
    }

    document.getElementById("comments").classList.add("comment-loading");

    const data = await fetch(`/api/v1/users/comments?id=${userID}`, {
        body: text.value,
        method: "POST",
    }).then((o) => o.json());

    if (data.code != 200) {
        return showMessage(
            "error",
            "Error posting comment. Please report this to a RealistikOsu developer!"
        );
    }

    document.getElementById("comments-list").innerHTML = null;
    document.getElementById("comment-max").innerHTML = "0/380";
    document.getElementById("comment-submit").classList.add("disabled");
    document.getElementById("comment-load").classList.remove("disabled");
    document.getElementById("comments").classList.remove("comment-loading");

    cparams.p = 1;
    text.value = "";
    total.innerHTML = parseInt(total.innerHTML) + 1;

    moreComments();
}

onload = async () => {
    if (!(await info())) {
        if (currentUserID != 0) {
            document.getElementById("comment-text").oninput = updateMax;
        }

        return moreComments();
    }
};
