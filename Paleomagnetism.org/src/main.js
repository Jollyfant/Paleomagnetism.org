/* PALEOMAGNETISM.ORG MAIN FRAMEWORK FUNCTIONS
 * 
 * VERSION: 1.1.1
 * LAST UPDATED: 2016-10-14
 *
 * JavaScript file containing main functionality procedures for the Paleomagnetism.org statistics portal.
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */
 
 //Current application version
version = 'v1.1.1';

//Create the modules object that will carry all functional modules
module = new Object();

// Set an options attribute
module.options = {
  'editing': false,
  'editName': "",
  'update': {
    'dir': false,
    'mean': false,
    'foldtest': false
  }
}

// Define globals to be used
var sites;
var APWPs;
var addSitesTimed;

/*
 * FUNCTION showGeomagneticDirections
 * Description: shows geomagnetic directions in the geomagnetic directions tab
 * Input: NULL
 * Output: VOID (calls plotting functions)
 */
var showMeanDirections = function () {

  // Get selected sites
  var siteNames = $('#meanSel').val();
  if(siteNames === null) {
    $("#meanDirHide").hide();
    return;
  }
	
  // Loop over all sites and push the statistical parameters to the statisticsArray
  // These parameters is all we require to do the plotting (mean direction and confidence interval)
  // In GEOGRAPHIC coordinates
  var statisticsArray = new Array();
  for(var i = 0; i < siteNames.length; i++) {
    statisticsArray.push({
      'data': sites[siteNames[i]].data,
      'name': siteNames[i]
    });
  }

  plotMeans(statisticsArray, 'siteMean', 'Geographic Coordinates');
	
  // Repeat the procedure for TECTONIC coordinates	
  var statisticsArrayTilted = new Array();
  for(var i = 0; i < siteNames.length; i++) {
    statisticsArrayTilted.push({
      'data': sites[siteNames[i]].dataTC,
      'name': siteNames[i]
    });
  }
	
  plotMeans(statisticsArrayTilted, 'siteMeanTC', 'Tectonic Coordinates');		

  // Show the figures
  $("#meanDirHide").show();
	
  var temp = new Array();
  var names = new Array();
	
  for(var i = 0; i < siteNames.length; i++) {
    temp.push(sites[siteNames[i]].data.params, sites[siteNames[i]].dataTC.params);
    names.push(sites[siteNames[i]].userInput.metaData.name, sites[siteNames[i]].userInput.metaData.name + ' <small>(Tectonic)</small>');
  }
	
  // Create and show direction table
  $("#meanTable").html(directionTable(temp, names));
  $("#meanTable").show();	

}

function createTemporarySite(siteNames, cutoff) {

  // If multiple sites are selected, generate empty metadata
  // For a single site, copy the metadata from the site & extend it
  var date = new Date();
  if(siteNames.length > 1) {
    var metaData = {
      'name': 'TEMP',
      'latitude': null,
      'longitude': null,
      'age': null,
      'minAge': null,
      'maxAge': null,
      'markerColor': 'white',
      'cutoff': cutoff,
      'dateAdded': date.toISOString(),
      'version': version,
      'sanitized': true,
      'type': 'Site Combination',
      'author': 'Unknown',
      'description': 'Multiple Sites'
    }
  } else {
    var metaData = JSON.parse(JSON.stringify(sites[siteNames].userInput.metaData));
    metaData.name = 'TEMP';
    metaData.cutoff = cutoff;
    metaData.dateAdded = date.toISOString();
    metaData.version = version;
  }

  // Bucket to keep data input for all sites to be merged
  // Merge the input data to a single array
  var siteDataArray = new Array();
  for(var i = 0; i < siteNames.length; i++) {
    siteDataArray.push(JSON.parse(JSON.stringify(sites[siteNames[i]].userInput.data)));
  }
  var merged = [].concat.apply([], siteDataArray);

  // Silently internally add a new site with name TEMP to the application 
  sites['TEMP'] = new site(metaData, merged, false);

}

/*
 * FUNCTION showGeomagneticDirections
 * Description: shows geomagnetic directions in the geomagnetic directions tab
 * Input: NULL
 * Output: VOID (calls plotting functions)
 */
var showGeomagneticDirections = function () {
	
  // Get the selected sitenames
  var siteNames = $('#dirSel').val();
  if(siteNames === null) {
    $("#magDirHide").hide();
    return;
  }
		
  // Give the user the option to save the site
  // Show user option to save this combination
  $('#saveGroupDiv').show().css('display', 'inline-block');
  $('#saveGroupButton span').text("Copy");

  // Create a temporary site for the selected sites and cutoff
  var selectedCutoff = $("#cutoffSelectorDirections").val()[0];

  createTemporarySite(siteNames, selectedCutoff);

  // Set the siteNames to the newly created TEMP site
  if(siteNames.length > 1 || selectedCutoff !== sites[siteNames].userInput.metaData.cutoff) {
    var siteNames = 'TEMP';
    $('#saveGroupButton span').text("Save");
  }
  
  // Call plot functions for equal area projection and virtual geomagnetic poles
  eqAreaDirections(siteNames);
  eqAreaVGPs(siteNames);

  // Show the geomagnetic direction module
  $("#magDirHide").show();
	
}

/*
 * FUNCTION changeAge
 * Description: calls function to change ages from selection box on pre-set ages
 * Input: id@string of the box that changes (edit or add)
 * Output: VOID (calls parseAgeName to put data in the appropriate boxes)
 */
var changeAge = function () {
	
  var ageName = $("#ageNames").val();
  var ages = ageDatabase[ageName];

  parseAgeName(ages);

}

