/* PALEOMAGNETISM.ORG INTERPRETATION PORTAL [GRAPHING MODULE]
 * 
 * VERSION: ALPHA.1604
 * LAST UPDATED: 04/07/2016
 *
 * Description: Graphing module for the interpretation portal. Powered by Highcharts.
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */

"use strict";

/*
 * function generateZijderveldTooltip
 * Description: generates the tooltip used in the Zijderveld diagram
 */
function generateZijderveldTooltip(self) {

  return [
    '<b>Demagnetization Step: </b>' + self.point.step,
    '<b>Declination: </b>' + self.point.dec.toFixed(1),
    '<b>Inclination: </b>' + self.point.inc.toFixed(1),
    '<b>Intensity: </b>' + self.point.intensity.toFixed(2) + 'µA/m'
  ].join("<br>");

}

/*
 * FUNCTION zijderveld
 * Description: handles graphing for zijderveld plot
 * Input: samples (sample[sampleIndex])
 * Output: VOID (plots zijderveld graph)
 */
function plotZijderveldDiagram() {

  var samples = data[getSampleIndex()];
	
  //Specimen metadata (core and bedding orientations)
  var coreBedding = samples.coreAzi;
  var coreDip = samples.coreDip - 90;
  var beddingStrike = samples.bedStrike;
  var beddingDip = samples.bedDip;
	
  // Get the flag options
  var nFlag = $('#nFlag').prop('checked');
  var tcFlag = $('#tcViewFlag').prop('checked');
  var enableLabels = $('#labelFlag').prop('checked');
  var specFlag = $('#specFlag').prop('checked');
  var tickFlag = $('#tickFlag').prop('checked');

  // Check if user wants to view in specimen coordinates, put the core bedding to 0 and core azimuth to 90;
  if(specFlag) {
    var coreBedding = 0;
    var coreDip = 0;
    var coordinateInformation = 'Specimen Coordinates';
  } else {
    var coordinateInformation = 'Geographic Coordinates';
  }
	
  // Data buckets for inclination/declination lines
  var decDat = new Array();
  var incDat = new Array();
	
  // Parameters to scale axes (min, max)
  var graphScale = new Array();	
	
  // Loop over all points and do rotations if required
  for(var i = 0; i < samples.data.length; i++) {

    if(samples.data[i].visible) {
			
      // Rotate to geographic coordinates
      var direction = rotateTo(coreBedding, coreDip, [samples.data[i].x, samples.data[i].y, samples.data[i].z]);

      // Rotate to tectonic coordinates if requested and not viewing in specimen coordinates
      if(tcFlag && !specFlag) {
        var coordinateInformation = 'Tectonic Coordinates';
        var direction = correctBedding(beddingStrike, beddingDip, direction);
      }

      // Check the projection flag, if we wish to show Up/North subtract 90 from the declination
      // x and y axes are swapped in Highcharts (to our Cartesian definition [see core.cart])
      if(nFlag) {
        var carts = cart(direction.dec - 90, direction.inc, direction.R);
        var projectionInformation = 'Up/North';	
      } else {
        var carts = cart(direction.dec, direction.inc, direction.R);	
        var projectionInformation = 'Up/West';				
      }
 
      // Don't call projection what it is
	  if(specFlag) {
        if(nFlag) {
		  var projectionInformation = '-z/x';
        } else {
		  var projectionInformation = '-z/-y';	
		}			
	  }
	  
      // Horizontal projection is in the x, y plane
      decDat.push({
        'x': carts.x, 
        'y': carts.y, 
        'dec': direction.dec,
        'inc': direction.inc,
        'intensity': direction.R,
        'step': samples.data[i].step
      });

      // Vertical projection is in the x, z plane
      // the vertical axis is reversed
      incDat.push({
        'x': carts.x, 
        'y': carts.z,
        'dec': direction.dec,
        'inc': direction.inc,
        'intensity': direction.R,
        'step': samples.data[i].step
      });

      //Push the values for x and (y, z) to arrays. At the end we determine the maximum/minimum from these arrays. 
      graphScale.push(Math.abs(carts.x), Math.abs(carts.y), Math.abs(carts.z));
      
    }
  }

  // Obtain the maximum and minimum values which will be used as the graph boundaries
  // The Zijderveld diagram will always be a square (add one so all points fall in chart)
  var graphScale = Math.max.apply(Math, graphScale) + 1;
 
  var chartOptions = {
    'chart': {
    'animation': false,
    'zoomType': 'xy',
    'id': 'Zijderveld',
    'renderTo': 'zijderveldPlot',
    'events': {
      'load': function () {
        if (this.options.chart.forExport) {
          for(var i = 0; i < this.series[0].data.length; i++) {
            this.series[2].data[i].update({'marker': {'radius': 2}}, false);
            this.series[3].data[i].update({'marker': {'radius': 2}}, false);
          }
        }
        this.redraw();
      }
    }
  },
  'exporting': {
    'filename': 'Zijderveld',
    'sourceWidth': 600,
    'sourceHeight': 600,
    'buttons': {
      'contextButton': {
        'symbolStroke': '#7798BF',
        'align': 'right'
      }
    }
  },
  'title': {
    'text': 'Zijderveld Diagram (' + samples.name + ')'
  },
  'tooltip': {
    'useHTML': true,
      'formatter': function () {
        return generateZijderveldTooltip(this);
      }
    },
    'subtitle': {
      'text': '<b>' + coordinateInformation + '</b><br>' + projectionInformation
    },
    'xAxis': {
      'gridLineWidth': 0,
      'lineColor': 'black',
      'crossing': 0,
      'min': -graphScale,
      'max': graphScale,
      'gridLineWidth': 0,
      'tickWidth': tickFlag ? 1 : 0,
      'lineWidth': 1,
      'opposite': true,
      'title': {
        'enabled': false
      },
      'labels': {
        'enabled': tickFlag,
        'formatter': function () {
          if(this.value === 0) return '';
          else return this.value;
        }
      }
    },
    'yAxis': {
      'reversed': true,
      'min': -graphScale,
      'max': graphScale,
      'gridLineWidth': 0,
      'lineWidth': 1,
      'tickWidth': tickFlag ? 1 : 0,
      'minRange': 10,
      'lineColor': 'black',
      'crossing': 0,
      'title': {
        'enabled': false
      },
      'labels': {
        'enabled': tickFlag,
        'formatter': function () {
          if(this.value === 0) return '';
          else return this.value;
        }
      }
    },
    'plotOptions': {
      'series': {
        'animation': false,
        'dataLabels': {
          'color': 'grey',
          'enabled': enableLabels,
          'style': {
            'fontSize': '10px'
          },
          'formatter': function () {
            return this.point.step;
          }
        }
      },
      'line': {
        'lineWidth': 1,
      }
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (Zijderveld Diagram)",
      'href': ''
    },
    'series': [{
      'type': 'line',
      'linkedTo': 'horizontal',
      'enableMouseTracking': false,
      'data': decDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'enabled': false
      }
    }, {
      'type': 'scatter',
      'id': 'horizontal',
      'name': 'Horizontal Projection', 
      'data': decDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'lineWidth': 1,
        'symbol': 'circle',
        'radius': 2,
	'lineColor': 'rgb(119, 152, 191)',
	'fillColor': 'rgb(119, 152, 191)'
      }
    }, {
      'name': 'Vertical Projection',
      'type': 'line',
      'linkedTo': 'vertical',
      'enableMouseTracking': false,
      'data': incDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'enabled': false
      }
    }, {
      'type': 'scatter',
      'id': 'vertical',
      'name': 'Vertical Projection',
      'data': incDat,
      'color': 'rgb(119, 152, 191)',
      'marker': {
        'symbol': 'circle',
        'lineWidth': 1,
        'radius': 2,
        'lineColor': 'rgb(119, 152, 191)',
        'fillColor': 'white'
      }
    }]
  }

  new Highcharts.Chart(chartOptions);

}


