/* PALEOMAGNETISM.ORG STATISTICS PORTAL
 * I/O MODULE
 * 
 * VERSION: ALPHA.1507
 * LAST UPDATED: 7/29/2015
 *
 * Description: Module handles data importing and exporting
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */
 
 //Define I/O object
module.IO = new Object();

module.IO.downloadSelected = function () {
	
	var siteNames = $("#introSel").val();
	if(siteNames == null) {
		notify('failure', 'No site has been selected');
		return;
	}
	
	//Format for the export
	var exportData = {
		'version'	: version,
		'apwp'		: APWPs,
		'data'		: new Array()
	};
	
	//Add all sites to the export data; ignore internally used site TEMP
	for(var i = 0; i < siteNames.length; i++) {
		if(sites[siteNames[i]].userInput.metaData.name !== "TEMP") {
			exportData.data.push(sites[siteNames[i]].userInput);
		}
	}

	//Call downloading function for parsed data (JSON stringified)
	module.IO.dlItem(JSON.stringify(exportData), 'export', 'pmag')
}

/*
 * FUNCTION: module.IO.importing
 * Description: Imports and parses the custom .pmag file
 * INPUT: filereader .pmag file;
 * OUTPUT: VOID
 */
module.IO.importing = function(event) {
	
    var input = event.target;
    var reader = new FileReader();
	
	//Single input
    reader.readAsText(input.files[0]);
	
	reader.onload = function() {
		
		var text = reader.result;

		//Error catching if parsing is impossible -> file may be corrupt
		try {
			var importData = (JSON.parse(text));
		} catch (err) {
			notify('failure', 'A critical error occured while parsing the data. Your file may be corrupt: ' + err);
		}
		
		//Loop over all sites in the .pmag file and append site names that do not presently exist in the instance
		var i = 0;
		var j = 0;
		$("#loading").show();
		(addSitesTimed = function () {
			if(i < importData.data.length) {
				if(!sites.hasOwnProperty(importData.data[i].metaData.name)) {
					sites[importData.data[i].metaData.name] = new site(importData.data[i].metaData, importData.data[i].data, false);
					j++;
				} else {
					notify('failure', 'Skipping site ' + importData.data[i].metaData.name + '; a site with this name already exists in this instance.');
				}
				i++;
				setTimeout( function() { addSitesTimed(); }, 1);
			} else {
				notify('success', 'Application has been initialized succesfully; found ' + j + ' site(s) and ' + Object.keys(APWPs).length + ' APWP(s)');
				$("#loading").hide();
				finishedLoading();
				setStorage();
			}
		})();
		
		function finishedLoading () {
			//Also add APWPs if present
			var numAPWPs = 0;
			for(var i in importData.apwp) {
				if(!APWPs.hasOwnProperty(i)) {
					APWPs[i] = importData.apwp[i];
					$('#plateNames').append("<option custom=\"true\" value=\"" + i + "\">" + i + "</option>");
					numAPWPs++;
				} else {
					notify('failure', 'APWP with name ' + i + ' already exists in this instance.');
				}
			}
			
			//Force a refresh
			$('#plateNames').multiselect('refresh');	
			
			//No errors, then save the instance and notify user
			if(numAPWPs > 0) {
				notify('success', 'Importing was succesful; added ' + numAPWPs + ' custom APWP(s)');
			}
			$('#update').click();
		}
	};
};
 
/* MODULE I/O
 * FUNCTION: table
 * Description: Creates .CSV of all statistical parameters for sites
 * INPUT: NULL;
 * OUTPUT: Calls dlCSV()
 */
