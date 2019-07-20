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
let gfs;

conn.once('open', () => {
  //Init stream
  gfs = Grid(conn.db, mongoose.mongo);
  gfs.collection('documents');
});

//Create storage engine
const storage = new GridFsStorage({
  url: mongoURI,
  options: {
    useNewUrlParser: true
  },
  file: (req, file) => {
    return new Promise((resolve, reject) => {
      crypto.randomBytes(16, (err, buf) => {
        if (err) {
          return reject(err);
        }
        const filename = buf.toString('hex') + path.extname(file.originalname);
        const fileInfo = {
          filename: filename,
          metadata: {
            'docid': req.body.docid,
            'doctitle': req.body.doctitle,
            'assignedto': req.body.assignedto,
            'dateofassignment': req.body.dateofassignment,
            'savedby': req.body.savedby
          },
          bucketName: 'documents'
        };
        resolve(fileInfo);
      });
    });
  }
});

const upload = multer({
  storage
});

router.get('/', (req, res) => {
  if (req.isAuthenticated()) {
    gfs.files.find().toArray(async (err, files) => {
      if (err)
        console.log(err);
      else {
        const user = await User.findById(login.user._id);
        const dataObject = {
          'title': 'Home',
          'user': user,
          'isLogin': login.isLogin,
          'files': (!files || files.length === 0 ? false : files),
          'isInputDoc': false
        }
        res.render('dashboard/home', {
          data: dataObject
        });
        login.isLogin = false;
      }
    });
  } else
    res.redirect('/login');
});

router.get('/document', (req, res) => {
  if (req.isAuthenticated()) {
    const dataObject = {
      'title': 'Input Document',
      'user': login.user,
      'isLogin': login.isLogin,
      'files': false,
      'isInputDoc': false
    }
    res.render('dashboard/document', {
      data: dataObject
    });
    login.isLogin = false;
  } else
    res.redirect('/login');
});

router.post('/document', (req, res) => {
  if (req.isAuthenticated()) {
    const io = req.app.get('socketio');
    const p = progress({
      length: req.headers['content-length'],
    });
    const u = upload.single('uploaddocument');
    req.pipe(p);
    p.headers = req.headers;
    p.on('progress', (progress) => {
      const percent = parseInt(progress.percentage);
      io.emit('uploading', percent);
    });
    u(p, res, () => {
      const dataObject = {
        'title': 'Input Document',
        'user': login.user,
        'isLogin': login.isLogin,
        'files': false,
        'isInputDoc': true,
      }
      res.render('dashboard/document', {
        data: dataObject
      });
    });
  } else
    res.redirect('/login');
});

router.get('/document/:filename', async (req, res) => {
  if (req.isAuthenticated()) {
    await gfs.files.findOne({
      filename: req.params.filename
    }, (err, file) => {
      if (err)
        console.log(err);
      else {
        const readstream = gfs.createReadStream(file.filename);
        readstream.pipe(res);
      }
    });
  } else
    res.redirect('/login');
});

router.delete('/document/:filename', async (req, res) => {
  if (req.isAuthenticated()) {
    await gfs.remove({
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

//Logout route
router.use('/logout', (req, res) => {
  req.logout();
  res.redirect('/login');
});

router.use((req, res) => {
  if (req.isAuthenticated()) {
    const dataObject = {
      'title': '404 Error Page',
      'user': login.user,
      'isLogin': login.isLogin,
      'files': false,
      'isInputDoc': false
    }
    res.status(404).render('dashboard/404', {
      data: dataObject
    });
  } else
    res.redirect('/login');
});

module.exports = router;
