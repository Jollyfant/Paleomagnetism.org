/* PALEOMAGNETISM.ORG INTERPRETATION PORTAL
 * 
 * VERSION: ALPHA.1507
 * LAST UPDATED: 7/22/2015
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

//APPLICATION CODE START
//Define some global variables to be used
var li, liSelected;
var globalSticky = new Array();
var exportData = new Array();

/* FUNCTION getSampleIndex
 * Description: gets sample name from specimen scroller and returns it
 * Input: NULL
 * Output: sample name@string
 */
function getSampleIndex() {

	//Get specimen name from scoller
	//Return the index@integer of the specimen
	var name = $("#specimens").val(); 
	if(name != null) {
		return parseInt($('#specimens option[value="' + name + '"]').attr('custom'));
	}
}

//Fire on DOM ready
$(function() {
	
	//Click function to add sticky direction to equal area projections
	$("#addSticky").click( function () {
		var input = prompt("Please enter name, declination, inclination seperated by a comma.");
		if(input != null) {
			var inputSplit = input.split(/[,]+/); //Split by commas

			//Need three parameters, otherwise quit
			if(inputSplit.length != 3) {
				notify('failure', 'Could not add sticky direction.');
				return;
			}
			
			//Get name, declination, and inclination from user prompt
			var name = inputSplit[0];
			var declination = Number(inputSplit[1]);
			var inclination = Number(inputSplit[2]);
			
			//Push to global sticky array
			globalSticky.push({
				'name': name, 
				'x': declination, 
				'y': eqArea(inclination), 
				'inc': inclination
			});
			
			notify('success', 'Sticky direction has been added.');
			
			//Get specimen
			var sample = getSampleIndex();
			//Redraw equal area projection
			if(data != null || data.length !== 0) {
				return;
			}
			
			eqAreaFoldLeft(data[sample]);
			setHoverRadius($(liSelected).index()-1, liSelected); //Set hover after redraw
		}
	});
	
	//Clear all stickies and empty array
	$("#removeSticky").click( function () {
		notify('success', 'Stickies have been removed.');
		globalSticky = [];
	});
	
	//Tabs initialization and functions
    $('#tabs').tabs({
		activate: function(event, ui) {
			if(data != undefined) {
				if(ui.newPanel.selector == '#fittingTab') {
					$("#eqAreaFitted").hide();
					plotInterpretations();
				}
			}
		}
    });
	
	//Button definitions for jQuery UI
	$("#saveInterpretation").button();
	$("#clrInterpretation").button();
	$("#fitCircles").button();
	$( "#right" ).button();
	$( "#left" ).button();
	$( "#customHelp" ).button({
		icons: {
			primary: "ui-icon-help",
		},
		text: false
	}).click( function() {
		$( "#customHelpDialog" ).dialog({
			draggable: false,
			resizable: false,
			width: 600,
		});
	});
	
	$("#exportApplication").button({
		icons: { primary: "ui-icon-arrowthickstop-1-s"}
	});
	$("#exportInterpretation").button({
		icons: { primary: "ui-icon-arrowthickstop-1-s"}
	});
	$("#importApplication").button({
		icons: { primary: "ui-icon-arrowthickstop-1-n"}
	});
	$("#importUtrecht").button({
		icons: { primary: "ui-icon-arrowthickstop-1-n"}
	});
	$("#clearStorage").button({
		icons: { primary: "ui-icon-trash"}
	});
	$("#addSticky").button({
		icons: {
			primary: 'ui-icon-pin-s'
		}
	});
	$("#removeSticky").button({
		icons: {
			primary: 'ui-icon-close'
		}
	});
	$("button:not(.ui-multiselect)").button()
		.bind('mouseup', function() {
        $(this).blur();   
	});
	$( "#coordinates" ).buttonset();
	
	$("#coordinates").change( function () {
		plotInterpretations();
		$("#saveInterpretation").text('Save Interpreted Directions');
		$("#eqAreaFitted").hide();
	});
	
	//Fix for blurring tab after click (interferes with arrow key movement)
    $('#tabs a').click(function () {
        $(this).blur(); //Deselect tab
    })
	
	/* KEYBOARD HANDLER FOR PALEOMAGNETISM.ORG
	 */
	$(document).keydown(function(e) {
	
		//Do nothing if no data is loaded
		if(data === null || data === 'undefined' || data.length === 0) {
			return;
		}
		
		//Use arrow keys to skip through specimens or demagnetization stepss
		switch(e.which) {
			case 37: // left
			case 65: // a
				e.preventDefault();
				$("#left").click();
			break;
			case 39: // right
			case 68: // d
				e.preventDefault();
				$("#right").click();
			break;
			case 56: //F8
			case 104: //Number 8
				e.preventDefault();
				$("#tcViewFlag").prop("checked", !$("#tcViewFlag").prop("checked")).change(); //Toggle the tilt correction view flag
			break;
			
			case 55:
				e.preventDefault();
				$("#specFlag").prop("checked", !$("#specFlag").prop("checked")).change(); //Toggle the flag
			break;
			
			case 51: //F3
			case 99: //Numpad 3
				e.preventDefault();
				$("#nFlag").prop("checked", !$("#nFlag").prop("checked")).change(); //Toggle the projection flag (Up/North <-> Up/West)
			break;
		}
	});
	
	/* KEYBOARD HANDLER FOR PALEOMAGNETISM.ORG
	 */
	$(document).keydown(function(e) {
	
		if(data === null || data === undefined || data.length === 0) {
			return;
		}
		
		//There is a problem if li is undefined
		if(li === undefined) {
			return;
		}
			
		var index = $(liSelected).index()-1;
		var sample = getSampleIndex();
		/* LEGACY CODE WHEN BUGS (NOT REQUIRED ANYMORE.. KEEP IT JUST TO BE SAFE)
		if(index == -2) {
			index = 1;
			liSelected = li.first().addClass('selected');
			if(e.which == 122) {
				e.preventDefault();
				data[sample].data[index-1].include = true;
			}	
		}
		*/
		
		switch(e.which) {
			case 38: // up
			case 87: // w
				e.preventDefault();
				if(liSelected){
					liSelected.removeClass('selected'); //Remove selected class from this point
					next = liSelected.prev(); //Get next (previous) point)
					if(index+1 != 1){ //Check if we are at the top of the list, if so go to the end
						liSelected = next.addClass('selected'); 
					} else {
						liSelected = li.last().addClass('selected');
					}
				} else {
					liSelected = li.last().addClass('selected');
				}
			break;
	
			case 40: // down
			case 83: // down
				e.preventDefault();
				if(liSelected){
					liSelected.removeClass('selected');
					next = liSelected.next();
					if(index+1 != li.length){
						liSelected = next.addClass('selected');
					} else {
						liSelected = li.first().addClass('selected');
					}
				} else {
					liSelected = li.first().addClass('selected');
				}
			break;
			
			//Z button (and -)
			case 90:
			case 173:
			case 109:
				e.preventDefault();
				if(!$(liSelected).hasClass('show')) {
					liSelected.addClass('show');
					$(liSelected).text('···');
					data[sample].data[index].visible = false; //Display
				} else {
					var kper = $(liSelected).attr('value');
					liSelected.removeClass('show');
					$(liSelected).text(kper);
					data[sample].data[index].visible = true; //Display
				}
				if($(liSelected).hasClass('use')) {
					liSelected.removeClass('use');
					data[sample].data[index].include = false; //use
					//data[sample].interpreted = false;
				}
				liSelected.removeClass('selected');
				next = liSelected.next();
				if(index+1 != li.length){
					liSelected = next.addClass('selected');
				} else {
					liSelected = li.eq(0).addClass('selected');
				}
				
				zijderveld(data[sample]);
				intensity(data[sample]);
				eqAreaFoldLeft(data[sample]);
				drawStuff( sample );
				
			break;
			
			//X button (and +)
			case 88:
			case 107:
			case 61:
				e.preventDefault();
				if(!$(liSelected).hasClass('use')) {
					if(!$(liSelected).hasClass('show')) {
						liSelected.addClass('use').append('*');
						data[sample].data[index].include = true; //Use
					}
				} else {
					liSelected.removeClass('use');
					var kper = $(liSelected).attr('value');
					$(liSelected).text(kper);
					data[sample].data[index].include = false; //Use
				}
				liSelected.removeClass('selected');
				next = liSelected.next();
				if(index+1 != li.length){
					liSelected = next.addClass('selected');
				} else {
					liSelected = li.eq(0).addClass('selected');
				}
			break;
			
			//When an interpretation is made we have four options: (line + great circle) x ( anchor + no anchor )
			//Furthermore, we do and save the interpretation in Geographic and Tectonic coordinates
			case 49:
			case 97:
				e.preventDefault();
				$("#anchor").prop("checked", false); //Anchor to false
				$("#tcFlag").prop("checked", false); //First do interpretation in Geographic
				$("#PCA").click();					//Interpretation
				$("#tcFlag").prop("checked", true); //Go to tectonic coordinates
				$("#PCA").click();					//Interpretation
			break;
			case 50:
			case 98:
				e.preventDefault();
				$("#anchor").prop("checked", true);	//With anchor
				$("#tcFlag").prop("checked", false);
				$("#PCA").click();
				$("#tcFlag").prop("checked", true);
				$("#PCA").click();
			break;			
			case 57:
			case 105:
				e.preventDefault();
				$("#tcFlag").prop("checked", false);
				$("#anchor").prop("checked", false);
				$("#PCAGC").click(); //do PCA GC
				$("#tcFlag").prop("checked", true);
				$("#PCAGC").click(); //do PCA GC
			break;
			case 48:
			case 96:
				e.preventDefault();
				$("#tcFlag").prop("checked", false);
				$("#anchor").prop("checked", true);
				$("#PCAGC").click(); //Do PCA great circle
				$("#tcFlag").prop("checked", true);
				$("#PCAGC").click(); //Do PCA great circle
			break;		
			
			default: return; // Exit this handler for other keys
			
		}
		
		//After pressing a key set the hover radius for the selected point
		setHoverRadius($(liSelected).index()-1, liSelected);
		setStorage();
		
	});
	
	//Call procedure to fit circles to directions
	$("#fitCircles").click( function () {
		fitCirclesToDirections();
		$("#saveInterpretation").text('Save Interpreted Directions and fitted Great Circles');
	});
	
	$("#saveInterpretation").click( function () {
	
		if(!localStorage) {
			notify('failure', 'localStorage is not supported. Cannot add interpretations to localStorage.');			
			return;
		}
		
		var coordType = $("#coordinates input[type='radio']:checked").val();
		var saveObj = localStorage.getItem('savedInt');
		
		//Previously saved, get the save and 
		if(saveObj != null) {
			var parsedObj = JSON.parse(saveObj);
		} else {
			var parsedObj = new Array();
		}

		//Has not been fitted
		if(exportData.length == 0) {
			var type = 'directions';
			for(var i = 0; i < data.length; i++) {
				if(data[i].interpreted) {
					//Loop over all interpreted components
					for(var j = 0; j < data[i][coordType].length; j++) {
						if(data[i][coordType][j].type == 'dir') {
							exportData.push({
								'dec': data[i][coordType][j].dec,
								'inc': data[i][coordType][j].inc,
								'bedStrike': data[i].bedStrike,
								'bedDip': data[i].bedDip,
								'sample': data[i].name
							});
						}
					}
				}
			}
		} else {
			var type = 'great circles';
		}
		
		var name = prompt('Please enter a name below:');
		
		if(name == "") {
			notify('failure', 'Cannot add site, site name is empty.');
			return;
		}
		
		if(name == null) {
			return;
		}
		
		for(var i = 0; i < parsedObj.length; i++) {
			if(name == parsedObj[i].name) {
				notify('failure', 'A site with this name already exists.');
				return;
			}
		}
		
		parsedObj.push({
			'name': name, 
			'data': exportData, 
			'type': type,
			'coordType': coordType
		});

		localStorage.setItem('savedInt', JSON.stringify(parsedObj));
		notify('success', 'Site ' + name + ' has been added to interpreted directions (' + type + ', ' + coordType + ')');	
		
		exportData = new Array();
		
	});
	
	//Button handler for left-handed scrolling through specimens
	$("#left").click( function () {
		if(data != null) {
			var name = $('#specimens option:selected').prev().val(); //Get name of previous and check if not undefined (means we are at start)
			if(name != undefined) {
				$('#specimens option:selected').prop('selected', false).prev().prop('selected', true); //Toggle current off and toggle previous on
			} else {
				$("#specimens")[0].selectedIndex = $('#specimens option').length-1; //Go to the end
			}
			$("#specimens").multiselect('refresh');	//Update the box
			
			showData(getSampleIndex());	
			
			liSelected = li.first().addClass('selected');
			setHoverRadius(0, liSelected);
		}
	});
	
	//Button handler for right-handed scrolling through specimens
	$("#right").click( function () {
		if(data != null) {
			var name = $('#specimens option:selected').next().val();
			if(name != undefined) {
				$('#specimens option:selected').prop('selected', false).next().prop('selected', true);
			} else {
				$("#specimens")[0].selectedIndex = 0
			}
			$("#specimens").multiselect('refresh');	//Update the box
			
			showData(getSampleIndex());	
	
			liSelected = li.first().addClass('selected');
			setHoverRadius(0, liSelected);
		}
	});
	
	/* CHANGE EVENT: tilt correction flag/projection flag/label flag
	 * Description: We need to redraw the charts in the proper projection and coordinate reference frame after a change is made
	 */
	$("#tcViewFlag, #nFlag, #labelFlag, #specFlag").change( function () {
		if(data != null) {

			var sample = getSampleIndex();
			if(sample === undefined) {
				return;
			}
			
			//Redraw Zijderveld and eqArea projection
			zijderveld(data[sample]);
			eqAreaFoldLeft(data[sample]);
			
			//Set hover on selected point
			var index = $(liSelected).index()-1;
			setHoverRadius(index, liSelected);
			
			//Call drawstuff routine that puts interpreted components on the charts
			drawStuff(sample);
		}
	});

	//Definition for specimen scroller
	$('#specimens').multiselect({	
		minHeight: 100,
		noneSelectedText: 'Select a site',
		multiple: false,
		selectedList: 1,
		close: function () {
		
			var sample = getSampleIndex();
			if(sample != null) {
				showData(sample); //Call function to build application
				liSelected = li.first().addClass('selected'); //Upon selecting a new specimen, set the first step selected
				setHoverRadius(0, liSelected); //Manually trigger hover on point 0 (start)
			}
		}
	});
	
	//PRINICPLE COMPONENT ANALYSIS FUNCTIONS
	//PCA (line) and PCAGC (great circle)
	$('#PCA, #PCAGC').click( function (event) {
	
		var spec = $('#specFlag').prop('checked');
		if(spec) {
			if(tcFlag) {
				notify('failure', 'Cannot do interpretation in specimen coordinates');
			}
			return;
		}
	
		//Check if tc flag or anchor flag is checked
		var tcFlag = $('#tcFlag').prop('checked');
		var anchor = $('#anchor').prop('checked');
		var includeOrigin = $("#originFlag").prop('checked');
		
		var coordType = tcFlag ? 'TECT' : 'GEO';
		
		var typeFit = event.target.id; //Type is GC or DIR
		
		//Capture specimen in samples variable
		var sample = getSampleIndex();
		var samples = data[sample];
	
		//Draw the charts
		zijderveld(data[sample]);
		eqAreaFoldLeft(data[sample]);
		
		var fdata = [];
		var X = [];
		var cm = [0, 0, 0]; //Vector for center of mass

		//Data bucket
		var dete = [];
		var steps = [];
		
		//Loop over all data points and push to data bucket (if anchored, mirror all points)
		for(var i = 0; i < samples.data.length; i++) {
			if(samples.data[i].include) {
				dete.push([samples.data[i].x, samples.data[i].y, samples.data[i].z]);
				steps.push(samples.data[i].step);
				if(anchor) {
					dete.push([-samples.data[i].x, -samples.data[i].y, -samples.data[i].z]);	//If anchored, mirror data points (this breaks the MAD calculation)
				}
			}
		}
		
		//Wish to include the origin, use this flag
		if(!anchor) {
			if(includeOrigin) {
				dete.push([0, 0, 0]);
			}
		} else {
			includeOrigin = false;
		}
		
		//For specimen get core parameters 
		var cBed = samples.coreAzi;
		var cDip = samples.coreDip;
		var Nrec = dete.length;
		var bedStrike = samples.bedStrike;
		var bedDip = samples.bedDip;
		
		//Return if user has < 2 data points disabled
		if(Nrec < 2) {
			if(tcFlag) {
				notify('failure', 'A minimum of two points are required. Select points by pressing +.');
				drawStuff( sample );
			}
			return;
		}	
		
		//Loop over all points
		for( var i = 0; i < Nrec; i++) {

			//Rotate specimen to geographic coordinates
			//If we are including the origin (not forcing) we use a point 0, 0, 0 which has no vector, so give 0, 0, 0 for dec, inc, R
			if(dete[i][0] === 0 && dete[i][1] === 0 && dete[i][2] === 0) {
				var rotated1 = {'dec': 0, 'inc': 0 , 'R': 0}
			} else {
				var rotated1 = rotateGeo(cBed, cDip-90, dete[i]);
			}
			
			//if tc is selected, rotate to tectonic coordinates
			if(tcFlag) {
				var rotated = rotateTect(bedStrike+90, bedDip+90, [rotated1.dec, rotated1.inc, 0, 0, 0]);
				var dataD = [rotated[0], rotated[1], rotated1.R];
			} else {
				var dataD = [rotated1.dec, rotated1.inc, rotated1.R];
			}
			
			var coords = cart(dataD[0], dataD[1], dataD[2]);
			fdata.push(dataD);
			X.push([coords.x, coords.y, coords.z]); //Rotated Cartesian coordinates
			
		}
		
		/* Preparation for orientation matrix A.3.5, Lisa Tauxe book */
		//Calculate the coordinates of the “center of mass” (x) of the data points: 
		for(var i = 0; i < X.length; i++) {
			for( var j = 0; j < 3; j++) {
				cm[j] += X[i][j]/Nrec
			}
		}
		var ker = new dir(cm[0], cm[1], cm[2]);
		
		//Transform the origin of the data cluster to the center of mass:
		for(var i = 0; i < X.length; i++) {
			for( var j = 0; j < 3; j++) {
				X[i][j] = X[i][j] - cm[j];		
			}
		}
		
		//Prepare k array of x, y, z coordinates for orientation matrix
		//TMatrix subroutine takes this as input.
		var k = [];
		for(var i = 0; i < X.length; i++) {
			k.push({x: X[i][0], y: X[i][1], z: X[i][2]});
		}
		
		//Get principle components from TMatrix
		var eig = numeric.eig(TMatrix(k)); 

		//Eigenvalues to unit length
		tr = 0;
		for(var i = 0; i < 3; i++) {
			tr += eig.lambda.x[i];
		}
		for(var i =0; i < 3; i++) {
			eig.lambda.x[i] = eig.lambda.x[i]/tr;
		}

		//Sort eigenvectors/eigenvalues
		var eig = sortEig(eig);

		//Collect first, second, and third eigenvalue [t1, t2, t3]
		var tau = eig.tau;

		//Eigenvectors
		var v1 = eig.v1;
		var v2 = eig.v2;
		var v3 = eig.v3;

		//Determine which side is positive/negative
		//First and last data point
		var P1 = cart(fdata[0][0], fdata[0][1], fdata[0][2]);
		var P2 = cart(fdata[Nrec-1][0], fdata[Nrec-1][1], fdata[Nrec-1][2]);
		
		var dot = 0;
		P1x = [P1.x, P1.y, P1.z];
		P2x = [P2.x, P2.y, P2.z];
		
		var specimenVolume = 10.5; //cc
		
		//The intensity is arbitrary taken as the intensity between the bounding points
		var intensity = Math.sqrt(Math.pow(P1x[0]-P2x[0], 2) + Math.pow(P1x[1]-P2x[1], 2) + Math.pow(P1x[2]-P2x[2], 2))/specimenVolume;
	
		//Get right direction along principle component
		//Flip direction if dot product is negative between vector and control (begin - end)
		//This means the principle eigenvector is anti-parallel to the control; flip eigenvector	
		var control = [0, 0, 0];
		for(var i = 0; i < 3; i++) {
			control[i] = (P1x[i] - P2x[i]);
		}

		//Take the dot product
		for(var i = 0; i < 3; i++) {
			dot += v1[i]*control[i];
		}

		//Floating point precision fix.
		if(dot < -1) {
			dot = -1;
		} else if(dot > 1) {
			dot = 1;
		}
		

		if(dot <= 0) {
			for(var i = 0; i < 3; i++) {
				v1[i] = -v1[i];
			}
		}
	
		//This is where we split the PCA for lines and great circles
		//For lines, we use the maximum eigenvalue
		//For planes, we use the minimum eigenvalue (that is perpendicular to the plane defined by tau1 and tau2)
		if(typeFit == 'PCA') {
		
			//Calculation of maximum angle of deviation
			var s1 = Math.sqrt(tau[0]);
			var MAD = Math.atan(Math.sqrt(tau[1]+tau[2])/s1)/rad;
			var setType = 'dir';
			
			//Get the dec/inc of the maximum eigenvector stored in v1
			var wat = new dir(v1[0], v1[1], v1[2]);
			
			//Write found principle component to specimen meta-data
			samples.interpreted = true;
			
			if(isNaN(MAD)) {
				MAD = 0;
			}
			
			//Construct data object with relevant data
			var dataObj = {
				dec: wat.dec,
				inc: wat.inc,
				MAD: MAD,
				cm: cm,
				intensity: intensity,
				type: setType,
				forced: anchor,
				remark: '',
				origin: includeOrigin,
				nSteps: steps.length,
				minStep: steps[0],
				maxStep: steps[steps.length-1],
				steps: steps,
			};
			
			//Check if component already exists
			var sanitized = true;
			for(var i = 0; i < samples[coordType].length; i++) {
				if(JSON.stringify(dataObj) === JSON.stringify(samples[coordType][i])) {
					if(tcFlag) {	
						notify('failure', 'This direction has already been interpreted.');
					}
					var sanitized = false;
				}
			}
			
			if(sanitized) {
				samples[coordType].push(dataObj);
			}
			
		//For great circles we find direction of tau3 (which serves as the pole to the plane spanned by tau1, tau2)	
		} else if ( typeFit == 'PCAGC') {
		
			//Minimum eigenvector (direction of tau3);
			var wat = new dir(v3[0], v3[1], v3[2]);
			
			//Calculation of MAD
			var s1 = Math.sqrt((tau[2] / tau[1]) + (tau[2] / tau[0]));
			var MAD = Math.atan(s1)/rad;
			var setType = 'GC';
			
			//Per definition we use the negative pole of the plane
			if(wat.inc > 0) {
				wat.dec = (wat.dec+180)%360;
				wat.inc = -wat.inc;
			}
			
			if(isNaN(MAD)) {
				MAD = 0;
			}
			
			//Write meta-data
			samples.interpreted = true;
			samples[coordType].push({
				dec: wat.dec,
				inc: wat.inc,
				MAD: MAD,
				cm: cm,
				intensity: intensity,
				type: setType,
				origin: includeOrigin,
				forced: anchor,
				remark: '',
				nSteps: steps.length,
				minStep: steps[0],
				maxStep: steps[steps.length-1],
				steps: steps,
			});
			
			//Draw great circle, MAD ellipse, and tau3 principle comp.

		}

		if(tcFlag) {
			drawStuff( sample );
		}
		
	});

	
	$("#clrInterpretation").click( function () {

		//Capture specimen in samples variable
		var sample = getSampleIndex();
		var samples = data[sample];
		
		samples.interpreted = false;
		samples['TECT'] = new Array();
		samples['GEO'] = new Array();
		
		//Draw the charts
		zijderveld(data[sample]);
		eqAreaFoldLeft(data[sample]);
		$('.ui-multiselect').css('color', 'rgb(191, 119, 152)'); //Not interpreted: red and big red box "NOT INTERPRETED"
		$("#update").html('<div style="width: 300px; margin: 0 auto; text-align: center; border: 1px solid red; background-color: rgba(255,0,0,0.1"><h2> Not interpreted </h2></div>');
		
		$("#clrIntBox").hide();
		
		setHoverRadius($(liSelected).index()-1, liSelected);	
		
		setStorage();
		
	});
	
	//Initialize the application
	initialize();
	
});

