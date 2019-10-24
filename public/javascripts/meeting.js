// jshint esversion: 6


//do two routes meet?
//Create a Layergroup for the markers
var layerGroup = L.layerGroup().addTo(map);
// layer for intersecting routes
var secRoutesToDelete = [];
var markerText = [];
//On start load the meetingpoints
$(document).ready(function() {
  readPoints();
});
/**
  * function getAllRoutes is button response function for calculate meetings button
  * gets JSON routes from db
  * calls next function
  * @author Jonathan Bahlmann
  */
function getAllRoutes() {
  let routesJSON = [];
// When called remove all existing markers
layerGroup.clearLayers();


  $.getJSON('/users/routes', function(data) {
    //for each, do
    $.each(data, function(index) {
      routesJSON.push(JSON.stringify(this));
    });
    meetingsArray.length = 0;

    checkForMeetings(routesJSON);
  });

}

/**
  * @desc Initializes the comparison of all routes with a chosen route
  * is the callback function to the '/users/routes' JSON call to make sure
  * it is done when this func is called.
  * @param allRoutes All routes that are currently in the database
  * @author Jonathan Bahlmann
  */
function checkForMeetings(allRoutes) {
  //allRoutes is array with route-strings in JSON format
  //get firstLine from input textarea
  var firstLine = document.getElementById("routeInQuestion").value;
  if (firstLine == ''){
    alert("Please select your route");
  }
  else
  //flush markertext array
markerText.length = 0;
  //calculate meeting Points for all routes
  for(let i = 0; i < allRoutes.length; i++) {
    if(firstLine != allRoutes[i]) {
      lineStringsIntersect(firstLine, allRoutes[i]);
    }
  }
}

//array of featureCollections
var meetingsArray = [];


/**
  * @desc Checks if two choosen routes are intersecting eachother
  * Uses turf.js
  * @see https://turfjs.org/
  * @param firstLine The chosen route that gets checked for intersections
  * @param secondLine Another route that gets checked for intersections with the first one
  * @author Benjamin Rieke 408743
  */
var counter = 0;
function lineStringsIntersect(firstLine, secondLine) {
  console.log("lSI called with 1: " + JSON.parse(firstLine).name + " 2: " + JSON.parse(secondLine).name);
  //lines geometry
  var l1 = JSON.parse(firstLine);
  var l2 = JSON.parse(secondLine);
  //console.log(l1);
  //GeoJSON of intersections
  var intersects = turf.lineIntersect(l1.features[0].geometry, l2.features[0].geometry);
  // for each intersection do
  for(let i = 0; intersects.features[i]; i++) {

    intersects.features[i].properties.firstUsername = l1.username;
    intersects.features[i].properties.secondUsername = l2.username;
    intersects.features[i].properties.firstID = l1._id;
    intersects.features[i].properties.secondID = l2._id;
    intersects.features[i].properties.firstType = l1.routeType;
    intersects.features[i].properties.secondType = l2.routeType;
    intersects.features[i].properties.intersectNumber = counter;
    intersects.features[i].properties.intersectRootRoute = l2.features[0].geometry.coordinates;

    //increase the counter to keep track
    counter ++;

    //console.log(JSON.stringify(intersects.features[i]));
    var meetingPoint = (intersects.features[i].geometry.coordinates);
    // switch lat and long for display on leaflet
    intersects.features[i].geometry.coordinates = [meetingPoint[1], meetingPoint[0]];
    //push to meetingsArray
    meetingsArray.push(intersects.features[i]);
    let thisPoint = intersects.features[i];
// print the interscetions into a table
    intersectOutput();
// get the weather for each individual intersection
    xhrGetWeather(thisPoint.geometry.coordinates[0], thisPoint.geometry.coordinates[1], handleWeather, thisPoint, meetingsArray);

  }
}



/**
  * this function handles the xhr request to openweathermap
  * @author Joanthan Bahlmann
  * @param lat Latitude
  * @param lon Longitude
  * @param cFunc callback function for successful request
  * @param i index passed down into cFunc
  */
function xhrGetWeather(lat, lon, cFunc, meetingPoint, meetingsArray) {
  console.log("xhrGetWeather called");
  var url = "https://api.openweathermap.org/data/2.5/weather?lat="+lat+"&lon="+lon+"&appid="+token.owm;
  var xhttp = new XMLHttpRequest();
  //when ready
  xhttp.onreadystatechange = function() {
    if(this.readyState == 4 && this.status == 200) {
      cFunc(this, meetingPoint);
    }
  };
  xhttp.open("GET", url, true);
  xhttp.send();
  console.log("xhr send");
}