/*
 * FUNCTION removeSite
 * Description: removes site from application
 * Input: NULL
 * Output: VOID (removes site)
 */
var removeSite = function () {
	
  // No sited in sites object (everything has been deleted)
  if(Object.keys(sites).length === 0) {
    notify('failure', 'No sites in application')
    return;
  }

  // Get the selected sites; this returns an array of all selected site names
  var siteName = $('#introSel').val();
  if(siteName === null) {
    notify('failure', 'No sites are selected for deletion.')
    return;
  }
	
  // Remove the site
  for(var i = 0; i < siteName.length; i++) {
    sites[siteName[i]].remove();
  }
	
  // Next time the direction and mean tabs are opened, refresh the chart; this removes charts that still show the newly deleted data
  module.options.update = {
    'dir': true,
    'mean': true
	}
}

/*
 * FUNCTION addSite
 * Description: adds site to application
 * Input: edit (boolean), whether calling this function through editing or adding a new site
 *      : editing will overwrite a site (normally throws an error when site exists)
 * Output: VOID (adds site; calls site constructor)
 */
function addSite(edit) {

  $("#nameDiv").animate().stop();
  $(".linedwrap").animate().stop();
  $(".linedtextarea").animate().stop();
	
  // Obtain site meta data (name, location, age) from input boxes
  var metaData = new constructMetaData(edit);
  if(!metaData.sanitized) {
    notify('failure', 'An unexpected error while parsing site meta data. Please check location and age information.');
    return;
  }

  // Extend newly constructed metadata with the old, then add metaData from the input boxes
  if(edit) {
    var metaData = $.extend({}, sites[edit].userInput.metaData, metaData);
  } else {
    if(!checkName(metaData.name)) {
      return;
    }		
  }
	
  // Get site data
  var type = $('#siteType').val();
  var siteDat = $('#dropZone').val();

  // Request sanitization on site input data
  var inputData = new processUserInput(siteDat, type, metaData.name).output;	

  // If the input is cleared, add a new site and close the data input window
  if(!inputData.sanitized) {
    notify('failure', 'Site input did not pass sanitization. Breaking procedure; please check input at line ' + inputData.line + '.');
    return;
  }

  // If we are editing, first delete the site with the old name (if it exists)
  if(edit) {
    delete sites[metaData.name];
  }

  sites[metaData.name] = new site(metaData, inputData.data, true);
  module.options.editName = "";

  $('#input').dialog("close");

  setStorage();	
	
}

/* FUNCTION addAPWP
 * Description: adds an APWP to application and localStorage
 * Input: NULL
 * Output: VOID (adds APWP)
 */
var addAPWP = function () {

  // Get name and check
  var name = $("#APWPName").val();
  if(name === '') {
    notify('failure', 'Field name is empty.');
    return;
  }
	
  if(APWPs.hasOwnProperty(name)) {
    notify('failure', 'An APWP with name ' + name + ' already exists.');
    return;
  }
	
  var APWPdata = $("#APWPZone").val();
 
  // Define data buckets
  var age = new Array();
  var A95 = new Array();
  var lon = new Array();
  var lat = new Array();
  var rot = new Array();
	
  // Split by lines and remove white lines
  var lines = APWPdata.split('\n').filter(function(x) {
    return x !== "";
  });
	

  var coordinateFrame = $("#APWPCoordinates").val();

  // Loop over all the lines and put the proper parameters in the proper bucket
  for(var i = 0; i < lines.length; i++) {

    var p = lines[i].split(/[,\t]+/);

    lat.push(Number(p[0]));
    lon.push(Number(p[1]));

    // Check if user wants an Euler pole
    if(coordinateFrame === 'euler') {	
      rot.push(Number(p[2]));
    } else {
      A95.push(Number(p[2]));
    }

    age.push(Number(p[3]));

  }	

  if(coordinateFrame === 'euler') {
    var next = 0;
    for(var i = 0; i < age.length; i++) {
      if(age[i] !== next) {
        notify('failure', 'For compatibility with the African reference frames, all Euler Poles must start at 0 Myr and have 10 Myr increments.');
        return;
      }
      next += 10;
    }
  }

  if(coordinateFrame === 'euler') {
    APWPs[name] = {
      'lat': lat,
      'lon': lon,
      'rot': rot,
      'age': age,
      'type': 'Euler Pole'
    }
  } else {
    APWPs[name] = {
      'age': age, 
      'A95': A95, 
      'lon': lon, 
      'lat': lat,
      'type': 'APWP'
    }
  }

  // Post-processing; update user and force update for multiselect
  notify('success', 'APWP ' + name + ' has been added');
	
  $('#plateNames').append("<option custom=\"true\" value=\"" + name + "\">" + name + "</option>");
  $('#plateNames').multiselect('refresh');
  $('#addAPWP').dialog("close");
	
  setStorage();

}

/* FUNCTION removeAPWP
 * Description: removes an APWP from application and localStorage
 * Input: NULL
 * Output: VOID (removes APWP)
 */
function removeAPWP() {

  // Get the selected APWPs
  var paths = $("#plateNames").val() 
  if(paths === null) {
    notify('failure', 'No apparent polar wander paths are selected.');
    return;
  }
	
  // Loop over all paths
  for(var i = 0; i < paths.length; i++) {
	
    var plateName = paths[i];
    var realPlateName = $("#plateNames option[value='" + plateName + "']").text();	
    var custom = eval($('#plateNames option[value="' + plateName + '"]').attr('custom'));
	
    // Only remove custom APWPs
    if(custom) {
      delete APWPs[plateName];
      $('#plateNames option[value="' + plateName + '"]').remove();
      $('#plateNames').multiselect('refresh');
      notify('success', 'APWP for ' + realPlateName + ' has been deleted.');
    } else {
      notify('failure', 'Default APWP for ' + realPlateName + ' cannot be deleted.');
    }
  }	

  setStorage();

}
 
