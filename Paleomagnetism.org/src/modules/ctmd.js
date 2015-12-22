/* PALEOMAGNETISM.ORG CTMD MODULE 
 * 
 * VERSION: ALPHA.1507
 * LAST UPDATED: 7/23/2015
 *
 * JavaScript file containing functionality for the CTMD (reversal) tests
 * CTMD test written by P.L. McFadden and modified by Cor Langereis
 * Bootstrapped CTMD (reversal) test implemented from the PmagPY library (Lisa Tauxe) 
 *
 *		> Related Scientific Literature: 
 * 
 * 		McFadden, P.L., McElhinny, M.W.  
 * 		Classification of the reversal test in palaeomagnetism 
 *		Geophysical Journal International 103 (3), pp. 725-729
 *		[1990]
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */
 		
module.CTMD = new Object();
module.CTMD.running = false;		

 /* FUNCTION module.CTMD.xyz
  * Description: bootstraps Cartesian coordinates for two sites (reversal/CTMD test)
  * Input: sitenames (e.g. SS1, SS2)
  * Output: VOID (calls graphing functions)
  */
 module.CTMD.xyz = function (one, two) {
	 
	"use strict";

	var coordinates = $("#CTMDRadio input[type='radio']:checked").val() === "TECT" ? 'dataTC' : 'data';
	
	//Number of bootstraps
	var nBootstraps = 5000;
	
	//Data buckets for Cartesian coordinates
	var xOne = new Array();
	var yOne = new Array();
	var zOne = new Array();
	var xTwo = new Array();
	var yTwo = new Array();
	var zTwo = new Array();

	//Bootstrap
	for(var i = 0; i < nBootstraps; i++) {
	
		//Draw N pseudo samples
		var sampledOne = new pseudo(sites[one][coordinates].dir.accepted);
		var sampledTwo = new pseudo(sites[two][coordinates].dir.accepted);
		
		//Get simple Fisher means for both sites
		var fisherOne = new fisher(sampledOne, 'dir', 'simple');
		var fisherTwo = new fisher(sampledTwo, 'dir', 'simple');
		
		//Flip Fisher means to normal polarity if the angle between the directions exceeds 90 degrees
		var angleBetween = angle(fisherOne.mDec, fisherOne.mInc, fisherTwo.mDec, fisherTwo.mInc);
		if(angleBetween > 90) {
			fisherOne.mInc = -fisherOne.mInc;
			fisherOne.mDec = (fisherOne.mDec+180)%360;
		}	
		
		//Fisher means to Cartesian coordinates
		var coordinatesOne = cart(fisherOne.mDec, fisherOne.mInc);
		var coordinatesTwo = cart(fisherTwo.mDec, fisherTwo.mInc);

		//Fill buckets
		xOne.push(coordinatesOne.x);
		yOne.push(coordinatesOne.y);
		zOne.push(coordinatesOne.z);
                                   
		xTwo.push(coordinatesTwo.x);
		yTwo.push(coordinatesTwo.y);
		zTwo.push(coordinatesTwo.z);		
	}

	//Get confidence interval (1.96 sigma; 95%)
	var lower = parseInt(0.025*nBootstraps, 10);
	var upper = parseInt(0.975*nBootstraps, 10);
	var info = [one, two];
	
	//Call plotting function
	CTMDXYZ(xOne, xTwo, lower, upper, 'xContainer', info, 'x-coordinate', nBootstraps);
	CTMDXYZ(yOne, yTwo, lower, upper, 'yContainer', info, 'y-coordinate', nBootstraps);
	CTMDXYZ(zOne, zTwo, lower, upper, 'zContainer', info, 'z-coordinate', nBootstraps);
	
	$("#dlBootstrapXYZDiv").show();
	
 }
 
/* FUNCTION module.CTMD.initialize
 * Description: does the CTMD tests
 * Input: NULL (obtains site names from the input box)
 * Output: N x N grid of classifications as chart
 */
