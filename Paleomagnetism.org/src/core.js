/* PALEOMAGNETISM.ORG CORE FUNCTIONS
 * 
 * VERSION: ALPHA.1508
 * LAST UPDATED: 19/04/2016
 *
 * JavaScript file containing core functions for the Paleomagnetism.org application.
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */
 
"use strict";

// Constant definition
var RADIANS = Math.PI / 180;
	
/* FUNCTION pseudoDirection
 * Draw a single direction from a Fisherian distribution around 0, 90 with dispersion k
 * Input: dispersion parameter Kappa (k)
 * Output: pseudo-random generated declination, inclination pairs
 */
var pseudoDirection = function(k) {

  // Get a random declination (0 inclusive; 1 exclusive)
  var dec = 360 * Math.random();
	
  // Get a random inclination
  var L = Math.exp(-2 * k);
  var a = (Math.random() * (1 - L) + L);
  var fac = Math.sqrt((-Math.log(a)) / (2 * k));
  var inc = 90 - (2 * Math.asin(fac)) / RADIANS;
	
  return {'dec': dec, 'inc': inc}

}

/* FUNCTION sample
 * Description: Draws N random samples with disperion parameter kappa (k)
 * Input: number of samples (N) with dispersion parameter kappa (k)
 * Output: Arrays of Cartesian coordinates and directions {x[], y[], z[], dec[], and inc[]}
 */
