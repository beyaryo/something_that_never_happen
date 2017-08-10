var mongoose = require('mongoose');

var twitSchema = new mongoose.Schema({
    gateway_id : String,
    temp : Number,
    hum : Number,
    co : Number,
    smoke : Number,
    bat : Number,
    fuzzy : Number,
    _ts : Number
}, {collection: 'twit'});

module.exports = mongoose.model('twit', twitSchema);