/* PALEOMAGNETISM.ORG INTERPRETATION PORTAL [GRAPHING MODULE]
 * 
 * VERSION: ALPHA.1604
 * LAST UPDATED: 04/07/2016
 *
 * Description: Graphing module for the interpretation portal. Powered by Highcharts.
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

"use strict"

function importOxford(text) {
	
  var lines = text.split(/[\n]/).filter(Boolean);
  var parsedData = new Array();
 
  // Get specimen metadata from the first second line
  var parameters = lines[2].split(/[\t]+/);

  var coreAzi = Number(parameters[13]);
  var coreDip = Number(parameters[14]);
  
  var bedStrike = (Number(parameters[15]) + 270) % 360;
  var bedDip = Number(parameters[16]);
  
  var sampleName = parameters[0];
  var sampleVolume = Math.abs(Number(parameters[18]));

  // Determine what column to use
  // Assume anything with 'Thermal' is TH, and 'Degauss' is AF.
  if(/Thermal/.test(parameters[2])) {
    var stepIndex = 4;
    var demagType = 'TH';
  } else if(/Degauss/.test(parameters[2])) {
    var stepIndex = 3;
    var demagType = 'AF';	  
  } else {
	notify('failure', 'Could not determine type of demagnetization');
	return;
  }
  
  for(var i = 1; i < lines.length; i++) {
	
	// Oxford is delimted by tabs
	var parameters = lines[i].split(/[\t]+/);

	var intensity = Number(parameters[6]);	
	var dec = Number(parameters[11]);
	var inc = Number(parameters[12]);

    var cartesianCoordinates = cart(dec, inc, intensity);

    parsedData.push({
      'visible': true, 
      'include': false,
      'step': parameters[stepIndex],
      'x': cartesianCoordinates.x / (sampleVolume * 1e-6),
      'y': cartesianCoordinates.y / (sampleVolume * 1e-6),
      'z': cartesianCoordinates.z / (sampleVolume * 1e-6),
      'a95': null,
      'info': null
     });
	 
  }
 
  data.push({
	'volume': sampleVolume,
    'added': new Date().toISOString(),
    'format': "Oxford",
    'demagType': demagType,
    'strat': null,
    'patch': PATCH_NUMBER,
    'GEO': new Array(),
    'TECT': new Array(),
    'interpreted': false,
    'name': sampleName,
    'coreAzi': Number(coreAzi),
    'coreDip': Number(coreDip),
    'bedStrike': Number(bedStrike),
    'bedDip': Number(bedDip),
    'data': parsedData
  });
    
}

function importNGU(text) {

  var lines = text.split(/[\n]/).filter(Boolean);
  var parsedData = new Array();
  console.log(lines);
  for(var i = 0; i < lines.length; i++) {

    // Reduce empty lines
    var parameters = lines[i].split(/[,\s\t]+/);
    parameters = parameters.filter(function(x) {
      return x !== "";
    });

    // Get the header
    if(i === 0) {

      var name = parameters[0];

      // Check if sample with name exists -> append copy text
      for(var k = 0; k < data.length; k++) {
        if(name === data[k].name) {
          var skip = true;
        }
      }

      // Different convention for core orientation than Utrecht
      // Munich measures the hade angle
      var coreAzi = Number(parameters[1]);
      var coreDip = 90 - Number(parameters[2]);

      // Bedding strike needs to be decreased by 90 for input convention
      var bedStrike = (Number(parameters[3]) + 270) % 360;

      var bedDip = Number(parameters[4]);
      var info = parameters[5];

    } else {

    // Get Cartesian coordinates for specimen coordinates (intensities in mA -> bring to μA)
    var intensity = Number(parameters[1]);
    var dec = Number(parameters[2]);
    var inc = Number(parameters[3]);

    var cartesianCoordinates = cart(dec, inc, intensity * 1e3);

    parsedData.push({
      'visible': true,
      'include': false,
      'step': parameters[0],
      'x': cartesianCoordinates.x,
      'y': cartesianCoordinates.y,
      'z': cartesianCoordinates.z,
      'a95': Number(parameters[4]),
      'info': info
     });
    }
  }

  if(skip) {
    notify('failure', 'Found duplicate ' + name + '; skipping specimen');
  }

  // Now format specimen meta-data, parameters such as bedding and core orientation go here as well as previously interpreted directions.
  data.push({
    'volume': null,
    'added': new Date().toISOString(),
    'format': "NGU",
    'demagType': "Unknown",
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

}

/*
 * Importing parser for Munich format
 * One sample per file, multiple files can be selected during importing
 */
