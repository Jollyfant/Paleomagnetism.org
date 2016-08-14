/* PALEOMAGNETISM.ORG STATISTICS PORTAL
 * FOLDTEST MODULE
 * 
 * VERSION: 1.2.0
 * LAST UPDATED: 2016-07-18
 *
 * Description: Module Foldtest using the eigenvalue approach (Tauxe and Watson, 1991)
 *
 * Related Scientific Literature: 
 *
 *  Tauxe, L., Watson, G.S. 
 *  The fold test: an eigen analysis approach 
 *  Earth and Planetary Science Letters 122 (3-4), pp. 331-341 
 *  [1994]
 *  
 *  O.K. Smith
 *  Eigenvalues of a symmetric 3 × 3 matrix
 *  Communications of the ACM
 *  [1961]
 *	
 * This open-source application is licensed under the GNU General Public License v3.0
 * and may be used, modified, and shared freely
 */

"use strict";

//Specify running method (blocks procedure if it is already running)
module.foldtest = new Object();
module.foldtest.running = false;

 /*
  * FUNCTION module.foldtest.extremes
  * Description: code to handle geographic and tectonic projections of directions in foldtest module
  * Input: NULL
  * Output: VOID (calls plotting function)
  */
module.foldtest.extremes = function (siteNames) {
	
  // Push the pre-45-cutoff user input data (magnetic directions and beddings) for all sites to the dataArray
  var dataArray = new Array();
  for(var i = 0; i < siteNames.length; i++) {
  	dataArray.push(sites[siteNames[i]].userInput.data);
  }
  
  // Concatenate all previous data blocks to the data array
  // This is the data in geographic coordinates
  var geographicData = [].concat.apply([], dataArray);
  
  // Get the directions in tectonic coordinates
  var tectonicData = new Array();
  for(var j = 0; j < geographicData.length; j++) {
  	var bedding = geographicData[j][2];
  	var dip = geographicData[j][3];
	var direction = correctBedding(bedding, dip, {'dec': geographicData[j][0], 'inc': geographicData[j][1]});
  	tectonicData.push([direction.dec, direction.inc, 0, 0, geographicData[j][4]]);
  }
  
  // Call fold test equal area projections 
  eqAreaFoldLeft(geographicData, 'containerFoldLeft', 'Geographic Coordinates  (0% unfolding)' );
  eqAreaFoldLeft(tectonicData, 'containerFoldRight', 'Tectonic Coordinates  (100% unfolding)');
	
}

/*
 * FUNCTION module.foldtest.getData
 * Description: merged data from multiple sites and returns iteration
 * Input: NULL
 * Output: merged data from all selected sites to be used in the foldtest
 */
 module.foldtest.getData = function (siteNames) {
	
  // Push the pre-45-cutoff user input data (magnetic directions and beddings) for all sites to the datArray
  var datArray = new Array();
  for(var i = 0; i < siteNames.length; i++) {
  	datArray.push(sites[siteNames[i]].userInput.data);
  }
  
  // Concatenate all previous data blocks to the merged array; 
  // result is one large array with all the input data for the selected sites to be returned
  return [].concat.apply([], datArray);
	
 }

/*
 * FUNCTION module.foldtest.initialize
 * Description: unfolds directions
 * Input: pseudo-random directions to be unfolding, and the specified unfolding range (between min - max)
 * Output: Index of maximum clustering (% unfolding with highest principle eigenvalue) and array of taus (increments of 10% unfolding)
 */
 function unfoldData(pseudoDirections, unfoldingMin, unfoldingMax) {
 	
  // Variable to capture the maximum-maximum eigenvalue of one bootstrap
  var max = 0;
  var index = 0;
  
  // Array to capture all maximum eigenvalues for one bootstrap over the unfolding range
  var taus = new Array();
 
  // For this particular random set of directions unfold from the specified min to max percentages (initially in steps of 10)
  for(var j = unfoldingMin; j <= unfoldingMax; j += 10) {
  	
    // Do the tilt correction on all points in pseudoDirections
    var tilts = new Array();
    for(var k = 0; k < pseudoDirections.length; k++) {
      var direction = correctBedding(pseudoDirections[k][2], pseudoDirections[k][3] * 0.01 * j, {'dec': pseudoDirections[k][0], 'inc': pseudoDirections[k][1]});
      tilts.push([direction.dec, direction.inc]);
    }

    // Get the principle eigenvalues for this set of untilted directions
    var eigenvalues = eigValues(tilts);
  	
    // Save the maximum eigenvalue for this bootstrap and unfolding increment
    // Eigenvalue are properties: r(3), s(2), t(1) <- we want 1, the maximum
    // For the bootstraps we're showing on the graph, only take points with steps of 10 degrees to reduce load
    taus.push(eigenvalues['t1']);
  
    // Converge to the maximum eigenvalue t and record the unfolding percentage associated with this
    if(eigenvalues['t1'] > max) {
      max = eigenvalues['t1'];
      index = j
    }

  }
  		
  // If we find the unfolding % that yields the highest tau we zoom in around this point and take steps of 1 deg from -9 to 9 around that point
  // Remember to carry the oldIndex so we know around which point to check
  // Identical procedure to above, only to hone in on the unfolding percentage
  var oldIndex = index;
  
  for(var j = -9; j <= 9; j++) {
  
    // Only if within specified minimum and maximum bounds (Fixe
    if(index + j >= unfoldingMin && index + j <= unfoldingMax) {
  	
      tilts = new Array();
      for(var k = 0; k < pseudoDirections.length; k++) {
        var direction = correctBedding(pseudoDirections[k][2], pseudoDirections[k][3] * 0.01 * (oldIndex + j), {'dec': pseudoDirections[k][0], 'inc': pseudoDirections[k][1]});
        tilts.push([direction.dec, direction.inc]);
      }
  
      // Get the principle eigenvalues for this set of untilted directions
      var eigenvalues = eigValues(tilts);
  
      // Save the maximum eigenvalue for this bootstrap and unfolding increment
      if(eigenvalues['t1'] > max) {
        max = eigenvalues['t1'];
        index = (oldIndex + j);
      }
    }
	
  }
  
  return {
    'index': index, 
    'taus': taus
  }
  
}
 
