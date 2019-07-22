//jshint esversion:6

const express = require('express');
const passport = require('passport');
const User = require('./../../models/User');
const router = express.Router();

router.get('/', (req, res) => {
  if (req.isAuthenticated())
    res.redirect('/dashboard');
  else {
    res.render('home/register', {
      title: 'SIKEMPAS | Registration',
      isNotMatch: false,
      isError: false,
      errMessage: '',
      username: ''
    });
  }
});

router.post('/', async (req, res) => {
  const username = req.body.username;
  const password = req.body.password;
  const dt = new Date();
  if (password !== req.body.password2) {
    res.render('home/register', {
      title: 'SIKEMPAS | Registration',
      isNotMatch: true,
      isError: false,
      errMessage: '',
      username: username
    });
  } else {
    try {
      await User.register(new User({
        username: username,
        registerAt: dt.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        }),
        role: 'User'
      }), password).then(() => {
        module.exports.isSuccess = true;
        res.redirect('/login');
      });
    } catch (e) {
      res.render('home/register', {
        title: 'SIKEMPAS | Registration',
        isNotMatch: false,
        isError: true,
        errMessage: e.message,
        username: username
      });
    }
  }
});

module.exports = router;