/*
 * FUNCTION removeInterpretations
 * Description: removes interpretations from localStorage
 * Input: NULL
 * Output: VOID (removes interpretation from localStorage)
 */
var removeInterpretations = function () {

  var name = $("#interpretedSites").val();
  var nameText = $("#interpretedSites").text();
	
  if(name === null) {
    notify('failure', 'No site selected for deletion.');
    return;
  }

  var interpretations = localStorage.getItem('savedInt');

  if(interpretations !== null) {

    var index = $("#interpretedSites option:selected").index();
      		
    interpretations = JSON.parse(interpretations);
    interpretations.splice(index, 1);
    localStorage.setItem('savedInt', JSON.stringify(interpretations));
      		
    $('#interpretedSites option[value="' + name + '"]').remove();
    $('#interpretedSites').multiselect('refresh');
      		
    notify('success', 'Site ' + nameText + ' has been deleted from the saved interpretations.');

  }
	
  $("#interpretationInfo").html('');
  $("#dropZone").val("");

}
	
/*
 * FUNCTION addInterpretations
 * Description: adds interpretations from localStorage to the Paleomagnetism.org statistics portal
 * Input: NULL
 * Output: VOID (adds data to textarea for input)
 */
var addInterpretations = function () {

  var name = $("#interpretedSites").val();

  if(name === null) {
    return;
  }

  var interpretations = JSON.parse(localStorage.getItem('savedInt'));
  var index = $("#interpretedSites option:selected").index();

  var input = '';
  var capture = interpretations[index].data;
  var settings = interpretations[index].settings;
  
  $("#interpretationInfo").html('Directions in ' + interpretations[index].coordType + ' coordinates.');
  $("#includeBedding, #includeName, #includeStrat").prop('checked', false);
  
  // Generate line from dec, inc, bedding, sample name, and stratigraphy
  // Only put the bedding if the site has been interpreted in GEOGRAPHIC coordinates WITHOUT fitted great circles
  // Otherwise, just put directions without beddings
  if(interpretations[index].type === 'directions' || interpretations[index].unique) {
	  
    for(var i = 0; i < capture.length; i++) {
		
      input += capture[i].dec + ", " + capture[i].inc
	  
	  if(settings.bedding) {
		$("#includeBedding").prop('checked', true);
		input += ", " + capture[i].bedStrike + ", " + capture[i].bedDip;
	  }
	  
	  if(settings.sampleName) {
		$("#includeName").prop('checked', true);
		input += ", " + capture[i].sample;
	  }
	  
	  if(settings.stratigraphy) {
		 $("#includeStrat").prop('checked', true);
		 input += ", " + capture[i].strat || 0; 
	  }
	  
      input += '\n';
	  
    }
	
  } else {
	  
    for(var i = 0; i < capture.length; i++) {
		
      input += [capture[i].dec, capture[i].inc, capture[i].sample].join(", ");
	  
      if(capture[i].strat !== null) {
        input += ', ' + capture[i].strat || 0;
      }
	  
      input += '\n';
	  
    }
  }
		
  // Put data in the textarea and name in name-area
  $("#dropZone").val(input); 
  $("#siteName").val($('#interpretedSites option[value="' + name[0] + '"]').text());
		
  // Put a note that the site has been fitted with great circles
  // If the bedding was not unique, inform the user it has been omitted
  if(interpretations[index].type === 'great circles') {
    $("#interpretationInfo").append(' Site has been fitted with great circles.');
    if(!interpretations[index].unique) {
      $("#interpretationInfo").append(' Omitted non-unique bedding.');		
    }
  }

}

/*
 * FUNCTION checkName
 * Description: checks name for rules
 * Input: Site name (string)
 * Output: BOOLEAN TRUE/FALSE
 */ 
function checkName(name) {
	
  // Name is empty
  if(name === '') {
    notify('failure', 'Cannot add site because site name is empty.');
    return false;
  }
	
  // Site already exists in GLOBAL sites object
  if(sites.hasOwnProperty(name)) {
    notify('failure', 'A site with the name ' + name + ' already exists.');
    return false;
  }
	
  // Limit site name length to 25 characters
  if(name.length > 25) {
    notify('failure', 'Site name is too long (25 characters maximum).');
    return false;
  }

  return true;

}

/* 
 * FUNCTION addSiteCombination
 * Description: Save temporary site "TEMP" when multiple sites are selected for viewing to application
 * Input: NULL
 * Output: BOOLEAN TRUE/FALSE
 */
var addSiteCombination = function () {

  // Check if user suggested site name is sane
  var name = $("#saveGroupName").val();
  if(!checkName(name)) {
    return false;
  }
		
  // Copy temporary constructed metadata and replace old name with new name
  // Also add some other meta-data
  var metaData = JSON.parse(JSON.stringify(sites['TEMP'].userInput.metaData));
  metaData.name = name;
	
  // Ignore rejected samples if requested
  var excludeRejected = $("#excludeRejected").prop('checked');
  var inputData;
  if(excludeRejected) {
    inputData = JSON.parse(JSON.stringify(sites['TEMP'].data.dir.accepted));
  } else {
    inputData = JSON.parse(JSON.stringify(sites['TEMP'].userInput.data));
  }
	
  // If checked, reverse all samples to normal polarity
  var normalizePolarity = $("#reversePolarity").prop('checked');
  if(normalizePolarity) {
    for(var i = 0; i < inputData.length; i++) {
      if(inputData[i][1] < 0) {
        inputData[i][1] = Math.abs(inputData[i][1]);
        inputData[i][0] = (inputData[i][0] + 180) % 360;
      }
    }
  }
	
  // Call site constructor with the updated metadata and directional data	
  sites[name] = new site(metaData, inputData, true);
	
  return true;

}

