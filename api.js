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
var modelSensor = require('./models/sensor');
var modelDoor = require('./models/door');

/**
 * Init global variable
 */
var url = config.hostedServerUrl;

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
 * User login
 * Require : email, pass, token_firebase
 * Return : token, gateways
 */
app.post("/api/login", function(req, res){
    var email = req.body.email;                 // get email from form
    var pass = req.body.pass;                   // get pass from form
    var tokenFirebase = req.body.token_firebase // get firebase token from form

    /**
     * Find 1 user depend on passed email and password
     * if couldn't find anything, return 401
     * if error, return 503
     */
    modelUser.findOne({email: email, password: pass}, function(err, user){
        if(err){
            res = errorServer(res);
            return;
        }

        if(user){
            user.token = crypto.randomBytes(48).toString('hex');    // generate token
            user.token_firebase = tokenFirebase;

            /**
             * Save token into database
             */
            user.save(function(err){
                if(err){
                    res = errorServer(res);
                    return;
                }


                modelGateway.find({owner: email}, 
                    {_id:0}, 
                    function(err, gws){
                        if(err){
                            res = errorServer(res);
                            return;
                        }

                        res.status(200);
                        res.json({name: user.name, token: user.token, gateway: gws});
                    }
                );
            });
        }else{
            res = errorCredential(res);
        }
    });
});

/**
 * Register new user
 * Require : email, pass, name, phone
 * Return : <status>
 */
app.post("/api/register", function(req, res){

    /**
     * Find if email has been registered
     * If email already registered, return 400
     */
    modelUser.findOne(
        {email: req.body.email},
        function(err, user){
            if(!user){
                modelUser.create({
                        email: req.body.email,
                        password: req.body.pass,
                        name: req.body.name,
                        phone : req.body.phone,
                        join_date: (new Date()).getTime()
                    }, function(err, user){
                        if(err){
                            res = errorServer(res);
                            return;
                        }else{
                            res.status(200);
                            res.json({
                                message: "Congratulation! Your account registered successfully",
                                registered: true
                            });
                        }
                    }
                );
            }else{
                res.status(200);
                res.json({
                    message: "Account with email ".concat(req.body.email, " already registered"),
                    registered: false
                });
            }
        }
    );
});

/**
 * Check if email isn't registered yet
 * Require : email
 * Return : <status>
 */
app.post("/api/checkEmail", function(req, res){
    modelUser.findOne({email: req.body.email}, function(err, user){
        if(err) throw err;

        res.status(200);
        res.json({available: (!user)});
    });
});

/**
 * Check if phone number isn't registered yet
 * Require : phone
 * Return : <status>
 */
app.post("/api/checkPhone", function(req, res){
    modelUser.findOne({phone: req.body.phone, function(err, user){
        if(err) throw err;

        res.status(200);
        res.json({available : (!user)});
    }});
});

/**
 * Add gateway
 * Require : token, gateway_id, name, lat, lng, address, email
 * Return : <status>
 */
app.post("/api/registerGateway", function(req, res){

    /**
     * Credential validation
     */
    modelUser.findOne({token: req.body.token}, function(err, user){
        if(err){
            res = errorServer(res);
            return;
        }

        if(!user){
            res = errorCredential(res);
            return;
        }

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
                owner: [req.body.email],
                registered: true
            }}, function(err, gw){
                if(err){
                    res.status(503);
                    res.json({message: "Service unavaliable"});
                    return; 
                }
                res.status(200);

                if(!gw){
                    res.json({
                        message: "Gateway serial number unidentified or it has been registered",
                        registered : false
                    });
                    return;
                }

                res.json({
                    message: "Your gateway registered successfully",
                    registered: true
                });
            }
        );
    });
});

/**
 * Add user to monitor spesific gateway
 * Require : token, email, gateway_id
 * Return : <status>
 */
app.post("/api/allowUser", function(req, res){

    /**
     * Credential validation
     */
    modelUser.findOne({token: req.body.token}, function(err, user){
        if(err){
            res = errorServer(res);
            return;
        }

        if(!user){
            res = errorCredential(res);
            return;
        }

        /**
         * Check if email is registered
         * if not, return message not registered
         */
        modelUser.findOne({email: req.body.email}, function(err, user){
            if(err){
                res = errorServer(res);
                return;
            }

            if(!user){
            res.json({
                    message: "Email isn\'t registered",
                    allowed: false
                });
                return; 
            }

            /**
             * Find gateway with spesific id and already registered
             * w/o pushed email in owner array
             */
            modelGateway.findOneAndUpdate({
                    gateway_id: req.body.gateway_id, 
                    registered: true, 
                    owner: {$ne: req.body.email}
                }, 
                {$push: {owner: req.body.email}},
                function(err, gw){
                    if(err){
                        res.status(503);
                        res.json({message: "Service unavaliable"});
                        return; 
                    }
                
                    res.status(200);

                    if(!gw){
                        res.json({
                            message: "User already allowed to access this gateway",
                            allowed: false
                        });
                        return;
                    }

                    res.json({
                        message: req.body.email.concat(" gain access to gateway"),
                        allowed: true
                    });
                }
            );
        }); 
    });
});

/**
 * Request user profile
 * Require : token
 * Return : user
 */
app.post("/api/me", function(req, res){
    modelUser.find({token: req.body.token}, {_id: 0, __v: 0, token: 0, token_firebase: 0}, function(err, user){
        if(err){
            res = errorServer(res);
            return;
        }

        if(user){
            res.status(200);
            res.json(user);
        }
    });
});

/**
 * Get all users
 * Return : users
 */
app.get("/api/users", function(req, res){
    modelUser.find({}, function(err, users){
        if(err) throw err;

        res.json(users);
    });
});

