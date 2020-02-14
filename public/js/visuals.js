var playerselect;
var you;
var won = false;
var arr = [];
var canveto = false;
function playermenu(id) {
    if (document.querySelector("#" + id + " .action").innerText == "") return;
    if (playerselect == id) {
        playerselect = undefined;
        return document.querySelector("#" + id + " .playermenu").hidden = true;
    } else {
        if (playerselect != undefined) {
            document.querySelector("#" + playerselect + " .playermenu").hidden = true;
        }
        document.querySelector("#" + id + " .playermenu").hidden = false;
        playerselect = id;
    }
}
function getPlayer(name) {
    for (i = 0; i < arr.length; i++) {
        if (arr[i].name == name) return arr[i];
    }
    for (i = 0; i < arr.length; i++) {
        if (arr[i].id == name) return arr[i];
    }
}
window.onload = () => {
    var children = document.getElementById("playercontain").children;
    for (i = 0; i < children.length; i++) {
        if (children[i].id != "player1") children[i].setAttribute("onclick", "playermenu('" + children[i].id + "')")
    }
}
function newgame() {
    document.getElementById("menu").hidden = true;
    document.getElementById("newgame").hidden = false;
}
function joingame() {
    document.getElementById("menu").hidden = true;
    if (localStorage.getItem("code") != null) $("#roominput").val(localStorage.getItem("code"))
    document.getElementById("joingame").hidden = false;
}
function newbutton() {
    var name = document.getElementById("nameinput").value;
    if (name == "") return alert("CHOOSE A NICKNAME, DOOFUS")
    socket.emit("init", name.toUpperCase());
    you = {
        id: socket.id,
        name: $("#nameinput").val().toUpperCase()
    }
}
function joinbutton() {
    if ($("#roominput").val() == "") return alert("STATE A ROOM CODE, DOOFUS");
    if ($("#nameinput_join").val() == "") return alert("CHOOSE A NICKNAME, DOOFUS");
    socket.emit("join", $("#roominput").val(), $("#nameinput_join").val().toUpperCase());
    you = {
        id: socket.id,
        name: $("#nameinput_join").val().toUpperCase()
    }
}
var purpose = null;
var decision = null;
function ja() {
    if (decision != "ja") {
        decision = "ja"
        $("#ja").addClass("popup");
        $("#nein").removeClass("popup");
    } else {
        decision = null
        $("#ja").removeClass("popup");
    }
}
function nein() {
    if (decision != "nein") {
        decision = "nein"
        $("#nein").addClass("popup");
        $("#ja").removeClass("popup");
    } else {
        decision = null
        $("#nein").removeClass("popup");
    }
}
var discard;
function discard_popup(element) {
    if (purpose == "continue") return;
    if (discard != element.id) {
        discard = element.id;
        if ($("#cardcontain .popup")) $("#cardcontain .popup").removeClass("popup");
        element.classList.add("popup")
    } else {
        discard = null;
        element.classList.remove("popup")
    }
}
var enact;
function enact_popup(element) {
    if (enact != element.id) {
        enact = element.id;
        if ($("#cardcontain .popup")) $("#cardcontain .popup").removeClass("popup");
        element.classList.add("popup")
    } else {
        enact = null;
        element.classList.remove("popup")
    }
}