/* 
 * FUNCTION getSavedInterpretations
 * Description: Loads saved interpretations from the interpretations portal from localStorage to the select box
 */
var getSavedInterpretations = function() {
 
  // Return if local storage is not supported
  if(!localStorage) {
    return;
  }

  var interpretations = localStorage.getItem('savedInt');

  if(interpretations !== null) {
    interpretations = JSON.parse(interpretations);

    for(var i = 0; i < interpretations.length; i++) {
      var name = interpretations[i].name;
      $('#interpretedSites').append("<option value=\"" + i + "\">" + name + "</option>");
    }

    $('#interpretedSites').multiselect('refresh');

  }

}
 
function include(filename) {
   var head = document.getElementsByTagName('head')[0];
   var script = document.createElement('script');
   script.src = filename;
   script.type = 'text/javascript';
   head.appendChild(script)
}   

function getPublicationFromHash() {
	
  var MD5 = location.search.substring(1);
  
  if(!PUBLICATIONS[MD5]) {
    notify('failure', 'Unknown publication hash, could not load data.');
    return;
  }
  
  $.ajax({
    'type': 'GET',
    'dataType': 'json',
    'url': './pubs/' + MD5 + '.pub',
    'success': function(json) {
  	var pub = PUBLICATIONS[MD5];
  	notify('success', 'Data is being loaded from a verified publication. Changes to this sessions are not saved.');
  	addData(json.data, json.apwp, version, pub);
    },
    'error': function(error) {
  	notify('failure', 'An unexpected error occured loading the publication data.');		  
    }
  });
  
}

/*
 * FUNCTION applicationInit
 * Description: Initializes the Paleomagnetism.org application and loads sites/APWPs saved in localStorage to application
 * Input: NULL
 * Output: VOID
 */ 
var applicationInit = function (page) { 

  jQueryInit(page);

  // Paleomagnetism.org can also run offline; some features (e.g. Google Maps will be disabled)
  if(!navigator.onLine){
    include("./src/libs/Highcharts/offline-exporting.src.js");
    notify('note', 'Graph exporting has defaulted to local (.png/.svg).');
    notify('note', 'You are now using Paleomagnetism.org in offline mode - features that require an internet connection are disabled.');
  } 

  // Create new global objects; these objects will contain all application data
  sites = new Object();
  APWPs = new Object();
	
  // If a hash is specified, try to load the publication
  if(location.search) {
	getPublicationFromHash();
	return;
  }
  
  // Try loading the application data (if any) stored within LocalStorage
  if(localStorage) {
    try {
      var parsedInput = JSON.parse(localStorage.getItem('pMag'));
    } catch (err) {
      notify('failure', 'A critical error has occured loading your data. Local storage had to be cleared. (' + err + ')');
      localStorage.removeItem('pMag');
      var parsedInput = null;
    }
  } else {
    notify('failure', 'Local storage is not supported. Please export your data manually.');
    var parsedInput = null;
  }
	  
  // Check if there is any data in the local storage
  if (parsedInput !== null) {
    if (parsedInput.version !== undefined) {
      var dataVersion = parsedInput.version;
    }
    if (parsedInput.data !== undefined) {
      var loadedSites = parsedInput.data;
    }
    if (parsedInput.apwp !== undefined) {
      APWPs = parsedInput.apwp;
    }
  } else {
    dataVersion = version;
    loadedSites = new Array();
  }
  
  // Load saved interpretations from the interpretation portal	
  getSavedInterpretations();
  
  addData(loadedSites, APWPs, dataVersion);

};

function addData(loadedSites, APWPs, dataVersion, pub) {
	
  // Check if version is up to date
  if(dataVersion !== version) {
    notify('note', 'A new version of paleomagnetism.org has been released (' + version + ')');
  }

  // Parse the APWPs in localStorage to select box and force update
  for(var plate in APWPs) {
    $('#plateNames').append("<option custom=\"true\" value=\"" + plate + "\">" + plate + "</option>");
  }
  $('#plateNames').multiselect('refresh');
	
  $("#loading").show();

  // Asynchronous implementation of site constructor during application initialization
  // Usually processing time is not a problem, but the page may freeze if the user has many sites with many directions
  // Asynchronous function is called automatically
  var i = 0;

  (addSitesTimed = function () {

    if(i < loadedSites.length) {

      sites[loadedSites[i].metaData.name] = new site(loadedSites[i].metaData, loadedSites[i].data, false);
      i++;

      setTimeout(function() {
        addSitesTimed();
      }, 1);

    } else {
		
      $("#loading").hide();
	  
	  if(pub) {
	    notify('note', '<img src="./images/book_icon.png"> <b> ' + pub + ' </b>');
	  }
	  
      notify('success', 'Application has been initialized succesfully; found ' + i + ' site(s) and ' + Object.keys(APWPs).length + ' APWP(s)');
	  
      setStorage();
	  
    }

  })();	
}