function initialize() {

	//Get data from the local storage
	if(localStorage) {
		data = JSON.parse(localStorage.getItem('InterPortal'));
	} else {
		notify('failure', 'localStorage is not supported. Please save your data manually.');
		data = null;
	}
	
	if(data != null) {
		var nSamples = data.length;
		
		//Remove all previous options from the specimen scroller
		$('#specimens').find('option').remove().end();
	
		//Add new specimens to the specimen scroller
		for(var i = 0; i < data.length; i++) {
			var name = data[i].name;
			$('#specimens').append("<option custom=\"" + i + "\" value=\"" + name + "\">" + name + "</option>");
		}
		
		//Notify user and refresh specimen scroller to force update
		notify('success', 'Importing was succesful. Added ' + nSamples + ' new specimens.')		
		$('#specimens').multiselect('refresh');
	} else {
		data = [];
		notify('success', 'Welcome to the Paleomagnetism.org interpretation portal!');
		setTimeout(function(){ 
			notify('success', 'Before starting, please import some data in the advanced options tab.');
			$("#ui-id-3").animate({"color": "white", "background-color": "rgb(191, 119, 152)"}, 2000);
			$("#ui-id-3").animate({"color": "#7798BF", "background-color": "white"}, 2000);
		 }, 3000);
	}
}

