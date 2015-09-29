/* PALEOMAGNETISM.ORG CORE FUNCTIONS
 * 
 * VERSION: ALPHA.1508
 * LAST UPDATED: 08/05/2015
 *
 * JavaScript file containing core functions for the Paleomagnetism.org applications.
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */
 
//Constant definition
rad = (Math.PI / 180);
	
/* FUNCTION pseudoDirection
 * Draw a single direction from a Fisherian distribution around 0, 90 with dispersion k
 * Input: dispersion parameter Kappa
 * Output: pseudo-random generated declination, inclination pairs
 */
var pseudoDirection = function (k) {

	"use strict";
	
	//Get a random declination (0 inclusive; 1 exclusive)
	var dec = 360*Math.random();
	
	//Get a random inclination
	var L = Math.exp(-2*k);
	var a = (Math.random()*(1-L)+L);
	var fac = Math.sqrt((-Math.log(a))/(2*k));
	var inc = 90 - (2*Math.asin(fac))/rad;
	
	return { 'dec': dec, 'inc': inc };

}

/* FUNCTION sample
 * Description: Draws N random samples with disperion parameter kappa (k)
 * Input: number of samples (N) with dispersion parameter kappa (k)
 * Output: Arrays of Cartesian coordinates and directions {x[], y[], z[], dec[], and inc[]}
 */
var sample = function (N, k) {

	"use strict";
	
	//Data buckets
	var xCoordinate = new Array();
	var yCoordinate = new Array();
	var zCoordinate = new Array();
	var dec = new Array();
	var inc = new Array();
	
	//Draw N pseudo-random samples
	for(var i = 0; i < N; i++) {
		var randomDirection = pseudoDirection(k);
		dec.push(randomDirection.dec);
		inc.push(randomDirection.inc);

		//Get the Cartesian coordinates
		var cartesianCoords = cart(randomDirection.dec, randomDirection.inc);
		xCoordinate.push(cartesianCoords.x);
		yCoordinate.push(cartesianCoords.y);
		zCoordinate.push(cartesianCoords.z);
	}
	
	return {
		'x': xCoordinate, 
		'y': yCoordinate, 
		'z': zCoordinate, 
		'dec': dec, 
		'inc': inc 
	};
}

/* FUNCTION TMatrix
 * Description: creates the orientation matrix from the data block
 * Input: data array
 * Output: formatted orientation matrix T
 */
var TMatrix = function ( data ) {
	
	"use strict";
	
	var T = [[0,0,0],[0,0,0],[0,0,0]];
	
	for(var i = 0; i<data.length; i++) {
		var coords = [data[i].x, data[i].y, data[i].z];
		for(var k = 0; k<3; k++) {
			for(var l = 0; l<3; l++) {
				T[k][l] += coords[k]*coords[l]
			}	
		}
	}
	return T;
}

/* 
 * FUNCTION eigValues
 * Description: creates orientation matrix T and calculates eigenvalues
 * Input: data array
 * Output: eigenvalues
 */
var eigValues = function ( data ) {
	
	"use strict";
	
	//Bucket for Cartesian coordinates
	var coords = new Array();
	for(var i = 0; i<data.length; i++){
		coords.push(cart(data[i][0], data[i][1]));
	}
	
	//Construct the orientation matrix and return eigenvalues for the orientation matrix
	return new eigenvalues(TMatrix(coords));
	
}

/* FUNCTION eigenvalues
 * Description: calculates eigenvalues
 * Input: orientation matrix [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]]
 * Output: values of the eigenvectors of the system
 */