/* FUNCTION site [CONSTRUCTOR]
 * Description: Site Constructor that adds a new site to the application
 * Input: site meta data and input data
 * Output: calls processing and eventually adds a new site to the global sites object
 */
var site = function(metaData, inputData, notifyUser) {

  "use strict";

  // Save original input data by creating a copy
  this.userInput = {
    'data': JSON.parse(JSON.stringify(inputData)),
    'metaData': metaData
  }

  // Get the site name from the site meta data and the specified cutoff
  var siteName = metaData.name;
  var cutoff = metaData.cutoff || 45;
		
  // Start processing procedure in geographic coordinates
  this.data = new processInput(JSON.parse(JSON.stringify(inputData)), cutoff);

  // Get the tilt corrected directions
  var dataCopy = JSON.parse(JSON.stringify(inputData));
  var rotatedInputData = new Array();

  // Get the rotated input data in tectonic coordinates
  for(var i = 0; i < dataCopy.length; i++) {

    var direction = dataCopy[i];

    var dirLiteral = {
      'dec': direction[0],
      'inc': direction[1]
    }

    var bed = direction[2];
    var dip = direction[3];

    var rotatedDirection = correctBedding(bed, dip, dirLiteral)

    // Copy the input data and rewrite the rotated declination & inclination
    direction[0] = rotatedDirection.dec;
    direction[1] = rotatedDirection.inc;
    rotatedInputData.push(direction);

  }

  // Same processing in tilt corrected coordinates
  this.dataTC = new processInput(rotatedInputData, cutoff);

  // Ignore site TEMP (it is internally used for combining sites)
  // Add site to the site selector class that can be used to select sites in the modules
  if(siteName !== 'TEMP') {

    if(notifyUser) {
      notify('success', 'Site <i>' + siteName + '</i> succesfully added');
    }

    $('.siteSelector').append("<option value=\"" + siteName + "\">" + siteName + "</option>");
    $('.siteSelector').multiselect('refresh');

  }

}

/*
 * function updateSiteSelector
 */
var updateSiteSelector = function () {

  $(".siteSelector").find('option').remove().end();
  for(name in sites) {
    if(name !== "TEMP") {
      $('.siteSelector').append("<option value=\"" + name + "\">" + name + "</option>");		
    }
  }

  $('.siteSelector').multiselect('refresh');

}

/* 
 * FUNCTION site.prototype.remove
 * Adds prototype funciton to site constructor to remove sites
 * Input: NULL
 * Output: VOID (removes site)
 */
site.prototype.remove = function() {

  // Get the name for the site
  var name = this.userInput.metaData.name;
	
  // Delete method from sites GLOBAL object
  delete sites[name];	
	
  // Remove from the siteSelector class and force refresh
  $('.siteSelector option[value="' + name + '"]').remove();
  $('.siteSelector').multiselect('refresh');
	
  notify('success', 'Site ' + name + ' removed succesfully.');

  setStorage();
	
};

/* 
 * FUNCTION constructEllipseParameters
 * Description: construct ellipse based on type
 * Input: data, and the type of ellipse
 * Output: bla
 */
var constructEllipse = function(data, type) {

  // Build the ellipse parameters for the three different confidence envelopes
  // Types are: Kent, a95, and A95 (a95pole)
  if(type === 'kent') {
    var ellipseParameters = {
      'xDec': data.params.mDec,
      'xInc': data.params.mInc,
      'yDec': data.params.kentParameters.zDec,
      'yInc': data.params.kentParameters.zInc,
      'zDec': data.params.kentParameters.eDec,
      'zInc': data.params.kentParameters.eInc,
      'beta': data.params.kentParameters.eta,
      'gamma': data.params.kentParameters.zeta
    }
  } else if(type === 'a95') {
    var ellipseParameters = {
      'xDec': data.params.mDec,
      'xInc': data.params.mInc,
      'yDec': data.params.mDec,
      'yInc': data.params.mInc - 90,
      'zDec': data.params.mDec + 90,
      'zInc': 0,
      'beta': data.params.a95,
      'gamma': data.params.a95
    }
  } else if(type === 'a95pole') {
    var ellipseParameters = {
      'xDec': 0,
      'xInc': 90,
      'yDec': 0,
      'yInc': 0,
      'zDec': 90,
      'zInc': 0,
      'beta': data.params.A95,
      'gamma': data.params.A95
    }	
  } else {
    throw('Calling constructEllipseParameters with improper argument type; expected string ("kent", "a95", "a95pole")');
  }
	
  // Call the ellipse drawing function
  // This returns an object containing positive and negative ellipse data
  var ellipse = ellipseData(ellipseParameters, false);

  // If the type is a95pole we need to transform the ellipse and fix it
  if(type === 'a95pole') {
    ellipse = transformEllipsePole(data, ellipse);
  }

  return ellipse;

}

/* 
 * FUNCTION transformEllipsePole
 * Description: takes an ellipse and transforms it to a mean declination/inclination
 *			  : used for the A95 ellipse
 * Input: data, ellipse data
 * Output: fixed ellipse
 */
