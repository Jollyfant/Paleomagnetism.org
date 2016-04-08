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
    var coordinateInformation = '(Specimen)';
  } else {
    var coordinateInformation = '(Geographic)';
  }
	
  // Data buckets for inclination/declination lines
  var decDat = new Array();
  var incDat = new Array();
	
  // Parameters to scale axes (min, max)
  var graphScale = new Array();	
	
  // Loop over all points and do rotations if requested (e.g. Specimen, Geographic, or Tectonic coordinates in N/Up or W/Up projection)
  for(var i = 0; i < samples.data.length; i++) {

    if(samples.data[i].visible) {
			
      // Rotate to geographic coordinates
      var direction = rotateTo(coreBedding, coreDip, [samples.data[i].x, samples.data[i].y, samples.data[i].z]);

      // Rotate to tectonic coordinates if requested and not viewing in specimen coordinates
      if(tcFlag && !specFlag) {
        var coordinateInformation = '(Tectonic)';
        var direction = correctBedding(beddingStrike, beddingDip, direction);
      }

      // Check the projection flag, if we wish to show Up/North subtract 90 from the declination
      // x and y axes are swapped in Highcharts (to our Cartesian definition [see core.cart])
      if(nFlag) {
        var carts = new cart(direction.dec - 90, direction.inc, direction.R);
        var projectionInformation = 'Up/North';	
      } else {
        var carts = new cart(direction.dec, direction.inc, direction.R);	
        var projectionInformation = 'Up/West';				
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

  //Obtain the maximum and minimum values which will be used as the graph boundaries
  //The Zijderveld diagram will always be a square
  var graphScale = Math.max.apply(Math, graphScale);

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

  $("#intensityPlot").show();
  new Highcharts.Chart(chartOptions);

}
