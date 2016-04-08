/*
 * FUNCTION dlItem
 * Description: creates BLOB that can be downloaded
 * Input: string@string (usually .csv formatted) and extension@string (e.g. .csv, or .dir)
 * Output: VOID
 */
function dlItem (string, extension) {
	
  // Check if supported
  var downloadAttrSupported = document.createElement('a').download !== undefined;
	
  var blob = new Blob([string], {'type': 'data:text/csv;charset=utf-8'});
  var csvUrl = URL.createObjectURL(blob);
  var name = 'export';

  // Download attribute supported
  if (downloadAttrSupported) {
    var a = document.createElement('a');
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

/* 
 * FUNCTION exporting
 * Description: handles exporting for custom Paleomagnetism.org .dir format
 * Input: NULL
 * Output: VOID (calls dlItem for downloading JSON formatted data object)
 */
function exporting() {

  if(data === null) {
    notify('failure', 'There are no data for exporting.');
    return;
  }

  var downloadingData = data.map(function (x) {
    return $.extend({
      'version': version,
      'exported': new Date()
    }, x);
  })

  // Try to parse our data JSON object to a string and download it to a custom .dir file
  try {
    dlItem(JSON.stringify(downloadingData), 'dir');
  } catch (err) {
    notify('failure', 'A critical error has occured when exporting the data: ' + err);
  }

}

/*
 * FUNCTION getZijderveldCSV
 * Description: constructs CSV format for Zijderveld diagram
 * Input: self@object (Highcharts chart obj)
 * Output: returns formatted CSV string
 */
function getZijderveldCSV(self) {

  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
		
  var row = ['Step', 'x', 'y', 'z'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
	
  for(var j = 0; j < self.series[0].data.length; j++) {
    row = [self.series[0].data[j].step, self.series[0].data[j].x, self.series[0].data[j].y, self.series[1].data[j].y];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
  }

  return csv;

}

function getEqualAreaProjectionCSV(self) {

  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  var row = [ 'Step', 'Inclination', 'Declination' ];	
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
	
  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].step, self.series[0].data[i].x, self.series[0].data[i].inc];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
  }

  return csv;

}

/*
 * FUNCTION getZijderveldCSV
 * Description: constructs CSV format for hemisphere projection in interpretation tab
 * Input: self@object (Highcharts chart obj)
 * Output: returns formatted CSV string
 */
function getEqualAreaInterpretationCSV(self) {
	
  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  csv += self.userOptions.chart.coordinates;
  csv += lineDelimiter + lineDelimiter;	
	
  var row = ['Specimen', 'Declination', 'Inclination', 'Type', 'Information'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].options.sample, self.series[0].data[i].x, self.series[0].data[i].options.inc, 'Direction', self.series[0].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }
	
  for(var i = 0; i < self.series[1].userOptions.poles.length; i++) {
    row = [self.series[0].data[i].options.sample, self.series[1].userOptions.poles[i].dec, self.series[1].userOptions.poles[i].inc, 'Negative Pole to Plane', self.series[0].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }
	
  csv += lineDelimiter;	 
	
  row = ['Mean Declination', 'Mean Inclination', '(Directions Only)'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
	
  row = [self.series[3].data[0].x, self.series[3].data[0].options.inc];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

  return csv;

}

function getIntensityCSV(self) {

  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  var row = [ 'Step', 'Intensity', self.series[0].name ];	
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	

  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].category, self.series[0].data[i].y];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
  }
			
  return csv;

}

function getEqualAreaFittedCSV(self) {
	
  var itemDelimiter = '","';
  var lineDelimiter = '\n';
  var csv = "";
	
  csv += self.userOptions.chart.coordinates;
  csv += lineDelimiter + lineDelimiter;	
	
  var row = ['Specimen', 'Declination', 'Inclination', 'Type', 'Information'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;	
	
  for(var i = 0; i < self.series[0].data.length; i++) {
    row = [self.series[0].data[i].options.sample, self.series[0].data[i].x, self.series[0].data[i].inc, 'Direction', self.series[0].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }	
	
  for(var i = 0; i < self.series[1].data.length; i++) {
    row = [self.series[1].data[i].options.sample, self.series[1].data[i].x, self.series[1].data[i].inc, 'Fitted Direction', self.series[1].data[i].info];
    csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;		
  }	
	
  csv += lineDelimiter;	 
  row = ['Mean Declination', 'Mean Inclination', '(Great Circles Fitted)'];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;

  row = [self.series[4].data[0].x, self.series[4].data[0].options.inc];
  csv += '"' + row.join(itemDelimiter) + '"' + lineDelimiter;
			
  return csv;

}

/* FUNCTION getCSV
 * Description: custom function to parse Highcharts data to csv format on exporting
 *   has a custom function for each graph
 * Input: triggered by clicking export CSV -> passes chart ID
 * Output: CSV formatted variable that can be downloaded through dlItem routine
 */
(function (Highcharts) {

  var downloadAttrSupported = document.createElement('a').download !== undefined;
		
  var itemDelimiter = '","';
  var lineDelimiter = '\n';

  //Add a prototype function
  Highcharts.Chart.prototype.getCSV = function () {

    var csv;
		 
    // Zijderveld Diagram
    if(this.userOptions.chart.id === 'Zijderveld') {
      var csv = getZijderveldCSV(this);
    } else if(this.userOptions.chart.id === 'eqAreaInterpretations') {
      var csv = getEqualAreaInterpretationCSV(this);
    } else if(this.userOptions.chart.id === 'eqAreaProjDir') {
      var csv = getEqualAreaProjectionCSV(this);
    } else if(this.userOptions.chart.id === 'intensity') {
      var csv = getIntensityCSV(this);
    } else if(this.userOptions.chart.id == 'eqAreaFitted') {
      var csv = getEqualAreaFittedCSV(this);
    } else {
      var csv = "";
    }
		 
    return csv;
		
  };  
	
}(Highcharts));

// Now we want to add "Download CSV" to the exporting menu.
// Code changed after https://github.com/highslide-software/export-csv
// Original Author: Torstein Honsi (Highcharts)
Highcharts.getOptions().exporting.buttons.contextButton.menuItems.push({
  'text': 'Download CSV file',
  'onclick': function () {
    //Parse and download the formatted CSV
    var csv = this.getCSV(); 
    dlItem(csv, 'csv');
  }
});
