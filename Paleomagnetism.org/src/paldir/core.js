/* PALEOMAGNETISM.ORG INTERPRETATION PORTAL
 * 
 * VERSION: 1.1.0
 * LAST UPDATED: 2016-08-14
 *
 * Description: Application that allows for the interpretation of laboratory obtained demagnetization data
 * Components (great circles and directions) can be interpreted following the principle component analysis of Kirschvink, 1981
 * Great circles may be fitted to set points following the iterative procedure after McFadden and McElhinny, 1992
 * Application output is a list of declination/inclination pairs that can be used in the Paleomagnetism.org statistics portal
 *
 *   > Related Scientific Literature: 
 *
 *  McFadden, P.L., McElhinny, M.W.  
 *  The combined analysis of remagnetization circles and direct observations in palaeomagnetism
 *  Earth and Planetary Science Letters 87 (1-2), pp. 161-17241 
 *  1988
 *
 *  Kirschvink, J.L.
 *  The least-squares line and plane and the analysis of palaeomagnetic data.
 *  Geophysical Journal, Royal Astronomical Society 62 (3), pp. 699-718
 *  1980
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

"use strict";

// Application start
// Define some global variables to be used
var li, liSelected;
var data;
var globalSticky = new Array();
var exportData = new Array();
var version = 'v1.1.0';

var group = 'None';
var PATCH_NUMBER = 1.1;

/* 
 * FUNCTION getSampleIndex
 * Description: gets sample name from specimen scroller and returns it
 * Input: NULL
 * Output: sample index@int in the data array
 */
function getSampleIndex() {
  var name = $("#specimens").val(); 
  if(name != null) {
    return parseInt($('#specimens option[value="' + name + '"]').attr('custom'));
  }
}

/* 
 * FUNCTION getSelectedStep
 * Description: gets the selected step number as integer from the step list
 * Input: NULL
 * Output: integer of selected step (from 0 to N steps)
 */
var getSelectedStep = function() {
  return parseInt($(liSelected).index());
}

/*
 * FUNCTION globalRemark
 * sets global variable with remark to be used in interpretation notes
 */
var globalRemark = '';
function setRemark() {
  if($('#commentFlag').prop('checked')) {
    globalRemark = prompt("Enter a remark.") || ''
  } else {
    globalRemark = ''
  }
}

/*
 * FUNCTION moveStep
 * Description: moves the selected demagnetization step "up" or "down"
 * Input: direction@string for direction to move ("up" or "down")
 * Output: VOID
 */
function moveDemagnetizationStep ( direction ) {

  /*
   * Remove selected class from this point
   * Get previous or next point
   * Check if we are at the top (or bottom for up) of the list, if so go to the end (begin)
   */

  var index = getSelectedStep();

  // Move step down
  if( direction === "down" ) {
    liSelected.removeClass('selected');
    var next = liSelected.next();
    if(index !== li.length - 1){
      liSelected = next.addClass('selected');
    } else {
      liSelected = li.eq(0).addClass('selected');
    }
  }

  // Move step up
  if (direction === "up") {
    liSelected.removeClass('selected'); 
    var previous = liSelected.prev(); 
    if(index !== 0){ 
      liSelected = previous.addClass('selected'); 
    } else {
      liSelected = li.last().addClass('selected');
    }		
  }

  setHoverRadius();

}

/* function setGroup
 * Sets global variable group to user input
 * All interpretations will be put in this group
 */
function setGroup() {

  var input = prompt('Enter a group name.');

  if(input === null) {
    return;
  }

  group = (input === '') ? 'None' : input;

  notify('success', 'Group succesfully changed to ' + group);

  plotInterpretations();

}
	
/*
 * jQuery UI definitions
 */
