/**
* refers to the mapbox map element
* @type {mapbox_map}
*/


function automate(){
  let automationIntervall;
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
    console.log(val);

    // if the maximum value is not reached increase value to the next int
  if (val < max) {
    val ++;
    // set the sliders value according to the current one
    $("#slider").prop("value", val)
      // in this case earthquakes from the demo json which are sorted by months
      var month = val;
      filterBy(month);
    }
   // if the maximum is reached set the value to the minimum
  else {
    val = min;
    var month = val;
    filterBy(month);
      };
        },2000);
}

else {
  return
};

$("#stopButton").click(function() {
    clearInterval(automationIntervall);
  });
};


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

});
};

////////////////////////////////////////////////////////////////////////////////Stuff for the current placeholder data

var months = [
'January',
'February',
'March',
'April',
'May',
'June',
'July',
'August',
'September',
'October',
'November',
'December'
];

function filterBy(month) {
var filters = ['==', 'month', month];
map.setFilter('earthquake-circles', filters);
map.setFilter('earthquake-labels', filters);

// Set the label to the month
document.getElementById('month').textContent = months[month];
}

var url = 'https://docs.mapbox.com/mapbox-gl-js/assets/significant-earthquakes-2015.geojson';

$.getJSON(url, function(result) {
  result.features = result.features.map(function(d) {
d.properties.month = new Date(d.properties.time).getMonth();
return d;
});

map.addSource('earthquakes', {
'type': 'geojson',
data: result
});

map.addLayer({
'id': 'earthquake-circles',
'type': 'circle',
'source': 'earthquakes',
'paint': {
'circle-color': [
'interpolate',
['linear'],
['get', 'mag'],
6,
'#FCA107',
8,
'#7F3121'
],
'circle-opacity': 0.75,
'circle-radius': [
'interpolate',
['linear'],
['get', 'mag'],
6,
20,
8,
40
]
}
});

map.addLayer({
'id': 'earthquake-labels',
'type': 'symbol',
'source': 'earthquakes',
'layout': {
'text-field': [
'concat',
['to-string', ['get', 'mag']],
'm'
],
'text-font': [
'Open Sans Bold',
'Arial Unicode MS Bold'
],
'text-size': 12
},
'paint': {
'text-color': 'rgba(0,0,0,0.5)'
}
});

// Set filter to first month of the year
// 0 = January
filterBy(0);

document
.getElementById('slider')
.addEventListener('change', function(e) {
var month = parseInt(e.target.value, 10);
filterBy(month);
});
}
);