/* FUNCTION fitCirclesToDirections
 * Description: applies the iterative fitting function after McFadden and McElhinny on fitting great circles to set point directions
 * Input: NONE
 * Output: VOID (stores information in exportData global for exporting)
 */
function fitCirclesToDirections() {

	exportData = [];
	
	//Get coordinate reference frame; fitting great circles must be done in tectonic coordinates and geographic coordinates seperated
	var coordType = $("#coordinates input[type='radio']:checked").val();
	if(coordType == 'GEO') {
		var coordinateNice = 'Geographic Coordinates';
	} else if(coordType == 'TECT') {
		var coordinateNice = 'Tectonic Coordinates';
	}
	
	var fitData = [];
	var pointsSet = [];
	var isSet = false;

	//Loop over all interpreted components
	for(var i = 0; i < data.length; i++) {
		if(data[i].interpreted) {
		
			//Get declination/inclination and sample name
			for(var j = 0; j < data[i][coordType].length; j++) {
				var dec = data[i][coordType][j].dec;
				var inc = data[i][coordType][j].inc;
				var sample = data[i].name;
				
				//Now check if it is a direction or a great circle and sort them to respective arrays
				//@pointsSet for directions and @fitData for great circles
				if(data[i][coordType][j].type == 'dir') {
					exportData.push({
						'dec': dec, 
						'inc': inc,
						'sample': sample
					});
					
					//Check if negative, then put fillColor to white
					if(inc < 0) {
						color = 'white';
					} else {
						color = 'rgb(119, 152, 191)';
					}
					
					row = [sample, 0, dec, inc, 's'];
					isSet = true;
					
					//Highcharts data array for plotting set points
					pointsSet.push({
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
				} else if(data[i][coordType][j].type == 'GC') {
					row = [sample, 0, dec, inc, 0];	//Format used by the fitting function function that fits great circles to set points	
				}
				fitData.push(row);
			}
		}
	}

	//No set points, ask user for a guess to fit circles on;
	//This helps the procedure to know which intersection of great circles to use (180 degrees apart)
	if(!isSet) {
		var getSuggestion = prompt('No set points, give a suggestion for directional fit (dec, inc).');
		if(getSuggestion != null) {
			var getSuggestion = getSuggestion.split(/[,\s\t]+/); //Split by commas
			if(getSuggestion.length != 2) {
				notify('failure', 'Unexpected input, please give declination and inclination seperated by a comma');
				return;
			}
			
			//Get declination and inclination from user
			var declination = Number(getSuggestion[0]);
			var inclination = Number(getSuggestion[1]);
			
			fitData.push(['FORCED', 0, declination, inclination, 'a']);
		}
		notify('failure', 'Adding your suggestion has failed. Breaking fitting procedure.');
		return;
	}

	//Cartesian coordinate sums
	var xSum = 0;
	var ySum = 0;
	var zSum = 0;
	
	var xCircle = [];
	var yCircle = [];
	var zCircle = [];
	var sampleCircle = [];
	
	var xSp = [];
	var ySp = [];
	var zSp = [];
	
	//Number of set points and great circles
	var nPoints = 0;
	var nCircles = 0;
	
	//Loop over data and sort great circles from set points
	for(var i = 0; i < fitData.length; i++) {
		if(fitData[i][4] == 'a') { //Anchorpoint
			var v = cart(fitData[i][2], fitData[i][3]); //Dec and Inc pair to Cartesian coordinates
			var v1 = v.x;
			var v2 = v.y;
			var v3 = v.z;
		}
		else if(fitData[i][4] == 's') { //Setpoint
			nPoints++ //Increment
			var sp = cart(fitData[i][2], fitData[i][3]); //Dec and Inc pair to Cartesian coordinates
			
			xSp.push(sp.x);
			ySp.push(sp.y);
			zSp.push(sp.z);
			
			//Add to sums for Fisher mean
			xSum += sp.x;
			ySum += sp.y;
			zSum += sp.z;
			
		} else if(fitData[i][4] == 0) { //Great circle
			nCircles++;
			var circle = cart(fitData[i][2], fitData[i][3]); //Dec and Inc pair to Cartesian coordinates

			xCircle.push(circle.x);
			yCircle.push(circle.y);
			zCircle.push(circle.z);
			sampleCircle.push(fitData[i][0]);
			
		} else {
			notify('failure', 'Unfamiliar type');
		}
	}

	//At least one set point
	if(nPoints > 0) {
		var R = Math.sqrt(xSum*xSum + ySum*ySum + zSum*zSum);
		var v1 = xSum / R;
		var v2 = ySum / R;
		var v3 = zSum / R;
	}
	
	var u1 = xSum;
	var u2 = ySum;
	var u3 = zSum;
	
	var uX = [];
	var uY = [];
	var uZ = [];
	
	for(var i = 0; i < nCircles; i++) {
		var u = vClose(xCircle[i], yCircle[i], zCircle[i], v1, v2, v3);
		
		u1 += u.x;
		u2 += u.y;
		u3 += u.z;
		
		uX.push(u.x);
		uY.push(u.y);
		uZ.push(u.z);
	}

	//Iterate to determine best agreement
	var nIterations = 0;
	var maxAngle = 1;

	while(maxAngle > 0.1) {
		var angle = [];
		nIterations++;
		for( var i = 0; i < nCircles; i++) {
			u1 = u1 - uX[i];
			u2 = u2 - uY[i];
			u3 = u3 - uZ[i];
			
			R = Math.sqrt(u1*u1 + u2*u2 + u3*u3);
			v1 = u1 / R;
			v2 = u2 / R;
			v3 = u3 / R;
			
			var doubled = vClose(xCircle[i], yCircle[i], zCircle[i], v1, v2, v3);

			//Dot product to find new angle
			var iterationAngle = doubled.x * uX[i] + doubled.y * uY[i] + doubled.z * uZ[i];
			if(iterationAngle > 1) {
				iterationAngle = 1; //Floating point numbers
			}
			angle.push(Math.acos(iterationAngle)/rad);
			
			uX[i] = doubled.x;
			uY[i] = doubled.y;
			uZ[i] = doubled.z;
			u1 += doubled.x;
			u2 += doubled.y;
			u3 += doubled.z;
		}
		
		maxAngle = angle[0];	

		for(var i = 1; i < nCircles; i++) {
			if(angle[i] > maxAngle) {
				maxAngle = angle[i];
			}
		}
	}
	
	u1 = xSum;
	u2 = ySum;
	u3 = zSum;

	for(var i = 0; i < nCircles; i++) {
		u1 += uX[i];
		u2 += uY[i];
		u3 += uZ[i];
	}
	
	R = Math.sqrt(u1*u1 + u2*u2 + u3*u3);
	u1 = u1 / R;
	u2 = u2 / R;
	u3 = u3 / R;
	
	var newMean = new dir(u1, u2, u3); //Calculate the newly found mean vector after fittingTable
	
	var circleDeclinations = [];
	var circleInclination = [];
	var pointsCircle = [];

	//Loop over all great circles and get fitted directions (uX, uY, uZ)
	for(var i = 0; i < nCircles; i++) {
	
		var direction = new dir(uX[i], uY[i], uZ[i]);
		var sample = sampleCircle[i];
		exportData.push({
			'dec': direction.dec, 
			'inc': direction.inc,
			'sample': sample
		});
		
		if(direction.inc < 0) {
			color = 'white';
		} else {
			color = 'rgb(191, 119, 152)';
		}

		//Data array for points fitted on great circle
		pointsCircle.push({
			'x': direction.dec, 
			'sample': sample,
			'y': eqArea(direction.inc), 
			'inc': direction.inc,
			'marker': {
				'fillColor' : color,
				'lineColor' : 'rgb(191, 119, 152)',
				'lineWidth' : 1,
			}
		});
	}

	//Get plane data for great circles themselves
	var greatCircleDataPos = [];	
	var greatCircleDataNeg = [];	
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
	var nPrime = nPoints + nCircles/2;

	//Don't go below 1.1
	if(nPrime < 1.1) {
		nPrime = 1.1 
	}
	
	//Other Fisher parameters (McFadden & McElhinny)
	var k = (2*nPoints + nCircles - 2)/(2*(nPoints + nCircles - R));
	var a95 = ((nPrime - 1)/k) * (Math.pow(20, (1/(nPrime - 1))) - 1);
	var am95 = Math.acos(1 - a95/R)/rad;
	var t95 = Math.acos(1 - a95)/rad
	
	//Standard Fisher parameters (k, a95);
	var k = (nTotal - 1) / (nTotal - R);
	var a95 = Math.acos(1 - ((nTotal - R)/R) * (Math.pow(20, (1/(nTotal - 1))) - 1))/rad;

	//Get confidence envelope data around newMean with a95, t95
	var ellipse = getPlaneData({'dec': newMean.dec, 'inc': newMean.inc}, 'MAD', a95);
	var ellipse2 = getPlaneData({'dec': newMean.dec, 'inc': newMean.inc}, 'MAD', t95);

	//Get color for mean direction (if neg make white)
	if(newMean.inc < 0) {
		var color = 'white'
	} else {
		var color = 'rgb(119, 191, 152)'
	}
	
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
		data: [{sample: 'Direction Mean', x: newMean.dec, y: eqArea(newMean.inc), inc: newMean.inc}],
		color: 'rgb(119, 191, 152)',
		marker: {
			symbol: 'circle',
			radius: 6,
			fillColor: color,
			lineColor: 'rgb(119, 191, 152)',
			lineWidth: 1
		}
	}, {
		name: 'Confidence',
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
		name: 'Confidence T',
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
	$("#fitCirclesDivText").html('<b>Great circles have been fitted in ' + nIterations + ' iterations.</b>');
	
	$("#fittingTable").html('<table class="sample" id="fittingTableInfo"><tr><th> Number of Directions </th> <th> Number of Great Circles </th> <th>Mean Declination </th> <th>Mean Inclination </th> <th> k </th> <th> a95 </th> <th> am95 </th> <th> t95 </th> </tr>');
	$("#fittingTableInfo").append('<tr> <td> ' + nPoints + ' </td> <td> ' + nCircles + '<td> ' + newMean.dec.toFixed(1) + ' </td> <td> ' + newMean.inc.toFixed(1) + ' </td> <td> ' + k.toFixed(1) + '</td> <td> ' + a95.toFixed(1) + '</td> <td> ' + am95.toFixed(1) + ' </td> <td> ' + t95.toFixed(1) + ' </td> </tr> </table>');
	$("#fittingTable").show();

}

/* 
 * FUNCTION vClose
 * Description Calculates point (x, y, z) on great circle (xCircle, yCircle, zCircle) closest to vector V (v1, v2, v3)
 * Input: Cartesian Coordinates of pole to great circle and vector V
 * Output: Cartesian Coordinates of point closest to vector V
 */
function vClose (xCircle, yCircle, zCircle, v1, v2, v3) {

	var lambda = v1 * xCircle + v2 * yCircle + v3 * zCircle;
	var beta = Math.sqrt(1 - lambda*lambda);
	
	return {
		'x': ((v1 - lambda * xCircle) / beta),
		'y': ((v2 - lambda * yCircle) / beta),
		'z': ((v3 - lambda * zCircle) / beta),
	}
}

/* FUNCTION getPlaneData
 * Description: calculates discrete plane and ellipse points for plotting
 * Input: dirIn (direction around point to plot), type (GC [plane] or MAD [ellipse]), MAD
 * Output: Two series with discrete points (positive/negative)
 */
function getPlaneData ( dirIn, type, MAD, signInc ) {

	var mDec = dirIn.dec
	var mInc = dirIn.inc
	
	if(signInc != undefined) {
		if(signInc < 0) {
			mDec += 180;
		}
	}
	
	var mySeries = [];
	var mySeries2 = [];
	
	var incSign = (Math.abs(mInc)/mInc); // 1 or -1 depending on inclination polarity
	
	if(mInc == 0) {
		incSign = 1;
	}
		
	//Axis one (mean direction)
	var xDec = mDec
	var xInc = mInc
	
	//Axis two (add or substract 90 degrees to the inclination)
	var yDec = mDec
	var yInc = (mInc-(incSign*90))

	//Axis three (add 90 degrees to the declination)
	var zDec = (mDec+90)
	var zInc = 0
			
	var nPoints = 501;
	
	var iPoint = ((nPoints-1)/2);
	
	R = [[0,0,0],[0,0,0],[0,0,0]];

	/*
 	 * Cartesian coordinates and construct rotation matrix Rij 
 	 */
	var X = cart(xDec, xInc); //new z-coordinate
	
	if(X.z < 0) {
		X.x = -X.x
		X.y = -X.y
		X.z = -X.z
	}

	R[0][0]=X.x;
	R[1][0]=X.y;
	R[2][0]=X.z;

	var Y = cart(yDec,yInc); //new y-coordinate

	if(Y.z < 0) {
		Y.x = -Y.x
		Y.y = -Y.y
		Y.z = -Y.z
	}
	
	R[0][1]=Y.x;
	R[1][1]=Y.y;
	R[2][1]=Y.z;
	
	var Z = cart(zDec, zInc); //new x-coordinate

	 if(Z.z < 0) {
		Z.x = -Z.x
		Z.y = -Z.y
		Z.z = -Z.z
	}
	
	R[0][2]=Z.x;
	R[1][2]=Z.y;
	R[2][2]=Z.z;

	// column vector v containing coordinates of the ellipse before rotation in world coordinates
 	// psi is incremented along a circle from 0 to 2pi in n points with radius defined by a95
	// the resulting vector contains the ellipse position in local coordinates.
	// X is mapped on R-coordinates of v

	v = [0,0,0];
	var doOnce = true;
	var doOnce2 = true;
	
	for(i=0; i<nPoints; i++){

		psi = ((i)*Math.PI/iPoint);
		
		if(type == 'GC') {
			v[1] = Math.cos(psi);
			v[2] = Math.sin(psi);
			v[0] = 0 //resulting coordinate on unit-sphere for great circle is always 0 (before rotation)
		} else if (type == 'MAD') {
			v[1] = Math.sin(MAD*rad)*Math.cos(psi);
			v[2] = Math.sin(MAD*rad)*Math.sin(psi);
			v[0] = Math.sqrt( 1 - Math.pow(v[1],2) - Math.pow(v[2],2) ); //resulting coordinate on unit-sphere.
		}

 		// Matrix multiplication V'j = RjiVi (sum i);	
		eli = [0,0,0];
		for(var j=0;j<3;j++){
			for(var k=0;k<3;k++){ 
				eli[j]=eli[j] + R[j][k]*v[k];
			}
		}

		// Convert Cartesian coordinates of ellipse back to declination/inclination.
		var coords = new dir(eli[0], eli[1], eli[2]);
		
		if(incSign < 0) {
			coords.dec = (coords.dec+180)%360;
		}
		
		if(eli[2] < 0) {
			if(type == 'MAD') {
				coords.dec = (coords.dec+180)%360;
			}
			if(doOnce) {
				mySeries2.push({x: null, y: null});
				doOnce = !doOnce;
			}
			mySeries.push({x: coords.dec, y: eqArea(coords.inc), inc: coords.inc});
		} else {
			if(doOnce2) {
				mySeries.push({x: null, y: null});
				doOnce2 = !doOnce2;
			}
			mySeries2.push({x: coords.dec, y: eqArea(coords.inc), inc: coords.inc});
		}	

	}
	mySeries.push(null);
	mySeries2.push(null);
	
	return {one: mySeries, two: mySeries2};
}

/* FUNCTION showData
 * Description: handles creation of list for scrolling and plotting
 * Input: sample index
 * Output: VOID (creates list and plots)
 */ 
function showData( sample ) {
	
	li = $("#stepWalk li") //Global
	li.first().addClass('selected'); //Select first point
	
	if(data == null || data.length == 0) {
		return;
	}
	
	//Add steps to list
	$('#stepWalk').html('<h2>Steps</h2>');
	for(var i = 0; i < data[sample].data.length; i++) {
		var step = data[sample].data[i].step;
		$('#stepWalk').append('<li value="' + step + '">' + step + '</li>'); //Append a list item for each step
	}
	
	//Close list
	$('#stepWalk').append('<br>'); 
	li = $("#stepWalk li") //Global
	li.first().addClass('selected'); //Select first point
	
	//Loop over all steps and check for visible/include methods
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
	
	var tcFlag = $('#tcViewFlag').prop('checked');
	
	if(tcFlag) {
		var coordType = 'TECT';
	} else {
		var coordType = 'GEO';
	}
	
	//Draw the charts
	zijderveld(data[sample]);
	intensity(data[sample]);
	eqAreaFoldLeft(data[sample]);

	//Check if the sample has been previously interpreted
	if(data[sample].interpreted) {
		$('.ui-multiselect').css('color', 'rgb(119, 191, 152)'); //Set specimen scroller color to green
		if(data[sample][coordType][0].type == 'dir') {
			drawStuff( sample, 'dir' ) //Draw directions
		} else {
			drawStuff ( sample, 'GC' )	//Draw a plane
		}
	} else {
		$('.ui-multiselect').css('color', 'rgb(191, 119, 152)'); //Not interpreted: red and big red box "NOT INTERPRETED"
		$("#update").html('<div style="width: 300px; margin: 0 auto; text-align: center; border: 1px solid red; background-color: rgba(255,0,0,0.1"><h2> Not interpreted </h2></div>');
		$("#clrIntBox").hide();
	}
	
	//Show the main body containing all graphs
	$("#appBody").show();
}

/* FUNCTION drawStuff
 * Description: draws a plane in eqArea projection
 * Input: sample index (specimen)
 * Output: VOID (Adds series to existing chart)
 */
var drawStuff = function ( sample ) {
	
	var spec = $('#specFlag').prop('checked');
	if(spec) {
		return;
	}
	
	var tcFlag = $('#tcViewFlag').prop('checked');
	var nFlag = $('#nFlag').prop('checked');
	
	if(tcFlag) {
		var coordType = 'TECT';
		var coordinates = 'Tectonic';
	} else {
		var coordType = 'GEO';
		var coordinates = 'Geographic';
	}
	
	if(data[sample].interpreted) {	
	
		//Update parameter table
		$("#update").html('<p> <table class="sample" id="infoTable"><tr><th> Component </th> <th> Type </th> <th> Declination </th> <th> Inclination </th> <th> Intensity (A/m) </th> <th> MAD </th> <th> Coordinates </th> <th> Remark </th> <th> Remove </th> </tr>');
		
		//Loop over all interpretations in a particular coordinate reference frame
		for(var i = 0; i < data[sample][coordType].length; i++) {
		
			//Get remark, if none put default message
			var remark = data[sample][coordType][i].remark;
			if(remark == '') {
				remark = 'Click to Change';
			}
			
			//Get the centre of mass
			var cm = data[sample][coordType][i].cm;
			
			//Bedding strike and dip
			var bStrike = data[sample].bedStrike;
			var bDip = data[sample].bedDip;
			
			//Declination and Inclination or prinicple component (can be either t1 or t3)
			var PCADirection = {
				dec: data[sample][coordType][i].dec, 
				inc: data[sample][coordType][i].inc
			};
			
			var MAD = data[sample][coordType][i].MAD;
			var intensity = data[sample][coordType][i].intensity;
			
			//Transform center of mass to proper projection.
			//Don't do this if anchored (direction of of {0, 0, 0} is NaN)
			if(nFlag) {
				var v1 = cart(PCADirection.dec-90, PCADirection.inc);
				if(!data[sample][coordType][i].forced) {
					var temp = new dir(cm[0], cm[1], cm[2]);
					var temp2 = cart(temp.dec-90, temp.inc, temp.R);
					var cm = [temp2.x, temp2.y, temp2.z];
				}
			} else {
				var v1 = cart(PCADirection.dec, PCADirection.inc);	
			}
			
			var noteType = data[sample][coordType][i].type;
			var type = data[sample][coordType][i].type;
			
			if(data[sample][coordType][i].forced) {
				noteType += ' (forced)';
			}

			if(data[sample][coordType][i].origin) {
				noteType += ' (origin)';
			}
			
			//Draw a line
			//Center of mass + and - scaled principle component. Not very pretty but works!
			if(type == 'dir') {
			
				var scaling = intensity*100; //Scale by intensity
				
				var lineFit = [[cm[0]+v1.x*scaling, -cm[1]-v1.y*scaling], [cm[0]-v1.x*scaling, -cm[1]+v1.y*scaling]];
				$("#zijderveldPlot").highcharts().addSeries({
					name: 'Declination (PCA) #' + (i+1),
					data: lineFit,
					enableMouseTracking: false,
					lineWidth: 1,
					color: 'green',
					marker: {
						enabled : false
					}
				});
				
				var lineFit = [[cm[0]+v1.x*scaling, -cm[2]-v1.z*scaling], [cm[0]-v1.x*scaling, -cm[2]+v1.z*scaling]];
				$("#zijderveldPlot").highcharts().addSeries({
					name: 'Inclination (PCA) #' + (i+1),
					data: lineFit,
					lineWidth: 1,
					enableMouseTracking: false,
					color: 'red',
					marker: {
						enabled : false
					}
				});
	
				var fillColor = 'rgb(191, 119, 152)';
				if(PCADirection.inc < 0) {
					fillColor = 'white';
				}
				
				$("#eqAreaDirections").highcharts().addSeries({
					name: 'Linear Fit #' + (i+1),
					data: [{x: PCADirection.dec, y: eqArea(PCADirection.inc), inc: PCADirection.inc, name: 'Linear Fit #' + (i+1)}],
					type: 'scatter',
					zIndex: 100,
					marker: {
						symbol: 'circle',
						lineColor: 'rgb(191, 119, 152)',
						lineWidth: 1,
						fillColor: fillColor
					},
				});
				
			} else if(type == 'GC') {
				var planeFit = getPlaneData(PCADirection, 'GC');
				$("#eqAreaDirections").highcharts().addSeries({
					lineWidth: 1,
					id: 'plane',
					dashStyle: 'ShortDash',
					enableMouseTracking: false,
					color: 'red',
					marker: {
						enabled: false
					},
					type: 'line', 
					name: 'Planar Fit #' + (i+1), 
					data: planeFit.one
				});
				
				$("#eqAreaDirections").highcharts().addSeries({
					lineWidth: 1,
					linkedTo: ':previous',
					enableMouseTracking: false,
					color: 'red',
					marker: {
						enabled: false
					},
					type: 'line', 
					name: 'Planar Fit', 
					data: planeFit.two
				});
			
				var planeData = getPlaneData(PCADirection, 'MAD', MAD);	
				$("#eqAreaDirections").highcharts().addSeries({
					lineWidth: 1,
					id: 'MAD',
					dashStyle: 'ShortDash',
					enableMouseTracking: false,
					color: 'red',
					marker: {
						enabled: false
					},
					type: 'line', 
					name: 'MAD Angle #' + (i+1), 
					data: planeData.one
				});
				$("#eqAreaDirections").highcharts().addSeries({
					lineWidth: 1,
					linkedTo: ':previous',
					dashStyle: 'ShortDash',
					enableMouseTracking: false,
					lineColor: 'red',
					type: 'line', 
					name: 'MAD Angle', 
					data: planeData.two,
					marker: {
						enabled: false
					},
				});
			
				$("#eqAreaDirections").highcharts().addSeries({
					name: '\u03C4' + '3 #' + (i+1),
					type: 'scatter',
					marker: {
						symbol: 'circle',
						lineColor: 'red',
						lineWidth: 1,
						fillColor: 'white'
					},
					data: [{
						x: PCADirection.dec, 
						y: eqArea(PCADirection.inc),
						inc: PCADirection.inc,
						name: '\u03C4' + '3 #' + (i+1),
					}]
				});
			
			}
			$("#infoTable").append('<tr> <td> Component #' + (i+1) + '</td> <td> ' + noteType + '<td> ' + PCADirection.dec.toFixed(1) + ' </td> <td> ' + PCADirection.inc.toFixed(1) + ' </td> <td> ' + intensity.toFixed(1) + '</td> <td> ' + MAD.toFixed(1) + '</td> <td> ' + coordinates + ' </td> <td> <a comp="' + (i+1) + '" onClick="changeRemark(event)">' + remark + '</a> </td> <td> <b><a style="color: rgb(191, 119, 152); cursor: pointer; border-bottom: 1px solid rgb(191, 119, 152);" comp="' + (i+1) + '" id="del'+(i+1)+'" onClick="removeComp(event)">Delete</a></b> </td> </tr>');
			$("#clrIntBox").show();
		}
		
	$("#update").append('</table>');
	$("#update").append('<small><b>Note: </b> the MAD is not reliable for forced directions. For great circles, the specified direction is the pole to the requested plane.</small>');
	
	} else {
		$('.ui-multiselect').css('color', 'rgb(191, 119, 152)'); //Not interpreted: red and big red box "NOT INTERPRETED"
		$("#update").html('<div style="width: 300px; margin: 0 auto; text-align: center; border: 1px solid red; background-color: rgba(255,0,0,0.1"><h2> Not interpreted </h2></div>');
		$("#clrIntBox").hide();
	}


}

/* FUNCTION removeComp
 * Description: removes interpreted component from memory
 * Input: button press event (tracks which component is pressed)
 * Output: VOID
 */
var removeComp = function (event) {
	
	//Get the index of the component (passed through comp attribute of button)
	var index = $(event.target).attr("comp");
	
	//Capture specimen in samples variable
	var sample = getSampleIndex();
	var samples = data[sample];
	
	//Remove component from saves in both tectonic and geographic coordinates
	var removed = samples['GEO'].splice(index-1, 1);
	var removed = samples['TECT'].splice(index-1, 1);

	//Redraw charts and components
	zijderveld(data[sample]);
	eqAreaFoldLeft(data[sample]);
	drawStuff(sample);

	setHoverRadius($(liSelected).index()-1, liSelected); //Set hover
	
	//Check if no data and display NOT INTERPRETED sign
	if(samples['GEO'].length === 0 || samples['TECT'].length === 0) {
		samples.interpreted = false;
		$('.ui-multiselect').css('color', 'rgb(191, 119, 152)'); //Not interpreted: red and big red box "NOT INTERPRETED"
		$("#update").html('<div style="width: 300px; margin: 0 auto; text-align: center; border: 1px solid red; background-color: rgba(255,0,0,0.1"><h2> Not interpreted </h2></div>');	
		$("#clrIntBox").hide();
	}
	
	//Save session
	setStorage();
	
}

/* FUNCTION changeRemark
 * Description: changes note for particular interpreted component
 * Input: button press event (tracks which component is pressed)
 * Output: VOID
 */
var changeRemark = function (event) {

	var index = event.target.getAttribute('comp');
	
	//Capture specimen in samples variable
	var sample = getSampleIndex();
	var samples = data[sample];
		
	var text = prompt("Please enter a note below.");
	
	//Don't change note is cancel is pressed.
	if(text === null) {
		return;
	}
	
	if(text != "") {
		event.target.innerHTML = text;
		samples['GEO'][index-1].remark = text;
		samples['TECT'][index-1].remark = text;
	} else {
		event.target.innerHTML = 'Click to Change';
		samples['GEO'][index-1].remark = '';
		samples['TECT'][index-1].remark = '';
	}
	
	//Save session
	setStorage();
	
}
/* FUNCTION rotateGeo
 * Description: rotates specimens to geographic coordinates 
 * Input: azimuth, plunge, data (x, y, z)
 * Output: dec, inc, R of rotated vector
 */
var rotateGeo = function(azi, pl, data){
	
	//Convert to radians
	var azi = azi*rad;
	var pl = pl*rad;

	//Vector with x, y, z coordinates
	var k = [
		data[0], 
		data[1], 
		data[2]
	];

	//Rotation matrix for drilling correction
	//Lisa Tauxe, A.13
	var R = [
		[Math.cos(pl)*Math.cos(azi), -Math.sin(azi), -Math.sin(pl)*Math.cos(azi)],
		[Math.cos(pl)*Math.sin(azi), Math.cos(azi), -Math.sin(pl)*Math.sin(azi)],
		[Math.sin(pl), 0, Math.cos(pl)]
	];

	//Empty v vector to catch rotated directions
	var v = [0, 0, 0];
			
	//Do matrix vector multiplication		
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			v[i] += R[i][j]*k[j];
		}
	}
	
	return new dir(v[0], v[1], v[2]);
}