var eigenvalues = function ( T ) {
	
	"use strict";
	
	// Algorithm to find eigenvalues of a symmetric, real matrix.
	// We need to compute the eigenvalues for many (> 100.000) real, symmetric matrices (Orientation Matrix T). Calling available libraries (Numeric.js) is much slower so we implement this algorithm instead.
	// Publication: O.K. Smith, Eigenvalues of a symmetric 3 × 3 matrix - Communications of the ACM (1961)
	// See https://en.wikipedia.org/wiki/Eigenvalue_algorithm#3.C3.973_matrices
	
	
	//Calculate the trace of the orientation matrix
	//3m is equal to the trace
	var m = (T[0][0]+T[1][1]+T[2][2])/3;
	
	//Calculate the sum of squares
	var p1 = Math.pow(T[0][1], 2) + Math.pow(T[0][2], 2) + Math.pow(T[1][2], 2);	
	var p2 = Math.pow((T[0][0] - m), 2) + Math.pow((T[1][1] - m), 2) + Math.pow((T[2][2] - m), 2) + 2*p1;
	
	//6p is equal to the sum of squares of elements
	var p = Math.sqrt(p2/6);
	
	//Identity Matrix I and empty storage matrix B
	var B = [[0,0,0],[0,0,0],[0,0,0]];
	var I = [[1,0,0],[0,1,0],[0,0,1]];
	
	for (var i = 0; i < 3; i++ ) {
		for (var k = 0; k < 3; k++) {
			B[i][k] = (1/p) * (T[i][k]-m * I[i][k]);
		}
		
	}

	//Half determinant of matrix B.
	var r = 0.5*numeric.det(B);
	
	var phi = 0;	
	if(r <= -1) {
		phi = Math.PI / 3;
	} else if(r >= 1) {
		phi = 0;
	} else {
		phi = Math.acos(r) / 3;
	}
	
	//Calculate the three eigenvalues
	var eig1 = m + 2 * p * Math.cos(phi);
	var eig3 = m + 2 * p * Math.cos(phi + (2*Math.PI/3));
	var eig2 = 3 * m - eig1 - eig3;
	
	//Normalize eigenvalues and return
	var tr = eig1 + eig2 + eig3;
	
	this.t = eig1/tr;
	this.s = eig2/tr;
	this.r = eig3/tr;

}

/* FUNCTION pseudo
 * Description: randomly samples a set of directions N times where N is the set length
 * Input: User input array of data [ [dec, inc, bed, bed dip, name], ... ]
 * Output: Random array of data [ [dec, inc, bed, bed dip, name], ... ]
 */
var pseudo = function ( data ) {

	"use strict";
	
	var length = data.length	
	var sampled = new Array();

	for(var i = 0; i < length; i++) {
		var index = Math.floor(Math.random() * length); //Returns a random number between 0 and N.
		sampled.push(data[index]);
	}

	return sampled;
}

/* FUNCTION angle
 * Description: calculates the angle between two vectors using the dot product
 * Input: vector1Dec, vector1Inc, vector2Dec, vector2Inc
 * Output: angle between vectors
 */
var angle = function(decOne, incOne, decTwo, incTwo) {

	"use strict";

	//Find the Cartesian coordinates of both directions
	var A = cart(decOne, incOne);
	var B = cart(decTwo, incTwo);

	//Dot product to find angle (https://en.wikipedia.org/wiki/Dot_product#Geometric)
	//vector norms ||A|| ||B|| are equal to 1 so the equation reduces to: A·B = cos(theta)
	var theta = Math.acos(A.x*B.x+A.y*B.y+A.z*B.z)/rad
	return theta

}

/* FUNCTION rotat
 * Description: rotates directions 
 * Input: Vector str/he that will be rotated to face up and directions to be rotated
 * Output: rotated directions
 */
var rotat = function(str, he, data){

	"use strict";
	
	//Return if he is 90, meaning the vector is already pointing up. 
	//Do no rotation to save some precious, precious processing time.
	if(he === 90) {
		return data;
	}
	
	var dec = data[0];
	var inc = data[1];
	
	//This function rotates vectors in the data block where str/he is the dec/inc for a vector that will face up
	//We take the declination of the mean VGP and rotate all CCW vectors by this angle.
	//Then we correct for the inclination by applying a rotation matrix.
	//Lastly, we rotate back over the same declination angle.
	//Alternatively, we could apply a single rotation about an "arbitrary" axis, but this method is easier to follow!
	//See Lisa Tauxe, book: Sections: 9.3 + A.13

	var theta = str*rad; //angle with North is equal to the declination of the mean vector.
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
	var v = [coords.x, coords.y , coords.z];

		//v' (v_prime) becomes the coordinate vector after rotation.
		var vP = [0,0,0];

		for(var j=0;j<3;j++){
			for(var k=0;k<3;k++){ 
				vP[j] = vP[j] + R[j][k]*v[k]; //V'j = Rjk*Vk (sum over k);
			}
		}

	//Find new direction from the rotated Cartesian coordinates.
	var temp = dir(vP[0],vP[1],vP[2]);

	//Similarily to the first step, as the final step we rotate the directions back to their initial declinations.
	//Keep declination within bounds (0 - 360).
	temp.dec = (temp.dec + str)%360;
	
	return [temp.dec, temp.inc, data[2], data[3], data[4]];
}

