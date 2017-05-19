var mongoose = require('mongoose');

var doorSchema = new mongoose.Schema({
    gateway_id : String,
    accessed_by : String,
    door_id : String,
    _ts : Number
}, {collection: 'door'});

module.exports = mongoose.model('door', doorSchema);