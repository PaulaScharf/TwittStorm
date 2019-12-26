// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


// TODO: FARBEN AUCH AN STRAßENKARTE ANPASSEN

// TODO: löschen, da nicht benötigt??
mapboxgl.accessToken = paramArray.config.keys.mapbox.access_key;

// ****************************** global variables *****************************

// TODO: JSDoc für globale Variablen

/**
* refers to the layer menu
* @type {}
*/
var layers = document.getElementById('menu');


/**
* refers to the mapbox map element
* @type {mapbox_map}
*/
let map;


/**
* referes to all the layers that are not defaults
* @type {Array}
*/
let customLayerIds = [];


/**
*
* @type {boolean}
*/
let popupsEnabled = true;


/**
* time of app start
* @type {}
*/
let initTimestamp = Date.now();


/**
* Flag that indicates if a radar product is requested
* @type {String}
*/
let wtypeFlag = "";


// TODO: folgendes in eine Funktion schreiben:
// TODO: was macht dieser code?
window.twttr = (function(d, s, id) {
	var js, fjs = d.getElementsByTagName(s)[0],
	t = window.twttr || {};
	if (d.getElementById(id)) return t;
	js = d.createElement(s);
	js.id = id;
	js.src = "https://platform.twitter.com/widgets.js";
	fjs.parentNode.insertBefore(js, fjs);

	t._e = [];
	t.ready = function(f) {
		t._e.push(f);
	};

	return t;
}(document, "script", "twitter-wjs"));


// ******************************** functions **********************************

