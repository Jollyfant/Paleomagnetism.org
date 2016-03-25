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
