var mongoose = require('mongoose');

var gatewaySchema = new mongoose.Schema({
    gateway_id : {type : String, unique : true},
    name : String,
    lat : Number,
    lng : Number,
    address : String,
    owner : {type : Array, "default" : []},
    registered : {type : Boolean, "default" : false}
}, {collection: 'gateway'});

module.exports = mongoose.model('gateway', gatewaySchema);