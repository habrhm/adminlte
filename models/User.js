//jshint esversion:6

const mongoose = require('mongoose');
const Schema = mongoose.Schema;
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = Schema({
  username: {
    type: String,
    index: {
      unique: true,
    }
  },
  password: String,
  registerAt: String,
  role: String
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