/* FUNCTION intensity
 * Description: handles graphic for intensity plot
 * Input: sample index
 * Output: VOID (plots intensity)
 */
function plotIntensityDiagram() {

  var sample = data[getSampleIndex()];

  var intensities = new Array();
  var RES = new Array();

  for(var i = 0; i < sample.data.length; i++) {

    var step = sample.data[i];

    // On show steps that are visible
    //Remove mT, μT or whatever from step - just take a number (regex)
    if(step.visible) {

      var treatmentStep = step.step.replace(/[^0-9.]/g, "");
      var R = vectorLength(step.x, step.y, step.z);

      intensities.push(R);
      RES.push({
        'x': Number(treatmentStep), 
        'y': R
      });

    }

  }

  // Get the unblocking spectrum (UBS) and vector difference sum (VDS)
  var UBS = getUBS(RES);
  var VDS = getVDS(RES);

  // Normalize the intensities to the maximum resultant intensity
  // if requested
  var normalizationFactor = Math.max.apply(null, intensities);
  if($('#normalizeFlag').prop('checked')) {
    RES = RES.map(function(x) {
      x.y = x.y / normalizationFactor
      return x;
    });
    VDS = VDS.map(function(x) {
      x.y = x.y / normalizationFactor
      return x;
    });	
    UBS = UBS.map(function(x) {
      x.y = x.y / normalizationFactor
      return x;			
    });
  }
	
  var plotSeries = [{
    'name': 'Resultant Intensity',
    'data': RES,
    'zIndex': 10
  }, {
    'name': 'Vector Difference Sum',
    'data': VDS,
    'marker': {
      'symbol': 'circle'
    },
    'zIndex': 10
  }, {
    'type': 'area',
    'step': true,
    'pointWidth': 50,
    'name': 'Unblocking Spectrum',
    'data': UBS,
    'zIndex': 0
  }];

  createIntensityDiagram(sample, plotSeries);
 
}

