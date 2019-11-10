// jshint esversion: 8
// tutorial
// routes array to store JSON data
var routesArray = [];

// on DOM ready
$(document).ready(function() {
  showRoutes();
});

//show routes
function showRoutes() {
  var tableContent = "";

  //get JSON
  $.getJSON('/users/routes', function(data) {
    routesArray = data;
    console.log(data);
    $.each(data, function(index) {
      tableContent += '<tr>';
      tableContent += '<td>' + JSON.stringify(this) + '</td>';
      tableContent += '<td><a href="#" class="linkdeleteroute" rel="' + this._id + '">Delete</a></td>';
      tableContent += '</tr>';
    });

    //put into html
    $('#routeTable').html(tableContent);
    $('#routeTable').on('click', 'td a.linkdeleteroute', deleteRoute);
  });
}

function deleteRoute(event) {
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
      showRoutes();
    });
}

//create
function createRouteButton() {
  event.preventDefault();

  var newRouteString = '{"hello":"hello"}';
  //newRouteString = JSON.parse(newRouteString);
  //newRouteString = JSON.stringify(newRouteString);
  console.log("createRouteButton with payload: " + newRouteString);

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
