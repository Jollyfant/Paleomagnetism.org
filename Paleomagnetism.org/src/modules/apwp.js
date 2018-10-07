/* PALEOMAGNETISM.ORG STATISTICS PORTAL
 * APWP AND MAP MODULE 
 * 
 * VERSION: 1.1.0
 * LAST UPDATED: 2016-08-14
 *
 * JavaScript file containing functionality for the APWP module (map is disabled in offline mode - needs to communicate with the Google Maps v3 API)
 *
 *  Related Scientific Literature: 
 *  
 *  van Hinsbergen et al.,
 *  A Paleolatitude Calculator for Paleoclimate Studies
 *  PLOS ONE
 *  [2015]
 *  
 *  Torsvik et al.,
 *  Phanerozoic polar wander, palaeogeography and dynamics
 *  Source of the Document Earth-Science Reviews 114 (3-4), pp. 325-368
 *  [2012]
 *  
 *  Besse, J., Courtillot, V. 
 *  Apparent and true polar wander and the geometry of the geomagnetic field over the last 200 Myr
 *  Journal of Geophysical Research: Solid Earth 107 (11), pp. EPM 6-1 - 6-31
 *  [2002]
 *  
 *  Kent, D.V., Irving, E. 
 *  Influence of inclination error in sedimentary rocks on the Triassic and Jurassic apparent pole wander path for North America and implications for Cordilleran tectonics
 *  Journal of Geophysical Research: Solid Earth 115 (10), B10103
 *  [2010]
 *	
 * This open-source application is licensed under the GNU General Public License v3.0
 * and may be used, modified, and shared freely
 */

"use strict";

/*
 * FUNCTION getAfricanPolePath
 * Description: gets the APWP of the African continent for three reference frames.
 * Input: type (reference frame)
 * Output: Object containing data for pole position (age, error, latitude, and longitude)
 */
function getAfricanPolePath(type) {

  var refFrame = referenceFrames[type];
  return {
    'age': refFrame.age,
    'A95': refFrame.A95,
    'plong': refFrame.plong,
    'plat': refFrame.plat
  }
  
}

/*
 * FUNCTION getPlate
 * Description: Database definitions of APWP for particular PLATE with reference frame TYPE
 * Input: plate (one of the selectable plates), type (reference frame)
 * Output: Object containing plate data
 */
function getPlate(plate, type) {
	
  var plate = referenceFrames[type].plates[plate];
  plate.africanPolePath = getAfricanPolePath(type);
  plate.age = plate.africanPolePath.age
  
  return plate;
	
}

/*
 * FUNCTION getRotatedPole
 * Description: rotates poles
 *   implemented from the supplementary information provided by van Hinsbergen et al., 2015 (Paleolatitude.org)
 * Input APWP object containing data, counter i
 * Output: rotate pole parameters
 */
function getRotatedPole (APWP, i) {
		
  // Find co-latitudes and do conversions to radians
  var coLatEuler = (90 - APWP.lat[i]);
  var phiEuler = APWP.lon[i] * RADIANS;
	
  var coLatPole = (90 - APWP.africanPolePath.plat[i]);
  var thetaEuler = coLatEuler * RADIANS;
  
  var rotationAngle = APWP.rot[i] * RADIANS;
  
  var phiPole = APWP.africanPolePath.plong[i] * RADIANS;
  var thetaPole = coLatPole * RADIANS;
  
  // Construct transformation matrix L
  var L = [
    [Math.cos(phiEuler) * Math.cos(thetaEuler), -Math.sin(phiEuler), Math.cos(phiEuler) * Math.sin(thetaEuler)],
    [Math.sin(phiEuler) * Math.cos(thetaEuler), Math.cos(phiEuler), Math.sin(phiEuler) * Math.sin(thetaEuler)],
    [-Math.sin(thetaEuler), 0, Math.cos(thetaEuler)]
  ];
  
  // Store reference pole to Cartesian coordinates in P vector
  var P = [ 
    Math.cos(phiPole) * Math.sin(thetaPole), 
    Math.sin(phiPole) * Math.sin(thetaPole), 
    Math.cos(thetaPole)
  ];
  
  // Construct rotation matrix (backwards hence negative rotation)
  var R = [
    [Math.cos(-rotationAngle), -Math.sin(-rotationAngle), 0],
    [Math.sin(-rotationAngle), Math.cos(-rotationAngle), 0],
    [0, 0, 1]
  ];
  
  /* PERFORMING EULER ROTATION
  * [L] [R] [Lt] <P>
  * Where L is the transformation Matrix (t - tranpose) [3x3]
  * R rotation matrix [3x3]
  * P is the vector containing Cartesian coordinates of the reference pole [1x3]
  */
  
  //Multiply [L] with [R] to [M]
  var M = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for(var j = 0; j < 3; j++) {
    for(var k = 0; k < 3; k++) {
      for(var l = 0; l < 3; l++) {
        M[j][k] += L[j][l] * R[l][k];
      }
    }
  }
  
  //Multiply [M] with [Lt] to [B]
  var B = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for(var j = 0; j < 3; j++) {
    for(var k = 0; k < 3; k++) {
      for(var l = 0; l < 3; l++) {
        B[j][k] += M[j][l] * L[k][l];
      }
    }
  }
  
  //Multiply [B] with <P> to <X>
  var X = [0, 0, 0];
  for(var j = 0; j < 3; j++) {
    for(var k = 0; k < 3; k++) {
      X[j] += B[j][k] * P[k];
    }
  }
  	
  var phiPoleRot = Math.atan(X[1]/X[0]);
  var thetaPoleRot = Math.acos(X[2]);
  
  if(X[0] < 0) {
    phiPoleRot += Math.PI;
  } else if (X[0] >= 0 && X[1] < 0) {
    phiPoleRot += 2 * Math.PI;
  }
  
  var thetaPoleRot = thetaPoleRot / RADIANS;
  var latPoleRot = (90 - thetaPoleRot) * RADIANS;
  
  return {
    'latPoleRot': latPoleRot, 
    'phiPoleRot': phiPoleRot
  }
	
}

