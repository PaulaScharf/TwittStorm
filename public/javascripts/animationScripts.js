// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/


// ****************************** global variables *****************************

let currentTimestamp = Date.now();

let usedTimestamps = [];

let outputArray = [];

let final = [];

let mask = [];

let allLayers = [];

let timestampStorage = [];

wtypeFlag = [];

var gifArray = [];





/**
* @desc Based on the showMap function in the mapbox.js file.
* minimized to fulfill the animationsmap purpose
* This function is called, when "animation.ejs" is loaded.
* @author Katharina Poppinga, Jonathan Bahlmann, Benjamin Rieke
*/

function showAnimationMap(style) {
  // Checks whether the layer menu DOM is empty and if not flushes the dom
  while (layers.firstChild) {
    layers.removeChild(layers.firstChild);
  }

  // enables the ability to choose between different mapstyles
  styleSelector();

  // declare var
  let zoomURL;
  let centerURL;
  let baseURL;

var checkedStreets = document.getElementById('navigation-guidance-day-v4')
var checkedSat = document.getElementById('satellite-v9')

  // if not yet in URL, take and update to default streets
	if (paramArray.base == undefined) {
		style = "mapbox://styles/mapbox/navigation-guidance-day-v4";
		updateURL("base", "streets");
		// otherwise use value from URL
	} else {
		baseURL = paramArray.base;
		if (baseURL === "streets") {
			style = "mapbox://styles/mapbox/navigation-guidance-day-v4";
			checkedStreets.checked ='checked';
		}
		if (baseURL === "satellite") {
			style = "mapbox://styles/mapbox/satellite-v9";
			checkedSat.checked ='checked';

		}
	}



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
  let map = new mapboxgl.Map({
    container: 'map',
    style: style,
    zoom: zoomURL,
    center: centerURL,
    preserveDrawingBuffer: true
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


    // add functionality for menu selection on radar product call
    $("#raster").click(function() {
      removeAllSource(map);

      updateURL("wtype", "radar")
      updateURL("radProd", "ry")
      wtypeFlag = "radar";
      showLegend(map, "radar", "ry");
      loadPreviousWeather(map, wtypeFlag);

      //change the menu
      var rasterMenuToggle = document.getElementById('raster');
      rasterMenuToggle.classList.add("active");
      var menuToggle = document.getElementById('severeWeatherAnimation');
      menuToggle.classList.remove("active");

    });


    // add functionality for menu selection on severeweather call
    $("#severeWeatherAnimation").click(function() {
      updateURL("wtype", "unwetter")
      wtypeFlag = "severeWeather";
      showLegend(map, "unwetter");
      loadPreviousWeather(map, wtypeFlag);

      // update the menu
      var rasterMenuToggle = document.getElementById('raster');
      rasterMenuToggle.classList.remove("active");
      var innerRasterMenuToggle = document.getElementById('rasterMenu');
      innerRasterMenuToggle.style.display = "none";



      // activate the severe weather tab
      var severeWeatherMenuToggle = document.getElementById('severeWeatherAnimation');
      severeWeatherMenuToggle.classList.add("active");
      removeAllSource(map);

    });


    let rasterMenuToggle;
    let severeWeatherMenuToggle;

    if (paramArray.wtype == "radar") {
      // set the flag to radar
      wtypeFlag = "radar";

      // toggle the menu tabs for radar and severe weather to active or not active
      rasterMenuToggle = document.getElementById('raster');
      rasterMenuToggle.classList.toggle("active");
      severeWeatherMenuToggle = document.getElementById('severeWeatherAnimation');
        severeWeatherMenuToggle.classList.remove("active");

      //  showLegend(map, "radar", paramArray.rasterProduct);

        // display rain radar
        //  requestAndDisplayAllRainRadar(map, paramArray.rasterProduct);

        loadPreviousWeather(map, wtypeFlag);
      }
      // if radarproduct is undefined
      else {
        // default radar case (rw)
        showLegend(map, "radar", "rw");
        loadPreviousWeather(map, wtypeFlag);

        updateURL("radProd", "rw");
      }
    }
    if ((paramArray.wtype === "unwetter") || (paramArray.wtype === undefined)) {

      //set URL to requested wtype
      updateURL("wtype", "unwetter");

      // set the flag to severe weather
      wtypeFlag = "severeWeather";

      // toggle the menu tabs for radar and severe weather to active or not active
      rasterMenuToggle = document.getElementById('raster');
      rasterMenuToggle.classList.remove("active");
      severeWeatherMenuToggle = document.getElementById('severeWeatherAnimation');
      severeWeatherMenuToggle.classList.add("active");

      showLegend(map, "unwetter");

      // the last Unwetter request was "hm"-milliseconds ago
      let msecsToLastUnwetterRequest = Date.now() - paramArray.config.timestamp_last_warnings_request;
      loadPreviousWeather(map, wtypeFlag);
    }

    document
    .getElementById('slider')
    .addEventListener('input', function(e) {
      //the number of the timestamp
      var timestampNum = parseInt(e.target.value, 10);
      loadAnimation(timestampNum, map);
    });
  });
  automate(map);
}



