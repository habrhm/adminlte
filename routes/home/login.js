//jshint esversion:6

const express = require('express');
const passport = require('passport');
const register = require('./register');
const User = require('./../../models/User');

const router = express.Router();

passport.use(User.createStrategy());

passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

router.get('/', (req, res) => {
  if (req.isAuthenticated())
    res.redirect('/dashboard');
  else {
    res.render('home/login', {
      title: 'Log in',
      isRegSuccess: register.isSuccess,
      isWrongPass: false,
    });
    register.isSuccess = false;
  }
});

router.post('/', (req, res) => {
  const user = new User({
    username: req.body.username,
    password: req.body.password
  });
  passport.authenticate('local', async (err, user, info) => {
    if (err)
      console.log(err);
    else if (!user) {
      res.render('home/login', {
        title: 'Log in',
        isRegSuccess: register.isSuccess,
        isWrongPass: true,
      });
    } else {
      await req.login(user, (err) => {
        if (err)
          console.log(err);
        else {
          if (req.body.remember) {
            const hour = 86400000; //24Hours
            req.session.cookie.expires = new Date(Date.now() + hour);
            req.session.cookie.maxAge = hour;
          } else
            req.session.cookie.expires = false;
          res.redirect('/dashboard');
          module.exports.user = user;
          module.exports.isLogin = true;
        }
      });
    }
  })(req, res);
});

module.exports = router;
