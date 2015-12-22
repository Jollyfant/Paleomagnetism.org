/* PALEOMAGNETISM.ORG MAGSTRAT PORTAL
 * 
 * VERSION: ALPHA.1512
 * LAST UPDATED: 12/22/2015
 *
 * JavaScript file containing functions for the magnetostratigraphy portal
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

var loadedStratigraphy;

/*
 * FUNCTION importing
 * Description: handles importing of strat column definition
 * Input: DOM event
 * Output: VOID (calls plotting functions) and fills loadedStratigraphy
 */
function importing (event) {

	var input = event.target;
	var reader = new FileReader();
	
	//Single input
    	reader.readAsText(input.files[0]);
	reader.onload = function() {

		var text = reader.result;
		var lines = text.split("\n");

		lines = $.grep(lines, function(n) { 
			return n;
		});

		// Get the stratigraphy from the requested format e.g.
		// Areas between those levels will be colored BLACK
		var strat = new Array()
		for(var i = 0; i < lines.length; i++) {
			var parameters = lines[i].split(/[,\s\t]+/)
			parameters = $.grep(parameters, function(n) { 
				return n;
			});
    	 		strat.push([0, Number(parameters[0]), Number(parameters[1])])
        		strat.push([1, Number(parameters[0]), Number(parameters[1])])
        		strat.push([null])
		}

		// Fill global for memory
		loadedStratigraphy = strat;

		showBW(strat)
	}

}

/*
 * FUNCTION plotStrat
 * Description: plots the declination/inclination vs stratigraphic level
 * Input: NULL
 * Output VOID (calls plotting functions)
 */
function plotStrat() {

	//Get selected site name
	var siteName = $("#stratSel").val();
	if(siteName == null) {
		notify('failure', 'Please select a site.');
		$("#stratPlots").hide();
		return;
	}

	if(siteName.length > 1) {
		notify('failure', 'Please select a single site.');
		return;
	}
	

	// Get all accepted/rejected directions and sort by strat. level
	var parsingData = new Array();
	for(var i = 0; i < sites[siteName].data.dir.accepted.length; i++) {
		parsingData.push(sites[siteName].data.dir.accepted[i]);
	}
	for(var i = 0; i < sites[siteName].data.dir.rejected.length; i++) {
		parsingData.push(sites[siteName].data.dir.rejected[i]);
	}
	parsingData.sort(function(a, b){
		return a[5] > b[5] ? 1 : (a[5] < b[5] ? -1 : 0);
	})

	// Format Highcharts data arrays (dec between -180, 180)
	// If a stratigraphic level is missing default to 0

	var pointColor = 'rgb(119, 152, 191)';

	var dataDec = new Array();
	var dataInc = new Array();
	for(var i = 0; i < parsingData.length; i++) {
		var declination = parsingData[i][0] > 180 ? parsingData[i][0] - 360 : parsingData[i][0];
		var inclination = parsingData[i][1];
		var stratLevel = parsingData[i][5] || 0;
     		dataDec.push({
			'x': declination, 
			'y': stratLevel,
			'marker': {
				'fillColor': inclination < 0 ? 'white' : pointColor,
				'lineColor': pointColor,
				'lineWidth': 1
			}
		});
		dataInc.push({
			'x': inclination,
			'y': stratLevel,
			'marker': {
				'fillColor': inclination < 0 ? 'white' : pointColor,
				'lineColor': pointColor,
				'lineWidth': 1
			}
		});
	}
	
	// Request plots
	showStratigraphy('magstratDeclination', 'Declination', {'min': -180, 'max': 180}, dataDec);
	showStratigraphy('magstratInclination', 'Inclination', {'min': -90, 'max': 90}, dataInc);

	// Plot binary
	showBW(loadedStratigraphy);

	$("#stratPlots").show();

}

/* 
 * FUNCTION updateStratigraphicLevel
 * Description: Updates the binary column to the max/min of inc/dec charts
 * Input: NULL
 * Output: VOID (updates binary chart)
 */
function updateStratigraphicLevel () {

	//Get the extremes, sanity check and update
	try {
		var extremesInc = $("#magstratInclination").highcharts().yAxis[0].getExtremes();
		var extremesDec = $("#magstratDeclination").highcharts().yAxis[0].getExtremes();
	} catch (e){
		return;
	}

	if(extremesInc.max !== extremesDec.max) {
		notify('Failure', 'Error: minimum and maximum of declination/inclinations chart is different');
		return;
	}

	// Set new extremes and check new extremes
	$("#magstratSet").highcharts().yAxis[0].setExtremes(0, extremesInc.max);

	// Ok let's make sure the charts have exactly the same scale.
	var extremesBinary = $("#magstratSet").highcharts().yAxis[0].getExtremes();
	if(extremesBinary.max !== extremesDec.max) {
		notify('failure', "Error: scale of binary plot does not match inclination/declination. Contact us!");
	}

	return;
}

function showBW (strat) {

	// Only if charts exist
	// Get the tick positions from dec/inc chart and copy manually to binary chart.
	// We need everythign on the exact same level, and highcharts is weird with ticks sometimes.
	try {
		var ticks = $("#magstratDeclination").highcharts().yAxis[0].tickPositions;
	} catch(e) {
		return;
	}

	if(!strat) {
		return;
	}

	$('#magstratSet').highcharts({
        	'title': {
            		'text': 'Polarity'
        	},
       		'xAxis': {
               		'min': 0,
                	'max': 1,
        	},
        	'yAxis': {
			'tickPositions': ticks,
			'title': {
				'text': '',			
			},
			'labels': {
				'enabled': false
			},
			'min': 0,
			'gridLineWidth': 0,
        	},
		'credits': {
			'enabled': false,
		},
        	'series': [{
			'enableMouseTracking': false,
                	'type': 'arearange',
                	'name': 'Magnetostratigraphy',
                	'data': strat,
                	'lineWidth': 0,
                	'color': 'rgb(0, 0, 0)',
			'zIndex': 0
        	}]
    	});

	// Update y-	axis for binary graph to match dec/inc plots
	updateStratigraphicLevel();
}

/*
 * FUNCTION showStratigraphy
 * Description: function called twice for plotting inclination/declination
 * Input: container ID, a title ("dec", "inc"), range of xAxis [-90, 90] and [-180, 180] and the data to plot
 * Output: VOID (calls Highcharts constructor)
 */
function showStratigraphy(container, title, xRange, plotData) {
	$('#' + container).highcharts({
        	'title': {
            		'text': title
        	},
		'credits': {
			'enabled': true,
			'text': 'Paleomagnetism.org [Magnetostratigraphy]',
			'href': ''
		},
       		'xAxis': {
               		'min': xRange.min,
                	'max': xRange.max,
			'tickInterval': title === 'Declination' ? 90 : 45
        	},
        	'yAxis': {
			'min': 0,
			'title': {
				'text': title === 'Declination' ? "Arbitrary Stratigraphic Level" : ""
			},
        	},
        	'series': [{
            		'type': 'line',
			'linkedTo': 'data',
			'showInLegend': false,
            		'name': title,
                	'lineWidth': 1,
			'enableMouseTracking': false,
            		'data': plotData,
        	}, {
			'id': 'data',
			'color': 'rgb(119, 152, 191)',
			'name': title,
                    	'type': 'scatter',
            		'data': plotData,
                	'marker': {
                        	'symbol': 'circle',
                	}
        	}]
    	});
}