module.IO.table = function(siteNames) {

	csv = '';
	
	// Options
    var itemDelimiter = '","';
    var lineDelimiter = '\n';
	
	//if siteNames is not specified, assume user wants everything so get all sites to a new siteNames array
	if(siteNames == undefined) {
		var siteNames = new Array();
		for(key in sites) {
			siteNames.push(key);
		}
	}
	
	if(siteNames.length == 0) {
		notify('Failure', 'There is no data to export');
		return;
	}
	
	var coordinates = [["data", "Geographic Coordinates"], ["dataTC", "Tectonic Coordinates"]];
	
	for(var j = 0; j < coordinates.length; j++) {

		csv += coordinates[j][1];
		csv += lineDelimiter;
		
		//Get the entire list of parameters
		var row = ['Site Name'];
		for(parameter in sites[siteNames[0]][coordinates[j][0]].params) {
			if(parameter !== 'kentParameters') {
				row.push(parameter);
			}
		}
		
		row.push("latitude", "longitude", "author", "age", "min age", "max age");
		row.push("beddings");
		
		csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
	
		for(var i = 0; i < siteNames.length; i++) {
			if(sites[siteNames[i]].userInput.metaData.name != "TEMP") {
				
				var key = siteNames[i];
				
				row = [];
				row.push(key);
				for(parameter in sites[key][coordinates[j][0]].params) {
					if(parameter !== 'kentParameters') {
						row.push(sites[key][coordinates[j][0]].params[parameter]);
					}
				}
				
				row.push(sites[key].userInput.metaData['latitude'])
				row.push(sites[key].userInput.metaData['longitude'])
				row.push(sites[key].userInput.metaData['author'])
				row.push(sites[key].userInput.metaData['age'])
				row.push(sites[key].userInput.metaData['minAge'])
				row.push(sites[key].userInput.metaData['maxAge'])
				var beddings = sites[key].userInput.data.map(function (entry) { return entry[2] + '/' + entry[3]});
				row.push(uniqueBedding(beddings).join(', '));
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			}
		}
	
		csv += lineDelimiter;
		csv += lineDelimiter;
		
	}
	
	//Call downloading function
	module.IO.dlItem(csv, 'Parameter_Table', 'csv');
}

uniqueBedding = function (array) {
	return array.filter(function(el,i,a){if(i==a.indexOf(el))return 1;return 0});
}
/* MODULE I/O
 * FUNCTION dlItem
 * Description: Attempts to create a download attribute to download CSV
 * Input: Data to be downloaded (usually csv formatted) @ string, name @ string, extension @ string
 * Output: VOID (downloads file)
 */
module.IO.dlItem = function ( data, name, extension ) {
	
	// Don't do anything is there is no data
	if(!data) {
		return;
	}
	
	//UTF-8 Fixes [#0013]
	var blob = new Blob([data], { type: 'data:text/csv;charset=utf-8,'});
	var csvUrl = URL.createObjectURL(blob);

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
				data: data,
				type: 'txt',
				extension: extension
		});
	}
}	

/* MODULE EXPORTING
 * FUNCTION: userinput
 * Description: handles exporting to the custom .pmag format from global SITES
 * INPUT: NULL
 * OUTPUT: Downloadable .pmag file
 */
module.IO.exporting = function () {
	
	//Check if there are data for exporting
	if(Object.keys(sites).length === 0 && Object.keys(APWPs).length === 0) {
		notify('note','There are no data for exporting.')
		return;
	}
	
	//Format for the export
	var exportData = {
		'version'	: version,
		'apwp'		: APWPs,
		'data'		: new Array()
	};
	
	//Add all sites to the export data; ignore internally used site TEMP
	for(var site in sites) {
		if(sites[site].userInput.metaData.name != "TEMP") {
			exportData.data.push(sites[site].userInput);
		}
	}

	//Call downloading function for parsed data (JSON stringified)
	module.IO.dlItem(JSON.stringify(exportData), 'export', 'pmag')
}

/* HIGHCHARTS
 * Function: getSVG
 * Description: create a global getSVG method that takes an array of charts as an argument
 * Input array of chart containers [chart1, chart2];
 * Output: returns SVG formatted string for all equal area projections (directions and VGPs);
 * © Torstein Hønsi
 **/
