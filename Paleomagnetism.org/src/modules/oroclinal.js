/* PALEOMAGNETISM.ORG 
 * 
 * Oroclinal Test Module
 * Last Update: 9/22/2015
 * Description: Uses bootstrapped linear regressive techniques on bi-dimensional data (e.g. strike/declination)
 *			  : also includes a modified oroclinal foldtest around a vertical axis
 */

//Define globals
var applicationHasData = false;
var dec, decErr, strike, strikeErr;
var maxE, minPlot, maxPlot;
var regressions;
var slopeAverage = 0, interceptAverage = 0;
var lower, upper;
var lr;

//DOM Ready
//Some jQuery UI initializations
$(function() {

	//Toggle whether we use variance or eigenvalue approach (not implemented)
	$("#oroFoldtest").click( function () {
		//initializeFoldtest(); //foldtest using eigenvalues (don't use this: 180 === 0) which is not true for declinations only
		varianceFoldtest();
	});
	
	$("#oroFoldtest, #initializeOroclinal").button({
		icons: { 
			primary: "ui-icon-play" 
		}
	});
	
		$("#exportAllCsv").button()	
	$("#initializeOroclinal").button().click( function () {
		$("#showBooty").hide();
		initializeSampling();
	});
	
	$("#getCDF").multiselect({
		multiple: false, 
		height: 50,
		noneSelectedText: 'Select a parameter',
		selectedList: 1,
		close: function () {
			getCDF($("#getCDF").val());
		}
	});
	
	//On button click: [?]
	$( "#inputHelp" ).button({
		icons: {
			primary: "ui-icon-help",
		},
		text: false
	}).click( function() {
		$( "#inputHelpDialog" ).dialog({
			draggable: false,
			resizable: false,
			width: 600,
		});
	});
	
    $('#tabs').tabs();
	

	
	$('#importData').button({
		icons: {
			primary: 'ui-icon-arrowthickstop-1-n'
		}
	});
	
	$("#progressBar").progressbar({ value: 0 });
	$('#sampleType').buttonset();
	$('#sampleType2').buttonset();
	
	$("#radio1, #radio2, #radio3, #radio4, #radio5").button({
		icons: {
			primary: 'ui-icon-gear'
		}
	});
});

/*
 * FUNCTION plotWindRose
 * Description: code for the plotting of a wind rose and sorting of declination in bins of 10 degrees
 * Input: data array with the declinations, and container for chart to be rendered in
 * Output: VOID (calls Highcharts constructor for new chart)
 */
function plotWindRose(newDatArray, container) {

	//This algorithm sorts declinations in the newDatArray to bins of binSize degrees
	//Notice: 360 % binSize must be 0 
	var sortedArr = new Object();
	var binSize = 12;

	if(360 % binSize !== 0) {
		notify('failure', 'Cannot plot wind rose: bin size must be a factor of 360.');
		return;
	}
	
	for(var i = 0; i < newDatArray.length; i++) {
	
		//Round to the nearest 10 degrees
		var declination = Math.abs(Math.round(newDatArray[i][0] / binSize) * binSize)%360;
		
		//If the bin already exists, increment by one, otherwise create the bin starting at 1
		sortedArr[declination] ? sortedArr[declination] += 1 : sortedArr[declination] = 1;
	}
	
	//Define bucket for data to be used in the chart, and define a max variable to find the maximum declinations in any bin
	var dataList = new Array();
	var max = 0;
	
	//Go over all 36 bins in the 0 - 350 range
	for(var i = 0; i <= (360 - binSize); i+= binSize) {
	
		//If we have declinations in the particular bin, put the y value to the sqrt of this number (to prevent linear stretching if one bin becomes very large)
		//Otherwise, push a y value of 0, which will be added to the series but is invisible to the user
		//We need to do this, otherwise the rose chart does not always take bins of size 10 degrees
		if(sortedArr[i] != undefined) {
			dataList.push({x: i, y: Math.sqrt(sortedArr[i])});
		} else {
			dataList.push({x: i, y: 0});		
		}
		
		//Get the maximum value of declinations, this will be the maximum y-value for the chart as wells
		if(sortedArr[i] > max) {
			max = sortedArr[i];
		}
	}
	
	//Data series for the rose chart
	var dataSeries = [{
		'borderWidth': 1, 
		'borderColor': 'grey',  
		'zIndex': 100, 
		'name': 'data', 
		'data': dataList
	}];

    // Parse the data from an inline table using the Highcharts Data plugin
    var chartOptions = {
        'chart': {
            'polar': true,
            'type': 'column',
			'renderTo': container,
        },
        'legend': {
			'enabled': false,
        },
		'title': {
			'text': ''
		},
        'xAxis': {
			'minorTickPosition': 'outside',
			'type': 'linear',
			'min': 0,
			'max': 360,
            'minorGridLineWidth': 0,
            'tickPositions': [0, 90, 180, 270, 360],
            'minorTickInterval': 10,
            'minorTickLength': 2,
            'minorTickWidth': 1,
            'labels': {
                'formatter': function () {
                    return this.value + '\u00B0'; //Add degree symbol to x-axis labels.
                }
            }
        },
		'pane': {
			'startAngle': 0,
			'endAngle': 360
     	},
        'yAxis': {
      	    'min': 0,
			'max': Math.sqrt(max),
			'tickPositions': [0, Math.sqrt(max)],
			'endOnTick': false,
			'labels': {
				'enabled': false
			},
        },
        'tooltip': {
            'formatter': function () {
				return '<b> Cumulative Declination </b> <br><b>Declination Bin: </b>' + this.x + '<br><b>Number of Declinations: </b>' + this.y.toFixed(0);
			}
        },
		'credits': {
			'text': "Paleomagnetism.org [Oroclinal Module]",
			'href': ''
		},
        'plotOptions': {
            'series': {
                'shadow': false,
                'groupPadding': 0,
                'pointPlacement': 'on'
            },
			'column': {
				'colorByPoint': true
			}
        },
		'series': dataSeries,
    }
	new Highcharts.Chart(chartOptions);
}

/*
 * FUNCTION calcCircularVariance
 * Description: calculates the circular variance of an array of data
 *			  : see http://www.ebi.ac.uk/thornton-srv/software/PROCHECK/nmr_manual/man_cv.html
 * Input: data array containing declinations
 * Output: The circular variance (from 0 [perfect] to 1 [scatter])
 */
