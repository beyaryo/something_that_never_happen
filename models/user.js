var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    email : {type : String, unique : true},
    password : String,
    name : String,
    phone : {type : Number, unique : true},
    ektp_data : String, 
    join_date : Date,
    token : String,
    token_firebase : String
}, {collection: 'user'});

module.exports = mongoose.model('user', userSchema);