/**
* @desc Creates a map (using mapbox), centered on Germany, that shows the boundary of Germany
* and all current Unwetter ................ and ................
* For each Unwetter, it provides an onclick-popup with a description and its period of validity.
* Uses mapbox-gl-draw to enable drawing polygons in this map.
*
* ...... TWEETS-AUFRUF ERWÄHNEN ......
*
*
* This function is called, when "index.ejs" is loaded.
* @author Katharina Poppinga, Jonathan Bahlmann
*/
function showMap(style) {

	// Checks whether the layer menu DOM is empty and if not flushes the dom
	while (layers.firstChild) {
		layers.removeChild(layers.firstChild);
	}

	// enables the ability to choose between different mapstyles
	styleSelector();

	// declare var
	let zoomURL;
	let centerURL;
	// if not yet in URL, use standard
	if (paramArray.mapZoom == undefined) {
		//get value from config.yaml
		zoomURL = paramArray.config.map.zoom;
		// otherwise use value from URL
	} else {
		zoomURL = paramArray.mapZoom;
	}
	// see above
	if (paramArray.mapCenter == undefined) {
		//get value from config.yaml
		centerURL = paramArray.config.map.center;
	} else {
		centerURL = paramArray.mapCenter;
		centerURL = JSON.parse(centerURL);
	}


	// create new map with variable zoom and center
	map = new mapboxgl.Map({
		container: 'map',
		style: style,
		// TODO: basemap durch Nutzer änderbar machen: https://docs.mapbox.com/mapbox-gl-js/example/setstyle/
		// style: 'mapbox://styles/mapbox/satellite-v9',
		// style: 'mapbox://styles/mapbox/streets-v11',
		zoom: zoomURL,
		center: centerURL
	});


	// event to update URL
	// TODO: get initial map postion also from url
	map.on('moveend', function() {
		updateURL('mapZoom', map.getZoom());
		let center = map.getCenter();
		let centerString = "[" + center.lng + ", " + center.lat + "]";
		updateURL('mapCenter', centerString);
	});


	// add zoom and rotation controls to the map
	map.addControl(new mapboxgl.NavigationControl());


	// ************************ adding boundary of Germany *************************
	// TODO: evtl. in eigene Funktion auslagern, der Übersicht halber

	// this event is fired immediately after all necessary resources have been downloaded and the first visually complete rendering of the map has occurred
	map.on('load', function() {
		// resize map to full screen
		map.resize();
		// for a better orientation, add the boundary of germany to the map
		map.addLayer({
			'id': 'boundaryGermany',
			'type': 'line',
			'source': {
				'type': 'geojson',
				'data': boundaryGermany
			},
			'layout': { // TODO: nachlesen, ob layout hier nötig: https://docs.mapbox.com/mapbox-gl-js/style-spec/#types-layout
				'line-join': 'round',
				'line-cap': 'round',
				'visibility': 'visible'
			},
			'paint': {
				// TODO: passende Farbe aussuchen und bei basemap-Änderung anpassen
				'line-color': 'black',
				'line-width': 1
			}
		});
		customLayerIds.push('boundaryGermany');


		// enable drawing the area-of-interest-polygons
		drawForAOI(map);


		// Rain Radar Data
		if (paramArray.wtype == "radar") {
			// set the flag to radar
			wtypeFlag = "radar";

			// toggle the menu tabs for radar and severe weather to active or not active
			var rasterMenuToggle = document.getElementById('raster');
			rasterMenuToggle.classList.toggle("active");
			var severeWeatherMenuToggle = document.getElementById('severeWeather');
			severeWeatherMenuToggle.classList.remove("active");

			// if timestamp undefined
			if (paramArray.timestamp == undefined) {
				let now = Date.now();
				// define it to now
				paramArray.timestamp = now;
				updateURL("timestamp", now);
			}
			updateURL("timestamp", paramArray.timestamp);

			//if rasterProduct is defined
			if (paramArray.rasterProduct !== undefined) {

				showLegend(map, "radar", paramArray.rasterProduct);
				// display rain radar
				requestAndDisplayAllRainRadar(map, paramArray.rasterProduct, paramArray.timestamp);

				// check the checkbox of the radar submenu according to the chosen product
				if (paramArray.rasterProduct === "ry") {
					var innerRasterCheckToggle1 = document.getElementById('radio1');
					innerRasterCheckToggle1.checked = true;
				}
				if (paramArray.rasterProduct === "rw") {
					let innerRasterCheckToggle2 = document.getElementById('radio2');
					innerRasterCheckToggle2.checked = true;
				}
				if (paramArray.rasterProduct === "sf") {
					var innerRasterCheckToggle3 = document.getElementById('radio3');
					innerRasterCheckToggle3.checked = true;
				}

			}
			// if radarproduct is undefined
			else {
				// default radar case (rw)
				showLegend(map, "radar", "rw");
				requestAndDisplayAllRainRadar(map, 'rw', paramArray.timestamp);
				updateURL("rasterProduct", "rw");
				let innerRasterCheckToggle2 = document.getElementById('radio2');
				innerRasterCheckToggle2.checked = true;
			}
		}


		// 2.oder-fall (undefined): to be able to still use localhost:3000/ TODO: später löschen oder als default lassen?)
		if ((paramArray.wtype === "unwetter") || (paramArray.wtype === undefined)) {

			//set URL to requested wtype
			updateURL("wtype", "unwetter");
			updateURL("radProd", "");

			// set the flag to severe weather
			wtypeFlag = "severeWeather";

			// toggle the menu tabs for radar and severe weather to active or not active
			var rasterMenuToggle = document.getElementById('raster');
			rasterMenuToggle.classList.remove("active");
			var severeWeatherMenuToggle = document.getElementById('severeWeather');
			severeWeatherMenuToggle.classList.add("active");

			showLegend(map, "unwetter");

			// the last Unwetter request was "hm"-milliseconds ago
			let msecsToLastUnwetterRequest = Date.now() - paramArray.config.timestamp_last_Unwetter_request;

			// if the timestamp of the last Unwetter request is empty (no request so far) or equal to or older than "paramArray.config.refresh_rate" ...
			if ((paramArray.config.timestamp_last_Unwetter_request == null) || (msecsToLastUnwetterRequest >= paramArray.config.refresh_rate)) {

				// ... do a new Unwetter request right now ...
				requestNewAndDisplayCurrentUnwetters(map);

				// TODO: wird folgendes immer wieder ausgeführt, auch wenn Bedingung in if sich ändert?
				// ... and afterwards request Unwetter each "paramArray.config.refresh_rate" again
				requestNewAndDisplayCurrentUnwettersEachInterval(map, paramArray.config.refresh_rate);


				// if the last Unwetter request is less than "paramArray.config.refresh_rate" ago ...
			} else {

				let timeUntilNextUnwetterRequest = paramArray.config.refresh_rate - msecsToLastUnwetterRequest;

				// ... do a new request in "timeUntilNextUnwetterRequest"-milliseconds ...
				// TODO: Zeitverzug von setTimeout möglich, daher dauert es evtl. länger als 5 min bis zum Request?
				window.setTimeout(requestNewAndDisplayCurrentUnwetters, timeUntilNextUnwetterRequest, map);

				// ... and afterwards each "paramArray.config.refresh_rate" again
				window.setTimeout(requestNewAndDisplayCurrentUnwettersEachInterval, (timeUntilNextUnwetterRequest + paramArray.config.refresh_rate), map, paramArray.config.refresh_rate);
			}
		}


		// TODO: was gehört noch innerhalb von map.on('load', function()...) und was außerhalb?
	});
}



