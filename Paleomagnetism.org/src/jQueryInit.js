/* PALEOMAGNETISM.ORG JQUERY INITIALIZATION
 * 
 * VERSION: ALPHA.1507
 * LAST UPDATED: 7/24/2015
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
function jQueryInit () {

	/* INITIALIZE LINED TEXT AREAS
     * ---------------------------
	 */	 
	 
	$("#dropZone").linedtextarea();
	$("#APWPZone").linedtextarea();

	/* INITIALIZE BUTTON WIDGETS
     * -------------------------
	 */	 
	$("#exportAllCsv").button({
		icons: { primary: "ui-icon-calculator"}
	});
	
	$("#confirmEdit").button({
		icons: { primary: "ui-icon-check"}
	});
	
	$("#editMeta").button({
		icons: { primary: "ui-icon-pencil"}
	});
	
	$("#contact").button({
		icons: { primary: "ui-icon-mail-closed"}
	});
	
	$("#importData").button({
		icons: { primary: "ui-icon-arrowthickstop-1-n"}
	});
	
	$("#exportAll").button({
		icons: { primary: "ui-icon-image"}
	}).click( function () {
		module.IO.getSVG('exportAll');
	});
	
	$("#exportAllMean").button({
		icons: { primary: "ui-icon-image"}
	}).click( function () {
		module.IO.getSVG('exportAllMean');
	});
	
	$("#EIInit, #ctmdInit, #requestAPWP, #foldtestInit").button({
		icons: { primary: "ui-icon-play"}
	});
	
	$('.mapButtonColor, #clrStorage, #removeAPWP, #delete, #deleteInterpretation').button({
		icons: { primary: "ui-icon-trash"}
	});
		
	$("#showDir").button({
		icons: { primary: "ui-icon-circle-plus"}
	});
	
	$("#exportData").button({
		icons: { primary: "ui-icon-arrowthickstop-1-s"}
	});

	$("#confirm").button({
		icons: { primary: "ui-icon-circle-check"}
	});

	$("#add, #addNewAPWP, #saveGroupButton").button({
		icons: { primary: "ui-icon-circle-plus"}
	});

	$("#extra, #simple, .bootstrapButtons").button({
		icons: { primary: "ui-icon-gear"}
	});
	
	$("#radio1, #mapRadio1").button({
		icons: { primary: "ui-icon-grip-dotted-horizontal"}
	});
	
	$("#radio2, #mapRadio2").button({
		icons: { primary: "ui-icon-grip-dotted-vertical"}
	});
	
	// Prevent jQuery UI button from remaining in ui-active-hover Fixes [#0009]
	// Do not include the multiselect widget; this breaks some formatting
	$("button:not(.ui-multiselect)").button()
    .bind('mouseup', function() {
        $(this).blur();   
	});
	
	/* INITIALIZE MULTISELECT WIDGETS
     * ------------------------------
	 */
	 
	$('#metaSel').multiselect({
		multiple: false, 
		noneSelectedText: 'No sites in storage'
	});
	
	//Function to get interpreted sites from localstorage
	$('#interpretedSites').multiselect({
		multiple: false, 
		selectedList: 1,
		noneSelectedText: 'No site is selected',
		close: function() {
			addInterpretations();
		}
	});	

	$('#plateNames').multiselect({
		selectedText: "# plates selected",
		minWidth: 220,
		noneSelectedText: "Select a plate",
		selectedList: 1,
	});
	
	$('#refFrame').multiselect({
		noneSelectedText: "Select a reference frame",
		minWidth: 220,
		selectedList: 1,
	});
	
	$('#EISel').multiselect({
		multiple: false,
	});
	
	$('#cutoffSelectorDirections').multiselect({
		minWidth: 120,
		multiple: false,
		selectedList: 1,
		close: function() {
			$("#dirSel").click();
		}
	});
	
	$('#cutoffSelector').multiselect({
		minWidth: 120,
		multiple: false,
		selectedList: 1,
	});
			
	$('.ageNames').multiselect({
		selectedText: "# sites selected",
		noneSelectedText: "Select an age",
		multiple: false, 
		selectedList: 1,
	});
	
	//Site selector class
	$(".siteSelector").multiselect({
		selectedText: "# sites selected",
		minWidth: 250,
		selectedList: 1,
		noneSelectedText: "Select a site",
		close: function() {
			
			//Trigger the click for particular selector ID (e.g. dirSel, meanSel)
			$('#' + this.id).click(); 
			
			//[DISABLED]
			//$(".siteSelector").val($('#' + this.id).val()).multiselect("refresh");
			//module.options.update.dir = true;
			//module.options.update.mean = true;
		}
	});
	
	/* INITIALIZE DIALOG WIDGETS
     * ------------------------------
	 */	
	
	$('#editMetaDialog, #addAPWP, #input').dialog({
		'width': 600,
		'min-height': 100,
		'draggable': false,
		'resizable': false,
		'autoOpen': false,
		'modal': true,
		'buttons': {
			'Cancel editing': function () {
				$(this).dialog("close");
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
			"Add": function() {
				if(addSiteCombination()) {
					$( this ).dialog( "close" ); //Only close the dialog box if the procedure is succesful (addSiteCombination returns a Boolean for status)
				}
			},
			Cancel: function() {
				$( this ).dialog( "close" );
			}
		}
	});
	
	/* INITIALIZE BUTTONSET WIDGETS
     * ------------------------------
	 */
	 
	$( "#sampleFish" ).buttonset();
	$( "#radio" ).buttonset();
	$( "#mapRadio" ).buttonset();
	$( "#siteInfo" ).buttonset();	
	$( "#radioConfDir" ).buttonset();	
	$( "#radioConfMean" ).buttonset();	

	$('input[name="radioConfMean"][value="a95pole"]').prop('checked', true);
	$('input[name="radioConfDir"][value="a95pole"]').prop('checked', true);
	$('#radioConfMean, #radioConfDir').buttonset("refresh");
	
	/* INITIALIZE ACTION FUNCTIONS
     * ------------------------------
	 */
		
	$("#deleteInterpretation").click( function () {
		removeInterpretations();
	});
	
	$("#dlBootstrapXYZ").button().click( function () {
		module.IO.getSVG("dlBootstrapXYZ");
	});
	
	$("#addNewAPWP").click( function () {
		$( "#addAPWP" ).dialog( "open" );
	});
	
	// Update direction graph
	$(".updateDir").change( function () {
		$("#dirSel").click();
	});
	
	$("#colorFlag").change( function () {
		module.options.update.mean = true;
	});
	
	// Update mean graph
	$(".updateMean").change( function () {
		$("#meanSel").click();
	});
	
	// Update map module
	$("#mapRadio").change( function () {
		module.map.mapAddSites();
	});
	
	// Open edit metadata dialog
	$("#editMeta").click( function () {
		$( "#editMetaDialog" ).dialog( "open" );
		$( "#metaSel" ).click();
	});
	
	// Call export all function
	$("#exportHighlight").click( function () {
		$("#exportData").click();
	});
	
	//Preset ages and function to call the parseAgeName function for specified ages
	$(".ageNames").change( function () {
		changeAge(this.id);
	});
	
	// Clears local storage and reloads page (resets application)
	$('#clrStorage').click( function () {
		if(confirm("Are you sure you wish to delete this instance and reset the application?")){
			localStorage.removeItem('pMag');
			location.reload(); 
		}
	});
	
	// Adds selected number of bootstraps to spinner
	$('.bootstrapButtons').click( function () {
		$( "#spinner" ).spinner( "value", $(this).attr("val") );
	})
	
	// Calls CSV exporting function that saves the site instance to the .pmag format
	$('#exportData').click ( function () {
		module.IO.exporting();
	});

	//Call the function that is responsible for plotting the mean directions and we pass the entire sites data-block
	$('#plotmeans').click( function() {
		plotMeans(sites, $("#radioConfDir input[type='radio']:checked").val(), $("#radio :radio:checked + label").text());
	});

	// Reprocess the direction tab if the cutoff flag changes.
	$("#cutoffFlag").change( function () { 
		module.options.update.dir = true;
	});
	
	//If the projection flag is checked we need to update all spherical projections on first tab load
	$("#projFlag").change( function () {
		module.options.update.dir = true;
		module.options.update.mean = true;
		module.options.update.foldtest = true;
	});

	//SITE SELECTOR: Geomagnetic Directions
	$("#dirSel").click( function () {
		showGeomagneticDirections();
	});
	
	// Description: Saves a new combination of sites as a new site
	$( "#saveGroupButton" ).click( function () {
		$( "#addSiteGroup" ).dialog( "open" );
	});
		
	//Handle foldtest initialization
	$('#foldtestInit').click ( function () {
		module.foldtest.initialize();
	})
	
	//Match the visible div element to the site input type		 	
	$('#siteType').selectmenu({
		change: function() {
			$('div.box').hide()
			$('div.box.'+$(this).val()).show()
		},
		width: 250
	});

	//Open the data input dialog box		
	$('#add').click(function () {
		$('#siteInfo').change();
		$('div.box.'+$('#siteType').val()).show()
		$( "#input" ).dialog( "open" );
	});
	
	// Calls processing on site
	$('#confirm').click( function () {
		addSite();
	});

	//BUTTON: "Delete Selected Sites"
	$('#delete').click( function() {
		removeSite();
	});
	
	//Repositions dialog boxes on window resize. Fixes [#0010] 
	$(window).resize(function() {
		$(".dialog").dialog("option", "position", {my: "center", at: "center", of: window});
	});
	
	//Handling for removing an APWP
	$("#removeAPWP").click ( function () {
		removeAPWP();
	});
	
	//Handling for adding an APWP
	$("#confirmAPWP").click ( function () {
		addAPWP();
	});
	
	//Data Input simple/advanced options toggle
	$('#siteInfo').change( function() {
		var options = $("#siteInfo :radio:checked + label").text();
		if(options == 'Simple Options') {
			$('#adv').hide();
		} else {
			$('#adv').show();
		}
	});
	
	/* INITIALIZE PROGRESSBAR WIDGETS
     * ------------------------------
	 */
	 
	$("#progressbar").progressbar({ value: 0 });
	$("#EIBar").progressbar({ value: 0 });
	$("#CTMDBar").progressbar({ value: 0 });
	
	/* INITIALIZE SLIDER WIDGETS
     * -------------------------
	 */
	 
	$( "#unfoldingPercentage" ).slider({
		range: true,
		min: -50,
		max: 150,
		step: 10,
		values: [ -50, 150 ],
		slide: function( event, ui ) {
			$( "#unfoldingPercentageRange" ).html("Unfolding Range: " + ui.values[ 0 ] + " to " + ui.values[ 1 ] + "%"); //Update text during sliding
		}
    });
	
	$( "#ageRange" ).slider({
		range: true,
		min: 0,
		max: 320,
		step: 10,
		values: [ 0, 320 ],
		slide: function( event, ui ) {
			$( "#ageRangeText" ).html("Age: " + ui.values[ 0 ] + " to " + ui.values[ 1 ] + " Ma"); //Update text during sliding
		}
    });
	
	$( "#ageRange" ).slider({
		range: true,
		min: 0,
		max: 600,
		step: 1,
		values: [ 0, 600 ],
		slide: function( event, ui ) {
			if(event.shiftKey) {
				$("#ageRange").slider("option", "step", 10)
			} else {
				$("#ageRange").slider("option", "step", 1)
			}
			$( "#ageRangeDisplay" ).html(ui.values[ 0 ] + " to " + ui.values[ 1 ] + " Ma");
		},
		stop: function (event, ui) {
			module.map.mapAddSites();
		}
    });
	
	//BUTTON: edit metaData
	//Shows edit box and parses current metadata
	$("#metaSel").click ( function () {
		$("#editInfo").html("");
		
		//Get selected site
		var siteName = $("#metaSel").val();
		if(siteName == null) {
			$("#editMetaContent").hide();
			return;
		}

		//Parse the current metadata
		//Capture to md 
		var md = sites[siteName].userInput.metaData; 
		
		$("#siteLatEdit").val(md.latitude);
		$("#siteLngEdit").val(md.longitude);
		$("#siteAgeEdit").val(md.age);
		$("#siteMinAgeEdit").val(md.minAge);
		$("#siteMaxAgeEdit").val(md.maxAge);
		$("#editAuthorID").val(md.author);
		$("#siteDescEdit").val(md.description);

		$("#editMetaContent").show();
		$("#showAuthorEdit").show().css('display', 'inline-block');
		
	});
	
	//BUTTON: Confirm Edit
	//Saves the new specified meta data for a site
	$("#confirmEdit").click ( function () {
		
		//Construct updated meta data and extend the existing meta data object
		var newMetaData = new constructMetaData('edit');
		var siteName = $("#metaSel").val();
		$.extend(sites[siteName].userInput.metaData, newMetaData);
		
		setStorage(); //Save application
		
		notify('success', 'Meta-data for site ' + siteName + ' was succesfully updated');
		$("#editInfo").html("The edit has been successfully applied.");
	
	});

	// SPINNER: Number of bootstraps (FOLDTEST module)
	$( "#spinner" ).spinner();

	/* INITIALIZE TAB WIDGETS
     * ----------------------
	 */
	 
	//Reflow the highcharts graphs every time a tab is loaded
	//This prevents resizing issues
	$("#poleTabs").tabs({
		activate: function(event, ui) {
			if(ui.newPanel.selector == '#palatTab') {
				$("#palatContainer").highcharts().reflow();
			} else if (ui.newPanel.selector == '#decTab') {
				$("#decContainer").highcharts().reflow();
			} else if (ui.newPanel.selector == '#incTab') {
				$("#incContainer").highcharts().reflow();
			} else if (ui.newPanel.selector == '#mapTab') {
				$("#polePath").highcharts().reflow();
			}
		}
	});
	
	//Tab definition for the main tabs on the statistics portal
	$( "#tabs" ).tabs({
		activate: function(event, ui) {
			if(ui.newPanel.selector == '#tabs-4') {
				//Initialize the map when the tab is opened for the first time
				if(!module.map.mapInit) {
					module.map.initialize(); //Initialize map				
					module.map.map.setCenter({lat: 35, lng: 35});
					module.map.mapInit = true;
				}
				//On tab load resize the map (otherwise we get tiling issues) Fixes [#0004]
				google.maps.event.trigger(module.map.map, "resize");
				module.map.mapAddSites();
			}
			if(ui.newPanel.selector == '#directionTab') {
				if(module.options.update.dir) {
					$("#dirSel").click();
					module.options.update.dir = false;
				}
			}
			if(ui.newPanel.selector == '#tabs-3') {
				if(module.options.update.mean) {
					$("#meanSel").click();
					module.options.update.mean = false;
				}
			}
			if(ui.newPanel.selector == '#tabs-6') {
				if(module.options.update.foldtest) {
					foldtestProjections();
				}
				module.options.update.foldtest = false;
			}
			
			//Fixes HighCharts resizing error by redrawing the chart when the tab is loaded Fixes [#0003]
			if(ui.newPanel.selector == '#tabs-6') {
				if($('#container5').highcharts() != undefined) {
					$('#container5').highcharts().reflow();
				}
			}
		}
	}).css({
		'overflow': 'auto'
	});
	
	//SITE SELECTOR: Mean Directions
	$('#meanSel').click( function () {
		showMeanDirections();
	});

	//See apwp.js for this function
	$('#requestAPWP').click(function () {
		getExpectedLocation();
	});		
	
	// Wally was here (.. but only sometimes!)
	if(Math.random() < 0.01 ){
		$("#wld").html("<img id='waldo' src='../images/waldo.png' title='..!'>")
		$("#waldo").hover( function() {
			$("#waldo").fadeOut('slow').html("");
		});
	}
}