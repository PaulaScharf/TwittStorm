// jshint esversion: 6
// jshint maxerr: 1000

"use strict";  // JavaScript code is executed in "strict mode"

/**
* @desc TwittStorm, Geosoftware2, WiSe2019/2020
* @author name: Jonathan Bahlmann, Katharina Poppinga, Benjmain Rieke, Paula Scharf
*/

// please put in your own tokens at ???


// TODO: in tokens-Datei auslagern
mapboxgl.accessToken = 'pk.eyJ1Ijoib3VhZ2Fkb3Vnb3UiLCJhIjoiY2pvZTNodGRzMnY4cTNxbmx2eXF6czExcCJ9.pqbCaR8fTaR9q1dipdthAA';

// create a new map in the "map"-div
const map = new mapboxgl.Map({
  container: 'map',
  style: 'mapbox://styles/mapbox/satellite-v9',
  // TODO: basemap durch Nutzer änderbar machen: https://docs.mapbox.com/mapbox-gl-js/example/setstyle/
  // style: 'mapbox://styles/mapbox/satellite-v9',
  // style: 'mapbox://styles/mapbox/streets-v11',
  zoom: 5, // TODO: überprüfen, ob diese Zoomstufe auf allen gängigen Bildschirmgrößen Deutschland passend zeigt
  center: [10.5, 51.2], // starting position [lng, lat]: center of germany
});


// add zoom and rotation controls to the map
map.addControl(new mapboxgl.NavigationControl());
// TODO: pan-Button fehlt noch



// specify and add a control for drawing a polygon into the map (draw-interactions have to be coded AFTER map.on('load'... )
var draw = new MapboxDraw({
  displayControlsDefault: false, // all controls to be off by default for self-specifiying the controls as follows
  controls: {
    polygon: true,
    trash: true // for deleting a drawn polygon
  }
});
map.addControl(draw);


//
map.on('load', function () {

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


  // Loads the GEOJSON from the DWD Geoserver and displays the current Unwetterareas
  $.getJSON('https://maps.dwd.de/geoserver/dwd/ows?service=WFS&version=1.0.0&request=GetFeature&typeName=dwd%3AWarnungen_Gemeinden_vereinigt&maxFeatures=50&outputFormat=application%2Fjson', function(data) {

    // get coordinates of .... ???
    var coordinates = data.features[0].geometry.coordinates;

    // TODO: folgendes löschen, da zu Beginn Deutschland komplett und daher auch mittig gezeigt werden soll?
    //map.jumpTo({ 'center': coordinates[0][0][0], 'zoom': 5 });

    //console.log(coordinates);
    //console.log(data.features.length);

    //
    for (let i = 0; i < data.features.length; i++) {
      var unwetterId = "";
      unwetterId = i.toString();
      //
      var color;
      var r = Math.floor(Math.random() * 255);
      var g = Math.floor(Math.random() * 255);
      var b = Math.floor(Math.random() * 255);
      color = "rgb(" +r+ " ," +g+ "," +b+ ")";
      //console.log(i);
      //console.log(unwetterId);

      var output = data.features[i];
      //console.log(output);

      displayUnwetter(unwetterId, output, color);
    }
  });
});



// ************************ drawn polygons ************************
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
});


// if a polygon is deleted ...
map.on('draw.delete', function (e) {
  console.log("drawnPolygons-deleted:");
  console.log(e.features);
});


// if a polygon is updated ...
map.on('draw.update', function (e) {
  console.log("drawnPolygons-updated:");
  console.log(e.features);
});


// if a polygon is selected or deselected ...
map.on('draw.selectionchange', function (e) {
  console.log("drawnPolygons-selectionchanged:");
  console.log(e.features);
});

// ****************************************************************


/**
* @desc displays the current unwetters with the fitting event target
* @author Benjamin Rieke
* @param unwetterID index for the JSON file
* @param output the given JSON response
* @param color a random color
*/
function displayUnwetter(unwetterId, output, color) {

  //
  var marker;
  var popup;

  console.log(output.properties.EVENT);
  // change for desired weather event
  if (output.properties.EVENT == 'WINDBÖEN'){
    // add it to the map
    map.addSource(unwetterId, { type: 'geojson', data: output});

    map.addLayer({
      "id": unwetterId,
      "type": "fill",
      "source": unwetterId,
      'paint': {
        'fill-color': color,
        'fill-opacity': 0.6
      }
    });

    // create popup according to the area
    popup = new mapboxgl.Popup({ offset: 25 })
    .setText(output.properties.EVENT);
    // create marker
    marker = new mapboxgl.Marker({className: 'my-class', color: 'gray'})
    .setLngLat(output.geometry.coordinates[0][0][0])
    .setPopup(popup)
    .addTo(map);
  }

  //
  if (output.properties.EVENT == 'FROST'){
    // add it to the map
    map.addSource(unwetterId, { type: 'geojson', data: output});

    map.addLayer({
      "id": unwetterId,
      "type": "fill",
      "source": unwetterId,
      'paint': {
        'fill-color': color,
        'fill-opacity': 0.6
      }
    });

    // create popup according to the area
    popup = new mapboxgl.Popup({ offset: 25 })
    .setText(output.properties.EVENT);
    // create marker
    marker = new mapboxgl.Marker({className: 'my-class', color: 'gray'})
    .setLngLat(output.geometry.coordinates[0][0][0])
    .setPopup(popup)
    .addTo(map);
  }
}