module.IO.getSVG = function(id) {
		
	//Exporting ChRM/VGP figure 
	if(id == 'exportAll') {
		var siteNames = $('#dirSel').val();
		if(siteNames == null) {
			notify('failure', 'No site has been selected');
			return;
		}
		
		//Get graphs in direction module 
		var charts = [
			$('#magneticDirectionGraph').highcharts(), 
			$('#VGPPositionGraph').highcharts()
		];
	
		//Put coordinate reference frame + confidence ellipse in file name.
		var appendix = $("#radio input[type='radio']:checked").val();
		appendix += ' (' + $("#radioConfDir input[type='radio']:checked").val() + ')';
		
	} else if (id == 'exportAllMean') {
		
		var siteNames = $('#meanSel').val();
		if(siteNames == null) {
			notify('failure', 'No sites have been selected');
			return;
		}
		
		//Get graphs in direction module 
		//In geographic and tectonic coordiantes
		var charts = [
			$('#siteMean').highcharts(), 
			$('#siteMeanTC').highcharts()
		];	
		
		//Construct an appendix for the filename containing confidence envelope 
		var appendix = ' (' + $("#radioConfDir input[type='radio']:checked").val() + ')';
		
	} else if (id == 'dlBootstrapXYZ') {
		var charts = [
			$('#xContainer').highcharts(), 
			$('#yContainer').highcharts(),
			$('#zContainer').highcharts()
		];	
	}

	var svgArr = new Array();

	//Loop over charts
	for(var i = 0; i < charts.length; i++) {

		var svg = charts[i].getSVG();
		svg = svg.replace('<svg', '<g transform="translate('+600*i+',0)" ');
		
		svg = svg.replace('</svg>', '</g>');
		svgArr.push(svg);
	}

    var svg = '<svg height="600" width="' + 600 * charts.length + '" version="1.1" xmlns="http://www.w3.org/2000/svg">' + svgArr.join('') + '</svg>';
	var form
    
    // merge the options
    var options = Highcharts.merge(Highcharts.getOptions().exporting, options);

    // create the form
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
                filename: options.filename || 'Directions' + appendix,
                type: 'application/pdf',
                width: options.width,
                svg: svg
            }[name]
        }, null, form);
		
    });
	
    // submit
    form.submit();

    // cleaning up
    form.parentNode.removeChild(form);
	
};

/**
 * Description: Create a global exportCharts method that takes an array of charts as an argument, and exporting options as the second argument
 * Input: array of graphs
 * Output: Downloadable .pdf with all sites
 * © Torstein Hønsi
 */
 