/* FUNCTION butler
 * Description: calculates statistical Butler parameters
 * Input: paleolatitude@float, A95@float, inclination@float
 * Output: Butler parameters (dDx, dIx)
 */
var butler = function(palat, A95, inc) {
	
	"use strict";
	
	var A95 = A95*rad;
	var palat = palat*rad;
	var inc = inc*rad;
	
	//The errors are functions of paleolatitude - at the poles the declination will become ill-defined
	var dDx = Math.asin(Math.sin(A95)/Math.cos(palat))/rad;
	var dIx = (2*A95/(1+3*Math.pow(Math.sin(palat),2)))/rad;
	
	//Calculate the minimum and maximum Paleolatitude from the error on the inclination
	var maxPalat = Math.atan(0.5*Math.tan(inc + dIx*rad))/rad;
	var minPalat = Math.atan(0.5*Math.tan(inc - dIx*rad))/rad;
	
	return {'dDx': dDx, 'dIx': dIx, 'minPalat': minPalat, 'maxPalat': maxPalat}
};

/* FUNCTION diPalat
 * Description: calculates paleolatitude from inclination (dipole formula)
 * Input: Inclination (-90 to 90)
 * Output: Paleolatitude (-90 to 90)
 */
var diPalat = function(inc) {
	
	"use strict";
	
	var paleolatitude = Math.atan(Math.tan(inc*rad)/2)/rad;
	
	return paleolatitude;
}

/* FUNCTION fisher (constructor)
 * Description: calculates fisher parameters for a given data set
 * Input: data@array, type@string (dir or VGP), flag@string (simple or full)
 * Output: fisher parameters
 */
var fisher = function(data, type, flag) {

	"use strict";
	
	var N = data.length;
	
	//Calculate the sum of Cartesian coordinates for all vectors
	var xSum = 0, ySum = 0, zSum = 0;
	for(var i = 0; i < data.length; i++) {
	
		var cartesianCoords = cart(data[i][0], data[i][1]);
		xSum += cartesianCoords.x
		ySum += cartesianCoords.y
		zSum += cartesianCoords.z
	}
	
	//Lisa Tauxe, Figure 11.4
	//R is the resultant vector length of the summed vectors
	var R = dir(xSum,ySum,zSum).R;

	//Calculate the mean direction in Cartesian coordinates
	var xAv = xSum/R;
	var yAv = ySum/R;
	var zAv = zSum/R;

	//Get the new mean direction 
	var direction = dir(xAv, yAv, zAv);
	var decAv = direction.dec;
	var incAv = direction.inc;

	//If we are only interested in mean directions return immediately (flag = simple)
	if(flag == 'simple') {
		if(type == 'dir') {
			return {
				'mDec' : decAv, 
				'mInc' : incAv
			};
		}
		else if(type == 'vgp') {
			return {
				'mLon' : decAv, 
				'mLat' : incAv
			};
		}
	}
	
	//Other statistical parameters
	//Dispersion parameter, Lisa Tauxe, 11.8
	var k = (N-1)/(N-R);

	//Calculate confidence parameter - 95% interval
	//Lisa Tauxe, 11.9
	var confidence = 95; 
	var p = 0.01*(100-confidence);
	var a95 = Math.acos(1-(Math.pow((1/p), (1/(N-1))) - 1)*(N-R)/R)/rad; 

	//Construct object with parameters
	//Seperately for VGPs and directions
	this.N = N;
	
	//Put methods for the average declination, inclination (longitude, latitude)
	if(type === 'dir') {
		this.mDec = decAv;
		this.mInc = incAv;
	} else if(type == 'vgp') {
		this.mLon = decAv;
		this.mLat = incAv;
	}

	//Statistical parameters for directions.
	if(type === 'dir') {
		this.a95 = a95;
		this.k = k;
		this.palat = diPalat(this.mInc);
		this.R = R;
	}
	
	//Statistical parameters for VGPs.
	else if(type === 'vgp'){

		//Statistical praameters
		this.A95 = a95;
		this.K = k;
		this.VGPR = R;
		
		//Minimum and maximum boundaries for A95 to quantify PSV sampling 
		//See (Deenen et al., 2011);
		this.A95min = 12*Math.pow(N,-0.40);
		this.A95max = 82*Math.pow(N,-0.63);
	}
}