var rotateTect = function(str, he, data){

	var dec = data[0];
	var inc = data[1];
	
	//This function rotates vectors in the data block where str/he is the dec/inc for a vector that will face up
	//We take the declination of the mean VGP and rotate all CCW vectors by this angle.
	//Then we correct for the inclination by applying a rotation matrix.
	//Lastly, we rotate back over the same declination angle.
	//Alternatively, we could apply a single rotation about an "arbitrary" axis, but this method is easier to follow!
	//See Lisa Tauxe, book: Sections: 9.3 + A.13

	var theta = (str)*rad; //angle with North is equal to the declination of the mean vector.
	var phi = (90-he)*rad; //phi ranges between 0 (up) and 180 (down).

	//Rotate all directions so the mean VGP faces north.
	//We can simply substract the angle with North from all directions because the inclination will not change.
	var coords = cart(dec-str, inc);

	//Now we wish to tilt the mean VGP to an inclination of 90. Now we cannot simply add this angle to all directions, because besides the inclinations, the declinations changes too.
	//Therefore, we construct a rotation matrix and rotate around the yAxis with angle phi (90 - mInc);
	var R = [[0,0,0],[0,0,0],[0,0,0]];

	//Construct Rotation Matrix (A.13)
	R[0][0]=Math.cos(phi)
	R[1][0]=0
	R[2][0]=Math.sin(phi)

	R[0][1]=0
	R[1][1]=1
	R[2][1]=0

	R[0][2]=-Math.sin(phi)
	R[1][2]=0
	R[2][2]=Math.cos(phi)

	//Directions to Cartesian coordinates
	var v = [coords.x, coords.y , coords.z]	

		//v' (v_prime) becomes the coordinate vector after rotation.
		var vP = [0,0,0];
		for(var j=0;j<3;j++){
			for(var k=0;k<3;k++){ 
      			vP[j]=vP[j] + R[j][k]*v[k]; //V'j = Rjk*Vk (sum over k);
			}
		}

	//Find new direction from the rotated Cartesian coordinates.
	var temp = new dir(vP[0],vP[1],vP[2]);

	//Similarily to the first step, as the final step we rotate the directions back to their initial declinations. Keep declination within bounds.
	temp.dec = (temp.dec + str)%360;
	
	return [temp.dec, temp.inc, data[2], data[3], data[4]];
}

