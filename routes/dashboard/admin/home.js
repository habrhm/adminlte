const express = require('express');
const router = express.Router();
const User = require('./../../models/User');

//Get back all the users
router.get('/', async (req, res) => {
  try {
    await User.find()
      .then(data => {
        const dataObject = {
          'title': 'Users',
          'users': data
        }
        res.render('admin/user', {
          data: dataObject
        });
      });
  } catch (e) {
    console.log(e);
  }
});

//Create a user
router.post('/', async (req, res) => {
  const user = new User({
    email: req.body.email,
    password: req.body.password,
    role: req.body.role
  });
  try {
    await user.save().then(() => {
      res.redirect('/admin/user');
    });
  } catch (e) {
    res.status(400).send(e);
  }
});

//Get a user
router.get('/:id', async (req, res) => {
  try {
    await User.findById(req.params.id)
      .then(data => {
        const dataObject = {
          'modalTitle': 'Edit User',
          'modalSubmit': 'Update',
          'users': data
        }
        res.send({
          data: dataObject
        });
      });
  } catch (e) {
    console.log(e);
  }
});

//Update a user
router.post('/:id', async (req, res) => {
  try {
    await User.updateOne({
        _id: req.params.id
      }, {
        $set: {
          '_id': req.body._id,
          'email': req.body.email,
          'password': req.body.password
        }
      })
      .then(() => {
        res.redirect('/admin/user');
      });
  } catch (e) {
    res.json({
      message: e
    });
  }
});

//Delete a user
router.delete('/:id', async (req, res) => {
  try {
    const removedUser = await User.deleteOne({
      _id: req.params.id
    });
    res.status(200).send("success");
  } catch (e) {
    console.log(e);
  }
});

module.exports = router;