function calcCircularVariance( data ) {
	
	var xCoord = 0;
	var yCoord = 0;
	
	for(var i = 0; i < data.length; i++) {
		var declination = data[i][0]*rad;
		xCoord += Math.cos(declination);
		yCoord += Math.sin(declination);
	}
	return 1 - Math.sqrt(xCoord*xCoord + yCoord*yCoord)/data.length;
}

/*
 * FUNCTION varianceFoldtest
 * Description: modified eigen approach foldtest (after Tauxe and Watson, 1994) using circular variance
 * Input: NULL
 * Output: VOID (calls graphing function)
 */
function varianceFoldtest() {

	if(!applicationHasData) {
		notify('failure', 'Found no data in the application. Please load some.');
		return;
	}
	
	//(Gaussian or Standard sampling)
	var type = $("#sampleType2 input[type='radio']:checked").val();
	var timeInit = Date.now();
	
	if(type === undefined) {
		notify('failure', 'Please select a type.');
		return;
	}
	
	var nBootstraps = 1000;
	var unfoldingMin = -50;
	var unfoldingMax = 150;

	var data = new Array();
	var taus = new Array();
	var untilt = new Array();
	var bootTaus = new Array();
	
	//Construct our original data array that we use to show when the red line is clicked
	for(var i = 0; i < dec.length; i++) {
		data.push([dec[i], strike[i]]);
	}
	
	//Do for the specified amount of bootstraps
	for(var i = 0; i < nBootstraps; i++) {
		
		var sampleDec = new Array();
		var sampleStrike = new Array();
		var taus = new Array();
		
		//For each point, draw a random point from within the confidence interval
		//for the first bootstrap we use the actual data
		for(var j = 0; j < dec.length; j++) {
			if(i > 0) {
				sampleDec.push(getRandom(dec[j], decErr[j], type));
				sampleStrike.push(getRandom(strike[j], strikeErr[j], type));	
			} else {
				sampleDec.push(dec[j]);
				sampleStrike.push(strike[j]);
			}
		}
		
		var max = 0;
		
		//Unfold over range in increments of 10 degrees
		for(var j = unfoldingMin; j <= unfoldingMax; j+=10) {	
		
			var tilts = new Array();
			
			//Do the unfolding of the declination
			//The inclination is assumed to be 0
			for(var k = 0; k < sampleDec.length; k++) {
				var unfoldedDeclination = (sampleDec[k] - (sampleStrike[k]-90)*0.01*j);
				tilts.push([unfoldedDeclination, 0]);		
			}
						
			//Obtain the circular variance of these directions
			var variance = calcCircularVariance(tilts);
			taus.push(variance);
			
			if(variance > max) {
				max = variance;
				index = j
			}
		}
			
		//If we find the unfolding % that yields the highest tau we zoom in around this point and take steps of 1 deg from -9 to 9 around that point
		//Same procedure as above only more precise
		//Remember to carry the oldIndex
		var oldIndex = index;
		
		for(var j = -9; j <= 9; j++) {

			//Only if within specified minimum and maximum bounds
			if(index + j >= unfoldingMin && index + j <= unfoldingMax) {
			
				tilts = new Array();
				
				//Do the unfolding of the declination
				for(var k = 0; k < sampleDec.length; k++) {
					var unfoldedDeclination = (sampleDec[k] - (sampleStrike[k]-90)*0.01*(oldIndex+j));
					tilts.push([unfoldedDeclination, 0]);		
				}
						
				var variance = calcCircularVariance(tilts);
					if(variance > max) {
					max = variance;
					index = (oldIndex+j);
				}
				
			}
		}
				
		//Show the first 25 bootstraps and first actual data
		if(i <= 26) {
			bootTaus.push(taus);
		}
		untilt.push(index);
	}

	untilt.sort(function (a, b) {
		return a > b ? 1 : a < b ? -1 : 0;
	});
	
	//Get the cumulative distribution of untilting percentages
	cdfData = new Array();
	for(var i = 0; i < nBootstraps; i++){
		cdfData.push([untilt[i], i/(nBootstraps-1)]);
	}
	
	lower = untilt[parseInt(0.025*nBootstraps, 10)];
	upper = untilt[parseInt(0.975*nBootstraps, 10)];
	var sub = (Date.now() - timeInit);
	
	//Call the foldtest plotting function
	grfoldtestOro ( cdfData, bootTaus, lower, upper, unfoldingMin, unfoldingMax, sub, data );
}

/*
 * FUNCTION initializeFoldtest (deprecated)
 * Description: completes a foldtest on magnetic declinations and strikes.
 *            : similir to the foldtest in the statistics portal with unfolding around a vertical axis
 * Input: NULL
 * Output: VOID (calls plotting functions)
 */
