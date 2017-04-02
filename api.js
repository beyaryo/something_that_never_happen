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
var moment = require('moment');
var app = express();

// console.log(moment().format());
// console.log(new Date());

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
 * User login
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
                        ektp_data: req.body.ektp_data,
                        join_date: new Date()
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
                owner: [req.body.owner],
                registered: true
            }}, function(err, gw){
                if(err){
                    res.status(503);
                    res.json({message: "Service unavaliable"});
                    return; 
                }

                if(!gw){
                    res.status(200);
                    res.json({
                        message: "Gateway serial number unidentified or it has been registered",
                        registered : false
                    });
                    return;
                }

                res.status(200);
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
                            message: "User already allowed to monitor this gateway",
                            allowed: false
                        });
                        return;
                    }

                    res.json({
                        message: req.body.email.concat(" allowed to monitor gateway"),
                        allowed: true
                    });
                }
            );
        }); 
    });
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
 * Get sensor values
 */
app.get("/api/sensors", function(req, res){
    modelSensor.count({}, function(err, values){
        if(err) throw err;

        res.json(values);
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
        var now = new Date();

        modelSensor.create({
                gateway_id : socket.room,
                temp : data.temp,
                hum : data.hum,
                co : data.co,
                smoke : data.smoke,
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
}, 1200000);

/**
 * Timer for send scheduled push notif to client 
 * with data of all sensor average value in 30 minutes
 */
setInterval(function(){
    var now = new Date();
    now.setHours(now.getHours() + 7);
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
        modelSensor.find({_ts : {$lt : now}}).remove();

        vals.forEach(function(val){
            
            /**
             * Get gateway data depend on sensor.gateway_id
             */
            modelGateway.findOne({gateway_id : val._id}, function(err, res){
                if(!res) return;
              
                res.owner.forEach(function(email){

                    /**
                     * Get user firebase token for every gateway's owner
                     */
                    modelUser.findOne({email : email}, {_id : 0, token_firebase : 1}, function(err, res){

                        if(res.token_firebase){
                            console.log("\nSend to : " +res.token_firebase);
                            console.log("Data : " +JSON.stringify(val)+ "");
                        }

                        // if(res.token_firebase)
                        //     sendNotification(JSON.stringify(val), "AVG_DATA", res.token_firebase);
                    });
                });
            })
        });
    });
}, 60000);