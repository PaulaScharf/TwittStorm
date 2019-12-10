// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/

// list of parameters, possibly for input checking
let paramList = "wtype, radProd, radClass, mapZoom, mapCenter, timestamp, aoi, base";


var express = require('express');
var router = express.Router();

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

/* GET home page.*/
router.get('/', function(req, res, next) {


  let paramArray = {
    "timestamp": req.query.timestamp,
    "aoi": req.query.aoi,
    "wtype": req.query.wtype,
    "rasterProduct": req.query.radProd,
    "rasterClassification": req.query.radClass,
    "base": req.query.base,
    "mapZoom": req.query.mapZoom,
    "mapCenter": req.query.mapCenter,
    "config": config
  };

  res.render('index', {
    title: 'TwittStorm',
    paramArray: paramArray
  });
});

/* GET author site */
router.get('/author', function(req, res, next) {
  res.render('author', { title: 'Author'});
});

/* GET create site */
router.get('/help', function(req, res, next) {
  res.render('help', { title: 'User Documentation'});
});

/* GET map site */
router.get('/mapbox', function(req, res, next) {
  res.render('mapbox', { title: 'Mapbox'});
});

/* GET mongo site */
router.get('/mongo', function(req, res, next) {
  res.render('mongo', { title: 'MongoDB'});
});

module.exports = router;