/* FUNCTION zijderveld
 * Description: handles graphing for zijderveld plot
 * Input: samples (sample[sampleIndex])
 * Output: VOID (plots zijderveld graph)
 */
function zijderveld ( samples ) {

	var nFlag = $('#nFlag').prop('checked');
	var tcFlag = $('#tcViewFlag').prop('checked');
	var enableLabels = $('#labelFlag').prop('checked');
	
	//Data buckets for inclination/declination lines
	var decDat = [];
	var incDat = [];
	
	//Specimen metadata (core and bedding orientations)
	var cBed = samples.coreAzi;
	var cDip = samples.coreDip;
	var bStrike = samples.bedStrike;
	var bDip = samples.bedDip;
	
	//Parameters to scale axes (min, max)
	var xs = [];
	var yz = [];
	maxz = 0;
	maxx = 0;
	var information = '(Geographic)';
	
	//For all steps
	for(var i = 0; i < samples.data.length; i++) {
		if(samples.data[i].visible) {
		
			var spec = $('#specFlag').prop('checked');
			if(!spec) {
				//Rotate to geographic coordinates
				var rotated1 = rotateGeo(cBed, cDip-90, [samples.data[i].x, samples.data[i].y, samples.data[i].z]);
				
				//Also rotated to tectonic coordinates
				if(tcFlag) {
					var information = '(Tectonic)';
					var rotated = rotateTect(bStrike+90, bDip+90, [rotated1.dec, rotated1.inc, 0, 0, 0]);
					if(nFlag) {
						var carts = new cart(rotated[0]-90, rotated[1], rotated1.R);
						var subtitle = 'Up/North'	
					} else {
						var carts = new cart(rotated[0], rotated[1], rotated1.R);		
						var subtitle = 'Up/West'					
					}
				} else {
					if(nFlag) {
						var carts = new cart(rotated1.dec-90, rotated1.inc, rotated1.R);
						var subtitle = 'Up/North'	
					} else {
						var carts = new cart(rotated1.dec, rotated1.inc, rotated1.R);	
						var subtitle = 'Up/West'					
					}
				}
			} else {
				var information = '(Specimen)';
				var direc = dir(samples.data[i].x, samples.data[i].y, samples.data[i].z);
				if(nFlag) {
					var carts = new cart(direc.dec-90, direc.inc, direc.R);
					var subtitle = 'Up/North'	
				} else {
					var carts = new cart(direc.dec, direc.inc, direc.R);	
					var subtitle = 'Up/West'					
				}
			}

			//Declination is x, -y plane
			//Inclination is x, -z plane
			decDat.push({x: carts.x, y: -carts.y, step: samples.data[i].step});
			incDat.push({x: carts.x, y: -carts.z, step: samples.data[i].step});
			
			xs.push(carts.x);
			yz.push(carts.y, carts.z);
			
			//Check max
			if(Math.abs(carts.x) > maxx) {
				maxx = Math.abs(carts.x);
			}
			if(Math.abs(carts.z) > maxz) {
				maxz = Math.abs(carts.z);
			}
			if(Math.abs(carts.y) > maxz) {
				maxz = Math.abs(carts.y);
			}
		}
	}

   var chartOptions = {
		chart: {
			animation: false,
			zoomType: 'xy',
			id: 'Zijderveld',
			renderTo: 'zijderveldPlot',
			events: {			//Work around to resize markers on exporting from radius 2 (tiny preview) to 4 (normalized)
                load: function () {
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
		title: {
			text: 'Zijderveld Diagram (' + samples.name + ')'
		},
		tooltip: {
			formatter: function () {
				if(this.series.name == 'Declination') {
					return '<b>Demagnetization Step: </b>' + this.point.step + '<br> <b>x-coordinate: </b>' + this.x.toFixed(1) + '<br> <b>y-coordinate: </b>' + this.y.toFixed(1);
				} else if ( this.series.name == 'Inclination') {
					return '<b>Demagnetization Step: </b>' + this.point.step + '<br> <b>x-coordinate: </b>' + this.x.toFixed(1) + '<br> <b>z-coordinate </b>' + this.y.toFixed(1);
				}
			}
		},
		subtitle: {
			text: '<b>' + information + '</b><br>' + subtitle
		},
        xAxis: {
            gridLineWidth: 0,
            lineColor: 'black',
            crossing: 0,
			min: -maxx,
			tickWidth: 0,
			max: maxx,
            opposite: true,
			title: {
                enabled: false
            },
			labels: {
				enabled: false
			}
        },
        yAxis: {
			min: -maxz,
			max: maxz,
		    gridLineWidth: 0,
			lineWidth: 1,
			minRange: 10,
            lineColor: 'black',
            crossing: 0,
            title: {
                enabled: false
            },
			labels: {
				enabled: false
			}
        },
		plotOptions: {
			series: {
				animation: false,
				dataLabels: {
					color: 'grey',
                    enabled: enableLabels,
					style: {
						fontSize: '10px'
					},
					formatter: function () {
						return this.point.step;
					}
				},
			},
			line: {
				lineWidth: 1,
			}
		},
		credits: {
			enabled: true,
			text: "Paleomagnetism.org (Zijderveld Diagram)",
			href: ''
		},
        series: [{ //Declination Series
			type: 'line',
			linkedTo: 'Declination',
			name: 'Declination', 
			enableMouseTracking: false,
			data: decDat,
			color: 'rgb(119, 152, 191)',
			marker: {
				enabled: false
			}
		},{	//Inclination Series
			name: 'Inclination',
			type: 'line',
			linkedTo: 'Inclination',
			enableMouseTracking: false,
			data: incDat,
			color: 'rgb(119, 152, 191)',
			marker: {
				enabled: false
			}
		},{ //Declination Series
			type: 'scatter',
			id: 'Declination',
			name: 'Declination', 
			data: decDat,
			color: 'rgb(119, 152, 191)',
			marker: {
				lineWidth: 1,
				symbol: 'circle',
				radius: 2,
				lineColor: 'rgb(119, 152, 191)',
				fillColor: 'rgb(119, 152, 191)'
			}
		},{	//Inclination Series
			type: 'scatter',
			id: 'Inclination',
			name: 'Inclination',
			data: incDat,
			color: 'rgb(119, 152, 191)',
			marker: {
				symbol: 'circle',
				lineWidth: 1,
				radius: 2,
				lineColor: 'rgb(119, 152, 191)',
				fillColor: 'white'
			}
		}]
    
    }
	new Highcharts.Chart(chartOptions); //Call Highcharts constructor
}

/* FUNCTION intensity
 * Description: handles graphic for intensity plot
 * Input: sample index
 * Output: VOID (plots Intensity)
 */
function intensity ( samples ) {

	var dataBucket = [];
	var cBed = samples.coreAzi;
	var cDip = samples.coreDip;
	var categories = [];
	var specimenVolume = 10.5; //cc
	
	for(var i = 0; i < samples.data.length; i++) {
		if(samples.data[i].visible) {
			var R = Math.sqrt(samples.data[i].x*samples.data[i].x + samples.data[i].y*samples.data[i].y+samples.data[i].z*samples.data[i].z);
			var step = Number(samples.data[i].step);
			categories.push(samples.data[i].step);
			dataBucket.push(R/specimenVolume);		
		}
	}
	
	var chartOptions = {
		chart: {
			animation: false,
		    renderTo: 'intensityPlot', //Container that the chart is rendered to.
			id: 'intensity',
			events: {
                load: function () {
                    if (this.options.chart.forExport) {
					for(var i = 0; i < this.series[0].data.length; i++) {
							this.series[0].data[i].update({marker: {radius: 4}}, false);
						}
					}
					this.redraw();
                 }
			}
		},
		title: {
			text: 'Intensity Diagram (' + samples.name + ')'
		},
        yAxis: {
	        title: {
                text: 'Intensity (A/m)'
            },		
        },
		tooltip: {
			formatter: function () {
				return '<b>Demagnetization Step: </b>' + this.x + '<br> <b>Intensity </b>' + this.y.toFixed(1)
			}
		},
        xAxis: {
			categories: categories,
            title: {
                text: 'Demagnetization steps'
            },
        },
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
		credits: {
			enabled: true,
			text: "Paleomagnetism.org (Intensity Diagram)",
			href: ''
		},
		plotOptions: {
			line: {
				marker: {
					lineWidth: 1,
					symbol: 'circle',
					lineColor: 'rgb(119, 152, 191)',
					fillColor: 'white'
				}
			}
		},
		   plotOptions: { series : {
            animation: false,
			}
       	 },
        series: [{
            name: samples.name,
            data: dataBucket
        }]
    }
	new Highcharts.Chart(chartOptions);
}

/* FUNCTION eqAreaFoldLeft
 * Description: Handles plotting for equal area projection
 * Input: sample index
 * Output: VOID (plots chart)
 */
function eqAreaFoldLeft ( samples ) {
	
	var dataBucket = [];
	var cBed = samples.coreAzi;
	var cDip = samples.coreDip;
	var bStrike = samples.bedStrike;
	var bDip = samples.bedDip;
	var enableLabels = $('#labelFlag').prop('checked');
	var tcFlag = $('#tcViewFlag').prop('checked');
	
	var information = '(Geographic)';
	var spec = $('#specFlag').prop('checked');
			
	for(var i = 0; i < samples.data.length; i++) {
		if(samples.data[i].visible) {
		
			if(!spec) {
				var rotated = rotateGeo(cBed, cDip-90, [samples.data[i].x, samples.data[i].y, samples.data[i].z]);
				if(tcFlag) {
					var rotated = rotateTect(bStrike+90, bDip+90, [rotated.dec, rotated.inc, 0, 0, 0]);
					rotated.dec = rotated[0];
					rotated.inc = rotated[1];
					var information = '(Tectonic)';
				}
			} else {
				var rotated = dir(samples.data[i].x, samples.data[i].y, samples.data[i].z);
				var information = '(Specimen)';
			}
			
			if(rotated.inc < 0) {
				var color = 'white'
			} else {
				var color = 'rgb(119, 152, 191)'
			}

			dataBucket.push({marker: { fillColor: color, lineWidth: 1, lineColor: 'rgb(119, 152, 191)' }, x: rotated.dec, y: eqArea(rotated.inc), inc: rotated.inc, step: samples.data[i].step});
		}
	}
	
	dataBucket.push({x: null, y: null});
	
	var chartOptions = {
		chart: {
			backgroundColor: 'rgba(255, 255, 255, 0)',
			id: 'eqAreaProjDir',
			polar: true,
			animation: false,
        	renderTo: 'eqAreaDirections', //Container that the chart is rendered to.
			events: {			//Work around to resize markers on exporting from radius 2 (tiny preview) to 4 (normalized) Fixes [#0011]
                load: function () {
                    if (this.options.chart.forExport) {
					for(var i = 0; i < this.series[0].data.length; i++) {
						if(this.series[0].data[i].inc < 0) {
							var color = 'white';
						} else {
							var color = 'rgb(119, 152, 191)';
						}
						this.series[0].data[i].update({marker: {radius: 4, lineWidth: 1, lineColor: 'rgb(119, 152, 191)', fillColor: color}}, false);
						}
					}
					 this.redraw();
                 }
			},
		},
		title: {
			text: 'Equal Area Projection (' + samples.name + ')'
		},
		subtitle: {
			text: '<b>' + information + '</b>'
		},
      	pane: {
			startAngle: 0,
			endAngle: 360
     	},
		yAxis: {
			type: 'linear',
			reversed: true,
			labels: {
				enabled: false
			},
			tickInterval: 90,
      	    min: 0,
			max: 90,
        },
		tooltip: {
			formatter: function () {
				if(this.series.name == 'Directions') {
					return '<b> Demagnetization step: </b>' + this.point.step + '<br> <b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination </b>' + this.point.inc.toFixed(1)
				} else {
					return '<b>Name: </b> ' + this.point.name + '<br><b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination </b>' + this.point.inc.toFixed(1)
				}
			}
		},
		credits: {
			enabled: true,
			text: "Paleomagnetism.org (Equal Area Projection)",
			href: ''
		},
        xAxis: {
			minorTickPosition: 'inside',
			type: 'linear',
			min: 0,
			max: 360,
            minorGridLineWidth: 0,
            tickPositions: [0, 90, 180, 270, 360],
            minorTickInterval: 10,
            minorTickLength: 5,
            minorTickWidth: 1,
            labels: {
                formatter: function () {
                    return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
                }
            }
        },
        plotOptions: {
			line: {
				lineWidth: 1,
				color: 'rgb(119, 152, 191)'
			},
			series : {
				animation: false,
				dataLabels: {
					color: 'grey',
					style: {
						fontSize: '10px'
					},
                    enabled: enableLabels,
					formatter: function () {
						return this.point.step;
					}
				}
			}
		 },
    	series: [{
			name: 'Directions',
			id: 'Directions',
			type: 'scatter',
			zIndex: 100,
			data: dataBucket
		},{
			name: 'Directions',
			enableMouseTracking: false,
			marker: {
				enabled: false
			},
			linkedTo: 'Directions',
			type: 'line', 
			data: dataBucket		
		}],
	};

	new Highcharts.Chart(chartOptions); //Initialize chart with specified options.;

	if(globalSticky.length != 0) {
		$("#eqAreaDirections").highcharts().addSeries({
			color: 'gold',
			type: 'scatter', 
			name: 'Sticky', 
			data: globalSticky,
			marker: {
				radius: 8,
				symbol: 'diamond'
			}
		});
	}
}

/* Logic to handle increased radius size on hover
 * In the Highcharts series, we only save points to be displayed and not all points including the ones that are hidden.
 * We are required to count the number of hidden points and find the Highcharts index as a function of this.
 */
function setHoverRadius (index, liSelected) {

	if(data.length != 0) {
		//Get specimen name and capture charts to use
		var sample = getSampleIndex();
		
		var chart = $("#zijderveldPlot").highcharts(); //Capture Zijderveld plot
		var chart2 = $("#eqAreaDirections").highcharts(); //Capture eqArea plot
		var chart3 = $("#intensityPlot").highcharts(); //Capture eqArea plot
	
		var lineColor = "rgb(119, 152, 191)";
		
		//Reset all data points to marker radius 2 (4) (default)
		for(var i = 0; i < chart.series[0].data.length; i++) {
			var color = chart2.series[0].data[i].marker.fillColor;
			chart.series[2].data[i].update({marker: {radius: 2}}, false);
			chart.series[3].data[i].update({marker: {radius: 2}}, false);
			chart2.series[0].data[i].update({marker: {radius: 4, lineWidth: 1, lineColor: lineColor, fillColor: color}}, false);
			chart3.series[0].data[i].update({marker: {radius: 4}}, false);
		}
	
		//If we are hovering over a visible point (option has class show when it is hidden; good job)
		if(!$(liSelected).hasClass('show')) {		
			var skip = 0;	//Skip will capture the number of hidden points
			for(var i = 0; i < data[sample].data.length; i++) { //Begin looping over all data points for particular specimen
				if(data[sample].data[i].visible) {	//Check if particular point i is visible
					if(i == index) {	//Check if this point i is the index we are hovering on
						var color = chart2.series[0].data[i-skip].marker.fillColor;
						chart.series[2].data[index-skip].update({marker: {radius: 4}}, true);	//Set the marker radius and return function (Zijderveld declination)
						chart.series[3].data[index-skip].update({marker: {radius: 4}}, true);	//(Zijderveld Inclination)
						chart2.series[0].data[index-skip].update({marker: {zIndex: 100, radius: 6, lineWidth: 1, lineColor: lineColor, fillColor: color}}, true);	//(EqArea Inclination)
						chart3.series[0].data[index-skip].update({marker: {radius: 6}}, true);	//Intensity plot
						return; //Ok we found our point, return and the point in the highcharts series will be index - i;
					}
				} else {
					skip++;	//We found a hidden point so increment skip
				}
			}		
		}
		
		//Redraw charts at the end (redrawing it at every update will be much slower)
		chart.redraw();
		chart2.redraw();	
		chart3.redraw();
	}
}

function dlItem ( string, extension ) {
	
	//Check if supported
	downloadAttrSupported = document.createElement('a').download !== undefined;
	
	var blob = new Blob([string], { type: 'data:text/csv;charset=utf-8,'});
	var csvUrl = URL.createObjectURL(blob);
	var name = 'export';

		// Download attribute supported
        if (downloadAttrSupported) {
            a = document.createElement('a');
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

/* FUNCTION exporting
 * Handles exporting for custom paleomagnetism.org .dir format
 * Input: NULL
 * Output: VOID
 */
function exporting () {
	
	if(data != null) {
		try {
			var string = JSON.stringify(data)
		} catch (err) {
			notify('failure', 'A critical error has occured ' + err);
		}
		dlItem(string, 'dir');
	} else {
		notify('failure', 'There are no data for exporting.');
	}
}

/* FUNCTION getCSV
 * Description: custom function to parse Highcharts data to csv format on exporting
 * Input: triggered by clicking export CSV -> passes chart ID
 * Output: CSV formatted variable that can be downloaded through dlItem routine
 */
(function (Highcharts) {

     downloadAttrSupported = document.createElement('a').download !== undefined;
		
    // Options
    var itemDelimiter = '","';
    var lineDelimiter = '\n';

	//Add a prototype function
    Highcharts.Chart.prototype.getCSV = function () {
		
		var csv = "";
	
		/*
		 * CSV EXPORTING: Site means (Figure 2)
		 */
		 
		 //for Zijderveld Diagram
		 if(this.userOptions.chart.id == 'Zijderveld') {
			
			row = ['Step', 'x', 'y', 'z'];
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			
			for(var j = 0; j < this.series[0].data.length; j++) {
				row = [this.series[0].data[j].step, this.series[0].data[j].x, this.series[0].data[j].y, this.series[1].data[j].y];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			}
		
		 }
		 
		 //Left figure in interpreted directions tab
		 if(this.userOptions.chart.id == 'eqAreaInterpretations') {
		
			csv += this.userOptions.chart.coordinates;
		
			csv += lineDelimiter;	
			csv += lineDelimiter;	
			
			row = ['Specimen', 'Declination', 'Inclination', 'Type'];
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

			for(var i = 0; i < this.series[0].data.length; i++) {
				row = [this.series[0].data[i].options.sample, this.series[0].data[i].x, this.series[0].data[i].options.inc, 'Direction'];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
			}
			
			for(var i = 0; i < this.series[1].userOptions.poles.length; i++) {
				row = [this.series[0].data[i].options.sample, this.series[1].userOptions.poles[i].dec, this.series[1].userOptions.poles[i].inc, 'Negative Pole to Plane'];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
			}
			
			csv += lineDelimiter;	 
			
			row = ['Mean Declination', 'Mean Inclination', '(Directions Only)'];
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
			
			row = [this.series[3].data[0].x, this.series[3].data[0].options.inc];
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
		 }
		 
		 //For equal area projection
		 if(this.userOptions.chart.id === 'eqAreaProjDir') {
			row = [ 'Step', 'Inclination', 'Declination' ];	
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
			
			for(var i = 0; i < this.series[0].data.length; i++) {
				row = [this.series[0].data[i].step, this.series[0].data[i].x, this.series[0].data[i].inc];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
			}
		 }
		 
		 //For intensity chart
		 if(this.userOptions.chart.id === 'intensity') {
		
		 	row = [ 'Step', 'Intensity', this.series[0].name ];	
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

			for(var i = 0; i < this.series[0].data.length; i++) {
				row = [this.series[0].data[i].category, this.series[0].data[i].y];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
			}
		 }
		 
		 //For fitted directions chart
		 if(this.userOptions.chart.id == 'eqAreaFitted') {

		 	csv += this.userOptions.chart.coordinates;
		
			csv += lineDelimiter;	
			csv += lineDelimiter;	
			
		 	row = ['Specimen', 'Declination', 'Inclination', 'Type'];
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
			
			for(var i = 0; i < this.series[0].data.length; i++) {
				row = [this.series[0].data[i].options.sample, this.series[0].data[i].x, this.series[0].data[i].inc, 'Direction'];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
			}	
			
			for(var i = 0; i < this.series[1].data.length; i++) {
				row = [this.series[0].data[i].options.sample,  	
				
				
				this.series[1].data[i].x, this.series[1].data[i].inc, 'Fitted Direction'];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
			}	
			
			csv += lineDelimiter;	 
			row = ['Mean Declination', 'Mean Inclination', '(Great Circles Fitted)'];
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			
			row = [this.series[3].data[0].x, this.series[3].data[0].options.inc];
			csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			
		 }
		 
		return csv;
		
    };  
	
}(Highcharts));

// Now we want to add "Download CSV" to the exporting menu.
// Code changed after https://github.com/highslide-software/export-csv
// Original Author: Torstein Honsi (Highcharts)
Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({
    text: 'Download CSV file',
    onclick: function () {
	
		//Parse data to CSV format
		var csv = this.getCSV(); 

		//Download the parsed CSV
		dlItem(csv, 'csv');
	}
});

function exportInterpretation () {
	if(data != null) {
		csv = '';
		
		// Options
		var itemDelimiter = '","';
		var lineDelimiter = '\n';
	
		// Header row
		row = ["Sample Name", "Declination", "Inclination", "Intensity", "MAD", "Forced", "Type", "Coordinates", "Bedding Strike", "Bedding Dip", "Num Step", "Min Step", "Max Step", "Remark"];
		csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
		
		for(var i = 0; i < data.length; i++) {
			if(data[i].interpreted) {
				for(var j = 0; j < data[i]['GEO'].length; j++) {
					var row = [];
					row.push(data[i].name, data[i]['GEO'][j].dec, data[i]['GEO'][j].inc, data[i]['GEO'][j].intensity, data[i]['GEO'][j].MAD, data[i]['GEO'][j].forced, data[i]['GEO'][j].type, 'Geographic Coordinates', data[i].bedStrike, data[i].bedDip, data[i]['GEO'][j].nSteps, data[i]['GEO'][j].minStep, data[i]['GEO'][j].maxStep, data[i]['GEO'][j].remark);
					csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				}
			}
		}
		
		csv += lineDelimiter;
		
		for(var i = 0; i < data.length; i++) {
			for(var j = 0; j < data[i]['TECT'].length; j++) {
				var row = [];
				row.push(data[i].name, data[i]['TECT'][j].dec, data[i]['TECT'][j].inc, data[i]['TECT'][j].intensity, data[i]['TECT'][j].MAD, data[i]['TECT'][j].forced, data[i]['TECT'][j].type, 'Tectonic Coordinates', data[i].bedStrike, data[i].bedDip, data[i]['TECT'][j].nSteps, data[i]['TECT'][j].minStep, data[i]['TECT'][j].maxStep, data[i]['TECT'][j].remark);
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			}
		}
		
		dlItem(csv, 'csv');
		
	} else {
		notify('failure', 'There are no interpretations for exporting.');	
	}
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
function importing (event, format)  {
	
	$("#appBody").hide();
	
	//Filehandler API, handles file importing
    var input = event.target;
    var reader = new FileReader();
	
	//Single input
    reader.readAsText(input.files[0]);
	reader.onload = function(){
		
		var text = reader.result;
		
		//Not appending, reset data array
		var append = $('#appendFlag').prop('checked');
		if(!append) {
			data = [];
		}
		
		//Define global data bucket to capture application info
				
		//Remove all previous options from the specimen scroller
		$('#specimens').find('option').remove().end();
		$('#specimens').multiselect('refresh');
		
		//Start parsing Utrecht format
		if(format == 'UTRECHT') {
	
			//Split by 9999 on new line (which indicates end of specimen)
			//Fixed problem where script would split on every 9999 (also sample intensities)
			var blocks = text.split(/9999[\n\r]/);
			var nSamples = blocks.length - 1; //The final block can be ignored (END)
			var nSpecimens = nSamples;
			
			//Loop over all data blocks and split by new lines
			for(var i = 0; i < nSpecimens; i++) {
				
				var parameters = blocks[i].split('\n')
				
				//First and final can be ignored
				parameters.pop();
				parameters.shift();
				
				//parsedData is the bucket that contains directional data
				var parsedData = [];
				var skip = false;
				
				for(var j = 0; j < parameters.length; j++) {
				
					var parameterPoints = parameters[j].split(/[,\s\t]+/); //Split by commas
					
					//Get specimen name, core and bedding orientation from Utrecht format contained in first row of datablock (there j = 0)
					//Check if NaN (number("")) becomes NaN is field is empty -> simply set value to 0.
					if(j == 0) {
					
						var name = parameterPoints[0].replace(/['"]+/g, ''); //Remove quotes (for TH-demag, samples are written as ""SS1.1"". Not very nice.);
						
						//Check if sample with name exists -> append copy text
						for(var k = 0; k < data.length; k++) {
							if(name == data[k].name) {
								var skip = true;
							}
						}						
						
						var coreAzi = Number(parameterPoints[2]);	
						if(isNaN(coreAzi)) {
							coreAzi = 0;
						}
						var coreDip = Number(parameterPoints[3]);
						if(isNaN(coreDip)) {
							coreDip = 0;
						}
						var bedStrike = Number(parameterPoints[5]);
						if(isNaN(bedStrike)) {
							bedStrike = 0;
						}
						var bedDip = Number(parameterPoints[6]);
						if(isNaN(bedDip)) {
							bedDip = 0;
						}
						
					} else {
					
						//Removes double space characters
						parameterPoints = $.grep(parameterPoints, function(n) { 
							return n
						});
						
						//Push particular specimen to parsed data (UTRECHT format uses a, b, c coordinate system which is equal to -y, z, -x)
						//visible and include methods indicate whether particular step is shown in graphs or included for PCA.
						parsedData.push({
							'visible'	: true, 
							'include'	: false,
							'step'		: parameterPoints[0],
							'x'			: Number(-parameterPoints[2]),
							'y'			: Number(parameterPoints[3]),
							'z'			: Number(-parameterPoints[1]),
							'a95'		: parameterPoints[4],
							'info'		: parameterPoints[5] + ' at ' + parameterPoints[6]
						});
					}
				}
				
				if(skip) {
					notify('failure', 'Found duplicate ' + name + '; skipping specimen');
					nSamples--;
					continue;
				}
				
				//Now format specimen meta-data, parameters such as bedding and core orientation go here as well as previously interpreted directions.
				data.push({
					'GEO'			: [],
					'TECT'			: [],
					'interpreted'	: false,
					'name'			: name,
					'coreAzi'		: Number(coreAzi),
					'coreDip'		: Number(coreDip),
					'bedStrike'		: Number(bedStrike),
					'bedDip'		: Number(bedDip),
					'data'			: parsedData
				})
			}

			//Standard application format, this is easy
		} else if(format == 'APP') {
			var nSamples = 0;
			//Error catching if parsing is impossible -> file may be corrupt
			try {
				if(!append) {
					data = JSON.parse(text); //parse JSON encoded object
					for(var k = 0; k < data.length; k++) {
						var skip = false;
						for(var l = 0; l < data.length; l++) {
							if(data[k] == data[l].name) {
								var skip = true;
							}
						}
						if(skip) {
							notify('failure', 'Found duplicate ' + appendData[k].name + '; skipping specimen');
							continue;
						}
						nSamples++;
					}
				} else {
					var appendData = JSON.parse(text);
					for(var k = 0; k < appendData.length; k++) {
						var skip = false;
						for(var l = 0; l < data.length; l++) {
							if(appendData[k].name == data[l].name) {
								var skip = true;
							}
						}
						if(skip) {
							notify('failure', 'Found duplicate ' + appendData[k].name + '; skipping specimen');
							continue;
						}
						nSamples++;
						data.push(appendData[k]);
					}					
				}
			} catch (err) {
				notify('failure', 'A critical error occured while parsing the data. The file may be corrupt: ' + err);
			}
			
		//Magnetometer spinner input format
		//This needs to be reviewed for coordinate systems and where to find bedding information/core information
		} else if(format == 'SPINNER') {
			notify('failure', 'Spinner input is currently not supported.');
			return;
			var sortedSamples = new Object();
			var lines = text.split('\n');
			
			lines = $.grep(lines, function(n) { 
				return n;
			});	
			
			for(var i = 0; i < lines.length; i++) {
				var lineParameters = lines[i].split(/[,\s\t]+/); //Split by commas
				lineParameters = $.grep(lineParameters, function(n) { 
					return n;
				});
				var sampleName = lineParameters[0];
				if(sortedSamples.hasOwnProperty(sampleName)) {
					sortedSamples[sampleName].push(lineParameters);
				} else {
					sortedSamples[sampleName] = new Array();
				}
			}
			
			//Get number of properties for sortedSamples object
			var nSamples = Object.keys(sortedSamples).length 
			
			for(var i in sortedSamples) {
			
				var skip = false;
				var sample = sortedSamples[i];
				parsedData = [];
				for(var j = 0; j < sample.length; j++) {
					var power = sample[j][5];
					if(isNaN(sample[j][2]) || isNaN(sample[j][3]) || isNaN(sample[j][4])) {
						notify('failure', 'Spinner input file is not sane, please check if all input columns are delimited by a white space.');
						return;
					}
					
					//Check coordinate system for spinner
					//In this application x - east; y - north; z - down;
					parsedData.push({
						'visible'	: true, 
						'include'	: false,
						'step'		: sample[j][1],
						'x'			: Number(-sample[j][3] * Math.pow(10, power)),
						'y'			: Number(sample[j][4] * Math.pow(10, power)),
						'z'			: Number(-sample[j][2] * Math.pow(10, power)),
						'a95'		: 1,
						'info'		: 'No Information'
					});
				}
				
				//Check if sample with name exists -> append copy text
				for(var k = 0; k < data.length; k++) {
					if(i == data[k].name) {
						var skip = true;
					}
				}	
				
				if(skip) {
					notify('failure', 'Found duplicate ' + i + '; skipping specimen');
					nSamples--;
					continue;
				}
						
				//Now format specimen meta-data, parameters such as bedding and core orientation go here as well as previously interpreted directions.
				data.push({
					'GEO'			: [],
					'TECT'			: [],
					'interpreted'	: false,
					'name'			: i,
					'coreAzi'		: Number(0),
					'coreDip'		: Number(90), //Set core
					'bedStrike'		: Number(0),
					'bedDip'		: Number(0),
					'data'			: parsedData
				})
			}
		} else if(format == 'DEFAULT') {
		
			var blocks = text.split(/9999[\n\r]/);
			var nSamples = blocks.length; 
			
			for(var i = 0; i < blocks.length; i++) {

				var lines = blocks[i].split('\n')
				lines = $.grep(lines, function(n) { 
					return n;
				});
				
				var skip = false;
				parsedData = [];
	
				for(var j = 0; j < lines.length; j++) {

					var parameters = lines[j].split(/[,\s\t]+/); //Split by commas
					parameters = $.grep(parameters, function(n) { 
						return n;
					});
				
					if(j == 0) {
						var name = parameters[0];
						
						//Check if sample with name exists -> append copy text
						for(var k = 0; k < data.length; k++) {
							if(name == data[k].name) {
								var skip = true;
							}
						}
						
						var coreAzi = Number(parameters[1]);	
						var coreDip = Number(parameters[2]);
						var bedStrike = Number(parameters[3]);
						var bedDip = Number(parameters[4]);
					} else {
					
						//Get Cartesian coordinates for declination, inclination and intensity
						var CartesianCoordinates = cart(parameters[1], parameters[2], parameters[3]);
					
						parsedData.push({
							'visible'	: true, 
							'include'	: false,
							'step'		: parameters[0],
							'x'			: CartesianCoordinates.x,
							'y'			: CartesianCoordinates.y,
							'z'			: CartesianCoordinates.z,
							'a95'		: parameters[4],
							'info'		: parameters[5] ? parameters[5] : 'No Information'
						});	
					}
				}
				
				if(skip) {
					notify('failure', 'Found duplicate ' + name + '; skipping specimen');
					nSamples--;
					continue;
				}
				
				data.push({
					'GEO'			: [],
					'TECT'			: [],
					'interpreted'	: false,
					'name'			: name,
					'coreAzi'		: coreAzi,
					'coreDip'		: coreDip,
					'bedStrike'		: bedStrike,
					'bedDip'		: bedDip,
					'data'			: parsedData
				})
			}
			

		}
		
		//Add new specimens to the specimen scroller
		for(var i = 0; i < data.length; i++) {
			var name = data[i].name;
			$('#specimens').append("<option custom=\"" + i + "\" value=\"" + name + "\">" + name + "</option>");
		}
		
		//Notify user and refresh specimen scroller to force update
		notify('success', 'Importing was succesful. Added ' + nSamples + ' new specimens.')
		$("#ui-id-1").animate({"color": "white", "background-color": "rgb(191, 119, 152)"}, 2000);
		$("#ui-id-1").animate({"color": "#7798BF", "background-color": "white"}, 2000);		
		$('#specimens').multiselect('refresh');
		
		setStorage();
	
	}
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

		try {
			var storeObj = JSON.stringify(data); //parse JSON encoded object
		} catch (err) {
			notify('failure', 'Failure writing data to local storage: ' + err);
		}
		
		if(localStorage) {
			localStorage.setItem('InterPortal', storeObj);
		}
}

var plotInterpretationsGraph = function ( dataBucket, nCircles, container, title, coordinates ) {

	var chartOptions = {
		chart: {
			backgroundColor: 'rgba(255, 255, 255, 0)',
			coordinates: coordinates,
			id: container,
			polar: true,
			animation: false,
        	renderTo: container, //Container that the chart is rendered to.
		},
		title: {
			text: title
		},
		subtitle: {
			text: '<b>' + dataBucket[0].data.length + ' directions and ' + nCircles + ' great circles </b> ' + '(' + coordinates + ')'
		},
      	pane: {
			startAngle: 0,
			endAngle: 360
     	},
		yAxis: {
			type: 'linear',
			reversed: true,
			labels: {
				enabled: false
			},
			tickInterval: 90,
      	    min: 0,
			max: 90,
        },
		tooltip: {
			formatter: function () {
					return '<b> Specimen: </b> ' + this.point.sample + '<br><b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination </b>' + this.point.inc.toFixed(1)
			}
		},
		credits: {
			enabled: true,
			text: "Paleomagnetism.org (Equal Area Projection)",
			href: ''
		},
		legend: {
			floating: true
		},
        xAxis: {
			minorTickPosition: 'inside',
			type: 'linear',
			min: 0,
			max: 360,
            minorGridLineWidth: 0,
            tickPositions: [0, 90, 180, 270, 360],
            minorTickInterval: 10,
            minorTickLength: 5,
            minorTickWidth: 1,
            labels: {
                formatter: function () {
                    return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
                }
            }
        },
        plotOptions: {
			line: {
				lineWidth: 1,
				color: 'rgb(119, 152, 191)'
			},
			series : {
				animation: false,
			}
		 },
    	series: dataBucket,
	};

	new Highcharts.Chart(chartOptions); //Initialize chart with specified options.;

	if(globalSticky.length != 0) {
		$("#eqAreaDirections").highcharts().addSeries({
			color: 'gold',
			type: 'scatter', 
			name: 'Sticky', 
			data: globalSticky,
			marker: {
				radius: 8,
				symbol: 'diamond'
			}
		});
	}
}

function plotInterpretations() {

	var plotDataDir = [];
	var plotDataCircle = [];
	var plotDataCircle2 = [];
	var nCircles = 0;
	var nPoints = 0;
	var dataFisher = [];
	var circlePoles = [];
	
	var coordType =  $("#coordinates input[type='radio']:checked").val();
	
	if(coordType == 'GEO') {
		var coordinateNice = 'Geographic Coordinates';
	} else if(coordType == 'TECT') {
		var coordinateNice = 'Tectonic Coordinates';
	}
	
	//Loop over all specimens
	for(var i = 0; i < data.length; i++) {
		if(data[i].interpreted) { //Only if interpreted
			for(var j = 0; j < data[i][coordType].length; j++) {
				var dec = data[i][coordType][j].dec;
				var inc = data[i][coordType][j].inc;
				var sample = data[i].name;
				if(data[i][coordType][j].type == 'dir') {
					nPoints++;
					dataFisher.push([dec, inc]);
					if(inc < 0) {
						color = 'white';
					} else {
						color = 'rgb(119, 152, 191)';
					}
					plotDataDir.push({
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
				} else if (data[i][coordType][j].type == 'GC') {
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

	var parameters = new fisher(dataFisher, 'dir', 'full');
	var ellipse = getPlaneData({'dec': parameters.mDec, 'inc': parameters.mInc}, 'MAD', parameters.a95)
	
	//Get fillColor (white if reversed)
	if(parameters.mInc < 0) {
		var color = 'white'
	} else {
		var color = 'rgb(119, 191, 152)'
	}
	
	//Construct data for plotting
	var plotData = [{
		'name'	: 'Interpreted Directions', 
		'data'	: plotDataDir,
		'type'	: 'scatter',
		'zIndex' : 100
	}, {
		'name'	: 'Interpreted Great Circles',
		'id'	: 'gc',
		'dashStyle': 'ShortDash',
		'data'	: plotDataCircle,
		'poles'	: circlePoles,
		'enableMouseTracking': false,
		'turboThreshold': 0,
		'marker' : {
			'enabled': false
		}
	}, {
		'name'	: 'Interpreted Great Circles',
		'linkedTo'	: 'gc',
		'data'	: plotDataCircle2,
		'enableMouseTracking': false,
		'turboThreshold': 0,
		'marker' : {
			'enabled': false
		}	
	}, {
		name: 'Mean',
		type: 'scatter',
		data: [{'sample': 'Direction Mean', 'x': parameters.mDec, 'y': eqArea(parameters.mInc), 'inc': parameters.mInc}],
		color: 'rgb(119, 191, 152)',
		marker: {
			symbol: 'circle',
			radius: 6,
			fillColor: color,
			lineColor: 'rgb(119, 191, 152)',
			lineWidth: 1
		}
	}, {
		name: 'Confidence',
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
	}];

	plotInterpretationsGraph( plotData, nCircles, 'eqAreaInterpretations', 'Interpreted Directions and Great Circles', coordinateNice );
	$("#fittingTable").html('<table class="sample" id="fittingTableInfo"><tr><th> Number of Directions </th> <th>Mean Declination </th> <th>Mean Inclination </th> <th> k </th> <th> a95 </th> </tr>');
	$("#fittingTableInfo").append('<tr> <td> ' + nPoints + ' </td> <td> ' + parameters.mDec.toFixed(1) + ' </td> <td> ' + parameters.mInc.toFixed(1) + ' </td> <td> ' + parameters.k.toFixed(1) + '</td> <td> ' + parameters.a95.toFixed(1) + '</td> </tr> </table>');
	$("#fittingTable").show();
	
	if(nCircles > 0) {
		$("#fitCirclesDiv").show();
		$("#fitCirclesDivText").html('<b> Note: </b> Found great circles in the interpretation. Click the button below to fit the circles on set points.')
	} else {
		$("#fitCirclesDiv").hide();
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
        var chart = this.chart,
            otherAxis;
        
        if (typeof this.options.crossing === 'number') {
            otherAxis = chart[this.isXAxis ? 'yAxis' : 'xAxis'][0];
			this.offset = otherAxis.toPixels(this.options.crossing, true);
            chart.axisOffset[this.side] = 10;
        }
        proceed.call(this);
        
    });
    
}(Highcharts));