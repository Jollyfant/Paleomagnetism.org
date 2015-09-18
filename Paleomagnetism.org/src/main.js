/* PALEOMAGNETISM.ORG MAIN FRAMEWORK FUNCTIONS
 * 
 * VERSION: ALPHA.1509
 * LAST UPDATED: 09/12/2015
 *
 * JavaScript file containing main functionality procedures for the Paleomagnetism.org statistics portal.
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */
 
 //Current application version
version = 'vALPHA.1509.2';

//Create the modules object that will carry all functional modules
module = new Object();

module.options = {
	update: {
		dir: false,
		mean: false,
		foldtest: false
	}
}

//Define globals
var sites, APWPs, addSitesTimed;

//DOM ready for manipulation
$(function() {
	
	"use strict";
	
	//First initialize jQuery UI Elements
	jQueryInit();
	
	//Initialize Paleomagnetims.org application.
	applicationInit();

});

/*
 * FUNCTION getCDF
 * Description: calculates a cumulative distribution function for an array of (unsorted) parameters
 * Input: array of (unsorted) parameters
 * Output: Highcharts formatted CDF of input
 */
function getCDF ( input ) {

	"use strict";
	
	var length = input.length;
	
	//Sort the input from low - high
	input.sort(function (a, b) {
		return a > b ? 1 : a < b ? -1 : 0;
	});
	
	//Calculate the cumulative distribution function of the sorted input
	//Formatted as a Highcharts data object
	var output = new Array();
	for(var i = 0; i < length; i++) {
		output.push({
			'x': input[i], 
			'y': i/(length - 1)
		});
	}
	
	return output;
}

/*
 * FUNCTION showGeomagneticDirections
 * Description: shows geomagnetic directions in the geomagnetic directions tab
 * Input: NULL
 * Output: VOID (calls plotting functions)
 */
var showMeanDirections = function () {

	"use strict";
	
	//Get selected sites
	var siteNames = $('#meanSel').val();
	if(siteNames === null) {
		$("#meanDirHide").hide();
		return;
	}
	
	//Loop over all sites and push the statistical parameters to the statisticsArray
	//These parameters is all we require to do the plotting (mean direction and confidence interval)
	//In GEOGRAPHIC coordinates
	var statisticsArray = new Array();
	for(var i = 0; i < siteNames.length; i++) {
		statisticsArray.push({'data': sites[siteNames[i]].data, 'name': siteNames[i]});
	}

	plotMeans(statisticsArray, 'siteMean', 'Geographic Coordinates');
	
	//Repeat the procedure for TECTONIC coordinates	
	var statisticsArrayTilted = new Array();
	for(var i = 0; i < siteNames.length; i++) {
		statisticsArrayTilted.push({'data': sites[siteNames[i]].dataTC, 'name': siteNames[i]});
	}
	
	plotMeans(statisticsArrayTilted, 'siteMeanTC', 'Tectonic Coordinates');		

	//Show the figures
	$("#meanDirHide").show();
	
	var temp = new Array();
	var names = new Array();
	
	for(var i = 0; i < siteNames.length; i++) {
		temp.push(sites[siteNames[i]].data.params, sites[siteNames[i]].dataTC.params);
		names.push(sites[siteNames[i]].userInput.metaData.name, sites[siteNames[i]].userInput.metaData.name + ' <small>(Tectonic)</small>');
	}
	
	//Create and show direction table
	$("#meanTable").html(directionTable(temp, names));
	$("#meanTable").show();	
}

/*
 * FUNCTION showGeomagneticDirections
 * Description: shows geomagnetic directions in the geomagnetic directions tab
 * Input: NULL
 * Output: VOID (calls plotting functions)
 */
var showGeomagneticDirections = function () {
	
	"use strict";
	
	$('#saveGroupDiv').hide();
	
	//Get the selected sitenames
	var siteNames = $('#dirSel').val();
	if(siteNames === null) {
		$("#magDirHide").hide();
		return;
	}
		
	//Give the user the option to save the site
	//Show user option to save this combination
	$('#saveGroupDiv').show().css('display', 'inline-block');
	$('#saveGroupButton').hide();
	
	var selectedCutoff = $("#cutoffSelectorDirections").val()[0];
	
	if(siteNames.length !== 1 || selectedCutoff !== sites[siteNames[0]].userInput.metaData.cutoff) {
	
		$('#saveGroupButton').show().css('display', 'inline-block');
	
		//Bucket to keep data input for all sites to be merged
		var siteDataArray = new Array();
		for(var i = 0; i < siteNames.length; i++) {
			siteDataArray.push(sites[siteNames[i]].userInput.data);
		}
		
		//Merge the input data to a single array
		var merged = [].concat.apply([], siteDataArray);
		
		//Meta data for temporary site if a multiple of sites is selected
		//temporary site is internally referred to as 'TEMP'
		//Put latitude/longitude to null and ages to 0; the user can change this through the edit metaData option
		var metaData = {
			'name'			: 'TEMP',
			'latitude'		: null,
			'longitude'		: null,
			'age'			: null,
			'minAge'		: null,
			'maxAge'		: null,
			'markerColor'	: 'white',
			'cutoff'		: selectedCutoff,
		}
			
		//Add a new site with name TEMP to the application
		sites['TEMP'] = new site(metaData, merged, false);
	
		//Set the siteNames to the newly created TEMP site
		var siteNames = 'TEMP';
	}
	
	//Call plot functions for equal area projection and virtual geomagnetic poles
	eqAreaDirections(siteNames);
	eqAreaVGPs(siteNames);

	//Show the geomagnetic direction module
	$("#magDirHide").show();
	
}