module.CTMD.initialize = function () {

	"use strict";
	
	//Check if a CTMD test is running; if so quit the procedure.
	if(module.CTMD.running) {
		notify('failure', 'CTMD Module is already running.');
		return;
	}
	
	//Require a minimu of two sites
	var siteName = $("#ctmdSel").val();
	if(siteName == null || siteName.length == 1) {
		notify('failure', 'Please select at least two sites.');
		$("#CTMDHide").hide();
		return;
	}

	//Get coordinate reference frame (tectonic or geographic)
	var coordinates = $("#CTMDRadio input[type='radio']:checked").val() === "TECT" ? 'dataTC' : 'data';
	
	//Capture progress bar element
	module.CTMD.bar = $("#CTMDBar");
	
	//Check whether user wants to compare VGP positions or directions
	var VGPFlag = $("#CTMDVGPRadio input[type='radio']:checked").val() === "VGP" ? true : false;
	
	//Number of permutations (triangular number: http://en.wikipedia.org/wiki/Triangular_number)
	var length = (siteName.length-1);
	var permutations = (length*(length+1)/2);
	var data = new Array();

	//Initial timing parameter
	module.CTMD.timeInit = Date.now();

	//We need to consider all possible permutations in an asynchronous implementation
	//(e.g. 1v2, 1v3, 1v4, 2v3, 2v4, 3v4)
	//In other words: 
	//Outer loop: let i run from 1 to (N - 1)
	//Inner loop: let j run from (i + 1) to N
	//Start at i = 0; and j = i + 1
	var i = 0;
	var j = i + 1;

	//Lock process
	module.CTMD.running = true;	
	
	//Asynchronous function implemented	
	(module.CTMD.timed = function () {

		var N = [sites[siteName[i]][coordinates].params.N, sites[siteName[j]][coordinates].params.N];
		
		//Get parameters for directions or VGPs
		//If we want to sample VGPs, implicitly assume the sites were taken at the same location
		//This way, we call the poles routine with from an arbitrary site location (0, 0) in our case
		if(!VGPFlag) {
			
			var dispersion = [sites[siteName[i]][coordinates].params.k, sites[siteName[j]][coordinates].params.k];
			var R = [sites[siteName[i]][coordinates].params.R, sites[siteName[j]][coordinates].params.R];
			
			//Get declination and inclination for both distributions
			var inclination = [sites[siteName[i]][coordinates].params.mInc, sites[siteName[j]][coordinates].params.mInc];
			var declination = [sites[siteName[i]][coordinates].params.mDec, sites[siteName[j]][coordinates].params.mDec];	
			
			//Get Cartesian corodinates for the first and second site to compare
			var cartesianOne = cart(declination[0], inclination[0]);
			var cartesianTwo = cart(declination[1], inclination[1]);
			
			var xCoordinate = [cartesianOne.x, cartesianTwo.x];
			var yCoordinate = [cartesianOne.y, cartesianTwo.y];
			var zCoordinate = [cartesianOne.z, cartesianTwo.z];

		} else {
			
			var dispersion = [sites[siteName[i]][coordinates].params.K, sites[siteName[j]][coordinates].params.K];
			var R = [sites[siteName[i]][coordinates].params.VGPR, sites[siteName[j]][coordinates].params.VGPR];
			
			//Transform inclination and declination to VGP assuming site location (0, 0)
			var poleData = [sites[siteName[i]][coordinates].params.mDec, sites[siteName[i]][coordinates].params.mInc, 0, 0, 0];
			var poleData2 = [sites[siteName[j]][coordinates].params.mDec, sites[siteName[j]][coordinates].params.mInc, 0, 0, 0];
			var newPoles = [poles(0, 0, poleData), poles(0, 0, poleData2)];
			
			//Get the Cartesian coordinates of the VGPs
			var cartesianOne = cart(newPoles[0][0], newPoles[0][1]);
			var cartesianTwo = cart(newPoles[1][0], newPoles[1][1]);
			
			var xCoordinate = [cartesianOne.x, cartesianTwo.x];
			var yCoordinate = [cartesianOne.y, cartesianTwo.y];
			var zCoordinate = [cartesianOne.z, cartesianTwo.z];
			
			//Now it is longitude and latitude
			var declination = [newPoles[0][0], newPoles[1][0]];
			var inclination = [newPoles[0][1], newPoles[1][1]];
		}

		//Call the main procedure that does the classification test based on two distributions
		var classification = module.CTMD.monte(N, R, dispersion, xCoordinate, yCoordinate, zCoordinate);

		//Extend the classification object with the site names for this permutation
		$.extend(classification, {
			'one': siteName[i],
			'two': siteName[j]
		});
		
		//Some data to display in the tooltip
		var distributionOneText = '(' + declination[0].toFixed(1) + '/' + inclination[0].toFixed(1) + ') N: ' + N[0] + ', κ:' + dispersion[0].toFixed(1) + ')';
		var distributionTwoText = '(' + declination[1].toFixed(1) + '/' + inclination[1].toFixed(1) + ') N: ' + N[1] + ', κ:' + dispersion[1].toFixed(1) + ')';
		
		//Push relevant information to a data array
		data.push([i, j, 0, classification, distributionOneText, distributionTwoText]);
		
		//Outer loop: let i run from 1 to (N - 1)
		//Inner loop: let j run from (i + 1) to N
		//Length is defined as (N - 1)
		//When j reaches N -> increment i and reset j to i+1, otherwise increment j
		if(i < length) {
			j++;
			if(j > length) {
				i++;
				j = (i + 1);
			}
		}
		
		//Update progress bar
		module.CTMD.bar.progressbar('value', (data.length/(length*(length+1)/2) * 100));
		$("#CTMDPerc").html(data.length + ' / ' + permutations);
		
		//If all permutations have been considered break the procedure and plot functions
		//Rest 1ms after every permutation
		if(j < (siteName.length) && i < (siteName.length)) {
			setTimeout(function() { module.CTMD.timed(); }, 1);	
		} else {
			
			//Push blank tile at (i, i) since we don't consider comparison with itself
			for(var k = 0; k < siteName.length; k++) {
				data.push([k,k,0,{classification: 'blank'}]);	
			}
			
			//Get the final calculation time	
			var calcTime = (Date.now()-module.CTMD.timeInit);

			//Call plotting function 
			CTMDheatMap( siteName, data, calcTime );
			
			$("#CTMDHide").show();
			$("#CTMDPerc").html("Done!");
			notify('success', 'CTMD test has been completed succesfully!');
			
			//Unlock process when it has been completed.
			module.CTMD.running = false;	
		}	
	})();
};