function initializeFoldtest () {

	if(!applicationHasData) {
		notify('failure', 'Found no data in the application. Please load some.');
		return;
	}
	
	//(Gaussian or Standard sampling)
	var type = $("#sampleType2 input[type='radio']:checked").val();
	
	if(type === undefined) {
		notify('failure', 'Please select a type.');
		return;
	}
	
	var nBootstraps = 1000;
	var unfoldingMin = -50;
	var unfoldingMax = 150;

	var data = new Array();
	var taus = new Array();
	var untilt = new Array();
	var bootTaus = new Array();
	
	//Construct our original data array that we use to show when the red line is clicked
	for(var i = 0; i < dec.length; i++) {
		data.push([dec[i], strike[i]]);
	}
	
	//Do for the specified amount of bootstraps
	for(var i = 0; i < nBootstraps; i++) {
		
		var sampleDec = new Array();
		var sampleStrike = new Array();
		var taus = new Array();
		
		//For each point, draw a random point from within the confidence interval
		//for the first bootstrap we use the actual data
		for(var j = 0; j < dec.length; j++) {
			if(i > 0) {
				sampleDec.push(getRandom(dec[j], decErr[j], type));
				sampleStrike.push(getRandom(strike[j], strikeErr[j], type));	
			} else {
				sampleDec.push(dec[j]);
				sampleStrike.push(strike[j]);
			}
		}
		
		var max = 0;
		
		//Unfold over range in increments of 10 degrees
		for(var j = unfoldingMin; j <= unfoldingMax; j+=10) {	
		
			var tilts = new Array();
			
			//Do the unfolding of the declination
			//The inclination is assumed to be 0
			for(var k = 0; k < sampleDec.length; k++) {
				var unfoldedDeclination = (sampleDec[k] - (sampleStrike[k]-90)*0.01*j);
				tilts.push([unfoldedDeclination, 0]);		
			}
						
			//Obtain the eigenvalues of these directions
			var pp = eigValues(tilts);
			taus.push(pp.t);
			
			if(pp.t > max) {
				max = pp.t;
				index = j
			}
		}
			
		//If we find the unfolding % that yields the highest tau we zoom in around this point and take steps of 1 deg from -9 to 9 around that point
		//Same procedure as above only more precise
		//Remember to carry the oldIndex
		var oldIndex = index;
		
		for(var j = -9; j <= 9; j++) {

			//Only if within specified minimum and maximum bounds
			if(index + j >= unfoldingMin && index + j <= unfoldingMax) {
			
				tilts = new Array();
				
				//Do the unfolding of the declination
				for(var k = 0; k < sampleDec.length; k++) {
					var unfoldedDeclination = (sampleDec[k] - (sampleStrike[k]-90)*0.01*(oldIndex+j));
					tilts.push([unfoldedDeclination, 0]);		
				}
						
				//Get the principle eigenvalues for this set of untilted directions
				var pp = eigValues(tilts);
	
				//Save the maximum eigenvalue for this bootstrap and unfolding increment
				if(pp.t > max) {
					max = pp.t;
					index = (oldIndex+j);
				}
				
			}
		}
				
		//Show the first 25 bootstraps and first actual data
		if(i <= 26) {
			bootTaus.push(taus);
		}
		
		untilt.push(index);
		
	}

	untilt.sort(function (a, b) {
		return a > b ? 1 : a < b ? -1 : 0;
	});
	
	//Get the cumulative distribution of untilting percentages
	cdfData = new Array();
	for(var i = 0; i < nBootstraps; i++){
		cdfData.push([untilt[i], i/(nBootstraps-1)]);
	}
	
	lower = untilt[parseInt(0.025*nBootstraps, 10)];
	upper = untilt[parseInt(0.975*nBootstraps, 10)];
	var sub = 'Don\'t forget to add a subtitle ';
	
	//Call the foldtest plotting function
	grfoldtestOro ( cdfData, bootTaus, lower, upper, unfoldingMin, unfoldingMax, sub, data );
		
}

/*
 * FUNCTION grfoldtestOro
 * Description: handles plotting for the oroclinal foldtest (to be renamed)
 */ 
