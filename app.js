/*
 app.js
 TODO: timing and clock implementation
 TODO: Game result handling
 TODO: Extract further information from console output
 TODO: Implementation of tournaments and more players
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
            child.on('exit', function (exitCode){
                console.log("Child exited with code: " + exitCode);
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
            var child = require('child_process').spawn(this.path);
            var response = "";
            child.stdin.write("position fen " + current_game.board.fen() + "\n");

            if(mode.toString().indexOf("depth") > -1){
                child.stdin.write("go depth " + current_game.depth + "\n");
            }else if(mode.toString().indexOf("movetime") > -1){
                child.stdin.write("go movetime " + current_game.movetime + "\n");
            }else if(mode.toString().indexOf("time") > -1){
                child.stdin.write("go btime " + current_game.btime + " wtime " + current_game.wtime + "\n");
            }

            child.stdout.on('data', function(data) {
                response = data.toString();
                if(response.indexOf("bestmove") > -1){
                    var arr_response = response.split("\n");
                    var response_part;
                    for(response_part in arr_response){
                        var arr_response_parts = arr_response[response_part].split(" ");
                        if(arr_response_parts[0].indexOf("bestmove") > -1){
                            try{
                                child.stdin.write("quit\n");
                            }catch(err){}
                            callback(arr_response_parts[1]);
                            return 1;
                        }
                    }
                }
            });
            child.stderr.on('data', function(data) {
                console.log("Error:" + data);
            });
            child.on('exit', function (exitCode){
                console.log("Child exited with code" + exitCode);
            });
        }catch(err){
            console.log("Error:" + err);
        }
    }

};

function createGame(p1, p2, config){
    var game = {
        gameName : "",
        current_round : 1,
        total_rounds: 1,
        mode: "movetime",
        depth: 6,
        wtime : 0,
        btime : 0,
        inc : 0,
        p1_name : "Player 1",
        p2_name : "Player 2",
        fen : "rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1",
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

var move_callback = function(bestmove){
    var from  = bestmove.slice(0,2);
    var to = bestmove.slice(2,bestmove.length);
    var move_error = new Error('MoveFailed');
    var ret = null;
    try{
        if (bestmove == 'e1g1' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O');
        }else if (bestmove == 'e1c1' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O-O');
        }else if (bestmove == 'e8g8' && current_game.board.get(from).type == 'k'){
            ret = current_game.board.move('O-O');
        }else if (bestmove == 'e8c8' && current_game.board.get(from).type == 'k'){
            ret = urrent_game.board.move('O-O-O');
        }else if(current_game.board.get(from).type == 'p'){
            if(current_game.board.get(to) == null){
                ret = current_game.board.move(to);
            }else{
                ret = current_game.board.move(bestmove.slice(0,1) + 'x' + to);
            }
        }else {
            if (current_game.board.get(to) == null) {
                ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + to);
                if (ret == null) {
                    ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + bestmove.slice(0, 1) + to);
                }
            } else {
                console.log("Move " + current_game.board.get(from).type + 'x' + to);
                ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + 'x' + to);
                if (ret == null) {
                    ret = current_game.board.move(current_game.board.get(from).type.toUpperCase() + bestmove.slice(0, 1) + 'x' + to);
                }
            }
        }
        if (ret == null) {
            throw move_error;;
        }
    }catch(err){
        console.log("Error: " + err);
    }
    current_game.turn = current_game.turn + 1;
    console.log(current_game.board.ascii());
    console.log(current_game.board.fen());
    if(current_game.board.in_checkmate() == true || current_game.board.in_draw() == true || current_game.board.in_stalemate() == true || current_game.board.in_threefold_repetition() == true){
        console.log("Game Ended!");
        if(current_game.board.in_checkmate() == true){
            console.log("Checkmate!");
        }
        current_game.running = 0;
    }
    if(current_game.running == 1){
        gameLoop();
    }
};

var Chess = require('chess.js').Chess;
var fs = require('fs');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var p1 = Object.create(ai);
var p2 = Object.create(ai);
p1.path = config.p1.path;
p2.path = config.p2.path;
var current_game = createGame(p1, p2, config);
current_game.board = Chess();
current_game.running = 1;
gameLoop();

function gameLoop(){
    if(current_game.turn % 2 == 1){
        p1.go(current_game, move_callback);
    }else{
        p2.go(current_game, move_callback);
    }
}

