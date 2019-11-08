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
router.get('/help', function(req, res, next) {
  res.render('help', { title: 'User Documentation'});
});

/* GET animals API site */
router.get('/mapbox', function(req, res, next) {
  res.render('mapbox', { title: 'Mapbox'});
});


module.exports = router;