function grfoldtestOro (cdfData, data, lower, upper, begin, end, sub, input ) {
	
	//Create plotband for 95% bootstrapped confidence interval (upper to lower)
	var plotBands =  [{
		color: 'rgba(119, 152, 191,0.25)',
		from: lower,
		to: upper
	}];
				
	//Add the series
	//Original unfolded data servers as the main branch for all bootstraps (id: bootstraps)
	mySeries = [{
		'name': 'Cumulative Distribution', 
		'data': cdfData, 
		'marker': {
			'enabled': false
		}
	}, {
		'type': 'area', 
		'name': 'Confidence Interval', 
		'color': 'rgb(119, 152, 191)'
	}, {
		'color': 'red',
		'id': 'bootstraps', 
		'name': 'Bootstraps', 
		'data': data[0],			
		'type': 'spline',
		'zIndex': 100,
		'pointInterval': 10
	}];

	//Push the other bootstraps (1 - 25) to the series array and link them to the original data
	for(var i = 1; i < data.length; i++) {
		mySeries.push({
			'enableMouseTracking': false,
			'color': 'rgba(119, 152, 191,0.25)',
			'data': data[i],
			'type': 'spline',
			'linkedTo': 'bootstraps',
			'pointInterval': 10
		});
	}
	
	//Add vertical plot lines to indicate geographic and tectonic coordinates respectively (no user interaction, just lines)
	mySeries.push({
		'name': 'Geographic Coordinates',
		'type': 'line',
		'color': 'rgba(119, 191, 152, 1)',
		'data': [[0, 0], [0, 1]],
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
		chart: {
			renderTo: 'container5',
			id: 'foldtest',
		    events: {
				load: function() {
					var temp = $.extend(this.options.tooltip, this.options.myTooltip);
					this.myTooltip = new Highcharts.Tooltip(this, temp);                    
				}, 
				click: function() {
					this.myTooltip.hide()
				}
			}
		},
        title: {
            text: 'Bootstrapped Oroclinal Foldtest',
        },
        subtitle: {
            text: 'highest τ1 between [' + lower + ', ' + upper + '] % unfolding (' + cdfData.length + ' bootstraps in ' + sub + 'ms)',
        },
		exporting: {
			filename: 'Foldtest',
		    sourceWidth: 1200,
            sourceHeight: 600,
            buttons: {
                contextButton: {
                    symbolStroke: '#7798BF',
					align: 'right'
                }
            }
        },
        xAxis: {
			min: begin,
            tickInterval: 10,
			max: end,
			pointInterval: 10,
			title: {
				text: '% unfolding'
            },
			plotBands: plotBands
        },
        yAxis: {
			floor: 0,
			ceiling: 1,	
            title: {
                text: 'Circular Variance'
            },
      
        },
		credits: {
			text: "Paleomagnetism.org [Foldtest Module] - <i>after Tauxe et al., 2010 </i>",
			href: ''
		},
        tooltip: {
			enabled: true,
        },
		myTooltip: {
			enabled: false,
			useHTML: true,
			formatter: function(evt) {
				if(this.series.name == 'Bootstraps') {
					var appendix = '';
					if(this.x == 100) {
						appendix = '<b> Tectonic Coordinates </b> <br>';
					} else if (this.x == 0) {
						appendix = '<b> Geographic Coordinates </b> <br>';
					}
					return appendix + '<b> Directions</b> at ' + this.x + '% unfolding <br> <b>Circular Variance</b>: ' + this.y.toFixed(5) + '<hr> <div id="foldDirPercentage" style="width: 300px; height: 250px; margin: 0 auto;"></div>';
				} else {
					return '<b> Cumulative Distribution Function </b> <br><b>Unfolding Percentage: </b>' + this.x + '%<br><b>Probability Density: </b>' + this.y.toFixed(3);
				}
			}
        },
		plotOptions: {
			spline: {
				pointStart: begin,
				marker: { 
					enabled: false
				}
			},
			series : {
			stickyTracking: true,
				point: {
					events : {
					    click: function(evt) {	//Function to handle miniature equal area projection in tooltip
						
							this.series.chart.tooltip.hide();
							this.series.chart.myTooltip.hide()
							
							//Only handle the miniature for the thick red bootstrap line
							if(this.series.name == 'Bootstraps') {
								this.series.chart.myTooltip.refresh(evt.point, evt);
								var newDatArray = [];
		
								//Get data for particular percentage of unfolding (at this.x = the clicked x-axis value)
								for(var i = 0; i < input.length; i++) {
									newDatArray.push([input[i][0] - (input[i][1]-90)*0.01*this.x, 0]);		
								}
										
								var subtitle = this.x + '% unfolding';
						
								//Allow the tooltip some time to be created (5ms) before adding the tiny chart (otherwise rendering div cannot be found by Highcharts)
								setTimeout(function() {
									if($("#foldDirPercentage").length > 0) {
										plotWindRose( newDatArray, 'foldDirPercentage') 	//Initialize tiny equal area projection in tooltip
									} else {
										console.log('Notification: Tooltip not present for chart initialization.'); //Rendering div still not found after 5ms?
									}
								}, 5);
							}
						}  
					}
				}
			},
			area: {
				events: {
					legendItemClick: function () {
						if (this.name == 'Confidence Interval') {
							toggleBands(this.chart, plotBands);		//Make confidence interval togglable .. toggleable .. toogloblee .. tobogologe?
						}
					}
				}
			}
		},
        legend: {
            layout: 'vertical',
            align: 'right',
            verticalAlign: 'middle',
            borderWidth: 0
        },
        series: mySeries
    }
	
	new Highcharts.Chart(chartOptions);
	
	//Show plots
	$("#container5").show();
	$('#container5').highcharts().reflow();
	$('#foldtestInfo').show();
		
}

/* 
 * FUNCTION getCSV
 * Description: custom function to parse Highcharts data to csv format on exporting
 * Input: triggered by clicking export CSV -> passes chart ID
 * Output: CSV formatted variable that can be downloaded through dlItem routine
 */
(function (Highcharts) {

     downloadAttrSupported = document.createElement('a').download !== undefined;
		
    // Options
    var itemDelimiter = '","';
    var lineDelimiter = '\n';

	//Add a prototype function
    Highcharts.Chart.prototype.getCSV = function () {
		
		notify('failure', 'Data downloading is not supported yet.');
		return;
		
		var csv = "";
		 
		 if(this.userOptions.chart.id === 'oroclinal') {
			
			var columns = ['Declination', 'Declination Error', 'Strike', 'Strike Error'];
			csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
	
			
		 } 

		return csv;
		
    };  
	
}(Highcharts));

// Now we want to add "Download CSV" to the exporting menu.
// Code changed after https://github.com/highslide-software/export-csv
// Original Author: Torstein Honsi (Highcharts)
Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({

    text: 'Download CSV file',
    onclick: function () {
	
		//Parse data to CSV format
		var csv = this.getCSV(); 

		//Download the parsed CSV
		dlItem(csv, 'csv');
	}
});

/* 
 * FUNCTION initializeSampling
 * Description: initializes sampling for the oroclinal test (calls either bootstrapped [Gaussian or Standard] or weighed regression)
 * Input: NULL
 * Output: VOID
 */
function initializeSampling() {

	if(!applicationHasData) {
		notify('failure', 'Found no data in the application. Please load some.');
		return;
	}
	
	if(dec.length !== 0) {
		var type = $("#sampleType input[type='radio']:checked").val();
		
		if(type === 'Weighed') {
			weighedData(false);
		} else if (type === 'Gauss' || type === 'Standard') {
			weighedParameters = weighedData(true);
			bootstrapData(type);
		}
	}
}

/* FUNCTION dlItem
 * Description: creates a BLOB that can be downloaded
 * Input: string to be downloaded (usually a csv-formatted string), and extension for the file
 * Output: VOID
 */
function dlItem ( string, extension ) {
	
	//Check if supported
	downloadAttrSupported = document.createElement('a').download !== undefined;
	
	var blob = new Blob([string], { type: 'data:text/csv;charset=utf-8,'});
	var csvUrl = URL.createObjectURL(blob);
	var name = 'export';

		// Download attribute supported
        if (downloadAttrSupported) {
            a = document.createElement('a');
            a.href = csvUrl;
            a.target      = '_blank';
            a.download    = name + '.' + extension;
            document.body.appendChild(a);
            a.click();
            a.remove();
		} else if (window.Blob && window.navigator.msSaveOrOpenBlob) {
			// Falls to msSaveOrOpenBlob if download attribute is not supported
			window.navigator.msSaveOrOpenBlob(blob, name + '.' + extension);
		} else {
			// Fall back to server side handling (Highcharts)
			Highcharts.post('http://www.highcharts.com/studies/csv-export/download.php', {
				data: string,
				type: 'txt',
				extension: extension
		});
	}
}

/* FUNCTION importing
 * Handles data importing and parsing to global variables
 * Input: Importing event
 * Output: VOID (calls processing and plotting functions)
 */
function importing(event) {

	"use strict";
	
	//Filehandler API, handles file importing
    var input = event.target;
    var reader = new FileReader();
	
	//Single input
    reader.readAsText(input.files[0]);
	
	//Define global buckets for data
	dec = new Array();
	decErr = new Array();
	strike = new Array();
	strikeErr = new Array();

	//Function fired when loading is completed
	reader.onload = function () {

		var text = reader.result;
		
		//Split input by newlines and remove empty lines
		var lines = text.split('\n')
		lines = $.grep(lines, function(n) { 
			return(n) 
		});	
		
		//Loop over all the lines and sort the parameters
		for(var i = 0; i < lines.length; i++) {
		
			//Split newline by tab, space, and comma to parameters@array
			var parameters = lines[i].split(/[,\s\t]+/);
			parameters = $.grep(parameters, function(n) { 
				return(n) 
			});	
			
			//Not four parameters, the file is not interpretable by the application
			if(parameters.length !== 4) {
				notify('failure', 'Input file was not designed for the oroclinal test');
				return;
			}
			
			dec.push(Number(parameters[0]));
			decErr.push(Number(parameters[1]));
			strike.push(Number(parameters[2]));
			strikeErr.push(Number(parameters[3]));
			
		}

		//Obtain minimum and maximum possible x-values. We scale the graph to these parameters
		maxE = Math.max.apply(null, strikeErr);
		minPlot = Math.min.apply(null, strike) - maxE;
		maxPlot = Math.max.apply(null, strike) + maxE;
	
		notify('success', lines.length + ' lines have been added to the declination.');
		applicationHasData = true;
		
	}
}

/* 
 * FUNCTION weighedData
 * Description: Calculates regression and confidence interval through weighing of points
 * Input: NULL
 * Output: VOID (calls plotting function)
 */
function weighedData( getParams ) {
	
	var slope = 1;
	
	//After 10 iterations the slope should have converged sufficiently
	var nIterations = 10;
	
	//Do 10 iterations to converge slope and intercept
	for(var j = 0; j < nIterations; j++) {
	
		var S = [];
		var SX = [];
		var SY = [];
		var u = [];
		var v = [];
		var a = [];
		var f1 = [];
		var f2 = [];
		var suu = [];
		var sxx = [];
	
		for(var i = 0; i < dec.length; i++) {
			S.push( 1 / (Math.pow(slope, 2) * Math.pow(strikeErr[i], 2) + Math.pow(decErr[i], 2)));
			SX.push(strike[i] * S[i]);
			SY.push(dec[i] * S[i]);
			u.push(strike[i] - slope);
			v.push(dec[i] - slope);
			a.push(1 / (strikeErr[i] * decErr[i]));
			f1.push(S[i]*S[i]*v[i]*((u[i]*(decErr[i]*decErr[i])) + (slope*v[i]*(strikeErr[i]*strikeErr[i]))));
			f2.push(S[i]*S[i]*u[i]*((u[i]*(decErr[i]*decErr[i])) + (slope*v[i]*(strikeErr[i]*strikeErr[i]))));
			suu.push(S[i]*u[i]*u[i]);
			sxx.push(S[i]*strike[i]*strike[i]);
		}

		//Sum the values
		var sumF1 = 0;
		var sumF2 = 0;
		var sumSY = 0;
		var sumSX = 0;
		var sumS = 0;
		var suuS = 0;
		var sxxS = 0;
		
		for(var i = 0; i < f1.length; i++) {
			sumF1 += f1[i];
			sumF2 += f2[i];
			sumSY += SY[i];
			sumSX += SX[i];
			sumS += S[i];
			suuS += suu[i];
			sxxS += sxx[i];
		}
		
		sumSY = sumSY/sumS;
		sumSX = sumSX/sumS;

		//Calculate new slope for this iteration
		slope = sumF1/sumF2;
	}

	var intercept = sumSY-(sumSX*slope);
	var slope95 = Math.sqrt(1 / suuS);
	var intercept95 = Math.sqrt(Math.pow(slope95, 2) * sxxS / sumS);

	//If we want to get the weighed regression parameters for the CDF function, return them
	if(getParams) {
		return {
			'slope': slope, 
			'intercept': intercept
		}
	}
	
	//Construct confidence interval data for Highcharts
	var data = new Array();
	data.push([minPlot, minPlot*(slope+slope95) + intercept + intercept95, minPlot*(slope-slope95) + intercept - intercept95]);
	data.push([maxPlot, maxPlot*(slope+slope95) + intercept + intercept95, maxPlot*(slope-slope95) + intercept - intercept95]);

	var boundary = [{x: minPlot, y: minPlot*(slope+slope95) + intercept + intercept95}, {x: maxPlot, y: maxPlot*(slope+slope95) + intercept + intercept95}];
	var boundary2 = [{x: minPlot, y: minPlot*(slope-slope95) + intercept - intercept95}, {x: maxPlot, y: maxPlot*(slope-slope95) + intercept - intercept95} ];
	
	//Format data series for user specified points
	var plotData = new Array();
	var errorData = new Array();
	
	for(var i = 0; i < dec.length; i++) {
		plotData.push({'y': dec[i], 'x': strike[i]});
		
		//Create error bars (Highcharts doesn't properly support this, so we draw lines from (x ± xErr, y ± yErr)
		//Separate values by null, null so Highcharts doesn't draw unwanted connections between different error bars
		errorData.push({'y': dec[i]+decErr[i], 'x': strike[i]})
		errorData.push({'y': dec[i]-decErr[i], 'x': strike[i]})
		errorData.push({'y': null, 'x': null});
		errorData.push({'y': dec[i], 'x': strike[i]+strikeErr[i]})
		errorData.push({'y': dec[i], 'x': strike[i]-strikeErr[i]})
		errorData.push({'y': null, 'x': null});
		
	}
	
	//Other series
	var plotSeries = [{
		'name': 'Input Data',
		'type': 'scatter',  
		'data': plotData,
		'zIndex': 100
	}, {
		'name': 'Data Uncertainty',
		'type': 'line',
		'data': errorData,
		'zIndex': 99,
		'enableMouseTracking': false,
		'lineWidth': 1,
		'marker': {
			'enabled': false,
		}
	}, {
		'name': 'Weighed Regression',
		'type': 'line',
		'data': [{x: minPlot, y: minPlot*slope + intercept}, {x: maxPlot, y: maxPlot*slope + intercept}],
		'color': 'rgb(191, 119, 152)',
		'dashStyle': 'ShortDash',
		'lineWidth': 2,
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		}
	}, {
		name: 'Confidence Interval',
		type: 'arearange',
		linkedTo: 'linReg',
		data: data,
		'color': 'rgba(191, 119, 152, 0.1)',
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		}
	}, {
		'name': '95% Confidence Interval',
		'type': 'line',
		'data': boundary,
		'id': 'linReg',
		'color': 'rgb(191, 119, 152)',
		'dashStyle': 'LongDash',
		'lineWidth': 2,
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		},

	}, {
		'name': '95% Confidence Interval',
		'type': 'line',
		'data': boundary2,
		'linkedTo': 'linReg',
		'color': 'rgb(191, 119, 152)',
		'dashStyle': 'LongDash',
		'lineWidth': 2,
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		},
	}];
	
	plotGraph(plotSeries, minPlot, maxPlot, false);
	
	$("#parameterTable").html('<table class="sample" style="text-align: center"> <thead> <th> Type of Regression </th> <th> Slope </th> <th> Intercept </th> <th> a95 Slope </th> <th> a95 Intercept </th> </thead> <tbody> <td> Weighed </td> <td> ' + slope.toFixed(3) + ' </td> <td> ' + intercept.toFixed(3) + ' </td> <td> ' + slope95.toFixed(3) + ' </td> <td> ' + intercept95.toFixed(3) + ' </td> </tbody> </table>')
	$("#parameterTable").show();
}

