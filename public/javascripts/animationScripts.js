// jshint esversion: 8
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/



// TODO: EINTEILUNG DER WARNINGS IN TYPES (RAIN; SNOWFALL; THDUNDERSTORM; BLACK ICE) FEHLT FÜR ANIMATION NOCH

// ****************************** global variables *****************************

// TODO: dies in Funktion schreiben??
// is there a timestamp?
let currentTimestamp = Date.now();
if (typeof paramArray.timestamp !== "undefined") {
  // none found, create "now"
  currentTimestamp = paramArray.timestamp;
  try {
    Date.parse(currentTimestamp);
  } catch {
    console.log("The URL is erroneous. Please try a different value for 'timestamp'.");
    currentTimestamp = Date.now();
  }
}


/**
* refers to the layer menu
* @type {mapbox_map}
*/
let animationMap;


// TODO: JSDoc für globale Variablen

let usedTimestamps = [];
// all individual events from a timestamp get temporally stored in here
let outputArray = [];
// contains the sources in geojson format
let final = [];
// a geojson mask
let mask = [];
// an array where all active layers are stored
let allLayers = [];
// stores all geojsons with their timestamps
let timestampStorage = [];
// indicates which weathertype is requested
wtypeFlag = [];
// adds up canvasshots from the map in base64 format
var imageArray = [];
// the final output to create a gif from
var gifArray = [];
// the intervall that is started with the animation and used to stop it
var automationIntervall;
// gives the information that the styleswitcher is on the animation page
var indicator = "";
// // gives the wtype information to the style since the paramarray wont change
var wIndicator = "";


// TODO: showAnimationMap-Funktion modularisieren UND/ODER anpassen an showMap-Funktion, neues von dort übernehmen!!