/**
  * this function handles the xhttp response from OWMTOKEN
  * it saves the weather into a table, creates a marker at the found weather position
  * also the additional information xhr requests are called from here, depending on the weather code
  * @author Jonathan Bahlmann
  * @param xhttp xhttp responseText
  * @param i index to save the responseText at the right place in table
  */
function handleWeather(xhttp, meetingPoint, meetingsArray) {
  //parse resonse
  weatherXML = JSON.parse(xhttp.responseText);
  let temperature = weatherXML.main.temp;
  let toCelsius = 273.1;
  temperature = temperature - toCelsius;
  temperature = Math.round(temperature*10)/10;
  let wString = '';
  wString += weatherXML.weather[0].description + ', ' + temperature + '°C';

  var n1 = meetingPoint.properties.firstUsername;
  var n2 = meetingPoint.properties.secondUsername;
  var t1 = meetingPoint.properties.firstType;
  var t2 = meetingPoint.properties.secondType;
  var meetNumber = meetingPoint.properties.intersectNumber;
//TODO type ist featureCollection
  console.log(t1);

  placeMarker(meetingPoint.geometry.coordinates, n1, t1, n2, t2,  wString, meetingsArray);

}


/**
* @desc Places a Marker on the map
* @param coordi The coordinates
* @param vFirstName The name of the user of the first route
* @param vFirstType The type of the first route (completed or planned)
* @param vSecondName The name of the user of the second route
* @param vSecondType The type of the second route (completed or planned)
* @param vWeather An object that contains informations about the weather
* @author Benjamin Rieke 408743
*/
function placeMarker(coordi, vFirstName, vFirstType, vSecondName, vSecondType, vWeather){
var markerList = '';
//If you have two planned routes that intersect
if(vFirstName == vSecondName && vFirstType == vSecondType && vFirstType == 'planned'){
     markerList = "You already planned parts of this route. Congrats!";
}
//If you have two routes. One that is planned and the other is already completed
if(vFirstName == vSecondName && vFirstType == 'planned' && vFirstType != vSecondType){
markerList = "You will encounter yourself. Congrats!";
}

//If you have two routes. One that is already completed and the other is planned
if(vFirstName == vSecondName && vFirstType == 'completed' && vFirstType != vSecondType){
markerList = "You´ve already been here. Congrats!";
}

// If your planned route intersects with somebody elses
if(vFirstName != vSecondName && vFirstType == 'planned' && vFirstType == vSecondType){
markerList = "You might encounter " +  vSecondName+ " Say Hello!";
}

// If your planned route intersects with somebody elses
if(vFirstName != vSecondName && vFirstType == 'planned' && vFirstType !=vSecondType){
markerList = vSecondName+" was already here!";
}

// If your completed route intersected with somebody elses
if(vFirstName != vSecondName && vFirstType == 'completed' && vFirstType ==vSecondType){
markerList = "Your route intersected with " +  vSecondName+" Write him a message!";
}

// If your route intersected with somebody elses who has not completed it

if(vFirstName != vSecondName && vFirstType == 'completed' && vFirstType !=vSecondType){
markerList = "Your completed route might be intersected by " +  vSecondName+".Tell him if you liked it!";
}

//If an animal was on parts of your planned route

if(vFirstType == 'planned' && vSecondType == 'animal'){
markerList = "You will follow the paths of " +  vSecondName+"! An Animal!" ;
}

// If you were on the same path as an animal

if(vFirstType == 'completed' && vSecondType == 'animal'){
markerList = "You walked on the same paths as " +  vSecondName+"!  An Animal! How wonderful!" ;
}

// For the strange case that an animal checks its routes and meets another animal
if(vFirstType == 'animal' && vSecondType == vFirstType){
markerList = "Animal language! Woof woof! Meow we are animals MEEEEOOOOOOWWW, Woof Woof! Animal language!" ;
}

if(vFirstType == 'animal' && vSecondType != vFirstType){
markerList = "Animal language! Woof woof! Meow Give me Food Human MEEEEOOOOOOWWW, Woof Woof! Animal language!" ;
}

L.marker(coordi).addTo((layerGroup))
 .bindPopup(markerList +"<br> The current weather at this location is: " +vWeather);
markerText.push(markerList);

}
/**
*@desc  Displays all the intersections that are in the global meetingsArray
*@author Benjamin Rieke 408743
*/
//TODO: Table adds up with each call
function intersectOutput() {

  var tableContent ='';
  // for each entry in meetingsArray create a new row and checkbox
  $.each(meetingsArray, function(index) {
    tableContent += '<tr>';
    var checkbox = "<input type='checkbox' id='coords"+index+"' name='coords' onchange='displayPoint("+index+")'></checkbox>";
    var button = "<button type='button' class='btn btn-secondary' onclick='buttonAddMeeting("+index+")'>Save</button>";
    tableContent += '<td>' + checkbox + '</td>';
    tableContent += '<td>' + this.properties.intersectNumber + '</td>';
    tableContent += '<td>' + this.properties.firstUsername + '</td>';
    tableContent += '<td>' + this.properties.secondUsername + '</td>';
    tableContent += '<td>' + this.properties.firstType + '</td>';
    tableContent += '<td>'+ button +'</td>';

    tableContent += '</tr>';

  $('#intersectTable').html(tableContent);
});
}
/**
*@desc  Makes the map zoom to the checked meeting point and resets if unchecked
* Also display the original second reoute that intersected with the first one
*@param index The number of the entry in the array
*@author Benjamin Rieke 408743
*/
function displayPoint(index) {
// randomizer for color
  var color;
var r = Math.floor(Math.random() * 255);
var g = Math.floor(Math.random() * 255);
var b = Math.floor(Math.random() * 255);
color= "rgb("+r+" ,"+g+","+ b+")";

console.log("displayPoint "+index);
var pointId = "coords";
pointId += index;
var lat = meetingsArray[index].geometry.coordinates[0];
var lng = meetingsArray[index].geometry.coordinates[1];
if(document.getElementById(pointId).checked) {

//add original second route as a visual guidance
var LatLon = turnLatLon(meetingsArray[index].properties.intersectRootRoute);
var secLine = L.polyline(LatLon, {color: color, weight: 4});
secLine.addTo(map);
//insert into 'memory' array
secRoutesToDelete[index] = secLine;

map.flyTo(new L.LatLng(lat, lng), 15);


}
else {
  map.flyTo(new L.LatLng(lat, lng), 8);
  map.removeLayer(secRoutesToDelete[index]);


  console.log("unchecked");
}
}

