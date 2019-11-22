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

function importHelsinki(text) {

  /*
   * Function importHelsinki
   * Imports demagnetization data in the Helsinki format (plain-text csv)
   */

  var lines = text.split(/[\n\r]/).filter(Boolean);

  // Get some header metadata
  var sampleName = lines[5].split(";")[1]
  var coreAzi = Number(lines[5].split(";")[7])
  var coreDip = Number(lines[6].split(";")[7])
  var volume = Number(lines[7].split(";")[2]);
  var demagType = lines[7].split(";")[7];

  // Bedding is not included: always set to 0, 0
  var bedStrike = 0;
  var bedDip = 0;

  var line;
  var parsedData = new Array();

  // Skip the header (12 lines)
  lines.slice(12).forEach(function(line) {

    var parameters = line.split(";");
	console.log(parameters);
    var step = parameters[1];

    // Take mA/m and set to microamps
    var x = Number(parameters[13]) * 1E3;
    var y = Number(parameters[14]) * 1E3;
    var z = Number(parameters[15]) * 1E3;

    parsedData.push({
      "visible": true,
      "include": false,
      "step": step,
      "x": x,
      "y": y,
      "z": z,
      "a95": 0,
      "info": null
     });

  });

  data.push({
    "volume": volume,
    "added": new Date().toISOString(),
    "format": "Helsinki",
    "demagType": demagType,
    "strat": null,
    "patch": PATCH_NUMBER,
    "GEO": new Array(),
    "TECT": new Array(),
    "interpreted": false,
    "name": sampleName,
    "coreAzi": coreAzi,
    "coreDip": coreDip,
    "bedStrike": bedStrike,
    "bedDip": bedDip,
    "data": parsedData
  });

}

function importCaltech(text) {

  /* Function importCaltech
   * Parses for Caltech Institute of Technology format
   */

  var lines = text.split("\n").filter(Boolean);

  // Sample name is specified at the top
  var sampleName = lines[0].trim();

  // First line has the core & bedding parameters
  var coreParameters = lines[1].split(/\s+/).filter(Boolean);

  // Correct core strike to azimuth and hade to plunge
  var coreAzi = (Number(coreParameters[0].trim()) + 270) % 360;
  var coreDip = 90 - Number(coreParameters[1].trim());
  var bedStrike = Number(coreParameters[2].trim());
  var bedDip = Number(coreParameters[3].trim());
  var volume = Number(coreParameters[4].trim());
 
  var line;
  var parsedData = new Array();

  for(var i = 2; i < lines.length; i++) {

    line = lines[i];

    var stepType = line.slice(0, 2);
    var step = line.slice(2, 6).trim() || "0";
    var dec = Number(line.slice(46, 51));
    var inc = Number(line.slice(52, 57));

    // Intensity in emu/cm3 -> convert to micro A/m (1E9)
    var intensity = 1E9 * Number(line.slice(31, 39));
    var a95 = Number(line.slice(40, 45));
    var info = line.slice(85, 113).trim();

    var cartesianCoordinates = cart(dec, inc, intensity);

    parsedData.push({
      "visible": true,
      "include": false,
      "step": step,
      "x": cartesianCoordinates.x,
      "y": cartesianCoordinates.y,
      "z": cartesianCoordinates.z,
      "a95": a95,
      "info": info
     });

  }

  data.push({
    "volume": volume,
    "added": new Date().toISOString(),
    "format": "Caltech",
    "demagType": null,
    "strat": null,
    "patch": PATCH_NUMBER,
    "GEO": new Array(),
    "TECT": new Array(),
    "interpreted": false,
    "name": sampleName,
    "coreAzi": coreAzi,
    "coreDip": coreDip,
    "bedStrike": bedStrike,
    "bedDip": bedDip,
    "data": parsedData
  });


}

