var mongoose = require('mongoose');

var gatewaySchema = new mongoose.Schema({
    gateway_id : {type : String, unique : true},
    name : String,
    lat : Number,
    lng : Number,
    address : String,
    owner : [{
        email: String,
        name: String
    }],
    ip : String,
    bssid : String,
    registered : {type : Boolean, "default" : false},
    lock : [{
        id : String,
        name : String
    }]
}, {collection: 'gateway'});

module.exports = mongoose.model('gateway', gatewaySchema);