/**
  *@desc Adds a meetingpoint to the database
  *@param index The index to have the right route of the database
  *@author Benjamin Rieke
  */
function buttonAddMeeting(index) {

  var now = new Date();
  let year = now.getFullYear();
  let month = '' + (now.getMonth() + 1);
  if(month.length < 2) { month = '0' + month; }
  let day = '' + now.getDate();
  if(day.length < 2) { day = '0' + day; }
  now = day+'-'+month+'-'+year;

  var pointId = "coords";
  pointId += index;
   event.preventDefault();

    var newPoint = toGeoJsonPoint(meetingsArray[index].geometry.coordinates);

    var addAttr = (newPoint);

    addAttr.firstUsername = meetingsArray[index].properties.firstUsername;
    addAttr.encounter = meetingsArray[index].properties.secondUsername;
    addAttr.firstType = meetingsArray[index].properties.firstType;
    addAttr.intersectNumber = meetingsArray[index].properties.intersectNumber;
    addAttr.marker = markerText[meetingsArray[index].properties.intersectNumber];
    addAttr.timeStamp = now;
    var newPointString = JSON.stringify(addAttr);

    //post
    $.ajax({
      type: 'POST',
      data: newPointString,
      url: '/users/addroute',
      contentType:"application/json"
    }).done(function(response) {
      console.dir(response);
      //successful
      if(response.error === 0) {
        alert('Meetingpoint added: ' + response.msg);
        readPoints();
      }
      else {
        alert('Error: ' + response.msg);
      }
    });
}
/**
  *@desc  Converts coordinates into
  * a valid GEOJSON output
  *@author Jonathan Bahlmann
  */
