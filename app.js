/*
 app.js
 */

var ai = {
    uci : function (req, callback) {
        try{
            var child = require('child_process').spawn(this.path);
            var response = "";
            child.stdin.write("uci\n");
            child.stdout.on('data', function(data) {
                response = data.toString();
                if(response.indexOf("uciok") > -1){
                    var arr_response = response.split("\n");
                    var response_part;
                    for(response_part in arr_response){
                        var arr_response_parts = arr_response[response_part].split(" ");
                        if(arr_response_parts[0].indexOf("id") > -1 && arr_response_parts[1].indexOf(req) > -1){
                            try{
                                child.stdin.write("quit\n");
                            }catch(err){}
                            callback(arr_response_parts.slice(2,arr_response_parts.length).join(" "));
                        }
                    }
                }
                try{
                    child.stdin.write("quit\n");
                }catch(err){
                    console.log("Error: " + err);
                }
            });
            child.stderr.on('data', function(data) {
                console.log("Error: " + data);
            });
        }catch(err){
            console.log("Error:" + err);
        }
        try{
            child.kill();
        }catch(err){
            console.log("Error:" + err);
        }
    },
    go : function (current_game, callback){
        try{
            // Start up child process
            var child = require('child_process').spawn(this.path);
            var response = "";
            var current_cp = undefined;
            var end,start;
            var uciok_flag = 0;
            // Write fen to UCI engine
            child.stdin.write("uci\n");
            child.stdin.write("position fen " + current_game.board.fen() + "\n");
            // Get starting moment
            start = new Date();
            // Send go command with parameters
            if(current_game.mode.toString().indexOf("depth") > -1){
                child.stdin.write("go depth " + current_game.depth + "\n");
            }else if(current_game.mode.toString().indexOf("movetime") > -1){
                child.stdin.write("go movetime " + current_game.movetime + "\n");
            }else if(current_game.mode.toString().indexOf("time") > -1){
                child.stdin.write("go btime " + current_game.btime + " wtime " + current_game.wtime + "\n");
            }
            // Receive the returned data
            child.stdout.on('data', function(data) {
                response = data.toString();
                //console.log(response)
                if(response.indexOf("uciok") > -1){

                }
                // Extract score data
                if(response.indexOf("cp") > -1 && current_cp == undefined){
                    arr_response = response.split("\n");
                    for(response_part in arr_response){
                        var arr_response_parts = arr_response[response_part].split(" ");
                        if(current_cp == undefined){
                            for(var i =0; i < arr_response_parts.length; i++){
                                if(arr_response_parts[i].indexOf("cp") > -1){
                                    current_cp = arr_response_parts[i+1];
                                    if(current_cp == undefined || current_cp == "undefined") {
                                        console.log('Info: cp ' + current_game.board.turn() + ' ' + current_cp);
                                        if (current_game.board.turn().indexOf("w") > -1) {
                                            cpdata[0].push(current_cp);
                                        } else {
                                            cpdata[1].push(current_cp);
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                    }
                }
                // Check if there is already a bestmove in the data
                if(/(bestmove )\w+/.test(response)) {
                    // Get end time
                    end = new Date() - start;
                    if (current_game.board.turn().indexOf("w") > -1) {
                        timedata[0].push(end);
                    } else {
                        timedata[1].push(end);
                    }
                    console.log('Info: turn ' + current_game.board.turn());
                    // Update unused time
                    if (current_game.board.turn() == 'w' && current_game.mode.toString().indexOf("time") > -1) {
                        current_game.wtime = current_game.wtime - end + config.game.inc;
                        console.log('Info: wtime ' + current_game.wtime);
                    } else if (current_game.board.turn() == 'b' && current_game.mode.toString().indexOf("time") > -1) {
                        current_game.btime = current_game.btime - end + config.game.inc;
                        console.log('Info: btime ' + current_game.btime);
                    }
                    //Extract bestmove from the data
                    var arr_response = response.split("\n");
                    var response_part;

                    for (response_part in arr_response) {
                        var arr_response_parts = arr_response[response_part].split(" ");
                        if (arr_response_parts[0].indexOf("bestmove") > -1) {
                            try {
                                child.stdin.write("quit\n");
                            } catch (err) {
                            }
                            // Callback
                            callback(arr_response_parts[1]);
                            return 1;
                        }
                    }
                }
            });
            child.stderr.on('data', function(data) {
                //console.log("Error: " + data);
            });
        }catch(err){
            console.log("Error: " + err);
        }
    }
};

function createGame(config){
    // Create game object and load data from config
    var game = {
        id : 0,
        gameName : "",
        current_round : 1,
        total_rounds: 1,
        mode: "movetime",
        movetime: 1000,
        depth: 6,
        wtime : 0,
        btime : 0,
        inc : 0,
        p1_name : "Player 1",
        p2_name : "Player 2",
        running : 0,
        moves : [],
        board : null,
        turn : 1
    };

    game.gameName = config.game.gameName;
    game.total_rounds = config.game.total_rounds;
    game.btime = config.game.btime;
    game.wtime = config.game.wtime;
    game.inc = config.game.inc;
    game.movetime = config.game.movetime;
    game.mode = config.game.mode;
    return game;
}

function random (low, high) {
    var id = Math.floor(Math.random() * (high - low + 1) + low);
    while(used_ids.indexOf(id) > -1){
        id = Math.floor(Math.random() * (high - low + 1) + low);
    }
    used_ids.push(id);
    return id;
}

function gameLoop(){
    // Managing Turns
    if(current_game.turn % 2 == 1){
        first.go(current_game, move_callback);
    }else{
        second.go(current_game, move_callback);
    }
}

function next() {
    // To next round if still rounds to go
    if(current_game.current_round < current_game.total_rounds){
        round = current_game.current_round + 1;
        if(sideswitch==1){sideswitch=0}else{sideswitch=1}
        first = player_array[current_player];
        second = player_array[current_opponent];
        play(round);
    }else if(config.options.tournament_mode == true){
        // Reset to round one and move on to next player
        round = 1;
        if(current_opponent == player_array.length - 1 && current_player + 1 <= player_array.length - 2){
            current_player = current_player + 1;
            current_opponent = current_player + 1;
            first = player_array[current_player];
            second = player_array[current_opponent];
            play(round);
        }else if(current_opponent != player_array.length - 1){
            current_opponent = current_opponent + 1;
            first = player_array[current_player];
            second = player_array[current_opponent];
            play(round);
        }


    }
}

var move_callback = function(bestmove){
    // Extract info from bestmove response
    bestmove = bestmove.replace("-", "");
    console.log('Info: move ' + bestmove);
    var from  = bestmove.slice(0,2);
    var to = bestmove.slice(2,4);
    // Check if there is a promotion
    var promo = "";
    var prmove;
    if(bestmove.length == 5) {
        promo = '='+bestmove[4].toUpperCase();
    }
    var move_error = new Error('MoveFailed');
    var ret = null;
    try{
        // Verify if it is a castling move
        if (bestmove == 'e1g1' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O');
            console.log('Info: move O-O');
        }else if (bestmove == 'e1c1' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O-O');
            console.log('Info: move O-O-O');
        }else if (bestmove == 'e8g8' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O');
            console.log('Info: move O-O');
        }else if (bestmove == 'e8c8' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O-O');
            console.log('Info: move O-O-O');
        }else if(current_game.board.get(from).type == 'p'){
            // Pawn moves
            // Verify if it is a en passant capture
            var fen = current_game.board.fen();
            var enpas = fen.split(" ")[3];
            if(current_game.board.get(to) == null && to != enpas){
                prmove = to + promo;
                ret = current_game.board.move(prmove);
            }else{
                prmove = bestmove.slice(0,1) + 'x' + to + promo;
                ret = current_game.board.move(prmove);
            }
            if(ret == null){
                prmove = prmove + '+';
                current_game.board.move(prmove);
            }
            console.log('Info: move ' + prmove);
        }else {
            // Other pieces
            if (current_game.board.get(to) == null) {
                // Non-capture moves
                prmove = current_game.board.get(from).type.toUpperCase() + to
                ret = current_game.board.move(prmove);
                if (ret == null) {
                    prmove = current_game.board.get(from).type.toUpperCase() + bestmove.slice(0, 1) + to;
                    ret = current_game.board.move(prmove);
                }
                if(ret == null){
                    prmove = prmove + '+';
                    ret = current_game.board.move(prmove);
                }
                if(ret == null){
                    prmove = current_game.board.get(from).type.toUpperCase() + bestmove.slice(1, 2) + to;
                    ret = current_game.board.move(prmove);
                }
                if(ret == null){
                    prmove = prmove + '+';
                    ret = current_game.board.move(prmove);
                }
            } else {
                // Capture moves
                prmove = current_game.board.get(from).type.toUpperCase() + 'x' + to;
                ret = current_game.board.move(prmove);
                if (ret == null) {
                    prmove = current_game.board.get(from).type.toUpperCase() + bestmove.slice(0, 1) + 'x' + to;
                    ret = current_game.board.move(prmove);
                }
                if(ret == null){
                    prmove = prmove + '+';
                    ret = current_game.board.move(prmove);
                }
                if(ret == null){
                    prmove = current_game.board.get(from).type.toUpperCase() + bestmove.slice(1, 2) + 'x' + to;
                    ret = current_game.board.move(prmove);
                }
                if(ret == null){
                    prmove = prmove + '+';
                    ret = current_game.board.move(prmove);
                }
            }
            console.log('Info: move ' + prmove);
        }
        // Error handling
        if (ret == null) {
            throw move_error;
        }
    }catch(err){
        console.log("Error: " + err);
    }
    // Next turn
    current_game.turn = current_game.turn + 1;
    console.log('Info: fen ' + current_game.board.fen());
    // Check if and how the game ended and add it to PGN header
    if(current_game.board.game_over() == true || current_game.btime <= 0 || current_game.wtime <= 0){
        var result = 'd';
        if(current_game.board.in_checkmate() == true && current_game.board.turn() == 'b'){
            console.log("Info: end checkmate w wins");
            result = 'ww';
            current_game.board.header('Result', '1-0');
        }else if(current_game.board.in_checkmate() == true && current_game.board.turn() == 'w'){
            console.log("Info: end checkmate b wins");
            result = 'bw';
            current_game.board.header('Result', '0-1');
        }else if(current_game.board.in_stalemate() == true){
            console.log("Info: end stalemate");
            current_game.board.header('Result', '1/2-1/2');
        }else if(current_game.board.in_draw() == true){
            console.log("Info: end draw");
            current_game.board.header('Result', '1/2-1/2');
        }else if(current_game.board.in_threefold_repetition() == true){
            console.log("Info: end threefold");
            current_game.board.header('Result', '1/2-1/2');
        }else if(current_game.btime <= 0 ){
            console.log("Info: end notime w wins");
            result = 'ww';
            current_game.board.header('Result', '1-0');
        }else if(current_game.wtime <= 0 ){
            console.log("Info: end notime b wins");
            result = 'bw';
            current_game.board.header('Result', '0-1');
        }
        // Stop the game
        current_game.running = 0;
        // Save the PGN file
        if(config.options.save_pgn){
            var fname_pgn = config.options.save_location + "/" + current_game.gameName + '-' + date.format('DDMMYYYY') + '-' + current_game.current_round + '-' + current_game.id + '.pgn';
            fs.writeFile(fname_pgn, current_game.board.pgn(), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("Info: pgn saved "+fname_pgn);
                // To next game
                next(result);
            });
        }
        // Save CSV file with CP score data
        if(config.options.save_cpdata){
            var fname_cp = config.options.save_location + "/cp" + current_game.gameName + '-' + date.format('DDMMYYYY') + '-' + current_game.current_round + '-' + current_game.id + '.csv';
            var csv = cpdata.join("\r\n");
            fs.writeFile(fname_cp, csv, function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("Info: csv saved "+fname_cp);
            });
        }
        // Save CSV file with time data
        if(config.options.save_timedata){
            var fname_time = config.options.save_location + "/time" + current_game.gameName + '-' + date.format('DDMMYYYY') + '-' + current_game.current_round + '-' + current_game.id + '.csv';
            var csv = timedata.join("\r\n");
            fs.writeFile(fname_time, csv, function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("Info: csv saved "+fname_time);
            });
        }
    }else if(current_game.running == 1){
        // Callback to gameloop
        gameLoop();
    }
};

function play(round){
    // Reset data arrays
    cpdata = new Array();
    timedata = new Array();
    cpdata[0] = ['w'];
    cpdata[1] = ['b'];
    timedata[0] = ['w'];
    timedata[1] = ['b'];
    // Create game object
    current_game = createGame(config);
    // Generate game ID
    current_game.id = random(1000,9999);
    // Create chess.js object
    current_game.board = chess();
    // Running flag
    current_game.running = 1;
    // Set Round
    current_game.current_round = round;
    // Set PGN headers
    if(sideswitch == 0) {
        current_game.board.header('White', first.name, 'Black', second.name, 'Date', today, 'Round', current_game.current_round.toString());
    }else{
        current_game.board.header('White', second.name, 'Black', first.name, 'Date', today, 'Round', current_game.current_round.toString());
        current_game.turn += 1;
    }
    // Start the game loop
    gameLoop();
}

// Requirements
var chess = require('chess.js').Chess;
var moment = require('moment');
var fs = require('fs');
//var csv = require('csv');
// Date
var date = moment();
var today = date.format('DD-MM-YYYY');
// Load config JSON
var config_path = "config.json";
if(process.argv[2] != null){
    config_path = process.argv[2];
}
try {
    var config = JSON.parse(fs.readFileSync(config_path, 'utf8'));
}catch(err){
    console.log("Error: " + err);
    process.exit(1);
}
// Init vars
var current_game, first, second, round;
var used_ids = new Array();
var sideswitch = 0;
var cpdata = new Array();
var timedata = new Array();
var player_array = new Array();
var current_player = 0;
var current_opponent = 1;
var players = config.options.players;
cpdata[0] = ['w'];
cpdata[1] = ['b'];
timedata[0] = ['w'];
timedata[1] = ['b'];
// Create and init objects for players
for(var i = 0;i < config.options.players.length; i++){
    player_array[i] = Object.create(ai);
    player_array[i].path = config[players[i]].path;
    player_array[i].name = config[players[i]].name;
}
// Start it up!
first = player_array[0];
second = player_array[1];
try {
    // Check save location
    stats = fs.lstatSync(config.options.save_location);
    if (stats.isDirectory()) {
        play(1);
    }else{
        console.log("Error: The given save location path is not a directory");
    }
}
catch (e) {
    console.log("Error: "+e);
}


