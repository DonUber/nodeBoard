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
            var start = new Date();
            var end;
            if(current_game.mode.toString().indexOf("depth") > -1){
                child.stdin.write("go depth " + current_game.depth + "\n");
            }else if(current_game.mode.toString().indexOf("movetime") > -1){
                child.stdin.write("go movetime " + current_game.movetime + "\n");
            }else if(current_game.mode.toString().indexOf("time") > -1){
                child.stdin.write("go btime " + current_game.btime + " wtime " + current_game.wtime + "\n");
            }

            child.stdout.on('data', function(data) {
                response = data.toString();
                if(response.indexOf("bestmove") > -1){
                    end = new Date() - start;
                    console.log('Info: turn ' + current_game.board.turn());
                    if(current_game.board.turn() == 'w' && current_game.mode.toString().indexOf("time") > -1){
                        current_game.wtime = current_game.wtime - end;
                        console.log('Info: wtime ' + current_game.wtime);
                    }else if(current_game.board.turn() == 'b' && current_game.mode.toString().indexOf("time") > -1){
                        current_game.btime = current_game.btime - end;
                        console.log('Info: btime ' + current_game.btime);
                    }
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
                console.log("Error: " + data);
            });
        }catch(err){
            console.log("Error: " + err);
        }
    }

};

function createGame(p1, p2, config){
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

}

var move_callback = function(bestmove){
    console.log('Info: move ' + bestmove);
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
            ret = current_game.board.move('O-O-O');
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
    //console.log(current_game.board.ascii());
    console.log('Info: fen ' + current_game.board.fen());
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
        current_game.running = 0;
        if(config.options.save_pgn){
            var fname = date.format('DDMMYYYY') + '-' + current_game.current_round + '-' + current_game.id + '.pgn';
            fs.writeFile(fname, current_game.board.pgn(), function(err) {
                if(err) {
                    return console.log(err);
                }
                console.log("Info: pgn saved "+fname);
            });
        }
        next(result);
    }
    if(current_game.running == 1){
        gameLoop();
    }
};

var chess = require('chess.js').Chess;
var moment = require('moment');
var fs = require('fs');
var date = moment();
var today = date.format('DD-MM-YYYY');
var config = JSON.parse(fs.readFileSync('config.json', 'utf8'));
var p1 = Object.create(ai);
var p2 = Object.create(ai);
p1.path = config.p1.path;
p2.path = config.p2.path;
p1.name = config.p1.name;
p2.name = config.p2.name;
var current_game = createGame(p1, p2, config);
current_game.id = random(1000,9999);
current_game.board = chess();
current_game.running = 1;
current_game.board.header('White', p1.name, 'Black', p2.name, 'Date', today, 'Round', current_game.current_round.toString());
gameLoop();

