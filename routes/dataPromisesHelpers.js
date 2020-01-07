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
* for posting to the database
* @author Paula Scharf, matr.: 450334
* @param arrayOfItems - an array of items which are to be fed to the database
* @param db - the database
* @returns {Promise<any>}
*/
function promiseToPostItems(arrayOfItems, db) {
	return new Promise((resolve, reject) => {
		try {
			db.collection(collectionName).insertMany(arrayOfItems, (error, result) => {
				if(error){
					// give a notice, that the inserting has failed and show the error on the console
					console.log("Failure while inserting items into '" + collectionName + "'.", error);
					// in case of an error while inserting, do routing to "error.ejs"
					reject(error);
					// if no error occurs ...
				} else {
					// ... give a notice, that inserting the item has succeeded
					console.log("Successfully read items from '" + collectionName + "'.");
					resolve();
				}
			});
		} catch(e) {
			reject(e);
		}
	});
}

/**
* for reading from the database
* @author Paula Scharf, matr.: 450334
* @param query - defines which items are supposed to be retrieved from the database
* @param db - the database
* @returns {Promise<any>}
*/
function promiseToGetItems(query, db) {
	return new Promise((resolve, reject) => {
		try {
			// find all
			db.collection(collectionName).find(query).toArray((error, result) => {
				if (error) {
					// give a notice, that the inserting has failed and show the error on the console
					console.log("Failure while reading items from '" + collectionName + "'.", error);
					// in case of an error while inserting, do routing to "error.ejs"
					reject(error);
					// if no error occurs ...
				} else {
					// ... give a notice, that the reading has succeeded and show the result on the console
					console.log("Successfully read the items from '" + collectionName + "'.");
					resolve(result);
				}
			});
		} catch(e) {
			reject(e);
		}
	});
}


/**
* for updating itmes in the database
* @author Paula Scharf, matr.: 450334
* @param query - defines the items that are supposed to be updated
* @param update - defines how the items are supposed to be updated
* @param db - the database
* @returns {Promise<any>}
*/
function promiseToUpdateItems(query, update, db) {
	return new Promise((resolve, reject) => {
		try {
			db.collection(collectionName).updateMany(query, update, (error, result) => {

				if (error) {
					// give a notice, that the updating has failed and show the error on the console
					console.log("Failure while updating items in '" + collectionName + "'.", error);
					// in case of an error while updating, do routing to "error.ejs"
					reject(error);
					// if no error occurs ...
				} else {
					// ... give a notice, that updating the item has succeeded
					console.log("Successfully updated items in '" + collectionName + "'.");
					resolve(result);
				}
			});
		} catch(e) {
			reject(e);
		}
	});
}

/**
* for deleting items in the database
* @author Paula Scharf, matr.: 450334
* @param query - defines which items are supposed to be deleted
* @param db - the database
* @returns {Promise<any>}
*/
function promiseToDeleteItems(query, db) {
	return new Promise((resolve, reject) => {
		try {
			// filter database for Unwetters whose timestamps-Array is empty
			db.collection(collectionName).deleteMany(query, (error, result) => {

				if (error) {
					// give a notice, that the deleting has failed and show the error on the console
					console.log("Failure while deleting some items from '" + collectionName + "'.", error);
					// in case of an error while deleting, do routing to "error.ejs"
					reject(error);

					// if no error occurs ...
				} else {
					// ... give a notice, that deleting the Unwetter has succeeded
					console.log("Successfully deleted some items from '" + collectionName + "'.");
					resolve(result);
				}
			});
		} catch(e) {
			reject(e);
		}
	});
}

module.exports = {
	promiseToGetItems,
	promiseToPostItems,
	promiseToUpdateItems,
	promiseToDeleteItems
};