// ************************************* block about rain radar ****************************************
/**
* @desc This function requests and displays Rain Radar data
* @author Katharina Poppinga, Paula Scharf, Benjamin Rieke, Jonathan Bahlmann
* @param map the map to display data in
* @param product the radarProduct, see API wiki on github
* @param timestamp see API wiki on GitHub
*/
function requestAndDisplayAllRainRadar(map, product, timestamp) {
	let url = "/radar/" + product + "/latest";
	// Rain Radar Data
	$.getJSON(url, function(result) {

		//result is array of rainRadar JSONs
		//result[result.length - 1] is most recent one -- insert variable
		//console.log(result[result.length - 1]);

		map.addSource("rainradar", {
			"type": "geojson",
			"data": result.geometry
		});
		map.addLayer({
			"id": "rainradar",
			"type": "fill",
			"source": "rainradar",
			"layout": {"visibility": "visible"},
			"paint": {
				"fill-color" : {
					"property": "class",
					"stops": [
						[1, '#b3cde0'],
						[2, '#6497b1'],
						[3, '#03396c'],
						[4, '#011f4b']
					]
				},
				"fill-opacity": 0.4
			}
		});
		customLayerIds.push('rainradar');
	});
}
// *****************************************************************************************************


/**
* @desc
*
* @author Katharina Poppinga
* @param {mapbox-map} map - mapbox-map in which to display the current Unwetter
* @param {number} interval -
*/
function requestNewAndDisplayCurrentUnwettersEachInterval(map, interval) {

	window.setInterval(requestNewAndDisplayCurrentUnwetters, interval, map);
}



/**
* @desc
*
* @author Katharina Poppinga, Paula Scharf, Benjamin Rieke
* @param {mapbox-map} map - mapbox-map in which to display the current Unwetter
*/
function requestNewAndDisplayCurrentUnwetters(map){

	// timestamp (in Epoch milliseconds) for this whole specific request
	let currentTimestamp = Date.now();
	if (paramArray.config.current_time && paramArray.config.current_time !== null) {
		currentTimestamp = paramArray.config.current_time + (currentTimestamp - initTimestamp);
		try {
			Date.parse(currentTimestamp);
		} catch {
			console.log("The config.yaml is erroneous. Please try a different value for 'current_time'.")
			currentTimestamp = Date.now();
		}
	}

	// just keep those Unwetter in database that are included in the last 10 timesteps (last 50 minutes)
	removeOldUnwetterAndTweetsFromDB(currentTimestamp);

	// ".then" is used here, to ensure that the .......... has finished and a result is available
	// saves new requested Unwetter in database
	processUnwettersFromDWD(currentTimestamp)
	//
	.catch(console.error)
	//
	.then(function() {


		// TODO: currentTimestamp in config-yaml speichern!!
		// currentTimestamp

		// serverseitig, da require yaml nötig ist
		// ist serverseitig passend, da Unwetter eh vom Server requested werden (müssen)!!



		//
		displayCurrentUnwetters(map, currentTimestamp);

		// TODO: PROBLEM: FOLGENDES SCHREIBT AUCH IN RADAR-LEGENDE REIN,
		// FALLS NACH UNWETTER-MENÜ-AUFRUF DIREKT RADAR AUFGERUFEN WURDE UND UNWETTER NOCH VERARBEITET WERDEN!!!!
		if (paramArray.wtype != "radar"){
			// display the timestamp of the last request in the legend
			let splittedTimestamp = Date(currentTimestamp).split("(");
			let formattedTimestamp = splittedTimestamp[0];
			let timestampLastRequest = document.getElementById("timestampLastRequest");
			timestampLastRequest.innerHTML = "<b>Timestamp of last request:</b><br>" + formattedTimestamp;
		}

		// TODO: für RADARFUNKTION folgendes verwenden:
		/*
		let dataTimestamp = document.getElementById("dataTimestamp");
		dataTimestamp.innerHTML = "<b>Timestamp of data:</b><br> TODO"; // TODO: hier timestamp of radar data aus DB anfügen
		*/

	}, function(err) {
		console.log(err);
	});
}