function importMunich(text) {

  var lines = text.split(/[\n]/).filter(Boolean);
  var parsedData = new Array();

  for(var i = 0; i < lines.length; i++) {
			
    // Reduce empty lines
    var parameters = lines[i].split(/[,\s\t]+/);
    parameters = parameters.filter(function(x) {
      return x !== "";
    });
			
    // Get the header
    if(i === 0) {
		
      var name = parameters[0];
				
      // Check if sample with name exists -> append copy text
      for(var k = 0; k < data.length; k++) {
        if(name === data[k].name) {
          var skip = true;
        }
      }
				
      // Different convention for core orientation than Utrecht
      // Munich measures the hade angle
      var coreAzi = Number(parameters[1]);
      var coreDip = 90 - Number(parameters[2]);
				
      // Bedding strike needs to be decreased by 90 for input convention
      var bedStrike = (Number(parameters[3]) + 270) % 360;

      var bedDip = Number(parameters[4]);
      var info = parameters[5];

    } else {

    // Get Cartesian coordinates for specimen coordinates (intensities in mA -> bring to μA)
    var dec = Number(parameters[3]);
    var inc = Number(parameters[4]);
    var intensity = Number(parameters[1]);

    var cartesianCoordinates = cart(dec, inc, intensity * 1e3);

    parsedData.push({
      'visible': true, 
      'include': false,
      'step': parameters[0],
      'x': cartesianCoordinates.x,
      'y': cartesianCoordinates.y,
      'z': cartesianCoordinates.z,
      'a95': Number(parameters[2]),
      'info': info
     });			
    }
  }

  if(skip) {
    notify('failure', 'Found duplicate ' + name + '; skipping specimen');
  }
	
  // Now format specimen meta-data, parameters such as bedding and core orientation go here as well as previously interpreted directions.
  data.push({
	'volume': null,
    'added': new Date().toISOString(),
    'format': "Munich",
    'demagType': "Unknown",
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

}


function importBeijing(text) {
	
  // Read as a binary string, split by unicode characters
  var text = text.split(/[\u0001\u0002\u0003\u0016\u0084\u0017]/);
  
  // Split by NULL (u0000)
  for(var i = 0; i < text.length; i++) {
    text[i] = text[i].split('\u0000').filter(function(x) {
      return x !== "";
    });
  }
 
  // Sometimes things get a little bit wonky and elements are offset by one
  var text = text[5].length === 8 ? text.splice(4) : text.splice(5);
 
  // Get the core information
  var sampleName = text[0][0];
  var coreParameters = text[1];
  var coreAzi = Number(coreParameters[1]);	
  var coreDip = Number(coreParameters[2]);
  var bedStrike = (Number(coreParameters[3]) + 270) % 360;
  var bedDip = Number(coreParameters[4]);
  
  // Parse the demagnetization information
  // Specimen volume for PGL Beijing is 10cc
  var parsedData = new Array();
  for(var i = 2; i < text.length; i++) {

    var stepData = text[i];
	
	// Coordinates from dec, inc, intensity
    var coordinates = cart(Number(stepData[3]), Number(stepData[4]), Number(stepData[9]) * 1e11);
  	
    parsedData.push({
      'visible': true, 
      'include': false,
      'step': stepData[2],
      'x': coordinates.x,
      'y': coordinates.y,
      'z': coordinates.z,
      'a95': null,
      'info': stepData[stepData.length - 1]
    });
  }
  
  data.push({
	'volume': 10,
    'added': new Date().toISOString(),
    'format': "PGL Beijing",
    'demagType': "Unknown",
    'strat': null,
    'patch': PATCH_NUMBER,
    'GEO': [],
    'TECT': [],
    'interpreted': false,
    'name': sampleName,
    'coreAzi': coreAzi,
    'coreDip': coreDip,
    'bedStrike': bedStrike,
    'bedDip': bedDip,
    'data': parsedData
  });
 	
}

/*
 * Parser for the Utrecht format
 * Supported formats (.TH, .AF)
 */
function importUtrecht(text) {
	
  // Split by 9999 on new line (which indicates end of a single specimen)
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
		// Default to 10.5cc
        var name = parameterPoints[0].replace(/['"]+/g, ''); 
        var sampleVolume = Math.abs(Number(parameterPoints[4])) || 10.5;
		
        // Check if sample with name exists -> append copy text
        for(var k = 0; k < data.length; k++) {
          if(name === data[k].name) {
            var skip = true;
          }
        }						
				
        var stratLevel = parameterPoints[1].replace(/['"]+/g, '');
        var coreAzi = Number(parameterPoints[2]);
        var coreDip = Number(parameterPoints[3]);
        var bedStrike = Number(parameterPoints[5]);
        var bedDip = Number(parameterPoints[6]);
	
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
	      'a95': Number(parameterPoints[4]),
	      'info': parameterPoints[5] + ' at ' + parameterPoints[6]
        });
      }
    }

    if(skip) {
      notify('failure', 'Found duplicate ' + name + '; skipping specimen');
      continue;
    }
		
    // Now format specimen meta-data, parameters such as bedding and core orientation go here as well as previously interpreted directions.
    data.push({
	  'volume': sampleVolume,
      'added': new Date().toISOString(),
      'format': "Utrecht",
      'demagType': "Unknown",
      'strat': stratLevel || null,
      'patch': PATCH_NUMBER,
      'GEO': new Array(),
      'TECT': new Array(),
      'interpreted': false,
      'name': name,
      'coreAzi': coreAzi,
      'coreDip': coreDip,
      'bedStrike': bedStrike,
      'bedDip': bedDip,
      'data': parsedData
    })
  }
	
}


/*
 * Importing function for PaleoMac
 */
function importMac(text) {
	
  var lines = text.split(/[\n\r]/);
  lines.shift();
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

  // Get specimenVolume from file or default to 10cc (in m3)
  var specimenVolume = Math.abs(Number(values[4][0]) * Math.pow(10, Number(values[4][1]))) || 10e-6;

  // core hade is measured, we use plunge (90 - hade)
  var coreAzi = Number(values[0]);	
  var coreDip = 90 - Number(values[1]);
  var bedStrike = Number(values[2]);
  var bedDip = Number(values[3]);

  var parsedData = new Array();
	
  // Skip first two and last line
  for(var i = 2; i < lines.length - 1; i++) {

    // Empty parameters as 0
    var parameters = lines[i].split(/[,\s\t]+/).map(function(x) {
      if(x === "") {
        return "0";
      }
      return x;
    });

    // Skip these
    if(Number(parameters[4]) === 0) continue;

    parsedData.push({
      'visible': true, 
      'include': false,
      'step': parameters[0],
      'x': 1e6 * Number(parameters[1]) / specimenVolume,
      'y': 1e6 * Number(parameters[2]) / specimenVolume,
      'z': 1e6 * Number(parameters[3]) / specimenVolume,
      'a95': Number(parameters[9]),
      'info': null
    });	
  }

  // Add the data to the application
  data.push({
	'volume': specimenVolume * 1e6,
    'added': new Date().toISOString(),
    'format': "PaleoMac",
    'strat': null,
    'demagType': "Unknown",
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

}

/*
 * Importing function for custom .dir files
 */
function importApplication(text) {

  try {
    var importedData = JSON.parse(text);
  } catch(err) {
    notify('failure', 'A fatal error occured during loading: ' + err);
    return;
  }

  for(var i = 0; i < importedData.length; i++) {

    var skip = false;
    for(var l = 0; l < data.length; l++) {
      if(importedData[i].name === data[l].name) {
        var skip = true;
      }
    }

    if(skip) {
      notify('failure', 'Found duplicate ' + importedData[i].name + '; skipping specimen');
      continue;
    }

    data.push(importedData[i]);

  }

}
