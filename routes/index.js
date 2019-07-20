//jshint esversion:6

const express = require('express');
const router = express.Router();

//Homepage route
router.use('/', require('./home/login'));
//Login route
router.use('/login', require('./home/login'));
//Register route
router.use('/register', require('./home/register'));
//Dashboard route
router.use('/dashboard', require('./dashboard/home'));

router.use((req, res) => {
  if (!req.isAuthenticated())
    res.status(404).render('404');
});

module.exports = router;