$(function() {
	
  $(".additionalOptions").selectmenu({
    'width': 200
  });

  $("#forwardInterpretations").dialog({
	'modal': true,
	'autoOpen': false,
	'width': 'auto'
  });
  
  $("#demagType").selectmenu({
    'select': function () {
      var sample = getSampleIndex();
      data[sample].type = $(this).val();
      setStorage();
    }
  });
	
  $("#hideControls").button({
    'icons': {
      'primary': "ui-icon-close"
    },
    'text': false
  }).click(function () {
    $("#control").hide();
  });
	
  $("#showControls").button().click(function () {
    $("#control").show();
  });
	
  //Click function to add sticky direction to equal area projections
  $("#addSticky").click( function () {

    var input = prompt("Please enter name, declination, inclination seperated by a comma.");
    if(input === null) return;

    // Need three parameters delimited by a comma, otherwise quit
    var inputSplit = input.split(/[,]+/); 
    if(inputSplit.length !== 3) {
      notify('failure', 'Could not add sticky direction (not enough parameters)');
      return;
    }
			
    // Get name, declination, and inclination from user prompt
    var name = inputSplit[0];
    var dec = Number(inputSplit[1]);
    var inc = Number(inputSplit[2]);
			
    // Push to global sticky array
    globalSticky.push({
      'name': name, 
      'x': dec, 
      'y': eqArea(inc), 
      'inc': inc
    });
			
    notify('success', 'Sticky ' + name + ' has been added to the equal area projection.');
			
    // Get specimen
    var sample = getSampleIndex();
			
    if(data.length === 0) return;
			
    // Redraw the equal area projection and set hover after redraw
    eqAreaProjection();
    drawInterpretations();
    setHoverRadius();

  });
	
  // Clear all stickies and empty array
  $("#removeSticky").click( function () {
		
    globalSticky = new Array();
    notify('success', 'All stickies have been removed');		

    var sample = getSampleIndex();
    eqAreaProjection();
    setHoverRadius();
	
  });
	
  // Tabs initialization and functions
  $('#tabs').tabs({
    'activate': function(event, ui) {
      if(data.length !== 0) {
        if(ui.newPanel.selector === '#fittingTab') {
	  plotInterpretations();
	}
      }
    }
  });

  $('#input').dialog({
    'width': 500,
    'min-height': 100,
    'draggable': false,
    'resizable': false,
    'autoOpen': false,
    'modal': true,
    'buttons': {
      'Cancel': function () {
        $(this).dialog("close");
      }
    }
  });

  $("#importFormats").selectmenu();
	
  // Open the data input dialog box		
  $('#add').click(function () {
    $("#input").dialog( "open" );
  });
	
  // Button definitions for jQuery UI
  $("#saveInterpretation").button();
  $("#clrInterpretation").button();
  $("#fitCircles").button();
  $("#right").button();
  $("#left").button();
  $("#customHelp").button({
    'icons': {
      'primary': "ui-icon-help",
    },
    'text': false
  }).click(function() {
    $( "#customHelpDialog" ).dialog({
      'draggable': false,
      'resizable': false,
      'width': 600,
    });
  });
	
  $("#importApplication").button({
    'icons': {'primary': "ui-icon-arrowthickstop-1-n"}
  });
	
  $("#exportApplication, #exportInterpretation").button({
    'icons': {'primary': "ui-icon-arrowthickstop-1-s"}
  });

  $("#clearStorage, #removeSticky").button({
    'icons': {'primary': "ui-icon-trash"}
  });
	
  $("#addSticky").button({
    'icons': {'primary': 'ui-icon-pin-s'}
  });

  $("#radio1").button({
    'icons': {'primary': "ui-icon-grip-dotted-horizontal"}
  });
  $("#radio2").button({
    'icons': {'primary': "ui-icon-grip-dotted-vertical"}
  });

  $("button:not(.ui-multiselect)").button().bind('mouseup', function() {
    $(this).blur();   
  });

  $("#coordinates").buttonset();

  $("#coordinates").change(function () {
    plotInterpretations();
    $("#saveInterpretation").text('Save Interpreted Directions');
    $("#eqAreaFitted").hide();
  });

  // Blur tab after click to prevent changing with arrow keys
  $('#tabs a').click(function () {
    $(this).blur();
  })
	
  /* 
   * Keyboard handler for Paleomagnetism.org: Interpretation portal
   */
  $(document).keydown(function(e) {

	// Disable keyboard handler when typing
    if ($(e.target).closest("input")[0]) {
      return;
    }
	
    // Global button "g" for setting a group
    switch(e.which) {
      case 71:
        e.preventDefault();
        setGroup();
      break;			
    }
	 	
    // Return if not in interpretation tab
    if($("#tabs").tabs('option', 'active') !== 1) return;
    
    // Allow left and right to be moved
    // Delegate to the clicking the < (left) and > (right) button
    switch(e.which) {
	  		
      //Left Arrow Key and A button
      case 37: 
      case 65:
        e.preventDefault();
        $("#left").click();
      break;
	  		
      //Right Arrow Key and D button
      case 39:
      case 68:
        e.preventDefault();
        $("#right").click();
      break;
	  	
    }
	  	
    var index = getSelectedStep();
    var sample = getSampleIndex();
    
    // Block all other keys until index and sample are both defined
    // Undefined means that no specimen has been selected yet
    if(index === undefined || sample === undefined) return;
	  	
    // Switch the other keys 
    switch(e.which) {
    
      // Keys: Numpad 3 and upper row 3
      // Toggle the projection flag (Up/North - Up/West)
      case 51:
      case 99:
        e.preventDefault();
        $("#nFlag").prop("checked", !$("#nFlag").prop("checked")).change(); 
      break;
	  		
      // Keys: Numpad 7 and 7
      // Toggle the specimen coordinate flag
      case 55:
      case 53:
        e.preventDefault();
        $("#specFlag").prop("checked", !$("#specFlag").prop("checked")).change(); 
      break;
	  		
      // Keys: Numpad 8 and 8
      // Toggle the tilt correction view flag
      case 56:
      case 104:
        e.preventDefault();
        $("#tcViewFlag").prop("checked", !$("#tcViewFlag").prop("checked")).change(); 
      break;
    
      // Keys: Up Arrow Key and W button
      // Move the demagnetization step up
      case 38:
      case 87:
        e.preventDefault();
        moveDemagnetizationStep("up");
      break;
	  
      // Keys: Down Arrow Key and S button
      // Move the demagnetization step down
      case 40:
      case 83:
        e.preventDefault();
        moveDemagnetizationStep("down");
      break;
	  		
      // Keys: Z button and - (numpad)
      // Hide a step
      case 90:
      case 173:
      case 109:
    
        e.preventDefault();
	  			
        // If step is not hidden, hide it showing "···" and set step visibility to false
        // If it is hidden, replace the dots with the default text (demagnetization step)
        if(!$(liSelected).hasClass('hidden')) {
          liSelected.addClass('hidden');
          $(liSelected).text('···');
          data[sample].data[index].visible = false;
        } else {
          var defaultText = $(liSelected).attr('value');
          liSelected.removeClass('hidden');
          $(liSelected).text(defaultText);
          data[sample].data[index].visible = true;
        }
	  			
        // If the demagnetization step has class use, remove this class (we don't want hidden points to be included)
        if($(liSelected).hasClass('use')) {
          liSelected.removeClass('use');
          data[sample].data[index].include = false;
        }
	  			
        // Redraw all the charts when hiding steps
        plotZijderveldDiagram();
        plotIntensityDiagram();
        eqAreaProjection();
        drawInterpretations();
    
        // Move step down for convenience
        moveDemagnetizationStep("down");
        setStorage();
    
      break;
	  		
      //Keys: X button (and +)
      case 88:
      case 107:
      case 61:
	  		
        e.preventDefault();
	  			
        // Step currently not included and is not hidden, add a star (*) to the step and set include to true
        // If the step is currently included, remove the star by resetting to the default value and set include to false
        if(!$(liSelected).hasClass('use')) {
          if(!$(liSelected).hasClass('hidden')) {
            liSelected.addClass('use').append('*');
            data[sample].data[index].include = true;
          }
        } else {
          liSelected.removeClass('use');
          var defaultText = $(liSelected).attr('value');
          $(liSelected).text(defaultText);
          data[sample].data[index].include = false;
        }
	  			
        // Move step down for convenience
        moveDemagnetizationStep("down");
        setStorage();
    
      break;
	  		
      // When an interpretation is made we have four options: (line + great circle) x ( anchor + no anchor )
      // Whether to include origin is included needs to be checked manually by the user in the advanced options tab
      // Furthermore, we do and save the interpretation in Geographic and Tectonic coordinates
      // Procedure is as follows:
      // 1. Set anchor to selected (true or false)
      // 2. Interpret in Geographic coordinates through PCA routine (set tcFlag to false)
      // 3. Interpret in Tectonic coordinates PCA routine (set tcFlag to true)
    
      // Floating direction analysis
      case 49:
      case 97:
        e.preventDefault();
        setRemark();
        $("#anchor").prop("checked", false);
        $("#tcFlag").prop("checked", false);
        $("#PCA").click();	
        $("#tcFlag").prop("checked", true);
        $("#PCA").click();
        setStorage();
      break;
    
      // Forced direction analysis
      case 50:
      case 98:
        e.preventDefault();
        setRemark();
        $("#anchor").prop("checked", true);
        $("#tcFlag").prop("checked", false);
        $("#PCA").click();
        $("#tcFlag").prop("checked", true);
        $("#PCA").click();
        setStorage();
      break;	
    
      // Floating great circle analysis
      case 57:
      case 105:
        e.preventDefault();
        setRemark();
        $("#anchor").prop("checked", false);
        $("#tcFlag").prop("checked", false);
        $("#PCAGC").click();
        $("#tcFlag").prop("checked", true);
        $("#PCAGC").click();
        setStorage();
      break;
    
      // Forced great circle analysis
      case 48:
      case 96:
        e.preventDefault();
        setRemark();
        $("#anchor").prop("checked", true);
        $("#tcFlag").prop("checked", false);
        $("#PCAGC").click();
        $("#tcFlag").prop("checked", true);
        $("#PCAGC").click();
        setStorage();
      break;		
    
      // Exit this handler for other keys
      default: return; 
    
    }

  });
	
  //Call procedure to fit circles to directions
  $("#fitCircles").click( function () {
    fitCirclesToDirections();
    $("#saveInterpretation").text('Save Directions and fitted Circles');
  });
	
  //Function to save interpretations to the statistics portal through localStorage
  $("#saveInterpretation").click(function () {
    $('#forwardInterpretations').dialog('open');
  });
  
  $("#saveInterpretationButton").click(function() {
	  
	// Ask the users what to include
	var settings = {
	  'coordinates': $("#coordinates input[type='radio']:checked").val(),
	  'bedding': $("#includeBedding").prop('checked'),
	  'sampleName': $("#includeName").prop('checked'),
	  'stratigraphy': $("#includeStrat").prop('checked'),
	  'siteName': $("#saveSiteName").val()
	}
	
    //Check if localStorage is supported
    if(!localStorage) {
      notify('failure', 'localStorage is not supported. Cannot add interpretations to localStorage.');			
      return;
    }
	
	if(!settings.siteName) {
		notify('failure', 'Cannot add site with no name');
		return;
	}
	
	if(settings.coordinates === 'TECT' && settings.bedding) {
		notify('failure', 'Cannot include bedding in tectonic coordinates');
		return;
	}

    forwardInts(settings);
	
  });
  
  function forwardInts(settings) {
		
	var coordType = settings.coordinates;
	var name = settings.siteName;
	
    //Previously saved, get the save and 
	var saveObj = localStorage.getItem('savedInt');
    if(saveObj !== null) {
      var parsedObj = JSON.parse(saveObj);
    } else {
      var parsedObj = new Array();
    }
				
    //Has not been fitted
    if(exportData.length === 0) {
	
      var type = 'directions';
      for(var i = 0; i < data.length; i++) {
        if(data[i].interpreted) {
          for(var j = 0; j < data[i][coordType].length; j++) {

            if(data[i][coordType][j].group !== group) {
              continue;
            }
				
            if(data[i][coordType][j].type === 'dir') {

              exportData.push({
                'sample': data[i].name,
	            'dec': data[i][coordType][j].dec,
	            'inc': data[i][coordType][j].inc,
                'bedStrike': data[i].bedStrike,
                'bedDip': data[i].bedDip,
	            'strat': data[i].strat || 0,
                'type': data[i][coordType][j].type
              });

            }
          }
        }
      }
    } else {
      var type = 'great circles';
    }
		
    // Check if the site name already exists, if so, ask if the user wishes to overwrite the data.
    // Then splice the site from the array and add a new one, otherwise return
    for(var i = 0; i < parsedObj.length; i++) {
      if(name === parsedObj[i].name) {
        if(confirm('A site with this name already exists. Overwrite?')) {
          parsedObj.splice(i, 1);
        } else {
          notify('failure', 'Aborted: site has not been saved.');
          return;
        }
      }
    }

	// Check if all beddings are unique
	var unique;
	if(type === 'great circles') {
	  var beddings = exportData.map(function(x) {
	    return x.bedStrike + '/' + x.bedDip;
	  });
	  unique = (beddings.filter(function(value, index, self) {
	    return self.indexOf(value) === index;
	  }).length === 1);
	} else {
	  unique = true;
	}
	
	if(settings.beddings && !unique) {
	  notify('failure', 'Cannot add fitted great circles with non-unique beddings');
	  return 	
	}

    parsedObj.push({
      'name': name,
      'data': exportData, 
      'type': type,
      'coordType': coordType === 'GEO' ? "geographic" : "tectonic",
      'unique': unique,
	  'settings': settings
    });
		
    localStorage.setItem('savedInt', JSON.stringify(parsedObj));
	
    notify('success', 'Site ' + name + ' has been forwarded to the statistics portal.');	
			
    resetFit();
	
	$('#forwardInterpretations').dialog('close');
	
  }

  function resetFit() {
	$("#eqAreaFitted").hide();
	$("#fitCircles").show();
    $("#saveInterpretation").text('Save Interpreted Directions');
    exportData = new Array();	  
  }
  
  //Button handler for left-handed scrolling through specimens
  $("#left").click( function () {
		
    if(!data || data.length === 0) return;

    // Do the logic for the selected specimen, check if there is a previous specimen
    // If not, move to the last specimen
    var name = $('#specimens option:selected').prev().val();
    if(name !== undefined) {
      $('#specimens option:selected').prop('selected', false).prev().prop('selected', true);
    } else {
      $("#specimens")[0].selectedIndex = $('#specimens option').length - 1;
    }
    $("#specimens").multiselect('refresh');
		
    showData();	

  });
	
  //Button handler for right-handed scrolling through specimens
  $("#right").click( function () {
		
    if(!data || data.length === 0) return;

    // Do the logic for the selected specimen, check if there is a next specimen
    // If not, move to the first specimen		
    var name = $('#specimens option:selected').next().val();
    if(name !== undefined) {
      $('#specimens option:selected').prop('selected', false).next().prop('selected', true);
    } else {
      $("#specimens")[0].selectedIndex = 0;
    }
    $("#specimens").multiselect('refresh');
		
    showData();	

  });
	
  /* 
   * CHANGE EVENT: all flags trigger a change
   * Description: We need to redraw the charts in the proper projection and coordinate reference frame after a change is made
   */
  $("#tcViewFlag, #nFlag, #labelFlag, #specFlag, #tickFlag").change( function () {
	
    if(!data || data.length === 0) return;

    var sample = getSampleIndex();

    if(sample === undefined) return;
			
    // Redraw Zijderveld and eqArea projection (Intensity diagram is identical for all frames)
    plotZijderveldDiagram();
    eqAreaProjection();		
    drawInterpretations();

    setHoverRadius();

  });
	
  //Definition for specimen scroller
  //The close method is triggered if a user selects a sample from the specimen scroller without using the < or > buttons.
  $('#specimens').multiselect({	
    'minHeight': 100,
    'noneSelectedText': 'Select a specimen',
    'multiple': false,
    'selectedList': 1,
    'close': function () {

      var sample = getSampleIndex();
			
      //Call function showData to build body for particular specimen
      if(sample !== undefined && sample !== null) {
        showData(); 
      }
    }

  });
	
  /* 
   * PRINICPLE COMPONENT ANALYSIS FUNCTIONS
   * PCA (line) and PCAGC (great circle)
   */
  $('#PCA, #PCAGC').click(function (event) {
	
    // Get the flags
    var tcFlag = $('#tcFlag').prop('checked');
    var commentFlag = $('#commentFlag').prop('checked');
    var anchor = $('#anchor').prop('checked');
    var specFlag = $('#specFlag').prop('checked');
    var includeOrigin = $("#originFlag").prop('checked');
	
    // Do not allow interpretations made in specimen coordinates, notify user once and return
    // Procedure is called twice (so only alert once)
    if(specFlag) {
      if(tcFlag) {
        notify('failure', 'Cannot do interpretation in specimen coordinates.');
      }
      return;
    }
		
    // Get the coordinate system
    var coordType = tcFlag ? 'TECT' : 'GEO';
		
    // Type is GC or DIR
    var typeFit = event.target.id; 
		
    // Capture specimen in samples variable
    var sample = getSampleIndex();
    var sampleData = data[sample];
	
    // Draw the charts
    plotZijderveldDiagram();
    eqAreaProjection();
		
    var fdata = new Array();
    var X = new Array();
		
    // Vector for center of mass
    var cm = [0, 0, 0];

    // Data bucket
    var includedSteps = new Array();
    var steps = new Array();
		
    // Loop over all data points and push to data bucket (if anchored, mirror all points)
    for(var i = 0; i < sampleData.data.length; i++) {
      if(sampleData.data[i].include) {
        includedSteps.push([sampleData.data[i].x, sampleData.data[i].y, sampleData.data[i].z]);
        steps.push(sampleData.data[i].step);

        // If anchored, mirror data points (this breaks the MAD calculation)
        if(anchor) {
          includedSteps.push([-sampleData.data[i].x, -sampleData.data[i].y, -sampleData.data[i].z]);
        }

      }
    }
		
    // Wish to include the origin, use this flag
    if(!anchor) {
      if(includeOrigin) {
        includedSteps.push([0, 0, 0]);
      }
    } else {
      includeOrigin = false;
    }

    // Return if user has < 2 data points disabled
    var nSteps = includedSteps.length;
    if(nSteps < 2) {
      if(tcFlag) {
        notify('failure', 'A minimum of two points are required. Select points by pressing + or x.');
        drawInterpretations();
      }
      return;
    }
	
	// If only two points are specified and a GC fit is requested
	// only the direction of t1 is reliable. t2 and t3 are both 0 but due
	// to floating point precision may vary. Sometimes t2 is picked, other times t3.
	// So disable.
    if(nSteps < 3 && typeFit === 'PCAGC') {
      if(tcFlag) {
        notify('failure', 'Cannot adequately differentiate between τ2 and τ3. Three points are required.');
        drawInterpretations();
      }
      return;
    }
	
    // For specimen get core parameters
    // Reduce the core dip to -hade that is equal to -(90 - plunge)
    var coreAzi = sampleData.coreAzi;
    var coreDip = sampleData.coreDip - 90;
    var bedStrike = sampleData.bedStrike;
    var bedDip = sampleData.bedDip;
		
    // Loop over all included points
    for(var i = 0; i < nSteps; i++) {

      // Rotate specimen to geographic coordinates
      // If we are including the origin (not forcing) we use a point 0, 0, 0 which has no vector, so give 0, 0, 0 for dec, inc, R
      if(includedSteps[i][0] === 0 && includedSteps[i][1] === 0 && includedSteps[i][2] === 0) {
        var rotatedGeographic = {'dec': 0, 'inc': 0 , 'R': 0}
      } else {
        var rotatedGeographic = rotateTo(coreAzi, coreDip, includedSteps[i]);
      }
			
      // If tc is selected, rotate the geographic coordinates to to tectonic coordinates
      if(tcFlag) {
        var rotated = correctBedding(bedStrike, bedDip, rotatedGeographic);
        var dataD = [rotated.dec, rotated.inc, rotatedGeographic.R];
      } else {
        var dataD = [rotatedGeographic.dec, rotatedGeographic.inc, rotatedGeographic.R];
      }
			
      var coords = cart(dataD[0], dataD[1], dataD[2]);
      fdata.push(dataD);
      X.push([coords.x, coords.y, coords.z]);

    }

    // Preparation for orientation matrix A.3.5, Lisa Tauxe book
    // Calculate the coordinates of the “center of mass” (x) of the data points: 
    for(var i = 0; i < X.length; i++) {
      for(var j = 0; j < 3; j++) {
        cm[j] += X[i][j]/nSteps;
      }
    }
	
    // Transform the origin of the data cluster to the center of mass
    // If anchored, the cm is (0, 0, 0) so we don't do this
    if(!anchor) {
      for(var i = 0; i < X.length; i++) {
        for(var j = 0; j < 3; j++) {
          X[i][j] = X[i][j] - cm[j];		
        }
      }
    }
		
    // Prepare tempFormat array of x, y, z coordinates for orientation matrix
    // TMatrix subroutine takes this format as input.
    var tempFormat = new Array();
    for(var i = 0; i < X.length; i++) {
      tempFormat.push({'x': X[i][0], 'y': X[i][1], 'z': X[i][2]});
    }

    // Get principle components from TMatrix through numeric.js library
    var eig = numeric.eig(TMatrix(tempFormat));
	
    // Normalize eigenvectors to unit length
    var trace = 0;
    for(var i = 0; i < 3; i++) {
      trace += eig.lambda.x[i];
    }
    for(var i = 0; i < 3; i++) {
      eig.lambda.x[i] = eig.lambda.x[i] / trace;
    }
	
    // Sort eigenvectors/eigenvalues (copied from PmagPy lib.)
    var eig = sortEig(eig);

    // Collect first, second, and third eigenvalue [t1, t2, t3]
    var tau = eig.tau;

    // The three eigenvectors
    var v1 = eig.v1;
    var v2 = eig.v2;
    var v3 = eig.v3;

    // Determine which side is positive/negative
    // Take the first and last data point
    var P1 = cart(fdata[0][0], fdata[0][1], fdata[0][2]);
    var P2 = cart(fdata[nSteps-1][0], fdata[nSteps-1][1], fdata[nSteps-1][2]);

    // To array for easy summing
    var P1x = [P1.x, P1.y, P1.z];
    var P2x = [P2.x, P2.y, P2.z];
				
    // The intensity is taken as the intensity between the bounding points
    var intensity = vectorLength(P1x[0] - P2x[0], P1x[1] - P2x[1], P1x[2] - P2x[2]);

    /* Get right direction along principle component
     * Flip direction if dot product is negative between vector and control (begin - end)
     * This means the principle eigenvector is anti-parallel to the control; so we flip the eigenvector
     */

    // Get the control vector and take the dot product with the maximum eigenvector
    var control = [0, 0, 0];
    for(var i = 0; i < 3; i++) {
      control[i] = (P1x[i] - P2x[i]);
    }
    var dot = 0;
    for(var i = 0; i < 3; i++) {
      dot += v1[i] * control[i];
    }

    // Negative dot product: flip principle eigenvector	
    if(dot <= 0) {
      for(var i = 0; i < 3; i++) {
        v1[i] = -v1[i];
      }
    }

    // This is where we split the PCA for lines and great circles
    // For lines, we use the maximum eigenvalue
    // For planes, we use the minimum eigenvalue (that is perpendicular to the plane defined by tau1 and tau2)
    if(typeFit === 'PCA') {
		
      // Calculation of maximum angle of deviation
      var s1 = Math.sqrt(tau[0]);
      var MAD = Math.atan(Math.sqrt(tau[1] + tau[2]) / s1) / RADIANS;
      var setType = 'dir';
			
      // Get the dec/inc of the maximum eigenvector stored in v1
      var eigenDirection = new dir(v1[0], v1[1], v1[2]);
			
      if(isNaN(MAD)) {
        MAD = 0;
      }
			
      // Construct data object with relevant information
      // Write found principle component to specimen meta-data
      sampleData.interpreted = true;
      var dataObj = {
        'dec': eigenDirection.dec,
        'inc': eigenDirection.inc,
        'MAD': MAD,
        'cm': cm,
        'intensity': intensity,
        'type': setType,
        'forced': anchor,
        'remark': globalRemark || '',
        'origin': includeOrigin,
        'nSteps': steps.length,
        'minStep': steps[0],
        'maxStep': steps[steps.length-1],
        'steps': steps,
        'group': group,
        'version': version
      }

    // For great circles we find direction of tau3 (which serves as the pole to the plane spanned by tau1, tau2)	
    } else if (typeFit == 'PCAGC') {
	
      // Minimum eigenvector (direction of tau3);
      var eigenDirection = new dir(v3[0], v3[1], v3[2]);
	  	
      // Calculation of MAD
      var s1 = Math.sqrt((tau[2] / tau[1]) + (tau[2] / tau[0]));
      var MAD = Math.atan(s1) / RADIANS;
      var setType = 'GC';
			
      // Per definition we use the negative pole of the plane
      if(eigenDirection.inc > 0) {
        eigenDirection.dec = (eigenDirection.dec + 180) % 360;
        eigenDirection.inc = -eigenDirection.inc;
      }
			
      if(isNaN(MAD)) {
        MAD = 0;
      }
			
      // Write meta-data
      sampleData.interpreted = true;
      var dataObj = {
        'dec': eigenDirection.dec,
        'inc': eigenDirection.inc,
        'MAD': MAD,
        'cm': cm,
        'intensity': intensity,
        'type': setType,
        'origin': includeOrigin,
        'forced': anchor,
        'remark': globalRemark || '',
        'nSteps': steps.length,
        'minStep': steps[0],
        'maxStep': steps[steps.length - 1],
        'steps': steps,
        'group': group,
        'version': version
      }
    }
	
    // Check if component already exists
    var sanitized = true;
    for(var i = 0; i < sampleData[coordType].length; i++) {
      if(JSON.stringify(steps) === JSON.stringify(sampleData[coordType][i].steps) && anchor === sampleData[coordType][i].forced && setType === sampleData[coordType][i].type) {
        if(tcFlag) {
          notify('failure', 'This direction has already been interpreted.');
        }
        var sanitized = false;
      }
    }

    if(sanitized) {
      sampleData[coordType].push(dataObj);
    }
		
    if(tcFlag) {
      drawInterpretations();
      setHoverRadius();
    }

  });
	
  /*
   * FUNCTION clrInterpretation.click()
   * Description: removes all interpretations from given specimen
   * Input: NULL
   * Output: VOID
   */
  $("#clrInterpretation").click( function () {

    // Capture specimen in samples variable
    var sample = getSampleIndex();
		
    // Reset the interpretation arrays and set interpreted to false
    data[sample]['TECT'] = new Array();
    data[sample]['GEO'] = new Array();
    data[sample].interpreted = false;
	
    showNotInterpretedBox();
		
    // Redraw the charts and set the hover radius
    plotZijderveldDiagram();
    eqAreaProjection();
		
    setHoverRadius();	
    setStorage();
		
  });

  //Initialize the Interpretation Portal
  initialize();
	
});