var sampleFisher = function(N, k) {
	
  // Data buckets
  var xCoordinate = new Array();
  var yCoordinate = new Array();
  var zCoordinate = new Array();
  var dec = new Array();
  var inc = new Array();
	
  // Draw N pseudo-random samples
  for(var i = 0; i < N; i++) {
	  
    var randomDirection = pseudoDirection(k);
    dec.push(randomDirection.dec);
    inc.push(randomDirection.inc);
  
    // Get the Cartesian coordinates
    var cartesianCoords = cart(randomDirection.dec, randomDirection.inc);
    xCoordinate.push(cartesianCoords.x);
    yCoordinate.push(cartesianCoords.y);
    zCoordinate.push(cartesianCoords.z);
	
  }
  
  // Return object literal of the sampled directions
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
var TMatrix = function (data) {
	
  var T = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
	
  for(var i = 0; i < data.length; i++) {
    var coords = [data[i].x, data[i].y, data[i].z];
    for(var k = 0; k < 3; k++) {
      for(var l = 0; l < 3; l++) {
        T[k][l] += coords[k] * coords[l]
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
var eigValues = function(data) {
	
  // Bucket for Cartesian coordinates
  var coords = new Array();
  for(var i = 0; i < data.length; i++){
    coords.push(cart(data[i][0], data[i][1]));
  }
	
  // Construct the orientation matrix and 
  // return eigenvalues for the orientation matrix
  return getEigenvalues(TMatrix(coords));
	
}

/* FUNCTION getEigenvalues
 * Description: calculates getEigenvalues
 * Input: orientation matrix [[xx, xy, xz], [yx, yy, yz], [zx, zy, zz]]
 * Output: values of the eigenvectors of the system
 */
var getEigenvalues = function(T) {
	
  // Algorithm to find eigenvalues of a symmetric, real matrix.
  // We need to compute the eigenvalues for many (> 100.000) real, symmetric matrices (Orientation Matrix T). Calling available libraries (Numeric.js) is much slower so we implement this algorithm instead.
  // Publication: O.K. Smith, Eigenvalues of a symmetric 3 × 3 matrix - Communications of the ACM (1961)
  // See https://en.wikipedia.org/wiki/Eigenvalue_algorithm#3.C3.973_matrices
	
  // Calculate the trace of the orientation matrix
  // 3m is equal to the trace
  var m = (T[0][0] + T[1][1] + T[2][2]) / 3;
	
  // Calculate the sum of squares
  var p1 = Math.pow(T[0][1], 2) + Math.pow(T[0][2], 2) + Math.pow(T[1][2], 2);	
  var p2 = Math.pow((T[0][0] - m), 2) + Math.pow((T[1][1] - m), 2) + Math.pow((T[2][2] - m), 2) + 2 * p1;
	
  // 6p is equal to the sum of squares of elements
  var p = Math.sqrt(p2 / 6);
	
  // Identity Matrix I and empty storage matrix B
  var B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  var I = [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
	
  for (var i = 0; i < 3; i++ ) {
    for (var k = 0; k < 3; k++) {
      B[i][k] = (1 / p) * (T[i][k] - m * I[i][k]);
    }
  }

  // Half determinant of matrix B.
  var r = 0.5 * numeric.det(B);
	
  var phi = 0;	
  if(r <= -1) {
    phi = Math.PI / 3;
  } else if(r >= 1) {
    phi = 0;
  } else {
    phi = Math.acos(r) / 3;
  }
	
  // Calculate the three eigenvalues
  var eig1 = m + 2 * p * Math.cos(phi);
  var eig3 = m + 2 * p * Math.cos(phi + (2*Math.PI/3));
  var eig2 = 3 * m - eig1 - eig3;
	
  // Normalize eigenvalues and return
  var tr = eig1 + eig2 + eig3;

  return {
    't1': eig1 / tr,
    't2': eig2 / tr,
    't3': eig3 / tr
  }
	
}

/* FUNCTION pseudo
 * Description: randomly samples a set of directions N times where N is the set length
 * Input: User input array of data [ [dec, inc, bed, bed dip, name], ... ]
 * Output: Random array of data [ [dec, inc, bed, bed dip, name], ... ]
 */
var pseudo = function(data) {

  var length = data.length	
  var sampled = new Array();

  for(var i = 0; i < length; i++) {
    var index = Math.floor(Math.random() * length);
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

  // Find the Cartesian coordinates of both directions
  var A = cart(decOne, incOne);
  var B = cart(decTwo, incTwo);

  // Dot product to find angle (https://en.wikipedia.org/wiki/Dot_product#Geometric)
  // vector norms ||A|| ||B|| are equal to 1 so the equation reduces to: A·B = cos(theta)
  return Math.acos((A.x * B.x) + (A.y * B.y) + (A.z * B.z)) / RADIANS

}

/*
 * FUNCTION getCDF
 * Description: calculates a cumulative distribution function for an array of (unsorted) parameters
 * Input: array of (unsorted) parameters
 * Output: Highcharts formatted CDF of input
 */
function getCDF ( input ) {

  var length = input.length;

  // Sort the input from low - high
  input.sort(function (a, b) {
    return a > b ? 1 : a < b ? -1 : 0;
  });

  // Calculate the cumulative distribution function of the sorted input
  // Formatted as a Highcharts data object
  var output = new Array();
  for(var i = 0; i < length; i++) {
    output.push({
      'x': input[i],
      'y': i / (length - 1)
    });
  }
        
  return output;

}

/*
 * FUNCTION rotateTo
 * Description: rotates specimens to geographic coordinates 
 * Input: azimuth, plunge, data (x, y, z)
 * Output: dec, inc, R of rotated vector
 */
var rotateTo = function(azimuth, plunge, data) {

  // Convert to RADIANSians
  var azimuth = azimuth * RADIANS;
  var plunge = plunge * RADIANS;

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
  var vectorPrime = [0, 0, 0];
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      vectorPrime[i] += rotMat[i][j] * vector[j];
    }
  }

  // Return a direction with the rotated vector
  return dir(vectorPrime[0], vectorPrime[1], vectorPrime[2]);

}

/*
 * FUNCTION correctBedding
 * Description: rotates specimens to geographic coordinates 
 * Input: strike, plunge, data (x, y, z)
 * Output: The rotated vector
 */
function correctBedding(strike, plunge, direction) {

  // Angle with North is equal to the declination of the mean vector (+90)
  // Since our convention is strike, and the normal is always 90 deg. to the right
  var dipDirection =  strike + 90;

  // We can subtract the dip direction from the declination because 
  // the inclination will not change (See Lisa Tauxe: 9.3 Changing coordinate systems; last paragraph)
  var coords = cart(direction.dec - dipDirection, direction.inc, direction.R);

  // Call rotation matrix A.13 with (¿ = 0, ¿ = -plunge) and pass
  // the Cartesian coordinates of the direction to be rotated
  var rotated = rotateTo(0, -plunge, [coords.x, coords.y, coords.z]);

  // Add the dip direction back to the vector
  rotated.dec = (rotated.dec + dipDirection) % 360;

  return rotated;

}

/* FUNCTION rotat
 * Description: rotates directions to North 
 */
var rotat = function(str, he, data) {

  // Return if he is 90: the vector is already pointing North. 
  if(he === 90) {
    return data;
  }

  var dec = data[0];
  var inc = data[1];
	
  // Rotate all directions so the mean VGP faces north.
  // We can simply substract the angle with North from all directions because the inclination will not change.
  var coords = cart(dec - str, inc);

  // Rotate the vector to North
  // Correct for -inclination to bring the vector horizontal plus 90 degrees to bring it vertical
  var rotatedNorth = rotateTo(0, 90 - he, [coords.x, coords.y, coords.z])

  // Copy the data array and add new declination and inclination
  // Return the declination to the vector
  var newData = JSON.parse(JSON.stringify(data));
  newData[0] = (rotatedNorth.dec + str) % 360;
  newData[1] = rotatedNorth.inc;

  return newData;

}

function isPositiveInteger(i) {
  return i % 1 === 0 && i > 0;
}

/* FUNCTION butler
 * Description: calculates statistical Butler parameters
 * Input: paleolatitude@float, A95@float, inclination@float
 * Output: Butler parameters (dDx, dIx)
 */
var butler = function(palat, A95, inc) {
	
  var A95 = A95 * RADIANS;
  var palat = palat * RADIANS;
  var inc = inc * RADIANS;
	
  // The errors are functions of paleolatitude - at the poles the declination will become ill-defined
  var dDx = Math.asin(Math.sin(A95) / Math.cos(palat)) / RADIANS;
  var dIx = (2 * A95 / (1 + 3 * Math.pow(Math.sin(palat), 2))) / RADIANS;
	
  // Calculate the minimum and maximum Paleolatitude from the error on the inclination
  var maxPalat = Math.atan(0.5 * Math.tan(inc + dIx * RADIANS)) / RADIANS;
  var minPalat = Math.atan(0.5 * Math.tan(inc - dIx * RADIANS)) / RADIANS;
	
  return {
    'dDx': dDx,
    'dIx': dIx,
    'minPalat': minPalat,
    'maxPalat': maxPalat
  }

}

/* FUNCTION diPalat
 * Description: calculates paleolatitude from inclination (dipole formula)
 */
var diPalat = function(inc) {
  return Math.atan(Math.tan(inc * RADIANS) / 2) / RADIANS;
}


/* FUNCTION getDispersionParameter
 * Description: calculates the dispersion parameter k
 */
function getDispersionParameter(N, R) {
  return (N - 1) / (N - R);
}


/* FUNCTION getConfidenceInterval
 * Description: calculates the confidence parameter (default a95)
 */
function getConfidenceInterval(N, R, confidence) {

  // Default to 95%
  if(confidence === undefined) {
    var confidence = 95;
  }

  var p = 0.01 * (100 - confidence);
  return Math.acos(1 - (Math.pow((1 / p), (1 / (N - 1))) - 1) * (N - R) / R) / RADIANS;

}


function getMeanDirection(data) {

  var xSum = 0, ySum = 0, zSum = 0;
  for(var i = 0; i < data.length; i++) {
    var cartesianCoords = cart(data[i][0], data[i][1]);
    xSum += cartesianCoords.x;
    ySum += cartesianCoords.y;
    zSum += cartesianCoords.z;
  }

  return dir(xSum, ySum, zSum);

}

/* FUNCTION fisher (constructor)
 * Description: calculates fisher parameters for a given data set
 * Input: data@array, type@string (dir or VGP), flag@string (simple or full)
 * Output: fisher parameters
 */
var fisher = function(data, type, flag) {

  // Get the new mean direction 
  // R is the resultant vector length of the summed vectors
  var mDirection = getMeanDirection(data)

  // Write the mean declination, inclination (longitude, latitude)
  if(type === 'dir') {
    this.mDec = mDirection.dec;
    this.mInc = mDirection.inc;
  } else if(type === 'vgp') {
    this.mLon = mDirection.dec;
    this.mLat = mDirection.inc;
  }

  // If we are only interested in mean directions return
  if(flag === 'simple') {
    return;
  }
	
  var N = data.length;
  var R = mDirection.R;

  // Other statistical parameters
  // Dispersion parameter, Lisa Tauxe, 11.8
  var k = getDispersionParameter(N, R);

  // Calculate confidence parameter - 95% interval
  // Lisa Tauxe, 11.9
  var a95 = getConfidenceInterval(N, R, 95);

  // Construct object with parameters
  // Seperately for VGPs and directions
  this.N = N;
	
  // Statistical parameters for directions and VGPs are different
  if(type === 'dir') {

    this.a95 = a95;
    this.k = k;
    this.palat = diPalat(mDirection.inc);
    this.R = R;

  } else if(type === 'vgp') {

    this.A95 = a95;
    this.K = k;
    this.VGPR = R;
		
    // Minimum and maximum for A95 to quantify PSV sampling 
    // See (Deenen et al., 2011);
    this.A95min = 12 * Math.pow(N, -0.40);
    this.A95max = 82 * Math.pow(N, -0.63);

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

  var dec = dec * RADIANS;
  var inc = inc * RADIANS;

  // If the intensity is undefined, implicitly assume unit weight
  if(intensity === undefined) {
    var intensity = 1;
  }

  // Calculate Cartesian coordinates
  var coordinates = {
    'x': intensity * Math.cos(dec) * Math.cos(inc),
    'y': intensity * Math.sin(dec) * Math.cos(inc),
    'z': intensity * Math.sin(inc)
  };

  return coordinates;

}

/* function vectorLength
 * Description: returns length of vector (x, y, z)
 */
function vectorLength(x, y, z) {
  return Math.sqrt(x * x + y * y + z * z);
}


/* FUNCTION dir
 * Description: calculates direction from Cartesian coordinates (x, y, z)
 * Input: Cartesian Coordinates (x, y, z)
 * Output: Vector containing declination, inclination, and R (intensity)
 */
var dir = function(x, y, z) {

  // Use Pythagorean Theorem to find R
  // Use atan2 to find the appropriate quadrant
  var R = vectorLength(x, y, z); 
  var dec = (360 + (Math.atan2(y, x) / RADIANS)) % 360; 
  var inc = Math.asin(z / R) / RADIANS;
	
  return {
    'dec': dec,
    'inc': inc,
    'R': R
  }

}

/* FUNCTION
 * Description: Calculates declination and inclination for given site location from pole position
 *   http://en.wikipedia.org/wiki/Spherical_law_of_cosines
 * Input: site Latitude, Longitude, data
 * Output: Declination and Inclination associated with site
 */
function invPoles(siteLat, siteLong, data) {

  // Our pole positions are kept  in the data block at positions 0 and 1
  var poleLong = data[0]
  var poleLat = data[1];

  // Get some standard variables
  var sinlats = Math.sin(RADIANS * siteLat);
  var coslats = Math.cos(RADIANS * siteLat);
  var sinlatp = Math.sin(RADIANS * poleLat);
  var coslatp = Math.cos(RADIANS * poleLat);
	
  var cosp = sinlatp * sinlats + coslatp * coslats * Math.cos(RADIANS * (poleLong - siteLong));
  var sinp = Math.sqrt(1 - cosp * cosp);
	
  var dec = (Math.acos((sinlatp - sinlats * cosp) / (coslats * sinp))) / RADIANS
	
  if(poleLong > siteLong && (poleLong - siteLong) > 180) {
    dec = 360 - dec;
  }
  if(poleLong < siteLong && (siteLong - poleLong) < 180) {
    dec = 360 - dec;
  }
	
  // Right quadrant
  var inc = Math.atan2(2 * cosp, sinp) / RADIANS;

  var newData = JSON.parse(JSON.stringify(data));
  newData[0] = dec;
  newData[1] = inc;
  return newData;

}


/* FUNCTION poles
 * Description: finds the VGP positions for particular site latitude/longitude and
 *  a given pair of declination/inclination.
 *  routine implemented after Pal_45_s.f95
 * Input: site Latitude/Longitude and data
 * Output: Calculated virtual geomagnetic pole latitude and longitude
 */
function poles(slat, slong, data) {

  var dec = Number(data[0]);
  var inc = Number(data[1]);

  // Make sure inclination is not 90
  if(inc === 90) {
    inc = 89.99;
  }
	
  var p = 0.5 * Math.PI - Math.atan(0.5 * Math.tan(RADIANS * inc));
  var plat = Math.asin(Math.sin(RADIANS * slat) * Math.cos(p) + Math.cos(RADIANS*slat) * Math.sin(p) * Math.cos(RADIANS * dec))
  var beta = Math.asin(Math.sin(p) * Math.sin(RADIANS * dec) / Math.cos(plat));

  if((Math.cos(p) - Math.sin(plat) * Math.sin(RADIANS * slat)) < 0) {
    var plong = RADIANS * slong - beta + Math.PI
  } else {
    if(isNaN(beta)) {
      beta = 0;
    }
    var plong = RADIANS*slong + beta
  }
	
  plat = plat / RADIANS;
  plong = plong / RADIANS;

  if(plong < 0){
    plong = plong + 360;
  }

  var newData = JSON.parse(JSON.stringify(data));
  newData[0] = plong;
  newData[1] = plat;

  return newData;

}

/* FUNCTION eqArea
 * Description: calculates projected inclination from actual inclination
 *            : this function was given a poor name with the introduction of an equal angle transformation
 *            : it returns either the projected equal angle or equal area inclination based on the projection flag
 * Input: Inclination
 * Output: Projected Inclination
 */
function eqArea(inc) {

  // Get the absolute inclination
  var inc = Math.abs(inc);
	
  // Get the projection flag
  var projFlag = $('#projFlag').prop('checked');

  // Undefined for other portals 
  if(!projFlag || projFlag === undefined) {
    return 90 - (Math.sqrt(2) * 90 * Math.sin(Math.PI * (90 - inc) / 360)); // Equal area 
  } else {
    return 90 - (90 * Math.tan(Math.PI * (90 - inc) / 360)); // Equal angle
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
  
  // Algorithm to sort eigenvalues and corresponding eigenvectors
  // as taken from the PmagPY library
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
  
  for(var i = 0; i < 3; i++) {
    if(eig.lambda.x[i] != t1 && eig.lambda.x[i] != t3) {
      t2 = eig.lambda.x[i];
      ind2 = i;
    }
  }
  
  // Sort eigenvectors
  // We need to sort the columns and not rows so slightly interesting shuffle
  V.push(
    [eig.E.x[0][ind1], eig.E.x[0][ind2], eig.E.x[0][ind3]], 
    [eig.E.x[1][ind1], eig.E.x[1][ind2], eig.E.x[1][ind3]], 
    [eig.E.x[2][ind1], eig.E.x[2][ind2], eig.E.x[2][ind3]]
  );
  
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
 * Method as described in Lisa Tauxe Book (C.2.4 Kent 95% confidence ellipse)
 * Input: data block (declination, inclination) pairs
 * Output: Kent Parameters
 */
 var getKentParametersNew = function (data) {
 
   // Get the Fisher parameters of our data
   var fisherParameters = new fisher(data, 'dir', 'full');
	
   // Get Cartesian coordinates of data
   var X = new Array();	
   for(var i = 0; i < data.length; i++) {
     X.push(cart(data[i][0], data[i][1]));
   }
	
  // Format the orientation matrix
  // Lisa Tauxe, 2004 (A.15 - A.17)
  var T = TMatrix(X);
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      T[i][j] = T[i][j]/X.length;
    }
  }
	
  // Get the sorted eigenvalues/vectors
  var eig = sortEig(numeric.eig(T));
	
  // Calculate g (equation C.3)
  var g = -2 * Math.log(0.05) / (data.length * Math.pow(fisherParameters.R / data.length, 2));

  var kentParameters = new Object();	

  // Calculate zeta and eta (C.3)
  // Our eigenvalues are an approximation of sigma
  kentParameters['eta'] = Math.asin(Math.sqrt(eig.tau[2] * g)) / RADIANS;
  kentParameters['zeta'] = Math.asin(Math.sqrt(eig.tau[1] * g)) / RADIANS;
	
  // Calculate the directions of the semi-angles
  kentParameters['zDec'] = Math.atan2(eig.v2[1], eig.v2[0])/RADIANS;
  kentParameters['zInc'] = Math.asin(eig.v2[2])/RADIANS;
  kentParameters['eDec'] = Math.atan2(eig.v3[1], eig.v3[0])/RADIANS;
  kentParameters['eInc'] = Math.asin(eig.v3[2])/RADIANS;

  if(kentParameters['zInc'] < 0) {
    kentParameters['zInc'] = -kentParameters['zInc'];
    kentParameters['zDec'] = (kentParameters['zDec'] + 180) % 360;
  }
	
  if(kentParameters['eInc'] < 0) {
    kentParameters['eInc'] = -kentParameters['eInc'];
    kentParameters['eDec'] = (kentParameters['eDec'] + 180) % 360;
  }
	
  return {'kentParameters': kentParameters};

 }
 
/*
 * !!!! TO BE REPLACED !!!!
 * FUNCTION getKentParameters
 * Description: calculates Kent parameters (Kent, 1982; The Fisher–Bingham distribution on the sphere)
 *   as implemented after the PmagPY Library (https://github.com/ltauxe/PmagPy/blob/master/eqarea_ell.py)
 *   all rights go out to the PmagPY contributors!
 * Input: data
 * Output: Object containing Kent parameters
*/
var getKentParameters = function ( data ) {
	
  // Get the Fisher parameters of our data
  var fisherParameters = new fisher(data, 'dir', 'full');
  var pBar = fisherParameters.mDec * RADIANS;
  var tBar = (90 - fisherParameters.mInc) * RADIANS;
	
  // Set up matrices
  var w = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  var b = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  var gam = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  var xg = new Array();
	
  // Set up rotation Matrix H
  var H = [
    [Math.cos(tBar) * Math.cos(pBar), - Math.sin(pBar), Math.sin(tBar) * Math.cos(pBar)],
    [Math.cos(tBar) * Math.sin(pBar), Math.cos(pBar), Math.sin(pBar) * Math.sin(tBar)],
    [-Math.sin(tBar), 0, Math.cos(tBar)]
  ];

  // Get Cartesian coordinates of data
  var X = new Array();
  var P = new Array();
  for(var i = 0; i < data.length; i++) {
    X.push(cart(data[i][0], data[i][1]));
    P.push([X[i].x, X[i].y, X[i].z]);
  }
	
  // Format the orientation matrix
  // Lisa Tauxe, 2004 (A.15 - A.17)
  var T = TMatrix(X);
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      T[i][j] = T[i][j] / X.length;
    }
  }
	
  // Compute B=H'TH
  // (TH)
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      for(var k = 0; k < 3; k++) {
        w[i][j] += T[i][k]*H[k][j];
      }
    }
  }
	
  // H'(TH)
  for(var i = 0; i < 3; i++) {
    for(var j = 0; j < 3; j++) {
      for(var k = 0; k < 3; k++) {
        b[i][j] += H[k][i]*w[k][j];
      }
    }
  }

  // Choose a rotation w about North pole to diagonalize upper part of B
  var psi = 0.5 * Math.atan(2 * b[0][1] / (b[0][0] - b[1][1]));
  var w = [
    [Math.cos(psi), -Math.sin(psi), 0],
    [Math.sin(psi), Math.cos(psi), 0],
    [0, 0, 1]
  ];
		
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
      var xgtmp = 0; 
      for(var j = 0; j < 3; j++) {
        xgtmp += gam[j][k] * P[i][j];
      }
      xg[i][k] = xgtmp;
    }
  }

  // Compute asymptotic ellipse parameters
  var xmu = 0;
  var sigma1 = 0;
  var sigma2 = 0;
  for(var i = 0; i < data.length; i++) {
    xmu += xg[i][2];
    sigma1 += Math.pow(xg[i][1], 2);
    sigma2 += Math.pow(xg[i][0], 2);
  }

  xmu = xmu / data.length;
  sigma1 = sigma1 / data.length;
  sigma2 = sigma2 / data.length;

  var zeta = 0;
  var eta = 0;
  var g = -2*Math.log(0.05)/(data.length*Math.pow(xmu, 2));

  if(Math.sqrt(sigma1 * g) < 1) zeta = Math.asin(Math.sqrt(sigma1 * g));
  if(Math.sqrt(sigma2 * g) < 1) eta = Math.asin(Math.sqrt(sigma2 * g));
  if(Math.sqrt(sigma1 * g) >= 1) zeta = Math.PI / 2;
  if(Math.sqrt(sigma2 * g) >= 1) eta = Math.PI / 2;

  var kentParameters = new Object();
	
  // convert Kent parameters to directions, angles
  var zDir = dir(gam[0][1], gam[1][1], gam[2][1]);
  var eDir = dir(gam[0][0], gam[1][0], gam[2][0]);
	
  // Fill Kent parameters to object
  kentParameters['eta'] = eta/RADIANS;
  kentParameters['zeta'] = zeta/RADIANS;
  kentParameters['zDec'] = zDir.dec;
  kentParameters['zInc'] = zDir.inc;
  kentParameters['eDec'] = eDir.dec;
  kentParameters['eInc'] = eDir.inc;
	
  if(kentParameters['zInc'] < 0) {
    kentParameters['zInc'] = -kentParameters['zInc'];
    kentParameters['zDec'] = (kentParameters['zDec'] + 180) % 360;
  }
	
  if(kentParameters['eInc'] < 0) {
    kentParameters['eInc'] = -kentParameters['eInc'];
    kentParameters['eDec'] = (kentParameters['eDec'] + 180) % 360;
  }
	
  return {'kentParameters': kentParameters};

}