/* FUNCTION linearRegression
 * Description: calculates least-squares regression for x, y data
 * Input: x@array (x-coordinates of data) y@array (y-coordinates of data)
 * Output: regression@Object containing slope/intercept/r2 properties for regression
 */
function linearRegression(x, y){

	var regression = new Object();
	var n = y.length;
	var sum_x = 0;
	var sum_y = 0;
	var sum_xy = 0;
	var sum_xx = 0;
	var sum_yy = 0;
	
	//Sum all parameters
	for (var i = 0; i < y.length; i++) {
		sum_x += x[i];
		sum_y += y[i];
		sum_xy += x[i] * y[i];
		sum_xx += x[i] * x[i];
		sum_yy += y[i] * y[i];
	} 
	
	//Linear parameters (ax + b) and r2
	regression['slope'] = (n * sum_xy - sum_x * sum_y) / (n*sum_xx - sum_x * sum_x);
	regression['intercept'] = (sum_y - regression.slope * sum_x)/n;
	regression['r2'] = Math.pow((n*sum_xy - sum_x*sum_y)/Math.sqrt((n*sum_xx-sum_x*sum_x)*(n*sum_yy-sum_y*sum_y)),2);
	
	return regression;
}

/* FUNCTION getRandom
 * Draws a random float for value with error (Gaussian or standard)
 * Input: value@float, error@float, type@string
 * Output random@float
 */