/*
 * FUNCTION changeAge
 * Description: calls function to change ages from selection box on pre-set ages
 * Input: id@string of the box that changes (edit or add)
 * Output: VOID (calls parseAgeName to put data in the appropriate boxes)
 */
var changeAge = function (id) {

	"use strict";
	
	var age = $("#" + id).val(); //Get select box input for the edit or original ID
	
	//Check age and parse the appropriate ages
	//Average, minimum, maximum
	if(age == 'Blank') parseAgeName('', '', '', id);
	else if(age == 'Holocene') parseAgeName(0.005, 0, 0.01, id);
	else if(age == 'Pleistocene') parseAgeName(1.3, 0.01, 2.6, id);
	else if(age == 'Pliocene') parseAgeName(4.0, 2.6, 5.3, id);
	else if(age == 'Miocene') parseAgeName(14.2, 5.3, 23.0, id);
	else if(age == 'Oligocene') parseAgeName(28.5, 23.0, 33.9, id);
	else if(age == 'Eocene') parseAgeName(45.0, 33.9, 56.0, id);
	else if(age == 'Paleocene') parseAgeName(61.0, 56.0, 66.0, id);
	else if(age == 'Cretaceous') parseAgeName(106, 66.0, 145, id);
	else if(age == 'Jurassic') parseAgeName(173, 145, 201, id);
	else if(age == 'Triassic') parseAgeName(226, 201, 252, id);
	else if(age == 'Permian') parseAgeName(276, 252, 299, id);
	else if(age == 'Carboniferous') parseAgeName(318, 299, 359, id);
	else if(age == 'Devonian') parseAgeName(389, 359, 419, id);
	else if(age == 'Silurian') parseAgeName(432, 419, 444, id);
	else if(age == 'Ordovician') parseAgeName(465, 444, 485, id);
	else if(age == 'Cambrian') parseAgeName(513, 485, 541, id);
		
}

/*
 * FUNCTION removeSite
 * Description: removes site from application
 * Input: NULL
 * Output: VOID (removes site)
 */
var removeSite = function () {
	
	"use strict";
		
	//No sited in sites object (everything has been deleted)
	if(Object.keys(sites).length === 0) {
		notify('failure', 'There are no sites to delete.')
		return;
	}
	
	//Get the selected sites; this returns an array of all selected site names
	var siteName = $('#introSel').val();
	if(siteName === null) {
		notify('failure', 'No sites are selected for deletion.')
		return;
	}
	
	//Remove the site
	for(var i = 0; i < siteName.length; i++){
		sites[siteName[i]].remove();
	}
	
	//Next time the direction and mean tabs are opened, refresh the chart; this removes charts that still show the newly deleted data
	module.options.update = {
		dir: true,
		mean: true
	}
}

/*
 * FUNCTION addSite
 * Description: adds site to application
 * Input: NULL
 * Output: VOID (adds site; calls site constructor)
 */
var addSite = function () {

	"use strict";
	
	$("#nameDiv").animate().stop();
	$(".linedwrap").animate().stop();
	$(".linedtextarea").animate().stop();
	
	//Obtain site meta data (name, location, age)
	var metaData = new constructMetaData;
	if(!metaData.sanitized) {
		notify('failure', 'An unexpected error while parsing site meta data. Please check location and age information.');
		return;	
	}
	
	//Site name error catching
	if(!checkName(metaData.name)) {
		return;
	}
		
	//Get site data
	var type = $('#siteType').val();
	var siteDat = $('#dropZone').val();

	//Request sanitization on site input data
	var inputData = new processUserInput(siteDat, type, metaData.name).output;	
	
	//If the input is cleared, add a new site and close the data input window
	if(!inputData.sanitized) {
		notify('failure', 'Site input did not pass sanitization. Breaking procedure; please check input at line ' + inputData.line + '.');
	} else {
		sites[metaData.name] = new site(metaData, inputData.data, true);
		$('#input').dialog("close");
	}
	
	setStorage();
	
}

/* FUNCTION addAPWP
 * Description: adds an APWP to application and localStorage
 * Input: NULL
 * Output: VOID (adds APWP)
 */
