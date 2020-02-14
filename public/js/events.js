socket.on("inited", code => {
    $("#newgame").attr("hidden", true)
    $("#master").text("YOUR CODE IS " + code);
    localStorage.setItem("code", code)
    $("#lobby").removeAttr("hidden");
})
socket.on("badroom", () => alert("THAT ROOM DOESN'T EXIST, DING DONG"))
socket.on("badname", () => alert("THAT NAME IS ALREADY TAKEN, DUMBASS"))
socket.on("toomany", () => alert("ROOM IS FULL, BETTER LUCK NEXT TIME"));
socket.on("joinsuccess", players => {
    for (i = 0; i < players.length; i++) {
        if (players[i].id == socket.id) continue;
        var obj = {
            num: arr.length + 2,
            id: players[i].id,
            name: players[i].name
        }
        document.querySelector("#player" + obj.num + " .name").innerText = obj.name;
        document.querySelector("#joined" + obj.num + " .name").innerText = obj.name;
        $("#player" + obj.num).removeAttr("hidden");
        $("#joined" + obj.num).removeAttr("hidden");
        arr.push(obj);
    }
    $("#joingame").attr("hidden", true)
    $("#lobby").removeAttr("hidden");
})
socket.on("newjoined", (name, id) => {
    var obj = {
        num: arr.length + 2,
        id: id,
        name: name.toUpperCase()
    }
    document.querySelector("#player" + obj.num + " .name").innerText = obj.name;
    document.querySelector("#joined" + obj.num + " .name").innerText = obj.name;
    $("#player" + obj.num).removeAttr("hidden");
    $("#joined" + obj.num).removeAttr("hidden");
    arr.push(obj);
    if (arr.length == 4 && $("#master").text().includes("YOUR CODE IS")) $("#begin").removeAttr("hidden");
})
socket.on("playerleft", player => {
    $("#messages").text(player + " HAS LEFT THE ROOM, WAITING UNTIL THEY REJOIN...")
    sessionStorage.setItem("paused", true)
})
socket.on("rejoined", () => {

})
socket.on("assignments", (role, buddies, hitler) => {
    if (role == "hit" && !buddies) {
        $("#messages").text("YOU ARE HITLER. YOU DON'T KNOW YOUR FASCIST BUDDIES")
    } else if (role == "hit" && buddies.length == 1) {
        $("#messages").text("YOU ARE HITLER. YOUR FASCIST BUDDY IS " + buddies[0]);
    } else if (role == "fasc" && buddies.length == 2) {
        $("#messages").text("YOU ARE A FASCIST. YOUR FASCIST BUDDIES ARE " + buddies[0] + " AND " + buddies[1] + ". HITLER IS " + hitler)
    } else if (role == "fasc" && buddies.length == 1) {
        $("#messages").text("YOU ARE A FASCIST. YOUR FASCIST BUDDY IS " + buddies[0] + ". HITLER IS " + hitler)
    } else if (role == "fasc") {
        $("#messages").text("YOU ARE THE FASCIST. HITLER IS " + hitler)
    } else {
        $("#messages").text("YOU ARE A LIBERAL. FIND THE FASCISTS")
    }
    $("#player1").addClass(role + "role")
    if (buddies) {
        for (i = 0; i < arr.length; i++) {
            if (buddies.includes(arr[i].name)) {
                $("#player" + arr[i].num).addClass("fascrole")
            } else if (hitler == arr[i].name) {
                $("#player" + arr[i].num).addClass("hitrole")
            } else {
                $("#player" + arr[i].num).addClass("librole")
            }
        }
    }
})
socket.on("begun", (powers) => {
    $("#lobby").attr("hidden", true)
    $("#board").removeAttr("hidden");
    for (i = 0; i < powers.length; i++) {
        $("#fascard" + (i + 1)).addClass("powers[i")
    }
})
// NOMINATION STAGE
socket.on("announce_nominate", (pres) => {
    $("#label").removeAttr("auth");
    $("#messages").removeClass("left")
    $("#messages").text(pres + " IS NOMINATING A CHANCELLOR...")
})
socket.on("grant_nominate", () => {
    $("#label").attr("auth", "pres")
    $("#messages").removeClass("left")
    var children = $("#playercontain").children()
    for (i = 0; i < children.length; i++) {
        if (children[i].id == "player1") continue;
        $("#" + children[i].id + " .action").removeAttr("hidden").attr("onclick", "do_nominate(this)").text("NOMINATE")
    }
    $("#messages").text("NOMINATE A CHANCELLOR...")
})
function do_nominate(element) {
    socket.emit("do_nominate", element.querySelector(".name").innerText)
    var children = $("#playercontain").children()
    for (i = 0; i < children.length; i++) {
        if (children[i].id == "player1") continue;
        $("#" + children[i].id + " .action").attr("hidden", true).removeAttr("onclick").text("")
    }
    $("#messages").text("WAITING FOR THE VOTE...")
}
//VOTING STAGE
socket.on("announce_vote", (nominee, pres) => {
    purpose = "vote";
    for (i = 0; i < arr.length; i++) {
        if (arr[i].name == nominee) {
            $("#messages").text(pres + " HAS NOMINATED " + nominee + " AS CHANCELLOR, DO YOU ACCEPT?")
            $("#submit").removeAttr("hidden");
            $("#ja").removeAttr("hidden");
            $("#nein").removeAttr("hidden");
        }
    }
    if (you.name == nominee) {
        $("#messages").text(pres + " HAS NOMINATED YOU AS CHANCELLOR, DO YOU ACCEPT?")
        $("#submit").removeAttr("hidden");
        $("#ja").removeAttr("hidden");
        $("#nein").removeAttr("hidden");
    }
})
function do_vote() {
    if (decision == null) {
        alert("MAKE A DECISION FIRST, DOOFUS. WHAT, DO YOU NOT UNDERSTAND GERMAN?");
    } else {
        $("#ja").removeClass("popup").attr("hidden", true)
        $("#nein").removeClass("popup").attr("hidden", true)
        $("#submit").attr("hidden", true)
        socket.emit("do_vote", decision);
    }
}
//UNIVERSAL SUBMIT BUTTON
function submit() {
    var selected = document.querySelector("#select .popup").id
    if ((selected == "ja" || selected == "nein") && purpose == "vote") do_vote();
    else if ((selected == "ja" || selected == "nein") && purpose == "veto") do_veto();
    else if (selected.startsWith("pres")) do_draw();
    else if (selected.startsWith("chanc")) do_enact();
}
//VOTING RESULTS
socket.on("announce_results", players => {
    var ja = 0;
    var nein = 0;
    var nominee;
    for (i = 0; i < players.length; i++) {
        if (players[i].ballot == null) continue;
        ja += players[i].ballot == "ja" ? 1 : 0;
        nein += players[i].ballot == "nein" ? 1 : 0;
        var num = you.id == players[i].id ? 1 : arr.find(e => e.id == players[i].id).num
        if (players[i].nominee) nominee = players[i].id
        document.querySelector("#player" + num + " .playervote").setAttribute("class", "playervote " + players[i].ballot)
        document.querySelector("#player" + num + " .playervote").removeAttr("hidden");
    }
    if (ja > nein) {
        $("#messages").addClass("left")
        $("#messages").text("CHANCELLOR ELECTED!")
        if (nominee == you.id) $("#label").attr("auth", "chanc")
    } else {
        $("#messages").addClass("left").text("VOTE FAILED. MOVING ALONG THEN...")
    }
})
//PRESIDENT DRAWS THREE CARDS
socket.on("announce_draw", (pres, chanc) => {
    $("#messages").removeClass("left")
    $("#messages").text(pres + " IS DRAWING THREE POLICIES AND WILL HAND TWO TO " + chanc)
    var displays = document.querySelectorAll("#playercontain .playervote")
    for (i = 0; i < displays.length; i++) {
        displays[i].setAttribute("class", "playervote")
    }
})
socket.on("grant_draw", (card1, card2, card3) => {
    $("#messages").removeClass("left")
    var displays = document.querySelectorAll("#playercontain .playervote")
    for (i = 0; i < displays.length; i++) {
        displays[i].setAttribute("class", "playervote")
    }
    $("#pres1").removeAttr("hidden").attr("policy", card1)
    $("#pres2").removeAttr("hidden").attr("policy", card2)
    $("#pres3").removeAttr("hidden").attr("policy", card3)
    $("#messages").text("SELECT A POLICY TO DISCARD, THE OTHER TWO WILL GO TO THE CHANCELLOR");
    $("#submit").removeAttr("hidden");
})
function do_draw() {
    var others = Array.from(document.getElementById("cardcontain").children).filter(e => e.hidden == false && e.id != discard).map(e => e.getAttribute("policy"))
    socket.emit("do_draw", $("#" + discard).attr("policy"), others[0], others[1]);
    $("#pres1").attr("hidden", true).removeAttr("policy")
    $("#pres2").attr("hidden", true).removeAttr("policy")
    $("#pres3").attr("hidden", true).removeAttr("policy")
    $("#submit").attr("hidden", true)
}
//CHANCELLOR ENACTS A POLICY
socket.on("announce_enact", chanc => {
    $("#messages").text(chanc + " HAS BEEN HANDED TWO POLICIES AND WILL ENACT ONE OF THEM")
})
socket.on("grant_enact", (card1, card2) => {
    $("#chanc1").removeAttr("hidden").attr("policy", card1)
    $("#chanc2").removeAttr("hidden").attr("policy", card2)
    $("#messages").text("SELECT A POLICY TO ENACT");
    $("#submit").removeAttr("hidden");
})
function do_enact() {
    var other = Array.from(document.getElementById("cardcontain").children).find(e => e.hidden == false && e.id != enact).getAttribute("policy")
    socket.emit("do_enact", $("#" + enact).attr("policy"), other)
    $("#chanc1").attr("hidden", true)
    $("#chanc2").attr("hidden", true)
    $("#chanc1").removeAttr("policy")
    $("#chanc2").removeAttr("policy")
    $("#submit").attr("hidden", true)
}
//CHANCELLOR CAN REQUEST VETO
function do_reqveto() {
    socket.emit("do_reqveto", $("#chanc1").attr("policy"), $("#chanc2").attr("policy"))
    $("#messages").text("AWAITING PRESIDENTIAL AGREEEMENT...")
    $("#chanc1").attr("hidden", true)
    $("#chanc2").attr("hidden", true)
    $("#chanc1").removeAttr("policy")
    $("#chanc2").removeAttr("policy")
    $("#submit").attr("hidden", true)
}
socket.on("announce_reqveto", chanc => {
    $("#messages").text(chanc + " HAS REQUESTED TO VETO")
})
socket.on("grant_answerveto", (chanc, cards) => {
    $("#messages").text(chanc + " HAS REQUESTED TO VETO, DO YOU ACCEPT?");
    $("#chanc1").attr("policy", cards[0]);
    $("#chanc2").attr("policy", cards[1]);
    $("#ja").removeAttr("hidden")
    $("#nein").removeAttr("hidden")
    $("#submit").removeAttr("hidden")
})
socket.on("announce_answerveto", (pres, decision) => {
    $("#messages").text(pres + " HAS " + (decision == "ja" ? "ACCEPTED" : "DECLINED") + " THE REQUEST TO VETO");
})
//POLICY IS ENACTED
socket.on("announce_policy", (policy, chanc) => {
    $("#messages").text(chanc + " HAS ENACTED A " + policy + " POLICY")
    var party = policy == "LIBERAL" ? "lib" : "fasc"
    var count = document.querySelectorAll("#" + party + "contain ." + party + "policy").length;
    $("#" + party + "card" + (count + 1)).attr("class", party + "policy");
})
socket.on("announce_top3", pres => $("#messages").text(pres + " WILL NOW PEEK AT THE TOP 3 CARDS"))
socket.on("grant_top3", (card1, card2, card3) => {
    $("#pres1").removeAttr("hidden").attr("policy", card1)
    $("#pres2").removeAttr("hidden").attr("policy", card2)
    $("#pres3").removeAttr("hidden").attr("policy", card3)
    $("#messages").text("THE FOLLOWING ARE THE TOP 3 CARDS ON THE DECK. YOU MAY CONTINUE AT ANY TIME")
})
function do_top3() {
    socket.emit("do_top3")
}
socket.on("announce_kill", pres => $("#messages").text(pres + " WILL NOW KILL A PLAYER"))
socket.on("grant_kill", () => {
    var children = $("#playercontain").children()
    for (i = 0; i < children.length; i++) {
        if (children[i].id == "player1") continue;
        $("#" + children[i].id + " .action").removeAttr("hidden").attr("onclick", "do_nominate(this)").text("NOMINATE")
    }
})
socket.on("announce_inspect", pres => $("#messages").text(pres + " WILL NOW INSPECT A PLAYER'S IDENTITY"))
socket.on("grant_inspect")
socket.on("announce_nextpres", pres => $("#messages").text(pres + " WILL NOW NOMINATE THE NEXT PRESIDENT"))
socket.on("grant_inspect")

socket.on("winannounce", () => {

})