/**
* @desc
*
* @author Katharina Poppinga, Paula Scharf, Benjamin Rieke
* @param {mapbox-map} map - mapbox-map in which to display the current Unwetter
* @param {number} currentTimestamp - in Epoch milliseconds
*/
function displayCurrentUnwetters(map, currentTimestamp) {

	// TODO: überprüfen, ob die query richtig funktioniert (nur die Unwetter aus DB nehmen, die grad aktuell sind)

	// JSON with the query for getting only all current Unwetter out of database
	let query = {
		"type":"unwetter",
		"properties.onset": '{"$lt": ' + currentTimestamp + '}',
		"properties.expires": '{"$gt":  ' + currentTimestamp + '}'
	};

	//
	promiseToGetItems(query, "all current Unwetter")
	.catch(function(error) {
		reject(error)
	})
	.then(function(response) {

		// all Unwetter that are stored in the database
		let currentUnwetters = response;

		// one feature for a Unwetter (could be heavy rain, light snowfall, ...)
		let unwetterFeature;

		// *************************************************************************************************************

		// remove layer and source of those Unwetter which are expired from map and remove its layerID from customLayerIds
		findAndRemoveOldLayerIDs(currentUnwetters);


		// iteration over all Unwetter in the database
		for (let i = 0; i < currentUnwetters.length; i++) {

			let currentUnwetterEvent = currentUnwetters[i];

			// TODO: Suchwörter anpassen, diskutieren, vom Nutzer festlegbar?


			let searchWords = [];


			// TODO: SOLLEN DIE "VORABINFORMATIONEN" AUCH REIN? :
			// FALLS NICHT, DANN RANGE ANPASSEN (VGL. ii IN CAP-DOC)
			// FALLS JA, DANN FARBEN IN fill-color ANPASSEN

			//
			let layerGroup = "undefined";
			let ii = currentUnwetterEvent.properties.ec_ii;
			// choose the correct group identifier for the Unwetter and set the searchwords for the tweetrequest accordingly
			switch (ii) {
				case (ii >= 61) && (ii <= 66):
				layerGroup = "rain";
				searchWords.push("Starkregen", "Dauerregen");
				break;
				case (ii >= 70) && (ii <= 78):
				layerGroup = "snowfall";
				searchWords.push("Schneefall");
				break;
				case ((ii >= 31) && (ii <= 49)) || ((ii >= 90) && (ii <= 96)):
				layerGroup = "thunderstorm";
				searchWords.push("Gewitter");
				break;
				case ((ii === 24) || ((ii >= 84) && (ii <= 87))):
				layerGroup = "blackice";
				searchWords.push("Blitzeis", "Glätte", "Glatteis");
				break;
				// TODO: alles für layer other später löschen
				default:
				layerGroup = "other";
				// layer other nur zu Testzwecken, daher egal, dass searchWords nicht 100%ig passen
				searchWords.push("Unwetter", "Windböen", "Nebel", "Sturm");
				break;
			}

			//
			for (let i = 0; i < currentUnwetterEvent.geometry.length; i++) {
				let currentPolygon = currentUnwetterEvent.geometry[i];
				// make a GeoJSON Feature out of the current Unwetter
				unwetterFeature = {
					"type": "FeatureCollection",
					"features": [{
						"type": "Feature",
						"geometry": currentPolygon,
						"properties": currentUnwetterEvent.properties
					}]
				};
				unwetterFeature.features[0].properties.searchWords = searchWords;
				//
				displayEvent(map, "unwetter " + layerGroup + " " + currentUnwetterEvent.dwd_id + " " + i, unwetterFeature);
			}
		}

	},function (xhr, status, error) {

		// ... give a notice that the ....... has failed and show the error on the console
		console.log("Notice ... failed.", error);
	});
}



