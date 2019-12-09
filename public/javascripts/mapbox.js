// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/

// please define your own tokens at tokens.js

// TODO: FARBEN AUCH AN STRAßENKARTE ANPASSEN

// TODO: löschen, da nicht benötigt??
mapboxgl.accessToken = 'pk.eyJ1Ijoib3VhZ2Fkb3Vnb3UiLCJhIjoiY2pvZTNodGRzMnY4cTNxbmx2eXF6czExcCJ9.pqbCaR8fTaR9q1dipdthAA';

// ****************************** global variables *****************************

// TODO: JSDoc für globale Variablen

// refers to the layer menu
var layers = document.getElementById('menu');

// refers to the mapbox map element
let map;

// referes to all the layers that are not defaults
let customLayerIds = [];


// ******************************** functions **********************************

/**
* @desc Creates a map (using mapbox), centered on Germany, that shows the boundary of Germany
* and all Unwetter that are stored in the database. For each Unwetter, it provides an onclick-popup with a
* description and its period of validity. Uses mapbox-gl-draw to enable drawing polygons in this map.
* ...... TWEETS-AUFRUF ERWÄHNEN ......
* This function is called, when "index.ejs" is loaded.
* @author Katharina Poppinga
*/
function showMap(style) {

	//
	removeOldUnwetterFromDB();

	// Checks if the layer menu DOM is empty and if not flushes the dom
	while (layers.firstChild) {
		layers.removeChild(layers.firstChild);
	}

	// declare var
	let zoomURL;
	let centerURL;
	// if not yet in URL, use standard
	if(paramArray.mapZoom == undefined) {
		zoomURL = 5;
		// otherwise use value from URL
	} else {
		zoomURL = paramArray.mapZoom;
	}
	// see above
	if(paramArray.mapCenter == undefined) {
		centerURL = [10.5, 51.2];
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
	//TODO get initial map postion also from url
	map.on('moveend', function() {
		updateURL('mapZoom', map.getZoom());
		let center = map.getCenter();
		let centerString = "[" + center.lng + ", " + center.lat + "]";
		updateURL('mapCenter', centerString);
	});

	// add zoom and rotation controls to the map
	map.addControl(new mapboxgl.NavigationControl());
	// TODO: pan-Button fehlt noch


	// ************************ adding boundary of Germany *************************
	// TODO: evtl. in eigene Funktion auslagern, der Übersicht halber

	// this event is fired immediately after all necessary resources have been downloaded and the first visually complete rendering of the map has occurred
	map.on('load', function() {
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
		// *****************************************************************************

		// enable drawing the area-of-interest-polygons
		drawForAOI(map);

  	// Rain Radar Data
		if(paramArray.wtype == "radar") {
			if(paramArray.rasterClassification == undefined) {
				paramArray.rasterClassification = 'dwd';
			}
			if(paramArray.rasterProduct != undefined) {
					requestAndDisplayAllRainRadar(map, paramArray.rasterProduct, paramArray.rasterClassification);
			} else {
				requestAndDisplayAllRainRadar(map, 'rw', 'dwd');
			}
		}

		if(paramArray.wtype == "unwetter") {
			requestNewAndDisplayCurrentUnwetters(map, Date.now());
		}
		//to be able to still use localhost:3000/
		if(paramArray.wtype == undefined) {
			requestNewAndDisplayCurrentUnwetters(map, Date.now());
		}
		//
		// TODO: Zeit auf 5 Minuten ändern!!!
		window.setInterval(requestNewAndDisplayCurrentUnwetters, 300000, map, Date.now());

		// TODO: was gehört noch innerhalb von map.on('load', function()...) und was außerhalb?

	});
}

// ************************************* block about rain radar ****************************************
/**
  * @desc This function requests and displays Rain Radar data
  * @author Katharina Poppinga, Paula Scharf, Benjamin Rieke, Jonathan Bahlmann
  * @param map the map to display data in
  * @param product the radarProduct, see API wiki on github
  * @param classification classification method, see API wiki on github
  */
function requestAndDisplayAllRainRadar(map, product, classification) {
  // Rain Radar Data
  saveRainRadar(product, classification)
    .catch(console.error)
    .then(function(result) {
      //result is array of rainRadar JSONs
      //result[result.length - 1] is most recent one -- insert variable
      //console.log(result[result.length - 1]);

      result = result[result.length - 1];
      map.addSource("rainRadar", {
        "type": "geojson",
        "data": result.geometry
      });
      map.addLayer({
        "id": "rainRadar",
        "type": "fill",
        "source": "rainRadar",
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
      customLayerIds.push('rainRadar');
    });
}

//***************************************************************************************************

/**
* @desc
*
* @author Katharina Poppinga, Paula Scharf, Benjamin Rieke
* @param map -
* @param {number} currentTimestamp - in Epoch milliseconds
*/
function requestNewAndDisplayCurrentUnwetters(map, currentTimestamp){

	// ".then" is used here, to ensure that the .......... has finished and a result is available
	// saves new requested Unwetter in database
	processUnwettersFromDWD(currentTimestamp)
	//
	.catch(console.error)
	//
	.then(function() {

		//
		displayCurrentUnwetters(map, currentTimestamp);


		// TODO: FALLS DISPLAY... SCHON EINMAL AUFGERUFEN WURDE, DANN NUR NOCH NEUE Unwetter als Map-Layer hinzufügen
		// dazu Paulas Layer-Änderung abwarten


	}, function(err) {
		console.log(err);
	});
}



/**
* @desc
*
* @author Katharina Poppinga, Paula Scharf, Benjamin Rieke
* @param map -
* @param {number} currentTimestamp - in Epoch milliseconds
*/
function displayCurrentUnwetters(map, currentTimestamp) {


	// TODO: überprüfen, ob die query richtig funktioniert (nur die Unwetter aus DB nehmen, die grad aktuell sind)

	// JSON with ....... query
	let query = {
		"properties.onset": '{"$lt": ' + currentTimestamp + '}',
		"properties.expires": '{"$gt":  ' + currentTimestamp + '}'
	};
	promiseToGetItems(query)
		.catch(function(error) {
			reject(error)
		})
		.then(function(response) {
		console.log(response);

		// all Unwetter that are stored in the database
		let currentUnwetters = response;

		// one feature for a Unwetter (could be heavy rain, light snowfall, ...)
		let unwetterFeature;

		let tweetFeatures = [];


		// *************************************************************************************************************

		// iteration over all Unwetter in the database
		for (let i = 0; i < currentUnwetters.length; i++) {

			let currentUnwetterEvent = currentUnwetters[i];

			// TODO: Suchwörter anpassen, diskutieren, vom Nutzer festlegbar?


			let twitterSearchQuery = {
				geometry: currentUnwetterEvent.geometry,
				searchWords: []
			};
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
						twitterSearchQuery.searchWords.push("Starkregen", "Dauerregen");
						break;
					case (ii >= 70) && (ii <= 78):
						layerGroup = "snowfall";
						twitterSearchQuery.searchWords.push("Schneefall");
						break;
					case ((ii >= 31) && (ii <= 49)) || ((ii >= 90) && (ii <= 96)):
						layerGroup = "thunderstorm";
						twitterSearchQuery.searchWords.push("Gewitter");
						break;
					case ((ii === 24) || ((ii >= 84) && (ii <= 87))):
						layerGroup = "blackice";
						twitterSearchQuery.searchWords.push("Blitzeis", "Glätte", "Glatteis");
						break;
					// TODO: alles für layer other später löschen
					default:
						layerGroup = "other";
						// layer other nur zu Testzwecken, daher egal, dass searchWords nicht 100%ig passen
						twitterSearchQuery.searchWords.push("Unwetter", "Windböen", "Nebel", "Sturm");
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
				displayEvents(map, "Unwetter " + layerGroup + " " + currentUnwetterEvent.dwd_id + " " + i, unwetterFeature);
			}
			checkForExistingTweets(currentUnwetterEvent.dwd_id, currentTimestamp)
				.catch(console.error)
				.then(function (result) {
					if (!result) {
						retrieveTweets(twitterSearchQuery, currentUnwetterEvent.dwd_id, currentUnwetterEvent.properties.event, currentTimestamp);
					}
				})
		}


	},function (xhr, status, error) {

		// ... give a notice that the AJAX request for reading all current Unwetter has failed and show the error on the console
		console.log("AJAX request (reading all current Unwetter) has failed.", error);

		// send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
		//  if (error === "timeout") {
		//    JL("ajaxReadingAllCurrentUnwetterTimeout").fatalException("ajax: '/db/readCurrentUnwetters' timeout");
		//  }

	});
}


/**
 * Retrieves tweets for a specific Unwetter from the twitter api, saves them in the database and displays them on the map.
 * @author Paula Scharf
 * @param twitterSearchQuery - object containing parameters for the search-request
 * @param dwd_id - the id of the specific unwetter
 * @param dwd_event - the event-name of the unwetter
 * @param currentTime
 */
function retrieveTweets(twitterSearchQuery, dwd_id, dwd_event, currentTime) {
	//
	saveNewTweetsThroughSearch(twitterSearchQuery, dwd_id, dwd_event, currentTime)
	// show errors in the console
	.catch(console.error)
	// process the result of the requests
	.then(function () {
	}, function (reason) {
		console.dir(reason);
	});
}


/**
* This function adds a layer (identified by the given layerID) to the layer-menu.
* The layer-menu makes it possible to toggle layers on and of.
* @author Benjamin Rieke
* @param {String} layerID - id of a layer
*/
function addLayerToMenu(layerID) {
	// split layerID on whitspace
	let layerParts = layerID.split(/[ ]+/);
	let groupName = layerParts[1];
	// if the groupName is not 'undefined' do the following...
	if (groupName) {
		// check if there is already a menu element for the group
		let layerGroupAlreadyIncluded = false;
		layers.childNodes.forEach(function (item) {
			if (item.innerText === groupName) {
				layerGroupAlreadyIncluded = true;
			}
		});
		// if the manu does not contain an element for the group do the following...
		if (!layerGroupAlreadyIncluded) {
			// create an element for the menu
			var link = document.createElement('a');
			link.href = '#';
			link.className = 'active';
			link.textContent = groupName;

			// on click show the menu if it is not visible and hide it if it is visible
			link.onclick = function (e) {
				if (this.className) {
					this.className = '';
				} else {
					this.className = 'active';
				}
				// 'this' changes scoop in the loop, so the contents of the link have to be outsourced
				let content = this.textContent;
				let classname = this.className;
				customLayerIds.forEach(function (item) {
					// if the current Id ('item') contains the name of the group do the following
					if (item.includes(content)) {
						e.preventDefault();
						e.stopPropagation();

						// if the menuitem is activated show the layer
						if (classname) {
							map.setLayoutProperty(item, 'visibility', 'visible');
						}
						// if not hide the layer
						else {
							map.setLayoutProperty(item, 'visibility', 'none');
						}
					}
				});
			};

			// add the layers to the menu
			layers.appendChild(link);
		}
	}
}


/**
* This method makes elements of a specific layer (identified by layerID) clickable and gives them Popups.
* @author Katharina Poppinga
* @param {String} layerID - ID of a layer
*/
function makeLayerInteractive(layerID) {
	// ************************ changing of curser style ***********************
	// https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
	// if hovering the layer, change the cursor to a pointer
	map.on('mouseenter', layerID, function () {
		map.getCanvas().style.cursor = 'pointer';
	});
	// if leaving the layer, change the cursor back to a hand
	map.on('mouseleave', layerID, function () {
		map.getCanvas().style.cursor = '';
	});

	// ************************ showing popups on click ************************
	// TODO: Popups poppen auch auf, wenn Nutzer-Polygon (Area of Interest) eingezeichnet wird. Das sollte besser nicht so sein?
	// TODO: Problem: Wenn mehrere Layer übereinander liegen, wird beim Klick nur eine Info angezeigt
	map.on('click', layerID, function (e) {
		if (layerID.includes("Tweet")) {
			showTweetPopup(map,e);
		} else {
			showUnwetterPopup(map,e);
		}
	});
}


/**
* @desc Makes a mapbox-layer out of all Unwetter of a specific event-supergroup (rain, snowfall, ...)
* and display it in the map. Colors the created layer by event-type.
* @author Katharina Poppinga, Benjamin Rieke
* @private
* @param {mapbox-map} map map to which the Unwetter will be added
* @param {String} layerID ID for the map-layer to be created, is equivalent to the Unwetter-event-supergroup
* @param {Object} eventFeatureCollection GeoJSON-FeatureCollection of all Unwetter-events of the specific event-supergroup
*/
function displayEvents(map, layerID, eventFeatureCollection) {
	//
	let source = map.getSource(layerID);

	if (typeof source !== 'undefined') {
		let data = JSON.parse(JSON.stringify(source._data));
		data.features = eventFeatureCollection.features;
		source.setData(data);

	} else {
		// add the given Unwetter-event as a source to the map
		map.addSource(layerID, {
			type: 'geojson',
			data: eventFeatureCollection
		});

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
						"GLÄTTE",
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
		addLayerToMenu(layerID);
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


// TODO: Popups scrollbar machen oder enthaltenen Text kürzen??

/**
* @desc Provides a popup that will be shown onclick for each Unwetter displayed in the map.
* The popup gives information about the period of validity and a description of the warning.
* @author Katharina Poppinga
* @private
* @param {mapbox-map} map map in which the Unwetter-features are in
* @param {Object} e ...
*/
function showUnwetterPopup(map, e) {

	if (e) {
		// get information about the feature on which it was clicked
		var picked = map.queryRenderedFeatures(e.point);

		// TODO: Sommerzeit im Sommer??

		if (picked[0].source.includes("Unwetter")) {
			// if an instruction (to the citizen, for acting/behaving) is given by the DWD ...
			if (picked[0].properties.instruction !== "null") {
				// ... create a popup with the following information: event-type, description, onset and expires timestamp (as MEZ) and an instruction
				new mapboxgl.Popup()
					.setLngLat(e.lngLat)
					.setHTML("<b>" + picked[0].properties.event + "</b>" + "<br>" + picked[0].properties.description + "<br><b>onset: </b>" + new Date(picked[0].properties.onset) + "<br><b>expires: </b>" + new Date(picked[0].properties.expires) + "<br>" + picked[0].properties.instruction)
					.addTo(map);
			}
			// if a instruction is not given by the DWD ...
			else {
				// ... create a popup with above information without an instruction
				new mapboxgl.Popup()
					.setLngLat(e.lngLat)
					.setHTML("<b>" + picked[0].properties.event + "</b>" + "<br>" + picked[0].properties.description + "<br><b>onset: </b>" + new Date(picked[0].properties.onset) + "<br><b>expires: </b>" + new Date(picked[0].properties.expires))
					.addTo(map);
			}
		}
	}
}


/**
* @desc Provides a popup that will be shown onclick for each Tweet displayed in the map.
* The popup gives information about the author, the message content and time of creation
* @author Paula Scharf
* @private
* @param {mapbox-map} map map in which the Unwetter-features are in
* @param {Object} e ...
*/
function showTweetPopup(map, e) {
	// get information about the feature on which it was clicked
	var pickedTweet = map.queryRenderedFeatures(e.point);

	if (pickedTweet[0].source.includes("Tweet")) {
		// ... create a popup with the following information: event-type, description, onset and expires timestamp and a instruction
		new mapboxgl.Popup()
			.setLngLat(e.lngLat)
			.setHTML("<b>" + JSON.parse(pickedTweet[0].properties.author).name + "</b>" +
				"<br>" + pickedTweet[0].properties.statusmessage + "<br>" +
				"<b>timestamp: </b>" + pickedTweet[0].properties.timestamp + "<br>" +
				"<b>unwetter: </b>" + pickedTweet[0].properties.unwetter_Event)
			.addTo(map);
	}
}



/**
* @desc Enables drawing polygons in a map, using mapbox-gl-draw.
* Drawn polygons can be edited and deleted.
* ...... TWITTERWEITERVERARBEITUNG ......
*
* @author Katharina Poppinga
* @param {mapbox-map} map map in which the polygons shall be drawn
*/
function drawForAOI(map) {

	// specify and add a control for DRAWING A POLYGON into the map
	var draw = new MapboxDraw({
		displayControlsDefault: false, // all controls to be off by default for self-specifiying the controls as follows
		controls: {
			polygon: true,
			trash: true // for deleting a drawn polygon
		}
	});
	map.addControl(draw);


	// ************************ events for drawn polygons ************************
	// https://github.com/mapbox/mapbox-gl-draw/blob/master/docs/API.md

	// if a polygon is drawn ...
	map.on('draw.create', function (e) {
		// all currently drawn polygons
		let data = draw.getAll();

		let pids = [];

		// ID of the added feature
		const lid = data.features[data.features.length - 1].id;

		data.features.forEach((f) => {
			if (f.geometry.type === 'Polygon' && f.id !== lid) {
				pids.push(f.id)
			}
		});
		draw.delete(pids);

		zoomToCoordinates(e.features[0].geometry.coordinates[0]);
		onlyShowUnwetterAndTweetsInPolygon(turf.polygon(e.features[0].geometry.coordinates));
	});


	// TODO: Absprechen, was passieren soll, wenn mehrere Polygone eingezeichnet werden

	// if a polygon is deleted ...
	map.on('draw.delete', function (e) {
		showAllUnwetterAndNoTweets();
	});


	// if a polygon is edited/updated ...
	map.on('draw.update', function (e) {
		zoomToCoordinates(e.features[0].geometry.coordinates[0]);
		onlyShowUnwetterAndTweetsInPolygon(turf.polygon(e.features[0].geometry.coordinates));
	});


	// if a polygon is selected or deselected ...
	map.on('draw.selectionchange', function (e) {
		console.log("drawnPolygons-selectionchanged:");
		console.log(e.features);
	});
}

/**
 * Zoom to the given Coordinates.
 * @author https://gist.github.com/aerispaha/826a9f2fbbdf37983dc01e6074ce7cd7
 * @param coordinates
 */
function zoomToCoordinates(coordinates) {
	// Pass the first coordinates in the Polygon to `lngLatBounds` &
	// wrap each coordinate pair in `extend` to include them in the bounds
	// result. A variation of this technique could be applied to zooming
	// to the bounds of multiple Points or Polygon geomteries - it just
	// requires wrapping all the coordinates with the extend method.
	let bounds = coordinates.reduce(function(bounds, coord) {
		return bounds.extend(coord);
	}, new mapboxgl.LngLatBounds([coordinates[0], coordinates[0]]));

	map.fitBounds(bounds, {
		padding: 20
	});
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
		if (layerID.includes("Unwetter")) {
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

				//let layerProperties = source._data.features[0].properties;
				promiseToGetItems({type: "Tweet", unwetter_ID: layerIDSplit[2]})
				// show errors in the console
					.catch(console.error)
					// process the result of the requests
					.then(function (result) {
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
									displayEvents(map, "Tweet " + layerIDSplit[1] + " " + layerIDSplit[2], tweetFeatureCollection);
								}
							} catch (e) {
								console.dir("there was an error while processing the tweets from the database", e);
								// TODO: error catchen und dann hier auch den error ausgeben?
							}
						}
					}, function (reason) {
						console.dir(reason);
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
* @desc Opens and closes the menu for the selection of the routes and changes the button to an X
* @param button Links the button to the function for the animation
* @param menu Id of the menu that is supposed to open/close
* @author Benjamin Rieke
*/
function openMenu(button, menu) {

	// TODO: warum wird hier button neu definiert?
	button = document.getElementById(menu.id);
	if (button.style.display === "none") {
		button.style.display = "block";
	} else {
		button.style.display = "none";
	}
}

// ************************ adding the functionality for toggeling the map styles *************************

// TODO: zu globalen Variablen schreiben:
// Takes the map styles from the selection on the index page
var layerList = document.getElementById('styleMenu');
var inputs = layerList.getElementsByTagName('input');


/**
 * @desc Calls the showMap function with the desired mapstyle that is chosen from the selection on the indexpage
 * @param layer - The chosen maplayer style
 * @author Benjamin Rieke, Paula Scharf
 */
function switchLayer(layer) {
	const savedLayers = [];
	const savedSources = {};
	forEachLayer((layer) => {
		savedSources[layer.source] = map.getSource(layer.source).serialize();
		savedLayers.push(layer);
	});

	//Takes the id from the layer and calls the showMap function
	var layerId = layer.target.id;
	map.setStyle('mapbox://styles/mapbox/' + layerId);

	setTimeout(() => {
		Object.entries(savedSources).forEach(([id, source]) => {
			if (typeof map.getSource(id) === 'undefined') {
				map.addSource(id, source);
			}
		});

		savedLayers.forEach((layer) => {
			if (typeof map.getLayer(layer.id) === 'undefined') {
				map.addLayer(layer);
			}
		});
	}, 1000);
}



// TODO: folgendes in eine Funktion schreiben:
for (var i = 0; i < inputs.length; i++) {
	inputs[i].onclick = switchLayer;
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

/**
* Changes the style of a menu selector to active on klick
* @author Benjamon Rieke
*/

$(function () {
    //var $lists = $('.list-group li').click(function(e) {

    $(".selector").click(function () {
        $(this).toggleClass("active");
    });
	})
