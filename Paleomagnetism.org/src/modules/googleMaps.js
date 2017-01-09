/* PALEOMAGNETISM.ORG MAP MODULE
 * 
 * VERSION: ALPHA.1507
 * LAST UPDATED: 7/29/2015
 *
 * JavaScript file containing functionality for the map module (map is disabled in offline mode - needs to communicate with the Google Maps v3 API)
 * 
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

// Specify map options
module.map = {				
	mapInit: false,
	gmarkers: new Array(),
	markers: new Array(),
	polygons: new Array(),
    grid: null
}	

$(function () {
	
  $('#overlay').prop('checked', false);
  $('#grid').prop('checked', true);

  $('#overlay').change(function () {
    toggleOverlay($("#overlay").is(':checked'));
  });

  $('#grid').change(function() {
    toggleGrid($("#grid").is(':checked'));
  });

  // Settings
  var POLYGON_LINE_COLOR = "#FFF";
  var POLYGON_LINE_OPACITY = 0.5;
  var POLYGON_LINE_WIDTH = 2;
  
  // Reset global
  PLATE_POLYGONS = new Array();

  // Go over sorted polygon object
  for(var i = 0; i < POLYGON_DATA.length; i++) {
  
    var polygon = POLYGON_DATA[i];

	// Create a google maps polygon
    var googlePolygon = new google.maps.Polygon({
      paths: polygon.path,
      strokeColor: POLYGON_LINE_COLOR,
      strokeOpacity: POLYGON_LINE_OPACITY,
      strokeWeight: POLYGON_LINE_WIDTH,
      fillOpacity: 0,
      clickable: false
    });
    
	// Save a reference to the polygon
	// Plate Antarctica (802) has reversed true
    module.map.polygons.push({
	  "id": polygon.id,
	  "reverse": getPlateInversion(polygon.id),
      "priority": polygon.priority,
      "polygon": googlePolygon,
      "name": polygon.name	  
    });
	
  }
  
});

/*
 * Function plateContainsLocation
 *
 * Returns boolean whether location falls within plate
 *
 * @param location {google.maps.LatLng} - location to be checked
 * @param plate {object} - plate polygon object
 *
 */
function plateContainsLocation(location, plate) {

  // Use XOR to invert result if necessary
  // The plate Antarctica (802) is interpreted by google maps as everything
  // except for the plate itself. Therefore we check if the location falls inside the polygon
  // it actually falls outside of the Antarctic plate.
  return plate.reverse ^ google.maps.geometry.poly.containsLocation(location, plate.polygon);
  
}

/*
 * Function getPlateInversion
 *
 * Hardcoded boolean determining inversion of polygon
 * returns true if polygon needs to be inversed (e.g. Antarctica, 802)
 *
 * @param id {int} - plate id
 *
 */
function getPlateInversion(id) {

  switch(id) {
    case 802: return true;
	default: return false;
  }
  
}

/*
 * Function getPlateFromLocation
 *
 * Assigns a plate to a given location earth
 *
 * @param latitude {float} - latitude of location
 * @param longitude {float} - longitude of location
 *
 */
function getPlateFromLocation(latitude, longitude) {
  
  // No plates were loaded
  if(module.map.polygons.length === 0) {
    return null;
  }
  
  var plate;
  
  // Conver to google.maps.LatLng
  var location = new google.maps.LatLng(latitude, longitude);

  // Go over all polygons sorted by priority
  // Polygons may overlap so priority is important (e.g. 199 and 101)
  // This is hardcoded in the getPlatePriority function
  for(var i = 0; i < module.map.polygons.length; i++) {
  
    plate = module.map.polygons[i];
	
	if(plateContainsLocation(location, plate)) {
	  return {"id": plate.id, "name": plate.name};
	}

  }
  
  // No intersection
  return null;
  
}

/*
 * fn toggleOverlay
 * toggles the loaded plate KML from and to map object
 */
function toggleOverlay(bool) {
  bool ? plateLayer.setMap(module.map.map) : plateLayer.setMap(null);
}

function toggleGrid(bool) {
  bool ? grid.show() : grid.hide();
}