/**
* @desc Makes a mapbox-layer out of all Unwetter/Tweets...
* and display it in the map. Colors the created layer by event-type.
*
* @author Katharina Poppinga, Benjamin Rieke, Paula Scharf
* @private
* @param {mapbox-map} map - mapbox-map in which to display the current Unwetter/Tweets/.......
* @param {String} layerID ID for the map-layer to be created
* @param {Object} eventFeatureCollection GeoJSON-FeatureCollection of ......
*/
function displayEvent(map, layerID, eventFeatureCollection) {

	// TODO: falls diese Funktion auch für Radardaten verwendet wird, dann Kommentare anpassen
	//
	let sourceObject = map.getSource(layerID);

	// if there is already an existing Source of this map with the given layerID ...
	if (typeof sourceObject !== 'undefined') {
		// ... set the data neu
		// TODO: warum folgendes nötig? warum nicht einfach alte source unverändert lassen, da dwd-id die gleiche ist und damit auch keine updates des Unwetters vorhanden sind?
		let data = JSON.parse(JSON.stringify(sourceObject._data));
		data.features = eventFeatureCollection.features;
		sourceObject.setData(data);

		// if there is no Source of this map with the given layerID ...
	} else {
		// ... add the given eventFeatureCollection withits given layerID as a Source to the map (and add it afterwards as a Layer to the map)
		map.addSource(layerID, {
			type: 'geojson',
			data: eventFeatureCollection
		});

		// Layer-adding for a Tweet with a point-geometry
		if (eventFeatureCollection.features[0].geometry.type === "Point") {
			map.addLayer({
				"id": layerID,
				"type": "symbol",
				"source": layerID,
				"layout": {
					"icon-image": ["concat", "circle", "-15"],
					"visibility" : "visible"
				}
			});

			// Layer-adding for an Unwetter with a polygon-geometry
		} else {
			// TODO: Farben anpassen und stattdessen über ec_ii mit Ziffern unterscheiden?
			// TODO: Farbdarstellungs- und -unterscheidungsprobleme, wenn mehrere Polygone sich überlagern
			// add the given Unwetter-event as a layer to the map
			map.addLayer({
				"id": layerID,
				"type": "fill",
				"source": layerID,
				"layout": {"visibility": "visible"},
				"paint": {
					"fill-color": [
						"match", ["string", ["get", "event"]],
						"FROST",
						"grey",
						"GLÄTTE",						// TODO: Farbe weiß sieht man auf der Straßenkarte mit solch geringer opacity nicht!!
						"white",
						"GLATTEIS",
						"white",
						"NEBEL",
						"grey",
						"WINDBÖEN",
						"light blue",
						"GEWITTER",
						"red",
						"STARKES GEWITTER",
						"red",
						"SCHWERES GEWITTER",
						"red",
						"SCHWERES GEWITTER mit ORKANBÖEN",
						"red",
						"SCHWERES GEWITTER mit EXTREMEN ORKANBÖEN",
						"red",
						"SCHWERES GEWITTER mit HEFTIGEM STARKREGEN",
						"red",
						"SCHWERES GEWITTER mit ORKANBÖEN und HEFTIGEM STARKREGEN",
						"red",
						"SCHWERES GEWITTER mit EXTREMEN ORKANBÖEN und HEFTIGEM STARKREGEN",
						"red",
						"SCHWERES GEWITTER mit HEFTIGEM STARKREGEN und HAGEL",
						"red",
						"SCHWERES GEWITTER mit ORKANBÖEN, HEFTIGEM STARKREGEN und HAGEL",
						"red",
						"SCHWERES GEWITTER mit EXTREMEN ORKANBÖEN, HEFTIGEM STARKREGEN und HAGEL",
						"red",
						"EXTREMES GEWITTER",
						"red",
						"SCHWERES GEWITTER mit EXTREM HEFTIGEM STARKREGEN und HAGEL",
						"red",
						"EXTREMES GEWITTER mit ORKANBÖEN, EXTREM HEFTIGEM STARKREGEN und HAGEL",
						"red",
						"STARKREGEN",
						"blue",
						"HEFTIGER STARKREGEN",
						"blue",
						"DAUERREGEN",
						"blue",
						"ERGIEBIGER DAUERREGEN",
						"blue",
						"EXTREM ERGIEBIGER DAUERREGEN",
						"blue",
						"EXTREM HEFTIGER STARKREGEN",
						"blue",
						"LEICHTER SCHNEEFALL",
						"yellow",
						"SCHNEEFALL",
						"yellow",
						"STARKER SCHNEEFALL",
						"yellow",
						"EXTREM STARKER SCHNEEFALL",
						"yellow",
						"SCHNEEVERWEHUNG",
						"yellow",
						"STARKE SCHNEEVERWEHUNG",
						"yellow",
						"SCHNEEFALL und SCHNEEVERWEHUNG",
						"yellow",
						"STARKER SCHNEEFALL und SCHNEEVERWEHUNG",
						"yellow",
						"EXTREM STARKER SCHNEEFALL und SCHNEEVERWEHUNG",
						"yellow",
						"black" // sonstiges Event
						// TODO: Warnung "Expected value to be of type string, but found null instead." verschwindet vermutlich,
						// wenn die letzte Farbe ohne zugeordnetem Event letztendlich aus dem Code entfernt wird
					],
					"fill-opacity": 0.3
				}
			});
		}

		//
		makeLayerInteractive(layerID);
		addLayerToMenu(layerID); // TODO: auch hier alte entfernen, oder passiert das eh automatisch?
		customLayerIds.push(layerID);
	}

	// https://github.com/mapbox/mapbox-gl-js/issues/908#issuecomment-254577133
	// https://docs.mapbox.com/help/how-mapbox-works/map-design/#data-driven-styles
	// https://docs.mapbox.com/help/tutorials/mapbox-gl-js-expressions/


	// TODO: oder wie folgt die Farben verwenden, die vom DWD direkt mitgegeben werden, aber diese passen vermutlich nicht zu unserem Rest?
	/*
	map.addLayer({
	"id": layerID,
	"type": "fill",
	"source": layerID,
	"paint": {
	"fill-color": ["get", "color"],
	"fill-opacity": 0.3
}
});
*/
}



