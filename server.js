var fs = require("fs")
var express = require('express');
var app = express();
var server = require('http').createServer(app);
var io = require('socket.io')(server);
var data = JSON.parse(fs.readFileSync("./data.json"))
app.use(express.static('./public'))
app.get('/', function (req, res, next) {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Request-Method', '*');
    res.setHeader('Access-Control-Allow-Methods', '*');
    res.setHeader('Access-Control-Allow-Headers', '*');

    res.sendFile(__dirname + '/public/index.html');
});
const getSocket = id => io.sockets.sockets[id]
const getPlayer = (room, id) => data[room].players.find(player => player.id == id);
const getPlayerFromName = (room, name) => data[room].players.find(player => player.name == name);
const getRoom = id => data.sockets[id]
function shuffle(room) {
    room.draw = room.draw.concat(room.discarded);
    room.discarded = [];
    for (let i = room.draw.length - 1; i > 0; i--) {
        let j = Math.floor(Math.random() * (i + 1));
        [room.draw[i], room.draw[j]] = [room.draw[j], room.draw[i]];
    }
}
io.on('connection', function (socket) {
    socket.on("init", name => {
        var code;
        while (code == undefined || data[code] != undefined) {
            code = Math.floor(Math.random() * 9000) + 1000
        }
        var player = {
            "name": name,
            "party": null,
            "role": null,
            "vote": null,
            "id": socket.id,
            "master": true,
            "socket": () => getSocket(socket.id)
        }
        var game = {
            "players": [player],
            "player": id => getPlayer(code, id),
            "president": null,
            "chancellor": null,
            "p": null,
            "c": null,
            "insession": true,
            "master": socket.id,
            "voted": 0,
            "ja": 0,
            "nein": 0,
            "libenacted": 0,
            "fascenacted": 0,
            "failed": 0,
            "draw": [1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
            "discarded": [],
            "announce": null
        };
        game.player(socket.id) = player;
        var func = (function(game) {
            return {
                call: (name, args, condition) => {
                    if (!condition) condition = p => true;
                    if (!args) args = [];
                    for (i = 0; i < game.players.length; i++) {
                        if (condition(game.players[i])) game.players[i].socket().emit(name, ...args)
                    }
                }
            }
        })(game)
        game.announce = func.call;
        data[code] = game;
        data.sockets[socket.id] = code;
        shuffle(game);
        fs.writeFileSync("./data.json", JSON.stringify(data))
        socket.emit("inited", code)
    })
    socket.on("join", (code, name) => {
        var room = data[code]
        if (room == undefined) return socket.emit("badroom");
        var player = room.players.find(e => e.name == name);
        //finish this later
        // if (player != undefined && room.player(player.id))
        if (player != undefined) return socket.emit("badname");
        if (room.players.length == 10) return socket.emit("toomany")
        var player = {
            "name": name,
            "party": null,
            "role": null,
            "vote": null,
            "id": socket.id,
            "socket": () => getSocket(socket.id)
        }
        room.players.push(player)
        room.player(player.id) = room.players[room.players.length - 1];
        var connected = Object.keys(data.sockets)
        var sockets = io.sockets.sockets
        for (s = 0; s < connected.length; s++) {
            if (connected[s] != player.id && data.sockets[connected[s]] == code)
                sockets[connected[s]].emit("newjoined", player.name, player.id)
        }
        data.sockets[socket.id] = code;
        socket.emit("joinsuccess", room.players)
        fs.writeFileSync("./data.json", JSON.stringify(data))
    })
    socket.once("disconnect", () => {
        var room = data.sockets[socket.id];
        if (!room) return;
        data[room].player(socket.id).quit = true;
        var count = 0;
        data[room].players.forEach(e => count += e.quit ? 1 : 0)
        if (count == data[room].players.length) {
            var ids = data[room].players.map(e => e.id);
            ids.forEach(e => delete data.sockets[e]);
        }
    })
    socket.on("begin", () => {
        var code = getRoom(socket.id)
        var room = data[code];
        var assignments = {
            "5": { lib: 3, fasc: 1 },
            "6": { lib: 4, fasc: 1 },
            "7": { lib: 4, fasc: 2 },
            "8": { lib: 5, fasc: 2 },
            "9": { lib: 5, fasc: 3 },
            "10": { lib: 6, fasc: 3 }
        }
        var num = room.players.length
        var lib = assignments[num].lib
        var fasc = assignments[num].fasc
        var copy = room.players.slice(0);
        for (i = 0; i < lib + fasc; i++) {
            var rand = Math.floor(Math.random() * copy.length);
            var found = room.player(copy[rand].id)
            found.party = i < lib ? "lib": "fasc"
            found.role = i < lib ? "lib": "fasc"
            copy.splice(rand, 1);
        }
        var found = room.player(copy[0].id)
        found.party = "fasc";
        found.role = "hit";
        var boards = {
            "5": ["blank", "blank", "top3", "kill", "kill", "blank"],
            "6": ["blank", "blank", "top3", "kill", "kill", "blank"],
            "7": ["blank", "inspect", "nextpres", "kill", "kill", "blank"],
            "8": ["blank", "inspect", "nextpres", "kill", "kill", "blank"],
            "9": ["inspect", "inspect", "nextpres", "kill", "kill", "blank"],
            "10": ["inspect", "inspect", "nextpres", "kill", "kill", "blank"]
        }
        room.powers = boards[num];
        room.p = 0;
        for (let i = 0; i < room.players.length; i++) {
            var player = room.players[i]
            var s = io.sockets.sockets[player.id];
            var role = player.role;
            var buddies = undefined;
            if (role == "fasc") buddies = room.players.filter(e => e.role == "fasc" && e.id != player.id).map(e => e.name);
            else if (role == "hit" && num <= 6) buddies = room.players.filter(e => e.role == "fasc" && e.id != player.id).map(e => e.name);
            var hitler = role == "fasc" ? room.players.find(e => e.role == "hit").name : undefined;
            s.emit("assignments", role, buddies, hitler)
            s.emit("begun", room.powers)
        }
        setTimeout(newround, 5000)
    })
    function newround() {
        var code = getRoom(socket.id)
        var room = data[code]
        room.p = room.p == room.players.length - 1 ? 0 : room.p + 1;
        room.president = room.players[room.p]
        room.president.socket().emit("grant_nominate");
        room.announce("announce_nominate", [room.president.name], p => p.id != room.president.id)
    }
    socket.on("do_nominate", (name) => {
        var code = getRoom(socket.id);
        var room = data[code];
        var c = room.players.findIndex(p => p.name == name);
        room.c = c;
        room.chancellor = room.players[c];
        room.announce("announce_vote", [name, room.president.name], p => p.id != room.president.id)
    })
    socket.on("do_vote", ballot => {
        var code = getRoom(socket.id);
        var room = data[code]
        room.voted++;
        if (ballot == "ja") room.ja++;
        else room.nein++;
        room.player(socket.id).ballot = ballot
        if (room.players.length - 1 == room.voted) {
            if (room.draw.length < 3) shuffle(room);
            var condensed = room.players.map((e, ind) => {
                return {
                    name: e.name,
                    ballot: e.ballot,
                    id: e.id,
                    nominee: room.c == ind
                }
            })
            room.announce("announce_results", [condensed])
            room.players.forEach(p => p.ballot = null)
            if (room.ja > room.nein) {
                setTimeout(() => {
                    room.president.socket().emit("grant_draw", room.draw[0], room.draw[1], room.draw[2]);
                    room.draw.splice(0, 3);
                    room.announce("announce_draw", [room.president.name, room.chancellor.name], p => p.id != room.president.id)
                }, 7000)
            } else setTimeout(newround, 7000)
            room.ja = 0;
            room.nein = 0;
            room.voted = 0;
        }
    })
    socket.on("do_draw", (discard, card1, card2) => {
        var code = getRoom(socket.id);
        var room = data[code]
        room.chancellor.socket().emit("grant_enact", card1, card2);
        room.discarded.push(discard);
        room.announce("announce_enact", [room.chancellor.name], p => p.id != room.chancellor.id)
    })
    socket.on("do_reqveto", cards => { 
        var code = getRoom(socket.id);
        var room = data[code]
        room.president.socket().emit("grant_answerveto", room.chancellor.name, cards)
        room.announce("announce_reqveto", [room.chancellor.name], p => p.id != room.president.id)
    })
    socket.on("do_answerveto", (decision, cards) => { 
        var code = getRoom(socket.id);
        var room = data[code]
        room.announce("announce_answerveto", [room.president.name, decision], p => p.id != room.president.id)
        setTimeout(() => {
            if (decision == "ja") {
                room.discarded = room.discarded.concat(cards);
                newround();
            } else {
                room.chancellor.socket().emit("grant_enact", cards[0], cards[1])
                room.announce("announce_enact", [room.chancellor.name], p => p.id != room.chancellor.id)
            }
        }, 5000)
    })
    socket.on("do_enact", (card1, discard) => {
        var code = getRoom(socket.id);
        var room = data[code]
        room.discarded.push(discard);
        room.announce("announce_policy", [card1 == 1 ? "LIBERAL" : "FASCIST", room.chancellor.name])
        room.libenacted += card1;
        room.fascenacted += (1 - card1);
        if (room.fascenacted == 5) room.announce("grant_veto")
        setTimeout(() => {
            var power = room.powers[room.fascenacted];
            if (card1 == 0 && power != "blank") {
                room.president.socket().emit("grant_power", power);
                room.announce("announce_power", [power, room.president.name], p => p.id != room.president.id)
            } else newround()
        }, 5000)
    })
    socket.on("win", team => {
        var code = getRoom(socket.id);
        var room = data[code]
        room.announce("announce_win", [team, room.players])
        room.players.forEach(e => delete data.sockets[e.id]);
        delete data[code];
    })
});
server.listen(8080);