function getRandom(value, error, type) {

	if(type === 'Gauss') {
		
		//We take the standard deviation as half the error (the error should be 95% confidence, or 2 sigma)
		//Assuming the error filled in by the user represents the 1.96sigma confidence interval (95%)
		var stdev = 0.51*error;
		
		//Apply Box–Muller transform and return one of the parameters
		//https://en.wikipedia.org/wiki/Box%E2%80%93Muller_transform
		//Return a single random (kind of wasteful, but it's ok)
		var U1 = Math.random();
		var U2 = Math.random();

		return value + Math.sqrt(-2*Math.log(U1))*Math.cos(2*Math.PI*U2) * stdev;
		
	} else {
		
		//Fall back to standard sampling (using a random sample in the full error)
		//Get a random float between min and max
		var max = value + error;
		var min = value - error;
		
		return (Math.random() * (max - min) + min);		

	}
}

/* FUNCTION bootstrapData
 * Description: bootstraps data and calculates linear regressions with confidence intervals
 * Input: dec@array, decErr@array, strike@array, strikeErr@array, minPlot@float, maxPlot@float
 * Output: VOID (calls plotGraph@function)
 */
function bootstrapData(type) {

	if(dec.length === 0) {
		return;
	}
	
	regressions = new Array();
	
	//Number of bootstraps
	var nb = 5000;
	var i = 0;
	var bar = $("#progressBar");
	var sampledStuff = new Array();
	
	//Bootstrap asynchronous implementation
	(function timed() {
		
		if(i < nb) {
		
			//Bucket to keep simulated strikes/declinations for single bootstrap
			var sampleDec = new Array();
			var sampleStrike = new Array();
			
			//For each point, draw a random point from within the confidence interval (for type: Gaussian, Standard)
			for(var j = 0; j < dec.length; j++) {
				sampleDec.push(getRandom(dec[j], decErr[j], type)); //Draw a random sample
				sampleStrike.push(getRandom(strike[j], strikeErr[j], type));
			}

			//Do a linear regression on this data, and save to the regression@array
			regressions.push(linearRegression(sampleStrike, sampleDec));
			
			//For 100 bootstraps save the sampled declinations and strikes (we use this to calculate bootstrapped residuals)
			if(i < 100) {
				sampledStuff.push({dec: sampleDec, strike: sampleStrike});
			}
			
			//One bootstrap has been completed
			i++;
			
			bar.progressbar('value', (i/nb) * 100);
			
			if(i % 50 === 0) {
				setTimeout(function() { timed(); }, 1);
			} else {
				timed();
			}
			
		} else {
			callFunc(nb, regressions, sampleDec, sampleStrike, type, sampledStuff);
		}
	})();
}

/*
 * FUNCTION callFunc
 * Description: prepares data to be plotted on the oroclinal test (top figure)
 * Input: see parameters
 * Output: VOID (calls graphing function)
 */
