/**
 * Init Express for http framework
 * Init morgan for unit testing
 * Init socket.io for websocketing
 * Init body-parser for receive POST data
 * Init request for self-request to prevent server from sleep
 * Init mongoose for handle database transaction
 */
var express = require('express');
var logger = require('morgan');
var socketIO = require('socket.io');
var parser = require('body-parser');
var request = require('request');
var mongoose = require('mongoose');
var crypto = require('crypto');
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

/**
 * Connecting to database
 */
mongoose.connect(config.database, function (error) {
    if (error) {
        console.log(error);
    }else{
        console.log("Db url", config.database);
    }
});

app.set('port', (process.env.PORT || 46195));       // set port to run into
app.use(express.static(__dirname + '/public'));     // app root dir
app.use(logger('dev'));                             // unit testing
app.use(parser.json());                             // support json encoded body
app.use(parser.urlencoded({extended : true}));      // support encoded body

/**
 * Run server
 */
var io = socketIO.listen(app.listen(app.get('port'), function(){
    console.log('Node app is running on port', app.get('port'));
}));

/**
 * User do login request
 */
app.post("/api/login", function(req, res){
    var email = req.body.email;     // get email from form
    var pass = req.body.pass;       // get pass from form

    /**
     * Find 1 user depend on passed email and password
     * if couldn't find anything, return 401
     * if error, return 503
     */
    modelUser.findOne({email: email, password: pass}, function(err, user){
        if(err){
            res.status(503);
            res.json({message: "Service unavaliable"});
        }

        if(user){
            user.token = crypto.randomBytes(48).toString('hex');    // generate token

            /**
             * Save token into database
             */
            user.save(function(err){
                if(err) console.log(err);
            });

            res.status(200);
            res.json({token: user.token});
        }else{
            res.status(401);
            res.json({message: "Credential not valid"});
        }
    });
});

/**
 * User do register request
 */
app.post("/api/register", function(req, res){

    /**
     * Find if email has been registered
     * If email already registered, return 400
     */
    modelUser.findOne(
        {email: req.body.email, password: req.body.pass},
        function(err, user){
            if(!user){
                modelUser.create({
                        email: req.body.email,
                        password: req.body.pass,
                        name: req.body.name,
                        ektp_data: req.body.ektp_data,
                        join_date: new Date()
                    }, function(err, user){
                        if(err){
                            res.status(503);
                            res.json({message: "Service unavaliable"});
                        }else{
                            res.status(200);
                            res.json({message: "Congratulation! Your account registered successfully."});
                        }
                    }
                );
            }else{
                res.status(400);
                res.json({message: "Account with email " +req.body.email+ " already registered."});
            }
        }
    );
});

/**
 * User do check is email available request
 */
app.post("/api/checkEmail", function(req, res){
    modelUser.findOne({email: req.body.email}, function(err, user){
        res.status(200);
        res.json({available: (!user)});
    });
});

/**
 * Get all users
 */
app.get("/api/users", function(req, res){
    modelUser.find({}, function(err, users){
        if(err) throw err;

        res.json(users);
    });
});

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
 * Handle all transaction in socket
 */
function handleSocket(socket){

    socket.on('register_gateway', function(id, fn){
        socketGw = socket;
        console.log('New gateway registered', socket.id);
        fn('Gateway registered');
    });

    socket.on('register_client', function(id, fn){
        socketClient = socket;
        console.log('New client registered', socket.id);
        fn('Client registered');
    });

    socket.on('sensor_value', function(data){
        console.log(data);
        if(socketClient != null){
            socketClient.emit('sensor_value', data);
        }
    });

    socket.on('disconnect', function(){

        if(socket == socketClient){
            console.log("Client disconnected");
            socketClient = null;
        }else if(socket == socketGw){
            console.log("Gateway disconnected");
            socketGw = null;
        }

        /**
         * Broadcast to everyone
         */
        // io.emit('logout', {message : "Someone disconnected"});
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

/**
 * Timer for request itself to prevent server from sleep
 */
setInterval(function(){
    request(url);
    console.log("Requesting self again in 20 minutes");
}, 1200000);