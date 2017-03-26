/**
 * Init Express for http framework
 * Init body-parser for receive POST data
 * Init morgan for unit testing
 * Init request for self-request to prevent server from sleep
 */
var express = require('express');
var logger = require('morgan');
var socketIO = require('socket.io');
var request = require('request');
var app = express();
var url = "https://myfis.herokuapp.com/";

var socketGw = null;
var socketClient = null;

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

    /**
     * Broadcast to self
     */
    // socket.emit('device_connected', {message : 'Device connected'});

    /**
     * Broadcast to everyone but self
     */
    // socket.broadcast.emit('device_connected', {message : 'Someone connected'});

    handleSocket(socket);
});

/**
 * Timer for request itself to prevent server from sleep
 */
setInterval(function(){
    request(url);
    console.log("Requesting self again in 20 minutes");
}, 1200000);

/**
 * Handle all transaction in socket
 */
function handleSocket(socket){

    socket.on('register_gateway', function(id, fn){
        socketGw = socket;
        socket.broadcast.emit('device_connected', {message : "Gateway status from down to up"});
        fn('Gateway registered');
    });

    socket.on('register_client', function(id, fn){
        socketClient = socket;
        fn('Client registered')
    });

    socket.on('home_monitor', function(temp, hum, co, smoke){
        // if(socketClient != null){
        //     socketClient.emit('home', {
        //         'temp' : temp,
        //         'hum' : hum,
        //         'co' : co,
        //         'smoke' : smoke
        //     });
        // }
    });

    socket.on('disconnect', function(){
        console.log("User disconnected");

        if(socket == socketClient){
            socketClient = null;
        }else if(socket == socketGw){
            socketGw = null;
        }

        /**
         * Broadcast to everyone
         */
        io.emit('logout', {message : "Someone disconnected"});
    });

    /**
     * Handle transaction when user login
     */
    socket.on('login', function(id, pass, fn){
        if(id != null && pass != null){
            if(id == 'b@g' && pass == 'tesuto'){
                fn({code : 200, message : "Welcome bey!"});
            }else{
                fn({code : 401, message : "Credential isn't valid"});
            }
        }else{
            fn({code : 400, message : "Credential can't be empty"});
        }
    });
}