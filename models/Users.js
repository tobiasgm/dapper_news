var crypto = require('crypto');
var mongoose = require('mongoose');
var jwt = require('jsonwebtoken');

var UserSchema = new mongoose.Schema({
  username: {type: String, lowercase: true, unique: true},
  hash: String,
  salt: String
});

// {info} The first argument of the jwt.sign() method is the payload that gets signed.
// Both the server and client will have access to the payload.
// The exp value in the payload is a Unix timestamp in seconds that will specify when the token expires. For this example we set it to 60 days in the future.
// The second argument of jwt.sign() is the secret used to sign our tokens.
// We're hard-coding it in this example,
// but it is strongly recommended that you use an environment variable for referencing the secret and keep it out of your codebase.
UserSchema.methods.generateJWT = function() {
    // set expiration to 60 days
    var today = new Date();
    var exp = new Date(today);
    exp.setDate(today.getDate() + 60);

    return jwt.sign({
        _id: this._id,
        username: this.username,
        exp: parseInt(exp.getTime() / 1000),
    }, 'SECRET');
};

// method on the User model that accepts a password then generates a salt and associated password hash.
UserSchema.methods.setPassword = function(password){
    this.salt = crypto.randomBytes(16).toString('hex');
    this.hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');
};

// method accepts a password and compares it to the hash stored, returning a boolean.
UserSchema.methods.validPassword = function(password) {
    var hash = crypto.pbkdf2Sync(password, this.salt, 1000, 64).toString('hex');  
    return this.hash === hash;
};

mongoose.model('User', UserSchema);
