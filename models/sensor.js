var mongoose = require('mongoose');

var sensorSchema = new mongoose.Schema({
    gateway_id : String,
    temp : Number,
    hum : Number,
    co : Number,
    smoke : Number,
    bat : Number,
    fuzzy : Number,
    _ts : Number
}, {collection: 'sensor'});

module.exports = mongoose.model('sensor', sensorSchema);