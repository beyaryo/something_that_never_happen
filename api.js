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
var modelAlert = require('./models/alert');
// var modelDoor = require('./models/door');

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

    // Find 1 user depend on passed email and password
    // if couldn't find anything, return 401
    // if error, return 503
    modelUser.findOne({email: email, password: pass}, function(err, user){
        if(err){
            console.log(err);
            res = errorServer(res);
            return;
        }

        if(user){
            user.token = crypto.randomBytes(48).toString('hex');    // generate token
            user.token_firebase = tokenFirebase;

            // Save token into database
            user.save(function(err){
                if(err){
                    console.log(err);
                    res = errorServer(res);
                    return;
                }

                // Get all gateway which user have access into it
                modelGateway.find({owner: {$elemMatch: {email: req.body.email}}}, 
                    {_id:0}, 
                    function(err, gws){
                        if(err){
                            console.log(err);
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
 * User logout
 * Require : token
 */
app.post("/api/logout", function(req, res){
    
    // Credential validation
    modelUser.findOneAndUpdate({token: req.body.token},
        {
            $unset :{
                token : 1,
                token_firebase : 1
            }
        },
        function(err, user){
            if(err) return;

            if(user) console.log("User ".concat(user.name, " logging out"));
        }
    )
})

/**
 * Register new user
 * Require : email, pass, name, phone
 * Return : <status>
 */
app.post("/api/register", function(req, res){

    // Find if email is available
    // If email already registered, return false
    modelUser.findOne(
        {email: req.body.email},
        function(err, user){

            if(!user){

                // Find if phone number is available
                // If phone number already registered, return false
                modelUser.findOne({phone: req.body.phone},
                    function(err,user){

                        if(!user){

                            // Save new document into user collection
                            modelUser.create({
                                email: req.body.email,
                                password: req.body.pass,
                                name: req.body.name,
                                phone : req.body.phone,
                                join_date: (new Date()).getTime()},
                                function(err, user){
                                    if(err){
                                        console.log(err);
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
                                message: "Account with phone ".concat(req.body.phone, " already registered"),
                                registered: false
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
 * Require : token, gateway_id, name, lat, lng, address
 * Return : <status>
 */
app.post("/api/registerGateway", function(req, res){

    // Credential validation
    modelUser.findOne({token: req.body.token}, function(err, user){
        if(err){
            res = errorServer(res);
            return;
        }

        if(!user){
            res = errorCredential(res);
            return;
        }

        // Find if gateway isn't registered yet
        // If gateway already registered or gateway_id wrong, return false
        modelGateway.findOneAndUpdate({gateway_id: req.body.gateway_id, registered: false},
            {$set: {
                gateway_id: req.body.gateway_id,
                name: req.body.name,
                lat: req.body.lat,
                lng: req.body.lng,
                address: req.body.address,
                registered: true}, 
            $push: {
                owner: {
                    email: user.email,
                    name: user.name
                }}
            }, function(err, gw){
                if(err){
                    res = errorServer(res);
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
 * Get gateway info
 * Accessed after register new gateway
 * Require : token, gateway_id
 * Return : gateway
 */
app.post("/api/gatewayInfo", function(req, res){

    // Credential validation
    modelUser.findOne({token : req.body.token}, function(err, user){
        if(err){
            res = errorServer(res);
            return;
        }

        if(!user){
            res = errorCredential(res);
            return;
        }

        // Find gateway with spesific id
        // and user who request it has access to monitor the gateway
        modelGateway.findOne({
                gateway_id : req.body.gateway_id,
                owner: {$elemMatch: {email: user.email}}
            }, {_id:0}, 
            function(err, gw){
                if(err){
                    res = errorServer(res);
                    return;
                }

                if(gw){
                    res.status(200);
                    res.json({
                        allowed: true,
                        gateway: gw
                    });
                }else{
                    res.status(200);
                    res.json({allowed: false});
                }
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

    // Credential validation
    modelUser.findOne({token: req.body.token}, function(err, user){
        if(err){
            res = errorServer(res);
            return;
        }

        if(!user){
            res = errorCredential(res);
            return;
        }

        // Check if email is registered
        // if not, return message not registered
        modelUser.findOne({email: req.body.email}, function(err, newOwner){
            if(err){
                res = errorServer(res);
                return;
            }

            if(!newOwner){
                res.status(200);
                res.json({
                    message: "Email isn\'t registered",
                    allowed: false
                });
                return; 
            }

            // Find gateway with spesific id and already registered
            // w/o pushed email in owner array
            modelGateway.findOne({
                    gateway_id: req.body.gateway_id,
                    registered: true,
                    owner: {$elemMatch: {email: req.body.email}}
                },
                function(err, gw){
                    if(err){
                        console.log(err);
                        res = errorServer(res);
                        return;
                    }

                    if(!gw){
                        modelGateway.findOneAndUpdate({
                                gateway_id: req.body.gateway_id,
                                registered: true
                            },{
                                $push: {
                                    owner: {
                                        email: newOwner.email,
                                        name: newOwner.name
                                    }
                                }
                            },
                            function(err, done){
                                if(err){
                                    console.log(err);
                                    res = errorServer(res);
                                    return;
                                }

                                res.status(200);

                                if(done){
                                    res.json({
                                        message: user.email.concat(" gain access to gateway"),
                                        name: newOwner.name,
                                        allowed: true
                                    });

                                    if(user.token_firebase){
                                        sendNotifAllowUserToNewOwner(done.gateway_id, user.token_firebase);
                                    }

                                    sendNotifAllowUserToOldOwner(done, user.email, user.name);
                                }else{
                                    res.json({
                                        message: "Something went wrong, please try again later!",
                                        allowed: false
                                    });
                                }
                            }
                        )
                    }else{
                        res.status(200);
                        res.json({
                            message: "User already allowed to access this gateway",
                            allowed: false
                        })
                    }
                }
            )
        }); 
    });
});

/**
 * Add lock to spesific gateway
 * Require : token, gateway_id, id, name
 * Return : <status>
 */
app.post("/api/pairLock", function(req, res){

    // Credential validation
    modelUser.findOne({token: req.body.token},
        function(err, user){
            if(err){
                console.log(err);
                res = errorServer(res);
                return;
            }

            if(!user){
                res = errorCredential(res);
                return;
            }

            // Find from all gateway 
            // which contain lock with spesific lock id
            // If found, return false
            modelGateway.findOne({
                    // gateway_id: req.body.gateway_id,
                    // registered: true,
                    lock: {
                        $elemMatch: {id: req.body.id}
                    }
                }, function(err, gw){
                    if(err){
                        console.log(err);
                        res = errorServer(res);
                        return;
                    }

                    if(!gw){

                        // Push new lock into gateway
                        modelGateway.findOneAndUpdate({
                                gateway_id: req.body.gateway_id,
                                registered: true
                            }, 
                            {
                                $push: {
                                    lock: {
                                        id: req.body.id,
                                        name: req.body.name
                                    }
                                }
                            }, function(err, gw){
                                if(err){   
                                    console.log(err);
                                    res = errorServer(res);
                                    return;
                                }

                                if(gw){
                                    res.status(200);
                                    res.json({
                                        message: "Lock ".concat(req.body.name, " succesfully paired"),
                                        paired: true
                                    });
                                    sendNotifPairedLock(gw, req.body.id, req.body.name);
                                }else{
                                    res.status(200);
                                    res.json({
                                        message: "Gateway not found",
                                        paired: false
                                    });
                                }
                            }
                        );
                    }else{
                        res.status(200);
                        res.json({
                            message: "Lock has been paired, please unpair the lock from old gateway to continue !",
                            paired: false
                        });
                    }
                }
            )
        }
    )
})

/**
 * Delete one lock from spesific gateway
 * Require : token, gateway_id, id
 * Result : <status>
 */
app.post("/api/unpairLock", function(req, res){

    // Credential validation
    modelUser.findOne({token: req.body.token},
        function(err, user){
            if(err){
                console.log(err);
                res = errorServer(res);
                return;
            }

            if(!user){
                res = errorCredential(res);
                return;
            }

            // Find gateway with spesific id which contain determined lock
            // If not found, return false
            modelGateway.findOneAndUpdate({
                    gateway_id: req.body.gateway_id, 
                    registered: true,
                    owner: {
                        $elemMatch: {email: user.email}
                    },
                    lock: {
                        $elemMatch: {id: req.body.id}
                    }
                },{
                    $pull: {
                        lock: {id: req.body.id}
                    }
                }, function(err, gw){
                    if(err){
                        console.log(err);
                        res = errorServer(res);
                        return;
                    }

                    res.status(200);

                    if(gw){
                        res.json({
                            message: "Lock successfully unpaired !",
                            unpaired: true
                        });

                        sendNotifUnpairedLock(gw, req.body.id);
                    }else{
                        res.json({
                            message: "Lock isn\'t paired or lock serial isn\'t valid !",
                            unpaired: false
                        });
                    }
                }
            )
        }
    )
});

/**
 * Request user profile
 * Require : token
 * Return : user
 */
app.post("/api/me", function(req, res){
    modelUser.find({token: req.body.token}, {_id: 0, __v: 0, token: 0, token_firebase: 0}, function(err, user){
        if(err){
            console.log(err);
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

        res.status(200);
        res.json(users);
    });
    console.log("Test");
});

/**
 * Get sensor values
 * Return : <count>
 */
app.post("/api/sensors", function(req, res){
    modelSensor.find({}, function(err, datas){
        if(err){
            res = errorServer(res);
            return;
        };

        var array = new Array();
        var i = 0;
        var tsAwal;

        datas.forEach(function(data) {
            if(i == 0) tsAwal = data["_ts"];
            // var obj = {
            //     "index" : i,
            //     "date" : new Date((data["_ts"] + (7 * 3600 * 1000))),
            //     "bat" : data["bat"]
            // }
            // array.push(obj);

            if(
                data["_ts"] >= (tsAwal + req.body.awal * 3600 * 1000) && 
                data["_ts"] < (tsAwal + req.body.akhir * 3600 * 1000)) 
                array.push(data["bat"]);
            i++;
        });

        res.status(200);
        res.json(array);
    });
});

/**
 * Test Notif category
 * Require : gateway_id, category (in int), fuzzy_val 
 */
app.post("/api/testNotifCat", function(req, res){
    var time = (new Date()).getTime();
    checkAlertTime(req.body.gateway_id, req.body.category, time, req.body.fuzzy_val);
    
    res.status(200);
    res.json({
        message:"Done"
    })
})

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
                console.log(err);
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

    socket.on('client_join', function(token, room, callback){

        // Credential validation
        modelUser.findOne({token: token},
            function(err, user){
                if(err){
                    console.log(err);
                    callback(503);
                    return;
                }

                if(!user){
                    console.log(err);
                    callback(401);
                    return;
                }

                if(socket.room){
                    socket.leave(socket.room);
                }

                socket.join(room);
                socket.room = room;
                console.log("Client join room ".concat(room));

                // Find gateway which contain id same with room from user
                modelGateway.findOne({
                        gateway_id: room
                    }, function(err, gw){
                        if(err){
                            console.log(err);
                            callback(503);
                            return;
                        }

                        // Find the last record from sensor with spesific gateway id
                        // If nothing, return 0 as value
                        modelSensor.findOne({gateway_id:room}).sort({_ts:-1}).exec(function(err, sensor){
                            if(err){
                                console.log(err);
                                callback(503);
                                return;
                            }

                            if(!sensor){
                                callback(200, gw.ip, gw.bssid, 
                                    0, 0, 0, 0,
                                    0, 0);
                            }else{
                                callback(200, gw.ip, gw.bssid, 
                                    sensor.temp, sensor.hum, sensor.co, sensor.smoke,
                                    sensor.bat, sensor.fuzzy);
                            }
                        })
                    }
                )
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

        // Update bssid and ip of gateway with spesific id
        // every time gateway connected to server
        modelGateway.findOneAndUpdate({gateway_id: room},
            {$set: {
                ip: ip,
                bssid: bssid
            }}, function(err, gw){
                if(err){
                    console.log(err);
                }else{

                    // Push notif of new bssid and ip into the owners of gateway via fcm
                    gw.owner.forEach(function(own){
                        modelUser.findOne({email: own.email}, function(err, user){
                            if(err) {
                                console.log(err);
                                return;
                            }
                            
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
        // console.log(data);

        // Save sensor data from gateway into database
        modelSensor.create({
                gateway_id : socket.room,
                temp : data.temp,
                hum : data.hum,
                co : data.co,
                smoke : data.smoke,
                bat : data.bat,
                fuzzy : data.fuzzy,
                _ts : now
            }, function(err, res){
                if(err){
                    console.log(err);
                }else{
                    var category = getFuzzyCategory(data.fuzzy);

                    if(category != 0) checkAlertTime(socket.room, category, now, data.fuzzy);
                    // console.log(res._ts);
                }
            }
        );

        // Push sensor data to owners of gateway via socket    
        io.sockets.in(socket.room).emit('sensor_value', data);
    });

    socket.on('open_lock', function(lockId, token){

        // Credential validation
        modelUser.findOne({
                token: token
            },function(err, user){
                if(err){
                    console.log(err);
                    return;
                }

                if(user){
                    io.sockets.in(socket.room).emit("open_lock", lockId);
                }
            }
        );
    });

    socket.on('ring_bell', function(token){

        // Credential validation
        modelUser.findOne({
                token: token
            }, function(err, user){
                if(err){
                    console.log(err);
                    return;
                }

                if(user){
                    io.sockets.in(socket.room).emit("ring_bell");           
                }
            }
        ) 
    });

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

function getFuzzyCategory(fuzzyVal){
    if(fuzzyVal <= 40) return 0;
    else if(fuzzyVal <= 63) return 1;
    else return 2;
}

function checkAlertTime(gwId, cat, _ts, fuzzyVal){
    var time;

    if(cat == 1) time = _ts - (1800 * 1000);
    else time = _ts - (120 * 1000);

    var date = new Date(time);
    console.log(date);

    modelAlert.find({
            gateway_id: gwId,
            type: cat,
            _ts: {$gte: time}
        }, function(err, alerts){
            if(err){
                console.log(err);
                return;
            }

            if(alerts.length <= 0){
                console.log("next");
                modelGateway.findOne({gateway_id: gwId},
                    function(err, gw){
                        if(err){
                            console.log(err);
                            return;
                        }

                        if(gw){
                            sendNotifAlert(gw, fuzzyVal, cat, _ts);
                        }
                    }
                )
            }else{
                console.log(alerts.length);
            }
        })
}

function sendNotifAlert(gw, fuzzyVal, cat, time){
    gw.owner.forEach(function(own){
        modelUser.findOne({email: own.email},
            {
                _id: 0,
                token_firebase: 1
            },
            function(err, user){
                if(err){
                    console.log(err);
                    return;
                }

                if(user.token_firebase){
                    var catString;
                    
                    if(cat == 1) catString = "warning";
                    else catString = "dangerous";

                    sendNotification(
                        JSON.stringify({fuzzy: fuzzyVal, category: catString}),
                        "ALERT_SENSOR", gw.gateway_id,
                        user.token_firebase
                    );

                    modelAlert.create({
                            gateway_id: gw.gateway_id,
                            user_email: user.email,
                            type: cat,
                            _ts: time
                        },
                        function(err, alert){
                            if(err){
                                console.log(err);
                                return;
                            }
                        }
                    )
                }
            }
        )
    });
}

/**
 * Send notif when new lock paired
 */
function sendNotifPairedLock(gw, lockId, lockName){

    // Get owner(s) of gateway
    gw.owner.forEach(function(own){
        modelUser.findOne({email: own.email},
            {
                _id: 0,
                token_firebase: 1
            },
            function(err, user){
                if(err){
                    console.log(err);
                    return;
                }

                if(user.token_firebase){
                    sendNotification(
                        JSON.stringify({id: lockId, name: lockName}),
                        "PAIR_LOCK", gw.gateway_id,
                        user.token_firebase
                    );
                }
            }
        )
    });
}

function sendNotifUnpairedLock(gw, lockId){

    gw.owner.forEach(function(own){
        modelUser.findOne({email: own.email},
            {token_firebase: 1, _id: 0},
            function(err, user){
                if(err){
                    console.log(err);
                    return;
                }

                if(user.token_firebase){
                    sendNotification(
                        JSON.stringify({id: lockId}),
                        "UNPAIR_LOCK", gw.gateway_id,
                        user.token_firebase
                    );
                }
            }
        )
    });
}

function sendNotifAllowUserToNewOwner(gwId, tokenFirebase){
    modelGateway.findOne({gateway_id: gwId}, {_id: 0},
        function(err, gw){
            if(err){
                console.log(err);
                return;
            }

            if(gw){
                sendNotification(JSON.stringify(gw), "GAIN_ACCESS", gwId, tokenFirebase);
            }
        }
    )
}

function sendNotifAllowUserToOldOwner(gw, newEmail, newName){
    gw.owner.forEach(function(own){
        modelUser.findOne({email: own.email},
            function(err, user){
                if(err){
                    console.log(err);
                    return;
                }

                if(user.token_firebase){
                    sendNotification(
                        JSON.stringify({email: newEmail, name: newName}),
                        "SOMEONE_GAIN_ACCESS",
                        gw.gateway_id, user.token_firebase
                    )
                }
            }
        )
    });
}

/**
 * Handle notification
 */
function sendNotification(data, flag, token){

    // Initialize data 
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

    // Initialize option
    var options = {
        priority : "high"
    };

    // Send message to passed token
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

    // Initialize data 
    var payload = {
        data : {
            data : data,
            flag : flag,
            gateway_id : gateway_id
        }
    };

    // Initialize option
    var options = {
        priority : "high"
    };

    // Send message to passed token
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
    request(url);
    console.log("Requesting self again in 20 minutes");
}, 1500000);

/**
 * Timer for send scheduled push notif to client 
 * with data of all sensor average value in an hour
 */
setInterval(function(){
    var date = new Date();
    var now = date.getTime();
    console.log(date);
    console.log(now);

    // Query to getting average sensor value
    var pipelineSensor = [
        {
            $group : {
                _id : "$gateway_id",
                temp : {$avg : "$temp"},
                hum : {$avg : "$hum"},
                co : {$avg : "$co"},
                smoke : {$avg : "$smoke"},
                bat : {$min : "$bat"}
            }
        }
    ];
     
    modelSensor.aggregate(pipelineSensor, function(err, vals){
        if(err) throw err;

        // Delete all sensor value in sensor collection
        // for saving database space
        modelSensor.remove({_ts : {$lt : now}}, function(err, sens){});

        vals.forEach(function(val){
            
            // Get gateway data depend on sensor.gateway_id
            modelGateway.findOne({gateway_id : val._id}, function(err, gw){
                if(!gw) return;
              
                gw.owner.forEach(function(own){

                    // Get user firebase token for every gateway's owner
                    modelUser.findOne({email : own.email}, {_id : 0, token_firebase : 1}, function(err, user){

                        if(user.token_firebase){
                            var gateway_id = val._id;
                            val.timestamp = now;
                            delete val._id;

                            // Send data into spesific user via fcm
                            sendNotification(JSON.stringify(val), "AVG_DATA", gateway_id, user.token_firebase);
                        }
                    });
                });
            })
        });
    });
}, 3600000);
//3600000