function importBCN2G(text) {

  var text = text.split(/[\u0002\u0003]/);
  text.shift();

  var sampleName = text[2].slice(5, 12);
  var sampleVolume = Number(text[2].slice(14, 16));

  var coreAzi = Number(text[2].slice(101, 104).replace(/\u0000/g, ''));
  var coreDip = Number(text[2].slice(106,108).replace(/\u0000/g, ''));
  var bedStrike = (Number(text[2].slice(110, 113).replace(/\u0000/g, '')) + 270) % 360;
  var bedDip = Number(text[2].slice(115, 117).replace(/\u0000/g, ''));

  var declinationCorrection = Number(text[2].slice(132, 136).replace(/\u0000+/, ''))

  // Overturned bit flag is set: subtract 180 from the dip
  if(text[2].charCodeAt(119) === 1) {
    bedDip = bedDip - 180;
  }

  var parsedData = new Array();
  
  for(var i = 3; i < text.length; i++) {

    var parameters = text[i].split(/\u0000+/);
	
	// Intensity is in emu/cm^3 (0.001 A/m)
    var intensity = 1E9 * Number(parameters[11]);
    var step = parameters[3];
    var dec = Number(parameters[4]);
    var inc = Number(parameters[5]);

    var cartesianCoordinates = cart(dec, inc, intensity);

    parsedData.push({
      'visible': true,
      'include': false,
      'step': step,
      'x': cartesianCoordinates.x,
      'y': cartesianCoordinates.y,
      'z': cartesianCoordinates.z,
      'a95': null,
      'info': null
     });

  }

  data.push({
    'declinationCorrection': declinationCorrection,
    'volume': sampleVolume,
    'added': new Date().toISOString(),
    'format': "BCN2G",
    'demagType': null,
    'strat': null,
    'patch': PATCH_NUMBER,
    'GEO': new Array(),
    'TECT': new Array(),
    'interpreted': false,
    'name': sampleName,
    'coreAzi': coreAzi,
    'coreDip': coreDip,
    'bedStrike': bedStrike,
    'bedDip': bedDip,
    'data': parsedData
  });


}

function importCeniehRegular(text) {

  var lines = text.split(/[\n]/).filter(Boolean);

  var parsedData = new Array();
  var rotatedVectors = new Array();

  for(var i = 1; i < lines.length; i++) {

    var parameters = lines[i].split(/[\t\s]+/);
    var sampleName = parameters[0];
    var step = parameters[1];
    var intensity = Number(parameters[2]);
    var dec = Number(parameters[3]);
    var inc = Number(parameters[4]);
    rotatedVectors.push({"dec": Number(parameters[5]), "inc": Number(parameters[6])});

    // Given intensity is in emu/cc (1E3 A/m)
    var cartesianCoordinates = cart(dec, inc, intensity / 1E-9);

    parsedData.push({
      "visible": true,
      "include": false,
      "step": step,
      "x": cartesianCoordinates.x,
      "y": cartesianCoordinates.y,
      "z": cartesianCoordinates.z,
      "a95": null,
      "info": null
     });

  }

  var beddingString = prompt("Sample " + sampleName + " - please enter: core azimuth,core dip,bedding strike,bedding dip (e.g. 121,24,0,0)");

  var coreAzi = Number(beddingString.split(",")[0]);
  var coreDip = Number(beddingString.split(",")[1]);
  var bedStrike = Number(beddingString.split(",")[2]);
  var bedDip = Number(beddingString.split(",")[3]);
 
  if(beddingString.split(",").length !== 4) {
    throw("Not enough parameters!");
  }

  // The input format has the rotated vectors
  // We check if the user input core azi & dip match what is expected 
  var b = parsedData.map(function(x) {
    return [x.x, x.y, x.z];
  }).map(function(x) {
    return rotateTo(coreAzi, coreDip - 90, x)
  });

  // Check and raise if discrepancy
  for(var i = 0; i < rotatedVectors.length; i++) {
    if(Math.round(b[i].dec) !== Math.round(rotatedVectors[i].dec) || Math.round(b[i].inc) !== Math.round(rotatedVectors[i].inc)) {
      notify("failure", "WARNING: Core parameters incorrect for Cenieh Regular import. Continue on own risk.");
	  break;
      //throw("Parameters incorrect for Cenieh Regular import.");
    }
  }


  data.push({
    "volume": 10, //10cc @ Mark Sier
    "added": new Date().toISOString(),
    "format": "Cenieh Regular",
    "demagType": null,
    "strat": null,
    "patch": PATCH_NUMBER,
    "GEO": new Array(),
    "TECT": new Array(),
    "interpreted": false,
    "name": sampleName,
    "coreAzi": coreAzi,
    "coreDip": coreDip,
    "bedStrike": bedStrike,
    "bedDip": bedDip,
    "data": parsedData
  });

}