function initialize() {

  // If a hash is specified, try to load the publication
  if(location.search) {
	getPublicationFromHash();
	return;
  }
  
  // Get data from the local storage
  if(localStorage) {
    data = JSON.parse(localStorage.getItem('InterPortal'));
  } else {
    notify('failure', 'localStorage is not supported. Please use a modern browser or export your data manually');
    data = null;
  }

  // Apply patches (if any)
  patch();
	
  // Check if there is data saved in localStorage, if not, welcome the user
  if(!data) {
     data = new Array();
     notify('success', 'Welcome to the Paleomagnetism.org interpretation portal!');
     return;
  }

  refreshSpecimenScroller();
  notify('success', 'Welcome back. Added ' + data.length + ' specimens to the application.')

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
	  data = json;
	  refreshSpecimenScroller();
  	  notify('success', 'Data is being loaded from a verified publication. Changes to this sessions are not saved.');
	  notify('note', '<img src="./images/book_icon.png"> <b> ' + pub + ' </b>');
    },
    'error': function(error) {
  	  notify('failure', 'An unexpected error occured loading the publication data.');		  
    }
  });
  
}

/* 
 * FUNCTION fitCirclesToDirections
 * Description: applies the iterative fitting function after McFadden and McElhinny, 1989 on fitting great circles to set point directions
 *   implemented from PALFIT.f95
 * Input: NONE
 * Output: VOID (stores information in exportData global for exporting)
 */
