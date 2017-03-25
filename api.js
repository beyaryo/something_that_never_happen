/**
 * Init Express for http framework
 * Init body-parser for receive POST data
 * Init morgan for unit testing
 * Server run in port 8018
 */
var express = require('express');
var morgan = require('morgan');
var parser = require('body-parser');
var server = express();
var PORT = 8018;

/**
 * Init mongo
 * Mongo run in port 26124
 */
var mongoClient = require('mongodb').MongoClient;
var mongoPORT = 26124;
var mongoDbUrl = "mongodb://localhost:" +mongoPORT+ "/sampledb";

server.use(parser.json());                                  // support json encoded body
server.use(parser.urlencoded({extended : true}));           // support encoded body
server.use(morgan('dev'));                                  // unit testing
server.use(express.static(__dirname+ '/public'));           // server root dir

/**
 * Run server
 */
server.listen(PORT, function(){
    console.log("Server running in port " +PORT+ "!");
});

/**
 * User do GET request
 */
server.get("/api/user", function(req, res){
    var token = req.query.token;
    var name = req.query.name;
    var name = (typeof req.query.name == "undefinied" ? "Mbret" : req.query.name);

    if(req.query.name == null){
        res.status(404);
        res.send("Page not found!");
    }else{
        res.status(200)
        res.send(name);
    }

    // res.json({
    //     token : token,
    //     name : name,
    //     message : "Hi GET!"
    // });
});

/**
 * User do POST request
 */
server.post("/api/user", function(req, res){
    var token = req.body.token;
    var name = req.body.name;

    res.json({
        token : token,
        name : name,
        message : "Hi POST!"
    });
});

/**
 * Middleware for spesific name
 */
server.param('name', function(req, res, next, name){
    if(name == "bey"){
        req.message = "Hi bey, how's your doing?";
    }else{
        req.message = "Who are you?";
    }

    next();
});

/**
 * User do GET request for spesific name
 */
server.get("/api/user/:name", function(req, res){
    res.send(req.message);
});