/*
 * FUNCTION module.foldtest.initialize
 */
module.foldtest.initialize = function () {
	
  // Stop if foldtest procedure is already running
  if(module.foldtest.running) {
    notify('failure', 'A foldtest is already running. Please wait.');
    return;
  }
  
  // Get the array of selected sites ['Site1', 'Site2', '...']
  var siteNames = $('#foldSel').val();
  if(siteNames === null) {
    notify('failure', 'Please select a site.');
    return;
  }
  
  // Check if the number of bootstraps is an integer
  // Surely people will try a negative number of bootstraps -> take the absolute value
  var nBootstraps = 1000;
  
  // Get the data to be used in the foldtest
  var data = module.foldtest.getData(siteNames);
  
  // set isRunning to prevent additional instances being started and time the procedure
  module.foldtest.running = true;
  module.foldtest.timeInit = Date.now();
  
  // Show extremes for the data (geographic and tectonic coordinates)
  module.foldtest.extremes(siteNames);
  
  // Bootstrapping can be quite a hefty computation; therefore we wish to do this asynchronously.
  // We cannot use an ordinary function for this purpose. Therefore, we split the calculation in # bootstraps parts captured in the timed() function.
  // After each bootstrap the browser is given 10ms to catch up and allow other user interaction -- to continue with bootstrapping afterwards.
  // This will prevent freezing of the browser during the computation
  		
  // Get the unfolding percentages (min and max) from the slider range
  var unfoldingMin = -50;
  var unfoldingMax = 150;
  
  // Parameters 
  var iteration = 0;
  var scaling = 10;
  
  // Define data buckets
  var cdf = new Array();
  var untilt = new Array();
  var bootTaus = new Array();
  
  // Capture progressbar to variable
  module.foldtest.bar = $("#progressbar");
  
  // Complete the procedure on the actual data before beginning the bootstrap
  var unfoldedData = unfoldData(data, unfoldingMin, unfoldingMax);	
  bootTaus.push(unfoldedData.taus);
  
  // Main procedure that does all the calculation (this is called # bootstrap times)
  // This function is called automatically
  (module.foldtest.timed = function() {
  	
    // The data is not being sampled parametrically but a pseudo-random select of the data is sampled		
    var unfoldedData = unfoldData(new pseudo(data), unfoldingMin, unfoldingMax);
    
    // Save the maximum untilting percentage for this bootstrap
    untilt.push(unfoldedData.index);
    
    // Show the first 25 bootstraps and the first actual data 
    if(iteration <= 26) {
      bootTaus.push(unfoldedData.taus);
    }
    
    // One bootstrap completed
    iteration++
    
    // Update the progressbar
    module.foldtest.bar.progressbar('value', (iteration)/(nBootstraps) * 100)
    $("#foldPerc").html(((iteration)/(nBootstraps) * 100).toFixed(2) + "%");
    
    // If we have not done all the bootstraps, call the main timed() function again and repeat the procedure.
    // Else escape the procedure
    if(iteration < (nBootstraps)) {
    
      // Call the asynchronous function again with a timeout function (5ms per 5 bootstraps)
      (iteration % 5 === 0) ? setTimeout(function() { module.foldtest.timed(); }, 5) : module.foldtest.timed();
    
    } else {
    	
      // Sort the array containing all maximum untilting percentage
      untilt.sort(function (a, b) {
      	return a > b ? 1 : a < b ? -1 : 0;
      });
    
      // Calculate the cumulative distribution function
      var cdfdat = new Array();
      for(var i = 0; i < untilt.length; i++){
      	cdfdat.push([untilt[i], i/(nBootstraps - 1)]);
      }

      // Get the lower and upper 95% of the sorted bootstrap
      var lower = untilt[parseInt(0.025 * nBootstraps, 10)];
      var upper = untilt[parseInt(0.975 * nBootstraps, 10)];
      
      // Define subtitle for chart (this time - initialization time)
      var calculationTime = Date.now() - module.foldtest.timeInit;
      
      // Reset the progress bar and notify user of success
      notify('success', 'Foldtest has been succesfully completed.');
      
      module.foldtest.bar.progressbar('value', 0)
      $("#foldPerc").html("Done!");
      
      // Call the foldtest plotting function
      plotFoldtestCDF ( cdfdat, bootTaus, lower, upper, unfoldingMin, unfoldingMax, calculationTime, data );
      	
      // Free the running variable for another foldtest
      module.foldtest.running = false;
    
    }
  })();
}
