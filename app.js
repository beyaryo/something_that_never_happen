/**
 * Init Express for http framework
 * Init body-parser for receive POST data
 * Init morgan for unit testing
 * Init request for self-request to prevent server from sleep
 */
var express = require('express');
var logger = require('morgan');
var request = require('request');
var app = express();
var url = "https://myfis.herokuapp.com/";

app.set('port', (process.env.PORT || 46195));       // set port to run into
app.use(express.static(__dirname + '/public'));     // app root dir
app.use(logger('dev'));                             // unit testing

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

    /**
     * Broadcast to self
     */
    socket.emit('login', 'Welcome to chat room');

    /**
     * Broadcast to everyone but self
     */
    socket.broadcast.emit('login', 'Someone connected');

    handleSocket(socket);
});

/**
 * Timer for request itself to prevent server from sleep
 */
setInterval(function(){
    request(url);
    console.log("Requesting self again in 20 minutes");
},10000);
// 1200000
/**
 * Handle all transaction in socket
 */
function handleSocket(socket){
    socket.on('disconnect', function(){
        console.log("User disconnected");

        /**
         * Broadcast to everyone
         */
        io.emit('logout', "Someone disconnected");
    });

    socket.on('message', function(msg){
        
        /**
         * Broadcast to everyone
         */
        io.emit('message', msg);
    });
}