function importCenieh(text) {

  notify("note", "Cenieh data importing is experimental and core orientation & bedding is missing.");
  
  var lines = text.split(/[\n]/).filter(Boolean);

  var ceniehSamples = {}
  
  for(var i = 1; i < lines.length; i++) {

	var parameters = lines[i].split(/\s+/);

	var depth = parameters[13];
	var sampleName = parameters[0] + "." + depth;
	
	if(!ceniehSamples.hasOwnProperty(sampleName)) {
	  ceniehSamples[sampleName] = {
	    "data": new Array(),
		"volume": null,
        "added": new Date().toISOString(),
        "format": "Cenieh",
        "demagType": null,
        "strat": depth,
        "patch": PATCH_NUMBER,
        "GEO": new Array(),
        "TECT": new Array(),
        "interpreted": false,
        "name": sampleName,
        "coreAzi": 0,
        "coreDip": 90,
        "bedStrike": 0,
        "bedDip": 0
	  }
    }

	var step = parameters[1];
	var intensity = Number(parameters[2]);	
	var dec = Number(parameters[3]);
	var inc = Number(parameters[4]);
	
    var cartesianCoordinates = cart(dec, inc, intensity / 1e-6);
	
	ceniehSamples[sampleName].data.push({
      "visible": true, 
      "include": false,
      "step": step,
      "x": cartesianCoordinates.x,
      "y": cartesianCoordinates.y,
      "z": cartesianCoordinates.z,
      "a95": null,
      "info": null		
	});
	
  }
  
  // Add hashmap to the data arary
  for(var samp in ceniehSamples) {
    data.push(ceniehSamples[samp]);
  }
	
}


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
		
    var parameters = blocks[i].split("\n");
		
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
	
  // Get lines in the file
  var lines = text.split(/\r?\n/).slice(1).filter(Boolean).filter(function(x) {
    return x.length > 1;
  });

  // The line container all the header information
  var header = lines[0];
  var sampleName = header.slice(0, 9).trim();

  var coreAzimuth = Number(header.slice(12, 17));
  var sampleVolume = Number(header.slice(52, 59));

  // core hade is measured, we use the plunge (90 - hade)
  var coreDip = 90 - Number(header.slice(22, 27));
  var beddingStrike = Number(header.slice(32, 37));
  var beddingDip = Number(header.slice(42, 47));

  // Skip first two and last line
  var parsedData = lines.slice(2).filter(function(line) {

    // Skip empty intensities..
    return Number(line.slice(36, 44)) !== 0;

  }).map(function(line) {

    // Get the measurement parameters
    var step = line.slice(0, 5).trim();
    var x = 1E6 * Number(line.slice(5, 14)) / sampleVolume;
    var y = 1E6 * Number(line.slice(16, 25)) / sampleVolume;
    var z = 1E6 * Number(line.slice(25, 34)) / sampleVolume;
    var a95 = Number(line.slice(69, 73));

     return {
      'visible': true, 
      'include': false,
      'step': step,
      'x': x,
      'y': y,
      'z': z,
      'a95': a95,
      'info': null
    }	

  });

  // Add the data to the application
  data.push({
	'volume': sampleVolume * 1E6,
    'added': new Date().toISOString(),
    'format': "PaleoMac",
    'strat': null,
    'demagType': "Unknown",
    'GEO': new Array(),
    'TECT': new Array(),
    'patch': PATCH_NUMBER,
    'interpreted': false,
    'name': sampleName,
    'coreAzi': coreAzimuth,
    'coreDip': coreDip,
    'bedStrike': beddingStrike,
    'bedDip': beddingDip,
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
