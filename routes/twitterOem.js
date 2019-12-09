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

const OAuth = require('oauth');
const OAuth2 = OAuth.OAuth2;
// load http-module and save it in const-OBJECT http
const https = require("https");

const tokens = require('../public/javascripts/tokens.js').token;

let oauth = new OAuth.OAuth(
    'https://api.twitter.com/oauth/request_token',
    'https://api.twitter.com/oauth/access_token',
    tokens.consumer_key,
    tokens.consumer_secret,
    '1.0A',
    null,
    'HMAC-SHA1'
);

let oauth2 = new OAuth2(
    tokens.consumer_key,
    tokens.consumer_secret,
    'https://api.twitter.com/',
    null,
    'oauth2/token',
    null);

let token;

oauth2.getOAuthAccessToken(
    '',
    {'grant_type':'client_credentials'},
    function (e, access_token){
        token = access_token;
    });

router.post("/search", (req, res) => {
  console.log(req.body);

    for (let key in req.body) {
        if (req.body.hasOwnProperty(key)) {
            if (key === "query") {
                query += req.body[key] + "&";
            }/* else if (key === "fromDate") {
                query += "fromDate=" + req.body[key] + "&";
            } else if (key === "toDate") {
                query += "toDate=" + req.body[key] + "&";
            } else if (key === "geometry") {
                let coordinateString = "[" + req.body[key][0] + " " + req.body[key][1] + " " + req.body[key][2] + " " + req.body[key][3] + " "
                query += "bounding_box:" + coordinateString + "&";
            }*/
        }
    }


    let endpoint = 'https://api.twitter.com/1/statuses/oembed.json?id=' + tweetId +'&align=center';
    console.dir(endpoint);
    // define options for the following https-GET request
    const options = {
        // set the headers for the get-request
        headers: {
            Authorization: 'Bearer ' + token
        },
        // timeout set to 20 seconds
        timeout: 20000
        // request-resource for the following https-GET request for individualIDs of the animal tracking API:
    };

    https.get(endpoint, options, (httpResponse) => {

        var body = "";

        httpResponse.on('data', (chunk) => {
            body += chunk;
        });

        httpResponse.on("end", () => {

            try {
                body = JSON.parse(body);
                res.send(body);

                // if an error occurs in parsing and sending the body ...
            } catch(e) {
                // ... send a message
                res.render('error');
            }
        });

        // if an error occurs while getting the animal tracking api ...
    }).on('error', (error) => {
        // ... give a notice, that the API request has failed and show the error on the console
        console.log("Failure while getting tweets from the twitter premium search API.", error);
    });
});


module.exports = router;
