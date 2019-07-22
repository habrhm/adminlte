//jshint esversion:6

const express = require('express');
const router = express.Router();
const path = require('path');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const GridFsStorage = require('multer-gridfs-storage');
const Grid = require('gridfs-stream');
const progress = require('progress-stream');
const login = require('./../home/login');
const User = require('./../../models/User');

//Mongo URI
const mongoURI = process.env.DB_CONNECTION;

//Create mongo connection
const conn = mongoose.createConnection(mongoURI, {
  useNewUrlParser: true
});

//Init gfs
let docGfs;
let profileGfs;

Grid.mongo = mongoose.mongo;

conn.once('open', () => {
  //Init stream
  docGfs = Grid(conn.db);
  profileGfs = Grid(conn.db);
  docGfs.collection('documents');
  profileGfs.collection('profiles');
});

//Create storage engine
const docStorage = new GridFsStorage({
  url: mongoURI,
  options: {
    useNewUrlParser: true
  },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err)
          return reject(err);
        else {
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const dt = new Date();
          const month = (dt.getMonth() + 1);
          const date = dt.getDate() + "/" + (month < 10 ? '0' + month : month) + "/" + dt.getFullYear();
          const fileInfo = {
            filename: filename,
            metadata: {
              'category': req.body.category,
              'id': req.body.id,
              'title': req.body.title,
              'srcorobj': req.body.srcorobj,
              'assignedto': req.body.assignedto,
              'dateofassignment': req.body.dateofassignment,
              'savedby': req.body.savedby,
              'saveddate': date
            },
            bucketName: 'documents'
          };
          resolve(fileInfo);
        }
      });
    });
  }
});

const docUpload = multer({
  storage: docStorage,
  fileFilter: function(req, file, cb) {
    if (file.mimetype !== 'application/pdf' && file.mimetype !== 'image/jpeg') {
      req.fileValidationError = 'File type must be PDF or JPG/JPEG.';
      cb(null, false);
    } else
      cb(null, true);
  }
});

const profileStorage = new GridFsStorage({
  url: mongoURI,
  options: {
    useNewUrlParser: true
  },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err)
          return reject(err);
        else {
          const filename = buf.toString('hex') + path.extname(file.originalname);
          const fileInfo = {
            filename: filename,
            metadata: {
              'username': login.user.username,
              'fullname': req.body.fullname,
              'email': req.body.email,
              'nip': req.body.nip,
              'birthday': req.body.birthday,
              'phone': req.body.phone
            },
            bucketName: 'profiles'
          };
          resolve(fileInfo);
        }
      });
    });
  }
});

const profileUpload = multer({
  storage: profileStorage,
  fileFilter: function(req, file, cb) {
    if (file.mimetype !== 'image/jpeg') {
      req.fileValidationError = 'File type must be JPG/JPEG.';
      cb(null, false);
    } else
      cb(null, true);
  }
});

router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    docGfs.files.find().toArray((err, files) => {
      if (err)
        console.log(err);
      else {
        profileGfs.files.findOne({
          'metadata.username': req.user.username
        }, (err, profile) => {
          if (err)
            console.log(err);
          else {
            const dataObject = {
              'title': 'Home',
              'user': req.user,
              'isLogin': login.isLogin,
              'files': (!files || files.length === 0 ? false : files),
              'profile': profile
            };
            res.render('dashboard/home', {
              data: dataObject
            });
            login.isLogin = false;
          }
        });
      }
    });
  } else
    res.redirect('/login');
});

router.get('/document', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, (err, profile) => {
      if (err)
        console.log(err);
      else {
        const dataObject = {
          'title': 'Input Document',
          'user': req.user,
          'flag': 0,
          'errMessage': '',
          'profile': profile
        };
        res.render('dashboard/document', {
          data: dataObject
        });
        login.isLogin = false;
      }
    });
  } else
    res.redirect('/login');
});

