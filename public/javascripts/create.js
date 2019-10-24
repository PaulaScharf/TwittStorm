// jshint esversion: 6
// on DOM ready

//Adds the current date on load
$(document).ready(function() {
  fillDate();
});

/**
*@desc Function that enters the current Date
*@author Jonathan jbahlmann
*/
function fillDate() {
  var now = new Date();
  let year = now.getFullYear();
  let month = '' + (now.getMonth() + 1);
  if(month.length < 2) { month = '0' + month; }
  let day = '' + now.getDate();
  if(day.length < 2) { day = '0' + day; }
  now = day+'-'+month+'-'+year;
  document.getElementById("routeDate").value = now;
}

/**
  *@desc function that handles the createButton event
  *@author Jonathan Bahlmann
  */
function createRouteButton() {
  event.preventDefault();

  var newRoute = document.getElementById("GeoJson").value;
  var addAttr = JSON.parse(newRoute);
  addAttr.name = document.getElementById("routeName").value;
  addAttr.routeType = document.querySelector('input[name="routeType"]:checked').value;
  addAttr.username = document.getElementById("routeUsername").value;
  addAttr.date = document.getElementById("routeDate").value;
  addAttr.desc = document.getElementById("routeDesc").value;
  var newRouteString = JSON.stringify(addAttr);

  //post
  $.ajax({
    type: 'POST',
    data: newRouteString,
    url: '/users/addroute',
    contentType:"application/json"
  }).done(function(response) {
    console.dir(response);
    //successful
    if(response.error === 0) {
      alert('route added: ' + response.msg);
    }
    else {
      alert('Error: ' + response.msg);
    }
  });
}