var transformEllipsePole = function (data, ellipse) {

  // Define the fixedEllipse object that will carry the transformed data
  var fixedEllipse = {
    'pos': new Array(), 
    'neg': new Array()
  }

  // Parameters to prevent Highcharts from making connections across the projection
  var doOnce = true;
  var doOnce2 = true;
	
  for(var i = 0; i < ellipse.pos.length; i++) {
    if(ellipse.pos[i] !== null) {
		
    // Our input is a circle drawn around the pole with confidence limit A95, we will transform these poles to a direction
    // For this we use the absolute paleolatitude from our inclination and put declination to 0
    var transformedPosition = invPoles(Math.abs(data.params.palat), 0, [ellipse.pos[i].x, ellipse.pos[i].inc, 0, 0, 0]);
			
    // If there is NaN in the ellipse data, it won't draw properly on the chart
    if(isNaN(transformedPosition[0])) transformedPosition[0] = 0;
			
      // Put reversed on the reversed side of the projection (push null when a flip occurs so Highcharts does not connect the points)
      if(transformedPosition[1] >= 0) {

        if(doOnce) {
          fixedEllipse.neg.push(null);
          doOnce = false;
        }

        // Add the site mean declination to the ellipse data declinations, this will put it in the right position
        fixedEllipse.pos.push({
          'x': (data.params.mDec + transformedPosition[0]) % 360,
          'y': eqArea(transformedPosition[1])
        });

      } else {
        if(doOnce2) {
          fixedEllipse.pos.push(null);
          doOnce2 = false;
        }

        // Same thing, only 180 degrees more on the declination
        fixedEllipse.neg.push({
          'x': (data.params.mDec + transformedPosition[0] + 180) % 360,
          'y': eqArea(transformedPosition[1])
        });

      }
    }
  }
	
  // Ellipse has been fixed to the directions, return
  return fixedEllipse;

}

/*
 * FUNCTION processInput
 * Description: handles initial processing (45-cutoff and statistical parameters) for input data
 * Input: Sanitized input data
 * Output: (Constructor) site parameters, directions, and VGPs
 */
var processInput = function(inputData, cutoffType) {

  // Get the relative VGP positions through the poles routine for the directions (site latitude and longitude are trivial and put to 0, 0 
  // because we are interested in relative VGP positions)
  var VGPs = new Array();
  for(var i = 0; i < inputData.length; i++) {
    VGPs.push(poles(0, 0, inputData[i]));
  }
	
  // Initially write all input directions and VGPs to the accepted data block since as have not applied a cutoff yet
  this.dir = {
    rejected: new Array(),
    accepted: inputData
  }
	
  this.vgp = {
    rejected: new Array(),
    accepted: VGPs 
  };
	
  // Apply the cutoff
  // Continue this loop until all VGPs are accepted and the loop is broken by a break statement
  var cut = 0;
  while(true) {
	
    // Sum of angles
    var deltaSum = 0;
		
    // Request simple Fisher parameters for  accepted data
    // Simple Fisher returns only mDec and mInc (or mLon, mLat)
    this.params = new fisher(this.dir.accepted, 'dir', 'simple');
    $.extend(this.params, new fisher(this.vgp.accepted, 'vgp', 'simple'));
	
    // Number of data points remaining in the accepted VGP block.
    var nPoints = this.vgp.accepted.length;
	
    // Check the cutoff
    var cutoff;
    if(cutoffType === 'vandamme') {
      cutoff = 0;		
    } else if (cutoffType === '45') {
      cutoff = 45;
    }
	
    for(var j = 0; j < nPoints; j++){
		
      // Find the angle between the mean VGP (mLon, mLat) and the particular VGPj.
      var angleToMean = angle( this.params.mLon, this.params.mLat, this.vgp.accepted[j][0], this.vgp.accepted[j][1] );	
			
      // Capture the maximum angle from the mean and save its index
      if(angleToMean > cutoff) {
        cutoff = angleToMean;
        var index = j;
      }

      deltaSum += Math.pow(angleToMean, 2);
		
    }
		
    // Calculate ASD (scatter) and optimum cutoff angle (A) (Vandamme, 1994)
    var ASD = Math.sqrt(deltaSum / (nPoints - 1));
    var A = 1.8 * ASD + 5;
		
    // Check if the user requested a Vandamme, 45, or no cutoff
    // break the processing if the condition for the cutoff is no longer met
    if(cutoffType === 'vandamme') {
      if(cutoff < A) {
        cut = A;
        break;
      }
    } else if (cutoffType === '45') {
      if(cutoff <= 45) {
        cut = 45;
        break;
      }
    } else if(cutoffType === 'none') {
      cut = 0;
      break;
    }

    // Push the rejected VGP and direction at recorded index to the rejected object
    // and remove (slice) it from the accepted object
    this.vgp.rejected.push(this.vgp.accepted[index]);
    this.vgp.accepted.splice(index, 1);
		
    this.dir.rejected.push(this.dir.accepted[index]);
    this.dir.accepted.splice(index, 1);
		
  }
	
  // Request full Fisher parameters and extend the statistical parameter object
  this.params = new Object();

  // Get the Fisher parameters for the accepted directions & VGPs
  $.extend(this.params, new fisher(this.dir.accepted, 'dir'));
  $.extend(this.params, new fisher(this.vgp.accepted, 'vgp'));

  // Extend with some more parameters
  $.extend(this.params, {
    'cut': cut,
    'S': ASD,
    'Ns': this.dir.accepted.length + this.dir.rejected.length
  });
	
  var palat = this.params.palat;
	
  // Get Kent parameters
  $.extend(this.params, getKentParametersNew(this.dir.accepted));
	
  // Extend our parameters with the Butler (1992) parameters from paleolatitude + A95
  var butlerParams = butler(palat, this.params.A95, this.params.mInc);
  if(butlerParams !== undefined) {
    $.extend(this.params, butlerParams);
  } else {
    $.extend(this.params, {'dDx': 0, 'dIx': 0});
  }
	
  // Create a new method of rotated VGPs with the mean direction located at the pole.
  var vgpRotatedAccepted = new Array();
  var vgpRotatedRejected = new Array();

  this.vgpRotated = {
    accepted : new Array(),
    rejected : new Array()
  };

	
  // Loop over all accepted and rejected VGPs and rotate them so the mean VGP (mLon, mLat) faces up.
  for(var i = 0; i < this.vgp.accepted.length; i++) {
    var rotatedVGPi = rotat(this.params.mLon, this.params.mLat, this.vgp.accepted[i])
    this.vgpRotated.accepted.push(rotatedVGPi);
  }
  for(var i = 0; i < this.vgp.rejected.length; i++) {
    var rotatedVGPi = rotat(this.params.mLon, this.params.mLat, this.vgp.rejected[i])
    this.vgpRotated.rejected.push(rotatedVGPi);
  }
	
}