/* 
 * FUNCTION module.CTMD.monte
 * Similar to the Watson test as described by Lisa Tauxe, Chapt: 11.3.4
 * Description: uses Monte Carlo sampling to randomly draw a new set of directions from (N1, k1), (N2, k2) and calculates the Watson parameters
 * Input: Arrays of N, R, and k for two particular sets, including x, y, and z coordinates
 *
 * This subroutine works as follows:
 * 1. Calculation of 2500 Watson parameters (Wv) from 2500 Monte-Carlo sampled (N1, k1), (N2, k2) distributions for the directions to be compared
 * 2. Sort the 2500 Watson parameters; The 0.95*2500th Watson parameter becomes the critical Watson parameter; on this parameter we can test the null hypothesis
 * 3. The null hypothesis is tested to see if the Watson parameter for our actual data set falls below the critical Watson parameter
 * 4. If so, purely by chance two distributions sampled around a common mean could share an angle determined by this critical parameter.
 *
 * If the Watson parameter of our data set falls within the determined critical value, the null hypothesis is rejected and classified according to McFadden and McElhinny, 1990
 */
module.CTMD.monte = function (N, R, K, X, Y, Z) {
	
	"use strict";
		
	//Type is always Monte Carlo simulation
	var type = 'Monte Carlo (simulated)';
	
	//Get 2500 values for the Watson parameter (Wv) for 2500 sets of directions
	//Distributions are (N1, K1) and (N2, K2)
	var simulatedWatson = module.CTMD.sampleWatson(N, K);
	
	//Dot product between the two vectors
	//Reverse one polarity if necessary
	var directionOne = dir(X[0], Y[0], Z[0]);
	var directionTwo = dir(X[1], Y[1], Z[1]);

	var angleBetween = angle(directionOne.dec, directionOne.inc, directionTwo.dec, directionTwo.inc);
	if(angleBetween > 90) {
		X[1] = -X[1];
		Y[1] = -Y[1];
		Z[1] = -Z[1];
	}
	
	//Format directional data for the subroutines
	var watsonData = new Array();
	for(var i = 0; i < 2; i++) {
		watsonData.push({
			'k': K[i], 
			'R': R[i], 
			'xMean': X[i], 
			'yMean': Y[i], 
			'zMean': Z[i]
		});
	};

	//Get the Watson parameter for the actual data set (V0)
	var dataWatson = module.CTMD.findWatsonParam(watsonData);
	
	//Looks through simulated Watson parameters to find the Monte Carlo probability of observing a value that exceeds V.
	var probability = module.CTMD.findProbability(dataWatson, simulatedWatson);
	
	//Convert back to the critical angle from the critical Watson parameter
	//We don't really use it, but we show it as it easier to visualize than a critical Watson parameter
	var criticalAngle = module.CTMD.resmonte(simulatedWatson.v95, R, K);
	
	//Classification according to McFadden and McElhinny (1990)
	//Taken from the CTMD.f95 routine
	//If the probability is > 5%, within 95% confidence the Watson parameter falls in the simulated list (null hypothesis is rejected)
	//Classification is then based on angle between mean directions at which the null hypothesis would be rejected with 95% confidence.
	// A < 5; 5 < B < 10; 10 < C < 20; I > 20
	if(probability > 0.05) {
		var angleSet = 5;
		var vAngle = module.CTMD.vMake(R, K, angleSet);
		var probability = module.CTMD.findProbability(vAngle, simulatedWatson);
		if(probability <= 0.05) {
			var classification = 'A'; //Rejected at 5 degrees with 95% confidence
		} else {
			var angleSet = 10;
			var vAngle = module.CTMD.vMake(R, K, angleSet);
			var probability = module.CTMD.findProbability(vAngle, simulatedWatson);
			if(probability <= 0.05) {
				var classification = 'B';
			} else {
				var angleSet = 20;
				var vAngle = module.CTMD.vMake(R, K, angleSet);
				var probability = module.CTMD.findProbability(vAngle, simulatedWatson);
				if(probability <= 0.05) {
					var classification = 'C';
				} else {
					var classification = 'Indeterminate';
				}
			}
		}
	} else {
		var classification = 'Negative';
	}
	
	return {
		'classification': classification, 
		'gc': criticalAngle, 
		'G' : angleBetween, 
		'probability': probability, 
		'type': type
	};
}

