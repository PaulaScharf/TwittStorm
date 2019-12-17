// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


var express = require('express');
var router = express.Router();
const dataHelpers = require('./dataHelpers.js')

router.route("/").post(dataHelpers.getItems);
router.route("/add").post(dataHelpers.postItems);
router.route("/update").put(dataHelpers.updateItems);
router.route("/delete").delete(dataHelpers.deleteItems);

module.exports = router;