function toGeoJsonPoint(coordinates) {
  return {
    type: 'FeatureCollection',
    features: [
      {
        type: 'Feature',
        properties: {},
        geometry: {
          type: 'Point',
          coordinates: coordinates
        }
      },
    ]
  };
}
// For filtering the meetingpoints table
$('#pointSelect').on('change', function(e){
  readPointsSelect(this.value);
});


/**
  *@desc  function gets the routes from the database
  * and creates a table according to each entry
  *@author Jonathan Bahlmann
  */
  function readPointsSelect(changer) {

  //get JSON from DB
  $.getJSON('/users/routes', function(data) {
    routesJSON = data;
    var tableContent ='';
    var i = 0;


    $.each(data, function(index) {
      var button = "<button type='button' class='btn btn-secondary' onclick='zoomTo("+index+")'>Zoom</button>";
    //  console.log(routesJSON[index].features[0].geometry.type );
    if (routesJSON[index].features[0].geometry.type  == "Point" && routesJSON[index].firstType == changer  ) {
      i++;
      tableContent += '<tr>';
      tableContent += '<td>' + i + '</td>';
      tableContent += '<td>' + this.firstUsername + '</td>';
      tableContent += '<td>' + this.encounter + '</td>';
      tableContent += '<td>' + this.timeStamp + '</td>';
      tableContent += '<td>' + button + '</td>';
      tableContent += '<td><a href="#" class="linkdeletepoint" rel="' + this._id + '">Delete</a></td>';


      tableContent += '</tr>';
}
if (changer == "Encounters") {
  readPoints();
}
    });


    $('#meetingPointsTable').html(tableContent);
    $('#meetingPointsTable').on('click', 'td a.linkdeletepoint', deletePoint);

  });
}

/**
  *@desc  function gets the routes from the database
  * and creates a table according to each entry
  *@author Jonathan Bahlmann
  */
  function readPoints() {

  //get JSON from DB
  $.getJSON('/users/routes', function(data) {
    routesJSON = data;
    var tableContent ='';
    var i = 0;


    $.each(data, function(index) {
      var button = "<button type='button' class='btn btn-secondary' onclick='zoomTo("+index+")'>Zoom</button>";
    //  console.log(routesJSON[index].features[0].geometry.type );
    if (routesJSON[index].features[0].geometry.type  == "Point"  ) {
      i++;
      tableContent += '<tr>';
      tableContent += '<td>' + i + '</td>';
      tableContent += '<td>' + this.firstUsername + '</td>';
      tableContent += '<td>' + this.encounter + '</td>';
      tableContent += '<td>' + this.timeStamp + '</td>';
      tableContent += '<td>' + button + '</td>';
      tableContent += '<td><a href="#" class="linkdeletepoint" rel="' + this._id + '">Delete</a></td>';


      tableContent += '</tr>';
}

    });


    $('#meetingPointsTable').html(tableContent);
    $('#meetingPointsTable').on('click', 'td a.linkdeletepoint', deletePoint);

  });
}

/**
*@desc  Deletes a meetingpoint from the databse
*@param event Which deleted meetingpoint is based on the pressed row in the table
*@author Benjamin Rieke 408743
*/
function deletePoint(event) {
  event.preventDefault();

    $.ajax({
      type: 'DELETE',
      url: '/users/deleteroute/' + $(this).attr('rel')
    }).done(function(response) {
      if(response.msg === '') {
        alert('done!');
      }
      else {
        //alert('Error: ' + response.msg);
      }

      //update
      readPoints();
    });
}

// global variable to see if there is already a marker on the map
var theMarker = {};

/**
*@desc  Makes the map zoom to the checked meeting point and resets if unchecked
*@param index The number of the entry in the array
*@author Benjamin Rieke 408743
*/
function zoomTo(index) {
  $.getJSON('/users/routes', function(data) {
    routesJSON = data;
    if (routesJSON[index].features[0].geometry.type  == "Point") {

var pointId = "coords";
pointId += index;
// Set lat and long
var lat = routesJSON[index].features[0].geometry.coordinates[0];
 var lng = routesJSON[index].features[0].geometry.coordinates[1];


map.flyTo(new L.LatLng(lat, lng), 15);
// remove the old marker if it exists
  if (theMarker != undefined) {
           map.removeLayer(theMarker);
     }
// add marker
theMarker =  L.marker(routesJSON[index].features[0].geometry.coordinates).addTo(map).bindPopup(routesJSON[index].marker);

}});
}
