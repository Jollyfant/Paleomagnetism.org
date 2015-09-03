/* PALEOMAGNETISM.ORG E-I MODULE
 * 
 * VERSION: ALPHA.1507
 * LAST UPDATED: 7/28/2015
 *
 * Elongation/Inclination module for Paleomagnetism.org.
 * Best fit polynomial relating the expected elongation (from inclination) to the measured elongation. 
 * Coefficients taken as implemented in the PmagPY library (https://github.com/ltauxe/PmagPy/blob/master/find_EI.py) after (Tauxe et al., 2008)
 * The resulting intersection with the polynomial is accurate within a flattening factor of .01
 * We do not calculate the elongation direction because eigenvector calls takes a lot of computational time
 *
 * 		> Related Scientific Literature: 
 *
 *		Tauxe, L., Kodama, K., & Kent, D. V.
 *		Testing corrections for paleomagnetic inclination error in sedimentary rocks: a comparative approach.
 *		Phys. Earth Planet. Int., 169, 152–165. 
 *		[2008]
 *
 * 		Tauxe, L. & Kent, D. V.
 *		A simplified statistical model for the geomagnetic field and the detection of shallow bias in paleomagnetic inclinations: Was the ancient magnetic field dipolar?
 *		Timescales of the Paleomagnetic Field, volume 145 (pp. 101–116)
 *		[2004]
 *		
 *
 *		O.K. Smith
 *		Eigenvalues of a symmetric 3 × 3 matrix
 *		Communications of the ACM
 *		[1961]
 *
 *		R. F. King
 *		The Remanent Magnetism of Artificially Deposited Sediments
 *		Mon. Nat. Roy. astr. Soc., Geophys. Suppl., 7, 115–134. 
 *		[1955]
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

//Set running options to prevent the launching of additional instances; these would conflict
module.EI = new Object();
module.EI.running = false;

/*
 * FUNCTION module.EI.polynomial
 * Description: Calculates expected elongation for given inclination according to the best fit 3rd order polynomial of TK03.GAD
 *			  : coefficients taken from the PmagPY library
 * Input: inclination@float
 * Output: expected elongation@float
 */
 module.EI.polynomial = function ( inc ) {

 	"use strict";
	
	//Polynomial coefficients
	var coeffs = [ 3.15976125e-06, -3.52459817e-04, -1.46641090e-02, 2.89538539e+00 ];
	var elongation = coeffs[0]*Math.pow(inc, 3) + coeffs[1]*Math.pow(inc, 2) + coeffs[2]*inc + coeffs[3];
	
	return elongation;
}

/* 
 * FUNCTION lastIndex
 * Description: returns the last element of an array, used in the EI module
 * Input: array@array
 * Output: last element of array
 */
function lastIndex( array ) {

	"use strict";
	
	return array[array.length - 1];
}

