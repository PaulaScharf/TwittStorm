// jshint esversion: 8
// jshint node: true
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


const mongodb = require('mongodb');

// yaml configuration
const fs = require('fs');
const yaml = require('js-yaml');
const config = yaml.safeLoad(fs.readFileSync('config.yaml', 'utf8'));

let collectionName = config.mongodb.collection_name;


/**
* Parses the input query.
* @author Paula Scharf
* @param input
* @returns query
*/
function queryParser(input) {
	let query = {};
	for (let key in input) {
		if (input.hasOwnProperty(key)) {
			if (key === "_id") {
				query[key] = new mongodb.ObjectID(input[key]);
			} else if (input[key].charAt(0) === "{" || input[key].charAt(0) === "[") {
				query[key] = JSON.parse(input[key]);
			} else {
				query[key] = input[key];
			}
		}
	}
	return query;
}

/* GET items */
var getItems = function(req, res) {
	var db = req.db;
	let query = {};
	if (req.body) {
		query = queryParser(req.body);
	}

	// find all
	db.collection(collectionName).find(query).toArray((error, result) => {
		if (error){
			// give a notice, that reading all items has failed and show the error on the console
			console.log("Failure in reading all items from '" + collectionName + "'.", error);
			// in case of an error while reading, do routing to "error.ejs"
			res.render('error');
			// if no error occurs ...
		} else {
			// ... give a notice, that the reading has succeeded and show the result on the console
			console.log("Successfully read the items from '" + collectionName + "'.");
			// ... and send the result to the ajax request
			res.json(result);
		}
	});
};


// *********************** inserting .........: ***********************
var postItems = function(req, res) {
	var db = req.db;

	db.collection(collectionName).insertMany(req.body, (error, result) => {
		if (error){
			// give a notice, that the inserting has failed and show the error on the console
			console.log("Failure while inserting an item into '" + collectionName + "'.", error);
			// in case of an error while inserting, do routing to "error.ejs"
			res.status(500).send(error);
			// if no error occurs ...
		} else {
			// ... give a notice, that inserting the item has succeeded
			res.json({
				// TODO: umändern, an API Doc anpassen
				error: 0,
				msg: "items saved."
			});
		}
	});
};


// *********************** updating .........: ***********************
var updateItems =  (req, res) => {

	var db = req.db;

	let query = queryParser(req.body.query);
	let update = queryParser(req.body.update);

	db.collection(collectionName).updateMany(query,	update, (error, result) => {

		if (error) {
			// give a notice, that the updating has failed and show the error on the console
			console.log("Failure while updating items in '" + collectionName + "'.", error);
			// in case of an error while updating, do routing to "error.ejs"
			res.render('error');
			// if no error occurs ...
		} else {
			// ... give a notice, that updating the item has succeeded
			console.log("Successfully updated items in '" + collectionName + "'.");
			res.json(result);
		}
	});
};


// TODO: ausprobieren, ob es funktioniert:
// *********************** deleting ...........: ***********************
var deleteItems = (req, res) => {

	var db = req.db;

	let query = {};
	if (req.body) {

		//	query = req.body;

		query = queryParser(req.body);
	}

	// filter database for Unwetters whose timestamps-Array is empty
	db.collection(collectionName).deleteMany(query, (error, result) => {

		if (error) {
			// give a notice, that the deleting has failed and show the error on the console
			console.log("Failure while deleting some items from '" + collectionName + "'.", error);
			// in case of an error while deleting, do routing to "error.ejs"
			//res.render('error');
			res.send(error);

			// if no error occurs ...
		} else {
			// ... give a notice, that deleting the Unwetter has succeeded
			console.log("Successfully deleted some items from '" + collectionName + "'.");
			res.json(result);
		}
	});
};


module.exports = {
	getItems,
	postItems,
	updateItems,
	deleteItems
};