function fitCirclesToDirections() {

  $("#fitCircles").hide();

  // Reset the exporting data to newly fitted circles and directions
  exportData = new Array();
	
  //Get coordinate reference frame; fitting great circles must be done in tectonic coordinates and geographic coordinates separated
  var coordType = $("#coordinates input[type='radio']:checked").val();
  var coordinateNice = coordType === 'GEO' ? 'Geographic Coordinates' : 'Tectonic Coordinates';
	
  var fitData = new Array()
  var pointsSet = new Array();
  var isSet = false;

  for(var i = 0; i < data.length; i++) {
    if(data[i].interpreted) {
      for(var j = 0; j < data[i][coordType].length; j++) {

        // Skip samples not in active group		
        if(data[i][coordType][j].group !== group) {
          continue;
        }					
				
        var dec = data[i][coordType][j].dec;
	    var inc = data[i][coordType][j].inc;
	    var bedStrike = data[i].bedStrike;
	    var bedDip = data[i].bedDip;
	    var sample = data[i].name;
	    var strat = data[i].strat;

	    // Collect the declination, inclinations (poles for great circles) and pass the type
        var row = {
          'sample': sample,
          'dec': dec,
          'inc': inc,
          'bedStrike': bedStrike,
          'bedDip': bedDip,
          'strat': strat || 0,
          'type': data[i][coordType][j].type
        }

        fitData.push(row);

        //Now check if it is a direction or a great circle and sort them to respective arrays
        //@pointsSet for directions and @fitData for great circles
        if(data[i][coordType][j].type == 'dir') {

          isSet = true;

	  exportData.push(row);

	  //Highcharts data array for plotting the set points, these can be used directly
	  pointsSet.push({
            'x': dec,
	    'y': eqArea(inc),
	    'inc': inc,
	    'sample': sample,
	    'marker': {
	      'fillColor' : inc < 0 ? 'white' : 'rgb(119, 152, 191)',
	      'lineColor' : 'rgb(119, 152, 191)',
	      'lineWidth' : 1,
	    }
          });
        }
      }
    }
  }

  //No set points, ask user for a guess to fit circles on;
  //This helps the procedure to know which intersection of great circles to use (180 degrees apart)
  if(!isSet) {
    var getSuggestion = prompt('No set points, give a suggestion for directional fit (dec, inc).');
    if(getSuggestion !== null) {
      var getSuggestion = getSuggestion.split(/[,\s\t]+/); //Split by commas
      if(getSuggestion.length != 2) {
        notify('failure', 'Unexpected input, please give declination and inclination seperated by a comma');
        return;
      }
			
      //Get declination and inclination from user
      var declination = Number(getSuggestion[0]);
      var inclination = Number(getSuggestion[1]);
			
      fitData.push({
        'sample': 'FORCED',
        'dec': declination,
	'inc': inclination,
        'bedStrike': null,
        'bedDip': null,
        'strat': null,
        'type': 'fake'
      });

    } else {
      notify('failure', 'Adding your suggestion has failed. Breaking fitting procedure.');
      return;
    }
  }
	
  // Circle is an array containing Cartesian coordinates of pole to great circle
  var xCircle = new Array(), yCircle = new Array(), zCircle = new Array();
  var circleInfo = new Array();
	
  //Number of set points and great circles
  var nPoints = 0, nCircles = 0;
  var xSum = 0, ySum = 0, zSum = 0;

  //Loop over data and sort great circles from set points
  for(var i = 0; i < fitData.length; i++) {
	
    // Set initial anchoring to fake point as mean vector
    if(fitData[i].type === 'fake') { 

      var anchorCoordinates = cart(fitData[i].dec, fitData[i].inc);
      var unitMeanVector = {
        'x': anchorCoordinates.x, 
        'y': anchorCoordinates.y, 
        'z': anchorCoordinates.z
      };	

    } else if(fitData[i].type === 'dir') {

      nPoints++
			
      //Sum Cartesian coordinates for mean vector from directional set points			
      var coordinates = cart(fitData[i].dec, fitData[i].inc);
      xSum += coordinates.x;
      ySum += coordinates.y;
      zSum += coordinates.z;
			
    } else if(fitData[i].type === 'GC') {

      nCircles++;
			
      var circleCoordinates = cart(fitData[i].dec, fitData[i].inc);
      xCircle.push(circleCoordinates.x)
      yCircle.push(circleCoordinates.y)
      zCircle.push(circleCoordinates.z);
      circleInfo.push(fitData[i]);
	
    } else {

      notify('failure', 'Unfamiliar fitting type; expected "fake", "dir", or "gc"');
      return;

    }

  }

  //At least one set point, calculate the mean coordinates to start fitting circles
  //This v vector represents the first 'guess'
  //If no set points are specified we take the anchor that is specified above under 'fake' as the mean vector
  if(nPoints > 0) {
    var R = Math.sqrt(xSum * xSum + ySum * ySum + zSum * zSum);
    var unitMeanVector = {
      'x': xSum / R, 
      'y': ySum / R, 
      'z': zSum / R
    }
  }

  var meanVector = {
    'x': xSum,
    'y': ySum,
    'z': zSum
  };

  //Bucket to contain x, y, z coordinates of the fitted points respectively
  var fittedCircleCoordinates = new Array();
	
  //Initially, for all circles, find the closest point on the great circle (through vClose routine) to the mean vector
  for(var i = 0; i < nCircles; i++) {
    var fittedCoordinates = vClose(xCircle[i], yCircle[i], zCircle[i], unitMeanVector);

    meanVector.x += fittedCoordinates.x;
    meanVector.y += fittedCoordinates.y;
    meanVector.z += fittedCoordinates.z;

    fittedCircleCoordinates.push({
      'x': fittedCoordinates.x,
      'y': fittedCoordinates.y,
      'z': fittedCoordinates.z
    });
  }
	
  //Iterative procedure start
  var nIterations = 0;
  while(true) {

    nIterations++;
    var angles = new Array();

    //Procedure for one iteration
    for( var i = 0; i < nCircles; i++) {
			
      //Subtract the fitted point from the mean
      meanVector.x -= fittedCircleCoordinates[i].x;
      meanVector.y -= fittedCircleCoordinates[i].y;
      meanVector.z -= fittedCircleCoordinates[i].z;

      //Recalculate the the new mean vector (unit length)
      var R = Math.sqrt(meanVector.x*meanVector.x + meanVector.y*meanVector.y + meanVector.z*meanVector.z);
      var unitMeanVector = {
        'x': meanVector.x/R,
        'y': meanVector.y/R,
        'z': meanVector.z/R
      };
			
      //Calculate the new closest point for the great circle Gi to new mean vector
      var newClose = vClose(xCircle[i], yCircle[i], zCircle[i], unitMeanVector);

      //Dot product to find the angle between the newly fitted point and the old fitted point this will determine whether the procedure is broken
      var dotProduct = Math.min(1, newClose.x * fittedCircleCoordinates[i].x + newClose.y * fittedCircleCoordinates[i].y + newClose.z * fittedCircleCoordinates[i].z);
      angles.push(Math.acos(dotProduct) / RADIANS);
			
      //Add the new closest direction back to the mean vector
      meanVector.x += newClose.x, meanVector.y += newClose.y, meanVector.z += newClose.z;

      //Set the new fitted point as the old fitted point for the next iteration
      fittedCircleCoordinates[i] = {'x': newClose.x, 'y': newClose.y, 'z': newClose.z};

    }
		
    //Get the maximum angle between a new and an old fitted direction (this should be lower than 0.1 for the procedure to continue); else break
    if(Math.max.apply(null, angles) < 0.01) {
      break;
    }

  }

    // Start with the sum of all set points and add all the iteratively fitted directions to the mean vector
    // Calculate the mean direction for all fitted directions and set points together
    meanVector = {
      'x': xSum,
      'y': ySum,
      'z': zSum
    };

    for(var i = 0; i < nCircles; i++) {
      meanVector.x += fittedCircleCoordinates[i].x
      meanVector.y += fittedCircleCoordinates[i].y
      meanVector.z += fittedCircleCoordinates[i].z;
    }

    var newMean = dir(meanVector.x, meanVector.y, meanVector.z);
    var pointsCircle = new Array();

    //Loop over all great circles and get fitted directions in Highcharts data array
    for(var i = 0; i < nCircles; i++) {

      var direction = new dir(fittedCircleCoordinates[i].x, fittedCircleCoordinates[i].y, fittedCircleCoordinates[i].z);
      exportData.push({
        'sample': circleInfo[i].sample,
	    'dec': direction.dec, 
	    'inc': direction.inc,
	    'bedStrike': circleInfo[i].bedStrike,
	    'bedDip': circleInfo[i].bedDip,
	    'strat': circleInfo[i].strat,
	    'type': 'gc'
      });

      //Data array for points fitted on great circle
      pointsCircle.push({
        'x': direction.dec, 
	    'sample': circleInfo[i].sample,
	    'y': eqArea(direction.inc), 
	    'inc': direction.inc,
	    'marker': {
	      'fillColor': (direction.inc < 0) ? 'white' : 'rgb(191, 119, 152)',
	      'lineColor': 'rgb(191, 119, 152)',
          'lineWidth': 1,
	    }
      });
    }

    //Get plane data for great circles themselves
    var greatCircleDataPos = new Array();	
    var greatCircleDataNeg = new Array();	
    for(var i = 0; i < nCircles; i++) {

      var direction = new dir(xCircle[i], yCircle[i], zCircle[i]);
		
      //Get the appropriate negative or positive plane, and save it
      var greatCircles = getPlaneData({'dec': direction.dec, 'inc': direction.inc}, 'GC', null, pointsCircle[i].inc);
      if(pointsCircle[i].inc > 0) {
        var greatCircleDataPos = greatCircleDataPos.concat(greatCircles.lower);
      } else {
        var greatCircleDataNeg = greatCircleDataNeg.concat(greatCircles.upper);
      }
    }
	
    //Modified Fisher statistics /McFadden and McElhinny (1988)
    var nTotal = nPoints + nCircles; //Total N
    var nPrime = Math.max(1.1, nPoints + nCircles/2);

    //Other statistical parameters (McFadden & McElhinny, 1988)
    var k = (2*nPoints + nCircles - 2)/(2*(nPoints + nCircles - R));
    var t95 = Math.acos(1 - ((nPrime - 1)/k) * (Math.pow(20, (1/(nPrime - 1))) - 1)) / RADIANS;
	
    //Standard Fisher parameters (k, a95);
    var k = (nTotal - 1) / (nTotal - R);
    var a95 = Math.acos(1 - ((nTotal - R)/R) * (Math.pow(20, (1/(nTotal - 1))) - 1)) / RADIANS;

    //Get confidence envelope data around newMean with a95, t95
    var ellipse = getPlaneData({'dec': newMean.dec, 'inc': newMean.inc}, 'MAD', a95);
    var ellipse2 = getPlaneData({'dec': newMean.dec, 'inc': newMean.inc}, 'MAD', t95);

    //Get color for mean direction (if neg make white)
    var color = (newMean.inc < 0) ? 'white' : 'rgb(119, 191, 152)';
	
    //Set up data for Highcharts:
    //Directions, Fitted directions, Mean direction, Great circles, Confidence Ellipses..
    var plotData = [{
      'name': 'Directions',
      'type': 'scatter',
      'color': 'rgb(119, 152, 191)',
      'data': pointsSet,
      'zIndex': 100,
    }, {
      'name': 'Fitted Directions',
      'type': 'scatter',
      'color': 'rgb(191, 119, 152)',
      'data': pointsCircle,
      'zIndex': 100,
      'marker': {
      'symbol': 'circle'
    }
  }, {
    'name': 'Great Circles',
    'id': 'GCs',
    'type': 'line',
    'data': greatCircleDataPos,
    'dashStyle': 'ShortDash',
    'turboThreshold': 0,
    'enableMouseTracking': false,
    'marker': {
      'enabled': false,
    }
  }, {
    'name': 'Great Circles',
    'linkedTo': 'GCs',
    'type': 'line',
    'data': greatCircleDataNeg,
    'turboThreshold': 0,
    'enableMouseTracking': false,
    'marker': {
      'enabled': false,
    }
  },  {
    'name': 'Mean',
    'type': 'scatter',
    'data': [{
      'sample': 'Direction Mean',
      'x': newMean.dec,
      'y': eqArea(newMean.inc),
      'inc': newMean.inc,
      'info': 'Direction Mean'
    }],
    'color': 'rgb(119, 191, 152)',
    'marker': {
      'symbol': 'circle',
      'radius': 6,
      'fillColor': color,
      'lineColor': 'rgb(119, 191, 152)',
      'lineWidth': 1
    }
  }, {
    'name': 'α95 Fitted Confidence',
    'id': 'confidence',
    'type': 'line',
    'color': 'red',
    'enableMouseTracking': false,
    'data': ellipse.lower,
    'marker': {
      'enabled': false
    }
  }, {
    'linkedTo': 'confidence',
    'type': 'line',
    'color': 'red',
    'enableMouseTracking': false,
    'data': ellipse.upper,
    'marker': {
      'enabled': false
    }	
  }, {
    'name': 'α95 Full Confidence',
    'id': 'confidence2',
    'type': 'line',
    'color': 'red',
    'enableMouseTracking': false,
    'data': ellipse2.lower,
    'marker': {
      'enabled': false
    }
  }, {
    'linkedTo': 'confidence2',
    'type': 'line',
    'color': 'red',
    'enableMouseTracking': false,
    'data': ellipse2.upper,
    'marker': {
      'enabled': false
    }	
  }];
	
  //Plot graph with the data, and provide user with information on the fit in a table
  plotInterpretationsGraph( plotData, nCircles, 'eqAreaFitted', 'Interpreted Directions and Fitted Great Circles', coordinateNice );
  $("#eqAreaFitted").css('display', 'inline-block');
  $("#fitCirclesDivText").html('<b>Great circle solutions have been fitted in ' + nIterations + ' iteration(s).</b>');
	
  $("#fittingTable").html('<table class="sample" id="fittingTableInfo"><tr><th> N<small> (setpoints) </small> </th> <th> N<small> (great circle solutions) </small> </th> <th> N<small> (total) </small> </th> <th>Mean Declination </th> <th>Mean Inclination </th>  </tr>');
  $("#fittingTableInfo").append('<tr> <td> ' + nPoints + ' </td> <td> ' + nCircles + '<td> ' + (nPoints + nCircles) + ' </td> <td> ' + newMean.dec.toFixed(1) + ' </td> <td> ' + newMean.inc.toFixed(1) + ' </td> </tr> </table>');
  $("#fittingTable").show();

}