/*
 * function createIntensityDiagram
 * Description: handles graphic for intensity plot
 * Input: sample index
 * Output: VOID (plots intensity)
 */
function createIntensityDiagram(sample, series) {

  var chartOptions = {
    'chart': {
      'animation': false,
      'zoomType': 'xy',
      'renderTo': 'intensityPlot',
      'id': 'intensity',
      'events': {
        'load': function () {
          if (this.options.chart.forExport) {
            for(var i = 0; i < this.series[0].data.length; i++) {
              this.series[0].data[i].update({marker: {radius: 4}}, false);
            }
          }
          this.redraw();
        }
      }
    },
    'exporting': {
      'filename': 'Intensity',
      'sourceWidth': 1000,
      'sourceHeight': 600,
      'buttons': {
        'contextButton': {
          'symbolStroke': '#7798BF',
          'align': 'right'
        }
      }
    },
    'title': {
      'text': 'Intensity Diagram (' + sample.name + ')'
    },
    'yAxis': {
      'title': {
        'text': 'Intensity (μA/m)'
      }	
    },
    'tooltip': {
      'formatter': function () {
        return '<b>Demagnetization Step: </b>' + this.x + '<br> <b>Intensity </b>' + this.y.toFixed(2)
      }
    },
    'xAxis': {
      'title': {
        'text': 'Demagnetization steps'
      }
    },
    'legend': {
      'itemMarginTop': 20,
      'layout': 'vertical',
      'align': 'right',
      'verticalAlign': 'middle',
      'borderWidth': 0
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (Intensity Diagram)",
      'href': ''
    },
    'plotOptions': { 
      'series' : {
        'animation': false,
      }
    },
    'series': series
  }

  new Highcharts.Chart(chartOptions);

}

/* 
 * FUNCTION eqAreaProjection
 * Description: Handles plotting for equal area projection
 * Input: sample index
 * Output: VOID (plots chart)
 */
