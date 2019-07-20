//jshint esversion:6

const express = require('express');
const router = express.Router();
const User = require('./../../models/User');

router.get('/', (req, res) => {
  if (req.isAuthenticated())
    res.redirect('/dashboard');
  else {
    res.render('home/register', {
      title: 'Account Registration',
      isNotMatch: false,
      isError: false,
      errMessage: '',
      fullname: '',
      username: '',
      email: '',
    });
  }
});

router.post('/', async (req, res) => {
  const bFullname = req.body.fullname;
  const bUsername = req.body.username;
  const bEmail = req.body.email;
  const bPassword = req.body.password;
  const dt = new Date();
  if (bPassword !== req.body.password2) {
    res.render('home/register', {
      title: 'Account Registration',
      isNotMatch: true,
      isError: false,
      errMessage: '',
      fullname: bFullname,
      username: bUsername,
      email: bEmail,
    });
  } else {
    try {
      await User.register({
        fullname: bFullname,
        username: bUsername,
        email: bEmail,
        registerAt: dt.getFullYear(),
        role: 'User'
      }, bPassword);
      module.exports.isSuccess = true;
      res.redirect('/login');
    } catch (e) {
      //console.log(e);
      const errMes = 'A user with the given email already registered';
      const errMes2 = 'A user with the given NIP already registered';
      res.render('home/register', {
        title: 'Account Registration',
        isNotMatch: false,
        isError: true,
        errMessage: (e.code === 11000 ? errMes : errMes2),
        fullname: bFullname,
        username: bUsername,
        email: bEmail,
      });
    }
  }
});

module.exports = router;
