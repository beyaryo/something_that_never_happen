var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    email : {type : String, unique : true},
    password : String,
    name : String,
    phone : {type : Number, unique : true},
    join_date : Number,
    token : String,
    token_firebase : String
}, {collection: 'user'});

module.exports = mongoose.model('user', userSchema);