module.map.initialize = function() {

  // Options for map styling
  var mapOptions = {
    'center': {'lat': 35, 'lng': 35},
    'zoom': 2,
  	'minZoom': 2,
    'disableDefaultUI': true,
    'streetViewControl': false,
    'mapTypeId': google.maps.MapTypeId.TERRAIN,
   'styles': [{
     'featureType': "administrative",
     'stylers': [{ visibility: "off" }]
    }, {
      'featureType': "poi",
      'stylers': [{ visibility: "off" }]
    }, {
      'featureType': "road",
      'stylers': [{ visibility: "off" }]
    }, {
      'featureType': "water",
      'elementType': "labels",
      'stylers': [{ visibility: "off" }]
    }]
  };
  
  // Initialize the map with the specified map options
  module.map.map = new google.maps.Map(document.getElementById('map-canvas'), mapOptions);
  
  grid = new Graticule(module.map.map, true);
  
  // Add listener for a click event
  google.maps.event.addListener(module.map.map, "click", function(e) {
  		
  	//Capture latitude and longitude of click event and put it in the select box
  	$("#palatLat").val(e.latLng.lat().toFixed(3));
  	$("#palatLon").val(e.latLng.lng().toFixed(3));
  	
  });
	
  // Code for latitude and longitude display when the mouse is moved over the map
  document.getElementById('latspan').innerHTML = '-----------';
  document.getElementById('lngspan').innerHTML = '-----------';
  google.maps.event.addListener(module.map.map,'mousemove', function(event) {
      document.getElementById('latspan').innerHTML = event.latLng.lat().toFixed(3);
      document.getElementById('lngspan').innerHTML = event.latLng.lng().toFixed(3);
  });

  //Remove information on mouse out from map
  google.maps.event.addListener(module.map.map,'mouseout', function(event) {
      document.getElementById('latspan').innerHTML = '-----------';
      document.getElementById('lngspan').innerHTML = '-----------';
  });

  /*
   * Buffer tectonic plate overlay
   * Sourced from "hisz.rsoe.hu/alertmap/Tectonic_Plate_Boundaries.kml"
   * using ORFEUS path, whatever ;)
   */
  plateLayer = new google.maps.KmlLayer({
    url: 'http://paleomagnetism.org/src/db/tectonic_plates.kml',
    suppressInfoWindows: true,
    preserveViewport: true,
  });
  
}

/* 
 * FUNCTION module.map.mapAddSites
 * Description: loops over sites and puts all sites on the map for site latitude/longitude
 * Input: NULL
 * Output: VOID
 */
