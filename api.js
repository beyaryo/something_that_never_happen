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
var mongoose = require('mongoose');
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
 * Import model user, gateway
 */
var modelUser = require('./models/user');
var modelGateway = require('./models/gateway');

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
    var email = req.body.email;                 // get email from form
    var pass = req.body.pass;                   // get pass from form
    var tokenFirebase = req.body.token_firebase // get firebase token from form
    console.log(tokenFirebase);

    /**
     * Find 1 user depend on passed email and password
     * if couldn't find anything, return 401
     * if error, return 503
     */
    modelUser.findOne({email: email, password: pass}, function(err, user){
        if(err){
            res.status(503);
            res.json({message: "Service unavaliable"});
            return;
        }

        if(user){
            user.token = crypto.randomBytes(48).toString('hex');    // generate token
            user.token_firebase = tokenFirebase;

            /**
             * Save token into database
             */
            user.save(function(err){
                if(err) console.log(err);
            });

            modelGateway.find({owner: email}, 
                {_id:0}, 
                function(err, gw){
                    if(err){
                        res.status(503);
                        res.json({message: "Service unavaliable"});
                        return;
                    }

                    console.log("id : " +user._id);
                    console.log(gw);
                    res.status(200);
                    res.json({name: user.name, token: user.token, gateway: gw});
                }
            );
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
                        phone : req.body.phone,
                        ektp_data: req.body.ektp_data,
                        join_date: new Date()
                    }, function(err, user){
                        if(err){
                            res.status(503);
                            res.json({message: "Service unavaliable"});
                            return;
                        }else{
                            res.status(200);
                            res.json({message: "Congratulation! Your account registered successfully"});
                        }
                    }
                );
            }else{
                res.status(400);
                res.json({message: "Account with email ".concat(req.body.email, " already registered")});
            }
        }
    );
});

/**
 * User do check is email available request
 */
app.post("/api/checkEmail", function(req, res){
    modelUser.findOne({email: req.body.email}, function(err, user){
        if(err) throw err;

        res.status(200);
        res.json({available: (!user)});
    });
});

/**
 * User do check is phone number available request
 */
app.post("/api/checkPhone", function(req, res){
    modelUser.findOne({phone: req.body.phone, function(err, user){
        if(err) throw err;

        res.status(200);
        res.json({available : (!user)});
    }});
});

/**
 * User do register gateway request
 */
app.post("/api/registerGateway", function(req, res){

    /**
     * Find if gateway has been registered
     * If gateway already registered or gateway_id wrong, return 400
     */
    modelGateway.findOneAndUpdate({gateway_id: req.body.gateway_id, registered: false},
        {$set: {
            gateway_id: req.body.gateway_id,
            name: req.body.name,
            lat: req.body.lat,
            lng: req.body.lng,
            address: req.body.address,
            owner: [req.body.owner],
            registered: true
        }}, function(err, gw){
            if(err){
                res.status(503);
                res.json({message: "Service unavaliable"});
                return; 
            }

            if(!gw){
                res.status(400);
                res.json({message: "Gateway serial number unidentified or it has been registered"});
                return;
            }

            res.status(200);
            res.json({message: "Your gateway registered successfully"});
        }
    );
})

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
    handleSocket(socket);
});

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
        modelUser.findOne({email: 'b@g'}, {token_firebase:1, _id:0}, function(err, user){
            if(err) throw err;

            if(!user){
                console.log("Token not registered");
            }else{
                sendNotification(data, user.token_firebase);
            }
        });
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

/**
 * Timer for request itself to prevent server from sleep
 */
setInterval(function(){
    request(url);
    console.log("Requesting self again in 20 minutes");
}, 1200000);