/* 
 * FUNCTION: inputError
 * Description: Highlighting function for site name input (only fancy)
 * Input: element to be highlighted
 * Output: VOID
 */
var inputError = function(element) {

  element.animate({"border-color": "#F00", "background-color": "rgba(256, 0, 0, 0.1)"}, 1000);
  element.animate({"border-color": "#7798BF", "background-color": "rgba(256, 256, 256, 0.1)"}, 1000);

}

/* 
 * FUNCTION: setStorage
 * Description: sets userInput to HTML5 localStorage
 * Input: NULL
 * Output: VOID
 */
var setStorage = function() {

  // Got here through URL, do not set storage
  if(location.search) {
	return;
  }

  // Define the object to be saved
  var pMag = {
    'data': new Array(),
    'version': version,
    'apwp': APWPs
  }

  // Only store the user input and not the processed data
  // Skip internally used site "TEMP"
  for(var key in sites) {
    if(key !== 'TEMP') {
      pMag.data.push(sites[key].userInput);
    }
  }
	
  if(!localStorage) {
    notify('failure', 'Local storage is not supported. Please export your data manually.');
    return;
  }

  try {
    localStorage.setItem('pMag', JSON.stringify(pMag));
  } catch (err) {
    notify('failure', 'There was a fatal error saving data to local storage; please export your data manually. (' + err + ')');
  }

}

/*
 * FUNCTION: processUserInput
 * Description: Checks and validates the user input
 * Input: user input
 * Output: output data and sanitization flag (bool)
 */
var processUserInput = function(data, type, name) {

  // Bucket for output data and sanitization flag
  var output = new Array();
  var sanitized = true;
  var lineNumber = 0;
	
  // Split input on new lines and remove blank lines
  var lines = data.split('\n').filter(function(x) {
    return x !== "";
  });
	
  // Return if no input or less than 2 directions
  if(lines.length === 0) {
    sanitized = false;
    notify('failure', 'The data input field is empty.');
  } 
	
  // Sanitization for literature (sampled) and magnetic directions is different
  // Type: magnetic directions (interpreted or default)
  if(type === 'dir' || type === 'int') {
	
    if(lines.length < 2) {
      sanitized = false;
      notify('failure', 'A minimum of two magnetic directions are required.');
    } 

    lines = lines.filter(function(x) {
      return Boolean(lines);
    });
		
    // Start sanity check for all lines
    for(var i = 0; i < lines.length; i++) {
		
      // Minimum expected number of parameters per line (dec, inc)
      var expected = 2;

      // Get the parameters to include
      var includeBedding = $('#includeBedding').prop('checked');
      var includeName = $('#includeName').prop('checked');
      var includeStrat = $('#includeStrat').prop('checked');
			
      // Regex for splitting on tabs and commas; p becomes an array p[c0, c1, c2, c3, c4] where c represents column
      // Also remove double spaces
      var p = lines[i].split(/[,\t]+/).filter(function(x) {
        return x !== "";
      });

      if(p.length === 0) {
        continue;
      }

      var numberInput = p.length;

      // Default bedding parameters and sample name
      var bedOrient = 0, bedDip = 0;
      var sampleName = name + '.' + (i+1);
      var stratLevel = 0;

      var declination = Number(p.shift());
      var inclination = Number(p.shift());

      // If user specified bedding is included
      if(includeBedding) {
        expected += 2;
        var bedOrient = (Number(p.shift()) + 360)%360;
        var bedDip = Number(p.shift());
      }

      // If user specified name is included
      if(includeName) {
        expected++;
        var sampleName = p.shift().trim();
      }

      // If user specified stratigraphic level is included
      if(includeStrat) {
        expected++;
        var stratLevel = Number(p.shift());
      }

      if(expected !== numberInput) {
        notify('failure', 'Expected number of parameter does not match the input');
        sanitized = false;
        break;
      };

      // Check declination/inclination bounds (0, 360) and (-90, 90)
      // If we find a problem, break the procedure
      if(declination >= 0 && declination <= 360 && inclination >= -90 && inclination <= 90 && bedOrient >= 0 && bedOrient <= 360)  {
        output.push([declination, inclination, bedOrient, bedDip, sampleName, stratLevel]);
      } else {
        sanitized = false;
        break;								
      }
    }

  // Different sanitization for sampled data (dec, inc, N, k)
  } else if (type == 'lit') {
	
    // Iterate over all specified lines
    for(var j = 0; j < lines.length; j++) {
				
      // Bucket to hold directions for a single simulation (iteration)
      var outputIteration = new Array();
      var p = lines[j].split(/[,\t]+/).filter(function(x) {
        return x !== "";
      });
				
      p[0] = p[0] % 360;
      if(Number(p[0]) >= 0 && Number(p[0]) <= 360 && Number(p[1]) >= -90 && Number(p[1]) <= 90) {
        var dec = Number(p[0]);
        var inc = Number(p[1]);
      } else {
        notify('failure', 'Declination or inclination not within expected bounds.');
        sanitized = false;
        break					
      }
				
      // Check if user input is sane (N, K positive and numeric, check if N is an integer)
      if(isPositiveInteger(p[2])) {
        var N = p[2];
      } else {
        notify('failure', 'Input parameter N is not a positive integer.');
        sanitized = false;
        break
      }
				
      if(p[3] > 0) {
        var K = p[3];
      } else {
        notify('failure', 'Input parameter K is not numeric or positive.');
        sanitized = false;
        break;
      }
				
      var inputDataSampled = new Array();
      var sampleVGP = $("#sampleFish input[type='radio']:checked").val();				
				
      // Sample a Fisherian distribution with N and Kappa
      var sampled = sampleFisher(N, K);
				
      // Pole longitude, pole latitude, bedding orientation, bedding dip, name, and stratigraphic level
      for(var i = 0; i < sampled.dec.length; i++) {
        inputDataSampled.push([sampled.dec[i], sampled.inc[i], 0, 0, name + '.' + (i+1), 0]);
      }
				
      // If the user wishes to sample VGPs instead of Fisherian directions
      if(sampleVGP === 'fishVGP') {
	
        // Get paleolatitude from user input inclination
        var paleoLatitude = diPalat(inc);
					
        // Inverse the poles to directions at particular paleolatitude (longitude is arbitrary and put to 0)
        // We will add the declination later
        for(var i = 0; i < inputDataSampled.length; i++) {
          outputIteration.push(invPoles(paleoLatitude, 0, inputDataSampled[i]));
        }

      } else if(sampleVGP === 'fishDIR') {

        // Use the rotat function to rotate directions sampled around North
        // to a given inclination (use dec = 180) to force reverse rotation
        // from North -> direction instead of direction -> North
        for(var i = 0; i < inputDataSampled.length; i++) {
          outputIteration.push(rotat(180, inc, inputDataSampled[i]));
        }	

      } else {
        throw("Unknown type of sampling.");
      }
				
      // Rotate directions to user input declination
      for(var i = 0; i < outputIteration.length; i++) {
        outputIteration[i][0] = (outputIteration[i][0] + dec) % 360;
        output.push(outputIteration[i]);
      }

      var lineNumber = (j + 1);

    }

  }
	
  // Output.data contains [[declination, inclination, bedding orientation, bedding dip, sample name], [...] ]
  // Return the data
  this.output = {
    'data': output,
    'sanitized': sanitized,
    'line': lineNumber + 1
  }

}

