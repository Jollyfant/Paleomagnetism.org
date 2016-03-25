/* PALEOMAGNETISM.ORG INTERPRETATION PORTAL
 * 
 * VERSION: ALPHA.1603
 * LAST UPDATED: 03/25/2016
 *
 * Description: Application that allows for the interpretation of laboratory obtained demagnetization data
 * Components (great circles and directions) can be interpreted following the principle component analysis of Kirschvink, 1981
 * Great circles may be fitted to set points following the iterative procedure after McFadden and McElhinny, 1992
 * Application output is a list of declination/inclination pairs that can be used in the Paleomagnetism.org statistics portal
 *
 * 		> Related Scientific Literature: 
 *
 * 		McFadden, P.L., McElhinny, M.W.  
 *		The combined analysis of remagnetization circles and direct observations in palaeomagnetism
 *		Earth and Planetary Science Letters 87 (1-2), pp. 161-17241 
 *		1988
 *
 *		Kirschvink, J.L.
 *		The least-squares line and plane and the analysis of palaeomagnetic data.
 *		Geophysical Journal, Royal Astronomical Society 62 (3), pp. 699-718
 *		1980
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

// Application start
// Define some global variables to be used
var li, liSelected;
var data;
var globalSticky = new Array();
var exportData = new Array();
var version = 'vALPHA.1613.5';

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
var getSelectedStep = function () {
  return parseInt($(liSelected).index());
}

/*
 * FUNCTION moveStep
 * Description: moves the selected demagnetization step "up" or "down"
 * Input: direction@string for direction to move ("up" or "down")
 * Output: VOID
 */
function moveDemagnetizationStep ( direction ) {
	
  "use strict";

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

  var input = prompt('Please enter a group name.');
  if(input === null) return;

  group = (input === '') ? 'None' : input;

  notify('success', 'Group changed to ' + group);
  plotInterpretations();

}
	
/*
 * jQuery UI definitions
 */
$(function() {
	
  $(".additionalOptions").selectmenu({
    'width': 200
  });
	
  $("#demagType").selectmenu({
    'select': function () {
      var sample = getSampleIndex();
      data[sample].type = $(this).val();
      setStorage();
    }
  });
	
	$("#hideControls").button({
		icons: { primary: "ui-icon-close"},
		text: false
	}).click( function () {
		$("#control").hide();
	});
	
	$("#showControls").button().click( function () {
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
    var declination = Number(inputSplit[1]);
    var inclination = Number(inputSplit[2]);
			
    // Push to global sticky array
    globalSticky.push({
      'name': name, 
      'x': declination, 
      'y': eqArea(inclination), 
      'inc': inclination
    });
			
    notify('success', 'The sticky ' + name + ' has been added to the equal area projection.');
			
    // Get specimen
    var sample = getSampleIndex();
			
    if(data.length === 0) return;
			
    // Redraw the equal area projection and set hover after redraw
    eqAreaProjection(data[sample]);
    drawInterpretations( sample );
    setHoverRadius();

  });
	
  // Clear all stickies and empty array
  $("#removeSticky").click( function () {
		
    globalSticky = new Array();
    notify('success', 'Stickies have been removed.');		

    var sample = getSampleIndex();
    eqAreaProjection(data[sample]);
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
      if(!$(liSelected).hasClass('show')) {
        liSelected.addClass('show');
        $(liSelected).text('···');
        data[sample].data[index].visible = false;
      } else {
        var defaultText = $(liSelected).attr('value');
        liSelected.removeClass('show');
        $(liSelected).text(defaultText);
        data[sample].data[index].visible = true;
      }
				
      // If the demagnetization step has class use, remove this class (we don't want hidden points to be included)
      if($(liSelected).hasClass('use')) {
        liSelected.removeClass('use');
        data[sample].data[index].include = false;
      }
				
      // Redraw all the charts when hiding steps
      zijderveld(data[sample]);
      intensity(data[sample]);
      eqAreaProjection(data[sample]);
      drawInterpretations( sample );

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
        if(!$(liSelected).hasClass('show')) {
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
  $("#saveInterpretation").click( function () {
	
    //Check if localStorage is supported
    if(!localStorage) {
      notify('failure', 'localStorage is not supported. Cannot add interpretations to localStorage.');			
      return;
    }
		
    var coordType = $("#coordinates input[type='radio']:checked").val();
    var saveObj = localStorage.getItem('savedInt');
		
    //Previously saved, get the save and 
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
	        'strat': data[i].strat,
                'type': data[i][coordType][j].type
              });
            }
          }
        }
      }
    } else {
      var type = 'great circles';
    }
		
    var name = prompt('Enter a site name.');
		
    if(name === "") {
      notify('failure', 'Site name is empty.');
      return;
    } else if(name === null) return;
		
    //Check if the site name already exists, if so, ask if the user wishes to overwrite the data.
    //Then splice the site from the array and add a new one, otherwise return
    for(var i = 0; i < parsedObj.length; i++) {
      if(name === parsedObj[i].name) {
        if(confirm('A site with this name already exists. Do you wish to overwrite?')) {
          parsedObj.splice(i, 1);
        } else {
          notify('failure', 'Aborted: site has not been saved.');
          return;
        }
      }
    }

    var beddings = exportData.map(function(x) {
      return x.bedStrike + '/' + x.bedDip;
    });
    var unique = (beddings.filter(function(value, index, self) {
      return self.indexOf(value) === index;
    }).length === 1);

    parsedObj.push({
      'name': name,
      'data': exportData, 
      'type': type,
      'coordType': coordType === 'GEO' ? "geographic" : "tectonic",
      'unique': unique
    });

    localStorage.setItem('savedInt', JSON.stringify(parsedObj));
    notify('success', 'Site ' + name + ' has been forwarded to the statistics portal.');	
			
    exportData = new Array();
		
  });
	
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
		
    showData(getSampleIndex());	

    //When a new specimen is loaded, start at step 0
    //Set the hover and selection on the first point of the series			
    liSelected = li.first().addClass('selected');
    setHoverRadius(0);

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
		
    showData(getSampleIndex());	
		
    //Set the hover and selection on the first point of the series
    liSelected = li.first().addClass('selected');
    setHoverRadius(0);

  });
	
  /* 
   * CHANGE EVENT: all flags trigger a change
   * Description: We need to redraw the charts in the proper projection and coordinate reference frame after a change is made
   */
  $("#tcViewFlag, #nFlag, #labelFlag, #specFlag").change( function () {
	
    if(!data || data.length === 0) return;

    var sample = getSampleIndex();

    if(sample === undefined) return;
			
    // Redraw Zijderveld and eqArea projection (Intensity diagram is identical for all frames)
    zijderveld(data[sample]);
    eqAreaProjection(data[sample]);		
    drawInterpretations(sample);

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
        showData(sample); 
				
        //Set the hover and selection on the first point of the series
        liSelected = li.first().addClass('selected');

      }
    }

  });
	
  /* 
   * PRINICPLE COMPONENT ANALYSIS FUNCTIONS
   * PCA (line) and PCAGC (great circle)
   */
  $('#PCA, #PCAGC').click( function (event) {
	
    // Get the flags
    var tcFlag = $('#tcFlag').prop('checked');
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
    zijderveld(data[sample]);
    eqAreaProjection(data[sample]);
		
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
        notify('failure', 'A minimum of two points are required. Select points by pressing +.');
        drawInterpretations( sample );
      }
      return;
    }
		
    // For specimen get core parameters
    // Reduce the core dip to -hade that is equal to -(90 - plunge)
    var coreAzi = sampleData.coreAzi;
    var coreDip = -(90 - sampleData.coreDip);
    var bedStrike = sampleData.bedStrike;
    var bedDip = sampleData.bedDip;
		
    // Loop over all included points
    for(var i = 0; i < nSteps; i++) {

      // Rotate specimen to geographic coordinates
      // If we are including the origin (not forcing) we use a point 0, 0, 0 which has no vector, so give 0, 0, 0 for dec, inc, R
      if(includedSteps[i][0] === 0 && includedSteps[i][1] === 0 && includedSteps[i][2] === 0) {
        var rotatedGeographic = {'dec': 0, 'inc': 0 , 'R': 0}
      } else {
        var rotatedGeographic = rotateGeographic(coreAzi, coreDip, includedSteps[i]);
      }
			
      // If tc is selected, rotate the geographic coordinates to to tectonic coordinates
      if(tcFlag) {
        var rotated = rotateTectonic(bedStrike, bedDip, rotatedGeographic);
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
    P1x = [P1.x, P1.y, P1.z];
    P2x = [P2.x, P2.y, P2.z];
				
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
      var MAD = Math.atan(Math.sqrt(tau[1] + tau[2]) / s1)/rad;
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
        'remark': '',
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
      var MAD = Math.atan(s1)/rad;
      var setType = 'GC';
			
      // Per definition we use the negative pole of the plane
      if(eigenDirection.inc > 0) {
        eigenDirection.dec = (eigenDirection.dec+180)%360;
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
        'remark': '',
        'nSteps': steps.length,
        'minStep': steps[0],
        'maxStep': steps[steps.length-1],
        'steps': steps,
        'group': group,
        'version': version
      }
    }
		
    // Check if component already exists
    var sanitized = true;
    for(var i = 0; i < sampleData[coordType].length; i++) {
      if(JSON.stringify(dataObj) === JSON.stringify(sampleData[coordType][i])) {
        if(tcFlag) {
          notify('failure', 'This direction has already been interpreted.');
        }
        var sanitized = false;
      }
    }
    if(sanitized) {
      sampleData[coordType].push(dataObj);
    }
		
    // Only redraw once (this function is automatically called in both Geographic and Tectonic coordinates)
    // So reduce to just firing when interpreting in Tectonic coordinates
   if(tcFlag) {
      drawInterpretations( sample );
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
    zijderveld(data[sample]);
    eqAreaProjection(data[sample]);
		
    setHoverRadius();	
    setStorage();
		
  });

  //Initialize the Interpretation Portal
  initialize();
	
});