/* FUNCTION cart
 * Description: calculates Cartesian coordinates for direction
 * We use the following coordinate system (Lisa Tauxe, eq. 2.13):
 * +z facing down and -z facing up
 *       x
 *       |
 * -y ---+--- +y
 *       |
 *      -x
 * Input: Declination@float, Inclination@float, Intensity@float
 * Output: Vector containing x, y, z coordinates
 */
var cart = function(dec, inc, intensity) {

	//If the intensity is undefined, implicitly assume unit weight
	if(intensity === undefined) {
		var intensity = 1;
	}

	//Calculate Cartesian coordinates
	var coordinates = {
		'x': intensity * (Math.cos(dec*rad)*Math.cos(inc*rad)),
		'y': intensity * (Math.sin(dec*rad)*Math.cos(inc*rad)),
		'z': intensity * (Math.sin(inc*rad))
	};

	return coordinates;
}

/* FUNCTION dir
 * Description: calculates direction from Cartesian coordinates (x, y, z)
 * Input: Cartesian Coordinates (x, y, z)
 * Output: Vector containing declination, inclination, and R (intensity)
 */
var dir = function(x, y, z) {

	"use strict";
	
	//Use Pythagorean Theorem to find R
	//Use atan2 to find appropriate quadrant.
	var R = Math.sqrt(Math.pow(x, 2) + Math.pow(y, 2) + Math.pow(z, 2)); 
	var dec = (360 + (Math.atan2(y, x)/rad))%360; 
	var inc = Math.asin(z/R)/rad;
	
	var directionObject = {
		'dec': dec,
		'inc': inc,
		'R': R
	}
	
	return directionObject;
}

/* FUNCTION
 * Description: Calculates declination and inclination for given site location from pole position
 *            : http://en.wikipedia.org/wiki/Spherical_law_of_cosines
 * Input: site Latitude, Longitude, data
 * Output: Declination and Inclination associated with site
 */
function invPoles(siteLat, siteLong, data) {

	"use strict";
	
	//Our pole positions are kept  in the data block at positions 0 and 1
	var poleLong = data[0]
	var poleLat = data[1];

	//Get some standard variables
	var sinlats = Math.sin(rad * siteLat);
	var coslats = Math.cos(rad * siteLat);
	var sinlatp = Math.sin(rad * poleLat);
	var coslatp = Math.cos(rad * poleLat);
	
	var cosp = sinlatp * sinlats + coslatp * coslats * Math.cos(rad * (poleLong - siteLong));
	var sinp = Math.sqrt(1 - cosp * cosp);
	
	var dec = (Math.acos((sinlatp - sinlats * cosp) / (coslats * sinp)))/rad
	
	if(poleLong > siteLong && (poleLong - siteLong) > 180) {
		dec = 360 - dec;
	}
	if(poleLong < siteLong && (siteLong - poleLong) < 180) {
		dec = 360 - dec;
	}
	
	//Right quadrant
	var inc = Math.atan2(2 * cosp, sinp)/rad;
	
	return [dec, inc, data[2], data[3], data[4]];

}


/* FUNCTION poles
 * Description: finds the VGP positions for particular site latitude/longitude and a given pair of declination/inclination.
 * 			  : routine implemented from Pal_45_s.f95
 * Input: site Latitude/Longitude and data
 * Output: Calculated virtual geomagnetic pole latitude and longitude
 */
