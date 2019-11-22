// jshint esversion: 6
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware 2, WiSe 2019/2020
* @author Jonathan Bahlmann, Katharina Poppinga, Benjamin Rieke, Paula Scharf
*/

// please put in your own tokens at ???

// TODO: FARBEN AUCH AN STRAßENKARTE ANPASSEN

// TODO: in tokens-Datei auslagern
mapboxgl.accessToken = 'pk.eyJ1Ijoib3VhZ2Fkb3Vnb3UiLCJhIjoiY2pvZTNodGRzMnY4cTNxbmx2eXF6czExcCJ9.pqbCaR8fTaR9q1dipdthAA';



// ****************************** global variables *****************************

// ...



// ******************************** functions **********************************

/**
* @desc Opens and closes the menu for the selection of the routes and changes the button to an X
* @param x Links the button to the function for the animation
* @author Benjamin Rieke
*/
function openMenu(x) {
x.classList.toggle("change");
var x = document.getElementById("menu");
 if (x.style.display === "none") {
   x.style.display = "block";
 } else {
   x.style.display = "none";
 }
}

/**
* @desc Creates a map (using mapbox), centered on Germany, that shows the boundary of Germany
* and all Unwetter that are stored in the database. For each Unwetter, it provides an onclick-popup with a
* description and its period of validity. Uses mapbox-gl-draw to enable drawing polygons in this map.
* ...... TWEETS-AUFRUF ERWÄHNEN ......
* This function is called, when "index.ejs" is loaded.
* @author Katharina Poppinga
*/
function showMap() {

  // an Array containing all supergroups of events, they will be used as layerIDs for the map
  let unwetterEvents = ["rain", "snowfall", "thunderstorm", "blackIce", "other"]; // have to be a Strings because addSource() needs a String for the layerID
  let tweetEvents = ["tweet"];

  // create a new map in the "map"-div
  const map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/satellite-v9',
    // TODO: basemap durch Nutzer änderbar machen: https://docs.mapbox.com/mapbox-gl-js/example/setstyle/
    // style: 'mapbox://styles/mapbox/satellite-v9',
    // style: 'mapbox://styles/mapbox/streets-v11',
    zoom: 5, // TODO: überprüfen, ob diese Zoomstufe auf allen gängigen Bildschirmgrößen Deutschland passend zeigt
    center: [10.5, 51.2], // starting position [lng, lat]: center of germany
    "overlay": {
    "type": "image",
    "url": "https://maps.dwd.de/geoserver/dwd/wms?service=WMS&version=1.1.0&request=GetMap&layers=dwd%3ARADOLAN-RY&bbox=-523.462%2C-4658.645%2C376.538%2C-3758.645&width=767&height=768&srs=EPSG%3A1000001&format=image%2Fpng",
    "coordinates": [
    [51, 7],
    [53, 9],
    [53, 7],
    [51, 9]
    ]
    }
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
        'line-cap': 'round'
      },
      'paint': {
        // TODO: passende Farbe aussuchen und bei basemap-Änderung anpassen
        'line-color': '#ffffff',
        'line-width': 1
      }
    });
    // *****************************************************************************


    // ************************ adding the functionality for toggeling the layers *************************

    var toggleableLayerIds = [ "rain", "snowfall", "thunderstorm", "blackIce", "other", 'tweet' ];

    // for every mentioned layer
    for (var i = 0; i < toggleableLayerIds.length; i++) {
    var id = toggleableLayerIds[i];

    // create an element for the menu
    var link = document.createElement('a');
    link.href = '#';
    link.className = 'active';
    link.textContent = id;

    // on click show the menu if it is not visible and hide it if it is visible
    link.onclick = function (e) {
    var clickedLayer = this.textContent;
    e.preventDefault();
    e.stopPropagation();

    var visibility = map.getLayoutProperty(clickedLayer, 'visibility');

    if (visibility === 'visible') {
    map.setLayoutProperty(clickedLayer, 'visibility', 'none');
    this.className = '';
    } else {
    this.className = 'active';
    map.setLayoutProperty(clickedLayer, 'visibility', 'visible');
    }
    };

    var layers = document.getElementById('menu');
    layers.appendChild(link);
    }



    // enable drawing the area-of-interest-polygons
    drawForAOI(map);

    // init tweetLayer
    displayTweets(map, tweetEvents[0]);


    //
    // ".then" is used here, to ensure that the asynchronos call has finished and a result is available
    saveAndReturnNewUnwetterFromDWD()
    //
    .catch(console.error)
    //
    .then(function(result) {

      // all Unwetter that are stored in the database
      let allUnwetter = result;
      console.log(result);

      // one feature for a Unwetter (could be heavy rain, light snowfall, ...)
      let unwetterFeature;

      // one array for each event-supergroup, will be filled with its corresponding Unwetter-features
      let rainFeatures = [];
      let snowfallFeatures = [];
      let thunderstormFeatures = [];
      let blackIceFeatures = [];
      // TODO: allOther später löschen, da nur zum Ausprobieren
      let allOtherFeatures = [];

      let tweetFeatures = [];


      // *************************************************************************************************************

      // iteration over all Unwetter in the database
      for (let i = 0; i < allUnwetter.length; i++) {

        let currentUnwetterEvent = allUnwetter[i];

        let multiLineString = turf.multiLineString(currentUnwetterEvent.geometry[0].coordinates[0]);
        let bbox = turf.bbox(multiLineString);
        let twitterSearchQuery = {
          geometry: bbox,
          searchWords: [],
          fromTimestamp: "201911200000",
          toTimestamp: "201911220000"
        };
        // TODO: SOLLEN DIE "VORABINFORMATIONEN" AUCH REIN? :
        // FALLS NICHT, DANN RANGE ANPASSEN (VGL. ii IN CAP-DOC)
        // FALLS JA, DANN FARBEN IN fill-color ANPASSEN

        // if the current Unwetter is of supergroup RAIN ...
        if ((currentUnwetterEvent.properties.ec_ii >= 61) && (currentUnwetterEvent.properties.ec_ii <= 66)) {
          currentUnwetterEvent.geometry.forEach(function (currentPolygon) {
            // make a GeoJSON Feature out of the current Unwetter
            unwetterFeature = {
              "type": "Feature",
              "geometry": currentPolygon,
              "properties": currentUnwetterEvent.properties
            };
            // ... add its GeoJSON Feature to the rainFeatures-array
            rainFeatures.push(unwetterFeature);
          });
          twitterSearchQuery.searchWords.push("Starkregen");
        }

        // if the current Unwetter is of supergroup SNOWFALL ...
        else if ((currentUnwetterEvent.properties.ec_ii >= 70) && (currentUnwetterEvent.properties.ec_ii <= 78)) {
          currentUnwetterEvent.geometry.forEach(function (currentPolygon) {
            // make a GeoJSON Feature out of the current Unwetter
            unwetterFeature = {
              "type": "Feature",
              "geometry": currentPolygon,
              "properties": currentUnwetterEvent.properties
            };
            // ... add its GeoJSON Feature to the snowfallFeatures-array
            snowfallFeatures.push(unwetterFeature);
          });
          twitterSearchQuery.searchWords.push("Schneefall");
        }

        // if the current Unwetter is of supergroup THUNDERSTORM ..
        else if (((currentUnwetterEvent.properties.ec_ii >= 31) && (currentUnwetterEvent.properties.ec_ii <= 49)) || ((currentUnwetterEvent.properties.ec_ii >= 90) && (currentUnwetterEvent.properties.ec_ii <= 96))) {
          currentUnwetterEvent.geometry.forEach(function (currentPolygon) {
            // make a GeoJSON Feature out of the current Unwetter
            unwetterFeature = {
              "type": "Feature",
              "geometry": currentPolygon,
              "properties": currentUnwetterEvent.properties
            };
            // ... add its GeoJSON Feature to the thunderstormFeatures-array
            thunderstormFeatures.push(unwetterFeature);
          });
          twitterSearchQuery.searchWords.push("Gewitter");
        }

        // if the current Unwetter is of supergroup BLACKICE ..
        else if ((currentUnwetterEvent.properties.ec_ii === 24) || ((currentUnwetterEvent.properties.ec_ii >= 84) && (currentUnwetterEvent.properties.ec_ii <= 87))) {
          currentUnwetterEvent.geometry.forEach(function (currentPolygon) {
            // make a GeoJSON Feature out of the current Unwetter
            unwetterFeature = {
              "type": "Feature",
              "geometry": currentPolygon,
              "properties": currentUnwetterEvent.properties
            };
            // ... add its GeoJSON Feature to the blackIceFeatures-array
            blackIceFeatures.push(unwetterFeature);
          });
          twitterSearchQuery.searchWords.push("Blitzeis");
        }

        // TODO: später löschen, da nur zum Ausprobieren
        // alle anderen Unwetter-Event-Typen:
        else {
          currentUnwetterEvent.geometry.forEach(function (currentPolygon) {
            // make a GeoJSON Feature out of the current Unwetter
            unwetterFeature = {
              "type": "Feature",
              "geometry": currentPolygon,
              "properties": currentUnwetterEvent.properties
            };
            // ... add its GeoJSON Feature to the allOtherFeatures-array
            allOtherFeatures.push(unwetterFeature);
          });
          twitterSearchQuery.searchWords.push("Unwetter");
        }

        //
        saveAndReturnNewTweetsThroughSearch(twitterSearchQuery, currentUnwetterEvent.dwd_id)
        //
            .catch(console.error)
            //
            .then(function(result) {
              result.forEach(function (item) {
                if (item.location_actual !== null) {
                  console.dir(item);
                  let tweetFeature = {
                    "type": "Feature",
                    "geometry": item.location_actual,
                    "properties": item
                  };
                  tweetFeatures.push(tweetFeature);
                }
              });
              console.dir(tweetFeatures);
              if (tweetFeatures.length > 0) {
                let tweetFeaturesGeoJSON = {
                  "type": "FeatureCollection",
                  "features": tweetFeatures
                };
                  map.getSource(tweetEvents).setData(tweetFeaturesGeoJSON)
              }
            });
      }

      // *************************************************************************************************************
      // TODO: folgendes evtl. auch modularisieren
      // make one GeoJSON-FeatureCollection for every supergroup-event-type and display its Unwetter-events in the map:

      //
      if (rainFeatures.length !== 0) {
        //
        var rainFeaturesGeoJSON = {
          "type": "FeatureCollection",
          "features": rainFeatures
        };
        displayUnwetterEvents(map, unwetterEvents[0], rainFeaturesGeoJSON);
      }

      //
      if (snowfallFeatures.length !== 0) {
        //
        var snowfallFeaturesGeoJSON = {
          "type": "FeatureCollection",
          "features": snowfallFeatures
        };
        displayUnwetterEvents(map, unwetterEvents[1], snowfallFeaturesGeoJSON);
      }

      //
      if (thunderstormFeatures.length !== 0) {
        //
        var thunderstormFeaturesGeoJSON = {
          "type": "FeatureCollection",
          "features": thunderstormFeatures
        };
        displayUnwetterEvents(map, unwetterEvents[2], thunderstormFeaturesGeoJSON);
      }

      //
      if (blackIceFeatures.length !== 0) {
        //
        var blackIceFeaturesGeoJSON = {
          "type": "FeatureCollection",
          "features": blackIceFeatures
        };
        displayUnwetterEvents(map, unwetterEvents[3], blackIceFeaturesGeoJSON);
      }

      // TODO: später löschen, da nur zum Ausprobieren
      //
      if (allOtherFeatures.length !== 0) {
        //
        var allOtherFeaturesGeoJSON = {
          "type": "FeatureCollection",
          "features": allOtherFeatures
        };
        displayUnwetterEvents(map, unwetterEvents[4], allOtherFeaturesGeoJSON);
      }

      // *************************************************************************************************************

      //
    }, function(err) {
      console.log(err);
    });


    // TODO: was gehört noch innerhalb von map.on('load', function()...) und was außerhalb?


    // TODO: popups für tweets
    let events = unwetterEvents.concat(tweetEvents);
    // loop over all event-supergroups(names)
    for (let i = 0; i < events.length; i++) {

      // map.on: 2nd parameter is the layerID

      // ************************ changing of curser style ***********************
      // https://docs.mapbox.com/mapbox-gl-js/example/hover-styles/
      // if hovering the layer, change the cursor to a pointer
      map.on('mouseenter', events[i], function() {
        map.getCanvas().style.cursor = 'pointer';
      });
      // if leaving the layer, change the cursor back to a hand
      map.on('mouseleave', events[i], function() {
        map.getCanvas().style.cursor = '';
      });


      // ************************ showing popups on click ************************
      // TODO: Popups poppen auch auf, wenn Nutzer-Polygon (Area of Interest) eingezeichnet wird. Das sollte besser nicht so sein?
      // TODO: Problem: Wenn mehrere Layer übereinander liegen, wird beim Klick nur eine Info angezeigt
      map.on('click', events[i], function(e){
        if (events[i] === "tweet") {
          showTweetPopup(map, e);
        } else {
          showUnwetterPopup(map, e);
        }
      });
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
* @param {Object} unwetterEventFeatureCollection GeoJSON-FeatureCollection of all Unwetter-events of the specific event-supergroup
*/
function displayUnwetterEvents(map, layerID, unwetterEventFeatureCollection) {

  // add the given Unwetter-event as a source to the map
  map.addSource(layerID, {
    type: 'geojson',
    data: unwetterEventFeatureCollection
  });

  // TODO: Farben anpassen und stattdessen über ec_ii mit Ziffern unterscheiden?
  // TODO: Farbdarstellungs- und -unterscheidungsprobleme, wenn mehrere Polygone sich überlagern
  // add the given Unwetter-event as a layer to the map
  map.addLayer({
    "id": layerID,
    "type": "fill",
    "source": layerID,
    "layout": {"visibility" :"visible"},
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
 * @desc Makes a mapbox-layer for all Tweets and adds it to the map.
 * The tweets are added to the layer afterwards.
 * @author Paula Scharf
 * @private
 * @param {mapbox-map} map map to which the Layer will be added
 * @param {String} layerID ID for the map-layer to be created
 */
function displayTweets(map, layerID) {

  // add the given Unwetter-event as a source to the map
  map.addSource(layerID, {
    type: 'geojson',
    data: null
  });
  map.addLayer({
    "id": layerID,
    "type": "symbol",
    "source": layerID,
    "layout": {
      "icon-image": ["concat", "circle", "-15"],
      "visibility" : "visible"
    }
  });
}

/**
* WIP
* This function could be used to assign colors to different types of weather events. It is currently not used.
* @author Paula Scharf, matr.: 450334
* @param group - name of the ec_group of Unwetter
* @returns {string}
* @example assignColor("FROST")
*/
/*function assignColor(group) {
switch (group) {
case "THUNDERSTORM":
return "#ff3333"; //red
break;
case "WIND":
return "#ecff33"; //yellow
break;
case "TORNADO":
return "#ffac33"; //orange
break;
case "RAIN":
return "#3349ff"; //blue
break;
case "HAIL":
return "#ff33f6"; //pink
break;
case "SNOWFALL":
return "#33ffe6"; //light blue/green
break;
case "SNOWDRIFT":
return "#33ff99"; //light green/blue
break;
case "FOG":
return "#beff54"; //green/yellow
break;
case "FROST":
return "#33d4ff"; //light blue
break;
case "GLAZE":
return "#6e33ff"; //purple
break;
case "THAW":
return "#00ff1f"; //green
break;
case "POWERLINEVIBRATION":
return "#d654ff"; //purple/pink
break;
case "UV":
return  "#ff547d"; //pink/red
break;
case "HEAT":
return  "#ff8354"; //orange/red
break;
}
}
*/



/**
* @desc Provides a popup that will be shown onclick for each Unwetter displayed in the map.
* The popup gives information about the period of validity and a description of the warning.
* @author Katharina Poppinga
* @private
* @param {mapbox-map} map map in which the Unwetter-features are in
* @param {Object} e ...
*/
function showUnwetterPopup(map, e) {

  // get information about the feature on which it was clicked
  var pickedUnwetter = map.queryRenderedFeatures(e.point);

  // if an instruction (to the citizen, for acting/behaving) is given by the DWD ...
  if (pickedUnwetter[0].properties.instruction !== "null") {
    // ... create a popup with the following information: event-type, description, onset and expires timestamp and a instruction
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML("<b>"+pickedUnwetter[0].properties.event+"</b>" + "<br>" + pickedUnwetter[0].properties.description + "<br><b>onset: </b>" + pickedUnwetter[0].properties.onset + "<br><b>expires: </b>" + pickedUnwetter[0].properties.expires + "<br>" + pickedUnwetter[0].properties.instruction)
    .addTo(map);
  }
  // if a instruction is not given by the DWD ...
  else {
    // ... create a popup with above information without an instruction
    new mapboxgl.Popup()
    .setLngLat(e.lngLat)
    .setHTML("<b>"+pickedUnwetter[0].properties.event+"</b>" + "<br>" + pickedUnwetter[0].properties.description + "<br><b>onset: </b>" + pickedUnwetter[0].properties.onset + "<br><b>expires: </b>" + pickedUnwetter[0].properties.expires)
    .addTo(map);
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

  // ... create a popup with the following information: event-type, description, onset and expires timestamp and a instruction
  new mapboxgl.Popup()
      .setLngLat(e.lngLat)
      .setHTML("<b>"+JSON.parse(pickedTweet[0].properties.author).name+"</b>" +
          "<br>" + pickedTweet[0].properties.statusmessage + "<br>" +
          "<b>timestamp: </b>" + pickedTweet[0].properties.timestamp + "<br>" +
          "<b>unwetter: </b>" + pickedTweet[0].properties.unwetter)
      .addTo(map);
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
    console.log("drawnPolygons-created:");
    console.log(e.features);
    // all currently drawn polygons
    let drawnPolygons = draw.getAll();
    console.log("all drawnPolygons:");
    console.log(drawnPolygons);

    // coordinates of the first [0] polygon
    //let coordinatesFirstPolygon = drawnPolygons.features[0].geometry.coordinates;

    let indexLastPolygon = drawnPolygons.features.length - 1;

    // coordinates of the firstlast polygon
    let coordinatesLastPolygon = drawnPolygons.features[indexLastPolygon].geometry.coordinates;
    console.log("coordinatesLastPolygon:");
    console.log(coordinatesLastPolygon);

    // TODO: mit coordinatesLastPolygon in Funktion für die Tweed-Suche gehen
  });


  // TODO: Absprechen, was passieren soll, wenn mehrere Polygone eingezeichnet werden

  // if a polygon is deleted ...
  map.on('draw.delete', function (e) {
    console.log("drawnPolygons-deleted:");
    console.log(e.features);
  });


  // if a polygon is edited/updated ...
  map.on('draw.update', function (e) {
    console.log("drawnPolygons-updated:");
    console.log(e.features);
  });


  // if a polygon is selected or deselected ...
  map.on('draw.selectionchange', function (e) {
    console.log("drawnPolygons-selectionchanged:");
    console.log(e.features);
  });
}