/**
* @desc findAndRemoveOldLayerIDs from customLayerIds and remove jeweiligen layer und source aus map
* ...............................
*
* @author Katharina Poppinga
* @private
* @param {Array} currentUnwetters -
*/
function findAndRemoveOldLayerIDs(currentUnwetters){

	// Array in which the layerIDs of the Unwetter which shall not longer be displayed in the map will be collected (for deleting them from Array customLayerIds afterwards)
	let layerIDsToRemove = [];

	// iteration over all elements (all layerIDs) in Array customLayerIds
	for (let i = 0; i < customLayerIds.length; i++) {

		// TODO: für fehlersuche
		//	console.log(i);
		//	console.log(customLayerIds.length);

		let layerID = customLayerIds[i];

		// split the String of the layerID by space for getting the type Unwetter and the dwd_ids as isolated elements
		let layerIdParts = layerID.split(/[ ]+/);

		// layerIdParts[0] contains the type of layer-element
		if (layerIdParts[0] === "unwetter") {

			// default false stands for: layer-Unwetter is not (no longer) a current Unwetter
			let isCurrent = false;
			//
			for (let j = 0; j < currentUnwetters.length; j++) {

				// layerIdParts[2] contains the id (here: dwd_id for Unwetters)
				// if the layer-Unwetter is still a current Unwetter, set "isCurrent" to true
				if (layerIdParts[2] === currentUnwetters[j].dwd_id) {
					isCurrent = true;
				}
			}

			// if the layer-Unwetter is not (no longer) a current Unwetter, remove its ID from customLayerIds
			if (isCurrent === false) {

				// remove the corresponding layer and source from map for not displaying this Unwetter any longer
				map.removeLayer(layerID);
				map.removeSource(layerID);

				// removes 1 element at index i from Array customLayerIds
				customLayerIds.splice(i, 1);

				// for not omitting one layerID in this for-loop after removing one
				i--;
			}
		}
	}
//	console.log(customLayerIds);
}


