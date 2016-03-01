/* PALEOMAGNETISM.ORG GRAPHING FUNCTIONS
 * 
 * VERSION: ALPHA.1509
 * LAST UPDATED: 09/01/2015
 *
 * JavaScript file containing Highcharts functions for the Paleomagnetism.org applications.
 * Highcharts is an open-source graphing tool for JavaScript (http://www.highcharts.com/)
 * Most of this file contains options for the various graphs used in the applications (e.g. equal area projections)
 *
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

 /* FUNCTION formatDirections
  * Description: parses data in to Highcharts readable data format
  *			   : our polar chart has a linear y-axis; we use the projected inclination as 'y' and keep the actual inclination in the 'inc' method
  *			   : marker fillColor is dependent on inclination (negative will be white)
  * Input: data object to be parsed, color for data series
  * Output: Highcharts formatted data series
  */
 var formatDirections = function (object, color) {
 
	"use strict";
	
	var formattedDirections = new Array();
	
	//Parse the data to Highcharts series (x, y, and some other options)
	//'y' is the projected inclination through the eqArea routine
	for(var i = 0; i < object.length; i++) {
		formattedDirections.push({
			'x': object[i][0],
			'y': eqArea(object[i][1]),
			'inc': object[i][1],
			'sample': object[i][4],
			'marker': {
				'fillColor': object[i][1] < 0 ? 'white' : color,
				'lineColor': color
			}
		});
	}
	return formattedDirections;
 }
 
/* FUNCTION eqAreaDirections
 * Description: creates equal area projection for magnetic direction table
 * Input: data to be plotted, type of ellipse, and site name
 * Output: VOID (calls Highcharts constructor)
 */