/* 
 * FUNCTION vClose
 * Description: Calculates point (x, y, z) on great circle (xCircle, yCircle, zCircle) closest to vector V (v1, v2, v3)
 *   Notation after (McFadden and McElhinny, 1988) eq. 20 (meanVector = u, v, w)
 * Input: Cartesian Coordinates of pole to great circle and vector V
 * Output: Cartesian Coordinates of point closest to vector V
 */
function vClose (p, q, r, meanVector) {
	
  var tau = meanVector.x * p + meanVector.y * q + meanVector.z * r;
  var rho = Math.sqrt(1 - tau * tau);
	
  return {
    'x': (meanVector.x - tau * p) / rho,
    'y': (meanVector.y - tau * q) / rho,
    'z': (meanVector.z - tau * r) / rho,
  }
}

/*
 * function showDataInformation
 * Description: updates table with information on demagnetization step
 *   and general information about the specimen
 */
function showDataInformation() {

  var specimen = data[getSampleIndex()];
  var step = getSelectedStep();

  // Do the rotation on the demagnetization step if required
  var tcFlag = $('#tcViewFlag').prop('checked');
  var specFlag = $('#specFlag').prop('checked');
  var direction = dir(specimen.data[step].x, specimen.data[step].y, specimen.data[step].z);
  if(!specFlag) {
    direction = rotateTo(specimen.coreAzi, specimen.coreDip - 90, [specimen.data[step].x, specimen.data[step].y, specimen.data[step].z]);
    if(tcFlag) {
      direction = correctBedding(specimen.bedStrike, specimen.bedDip, direction);
    }
  }

  if(specimen.data[step].visible) {
    var information = [specimen.data[step].step, direction.dec, direction.inc, direction.R, specimen.data[step].a95, specimen.coreAzi, specimen.coreDip, specimen.bedStrike, specimen.bedDip, specimen.strat, specimen.format];
  } else {
    var information = ['---', '---', '---', '---', '---', '---', '---', '---', '---', '---', '---'];
  }

  // Reduce numbers to decimals
  var information = information.map(function(x) {
    if(typeof(x) === 'number') return x.toFixed(1);
    return x;
  });

  // Update the parameter table
  var tableHeader = '<table class="sample" id="specimenTable"><tr><th>'
  tableHeader += ['Step', 'Declination', 'Inclination', 'Intensity', 'a95', 'Core Azimuth', 'Core Plunge', 'Bedding Strike', 'Bedding Dip', 'Strat Level', 'Format'].join("</th><th>");

  $("#specimenInformation").html(tableHeader + "</th></tr><td>" + information.join('</td><td>') + "</td></tr></table>");

}

/* FUNCTION showData
 * Description: handles creation of list for scrolling and plotting
 * Input: sample index
 * Output: VOID (creates list and plots)
 */ 
function showData() {
	
  if(!data || data === null || data.length === 0) return;

  var sample = getSampleIndex();
	
  $("#demagType").val(data[sample].type || 'UNKNOWN');
  $("#demagType").selectmenu("refresh");

  // Add steps to list
  $('.steps').html(''); 
  for(var i = 0; i < data[sample].data.length; i++) {
    var step = data[sample].data[i].step;
    $('.steps').append('<li value="' + step + '">' + step + '</li>');
  }
  $('.steps').append('<br>'); 
	
  // Define elements for all steps (global)
  li = $(".steps li") 
	
  // Loop over all steps and check for visible/include methods
  // Having class "show" means hidden -- hopefully fix this someday (sorry)
  for(var i = 0; i < data[sample].data.length; i++) {
    if(!data[sample].data[i].visible) {
      li.eq(i).addClass('hidden');
      li.eq(i).text('···');
    }
    if(data[sample].data[i].include){
      li.eq(i).addClass('use');
      li.eq(i).append('*');
    }
  }
	
  var coordType = $('#tcViewFlag').prop('checked') ? 'TECT' : 'GEO';

  $("#appBody").show();

  // Draw the charts
  plotZijderveldDiagram();
  plotIntensityDiagram();
  eqAreaProjection();

  //Check if the sample has been previously interpreted
  if(data[sample].interpreted) {
    $('.ui-multiselect').css('color', 'rgb(119, 191, 152)'); //Set the specimen scroller color to green
    drawInterpretations()
  } else {
    showNotInterpretedBox();
  }

  //When a new specimen is loaded, start at step 0
  //Set the hover and selection on the first point of the series			
  liSelected = li.first().addClass('selected');
  setHoverRadius(0);

}

/*
 * function sortBy
 * Description: sorts the order of specimens by stratigraphy or randomly
 * Input: type@string of sorting
 * Output: VOID (sorts global data array)
 */
function sortBy(type) {

  if(type === 'stratigraphy') {
    data = data.sort(function(a,b) {
      return Number(a.strat) - Number(b.strat);
    });
    notify('success', 'Specimens have been sorted by stratigraphic level (ascending)');
  } else if(type === 'bogo') {
    data = data.sort(function(a,b) {
      return Math.random() < 0.5;
    });
    notify('success', 'Specimens have been shuffled randomly.');
  }

  refreshSpecimenScroller();
  setHoverRadius(0);

}

/*
 * FUNCTION drawInterpretations
 * Description: Draws interpretations on plots
 * Input: sample index (specimen)
 * Output: VOID (Adds series to existing charts)
 */
