// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



// ****************************** global variables *****************************

// TODO: JSDoc für globale Variablen




// ******************************** functions **********************************

/**
* @desc
*
*
* @author Katharina Poppinga
* @private
* @param {mapbox-map} map - mapbox-map for and in which to display the legend
* @param {String} typeOfLegend - unwetter or radar
* @param {String} product type of rain radar: ry, rw or sf
*/
function showLegend(map, typeOfLegend, product) {

	// first remove some old DOM elements
	while (legend.hasChildNodes()) {
		legend.removeChild(legend.firstChild);
	}


	let paraTypeOfLegend = document.createElement("p"); // create a html-paragraph
	paraTypeOfLegend.id = "typeOfLegend"; // set ID of the html-paragraph
	legend.appendChild(paraTypeOfLegend);

	let values = [];
	let colors = [];
	let dataSource = document.getElementById("dataSource");
	let dataTimestamp = document.getElementById("dataTimestamp");
	let timestampLastRequest = document.getElementById("timestampLastRequest");
	let refreshRate = document.getElementById("refreshRate");
	let posAccuracy = document.getElementById("posAccuracy");


	// ******************************* legend for Unwetter *******************************
	if (typeOfLegend === "unwetter") {

		// set titel of legend
		paraTypeOfLegend.innerHTML = "<b>Severe weather</b>";
		// set info for data timestamps
		dataTimestamp.innerHTML = "<b>Timestamp of data:</b><br>Differs for each warning,<br>see popups in map.";
		// set positional accuracy
		posAccuracy.innerHTML = "<b>Positional accuracy of data:</b><br>TODO! local authority level";

		// TODO: BESSER MACHEN, INFOS DIREKT AUS LAYERN NEHMEN?? NICHT DIREKT MÖGLICH, DA JEDER TYPE VIELE LAYER HAT
		//let allCurrentLayers = map.getStyle().layers;
		// TODO: ABSTIMMEN MIT DISPLAY VON EINZELNEN TYPES ÜBER BUTTON
		// TODO: an endgültige Farben und feinere Farbabstufungen anpassen
		values = ["Rain", "Snowfall", "Thunderstorm", "Black ice", "Other"]
		colors = ["blue", "yellow", "red", "white", "grey"];
	}


	// ****************************** legend for rain radar ******************************
	if (typeOfLegend === "radar") {

		// set titel of legend
		paraTypeOfLegend.innerHTML = "<b>Depth of precipitation</b>";

		//
		let productType = document.createElement("p"); // create a html-paragraph
		productType.id = "productType"; // set ID of the html-paragraph
		paraTypeOfLegend.appendChild(productType);

		//
		dataTimestamp.innerHTML = "<b>Timestamp of data:</b><br>TODO"; // TODO: in radar-js-datei den timestamp of radar data aus DB anfügen
		posAccuracy.innerHTML = "<b>Positional accuracy of data:</b><br>1 km";

		let classes = [];
		// last value of last class is not needed, it is just any much to big value for including all bigger values than in the three lower classes

		switch (product) {
			case (product = "ry"): // 5 min
			productType.innerHTML = "Rain radar product type:<br><b>Sum of 5 min (RY)</b>";
			classes = [[0,0.01,1],[0.01,0.034,2],[0.034,0.166,3],[0.166,10000,4]];
			break;
			case (product = "rw"): // 60 min
			productType.innerHTML = "Rain radar product type:<br><b>Sum of 60 min (RW)</b>";
			classes = [[0,0.25,1],[0.25,1,2],[1,5,3],[5,10000,4]];
			break;
			case (product = "sf"): // 24 h
			productType.innerHTML = "Rain radar product type:<br><b>Sum of 24 h (SF)</b>";
			classes = [[0,6,1],[6,24,2],[24,120,3],[120,10000,4]];
			break;
		}

		values = [("> " + classes[0][0] + " mm to " + classes[0][1] + " mm"), ("> " + classes[1][0] + " mm to " + classes[1][1] + " mm"), ("> " + classes[2][0] + " mm to " + classes[2][1] + " mm"), ("> " + classes[3][0] + " mm")];
		colors = ["#b3cde0", "#6497b1", "#03396c", "#011f4b"];
	}


	// ****************************** legend for both ******************************

	let l;
	// for-loop over every element-pair (value and color) for the legend
	for (l = 0; l < values.length; l++) {
		let legendElements = document.createElement('div');
		legendElements.id = "legendElements";

		let colorKey = document.createElement('span');
		colorKey.className = 'colorKey';
		colorKey.style.backgroundColor = colors[l];

		let value = document.createElement('span');
		value.innerHTML = values[l];

		legendElements.appendChild(colorKey);
		legendElements.appendChild(value);
		legend.appendChild(legendElements);
	}

	//
	dataSource.innerHTML = "<b>Data source:</b><br><img id='DWD_Logo' src='../css/DWD_Logo.png' alt='Deutscher Wetterdienst'>";
	timestampLastRequest.innerHTML = "<b>Timestamp of last request:</b><br>";
	let refreshRateValue = paramArray.config.refresh_rate;
	refreshRate.innerHTML = "<b>Refresh rate:</b><br>" + refreshRateValue + " ms  (&#8773 " + msToMin(refreshRateValue) + " min)";
}