function poles(slat, slong, data) {

	var dec = data[0];
	var inc = data[1];
	
	//Make sure inclination is not 90
	if(inc == 90) {
		inc = 89.99;
	}
	
	var p = 0.5 * Math.PI - Math.atan(0.5 * Math.tan(rad*inc));
	var plat = Math.asin(Math.sin(rad*slat) * Math.cos(p) + Math.cos(rad*slat) * Math.sin(p) * Math.cos(rad*dec))
	var beta = Math.asin(Math.sin(p) * Math.sin(rad*dec) / Math.cos(plat));

	if((Math.cos(p) - Math.sin(plat) * Math.sin(rad*slat)) < 0) {
		var plong = rad*slong - beta + Math.PI
	} else {
		if(isNaN(beta)) {
			beta = 0;
		}
		var plong = rad*slong + beta
	}
	
	plat = plat/rad;
	plong = plong/rad;

	if(plong < 0){
		plong = plong + 360;
	}
	
	return [plong, plat, data[2], data[3], data[4]];

}

/* FUNCTION eqArea
 * Description: calculates projected inclination from actual inclination
 *            : this function was given a poor name with the introduction of an equal angle transformation
 *            : it returns either the projected equal angle or equal area inclination based on the projection flag
 * Input: Inclination
 * Output: Projected Inclination
 */
function eqArea(inc) {

	//Get the absolute inclination
	inc = Math.abs(inc);
	
	//Get the projection flag
	var projFlag = $('#projFlag').prop('checked');

	//Undefined for other portals 
	if(!projFlag || projFlag === undefined) {
		//Equal area projection
		return (90-(Math.sqrt(2)*90*Math.sin(Math.PI*(90-inc)/(360)))); 
	} else {
		//Equal angle projection
		return 90-(90*Math.tan(Math.PI*(90-inc)/(360))); 
	}
	
}

/* FUNCTION sortEig
 * Description: sorts eigenvalues and corresponding eigenvectors from highest to lowest 
 * Input: numeric.js.eig output
 * Output: tau Array containing [t1, t2, t3] and sorted eigenvectors v1, v2, v3 from high to low
 */
var sortEig = function (eig) {

	//Eigenvector and values
	var V = new Array();
	var tau = new Array();
	
	/* Algorithm to sort eigenvalues and corresponding eigenvectors */
	/* as taken from the PmagPY library */
	var t1 = 0;
	var t2 = 0;
	var t3 = 1;
	var ind1 = 0;
	var ind2 = 1;
	var ind3 = 2;
	
	//Determine what eigenvalues are largest and smallest
	for(var i = 0; i < 3; i++) {
		if(eig.lambda.x[i] > t1) {
			t1 = eig.lambda.x[i];
			ind1 = i;
		}
		if(eig.lambda.x[i] < t3) {
			t3 = eig.lambda.x[i];
			ind3 = i;
		}
	}
	
	for( var i = 0; i < 3; i++) {
		if(eig.lambda.x[i] != t1 && eig.lambda.x[i] != t3) {
			t2 = eig.lambda.x[i];
			ind2 = i;
		}
	}
	
	// Sort eigenvectors
	// We need to sort the columns and not rows so slightly interesting shuffle
	V.push([
		eig.E.x[0][ind1], eig.E.x[0][ind2], eig.E.x[0][ind3]], 
		[eig.E.x[1][ind1], eig.E.x[1][ind2], eig.E.x[1][ind3]], 
		[eig.E.x[2][ind1], eig.E.x[2][ind2], eig.E.x[2][ind3]
	]);
	
	//Collect first, second, and third eigenvalue [t1, t2, t3]
	tau.push(t1, t2, t3);

	//Eigenvectors
	var v1 = [V[0][0], V[1][0], V[2][0]]; 
	var v2 = [V[0][1], V[1][1], V[2][1]]; 
	var v3 = [V[0][2], V[1][2], V[2][2]];
	
	var sortedObj = {
		'v1': v1,
		'v2': v2,
		'v3': v3,
		'tau': tau
	}
	
	return sortedObj;
}