/* FUNCTION module.CTMD.vMake
 * Description: Calculates the V statistics if mean directions were angle apart
 * Input: R@array, kappa@array, and angle@float
 * OUTPUT: watson parameter
 */
module.CTMD.vMake = function (R, kappa, setAngle) {
	 
	"use strict";
		
	var setAngle = setAngle*rad;
	 
	//Create Cartesian coordinates for two vectors with angle between them
	var xVector = [0, Math.sin(setAngle)];
	var yVector = [0, 0];
	var zVector = [1, Math.cos(setAngle)];
	 
	//Format data for the findWatsonParam routine
	var watsonAngle = new Array();
	for(var i = 0; i < 2; i++) {
		watsonAngle.push({
			'k': kappa[i], 
			'R': R[i], 
			'xMean': xVector[i], 
			'yMean': yVector[i], 
			'zMean': zVector[i]
		});
	};
	
	return module.CTMD.findWatsonParam(watsonAngle);
}



/* FUNCTION module.CTMD.resmonte
 * Description: Calculates the critical angle based on the critical Watson parameter
 * INPUT: 95% confidence bound of Watson parameter, R and k for particular set
 * OUTPUT: Critical angle (criticalAngle)
 */
module.CTMD.resmonte = function (v95, R, k) {

	"use strict";
	
	//Weighed sum
	var Sw = k[0]*R[0] + k[1]*R[1];
	
	//McFadden and McElhinny (1990) (equation: 18)
	var Rwc = (Sw - 0.5 * v95);
	
	//McFadden and McElhinny (1990) (equation: 19)
	var A = (((Rwc*Rwc) - (Math.pow(k[0]*R[0], 2)) - (Math.pow(k[1]*R[1], 2))) / (2 * k[0]*R[0] * k[1]*R[1]));

	//Check floating point numbers
	if(A <= -0.9999) {
		console.log('Solution is not resolvable.');
		return 0;
	} else if(A > 1) {
		A = 1;
	}
		
	//Convert to critical angle
	return Math.acos(A)/rad;
	
}

/* FUNCTION module.CTMD.findProbability
 * Description: finds the probability that the critical Watson parameter falls within the simulated values
 * Input: Watson parameter dataWatson
 * Output: Probability from 0 - 1
 */
module.CTMD.findProbability = function (dataWatson, simulatedWatson) {

	"use strict";
	
	//is dataWatson smaller than the all 2500 sampled Watson parameters? Then the probability is 1.
	if( dataWatson <= simulatedWatson.parameters[0] ) {
		return 1;
	}

	//Loop through all sampled Watson parameters and find the index where out Watson parameter is larger than the test values
	//This index will help us calculated the probability.
	var length = simulatedWatson.parameters.length;
	for( var i = 0; i < length; i++ ) {
		if( dataWatson <= simulatedWatson.parameters[i] ) {
			return ( 1 - ((i)/(length-1)) );
		}
	}
	//Unfound: probability is 0.
	return 0; 
}