function initialize() {

  "use strict";
	
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

/* 
 * FUNCTION fitCirclesToDirections
 * Description: applies the iterative fitting function after McFadden and McElhinny, 1989 on fitting great circles to set point directions
 * 			  : implemented from PALFIT.f95
 * Input: NONE
 * Output: VOID (stores information in exportData global for exporting)
 */
function fitCirclesToDirections() {

  "use strict";

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
          'strat': strat,
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
    var R = Math.sqrt(xSum*xSum + ySum*ySum + zSum*zSum);
    var unitMeanVector = {
      'x': xSum/R, 
      'y': ySum/R, 
      'z': zSum/R
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

  var nIterations = 0;
	
  //Iterative procedure start
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
      angles.push(Math.acos(dotProduct)/rad);
			
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
        var greatCircleDataPos = greatCircleDataPos.concat(greatCircles.one);
      } else {
        var greatCircleDataNeg = greatCircleDataNeg.concat(greatCircles.one);
      }
    }
	
    //Modified Fisher statistics /McFadden and McElhinny (1988)
    var nTotal = nPoints + nCircles; //Total N
    var nPrime = Math.max(1.1, nPoints + nCircles/2);

    //Other statistical parameters (McFadden & McElhinny, 1988)
    var k = (2*nPoints + nCircles - 2)/(2*(nPoints + nCircles - R));
    var t95 = Math.acos(1 - ((nPrime - 1)/k) * (Math.pow(20, (1/(nPrime - 1))) - 1))/rad;
	
    //Standard Fisher parameters (k, a95);
    var k = (nTotal - 1) / (nTotal - R);
    var a95 = Math.acos(1 - ((nTotal - R)/R) * (Math.pow(20, (1/(nTotal - 1))) - 1))/rad;

    //Get confidence envelope data around newMean with a95, t95
    var ellipse = getPlaneData({'dec': newMean.dec, 'inc': newMean.inc}, 'MAD', a95);
    var ellipse2 = getPlaneData({'dec': newMean.dec, 'inc': newMean.inc}, 'MAD', t95);

    //Get color for mean direction (if neg make white)
    var color = (newMean.inc < 0) ? 'white' : 'rgb(119, 191, 152)';
	
    //Set up data for Highcharts:
    //Directions, Fitted directions, Mean direction, Great circles, Confidence Ellipses..
    var plotData = [{
      name: 'Directions',
      type: 'scatter',
      color: 'rgb(119, 152, 191)',
      data: pointsSet,
      zIndex: 100,
    }, {
      name: 'Fitted Directions',
      type: 'scatter',
      color: 'rgb(191, 119, 152)',
      data: pointsCircle,
      zIndex: 100,
      marker: {
      symbol: 'circle'
    }
  }, {
    name: 'Great Circles',
    id: 'GCs',
    type: 'line',
    data: greatCircleDataPos,
    dashStyle: 'ShortDash',
    turboThreshold: 0,
    enableMouseTracking: false,
    marker: {
      enabled: false,
    }
  }, {
    name: 'Great Circles',
    linkedTo: 'GCs',
    type: 'line',
    data: greatCircleDataNeg,
    turboThreshold: 0,
    enableMouseTracking: false,
    marker: {
      enabled: false,
    }
  },  {
    name: 'Mean',
    type: 'scatter',
    data: [{
      'sample': 'Direction Mean',
      'x': newMean.dec,
      'y': eqArea(newMean.inc),
      'inc': newMean.inc,
      'info': 'Direction Mean'
    }],
    color: 'rgb(119, 191, 152)',
    marker: {
      symbol: 'circle',
      radius: 6,
      fillColor: color,
      lineColor: 'rgb(119, 191, 152)',
      lineWidth: 1
    }
  }, {
    name: 'α95 Fitted Confidence',
    id: 'confidence',
    type: 'line',
    color: 'red',
    enableMouseTracking: false,
    data: ellipse.two,
    marker: {
      enabled: false
    }
  }, {
    linkedTo: 'confidence',
    type: 'line',
    color: 'red',
    enableMouseTracking: false,
    data: ellipse.one,
    marker: {
      enabled: false
    }	
  }, {
    name: 'α95 Full Confidence',
    id: 'confidence2',
    type: 'line',
    color: 'red',
    enableMouseTracking: false,
    data: ellipse2.two,
    marker: {
      enabled: false
    }
  }, {
    linkedTo: 'confidence2',
    type: 'line',
    color: 'red',
    enableMouseTracking: false,
    data: ellipse2.one,
    marker: {
      enabled: false
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

  "use strict";
	
  var tau = meanVector.x * p + meanVector.y * q + meanVector.z * r;
  var rho = Math.sqrt(1 - tau * tau);
	
  return {
    'x': ((meanVector.x - tau * p) / rho),
    'y': ((meanVector.y - tau * q) / rho),
    'z': ((meanVector.z - tau * r) / rho),
  }
}

/* FUNCTION getPlaneData
 * Description: calculates discrete plane and ellipse points for plotting
 * Input: dirIn (direction around point to plot), type (GC [plane] or MAD [ellipse]), MAD
 * Output: Two series with discrete points (positive/negative)
 */
function getPlaneData(direction, type, MAD) {

  'use strict';

  // Pad the arrays that collect discrete points with null
  // Otherwise Highcharts might connect lower & upper hemi
  var lowerHemisphere = new Array(null);
  var upperHemisphere = new Array(null);

  // Define the number of discrete points on an ellipse
  var nPoints = 251;
  var iPoint = ((nPoints - 1) / 2);

  var pointVector = [0, 0, 0];
  for(var i = 0; i < nPoints; i++){

    var psi = ((i * Math.PI) / iPoint);

    // Create a circle in the y-z plane (with a normal to North)
    // The resulting coordinate for x on unit-sphere for great circle is always 0
    if(type === 'GC') {
      pointVector[1] = Math.cos(psi);
      pointVector[2] = Math.sin(psi);
      pointVector[0] = 0
    }

    // Create a circle in the y-z plane (with a normal to North)
    // The resulting coordinate is sqrt(1 - y^2 - z^2)
    if (type === 'MAD') {
      pointVector[1] = Math.sin(MAD * rad) * Math.cos(psi);
      pointVector[2] = Math.sin(MAD * rad) * Math.sin(psi);
      pointVector[0] = Math.sqrt(1 - Math.pow(pointVector[1], 2) - Math.pow(pointVector[2], 2)); 
    }

    // Rotate the discrete point vector with the requested dec/inc
    var coords = rotateGeographic(direction.dec, -direction.inc, pointVector);

    var discretePointPosition = {
        'x': coords.dec,
        'y': eqArea(coords.inc), 
        'inc': coords.inc
      }

    if(coords.inc < 0) {
      upperHemisphere.push(discretePointPosition);
    } else {
      lowerHemisphere.push(discretePointPosition);
    }
	
  }

  return {
    'one': upperHemisphere,
    'two': lowerHemisphere
  };

}

/* FUNCTION showData
 * Description: handles creation of list for scrolling and plotting
 * Input: sample index
 * Output: VOID (creates list and plots)
 */ 
function showData( sample ) {

  "use strict";
	
  if(data === null || data.length === 0) return;
	
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
      li.eq(i).addClass('show');
      li.eq(i).text('···');
    }
    if(data[sample].data[i].include){
      li.eq(i).addClass('use');
      li.eq(i).append('*');
    }
  }
	
  var coordType = $('#tcViewFlag').prop('checked') ? 'TECT' : 'GEO';
	
  if($("#showStrat").prop('checked')) {
    $("#stratLevelText").html('Stratigraphic Level: ' + data[sample].strat);
  } else {
    $("#stratLevelText").html('');
  }
	
  // Draw the charts
  zijderveld(data[sample]);
  intensity(data[sample]);
  eqAreaProjection(data[sample]);

  //Check if the sample has been previously interpreted
  if(data[sample].interpreted) {
    $('.ui-multiselect').css('color', 'rgb(119, 191, 152)'); //Set the specimen scroller color to green
    drawInterpretations( sample ) //Draw interpreted directions
  } else {
    showNotInterpretedBox();
  }
	
  $("#appBody").show();

}

/*
 * function sortBy
 * Description: sorts the order of specimens by stratigraphy or randomly
 * Input: type@string of sorting
 * Output: VOID (sorts global data array)
 */
function sortBy (type) {

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
var drawInterpretations = function ( sample ) {

  "use strict";

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
		
    // Do a transformation if the projection is Up/West
    if(!nFlag) {

      // Subtract 90 from the declination and transform centre of mass if not forced
      var v1 = cart(PCADirection.dec + 90, PCADirection.inc);

      // Transform the centre of mass to proper projection.
      // Don't do this if anchored (direction of {0, 0, 0} is NaN)
      if(!data[sample][coordType][i].forced) {
        var temp = new dir(centerMass[0], centerMass[1], centerMass[2]);
        var temp2 = cart(temp.dec + 90, temp.inc, temp.R);
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
      // Add line for horizontal projection (y, x)
      var lineFit = [{
        'x': centerMass[1] + v1.y * scaling, 
        'y': centerMass[0] + v1.x * scaling
      }, {
        'x': centerMass[1] - v1.y * scaling,
        'y': centerMass[0] - v1.x * scaling
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
        'x': centerMass[1] + v1.y * scaling, 
        'y': -centerMass[2] - v1.z * scaling
      }, {
        'x': centerMass[1] - v1.y * scaling, 
        'y': -centerMass[2] + v1.z * scaling
      }];
			
      $("#zijderveldPlot").highcharts().addSeries({
        'name': 'Vertical (PCA) #' + (i+1),
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
        'data': planeFit.one
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
        'data': planeFit.two
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
        'data': planeData.one
      });
			
      $("#eqAreaDirections").highcharts().addSeries({
        'lineWidth': 1,
        'linkedTo': ':previous',
        'dashStyle': 'ShortDash',
        'enableMouseTracking': false,
        'lineColor': 'red',
        'type': 'line', 
        'name': 'MAD Angle', 
        'data': planeData.two,
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

  var noteText = "the MAD and intensity are not reliable for forced directions. For great circles, the specified direction is the pole to the requested plane."
  $("#update").append('</table><small><b>Note:</b> ' + noteText + '</small>');
}
}

/* 
 * FUNCTION removeInterpretation
 * Description: removes interpreted component from memory
 *            : triggered by clicking DELETE 
 * Input: button press event (tracks which component is pressed)
 * Output: VOID
 */
var removeInterpretation = function (event) {
	
  "use strict";
	
  // Get the index of the component (passed through comp attribute of button)
  var index = $(event.target).attr("comp") - 1;
	
  // Capture specimen in samples variable
  var sample = getSampleIndex();
	
  // Remove (splice) component from saves in both tectonic and geographic coordinates
  data[sample]['GEO'].splice(index, 1);
  data[sample]['TECT'].splice(index, 1);

  // Redraw equal area projection and Zijderveld charts and add remaining components
  zijderveld(data[sample]);
  eqAreaProjection(data[sample]);
  drawInterpretations(sample);

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

  "use strict";
	
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

  "use strict";
	
  var index = event.target.getAttribute('comp') - 1;
	
  // Capture specimen in samples variable
  var sample = getSampleIndex();
  var text = prompt("Please enter a note below.");
	
  // Don't change note is cancel is pressed.
  if(text === null) return;
	
  // If text is not empty, otherwise put the default remark
  if(text !== "") {
    event.target.innerHTML = text;
    data[sample]['GEO'][index].remark = text;
    data[sample]['TECT'][index].remark = text;
  } else {
    event.target.innerHTML = 'Click to Change';
    data[sample]['GEO'][index].remark = '';
    data[sample]['TECT'][index].remark = '';
  }
	
  setStorage();
	
}

/*
 * FUNCTION rotateGeographic
 * Description: rotates specimens to geographic coordinates 
 * Input: azimuth, plunge, data (x, y, z)
 * Output: dec, inc, R of rotated vector
 */
var rotateGeographic = function(azimuth, plunge, data) {
	
  "use strict";

  // Convert to radians
  var azimuth = azimuth * rad;
  var plunge = plunge * rad;
	
  // Vector v with x, y, z coordinates
  var vector = [data[0], data[1], data[2]];

  // Rotation matrix; Lisa Tauxe, (2010) Appendix. A.13
  var rotMat = [
    [Math.cos(plunge) * Math.cos(azimuth), -Math.sin(azimuth), -Math.sin(plunge) * Math.cos(azimuth)],
    [Math.cos(plunge) * Math.sin(azimuth), Math.cos(azimuth), -Math.sin(plunge) * Math.sin(azimuth)],
    [Math.sin(plunge), 0, Math.cos(plunge)]
  ];

  // Do matrix-vector multiplication
  // V'i = RijVj (summation convention)
  var vectorP = [0, 0, 0];		
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      vectorP[i] += rotMat[i][j] * vector[j];
    }
  }

  // Return a direction with the rotated vector
  return dir(vectorP[0], vectorP[1], vectorP[2]);

}

/*
 * FUNCTION rotateTectonic
 * Description: rotates specimens to geographic coordinates 
 * Input: strike, plunge, data (x, y, z)
 * Output: The rotated vector
 */
function rotateTectonic(strike, plunge, direction) {

  "use strict";

  // Angle with North is equal to the declination of the mean vector (+90)
  // Since our convention is strike, and the normal is always 90 deg. to the right
  var dipDirection =  strike + 90;

  // We can subtract the dip direction from the declination because 
  // inclination will not change
  // (Refer to Lisa Tauxe: 9.3 Changing coordinate systems; last paragraph)
  var coords = cart(direction.dec - dipDirection, direction.inc, direction.R);

  // Call rotation matrix A.13 with (ϕ = 0, λ = -plunge) and pass Cartesian coordinates of the direction
  var rotated = rotateGeographic(0, -plunge, [coords.x, coords.y, coords.z]);

  // Add the dip direction back to the vector
  rotated.dec = (rotated.dec + dipDirection) % 360;

  return rotated;

}

/* function generateZijderveldTooltip
 * Description: generates the tooltip used in the Zijderveld diagram
 */
function generateZijderveldTooltip(self) {

  return [
    '<b>Demagnetization Step: </b>' + self.point.step,
    '<b>Declination: </b>' + self.point.dec.toFixed(1),
    '<b>Inclination: </b>' + self.point.inc.toFixed(1),
    '<b>Intensity: </b>' + self.point.intensity.toFixed(2) + 'µA/m'
  ].join("<br>");

}

/*
 * FUNCTION zijderveld
 * Description: handles graphing for zijderveld plot
 * Input: samples (sample[sampleIndex])
 * Output: VOID (plots zijderveld graph)
 */
function zijderveld(samples) {

  "use strict";
	
  //Specimen metadata (core and bedding orientations)
  var coreBedding = samples.coreAzi;
  var coreDip = samples.coreDip - 90;
  var beddingStrike = samples.bedStrike;
  var beddingDip = samples.bedDip;
	
  // Get the flag options
  var nFlag = $('#nFlag').prop('checked');
  var tcFlag = $('#tcViewFlag').prop('checked');
  var enableLabels = $('#labelFlag').prop('checked');
  var specFlag = $('#specFlag').prop('checked');
	
  //Check if user wants to view in specimen coordinates, put the core bedding to 0 and core azimuth to 90;
  if(specFlag) {
    var coreBedding = 0;
    var coreDip = 0;
    var coordinateInformation = '(Specimen)';
  } else {
    var coordinateInformation = '(Geographic)';
  }
	
  //Data buckets for inclination/declination lines
  var decDat = new Array();
  var incDat = new Array();
	
  //Parameters to scale axes (min, max)
  var graphScale = new Array();	
	
  //Loop over all points and do rotations if requested (e.g. Specimen, Geographic, or Tectonic coordinates in N/Up or W/Up projection)
  for(var i = 0; i < samples.data.length; i++) {

    if(samples.data[i].visible) {
			
      //Rotate to geographic coordinates
      var direction = rotateGeographic(coreBedding, coreDip, [samples.data[i].x, samples.data[i].y, samples.data[i].z]);

      //Rotate to tectonic coordinates if requested and not viewing in specimen coordinates
      if(tcFlag && !specFlag) {
        var coordinateInformation = '(Tectonic)';
        var direction = rotateTectonic(beddingStrike, beddingDip, direction);
      }

      //Check the projection flag, if we wish to show Up/North subtract 90 from the declination
      // x and y axes are swapped in Highcharts (to our Cartesian definition [see core.cart])
      if(nFlag) {
        var carts = new cart(direction.dec, direction.inc, direction.R);
        var projectionInformation = 'Up/North';	
      } else {
        var carts = new cart(direction.dec + 90, direction.inc, direction.R);	
        var projectionInformation = 'Up/West';				
      }

      //Declination is x, y plane (switched) because of conventions
      decDat.push({
        'x': carts.y, 
        'y': carts.x, 
        'dec': direction.dec,
        'inc': direction.inc,
        'intensity': direction.R,
        'step': samples.data[i].step
      });
			
      // Up is positive, so -z
      //Inclination is y (x), -z plane
      incDat.push({
        'x': carts.y, 
        'y': -carts.z,
        'dec': direction.dec,
        'inc': direction.inc,
        'intensity': direction.R,
        'step': samples.data[i].step
      });

      //Push the values for x and (y, z) to arrays. At the end we determine the maximum/minimum from these arrays. 
      graphScale.push(Math.abs(carts.x), Math.abs(carts.y), Math.abs(carts.z));

    }
  }

  //Obtain the maximum and minimum values which will be used as the graph boundaries
  //The Zijderveld diagram will always be a square
  var graphScale = Math.max.apply(Math, graphScale);

  var chartOptions = {
    'chart': {
    'animation': false,
    'zoomType': 'xy',
    'id': 'Zijderveld',
    'renderTo': 'zijderveldPlot',
    'events': {
      'load': function () {
        if (this.options.chart.forExport) {
          for(var i = 0; i < this.series[0].data.length; i++) {
            this.series[2].data[i].update({marker: {radius: 2}}, false);
            this.series[3].data[i].update({marker: {radius: 2}}, false);
          }
        }
        this.redraw();
      }
    }
  },
  'exporting': {
    'filename': 'Zijderveld',
    'sourceWidth': 600,
    'sourceHeight': 600,
    'buttons': {
      'contextButton': {
        'symbolStroke': '#7798BF',
        'align': 'right'
      }
    }
  },
  'title': {
    'text': 'Zijderveld Diagram (' + samples.name + ')'
  },
  'tooltip': {
    'useHTML': true,
      'formatter': function () {
        return generateZijderveldTooltip(this);
      }
    },
    'subtitle': {
      'text': '<b>' + coordinateInformation + '</b><br>' + projectionInformation
    },
    'xAxis': {
      'gridLineWidth': 0,
      'lineColor': 'black',
      'crossing': 0,
      'min': -graphScale,
      'max': graphScale,
      'gridLineWidth': 0,
      'tickWidth': 1,
      'lineWidth': 1,
      'opposite': true,
      'title': {
        'enabled': false
      },
      'labels': {
        'formatter': function () {
          if(this.value === 0) return '';
          else return this.value;
        }
      }
    },
    'yAxis': {
      'min': -graphScale,
      'max': graphScale,
      'gridLineWidth': 0,
      'lineWidth': 1,
      'tickWidth': 1,
      'minRange': 10,
      'lineColor': 'black',
      'crossing': 0,
      'title': {
        'enabled': false
      },
      'labels': {
        'formatter': function () {
          if(this.value === 0) return '';
          else return this.value;
        }
      }
    },
    'plotOptions': {
      'series': {
        'animation': false,
        'dataLabels': {
          'color': 'grey',
          'enabled': enableLabels,
          'style': {
            'fontSize': '10px'
          },
          'formatter': function () {
            return this.point.step;
          }
        }
      },
      'line': {
        'lineWidth': 1,
      }
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (Zijderveld Diagram)",
      'href': ''
    },
    'series': [{
      'type': 'line',
      'linkedTo': 'Horizontal Projection',
      'name': 'Declination', 
      'enableMouseTracking': false,
      'data': decDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'enabled': false
      }
    }, {
      'name': 'Vertical Projection',
      'type': 'line',
      'linkedTo': 'Projected Inclination',
      'enableMouseTracking': false,
      'data': incDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'enabled': false
      }
    }, {
      'type': 'scatter',
      'id': 'Declination',
      'name': 'Horizontal Projection', 
      'data': decDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'lineWidth': 1,
        'symbol': 'circle',
        'radius': 2,
	'lineColor': 'rgb(119, 152, 191)',
	'fillColor': 'rgb(119, 152, 191)'
      }
    }, {
      'type': 'scatter',
      'id': 'Inclination',
      'name': 'Vertical Projection',
      'data': incDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'symbol': 'circle',
        'lineWidth': 1,
        'radius': 2,
        'lineColor': 'rgb(119, 152, 191)',
        'fillColor': 'white'
      }
    }]
  }

  new Highcharts.Chart(chartOptions);

}

