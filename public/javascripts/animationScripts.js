




/**
* @desc Based on the showMap function in the mapbox.js file.
*minimized to fulfill the animationsmap purpose
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

    loadPreviousWeather(map);

    document
    .getElementById('slider')
    .addEventListener('input', function(e) {
      //the number of the timestamp
    var timestampNum = parseInt(e.target.value, 10);
loadAnimation(timestampNum, map)
  });

});
automate(map);

};


function automate(map){
  let automationIntervall;

  $("#playButton").click(function() {
  // flush the intervall
  console.log(automationIntervall);
  // value of the slider (the position)
  val = document.getElementById('slider').value
  // maximum of the slider
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
    $("#slider").prop("value", val)
      // in this case earthquakes from the demo json which are sorted by months
      loadAnimation(val, map);
    }
   // if the maximum is reached set the value to the minimum
  else {
    val = min;
    loadAnimation(val, map);
      };
        },2000);
}

else {
  return
};
});

$("#stopButton").click(function() {
    clearInterval(automationIntervall);
  });
};



currentTimestamp = Date.now();


var usedTimestamps = [];

var outputArray = [];

var allLayers = [];

function loadAnimation(position, map){
  var posMarker = usedTimestamps[position];

  console.log(map.style.sourceCaches);


  var time = new Date(+posMarker);

  document.getElementById('timestamp').textContent = time.toUTCString();


  for(let i = 0; i < allLayers.length; i++){
    map.removeLayer(allLayers);
  }
allLayers = [];
  map.addLayer({
'id': posMarker,
'type': 'fill',
'source': posMarker,
'layout': {},
'paint': {
'fill-color': '#f08',
'fill-opacity': 0.1
}});

allLayers.pop();
allLayers.push(posMarker);

}

//arrays to store all unwetters from a timestamp
final = [];

mask = [];

timestampStorage = [];


function loadPreviousWeather(map){

$.ajax({
  // use a http GET request
  type: "GET",
  // URL to send the request to
  url: "/previousWeather/" + "unwetter/" + currentTimestamp,
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
  //  console.log(result);
    // ... give a notice on the console that the AJAX request for inserting many items has succeeded
    for (let key in result) {
      if (key == "type"){
      }
      else {
        usedTimestamps.push(key)

outputArray = [];
// for every unwetter in the response
  for (let j = 0; j < key.length; j++){
  //  console.log(result[key][j].geometry);



//outputArray = [];

    // take every unwetter

      // and save their coordinates
      let currentPolygon = result[key][j].geometry;

//store them in one array
outputArray.push(currentPolygon)
console.log(outputArray);


var resulta = {
  "type": "Feature",
  "geometry": {
    "type": "Polygon",
    "coordinates": [
      currentPolygon
    ]
  }
};

//object form for the gjson
mask = {
  "timestamp": key,
  "type": "FeatureCollection",
  "features": []
};


//console.log(outputArray);
/*
for (let i = 0; i < usedTimestamps.length; i++){
if (usedTimestamps[i] == key){
  if (i == 0){
  mask.features.push(outputArray)
  //console.log(first);
  }
  if (i == 1){

  mask.features.push(outputArray);


  }


}


}
*/
mask.features.push(outputArray);


  };
addItem(mask);
final = timestampStorage;
};


}
console.log(final);

for (i = 0; i < final.length; i++){
addToSource(map, final[i].timestamp ,  final[i]);
}
})

  // if the request has failed, ...
  .fail(function (xhr, status, error) {
    // ... give a notice that the AJAX request for inserting many items has failed and show the error on the console
    console.log("Requesting previous events has failed.", error);
  });
}


//checks if a object with a timestamp is already in
function addItem(item) {
  var index = timestampStorage.findIndex(x => x.timestamp == item.timestamp)
  if (index === -1) {
    timestampStorage.push(item);
  }else {
    console.log("object already exists")
  }
}


function addToSource(map, layerIDs, previousFeatureCollection){


    map.addSource(layerIDs, {
      type: 'geojson',
      data: previousFeatureCollection
    });


}