var drawInterpretations = function () {

  var sample = getSampleIndex();

  // Get display flags
  var tcFlag = $('#tcViewFlag').prop('checked');
  var nFlag = $('#nFlag').prop('checked');	
  var specFlag = $('#specFlag').prop('checked');
	
  // Do not draw interpretations if viewing in specimen coordinates
  if(specFlag) return;
	
  // Get the coordinate reference frame (pretty too)
  var coordType = tcFlag ? 'TECT' : 'GEO';
  var coordinatesPretty = tcFlag ? 'Tectonic' : 'Geographic';
	
  // Quit if the sample has not been interpreted
  if(!data[sample].interpreted) {
    showNotInterpretedBox();
    return;
  }
	
  //Update the parameter table
  var tableHeader = '<table class="sample" id="infoTable"><tr><th>'
  tableHeader += ['Component', 'Type', 'Declination', 'Inclination', 'Intensity (µA/m)', 'MAD', 'Coordinates', 'Remark', 'Group', 'Remove'].join("</th><th>");
  tableHeader += "</th></tr>";

  $("#update").html(tableHeader);

  //Loop over all interpretations in a particular coordinate reference frame (either Tectonic or Geographic)
  for(var i = 0; i < data[sample][coordType].length; i++) {
	
    var sampleGroup = data[sample][coordType][i].group;
    var remark = data[sample][coordType][i].remark;
			
    if(remark === '') {
      remark = 'Click to add';
    }

    var centerMass = data[sample][coordType][i].cm
		
    //Declination and Inclination of the principle component (can be either t1 or t3)
    var PCADirection = {
      'dec': data[sample][coordType][i].dec, 
      'inc': data[sample][coordType][i].inc
    }
		
    var MAD = data[sample][coordType][i].MAD;
    var intensity = data[sample][coordType][i].intensity;
		
    // Do a transformation on the PCA direction if the projection is Up/North
    // Otherwise just take the normal direction
    if(nFlag) {

      // Subtract 90 from the declination and transform centre of mass if not forced
      var v1 = cart(PCADirection.dec - 90, PCADirection.inc);

      // Transform the centre of mass to proper projection.
      // Don't do this if anchored (direction of {0, 0, 0} is NaN)
      if(!data[sample][coordType][i].forced) {
        var temp = new dir(centerMass[0], centerMass[1], centerMass[2]);
        var temp2 = cart(temp.dec - 90, temp.inc, temp.R);
        var centerMass = [temp2.x, temp2.y, temp2.z];
      }

    } else {
      var v1 = cart(PCADirection.dec, PCADirection.inc);	
    }
		
    // Get the type of the principle component (direction (t1) or great circle (t3))
    var type = data[sample][coordType][i].type;
	
    // Draw a line
    // Center of mass + and - the scaled principle component. Not very pretty but works for drawing a line.
    if(type === 'dir') {

      // Scale vector by the intensity
      var scaling = intensity * 10;

      // in Highcharts, x and y coordinate are swapped
      // Add line for horizontal projection (x, y)
      var lineFit = [{
        'x': centerMass[0] + v1.x * scaling, 
        'y': centerMass[1] + v1.y * scaling
      }, {
        'x': centerMass[0] - v1.x * scaling,
        'y': centerMass[1] - v1.y * scaling
      }];

      $("#zijderveldPlot").highcharts().addSeries({
        'name': 'Horizontal (PCA) #' + (i + 1),
        'data': lineFit,
        'enableMouseTracking': false,
        'lineWidth': 1,
        'color': 'green',
        'marker': {
          'enabled' : false
        }
      });

      // Add line for horizontal projection (y, z)
      var lineFit = [{
        'x': centerMass[0] + v1.x * scaling, 
        'y': centerMass[2] + v1.z * scaling
      }, {
        'x': centerMass[0] - v1.x * scaling, 
        'y': centerMass[2] - v1.z * scaling
      }];
			
      $("#zijderveldPlot").highcharts().addSeries({
        'name': 'Vertical (PCA) #' + (i + 1),
        'data': lineFit,
        'lineWidth': 1,
        'enableMouseTracking': false,
        'color': 'red',
        'marker': {
          'enabled': false
        }
      });
			
      // Add the point for given PC line in the equal area projection
      $("#eqAreaDirections").highcharts().addSeries({
        'name': 'Linear Fit #' + (i+1),
        'data': [{
          'x': PCADirection.dec, 
          'y': eqArea(PCADirection.inc), 
          'inc': PCADirection.inc, 
          'name': 'Linear Fit #' + (i + 1)
        }],
        'type': 'scatter',
        'zIndex': 100,
        'marker': {
          'symbol': 'circle',
          'radius': 4,
          'lineColor': 'rgb(141, 69, 102)',
          'lineWidth': 2,
          'fillColor': PCADirection.inc < 0 ? 'white' : 'rgb(191, 119, 152)',
        }
      });
    }

    // Add the plane defined by t3 to the equal area projection
    if(type === 'GC') {
      var planeFit = getPlaneData(PCADirection, 'GC');
      $("#eqAreaDirections").highcharts().addSeries({
        'lineWidth': 1,
        'id': 'plane',
        'dashStyle': 'ShortDash',
        'enableMouseTracking': false,
        'color': 'red',
        'marker': {
          'enabled': false
        },
        'type': 'line', 
        'name': 'Planar Fit #' + (i+1), 
        'data': planeFit.lower
      });
			
      $("#eqAreaDirections").highcharts().addSeries({
        'lineWidth': 1,
        'linkedTo': ':previous',
        'enableMouseTracking': false,
        'color': 'red',
        'marker': {
          'enabled': false
        },
        'type': 'line', 
        'name': 'Planar Fit', 
        'data': planeFit.upper
      });
		
      // Add tau3 to the equal area projection
      $("#eqAreaDirections").highcharts().addSeries({
        'name': '\u03C4' + '3 #' + (i + 1),
        'type': 'scatter',
        'marker': {
          'symbol': 'circle',
          'lineColor': 'red',
          'lineWidth': 1,
          'fillColor': 'white'
        },
        'data': [{
          'x': PCADirection.dec, 
          'y': eqArea(PCADirection.inc),
          'inc': PCADirection.inc,
          'name': '\u03C4' + '3 #' + (i + 1),
        }]
      });
			
      // Add the MAD circle around t3
      var planeData = getPlaneData(PCADirection, 'MAD', MAD);	
      $("#eqAreaDirections").highcharts().addSeries({
        'lineWidth': 1,
        'id': 'MAD',
        'dashStyle': 'ShortDash',
        'enableMouseTracking': false,
        'color': 'red',
        'marker': {
          'enabled': false
        },
        'type': 'line', 
        'name': 'MAD Angle #' + (i + 1), 
        'data': planeData.lower
      });
			
      $("#eqAreaDirections").highcharts().addSeries({
        'lineWidth': 1,
        'linkedTo': ':previous',
        'dashStyle': 'ShortDash',
        'enableMouseTracking': false,
        'lineColor': 'red',
        'type': 'line', 
        'name': 'MAD Angle', 
        'data': planeData.upper,
        'marker': {
          'enabled': false
        }
      });
    }
	
    // Append information on forcing or including origin to type label (shown in table)
    if(data[sample][coordType][i].forced) {
      type += ' (forced)';
    }
    if(data[sample][coordType][i].origin) {
      type += ' (origin)';
    }
		
    // Update table with information on interpretations
    $("#infoTable").append('<tr> <td> Component #' + (i+1) + '</td> <td> ' + type + '<td> ' + PCADirection.dec.toFixed(1) + ' </td> <td> ' + PCADirection.inc.toFixed(1) + ' </td> <td> ' + intensity.toFixed(1) + '</td> <td> ' + MAD.toFixed(1) + '</td> <td> ' + coordinatesPretty + ' </td> <td> <a comp="' + (i+1) + '" onClick="changeRemark(event)">' + remark + '</a> </td> <td>' + sampleGroup + '</td> <td> <b><a style="color: rgb(191, 119, 152); cursor: pointer; border-bottom: 1px solid rgb(191, 119, 152);" comp="' + (i+1) + '" id="del'+(i+1)+'" onClick="removeInterpretation(event)">Delete</a></b> </td> </tr>');

    $("#clrIntBox").show();

  }

  var noteText = "the MAD and intensity are not reliable for forced directions. For great circles, the specified direction is the negative pole to the requested plane."
  $("#update").append('</table><small><b>Note:</b> ' + noteText + '</small>');

}

/* 
 * FUNCTION removeInterpretation
 * Description: removes interpreted component from memory
 *   triggered by clicking DELETE 
 * Input: button press event (tracks which component is pressed)
 * Output: VOID
 */
var removeInterpretation = function (event) {
	
  // Get the index of the component (passed through comp attribute of button)
  var index = $(event.target).attr("comp") - 1;
	
  // Capture specimen in samples variable
  var sample = getSampleIndex();
	
  // Remove (splice) component from saves in both tectonic and geographic coordinates
  data[sample]['GEO'].splice(index, 1);
  data[sample]['TECT'].splice(index, 1);

  // Redraw equal area projection and Zijderveld charts and add remaining components
  plotZijderveldDiagram();
  eqAreaProjection();
  drawInterpretations();

  setHoverRadius(); 
	
  // Check if no data and display NOT INTERPRETED sign
  if(data[sample]['GEO'].length === 0 && data[sample]['TECT'].length === 0) {
    data[sample].interpreted = false;
    showNotInterpretedBox();
  }
	
  // Save session
 setStorage();
	
}

/* 
 * FUNCTION showNotInterpretedBox
 * Description: shows the big red not interpreted box; interacts with the DOM
 * Input: NULL
 * Output: VOID
 */
var showNotInterpretedBox = function () {

  $('.ui-multiselect').css('color', 'rgb(191, 119, 152)'); 
  $("#update").html('<div style="width: 300px; margin: 0 auto; text-align: center; border: 1px solid red; background-color: rgba(255,0,0,0.1"><h2> Not interpreted </h2></div>');	
  $("#clrIntBox").hide();
	
}

/* 
 * FUNCTION changeRemark
 * Description: changes note for particular interpreted component
 * Input: button press event (tracks which component is pressed)
 * Output: VOID
 */