/**
* https://stackoverflow.com/questions/21294302/converting-milliseconds-to-minutes-and-seconds-with-javascript
*/
function msToMin(ms) {
	var min = Math.floor(ms / 60000);
	var sec = ((ms % 60000) / 1000).toFixed(0);
	return min + ":" + (sec < 10 ? '0' : '') + sec;
}



/**
* @desc
*
* @author Katharina Poppinga
* @param {} directionToPan - the direction in which the map to pan: left, right, up or down
*/
function panMapWithButton(directionToPan) {

	// TODO: so noch unsinnig, da Verschiebung um x Grad nicht abhängig von Zoomlevel ist

	let center = map.getCenter();
	let newCenter;

	switch (directionToPan) {
		case (directionToPan = "left"):
		newCenter = [center.lng - 1, center.lat];
		break;
		case (directionToPan = "right"):
		newCenter = [center.lng + 1, center.lat];
		break;
		case (directionToPan = "up"):
		newCenter = [center.lng, center.lat + 1];
		break;
		case (directionToPan = "down"):
		newCenter = [center.lng, center.lat - 1];
		break;
	}

	map.panTo(newCenter);
	// map.panBy();
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
* This function adds a layer (identified by the given layerID) to the layer-menu.
* The layer-menu makes it possible to toggle layers on and off.
* @author Benjamin Rieke
* @param {String} layerID - ID of a layer
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
* @desc Opens and closes the menu for the selection of the routes and changes the button to an X
* @param button Links the button to the function
* @param menu Id of the menu that is supposed to open/close
* @author Benjamin Rieke
*/
function openMenu(button, menu) {

	// if a radar product is selected automatically open up the radar submenu
	if (wtypeFlag == "radar") {
		var innerRasterMenuToggle = document.getElementById('rasterMenu');
		innerRasterMenuToggle.style.display = "block";
	}
	// if severe weather is selected automatically open up the severe weather submenu
	else {
			var innerUnwetterMenuToggle = document.getElementById('menu');
			innerUnwetterMenuToggle.style.display = "block";
	};


	// displays the germany boundary button if is not visible
	var boundaryButtonToggle = document.getElementById('germanyButton');
	if (boundaryButtonToggle.style.display === "none"){
		boundaryButtonToggle.style.display = "block";
	}
	// the germany button is also used as an indicator to see if the menus are open
	// if that is the case all menus will be closed when the main layer menu button is pressed
	else {
		closeAllMenus();
	};

	// displays the requested submenus
	button = document.getElementById(menu.id);
	if (button.style.display === "none") {
		button.style.display = "block";
		boundaryButtonToggle.style.display = "block";
	} else {
		button.style.display = "none";
	};
}



/**
* @desc Closes all open submenus on click
* @author Benjamin Rieke
*/
function closeAllMenus() {
	// Hides the raster sub menu if it is still open
	var innerRasterMenuToggle = document.getElementById('rasterMenu');
	if (innerRasterMenuToggle.style.display == "block"){
		innerRasterMenuToggle.style.display = "none"
	};

	// Hides the severe weather sub menu if it is still open
	var innerUnwetterMenuToggle = document.getElementById('menu');
	if (innerUnwetterMenuToggle.style.display == "block"){
		innerUnwetterMenuToggle.style.display = "none"
	};

	// Hides germany boundary button if it is still shown
	var boundaryButtonToggle = document.getElementById('germanyButton');
	if (boundaryButtonToggle.style.display == "block"){
		boundaryButtonToggle.style.display = "none"
	};
}



/**
* @desc Removes or adds the boundary of germany on click
* @author Benjamin Rieke
*/
function removeAddGermany(){

	// uses the visibility attribute of a mapbox layer
	var visibility = map.getLayoutProperty("boundaryGermany", 'visibility');

	// if the visibility is set to visible hide it
	if (visibility == "visible") {
		map.setLayoutProperty("boundaryGermany", 'visibility', 'none');
	}
	// if not display it
	else {
		map.setLayoutProperty("boundaryGermany", 'visibility', 'visible');
	}
}



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



/**
* @desc Uses the styles that are set on the index page to switch between them on click of the switcher field
* @author Benjamin Rieke
*/
function styleSelector(){
	// Takes the map styles from the selection on the index page
	let layerList = document.getElementById('styleMenu');
	let inputs = layerList.getElementsByTagName('input');

	for (var i = 0; i < inputs.length; i++) {
		inputs[i].onclick = switchLayer;
	}
}


/**
* @desc Loads the chosen radar product, updates the url, and hides previous selected layers
* @author Benjamin Rieke
* @param product -The desired radar product. CHeck the github wiki for further informations
*/
function loadRaster(product){

	// set flag to radar
	wtypeFlag = "radar";

	// hide all severe weather polygons
	removeUnwetter();

	console.log("Loading your requested radar product");
	// update the URL
	updateURL('wtype', 'radar');
	updateURL('radProd', product);

	showLegend(map, "radar", product);

	// if no rainradar data is displayed load the requested product
	if (map.style.sourceCaches.rainRadar == undefined){

		requestAndDisplayAllRainRadar(map, product, "dwd");
	}
	// if a radar product is already on display remove it first
	else {
		map.removeLayer('rainRadar')
		map.removeSource('rainRadar')

		requestAndDisplayAllRainRadar(map, product, "dwd");
	};

	// add active attribute to radar tab
	var rasterMenuToggle = document.getElementById('raster');
	rasterMenuToggle.classList.add("active");
}



/**
* @desc Hides the Unwetter polygons, based on the findAndRemoveOldLayerIDs function. Also changes the severeweather Tab to not active
* @author Benjamin Rieke, Katharina Poppinga
*/
function removeUnwetter(){

	// remove every available severe weather polygon
	for (let i = 0; i < customLayerIds.length; i++) {

		let layerID = customLayerIds[i];

		// split the String of the layerID by space for getting the type Unwetter and the dwd_ids as isolated elements
		let layerIdParts = layerID.split(/[ ]+/);

		// layerIdParts[0] contains the type of layer-element
		if (layerIdParts[0] === "Unwetter") {

				// remove the corresponding layer and source from map for not displaying this Unwetter any longer
				map.removeLayer(layerID);
				map.removeSource(layerID);
				console.log("removed unwetter");

				// removes 1 element at index i from Array customLayerIds
				customLayerIds.splice(i, 1);

				// for not omitting one layerID in this for-loop after removing one
				i--;

			};
}
// remove the active attribute from the severe weather tab
var menuToggle = document.getElementById('severeWeather');
menuToggle.classList.remove("active");
// hide the svere weather sub menu
var selectionToggle = document.getElementById('menu');
selectionToggle.style.display = "none";

}



/**
* @desc Loads the Unwetterpolygons, updates the url, and hides previous selected radar data
* @author Benjamin Rieke
*/
function loadSevereWeather(){
	// set flag to severeWeather
	wtypeFlag = "severeWeather";
	// update the url
	updateURL('wtype', 'unwetter');
	updateURL('radProd', '');

	showLegend(map, "unwetter");

	// if no rainradar is displayed simply show polygons
	if (map.style.sourceCaches.rainRadar == undefined){
		requestNewAndDisplayCurrentUnwetters(map);
	}
	// if not remove them first
	else {
		map.removeLayer('rainRadar')
		map.removeSource('rainRadar')
		requestNewAndDisplayCurrentUnwetters(map);
	};

	//display all available severe weather polygons
	map.style._order.forEach(function(layer) {
		let mapLayer = layer;

		if (mapLayer.includes("Unwetter other") ) {
			map.setLayoutProperty(layer, 'visibility', 'visible');
		}
	});

	// deavtivate the raster menu
	var rasterMenuToggle = document.getElementById('raster');
	rasterMenuToggle.classList.remove("active");
	var innerRasterMenuToggle = document.getElementById('rasterMenu');
	innerRasterMenuToggle.style.display = "none";

	//uncheck all raster products
	var innerRasterCheckToggle1 = document.getElementById('radio1');
	innerRasterCheckToggle1.checked = false;
	var innerRasterCheckToggle2 = document.getElementById('radio2');
	innerRasterCheckToggle1.checked = false;
	var innerRasterCheckToggle3 = document.getElementById('radio3');
	innerRasterCheckToggle3.checked = false;


	// activate the severe weather tab
	var severeWeatherMenuToggle = document.getElementById('severeWeather');
	severeWeatherMenuToggle.classList.add("active");
}



// ********************************** POP-UPS **********************************

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
	// TODO: Problem: Popups poppen auch auf, wenn Nutzer-Polygon (Area of Interest) eingezeichnet wird. Das sollte besser nicht so sein?
	// TODO: Problem: Wenn mehrere Layer übereinander liegen, wird beim Klick nur eine Info angezeigt
	map.on('click', layerID, function (e) {
		if (layerID.includes("Tweet")) {
			showTweetPopup(map,e);
		} else {
			showUnwetterPopup(map,e);
		}
	});
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

		// TODO: später source im Popup herauslöschen, momentan nur nötig für entwicklung

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
		let idAsString = pickedTweet[0].properties.idstr;
		// ... create a popup with the following information: ........
		new mapboxgl.Popup()
		.setLngLat(e.lngLat)
		.setHTML("<div id='" + idAsString + "'></div>")
		.addTo(map);
		twttr.widgets.createTweet(
			idAsString,
			document.getElementById(idAsString),
			{
				width: 1000,
				dnt: true
			}
		);
	}
}

// *****************************************************************************
