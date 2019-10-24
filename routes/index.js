var express = require('express');
var router = express.Router();

/* GET home page.*/
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Twittstorm' });
});

/* GET author site */
router.get('/author', function(req, res, next) {
  res.render('author', { title: 'Author'});
});

/* GET create site */
router.get('/create', function(req, res, next) {
  res.render('create', { title: 'Create Route'});
});

/* GET delete site */
router.get('/delete', function(req, res, next) {
  res.render('delete', { title: 'Delete Route'});
});


/* GET update site */
router.get('/update', function(req, res, next) {
  res.render('update', { title: 'Update Route'});
});

/* GET animals API site */
router.get('/mapbox', function(req, res, next) {
  res.render('mapbox', { title: 'Mapbox'});
});


module.exports = router;