var changeRemark = function (event) {
	
  var index = event.target.getAttribute('comp') - 1;
	
  // Capture specimen in samples variable
  var sample = getSampleIndex();
  var text = prompt("Please enter a note below.", data[sample]['GEO'][index].remark);
	
  // Don't change note is cancel is pressed.
  if(text === null) return;
	
  // If text is not empty, otherwise put the default remark
  if(text !== "") {
    event.target.innerHTML = text;
    data[sample]['GEO'][index].remark = text;
    data[sample]['TECT'][index].remark = text;
  } else {
    event.target.innerHTML = 'Click to add';
    data[sample]['GEO'][index].remark = '';
    data[sample]['TECT'][index].remark = '';
  }
	
  setStorage();
	
}


/* FUNCTION unblockingSpectrum
 * Description: calculates the unblocking spectrum
 * Input: Highcharts Intensity series
 * Output: Highcharts formatted array of the UBS
 */
function getUBS(intensityData) {

  // Determine the unblocking spectrum
  var UBS = new Array();
  for(var i = 1; i < intensityData.length + 1; i++) {
    if(i !== intensityData.length) {	
      UBS.push({
        'x': intensityData[i - 1].x,
	'y': Math.abs(intensityData[i - 1].y - intensityData[i].y)
      });	
    }
  }

  // Add the first point
  if(UBS.length) {
    UBS.push({
      'x': intensityData[intensityData.length - 1].x,
      'y': UBS[UBS.length - 1].y
    });
  }

  return UBS;

}

/* FUNCTION vectorDifferenceSum
 * Description: calculates the VDS
 * Input: Highcharts intensity series
 * Output: Highcharts formatted array of the VDS
 */
function getVDS(intensityData) {

 // Get the vector difference sum
  var VDS = new Array();
  for(var i = 1; i < intensityData.length + 1; i++) {
    var sum = 0;
    for(var j = i; j < intensityData.length + 1; j++) {
      if(j === intensityData.length) {
        sum += Math.abs(intensityData[j-1].y);
      } else {
        sum += Math.abs(intensityData[j-1].y - intensityData[j].y);
      }
    }

    VDS.push({
      'x': intensityData[i-1].x,
      'y': sum
    });

  }

  return VDS;

}

/* 
 * FUNCTION setHoverRadius
 * Description: logic to handle increased radius size on the selected points
 *   In the Highcharts series for a graph we only save points to be displayed and not all points including the ones that are hidden.
 *   Therefore, We are required to count the number of hidden points and find the Highcharts index as a function of this.
 * Input: index of the point being hovered on
 * Output: VOID (updates Highcharts graphs)
 */
function setHoverRadius(index) {

  if(data.length === 0) return;

  showDataInformation();

  // No index given, get the selected step
  if(index === undefined) {
    var index = getSelectedStep();
  }
	
  // Get specimen name and capture charts to use
  var sample = getSampleIndex();


  // Capture the three graphs in the main body
  var zijderveldChart = $("#zijderveldPlot").highcharts();
  var hemisphereChart = $("#eqAreaDirections").highcharts();
  var intensityChart = $("#intensityPlot").highcharts();

  var lineColor = "rgb(119, 152, 191)";

  // Reset all data points in three graphs to default marker radius
  for(var i = 0; i < zijderveldChart.series[0].data.length; i++) {
		
    // Update zijderveld diagram series 2 and 3 (these are the markers; series 0 and 1 are the lines without markers)
    // the update method takes an argument false, meaning it will NOT redraw after the update (we do this manually at the end)
    zijderveldChart.series[1].data[i].update({'marker': {'radius': 2}}, false);
    zijderveldChart.series[3].data[i].update({'marker': {'radius': 2}}, false);

    // For the equal area projection we are required to account for the fillColor of the marker (either white (negative) or blue (positive))
    var color = hemisphereChart.series[0].data[i].marker.fillColor;
    hemisphereChart.series[0].data[i].update({'marker': {'radius': 4, 'lineWidth': 1, 'lineColor': lineColor, 'fillColor': color}}, false);

    intensityChart.series[0].data[i].update({'marker': {'radius': 4}}, false);

  }

  // Hovering over an invisible point, redraw charts and return
  if(!data[sample].data[index].visible) {
    zijderveldChart.redraw();
    hemisphereChart.redraw();	
    intensityChart.redraw();
    return;
  }
	
  // If we are hovering over a visible point (option has class show when it is hidden; good job)
  // Skip will capture the number of hidden points
  // Check if particular point i is visible
  // Check if this point i is the index we are hovering on, if so update that particular point and return the function
  // If we find the index, return the function
  var skip = 0;
  for(var i = 0; i < data[sample].data.length; i++) {
    if(data[sample].data[i].visible) {	
      if(i === index) {	
        zijderveldChart.series[1].data[index-skip].update({'marker': {'radius': 4}}, true);	
        zijderveldChart.series[3].data[index-skip].update({'marker': {'radius': 4}}, true);	
        var color = hemisphereChart.series[0].data[i-skip].marker.fillColor;
        hemisphereChart.series[0].data[index-skip].update({'marker': {'zIndex': 100, 'radius': 6, 'lineWidth': 1, 'lineColor': lineColor, 'fillColor': color}}, true);
        intensityChart.series[0].data[index-skip].update({'marker': {'radius': 6}}, true);
        return;
      }
    } else {
      skip++;
    }
  }		
	
  // Redraw charts at the end if not hovering over a visible index
  zijderveldChart.redraw();
  hemisphereChart.redraw();	
  intensityChart.redraw();

}

/*
 * FUNCTION exportInterpretation
 * Description: exports the interpretation to CSV file
 * Input: NULL
 * Output: VOID (calls dlItem to start download of formatted CSV)
 */
function exportInterpretation() {
		
  var csv = '';
  var noData = true;
	
  // Options
  var itemDelimiter = '","';
  var lineDelimiter = '\n';
	
  // Header row
  row = ["Sample Name", "Declination", "Inclination", "Intensity", "MAD", "Forced", "Type", "Coordinates", "Bedding Strike", "Bedding Dip", "Num Step", "Min Step", "Max Step", "Remark", "Information"];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
	
  // Loop over the interpretations in Geographic Coordinates and add them to the CSV string
  for(var i = 0; i < data.length; i++) {
    if(data[i].interpreted) {
      noData = false;
      for(var j = 0; j < data[i]['GEO'].length; j++) {
        var row = new Array();
        row.push(data[i].name, data[i]['GEO'][j].dec, data[i]['GEO'][j].inc, data[i]['GEO'][j].intensity, data[i]['GEO'][j].MAD, data[i]['GEO'][j].forced, data[i]['GEO'][j].type, 'Geographic Coordinates', data[i].bedStrike, data[i].bedDip, data[i]['GEO'][j].nSteps, data[i]['GEO'][j].minStep, data[i]['GEO'][j].maxStep, data[i]['GEO'][j].remark, data[i].info);
        csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
      }
    }
  }
  csv += lineDelimiter;
	
  // Repeat procedure for interpretations made in Tectonic Coordinates
  for(var i = 0; i < data.length; i++) {
    if(data[i].interpreted) {
      noData = false;
      for(var j = 0; j < data[i]['TECT'].length; j++) {
        var row = new Array();
        row.push(data[i].name, data[i]['TECT'][j].dec, data[i]['TECT'][j].inc, data[i]['TECT'][j].intensity, data[i]['TECT'][j].MAD, data[i]['TECT'][j].forced, data[i]['TECT'][j].type, 'Tectonic Coordinates', data[i].bedStrike, data[i].bedDip, data[i]['TECT'][j].nSteps, data[i]['TECT'][j].minStep, data[i]['TECT'][j].maxStep, data[i]['TECT'][j].remark, data[i].info);
        csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
      }
    }
  }
	
  // Check if data has been added
  noData ? notify('failure', 'No interpretations found for exporting.') : dlItem(csv, 'csv');
	
}

/* Function to patch data and recursively fix mistakes to exported.
 * The application needs to be backwards compatible so we needs
 * to update data that is not compatible with recent versions ._.
 */
function patch() {
	
  if(!data || data.length === 0) return;

  var patched = false;
 
  // Loop over all specimens 
  for(var i = 0; i < data.length; i++) {
		
  // First Paleomagnetism.org Patch (patch === undefined)
  // Set patch attribute, group attribute
  // Reduce the intensities by 10.5 (this was hardcoded before)
  if(data[i].patch === undefined) {

    patched = true;
    for(var j = 0; j < data[i].data.length; j++) {
      data[i].data[j].x = data[i].data[j].x / 10.5;
      data[i].data[j].y = data[i].data[j].y / 10.5;
      data[i].data[j].z = data[i].data[j].z / 10.5;
    }
			
    // Reduce the center of mass of floating 
	// interpreted directions and circles
	// and set group to None
    for(var j = 0; j < data[i]['GEO'].length; j++) {
      data[i]['GEO'][j].group = "None";
      data[i]['GEO'][j].cm = data[i]['GEO'][j].cm.map(function(x) {
        return x / 10.5;
      });
    }

    for(var j = 0; j < data[i]['TECT'].length; j++) {
      data[i]['TECT'][j].group = "None";
      data[i]['TECT'][j].cm = data[i]['TECT'][j].cm.map(function(x) {
        return x / 10.5;
      });
    }
			
    // Set patch to 1.1. This is VERY important.
    // It helps to keep track of the compatibility chain
    data[i].demagType = 'Unknown';
    data[i].patch = 1.1;
    data[i].format = 'Unknown';
    data[i].strat = null;

    }
  }
	
  setStorage();		
	
  if(patched) {
    notify('success', 'Your data has been patched to match a new version. Please export your data for saving (but keep a backup)');
  }
	
}

/* IMPORTING / PARSING FUNCTIONS
 * Description: Parses the Utrecht format to the Paleomagnetism.org format (interpretation portal)
 * Input: event (internal), format (the format to be parsed)
 * Output: VOID (fills global data array)
 * Currently supported formats:
 * UTRECHT - Utrecht
 * APP - Application (standard)
 */