function callFunc(nb, regressions, sampleDec, sampleStrike, type, sampledStuff) {

	"use strict";
	
	var boundary = new Array();
	var boundary2 = new Array();
	var plotArea = new Array();
	
	//Upper and lower bound of bootstrap (95%)
	upper = parseInt(0.975*nb);
	lower = parseInt(0.025*nb);

	//For every degree calculate bootstrapped minimum/maximum
	for(var i = Math.floor(minPlot); i <= Math.ceil(maxPlot); i++) {
		
		//Buckets for minimum and maximum values
		var minArr = new Array();
		var maxArr = new Array();
		
		//Loop over all regressions and push the found value for i (which is strike)
		for(var j = 0; j < regressions.length; j++) {
			minArr.push(i*regressions[j].slope + regressions[j].intercept);
			maxArr.push(i*regressions[j].slope + regressions[j].intercept);
		}
		
		//Sort arrays from low to high
		minArr.sort(function (a, b) {
			return a > b ? 1 : a < b ? -1 : 0;
		});
		maxArr.sort(function (a, b) {
			return a > b ? 1 : a < b ? -1 : 0;
		});
		
		//Get lower bound for minimum and higher bound of maximum
		var min = minArr[lower];
		var max = maxArr[upper];
		
		//Push found data to data buckets
		boundary.push({'x': i, 'y': max}); 
		boundary2.push({'x': i, 'y': min}); 
		plotArea.push([i, min, max]); //[x, yMin, yMax]
				
		//Calculate the maximum and minimum possible regressions with 95% confidence
		if(i === minPlot) {
			var minimumStart = min;
			var maximumStart = max;
		} else if ( i === maxPlot) {
			var minimumEnd = min;
			var maximumEnd = max;
		}
	}
	
	for(var j = 0; j < regressions.length; j++) {
		slopeAverage += regressions[j].slope;
		interceptAverage += regressions[j].intercept;
	}
	
	slopeAverage = slopeAverage/regressions.length;
	interceptAverage = interceptAverage/regressions.length;
	
	//Do linear regression on actual data
	lr = linearRegression(strike, dec);
	
	var pointCloudBootstrap = new Array();
	for(var i = 0; i < sampledStuff.length; i++) {
		for(var j = 0; j < sampledStuff[i].strike.length; j++) {
			var residual = (sampledStuff[i].strike[j] * lr.slope + lr.intercept) - sampledStuff[i].dec[j];
			pointCloudBootstrap.push({
				'x': residual, 
				'y': sampledStuff[i].strike[j]
			});
		}
	}
		
	var pointCloud = new Array();
	for(var i = 0; i < strike.length; i++) {
		var residual = (strike[i] * lr.slope + lr.intercept) - dec[i];
		pointCloud.push({
			'x': residual, 
			'y': strike[i]
		});
	}
	
	plotResiduals(pointCloud, pointCloudBootstrap, minPlot, maxPlot);

	var regDat = [{
		'x': minPlot, 
		'y': lr.slope*minPlot + lr.intercept
	}, {
		'x': maxPlot, 
		'y': lr.slope*maxPlot + lr.intercept
	}];
	
	var bootstrapAverage = [{
		'x': minPlot, 
		'y': slopeAverage*minPlot + interceptAverage
	}, {
		'x': maxPlot, 
		'y': slopeAverage*maxPlot + interceptAverage
	}];	
	
	//Prepare actual data for plotting
	var plotData = new Array();
	var errorData = new Array();
	
	for(var i = 0; i < dec.length; i++) {
		plotData.push({'y': dec[i], 'x': strike[i]});
		
		//Create error bars (Highcharts doesn't properly support this, so we draw lines from (x ± xErr, y ± yErr)
		//Seperate values by null, null so Highcharts doesn't draw unwanted connections between different error bars
		errorData.push({'y': dec[i]+decErr[i], 'x': strike[i]})
		errorData.push({'y': dec[i]-decErr[i], 'x': strike[i]})
		errorData.push({'y': null, 'x': null});
		errorData.push({'y': dec[i], 'x': strike[i]+strikeErr[i]})
		errorData.push({'y': dec[i], 'x': strike[i]-strikeErr[i]})
		errorData.push({'y': null, 'x': null});
		
	}
	
	//Other series definitions
	var plotSeries = [{
		'name': 'Input Data',
		'type': 'scatter',  
		'data': plotData,
		'zIndex': 100
	}, {
		'name': 'Data Uncertainty',
		'type': 'line',
		'data': errorData,
		'zIndex': 99,
		'enableMouseTracking': false,
		'lineWidth': 1,
		'marker': {
			'enabled': false,
		}
	}, {
		'name': '95% Confidence Interval',
		'type': 'spline',
		'data': boundary,
		'id': 'linReg',
		'color': 'rgb(191, 119, 152)',
		'dashStyle': 'LongDash',
		'lineWidth': 2,
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		},

	}, {
		'name': '95% Confidence Interval',
		'type': 'line',
		'data': regDat,
		'linkedTo': 'linReg',
		'color': 'rgb(191, 119, 152)',
		'dashStyle': 'ShortDash',
		'lineWidth': 2,
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		}
	}, {
		'name': 'Average Bootstrap',
		'type': 'line',
		'data': bootstrapAverage,
		'color': 'rgb(152, 191, 119)',
		'dashStyle': 'ShortDash',
		'lineWidth': 2,
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		}
	}, {
		'name': '95% Confidence Interval',
		'type': 'spline',
		'data': boundary2,
		'linkedTo': 'linReg',
		'color': 'rgb(191, 119, 152)',
		'dashStyle': 'LongDash',
		'lineWidth': 2,
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		}
	}, {
		'name': '95% Confidence Interval',
		'type': 'arearange',
		'data': plotArea,
		'linkedTo': 'linReg',
		'color': 'rgba(191, 119, 152, 0.1)',
		'enableMouseTracking': false,
		'marker' : {
			'enabled': false
		}
	}];
	
	plotGraph(plotSeries, minPlot, maxPlot, true);
	$("#parameterTable").html('<table class="sample" style="text-align: center"> <thead> <th> Type of Regression </th> <th> Average Slope </th> <th> Average Intercept </th> <th> Regression Slope </th> <th> Regression Intercept </th> <th> Regression R2 </th> </thead> <tbody> <td> ' + type + ' </td> <td> ' + slopeAverage.toFixed(3) + ' </td> <td> ' + interceptAverage.toFixed(3) + ' </td> <td> ' + lr.slope.toFixed(3) + ' </td> <td> ' +	lr.intercept.toFixed(3) + ' </td> <td> ' +	lr.r2.toFixed(3) + ' </td> </tbody> </table>')
	$("#parameterTable").show();
	
}

function plotResiduals (data, databs, min, max) {
	
	var sortedArr = new Object();
	var binSize = 5;
	
	for(var i = 0; i < data.length; i++) {
		var s = (Math.round(data[i].x / binSize) * binSize)%360;
		sortedArr[s] ? sortedArr[s] += 1 : sortedArr[s] = 1;
	}

	var data2 = new Array();
	for(var key in sortedArr) {
		data2.push({
			'x': Number(key), 
			'y': Number(sortedArr[key])
		});
	}

	var sortedArrBs = new Object();
	for(var i = 0; i < databs.length; i++) {
		var s = (Math.round(databs[i].x / binSize) * binSize)%360;
		sortedArrBs[s] ? sortedArrBs[s] += 1 : sortedArrBs[s] = 1;
	}

	var data2bs = new Array();
	for(var key in sortedArrBs) {
		data2bs.push({
			'x': Number(key), 
			'y': -Number(sortedArrBs[key])/100
		});
	}
	
	$('#pClu').highcharts({
        'chart': {
        },
		'title': {
			'text': 'Residuals'
		},
		'yAxis': {
			'gridLineWidth': 0,
			'min': min,
			'max': max
		},
		credits: {
			text: "Paleomagnetism.org [Oroclinal Test] - Residuals",
			href: ''
		},		
		 plotOptions: {
            'series': {
				'stacking': 'normal',
                'groupPadding': 0,
            },
        },
        series: [{
			'type': 'scatter',
            'name': 'Residuals',
            'color': 'rgb(119, 152, 191)',
			'zIndex': 100,
            'data': data
		}, {
			'type': 'bar',
			'name': 'Data Residuals',
			'color': 'rgba(119, 152, 191, 0.5)',
			'data': data2
		}, {
			'type': 'bar',
			'name': '100 Summed Bootstrapped Residuals',
			'color': 'rgba(191, 152, 119, 0.5)',
			'data': data2bs
		}]
    });
}