module.map.mapAddSites = function() {
	
  // Redraw all markers so initially remove all
  module.map.clearMarkers();
  
  getExpectedLocation(true);
  
  // Get selected sites
  var siteNames = $('#mapSel').val();	
  if(siteNames == null) {
  	return;
  }
  
  //Define an infowindow and get the user selected minimum and maximum age range (0 - 600 Ma by default)
  var infowindow = new google.maps.InfoWindow();
  var ageMin = $( "#ageRange" ).slider( "values", 0);
  var ageMax = $( "#ageRange" ).slider( "values", 1);
  
  var inversionFlag = $('#invFlag').prop('checked');
  var coordinates = $("#mapRadio input[type='radio']:checked").val();
  
  //Keep track of number of filtered sites (missing latitude/longitude or not within specified age bounds)
  var nMissing = 0; 
  
  // Loop over all selected sites
  for(var i = 0; i < siteNames.length; i++) {
  
  	var key = siteNames[i];
  
  	// Get site latitude/longitude
  	var latitude = sites[key].userInput.metaData.latitude;
  	var longitude = sites[key].userInput.metaData.longitude;
  	var markerColor = sites[key].userInput.metaData.markerColor;
  	var siteAge = sites[key].userInput.metaData.age;
  	var author = sites[key].userInput.metaData.author;
  	var siteMinAge = sites[key].userInput.metaData.minAge;
  	var siteMaxAge = sites[key].userInput.metaData.maxAge;
  	
  	// Get tectonic or geographic coordinates
  	if(coordinates === 'TECT') {
  	  var declination = sites[key].dataTC.params.mDec;
  	  var inclination = sites[key].dataTC.params.mInc;
  	  var dDx = sites[key].dataTC.params.dDx;
  	} else if (coordinates === 'GEO') {
  	  var declination = sites[key].data.params.mDec
  	  var inclination = sites[key].data.params.mInc
  	  var dDx = sites[key].data.params.dDx
  	}
  
  	if(checkNumeric([declination, inclination, dDx])) {
  	  // Check if inversion flag is checked => convert all polarities to normal
  	  if(inversionFlag) {
  	    if(Number(inclination) < 0) {
  	      inclination = Math.abs(Number(inclination));
  	      declination = (Number(declination)+180)%360;
        }
  	  }
  
  	  // Only put on the map if latitude and longitude is specified (Google Maps defaults null, null to 0, 0) and the Gulf of Guinea is not really an ideal spot for sampling.
  	  if(latitude != null && longitude != null && ageMin <= siteMaxAge && ageMax >= siteMinAge) {
  
  		  var angle = declination * RADIANS - 0.5 * Math.PI;
  		  var radError = dDx * RADIANS;
  		  	
  		  //Actual LatLng object that Google Maps v3 can interpret.
  		  var LatLng = new google.maps.LatLng(latitude, longitude);
          
  		  //What appears in the site label (HTML)
  		  var contentString =  '<h2>Site: <small>' + key + '</small></h2><br>';
  		  	contentString += '<b> Age: </b>' + siteAge + ' Myr <br>';
  		  	contentString += '<b> Latitude: </b>' + latitude +'<br>';
  		  	contentString += '<b> Longitude: </b>' + longitude +'<br>';
  		  	contentString += '<b> Author: </b>' + author + '<br>';
  		  	contentString += '<hr>';
  		  	contentString += '<b> Declination: </b>' + declination.toFixed(2) +'<br>';
  		  	contentString += '<b> Inclination: </b>' + inclination.toFixed(2) +'<br>';
  		  	contentString += '<b> ΔDx: </b>' + dDx.toFixed(2) +'<br>';
          
  		  var textContent = contentString;
  		  	contentString += '<hr>';
  		  	contentString += '<b> Marker color: </b><br>';
  		  	contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#FF0000\')"><u>red</u></a>&nbsp'
  		  	contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#FFA500\')"><u>orange</u></a>&nbsp'
  		  	contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#0000FF\')"><u>blue</u></a>&nbsp'
  		  	contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#008000\')"><u>green</u></a>&nbsp'
  		  	contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#800080\')"><u>purple</u></a>'
			contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#FFFF00\')"><u>Yellow</u></a>&nbsp'
			contentString += '<br>'
			contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#000000\')"><u>Black</u></a>&nbsp'
			contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#00FFFF\')"><u>Cyan</u></a>&nbsp'
			contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#F660AB\')"><u>Pink</u></a>&nbsp'
			contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#8D38C9\')"><u>Violet</u></a>&nbsp'
			contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#32CD32\')"><u>Lime</u></a>&nbsp'
			contentString += '<a onClick="module.map.changeColor(module.map.markers['+i+'], \'#A52A2A\')"><u>Brown</u></a>&nbsp'
			
  		  //Add sites to map
  		  //We use a custom SVG marker (path) to create the confidence envelope.
  		  //Commented out are different SVG paths using an arc instead of straight lines but this results in hit box issues when clicking markers -> we resort to straight confidence parachutes
  		  module.map.markers.push(new google.maps.Marker({
  		  	'position': LatLng,
  		  	'id': key,
  		  	'info': contentString,
  		  	'icon': {
  		  	  'path': ['M0 0 ',  (Math.cos(angle + radError)), (Math.sin(angle + radError)), (Math.cos(angle)),  (Math.sin(angle)), (Math.cos(angle - radError)), (Math.sin(angle - radError)), 'z'].join(' '),
  		  	  'scale': 50,
  		  	  'strokeWeight': 1,
  		  	  'fillColor': markerColor,
  		  	  'fillOpacity': 0.5,
  		  	},
  		  	'map': module.map.map,
  		  	'title': 'Site: ' + key,
  		  	'contentString': textContent
  		  }));
  		  
  		  //Add the info window event listener (substract number of missing from iteration count)
  		  google.maps.event.addListener(module.map.markers[i - nMissing], 'click', function() {
  		  	infowindow.setContent(this.info);
  		  	infowindow.setPosition(this.position);
  		  	infowindow.open(module.map.map);
  		  });
  			
  		} else if (latitude === null || longitude === null) {
  		  console.log('Notification: found site (' + key + ') with latitude/longitude NULL');
  		  nMissing++;
  		} else {
  		  nMissing++;
  		}
  	} else {
  	  console.log('Notification: found site (' + key + ') with declination/inclination/error NaN');
  	  nMissing++;
  	}
  }
  
  module.map.getMarkers();

}

module.map.getMarkers = function () {
	
  var markers = new Array();
  for(var i = 0; i < module.map.markers.length; i++) {
  	var marker = module.map.markers[i];
  	var object = {
  	  'latitude': marker.getPosition().lat(),
  	  'longitude': marker.getPosition().lng(),
  	  'icon': marker.getIcon(),
  	  'title': marker.getTitle(),
  	  'content': marker.contentString
  	}
  	markers.push(object)
  }
  
}

