window.onerror = function(errorMsg, url, lineNumber) {
    alert('Error: ' + errorMsg + ' Script: ' + url + ' Line: ' + lineNumber);
};

var socket = io();
var user = null;
var player = 0;
var myToken = null;
var boxEl = document.getElementById("box");
var inputEl = document.getElementById("inputBox");
var playerEl = document.getElementsByClassName("playerSection");
if (boxEl.clientWidth > 768) {
    user = "host";
}

var gameApp = (function() {
    //setup
    var count = 0;
    var speed = 1000;
    var settleDelay = 500;
    var phase = "wait";
    var baseNumber = 3;
    var timer = null;
    var answerOverall = [];
    var players = []; //user: name, token: string, score: value
    var boardEl = document.getElementById("board");
    var boardTextEl = document.getElementById("boardText");

    function init() {
        count = 0;
        phase = "wait";
        answerOverall = [];
        clearTimeout(timer);
        render();
    }

    function action() {
        count += 1;
        //BREAK
        if (count === 31) {
            init();
            return;
        }
        phase = (caculate(count)) ? "hit" : "hold";
        render();
        timer = setTimeout(function() {
            settle();
        }, speed);
    }

    function settle() {
        var text = "";
        socket.emit('reset btn', text);
        timer = setTimeout(function() {
            answerOverall = [];
            playerPeroformance(null, "clear");
            action();
        }, settleDelay);
        for (var i = 0, max = players.length; i < max; i++) {
            var findout = false;
            for (var x = 0; x < answerOverall.length; x++) {
                if (answerOverall[x] === players[i].myToken) {
                    judge(i);
                    findout = true;
                    break;
                }
            }
            if (phase === "hit" && findout === false) {
                players[i].score -= 100;
                message = players[i].user + " didn't hit, minus " + 100;
                playerPeroformance(i, "wrong");
                $('#log').append($('<p>').text(message));
            }
        }
    }

    function judge(index) {
        switch (phase) {
            case "hit":
                players[index].score += 200;
                message = players[index].user + " get " + 200;
                playerPeroformance(index, "right");
                break;
            case "hold":
                players[index].score -= 100;
                message = players[index].user + " minus " + 100;
                playerPeroformance(index, "wrong");
                break;
        }
        $('#log').append($('<p>').text(message));
    }

    function getHit(token) {
        answerOverall.push(token);
    }

    function render() {
        boardTextEl.innerText = count;
    }

    function playerJoin(index, theUser) {
        playerEl[index].children[0].classList.remove("hidden");
        playerEl[index].children[1].innerText = theUser;
        playerEl[index].children[2].innerText = 0;
        playerEl[index].children[2].classList.remove("hidden");
    }

    function playerPeroformance(index, type) {
        if (type === "right") {
            playerEl[index].children[0].style.color = "green";
            playerEl[index].children[0].innerText = "O";
            playerEl[index].children[2].innerText = players[index].score;
        } else if (type === "wrong") {
            playerEl[index].children[0].style.color = "red";
            playerEl[index].children[0].innerText = "X";
            playerEl[index].children[2].innerText = players[index].score;
        } else if (type === "clear") {
            playerEl[0].children[0].innerText = "";
            playerEl[1].children[0].innerText = "";
            playerEl[2].children[0].innerText = "";
            playerEl[3].children[0].innerText = "";
        } else if (type === "init") {
            playerEl[0].children[2].innerText = 0;
            playerEl[1].children[2].innerText = 0;
            playerEl[2].children[2].innerText = 0;
            playerEl[3].children[2].innerText = 0;
        }
    }
    //=== Method ===
    function caculate(value) {
        if (value % baseNumber === 0) {
            return true;
        } else {
            if ((value.toString()).indexOf(baseNumber) >= 0) {
                return true;
            } else {
                return false;
            }
        }
    }
    //=== API ===
    return {
        "init": init,
        "begin": action,
        "getHit": getHit,
        "playerJoin": playerJoin,
        "clearScore": function() {
            for (var i = 0, max = players.length; i < max; i++) {
                players[i].score = 0;
            }
            playerPeroformance(null, "init");
        },
        "players": players
    }
})();
var playerController = (function() {
    var disable = false;
    var hitEl = document.getElementById("mobileTouch");

    function hit() {
        if (disable === true) return;
        hitEl.classList.add("block");
        disable = true;
        var data = {};
        data.user = user;
        data.myToken = myToken;
        socket.emit('player hit', data);
    }

    function reset() {
        hitEl.classList.remove("block");
        disable = false;
    }
    return {
        "hit": hit,
        "reset": reset,
        "disable": disable
    }
})();

//Method
function compose(length) {
    var array = ["a", "b", "c", "d", "e", "f", "g", "h", "i", "j", "k",
        "l", "m", "n", "o", "p", "q", "r", "s", "t", "u", "v",
        "w", "x", "y", "z"
    ];
    var theString = "";
    for (var i = 0; i < length; i++) {
        var char = Math.floor((Math.random() * 25));
        theString += array[char];
    }
    return theString;
}
if (user === "host") {
    gameApp.init();
}

//Event Binding
$("#sendBox").click(function() {
    user = inputEl.value;
    if (user === "") {
        user = "NOBODY"
    }
    document.getElementById("userName").innerText = user;
    myToken = compose(6);
    var data = {};
    data.user = user;
    data.myToken = myToken;
    socket.emit('join request', data);

    $("#mobilePanel").hide();
    $("#userName").show();
    $("#mobileTouch").show();
});
$("#startBtn").click(function() {
    gameApp.begin();
    $("#startBtn").hide();
    $("#stopBtn").show();
});
$("#stopBtn").click(function() {
    gameApp.clearScore();
    gameApp.init();
    $("#stopBtn").hide();
    $("#startBtn").show();
});
$("#mobileTouch").click(function() {
    playerController.hit();
});

//Socket Event
socket.on('join request', function(data) {
    if (user !== "host") {
        return;
    }
    console.log(data);
    var newPlayer = {};
    newPlayer.user = data.user;
    newPlayer.myToken = data.myToken;
    newPlayer.score = 0;
    gameApp.players.push(newPlayer);
    console.log(gameApp.players);
    message = data.user + " join this room.";
    $('#log').append($('<p>').text(message));
    if (player < 4) {
        gameApp.playerJoin(player, data.user);
        player += 1;
    }
});
socket.on("player hit", function(data) {
    gameApp.getHit(data.myToken);
    //message = data.user + " hit button, and token is " + data.myToken;
    //$('#log').append($('<p>').text(message));
});
socket.on('reset btn', function(text) {
    if (user !== "host") {
        playerController.reset();
    }
});