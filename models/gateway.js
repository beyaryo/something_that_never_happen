var mongoose = require('mongoose');

var gatewaySchema = new mongoose.Schema({
    gateway_id : {type : String, unique : true},
    name : String,
    lat : Number,
    lng : Number,
    address : String,
    owner : {type : Array, "default" : []},
    ip : String,
    bssid : String,
    registered : {type : Boolean, "default" : false},
    door : [{
        id : String,
        name : String
    }]
}, {collection: 'gateway'});

module.exports = mongoose.model('gateway', gatewaySchema);