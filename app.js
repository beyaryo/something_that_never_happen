/**
 * Init Express for http framework
 * Init morgan for unit testing
 * Init socket.io for websocketing
 * Init body-parser for receive POST data
 * Init request for self-request to prevent server from sleep
 * Init mongoose for handle database transaction
 * Init crypto to generate token
 * Init firebase-admin to enable firebase
 */
var express = require('express');
var logger = require('morgan');
var socketIO = require('socket.io');
var parser = require('body-parser');
var request = require('request');
// var mongoose = require('mongoose');
var crypto = require('crypto');
var firebaseAdmin = require('firebase-admin');
var app = express();

/**
 * Import config file
 */
var config = require('./config/config');

/**
 * Open json file from config for firebase
 */
var serviceAccount = __dirname.concat(config.firebaseService);

/**
 * Initialize firebase
 */
firebaseAdmin.initializeApp({
    credential: firebaseAdmin.credential.cert(serviceAccount),
    databaseURL: config.firebaseDatabaseUrl
});

/**
 * Import model user
 */
var modelUser = require('./models/user');
var modelGateway = require('./models/gateway');

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
        if(socket.room){
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

    socket.on('test_firebase', function(data){
        sendNotification(data, "deNebfiSMYU:APA91bH04GnyRPZl5P2BgCp7oPI6spTIV3t8Ju1Jehj04Z7swPJJJmVcgNF395Qabr8O3o0nc0Zr19pm7OTse8ipO8gOw2n7cpRcK3zXPBvSu7fMnowpc0XfG_QsrfeDZ3OMuPIyYrdG");
        // modelUser.findOne({email: 'b@g'}, {token_firebase:1, _id:0}, function(err, user){
        //     if(err) throw err;

        //     if(!user){
        //         console.log("Token not registered");
        //     }else{
        //         sendNotification(data, user.token_firebase);
        //     }
        // });
    })
}

/**
 * Handle notification
 */
function sendNotification(data, token){

    /**
     * Initialize data 
     */
    var payload = {
        data : {
            data : data
        }
        // , notification : {
        //     title : "This is title!",
        //     body : "This is body"
        // }
    };

    /**
     * Initialize option
     */
    var options = {
        priority : "high"
    };

    /**
     * Send message to passed token
     */
    firebaseAdmin.messaging().sendToDevice(token, payload, options)
        .then(function(res){
            console.log("Success sent message to ", token);
        })
        .catch(function(err){
            console.log("Error sending message to ", token);
        }
    );
}