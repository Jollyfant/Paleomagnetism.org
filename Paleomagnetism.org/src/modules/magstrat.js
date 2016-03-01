/* PALEOMAGNETISM.ORG MAGSTRAT PORTAL
 * 
 * VERSION: ALPHA.1512
 * LAST UPDATED: 12/23/2015
 *
 * JavaScript file containing functions for the magnetostratigraphy portal
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

/*
 * FUNCTION importing
 * Description: handles importing of strat column definition
 * Input: DOM event
 * Output: VOID (calls plotting functions) and fills loadedStratigraphy
 */
function importing (event) {		

	var input = event.target;
	var reader = new FileReader();
	var siteName = getSiteName();

	//Single input
    reader.readAsText(input.files[0]);
	reader.onload = function() {

		var savingArray = new Array();
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

			var bottom = Number(parameters[0]);
			var top = Number(parameters[1]);
			savingArray.push([bottom, top]);
		}

		sites[siteName].userInput.metaData.strat = savingArray;
		showBW(formatBinaryColumn(savingArray));
		notify('success', 'Stratigraphy has succesfully been added.');
		setStorage();
	}

}

/* 
 * FUNCTION removeStrat
 * Description: removes interpreted stratigraphy from site
 * Input: NULL
 * Output: VOID
 */
function removeStrat () {
	
	var siteName = getSiteName();
	
	if(!siteName) {
		notify('failure', 'Please select a site to be cleared.');
		return;
	}
	
	sites[siteName].userInput.metaData.strat = new Array();	
	setStorage();
	showBW(new Array())
	notify('success', 'Stratigraphy has been cleared succesfully.');
	
}

/* 
 * FUNCTION formatBinaryData
 * Description: parses array of [top, bottom] to Highcharts arearange
 * Input: Array of [top, bottom] for black blocks in magnetostrat
 * Output: Formatted array that can be ingested by Highcharts
 */
function formatBinaryColumn (input) {
	var strat = new Array();
	for(var i = 0; i < input.length; i++) {
    		strat.push([0, input[i][0], input[i][1]])
        	strat.push([1, input[i][0], input[i][1]])
        	strat.push([null]) //Null to prevent unwanted connection
	}
	return strat;
}

/* 
 * FUNCTION getSiteName
 * Description: gets selected site name from box
 * Input: NULL
 * Output: siteName or false if error getting name
 */
function getSiteName() {
	var siteName = $("#stratSel").val();
	if(siteName === null) {
		$("#stratPlots").hide();
		return false;
	} else if(typeof(siteName) === 'object') {
		notify('failure', 'Please select a single site.');
		return false;
	}
	return siteName;
}

/*
 * FUNCTION plotStrat
 * Description: plots the declination/inclination vs stratigraphic level
 * Input: NULL
 * Output VOID (calls plotting functions)
 */
