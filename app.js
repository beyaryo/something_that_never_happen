/**
 * Init Express for http framework
 * Init body-parser for receive POST data
 * Init morgan for unit testing
 */
var express = require('express');
var logger = require('morgan');
var parser = require('body-parser');
var app = express();

app.set('port', (process.env.PORT || 46195));       // set port to run into
app.use(express.static(__dirname + '/public'));     // server root dir
app.use(logger('dev'));                             // unit testing
server.use(parser.json());                          // support json encoded body
server.use(parser.urlencoded({extended : true}));   // support encoded body

/**
 * Run server
 */
app.listen(app.get('port'), function() {
    console.log('Node app is running on port', app.get('port'));
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
