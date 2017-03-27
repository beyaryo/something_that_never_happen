/**
 * Init Express for http framework
 * Init morgan for unit testing
 * Init socket.io for websocketing
 * Init request for self-request to prevent server from sleep
 * Init mongoose for handle database transaction
 */
var express = require('express');
var logger = require('morgan');
var socketIO = require('socket.io');
var request = require('request');
var app = express();

/**
 * Import config file
 */
var config = require('./config');

/**
 * Import model user
 */
var modelUser = require('./models/user');

/**
 * Init global variable
 */
var url = config.hostedServerUrl;
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

    socket.on('join_room', function(room){
        if(socket.room != room){
            socket.leave(socket.room);
        }

        socket.join(room);
        socket.room = room;
        console.log('Device ' +socket.id+ " join room '" +room+ "'");
    });

    socket.on('gateway_data', function(data){
        io.sockets.in(socket.room).emit('sensor_value', data);
    });

    socket.on('disconnect', function(){
        if(socket.room){
            console.log('Device ' +socket.id+ " leave room '" +socket.room+ "'");
            socket.leave(socket.room);
        }
    });
}