/**
* @desc adds functionality to the slider and to the pause and play buttons
* @param map links to the map
* @author Benjamin Rieke
*/
function automate(map){
  // to refer to the intervall
  let automationIntervall;

  // on playbutton click
  $("#playButton").click(function() {
    // flush the intervall

    automationIntervall = undefined;
    // value of the slider (the position)
    let val = document.getElementById('slider').value;
    // maximum of the slider
    document.getElementById('slider').max = usedTimestamps.length-1;

    var max = document.getElementById('slider').max;
    // first value of the slider
    var min = document.getElementById('slider').min;

    if (automationIntervall == undefined){

      // name the intervall to have access to it for stopping
      automationIntervall = setInterval(function(){
        // if the maximum value is not reached increase value to the next int
        if (val < max) {
          val ++;
          // set the sliders value according to the current one
          $("#slider").prop("value", val);
          // in this case earthquakes from the demo json which are sorted by months
          loadAnimation(val, map);
        }
        // if the maximum is reached set the value to the minimum
        else {

          val = min;
          $("#slider").prop("value", val);

          loadAnimation(val, map);
          createGif(gifArray)
          gifArray = [];
};
      }, 2000);
    }

    else {
      return;
    }
  });



  $("#stopButton").click(function() {
    clearInterval(automationIntervall);
  });
}


