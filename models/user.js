var mongoose = require('mongoose');

var userSchema = new mongoose.Schema({
    email : {type : String, uniqure : true},
    password : String,
    name : String,
    ektp_data : String,
    join_date : Date,
    token : String
}, {collection: 'user'});

module.exports = mongoose.model('user', userSchema);