/* FUNCTION ellipseData
 * Description: calculates discrete points on an ellipse (with amplitudes dDx, dIx) around mean vector
 * Input: type@sting (FISHER), mean declination@float, mean inclination@float, errorDec@float, errorInc@float, reduction@bool
 * Output: object containing data with discrete points on an ellipse that can be plotted
 */
function ellipseData(params, reduction) {

  // Definition of ellipse series
  // Adding null prevents highcharts from making unwanted marker connections.
  // We use two arrays to keep the points, one for negative and one for positive inclinations
  var lowerHemisphere = new Array(null);
  var upperHemisphere = new Array(null); 
  var once = true;
  var once2 = true;

  var incSign = (Math.abs(params.xInc)/params.xInc);
  if(params.xInc === 0) {
    incSign = 1;
  }

  // Number of points on ellipse.
  // If we need to plot many ellipses, we may use the reduction to reduce the load
  var nPoints = reduction ? 51 : 201;
  var iPoint = ((nPoints - 1) / 2);

  // 1st, 2nd, and 3rd axis
  var X = cart(params.xDec, params.xInc); 
  var Y = cart(params.yDec, params.yInc);
  var Z = cart(params.zDec, params.zInc);

  // Construct rotation matrix	
  var R = [[X.x, Y.x, Z.x], [X.y, Y.y, Z.y], [X.z, Y.z, Z.z]];

  // column vector v containing coordinates of the ellipse before rotation in world coordinates
  // psi is incremented along a circle from 0 to 2pi in n points with RADIANSius defined by a95
  // the resulting vector contains the ellipse position in local coordinates.
  var v = [0, 0, 0];
  for(var i = 0; i < nPoints; i++){

    var psi = ((i) * Math.PI / iPoint);
		
    // v[0] is the resulting coordinate on the unit sphere (Pythagorean Theorem)
    v[1] = Math.sin(params.gamma * RADIANS) * Math.cos(psi);
    v[2] = Math.sin(params.beta * RADIANS) * Math.sin(psi);
    v[0] = Math.sqrt(1 - Math.pow(v[1], 2) - Math.pow(v[2], 2));

    // Matrix multiplication V'j = RijVj
    var eli = [0, 0, 0];
    for(var j = 0; j < 3; j++) {
      for(var k = 0; k < 3; k++) { 
        eli[j] = eli[j] + R[j][k] * v[k];
      }
    }
		
    // Convert new Cartesian coordinates of ellipse back to direction
    var coords = dir(eli[0], eli[1], eli[2]);

    // Put the ellipse on the right side		
    if(params.xInc < 0) {
      coords.dec += 180;
    }

    if(coords.inc < 0) {
      coords.dec += 180;
    }

    var discretePointsPosition = {
      'x': coords.dec % 360,
      'y': eqArea(coords.inc),
      'inc': coords.inc
    }

    if(coords.inc < 0) {
      upperHemisphere.push(discretePointsPosition);
      if(once) {
        lowerHemisphere.push(null)
	once = false;
      }
    } else {
      lowerHemisphere.push(discretePointsPosition);
      if(once2){ 
        upperHemisphere.push(null); 
        once2 = false;
      }
    }
  }

  return {
    'neg': upperHemisphere,
	'pos': lowerHemisphere
  }

}

/* FUNCTION notify
 * Description: notifies user of message; 
 * Input: notification types 'success', 'note' and 'failure' and message
 * Output: calls the $.notiny plugin
 */
var notify = function(type, msg) {

  // Check the type of the notification (success, note, or failure)
  var theme;
  if(type === 'success') {
    msg = '<b>&#x2714</b> ' + msg;
    theme = 'dark';
  } else if(type === 'failure') {
    msg = '<b>&#10007</b> ' + msg;
    theme = 'light';
  } else if(type === 'note') {
    msg = '<b>&#8801</b> ' + msg;
    theme = 'orange';
  } else {
    throw('Unexpected type of notification (' + type + ') expected ("success", "failure", "note")')
  }

  // Call the notiny plugin to do print the notification
  $.notiny({
    'text': msg,
    'theme': theme,
    'width': 'auto'
  });

}