function vectorLength(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}

function unblockingSpectrum(data) {

  // Determine the unblocking spectrum
  var UBS = new Array();
  for(var i = 1; i < data.length + 1; i++) {
    if(i !== data.length) {	
      UBS.push({
        'x': data[i - 1].x,
	'y': Math.abs(data[i - 1].y - data[i].y)
      });	
    }
  }

  // Add the first point
  UBS.push({
    'x': data[data.length - 1].x,
    'y': UBS[UBS.length - 1].y
  });

  return UBS;

}

/* FUNCTION vectorDifferenceSum
 * Description: calculates the VDS
 * Input: Highcharts Intensity series
 * Output: Highcharts formatted array of the VDS
 */
function vectorDifferenceSum(data) {

 // Get the vector difference sum
  var dataSeriesVDS = new Array();
  for(var i = 1; i < data.length + 1; i++) {
    var sum = 0;
    for(var j = i; j < data.length + 1; j++) {
      if(j === data.length) {
        sum += Math.abs(data[j-1].y);
      } else {
        sum += Math.abs(data[j-1].y - data[j].y);
      }
    }	
    dataSeriesVDS.push({
      'x': data[i-1].x,
      'y': sum
    });
  }

  return dataSeriesVDS;
}

/* FUNCTION intensity
 * Description: handles graphic for intensity plot
 * Input: sample index
 * Output: VOID (plots intensity)
 */
