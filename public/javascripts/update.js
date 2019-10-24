// jshint esversion: 6
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
      if (routesArray[index].features[0].geometry.type  == "LineString"  ) {

      tableContent += '<tr>';
      tableContent += '<td>' + index + '</td>';
      tableContent += '<td>' + this.name + '</td>';
      tableContent += '<td>' + this.routeType + '</td>';
      tableContent += '<td>' + this.username + '</td>';
      tableContent += '<td>' + this.date + '</td>';
      tableContent += '<td>' + this.desc + '</td>';
      tableContent += '<td><a href="#" class="linkeditroute" rel="' + index + '">Edit</a></td>';
      tableContent += '</tr>';
    }});

    //put into html
    $('#routeTable').html(tableContent);
    $('#routeTable').on('click', 'td a.linkeditroute', editRoute);
  });
}

function editRoute(event) {
  event.preventDefault();
  var id = $(this).attr('rel');
  var tableContent = "";
  tableContent += '<tr>';
  tableContent += '<td>' + '<input type="text" id="newName" value="' + routesArray[id].name + '"></input>' + '</td>';
  tableContent += '<td>' + '<input type="text" id="newType" value="' + routesArray[id].routeType + '"></input>' + '</td>';
  tableContent += '<td>' + '<input type="text" id="newUsername" value="' + routesArray[id].username + '"></input>' + '</td>';
  tableContent += '<td>' + '<input type="text" id="newDate" value="' + routesArray[id].date + '"></input>' + '</td>';
  tableContent += '<td>' + '<input type="text" id="newDesc" value="' + routesArray[id].desc + '"></input>' + '</td>';
  tableContent += '<td>' + '<td><a href="#" class="linkputroute" rel="' + routesArray[id]._id + '">Submit</a></td>';
  console.log(routesArray[id]._id);
  tableContent += '</tr>';

  $('#editTable').html(tableContent);
  $('#editTable').on('click', 'td a.linkputroute', putRoute);


function putRoute(event) {
  var newRoute = routesArray[id];
  newRoute.name = document.getElementById("newName").value;
  newRoute.routeType = document.getElementById("newType").value;
  newRoute.username = document.getElementById("newUsername").value;
  newRoute.date = document.getElementById("newDate").value;
  newRoute.desc = document.getElementById("newDesc").value;
  console.log(newRoute._id);
  var newRouteString = JSON.stringify(newRoute);


      $.ajax({
      type: 'PUT',
      url: '/users/putroute',
      data: newRouteString,
      contentType:"application/json"
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
}
