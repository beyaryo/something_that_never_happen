var express = require('express');
var socketIO = require('socket.io');
var app = express();

app.set('port', (process.env.PORT || 41275));
app.use(express.static(__dirname + '/public'));

/**
 * Run socket
 */
var io = socketIO.listen(app.listen(app.get('port'), function(){
    console.log('Node app is running on port', app.get('port'));
}));

/**
 * User connect
 */
io.on('connection', function (socket) {
    console.log('New user connected');
    socket.emit('login', 'Welcome to chat room');
    socket.broadcast.emit('login', 'Someone connected');
    handleSocket(socket);
});

function handleSocket(socket){
    socket.on('disconnect', function(){
        console.log("User disconnected");
        io.emit('logout', "Someone disconnected");
    });

    socket.on('message', function(msg){
        io.emit('message', msg);
    });
}