function intensity (sample) {

  "use strict";

  var intensities = new Array();
  var RES = new Array();

  for(var i = 0; i < sample.data.length; i++) {

    var step = sample.data[i];

    // On show steps that are visible
    //Remove mT, μT or whatever from step - just take a number (regex)
    if(step.visible) {

      var treatmentStep = step.step.replace(/[^0-9.]/g, "");
      var R = vectorLength(step.x, step.y, step.z);

      intensities.push(R);
      RES.push({
        'x': Number(treatmentStep), 
        'y': R
      });

    }

  }

  // Get the unblocking spectrum (UBS) and vector difference sum (VDS)
  var UBS = unblockingSpectrum(RES);
  var VDS = vectorDifferenceSum(RES);

  // Normalize the intensities to the maximum resultant intensity
  // if requested
  var normalizationFactor = Math.max.apply(null, intensities);
  if($('#normalizeFlag').prop('checked')) {
    RES = RES.map(function(x) {
      x.y = x.y/normalizationFactor
      return x;
    });
    VDS = VDS.map(function(x) {
      x.y = x.y/normalizationFactor
      return x;
    });	
    UBS = UBS.map(function(x) {
      x.y = x.y/normalizationFactor
      return x;			
    });
  }
	
  var plotSeries = [{
    'name': 'Resultant Intensity',
    'data': RES,
    'zIndex': 10
  }, {
    'name': 'Vector Difference Sum',
    'data': VDS,
    'marker': {
      'symbol': 'circle'
    },
    'zIndex': 10
  }, {
    'type': 'area',
    'step': true,
    'pointWidth': 50,
    'name': 'Unblocking Spectrum',
    'data': UBS,
    'zIndex': 0
  }];

  createIntensityDiagram(sample, plotSeries);
 
}

