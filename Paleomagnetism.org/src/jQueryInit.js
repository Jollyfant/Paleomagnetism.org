/* PALEOMAGNETISM.ORG JQUERY INITIALIZATION
 * 
 * VERSION: ALPHA.1604
 * LAST UPDATED: 20/04/2016
 *
 * JavaScript file containing jQuery DOM elements to be initialized. These elements often link to functions found in main.js
 * This file includes many necessary jQuery UI definitions and handles the main interaction with the DOM (and may therefore be slightly spaghetti-ish..)
 *
 * This open-source application is licensed under the GNU General Public License v3.0 and may be used, modified, and shared freely
 */
 
/* FUNCTION jQueryInit
 * Description: initializes jQuery UI DOM elements. Function is called when application is launched.
 * Input: NULL 
 * Output: VOID (initializes all DOM elements)
 */
function jQueryInit(page) {

  // Site selector class
  $(".siteSelector").multiselect({
    'selectedText': "# sites selected",
    'minWidth': 250,
	'height': 'auto',
    'selectedList': 1,
    'noneSelectedText': "Select a site",
    'close': function() {
      $('#' + this.id).click(); 
    }
  });

  // Small initialization for magnetostratigraphy portal
  if(page === 'magstrat') {

    $(".downloadStratigraphy").button();
    $("#removeStratigraphy").button();

    $('#stratSel').multiselect({
      multiple: false,
    });

    $("#tabs").tabs();
    $("#addStratigraphy").button();

    $("#stratSel").click(function () {
      plotStrat();
    });

    return;

  }

  // Text areas for site directional data and APWPs
  $("#dropZone").linedtextarea();
  $("#APWPZone").linedtextarea();

  // Buttons
  $("#exportAllCsv").button({
    'icons': {'primary': "ui-icon-calculator"}
  });
  
  $("#confirmEdit").button({
    'icons': {'primary': "ui-icon-check"}
  });
  
  $("#editMeta").button({
    'icons': {'primary': "ui-icon-pencil"}
  });
  
  $("#contact").button({
    'icons': {'primary': "ui-icon-mail-closed"}
  });
  
  $("#importData").button({
    'icons': {'primary': "ui-icon-arrowthickstop-1-n"}
  });
  
  // Button to export all data
  $("#exportAll").button({
    'icons': {'primary': "ui-icon-image"}
  }).click(function () {
    module.IO.getSVG('exportAll');
  });
  
  $("#exportAllMean").button({
    'icons': {'primary': "ui-icon-image"}
  }).click(function () {
    module.IO.getSVG('exportAllMean');
  });
  
  // Buttons to initialize tests
  $("#EIInit, #ctmdInit, #requestAPWP, #foldtestInit").button({
    'icons': {'primary': "ui-icon-play"}
  });
  
  // Buttons for deleting
  $('.mapButtonColor, #clrStorage, #removeAPWP, #delete, #deleteInterpretation').button({
    'icons': {'primary': "ui-icon-trash"}
  });
    
  $("#showDir").button({
    'icons': {'primary': "ui-icon-circle-plus"}
  });
  
  $("#exportData, #downloadSelected").button({
    'icons': {'primary': "ui-icon-arrowthickstop-1-s"}
  });

  $("#confirm").button({
    'icons': {'primary': "ui-icon-circle-check"}
  });

  $("#addNewAPWP, #saveGroupButton").button({
    'icons': {'primary': "ui-icon-circle-plus"}
  });

  $("#extra, #simple, .bootstrapButtons").button({
    'icons': {'primary': "ui-icon-gear"}
  });
  
  $("#radio1, #mapRadio1, #EIRadio1, #CTMDRadio1").button({
    'icons': {'primary': "ui-icon-grip-dotted-horizontal"}
  });
  
  $("#CTMDVGPRadio1, #CTMDVGPRadio2").button({
    'icons': {'primary': "ui-icon-gear"}
  });
  
  $("#radio2, #mapRadio2, #EIRadio2, #CTMDRadio2").button({
    'icons': {'primary': "ui-icon-grip-dotted-vertical"}
  });
  
  // Prevent jQuery UI button from remaining in ui-active-hover
  // Do not include the multiselect widget; this breaks some formatting
  $("button:not(.ui-multiselect)").button().bind('mouseup', function() {
    $(this).blur();
  });
  
  // Multiselect widgets
  $('#metaSel').multiselect({
    'multiple': false, 
    'noneSelectedText': 'No sites in storage'
  });
  
  //Function to get interpreted sites from localstorage
  $('#interpretedSites').multiselect({
    'multiple': false, 
    'selectedList': 1,
    'noneSelectedText': 'No site selected',
    'close': function() {
      addInterpretations();
    }
  });  

  $('#plateNames').multiselect({
    'selectedText': "# plates selected",
    'minWidth': 220,
    'noneSelectedText': "No plates selected",
    'selectedList': 1,
  });
  
  $('#refFrame').multiselect({
    'noneSelectedText': "No reference frame selected",
    'minWidth': 220,
    'selectedList': 1,
  });
  
  $('#EISel').multiselect({
    'multiple': false,
  });
  
  $('#cutoffSelectorDirections').multiselect({
    'minWidth': 120,
    'multiple': false,
    'selectedList': 1,
    'close': function() {
      $("#dirSel").click();
    }
  });
  
  $('#cutoffSelector').multiselect({
    'minWidth': 120,
    'multiple': false,
    'selectedList': 1,
  });
      
  $('.ageNames').multiselect({
    'width': 100,
    'selectedText': "# sites selected",
    'noneSelectedText': "No age selected",
    'multiple': false, 
    'selectedList': 1,
    'height': 300,
  });
  
  /* INITIALIZE DIALOG WIDGETS
     * ------------------------------
   */  
  
  $("#editMetaDialog").dialog({
    'width': 300,  
    'min-height': 100,
    'draggable': false,
    'resizable': false,
    'autoOpen': false,
    'modal': true,
    'buttons': {
      'Cancel': function () {
        $(this).dialog("close");
      }
    }
  });
  
  $('#addAPWP, #input').dialog({
    'width': 600,
    'min-height': 100,
    'draggable': false,
    'resizable': false,
    'autoOpen': false,
    'modal': true,
    'buttons': {
      'Cancel': function () {
        $(this).dialog("close");
		module.options.editName = ""; 
      }
    }
  });

  //Could rewrite this to a simple prompt
  $('#addSiteGroup').dialog({
    'width': 300,
    'title': 'Add new site',
    'min-height': 100,
    'draggable': false,
    'resizable': false,
    'autoOpen': false,
    'modal': true,
    'buttons': {
      'Add': function() {
        if(addSiteCombination()) {
          setStorage();
          $(this).dialog("close");
        }
      },
      'Cancel': function() {
        $(this).dialog("close");
      }
    }
  });
  
  // Button sets
  $("#sampleFish").buttonset();
  $("#radio").buttonset();
  $("#mapRadio").buttonset();
  $("#EIRadio").buttonset();
  $("#CTMDRadio").buttonset();
  $("#CTMDVGPRadio").buttonset();
  $("#siteInfo").buttonset();  
  $("#radioConfDir").buttonset();  
  $("#radioConfMean").buttonset();  

  $('input[name="radioConfMean"][value="a95pole"]').prop('checked', true);
  $('input[name="radioConfDir"][value="a95pole"]').prop('checked', true);
  $('#radioConfMean, #radioConfDir').buttonset("refresh");
  
  // Click functions
  $("#deleteInterpretation").click(function() {
    removeInterpretations();
  });
  
  $("#dlBootstrapXYZ").button().click(function() {
    module.IO.getSVG("dlBootstrapXYZ");
  });
  
  $("#downloadSelected").click(function() {
    module.IO.downloadSelected();
  })
  $("#addNewAPWP").click(function() {
    $("#addAPWP").dialog("open");
  });
  
  // Update direction graph
  $(".updateDir").change(function() {
    $("#dirSel").click();
  });
  
  $("#colorFlag").change(function() {
    module.options.update.mean = true;
  });
  
  // Update mean graph
  $(".updateMean").change(function() {
    $("#meanSel").click();
  });
  
  // Update map module
  $("#mapRadio").change(function() {
    module.map.mapAddSites();
  });
  
  // Open edit metadata dialog
  $("#editMeta").click(function() {
    $("#editMetaDialog").dialog("open");
  });
  
  $("#sortByAge").button().click(function() {
    sortSiteSelector('age');
  });
  
  $("#sortByName").button().click(function() {
    sortSiteSelector('name');
  });
  
  $("#sortByBogo").button().click(function() {
    sortSiteSelector('bogo');
  });  
  
  function sortSiteSelector(type) {
    
    var capture = $(".siteSelector");
    capture.find('option').remove().end();
    
    var arr = new Array();
    for(var siteName in sites) {

      if(siteName === "TEMP") continue;

      if(type === 'age') {
        arr.push({'name': siteName, 'sort': Number(sites[siteName].userInput.metaData.age)});
      } else if (type === 'name') {
        arr.push({'name': siteName, 'sort': siteName});        
      } else if (type === 'bogo') {
        arr.push({'name': siteName, 'sort': Math.random()});
      }
    }
    
    if(type === 'name') {
      notify('success', 'Sites have been sorted alphabetically.')      
    } else if (type === 'age') {
      notify('success', 'Sites have been sorted by age.')      
    } else {
      notify('success', 'Sites have been sorted by something. Hopefully.')      
    }
    
    arr.sort(function(a, b){
      if(typeof a.sort === 'string' && typeof b.sort === 'string') {
        a.sort = a.sort.toLowerCase();
        b.sort = b.sort.toLowerCase();
      }
      return a.sort > b.sort ? 1 : (a.sort < b.sort ? -1 : 0);
    });
    
    // Refresh the sorted specimen scroller
    for(var i = 0; i < arr.length; i++) {
      capture.append("<option value=\"" + arr[i].name + "\">" + arr[i].name + "</option>");
    }
    capture.multiselect('refresh');

  }
  
  // Call export all function
  $("#exportHighlight").click(function() {
    $("#exportData").click();
  });
  
  $("#addKMLButton").button();
  
  //Preset ages and function to call the parseAgeName function for specified ages
  $(".ageNames").change(function() {
    changeAge(this.id);
  });
  
  // Clears local storage and reloads page (resets application)
  $('#clrStorage').click( function () {
    if(confirm("Are you sure you wish to delete this instance and reset the application?")){
      localStorage.removeItem('pMag');
      location.reload(); 
    }
  });
  
  // Select menu to update info in +Add APWP window
  $("#APWPCoordinates").selectmenu({
    'width': '200',
    'change': function() {
      var value = $(this).val();
      if(value === 'euler') {
        var text = '<b> Euler Poles: </b>Latitude, Longitude, Rotation, Age';
      } else {
        var text = '<b> APWP: </b>Latitude, Longitude, A95, Age';
      }
      $("#APWPInputInfo").html(text)
    }
  });


  // Adds selected number of bootstraps to spinner
  $('.bootstrapButtons').click(function() {
    $("#spinner").spinner("value", $(this).attr("val"));
  })
  
  // Calls CSV exporting function that saves the site instance to the .pmag format
  $('#exportData').click(function() {
    module.IO.exporting();
  });

  // Reprocess the direction tab if the cutoff flag changes.
  $("#cutoffFlag").change(function() { 
    module.options.update.dir = true;
  });
  
  //If the projection flag is checked we need to update all spherical projections on first tab load
  $("#projFlag").change(function() {
    module.options.update.dir = true;
    module.options.update.mean = true;
    module.options.update.foldtest = true;
  });

  //SITE SELECTOR: Geomagnetic Directions
  $("#dirSel").click( function () {
    showGeomagneticDirections();
  });
  
  // Description: Saves a new combination of sites as a new site
  $("#saveGroupButton").click(function() {
    $("#addSiteGroup").dialog("open");
  });
    
  //Handle foldtest initialization
  $('#foldtestInit').click (function() {
    module.foldtest.initialize();
  })
  
  //Match the visible div element to the site input type      
  $('#siteType').selectmenu({
    'width': 250,
    'change': function(ui, event) {

      $('div.box').hide();
      $('div.box.' + $(this).val()).show();

      if(event.item.value === 'dir' || event.item.value === 'int') {
        $("#inputOptions").show();
      } else {
        $("#inputOptions").hide();
      }

    }
  });

  //Open the data input dialog box    
  $('#add').click(function() {
    module.options.editing = false;
    $('#siteInfo').change();
    $('div.box.' + $('#siteType').val()).show()
    if($('#siteType').val() === 'dir' || $('#siteType').val() === 'int') {
      $("#inputOptions").show();
    } else {
      $("#inputOptions").hide();
    }
    $("#input").dialog("open");
  });
  
  // Calls processing on site
  $('#confirm').click(function() {
    if($("#siteName").val() === module.options.editName) {
      if(!confirm('This action will overwrite the original site data.')) {
        return;
      }
      addSite(module.options.editName);
    } else {    
      addSite();
    }
    updateSiteSelector();
  });

  $('#saveUnflat').click( function () {
    module.EI.saveUnflattened();
  });

  //BUTTON: "Delete Selected Sites"
  $('#delete').click( function() {
    removeSite();
  });
  
  //Repositions dialog boxes on window resize. Fixes [#0010] 
  $(window).resize(function() {
    $(".dialog").dialog("option", "position", {'my': "center", 'at': "center", 'of': window});
  });
  
  //Handling for removing an APWP
  $("#removeAPWP").click(function() {
    removeAPWP();
  });
  
  //Handling for adding an APWP
  $("#confirmAPWP").click(function() {
    addAPWP();
  });
  
  //Data Input simple/advanced options toggle
  $('#siteInfo').change(function() {
    var options = $("#siteInfo :radio:checked + label").text();
    if(options === 'Simple Options') {
      $('#adv').hide();
    } else {
      $('#adv').show();
    }
  });
  
  $("#progressbar").progressbar({'value': 0});
  $("#EIBar").progressbar({'value': 0});
  $("#CTMDBar").progressbar({'value': 0});
  
  $("#unfoldingPercentage").slider({
    'range': true,
    'min': -50,
    'max': 150,
    'step': 10,
    'values': [-50, 150],
    'slide': function(event, ui) {
      $("#unfoldingPercentageRange").html("Unfolding Range: " + ui.values[0] + " to " + ui.values[1] + "%");
    }
  });
  
  $("#ageRange").slider({
    'range': true,
    'min': 0,
    'max': 320,
    'step': 10,
    'values': [0, 320],
    'slide': function(event, ui) {
      $("#ageRangeText").html("Age: " + ui.values[0] + " to " + ui.values[1] + " Ma");
    }
  });
  
  $("#ageRange").slider({
    'range': true,
    'min': 0,
    'max': 600,
    'step': 1,
    'values': [0, 600],
    'slide': function(event, ui) {
      if(event.shiftKey) {
        $("#ageRange").slider("option", "step", 10);
      } else {
        $("#ageRange").slider("option", "step", 1);
      }
      $("#ageRangeDisplay").html(ui.values[0] + " to " + ui.values[1] + " Ma");
    },
    'stop': function (event, ui) {
      module.map.mapAddSites();
    }
    });
  
  $("#metaSel").click (function() {
        
    // Open the input dialog
    $("#editInfo").html("");
    
    // Get selected site
    var siteName = $("#metaSel").val();
    if(siteName === null) {
      $("#editMetaContent").hide();
      return;
    }

    module.options.editing = true;
    $("#input").dialog("open");
    
    //Parse the current metadata to the input boxes
    var metaData = sites[siteName].userInput.metaData; 
    var siteName = metaData.name;
    
    module.options.editName = metaData.name;
    
    $("#siteLat").val(metaData.latitude);
    $("#siteLng").val(metaData.longitude);
    $("#siteAge").val(metaData.age);
    $("#siteBoundMin").val(metaData.minAge);
    $("#siteBoundMax").val(metaData.maxAge);
    $("#authorID").val(metaData.author);
    $("#siteDesc").val(metaData.description || "");
    $("#siteName").val(siteName);
    
    $("#cutoffSelector").val(metaData.cutoff || "45");
    $("#cutoffSelector").multiselect("refresh");
    
    $("#siteType").val('dir');
    $('#siteType').selectmenu("refresh");
    $('div.box').hide();
    $('div.box.dir').show();

    // Create data string to put in the data input window      
    var string = "";
    for(var i = 0; i < sites[siteName].userInput.data.length; i++) {
      for(var j = 0; j < sites[siteName].userInput.data[i].length; j++) {
        if(j !== 0) {
          string += ", ";
        }
        string += sites[siteName].userInput.data[i][j];
      }
      string += "\n";
    }
    
    $("#dropZone").val(string);
    
    if($('#siteType').val() === 'dir' || $('#siteType').val() === 'int') {
      $("#inputOptions").show();
    } else {
      $("#inputOptions").hide();
    }

  });

  $("#spinner").spinner();

  // Reflow the highcharts graphs every time a tab is loaded
  // This prevents resizing issues
  $("#poleTabs").tabs({
    'activate': function(event, ui) {
      if(ui.newPanel.selector === '#palatTab') {
        $("#palatContainer").highcharts().reflow();
      } else if (ui.newPanel.selector === '#decTab') {
        $("#decContainer").highcharts().reflow();
      } else if (ui.newPanel.selector === '#incTab') {
        $("#incContainer").highcharts().reflow();
      } else if (ui.newPanel.selector === '#mapTab') {
        $("#polePath").highcharts().reflow();
      }
    }
  });
  
  //Tab definition for the main tabs on the statistics portal
  $("#tabs").tabs({
    'activate': function(event, ui) {
      if(ui.newPanel.selector === '#tabs-4') {
        // Initialize the map when the tab is opened for the first time
        if(!module.map.mapInit) {
          module.map.initialize(); //Initialize map        
          module.map.map.setCenter({lat: 35, lng: 35});
          module.map.mapInit = true;
        }
        // On tab load resize the map (otherwise we get tiling issues) Fixes [#0004]
        google.maps.event.trigger(module.map.map, "resize");
        module.map.mapAddSites();
      }
      if(ui.newPanel.selector === '#directionTab') {
        if(module.options.update.dir) {
          $("#dirSel").click();
          module.options.update.dir = false;
        }
      } else if(ui.newPanel.selector === '#tabs-3') {
        if(module.options.update.mean) {
          $("#meanSel").click();
          module.options.update.mean = false;
        }
      } else if(ui.newPanel.selector === '#tabs-6') {
        module.options.update.foldtest = false;
        if(module.options.update.foldtest) {
          foldtestProjections();
        }
        if($('#container5').highcharts() !== undefined) {
          $('#container5').highcharts().reflow();
        }
      }
    }
  }).css({
    'overflow': 'auto'
  });
  
  //SITE SELECTOR: Mean Directions
  $('#meanSel').click(function() {
    showMeanDirections();
  });

  //See apwp.js for this function
  $('#requestAPWP').click(function () {
    getExpectedLocation();
  });    
  
  // Wally was here (.. but only sometimes!)
  if(Math.random() < 0.01){
    $("#wld").html("<img id='waldo' src='images/waldo.png' title='..!'>")
    $("#waldo").hover(function() {
      $("#waldo").fadeOut('slow').html("");
    });
  }
}
