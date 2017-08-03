var mongoose = require('mongoose');

var aggrSchema = new mongoose.Schema({
    gateway_id : String,
    temp : Number,
    hum : Number,
    co : Number,
    smoke : Number,
    bat : Number,
    fuzzy : Number,
    _ts : Number
}, {collection: 'aggr'});

module.exports = mongoose.model('aggr', aggrSchema);