/**
* @desc Adds the desired layer, removes the others and displays the date according to the timestamp
* @param position checks at which position each timestamp is supposed to be displayed
* @author Benjamin Rieke
*/
function loadAnimation(position, map){
  // set a "marker" for the wanted position based on the available timestamps
  var posMarker = usedTimestamps[position];

  // transform the time from millseconds to date
  var time = new Date(+posMarker);
  // add to ui
  document.getElementById('timestamp').textContent = time.toUTCString();

  //check if a layer is shown
  for(let i = 0; i < allLayers.length; i++){
    // if yes remove them
    map.removeLayer(allLayers);
  }
  //flus array in case
  allLayers = [];
  // add the correct layer
  if (wtypeFlag =="radar"){
    map.addLayer({
      "id": posMarker,
      "type": "fill",
      "source": posMarker,
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
  }

  if (wtypeFlag =="severeWeather"){
    map.addLayer({
      'id': posMarker,
      'type': 'fill',
      'source': posMarker,
      'paint': {
        'fill-color': 'red',
        'fill-opacity': 0.5
      }});
    }

    // put something in the array for the for loop to check for emptiness
    allLayers.push(posMarker);
    var  gifImage = map.getCanvas().toDataURL();

    gifArray.push(gifImage);


  }


  /**
  * @desc Function provided from gif libary Gifshot
  * @param array image containig array
  * @author Benjamin Rieke
  */
  function createGif(array) {
      gifshot.createGIF({
          images: array,
          'frameDuration': 10,

      }, function (obj) {
          if (!obj.error) {
              var image = obj.image,
                  animatedImage = document.createElement('img');
              animatedImage.src = image;
              document.body.appendChild(animatedImage);
          }
      });
  }

  /**
  * @desc Performs the actual db call to retrieve the previousWeather data
  * and fits every event according to its timestamp into an array
  * @param map Links to the map
  * @author Benjamin Rieke
  */
  function loadPreviousWeather(map, weatherEv){
    //flush the storage arrays
    usedTimestamps = [];
    timestampStorage = [];

    var weatherEvent;
    if(weatherEv == "radar"){
      weatherEvent = "rainRadar/";

    }
    if (weatherEv == "severeWeather"){
      weatherEvent = "unwetter/";
    }

    $.ajax({
      // use a http GET request
      type: "GET",
      // URL to send the request to
      url: "/previousWeather/" + weatherEvent + currentTimestamp,
      // type of the data that is sent to the server
      contentType: "application/json; charset=utf-8",
      // timeout set to 15 seconds
      timeout: 15000,

      success: function() {
        $('#information').html("Retrieving previous weather events");
      }
    })

    // if the request is done successfully, ...
    .done(function (result) {
      console.log(result);

      // for every timestamp
      for (let key in result) {
        if (key == "type" || key=="length") {
        }

        else {
          //log the individual timestamp to refer to them later
          usedTimestamps.push(key);

          // flush the outputarray with each call
          outputArray = [];

          // for every unwetter in the response
          for (let j = 0; j < result[key].length; j++){

            // take every unwetter and save its coordinates
            let currentUnwetter = result[key][j].geometry;
            // gjson structure
            mask = {
              "timestamp": key,
              "type": weatherEvent,
              "geometry": {
                "type": "FeatureCollection",
              }
            };

            // put every polygon from a unwetterwarning into one array
            if (weatherEv == "severeWeather"){
              for (let i = 0; i < currentUnwetter.length; i++){
                //transform the polygon into geojson
                var polygon = goGeoJson(currentUnwetter[i].coordinates, key);
                // array to save every timestamp´s polygon
                outputArray.push(polygon);
              }
              mask.geometry.features = outputArray;

            }

            // add the current events to the geojson for each timestamp
            if (weatherEv == "radar"){
              mask.geometry.features = currentUnwetter;
            }
          }

          // add all filled geojsons to one array
          addItem(mask);
          //for dramatic purposes have the data stored in final object
          final = timestampStorage;
        }
      }

      console.log(final);

      // for every timestamp in the final object
      for (let i = 0; i < final.length; i++){
        //add the according data to an mapbox source
        addToSource(map, final[i].timestamp ,  final[i]);
      }

    })

    // if the request has failed, ...
    .fail(function (xhr, status, error) {
      // ... give a notice that the AJAX request for inserting many items has failed and show the error on the console
      console.log("Requesting previous events has failed.", error);
    });
  }



  /**
  * function to return a GeoJSON formatted Polygon
  * @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
  * @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
  * @param object the individual polygons of an event, containing the coords of a polygon
  * @param time timestamp of the data
  */
  function goGeoJson(object, time) {
    //console.log(object);
    //  console.log(object.geometry);
    var result = {
      "type":"Feature",
      "properties": {
        "class": time
      },
      "geometry": {
        "type":"Polygon",
        "coordinates": object[0]
      }
    };
    return result;
  }


  /**
  * @desc Checks if a part of an Object is already in an array
  * @param item geojson object
  * @author Benjamin Rieke
  */
  function addItem(item) {
    var index = timestampStorage.findIndex(x => x.timestamp == item.timestamp);
    if (index === -1) {
      timestampStorage.push(item);
    } else {
      console.log("object already exists");
    }
  }


  /**
  * @desc removes all weather sources and layers from the map on wtype change
  * @param map links to the map
  * @author Benjamin Rieke
  */
  function removeAllSource(map) {
  var sources = map.style.sourceCaches
  var layers = map.getStyle().layers

    for (let key in sources){
      // checks if the sources contain a numbered id
      if (!isNaN(key)){

      // if they are already in the layers
    for (let lays in layers){
      if(layers[lays].id == key){
        //remove them
      map.removeLayer(key)
    }
  }

  map.removeSource(key)
  }
}
}






  /**
  * @desc Adds a GEOJSON to the map as a source
  * @param map glinks to the map
  * @param layerID to be id of the source. in this case the timestamp
  * @param previousFeatureCollection the geojson featurecollection
  * @author Benjamin Rieke
  */
  function addToSource(map, layerID, previousFeatureCollection){

    if(previousFeatureCollection.type =="rainRadar/"){
      map.addSource(layerID, {
        type: 'geojson',
        data: previousFeatureCollection.geometry.features
      });
    }

    if(previousFeatureCollection.type =="unwetter/"){
      map.addSource(layerID, {
        type: 'geojson',
        data: previousFeatureCollection.geometry
      });
    }
  }