/* FUNCTION: constructMetaData
 * Type: Constructor
 * Description: creates site meta data (e.g. name, location, age, author) and returns the meta data object
 * 			  : input data that cannot be updated by editing and is locked adding a new site
 * Input: NULL
 * Output: site meta data object
 */
var constructMetaData = function(edit) {

  var siteName = $('#siteName').val();
  var latitude = Number($('#siteLat').val());
  var longitude = Number($('#siteLng').val());
  
  var age = Number($('#siteAge').val());
  var minAge = Number($('#siteBoundMin').val());
  var maxAge = Number($('#siteBoundMax').val());
  
  var author = $("#authorID").val();
  var description = $("#siteDesc").val();

  var lithology = $("#lithology").val();
  var plateId = Number($("#plateId").val());
  var carriers = $("#carriers").val();
  
  // Escape illegal characters (backslash and double quotes)
  this.name = siteName.replace(/[\\"]/g,''); 

  // If editing, 
  if(edit) {
	  
	this.edited = true;
	this.timeEdited = new Date().toISOString();
	
  } else {
  
    this.dateAdded = new Date().toISOString();
    this.version = version;
    this.markerColor = 'orange';	

    this.cutoff = $("#cutoffSelector").val()[0];
	
    // Get the type of data (sampled, input, or from interpretation portal)
    var type = $('#siteType').val();
    if(type === 'lit') {
      this.type = 'Simulated';
    } else if(type === 'dir') {
      this.type = 'Input';
    } else if(type === 'int') {
      this.type = 'Interpretation';
    }
	
  }

  // Data specified in the advanced options tab (if unspecified fall back to default values)
  this.description = description ? description : null;
  
  this.plateId = plateId ? plateId : null;
  this.lithology = lithology ? lithology : null;
  this.carriers = carriers ? carriers : null;
  
  this.author = author ? author : null;
  this.age = age ? age : null;
  this.minAge = minAge ? minAge : null;
  this.maxAge = maxAge ? maxAge : null;
  this.latitude = latitude ? Number(latitude) : null;
  this.longitude = longitude ? Number(longitude) : null;

  this.sanitized = checkNumeric([this.age, this.minAge, this.maxAge, this.latitude, this.longitude]);	

}

/*
 * FUNCTION checkNumeric
 * Description: function to check if elements in the data array are all numeric or null
 * Input: Array of values [ ... , ... ]
 * Output: boolean
 */
function checkNumeric(data)  {
  return data.every(function(x) {
    return x === null || $.isNumeric(x);
  });
}

/*
 * FUNCTION parseAgeName
 * Description: parses the age and age bounds to the input/edit boxes
 * Input: age and age bounds
 * Output: VOID
 */
function parseAgeName(ages) {

  // Update the input box with ages
  $("#siteAge").val(((ages.min + ages.max) / 2).toFixed(1));
  $("#siteBoundMin").val(ages.min);
  $("#siteBoundMax").val(ages.max);

}	