/*
 * FUNCTION module.EI.initialize
 * Description: initializes the inclination unflattening module
 * Input: NULL
 * Output: VOID
 */
 module.EI.initialize = function () {
	
	"use strict";
	
	//Quit procedure if already running
	if(module.EI.running) {
		notify('failure', 'The inclination shallowing is already running.');
		return;
	}
	
	//Capture progress bar to variable
	module.EI.bar = $("#EIBar");
	
	//Get selected site name
	var siteNames = $("#EISel").val();
	if(siteNames == null) {
		notify('failure', 'Please select a site.');
		$("#EIInfo").hide();
		return;
	}
	
	var coordinates = $("#EIRadio input[type='radio']:checked").val();
	var coordRef = coordinates === "TECT" ? 'dataTC' : 'data';
	
	//Get the accepted directions from the data block
	var data = sites[siteNames[0]][coordRef].dir.accepted;
	
	//Get the absolute original inclination from the data set
	var originalInclination = Math.abs(new fisher(data, 'dir', 'simple').mInc);
	
	//Define number of bootstrap attempts and set number of intersections and bootstrap iteration counter to 0
	var nBootstraps = 5000;
	var nIntersections = 0;
	var bootstrapIteration = 0;
	
	//define data buckets
	var inclinations = new Array();
	var elongations = new Array();
	var bootstraps = new Array();

	//Get time of initialization
	var timeInit = Date.now();
	
	//Lock the procedure from running additional instances
	module.EI.running = true;

	//Data bucket for inclination (Is) and elongation (Es) pairs for one bootstrap
	//Run the procedure initially for the original data
	var unflattenedData = module.EI.unflattenDirections(data);
	var unflattenedInclination = lastIndex(unflattenedData.inclinations);

	//Construct Highcharts formatted data series for actual data
	var datArray = new Array();
	for(var i = 0; i < unflattenedData.len; i++) {
		datArray.push({
			'x': unflattenedData.inclinations[i], 
			'y': unflattenedData.elongations[i],
			'f': unflattenedData.flatteningFactors[i]
		});
	}
	
	bootstraps.push(datArray);
	
	//Asynchronous timed function that is called automatically
	(module.EI.timed = function () {
	
		//After first doing the actual data, get a pseudo-random set of the data
		//Unflatten the pseudo-random directions
		var unflattenedData = module.EI.unflattenDirections( new pseudo(data));
		
		//Data bucket for inclination (Is) and elongation (Es) pairs for one bootstrap
		var datArray = new Array();
		for(var i = 0; i < unflattenedData.len; i++) {
			datArray.push({
				'x': unflattenedData.inclinations[i], 
				'y': unflattenedData.elongations[i],
				'f': unflattenedData.flatteningFactors[i]
			});
		}
		
		//If the procedure is successful and finds an intersect with the polynomial, save the bootstrap and increment b for the next bootstrap
		if(unflattenedData.len !== 0) {
			
			//Save the first 25 successful bootstraps for plotting (and the first on the actual data)
			if(nIntersections <= 26) {
				bootstraps.push(datArray);
			}
		
			//Save the final entry of the arrays (which is the intersection (if any) with the TK03.GAD polynomial)
			inclinations.push(lastIndex(unflattenedData.inclinations));
			elongations.push(lastIndex(unflattenedData.elongations));
			
			//Found an intersection
			nIntersections++;
		}
		
		//One bootstrap is completed
		bootstrapIteration++;
		
		//Has the procedure completed enough bootstraps
		//If FALSE, call timed procedure again
		//If TRUE, escape the timed procedure
		if(bootstrapIteration < nBootstraps) {	
			
			//Update the progressbar
			module.EI.bar.progressbar('value', (bootstrapIteration)/(nBootstraps) * 100);
			$("#EIPerc").html((bootstrapIteration+1) + ' / ' + nBootstraps);
			
			//Give the browser 1 millisecond every 10 bootstraps; otherwise proceed immediately to the next bootstrap
			if(bootstrapIteration%10 == 0) {
				setTimeout(function() { module.EI.timed(); }, 1);
			} else {
				module.EI.timed();
			}
			
		} else {

			//Sort the inclination array numerically from lowest to highest
			inclinations.sort(function (a, b) {
				return a > b ? 1 : a < b ? -1 : 0;
			});
	
			//Data bucket for the cumulative distribution function of inclination and average inclination
			var cdfData = new Array();
			var averageInclination = 0;
			for(var i = 0; i < inclinations.length; i++){
				cdfData.push({
					'x': inclinations[i], 
					'y': i/(nIntersections-1)
				});
				averageInclination += inclinations[i];
			}
			
			averageInclination = averageInclination/i;
			
			//Our lower and upper boostrapped bounds are respectively
			var lower = inclinations[parseInt(0.025*nIntersections, 10)];
			var upper = inclinations[parseInt(0.975*nIntersections, 10)];
			
			//If undefined put to 0
			var upper = upper ? upper : 0;
			var lower = lower ? lower : 0;
			
			//Get the number of intersections of the total number of bootstraps
			var intersectionNum =  nIntersections + ' out of ' + nBootstraps;
			
			//Get the final processing time
			var time = (Date.now() - timeInit);

			//Update the progressbar and notify userAgent
			notify('success', 'Inclination shallowing has been succesfully completed!');
			module.EI.bar.progressbar('value', 0);
			$("#EIInfo").show();
			$("#EIPerc").html("Done!");
			
			//Call plotting functions (bootstrap and CDF figure)
			EIbootstraps(bootstraps, time, intersectionNum, data);
			EICDF(cdfData, originalInclination, unflattenedInclination, averageInclination, lower, upper);
			
			//Free running lock
			module.EI.running = false;
		}
	})();
}