router.post('/document', (req, res) => {
  if (req.isAuthenticated()) {
    const io = req.app.get('socketio');
    const p = progress({
      length: req.headers['content-length'],
    });
    const u = docUpload.single('uploaddocument');
    req.pipe(p);
    p.headers = req.headers;
    p.on('progress', (progress) => {
      const percent = parseInt(progress.percentage);
      io.emit('uploading', percent);
    });
    u(p, res, (err) => {
      if (err)
        console.log(err);
      else {
        profileGfs.files.findOne({
          'metadata.username': req.user.username
        }, (err, profile) => {
          if (err)
            console.log(err);
          else {
            const dataObject = {
              'title': 'Input Document',
              'user': req.user,
              'flag': 0,
              'errMessage': '',
              'profile': profile
            };
            dataObject.flag = 1;
            if (p.fileValidationError) {
              dataObject.flag = 2;
              dataObject.errMessage = p.fileValidationError;
            }
            res.render('dashboard/document', {
              data: dataObject
            });
          }
        });
      }
    });
  } else
    res.redirect('/login');
});

router.get('/document/:filename', (req, res) => {
  if (req.isAuthenticated()) {
    docGfs.files.findOne({
      filename: req.params.filename
    }, (err, file) => {
      if (err)
        console.log(err);
      else {
        const readstream = docGfs.createReadStream(file.filename);
        readstream.pipe(res);
      }
    });
  } else
    res.redirect('/login');
});

router.delete('/document/:filename', (req, res) => {
  if (req.isAuthenticated()) {
    docGfs.remove({
      filename: req.params.filename,
      root: 'documents'
    }, (err, gridStore) => {
      if (err)
        console.log(err);
      else
        res.status(200).send("success");
    });
  } else
    res.redirect('/login');
});

router.get('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, (err, profile) => {
      if (err)
        console.log(err);
      else {
        const dataObject = {
          'title': 'Profile',
          'user': req.user,
          'flag': 0,
          'errMessage': '',
          'profile': profile
        };
        res.render('dashboard/profile', {
          data: dataObject
        });
      }
    });
  } else
    res.redirect('/login');
});

router.post('/profile', (req, res) => {
  if (req.isAuthenticated()) {
    const io = req.app.get('socketio');
    const p = progress({
      length: req.headers['content-length'],
    });
    const u = profileUpload.single('uploadphoto');
    req.pipe(p);
    p.headers = req.headers;
    p.on('progress', (progress) => {
      const percent = parseInt(progress.percentage);
      io.emit('uploading', percent);
    });
    u(p, res, (err) => {
      if (err)
        console.log(err);
      else {
        profileGfs.files.find({
          'metadata.username': req.user.username
        }).toArray((err, profiles) => {
          if (err)
            console.log(err);
          else {
            if (!p.fileValidationError && profiles && profiles.length > 1) {
              profileGfs.remove({
                'filename': profiles[0].filename,
                root: 'profiles'
              }, (err, gridStore) => {
                if (err)
                  console.log(err);
              });
            }
            const profile = (profiles && profiles.length > 1 ? profiles[1] : profiles[0]);
            const dataObject = {
              'title': 'Profile',
              'user': req.user,
              'flag': 0,
              'errMessage': '',
              'profile': profile
            };
            dataObject.flag = 1;
            if (p.fileValidationError) {
              dataObject.flag = 2;
              dataObject.errMessage = p.fileValidationError;
            }
            res.render('dashboard/profile', {
              data: dataObject
            });
          }
        });
      }
    });
  } else
    res.redirect('/login');
});

router.get('/profile/:filename', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      filename: req.params.filename
    }, (err, file) => {
      if (err)
        console.log(err);
      else {
        const readstream = profileGfs.createReadStream(file.filename);
        readstream.pipe(res);
      }
    });
  } else
    res.redirect('/login');
});

router.get('/user', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, async (err, profile) => {
      if (err)
        console.log(err);
      else {
        if (req.user.role !== 'User') {
          try {
            await User.find().then(users => {
              const dataObject = {
                'title': 'Manage User',
                'user': req.user,
                'profile': profile,
                'users': users,
                'flag': module.exports.flag,
                'errMessage': module.exports.errMessage
              };
              module.exports.flag = 0;
              res.render('dashboard/user', {
                data: dataObject
              });
            });
          } catch (e) {
            console.log(e);
          }
        } else {
          const dataObject = {
            'title': '404 Error Page',
            'user': req.user,
            'profile': profile
          };
          res.status(404).render('dashboard/404', {
            data: dataObject
          });
        }
      }
    });
  } else
    res.redirect('/login');
});