/* Function: module.CTMD.sampleWatson
 * Description: Calculates 2500 Watson parameters and 95%/99% confidence intervals
 * INPUT: For M sites number of samples (N) and dispersion parameter (k)
 * OUTPUT: Array of Watson parameters and 95/99% confidence values
 **/
module.CTMD.sampleWatson = function (NI, KI) {

	"use strict";
	
	//Bucket to capture Watson parameters and number of samples
	var nSimulations = 2500;
	var WatsonParams = new Array();
	
	for(var i = 0; i < nSimulations; i++) {
	
		//Monte Carlo sampling of directions with (N, k) and calculation of Watson parameter for the simulated data set
		var sampleParams = module.CTMD.pick(NI, KI);
		var WatsonV = module.CTMD.findWatsonParam(sampleParams);
		
		//Save the Watson parameter for this simulation
		WatsonParams.push(WatsonV);
	}

	//Sort all Watson parameters low to high; this will give us the confidence interval
	WatsonParams.sort(function (a, b) {
		return a > b ? 1 : a < b ? -1 : 0;
	});

	//Return the parameter array and the 99% and 95% confidence bound respectively
	//These are the critical Watson parameters at the specified confidence limits
	var conf99 = parseInt(0.99*nSimulations);
	var conf95 = parseInt(0.95*nSimulations);

	return { 'parameters': WatsonParams, 'v99': WatsonParams[conf99], 'v95': WatsonParams[conf95] };

}

/* FUNCTION module.CTMD.findWatsonParam
 * Description: Calculates the Watson parameter (Lisa Tauxe, Appendix C.2.1 Calculation of Watson's Vw)
 * Input: sample parameters containing mean Cartesian coordinates, kappa, and R
 * Output: Watson parameter Vw
 */
module.CTMD.findWatsonParam = function (sampleParams) {

	"use strict";
	
	//Notation after Lisa Tauxe, Appendix C.2.1
	var Sw = 0; 
	var X1 = 0;
    var X2 = 0;
    var X3 = 0;
	
	//Weighed sum
    for(var i = 0; i < 2; i++) {
		Sw += sampleParams[i].k * sampleParams[i].R;
		X1 += sampleParams[i].k * sampleParams[i].R * sampleParams[i].xMean;
		X2 += sampleParams[i].k * sampleParams[i].R * sampleParams[i].yMean;
		X3 += sampleParams[i].k * sampleParams[i].R * sampleParams[i].zMean;
    }
    
	//Weighed overall resultant vector
	var Rw = Math.sqrt( X1*X1 + X2*X2 + X3*X3 );
    var watsonParameter = 2*(Sw-Rw);

	return watsonParameter;
	 
}

/* 
 * FUNCTION module.CTMD.pick
 * Description: Get a random set of N directions from distribution with dispersion parameter kappa
 * Input: N, K
 * Output: 
 */
module.CTMD.pick = function (N, K) {

	"use strict";
	
	var means = new Array();
	
	//For both directions
	for(var i = 0; i < 2; i++) {
		
		//Randomly sample a (N, kappa) distribution
		var sampledParameters = sampleFisher(N[i], K[i]); 		
	
		//Custom function to calculate some Fisher parameters in addition to mean Cartesian coordinates
		means.push(module.CTMD.mean(N[i], sampledParameters)); 
	}
	
	return means;
}

/* FUNCTION module.CTMD.mean
 * Description: Custom function to calculate mean Cartesian coordinates, R, and kappa
 * Input: N (Number of samples), coords (array containing N Cartesian coordinate sets)
 * Output: Object containing Mean Cartesian coordinates, R, and kappa
 */
module.CTMD.mean = function (N, coords) {

	"use strict";
	
	var xSum = 0;
	var ySum = 0;
	var zSum = 0;
	
	for(var i = 0; i < N; i++) {
		xSum += coords.x[i];
		ySum += coords.y[i];
		zSum += coords.z[i];
	}
	
	//Calculate resultant vector length and mean vector
	var R = Math.sqrt(xSum*xSum + ySum*ySum + zSum*zSum)
	var xMean = xSum/R;
	var yMean = ySum/R;
	var zMean = zSum/R;
	
	//If single N, set kappa to 0
	var kappa = (N === 1) ? 0 : (N - 1)/(N - R);
	
	return {
		'xMean': xMean, 
		'yMean': yMean, 
		'zMean': zMean, 
		'R' : R, 
		'k': kappa
	};
}