/* FUNCTION getKentParametersNew
 * Method as described in Lisa Tauxe Book (not working properly; don't use this - use the PmagPY implementation instead)
 * Input: data block (declination, inclination) pairs
 * Output: Kent Parameters
 */
 var getKentParametersNew = function ( data ) {
 
 	//Get the Fisher parameters of our data
	var fisherParameters = new fisher(data, 'dir', 'full');
	
	//Get Cartesian coordinates of data
	X = new Array();	
	for(var i = 0; i < data.length; i++) {
		X.push(cart(data[i][0], data[i][1]));
	}
	
	//Format the orientation matrix
	//Lisa Tauxe, 2004 (A.15 - A.17)
	var T = TMatrix(X);
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			T[i][j] = T[i][j]/X.length;
		}
	}
	
	//Get the sorted eigenvalues/vectors
	var eig = sortEig(numeric.eig(T));
	
	//Calculate g (equation C.3)
	var g = -2*Math.log(0.05)/(data.length*Math.pow(fisherParameters.R/data.length, 2));

	var kentParameters = new Object();	

	//Calculate zeta and eta (C.3)
	//Our eigenvalues are an approximation of sigma
	kentParameters['eta'] 	= Math.asin(Math.sqrt(eig.tau[2]*g))/rad;
	kentParameters['zeta'] 	= Math.asin(Math.sqrt(eig.tau[1]*g))/rad;
	
	//Calculate the directions of the semi-angles
	kentParameters['zDec'] 	= Math.atan(eig.v2[1]/eig.v2[0])/rad;
	kentParameters['zInc'] 	= Math.asin(eig.v2[2])/rad;
	kentParameters['eDec'] 	= Math.atan(eig.v3[1]/eig.v3[0])/rad;
	kentParameters['eInc'] 	= Math.asin(eig.v3[2])/rad;
	
	if(kentParameters['zInc'] < 0) {
		kentParameters['zInc'] = -kentParameters['zInc'];
		kentParameters['zDec'] = (kentParameters['zDec']+180)%360;
	}
	
	if(kentParameters['eInc'] < 0) {
		kentParameters['eInc'] = -kentParameters['eInc'];
		kentParameters['eDec'] = (kentParameters['eDec']+180)%360;
	}
	
	return { 'kentParameters': kentParameters };
 }
 
