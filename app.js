// Express and Morgan init
var express = require('express');
var logger = require('morgan');
var server = express();
var PORT = 8203;

// Mongo init
var mongoClient = require('mongodb').MongoClient;
var mongoPORT = 26124;
var MONGODB_URL = "mongodb://myfis.herokuapp.com:" +mongoPORT+ "/sampledb";

// Object init
var peopleSchema = require('./people.js');

server.use(logger('dev'));

server.use(express.static(__dirname+'/public'));

server.listen(PORT, function(){
    console.log('Server running on port ' +PORT+ '!');
});

server.get("/wew", function(req, res){
    res.json({
        message : 'Hello Node!'
    });

    res.end();
});

server.get("/persons", function(req, res){
    res.json({
        message : "Persona"
    });

    res.end();
});

var people = new peopleSchema({
    name : 'Persona',
    email : 'pes@pens.ac.id',
    age : 18
});

// mongoClient.connect(MONGODB_URL, function(err, db){
//     if(err){
//         console.log(err);
//         return;
//     }else{
//         console.log("DB connected on port " +mongoPORT+ "!");
//         // updateDb(db, "Rizal", 30);
//     }
// });

function insertDb(){
    db.collection('persons').insertOne(people, function(err, res){
        err ? console.log(err) : console.log(res);

        db.close;
    });
}

function updateDb(db, name, age){
    db.collection('persons').updateOne(
        {name : name},
        {$set : {age : age}},
        function(err, res){
            err ? console.log(err) : console.log(res);

            db.close;
        }
    );
}