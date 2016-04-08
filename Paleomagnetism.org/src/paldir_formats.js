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
    var dec = Number(parameters[3]);
    var inc = Number(parameters[4]);
    var int = Number(parameters[1]);

    var cartesianCoordinates = cart(dec, inc, int * 1e3);

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

  return applicationData;

}

/*
 * Parser for the Utrecht format
 * Supported formats (.TH, .AF)
 */
function importUtrecht(applicationData, text) {
	
  "use strict";
	
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
      'demagType': "Unknown",
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

  // Get specimenVolume from file or default to 10cc (in m3)
  var specimenVolume = 10 * Math.pow(10, Number(values[4][1])) || 10e-6;

  // core hade is measured, we use plunge (90 - hade)
  var coreAzi = Number(values[0]);	
  var coreDip = 90 - Number(values[1]);
  var bedStrike = Number(values[2]);
  var bedDip = Number(values[3]);

  var parsedData = new Array();
	
  // Skip first two and last line
  for(var i = 2; i < lines.length - 1; i++) {

    var parameters = lines[i].split(/[,\s\t]+/);

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
  applicationData.push({
    'added': new Date(),
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

  return applicationData;

}