/*
 * FUNCTION getKentParameters
 * Description: calculates Kent parameters (Kent, 1982; The Fisher–Bingham distribution on the sphere)
 *			  : as implemented after the PmagPY Library (https://github.com/ltauxe/PmagPy/blob/master/eqarea_ell.py)
 *            : all rights go out to the PmagPY contributors!
 * Input: data
 * Output: Object containing Kent parameters
*/
var getKentParameters = function ( data ) {
	
	//Get the Fisher parameters of our data
	var fisherParameters = new fisher(data, 'dir', 'full');
	pBar = fisherParameters.mDec*rad;
	tBar = (90 - fisherParameters.mInc)*rad;
	
	//Set up matrices
	w = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
	b = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
	gam = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
	xg = new Array();
	
	//set up rotation Matrix H
	H = [[Math.cos(tBar) * Math.cos(pBar), - Math.sin(pBar), Math.sin(tBar)*Math.cos(pBar)],
		[Math.cos(tBar) * Math.sin(pBar), Math.cos(pBar), Math.sin(pBar)*Math.sin(tBar)],
		[-Math.sin(tBar), 0, Math.cos(tBar)]];

	//Get Cartesian coordinates of data
	X = new Array();
	P = new Array();
	for(var i = 0; i < data.length; i++) {
		X.push(cart(data[i][0], data[i][1]));
		P.push([X[i].x, X[i].y, X[i].z]);
	}
	
	//Format the orientation matrix
	//Lisa Tauxe, 2004 (A.15 - A.17)
	var T = TMatrix(X);
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			T[i][j] = T[i][j]/X.length;
		}
	}
	
	//Compute B=H'TH
	//(TH)
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			for(var k = 0; k < 3; k++) {
				w[i][j] += T[i][k]*H[k][j];
			}
		}
	}
	
	//H'(TH)
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			for(var k = 0; k < 3; k++) {
				b[i][j] += H[k][i]*w[k][j];
			}
		}
	}

	//Choose a rotation w about North pole to diagonalize upper part of B
	var psi = 0.5*Math.atan(2*b[0][1]/(b[0][0]-b[1][1]));
	w = [[Math.cos(psi), -Math.sin(psi), 0],
		[Math.sin(psi), Math.cos(psi), 0],
		[0, 0, 1]];
		
	for(var i = 0; i < 3; i++) {
		for(var j = 0; j < 3; j++) {
			var gamtmp = 0;
			for(var k = 0; k < 3; k++) {
				gamtmp += H[i][k]*w[k][j];
			}
			gam[i][j] = gamtmp;
		}
	}

	for(var i = 0; i < data.length; i++) {
		xg.push([0, 0, 0]);
		for(var k = 0; k < 3; k++) {
			xgtmp = 0; 
			for( var j = 0; j < 3; j++) {
				xgtmp += gam[j][k] * P[i][j];
			}
			xg[i][k] = xgtmp;
		}
	}

	//Compute asymptotic ellipse parameters
	var xmu = 0;
	var sigma1 = 0;
	var sigma2 = 0;
	for(var i = 0; i < data.length; i++) {
		xmu += xg[i][2];
		sigma1 += Math.pow(xg[i][1], 2);
		sigma2 += Math.pow(xg[i][0], 2);
	}

	xmu = xmu/data.length;
	sigma1 = sigma1/data.length;
	sigma2 = sigma2/data.length;
	var zeta = 0;
	var eta = 0;
	var g = -2*Math.log(0.05)/(data.length*Math.pow(xmu, 2));
	if(Math.sqrt(sigma1*g) < 1) zeta = Math.asin(Math.sqrt(sigma1*g));
	if(Math.sqrt(sigma2*g) < 1) eta = Math.asin(Math.sqrt(sigma2*g));
	if(Math.sqrt(sigma1*g) >= 1) zeta = Math.PI/2;
	if(Math.sqrt(sigma2*g) >= 1) eta = Math.PI/2;

	var kentParameters = new Object();
	
	//convert Kent parameters to directions, angles
	var zDir = dir(gam[0][1], gam[1][1], gam[2][1]);
	var eDir = dir(gam[0][0], gam[1][0], gam[2][0]);
	
	//Fill Kent parameters to object
	kentParameters['eta'] = eta/rad;
	kentParameters['zeta'] = zeta/rad;
	kentParameters['zDec'] = zDir.dec;
	kentParameters['zInc'] = zDir.inc;
	kentParameters['eDec'] = eDir.dec;
	kentParameters['eInc'] = eDir.inc;
	
	if(kentParameters['zInc'] < 0) {
		kentParameters['zInc'] = -kentParameters['zInc'];
		kentParameters['zDec'] = (kentParameters['zDec']+180)%360;
	}
	
	if(kentParameters['eInc'] < 0) {
		kentParameters['eInc'] = -kentParameters['eInc'];
		kentParameters['eDec'] = (kentParameters['eDec']+180)%360;
	}
	
	return {'kentParameters': kentParameters};
}

/* FUNCTION ellipseData
 * Description: calculates discrete points on an ellipse (with amplitudes dDx, dIx) around mean vector
 * Input: type@sting (FISHER), mean declination@float, mean inclination@float, errorDec@float, errorInc@float, reduction@bool
 * Output: object containing data with discrete points on an ellipse that can be plotted
 */