/* 
 * FUNCTION module.map.addKML (experimental)
 * Description: attempts to add a .kml file to the Google Maps overview
 *            : Note: input .kml file must contain a plain-text STRING.
 * Input: Click event
 * Output: VOID (adds .kml to map)
 */
module.map.addKML = function (event) {
	
  var input = event.target;
  var reader = new FileReader();
  
  reader.readAsText(input.files[0]);
  
  reader.onload = function() {
  	var myParser = new geoXML3.parser({map: module.map.map});
  	try {
  	  myParser.parseKmlString(reader.result);
  	} catch (err) {
  	  notify('failure', 'Could not add .KML file: ' + err);
  	}
  }
  
}


/* 
 * FUNCTION module.map.changeColor
 * Description: changes color of individual markers
 * Input: NULL
 * Output: VOID
 */
module.map.changeColor = function( active, color ) {
					
  // Remember new color in userInput
  sites[active.id].userInput.metaData.markerColor = color;
  
  // Change property of icon.fillColor and then set the new icon to itself to force a color update.
  // Cannot think of a better way to do this.. but it works :)
  active.icon.fillColor = color;
  active.setIcon(active.icon);
  
  // Save application
  setStorage();
  
}
module.map.changeColorFromName = function( name, index, color) {

  // Remember new color in userInput
  sites[name].userInput.metaData.markerColor = color;
  
  var fillColor = sites[name].data.params.mInc < 0 ? 'white' : color;
  
  $("#siteMean").highcharts().series[index].update({marker: {fillColor: fillColor, lineColor: color}})
  
  var fillColor = sites[name].dataTC.params.mInc < 0 ? 'white': color;
  $("#siteMeanTC").highcharts().series[index].update({marker: {fillColor: fillColor, lineColor: color}})
  
  // Save application
  setStorage();
  
}

/* FUNCTION 
 * module.map.expectedDeclination
 * Description: Creates expected declination marker on map when the declination line is clicked (below map)
 * Input: See parameters
 * Output: VOID
 */
module.map.expectedDeclination = function (declination, dDx, latitude, longitude, color, model, name) {
	
  // Get the angle
  var angle = declination * RADIANS - 0.5 * Math.PI;
  var radError = dDx * RADIANS;
  
  // We use an array to capture the single declination marker
  // This clears the array (single marker)
  for(var i = 0; i < module.map.gmarkers.length; i++) {
  	module.map.gmarkers[i].setMap(null);
  	module.map.gmarkers = new Array();
  }
  
  var latLng = new google.maps.LatLng(latitude, longitude);
  var infowindow = new google.maps.InfoWindow();
  
  // What appears in the tooltip on click
  var contentString =  '<h2>Expected <small> declination </small></h2><br>';
  	contentString += '<b> Model of Polar Wander: </b> ' + model + '<br>';
  	contentString += '<b> Simulated Plate: </b> ' + name + '<br>';
  	contentString += '<b> Latitude: </b> ' + latitude.toFixed(2) + '<br>';
  	contentString += '<b> Longitude: </b> ' + longitude.toFixed(2) + '<hr>';
  	contentString += '<b> Declination: </b> ' + declination.toFixed(2) + ' (±' + dDx.toFixed(2) + ') <br>';
  	
  // Marker specifications
  // We use a SVG path to draw a marker with the proper declination and confidence parachute
  var marker = new google.maps.Marker({
  	'position': latLng,
  	'map': module.map.map,
  	'title': 'Expected Declination',
  	'info': contentString,
  	'icon': {
  	  'path': ['M0 0 ',  (Math.cos(angle + radError)), (Math.sin(angle + radError)), (Math.cos(angle)),  (Math.sin(angle)), (Math.cos(angle - radError)), (Math.sin(angle - radError)), 'z'].join(' '),
  	  'scale': 100,
  	  'strokeWeight': 1,
  	  'strokeColor': color,
  	  'fillColor': color,
  	  'fillOpacity': 0.25,
  	},
  });
  
  // Add listening for click on marker
  google.maps.event.addListener(marker, 'click', function() {
  	infowindow.setContent(this.info);
  	infowindow.setPosition(this.position);
  	infowindow.open(module.map.map);
  });
  	
  module.map.gmarkers.push(marker);

}

/*
 * FUNCTION module.map.clearMarkers
 * Description: Deletes all markers on the map
 * Input: NULL
 * Output: VOID
 */
module.map.clearMarkers = function() {	

  for(var i = 0; i < module.map.markers.length; i++) {
    module.map.markers[i].setMap(null);
  }
	
  module.map.markers.length = 0;
	
}
