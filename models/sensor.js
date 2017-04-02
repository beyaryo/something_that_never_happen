var mongoose = require('mongoose');

var sensorSchema = new mongoose.Schema({
    gateway_id : String,
    temp : Number,
    co : Number,
    hum : Number,
    smoke : Number,
    _ts : Number
}, {collection: 'sensor'});

module.exports = mongoose.model('sensor', sensorSchema);