//jshint esversion:6

require('dotenv').config();

const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const session = require('express-session');
const passport = require('passport');

//Import Routes
const routes = require('./routes');

const port = process.env.PORT || 3000;
const app = express();

//Cross origin policy
app.use(cors());

//Set view engine
app.set('view engine', 'ejs');

//Set body-parser
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

//Set static public data
app.use(express.static(__dirname + '/public'));

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//Connect to DB
mongoose.connect(
  process.env.DB_CONNECTION, {
    useNewUrlParser: true
  },
  () => console.log('Connected to DB!')
);
mongoose.set('useCreateIndex', true);

//Routes to /routes/index.js
app.use(routes);

//How to we start listening to the server
app.listen(port, () => {
  console.log(`Server Started at port ${port}`);
});