function importing(event, format) {
		
  $("#appBody").hide();
  $("#input").dialog("close");

  // If not a .dir, read from the selected box
  if(format === undefined) {
    var format = $("#importFormats").val();
  }
	
  // Not appending, reset specimen data array
  if(!$('#appendFlag').prop('checked')) {
    data = new Array();
  }
	
  var initialSize = data.length; 

  // Filehandler API; handles the file importing
  var input = event.target;
  var reader = new FileReader();

  // Multiple inputs, handle asynchronously
  var index;
  (function readFile(index) {

    // PGL input is a binary, the rest is plain text (UTF-8)
    if(format === 'PGLBEIJING') {
      reader.readAsBinaryString(input.files[index]);			
    } else {
       reader.readAsText(input.files[index]);
    }
		
    reader.onload = function () {
			
      var text = reader.result;
	
      // Parsing formats refer to own functions
      // Contact us if you would like your custom format to be added
      // See the importUtrecht function as an example parser
      try { 
        if(format === 'PGLBEIJING') {
          importBeijing(text);  
        } else if(format === 'UTRECHT') {
          importUtrecht(text);
        } else if(format === 'APP') {;
          importApplication(text);
          patch();
        } else if(format === 'MUNICH') {
          importMunich(text);
        } else if(format === 'PALEOMAC') {
          importMac(text);
        } else if(format === 'OXFORD') {
		  importOxford(text);
		}
      } catch (ex) {
         notify('failure', 'An exception occured during importing, is the format correct?');
      }

      index++;
			
      if(index < input.files.length) {

        readFile(index);

      } else {

        if(data.length !== initialSize) {
          refreshSpecimenScroller();		
          setStorage();
	  notify('success', 'Importing was succesful; added ' + (data.length - initialSize) + ' specimens');
        } else {
	  notify('failure', 'No specimens were added.');
        }

      }
    }
  })(0);
  
}

/*
 * FUNCTION refreshSpecimenScroller
 * Define global data bucket to capture application info
 * Remove all previous options from the specimen scroller
 * Add all the specimens to the specimen scroller
 */
function refreshSpecimenScroller() {

  var scroller = $("#specimens");
	
  scroller.find('option').remove().end();
  for(var i = 0; i < data.length; i++) {
    var name = data[i].name;
    scroller.append("<option custom=\"" + i + "\" value=\"" + name + "\">" + name + "</option>");
  }
	
  scroller.multiselect('refresh');

}

function clearStorage() {

  if(confirm("Are you sure you wish to delete this instance and reset the application? This will also delete all saved interpretations.")){
    if(localStorage) {
      localStorage.removeItem('InterPortal');
      localStorage.removeItem('savedInt');
    }
    location.reload();
  }

}

function setStorage() {

  // Got here through URL, do not set storage
  if(location.search) {
	return;
  }
  
  if(localStorage) {
    try {
      var storeObj = JSON.stringify(data);
      localStorage.setItem('InterPortal', storeObj);				
    } catch (err) {
      notify('failure', 'Changes will not be saved. Please export manually!');
      notify('failure', 'Critical failure writing data to localstorage: ' + err);
    }
  }
  
}

function plotInterpretationsGraph(dataBucket, nCircles, container, title, coordinates) {

  var chartOptions = {
    'chart': {
      'backgroundColor': 'rgba(255, 255, 255, 0)',
      'coordinates': coordinates,
      'id': container,
      'polar': true,
      'animation': false,
      'renderTo': container, //Container that the chart is rendered to.
    },
    'title': {
      'text': title
    },
    'subtitle': {
      'text': '<b>' + dataBucket[0].data.length + ' directions and ' + nCircles + ' great circles </b> ' + '(' + coordinates + ')'
    },
    'pane': {
      'startAngle': 0,
       'endAngle': 360
    },
    'yAxis': {
      'type': 'linear',
      'reversed': true,
      'labels': {
        'enabled': false
      },
      'tickInterval': 90,
      'min': 0,
      'max': 90,
    },
    'tooltip': {
      'formatter': function () {
        return '<b> Specimen: </b> ' + this.point.sample + '<br><b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination: </b>' + this.point.inc.toFixed(1);
      }
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (Equal Area Projection)",
      'href': ''
    },
    'legend': {
      'floating': true
    },
    'xAxis': {
      'minorTickPosition': 'inside',
      'type': 'linear',
      'min': 0,
      'max': 360,
      'minorGridLineWidth': 0,
      'tickPositions': [0, 90, 180, 270, 360],
      'minorTickInterval': 10,
      'minorTickLength': 5,
      'minorTickWidth': 1,
      'labels': {
        'formatter': function () {
          return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
        }
      }
    },
    'plotOptions': {
      'line': {
        'lineWidth': 1,
        'color': 'rgb(119, 152, 191)'
      },
      'series': {
        'animation': false,
      }
    },
    'series': dataBucket
  }

  new Highcharts.Chart(chartOptions); //Initialize chart with specified options.;

  // Add stickies
  if(globalSticky.length != 0) {
    $("#eqAreaDirections").highcharts().addSeries({
      'color': 'gold',
      'type': 'scatter', 
      'name': 'Sticky', 
      'data': globalSticky,
      'marker': {
        'radius': 8,
        'symbol': 'diamond'
      }
    });
  }

}

/* function plotInterpretions
 * puts the interpreted directions and planes on an equal area projection
 */
function plotInterpretations() {

  $("#eqAreaFitted").hide();

  exportData = new Array();

  var plotDataDir = new Array();
  var plotDataCircle = new Array();
  var plotDataCircle2 = new Array();

  var dataFisher = new Array();
  var circlePoles = new Array();
	
  var coordType =  $("#coordinates input[type='radio']:checked").val();
  var coordinateNice = (coordType === 'GEO') ? 'Geographic Coordinates' : 'Tectonic Coordinates';

  var nCircles = 0;
  var nPoints = 0;
	
  //Loop over all the interpreted specimens
  for(var i = 0; i < data.length; i++) {
    if(data[i].interpreted) { 
      for(var j = 0; j < data[i][coordType].length; j++) {
        var dec = data[i][coordType][j].dec;
        var inc = data[i][coordType][j].inc;
        var sample = data[i].name;
        var color = (inc < 0) ? 'white' : 'rgb(119, 152, 191)';

	// Skip if this interpretation is not in the selected group		
        if(data[i][coordType][j].group !== group) {
          continue;
        }					

	//This interpreted direction is a direction (setpoint)
	if(data[i][coordType][j].type === 'dir') {

	  nPoints++;
	  dataFisher.push([dec, inc]);
				
	  //Push to Highcharts formatted data array
	  plotDataDir.push({
	    'info': data[i].info ? data[i].info : "",
	    'x': dec, 
            'sample': sample,
	    'y': eqArea(inc),
	    'inc': inc,
	    'marker': {
	      'fillColor' : color,
	      'lineColor' : 'rgb(119, 152, 191)',
	      'lineWidth' : 1,
	    }
	  });

        } else if (data[i][coordType][j].type === 'GC') {

	  nCircles++;
					
          var k = getPlaneData({'dec': dec, 'inc': inc}, 'GC');
	  plotDataCircle = plotDataCircle.concat(k.lower);
	  plotDataCircle.push({x: null, y: null});
	  plotDataCircle2 = plotDataCircle2.concat(k.upper);
	  plotDataCircle2.push({x: null, y: null});
	  circlePoles.push({'dec': dec, 'inc': inc});

        }
      }
    }
  }

  // Get the fisher parameters for the set points and request the 95% confidence Fisher ellipse
  var parameters = new fisher(dataFisher, 'dir', 'full');
  var ellipse = getPlaneData({
    'dec': parameters.mDec, 
    'inc': parameters.mInc
  }, 'MAD', parameters.a95);

  // Get fillColor for the mean direction (white if reversed)
  var color = (parameters.mInc < 0) ? 'white' : 'rgb(119, 191, 152)';
	
  // Construct data for plotting
  var plotData = [{
    'name': 'Interpreted Directions', 
    'data': plotDataDir,
    'type': 'scatter',
    'zIndex': 100
  }, {
    'name': 'Interpreted Great Circles',
    'id': 'gc',
    'dashStyle': 'ShortDash',
    'data': plotDataCircle,
    'poles': circlePoles,
    'enableMouseTracking': false,
    'turboThreshold': 0,
    'marker': {
      'enabled': false
    }
  }, {
    'name': 'Interpreted Great Circles',
    'linkedTo': 'gc',
    'data': plotDataCircle2,
    'enableMouseTracking': false,
    'turboThreshold': 0,
    'marker': {
      'enabled': false
    }	
  }, {
    'name': 'Mean',
    'type': 'scatter',
    'data': [{
      'sample': 'Direction Mean',
      'x': parameters.mDec,
      'y': eqArea(parameters.mInc),
      'inc': parameters.mInc,
      'info': 'Direction Mean'
    }],
    'color': 'rgb(119, 191, 152)',
    'marker': {
      'symbol': 'circle',
      'radius': 6,
      'fillColor': color,
      'lineColor': 'rgb(119, 191, 152)',
      'lineWidth': 1
    }
  }, {
    'name': 'α95 Confidence Interval',
    'id': 'confidence',
    'type': 'line',
    'color': 'red',
    'enableMouseTracking': false,
    'data': ellipse.lower,
    'marker': {
      'enabled': false
    }
  }, {
    'linkedTo': 'confidence',
    'type': 'line',
    'color': 'red',
    'enableMouseTracking': false,
    'data': ellipse.upper,
    'marker': {
      'enabled': false
    }	
  }];

  plotInterpretationsGraph( plotData, nCircles, 'eqAreaInterpretations', 'Interpreted Directions and Great Circles', coordinateNice);
  $("#fittingTable").html('<table class="sample" id="fittingTableInfo"><tr><th> N <small> (setpoints) </small> </th> <th>Mean Declination </th> <th>Mean Inclination </th> </tr>');
  $("#fittingTableInfo").append('<tr> <td> ' + nPoints + ' </td> <td> ' + parameters.mDec.toFixed(1) + ' </td> <td> ' + parameters.mInc.toFixed(1) + ' </td> </tr> </table>');
  $("#fittingTable").show();

  // If there are great circles, suggest the fitting routine to the user
  if(nCircles > 0) {
    $("#fitCircles").show();
    $("#fitCirclesDivText").html('<b>Click to fit the circles on the set points.</b>')
  } else {
    $("#fitCircles").hide();
    $("#fitCirclesDivText").html('')
  }

}

/*
 * Highcharts plugin for axis crossing at specific value
 * Latest revision: 2013-06-10
 * Original author: Torstein Honsi (Highcharts)
 * We use this script for the Zijderveld diagram that crosses at point (0, 0)
 */
(function (H) {

  H.wrap(H.Axis.prototype, 'render', function (proceed) {

    var chart = this.chart, otherAxis;

    if(typeof this.options.crossing === 'number') {
      otherAxis = chart[this.isXAxis ? 'yAxis' : 'xAxis'][0];
      this.offset = otherAxis.toPixels(this.options.crossing, true);
      chart.axisOffset[this.side] = 10;
    }

    proceed.call(this);

  });

}(Highcharts));