/**
* @desc Based on the showMap function in the mapbox.js file.
* minimized to fulfill the animationsmap purpose
* This function is called, when "animation.ejs" is loaded.
* @author Katharina Poppinga, Jonathan Bahlmann, Benjamin Rieke
*/
function showAnimationMap(style) {
indicator ="animation"
  // Checks whether the layer menu DOM is empty and if not flushes the dom
  while (layers.firstChild) {
    layers.removeChild(layers.firstChild);
  }

  // declare var
  let baseURL;
  let zoomURL;
  let centerURL;

  var checkedStreets = document.getElementById('navigation-guidance-day-v4');
  var checkedSat = document.getElementById('satellite-v9');

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

  // if not yet in URL, get value from config.yaml
  if (paramArray.mapZoom == undefined) {
    zoomURL = paramArray.config.map.zoom;
    updateURL("mapZoom", zoomURL);
    // otherwise use value from URL
  } else {
    zoomURL = paramArray.mapZoom;
  }

  // if not yet in URL, get value from config.yaml
  if (paramArray.mapCenter == undefined) {
    centerURL = paramArray.config.map.center;
    updateURL("mapCenter", centerURL);
    // otherwise use value from URL
  } else {
    centerURL = JSON.parse(paramArray.mapCenter);
  }

  // if not yet in URL, use default warnings
  if (paramArray.wtype == undefined) {
    updateURL("wtype", "unwetter");
    paramArray.wtype = "unwetter"; // TODO: dieses löschen, wenn weiter unten auch angepasst an readURL()...
  }

  // create new map with variable zoom and center
  animationMap = new mapboxgl.Map({
    container: 'animationMap',
    style: style,
    zoom: zoomURL,
    center: centerURL,
    preserveDrawingBuffer: true
  });

  // update URL when moving the map
  animationMap.on('moveend', function() {
    updateURL('mapZoom', animationMap.getZoom());
    let center = animationMap.getCenter();
    let centerString = "[" + center.lng + "," + center.lat + "]";
    updateURL('mapCenter', centerString);
  });

  // add zoom and rotation controls to the map
  animationMap.addControl(new mapboxgl.NavigationControl());

  // enables the ability to choose between different mapstyles
  styleSelector(animationMap);

  // ************************ adding boundary of Germany *************************
  // TODO: evtl. in eigene Funktion auslagern, der Übersicht halber

  // this event is fired immediately after all necessary resources have been downloaded and the first visually complete rendering of the map has occurred
  animationMap.on('load', function() {
    // resize map to full screen
    animationMap.resize();
    // for a better orientation, add the boundary of germany to the map
    animationMap.addLayer({
      'id': 'boundaryGermany',
      'type': 'line',
      'source': {
        'type': 'geojson',
        'data': boundaryGermany
      },
      'layout': {
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
      reloadAnimation('radar');
    });


    // add functionality for menu selection on severeweather call
    $("#severeWeatherAnimation").click(function() {
      reloadAnimation('unwetter');
    });

    let rasterMenuToggle = document.getElementById('raster');
    let severeWeatherMenuToggle = document.getElementById('severeWeatherAnimation');
    if (paramArray.wtype == "radar") {
      // set the flag to radar
      wtypeFlag = "radar";

      // toggle the menu tabs for radar and severe weather to active or not active
      rasterMenuToggle.classList.toggle("active");
      severeWeatherMenuToggle.classList.remove("active");

      showLegend(animationMap, "radar", "rw");
      loadPreviousWeather(animationMap, wtypeFlag);
    }

    if ((paramArray.wtype === "unwetter") || (paramArray.wtype === undefined)) {

      //set URL to requested wtype
      updateURL("wtype", "unwetter");
      // set the flag to severe weather
      wtypeFlag = "severeWeather";

      // toggle the menu tabs for radar and severe weather to active or not active
      rasterMenuToggle.classList.remove("active");
      severeWeatherMenuToggle.classList.add("active");
      //display the legend according to the weathertype
      showLegend(animationMap, "unwetter");

      // the last Unwetter request was "hm"-milliseconds ago
      let msecsToLastUnwetterRequest = Date.now() - paramArray.config.timestamp_last_warnings_request;
      loadPreviousWeather(animationMap, wtypeFlag);
    }

    // add manual functionality for the slider
    document
    .getElementById('slider')
    .addEventListener('input', function(e) {
      let val = document.getElementById('slider').value;
      // maximum of the slider
      document.getElementById('slider').max = usedTimestamps.length-1;
      //the number of the timestamp
      var timestampNum = parseInt(e.target.value, 10);
      loadAnimation(timestampNum, animationMap);
      //reset the imageArray
      imageArray = [];
    });

    //enable the animation functionality
    automate(animationMap);
  });

}


/**
* @desc combines several functions to reload the animation for the chosen weather type
* @param wType the desired type of weather
* @author Benjamin Rieke
*/
function reloadAnimation(wType){
  var rasterMenuToggle = document.getElementById('raster');
  var severeWeatherMenuToggle = document.getElementById('severeWeatherAnimation');
  var innerRasterMenuToggle = document.getElementById('rasterMenu');
  var menuToggle = document.getElementById('severeWeatherAnimation');


  // when another animation is running stop it first
  clearInterval(automationIntervall);
  // remove all old sources
  removeAllSource(animationMap);
  closeAllPopups();
  //if the weathertype is severeweather
  if (wType == 'unwetter'){
  // weathertype indicator for style switcher
  wIndicator = wType;
  //update the URL
  updateURL("wtype", "unwetter");
  // set the weathertype
  wtypeFlag = "severeWeather";
  //display the legend
  showLegend(animationMap, "unwetter");
  //request the previous weather
  loadPreviousWeather(animationMap, wtypeFlag);

  // update the menu
  rasterMenuToggle.classList.remove("active");
  innerRasterMenuToggle.style.display = "none";

  // activate the severe weather tab
  severeWeatherMenuToggle.classList.add("active");
  }
  //if the weathertype is radar
  else {
    // weathertype indicator for style switcher
    wIndicator = wType;
    //update the URL
    updateURL("wtype", "radar");
    updateURL("radProd", "ry");
    // set the weathertype
    wtypeFlag = "radar";
    //display the legend
    showLegend(animationMap, "radar", "ry");
    //request the previous weather
    loadPreviousWeather(animationMap, wtypeFlag);
    // update the menu
    rasterMenuToggle.classList.add("active");
    menuToggle.classList.remove("active");
  };

  // set the animation slider to the first position
  $("#slider").prop("value", 0);
  // in case the weathertype is changed during the animation unbind the button
  $("#playButton").unbind();
  // change image to play icon
  $("#pauseplay").attr("src", "/css/iconfinder_icon-play.svg");
  //and reset everything
  automate(animationMap);
  //flush the image array
  imageArray = [];
  //flush the layer array
  allLayers = [];
  //flush the gif array
  gifArray = [];
  // reset the downloadbutton and its popups
  $("#downloadButton").css({'background-color': 'darkgrey'});
  $('#downloadButton').prop('title', 'Please wait for one animation cycle!');
  $('#downloadPopup').html('You have to wait for one animation cycle!');
  $("#downloadPopup").css({'background-color': 'DimGray'});

}


/**
* @desc adds functionality to the slider and to the pause, play and download buttons
* @param map links to the map
* @author Benjamin Rieke
*/
function automate(map){

  // on playbutton click
  $("#playButton").click(function play() {

    // flush the intervall
    automationIntervall = undefined;
    // value of the slider (the position)
    let val = document.getElementById('slider').value;
    // maximum of the slider
    document.getElementById('slider').max = usedTimestamps.length-1;

    var max = document.getElementById('slider').max;
    // first value of the slider
    var min = document.getElementById('slider').min;

    // initialize the animation
    loadAnimation(0, map);

    // name the intervall to have access to it for stopping
    automationIntervall = setInterval(function(){
      // if the maximum value is not reached increase value to the next int
      if (val < max) {
        val ++;
        // set the sliders value according to the current one
        $("#slider").prop("value", val);
        // load the layers for the timestamp on the val position
        loadAnimation(val, map);
        //save the current map canvas as a base64 formatted array entry
        takeScreenshot();
      }
      // if the maximum is reached set the value to the minimum
      else {
        val = min;
        $("#slider").prop("value", val);
        // load the layers for the timestamp on the val position
        loadAnimation(val, map);
        //save the current map canvas as a base64 formatted array entry
        takeScreenshot();
      }
    }, 2000);

    // after using the playpausebutton once unbind its function
    $("#playButton").unbind();
    // change image to pause icon
    $("#pauseplay").attr("src", "/css/iconfinder_icon-pause.svg");

    // add new functionality to it so it stops the animation
    $("#playButton").click(function() {
      clearInterval(automationIntervall);
      // unbind its function again
      $("#playButton").unbind();
      // change image to play icon
      $("#pauseplay").attr("src", "/css/iconfinder_icon-play.svg");
      // and afterwards set it back to its original functionality
      $("#playButton").click(function() {
        play();
      });
    });
  }
);
}

// TODO: in onload-Funktion?
// functionality for the download button
$("#downloadButton").click(function() {
  // set reference for the popup
  var popup = document.getElementById("downloadPopup");
  // if the gifarray is not empty
  if(gifArray.length){
    // create a gif with the images from the last displayed animation cycle
    createGif(gifArray);
    $('#downloadPopup').html('Your animation download will start in a few seconds');
  }

  //avoid multiple click events
  if (popup.classList[1] != "show"){
    // show the popup
    popup.classList.toggle("show");
    // hide the popup after some time
    setTimeout(function(){
      popup.classList.toggle("show");
    }, 4000);
  }
});


/**
* @desc Uses the html2canvas libary to take a screenshot of the map div
* and then saves that base64 encoded screenshot in the image array
* @author Benjamin Rieke
*/
function takeScreenshot(){
  //save the current map canvas as a base64 formatted array entry
  html2canvas(document.querySelector("#animationMap")).then(function(canvas){
    var gifImage = canvas.toDataURL('image/jpeg');
    imageArray.push(gifImage);
    // activate the downloadbutton if ready
    setToReady();
  });
}


/**
* @desc check if the imageArray is uptodate with the amount of used
* timestamps and if so set the download in a ready state
* @author Benjamin Rieke
*/
function setToReady(){
  // when the imageArray has as many entries as the animation does
  if (imageArray.length == usedTimestamps.length){
    // adjust the button and the popup
    $("#downloadButton").css({'background-color': 'white'});
    $('#downloadButton').prop('title', 'Download the current animation');
    $('#downloadPopup').html('Now you can click to download');
    $("#downloadPopup").css({'background-color': 'green'});

    // pass the results to a new array for the conversion to a gif file
    gifArray = imageArray;
    // flush the array so there are never more images than timestempsa
    imageArray = [];
  }
}



/**
* @desc Adds the desired layer, removes the others and displays the date according to the timestamp
* @param position checks at which position each timestamp is supposed to be displayed
* @param map
* @author Benjamin Rieke
*/
function loadAnimation(position, map){
  // set a "marker" for the wanted position based on the available timestamps
  var posMarker = usedTimestamps[position];

  // transform the time from milliseconds to date
  var time = new Date(+posMarker);
  posMarker = "unwetter " + posMarker;
  // add to UI
  document.getElementById('timestamp').textContent = time.toUTCString();

  //check if a layer is shown
  for (let i = 0; i < allLayers.length; i++){
    // if yes remove them
    map.removeLayer(allLayers);
  }
  closeAllPopups();

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
      "paint": {
        "fill-color": [
          "match", ["string", ["get", "event"]],
          "GLÄTTE",
          "yellow",
          "GLATTEIS",
          "yellow",
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
          "darkviolet",
          "SCHNEEFALL",
          "darkviolet",
          "STARKER SCHNEEFALL",
          "darkviolet",
          "EXTREM STARKER SCHNEEFALL",
          "darkviolet",
          "SCHNEEVERWEHUNG",
          "darkviolet",
          "STARKE SCHNEEVERWEHUNG",
          "darkviolet",
          "SCHNEEFALL und SCHNEEVERWEHUNG",
          "darkviolet",
          "STARKER SCHNEEFALL und SCHNEEVERWEHUNG",
          "darkviolet",
          "EXTREM STARKER SCHNEEFALL und SCHNEEVERWEHUNG",
          "darkviolet",
          "black" // sonstiges Event
          // TODO: Warnung "Expected value to be of type string, but found null instead." verschwindet vermutlich,
          // wenn die letzte Farbe ohne zugeordnetem Event letztendlich aus dem Code entfernt wird
        ],
        "fill-opacity": 0.3
      }
    });
  }

  makeLayerInteractive(map,posMarker);
  // put something in the array for the for loop to check for emptiness
  allLayers.push(posMarker);
}