/* 
 * FUNCTION eqAreaProjection
 * Description: Handles plotting for equal area projection
 * Input: sample index
 * Output: VOID (plots chart)
 */
function eqAreaProjection ( sample ) {
	
  //Get the bedding and core parameters from the sample object
  var coreAzi = sample.coreAzi;
  var coreDip = sample.coreDip - 90;
  var beddingStrike = sample.bedStrike;
  var beddingDip = sample.bedDip;
	
  //Get the Boolean flags for the graph
  var enableLabels = $('#labelFlag').prop('checked');
  var tcFlag = $('#tcViewFlag').prop('checked');
  var specFlag = $('#specFlag').prop('checked');
	
  //Check if user wants to view in specimen coordinates, put the core bedding to 0 and core azimuth to 90;
  if(specFlag) {
    var coreAzi = 0;
    var coreDip = 0;
    var information = '(Specimen)';
  } else {
    var information = '(Geographic)';
  }
	
  // Format a Highcharts data bucket for samples that are visible
  var dataSeries = new Array();
  for(var i = 0; i < sample.data.length; i++) {
    if(sample.data[i].visible) {
			
      //Rotate samples to geographic coordinates using the core orientation parameters
      var direction = rotateGeographic(coreAzi, coreDip, [sample.data[i].x, sample.data[i].y, sample.data[i].z]);
			
      // If a tilt correction is requested, rotate again
      // Only do this if NOT viewing in specimen coordinates
      if(tcFlag && !specFlag) {
        var information = '(Tectonic)';
        var direction = rotateTectonic(beddingStrike, beddingDip, direction);
      }
	
      dataSeries.push({
        'x': direction.dec, 
        'y': eqArea(direction.inc), 
        'inc': direction.inc, 
        'step': sample.data[i].step,
        'marker': { 
          'fillColor': direction.inc < 0 ? 'white' : 'rgb(119, 152, 191)', 
          'lineWidth': 1, 
          'lineColor': 'rgb(119, 152, 191)' 
        }
      });
    }
  }
	
  // Prevent making a connection between first - last data point
  dataSeries.push(null);
	
  var chartOptions = {
    'chart': {
      'backgroundColor': 'rgba(255, 255, 255, 0)',
      'id': 'eqAreaProjDir',
      'polar': true,
      'animation': false,
      'renderTo': 'eqAreaDirections',
      'events': {
        'load': function () {
          if (this.options.chart.forExport) {
            for(var i = 0; i < this.series[0].data.length; i++) {

              this.series[0].data[i].update({
                'marker': {
                  'radius': 4,
                  'lineWidth': 1,
                  'lineColor': 'rgb(119, 152, 191)',
                  'fillColor': this.series[0].data[i].inc < 0 ? 'white' : 'rgb(119, 152, 191)'
                }
              }, false);
            }
          }
          this.redraw();
        }
      }
    },
    'exporting': {
      'filename': 'Equal Area Projection',
      'sourceWidth': 600,
      'sourceHeight': 600,
      'buttons': {
        'contextButton': {
          'symbolStroke': '#7798BF',
          'align': 'right'
        }
      }
    },
    'title': {
      'text': 'Equal Area Projection (' + sample.name + ')'
    },
    'subtitle': {
      'text': '<b>' + information + '</b>'
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
        if(this.series.name == 'Directions') {
          return '<b> Demagnetization step: </b>' + this.point.step + '<br> <b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination </b>' + this.point.inc.toFixed(1)
        }
        return '<b>Name: </b> ' + this.point.name + '<br><b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination </b>' + this.point.inc.toFixed(1)
      }
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (Equal Area Projection)",
      'href': ''
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
          return this.value + '\u00B0';
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
        'dataLabels': {
          'color': 'grey',
          'style': {
            'fontSize': '10px'
          },
          'enabled': enableLabels,
          'formatter': function () {
             return this.point.step;
          }
        }
      }
    },
    'series': [{
      'name': 'Directions',
      'id': 'Directions',
      'type': 'scatter',
      'zIndex': 100,
      'data': dataSeries
    }, {
      'name': 'Directions',
      'enableMouseTracking': false,
      'marker': {
        'enabled': false
      },
      'linkedTo': 'Directions',
      'type': 'line', 
      'data': dataSeries		
    }],
  }

  var chart = new Highcharts.Chart(chartOptions);

  // Add all stickies
  if(globalSticky.length !== 0) {
    chart.addSeries({
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

/* 
 * FUNCTION setHoverRadius
 * Description: logic to handle increased radius size on the selected points
 * 			  : In the Highcharts series for a graph we only save points to be displayed and not all points including the ones that are hidden.
 * 			  : Therefore, We are required to count the number of hidden points and find the Highcharts index as a function of this.
 * Input: index of the point being hovered on
 * Output: VOID (updates Highcharts graphs)
 */
function setHoverRadius (index) {

  if(data.length === 0) return;

  // No index given, get the selected step
  if(index === undefined) {
    var index = getSelectedStep();
  }
	
  // Get specimen name and capture charts to use
  var sample = getSampleIndex();
	
  // Capture the three graphs in the main body
  var zijderveld = $("#zijderveldPlot").highcharts();
  var equalArea = $("#eqAreaDirections").highcharts();
  var intensity = $("#intensityPlot").highcharts();

  var lineColor = "rgb(119, 152, 191)";

  // Reset all data points in three graphs to default marker radius
  for(var i = 0; i < zijderveld.series[0].data.length; i++) {
		
    // Update zijderveld diagram series 2 and 3 (these are the markers; series 0 and 1 are the lines without markers)
    // the update method takes an argument false, meaning it will NOT redraw after the update (we do this manually at the end)
    zijderveld.series[2].data[i].update({'marker': {'radius': 2}}, false);
    zijderveld.series[3].data[i].update({'marker': {'radius': 2}}, false);
		
    // For the equal area projection we are required to account for the fillColor of the marker (either white (negative) or blue (positive))
    var color = equalArea.series[0].data[i].marker.fillColor;
    equalArea.series[0].data[i].update({'marker': {'radius': 4, 'lineWidth': 1, 'lineColor': lineColor, 'fillColor': color}}, false);
	
    intensity.series[0].data[i].update({'marker': {'radius': 4}}, false);

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
        zijderveld.series[2].data[index-skip].update({'marker': {'radius': 4}}, true);	
        zijderveld.series[3].data[index-skip].update({'marker': {'radius': 4}}, true);	
        var color = equalArea.series[0].data[i-skip].marker.fillColor;
        equalArea.series[0].data[index-skip].update({'marker': {'zIndex': 100, 'radius': 6, 'lineWidth': 1, 'lineColor': lineColor, 'fillColor': color}}, true);
        intensity.series[0].data[index-skip].update({'marker': {'radius': 6}}, true);
        return;
      }
    } else {
      skip++;
    }
  }		
	
  // Redraw charts at the end if not hovering over a visible index
  zijderveld.redraw();
  equalArea.redraw();	
  intensity.redraw();
	
}

/*
 * FUNCTION dlItem
 * Description: creates BLOB that can be downloaded
 * Input: string@string (usually .csv formatted) and extension@string (e.g. .csv, or .dir)
 * Output: VOID
 */
function dlItem ( string, extension ) {
	
  "use strict";
	
  // Check if supported
  downloadAttrSupported = document.createElement('a').download !== undefined;
	
  var blob = new Blob([string], {'type': 'data:text/csv;charset=utf-8'});
  var csvUrl = URL.createObjectURL(blob);
  var name = 'export';

  // Download attribute supported
  if (downloadAttrSupported) {
    var a = document.createElement('a');
    a.href = csvUrl;
    a.target      = '_blank';
    a.download    = name + '.' + extension;
    document.body.appendChild(a);
    a.click();
    a.remove();
  } else if (window.Blob && window.navigator.msSaveOrOpenBlob) {
    // Falls to msSaveOrOpenBlob if download attribute is not supported
    window.navigator.msSaveOrOpenBlob(blob, name + '.' + extension);
  } else {
    // Fall back to server side handling (Highcharts)
    Highcharts.post('http://www.highcharts.com/studies/csv-export/download.php', {
      data: string,
      type: 'txt',
      extension: extension
    });
  }
}

/* 
 * FUNCTION exporting
 * Description: handles exporting for custom Paleomagnetism.org .dir format
 * Input: NULL
 * Output: VOID (calls dlItem for downloading JSON formatted data object)
 */
function exporting() {

  "use strict";
	
  if(data === null) {
    notify('failure', 'There are no data for exporting.');
    return;
  }

  var downloadingData = data.map(function (x) {
    return $.extend({
      'version': version,
      'exported': new Date()
    }, x);
  })

  // Try to parse our data JSON object to a string and download it to a custom .dir file
  try {
    dlItem(JSON.stringify(downloadingData), 'dir');
  } catch (err) {
    notify('failure', 'A critical error has occured when exporting the data: ' + err);
  }

}

/*
 * FUNCTION getZijderveldCSV
 * Description: constructs CSV format for Zijderveld diagram
 * Input: self@object (Highcharts chart obj)
 * Output: returns formatted CSV string
 */
function getZijderveldCSV(self) {

  "use strict";
	
  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
		
  var row = ['Step', 'x', 'y', 'z'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
	
  for(var j = 0; j < self.series[0].data.length; j++) {
    row = [self.series[0].data[j].step, self.series[0].data[j].x, self.series[0].data[j].y, self.series[1].data[j].y];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
  }

  return csv;

}

function getEqualAreaProjectionCSV(self) {

  "use strict";

  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  var row = [ 'Step', 'Inclination', 'Declination' ];	
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
	
  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].step, self.series[0].data[i].x, self.series[0].data[i].inc];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
  }

  return csv;

}

