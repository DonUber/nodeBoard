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
            // Write fen to UCI engine
            child.stdin.write("position fen " + current_game.board.fen() + "\n");
            // Get starting moment
            var start = new Date();
            var end;
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
                // Extract score data
                if(response.indexOf("cp") > -1 && current_cp == undefined){
                    var arr_response = response.split("\n");
                    var response_part;

                    for(response_part in arr_response){
                        var arr_response_parts = arr_response[response_part].split(" ");
                        if(current_cp == undefined){
                            for(var i =0; i < arr_response_parts.length; i++){
                                if(arr_response_parts[i].indexOf("cp") > -1){
                                    current_cp = arr_response_parts[i+1];
                                    console.log('Info: cp ' + current_game.board.turn() + current_cp);
                                    break;
                                }
                            }
                        }
                    }
                }
                // Check if there is already a bestmove in the data
                if(response.indexOf("bestmove") > -1){
                    // Get end time
                    end = new Date() - start;
                    console.log('Info: turn ' + current_game.board.turn());
                    if(current_game.board.turn() == 'w' && current_game.mode.toString().indexOf("time") > -1){
                        current_game.wtime = current_game.wtime - end;
                        console.log('Info: wtime ' + current_game.wtime);
                    }else if(current_game.board.turn() == 'b' && current_game.mode.toString().indexOf("time") > -1){
                        current_game.btime = current_game.btime - end;
                        console.log('Info: btime ' + current_game.btime);
                    }
                    //Extract bestmove from the data
                    var arr_response = response.split("\n");
                    var response_part;

                    for(response_part in arr_response){
                        var arr_response_parts = arr_response[response_part].split(" ");
                        if(arr_response_parts[0].indexOf("bestmove") > -1){
                            try{
                                child.stdin.write("quit\n");
                            }catch(err){}
                            // Callback
                            callback(arr_response_parts[1]);
                            return 1;
                        }
                    }
                }
            });
            child.stderr.on('data', function(data) {
                console.log("Error: " + data);
            });
        }catch(err){
            console.log("Error: " + err);
        }
    }

};

function createGame(p1, p2, config){
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
    game.p1_name = config.p1.name;
    game.p2_name = config.p2.name;
    game.mode = config.game.mode;
    return game;
}

function createTournament(){

}

function random (low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function gameLoop(){
    if(current_game.turn % 2 == 1){
        p1.go(current_game, move_callback);
    }else{
        p2.go(current_game, move_callback);
    }
}

function next(result) {
    // To next round if still rounds to go
    if(current_game.current_round < current_game.total_rounds){
        round = current_game.current_round + 1;
        play(round);
    }
}

var move_callback = function(bestmove){
    console.log('Info: move ' + bestmove);
    // Extract info from bestmove response
    var from  = bestmove.slice(0,2);
    var to = bestmove.slice(2,4);
    // Check if there is a promotion
    var promo = "";
    if(bestmove.length == 5) {
        promo = '='+bestmove[4].toUpperCase();
    }
    var move_error = new Error('MoveFailed');
    var ret = null;
    try{
        // Verify if it is a castling move
        if (bestmove == 'e1g1' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O');
        }else if (bestmove == 'e1c1' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O-O');
        }else if (bestmove == 'e8g8' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O');
        }else if (bestmove == 'e8c8' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O-O');
        }else if(current_game.board.get(from).type == 'p'){
            // Pawn moves
            // Verify if it is a en passant capture
            var fen = current_game.board.fen();
            var enpas = fen.split(" ")[3];
            if(current_game.board.get(to) == null && to != enpas){
                ret = current_game.board.move(to + promo);
            }else{
                ret = current_game.board.move(bestmove.slice(0,1) + 'x' + to + promo);
            }
        }else {
            // Other pieces
            if (current_game.board.get(to) == null) {
                // Non-capture moves
                ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + to);
                if (ret == null) {
                    ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + bestmove.slice(0, 1) + to);
                }
            } else {
                // Capture moves
                ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + 'x' + to);
                if (ret == null) {
                    ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + bestmove.slice(0, 1) + 'x' + to );
                }
            }
        }
        // Error handling
        if (ret == null) {
            throw move_error;;
        }
    }catch(err){
        console.log("Error: " + err);
    }
    // Next turn
    current_game.turn = current_game.turn + 1;
    console.log('Info: fen ' + current_game.board.fen());
    // Check if and how the game ended and add it to PGN header
    if(current_game.board.game_over() == true){
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
        }
        // Stop the game
        current_game.running = 0;
        // Save the PGN file
        if(config.options.save_pgn){
            var fname = current_game.gameName + '-' + date.format('DDMMYYYY') + '-' + current_game.current_round + '-' + current_game.id + '.pgn';
            fs.writeFile(fname, current_game.board.pgn(), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("Info: pgn saved "+fname);
                // To next game
                next(result);
            });
        }
    }else if(current_game.running == 1){
        // Callback to gameloop
        gameLoop();
    }
};

function play(round){
    // Create game object
    current_game = createGame(p1, p2, config);
    // Generate game ID
    current_game.id = random(1000,9999);
    // Create chess.js object
    current_game.board = chess();
    // Running flag
    current_game.running = 1;
    // Set Round
    current_game.current_round = round;
    // Set PGN headers
    current_game.board.header('White', p1.name, 'Black', p2.name, 'Date', today, 'Round', current_game.current_round.toString());
    // Start the game loop
    gameLoop();
}

// Requirements
var chess = require('chess.js').Chess;
var moment = require('moment');
var fs = require('fs');
// Date
var date = moment();
var today = date.format('DD-MM-YYYY');
// Load config JSON
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
// Init vars
var current_game;
var round;
// Create and init objects for players
var p1 = Object.create(ai);
var p2 = Object.create(ai);
p1.path = config.p1.path;
p2.path = config.p2.path;
p1.name = config.p1.name;
p2.name = config.p2.name;
// Start it up!
play(1);
