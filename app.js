//jshint esversion:6

require('dotenv').config();

const express = require('express');
const favicon = require('serve-favicon');
const path = require('path');
const cors = require('cors');
const mongoose = require('mongoose');
const passport = require('passport');
const session = require('express-session');
const LocalStrategy = require('passport-local').Strategy;
const User = require('./models/User');

//Import Routes
const routes = require('./routes');

const app = express();
const port = process.env.PORT || 3000;

const server = app.listen(port, () => {
  console.log(`Server Started at port ${port}`);
});

const io = require('socket.io')(server);

//Set socket.io
app.set('socketio', io);

//Set view engine
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

//Cross origin policy
app.use(cors());

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(express.json());
app.use(express.urlencoded({
  extended: true
}));

app.use(session({
  secret: process.env.SECRET_KEY,
  resave: false,
  saveUninitialized: false
}));

app.use(passport.initialize());
app.use(passport.session());

//Set static public data
app.use(express.static(path.join(__dirname, 'public')));

//Routes to /routes/index.js
app.use(routes);

//Passport config
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

//Connect to DB
mongoose.connect(
  process.env.DB_CONNECTION, {
    useNewUrlParser: true
  },
  () => console.log('Connected to DB!')
);
mongoose.set('useCreateIndex', true);