function eqAreaProjection() {

  var sample = data[getSampleIndex()];

  //Get the bedding and core parameters from the sample object
  var coreAzi = sample.coreAzi;
  var coreDip = sample.coreDip;
  var beddingStrike = sample.bedStrike;
  var beddingDip = sample.bedDip;
	
  // Get the Boolean flags for the graph
  var enableLabels = $('#labelFlag').prop('checked');
  var tcFlag = $('#tcViewFlag').prop('checked');
  var specFlag = $('#specFlag').prop('checked');

  var information;

  // Check if user wants to view in specimen coordinates
  // put the core azimuth to 0 and core plunge to 90;
  if(specFlag) {
    var coreAzi = 0;
    var coreDip = 90;
    information = 'Specimen Coordinates';
  } else {
    information = 'Geographic Coordinates';
  }
	
  // Format a Highcharts data bucket for samples that are visible
  var dataSeries = new Array();
  for(var i = 0; i < sample.data.length; i++) {
    if(sample.data[i].visible) {
			
      //Rotate samples to geographic coordinates using the core orientation parameters
      var direction = rotateTo(coreAzi, coreDip - 90, [sample.data[i].x, sample.data[i].y, sample.data[i].z]);
			
      // If a tilt correction is requested, rotate again
      // Only do this if NOT viewing in specimen coordinates
      if(tcFlag && !specFlag) {
        information = 'Tectonic Coordinates';
        var direction = correctBedding(beddingStrike, beddingDip, direction);
      }
	
      dataSeries.push({
        'x': direction.dec, 
        'y': eqArea(direction.inc), 
        'inc': direction.inc, 
        'step': sample.data[i].step,
        'marker': { 
          'fillColor': direction.inc < 0 ? 'white' : 'rgb(119, 152, 191)', 
          'lineWidth': 1, 
          'lineColor': 'rgb(119, 152, 191)' 
        }
      });
    }
  }
	
  // Prevent making a connection between first - last data point
  dataSeries.push(null);
	
  var chartOptions = {
    'chart': {
      'backgroundColor': 'rgba(255, 255, 255, 0)',
      'id': 'eqAreaProjDir',
      'polar': true,
      'animation': false,
      'renderTo': 'eqAreaDirections',
      'events': {
        'load': function () {
          if (this.options.chart.forExport) {
            for(var i = 0; i < this.series[0].data.length; i++) {
              this.series[0].data[i].update({
                'marker': {
                  'radius': 4,
                  'lineWidth': 1,
                  'lineColor': 'rgb(119, 152, 191)',
                  'fillColor': this.series[0].data[i].inc < 0 ? 'white' : 'rgb(119, 152, 191)'
                }
              }, false);
            }
          }
          this.redraw();
        }
      }
    },
    'exporting': {
      'filename': 'Equal Area Projection',
      'sourceWidth': 600,
      'sourceHeight': 600,
      'buttons': {
        'contextButton': {
          'symbolStroke': '#7798BF',
          'align': 'right'
        }
      }
    },
    'title': {
      'text': 'Equal Area Projection (' + sample.name + ')'
    },
    'subtitle': {
      'text': '<b>' + information + '</b>'
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
    'tooltip': {
      'formatter': function () {
        if(this.series.name == 'Directions') {
          return '<b> Demagnetization step: </b>' + this.point.step + '<br> <b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination </b>' + this.point.inc.toFixed(1)
        }
        return '<b>Name: </b> ' + this.point.name + '<br><b>Declination: </b>' + this.x.toFixed(1) + '<br> <b>Inclination: </b>' + this.point.inc.toFixed(1)
      }
    },
    'credits': {
      'enabled': true,
      'text': "Paleomagnetism.org (Equal Area Projection)",
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
			if(information !== 'Specimen Coordinates') {
				return this.value + '\u00B0';
		  	 } else {
				return ["x", "y", "-x", "-y"][this.value / 90 | 0];
			}
        }
      }
    },
    'plotOptions': {
      'line': {
        'lineWidth': 1,
        'color': 'rgb(119, 152, 191)'
      },
      'series': {
        'animation': false,
        'dataLabels': {
          'color': 'grey',
          'style': {
            'fontSize': '10px'
          },
          'enabled': enableLabels,
          'formatter': function () {
               return this.point.step;
          }
        }
      }
    },
    'series': [{
      'name': 'Directions',
      'id': 'Directions',
      'type': 'scatter',
      'zIndex': 100,
      'data': dataSeries
    }, {
      'name': 'Directions',
      'enableMouseTracking': false,
      'marker': {
        'enabled': false
      },
      'linkedTo': 'Directions',
      'type': 'line', 
      'data': dataSeries		
    }],
  }

  var chart = new Highcharts.Chart(chartOptions);

  // Add all stickies
  if(globalSticky.length !== 0) {
    chart.addSeries({
      'color': 'gold',
      'type': 'scatter', 
      'name': 'Sticky', 
      'data': globalSticky,
      'marker': {
        'radius': 8,
        'symbol': 'diamond'
      }
    });
  }

}