function plotStrat() {
	
	var siteName = getSiteName();

	if(!siteName) return;

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
		var sample = parsingData[i][4];
		var stratLevel = parsingData[i][5] || 0;
     		dataDec.push({
			'sample': sample,
			'x': declination, 
			'y': stratLevel,
			'marker': {
				'fillColor': inclination < 0 ? 'white' : pointColor,
				'lineColor': pointColor,
				'lineWidth': 1
			}
		});
		dataInc.push({
			'sample': sample,
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
	if(sites[siteName].userInput.metaData.strat) {
		showBW(formatBinaryColumn(sites[siteName].userInput.metaData.strat));
	} else {
		showBW(new Array());
	}

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

function arraySum(array) {
	return array.reduce(function(a, b){return a+b;})
}


function dlStrat(type) {

	console.log(type);
	//Get the different graphs
	var charts = [
		$('#magstratDeclination').highcharts(), 
		$('#magstratSet').highcharts(),
		$('#magstratInclination').highcharts()
	];

	var widths = [50, 335, 470];
	var svgArr = new Array();

	//Loop over charts
	for(var i = 0; i < charts.length; i++) {
		var svg = charts[i].getSVG();
		svg = svg.replace('<svg', '<g transform="translate('+widths[i]+',0)" ');
		svg = svg.replace('</svg>', '</g>');
		svgArr.push(svg);
	}

    	var svg = '<svg height="800" width="' + 795 + '" version="1.1" xmlns="http://www.w3.org/2000/svg">' + svgArr.join('') + '</svg>';
	var form
    
    	// merge the options
    	var options = Highcharts.merge(Highcharts.getOptions().exporting, options);
    	var form = Highcharts.createElement('form', {
        	method: 'post',
        	action: options.url
    	}, {
        	display: 'none'
    	}, document.body);

    	// Add the values
    	Highcharts.each(['filename', 'type', 'width', 'svg'], function(name) {
        	Highcharts.createElement('input', {
            	type: 'hidden',
            	name: name,
            	value: {
                	filename: 'Magnetostratigraphy',
                	type: type,
                	width: options.width,
                	svg: svg
            	}[name]
        	}, null, form);
	});
    	form.submit();
    	form.parentNode.removeChild(form);
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
				useHTML: true,
            	'text': '<a style="cursor: crosshair;" onClick="pp()">⊶</a>',
        	},

       		'xAxis': {
               		'min': 0,
                	'max': 1,
			'labels': {
				'style': {
					'color': 'white'
				}
			},
			'lineColor': 'white',
			'tickColor': 'white'
        	},
        	'yAxis': [{
			'tickPositions': ticks,
			'lineWidth': 1,
			'lineColor': 'black',
			'title': {
				'text': '',			
			},
			'labels': {
				'enabled': false
			},
			'min': 0,
			'gridLineWidth': 0,
        	}, {
			'opposite': true,
			'tickPositions': ticks,
			'lineWidth': 1,
			'lineColor': 'black',
			'title': {
				'text': '',			
			},
			'labels': {
				'enabled': false
			},
			'min': 0,
			'gridLineWidth': 0,
		}],
		'plotOptions': {
			'series': {
				'events': {
					'legendItemClick': function () {
						var color = this.yAxis.axisLine.stroke === 'black' ? 'white' : 'black'
						for(var i = 0; i < 2; i++) {
							this.chart.yAxis[i].update({
								lineColor: color
							});
						}
					}
				}
			}
		},
		'credits': {
			'enabled': false,
		},
        	'series': [{
			'enableMouseTracking': false,
                'type': 'arearange',
                'name': 'MagStrat',
                'data': strat,
                'lineWidth': 0,
                'color': 'rgb(0, 0, 0)',
			'zIndex': 0,
        states: {
            hover: {
                enabled: false
            }
        }
        	}]
    	});

	// Update y-	axis for binary graph to match dec/inc plots
	updateStratigraphicLevel();
}

function getRandomColor() {
    var letters = '0123456789ABCDEF'.split('');
    var color = '#';
    for (var i = 0; i < 6; i++ ) {
        color += letters[Math.floor(Math.random() * 16)];
    }
    return color;
}

var party = false;
var reversed = true;
var partyLoop;

function pp() {
		
	if(party) {
		$("#um")[0].pause();	
		clearInterval(partyLoop);
		party = false;
		var reversed = false;
			$("#magstratSet").highcharts().series[0].update({
				'color': 'rgb(0,0,0)'
		});
			$("#magstratDeclination").highcharts().yAxis[0].update({
           reversed: reversed
       }); 
	   	$("#magstratInclination").highcharts().yAxis[0].update({
           reversed: reversed
       }); 
		return;
	}
	
	party = true;
	
	$("#um")[0].play();
	
	partyLoop = setInterval(function (x) {
	reversed = !reversed;
	$("#magstratDeclination").highcharts().yAxis[0].update({
           reversed: reversed
       }); 
	   	$("#magstratInclination").highcharts().yAxis[0].update({
           reversed: reversed
       }); 
	   
	$("#magstratSet").highcharts().series[0].update({
		'color': (function() { return getRandomColor(); })()
	});
	
	}, 250);	
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
			'tickInterval': title === 'Declination' ? 90 : 45,
			'labels': {
				'format': '{value}°'
			}
        	},
			'exporting': {
				'enabled': false
			},
		'tooltip': {
			'formatter': function () {
				var tooltip = 
					'<b>Sample: </b>' + this.point.sample + '<br>' +
					'<b>' + title + ': </b>' + this.x.toFixed(2) + '<br>' +
					'<b>Stratigraphic Level: </b>' + this.y;
				return tooltip;			
			}
		},
        	'yAxis': {
			'opposite': title === 'Declination' ? false : true,
			'gridLineDashStyle': 'Dot',
			'min': 0,
			'title': {
				'text': ''
			}
        	},
        	'series': [{
            		'type': 'line',
			'linkedTo': 'data',
			'showInLegend': false,
			'dashStyle': 'Dot',
            		'name': title,
                	'lineWidth': 1,
			'color': 'grey',
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

