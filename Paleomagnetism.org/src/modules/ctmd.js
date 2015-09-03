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
	
	//Number of boostraps
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
		
		/* Testing for eigenvector approach (5000 bootstraps takes ~ 2seconds)
		//Bucket for Cartesian coordinates
		var coords = new Array();
		for(var j = 0; j<sampledTwo.length; j++){
			coords.push(cart(sampledTwo[j][0], sampledTwo[j][1]));
		}
		var T = TMatrix(coords);
		var s = numeric.eig(T);
		*/
		
		//Get simple Fisher means for both sites
		var fisherOne = new fisher(sampledOne, 'dir', 'simple');
		var fisherTwo = new fisher(sampledTwo, 'dir', 'simple');
		
		//Flip Fisher means to normal polarity if reversal
		//If the difference between the means is more than 120 in declination or 60 in inclination -
		//it is probably a reversal. Otherwise, we might be near the equator with mixed rev/norm polarities
		//Perhaps it is better to use an eigenvector approach instead
		if(Math.abs(fisherOne.mDec - fisherTwo.mDec) > 120 || Math.abs(fisherOne.mInc - fisherTwo.mInc) > 60) {
			if(fisherOne.mInc < 0) {
				fisherOne.mInc = Math.abs(fisherOne.mInc);
				fisherOne.mDec = (fisherOne.mDec+180)%360;
			}
			if(fisherTwo.mInc < 0) {
				fisherTwo.mInc = Math.abs(fisherTwo.mInc);
				fisherTwo.mDec = (fisherTwo.mDec+180)%360;
			}
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
	console.log(coordinates);
	
	//Capture progress bar element
	module.CTMD.bar = $("#CTMDBar");
	
	//Check whether user wants to compare VGP positions or directions
	var VGPFlag = $('#VGPFlag').prop('checked');
	
	//Number of permutations (triangular number: http://en.wikipedia.org/wiki/Triangular_number)
	var length = (siteName.length-1);
	var permutations = (length*(length+1)/2);
	var data = [];

	//Initial timing parameter
	module.CTMD.timeInit = Date.now();

	//We need to consider all possible permutations
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
		//When j reaches N -> increment i, otherwise increment j
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

/* Monte-Carlo Simulated CTMD
 * Description: uses Monte Carlo sampling to randomly draw a new set of directions from (N, k) and calculates Watson parameters
 * Input: Arrays of N, R, and k for two particular sets, including x, y, and z coordinates
 *
 * This subroutine works as follows:
 * 1. Calculation of 2500 Watson parameters (Wv) from 2500 Monte-Carlo sampled (N, k) distributions for the directions to be compared
 * 2. Sort the 2500 Watson parameters; The 0.95*2500th Watson parameter becomes the critical Watson parameter; on this parameter we can test the null hypothesis
 * 3. The null hypothesis is tested to see if the Watson parameter for our actual data set falls below the critical Watson parameter
 *
 * If the Watson parameter of our data set falls within the determined critical value, the null hypothesis is rejected.
 */
module.CTMD.monte = function (N, R, K, X, Y, Z) {
	
	"use strict";
		
	//Type is always Monte Carlo simulation
	var type = 'Monte Carlo (simulated)';
	
	//Get 2500 values for the Watson parameter (Wv) for 2500 sets of directions
	//Distributions are (N1, K1) and (N2, K2)
	var simulatedWatson = module.CTMD.sampleWatson(N, K);
	
	//Dot product between the two vectors
	var dot = X[0]*X[1] + Y[0]*Y[1] + Z[0]*Z[1];
	if(dot < 0) {
		X[1] = -X[1]
		Y[1] = -Y[1]
		Z[1] = -Z[1]
	} else if(dot > 1) {
		dot = 1;
	}
	
	//Angle between the set of two directions
	var theta = Math.acos(Math.abs(dot));
	var angleBetween = theta/rad;
	
	//Format directional data for the subroutines
	var watsonData = [];
	for(var i = 0; i < 2; i++) {
		watsonData.push({
			'k': K[i], 
			'R': R[i], 
			'mX': X[i], 
			'mY': Y[i], 
			'mZ': Z[i]
		});
	};

	//Get the Watson parameter for the actual data set (V0)
	var dataWatson = module.CTMD.findWatsonParam(watsonData);
	
	//Looks through simulated Watson parameters to find the Monte Carlo probability of observing a value that exceeds V.
	var probability = module.CTMD.findProbability(dataWatson, simulatedWatson)
	
	//Get the critical angle from the critical Watson parameter
	var criticalAngle = module.CTMD.resmonte(simulatedWatson.v95, R, K)
	
	//Classification according to McFadden and McElhinny (1990)
	//Finds probability that an angle exceeds the critical angle
	//Taken from the CTMD.f95 routine
	if(probability > 0.05) {
		var angle = 5;
		var vAngle = module.CTMD.vMake(R, K, angle);
		var probability = module.CTMD.findProbability(vAngle, simulatedWatson);
		if(probability <= 0.05) {
			var classification = 'A';
		} else {
			var angle = 10;
			var vAngle = module.CTMD.vMake(R, K, angle);
			var probability = module.CTMD.findProbability(vAngle, simulatedWatson);
			if(probability <= 0.05) {
				var classification = 'B';
			} else {
				var angle = 20;
				var vAngle = module.CTMD.vMake(R, K, angle);
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
 * Input: R, k, and angle
 * OUTPUT: watson parameter
 */
module.CTMD.vMake = function (R, K, angle) {
	 
	"use strict";
		
	var angle = angle*rad;
	 
	//Create Cartesian coordinates for two vectors with angle between them
	var X = [0, Math.sin(angle)];
	var Y = [0, 0];
	var Z = [1, Math.cos(angle)];
	 
	var watsonAngle = new Array();
	 
	for(var i = 0; i < 2; i++) {
		watsonAngle.push({
			'k': K[i], 
			'R': R[i], 
			'mX': X[i], 
			'mY': Y[i], 
			'mZ': Z[i]
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

	//Check
	if(A <= -0.9999) {
		console.log('Solution is not resolvable.');
		return 0;
	} else {
	
		if(A > 1) {
			A = 1;
		}
		
		//Convert to critical angle
		return Math.acos(A)/rad;
	}
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
	
	return 0; //Unfound: probability is 0.

}

/* Function: module.CTMD.sampleWatson
 * Description: Calculates 2500 Watson parameters and 95%/99% confidence intervals
 * INPUT: For M sites number of samples (N) and dispersion parameter (k)
 * OUTPUT: Array of Watson parameters and 95/99% confidence values
 **/
module.CTMD.sampleWatson = function (NI, KI) {

	"use strict";
	
	//Bucket to capture Watson parameters and number of samples
	var nSamples = 2500;
	var WatsonParams = new Array();
	
	for(var i = 0; i < nSamples; i++) {
	
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
	//These are the critical Watson parameters
	var conf99 = parseInt(0.99*nSamples);
	var conf95 = parseInt(0.95*nSamples);

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
		X1 += sampleParams[i].k * sampleParams[i].R * sampleParams[i].mX;
		X2 += sampleParams[i].k * sampleParams[i].R * sampleParams[i].mY;
		X3 += sampleParams[i].k * sampleParams[i].R * sampleParams[i].mZ;
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
		var sampledParameters = sample(N[i], K[i]); 		
	
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
		'mX': xMean, 
		'mY': yMean, 
		'mZ': zMean, 
		'R' : R, 
		'k': kappa
	};
}