/*
 * FUNCTION getExpectedLocation
 * Description: Calcualtes expected declinations, inclinations, and paleolatitudes for site location, reference frame(s), and plates(s)
 * Input: NULL
 * Output: VOID (calls plotting functions
 */
function getExpectedLocation(skip) {
	
  // Site location (latitude and longitude) check
  var siteLat = Number($("#palatLat").val());
  var siteLon = Number($("#palatLon").val());
  
  // Age filter (get minimum and maximum)
  var ageMin = $("#ageRange").slider("values", 0);
  var ageMax = $("#ageRange").slider("values", 1);	
  
  // Plate and reference frame
  if(!skip) {
    var plates = $("#plateNames").val();
    if(plates === null) {
      notify('failure', 'Select one or multiple plates.'); return;
    }
  }
  
  //Bucket for graphing data
  var palatData = new Array();
  var decData = new Array();
  var incData = new Array();
  var polePos = new Array();
  
  if(plates) {
  	
    if($("#refFrame").val() === null) {
      notify('failure', 'Select one or multiple reference frames.');			
      return;
    }
  	
    if(siteLat === '' || siteLon === '') {
      notify('failure', 'Longitude or latitude field is empty.');
      return;	
    }
  	
    // Loop over all of the selected plates
    for(var numPlates = 0; numPlates < plates.length; numPlates++) {
  	
      //Get the plate name for this iteration
      var plateName = plates[numPlates];
  	  	
      // Get custom attribute for plate (is the reference frame default or added by the user)
      var custom = eval($('#plateNames option[value="' + plateName + '"]').attr('custom'));
      var refFrame = $("#refFrame").val();

      //For one selected plate, loop over all selected reference frames
      for(var numFrames = 0; numFrames < refFrame.length; numFrames++) {

	    //Get the real plate name for displaying
        var realPlateName = $("#plateNames option[value='" + plateName + "']").text();	
        var realRefName = refFrame[numFrames];
        var realRefName2 = $("#refFrame option[value='" + realRefName + "']").text();

        if(custom) {
          realRefName2 = 'Custom APWP';
        }
        
        //Concatenate reference frame tag to platename ( to differentiate between ref. frames )
        realPlateName = realPlateName + ' (' + realRefName2 + ')';
        
        //Buckets to capture all data
        var paleoLats = new Array();
        var paleoDecs = new Array();
        var paleoIncs = new Array();
        
        //Errors
        var decErrors = new Array();			
        var incErrors  = new Array();
        var palatErrors = new Array();
        
        var poleData = new Array();
        var ellyDat = new Array();
        var ellyDat2 = new Array();
        
        //Request APWP data for particular plate and reference frame
        //Custom plates can take data directly from the APWPs GLOBAL object
        var APWP = custom ? APWPs[plateName] : getPlate(plateName, realRefName);

        if(APWP.type === 'Euler Pole') {
          APWP.africanPolePath = getAfricanPolePath(realRefName);
        }
        
        //Loop over all data points in the returned APWP object
        for(var i = 0; i < APWP.lon.length; i++) {

          // Throw error if ages do not match
          if(APWP.type === 'Euler Pole' && APWP.age[i] !== APWP.africanPolePath.age[i]) {

            if(APWP.africanPolePath.age[i] !== undefined) {
              notify('failure', 'Ages of Euler poles and reference frame are not compatible: ' + realRefName + ' and ' + plateName + '.');
            }

            break; 

          }

          // Check if within age bounds
          if(APWP.age[i] >= ageMin && APWP.age[i] <= ageMax) {

          // Only do the Euler rotation for non-custom APWPs
          // Custom paths should already be transformed
          // For custom APWPs, just take specified lat/lon
          if(custom && APWP.type === "APWP") {
            var latPoleRot = APWP.lat[i] * RADIANS;
            var phiPoleRot = APWP.lon[i] * RADIANS;
          } else {
            var rotParameters = getRotatedPole(APWP, i);
            var latPoleRot = rotParameters.latPoleRot;
            var phiPoleRot = rotParameters.phiPoleRot;			
          }

          // Convert poles, site to expected dec, inc
          var dirs = invPoles(siteLat, siteLon, [
            phiPoleRot / RADIANS,
            latPoleRot / RADIANS
          ]);
          
          // Take either the user specified A95 or the one from the africanPolePath
          var A95 = (custom && APWP.type === "APWP") ? APWP.A95[i] * RADIANS : APWP.africanPolePath.A95[i] * RADIANS

          // Get paleolatitude (degrees), declination (degrees), and inclination (radians)
          var dec = dirs[0];
          var palat = diPalat(dirs[1])
          var inc = dirs[1] * RADIANS;
          
          // Bounds declination between -180 & 180 
          //If we take declintion between 0 and 360 it switches polarity often and ruins the look of the chart
          //Axes swaps between 180 to -180 are much more uncommon as it requires huge rotations
          if(dec > 180) {
            dec = dec - 360;
          }
          
          //Caclulate the Error on inclination and declination (after Butler, 1992)
          var dDi = A95 * (2 / (1 + 3 * Math.pow(Math.cos((90 - palat) * RADIANS), 2)));
          var dDx = Math.asin(Math.sin(A95) / Math.cos(palat * RADIANS));
          
          //If there is a problem in the determination of the errors, put the error to 0
          if(isNaN(dDx)) {
            dDx = null;
          }

          if(isNaN(dDi)) {
            dDi = null;
          }
          
          //Use error on inclination to obtain error on paleolatitude
          //We want to get the absolute difference with the paleolatitude (so we can add and subtract it later)
          var min = Math.abs(palat - Math.atan(0.5 * Math.tan(inc - dDi)) / RADIANS);
          var max = Math.abs(palat - Math.atan(0.5 * Math.tan(inc + dDi)) / RADIANS);
          
          //If the difference is very large (i.e. > 90 degrees) we probably went over a pole
          //Therefore, take away 180
          if(min > 90) {
            min = Math.abs(180 - min);
          }
          if(max > 90) {
            max = Math.abs(180 - max);
          }
          
          //Put data in data bucket (in degrees)
          poleData.push({
            'x': phiPoleRot / RADIANS, 
            'y': eqArea(latPoleRot / RADIANS), 
            'inc': latPoleRot / RADIANS, 
            'age': APWP.age[i], 
            'A95': A95 / RADIANS
          }); 
          
          //Construct ellipse parameters to draw an ellipse around pole positions on polar plot
          var ellipseParameters = {
            'xDec': phiPoleRot / RADIANS,
            'xInc': latPoleRot / RADIANS,
            'yDec': phiPoleRot / RADIANS,
            'yInc': (latPoleRot / RADIANS) - 90,
            'zDec': (phiPoleRot / RADIANS) + 90,
            'zInc': 0,
            'beta': A95 / RADIANS,
            'gamma': A95 / RADIANS
          }
          
          //Call the ellipse subroutine and store the data in the arrays
          var elly = ellipseData(ellipseParameters, true);
          ellyDat2 = ellyDat2.concat(elly.neg)
          ellyDat = ellyDat.concat(elly.pos)
          
          //Push expected locations to array for plotting
          //Paleo-latitudes (non-symmetrical error)
          paleoLats.push({
            'x': APWP.age[i], 
            'y': palat, 
            'error': [min, max]
          });
          
          //Paleo-declinations
          paleoDecs.push({
            'x': APWP.age[i], 
            'y': dec, 
            'error': dDx / RADIANS
          });
          
          //Paleo-inclinations
          paleoIncs.push({
            'x': APWP.age[i], 
            'y': inc / RADIANS, 
            'error': dDi / RADIANS
          });				
          
          }
        }
  	  
      // Construct error boundaries ([x, yMin, yMax])
      // The skip variable makes sure we put the errors on the right ages
      // Paleolatitude has non-symmetrical errors
      var skipAge = 0
      for( var i = 0; i < paleoLats.length; i++) {
      	if(APWP.age[i] >= ageMin && APWP.age[i] <= ageMax) {
      	  decErrors.push([APWP.age[i], (paleoDecs[i - skipAge].y - paleoDecs[i - skipAge].error), (paleoDecs[i - skipAge].y + paleoDecs[i - skipAge].error)]);	
      	  incErrors.push([APWP.age[i], (paleoIncs[i - skipAge].y - paleoIncs[i - skipAge].error), (paleoIncs[i - skipAge].y + paleoIncs[i - skipAge].error)]);
      	  palatErrors.push([APWP.age[i], (paleoLats[i - skipAge].y - paleoLats[i - skipAge].error[0]), (paleoLats[i - skipAge].y + paleoLats[i - skipAge].error[1])]);		
      	} else {
      	  skipAge++;
      	}
      }
      
      // Get the color for this particular plate/reference frame; use highcharts custom palette 
      var color = Highcharts.getOptions().colors[(numPlates + numFrames)%8];
      
      poleData.push({x: null, y: null});
      
      /* Format polar wander data for plot:
      * 1 Scatter to show markers
      * 2 Line connecting the markers of series 1 without mouse interaction
      * 3, 4 Confidence ellipses (positive/negative)
      */
      polePos.push({
      	'name': realPlateName, 
      	'data': poleData,
      	'type': 'scatter', 
      	'color': color,
      	'id': realPlateName, 
      	'marker': { 
      	  'symbol': 'circle', 
      	}
      }, {
      	'name': realPlateName, 
      	'data': poleData, 
      	'type': 'line', 
      	'color': color, 
      	'linkedTo': realPlateName,
      	'enableMouseTracking': false
      }, {
      	'name': realPlateName + ' (A95)', 
      	'type': 'line', 
      	'id': 'ellipse', 
      	'color': color, 
      	'data': ellyDat, 
      	'enableMouseTracking': false
      }, {
      	'type': 'line', 
      	'linkedTo': 'ellipse', 
      	'color': color, 
      	'data': ellyDat2, 
      	'enableMouseTracking': false
      });
      
      /* Format data for declination/inclination/paleolatitude plots (x3)
      * 1 	Parameter (either dec/inc/palat)
      * 2 	Confidence interval 
      */
      palatData.push({
      	'name': realPlateName, 
      	'data': paleoLats,
      	'zIndex': 100,
      	'id': plateName, 
      	'color': color,
      	'frame': realRefName2,
      	'marker': {
      	  'fillColor': color
      	},
      }, {
      	'linkedTo': ':previous', 
      	'type': 'arearange', 
      	'data': palatErrors,
      	'color': color
      });
      
      decData.push({
      	'zIndex': 100,
      	'id': plateName, 
      	'name': realPlateName, 
      	'data': paleoDecs,
      	'color': color,
      	'marker': {
      	  'fillColor': color
      	},
      	'frame': realRefName2,
      	'lat': siteLat, 
      	'lon': siteLon
      }, {
      	'linkedTo': ':previous', 
      	'type': 'arearange', 
      	'data': decErrors,
      	'color': color
      });
      
      incData.push({
      	'name': realPlateName, 
      	'data': paleoIncs,
      	'zIndex': 100,
      	'id': plateName, 
      	'color': color,
      	'frame': realRefName2,
      	'marker': {
      	  'fillColor': color
      	},
      }, {
      	'linkedTo': ':previous', 
      	'type': 'arearange', 
      	'data': incErrors,
      	'color': color
      });
    }
  }
        }
  $("#poleTabs").show();
  $("#poleTabCaption").show();
  
  //Call paleo plotting functions
  //Age vs. parameter plots
  var latitude = (siteLat);
  var longitude = (siteLon);
  	
  //Call plotting function for the expected declination, inclination, and paleolatitude
  plotExpectedLocation(palatData, 'palatContainer', 'Paleolatitude', latitude, longitude);
  plotExpectedLocation(decData, 'decContainer', 'Declination', latitude, longitude);
  plotExpectedLocation(incData, 'incContainer', 'Inclination', latitude, longitude);
  
  //Polar plot for pole positions (also add selected data)
  plotPole(polePos);
  plotSiteDataExpected('poles');
		
}