/**
* @desc Function provided from gif libary Gifshot
* @param array image containig array
* @author Benjamin Rieke
*/
function createGif(array) {
  var date = new Date();
  var utc = date.toJSON().slice(0,10).replace(/-/g,'/');
  var time = date.toLocaleTimeString();
  var filename = utc + '/'+time;

  gifshot.createGIF({
    images: array,
    'frameDuration': 10,
    'gifWidth': 800,
    'gifHeight': 400,
  }, function (obj) {
    if (!obj.error) {
      var image = obj.image;
      download(image, filename, 'image/gif');
    }
  });
}


/**
* @desc Performs the actual db call to retrieve the previousWeather data
* and fits every event according to its timestamp into an array
* @param map Links to the map
* @param weatherEv -
* @author Benjamin Rieke
*/
function loadPreviousWeather(map, weatherEv){
  // flush the storage arrays
  usedTimestamps = [];
  timestampStorage = [];

  var weatherEvent;
  if (weatherEv == "radar"){
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
    // ... give a notice on the console that the AJAX request for reading previous weather has succeeded
    console.log("AJAX request (reading previous weather) is done successfully.");
    console.log(result);
    // for every timestamp
    for (let key in result) {
      if (key == "type" || key == "length") {
        // TODO: ????
      }

      else {
        // log the individual timestamp to refer to them later
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
            // also save the according weather event
            let currentProperties = result[key][j].properties;
            for (let i = 0; i < currentUnwetter.length; i++){
              //transform the polygon into geojson
              var polygon = goGeoJson(currentUnwetter[i].coordinates, key, currentProperties);
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
      addToSource(map, "unwetter " + final[i].timestamp ,  final[i]);
    }
  })

  // if the request has failed, ...
  .fail(function (xhr, status, error) {
    // ... give a notice that the AJAX request for reading previous weather has failed and show the error on the console
    console.log("Reading previous weather has failed.", error);

    // send JSNLog message to the own server-side to tell that this ajax-request has failed because of a timeout
    if (error === "timeout") {
      JL("ajaxReadingPreviousWeatherTimeout").fatalException("ajax: '/previousWeather/weatherEvent/currentTimestamp' timeout");
    }
    // TODO: testen, ob so richtig
    else {
      JL("ajaxReadingPreviousWeatherError").fatalException(error);
    }
  });
}


/**
* function to return a GeoJSON formatted Polygon
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
* @param object - the individual polygons of an event, containing the coords of a polygon
* @param time - timestamp of the data
* @param properties - properties of the event
*/
function goGeoJson(object, time, properties) {

  var result = {
    "type":"Feature",
    "properties": properties,
    "geometry": {
      "type":"Polygon",
      "coordinates": object[0]
    }
  };
  result.properties["class"] = time;
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
    console.log("Object already exists.");
  }
}


/**
* @desc removes all weather sources and layers from the map on wtype change
* @param map links to the map
* @author Benjamin Rieke
*/
function removeAllSource(map) {
  var sources = map.style.sourceCaches;
  var layers = map.getStyle().layers;

  for (let key in sources){
    // checks if the sources contain a numbered id
    if (!isNaN(key)){

      // if they are already in the layers
      for (let lays in layers){
        if(layers[lays].id == key){
          //remove them
          map.removeLayer(key);
        }
      }
      map.removeSource(key);
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

  if (previousFeatureCollection.type =="rainRadar/"){
    map.addSource(layerID, {
      type: 'geojson',
      data: previousFeatureCollection.geometry.features
    });
  }

  if (previousFeatureCollection.type =="unwetter/"){
    map.addSource(layerID, {
      type: 'geojson',
      data: previousFeatureCollection.geometry
    });
  }
}