var eqAreaDirections = function(siteName) {

	"use strict";
	
	//Get the coordinate reference frame and cutoff from user input
	var coordinates = ($("#radio input[type='radio']:checked").val() === 'TECT') ? 'dataTC' : 'data';	
	var data = sites[siteName][coordinates];
	
	//Get the confidence ellipse for the data
	//Get ellipse type (a95, butler) and site identity.
	var ellipseType = $("#radioConfDir input[type='radio']:checked").val();
	var ellipse = constructEllipse( data, ellipseType )

	//Get the directional data
	var rejectedDirections = formatDirections(data.dir.rejected, 'rgb(191, 119, 152)');
	var acceptedDirections = formatDirections(data.dir.accepted, 'rgb(119, 152, 191)');
	
	//Use Butler error on declination for confidence parachute
	var plotBands = eqAreaPlotBand(data.params.mDec, data.params.dDx);
	
	// Specification for Highcharts polar chart
	// Our linear polar chart becomes an equal area chart by converting the inclination to a projected inclination through the eqArea() function
	var chartOptions = {
		'chart': {
			'id': 'ChRM',
			'polar': true,
        	'renderTo': 'magneticDirectionGraph' //<div> element the chart is rendered to
    	},
		'tooltip': {
    		'formatter': function() {
        		return '<b>Sample: </b>' + this.point.sample + '<br><b>Declination: </b>' + this.x.toFixed(1) + '<br><b>Inclination: </b>' + this.point.inc.toFixed(1)
			}
		},
		'exporting': {
            'sourceWidth': 600,
            'sourceHeight': 600,
			'filename': siteName + ' (directions)',
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
		'subtitle': {
            'text': 'ChRM Directions',
			'style': { 
				'fontSize': '16px'
			}
        },
		'title': {
            'text': siteName === 'TEMP' ? 'Temporary Site (Unsaved)' : siteName,
			'style': { 
				'fontSize': '26px'
			}
        },
      	'pane': {
			'startAngle': 0,
			'endAngle': 360
     	},
		'yAxis': {
			'type': 'linear',
			'reversed': true,
			'labels': {
				'enabled': false
			},
			'tickInterval': 90,
      	    'min': 0,
			'max': 90,
        },
		'credits': {
			'text': "Paleomagnetism.org (ChRM Directions)",
			'href': ''
		},
        'xAxis': {
			'minorTickPosition': 'inside',
			'type': 'linear',
			'plotBands': plotBands,
			'min': 0,
			'max': 360,
            'minorGridLineWidth': 0,
            'tickPositions': [0, 90, 180, 270, 360],
            'minorTickInterval': 10,
            'minorTickLength': 5,
            'minorTickWidth': 1,
            'labels': {
                'formatter': function () {
                    return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
                }
            }
        },
        'plotOptions': {
			'series': {
				'turboThreshold': 0,
         	   	'animation': false,
			}, 
			'area': {
				'events': {
					'legendItemClick': function () {
						if (this.name === '∆Dx') {
							toggleBands(this.chart, plotBands);
						}
					}
				}
			},
			'line': { 
				'color': 'red', 
				'lineWidth': 1, 
				'dashStyle': 'ShortDash',
				'marker': { 
					'enabled': false 
				} 
			}
       	},
    	'series': [{
			'name': 'Accepted',
			'data': acceptedDirections,
           	'color': 'rgb(119, 152, 191)',
			'type': 'scatter',
			'marker': {
				'symbol': 'circle',
                'lineWidth': 1,
            },
			'zIndex': 10
		}, {
			'name': 'Rejected',
			'data': rejectedDirections,
			'color': 'rgb(191, 119, 152)',
			'type': 'scatter',
			'marker': {
				'symbol': 'circle',
                'lineWidth': 1,
            },
			'zIndex': 10
		}, {         
			'name': 'Mean', 
			'type':'scatter', 
			'color': 'rgb(119, 152, 191)',
			'marker':
			{
				'radius': 5,
				'symbol': 'circle',
               	'fillColor': data.params.mInc < 0 ? 'white' : 'rgb(119, 152, 191)',
               	'lineWidth': 1,
               	'lineColor': 'rgb(119, 152, 191)',
			},
			'data': [{
				'sample': 'Mean Direction', 
				'x'		: data.params.mDec, 
				'y'		: eqArea(data.params.mInc), 
				'inc'	: data.params.mInc
			}]
		}, {
			'name': 'Confidence',
			'type': 'line',
			'zIndex': 100,
			'data': ellipse.pos,
			'enableMouseTracking': false,
		}, {
			'type': 'line',
			'data': ellipse.neg,
			'zIndex': 100,
			'enableMouseTracking': false,
			'linkedTo': ':previous',
		}, {
			'type': 'area', 
			'name': '∆Dx', 
			'id': 'conf', 
			'color': 'rgba(119, 152, 191, 1)'
		}]
	};
	
	//Initialize chart with specified options.
	new Highcharts.Chart(chartOptions);

	//Call function to put parameters on the direction table
	$("#dirInfo").html(directionTable([data.params]));
	$("#dirInfo").show();
	
}


/* 
 * FUNCTION eqAreaVGP
 * Description: creates equal area projection for relative virtual geomagnetic pole positions
 * Input: data to be plotted, type of ellipse, and site name
 * Output: VOID (calls Highcharts constructor)
 */
var eqAreaVGPs = function(name) {

	"use strict";
	
	//Get the coordinate reference frame and cutoff from user input
	var coordinates = ($("#radio input[type='radio']:checked").val() === 'TECT') ? 'dataTC' : 'data';
	var data = sites[name][coordinates];
	var cutoff = sites[name].userInput.metaData.cutoff;
	
	//Get the cutoff for the particular site to place cutoff-circle
	//If none specified; fall back to default 45
	if(cutoff === 'none' ) {
		var tickCutoff = [0, 90];
	} else if (cutoff === 'vandamme') {
		var tickCutoff = [0, eqArea(90-data.params.cut), 90];
	} else if (cutoff === '45') {
		var tickCutoff = [0, eqArea(45), 90];
	} else {
		var tickCutoff = [0, eqArea(45), 90];
	}
	
	//Construct the ellipse parameters using A95 (Fisher cone on poles) around the North pole for VGP plot
	var ellipseParameters = {
		'xDec' 	: 0,
		'xInc'	: 90,
		'yDec'	: 0,
		'yInc'	: 0,
		'zDec'	: 90,
		'zInc'	: 0,
		'beta'	: data.params.A95,
		'gamma'	: data.params.A95
	};
	
	var ellipse = new ellipseData(ellipseParameters, false);

	//Get the formatted data
	var acceptedVGPs = formatDirections(data.vgpRotated.accepted, 'rgb(119, 152, 191)');
	var rejectedVGPs = formatDirections(data.vgpRotated.rejected, 'rgb(191, 119, 152)');

	//Specify chart options for the VGP chart
	var chartOptions = {
		'chart': {
			'id': 'VGP',
			'polar': true,
			'animation': true,
        	'renderTo': 'VGPPositionGraph'
    	},
		'exporting': {
			'filename': name + '_45',
            'sourceWidth': 600,
            'sourceHeight': 600,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
		'tooltip': {
    		'formatter': function() {
        		return '<b>Sample: </b>' + this.point.sample + '<br><b>Longitude: </b>' + this.x.toFixed(1) + '<br><b>Latitude: </b>' + this.point.inc.toFixed(1) + '<br><p><i>VGP positions are relative to the mean VGP</i>'
    		}
		},
		'subtitle': {
            'text': 'VGP Positions',
			'style': { 
				'fontSize': '16px'
			}
        },
		'title': {
			'text': name == 'TEMP' ? 'Temporary Site (Unsaved)' : name,  
			'style': { 
				'fontSize': '26px'
			}			
		},
      	'pane': {
			'startAngle': 0,
     	    'endAngle': 360
     	},
     	'yAxis': {
      	    'min': 0,
		    'max': 90,
			'type': 'linear',
			'reversed': true,
			'tickPositions': tickCutoff, //Add circle for the cutoff.
			'labels': {
				'enabled': false
			},
        },
		'credits': {
			'text': "Paleomagnetism.org (Relative VGP Positions)",
			'href': ''
		},
        'xAxis': {
			'minorTickPosition': 'inside',
			'type': 'linear',
			'min': 0,
			'max': 360,
            'minorGridLineWidth': 0,
            'tickPositions': [0, 90, 180, 270, 360],
            'minorTickInterval': 10,
            'minorTickLength': 5,
            'minorTickWidth': 1,
            'labels': {
				'formatter': function () {
					return this.value + '\u00B0'; //Add degree symbol to xAxis labels.
                }
            }
        },
        'plotOptions': {
			'series': {
				'turboThreshold': 0,
         	   	'animation': false,
			}, 
			'line': { 
				'color': 'red', 
				'dashStyle': 'ShortDash',
				'lineWidth': 1, 
				'marker': { 
					'enabled': false 
				} 
			}
       	},
    	'series': [{
			'name': 'Accepted',
           	'color': 'rgb(119, 152, 191)',
			'type': 'scatter',
			'data': acceptedVGPs,
			'marker': {
				'symbol': 'circle',
               	'lineWidth': 1,
           	}
		}, {
			'color': 'rgb(191, 119, 152)',
			'type': 'scatter',
			'name': 'Rejected',
			'data': rejectedVGPs,
			'marker': {
				'symbol': 'circle',
               	'lineWidth': 1,
           	}
		},  {         
			'type':'scatter', 
			'color': 'rgb(119, 152, 191)',
			'marker': {
				'radius': 6,
				'symbol': 'circle',
			},
			'name': 'Mean', 
			'data': ([{'sample': 'Mean', x: 0, y: 90, inc: 90}]) //Cheat and set mean declination to 0 and inclination to 90. It should be 0, 90 anyway. Always.
		}, {
			'type': 'line',
			'data': ellipse.neg,
			'enableMouseTracking': false,
			'name': 'Confidence',
		}, {
			'type': 'line',
			'data': ellipse.pos,
			'enableMouseTracking': false,
			'linkedTo': ':previous',
		}]
	};
	
	//Initialize chart with options
	new Highcharts.Chart(chartOptions);
	
}

/* 
 * FUNCTION plotMeans
 * Description: creates equal area projection for mean directions in geographic and tectonic coordinates
 * Input: siteData@ARRAY (array containing data and names for all sites to be plotted)
		: container@STRING (<div> the chart is rendered to)
		: title@STRING (title of chart)
 * Output: VOID (calls Highcharts constructor)
 */
var plotMeans = function(siteData, container, title) {

	"use strict";
	
	//Get the selected confidence interval
	var ellipseType = $("#radioConfMean input[type='radio']:checked").val();
			
	//Loop over all sites to be plotted (store in meanSeries data array)
	//Construct the meanSeries data object that contains all data to be plotted
	var meanSeries = new Array();
	for(var i = 0; i < siteData.length; i++) {
	
		//Get the site name and some color parameters (color individually may be checked)
		var siteName = siteData[i].name;
		var lineColor = sites[siteName].userInput.metaData.markerColor;
		var fillColor = siteData[i].data.params.mInc < 0 ? 'white' : lineColor;

		meanSeries.push({
			'name': siteName, 
			'id': siteName, 
			'type': 'scatter', 
			'data': [{
				'x': siteData[i].data.params.mDec,
				'y': eqArea(siteData[i].data.params.mInc),
				'inc': siteData[i].data.params.mInc
			}],
			'marker': {
				'symbol': 'circle',
				'fillColor': fillColor,
				'lineWidth': 1,
				'lineColor': lineColor,
			}
		});

		//Request confidence ellipse
		var ellipse = constructEllipse ( siteData[i].data, ellipseType );
				
		meanSeries.push({
			'linkedTo': siteName, 
			'data': ellipse.neg,
			'enableMouseTracking': false, 
		}, {
			'linkedTo': siteName, 
			'data': ellipse.pos,
			'enableMouseTracking': false
		});
	}

	//Specify the chart options
	var chartOptions = {
		'chart': {
			'id': 'mean',
			'polar': true,
			'animation': true,
        	'renderTo': container
    	},
		'tooltip': {
			'useHTML': true,
    		'formatter': function() {
					var contentString = '';
					contentString += '<a onClick="module.map.changeColorFromName(\''+this.series.name+'\', \''+this.series.index+'\', \'red\')"><u>red</u></a>&nbsp'
					contentString += '<a onClick="module.map.changeColorFromName(\''+this.series.name+'\', \''+this.series.index+'\', \'orange\')"><u>orange</u></a>&nbsp'
					contentString += '<a onClick="module.map.changeColorFromName(\''+this.series.name+'\', \''+this.series.index+'\', \'blue\')"><u>blue</u></a>&nbsp'
					contentString += '<a onClick="module.map.changeColorFromName(\''+this.series.name+'\', \''+this.series.index+'\', \'green\')"><u>green</u></a>&nbsp'
					contentString += '<a onClick="module.map.changeColorFromName(\''+this.series.name+'\', \''+this.series.index+'\', \'purple\')"><u>purple</u></a>'

        		return '<b>Mean for Site : </b> ' + this.series.name + '<br><b>Mean Declination: </b>' + this.x.toFixed(1) + '<br><b>Mean Inclination: </b>' + this.point.inc.toFixed(1) + ' <br> '  + contentString //Tooltip on point hover. We convert the projected inclination back to the original inclination using eqAreaInv and display it to the user.
    		}
		},
		'title': {
            'text': title,
			'style': { 
				'fontSize': '26px'
			}
        },
		'legend': {
			'maxHeight': 60,
            'enabled': true,
        },
        'subtitle': {
			'text': 'Mean Directions',
			'style': { 
				'fontSize': '16px'
			}
			
        },
      	'pane': {
			'startAngle': 0,
			'endAngle': 360
     	},
		'yAxis': {
			'type': 'linear',
			'reversed': true,
			'labels': {
				'enabled': false
			},
			'tickInterval': 90,
      	    'min': 0,
			'max': 90,
        },
		'exporting': {
			'filename': 'Mean_Directions',
            'sourceWidth': 600,
            'sourceHeight': 600,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
		'credits': {
			'text': "Paleomagnetism.org (ChRM Mean Directions)",
			'href': ''
		},
        'xAxis': {
			'minorTickPosition': 'inside',
			'type': 'linear',
			'min': 0,
			'max': 360,
            'minorGridLineWidth': 0,
            'tickPositions': [0, 90, 180, 270, 360],
            'minorTickInterval': 10,
            'minorTickLength': 5,
            'minorTickWidth': 1,
            'labels': {
                'formatter': function () {
                    return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
                }
            }
        },
        'plotOptions': {
			'series': {
			    'animation': false,
				'turboThreshold': 0,
			}, 
			'line': { 
				'color': 'red', 
				'lineWidth': 1, 
				'dashStyle': 'ShortDash',
				'marker': { 
					'enabled': false 
				} 
			}
       	 },
    	'series': meanSeries
	};

	new Highcharts.Chart(chartOptions); //Initialize chart with specified options.

	//Show the figures
	$("#meanDirections").show();

};

/* FUNCTION CTMDXYZ
 * Description: graphing function for bootstrapping CTMDs
 */
function CTMDXYZ (one, two, lower, upper, container, info, title, nBootstraps) {

	"use strict";
	
	//get the coordinate system
	var coordinates = $('#tcFlagCTMD').prop('checked') ? 'Tectonic' : 'Geographic';
	
	//Calculate the CDFs
	var cdfOne = getCDF(one);
	var cdfTwo = getCDF(two);
	
	//Define plot bands to represent confidence envelopes
	var plotBands = [{
		color: 'rgba(119, 152, 191, 0.25)', // Color value
		from: one[lower],
		to: one[upper],
	}, {
		color: 'rgba(191, 119, 152, 0.25)', // Color value
		from: two[lower],
		to: two[upper],
	}];
			
	//Define the cumulative distribution function
	//Info array contains site names
	var mySeries = [{
		'name': info[0], 
		'data': cdfOne,
		'color': 'rgb(119, 152, 191)',
		'marker': {
			'enabled': false
		}
	}, {
		'name': info[1],
		'color': 'rgb(191, 119, 152)',
		'data': cdfTwo, 
		'marker': {
			'enabled': false
		}
	}, {
		'one': one[lower], 
		'two': one[upper], 
		'three': two[lower], 
		'four': two[upper], 
		'type': 'area', 
		'name': '95% Confidence Intervals', 
		'id': 'conf', 
		'color': 'rgba(119, 152, 191, 1)'
	}];
	
	//Chart options	to be used
	var chartOptions = {
        'title': {
            'text': title,
        },
		'exporting': {
			'filename': 'CBOOT',
		    'sourceWidth': 600,
            'sourceHeight': 600,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                },
			}
        },
		'chart': {
			'id': 'CTMDXYZ',
			'renderTo': container
		},
        'subtitle': {
			'text': coordinates + ' (' + nBootstraps + ' bootstraps)'
        },
		'plotOptions': {
			'series': {
				'turboThreshold': 0
			},
			'area': {
				'events': {
					'legendItemClick': function (e) {
						if (this.name == '95% Confidence Intervals') {
							toggleBands(this.chart, plotBands);
						}
					}
				}
			}
		},
        'xAxis': {
			'title': {
                'text': 'Cartesian Coordinates on Unit Sphere'
            },
			'plotBands': plotBands,
		},
		'credits': {
			'text': "Paleomagnetism.org [CTMD] - Coordinate Bootstrap (Tauxe et al., 2010)",
			'href': ''
		},
        'yAxis': {
			'min': 0,
			'max': 1,
            'title': {
                'text': 'Cumulative Distribution'
            }
        },
        'tooltip': {
    		'formatter': function() {
        		return '<b> Cumulative Distribution </b><br><b>' + title + ': </b>' + this.x.toFixed(2) + '<br><b>CDF: </b>' + this.point.y.toFixed(3) //Tooltip on point hover. We convert the projected inclination back to the original inclination using eqAreaInv and display it to the user.
    		}
		},
        'series': mySeries
    }
	
	//Call the Highcharts constructor
	new Highcharts.Chart(chartOptions);
	
}

/*
 * FUNCTION CTMDHeatMap
 * Description: creates heatmap matrix for classifications for the reversal test
 * Input: 
 * Output: VOID (calls Highcharts constructor)
 */
function CTMDheatMap( labels, data, time ) {
   
   	"use strict";
	
	//Get the coordinate reference frame		
	var coordinates = $('#tcFlagCTMD').prop('checked') ? 'Tectonic' : 'Geographic' + ' Coordinates';

	//Scaling for the font-size of the letters on the grid
	var fontSize = (180/parseInt(Math.sqrt(data.length))) + 'px';
   
	//Set up data arrays for the different classifications. The blank array becomes a transparent trace on (i, i) to prevent auto-zooming.
	var blank = new Array();
	var negative = new Array();
	var indeterminate = new Array();
	var classificationA = new Array();
	var classificationB = new Array();
	var classificationC = new Array();
   
	//Amount of permutations
	var nPermutations = (data.length - labels.length);

	//Sort the data to their respective classifications
	for(var i = 0; i < data.length; i++) {

		//Parsing data for Highcharts (x, y) and get the classification
		var parsed = {
			'x': data[i][0], 
			'y': data[i][1], 
			'parameters1': data[i][4], 
			'parameters2': data[i][5]
		};
		
		
		//Extend our parsed data object with some tooltip information (e.g. critical angle, site names, classification)
		$.extend(parsed, data[i][3]);
		
		//Sort results to the different classifications	
	    var classification = parsed.classification;	
		if(classification == 'blank') {
			blank.push(parsed);
		} else if(classification == 'Negative') {
			negative.push(parsed);
		} else if(classification == 'Indeterminate') {
			indeterminate.push(parsed);
		} else if(classification == 'A') {
			classificationA.push(parsed);
		} else if(classification == 'B') {
			classificationB.push(parsed);
		} else if(classification == 'C') {
			classificationC.push(parsed);
		}
	}
	
	//HighCharts heatmap plugin used to show a grid of permutations
	var chartOptions = {
        'chart': {
			'id': 'CTMD',
            'type': 'heatmap',
			'renderTo': 'CTMDHeatMap'
        },
        'xAxis': {
            'categories': labels,
            'tickInterval':  1,
            'gridLineWidth': 1,
            'tickLength': 0,
            'lineWidth': 0,
			'title': {
				'text': 'Sites'
            }
        },
		'tooltip': {
		    'positioner': function () {
                return {
					x: 450, 
					y: 600
				};
            },
			'formatter': function() {
        		return '<b>Comparison: </b> site <b>' + this.point.one + '</b> vs site <b>' + this.point.two + 
				'</b><br><b>Distribution 1: </b>' + this.point.parameters1 +
				'</b><br><b>Distrbution 2: </b>' + this.point.parameters2 +
				'</b><br><b>Type: </b>' + this.point.type + 
				'</b><br><b>Classification: </b>' + this.point.classification + 
				'<br><b>Angle between directions: </b>' + this.point.G.toFixed(2) + 
				'<br><b>Critical Angle: </b>' + this.point.gc.toFixed(2);			
			}
		},
		'title': {
            'text': 'Common True Mean Directions',
			'style': { 
				'fontSize': '32px'
			}
        },
		'subtitle': {
            'text': 'Classified ' + nPermutations + ' permutations in ' + time + 'ms (<b>' + coordinates + '</b>)',
        },
		'credits': {
			'text': "Paleomagnetism.org [CTMD Module] - <i> after McFadden and McElhinny, 1990 </i>",
			'href': '',
		},
		'plotOptions': {
			'series': {
				'point': {
					'events': {
						'click': function () {
							 module.CTMD.xyz(this.one, this.two); //When a tile is clicked, trigger the Lisa Tauxe (2014 [b]) Cartesian bootstrap
						}
					}
				}
			}
		},
        'yAxis': {
            'categories': labels,
            'tickInterval':  1,
			'gridLineWidth': 1,
            'tickLength': 0,
            'lineWidth': 0,
			'title': {
				'text': 'Sites'
            },
        },
        'legend': {
            'enabled': true,
			'title': { 
				'text' : 'CMTD Classifications after (McFadden and McElhinny, 1990)'
			}
        },
        'series': [{
			'name': 'Classification A',
            'data': classificationA,
            'color': 'rgb(119, 191, 152)',
            'dataLabels': {
				'enabled': true,
				'style': {
					'fontSize': fontSize,
					'fontWeight': 'bold'
				},
				'format': 'A',
				'color': '#FFF'
			}
		}, {
			'name': 'Classification B',
            'data': classificationB,
            'color': 'rgb(119, 152, 191)',
            'dataLabels': {
				'enabled': true,
				'style': {
					'fontSize': fontSize,
					'fontWeight': 'bold'
				},
				'format': 'B',
				'color': '#FFF'
			}
		}, {
			'name': 'Classification C',
            'data': classificationC,
            'color': 'rgb(191, 152, 119)',
            'dataLabels': {
				'enabled': true,
				'style': {
					'fontSize': fontSize,
					'fontWeight': 'bold'
				},
				'format': 'C',
				'color': '#FFF'
			}
		}, {
			'name': 'Negative',
            'data': negative,
            'color': 'rgb(191, 119, 152)',
            'dataLabels': {
				'enabled': true,
				'style': {
					'fontSize': fontSize,
					'fontWeight': 'bold'
				},
				'format': 'N',
				'color': '#FFF'
			}
		}, {
			'name': 'Indeterminate',
            'data': indeterminate,
            'color': 'rgb(152, 119, 191)',
            'dataLabels': {
				'enabled': true,
				'style': {
					'fontSize': fontSize,
					'fontWeight': 'bold'
				},
				'format': 'I',
				'color': '#FFF'
			}
		}, {
            'data': blank,
            'color': '#E8E8E8 ', //Light grey trace at (i, i)
			'showInLegend': false,
			'enableMouseTracking': false
		}]
	}
	
	//Call the Highcharts constructor
	new Highcharts.Chart(chartOptions);	

	//Display the CTMD chart
	$("#CTMDHeatMap").show();
}

/* FUNCTION eqAreaPlotBand
 * Description: Creates the plotBand data for an equal area projection
 */
function eqAreaPlotBand(mDec, decError) {

	"use strict";
	
	var plotBandColor = 'rgba(119, 152, 191, 0.25)';

	var plotBands = [{
		from: (mDec - decError),
		to: (mDec + decError),
		color: plotBandColor,
		innerRadius: '0%',
		thickness: '100%',
	}];
				
	//Plotbands in polar charts cannot go below through North (e.g. 350 - 10) so we go from (360 - 10) and (350 - 360) instead 
	if(mDec - decError < 0) {
		plotBands.push({
			from: (360),
			to: (mDec - decError + 360),
			color: plotBandColor,
			innerRadius: '0%',
			thickness: '100%',
		});
	}
	
	if(mDec + decError > 360) {
		plotBands.push({
			from: 0,
			to: (mDec + decError - 360),
			color: plotBandColor,
			innerRadius: '0%',
			thickness: '100%',
		});
	}
	
	return plotBands;
}

/* 
 * FUNCTION directionTable
 * Creates statistical parameter table for directions/VGPs
 * INPUT: Statistical parameters (p) -> OBJECT
 * OUTPUT: Formatted $TABLE
 */

function directionTable (p, nameArray) {
	
	"use strict";
		
	var table = '<div id="dirDat"><table class="sample">';

	var infoItems = [   
		['N', 'Number of accepted directions'],
		['Ns', 'Total number of directions'],
		['Cutoff', 'Cutoff Angle'],
		['S', 'Virtual Geomagnetic Pole Scatter'],
		['mDec', 'Mean Declination'],
		['mInc', 'Mean Inclination'],
		['R', 'Resultant vector length'],
		['k', 'Dispersion of directions'],
		['α95', 'Fisher cone of confidence (directions)'],
		['K', 'Disperion of VGPs'],
		['A95', 'Fisher cone of confidence (VGPs)'],
		['A95<small>min</small>', 'PSV minimum (Deenen et al., 2011)'],
		['A95<small>max</small>', 'PSV maximum (Deenen et al., 2011)'],
		['ΔDx', 'Butler declination error'],
		['ΔIx', 'Butler inclination error'],
		['λ', 'Dipole calculate paleolatitude']
	];
	
	//If site means then add a header for the site name
	if(nameArray != undefined) {
		infoItems.unshift(['Site Name', 'Site Name']);
	}
	
	table += '<thead><tr>';
	
	//Add header row
	for(var i = 0; i < infoItems.length; i++) {
		table += '<th title="'+infoItems[i][1]+'">' + infoItems[i][0] + '</th>';
	}
	
	table += '</tr></thead><tbody>';
	
	//Add the content rows
	for(var j = 0; j < p.length; j++) {
		var parameters = [
			p[j].N, 
			p[j].Ns, 
			p[j].cut.toFixed(1), 
			p[j].S.toFixed(1), 
			p[j].mDec.toFixed(1), 
			p[j].mInc.toFixed(1), 
			p[j].R.toFixed(1), 
			p[j].k.toFixed(1), 
			p[j].a95.toFixed(1), 
			p[j].K.toFixed(1), 
			p[j].A95.toFixed(1), 
			p[j].A95min.toFixed(1), 
			p[j].A95max.toFixed(1), 
			p[j].dDx.toFixed(1), 
			p[j].dIx.toFixed(1), 
			p[j].palat.toFixed(1)
		];
		
		if(nameArray != undefined) {
			parameters.unshift(nameArray[j]);
		}
		
		table += '<tr>';
		for(var i = 0; i < infoItems.length; i++) {
			table += '<td title="'+infoItems[i][1]+'">' + parameters[i] + '</td>';
		}
		table += '</tr>';
	}
	table += '</tbody>';
	
	table += '</table></div>';
	
	if(nameArray != undefined) {
		table += '<div style="float: right"><small>Tip: table data can be exported through the chart download button or by clicking the export all button at the left bottom of the page.</small></div><br>'
	}
			
	return table;

}

/* FUNCTION: toggleBands
 * Description: toggles confidence bands on plots
 * Input: the respective chart, and an array containing the plotBand data (e.g. to, from values)
 * Output: VOID
 */
function toggleBands(chart, plotBands) {
	
	"use strict";
	
	//Get the number of plotlines and plotbands
    var i = chart.xAxis[0].plotLinesAndBands.length;
	
	//Larger than 1? Delete them all.
	//Otherwise, add them all.
    if (i > 0) {
        while (i--) {
            chart.xAxis[0].plotLinesAndBands[i].destroy();
        }
    } else {
        chart.xAxis[0].update({
            plotBands: plotBands
        });
    }

}

function eqAreaFoldLeft ( data, container, subtitle, type ) {
	
	"use strict";
	
	//If type 'tiny' is used, we wish to remove some information (e.g. credits) from the chart and set the marker size smaller
	if(type === 'tiny') {
		var title = '';
		var iRadius = 2;
		var bCredit = false;
		var bLegend = false;
		var bExport = false;
	} else {
		var title = 'Geomagnetic Directions';
		var iRadius = 4;			
		var bCredit = true;
		var bLegend = true;
		var bExport = true;
	}
	
	var magneticDirections = new Array();

	//We have one series containing all data
	for(var i = 0; i < data.length; i++) {
		magneticDirections.push({
			'sample': data[i][4], 
			'x': data[i][0], 
			'y': eqArea(data[i][1]), 
			'inc': data[i][1],
			'marker': {
				'fillColor': data[i][1] < 0 ? 'white' : 'rgb(119, 152, 191)',
				'lineColor': 'rgb(119, 152, 191)'
			}
		});
	}
		
	//Specification of chartOptions
	var chartOptions = {
		chart: {
			'backgroundColor': 'rgb(255, 255, 255)',
			'id': 'containerFoldLeft',
			'polar': true,
			'borderColor': 'rgb(119, 152, 191)',
			'borderWidth': type === 'tiny' ? 1 : 0, 
			'animation': true,
        	'renderTo': container, 
			'events': {
                'load': function () {
                    if(this.options.chart.forExport) {
                        Highcharts.each(this.series, function (series) {
                            series.update({
                                marker: { 
									radius: 4 //Work around to resize markers on exporting from radius 2 (tiny preview) to 4 (normalized) Fixes [#0011]
								}
							}, false);
						});
						this.redraw();
					}
				}
			},
		},
		'tooltip': {
			'borderColor': 'rgb(119, 152, 191)',
    		'formatter': function() {
        		return '<b>Sample: </b> ' + this.point.sample + '<br><b>Declination: </b>' + this.x.toFixed(1) + '<br><b>Inclination: </b>' + this.point.inc.toFixed(1)
    		}
		},
		'title': {
            'text': title,
			'style': { 
				'fontSize': '32px'
			}
        },
		'legend': {
            'enabled': bLegend,
        },
        'subtitle': {
			'text': subtitle,
        },
      	'pane': {
			'startAngle': 0,
			'endAngle': 360
     	},
		'yAxis': {
			'type': 'linear',
			'reversed': true,
			'labels': {
				'enabled': false
			},
			'tickInterval': 90,
      	    'min': 0,
			'max': 90,
        },
		'exporting': { 
			'chartOptions': { 
				'legend': { 
					'enabled': true
				}, 
				'title': {
					'text': 'Geomagnetic Directions'
				}, 
				'subtitle': {
					'text': subtitle
				}
			},
			'enabled': true,
            'sourceWidth': 600,
			'sourceHeight': 600,
			'filename': 'Foldtest_45',
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
		'credits': {
			'enabled': bCredit,
			'text': "Paleomagnetism.org (ChRM Mean Directions)",
			'href': ''
		},
        'xAxis': {
			'minorTickPosition': 'inside',
			'type': 'linear',
			'min': 0,
			'max': 360,
            'minorGridLineWidth': 0,
            'tickPositions': [0, 90, 180, 270, 360],
            'minorTickInterval': 10,
            'minorTickLength': 5,
            'minorTickWidth': 1,
            'labels': {
                'formatter': function () {
                    return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
                }
            }
        },
        'plotOptions': {
            'animation': false,
			'scatter': { 
				'marker' : {
					'radius': iRadius
				},
			},
			'series': {
				'turboThreshold': 0,
         	   	'animation': false,
			}, 
       	 },
    	'series': [{
			'data': magneticDirections,
			'name': 'Geomagnetic Directions',
			'color': 'rgb(119, 152, 191)',
			'type': 'scatter',
			'marker': {
				'symbol': 'circle',
				'lineWidth': 1,
			},
			'zIndex': 10
		}],
	};

	//Initialize chart with specified options.
	new Highcharts.Chart(chartOptions); 
	
	$("#showFoldAreas").show();

}

/*
 * FUNCTION EIbootstraps
 * Description: handles chart options for EI module figure with bootstraps
 *
 *
 */
function EIbootstraps (data, time, nb, input, name) {
	
	//Data bucket for TK03.GAD polynomial [x, y] data
	//Get the expected elongation from inclination 0 to 90
	var TK03Poly = new Array();
	for(var i = 0; i <= 90; i++){
		TK03Poly.push({
			'x': i, 
			'y': module.EI.polynomial(i)
		});
	}
		
	//Define the initial series (TK03.GAD Polynomial) and the unflattening of the actual non-bootstrapped data (kept in data[0])
	mySeries = [{
		'name': 'TK03.GAD', 
		'data' : TK03Poly,
		'dashStyle': 'ShortDash',
		'lineWidth': 3,
		'zIndex': 100,
		'type': 'spline',
		'marker': {
			'enabled': false
		}
	}, {
		'name': 'Bootstraps',
		'color': 'red',
		'type': 'spline',
		'data': data[0],
		'zIndex': 100,
		'lineWidth': 3,
		'id': 'bootstrap',
		'marker': {
			'enabled': false,
			'symbol': 'circle',
		}	
	}]

	//Push all bootstraps to the series array
	//From 1 to the end of the data array; data[0] is the actual non-bootstrapped data
	for(var i = 1; i < data.length; i++) {
		mySeries.push({
			'color': 'rgba(119, 152, 191,0.25)', 
			'linkedTo': 'bootstrap',
			'enableMouseTracking': false, 
			'data': data[i],
			'type': 'spline',
			'marker': {
				'enabled': false
			}
		})
	}

	var chartOptions = {
		'chart': {
			'input': input,
			'site': name,
			'flattening': data[0].length === 0 ? 0 : data[0][data[0].length - 1].f,
			'id': 'EIboot',
			'renderTo': 'EIbootstraps',
			'marginRight': 200,
			'events': {
				'load': function() {
					var temp = $.extend(this.options.myTooltip, this.options.tooltip);
					this.myTooltip = new Highcharts.Tooltip(this, temp);                    
				}, 
				'click': function() {
					this.myTooltip.hide()
				}
			}
		},
        'title': {
            'text': 'Bootstrapped E-I Pairs',
        },
        'subtitle': {
            'text': 'Found ' + nb + ' bootstrapped intersections with the TK03.GAD Field Model in ' + time + 'ms',
        },
		'exporting': {
			'filename': 'TK03-EI',
			'sourceWidth': 1000,
            'sourceHeight': 400,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
        'xAxis': {
			'min': 0,
			'max': 90,
			'title': {
                'text': 'Inclination (°)'
            }
		},
        yAxis: {
			'floor': 1,
			'ceiling': 2.5,	
            'title': {
                'text': 'Elongation (τ2/τ3)'
            },
        },
		'credits': {
			'text': "Paleomagnetism.org [EI Module] - <i>after Tauxe et al., 2008 </i>",
			'href': ''
		},
		'plotOptions': {
			'series': {
				'turboThreshold': 0,
				'stickyTracking': true,
				'point': {
					'events': {
					    'click': function(evt) {	//Function to handle miniature equal area projection

							this.series.chart.tooltip.hide();
							this.series.chart.myTooltip.hide()
							
							//Only handle the miniature for the thick red bootstrap line
							if(this.series.name == 'Bootstraps') {
								this.series.chart.myTooltip.refresh(evt.point, evt);
								var newDatArray = new Array();
		
								//Get data for particular percentage of unfolding (at this.x = the clicked x-axis value)
								for(var i = 0; i < input.length; i++) {
									newDatArray.push([input[i][0],  (Math.atan(Math.tan(input[i][1]*rad) / this.f))/rad, input[i][2], input[i][3], input[i][4]]);
								}
								
								//Put the flattening factor for the clicked point in the subtitle
								var subtitle = '<b>Flattening factor: </b>' + this.f;
						
								//Allow the tooltip some time to be created (5ms) before adding the tiny chart
								//Otherwise the rendering div cannot be found by Highcharts
								setTimeout(function() {
									if($("#plotEIflat").length > 0) {
										eqAreaFoldLeft( newDatArray, 'plotEIflat', subtitle, 'tiny' ) 	//Initialize tiny equal area projection in tooltip
									} else {
										console.log('Notification: tooltip not present for chart initialization.'); //Rendering div still not found after 5ms?
									}
								}, 5);
							}
						}  
					}
				}
			},
		},
		'tooltip': {
			'enabled': true,
			'formatter': function(evt) {
				if(this.series.name == 'Bootstraps') {
					return  '<b>Inclination: </b> ' + this.x.toFixed(3) + '<br><b>Elongation: </b>' + this.y.toFixed(3) + '<br><b>Flattening factor </b> at ' + this.point.f + ' <br> <hr> <div id="plotEIflat" style="width: 250px; height: 250px; margin: 0 auto;"></div>';
				} else {
					return '<b>TK03.GAD Expected Elongation</b><br><b>Inclination: </b>' + this.x + '<br><b>Elongation </b>' + this.y.toFixed(3);
				}
			}
        },
		'myTooltip': {
			'positioner': function (evt) {
                return { 
					'x': 80, 
					'y': 50 
				};
            },
			'enabled': false,
			'useHTML': true,
        },
        'legend': {
            'layout': 'vertical',
            'align': 'right',
            'verticalAlign': 'middle',
            'borderWidth': 0
        },
        'series': mySeries
    }
	


	//Initialize chart with specified options.
	var chart = new Highcharts.Chart(chartOptions); 

	if(chart) {
		var value = chart.userOptions.chart.flattening;
		if(value) {
			$("#saveUnflat").show();
		} else {
			$("#saveUnflat").hide();
		}
	}
}

/*
 * FUNCTION plotSiteDataExpected
 * Description: prepares site data for expected declination, inclination, and paleolatitude plots.
 * Input: @type (declination, inclination, or paleolatitude), @sum (parameter that determines declination convention (e.g. 350 or -10) depending on average of expected declination
 * Output: Two prepared series for Highcharts in the return
 */
function plotSiteDataExpected ( type ) {

	"use strict";
	
	//See if inversion flag is checked
	var inversionFlag = $('#invFlag').prop('checked');
	
	//Get coordinate reference frame
	var coordRef  = ($("#mapRadio input[type='radio']:checked").val() === 'TECT') ? 'dataTC' : 'data';

	//Get selected site names
	//No sites selected, return an empty array
	var siteNames = $('#mapSel').val();
	if(siteNames === null) {
		return new Array(); 
	}

	//Code for plotting site polar data (latitude/longitude)
	if( type === 'poles') {
	
		var data = new Array();
		var ellipseDataPos = new Array();
		var ellipseDataNeg = new Array();
		
		//Loop over all selected sites
		for(var i = 0; i < siteNames.length; i++) {
			
			//Get site meta-data
			var name = sites[siteNames[i]].userInput.metaData.name;
			var latitude = sites[siteNames[i]].userInput.metaData.latitude;
			var longitude = sites[siteNames[i]].userInput.metaData.longitude;
			var markerColor = sites[siteNames[i]].userInput.metaData.markerColor;
			var age = sites[siteNames[i]].userInput.metaData.age;
			
			//Skip this site if no longitude/latitude is specified (cannot calculate pole position)
			if(latitude === null || longitude === null) {
				continue;
			}
			
			//Get mean inclination/declination from site
			var mInc = Number(sites[siteNames[i]][coordRef].params.mInc);
			var mDec = Number(sites[siteNames[i]][coordRef].params.mDec);
			var A95 = Number(sites[siteNames[i]][coordRef].params.A95);

			//See if inversionflag -> convert to N polarity
			if(inversionFlag) {
				if(mInc < 0) {
					var mInc = Math.abs(mInc);
					var mDec = (mDec+180)%360;
				}
			}

			if(latitude != null && longitude != null) {
			
				//Convert mean declination/inclination to pole position
				var polePosition = poles(latitude, longitude, [mDec, mInc, 0, 0, 0]);
				
				var fillColor = (polePosition[1] < 0) ? 'white' : markerColor;
				
				//Push particular site lat/lon pair to data array
				data.push({
					'x': polePosition[0], 
					'y': eqArea(polePosition[1]), 
					'name': name,
					'age': age,
					'A95': A95,
					'inc': polePosition[1], 
					'marker': { 
						'radius': 4, 
						'symbol': 'circle', 
						'fillColor': fillColor, 
						'lineWidth': 1, 
						'lineColor': markerColor
					}
				});
				
				//Construct ellipse parameters and request the ellipse
				var ellipseParameters = {
					'xDec' 	: polePosition[0],
					'xInc'	: polePosition[1],
					'yDec'	: polePosition[0],
					'yInc'	: polePosition[1] - 90,
					'zDec'	: polePosition[0] + 90,
					'zInc'	: 0,
					'beta'	: A95,
					'gamma'	: A95
				}	
				
				var elly = new ellipseData(ellipseParameters, true);
				
				ellipseDataNeg = ellipseDataNeg.concat(elly.neg)
				ellipseDataPos = ellipseDataPos.concat(elly.pos)
			}
		}
		
		//Add polar series to polar map
		$("#polePath").highcharts().addSeries({
			'type': 'scatter',
			'color': 'rgb(119, 152, 191)',
			'name': 'Selected Site Data', 
			'data': data,
			'marker': {
				'symbol': 'circle',
			}
		});
		
		//Add confidence interval to map
		$("#polePath").highcharts().addSeries({
			'type': 'line', 
			'id': 'ellipse', 
			'color': 'grey', 
			'name': 'Site Confidence Intervals', 
			'data': ellipseDataPos, 
			'enableMouseTracking': false 
		}, {
			'type': 'line', 
			'linkedTo': 'ellipse', 
			'color': 'grey', 
			'name': 'Site Confidence Intervals', 
			'data': ellipseDataNeg, 
			'enableMouseTracking': false 
		});	
		
		return; //Exit
	}
	
	//Code for handling for plotting site data on palat/dec/inc plots
	var parameterData = new Array();
	var parameterConfidence = new Array();

	//Loop all sites
	for(var i = 0; i < siteNames.length; i++) {
	
		//Get site meta-data from global sites object
		var name 		= sites[siteNames[i]].userInput.metaData.name;
		var age 		= sites[siteNames[i]].userInput.metaData.age;
		var maxAge 		= sites[siteNames[i]].userInput.metaData.maxAge;
		var minAge 		= sites[siteNames[i]].userInput.metaData.minAge;
		var markerColor = sites[siteNames[i]].userInput.metaData.markerColor;	

		//Skip site if age is not specified
		if(age === null) {
			continue;
		}
			
		//Capture
		var siteParameters = sites[siteNames[i]][coordRef].params;
		
		//For the paleolatitude the errors are non-symmetrical
		//We have recorded the minimum and maximum paleolatitude in the main processing routine and it can be extracted from the parameter object
		//Same type of routine for declination and inclination -- should speak for itself
		if (type == 'Paleolatitude') {
			
			//Get the parameter from the sites object
			var parameter = Number(siteParameters.palat);
			var parameterMin = Number(siteParameters.minPalat);
			var parameterMax = Number(siteParameters.maxPalat);
			
			//If the user checked the inversion flag, take the absolute values
			if(inversionFlag) {
				var parameter = Math.abs(parameter);
				var parameterMax = Math.abs(parameterMax);
				var parameterMin = Math.abs(parameterMin);
			}
			
		} else if (type == 'Inclination') {
			
			var parameter = Number(siteParameters.mInc);
			
			if(inversionFlag) {
				var parameter = Math.abs(parameter);
			}
			
			//Calculate the minimum and maximum from the error on inclination (Butler, 1992) and inclination
			var parameterMin = parameter - Number(siteParameters.dIx);
			var parameterMax = parameter + Number(siteParameters.dIx);
			
		} else if (type == 'Declination') {
			
			var parameter = Number(siteParameters.mDec);
			
			//Do the normalization on the declination and put the declination between -180 and 180
			if(inversionFlag && Number(siteParameters.mInc) < 0) {	
				parameter = (parameter + 180)%360;
			}
			if(parameter > 180) {
				parameter = parameter - 360;
			}
			var parameterMin = parameter - Number(siteParameters.dDx);			
			var parameterMax = parameter + Number(siteParameters.dDx);
		
		}

		//Put the actual recorded point (mean inclination, declination, or paleolatitude) in a Highcharts data object
		//Keep the marker color for that particular site
		parameterData.push({
			'x': Number(age), 
			'y': parameter,
			'min': parameterMin,
			'max': parameterMax,
			'name': name,
			'marker': {
				'fillColor': markerColor, 
				'states': {
					'hover': {
						'fillColor': markerColor
					}
				}
			}
		});
		
		//Construct the data object for the confidence intervals
		//We need to trick Highcharts in creating the interval for us
		//Define the x and y error bars as a line connecting two points
		//We need the horizontal (minAge - maxAge) and vertical error bar (parameterMin - parameterMax)
		//Between these series, add null so a line is only drawn between two consecutive points and not between horizontal and vertical error bars
		parameterConfidence.push({
			'x': Number(age), 
			'y': parameterMax
		}, {
			'x': Number(age), 
			'y': parameterMin
		});
		
		parameterConfidence.push(null);
		
		parameterConfidence.push({
			'x': Number(minAge),
			'y': parameter
		}, {
			'x': Number(maxAge), 
			'y': parameter
		});
		
		parameterConfidence.push(null);
	}

	//Return the data in a data format for Highcharts
	return [{
		'zIndex': 300,
		'type': 'scatter', 
		'name': 'Selected Site Data', 
		'data': parameterData
	}, {
		'zIndex': 200,
		'type': 'line',
		'color': 'grey', 
		'lineWidth': 1,
		'linkedTo': ':previous',
		'enableMouseTracking': false,
		'marker': { 
			'enabled': false
		},
		'data': parameterConfidence
	}];
}

/* FUNCTION plotPole
 * Description: handles plotting for polar plot in map table
 * Input: 
 *
 *
 */
function plotPole ( plotData ) {

	"use strict";
	
	//Specify plot options
	var chartOptions = {
		'chart': {
			'id': 'plotPole',
			'polar': true,
			'animation': false,
        	'renderTo': 'polePath'
    	},
		'title': {
            'text': 'Apparent Polar Wander Paths',
			'style': { 
				'fontSize': '32px'
			}
        },
		'legend': {
			'maxHeight': 45,
            'enabled': true,
        },
      	'pane': {
			'startAngle': 0,
			'endAngle': 360
     	},
		'yAxis': {
			'type': 'linear',
			'reversed': true,
			'labels': {
				'enabled': false
			},
			'tickInterval': 90,
      	    'min': 0,
			'max': 90,
        },
		'exporting': {
			'filename': 'APWP',
            'sourceWidth': 800,
            'sourceHeight': 800,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
		'credits': {
			'text': "Paleomagnetism.org (APWP)",
			'href': ''
		},
        'xAxis': {
			'minorTickPosition': 'inside',
			'type': 'linear',
			'min': 0,
			'max': 360,
            'minorGridLineWidth': 0,
            'tickPositions': [0, 90, 180, 270, 360],
            'minorTickInterval': 10,
            'minorTickLength': 5,
            'minorTickWidth': 1,
            'labels': {
                'formatter': function () {
                    return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
                }
            }
        },
		'tooltip': {
			'formatter': function(evt) {
				if(this.series.name === 'Selected Site Data') {
					return '<b>Site name: </b>' + this.point.name + '<br><b>Site age: </b>' + this.point.age + ' Ma<br><b>Longitude: </b>' + this.x.toFixed(2) + '<br><b>Latitude: </b>' + this.point.inc.toFixed(2) + '<br><b>A95: </b>' + this.point.A95.toFixed(1);
				} else {
					return '<b>Apparent Polar Wander Path</b><br><b>Plate: </b>'+ this.series.name + '<br><b>Age: </b>' + this.point.age + ' Ma<br><b>Latitude: </b>' + this.point.inc.toFixed(2) + '° <br><b> Longitude: </b>' + this.x.toFixed(2) + '° <br><b> Confidence Interval (A95): </b>' + this.point.A95 +'°';
				}
			}
		},
        'plotOptions': {
            'animation': false,
			'series': {
				'turboThreshold': 0,
         	   	'animation': false,
			}, 
			'line': {
				'lineWidth': 1, 
				'dashStyle': 'ShortDash',
				'marker': { 
					'enabled': false 
				} 
			}
       	 },
    	'series': plotData
	};
	
	//Initialize chart with specified options.
	new Highcharts.Chart(chartOptions); 
}

/*
 * FUNCTION plotExpectedTable
 * Description: calculates rotation/flattening and uncertainties (Demarest, 1983) - Paleolatitude is skipped
 * Input: title (either Paleolatitude, Inclination, Declination)
 * Output: VOID (fills table div using .html())
 */
function plotExpectedTable(title, data) {
	
	// Skip paleolatitude for now, errors are non-symmetrical
	if(title === 'Paleolatitude') {
		return;
	}

	var text = title === 'Declination' ? 'Rotation (deg)' : 'Flattening (deg)'
	var string = '<table class="sample"><thead><th>Site</th><th>Reference Frame and Plate</th><th>' + text + '</th><th>Error (deg)</th></thead><tbody>';

	// Loop over all series, these are formatted as a HighCharts data series, a new plate/frame combination is every 2nd in the array.
	// The second last is the actual site data
	var number = data.length;

	// Go over all plate/frame data (in steps of 2 series), ignore last two series
	for(var k = 0; k <= (number-4); k+=2) {
		var errors = new Array();
		// Go over all selected sites
		for(var i = 0; i < data[number-2].data.length; i++) {
			var val = data[number-2].data[i].x;
			var obj = false
			for(var j = 0; j < data[k].data.length; j++) {
				if(data[k].data[j].x > data[number-2].data[i].x || j === data[k].data.length - 1) {
					errors.push({
						'type': 'rangeError',
						'name': data[number-2].data[i].name + '<b> (out of interpolation range)</b>',
						'value': '---',
						'error': '---'
					});
					break;
				}
				if(val <= data[k].data[j+1].x && val >= data[k].data[j].x) {

					// Do a linear interpolation on values/errors
					var ratio = (val-data[k].data[j].x) * (data[k].data[j+1].y - data[k].data[j].y)/10 + data[k].data[j].y
					var errorHigh = (val - data[k].data[j].x) * (data[k].data[j+1].max - data[k].data[j].max)/10 + data[k].data[j].max;
					var errorLow = (val - data[k].data[j].x) * (data[k].data[j+1].min - data[k].data[j].min)/10 + data[k].data[j].min;
					// New error is half of the upper and lower interpolation
					var error = 0.5 * (errorHigh - errorLow);
					var obj = {'interpolation': ratio, 'error': error}

					break;
				}
			}
			if(obj) {
				var errorVal = obj.interpolation - data[number-2].data[i].y;
				var errorBar = Math.sqrt(Math.pow(obj.error, 2) + Math.pow(data[number-2].data[i].y - data[number-2].data[i].max, 2));
				errors.push({
					'type': 'OK',
					'name': data[number-2].data[i].name,
					'value': errorVal,
					'error': errorBar
				});
			} else {
				console.log('Site ' + data[number-2].data[i].name + ' not in interpolation range: ' + data[k].name);
			}
		}


		// Gotta do 2 otherwise .toFixed throws an error for strings '---'
		for(var i = 0; i < errors.length; i++) {
			if(errors[i].type === 'OK') {
				string += '<tr><td>' + errors[i].name + '</td><td>' + data[k].name + '</td><td>'+ errors[i].value.toFixed(2) +'°</td><td>'+ errors[i].error.toFixed(2) + '°</td></tr>'
			} else {
				string += '<tr><td>' + errors[i].name + '</td><td>' + data[k].name + '</td><td>'+ errors[i].value +'</td><td>'+ errors[i].error + '</td></tr>'
			}
		}

	}
	string += '</tbody></table>';
	$("#table" + title).html(string)

}

/*
 * FUNCTION plotExpectedLocation
 * Descriptions: plots the expected location for APWPs 
 * Input:
 * Output: VOID
 */
function plotExpectedLocation( data, container, title, lat, lon ) {
	
	"use strict";
	
	//Merge the new site data with the pole path data
	var plotData = data.concat(plotSiteDataExpected( title ));

	plotExpectedTable(title, plotData);

	var chartOptions = {
		'chart': {
			'id': 'expectedLocation',
			'zoomType': 'xy',
			'renderTo': container
		},
        'title': {
            'text': 'Expected ' + title,
        },
        'subtitle': {
			'text': '<b>Latitude: </b>' + lat + '<b> Longitude: </b>' + lon
        },
        'xAxis': {
			'reversed': true,
			'title': {
				'text': 'Age (Ma)'
			}
        },
        'yAxis': {
            'title': {
                'text': title + ' (°)'
            },
        },
		'plotOptions': {
			'arearange': {
				'enableMouseTracking': false,	
				'fillOpacity': 0.3,
			},
			'line': {
				'marker': {
					'symbol': 'circle'
				}
			},
			'series': {
				'point': {
					'events': {
						'click': function () {
							if(title == 'Declination' && this.series.name != 'Site Data') {
								module.map.expectedDeclination( this.y, this.options.error, this.series.options.lat, this.series.options.lon, this.series.color, this.series.options.frame, this.series.name);
							}
						}
					}
				}
			}
		},
		'exporting': {
			'filename': 'expected_' + title,
            'sourceWidth': 800,
            'sourceHeight': 600,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
        'tooltip': {
			'formatter': function(evt) {
				if(this.series.name == 'Selected Site Data') {
					return '<b>Site: </b>'+ this.point.name + '<br><b>Age: </b>' + this.x + ' Ma<br><b>' + title + ': </b>' + this.y.toFixed(2) + '°';
				} else {
					return '<b>Reference Frame: </b>' + this.series.options.frame + '<br><b>Plate: </b>' + this.series.name + '<br><b>Age: </b>' + this.x + ' Ma<br><b>Expected ' + title + ': </b>' + this.y.toFixed(2) + '°'
				}
			}
        },
		'credits': {
			'text': "Paleomagnetism.org [Expected Polar wander] - <i>after van Hinsbergen et al., 2015 </i>",
			'href': ''
		},
        'series': plotData
    }
	
	//Initialize chart with specified options.
	new Highcharts.Chart(chartOptions); 
}

/* FUNCTION EICDF
 * Description: handles graphing for the EI CDF
 */
function EICDF (data, orig, inc, incAv, lower, upper) {

	"use strict";
	
	var plotBands = [{
		'color': 'rgba(119, 152, 191, 0.25)', // Color value
		'from': lower,
		'to': upper,
		'id': 'confidence'
	}];
			
	//Define the cumulative distribution function
	mySeries = [{
		'name': 'CDF', 
		'data': data, 
		'marker': {
			'enabled': false
		}
	}, {
		'name': 'Unflattened Inclination',
		'type': 'line',
		'color': 'rgba(119, 191, 152, 1)',
		'data': [[inc, 0], [inc, 1]],
		'enableMouseTracking': false,
		'marker': {
			enabled: false
		}
	}, {
		'name': 'Average Bootstrapped Inclination',
		'type': 'line',
		'data': [[incAv, 0], [incAv, 1]],
		'color': 'rgb(191, 119, 152)',
		'enableMouseTracking': false,
		'marker': {
			'enabled': false
		},
	}, {
		'name': 'Original Inclination',
		'type': 'line',
		'data': [[orig, 0], [orig, 1]],
		'color': 'rgba(119, 152, 191, 1)',
		'enableMouseTracking': false,
		'marker': {
			'enabled': false
		}
	}, {
		'one': lower, 
		'two': upper, 
		'type': 'area', 
		'name': 'Confidence Interval', 
		'id': 'conf', 
		'color': 'rgb(119, 152, 191)'
	}];
	
	//Specify chart options
	var chartOptions = {
        'title': {
            'text': '',
        },
		'exporting': {
			'filename': 'TK03_CDF',
		    'sourceWidth': 1000,
            'sourceHeight': 400,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
		'chart': {
			'id': 'EICDF',
			'renderTo': 'EICDF',
			'marginRight': 200
		},
        'subtitle': {
			'text': 'Original inclination [blue] of <b>' + orig.toFixed(2) + '°</b> to unflattened inclination [green] <b>' + inc.toFixed(2) + '°</b> between [' + upper.toFixed(2) + '° to ' + lower.toFixed(2) +'°]'
        },
		'plotOptions': {
			'animation': false,
			'series': {
				'turboThreshold': 0
			},
			'area': {
				'events': {
					'legendItemClick': function (e) {
						if (this.name == 'Confidence Interval') {
							toggleBands(this.chart, plotBands);
						}
					}
				}
			}	
		},
        'xAxis': {
			'min': 0,
			'max': 90,
			'plotBands': plotBands,
			'title': {
                'text': 'Inclination (°)'
            }
		},
		'credits': {
			'text': "Paleomagnetism.org [EI Module] - <i>after Tauxe et al., 2008 </i>",
			'href': ''
		},
        'yAxis': {
			'min': 0,
			'max': 1,
            'title': {
                'text': 'Cumulative Distribution'
            }
        },
        'tooltip': {
    		'formatter': function() {
        		return '<b> Cumulative Distribution </b><br><b>Latitude: </b>' + this.x.toFixed(2) + '<br><b>CDF: </b>' + this.point.y.toFixed(3) //Tooltip on point hover. We convert the projected inclination back to the original inclination using eqAreaInv and display it to the user.
    		}
		},
        'legend': {
            'layout': 'vertical',
            'align': 'right',
            'verticalAlign': 'middle',
            'borderWidth': 0
        },
        'series': mySeries
    }
	
	//Initialize chart with specified options.
	new Highcharts.Chart(chartOptions); 	
	
}


function plotFoldtestCDF (cdfdat, data, lower, upper, begin, end, sub, input ) {
	
	"use strict";
	
	//Create plotband for 95% bootstrapped confidence interval (upper to lower)
	var plotBands =  [{
		'color': 'rgba(119, 152, 191,0.25)',
		'from': lower,
		'to': upper
	}];
				
	//Add the first series
	var mySeries = [{
		'name': 'CDF', 
		'data': cdfdat, 
		'marker': {
			'enabled': false
		}
	}, {
		'type': 'area', 
		'name': 'Confidence Interval', 
		'color': 'rgb(119, 152, 191)'
	}, {
		'color': 'red', 			//Original unfolded data; this will serve as the bootstrap toggle
		'id': 'bootstraps', 
		'name': 'Bootstraps', 
		'data': data[0],			//Original data is the first in the data array
		'type': 'spline',
		'zIndex': 100,
		'pointInterval': 10
	}];

	//Push the other bootstraps (1 - 25) to the series array and link them to the original data
	//We are using only 1/10th of the number of points to show the bootstraps (just to reduce load)
	//use a spline interpolation between the points
	for(var i = 1; i < data.length; i++) {
		mySeries.push({
			'color': 'rgba(119, 152, 191,0.25)',
			'data': data[i],
			'type': 'spline',
			'linkedTo': 'bootstraps',
			'pointInterval': 10,
			'enableMouseTracking': false,
		});
	}
	
	//Add vertical plot lines to indicate geographic and tectonic coordinates respectively (no user interaction, just lines)
	mySeries.push({
		'name': 'Geographic Coordinates',
		'type': 'line',
		'color': 'rgba(119, 191, 152, 1)',
		'data': [[0, 0], [0, 1]],				//0% unfolding
		'enableMouseTracking': false,
		'marker': {
			'enabled': false
		}
	}, {
		'name': 'Tectonic Coordinates',
		'type': 'line',
		'data': [[100, 0], [100, 1]], 		//100% unfolding
		'color': 'rgba(119, 152, 191, 1)',
		'enableMouseTracking': false,
		'marker': {
			'enabled': false
		}
	});
	
    var chartOptions = {
		'chart': {
			'id': 'foldtest',
			'renderTo': 'container5',
		    'events': {
				'load': function() {
					var temp = $.extend(this.options.tooltip, this.options.myTooltip);
					this.myTooltip = new Highcharts.Tooltip(this, temp);                    
				}, 
				'click': function() {
					this.myTooltip.hide()
				}
			}
		},
        'title': {
            'text': 'Bootstrapped foldtest',
        },
        'subtitle': {
            'text': 'highest τ1 between [' + lower + ', ' + upper + '] % unfolding (' + cdfdat.length + ' bootstraps in ' + sub + 'ms)',
        },
		'exporting': {
			'filename': 'Foldtest',
		    'sourceWidth': 800,
            'sourceHeight': 400,
            'buttons': {
                'contextButton': {
                    'symbolStroke': '#7798BF',
					'align': 'right'
                }
            }
        },
        'xAxis': {
			'min': begin,
            'tickInterval': 10,
			'max': end,
			'pointInterval': 10,
			'title': {
				'text': '% unfolding'
            },
			'plotBands': plotBands
        },
        'yAxis': {
			'floor': 0,
			'ceiling': 1,	
            'title': {
                'text': 'τ1 (maximum eigenvalue)'
            }
        },
		'credits': {
			'text': "Paleomagnetism.org [Foldtest Module] - <i>after Tauxe et al., 2010 </i>",
			'href': ''
		},
        'tooltip': {
			'enabled': true,
        },
		'myTooltip': {
			'enabled': false,
			'useHTML': true,
			'formatter': function(evt) {
				if(this.series.name == 'Bootstraps') {
					var appendix = '';
					if(this.x == 100) {
						appendix = '<b> Tectonic Coordinates </b> <br>';
					} else if (this.x == 0) {
						appendix = '<b> Geographic Coordinates </b> <br>';
					}
					return appendix + '<b> Directions</b> at ' + this.x + '% unfolding <br> <b>Maximum eigenvalue (τ1)</b>: ' + this.y.toFixed(5) + '<hr> <div id="foldDirPercentage" style="width: 250px; height: 250px; margin: 0 auto;"></div>';
				} else {
					return '<b> Cumulative Distribution Function </b> <br><b>Unfolding Percentage: </b>' + this.x + '%<br><b>Probability Density: </b>' + this.y.toFixed(3);
				}
			}
        },
		'plotOptions': {
			'spline': {
				'pointStart': begin,
				'marker': { 
					'enabled': false
				}
			},
			'series': {
			'stickyTracking': true,
				'point': {
					'events': {
					    'click': function(evt) {	//Function to handle miniature equal area projection in tooltip
						
							this.series.chart.tooltip.hide();
							this.series.chart.myTooltip.hide()
							
							//Only handle the miniature for the thick red bootstrap line
							if(this.series.name == 'Bootstraps') {
								this.series.chart.myTooltip.refresh(evt.point, evt);
								var newDatArray = [];
		
								//Get data for particular percentage of unfolding (at this.x = the clicked x-axis value)
								for(var i = 0; i < input.length; i++) {
									newDatArray.push(rotat(90+input[i][2], (90+input[i][3]*(this.x/100)), input[i]));
								}
										
								var subtitle = this.x + '% unfolding';
						
								//Allow the tooltip some time to be created (5ms) before adding the tiny chart (otherwise rendering div cannot be found by Highcharts)
								setTimeout(function() {
									if($("#foldDirPercentage").length > 0) {
										eqAreaFoldLeft( newDatArray, 'foldDirPercentage', subtitle, 'tiny' ) 	//Initialize tiny equal area projection in tooltip
									} else {
										console.log('Notification: tooltip not present for chart initialization.'); //Rendering div still not found after 5ms?
									}
								}, 5);
							}
						}  
					}
				}
			},
			'area': {
				'events': {
					'legendItemClick': function () {
						if (this.name == 'Confidence Interval') {
							toggleBands(this.chart, plotBands);		//Make confidence interval togglable .. toggleable .. toogloblee .. tobogologe .... ?
						}
					}
				}
			}
		},
        'legend': {
            'layout': 'vertical',
            'align': 'right',
            'verticalAlign': 'middle',
            'borderWidth': 0
        },
        'series': mySeries
    }
	
	//Initialize chart with specified options.
	new Highcharts.Chart(chartOptions); 	
	
	//Show plots
	$("#container5").show();
	$("#container5").highcharts().reflow();
	$('#foldtestInfo').show();
		
}