/**
 * Get sensor values
 * Return : <count>
 */
app.get("/api/sensors", function(req, res){
    modelSensor.count({}, function(err, values){
        if(err) throw err;

        res.json(values);
    });
});

/**
 * Admin add gateway
 * Require : gateway_id
 * Return : <status>
 */
app.post("/admin/addGateway", function(req, res){
    modelGateway.create({
            gateway_id: req.body.gateway_id,
            registered: false
        }, function(err){
            if(err){
                res = errorServer(res);
                return;
            }

            res.status(200);
            res.json({
                message: "Congratulation, gateway ".concat(req.body.gateway_id, " added!")
            });
        }
    )
})

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

    socket.on('client_join', function(room, callback){
        if(socket.room){
            socket.leave(socket.room);
        }

        socket.join(room);
        socket.room = room;
        console.log("Client join room ".concat(room));

        modelGateway.findOne({
                gateway_id: room
            }, function(err, gw){
                if(err){
                    callback("503", "", "");
                    return;
                }

                callback("200", gw.ip, gw.bssid);
            }
        )
    });

    socket.on('gateway_join', function(room, ip, bssid){
        if(socket.room){
            socket.leave(socket.room);
        }

        socket.join(room);
        socket.room = room;
        console.log("Gateway join room ".concat(room));

        var val = {ip: ip, bssid: bssid};

        modelGateway.findOneAndUpdate({gateway_id: room},
            {$set: {
                ip: ip,
                bssid: bssid
            }}, function(err, gw){
                if(err){
                    console.log(err);
                }else{
                    gw.owner.forEach(function(own){
                        modelUser.findOne({email: own}, function(err, user){
                            if(err) return;
                            
                            if(user.token_firebase)
                                sendNotification(JSON.stringify(val), "BSSID_GW", room, user.token_firebase);
                        })
                    });
                }
            }
        );
    });

    socket.on('gateway_data', function(data){
        var now = (new Date()).getTime();
        console.log(data);

        modelSensor.create({
                gateway_id : socket.room,
                temp : data.temp,
                hum : data.hum,
                co : data.co,
                smoke : data.smoke,
                fuzzy : data.fuzzy,
                _ts : now
            }, function(err, res){
                if(err){
                    // console.log(err);
                }else{
                    // console.log(res._ts);
                }
            }
        );
       
        io.sockets.in(socket.room).emit('sensor_value', data);
    });

    socket.on('open_door', function(gwId, doorId, token){
        io.sockets.in(socket.room).emit("open_door", doorId);
    });

    socket.on('ring_bell', function(){
        io.sockets.in(socket.room).emit("ring_bell"); 
    })

    socket.on('disconnect', function(){
        if(socket.room){
            console.log("A device leave room ".concat(socket.room));
            socket.leave(socket.room);
        }
    });

    socket.on('test_firebase', function(data){
        modelUser.findOne({email: 'b@g'}, {token_firebase:1, _id:0}, function(err, user){
            if(err) throw err;

            if(!user){
                console.log("Token not registered");
            }else{
                sendNotification(data, "test", user.token_firebase);
            }
        });
    })
}

/**
 * Handle notification
 */
function sendNotification(data, flag, token){

    /**
     * Initialize data 
     */
    var payload = {
        data : {
            data : data,
            flag : flag
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
            console.log("Error sending message to ", err);
        }
    );
}

/**
 * Handle notification with gateway_id attribute
 */
function sendNotification(data, flag, gateway_id, token){

    /**
     * Initialize data 
     */
    var payload = {
        data : {
            data : data,
            flag : flag,
            gateway_id : gateway_id
        }
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
            console.log("Error sending message to ", err);
        }
    );
}

/**
 * Error accessing database handler
 */
function errorServer(res){
    res.status(503);
    res.json({message: "Service unavaliable"});
    return res;
}

/**
 * Token / email not valid handler
 */
function errorCredential(res){
    res.status(401);
    res.json({message: "Credential not valid"});
    return res;
}

/**
 * Timer for request itself to prevent server from sleep
 */
setInterval(function(){
    // request(url);
    // console.log("Requesting self again in 20 minutes");
}, 1200000);

/**
 * Timer for send scheduled push notif to client 
 * with data of all sensor average value in an hour
 */
setInterval(function(){
    var date = new Date();
    var now = date.getTime();
    console.log(date);
    console.log(now);

    /**
     * Query for get average sensor value
     */
    var pipelineSensor = [
        {
            $group : {
                _id : "$gateway_id",
                temp : {$avg : "$temp"},
                hum : {$avg : "$hum"},
                co : {$avg : "$co"},
                smoke : {$avg : "$smoke"}
            }
        }
    ];
    
    modelSensor.aggregate(pipelineSensor, function(err, vals){
        if(err) throw err;

        /**
         * Delete all sensor value in sensor collection
         * for saving database space
         */
        modelSensor.remove({_ts : {$lt : now}}, function(err, sens){});

        vals.forEach(function(val){
            
            /**
             * Get gateway data depend on sensor.gateway_id
             */
            modelGateway.findOne({gateway_id : val._id}, function(err, gw){
                if(!gw) return;
              
                gw.owner.forEach(function(email){

                    /**
                     * Get user firebase token for every gateway's owner
                     */
                    modelUser.findOne({email : email}, {_id : 0, token_firebase : 1}, function(err, user){

                        if(user.token_firebase){
                            var gateway_id = val._id;
                            val.timestamp = now;
                            delete val._id;

                            sendNotification(JSON.stringify(val), "AVG_DATA", gateway_id, user.token_firebase);
                        }
                    });
                });
            })
        });
    });
}, 3600000);
//3600000