function getCDF ( type ) {

	if(type === 'slope') {
		var average = slopeAverage;
	} else {
		var average = interceptAverage;	
	}
	
	var decimation = 5;
	var data = new Array();
	for(var i = 0; i < regressions.length; i+= decimation) {
		data.push(regressions[i][type]);
	}
	
	plotCDF(data, lower/decimation, upper/decimation, 'CDFContainer', 'Cumulative Distribution Function', lr[type], average, weighedParameters[type], 'Regression ' + type);

}

/* FUNCTION: toggleBands
 * Description: toggles confidence bands on plots
 * Input: the respective chart, and an array containing the plotBand data (e.g. to, from values)
 * Output: VOID
 */
function toggleBands(chart, plotBands) {
    var i = chart.xAxis[0].plotLinesAndBands.length;
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

function plotCDF (one, lower, upper, container, title, x1, x2, x3, type) {

	//Sort coordinates for one
	one.sort(function (a, b) {
		return a > b ? 1 : a < b ? -1 : 0;
	});

	//Calculate CDFs
	var cdfOne = new Array();
	var nb = one.length;
	
	for(var i = 0; i < nb; i++) {
		cdfOne.push({'x': one[i], 'y': i/(nb-1)});
	}
	
	//Define plotbands to represent confidence envelopes
	var plotBands = [{
		color: 'rgba(119, 152, 191, 0.25)', // Color value
		from: one[lower],
		to: one[upper],
		id: 'confidence'
	}];

	//Define the cumulative distribution function
	mySeries = [{
		name: 'Bootstrapped Regression', 
		data: cdfOne,
		type: 'spline',
		color: 'rgb(119, 152, 191)',
		marker: {
			enabled: false
		}
	}, {
		one: one[lower], 
		two: one[upper], 
		type: 'area', 
		name: '95% Confidence Intervals', 
		id: 'conf', 
		color: 'rgba(119, 152, 191, 1)'
	}, {
		name: 'Data Regression',
		data: [{x: x1, y: 0}, {x: x1, y: 1}],
		enableMouseTracking: false,
		marker: {
			enabled: false
		}
	}, {
		name: 'Weighted Regression',
		data: [{x: x3, y: 0}, {x: x3, y: 1}],
		enableMouseTracking: false,
		marker: {
			enabled: false
		}
	}, {
		name: 'Average Bootstrap',
		data: [{x: x2, y: 0}, {x: x2, y: 1}],
		enableMouseTracking: false,
		marker: {
			enabled: false
		}
	}];
		
	//Chart options	to be used
	var chartOptions = {
        title: {
            text: title,
        },
		exporting: {
			filename: 'Regression Bootstrap',
		    sourceWidth: 1200,
            sourceHeight: 600,
            buttons: {
                contextButton: {
                    symbolStroke: '#7798BF',
					align: 'right'
                }
            }
        },
		chart: {
			id: 'CTMDXYZ',
			zoomType: 'xy',
			renderTo: container
		},
        subtitle: {
			text: ' Decimated to ' + nb + ' bootstraps'
        },
		plotOptions: {
			series: {
				turboThreshold: 0
			},
			area: {
				events: {
					legendItemClick: function (e) {
						if (this.name == '95% Confidence Intervals') {
							toggleBands(this.chart, plotBands);
						}
					}
				}
			}
		},
        xAxis: {
			title: {
                text: type
            },
			plotBands: plotBands,
		},
		credits: {
			text: "Paleomagnetism.org [Oroclinal Test] - Parameter Bootstrap",
			href: ''
		},
        yAxis: {
			min: 0,
			max: 1,
            title: {
                text: 'Cumulative Distribution'
            }
        },
        tooltip: {
    		formatter: function() {
        		return '<b> Cumulative Distribution </b><br><b>' + title + ': </b>' + this.x.toFixed(2) + '<br><b>CDF: </b>' + this.point.y.toFixed(3) //Tooltip on point hover. We convert the projected inclination back to the original inclination using eqAreaInv and display it to the user.
    		}
		},
        series: mySeries
    }
	
	new Highcharts.Chart(chartOptions);	
}

/* FUNCTION plotGraph
 * Description: contains object information for Highcharts graph
 * Input: plotSeries@object, min@float, max@float
 * Output: VOID (draws plot)
 */
function plotGraph(plotSeries, min, max, b) {
		
	var chartOptions = {
        chart: {
			animation: false,
			id: 'oroclinal',
			renderTo: 'initialPlot',
			zoomType: 'xy',
        },
        title: {
            text: 'Oroclinal Test'
        },
        subtitle: {
            text: 'Bootstrapped at 95% Confidence Interval'
        },
		legend: {
			itemHoverStyle: null
		},
		exporting: {
			filename: 'Oroclinal_Test',
            buttons: {
                contextButton: {
                    symbolStroke: '#7798BF',
					align: 'right'
                }
            }
        },
        xAxis: {
			min: min,
			max: max,
            title: {
                text: 'Strike'
            }
        },
		credits: {
			text: "Paleomagnetism.org [Oroclinal Module]",
			href: ''
		},
		plotOptions: {
			series: {
				animation: false,
				cropThreshold: 4000,
				turboThreshold: 0,
				states: {
                    hover: {
                        enabled: false,
                        lineWidth: 5
                    }
                }
			}
		},
        yAxis: {
            title: {
                text: 'Declination'
            }
        },
		series: plotSeries
	}
	
	var chart = new Highcharts.Chart(chartOptions);

	if($('#makeSquare').prop('checked')) {
	
		//Algorithm to make graph square (same x and y axis scaling)
		//Calculate the ratio of the xAxis (pixels per degree)
		var ratio = chart.xAxis[0].width / (max - min);
	
		//Get the extremes of the yAxis 
		var extremes = chart.yAxis[0].getExtremes();
	
		//Multiply the degrees with the found ratio to obtain the amount of pixels
		var yAxisPixels = (extremes.max - extremes.min) * ratio;
		chartOptions.yAxis.height = yAxisPixels;
		chartOptions.chart.height = yAxisPixels + 190;
		chartOptions.yAxis.min = extremes.min;
		chartOptions.yAxis.max = extremes.max;
		chartOptions.xAxis.min = min;
		chartOptions.xAxis.max = max;
		
		//Redraw the chart with the new chart options
		var chart = new Highcharts.Chart(chartOptions);
	}
	
	if(b) {
		getCDF($("#getCDF").val());
		$("#showBooty").show();
	}
}