router.post('/user', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, async (err, profile) => {
      if (err)
        console.log(err);
      else {
        if (req.user.role !== 'User') {
          const dt = new Date();
          try {
            await User.register(new User({
              username: req.body.username,
              registerAt: dt.toLocaleDateString('en-US', {
                month: 'short',
                year: 'numeric'
              }),
              role: 'User'
            }), req.body.password).then(() => {
              module.exports.flag = 1;
              res.redirect('/dashboard/user');
            });
          } catch (e) {
            module.exports.flag = 4;
            module.exports.errMessage = e.message;
            res.redirect('/dashboard/user');
          }
        } else {
          const dataObject = {
            'title': '404 Error Page',
            'user': req.user,
            'profile': profile
          };
          res.status(404).render('dashboard/404', {
            data: dataObject
          });
        }
      }
    });
  } else
    res.redirect('/login');
});

router.get('/user/:id', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, async (err, profile) => {
      if (err)
        console.log(err);
      else {
        if (req.user.role !== 'User') {
          try {
            await User.findById(req.params.id).then(user => {
              const dataObject = {
                'modalTitle': 'Edit User',
                'modalSubmit': 'Update',
                'user': user
              };
              res.send({
                data: dataObject
              });
            });
          } catch (e) {
            console.log(e);
          }
        } else {
          const dataObject = {
            'title': '404 Error Page',
            'user': req.user,
            'profile': profile
          };
          res.status(404).render('dashboard/404', {
            data: dataObject
          });
        }
      }
    });
  } else
    res.redirect('/login');
});

router.post('/user/:id', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, async (err, profile) => {
      if (err)
        console.log(err);
      else {
        if (req.user.role !== 'User') {
          try {
            await User.updateOne({
              _id: req.params.id
            }, {
              $set: {
                'role': req.body.role
              }
            }).then(() => {
              module.exports.flag = 2;
              res.redirect('/dashboard/user');
            });
          } catch (e) {
            console.log(e);
          }
        } else {
          const dataObject = {
            'title': '404 Error Page',
            'user': req.user,
            'profile': profile
          };
          res.status(404).render('dashboard/404', {
            data: dataObject
          });
        }
      }
    });
  } else
    res.redirect('/login');
});

router.delete('/user/:username', (req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, async (err, profile) => {
      if (err)
        console.log(err);
      else {
        if (req.user.role !== 'User') {
          try {
            await User.deleteOne({
              username: req.params.username
            }).then(() => {
              profileGfs.files.findOne({
                'metadata.username': req.params.username
              }, (err, p) => {
                if (err)
                  console.log(err);
                else {
                  if (p && p.length > 0) {
                    console.log(p);
                    profileGfs.remove({
                      'filename': p.filename,
                      root: 'profiles'
                    }, (err, gridStore) => {
                      if (err)
                        console.log(err);
                    });
                  }
                }
              });
              module.exports.flag = 3;
              res.status(200).send("success");
            });
          } catch (e) {
            console.log(e);
          }
        } else {
          const dataObject = {
            'title': '404 Error Page',
            'user': req.user,
            'profile': profile
          };
          res.status(404).render('dashboard/404', {
            data: dataObject
          });
        }
      }
    });
  } else
    res.redirect('/login');
});

//Logout route
router.use('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

router.use((req, res) => {
  if (req.isAuthenticated()) {
    profileGfs.files.findOne({
      'metadata.username': req.user.username
    }, (err, profile) => {
      if (err)
        console.log(err);
      else {
        const dataObject = {
          'title': '404 Error Page',
          'user': req.user,
          'profile': profile
        };
        res.status(404).render('dashboard/404', {
          data: dataObject
        });
      }
    });
  } else
    res.redirect('/login');
});

module.exports = router;