/**
* This function makes only Unwetters and its tweets visible, if the include a polygon that is fully contained by the given
* polygon. Attention: Turf is very inaccurate.
* @author Paula Scharf
* @param polygon - a turf polygon (eg the aoi)
*/
function onlyShowUnwetterAndTweetsInPolygon(polygon) {
	customLayerIds.forEach(function(layerID) {
		// make sure to only check layers which contain an Unwetter
		if (layerID.includes("unwetter")) {
			let isInAOI = false;
			let source = map.getSource(layerID);
			// if any polygon of the layer is not contained by the given polygon, it is not inside the AOI
			source._data.features[0].geometry.coordinates[0].forEach(function(item) {
				let coordinateArray = [item];
				let currentlayerPolygon = turf.polygon(coordinateArray);
				if (turf.booleanContains(polygon, currentlayerPolygon) &&
				(typeof turf.intersect(polygon, currentlayerPolygon) !== 'undefined')) {
					isInAOI = true;
				}
			});
			// change visibility of corresponding tweet layer
			let layerIDSplit = layerID.split(/[ ]+/);


			let visibility;
			// decide if the unwetter is gonna be visible or not
			if (!isInAOI) {
				visibility = 'none';
			} else {
				visibility = 'visible';
				let currentTimestamp = Date.now();
				if (paramArray.config.current_time && paramArray.config.current_time !== null) {
					currentTimestamp = paramArray.config.current_time + (currentTimestamp - initTimestamp);
					try {
						Date.parse(currentTimestamp);
					} catch {
						console.log("The config.yaml is erroneous. Please try a different value for 'current_time'.")
						currentTimestamp = Date.now();
					}
				}

					let query = {
						twitterSearchQuery: {
							geometry: source._data.features[0].geometry,
							searchWords: source._data.features[0].properties.searchWords
						},
						eventID: layerIDSplit[2],
						currentTimestamp: currentTimestamp
					};
					$.ajax({
						// use a http POST request
						type: "POST",
						// URL to send the request to
						url: "/Twitter/tweets/",
						// type of the data that is sent to the server
						contentType: "application/json; charset=utf-8",
						// data to send to the server
						data: JSON.stringify(query),
						// timeout set to 15 seconds
						timeout: 15000
					})

					// if the request is done successfully, ...
						.done(function (result) {
							// ... give a notice on the console that the AJAX request for inserting many items has succeeded
							console.log("AJAX request (finding and inserting tweets) is done successfully.");

							if(typeof result !== "undefined") {
								try {
									let turfPolygon = turf.polygon(polygon.geometry.coordinates);
									// create an empty featurecollection for the tweets
									let tweetFeatureCollection = {
										"type": "FeatureCollection",
										"features": []
									};
									// add the tweets in the result to the featurecollection
									result.forEach(function (item) {
										if (item.id && item.location_actual !== null) {
											let tweetLocation = turf.point(item.location_actual.coordinates);
											if (turf.booleanPointInPolygon(tweetLocation, turfPolygon)) {
												let tweetFeature = {
													"type": "Feature",
													"geometry": item.location_actual,
													"properties": item
												};
												tweetFeatureCollection.features.push(tweetFeature);
											}
										}
									});
									// add the tweets to the map
									if (tweetFeatureCollection.features.length > 0) {
										displayEvent(map, "Tweet " + layerIDSplit[1] + " " + layerIDSplit[2], tweetFeatureCollection);
									}
								} catch (e) {
									console.dir("There was an error while processing the tweets from the database", e);
									// TODO: error catchen und dann hier auch den error ausgeben?
								}
							}
						})

						// if the request has failed, ...
						.fail(function (xhr, status, error) {
							// ... give a notice that the AJAX request for inserting many items has failed and show the error on the console
							console.log("AJAX request (finding and inserting tweets) has failed.", error);

							// send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
							if (error === "timeout") {
								//JL("ajaxInsertingManyItemsTimeout").fatalException("ajax: '/addMany' timeout");
							}
						});
			}
			// change visibility of unwetter layer
			map.setLayoutProperty(layerID, 'visibility', visibility);

			let layerIDTweet = "Tweet " + layerIDSplit[1] + " " + layerIDSplit[2];
			let tweetLayer = map.getLayer(layerIDTweet);

			if (typeof tweetLayer !== 'undefined') {
				map.setLayoutProperty(layerIDTweet, 'visibility', visibility);
			}
		}
	});
}



/**
* This function ensures, that all unwetters but no tweets are visible.
* @author Paula Scharf
*/
function showAllUnwetterAndNoTweets() {
	customLayerIds.forEach(function(layerID) {
		if(layerID.includes("Tweet")) {
			map.setLayoutProperty(layerID, 'visibility', 'none');
		} else {
			map.setLayoutProperty(layerID, 'visibility', 'visible');
		}
	});
}



/**
* Calls a given function (cb) for all layers of the map.
* @author Paula Scharf
* @param cb - function to perform for each layer
*/
function forEachLayer(cb) {
	map.getStyle().layers.forEach((layer) => {
		if (!customLayerIds.includes(layer.id)) return;

		cb(layer);
	});
}
