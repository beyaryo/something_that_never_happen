var mongoose = require('mongoose');

var alertSchema = new mongoose.Schema({
    gateway_id : String,
    user_email : String,
    type : Number,
    _ts : Number
}, {collection: 'alert'})

module.exports = mongoose.model('alert', alertSchema);