/*
 * FUNCTION getZijderveldCSV
 * Description: constructs CSV format for hemisphere projection in interpretation tab
 * Input: self@object (Highcharts chart obj)
 * Output: returns formatted CSV string
 */
function getEqualAreaInterpretationCSV(self) {

  "use strict";
	
  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  csv += self.userOptions.chart.coordinates;
  csv += lineDelimiter + lineDelimiter;	
	
  var row = ['Specimen', 'Declination', 'Inclination', 'Type', 'Information'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].options.sample, self.series[0].data[i].x, self.series[0].data[i].options.inc, 'Direction', self.series[0].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }
	
  for(var i = 0; i < self.series[1].userOptions.poles.length; i++) {
    row = [self.series[0].data[i].options.sample, self.series[1].userOptions.poles[i].dec, self.series[1].userOptions.poles[i].inc, 'Negative Pole to Plane', self.series[0].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }
	
  csv += lineDelimiter;	 
	
  row = ['Mean Declination', 'Mean Inclination', '(Directions Only)'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
	
  row = [self.series[3].data[0].x, self.series[3].data[0].options.inc];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

  return csv;

}

function getIntensityCSV(self) {

  "use strict";
	
  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  var row = [ 'Step', 'Intensity', self.series[0].name ];	
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].category, self.series[0].data[i].y];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
  }
			
  return csv;

}

