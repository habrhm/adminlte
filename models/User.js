//jshint esversion:6

const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const userSchema = mongoose.Schema({
  fullname: String,
  username: {
    type: String,
    index: {
      unique: true,
    }
  },
  password: String,
  email: {
    type: String,
    index: {
      unique: true,
    }
  },
  registerAt: String,
  role: String
});

userSchema.plugin(passportLocalMongoose);

module.exports = mongoose.model("User", userSchema);
