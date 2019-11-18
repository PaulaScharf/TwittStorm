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

var Twitter = require('twitter');

var client = new Twitter({
    consumer_key: 'MrvR3iGRtOYWEHvyX1GQvbgbn',
    consumer_secret: '8fDd8OEVcklCC4a0JdWa5P7dOC3J3p029jhFSITbwmDwnVN8CA',
    access_token_key: '1186999137541283840-8t6BUIDVX9it9aZznjRX7QmIduO4dw',
    access_token_secret: 'W9b9MvmH93UTbiTcEMr1h2IBqLc2lQfF3LtqphfdeReJK'
});

router.get("/search", (req, res) => {
    let params = {};
    for (let key in req.body) {
        if (reg.body.hasOwnProperty(key)) {
            params[key] = req.body[key];
        }
    }

    client.get('search/tweets', params, function (error, tweets, response) {
        if (!error) {
            // send the result to the ajax request
            res.json(JSON.parse(response.body));
        } else {
            res.render('error');
        }
    });
});


module.exports = router;