var addAPWP = function () {

	"use strict";
	
	//Get name and check
	var name = $("#APWPName").val();
	if(name == '') {
		notify('failure', 'Field name is empty.');
		return;
	}
	
	if(APWPs.hasOwnProperty(name)) {
		notify('failure', 'An APWP with name ' + name + ' already exists.');
		return;
	}
	
	var APWPdata = $("#APWPZone").val();
 
	//Define data buckets
	var age = new Array();
	var A95 = new Array();
	var lon = new Array();
	var lat = new Array();
	
	//Split by lines and remove white lines
	var lines = APWPdata.split('\n');
	lines = $.grep(lines, function(n) { 
		return(n) 
	});
	
	//Loop over all the lines and put the proper parameters in the proper bucket
	for(var i = 0; i < lines.length; i++) {
	
		var p = lines[i].split(/[,\s\t]+/);
		age.push(Number(p[3]));
		A95.push(Number(p[2]));
		lon.push(Number(p[1]));
		lat.push(Number(p[0]));
	}
	
	APWPs[name] = {
		'age': age, 
		'A95': A95, 
		'lon': lon, 
		'lat': lat
	}
	
	//Post-processing; update user and force update for multiselect
	notify('success', 'APWP ' + name + ' has been added.');
	
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
 var removeAPWP = function () {

	"use strict";
	
	//Get the selected APWPs
	var paths = $("#plateNames").val() 
	if(paths == null) {
		notify('failure', 'No apparent polar wander paths are selected.');
		return;
	}
	
	//Loop over all paths
	for(var i = 0; i < paths.length; i++) {
	
		var plateName = paths[i];
		var realPlateName = $("#plateNames option[value='"+plateName+"']").text();	
		var custom = eval($('#plateNames option[value="'+plateName+'"]').attr('custom'));
	
		//Only remove custom APWPs
		if(custom) {
			delete APWPs[plateName];
			$('#plateNames option[value="'+plateName+'"]').remove();
			$('#plateNames').multiselect('refresh');
			notify('success', 'APWP for ' + realPlateName + ' has been succesfully deleted.');
		} else {
			notify('failure', 'APWP for ' + realPlateName + ' cannot be deleted. It is not a custom APWP.');
		}
	}	
	setStorage(); //Save
 }
 
/*
 * FUNCTION removeInterpretations
 * Description: removes interpretations from localStorage
 * Input: NULL
 * Output: VOID (removes interpretation from localStorage)
 */
var removeInterpretations = function () {

	"use strict";
	
	var name = $("#interpretedSites").val();
	var nameText = $("#interpretedSites").text();
	
	if(name != null) {
		var interpretations = localStorage.getItem('savedInt');
		if(interpretations != null) {
			var index = $("#interpretedSites option:selected").index();
			
			interpretations = JSON.parse(interpretations);
			interpretations.splice(index, 1);
			localStorage.setItem('savedInt', JSON.stringify(interpretations));
			
			$('#interpretedSites option[value="'+name+'"]').remove();
			$('#interpretedSites').multiselect('refresh');
			
			notify('success', 'Site ' + nameText + ' has been deleted succesfully from saved interpretations.');
		}
	} else {
		notify('failure', 'No site selected for deletion.');
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

	"use strict";
	
	var name = $("#interpretedSites").val();
	if(name != null) {
		var name = $("#interpretedSites").val()[0];
		var interpretations = JSON.parse(localStorage.getItem('savedInt'));
	
		var index = $("#interpretedSites option:selected").index();

		var input = '';
		var capture = interpretations[index].data;
		
		var coordType = interpretations[index].coordType;		
		if(coordType == 'TECT') {
			var coordinateReadable = 'Tectonic';
		} else {
			var coordinateReadable = 'Geographic';
		}
		
		//Generate line from dec, inc, bedding, and sample name
		//Only put the bedding if the site has been interpreted in GEOGRAPHIC coordinates WITHOUT fitted great circles
		//Otherwise, just put directions without beddings
		if(interpretations[index].type == 'directions' && coordType == 'GEO') {
			for(var i = 0; i < capture.length; i++) {
				input += capture[i].dec + ', ' + capture[i].inc + ', ' + capture[i].bedStrike + ', ' + capture[i].bedDip + ', ' + capture[i].sample + '\n';
			}
		} else {
			for(var i = 0; i < capture.length; i++) {
				input += capture[i].dec + ', ' + capture[i].inc + ', ' + capture[i].sample + '\n';
			}				
		}
		
		//Put data in the textarea and name in name-area
		$("#dropZone").val(input); 
		$("#siteName").val($('#interpretedSites option[value="'+name+'"]').text());
		
		//Give user some feedback on the coordinate reference frame to avoid confusion
		$("#interpretationInfo").html('<b> Note: </b> Site has been interpreted in ' + coordinateReadable + ' Coordinates.');
		
		//Alert that the site has been fitted with great circles and therefore bedding is unavailable
		if(interpretations[index].type == 'great circles') {
			$("#interpretationInfo").append(' Site has been fitted with great circles.');
		}
	}
	
}

/*
 * FUNCTION checkName
 * Description: checks name for rules
 * Input: Site name (string)
 * Output: BOOLEAN TRUE/FALSE
 */ 
var checkName = function ( name ) {

	"use strict";
	
	//Name is empty
	if(name == '') {
		inputError($("#nameDiv"));
		notify('failure', 'Cannot add site because site name is empty.');
		return false;
	}
	
	//Site already exists in GLOBAL sites object
	if(sites.hasOwnProperty(name)) {
		inputError($("#nameDiv"));
		notify('failure', 'A site with the name ' + name + ' already exists.');
		return false;
	}
	
	//I decided to limit the name length to 15 characters
	//Otherwise the name might overflow the text-areas
	if(name.length > 15) {
		inputError($("#nameDiv"));
		notify('failure', 'Site name is too long (15 characters maximum).');
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

	"use strict";
	
	//Check if user suggested site name is sane
	var name = $("#saveGroupName").val();
	if(!checkName(name)) {
		return false;
	}
		
	//Copy temporary constructed metadata and replace old name with new name
	//Also add some other meta-data
	var metaData = sites['TEMP'].userInput.metaData;
	metaData.name = name;
	metaData.description = 'Multiple Sites';
	metaData.dateAdded = $.datepicker.formatDate('yy-mm-dd', new Date());
	metaData.version = version;
	metaData.sanitized = true;
	metaData.type = 'Site Combination';
	metaData.author = 'Unknown';
	
	//Ignore rejected samples if requested
	var data = $("#excludeRejected").prop('checked') ? sites['TEMP'].data.dir.accepted : sites['TEMP'].userInput.data;
	
	// If checked, reverse all samples to normal polarity	
	if($("#reversePolarity").prop('checked')) {
		for(var i = 0; i < data.length; i++) {
			if(data[i][1] < 0) {
				data[i][1] = Math.abs(data[i][1]);
				data[i][0] = (data[i][0] + 180)%360;
			}
		}
	}
	
	//Call site constructor with the updated metadata and directional data	
	sites[name] = new site(metaData, data, true);
	
	//Save and return
	setStorage();
	return true;
};

/* 
 * FUNCTION getSavedInterpretations
 * Description: Loads saved interpretations from the interpretations portal from localStorage to the select box
 * Input: NULL
 * Ouput: VOID
 */
 var getSavedInterpretations = function () {
 
 	"use strict";
	
	if(localStorage) {
		var interpretations = localStorage.getItem('savedInt');
		if(interpretations != null) {
			interpretations = JSON.parse(interpretations);
			for(var i = 0; i < interpretations.length; i++) {
				var name = interpretations[i].name;
				$('#interpretedSites').append("<option value=\"" + i + "\">" + name + "</option>");
			}
			$('#interpretedSites').multiselect('refresh');
		}
	}
 }
 
/*
 * FUNCTION applicationInit
 * Description: Initializes the Paleomagnetism.org application and loads sites/APWPs saved in localStorage to application
 * Input: NULL
 * Output: VOID
 */ 
var applicationInit = function () { 

	"use strict";
	
	//Paleomagnetism.org can also run offline; some features (e.g. Google Maps will be disabled)
	if(!navigator.onLine){
		notify('failure', 'You are now using Paleomagnetism.org in offline mode - features that require an internet connection are disabled.');
	} 

	//Create new global objects; these objects will contain all application data
	sites = new Object();
	APWPs = new Object();
	
	//Try loading the application data (if any) stored within LocalStorage
	//
	if(localStorage) {
		try {
			var parsedInput = JSON.parse(localStorage.getItem('pMag'));
		} catch (err) {
			notify('failure', 'A critical error has occured loading your data. Local storage had to be cleared. (' + err + ')');
			localStorage.removeItem('pMag'); //If the local storage data cannot be parsed, clear it
			var parsedInput = null;
		}
	} else {
		notify('failure', 'Local storage is not supported. Please export your data manually.');		
		var parsedInput = null;
	}
	
	//Check if there is any data in the local storage
	if ( parsedInput !== null ) {
		if ( parsedInput.version != undefined ) {
			var dataVersion = parsedInput.version;
		}
		if ( parsedInput.data != undefined ) {
			var loadedSites = parsedInput.data;
		}
		if ( parsedInput.apwp != undefined) {
			APWPs = parsedInput.apwp;
		}
	} else {
		dataVersion = version;
		loadedSites = new Array();
	}
	
	//Check if version is up to date
	if(dataVersion != version) {
		notify('note', 'A new version of paleomagnetism.org has been released (' + version + ')');
		
		//Handle update code here (if necessary)
		
	}

	//Parse the APWPs in localStorage to select box and force update
	for(var plate in APWPs) {
		$('#plateNames').append("<option custom=\"true\" value=\"" + plate + "\">" + plate + "</option>");
	}
	$('#plateNames').multiselect('refresh');
	
	getSavedInterpretations();
	
	//Asynchronous implementation of site constructor during application initialization
	//Usually processing time is not a problem, but the page may freeze if the user has many sites with many directions
	//Asynchronous function is called automatically
	var i = 0;
	(addSitesTimed = function () {
		if(i < loadedSites.length) {
			sites[loadedSites[i].metaData.name] = new site(loadedSites[i].metaData, loadedSites[i].data, false);
			i++;
			setTimeout( function() { addSitesTimed(); }, 1);
		} else {
			notify('success', 'Application has been initialized succesfully; found ' + i + ' site(s) and ' + Object.keys(APWPs).length + ' APWP(s)');
			setStorage();
		}
	})();
};

/* FUNCTION site [CONSTRUCTOR]
 * Description: Site Constructor that adds a new site to the application
 * Input: site meta data and input data
 * Output: calls processing and eventually adds a new site to the global sites object
 */
var site = function(metaData, inputData, notifyUser) {

	"use strict";
	
	//Save original input data (use slice to create a copy)
	this.userInput = {
		data: inputData.slice(0),
		metaData: metaData
	}

	//Get the site name from the site meta data and the specified cutoff
	var name = metaData.name;
	var cutoff = metaData.cutoff ? metaData.cutoff : '45';
		
	//Start processing procedure in geographic coordinates
	this.data = new processInput(inputData.slice(0), cutoff);

	//Get the tilt corrected directions
	var rotatedInputData = new Array();

	//Get the rotated input data in tectonic coordinates
	for(var i = 0; i < inputData.length; i++) {
		var bed = (inputData[i][2] + 90);
		var dip = (inputData[i][3] + 90);
		rotatedInputData.push(rotat(bed, dip, inputData[i]));
	}

	//Same processing in tilt corrected coordinates
	this.dataTC = new processInput(rotatedInputData, cutoff);

	//Ignore site TEMP (it is internally used for combining sites)
	//Add site to the site selector class that can be used to select sites in the modules
	if(name != 'TEMP') {
		if(notifyUser) {
			notify('success', 'Site <i>' + name + '</i> succesfully added');
		}
		$('.siteSelector').append("<option value=\"" + name + "\">" + name + "</option>");
		$('.siteSelector').multiselect('refresh');
	}
}

/* 
 * FUNCTION site.prototype.remove
 * Adds prototype funciton to site constructor to remove sites
 * Input: NULL
 * Output: VOID (removes site)
 */
site.prototype.remove = function() {

	"use strict";
	
	//Get the name for the site
	var name = this.userInput.metaData.name;
	
	//Delete method from sites GLOBAL object
	delete sites[name];	
	
	//Remove from the siteSelector class and force refresh
	$('.siteSelector option[value="' + name + '"]').remove();
	$('.siteSelector').multiselect('refresh');
	
	//Delete from global SITES object
	notify('success','Site ' + name + ' removed succesfully.');

	setStorage();
	
};

/* 
 * FUNCTION constructEllipseParameters
 * Description: construct ellipse based on type
 * Input: data, and the type of ellipse
 * Output: bla
 */
var constructEllipse = function ( data, type ) {

	"use strict";
	
	//Build the ellipse parameters for the three different confidence envelopes
	//Types are: Kent, a95, and A95 (a95pole)
	if(type == 'kent') {
		var ellipseParameters = {
			'xDec' 	: data.params.mDec,
			'xInc'	: data.params.mInc,
			'yDec'	: data.params.kentParameters.zDec,
			'yInc'	: data.params.kentParameters.zInc,
			'zDec'	: data.params.kentParameters.eDec,
			'zInc'	: data.params.kentParameters.eInc,
			'beta'	: data.params.kentParameters.eta,
			'gamma'	: data.params.kentParameters.zeta
		}
	} else if (type == 'a95') {
		var ellipseParameters = {
			'xDec' 	: data.params.mDec,
			'xInc'	: data.params.mInc,
			'yDec'	: data.params.mDec,
			'yInc'	: data.params.mInc - 90,
			'zDec'	: data.params.mDec + 90,
			'zInc'	: 0,
			'beta'	: data.params.a95,
			'gamma'	: data.params.a95
		}
	} else if (type == 'a95pole') {
		var ellipseParameters = {
			'xDec' 	: 0,
			'xInc'	: 90,
			'yDec'	: 0,
			'yInc'	: 0,
			'zDec'	: 90,
			'zInc'	: 0,
			'beta'	: data.params.A95,
			'gamma'	: data.params.A95
		}	
	} else {
		notify('failure', 'Calling constructEllipseParameters with improper argument type; expected string ("kent", "a95", "a95pole")');
		return new Object();
	}
	
	//Call the ellipse drawing function
	//This returns an object containing positive and negative ellipse data
	var ellipse = new ellipseData(ellipseParameters, false);

	//If the type is a95pole we need to transform the ellipse and fix it
	if( type == 'a95pole') {
		return transformEllipsePole ( data, ellipse );
	} else {
		return ellipse;
	}
}

/* 
 * FUNCTION transformEllipsePole
 * Description: takes an ellipse and transforms it to a mean declination/inclination
 *			  : used for the A95 ellipse
 * Input: data, ellipse data
 * Output: fixed ellipse
 */
var transformEllipsePole = function ( data, ellipse ) {

	"use strict";
	
	//Define the fixedEllipse object that will carry the data
	var fixedEllipse = {
		pos: new Array(), 
		neg: new Array()
	}

	//Parameters to prevent Highcharts from making connections across the projection
	var doOnce = true;
	var doOnce2 = true;
	
	for(var i = 0; i < ellipse.pos.length; i++) {
		if(ellipse.pos[i] !== null) {
		
			//Our input is a circle drawn around the pole with confidence limit A95, we will transform these poles to a direction
			//For this we use the absolute paleolatitude from our inclination and put declination to 0
			var transformedPosition = invPoles(Math.abs(data.params.palat), 0, [ellipse.pos[i].x, ellipse.pos[i].inc, 0, 0, 0]);
			
			//If there is NaN in the ellipse data, it won't draw properly on the chart
			if(isNaN(transformedPosition[0])) transformedPosition[0] = 0;
			
			//Put reversed on the reversed side of the projection (push null when a flip occurs so Highcharts does not connect the points)
			//Happens once per drawn arc, therefore we can use a boolean for it
			if(transformedPosition[1] >= 0) {
				if(doOnce) {
					fixedEllipse.neg.push(null);
					doOnce = false;
				}
				//Add the site mean declination to the ellipse data declinations, this will put it in the right position
				fixedEllipse.pos.push({x: (data.params.mDec + transformedPosition[0])%360, y: eqArea(transformedPosition[1])});
			} else {
				if(doOnce2) {
					fixedEllipse.pos.push(null);
					doOnce2 = false;
				}
				//Same thing, only 180 degrees more on the declination
				fixedEllipse.neg.push({x: (data.params.mDec + transformedPosition[0] + 180)%360, y: eqArea(transformedPosition[1])});
			}
		}
	}
	
	//Ellipse has been fixed to the directions, return
	return fixedEllipse;
}

/*
 * FUNCTION processInput
 * Description: handles initial processing (45-cutoff and statistical parameters) for input data
 * Input: Sanitized input data
 * Output: (Constructor) site parameters, directions, and VGPs
 */
 var processInput = function(inputData, cutoffType) {

	"use strict";
	
	//Get the relative VGP positions through the poles routine for the directions (site latitude and longitude are trivial and put to 0, 0 
	//because we are interested in relative VGP positions)
	var VGPs = new Array();
	for(var i = 0; i < inputData.length; i++) {
		VGPs.push(poles(0, 0, inputData[i]));
	}
	
	//Initially write all input directions and VGPs to the accepted data block since as have not applied a cutoff yet
	this.dir = {
		rejected: new Array(),
		accepted: inputData
	};
	
	this.vgp = {
		rejected: new Array(), 
		accepted: VGPs 
	};
	
	var dSel = new Array();
	
	//Cutoff
	//Continue this loop until all VGPs are accepted and the loop is broken by a break statement
	while(true) {
	
		//Sum of angles
		var deltaSum = 0;
		
		//Request simple Fisher parameters for  accepted data
		//Simple Fisher returns only mDec and mInc (or mLon, mLat)
		this.params = new fisher(this.dir.accepted, 'dir', 'simple');
		$.extend(this.params, new fisher(this.vgp.accepted, 'vgp', 'simple'));
	
		//Number of data points remaining in the accepted VGP block.
		var nPoints = this.vgp.accepted.length;
	
		//45 cutoff
		if(cutoffType == 'vandamme') {
			var cutoff = 0;		
		} else if (cutoffType == '45') {
			var cutoff = 45;
		}
	
		for(var j = 0; j < nPoints; j++){
		
			//Find the angle between the mean VGP (mLon, mLat) and the particular VGPj.
			var angleToMean = angle( this.params.mLon, this.params.mLat, this.vgp.accepted[j][0], this.vgp.accepted[j][1] );	
			
			//Capture the maximum angle from the mean and save its index
			if(angleToMean > cutoff) {
				cutoff = angleToMean;
				var index = j;
			}
			dSel.push(angleToMean);
			deltaSum += Math.pow(angleToMean, 2);
		
		}
		
		//Calculate ASD (scatter) and optimum cutoff angle (A) (Vandamme, 1994)
		var ASD = Math.sqrt(deltaSum/(nPoints-1));
		var A = 1.8 * ASD + 5;
		
		//Check if the user requested a Vandamme, 45, or no cutoff
		//break the processing if the condition for the cutoff is no longer met
		if(cutoffType == 'vandamme') {
			if(cutoff < A) {
				var cut = A;
				break;
			}
		} else if (cutoffType == '45') {
			if(cutoff <= 45) {
				var cut = 45;
				break;
			}
		} else {
			var cut = 0
			break;
		}

		//Push the rejected VGP and direction at recorded index to the rejected object and remove (slice) it from the accepted object.			
		this.vgp.rejected.push(this.vgp.accepted[index]);
		this.vgp.accepted.splice(index, 1);
		
		this.dir.rejected.push(this.dir.accepted[index]);
		this.dir.accepted.splice(index, 1);
		
	}
	
	//Request full Fisher parameters and extend the statistical parameter object
	this.params = new fisher(this.dir.accepted, 'dir', 'full');
	$.extend(this.params, new fisher(this.vgp.accepted, 'vgp', 'full'));
	$.extend(this.params, {cut: cut, S: ASD, Ns: this.dir.accepted.length + this.dir.rejected.length}); //Total number of directions and VGP scatter	
	
	//Calculate the paleo-latitude from the mean inclination
	var palat = diPalat(this.params.mInc);
	
	//Get Kent parameters
	$.extend(this.params, getKentParameters(this.dir.accepted));
	
	//Extend our parameters with the Butler (1992) parameters from paleolatitude + A95
	var butlerParams = butler(palat, this.params.A95, this.params.mInc);
	if(butlerParams != undefined) {
		$.extend(this.params, butlerParams);
	} else {
		$.extend(this.params, {dDx: 0, dIx: 0});
	}
	
	//Create a new method of rotated VGPs with the mean direction located at the pole.
	var vgpRotatedAccepted = new Array();
	var vgpRotatedRejected = new Array();
	
	//Loop over all accepted and rejected VGPs and rotate them so the mean VGP (mLon, mLat) faces up.
	for(var i = 0; i < this.vgp.accepted.length; i++) {
		var rotatedVGPi = rotat(this.params.mLon, this.params.mLat, this.vgp.accepted[i])
		vgpRotatedAccepted.push(rotatedVGPi);
	}
	for(var i = 0; i < this.vgp.rejected.length; i++) {
		var rotatedVGPi = rotat(this.params.mLon, this.params.mLat, this.vgp.rejected[i])
		vgpRotatedRejected.push(rotatedVGPi);
	}
	
	//Save the rotated VGP to the rotated VGP method
	this.vgpRotated = { 
		accepted : vgpRotatedAccepted,
		rejected : vgpRotatedRejected
	};
	
	
}

/* 
 * FUNCTION: inputError
 * Description: Highlighting function for site name input (only fancy)
 * Input: element to be highlighted
 * Output: VOID
 */
var inputError = function (element) {

	"use strict";
	
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
	
	"use strict";
	
	//Define the object to be saved
	var pMag = {
		data: new Array(),
		version: version,
		apwp: APWPs
	};

	//Only store the userInput and not the processed data
	for(var key in sites) {
		if(key !== 'TEMP') {
			pMag.data.push(sites[key].userInput);
		}
	}
	
	if(localStorage) {
		try {
			localStorage.setItem('pMag', JSON.stringify(pMag));
		} catch (err) {
			notify('failure', 'There was a fatal error saving data to local storage; please export your data manually. (' + err + ')');
		}
	}
}

/*
 * FUNCTION: processUserInput
 * Description: Checks and validates the user input
 * Input: user input
 * Output: output data and sanitization flag (bool)
 */
var processUserInput = function ( data, type, name ) {

	"use strict";
	
	//Bucket for output data and sanitization flag
	var output = new Array();
	var sanitized = true;
	
	//Split input on new lines and remove blank lines
	var lines = data.split('\n');
	lines = $.grep(lines, function(n) { 
		return(n) 
	});
	
	//Sanitization for literature (sampled) and magnetic directions is different
	//Type: magnetic directions (interpreted or default)
	if(type == 'dir' || type == 'int') {
	
		//Return if no input or less than 2 directions
		if(lines.length == 0) {
			sanitized = false;
			notify('failure', 'Data input is empty.');
		} if(lines.length < 2) {
			sanitized = false;
			notify('failure', 'A minimum of two magnetic directions are required.');
		} 
		
		//Start sanity check for all lines
		for(var i = 0; i < lines.length; i++) {
		
			var c3name = false;	//Flag to check if user input sample name on column 3
			
			//Regex for splitting on spaces, tabs, and commas; p becomes an array p[c0, c1, c2, c3, c4] where c represents column
			//Also remove double spaces
			var p = lines[i].split(/[,\s\t]+/); 	
			p = $.grep(p, function(n) { 
				return(n) 
			});
	
			p[0] = (p[0]%360);
		
			//Bedding orientations defaults to 0 - if user input bedding on column 3 read the data
			var bedOrient = 0;
			if(p[2] != undefined) {
				if(!$.isNumeric(Number(p[2]))){
					var c3name = true;				//Did user put sample name on column 3 instead of bedding -> put c3name to true
				} else {
					bedOrient = p[2];				//Otherwise take the bedding
				}
			}

			var bedDip = 0;							//Identical for bedding dip
			if(p[3] != undefined) {
				if(!isNaN(Number(p[3]))) {
					bedDip = p[3];
				} else {
					bedDip = 0;
				}
			}
		
			var sampleName = name + '.' + (i+1);	//Default sample name is the site name concatenated with an increment
			if(c3name) {
				sampleName = p[2]; 					//If user put sample name on column 3 instead of 5
			}
			if(p[4] != undefined) {
				sampleName = p[4];					//Otherwise, if it exists, take sample name from the last column
			}

			//Check declination/inclination bounds (0, 360) and (-90, 90)
			if( Number(p[0]) >= 0 && Number(p[0]) <= 360 && Number(p[1]) >= -90 && Number(p[1]) <= 90 && Number(bedOrient) >= 0 && Number(bedOrient) <= 360)  {
				output.push([Number(p[0]), Number(p[1]), Number(bedOrient), Number(bedDip), sampleName]);
			} else {
				//Found a problem, break the procedure
				sanitized = false;
				break;								
			}
		}

		//Different sanitization for literature data
		} else if (type == 'lit') {
	
			if(lines.length < 1) {
				sanitized = false;
				notify('failure', 'Input field is empty.'); 
			} 
			
			//Iterate over all specified lines
			for(var j = 0; j < lines.length; j++) {
				
				//Bucket to hold directions for a single simulation (iteration)
				var outputIteration = new Array();
				var p = lines[j].split(/[,\s\t]+/);
				
				p[0] = (p[0]%360); //Keep declination within bounds
				
				if( Number(p[0]) >= 0 && Number(p[0]) <= 360 && Number(p[1]) >= -90 && Number(p[1]) <= 90) {
					var dec = Number(p[0]);
					var inc = Number(p[1]);
				} else {
					notify('failure', 'Declination or inclination not within expected bounds.');
					sanitized = false;
					break					
				}
				
				//Check if user input is sane (N, K positive and numeric, check if N is an integer)
				if(p[2] % 1 === 0 && p[2] > 0) {
					var N = p[2];
				} else {
					notify('failure', 'Input parameter N is not a positive integer.');
					sanitized = false;
					break
				}
				
				if($.isNumeric(p[3]) && p[3] > 0) {
					var K = p[3];
				} else {
					notify('failure', 'Input parameter K is not numeric or positive.');
					sanitized = false;
					break
				}
				
				var inputDataSampled = new Array();
				var sampleVGP = $("#sampleFish input[type='radio']:checked").val();				
				
				//Sample a Fisherian distribution with N and Kappa
				var sampled = sample(N, K);
				
				//Pole longitude, pole latitude, bedding orientation, bedding dip, and name 
				for(var i = 0; i < sampled.dec.length; i++) {
					inputDataSampled.push([sampled.dec[i], sampled.inc[i], 0, 0, name + '.' + (i+1)]);
				}
				
				//If the user wishes to sample VGPs instead of Fisherian directions
				if(sampleVGP == 'fishVGP') {
	
					//Get paleolatitude from user input inclination
					var paleoLatitude = diPalat(inc);
					
					//Inverse the poles to directions at particular paleolatitude (Longitude is arbitrary and put to 0)
					for(var i = 0; i < inputDataSampled.length; i++) {
						outputIteration.push(invPoles(paleoLatitude, 0, inputDataSampled[i]));
					}
				}  else {
					for( var i = 0; i < inputDataSampled.length; i++) {
						outputIteration.push(rotat(180, inc, inputDataSampled[i]));
					}	
				}
				
				//Rotate directions to user input declination
				for(var i = 0; i < outputIteration.length; i++) {
					outputIteration[i][0] = (outputIteration[i][0] + dec)%360; //Fixes [#0007];
					
					//Push direction to the actual output array
					output.push(outputIteration[i]);
				}
				
				var i = (j+1);
			}
		}
	
	//Check if sanitized otherwise play an error animation
	if(!sanitized) {
		inputError($('.linedwrap'));
		inputError($('.linedtextarea'));
	}
	
	//Output.data contains [[declination, inclination, bedding orientation, bedding dip, sample name], [...] ]
	//Return the data
	this.output = {
		data: output,
		sanitized: sanitized,
		line: (i+1)
	}
}

/* FUNCTION: constructMetaData
 * Type: Constructor
 * Description: creates site meta data (e.g. name, location, age, author) and returns the meta data object
 * 			  : input data that cannot be updated by editing and is locked adding a new site
 * Input: NULL
 * Output: site meta data object
 */
var constructMetaData = function( type ) {

	"use strict";
	
	//If editing data through the meta data dialog
	if ( type == 'edit') {
		var age 		= $("#siteAgeEdit").val();
		var author 		= $("#editAuthorID").val();
		var description = $("#siteDescEdit").val();
		var latitude	= $("#siteLatEdit").val();
		var longitude 	= $("#siteLngEdit").val();
		var minAge 		= $("#siteMinAgeEdit").val();
		var maxAge 		= $("#siteMaxAgeEdit").val();
	} else {	//Add a new site
		var siteName 	= $('#siteName').val();
		var latitude 	= $('#siteLat').val();
		var longitude 	= $('#siteLng').val();
		var age 		= $('#siteAge').val();
		var minAge 		= $('#siteBoundMin').val();
		var maxAge 		= $('#siteBoundMax').val();
		var author 		= $("#authorID").val();
		var description = $("#siteDesc").val();
		
		//Escape illegal characters (backslash and double quotes)
		this.name = siteName.replace(/[\\"]/g,''); 
		this.dateAdded = $.datepicker.formatDate('yy-mm-dd', new Date());
		this.version = version;
		this.markerColor = 'orange';	
		this.cutoff = $("#cutoffSelector").val()[0];
		
		//Get the type of data (sampled, input, or from interpretation portal)
		var type = $('#siteType').val();
		if(type == 'lit') {
			this.type = 'Simulated';
		} else if(type == 'dir') {
			this.type = 'Input';
		} else if (type == 'int') {
			this.type = 'Interpretation';
		}
	}
	
	//Data specified in the advanced options tab (if unspecified fall back to default values)
	this.description = description ? description : 'Unspecified';
	this.author = author ? author : 'Unknown';
	this.age = age ? age : null;
	this.minAge = minAge ? minAge : null;
	this.maxAge = maxAge ? maxAge : null;
	this.latitude = latitude ? Number(latitude) : null;
	this.longitude = longitude ? Number(longitude) : null;

	this.sanitized = checkNumeric([this.age, this.minAge, this.maxAge, this.latitude, this.longitude]);	
}

//FUNCTION checkNumeric
//Description: function to check if elements in the data array are all numeric
//Input: Array of values [ ... , ... ]
//Output: boolean
function checkNumeric ( data )  {

	"use strict";
	
	for(var i = 0; i < data.length; i++) {
		if(!($.isNumeric(data[i])) && data[i] != null) {
			return false;
		}
	}
	return true;
}

/*
 * FUNCTION parseAgeName
 * Description: parses the age and age bounds to the input/edit boxes
 * Input: age and age bounds
 * Output: VOID
 */
 function parseAgeName ( age, min, max, id ) {

 	"use strict";
	
	//Update the input box or update the edit box
	if(id == "ageNamesEdit") {
		$("#siteAgeEdit").val( age );
		$("#siteMinAgeEdit").val( min );
		$("#siteMaxAgeEdit").val( max );
	} else {
		$("#siteAge").val( age );
		$("#siteBoundMin").val( min );
		$("#siteBoundMax").val( max );
	}
}	