$(function() {

	/**
	* A small plug-in for getting the CSV of a chart
	*/
	(function (Highcharts) {
	
		downloadAttrSupported = document.createElement('a').download !== undefined;
			
		// Options
		var itemDelimiter = '","';
		var lineDelimiter = '\n';
	
		//Add a prototype function
		Highcharts.Chart.prototype.getCSV = function () {
			
			var csv = "";
			
			/*
			* CSV EXPORTING: Polar plot
			*/
			
			if(this.userOptions.chart.id == 'plotPole') {
				
				//Every 4th series
				//Unfortunately because of a bug we were required to implement two identical series: one scatter and one line.
				//The line cannot be interacted with. Using only a line without scatter makes it difficult to use the tooltip.
				//The last two series are the confidence envelope and not interesting for exporting. Just parse the A95 data.
				for(var i = 0; i < this.series.length; i += 4) {
					
					
					//Put name and information
					csv += '"' + this.series[i].name + '"' + lineDelimiter;
					var columns = ['Latitude', 'Longitude', 'Age', 'Alpha95', 'Name'];
					csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;		
					
					//For all data put latitude/longitude/age/A95
					for(var j = 0; j < this.series[i].data.length; j++)	{
						var columns = [this.series[i].data[j].inc, this.series[i].data[j].x, this.series[i].data[j].age, this.series[i].data[j].A95, this.series[i].data[j].name];
						csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;			
					}

					csv += lineDelimiter;	
				}
				
			}
			
			/*
			* CSV EXPORTING: Expected paleolatitude/declination/inclination
			*/
			if(this.userOptions.chart.id == 'expectedLocation') {
				
				//Loop over every second series (1st is line; 2nd is error range; etc..)
				for(var i = 0; i < this.series.length; i += 2) {
					
					//Put name and information
					csv += '"' + this.series[i].name + '"' + lineDelimiter;
					var columns = ['Age', this.title.textStr, 'Error High', 'Error Low', 'Name'];
					csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;			
					
					//Loop over all data points and put them in columns/rows (include the error range in series[i+1])
					for(var j = 0; j < this.series[i].data.length; j++) {
						var columns = [this.series[i].data[j].x, this.series[i].data[j].y, this.series[i+1].data[j].high, this.series[i+1].data[j].low, this.series[i].data[j].name];
						csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
					}	
					csv += lineDelimiter;
				}
				
			}
			
			/*
			* CSV EXPORTING: ChRM Directions (Figure 1 left)
			*/
			if(this.userOptions.chart.id == 'ChRM') {
	
				columns = ['sample', 'dec', 'inc'];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
				
				//Add all directions (first 2 series)
				for(var k = 0; k <= 1; k++) {
					for(var i = 0; i < this.series[k].data.length; i++) {
				
						//Sample name, declination, inclination, rejected/accepted on one line
						row = [this.series[k].data[i].sample, this.series[k].data[i].x, this.series[k].data[i].inc, this.series[k].name];	
						csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				
					}
				}
				
				//Add mean direction to bottom of CSV file
				csv += lineDelimiter
				csv += 'Mean dec, Mean inc' + lineDelimiter;
				row = [this.series[2].data[0].x, this.series[2].data[0].inc]
				csv += '"' + row.join(itemDelimiter) + '"' 
			
			}
			
			if(this.userOptions.chart.id == 'CTMDXYZ') {
				
				columns = [this.series[0].name, '', '', this.series[1].name];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;	
				columns = ['Confidence Interval', '', '', 'Confidence Interval'];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;	
				columns = [this.series[2].userOptions.one, this.series[2].userOptions.two, '', this.series[2].userOptions.three, this.series[2].userOptions.four];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;	
				csv += lineDelimiter;
				columns = ['CDF', 'COORD', '', 'CDF', 'COORD'];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;	
			
				for(var i = 0; i < this.series[0].data.length; i++) {
					row = [this.series[0].data[i].x, this.series[0].data[i].y, '', this.series[1].data[i].x, this.series[1].data[i].y];
					csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
				}
			}
			
			/*
			* CSV EXPORTING: ChRM Directions (Foldtest Top)
			*/
			
			if(this.userOptions.chart.id == 'containerFoldLeft') {
				
				columns = ['sample', 'dec', 'inc'];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
				
				//Add all directions (first series)
				for(var i = 0; i < this.series[0].data.length; i++) {
				
					//Sample name, declination, inclination, rejected/accepted on one line
					row = [this.series[0].data[i].sample, this.series[0].data[i].x, this.series[0].data[i].inc, this.series[0].name];	
					csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				
				}
			}
			
			/*
			* CSV EXPORTING: Site means (Figure 2)
			*/
			
			if(this.userOptions.chart.id == 'mean') {
				//Export table means
				csv = ""; 
				var siteNames = $('#meanSel').val();
				if(siteNames != null) {
					module.IO.table(siteNames);
				}
				return false;
			}
			
			/*
			* CSV EXPORTING: CTMD heatmap for all permutations
			*/
			
			if(this.userOptions.chart.id == 'CTMD') {
			
				columns = ['', '', 'Type', 'Angle', 'Crit', 'Prob'];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
				
				for(var i = 0; i < this.series.length-1; i++) {
				
					csv += this.series[i].name + lineDelimiter;
					
					for(var j = 0; j < this.series[i].points.length; j++) {
					
						var p = this.series[i].points[j]
					
						row = [p.one + ' VS ' + p.two, '', p.type, p.G, p.gc, p.probability];
						csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
					
					}
					csv += lineDelimiter;
				}
			}
			
			
			/*
			* CSV EXPORTING: VGP Positions (Figure 1 RIGHT)
			*/
			
			if(this.userOptions.chart.id == 'VGP') {
				
				columns = ['Sample', 'Latitude', 'Longitude'];
				csv += '"' + columns.join(itemDelimiter) + '"' + lineDelimiter;
				
				//Add all directions (first 4 series)
				for(var k = 0; k <= 1; k++) {
					for(var i = 0; i < this.series[k].data.length; i++) {
				
						//Sample name, declination, inclination, rejected/accepted on one line
						row = [this.series[k].data[i].sample, this.series[k].data[i].inc, this.series[k].data[i].x, this.series[k].name];	
						csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				
					}
				}
	
				//Add mean direction to bottom of CSV file
				csv += lineDelimiter
				csv += 'Mean Latitude, Mean Longitude' + lineDelimiter;
				row = [this.series[2].data[0].inc, this.series[2].data[0].x]
				csv += '"' + row.join(itemDelimiter) + '"'; 
			
			}
			
			/*
			* CSV EXPORTING: TK03 (Inclination Shallowing)
			*/
			
			if(this.userOptions.chart.id == 'EIboot') {
			
				//Print the polynomial
				csv += 'TK03.GAD POLYNOMIAL';
				csv += lineDelimiter;
				row = ['Inclination', 'Elongation'];
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				
				for(var i = 0; i < this.series[0].data.length; i++) {
				
					row = [this.series[0].data[i].x, this.series[0].data[i].y];
					csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
					
				}
				
				csv += lineDelimiter;		
				
				//Print the bootstraps (in CSV format we are required to print row by row)
				//Headers
				csv +=  '"' + ['ORIGINAL', ' ', ' ', ' '].join(itemDelimiter) + '"';
	
				for(var i = 2; i < this.series.length; i++) {
					csv += '"' + ['BOOT' + i, ' ', ' ', ' '].join(itemDelimiter) + '"';
				}
				
				csv += lineDelimiter;
			
				for(var i = 1; i < this.series.length; i++) {
					csv += '"' + ['Latitude', 'Elongation', ' ', ' '].join(itemDelimiter) + '"';
				}
				
				csv += lineDelimiter;
				
				var j = 0;
				var max = 0;
				
				//Bootstraps may have different number of data points - find the maximum and iterate this many times to construct the CSV
				for(var i = 1; i < this.series.length; i++) {
					if(this.series[i].data.length > max) {
						max = this.series[i].data.length;
					}
				}
				
				//Print the inclination/elongation [x, y] data if it exists, otherwise print blanks
				for(var j = 0; j < max; j++) {
					for(var i = 2; i < this.series.length; i++) {
						if(this.series[i].data[j] != undefined) {
						var latitude = this.series[i].data[j].x;
						var elongation = this.series[i].data[j].y;
							csv += '"' + [latitude, elongation, ' ', ' '].join(itemDelimiter) + '"';
						} else {
							csv += '"' + [' ', ' ', ' ', ' '].join(itemDelimiter) + '"';
						}
					}
					csv += lineDelimiter;
				}
				
			}
			
			/*
			* CSV EXPORTING: Inclination Shallowing
			*/
	
			if(this.userOptions.chart.id == 'EICDF') {
	
				row = ['Inclination', 'CDF']
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
	
				for(var i = 0; i < this.series[0].data.length; i++) {
				
					row = [this.series[0].data[i].x, this.series[0].data[i].y];
					csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				}
				
				csv += lineDelimiter;
				csv += 'Original Inclination, ' + this.series[1].data[0].x;
				csv += lineDelimiter;
				csv += 'Unflattened Inclination, ' + this.series[2].data[0].x;
				csv += lineDelimiter;
				csv += 'Average Inclination, ' + this.series[3].data[0].x;
				csv += lineDelimiter;
				csv += 'Confidence Bounds' + ',' + this.series[4].userOptions.one + ',' + this.series[4].userOptions.two;
				csv += lineDelimiter;
				
			}
			
			/*
			* CSV EXPORTING: foldtest
			*/
			
			if(this.userOptions.chart.id == 'foldtest') {
	
				row = ['% UNTILT', 'CDF']
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				
				for(var i = 0; i < this.series[0].data.length; i++) {
					if(this.series[0].data[i] != undefined) { //Undefined check [Fixes #0002]
						row = [this.series[0].data[i].x, this.series[0].data[i].y];
						csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
					}
				}
				
				csv += lineDelimiter;
				
				row = ['% UNTILT', 'ORIGINAL'];
		
				for(var i = 1; i < this.series.length-4; i++) {
					row.push('BOOT ' + i);
				}
	
				csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
				
				for(var i = 0; i < this.series[2].data.length; i++) {
					
					next = [this.series[2].data[i].x];
					
					for(var j = 2; j < this.series.length-2; j++) {
						next.push(this.series[j].data[i].y)
					}
					
					csv += '"' + next.join(itemDelimiter) + '"' + lineDelimiter;
				}
				
			}
	
		//Return the formatted CSV
		return csv;
			
		};  
		
	}(Highcharts));
	
	// Now we want to add "Download CSV" to the exporting menu.
	// Code changed after https://github.com/highslide-software/export-csv
	// Original Author: Torstein Honsi
	// The module.IO.CSV routinet takes chart ID as input
	Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({
		text: 'Download CSV file',
		onclick: function () {
			module.IO.dlItem(this.getCSV(), this.userOptions.chart.id, 'csv');
		}
	});
});