function getEqualAreaFittedCSV(self) {

  "use strict";
	
  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  csv += self.userOptions.chart.coordinates;
  csv += lineDelimiter + lineDelimiter;	
	
  var row = ['Specimen', 'Declination', 'Inclination', 'Type', 'Information'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
	
  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].options.sample, self.series[0].data[i].x, self.series[0].data[i].inc, 'Direction', self.series[0].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }	
	
  for(var i = 0; i < self.series[1].data.length; i++) {
    row = [self.series[1].data[i].options.sample, self.series[1].data[i].x, self.series[1].data[i].inc, 'Fitted Direction', self.series[1].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }	
	
  csv += lineDelimiter;	 
  row = ['Mean Declination', 'Mean Inclination', '(Great Circles Fitted)'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;

  row = [self.series[4].data[0].x, self.series[4].data[0].options.inc];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			
  return csv;

}

/* FUNCTION getCSV
 * Description: custom function to parse Highcharts data to csv format on exporting
 *            : has a custom function for each graph
 * Input: triggered by clicking export CSV -> passes chart ID
 * Output: CSV formatted variable that can be downloaded through dlItem routine
 */
(function (Highcharts) {

  downloadAttrSupported = document.createElement('a').download !== undefined;
		
  var itemDelimiter = '","';
  var lineDelimiter = '\n';

  //Add a prototype function
  Highcharts.Chart.prototype.getCSV = function () {

    var csv;
		 
    // Zijderveld Diagram
    if(this.userOptions.chart.id === 'Zijderveld') {
      var csv = getZijderveldCSV(this);
    } else if(this.userOptions.chart.id === 'eqAreaInterpretations') {
      var csv = getEqualAreaInterpretationCSV(this);
    } else if(this.userOptions.chart.id === 'eqAreaProjDir') {
      var csv = getEqualAreaProjectionCSV(this);
    } else if(this.userOptions.chart.id === 'intensity') {
      var csv = getIntensityCSV(this);
    } else if(this.userOptions.chart.id == 'eqAreaFitted') {
      var csv = getEqualAreaFittedCSV(this);
    } else {
      var csv = "";
    }
		 
    return csv;
		
  };  
	
}(Highcharts));

// Now we want to add "Download CSV" to the exporting menu.
// Code changed after https://github.com/highslide-software/export-csv
// Original Author: Torstein Honsi (Highcharts)
Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({
  'text': 'Download CSV file',
  'onclick': function () {
    //Parse and download the formatted CSV
    var csv = this.getCSV(); 
    dlItem(csv, 'csv');
  }
});

/*
 * FUNCTION exportInterpretation
 * Description: exports the interpretation to CSV file
 * Input: NULL
 * Output: VOID (calls dlItem to start download of formatted CSV)
 */
function exportInterpretation () {

  "use strict";
		
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

/*
 * Importing parser for Munich format
 * One sample per file, multiple files can be selected during importing
 */
function importMunich(applicationData, text) {
	
  "use strict"
	
  var lines = text.split(/[\n]/).filter(Boolean);
  var parsedData = new Array();

  for(var i = 0; i < lines.length; i++) {
			
    // Reduce empty lines
    var parameters = lines[i].split(/[,\s\t]+/);
    parameters = $.grep(parameters, function(n) { 
      return n;
    });
			
    // Get the header
    if(i === 0) {
      var name = parameters[0];
				
      // Check if sample with name exists -> append copy text
      for(var k = 0; k < applicationData.length; k++) {
        if(name === applicationData[k].name) {
          var skip = true;
        }
      }
				
      // Different convention for core orientation than Utrecht
      // Munich measures the hade angle
      var coreAzi = Number(parameters[1]);
      var coreDip = 90 - Number(parameters[2]);
				
      // Bedding strike needs to be decreased by 90 for input convention
      var bedStrike = parameters[3] - 90;
      var bedDip = parameters[4];
      var info = parameters[5];

    } else {

    // Get Cartesian coordinates for specimen coordinates (intensities in mA -> bring to μA)
    var cartesianCoordinates = cart(Number(parameters[3]), Number(parameters[4]), Number(parameters[1])*1e3);

      parsedData.push({
        'visible': true, 
        'include': false,
        'step': parameters[0],
        'x': cartesianCoordinates.x,
        'y': cartesianCoordinates.y,
        'z': cartesianCoordinates.z,
        'a95': parameters[4],
        'info': info
       });			
    }
  }

  if(skip) {
    notify('failure', 'Found duplicate ' + name + '; skipping specimen');
    return applicationData;
  }
	
  // Now format specimen meta-data, parameters such as bedding and core orientation go here as well as previously interpreted directions.
  applicationData.push({
    'added': new Date(),
    'format': "Munich",
    'strat': null,
    'patch': PATCH_NUMBER,
    'GEO': new Array(),
    'TECT': new Array(),
    'interpreted': false,
    'name': name,
    'coreAzi': Number(coreAzi),
    'coreDip': Number(coreDip),
    'bedStrike': Number(bedStrike),
    'bedDip': Number(bedDip),
    'data': parsedData
  });

  return applicationData;

}

/*
 * Importing parser for Utrecht format
 */
function importUtrecht(applicationData, text) {
	
  "use strict";
	
  // Split by 9999 on new line (which indicates end of specimen)
  // Fixed problem where script would split on every 9999 (also sample intensities)
  var blocks = text.split(/9999[\n\r]/);
  var nSpecimens = blocks.length - 1;
	
  // Loop over all data blocks and split by new lines
  for(var i = 0; i < nSpecimens; i++) {
		
    var parameters = blocks[i].split('\n');
		
    // First and final can be ignored
    parameters.pop();
    parameters.shift();
		
    // parsedData is the bucket that contains directional data
    var parsedData = new Array();
    var skip = false;
		
    for(var j = 0; j < parameters.length; j++) {
			
      // Split by commas and trim for leading/trailing spaces
      var parameterPoints = parameters[j].split(/[,]/); 
      for(var k = 0; k < parameterPoints.length; k++) {
        parameterPoints[k] = parameterPoints[k].trim();
      }

      // Get specimen name, core and bedding orientation from Utrecht format contained in first row of datablock (there j = 0)
      // Check if NaN (number("")) becomes NaN is field is empty -> simply set value to 0.
      if(j === 0) {
				
        // Error when not enough header items
        if(parameterPoints.length !== 7) {
          notify('failure', "Problem parsing header for specimen.");
          continue
        }

        // Remove quotes (for TH-demag, samples are written as ""SS1.1"". Not very nice.);	
        var name = parameterPoints[0].replace(/['"]+/g, ''); 
        var sampleVolume = Number(parameterPoints[4]) || 10.5;
				
        // Check if sample with name exists -> append copy text
        for(var k = 0; k < applicationData.length; k++) {
          if(name === applicationData[k].name) {
            var skip = true;
          }
        }						
				
        var stratLevel = parameterPoints[1].replace(/['"]+/g, '');
        var coreAzi = Number(parameterPoints[2]);
	
      } else {
			
        // Removes double spaced characters
        parameterPoints = $.grep(parameterPoints, function(n) { 
          return n
        });
				
        // Skip the step is x, y, z are all 0 (this gives problems because it is not a vector)
        if(Number(parameterPoints[1]) === 0 && Number(parameterPoints[2]) === 0 && Number(parameterPoints[3]) === 0) {
          continue;
        }
				
        // Push particular specimen to parsed data (UTRECHT format uses a, b, c coordinate system which is equal to our -y, z, -x)
        // See function cart for our reference frame
        // visible and include methods indicate whether particular step is shown in graphs or included for PCA.
        parsedData.push({
          'visible': true, 
          'include': false,
          'step': parameterPoints[0],
	  'x': Number(-parameterPoints[2]) / sampleVolume,
	  'y': Number(parameterPoints[3]) / sampleVolume,
	  'z': Number(-parameterPoints[1]) / sampleVolume,
	  'a95': parameterPoints[4],
	  'info': parameterPoints[5] + ' at ' + parameterPoints[6]
        });
      }
    }

    if(skip) {
      notify('failure', 'Found duplicate ' + name + '; skipping specimen');
      continue;
    }
		
    // Now format specimen meta-data, parameters such as bedding and core orientation go here as well as previously interpreted directions.
    applicationData.push({
      'added': new Date(),
      'format': "Utrecht",
      'strat': stratLevel || null,
      'patch': PATCH_NUMBER,
      'GEO': new Array(),
      'TECT': new Array(),
      'interpreted': false,
      'name': name,
      'coreAzi': Number(coreAzi),
      'coreDip': Number(coreDip),
      'bedStrike': Number(bedStrike),
      'bedDip': Number(bedDip),
      'data': parsedData
    })
  }

  return applicationData;
	
}

/* Function to patch data and recursively fix mistakes.
 * The application needs to be backwards compatible so we needs
 * to update data that is not compatible with recent versions ._.
 */
function patch () {
	
  if(!data || data.length === 0) return;

  var patched = false;
  for(var i = 0; i < data.length; i++) {
		
  // First Paleomagnetism.org Patch
  // Set patch attribute, group attribute
  // Reduce the intensities by 10.5 (this was hardcoded before)
  // Loop over all specimens
  if(data[i].patch === undefined) {
    patched = true;
    for(var j = 0; j < data[i].data.length; j++) {
      data[i].data[j].x = data[i].data[j].x/10.5;
      data[i].data[j].y = data[i].data[j].y/10.5;
      data[i].data[j].z = data[i].data[j].z/10.5;
    }
			
    // Reduce the center of mass of interpreted directions and circles
    for(var j = 0; j < data[i]['GEO'].length; j++) {
      data[i]['GEO'][j].group = "None";
      data[i]['GEO'][j].cm = data[i]['GEO'][j].cm.map(function(x) {
        return x/10.5;
      });
    }
    for(var j = 0; j < data[i]['TECT'].length; j++) {
      data[i]['TECT'][j].group = "None";
      data[i]['TECT'][j].cm = data[i]['TECT'][j].cm.map(function(x) {
        return x/10.5;
      });
    }
			
    // Set patch to 1.1. This is VERY important.
    // It helps to keep track of the compatibility chain
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

function importApplication(applicationData, text) {

  importedData = JSON.parse(text);

  for(var i = 0; i < importedData.length; i++) {

    var skip = false;
    for(var l = 0; l < applicationData.length; l++) {
      if(importedData[i].name === applicationData[l].name) {
        var skip = true;
      }
    }

    if(skip) {
      notify('failure', 'Found duplicate ' + importedData[i].name + '; skipping specimen');
      continue;
    }
    applicationData.push(importedData[i]);
  }

  return applicationData;

}

/*
 * Importing function for PaleoMac
 */
function importMac (applicationData, text) {
	
  var lines = text.split(/[\n\r]/);
  lines = $.grep(lines, function(n) { 
    return n;
  });

  var header = lines[0].split(/[,\s\t]+/);
  var sampleName = header[0];
	
  // Get header values
  // values will be [a, b, s, d, [v]]
  var parameters = lines[0].split('=');
  var values = new Array();
  for(var i = 1; i < parameters.length; i++) {
    var value = parameters[i].match(/[+-]?\d+(\.\d+)?/g);
    values.push(value);
  }

  // Get specimenVolume from file or default to 10cc
  var specimenVolume = 10 * Math.pow(10, Number(values[4][1])) || 10e-6;

  // core plunge is measured as hade, we use plunge (90 - hade)
  var coreAzi = Number(values[0]);	
  var coreDip = 90 - Number(values[1]);
  var bedStrike = Number(values[2]);
  var bedDip = Number(values[3]);

  var parsedData = new Array();
	
  // Skip first two and last line
  // Intensity is in A/m (V = 10e-6m3) so divide
  // Display in microamps (1e6)
  for(var i = 2; i < lines.length - 1; i++) {

    var parameters = lines[i].split(/[,\s\t]+/);

    if(Number(parameters[4]) === 0) continue;

    parsedData.push({
      'visible': true, 
      'include': false,
      'step': parameters[0],
      'x': 1e6 * Number(parameters[1]) / specimenVolume,
      'y': 1e6 * Number(parameters[2]) / specimenVolume,
      'z': 1e6 * Number(parameters[3]) / specimenVolume,
      'a95': Number(parameters[9]),
      'info': 'No Information'
    });	
  }

  applicationData.push({
    'added': new Date(),
    'format': "PaleoMac",
    'strat': null,
    'GEO': new Array(),
    'TECT': new Array(),
    'patch': PATCH_NUMBER,
    'interpreted': false,
    'name': sampleName,
    'coreAzi': coreAzi,
    'coreDip': coreDip,
    'bedStrike': bedStrike,
    'bedDip': bedDip,
    'data': parsedData
  });

  return applicationData;

}

/* IMPORTING / PARSING FUNCTIONS
 * Description: Parses the Utrecht format to the Paleomagnetism.org format (interpretation portal)
 * Input: event (internal), format (the format to be parsed)
 * Output: VOID (fills global data array)
 * Currently supported formats:
 * UTRECHT - Utrecht
 * APP - Application (standard)
 * SPINNER - 2G Magnetometer (broken)
 * DEFAULT - Simple default formatting (dec, inc, intensity - etc..)
 */
function importing (event, format) {
		
  $("#appBody").hide();
  $("#input").dialog( "close" );
	
  if(format === undefined) {
    var format = $("#importFormats").val();
  }
	
  // Not appending, reset data array
  var append = $('#appendFlag').prop('checked');
  if(!append) {
    data = new Array();
  }
	
  var initialSize = data.length; 

  // Filehandler API; handles the file importing
  var input = event.target;
  var reader = new FileReader();
  var index;
	
  // Multiple inputs, handle asynchronously
  (function readFile(index) {

    reader.readAsText(input.files[index]);
    reader.onload = function () {
			
      var text = reader.result;
	
      // Parsing formats refer to own functions
      // Contact us if you would like your custom format to be added
      // See the importUtrecht function as an example parser
      if(format === 'UTRECHT') {
        data = importUtrecht(data, text);
      } else if(format === 'APP') {;
        data = importApplication(data, text);
        patch();
      } else if(format === 'MUNICH') {
        data = importMunich(data, text);
      } else if(format === 'PALEOMAC') {
        data = importMac(data, text);
      }

      index++;
			
      if(index < input.files.length) {
        readFile(index);
      } else {

        refreshSpecimenScroller();		
        setStorage();
	notify('success', 'Importing was succesful; added ' + (data.length - initialSize) + ' samples');
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
var refreshSpecimenScroller = function () {

  var scroller = $("#specimens");
	
  scroller.find('option').remove().end();
  for(var i = 0; i < data.length; i++) {
    var name = data[i].name;
    scroller.append("<option custom=\"" + i + "\" value=\"" + name + "\">" + name + "</option>");
  }
	
  scroller.multiselect('refresh');

}

var clearStorage = function () {

  if(confirm("Are you sure you wish to delete this instance and reset the application? This will also delete all saved interpretations.")){
    if(localStorage) {
      localStorage.removeItem('InterPortal');
      localStorage.removeItem('savedInt');
    }
    location.reload();
  }

}

var setStorage = function() {

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

var plotInterpretationsGraph = function ( dataBucket, nCircles, container, title, coordinates ) {

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
	  plotDataCircle = plotDataCircle.concat(k.one);
	  plotDataCircle.push({x: null, y: null});
	  plotDataCircle2 = plotDataCircle2.concat(k.two);
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
    'data': ellipse.two,
    'marker': {
      'enabled': false
    }
  }, {
    'linkedTo': 'confidence',
    'type': 'line',
    'color': 'red',
    'enableMouseTracking': false,
    'data': ellipse.one,
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
