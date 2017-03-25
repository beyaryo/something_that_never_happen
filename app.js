/**
 * Init Express for http framework
 * Init body-parser for receive POST data
 * Init morgan for unit testing
 * Init request for self-request to prevent server from sleep
 */
var express = require('express');
var logger = require('morgan');
var parser = require('body-parser');
var request = require('request');
var app = express();
var url = "https://myfis.herokuapp.com/";

app.set('port', (process.env.PORT || 46195));       // set port to run into
app.use(express.static(__dirname + '/public'));     // app root dir
app.use(logger('dev'));                             // unit testing
app.use(parser.json());                          // support json encoded body
app.use(parser.urlencoded({extended : true}));   // support encoded body

/**
 * Run app
 */
app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
});

/**
 * User do GET request
 */
app.get("/api/user", function(req, res){
    var token = req.query.token;
    var name = req.query.name;

    if(req.query.name == null){
        res.status(404);
        res.send("Page not found!");
    }else{
        res.status(200)
        res.send(name);
    }
});

/**
 * User do POST request
 */
app.post("/api/user", function(req, res){
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
app.param('name', function(req, res, next, name){
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
app.get("/api/user/:name", function(req, res){
    res.send(req.message);
});

/**
 * Timer for request itself to prevent server from sleep
 */
setInterval(function(){
    request(url);
    console.log("Requesting self again in 20 minutes");
},1200000);