var ellipseData = function(params, reduction) {

	"use strict";
	
	//Calculate the ellipse axes in radians
	var dDx = params.beta*rad;
	var dIx = params.gamma*rad;

	//Calculate the inclination sign; 1 or -1 depending on inclination polarity
	var incSign = (Math.abs(params.xInc)/params.xInc);
	if(params.mInc === 0) {
		incSign = 1;
	}
	
	//Definition of ellipse series
	//Adding null prevents highcharts from making unwanted marker connections.
	//We use two arrays to keep the points, one for negative and one for positive inclinations
	var ellipsePointsOne = new Array();
	var ellipsePointsTwo = new Array(null); 

	//Number of points on ellipse.
	//If we need to plot many ellipses, we may use the reduction to reduce the load on the graph (1/10th of normal points)
	if(reduction) {
		var nPoints = 51;
	} else {
		var nPoints = 501;
	}
	
	var iPoint = ((nPoints-1)/2);

	//Boolean parameters we apply to push null values to HighCharts so unwanted line connections between points can be averted.
	var doOnce = true;
	var doOnce2 = true;

	//Calculate the Cartesian coordinates of our direction frame
	//These direction vectors compromise the columns of the rotation matrix R.
	var R = [[0,0,0],[0,0,0],[0,0,0]];

 	//Cartesian coordinates and construct rotation matrix Rij 
	//new z-coordinate
	var X = cart(params.xDec, params.xInc); 
	if(X.z < 0) {
		X.x = -X.x;
		X.y = -X.y;
		X.z = -X.z;
	}

	R[0][0]=X.x;
	R[1][0]=X.y;
	R[2][0]=X.z;

	var Y = cart(params.yDec, params.yInc); //new y-coordinate
	if(Y.z < 0) {
		Y.x = -Y.x;
		Y.y = -Y.y;
		Y.z = -Y.z;
	}
	
	R[0][1]=Y.x;
	R[1][1]=Y.y;
	R[2][1]=Y.z;
	
	var Z = cart(params.zDec, params.zInc); //new x-coordinate
	 if(Z.z < 0) {
		Z.x = -Z.x;
		Z.y = -Z.y;
		Z.z = -Z.z;
	}
	
	R[0][2]=Z.x;
	R[1][2]=Z.y;
	R[2][2]=Z.z;

	// column vector v containing coordinates of the ellipse before rotation in world coordinates
 	// psi is incremented along a circle from 0 to 2pi in n points with radius defined by a95
	// the resulting vector contains the ellipse position in local coordinates.
	// X is mapped on R-coordinates of v

	var v = [0, 0, 0];
	
	for( var i = 0; i < nPoints; i++ ){

		var psi = ((i)*Math.PI/iPoint);
		
		//v[0] is the resulting coordinate on the unit sphere (Pythagorean Theorem)
		v[1] = Math.sin(dIx) * Math.cos(psi);
		v[2] = Math.sin(dDx) * Math.sin(psi);
		v[0] = Math.sqrt( 1 - Math.pow(v[1], 2) - Math.pow(v[2], 2) );

		 // Matrix multiplication V'j = RijVj
		var eli = [0, 0, 0];
		for(var j=0;j<3;j++){
			for(var k=0;k<3;k++){ 
				eli[j]=eli[j] + R[j][k]*v[k];
			}
		}
		
		// Convert new Cartesian coordinates of ellipse back to direction
		var coords = dir(eli[0], eli[1], eli[2]);
		
		//If the inclination polarity is -1 flip the ellipse to the other side of the projection
		if(incSign < 0) {
			coords.dec = (180 + coords.dec)%360;
			coords.inc = -coords.inc;
		}

		//if z-coordinate is negative
		//continue the ellipse on the other side of the projection
		if(eli[2] < 0) {

			coords.dec = (180 + coords.dec)%360;
			coords.inc = -coords.inc;
			
			//Prevent Highcharts from adding unwanted connections between points.
			if(doOnce2) {
				ellipsePointsTwo.push(null)
				doOnce2 = false;
			}
			
			ellipsePointsOne.push({x: coords.dec, y: eqArea(coords.inc), inc: coords.inc});
		
		//if z-coordinate is positive
		} else {
			if(doOnce){ 
				ellipsePointsOne.push(null); 
				doOnce = false;
			}
			ellipsePointsTwo.push({x: coords.dec, y: eqArea(coords.inc), inc: coords.inc});
		}
	
	}

	this.neg = ellipsePointsOne;
	this.pos = ellipsePointsTwo;

}

/*FUNCTION notify
 *Description: notifies user of message; 
 *Input: notification types 'success', 'note' and 'failure' and message
 *Output: calls the $.notiny plugin
 */
var notify = function(type, msg) {

	"use strict";
	
	//Default to dark theme (this is actually green or 'success')
	var theme = 'dark';
	
	//Check the type of the notification (success, note, or failure)
	if(type == 'success') {
		msg = '<b>&#x2714</b> ' + msg;
		theme = 'dark';
	} else if(type == 'failure') {
		msg = '<b>&#10007</b> ' + msg;
		theme = 'light';
	} else if(type == 'note') {
		msg = '<b>&#8801</b> ' + msg;
		theme = 'orange';
	} else {
		console.log('Unexpected type of notification (' + type + ') expected ("success", "failure", "note")');
		return;
	}
	
	//Call the notiny plugin to do print the notification
	$.notiny({
		'text': msg, 
		'theme': theme,
		'width': 'auto'
	});

}