/*
 * FUNCTION: module.EI.unflattenDirections
 * Description: Finds inclination/elongation pairs for flattening factors 1 - 0 for {data}
 *			  : More information: see Lisa Tauxe book (or cited literature) (7.6.3 Inclination Error, Fig. 7.18)
 * Input: Data block containing [declination, inclination pairs]
 * Output: returns Arrays with elongation, inclination, and the respective flattening factor
 */
module.EI.unflattenDirections = function ( data ) {

 	"use strict";
	
	//Buckets for our data 
	var elongations = new Array(); //Elongation
	var inclinations = new Array(); //Inclination
	var flatteningFactors = new Array(); //Flattening Factor
	
	//Get the tan of the observed inclinations (equivalent of tan(Io))
	//The inclination is stored in the 2nd element of the data array
	var tanInclinations = new Array();
	for(var i = 0; i < data.length; i++) {
		tanInclinations.push(Math.tan(data[i][1]*rad));
	}

	//Decrement over the flattening values f from 100 to 20
	//We will find f with a resolution of 1/100th
	for(var i = 100; i >= 20; i--) {
	
		//Flattening factor (from 1 to 0.2)
		var f = i/100; 
		
		// Unflattening function after King, 1955
		//(tanIo = f tanIf) where tanIo is observed and tanIf is recorded.
		//Create unflattenedData containing (dec, inc) pair for a particular f
		var unflattenedData = new Array();
		for(var j = 0; j < data.length; j++) {
			var declination = data[j][0];
			var inclinationF = ( Math.atan( tanInclinations[j] / f ))/rad;
			unflattenedData.push([declination, inclinationF]); 
		}

		//Calculate mean inclination for unflattenedData and get eigenvalues
		var meanInc = Math.abs(new fisher(unflattenedData, 'dir', 'simple').mInc);
		var eigenvalues = eigValues(unflattenedData);
		
		//Record the flattening factor, elongation (τ2/τ3), and mean inclination
		//Tau2 and Tau3 are in the .s and .r method of eigenvalues respectively
		flatteningFactors.push(f);
		elongations.push(eigenvalues.s / eigenvalues.r); //τ2/τ3
		inclinations.push(meanInc);

		//In case we initially start above the TK03.GAD Polynomial
		//For each point check if we are above the polynomial; if so pop the parameters and do not save them
		//This simple algorithm finds the line below the TK03.GAD polynomial
		//Compare expected elongation with elongation from data from TK03.GAD
		//Only do this is Epoly < Edata
		if(Math.abs(module.EI.polynomial(meanInc)) <= elongations[elongations.length-1]) {

			//Remember the latest unflattening factor
			var unflatIndex = flatteningFactors[flatteningFactors.length-1]; 

			//Always pop the latest value
			var poppedE = elongations.pop();
			var poppedI = inclinations.pop();
			var poppedF = flatteningFactors.pop();	

			//If there is more than 1 consecutive flattening factor in the array
			//This means we have a line under the TK03.GAD Polynomial
			//So we can return our parameters
			if(flatteningFactors.length > 0) {
			
				//Put the latest popped elements back in the arrays
				flatteningFactors.push(poppedF);
				inclinations.push(poppedI);
				elongations.push(poppedE);
			
				return {
					'flatteningFactors': flatteningFactors, 
					'elongations': elongations, 
					'inclinations': inclinations,
					'len': flatteningFactors.length
				};
			}	
		}
	}
	
	//No intersection with TK03.GAD polynomial return zeros (this is filtered in the main routine and recorded as no-intersect)
	return {
		'flatteningFactors': [0], 
		'elongations': [0], 
		'inclinations': [0],
		'len': 0
	};
}