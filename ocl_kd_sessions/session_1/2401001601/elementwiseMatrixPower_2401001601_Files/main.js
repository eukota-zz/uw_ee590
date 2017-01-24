/*****************************************/
/* Globals */
/*****************************************/
var support, animEndEventName;
var tipsButton;
var tipsList;
var mainReportsContainerLock = false;
var browserInfo = {};

//tips & notifications stuff:
var ActiveTipInfo = {};
var activeTipHighlightedRows = [];
var activeTipNotificationInstance;
var activeTipFilteredDatatableInstance;

var pagesTitles = {
	sessionInfo: 'Session Info',
	hostProfiling: 'Host Profiling',
	apiCalls: 'Api Calls',
	memoryCommands: 'Memory Commands',
	oclObjects: 'OpenCL Objects',
	kernelsOverview: 'Kernels Overview',
	kernelsAnalysis: 'Kernel Analysis',
	executionAnalysis: 'Execution Analysis',
	variablesView: 'Variables View'
}
//kernels may be added dynamically
//(assuming kernel name can't container spaces, dots or special characters).
//var kernelsPagesTitles = {};
var homePageTitle = 'Home Page';
var currentlyDisplayed;
var mode = 'normal';// accepted values: "normal", "localHost" .



/*****************************************/
/* Main Template initialization */
/*****************************************/
$(document).ready(function () {

	appendLoadingMessage(document.body);
	
	//prevent caching on Ajax request:
	$.ajaxSetup({ cache: false });
	
	//append session id to the beginning of each ajax call:
	$.ajaxPrefilter(function( options ) {
		if(sessionID != ''){
			options.url = sessionID + '?' + options.url;
		}
	});
	
	//prevent text highlighting (except for inputs):
    document.onselectstart = function (e) {
        var target = (typeof e != "undefined") ? e.target : event.srcElement;
        if (target.tagName.toLowerCase() == "input") {
            return true;
        }
        return false;
    }

    //prevent right click (except for text areas.
    document.oncontextmenu = function (e) {
        var target = (typeof e != "undefined") ? e.target : event.srcElement;
        if (target.tagName.toLowerCase() == "textarea" || target.tagName.toLowerCase() == "input") {
            return true;
        }
		if($(target).hasClass('variableLauncherSpan')){
			//create context menu for variables:
			createKDFVariablesContextMenuFor(target, e);
			return false;
		}
        return false; //prevent browser's context menu.
    }
	
	window.onbeforeunload = function(event) {
		$.ajax({
			url: "Generic?terminate",
			type: "POST",
			async: false,
			dataType: "json",
			success: function () {},
			error: function () {}
		});
	};
	
	//update mode:
	updateMode();
	if(mode != 'localHost') {
		sessionID = '';
	}

	//make sure the browser is supported:
    if (window.attachEvent != null && window.addEventListener == null) {
        removeLoadingMessage(document.body);
		displayBrowserNotSupportedWarning();
		return;
    }
	
	//check if ajax is supported and continue accordingly:
	if(checkLocalFilesAccessability() == false){
		removeLoadingMessage(document.body);
		displayBrowserNotSupportingLocalFilesAccessWarning();
		return;
	}

	//get animation support and events names:
	support = { animations: Modernizr.cssanimations };
    var animEndEventNames = {
        'WebkitAnimation': 'webkitAnimationEnd',
        'OAnimation': 'oAnimationEnd',
        'msAnimation': 'MSAnimationEnd',
        'animation': 'animationend'
    };
    animEndEventName = animEndEventNames[Modernizr.prefixed('animation')];
	
	
    //prevent overflow scrolling while dragging (not the perfect solution but will do for now...):
    $('#st-container').on('scroll', function () {
        $(document).scrollLeft(0);
        $(document).scrollTop(0);
    });
	
	identifyBrowser();
	
	//is view variables mode:
	var variablesViewer = getUrlParameter('variablesViewer');
	if(variablesViewer != null && variablesViewer != ''){
		setPageMinDim('650px', '180px');
		LoadVariablesViewer(document.body, variablesViewer);
		removeLoadingMessage(document.body);
		return;
	}
	
	var mainMenuData = loadMainMenuData();
	if(mainMenuData == null){
		removeLoadingMessage(document.body);
		appendCriticalErrorMessage(document.body, "Error: can not find main menu data");
		return;
	}
	
	//report modes:
	if(mainMenuData.reportMode == 'kernel'){
		initializeMainTemplate('kernel');
		var mainReportsContainer = document.getElementById('mainReportsContainer');
		loadKernelReport(switchToReport(mainReportsContainer), mainMenuData.kernelData);
	}
	else if(mainMenuData.reportMode == 'kdfRun'){
		initializeMainTemplate('kernel');
		setPageMinDim('650px', '180px');
		var mainReportsContainer = document.getElementById('mainReportsContainer');
		loadKDFRunReport(switchToReport(mainReportsContainer), mainMenuData.run);
	}
	else if(mainMenuData.reportMode == 'host'){
		initializeMainTemplate('host');
		buildReportMainMenu(mainMenuData);
	}
	else if(mainMenuData.reportMode == 'kdf'){
		initializeMainTemplate('kdf');
		buildReportMainMenu(mainMenuData);
	}
	else if(mainMenuData.reportMode == 'empty'){
		LoadEmptyReportPage(mainMenuData.emptyReport);
	}
    removeLoadingMessage(document.body);
	
});

function LoadEmptyReportPage(data){
	var messagesHTML = '';
	for(var i=0; i<data.messages.length; i++){
		messagesHTML += '<tr><td class="messageTableCell1"></td><td style="font-size: 11px;">- ' + data.messages[i] + '</td></tr>';
	}

	document.body.innerHTML += '<div id="emptyReportContainer" class="ui-widget">' +
			'<div class="ui-state-highlight ui-corner-all" style="padding: 0 .7em;">' +
				'<div id="emptyReportMessageContainer">' +
					'<span class="ui-icon ui-icon-alert" style="float: left; margin-right: .3em; font-size: 11px;"></span>' +
					'<strong>Alert:</strong> ' + data.title +
					'<br/>' +
					'<table style="margin-top: 5px;">' +
						messagesHTML +
					'</table>' +
				'</div>' +
			'</div>' +
		'</div>';	
}

function setPageMinDim(minWidth, minHeight){
	//body element:
	document.body.style.minWidth = minWidth;
	document.body.style.minHeight = minHeight;
	
	//html element:
	htmlTags = document.getElementsByTagName("html")
	for(var i=0; i < htmlTags.length; i++) {
		htmlTags[i].style.minWidth = minWidth;
		htmlTags[i].style.minHeight = minHeight;
	}
}

function identifyBrowser(){
	//find browser version:
     browserInfo.isOpera = !!window.opera || navigator.userAgent.indexOf(' OPR/') >= 0; // Opera 8.0+ (UA detection to detect Blink/v8-powered Opera)
     browserInfo.isFirefox = typeof InstallTrigger !== 'undefined';   // Firefox 1.0+
     browserInfo.isSafari = Object.prototype.toString.call(window.HTMLElement).indexOf('Constructor') > 0; // At least Safari 3+: "[object HTMLElementConstructor]"
     browserInfo.isChrome = !!window.chrome && !browserInfo.isOpera; // Chrome 1+
     browserInfo.isIE = /*@cc_on!@*/false || !!document.documentMode; // At least IE6
}

function checkLocalFilesAccessability() {
	var supported = false;
    $.ajax({
        url: filesBaseDir + "/data/testLocalFilesAccess.ajax",
        type: "POST",
		async: false,
        dataType: "json",
        success: function () {
			supported = true;
        },
        error: function () {
            supported = false;
        }
    });
	return supported;
}

function getUrlParameter(paramName){
	try
	{
		var sPageURL;
		if(initialParams != "TAG_SESSION_PARAM"){
			sPageURL = initialParams;
		}
		else{
			sPageURL = window.location.search;
		}
		
		var sURLVariables = sPageURL.substring(1).split('&');
		for (var i = 0; i < sURLVariables.length; i++) 
		{
			var parts = sURLVariables[i].split('=');
			var tail = parts.slice(1).join('=');
			var result = parts.slice(0,1);
			result.push(tail);
			if (parts[0] == paramName) 
			{
				return parts[1];
			}
		}
	}
	catch(ex){
		alert('exception parsing input: ' + ex);
		return null;
	}
}

function updateMode(){
	$.ajax({
		url: 'modecheck',
		type: "POST",
		dataType: "text",
		async: false,
		success: function (newMode) {
			mode = newMode;
		},
		error: function(jqxhr, statusText, errorThrown){
			mode = 'normal';
		}
	});
}

function displayBrowserNotSupportedWarning(){
	// create a warning box:
    var warningWrapper = document.createElement('div');
    warningWrapper.className = 'warningWrapper';
    $(warningWrapper).appendTo("body");

    var warningContainer = document.createElement('div');
    warningContainer.className = 'warningContainer';
    $(warningWrapper).append(warningContainer);

    var title = document.createElement('h2');
    title.innerHTML = 'WARNING!';
    $(warningContainer).append(title);

    var message = document.createElement('div');
    message.style.textAlign = 'left';
    message.style.marginLeft = '20px';
    message.style.marginRight = '20px';
	
		
	var span1 = document.createElement('span');
    span1.innerHTML = "Your browser is out-dated and not supported.<br/>" +
							  "Please updata your browser and try again.<br/><br/>";
								  
	message.appendChild(span1);
	$(warningContainer).append(message);
	$(warningWrapper).hide().fadeIn(1000);
}

function displayBrowserNotSupportingLocalFilesAccessWarning(){
	// create a warning box:
    var warningWrapper = document.createElement('div');
    warningWrapper.className = 'warningWrapper';
    $(warningWrapper).appendTo("body");

    var warningContainer = document.createElement('div');
    warningContainer.className = 'warningContainer';
    $(warningWrapper).append(warningContainer);

    var title = document.createElement('h2');
    title.innerHTML = 'WARNING!';
    $(warningContainer).append(title);

    var message = document.createElement('div');
    message.style.textAlign = 'left';
    message.style.marginLeft = '10px';
    message.style.marginRight = '10px';
	
	
	var mainHTML = window.location.pathname;
	//to fix the "%20" added by the browser:
	mainHTML = mainHTML.replace(/%20/gi, " ");
	
	if(mainHTML.startsWith('file:///')){
		mainHTML = mainHTML.replace("file:///", "");
	}
	
	if (window.navigator.userAgent.indexOf("Linux")==-1){//for windows
		while(mainHTML.startsWith('/')){
			mainHTML = mainHTML.substring(1);
		}
	}
	
	var span1 = document.createElement('span');
    span1.innerHTML = "Your browser seems to be blocking access to the report's local data-files. " +
							      "to view the report correcly, you may:<br/><br/>" +
								  "1) Run the following command: <br/>";
								  
	message.appendChild(span1);
	
	var section = document.createElement('div');
	section.className = 'hostProfilingOverviewSection sectionInfoValue';
	section.style.padding = '20px 20px';
	section.style.fontSize = '12px';
	section.title = 'click to copy to clipboard';
	section.className += ' copiable';
	section.style.minHeight = '0px';
	section.style.height = '';
	section.innerHTML = "CodeBuilder --view \"" +mainHTML +"\"";
	section.onclick = function (){ copyToClipboard(section.innerHTML); };
	message.appendChild(section);
	
	var span2 = document.createElement('div');
	span2.style.paddingTop = '20px';
	span2.innerHTML += "2) Use a browser that allows local files access.<br/><br/><br/>";
	message.appendChild(span2);			  
	
    $(warningContainer).append(message);
	
	$(warningWrapper).hide().fadeIn(1000);
	
}

function initializeMainTemplate(reportMode){
	
	//build main template structure:
	var stContainer = document.createElement('div');
	stContainer.id = 'st-container';
	stContainer.className = 'st-container';
	document.body.appendChild(stContainer);
	
	var stPusher = document.createElement('div');
	stPusher.id = 'st-pusher';
	stPusher.className = 'st-pusher';
	stContainer.appendChild(stPusher);
	
	//sidebar menu:
	var pusherNav = document.createElement('nav');
	pusherNav.className = 'sidebarHelpmenu sidebarPushAnimation';
	pusherNav.innerHTML = '<h2>Help Manual<img class="helpmenu-logo" src="' + filesBaseDir + '/resources/intel_logo.png" alt="Intel logo"/></h2><ul id="helpMenuList"></ul>';
	stPusher.appendChild(pusherNav);
	
	//menu button:
	var menuButtonAddition;
	if(reportMode == 'kernel'){
		menuButtonAddition = ' class="kernelReport" ';
	}
	else{
		menuButtonAddition = ' class="hostReport" ';
	}
	stPusher.innerHTML += '<img id="menuButton" ' + menuButtonAddition + 'title="menu" data-effect="sidebarPushAnimation" src="' + filesBaseDir + '/resources/menu.png" />';
	
	if(reportMode == 'host'){
		//home button:
		stPusher.innerHTML += '<img id="homeButton" title="home page"  src="' + filesBaseDir + '/resources/home.png" />';
	}
	if(reportMode == 'host' || reportMode == 'kdf'){
		//mainMenu container:
		stPusher.innerHTML += '<ul id="mainMenu" class="mainMenu dotstyle-fillin">' +
									'<div class="dotNavBarWrapper">' +
										'<div class="dotNavBar"></div>' +
									'</div>' +
								'</ul>';
		
		//main report container:
		stPusher.innerHTML += '<div id="mainReportsContainer"></div>';
	}
	
	if(reportMode == 'kernel'){
		//main report container:
		stPusher.innerHTML += '<div id="mainReportsContainer" class="kernelReportMode"></div>';
	}
	
	//sidebar menu:	
	initiateSidebarMenu();
	fillSidebarMenu();
	
	
	//tips:
	tipsButton = document.createElement('button');
	tipsButton.className = 'tipsButton cbutton cbutton--effect-jagoda';
	tipsButton.title = 'tips';
	stPusher.appendChild(tipsButton);
	
	//toggle tips on button click:
	tipsButton.onclick = function(){
		$(tipsButton).removeClass('cbutton--click');
		toggleTips();
	}
	
	//close the tips menu if the target isn't the menu element or one of its descendants..
    stPusher.addEventListener( 'click', function(ev) {
        var target = ev.target;
        if( tipsWindowOpen && target !== tipsButton ) {
            toggleTips();
        }
    });
	$(tipsButton).hide();
	
	//create tips list wrappers:
	var tailShadow = document.createElement('div');
	tailShadow.id = 'tailShadow';
	stPusher.appendChild(tailShadow);
	
	var tail1 = document.createElement('div');
	tail1.id = 'tail1';
	stPusher.appendChild(tail1);
	
	var tipsContainer = document.createElement('div');
	tipsContainer.id = 'tipsContainer';
	stPusher.appendChild(tipsContainer);
	
	tipsList = document.createElement('ul');
	tipsList.id = 'tipsList';
	tipsContainer.appendChild(tipsList);
			
	hideTips();
}

function fillSidebarMenu() {}

function loadMainMenuData(){
	var mainMenuData;
	$.ajax({
        url: filesBaseDir + "/data/mainMenu.ajax",
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			mainMenuData = data;
        },
        error: function () {
            //todo:
			mainMenuData = null;
        }
    });
	
	return mainMenuData;
}

function mainMenuOpenPage(title){
	
	//home page special handling:
	if(title == homePageTitle){
		var homeButton = document.getElementById('homeButton');
		if(homeButton != null){
		$(homeButton).click();
		}
		//todo: remove focus-class from current main menu element?
		return;
	}

	//main menu pages:
	var mainMenu = document.getElementById('mainMenu');
	var landingPage = $('#mainMenu').find('a:contains('+ title +')');
	if(landingPage.length > 0){
		landingPage[0].click();
	}
}

function buildReportMainMenu(data){
	var mainMenu = document.getElementById('mainMenu');
	var mainReportsContainer = document.getElementById('mainReportsContainer');
	
	//home page:
	if(data.homePage){
		document.getElementById('homeButton').onclick = function(){
			//todo: select homePage.
			if(mainReportsContainerLock == true){
				return;
			}
			if(currentlyDisplayed == homePageTitle){
				return;
			}
			currentlyDisplayed = homePageTitle;
			
			updateMainMenuSelection(null);
			appendLoadingMessage(document.body);
			setTimeout(function(){
				loadHomePage(switchToReport(mainReportsContainer), data.homePage);
				//animateCurrentReportEntrace();
				removeLoadingMessage(document.body);
			}, 1);
		};
	}
	else{
		$('#homeButton').remove();
	}
	
	//Application Info page:
	if(data.sessionInfo){
		var sessionInfo = data.sessionInfo;
		addNewMenuItem(pagesTitles.sessionInfo, function(){
			loadSessionInfoReport(switchToReport(mainReportsContainer), sessionInfo);
		});
	}
	
	//Application Info page:
	if(data.hostProfiling){
		var hostProfiling = data.hostProfiling;
		var hostProfilingItem = addNewMenuItem(pagesTitles.hostProfiling);
		
		//sub menu items:
		if(hostProfiling.apiCalls){
			addSubMenuItem(hostProfilingItem, pagesTitles.apiCalls, function(){
				loadApiCallsReport(switchToReport(mainReportsContainer), hostProfiling.apiCalls);
			});
		}
		
		if(hostProfiling.memoryCommands){
			addSubMenuItem(hostProfilingItem, pagesTitles.memoryCommands, function(){
				loadMemoryCommandsReport(switchToReport(mainReportsContainer), hostProfiling.memoryCommands);
			});
		}
		
		if(hostProfiling.oclObjects){
			addSubMenuItem(hostProfilingItem, pagesTitles.oclObjects, function(){
				loadOCLObjectsReport(switchToReport(mainReportsContainer), hostProfiling.oclObjects);
			});
		}
		
	}
	
	//KDF execution menu:
	if(data.execution!= null && data.execution.execution){
		addNewMenuItem(pagesTitles.executionAnalysis, function(){
			loadExectionViewReport(switchToReport(mainReportsContainer),data.execution.execution);
		});
	}

	//Kernels Overview page:
	if(data.kernelsOverview){
		var kernelsOverview = data.kernelsOverview;
		addNewMenuItem(pagesTitles.kernelsOverview, function(){
			loadKernelsOverviewReport(switchToReport(mainReportsContainer), kernelsOverview);
		});
	}
		
	//Kernel Analysis page:
	if(data.kernelsAnalysis && data.kernelsAnalysis.length != 0){
		var kernelsAnalysis = data.kernelsAnalysis;
		var kernelsAnalysisItem = addNewMenuItem(pagesTitles.kernelsAnalysis, null);//function(){
			//loadKernelAnalysisListViewReport(switchToReport(mainReportsContainer), kernelsAnalysis);
		//});
		
		//sub menu items:
		var kernelsCount = kernelsAnalysis.length;
		for (var i=0; i<kernelsCount; i++) (function(i){
			var kernelData = kernelsAnalysis[i];
			addSubMenuItem(kernelsAnalysisItem, kernelData.kernelUniqueName, function(){
				loadKernelReport(switchToReport(mainReportsContainer), kernelData);
			});
			//assuming kernel name can't container spaces, dots or special characters.
			//kernelsPagesTitles[kernelData.kernelUniqueName] = kernelData.kernelUniqueName;
		})(i);
		
	}
	
	
	//set landing page:
	//KDF execution menu:
	if(data.execution){
		mainMenuOpenPage(pagesTitles.executionAnalysis);
	}
	else{
		mainMenuOpenPage(homePageTitle);
	}
	
	//build the menu object:
	new cbpTooltipMenu(mainMenu);
	
	//----------------------------------------------------
	//private functions for building mainMenu:
	//----------------------------------------------------
	
	function addNewMenuItem(name, onclickFunc){
		//menu item:
		var menuItem = document.createElement('li');
		menuItem.className = 'mainMenuItem';
		var itemText = document.createElement('a');
		itemText.className = 'mainMenuText';
		itemText.innerHTML = name;
		
		if(onclickFunc){
			itemText.onclick = function(){
				if(mainReportsContainerLock == true){
					return;
				}
				
				if(currentlyDisplayed == name){
					return;
				}
				currentlyDisplayed = name;
				
				updateMainMenuSelection(menuItem);
				appendLoadingMessage(document.body);
				setTimeout(function(){
					onclickFunc();
					animateCurrentReportEntrace();
					removeLoadingMessage(document.body);
				}, 1);
			};
		}
		else{
			itemText.style.cursor = 'default';
		}
		
		//dot navigation:
		var dotNav = document.createElement('li');
		dotNav.className = 'mainMenuDotNav';
		dotNav.appendChild(document.createElement('a'));
		
		mainMenu.appendChild(menuItem);
		itemText.appendChild(dotNav);
		menuItem.appendChild(itemText);
		
		return menuItem;
	}
	//--------------------------
	
	function addSubMenuItem(mainMenuItem, name, onclickFunc){
		//get subMenu element:
		var subMenu = getSubMenu(mainMenuItem);

		//create a new Item subMenuItem and append it:
		var subMenuItem = document.createElement('li');
		var itemText = document.createElement('a');
		itemText.innerHTML = name;
		
		if(onclickFunc){
			itemText.onclick = function(){
				if(mainReportsContainerLock == true){
					return;
				}
				
				if(currentlyDisplayed == name){
					return;
				}
				currentlyDisplayed = name;
				
				updateMainMenuSelection(mainMenuItem);
				appendLoadingMessage(document.body);
				setTimeout(function(){
					//hide submenu:
					$(mainMenuItem).removeClass('cbp-tm-show');
					$(mainMenuItem).removeClass('cbp-tm-show-below');
					$(mainMenuItem).removeClass('cbp-tm-show-above');
					
					//build report:
					onclickFunc();
					animateCurrentReportEntrace();
					removeLoadingMessage(document.body);
				}, 1);
			};
		}
		
		subMenu.appendChild(subMenuItem);
		subMenuItem.appendChild(itemText);
		
		return subMenuItem;
	}
	//--------------------------
	
	function getSubMenu(mainMenuItem){
		var subMenusList = mainMenuItem.getElementsByClassName('mainMenuSubMenu');
		if(subMenusList.length > 0){
			return subMenusList[0];
		}
		//create a subMenu list:
		var subMenu = document.createElement('ul');
		subMenu.className = 'mainMenuSubMenu';
		mainMenuItem.appendChild(subMenu);
		
		//add the subMenu icon:
		var icon = document.createElement('img');
		icon.className = 'subMenuIcon';
		icon.src = filesBaseDir + '/resources/menu.png';
		
		var textItem = $(mainMenuItem).find('.mainMenuText')[0];
		$(textItem).prepend(icon);
		
		return subMenu;
	}
	//--------------------------
	
	function updateMainMenuSelection(menuItem){
		//clear previous selection:
		$(mainMenu).find('.mainMenuItem').removeClass('activeMainMenuItem');
		//set  selection class to new selection:
		if(menuItem != null){
			$(menuItem).addClass('activeMainMenuItem');
		}
	}
	
}

function switchToReport(mainReportsContainer){

	if(mainReportsContainerLock == true){
		return;
	}
	
	//get currently displayed report element:
	var previous = $(mainReportsContainer).find('.reportItem.current');
	if(previous.length == 1){
		var currentReport = previous[0];
		//call it's dispose function:
		if (typeof currentReport.onItemDispose == 'function') {
			currentReport.onItemDispose();
		}
	}
	//remove it:
	previous.remove();
	
	//clear it's tips:
	ClearTips();
	$(tipsButton).hide();
	$(tipsButton).removeClass('cbutton--click');
	
	//dismiss active tip:
	dismissActiveTip();
	
	//create a new report and append it to mainReportsContainer:
	var report = document.createElement('div');
	report.className= 'reportItem current';
	mainReportsContainer.appendChild(report);
	return report;
}

function animateCurrentReportEntrace(){
	var reportItem = $(mainReportsContainer).find('.reportItem.current')[0];
	if(reportItem){
		$(reportItem).hide();
		$(reportItem).fadeIn(600);
	}
}



/*****************************************/
/* Reports toolbox & commons */
/*****************************************/
function appendLoadingMessage(parent) {
    var loadingDiv = document.createElement('div');
    loadingDiv.className = 'loadingMessageBox';
    loadingDiv.innerHTML = 'loading...';

    parent.appendChild(loadingDiv);
}

function removeLoadingMessage(parent) {
    var loadingBoxes = $(parent).children('.loadingMessageBox');
    if (loadingBoxes.length != 0) {
        $(loadingBoxes[0]).remove();
    }
}

function appendCriticalErrorMessage(parent , criticalErrorMessage) {
    var messageDiv = document.createElement('div');
    messageDiv.className = 'criticalErrorMessageBox';

    if (criticalErrorMessage != null && criticalErrorMessage != "") {
        messageDiv.innerHTML = criticalErrorMessage;
    }
    else {
        messageDiv.innerHTML = "Error: unable to retrieve report's data.";
    }
    parent.appendChild(messageDiv);
}

function CreateSeperator(width, minWidth, marginBottom) {
    var seperator = document.createElement('hr');
    seperator.className = 'reportSectionsSeperator';
    if (width) {
        seperator.style.width = width;
    }
    if (minWidth) {
        seperator.style.minWidth = minWidth;
    }
    if (marginBottom) {
        seperator.style.marginBottom = marginBottom;
    }
    return seperator;
}

//Host profiling commons:
function RowDetailsShown(detailsControlElement) {
    detailsControlElement.html('-');
	$(detailsControlElement).addClass('activeDetailsParentRow');
}

function RowDetailsHidden(detailsControlElement) {
    detailsControlElement.html('+');
	$(detailsControlElement).removeClass('activeDetailsParentRow');
}

function createGraphFromTableData(graphContainer, tableData, propertyName, forceRender) {

    if (tableData.length > 1000 && !forceRender) {
        var graphLoader = document.createElement('span');
        graphLoader.style.height = '100%';
        graphLoader.style.width = '100%';
        graphLoader.style.textAlign = 'center';
        graphLoader.innerHTML = 'Show Graph';
        graphLoader.className = 'linkableSrcCode';

        $(graphContainer).append(graphLoader);

        $(graphLoader).click(function () {
            createGraphFromTableData(graphContainer, tableData, propertyName, true);
        });
        return;
    }

    var graphData = new Array(tableData.length);
    var graphTooltips = new Array(tableData.length);
    var xMin = 0, xMax = graphData.length, yMin = Number.MAX_VALUE, yMax = 0, totalValidEntries = 0;
	var entryAvg = 0;
    for (var i = 0; i < xMax; i++) {
        entry = parseFloat(tableData[i][propertyName]);
		if(entry == null){
			continue;
		}
		entryAvg += entry;
		totalValidEntries++;
		
        graphData[i] = [i, entry];
        graphTooltips[i] = [entry];

        if (entry > yMax) {
            yMax = entry;
        }

        if (entry < yMin) {
            yMin = entry;
        }
    }
    xMax -= 1;
	entryAvg = entryAvg / totalValidEntries;
	

    var graphObj = new Graph(graphContainer);
    graphObj.setData({
        "data":
        [
            {
                "label": '',
                "id": '',
                "data": graphData,
                "color": '#0071C5',
                "bars": { show: true, horizontal: false },
                "tt": graphTooltips,
                "showLabels": false,
            }
        ],
        "xAxisTicks": [],
        "yAxisTicks": [],
        "xMin": xMin,
        "xMax": xMax,
        "yMin": yMin,
        "yMax": yMax
    });

    graphObj.setOptions({
        "xAxisName": "",
        "yAxisName": "",
        "xAxis_showTicks": true,
        "yAxis_showTicks": true,
        "animate": false,
        "hoverable": true,
        "clickable": false,
        "navigatable": false,
        "horizontalGridlines": true,
        "verticalGridlines": false,
        "autoHighlight": true,
        "showTooltip": true,
        "selectable": true,
        "zoomOnSelection": true,
        "selectionMode": "xy",
        "markers": [{ color: '#A6CE39', lineWidth: 1, yaxis: { from: entryAvg, to: entryAvg } }],
        "trackable": false,
        "trackerMode": "x",
        "trackerDiv": "",
        "trackerDefaultMessage": "",
        "togglable": false,
        "togglerDiv": "#toggler",
        "zooming_xAxis_zoomable": true,
        "zooming_xAxis_minimalZoom": 2,
        "zooming_xAxis_maximalZoom": (xMax - xMin + 2),
        "zooming_onLoad_xAxis_from": (xMin - 1),
        "zooming_onLoad_xAxis_to": (xMax + 1),
        "center_xAxis_ifElementsAreLessThan": 6,
        "zooming_yAxis_zoomable": true,
        "zooming_yAxis_minimalZoom": 2,
        "zooming_onLoad_yAxis_from": 0,
        "zooming_onLoad_yAxis_to": yMax * 1.15,
        "center_yAxis_ifElementsAreLessThan": null,
        "showLegends": false
    });
    graphObj.Render();
	
	//add title:
	var graphTitleSpan = document.createElement('span');
	graphTitleSpan.innerHTML = propertyName + ' graph:';
	graphTitleSpan.style.position = 'absolute';
	graphTitleSpan.style.top = '10px';
	graphTitleSpan.style.left = '15px';
	graphTitleSpan.style.fontSize = '12px';
	
	graphContainer.appendChild(graphTitleSpan);
	
}

function copyToClipboard(text) {
	window.prompt("Copy to clipboard: Ctrl+C, Enter", text);
}

//tips behaviors:
function FilterDatatable_singleColumn(tableID, columnIndex, textToExactMatch) {
    var tableObj = $('#'+tableID).DataTable();
    //step2: clear previous filtering states (without rendering table):
    tableObj.search('');
    //step3: regex search the "apiName" column for a matching result and render table:
    tableObj.column(columnIndex).search('^' + textToExactMatch + '$', true, false, true).draw();
    //step4: clear the "apiName" column filtering limitation:
    tableObj.column(columnIndex).search('');
    //step5: set filtering string in the search box:
    tableObj.search(textToExactMatch);

    activeTipFilteredDatatableInstance = tableObj;
}

function expandDetailesForFirstFilteredRowInTable(tableID) {
    myFilteredRows = $('#' + tableID + ' tbody').find('tr');	
    if (myFilteredRows.length > 0) {
        tableObj = $('#' + tableID).DataTable();
        tr = myFilteredRows[0];
        row = tableObj.row(tr);
        if (row.child.isShown()) {
            row.child.hide();
            row.child.remove();
        }
        // Open this row
        $($(tr).find("td.details-control")[0]).trigger("click");
    }
}

function setActiveTipInfo(tableID, linesToHighlightIndexes) {
    ActiveTipInfo.TableToHighlight = tableID;
    ActiveTipInfo.LinesToHighlight = linesToHighlightIndexes;
}

function getDetailesDataTableIDForFirstFilteredRow(tableID) {
    var datatables = $('#' + tableID).find('.dataTable');
    if(datatables.length == 2){
        var id = datatables[1].id;
        return id;
    }
    return "";
}

function highlightJavascriptElement(element) {
    if (element == null) {
        return;
    }
    element.style.background = '#ffff99';
}

function CreateSrcViewer(src) {
		var srcCodeContainer = document.createElement('pre');
		srcCodeContainer.className = 'brush: cpp; class-name: "highlighterLine";';
		var invisibleChar = ' ';
		srcCodeContainer.innerHTML = invisibleChar + src + invisibleChar;
		return srcCodeContainer;
	}

	
	
/*****************************************/
/* sidebarEffect.js v1.0.0 */
/*****************************************/
/**
 * sidebarEffects.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2013, Codrops
 * http://www.codrops.com
 */
function initiateSidebarMenu(){
	var menuButton = 'menuButton';

    SidebarMenuEffects = (function() {
        function hasParentClass( e, classname ) {
            if(e === document) return false;
            if( $(e).hasClass(classname) ) {
                return true;
            }
            return e.parentNode && hasParentClass( e.parentNode, classname );
        }

        function init() {

            var container = document.getElementById('st-container');
            var bodyClickFn = function(evt) {
                if( !hasParentClass( evt.target, 'sidebarHelpmenu' ) ) {
                    hideSidebarMenu();
                    document.removeEventListener( 'click', bodyClickFn );
                }
            };
            var el = document.getElementById(menuButton);
            var effect = el.getAttribute('data-effect');
            el.addEventListener('click', function (ev) {
                ev.stopPropagation();
                ev.preventDefault();
                container.className = 'st-container';
                $(container).addClass(effect);
                setTimeout(function () {
                    $(container).addClass('sidebarHelpmenu-open');
                }, 25);
                document.addEventListener('click', bodyClickFn);
            });
        }
        init();
    })();
}

function hideSidebarMenu() {
    var container = document.getElementById( 'st-container' );
    $(container).removeClass('sidebarHelpmenu-open');
}

function showSidebarMenu(){
    $('#' + menuButton).trigger("click");
}



/*****************************************/
/* VIEW MODE (TABS) FUNCTIONALITIES */
/*****************************************/
function ViewMode(parent, widthPerHeader, title, titleClass) {
		
	var wrapper = document.createElement('table');
	parent.appendChild(wrapper);
	
	this.widthPerHeader = widthPerHeader;
	
	var tr = wrapper.insertRow();
	
	//insert tite cell:
	if(title != null){
		if(titleClass == null) {
			titleClass = '';
		}
		var td = tr.insertCell();
		td.className = titleClass;
		td.innerHTML = title;
	}
	
	//insert tabs-wrapping cell:
	var vmContainer = tr.insertCell();
	vmContainer.className = 'viewModeContainer';
	vmContainer.style.width = '250px';
	


    this.nav = document.createElement('nav');
    this.nav.className = 'tabs-style-bar linkEffect_brackets';
    $(vmContainer).append(this.nav);

    this.listElement = document.createElement('ul');
    $(this.nav).append(this.listElement);

    this.current = -1;

    this.itemsList = null;
	this.vmContainer = vmContainer;

}

ViewMode.prototype.setSelection = function (index) {
    if(index == this.current){
		return false;
	}
	if (this.current >= 0) {
        this.itemsList[this.current].className = '';
    }
    if (index) {
        this.current = index;
    }
    else {
        this.current = 0;
    }
    this.itemsList[this.current].className = 'tab-current';
	return true;
}

ViewMode.prototype.add = function (id, text, onclickFunc) {

    var item = document.createElement('li');
	if(id){
		item.id = id;
	}
    var a = document.createElement('a');
    a.innerHTML = text;
    $(item).append(a);
    $(this.listElement).append(item);

    if (onclickFunc) {
        $(a).click(function () {
            onclickFunc();
        });
    }

    var self = this;

    this.itemsList = this.listElement.querySelectorAll('li');
    var itemIndex = this.itemsList.length - 1;
    if (itemIndex == 0) {
        this.current = itemIndex;
        this.itemsList[this.current].className = 'tab-current';
    }
	
	this.vmContainer.style.width = (this.itemsList.length * this.widthPerHeader) + 'px';
    item.viewModeIndex = itemIndex;

    a.addEventListener('click', function (ev) {
        ev.preventDefault();
        self.setSelection(itemIndex);
    });

}

ViewMode.prototype.setFocusOn = function (id) {
    var ret = this.setSelection(document.getElementById(id).viewModeIndex);
    $($("#" + id + " a")[0]).trigger("click");
	if(ret == true){
		return 600;
	}
	return 0;
}

ViewMode.prototype.autoSetWidth = function (widthPerItem){
	var itemsCount = this.listElement.querySelectorAll('li').length;
	this.vmContainer.style.width = (widthPerItem * itemsCount) + 'px';
}

/*****************************************/
/* MEMORY DIAGRAM FUNCTIONALITIES */
/*****************************************/
function MemoryDiagram(parent, architecture) {
	this.parent = parent;
	this.architecture = architecture;
	$(parent).empty();
	
	if(this.architecture == 'hsw' || this.architecture == 'bdw'){
		
		//build layout:
		this.parent.innerHTML =
			'<table class="" border="0" style="width: 100%; border-spacing: 0px; border-collapse: separate;">' +
				'<tr>' +
					'<td colspan="10">&nbsp;<span class="memDiagramAreaTitle">GPU</span></td>' + 
					'<td class="memoryArchitecture_Unit_DRAM" rowspan="12">DRAM</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td rowspan="2" class="leftBordered topBordered">&nbsp;</td>' + 
					'<td rowspan="2" class="topBordered">&nbsp;</td>' + 
					'<td rowspan="2" class="topBordered">&nbsp;</td>' + 
					'<td rowspan="3" class="topBordered">&nbsp;</td>' + 
					'<td class="topBordered">&nbsp;</td>' + 
					'<td rowspan="3" class="topBordered">&nbsp;</td>' + 
					'<td class="topBordered rightBordered">&nbsp;</td>' + 
					'<td rowspan="5">&nbsp;</td>' + 
					'<td class="memoryArchitecture_Unit_LLC" rowspan="10">LLC<span class="memDiagramAreaTitle" style="position: absolute; top: 0px;">GPU</span></td>' + 
					'<td rowspan="5">&nbsp;</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td>&nbsp;</td>' + 
					'<td class="memoryArchitecture_Unit_L3 rightBordered" rowspan="8">L3</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td class="memoryArchitecture_Unit_EU leftBordered" rowspan="7">EU</td>' + 
					'<td>&nbsp;</td>' + 
					'<td class="memoryArchitecture_Unit_L1" rowspan="3">L1</td>' + 
					'<td class="memoryArchitecture_Unit_L2"rowspan="4">L2</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td class="arrow_EU_to_L1">arrow_EU_L1</td>' + 
					'<td class="arrow_L1_to_L2">arrow_L1_L2</td>' + 
					'<td class="arrow_L2_to_L3">arrow_L2_L3</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td>&nbsp;</td>' + 
					'<td rowspan="3">&nbsp;</td>' + 
					'<td rowspan="3">&nbsp;</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td rowspan="2">&nbsp;</td>' + 
					'<td>&nbsp;</td>' + 
					'<td class="arrow_L3_to_LLC_up">arrow_L3_LLC_up</td>' + 
					'<td class="arrow_LLC_to_DRAM_up">arrow_LLC_DRAM_up</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td>&nbsp;</td>' + 
					'<td>&nbsp;</td>' + 
					'<td rowspan="5">&nbsp;</td>' + 
					'<td rowspan="5">&nbsp;</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td class="arrow_EU_to_L3" colspan="5">arrow_EU_L3</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td rowspan="3" class="bottomBordered">&nbsp;</td>' + 
					'<td class="">&nbsp;</td>' + 
					'<td rowspan="3" class="bottomBordered">&nbsp;</td>' + 
					'<td rowspan="3" class="bottomBordered">&nbsp;</td>' + 
					'<td rowspan="3" class="bottomBordered">&nbsp;</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td rowspan="2" class="leftBordered bottomBordered">&nbsp;</td>' + 
					'<td rowspan="2" class="bottomBordered">&nbsp;</td>' + 
					'<td class="rightBordered">&nbsp;</td>' + 
				'</tr>' + 
				'<tr>' + 
					'<td class="rightBordered bottomBordered" >&nbsp;</td>' + 
					'<td>&nbsp;</td>' + 
				'</tr>' + 
			'</table>';
			
		//create units and arrows:
		var td, unit, element;

		td = $(this.parent).find('.memoryArchitecture_Unit_EU')[0]; td.innerHTML = '';
		unit = createArchitectutreUnit(td, 'EU', 'memoryArchitecture_Unit_EU_val', '70px', '150px');

		td = $(this.parent).find('.memoryArchitecture_Unit_L1')[0]; td.innerHTML = '';
		unit = createArchitectutreUnit(td, 'Sampler L1', 'memoryArchitecture_Unit_L1_val', '70px', '55px');
		element = $(this.parent).find('.memoryArchitecture_Unit_L1_val')[0];

		td = $(this.parent).find('.memoryArchitecture_Unit_L2')[0]; td.innerHTML = '';
		unit = createArchitectutreUnit(td, 'Sampler L2', 'memoryArchitecture_Unit_L2_val', '70px', '75px');
		element = $(this.parent).find('.memoryArchitecture_Unit_L2_val')[0];

		td = $(this.parent).find('.memoryArchitecture_Unit_L3')[0]; td.innerHTML = '';
		unit = createArchitectutreUnit(td, 'L3', 'memoryArchitecture_Unit_L3_val', '70px', '165px');
		element = $(this.parent).find('.memoryArchitecture_Unit_L3_val')[0];

		td = $(this.parent).find('.memoryArchitecture_Unit_LLC')[0]; td.innerHTML = '';
		unit = createArchitectutreUnit(td, 'LLC', 'memoryArchitecture_Unit_LLC_val', '70px', '208px');
		element = $(this.parent).find('.memoryArchitecture_Unit_LLC_val')[0];

		td = $(this.parent).find('.memoryArchitecture_Unit_DRAM')[0]; td.innerHTML = '';
		unit = createArchitectutreUnit(td, 'DRAM', 'memoryArchitecture_Unit_DRAM_val', '70px', '250px');
		element = $(this.parent).find('.memoryArchitecture_Unit_DRAM_val')[0];


		//arrows:
		td = $(this.parent).find('.arrow_EU_to_L1')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_EU_to_L1_val', 'right');
		element = $(this.parent).find('.arrow_EU_to_L1_val')[0];

		td = $(this.parent).find('.arrow_L1_to_L2')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_L1_to_L2_val', 'right');
		element = $(this.parent).find('.arrow_L1_to_L2_val')[0];

		td = $(this.parent).find('.arrow_L2_to_L3')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_L2_to_L3_val', 'right');
		element = $(this.parent).find('.arrow_L2_to_L3_val')[0];

		td = $(this.parent).find('.arrow_L3_to_LLC_up')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_L3_to_LLC_up_val', 'right');
		element = $(this.parent).find('.arrow_L3_to_LLC_up_val')[0];

		td = $(this.parent).find('.arrow_LLC_to_DRAM_up')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_LLC_to_DRAM_up_val', 'right');
		element = $(this.parent).find('.arrow_LLC_to_DRAM_up_val')[0];

		td = $(this.parent).find('.arrow_EU_to_L3')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_EU_to_L3_val', 'right');
		element = $(this.parent).find('.arrow_EU_to_L3_val')[0];
		
		
		//arrows:
		td = $(this.parent).find('.arrow_EU_to_L1')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_EU_to_L1_val', 'right');
		element = $(this.parent).find('.arrow_EU_to_L1_val')[0];

		td = $(this.parent).find('.arrow_L1_to_L2')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_L1_to_L2_val', 'right');
		element = $(this.parent).find('.arrow_L1_to_L2_val')[0];

		td = $(this.parent).find('.arrow_L2_to_L3')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_L2_to_L3_val', 'right');
		element = $(this.parent).find('.arrow_L2_to_L3_val')[0];

		td = $(this.parent).find('.arrow_L3_to_LLC_up')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_L3_to_LLC_up_val', 'right');
		element = $(this.parent).find('.arrow_L3_to_LLC_up_val')[0];

		td = $(this.parent).find('.arrow_LLC_to_DRAM_up')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_LLC_to_DRAM_up_val', 'right');
		element = $(this.parent).find('.arrow_LLC_to_DRAM_up_val')[0];

		td = $(this.parent).find('.arrow_EU_to_L3')[0]; td.innerHTML = '';
		createInfoArrow(td, 'arrow_EU_to_L3_val', 'right');
		element = $(this.parent).find('.arrow_EU_to_L3_val')[0];
		
	}
	
	
	/****************/
	/* HELP FUNCTIONS */
	/****************/
	function createArchitectutreUnit(parent, name, id, width, height) {

		var unitDiv = document.createElement('div');
		unitDiv.className = 'unitDiv'
		$(unitDiv).addClass(id);
		unitDiv.style.width = width;
		unitDiv.style.height = height;
		
		
		unitDiv.name = name;
		$(unitDiv).addClass(id);
		
		unitDiv.innerHTML = name;
		
		parent.appendChild(unitDiv);
		parent.style.width = width;

		return unitDiv;
	}

	function createInfoArrow(parent, spanId, direction) {
		//container:
		var infoArrowDiv = document.createElement('div');
		infoArrowDiv.className = 'infoArrowContainer';

		var lineDiv = document.createElement('div');
		lineDiv.className = 'horizontalArrowContainer';
		$(infoArrowDiv).append(lineDiv);

		var arrowHead = document.createElement('div');
		arrowHead.className = 'arrowHead_' + direction;
		$(infoArrowDiv).append(arrowHead);

		var infoSpan = document.createElement('div');
		infoSpan.className = 'infoArrowSpan';
		$(infoSpan).addClass(spanId);
		$(infoArrowDiv).append(infoSpan);

		parent.appendChild(infoArrowDiv);
	}

}

MemoryDiagram.prototype.setValues = function (unit_EU, unit_L1, unit_L2, unit_L3, unit_LLC, unit_DRAM, arrow_EU_L1,
											arrow_L1_L2, arrow_L2_L3, arrow_L3_LLC_up, arrow_LLC_DRAM_up, arrow_EU_L3) {
    
	if(this.architecture == 'hsw' || this.architecture == 'bdw'){

		//unit:
		//console.log(this.parent.innerHTML);
		var element;
		element = $(this.parent).find('.memoryArchitecture_Unit_EU_val')[0];
		element.innerHTML = element.name + '<br/>' + unit_EU;
		
		element = $(this.parent).find('.memoryArchitecture_Unit_L1_val')[0];
		element.innerHTML = element.name + '<br/>' + unit_L1;
		
		element = $(this.parent).find('.memoryArchitecture_Unit_L2_val')[0];
		element.innerHTML = element.name + '<br/>' + unit_L2;
		
		element = $(this.parent).find('.memoryArchitecture_Unit_L3_val')[0];
		element.innerHTML = element.name + '<br/>' + unit_L3;
		
		element = $(this.parent).find('.memoryArchitecture_Unit_LLC_val')[0];
		element.innerHTML = element.name + '<br/>' + unit_LLC;
		
		element = $(this.parent).find('.memoryArchitecture_Unit_DRAM_val')[0];
		element.innerHTML = element.name + '<br/>' + unit_DRAM;
		
        //arrows:
		element = $(this.parent).find('.arrow_EU_to_L1_val')[0];
		element.innerHTML = arrow_EU_L1;
		
		element = $(this.parent).find('.arrow_L1_to_L2_val')[0];
		element.innerHTML = arrow_L1_L2;
		
		element = $(this.parent).find('.arrow_L2_to_L3_val')[0];
		element.innerHTML = arrow_L2_L3;
		
		element = $(this.parent).find('.arrow_L3_to_LLC_up_val')[0];
		element.innerHTML = arrow_L3_LLC_up;
		
		element = $(this.parent).find('.arrow_LLC_to_DRAM_up_val')[0];
		element.innerHTML = arrow_LLC_DRAM_up;
		
		element = $(this.parent).find('.arrow_EU_to_L3_val')[0];
		element.innerHTML = arrow_EU_L3;
		
	}
	
	
	
	
	
	
}



/*****************************************/
/* TRANSITION LIST */
/*****************************************/
function TransitionList(container, componentHeight, navControls, navEffect, listClass, navSpeed, reportsDefaultClass, onReportLoadFunc, onReportDisposeFunc, additionalFixedHeight) {

    this.container = container;
    this.navSpeed = navSpeed;
    this.reportsDefaultClass = reportsDefaultClass;
    this.lastLoaded = null;
    this.toDisposeNext = null;
    this.onReportLoadFunc = onReportLoadFunc;
    this.onReportDisposeFunc = onReportDisposeFunc;
	this.componentHeight = componentHeight;
	this.blockAnimation = false;
	this.additionalFixedHeight = additionalFixedHeight;
	if(this.additionalFixedHeight == null || this.additionalFixedHeight == ''){
		this.additionalFixedHeight = 0;
	}

    //elements:
    this.component = document.createElement('div');
	this.component.style.position = 'relative';
	//this.component.style.background = 'red';
	this.component.style.overflow = 'hidden';
	this.component.style.overflowY = 'auto';//todo: test.
	this.component.style.width = '100%';
	this.component.style.height = '300px';
	//]]this.component.style.background = 'yellow';
	
	if (container) {
        container.appendChild(this.component);
    }
	
	if(componentHeight != '100%'){
		this.component.style.height = componentHeight;
	}
	else{ //do a 100% height completion:
		window.addEventListener('resize', function (event) {
			resizeToFillContainerHeight();
		});
		
		var self = this;
		function resizeToFillContainerHeight() {
			var containerObj = $(self.container);
			var containerTopOffset = containerObj.offset().top;
			var componentTopOffset = $(self.component).offset().top;
			var newHeight = containerObj.height() - Math.abs(componentTopOffset - containerTopOffset) - 5;//todo: need the -5?
			$(self.component).css({ 'height': (newHeight + self.additionalFixedHeight) + 'px' });
			//console.log('resizing component to ' + newHeight + ',    containerObj.topOffset=' + containerTopOffset +  ',    my.topOffset=' + componentTopOffset + '   containerObj.height() =' + containerObj.height() );
			//todo: unregister this.
		}
		resizeToFillContainerHeight();
	}

	
    this.itemsList = document.createElement('ul');
    this.itemsList.className = listClass;
    $(this.component).append(this.itemsList);
    this.items = this.itemsList.children; //component.querySelector( 'ul.itemwrap' ).children,

    this.current = 0;
    this.itemsCount = this.items.length;

    if (navControls) {
        this.nav = this.component.querySelector('nav');
        this.navNext = this.nav.querySelector('.next');
        this.navPrev = this.nav.querySelector('.prev');
        var self = this;
        this.navNext.addEventListener('click', function (ev) { ev.preventDefault(); self.navigate('next'); });
        this.navPrev.addEventListener('click', function (ev) { ev.preventDefault(); self.navigate('prev'); });
        this.showNav();
    }
  //  else {
  //      this.hideNav();
  //  }

    this.isAnimating = false;
    this.changeEffect(navEffect); //fxPressAwayFAST

}

TransitionList.prototype.addReportToList = function (id) {

    var listItem = document.createElement('li');
    listItem.id = id;

    this.updateItemsCount();
    if (this.itemsCount == 0) {
        $(listItem).addClass('transitionListItemContainerActive');
    }
	else{
		listItem.style.display = 'none';
	}
    $(listItem).addClass(this.reportsDefaultClass);

    $(this.itemsList).append(listItem);
    this.updateItemsCount();

    return listItem;
}

TransitionList.prototype.updateItemsCount = function () {
    this.itemsCount = this.items.length;
}

TransitionList.prototype.hideNav = function () {
    if (this.nav) {
        this.nav.style.display = 'none';
    }
}

TransitionList.prototype.showNav = function () {
    if (this.nav) {
        this.nav.style.display = 'block';
    }
}

TransitionList.prototype.changeEffect = function (effectName) {
    this.component.className = this.component.className.replace(/\bfx.*?\b/g, '');
    $(this.component).addClass(effectName);
    this.navEffect = effectName;
}

TransitionList.prototype.navigate = function (dir) {

    if (!dir) {
        dir = 'prev';
    }
    if (this.isAnimating || this.itemsCount == 0) return false;
    this.isAnimating = true;
    this.cntAnims = 0;

    var currentItem = this.items[this.current];

    if (dir === 'next') {
        this.current = this.current < this.itemsCount - 1 ? this.current + 1 : 0;
    }
    else if (dir === 'prev') {
        this.current = this.current > 0 ? this.current - 1 : this.itemsCount - 1;
    }

    var nextItem = this.items[this.current];
    this.setTransitionAnimation(this, currentItem, nextItem, dir);
}

TransitionList.prototype.switchTo = function (id, direction) {
    if (this.isAnimating || this.itemsCount == 0) return false;

    this.cntAnims = 0;
    var dir = 'next';
    if(direction){
        dir = direction;
    }

    var currentItem = this.items[this.current];
    var nextItem = document.getElementById(id);
    this.current = $('#' + id).index();

    if (currentItem == nextItem) {
        return;
    }
    this.isAnimating = true;
    this.setTransitionAnimation(this, currentItem, nextItem, dir);
	
	
	//console.log('currentCount = ' + $(this.component).find('.transitionListItemContainer.current').length);
	
}

TransitionList.prototype.raiseDisposeEvent = function (id) {
    if (!id) {
        id = this.items[this.current].id;
    }
    if (typeof this.onReportDisposeFunc == 'function') {
        this.onReportDisposeFunc(id);
    }
}

TransitionList.prototype.setTransitionAnimation = function (thisObj, currentItem, nextItem, dir) {
    var onEndAnimationCurrentItem = function () {
        currentItem.removeEventListener(currentItem.animEndEventName, onEndAnimationCurrentItem);
		$(currentItem).removeClass('transitionListItemContainerActive');
        $(currentItem).addClass('transitionListItemContainer');
        $(currentItem).removeClass(dir != 'next' ? 'navOutNext' : 'navOutPrev');
        ++thisObj.cntAnims;
        if (thisObj.cntAnims === 2) {
            thisObj.isAnimating = false;

			document.getElementById(thisObj.toDisposeNext).style.display = 'none';
			
            if (typeof thisObj.onReportDisposeFunc == 'function') {
                thisObj.onReportDisposeFunc(thisObj.toDisposeNext);
            }
			
        }
    }

    var onEndAnimationNextItem = function () {
        nextItem.removeEventListener(nextItem.animEndEventName, onEndAnimationNextItem);
        $(nextItem).addClass( 'transitionListItemContainerActive');
        $(nextItem).removeClass(dir != 'next' ? 'navInNext' : 'navInPrev');
        ++thisObj.cntAnims;
        if (thisObj.cntAnims === 2) {
            thisObj.isAnimating = false;

			document.getElementById(thisObj.toDisposeNext).style.display = 'none';
			
            if (typeof thisObj.onReportDisposeFunc == 'function') {
                thisObj.onReportDisposeFunc(thisObj.toDisposeNext);
            }
			
			
        }
    }

	nextItem.style.display = '';
	
    if (support.animations) {
        currentItem.addEventListener(animEndEventName, onEndAnimationCurrentItem);
        nextItem.addEventListener(animEndEventName, onEndAnimationNextItem);
    }
    else {
        onEndAnimationCurrentItem();
        onEndAnimationNextItem();
    }

    this.lastLoaded = nextItem.id;
    this.toDisposeNext = currentItem.id;
	
    if (typeof this.onReportLoadFunc == 'function') {
		appendLoadingMessage(thisObj.component);
		setTimeout(function(){
			thisObj.onReportLoadFunc(nextItem.id);
			removeLoadingMessage(thisObj.component);
			animatePageTransition();
		}, 1);
    }
	else{
		animatePageTransition();
	}

	function animatePageTransition(){
		if(thisObj.blockAnimation == true){
			onEndAnimationCurrentItem();
			onEndAnimationNextItem();
		}
		else{
			$(currentItem).addClass(dir != 'next' ? 'navOutNext' : 'navOutPrev');
			$(nextItem).addClass(dir != 'next' ? 'navInNext' : 'navInPrev');
		}
	}
}

TransitionList.prototype.callLoadOnFirstItem = function () {
	var items = this.itemsList.children;
	if(items.length <= 0){
		return null;
	}
	
	if (typeof this.onReportLoadFunc == 'function') {
		var id = items[0].id;
        this.onReportLoadFunc(id);
		return id;
    }
	
	
	
}

TransitionList.prototype.getCurrentItem = function () {
	if(this.items.length <=0){
		return null;
	}
	return this.items[this.current];
}



/*****************************************/
/* ToolTip Menu */
/*****************************************/
/**
 * cbpTooltipMenu.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2013, Codrops
 * http://www.codrops.com
 */
;( function( window ) {
	
	'use strict';

	var document = window.document,
		docElem = document.documentElement;

	function extend( a, b ) {
		for( var key in b ) { 
			if( b.hasOwnProperty( key ) ) {
				a[key] = b[key];
			}
		}
		return a;
	}

	// from https://github.com/ryanve/response.js/blob/master/response.js
	function getViewportH() {
		var client = docElem['clientHeight'],
			inner = window['innerHeight'];
		if( client < inner )
			return inner;
		else
			return client;
	}

	function getOffset( el ) {
		return el.getBoundingClientRect();
	}

	function isMouseLeaveOrEnter(e, handler) { 
		if (e.type != 'mouseout' && e.type != 'mouseover') return false; 
		var reltg = e.relatedTarget ? e.relatedTarget : 
		e.type == 'mouseout' ? e.toElement : e.fromElement; 
		while (reltg && reltg != handler) reltg = reltg.parentNode; 
		return (reltg != handler); 
	}

	function cbpTooltipMenu( el, options ) {	
		this.el = el;
		this.options = extend( this.defaults, options );
		this._init();
	}

	cbpTooltipMenu.prototype = {
		defaults : {
			// add a timeout to avoid the menu to open instantly
			delayMenu : 100
		},
		_init : function() {
			this.touch = Modernizr.touch;
			//this.menuItems = document.querySelectorAll( '#' + this.el.id + ' > .mainMenuItem' );
			this.menuItems =this.el.getElementsByClassName('mainMenuItem');
			this._initEvents();
		},
		_initEvents : function() {
			
			var self = this;

			Array.prototype.slice.call( this.menuItems ).forEach( function( el, i ) {
				var trigger = el.querySelector( 'a' );
				if( self.touch ) {
					trigger.addEventListener( 'click', function( ev ) { self._handleClick( this, ev ); } );
				}
				else {
					trigger.addEventListener( 'click', function( ev ) {
						if( this.parentNode.querySelector( 'ul.mainMenuSubMenu' ) ) {
							ev.preventDefault();
						}
					} );
					el.addEventListener( 'mouseover', function(ev) { if( isMouseLeaveOrEnter( ev, this ) ) self._openMenu( this ); } );
					el.addEventListener( 'mouseout', function(ev) { if( isMouseLeaveOrEnter( ev, this ) ) self._closeMenu( this ); } );
				}
			} );

		},
		_openMenu : function( el ) {

			var self = this;
			clearTimeout( this.omtimeout );
			this.omtimeout = setTimeout( function() {
				var submenu = el.querySelector( 'ul.mainMenuSubMenu' );

				if( submenu ) {
					el.className += ' cbp-tm-show';
					if( self._positionMenu( el ) === 'top' ) {
						el.className += ' cbp-tm-show-above';
					}
					else {
						el.className += ' cbp-tm-show-below';
					}
				}
			}, this.touch ? 0 : this.options.delayMenu );

		},
		_closeMenu : function( el ) {
			
			clearTimeout( this.omtimeout );

			var submenu = el.querySelector( 'ul.mainMenuSubMenu' );

			if( submenu ) {
				el.className = el.className.replace(new RegExp("(^|\\s+)" + "cbp-tm-show" + "(\\s+|$)"), ' ');
				el.className = el.className.replace(new RegExp("(^|\\s+)" + "cbp-tm-show-below" + "(\\s+|$)"), ' ');
				el.className = el.className.replace(new RegExp("(^|\\s+)" + "cbp-tm-show-above" + "(\\s+|$)"), ' ');
			}

		},
		_handleClick : function( el, ev ) {
			var item = el.parentNode,
				items = Array.prototype.slice.call( this.menuItems ),
				submenu = item.querySelector( 'ul.mainMenuSubMenu' )

			// first close any opened one..
			if( typeof this.current !== 'undefined' &&  items.indexOf( item ) !== this.current ) {
				this._closeMenu( this.el.children[ this.current ] );
				this.el.children[ this.current ].querySelector( 'ul.mainMenuSubMenu' ).setAttribute( 'data-open', 'false' );
			}

			if( submenu ) {
				ev.preventDefault();

				var isOpen = submenu.getAttribute( 'data-open' );

				if( isOpen === 'true' ) {
					this._closeMenu( item );
					submenu.setAttribute( 'data-open', 'false' );
				}
				else {
					this._openMenu( item );
					this.current = items.indexOf( item );
					submenu.setAttribute( 'data-open', 'true' );
				}
			}

		},
		_positionMenu : function( el ) {
			// checking where's more space left in the viewport: above or below the element
			var vH = getViewportH(),
				ot = getOffset(el),
				spaceUp = ot.top ,
				spaceDown = vH - spaceUp - el.offsetHeight;
			
			return ( spaceDown <= spaceUp ? 'top' : 'bottom' );
		}
	}

	// add to global namespace
	window.cbpTooltipMenu = cbpTooltipMenu;

} )( window );



/*****************************************/
/* TIPS & NOTIFICATION FUNCTIONALITIES */
/*****************************************/
function addNewTip(title, description, icon, onClickFunc, tipID){
	//append new tip item to tipsList:
	var li = document.createElement('li');
	li.className = 'tipItem';
	if (typeof onClickFunc == 'function') {
		li.onclick = function(){
			//dismiss active tip:
			dismissActiveTip();
			//call the tips custom onClick function:
			onClickFunc();
		}
	}
	
	//icon: todo.
	var iconSpan = document.createElement('span');
	iconSpan.className = 'ui-icon ui-icon-alert';
	li.appendChild(iconSpan);
		
	li.innerHTML += '<strong>'+title+'</strong>' + '<p>' + description + '</p>';
	
	tipsList.appendChild(li);
	//console.log(tipsList.innerHTML);
	
	//if this is the first tip, then show and animate the tips button :
	var currentTipCount = $(tipsList).find('.tipItem').length;
	//console.log(currentTipCount);
	if(currentTipCount > 0){
		$(tipsButton).addClass('cbutton--click');
		$(tipsButton).fadeIn(600);
	}
	tipsButton.innerHTML = currentTipCount;
}

function ClearTips(){
	$(tipsList).empty();
}

function showTips(){
    $('#tipsContainer').show();
    tipsWindowOpen = true;
    $('#tailShadow').show();
    $('#tail1').show(); 
}

function hideTips(){
    $('#tipsContainer').hide();
    tipsWindowOpen = false;
    $('#tailShadow').hide();
    $('#tail1').hide(); 
}   

function toggleTips(){
    $('#tipsContainer').toggle('fade', 100);
    $('#tailShadow').toggle('fade', 100);
    $('#tail1').toggle('fade', 100);
    tipsWindowOpen = !tipsWindowOpen;
}

function showNotificationCenterScreen(notificationText) {
    ShowNotification(notificationText, 300, 300, 0);
}

function ShowNotification(contentHTML, offsetTop, offsetLeft, hideAfter) {

    //build notification object:
    var notification = new NotificationFx({
        message: contentHTML,
        layout: 'growl',
        effect: 'scale',
        type: 'notice', // notice, warning, error or success
        wrapper: document.getElementById('st-pusher'),
        ttl: hideAfter,
        onClose: function () {
            activeTipNotificationInstance = null;
            dismissActiveTip();
        }
    });

    activeTipNotificationInstance = notification;

    //display and set location:
    notification.show();
    $(notification.ntf).css('top', offsetTop);
    $(notification.ntf).css('left', offsetLeft);

    //make it draggable:
    $(notification.ntf).draggable({
        containment: "#mainReportsContainer",
        stack: ".drag",
        axis: "xy",
        //drag: function () {}
    });

}

function dismissActiveTip() {
    if (activeTipNotificationInstance != null) {
        activeTipNotificationInstance.dismiss(true);
        activeTipNotificationInstance = null;
    }
    if (activeTipHighlightedRows != null && activeTipHighlightedRows.length != 0) {
        var len = activeTipHighlightedRows.length;
        for (var i = 0; i < len; i++) {
            if (activeTipHighlightedRows[i] != null) {
                activeTipHighlightedRows[i].style.background = '';
            }
        }
        activeTipHighlightedRows.length = 0; //clear list.
    }

    if (activeTipFilteredDatatableInstance != null) {
        //step5: clear the search box and redraw the page:
        activeTipFilteredDatatableInstance.search('').draw();
        activeTipFilteredDatatableInstance = null;
    }
}



/*****************************************/
/* TIPS & NOTIFICATION FUNCTIONALITIES */
/*****************************************/
function openOverlayLayout(width, height, closable, onCloseFunction, mainParent, disableBackground, addBackButtonForClosing){
	var backgroundDisabler = document.createElement('div');
	backgroundDisabler.className = 'backgroundDisabler';
	$(backgroundDisabler);//.hide().fadeIn(60);
	
	if(disableBackground != false){
		document.body.appendChild(backgroundDisabler);
	}
	
	var overlayDiv = document.createElement('div');
	overlayDiv.className = 'overlayDiv';
	overlayDiv.style.width = width;
	overlayDiv.style.height = height;
	overlayDiv.backgroundDisabler = backgroundDisabler;
	
	if(height == '100%' && width == '100%'){
		overlayDiv.className += ' fullscreen-overlayDiv';
		overlayDiv.style.minWidth = $(document.body).css('min-width');
		overlayDiv.style.minHeight = $(document.body).css('min-height');
	}
	$(overlayDiv).hide().fadeIn(100);
	//document.body.appendChild(overlayDiv);
	backgroundDisabler.appendChild(overlayDiv);
	
	var closeButton;
	if(addBackButtonForClosing == true){
		closeButton = document.createElement('img');
		closeButton.className = 'overlayDivCloseButton backButton_image';
		//closeButton.innerHTML = 'x';
		closeButton.src = filesBaseDir + "/resources/back_with_text.png";
		closeButton.style.width = '58px';
		closeButton.style.height = '16px';
	}
	else{
		closeButton = document.createElement('div');
		closeButton.className = 'overlayDivCloseButton';
		closeButton.innerHTML = 'x';
	}
	
	closeButton.style.zIndex = '1000';
	closeButton.onclick = function(){
		if (typeof onCloseFunction == 'function') {
                onCloseFunction();
            }
		closeOverlayLayout(overlayDiv);
	};
	
	if(closable != null && closable == true){
		overlayDiv.appendChild(closeButton);
	}
	
	return overlayDiv;
}

function closeOverlayLayout(element){
	if(element != null){
		if(element.backgroundDisabler != null){
			$(element.backgroundDisabler).remove();
		}
		$(element).remove();
	}
}



/*****************************************/
/* notificationFx functionality */
/*****************************************/
/**
 * notificationFx.js v1.0.0
 * http://www.codrops.com
 *
 * Licensed under the MIT license.
 * http://www.opensource.org/licenses/mit-license.php
 * 
 * Copyright 2014, Codrops
 * http://www.codrops.com
 */
; (function (window) {

    function extend(a, b) {
        for (var key in b) {
            if (b.hasOwnProperty(key)) {
                a[key] = b[key];
            }
        }
        return a;
    }

    function NotificationFx(options) {
        this.options = extend({}, this.options);
        extend(this.options, options);
        this._init();
    }

    NotificationFx.prototype.options = {
        wrapper: document.body,
        message: '...',
        layout: 'growl',
        effect: 'slide',
        type: 'error',
        ttl: 6000,
        onClose: function () { return false; },
        onOpen: function () { return false; }
    }

    NotificationFx.prototype._init = function () {
        // create HTML structure
        this.ntf = document.createElement('div');
        this.ntf.className = 'ns-box ns-' + this.options.layout + ' ns-effect-' + this.options.effect + ' ns-type-' + this.options.type;
        var strinner = '<div class="ns-box-inner">';
        strinner += this.options.message;
        strinner += '</div>';
        strinner += '<span class="ns-close"></span></div>';
        this.ntf.innerHTML = strinner;

        // append to body or the element specified in options.wrapper
        this.options.wrapper.insertBefore(this.ntf, this.options.wrapper.firstChild);

        // dismiss after [options.ttl]ms ONLY IF options.ttl IS POSITIVE.
        if (this.options.ttl > 0) {
            var self = this;
            this.dismissttl = setTimeout(function () {
                if (self.active) {
                    self.dismiss();
                }
            }, this.options.ttl);
        }

        // init events
        this._initEvents();

    }

    NotificationFx.prototype._initEvents = function () {
        var self = this;
        // dismiss notification
        this.ntf.querySelector('.ns-close').addEventListener('click', function () { self.dismiss(); });
    }

    NotificationFx.prototype.show = function () {
        this.active = true;
        $(this.ntf).removeClass('ns-hide');
        $(this.ntf).addClass('ns-show');
        this.options.onOpen();
    }

    NotificationFx.prototype.dismiss = function (noCallBack) {
        var self = this;
        this.active = false;
        clearTimeout(this.dismissttl);
        $(this.ntf).removeClass('ns-show');
        setTimeout(function () {
            $(self.ntf).addClass('ns-hide');

            // callback
            if (!noCallBack) {
                self.options.onClose();
            }
        }, 25);

        // after animation ends remove ntf from the DOM
        var onEndAnimationFn = function (ev) {
            if (support.animations) {
                if (ev.target !== self.ntf) return false;
                this.removeEventListener(animEndEventName, onEndAnimationFn);
            }
            self.options.wrapper.removeChild(this);
        };

        if (support.animations) {
            this.ntf.addEventListener(animEndEventName, onEndAnimationFn);
        }
        else {
            onEndAnimationFn();
        }
    }

    window.NotificationFx = NotificationFx;

})(window);



/*****************************************/
/* Extensions */
/*****************************************/
if (typeof String.prototype.startsWith != 'function') {
  // see below for better implementation!
  String.prototype.startsWith = function (str){
    return this.indexOf(str) === 0;
  };
}



function loadApiCallsReport(reportItem, apiCalls){
	
	/*****************************************/
	/* Building report structure */
	/*****************************************/
	//basics:
	if(!apiCalls.lastState){
		apiCalls.lastState = { 'activePage': null };
	}
	
	var vm = new ViewMode(reportItem, 140, 'Api Calls:', 'reportTitle');
	reportItem.appendChild(CreateSeperator('100%', null, '5px'));
	var tl = new TransitionList(reportItem, '100%', false, 'fxPressAwayFAST', '', 400, 'transitionListItemContainer', onPageLoad, onPageDispose, 0);
	
	//ids:
	var vm1_id = 'hostProf_apiCalls_tableView', page1_id = 'hostProf_apiCalls_tablePage';
	var vm2_id = 'hostProf_apiCalls_graphView', page2_id = 'hostProf_apiCalls_graphPage';
	var mainDataTable_id = 'hostProf_apiCalls_tableView_table';
	
	
	//create pages:
	if(apiCalls.table){
		vm.add(vm1_id, 'Data Table', function () { tl.switchTo(page1_id); });
		var page1 = tl.addReportToList(page1_id);
		page1.loadingFunc = function(){ 
			if( $(page1).is(':empty') ) {
				buildApiCallsTable(apiCalls.table, page1);
			}
		};
		
		//last state:
		if(apiCalls.lastState && apiCalls.lastState.activePage == page1_id){
			page1.loadingFunc();
		}
	}
	
	if(apiCalls.graph){
		vm.add(vm2_id, 'Graphical View', function () { tl.switchTo(page2_id); });
		var page2 = tl.addReportToList(page2_id);
		page2.loadingFunc = function(){
			if( $(page2).is(':empty') ) {
				buildApiCallsGraph(apiCalls.graph, page2);
			}
		};
		
		//last state:
		if(apiCalls.lastState && apiCalls.lastState.activePage == page2_id){
			vm.setFocusOn(vm2_id);
		}
	}

	//if no last-state set yet, set it to be the first:
	if(apiCalls.lastState.activePage == null && tl.itemsCount > 0){
		//apiCalls.lastState = { 'activePage': null };
		var firstPageId = tl.callLoadOnFirstItem();
		apiCalls.lastState.activePage = firstPageId;
	}
	
	
	//build tips:
	if(apiCalls.tips){
		buildApiCallsTips(apiCalls.tips);
	}
	
	
	
	
	/*****************************************/
	/* Load / Dispose functions */
	/*****************************************/
	function onPageLoad(id){
		//console.log('inner load: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			//appendCriticalErrorMessage(parent , "Error: unable to find report!");
			alert("Error: unable to find report!");
			return;
		}
		apiCalls.lastState.activePage = id;
		
		//call it's loading function (if it has any):
		if (typeof page.loadingFunc == 'function') {
			page.loadingFunc();
		}
		else{
			console.log('no loading function found for ' + id);
		}
		
	}
	
	function onPageDispose(id){
		//console.log('inner dispose: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			alert("Error: unable to find report!");
			return;
		}
		
		if(id == page1_id){
			apiCalls.lastState.tableView = {'tableState': null};
		}
		
		if(id == page2_id){
			//get graph's last state:
			if(page.objectsMap && page.objectsMap.graph != null){
				var graphLastState = page.objectsMap.graph.getState();
				apiCalls.lastState.graphView = {'graphState': graphLastState};
			}
		}
		
		//$(page).empty();
	}
	
	reportItem.onItemDispose = function(){
		var activePage = tl.getCurrentItem();
		onPageDispose(activePage.id);
	}
	
	
	
	/*****************************************/
	/* Build page1 - table view */
	/*****************************************/
	function buildApiCallsTable(pageData, parent) {
		//spcial handling for bad datatable plug-in margin in IE:
		if(browserInfo.isIE == true){
			$(parent).addClass('IEmode');
		}
		
		//special handling for bad datatable plug-in body-height in Chrome:
		if(browserInfo.isChrome == true){
			parent.style.overflowY = 'hidden';
		}
		
		var id = mainDataTable_id;
		var OCLObjects = [];
		
		
		//get the oclObjects info:
		$.ajax({
			url: apiCalls.oclObjects.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				OCLObjects = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				OCLObjects = [];
			}
		});
		
		
		//transition list height binding to window size:
		window.addEventListener('resize', function (event) {
			resizeTableToFitScreen();
		});
		
		function resizeTableToFitScreen(){
			var scrollBodies = $(parent).find('.dataTables_scrollBody');
			if (scrollBodies != null && scrollBodies.length > 0) {
				$(scrollBodies[0]).css('height', ($(parent).height() - 51));
			}
    
		}
		
		$('<table id="' + id + '" class="display "/>').appendTo(parent);
		var dataTableObj = $('#' + id).DataTable(
		{
			"ajax": pageData.source,
			"columns":
			[
				{
					"title": "",
					"defaultContent": "+",
					"searchable": false,
					"className": 'details-control',
					"orderable": false,
				},
				{
					"title": "Api Name",
					"data": "apiName"
				},
				{
					"title": "Count",
					"data": "count"
				},
				{
					"title": "# Errors",
					"data": "errorsCount",
					"render": function (data) {
						if (data == '0') {
							return data;
						}
						return '<span class="errorCodeFailed">' + data + '</span>';
					}
				},
				{
					"title": "Total Duration (µs)",
					"data": "totalTime"
				},
				{
					"title": "Avg Duration (µs)",
					"data": "avgDuration"
				},
				{
					"title": "Min Duration (µs)",
					"data": "minDuration"
				},
				{
					"title": "Max Duration (µs)",
					"data": "maxDuration"
				}
			],
			"order": [[1, 'asc']],
			//"bLengthChange": false,
			//"bFilter": false,
			"bInfo": false,
			//"aLengthMenu": [10],
			"scrollY": "auto",
			"sScrollX": "100%",
			"bPaginate": false,
			"bSortClasses": false,
			"language": { "emptyTable": "no records available." }
		});
		
		//$('#' + id).css({ 'min-width': '800px' });
		resizeTableToFitScreen();

		// Add event listener for opening and closing details
		$('#' + id + ' tbody').on('click', 'td.details-control', function () {
		
			var tr = $(this).closest('tr');
			var row = dataTableObj.row(tr);

			if (row.child.isShown()) {
				// This row is already open - close it
				row.child.hide();
				row.child.remove();
				RowDetailsHidden($(this));
			}
			else {
				// Open this row
				child = createRowDetails(row, row.data());
				child.show();
				RowDetailsShown($(this));
			}

		});
		
		function createRowDetails(row, rowData) {
			div = document.createElement('div');
			div.style.background = '#bfc7ce';
			div.style.height = '198px';
			div.style.minHeight = '198px';
			div.style.maxHeight = '198px';
			div.style.paddingLeft = '0px';
			div.style.overflow = 'auto';
			div.style.overflowY = 'hidden';
			child = row.child(div);

			tableLayout = document.createElement('table');
			tableLayout.style.width = '100%';
			tr = tableLayout.insertRow();

			cell_datatable = tr.insertCell();
			cell_datatable.style.width = '70%';
			cell_datatable.style.minWidth = '500px';
			cell_datatable.style.paddingBottom = '0px';

			cell_graph = tr.insertCell();
			$(div).append(tableLayout);

			tableContainer = document.createElement('div');
			tableContainer.style.background = '#fcfcfc';
			tableContainer.style.marginRight = '5px';
			tableContainer.style.marginTop = '15px';
			$(cell_datatable).append(tableContainer);

			table = document.createElement('table');
			table.className = 'display'; //apiTraceTable
			$(tableContainer).append(table);
			table.rowData = rowData;
			
			var detailsTableObj = $(table).DataTable({

				"ajax": rowData.details,
				"columns":
				[
					{
						"title": "Arguments",
						"defaultContent": "[...]",
						"searchable": false,
						"className": 'apiCallsDetails-args',
						"orderable": false,
					},
					{
						"title": "Error Code",
						"data": "errorCode",
						"render": function (data, type, row) {
							//formate error code:
							var formattedData = '<span class="';
							if (data == 'CL_SUCCESS') {
								formattedData += 'errorCodeSuccess';
							}
							else {
								formattedData += 'errorCodeFailed';
							}
							formattedData += '">' + data + '</span>';
							return formattedData;
						}
					},
					{
						"title": "Return Value",
						"data": "returnValue",
						"render": function (data, type, row) {
							//formate error code:
							if (data == '') {
								data = row.errorCode;
								var formattedData = '<span class="';
								if (data == 'CL_SUCCESS') {
									formattedData += 'errorCodeSuccess';
								}
								else {
									formattedData += 'errorCodeFailed';
								}
								formattedData += '">' + data + '</span>';
								return formattedData;
							}                        
							
							var objInfoTooltip = '';
							var len = OCLObjects.length;
							for (var n = 0; n < len; n++) {
								if (OCLObjects[n].name == data) {
									oclObjInfo = OCLObjects[n].info;
									var len = oclObjInfo.length;
									for (var j = 0; j < len; j++) {
										if (j != 0) {
											objInfoTooltip += '\n';
										}
										objInfoTooltip += oclObjInfo[j][0] + ': ' + oclObjInfo[j][1];
									}
									break;
								}
							}
							if (objInfoTooltip != '') {
								return '<span class="linkableArgToOclObj" title="' + objInfoTooltip + '">' + data + '</span>';
							}
							return data;
						}
					},
					{
						"title": "Duration (µs)",
						"data": "duration"
					},
					{
						"title": "Start Time (ticks)",
						"data": "startTick"
					},
					{
						"title": "End Time (ticks)",
						"data": "endTick"
					}
				],
				"order": [[4, 'asc']],
				"bSortClasses": false,
				"scrollY": "100px",
				"bDeferRender": true,
				"processing": true,
				"serverSide": false,
				//"sScrollX": "100%",
				//"deferRender": true,
				//"bPaginate": false,
				//"bInfo": false,
				//"aLengthMenu": [3],
				"fnCreatedRow": function (nRow, rowData, iDataIndex) {
					//bind click to arguments view:
					$(nRow).find('td.apiCallsDetails-args').on('click', function () {
						var innerTable = $(nRow).closest('.dataTable');
						var row = $(innerTable).DataTable().row(nRow);

						if (row.child.isShown()) {
							// This row is already open - close it
							row.child.hide();
							row.child.remove();
						}
						else {
							function getOclObjInfoFor(objName) {
								var len = OCLObjects.length;
								for (var n = 0; n < len; n++) {
									if (OCLObjects[n].name == objName) {
										return OCLObjects[n].info;
									}
								}
								return null;
							}

							// Open this row
							div = document.createElement('div');
							div.style.background = '#bfc7ce';
							div.style.paddingLeft = '0px';
							child = row.child(div);

							var arguments = row.data().arguments;
							var argumentsTable = document.createElement('table');
							argumentsTable.style.width = '100%';
							var argsLen = arguments.length;
							for (var i = 0; i < argsLen; i++) {
								//create args table:
								argumentsTableRow = argumentsTable.insertRow();
								td = argumentsTableRow.insertCell();
								td.innerHTML = arguments[i][0] + ':';
								td = argumentsTableRow.insertCell();
								argValue = arguments[i][1];
								td.innerHTML = argValue;

								//if it is related to an OCL object:
								var oclObjInfo = getOclObjInfoFor(argValue);
								if (oclObjInfo != null) {
									//create tooltip:
									var objInfoTooltip = '';
									var len = oclObjInfo.length;
									for (var j = 0; j < len; j++) {
										if (j != 0) {
											objInfoTooltip += '\n';
										}
										objInfoTooltip += oclObjInfo[j][0] + ': ' + oclObjInfo[j][1];
									}
									td.title = objInfoTooltip;
									td.className = 'linkableArgToOclObj';
								}
							}
							$(div).append(argumentsTable);

							child.show();
						}

					});

					//bind mouse hover to arguments tooltip:
					$(nRow).find('td.apiCallsDetails-args').each(function (index, td) {
						var arguments = rowData.arguments;
						var toolTip = '';
						for (var i = 0; i < arguments.length; i++) {
							if (i != 0) {
								toolTip += '\n';
							}
							toolTip += arguments[i][0] + ': ' + arguments[i][1];
						}
						td.title = toolTip;
					});

					//highlight row if it's related to the active tip:
					var currentRowIndex = $($(nRow).closest('.dataTable')).DataTable().row(nRow).index().selector.rows._DT_RowIndex;
					if (ActiveTipInfo!= null && ActiveTipInfo.TableToHighlight == '' || ActiveTipInfo.TableToHighlight == table.id) {
						if (ActiveTipInfo.LinesToHighlight == null || ActiveTipInfo.LinesToHighlight.indexOf(currentRowIndex) != -1) {
							highlightJavascriptElement(nRow);
							activeTipHighlightedRows.push(nRow);
						}
					}

				},
				"fnInitComplete": function (oSettings, json) {
					//create bars-chart:
					cell_graph.className = 'cell_detailesGraph';
					graphContainer = document.createElement('div');
					graphContainer.style.width = '100%';
					graphContainer.style.height = '180px';
					graphContainer.style.position = 'relative';
					$(cell_graph).append(graphContainer);

					createGraphFromTableData(graphContainer, json.data, 'duration');
				}
			});

			// Add resize listener:
			$(table).resize(function () {
				detailsTableObj.columns.adjust();
			});

			return child;
		}


	}

	
	
	/*****************************************/
	/* Build page2 - graph view */
	/*****************************************/
	function buildApiCallsGraph(pageData, parent){
		//objects map:
		parent.objectsMap = {};
		
		//read graph data:
		$.ajax({
			url: pageData.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (graphData) {
				//build graph:
				var graphContainer = document.createElement('div');
				graphContainer.className = 'apiCallsGraphContainer';
				parent.appendChild(graphContainer);
				
				var graph = new Graph(graphContainer);
				graph.setData(graphData.datasets);
				graph.setOptions(graphData.options);
				graph.Render();
				
				//save reference:
				parent.objectsMap.graph = graph;
				
				//apply last state (if there any):
				if(apiCalls.lastState.graphView && apiCalls.lastState.graphView.graphState != null){
					graph.applyState(apiCalls.lastState.graphView.graphState);
				}
			},
			error: function(jqxhr, statusText, errorThrown){
				appendCriticalErrorMessage(parent , "Error: unable to retrieve \"Api Calls graph\":<br/> \"" + errorThrown + "\".");
			}
		});
		
		
	
	}
	
	
	/*****************************************/
	/* Build ApiCalls Tips */
	/*****************************************/
	function buildApiCallsTips(pageData){
		
		var tipsData = [];
		
		//read graph data:
		$.ajax({
			url: pageData.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				tipsData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				alert('Warning: failed to read analysis tips: ' + errorThrown);
				tipsData = [];
			}
		});
		
		//build tips list:
		var len = tipsData.length;
		for(var i=0; i<len; i++) (function(i){
			var tipInfo = tipsData[i];
			
			var onClickFunc = null;
			if(tipInfo.onClickInfo != null){
				onClickFunc = function(){
					
					var notificationAnimationDelay = 0;
					
					//if the tip wants to filter by an ApiName:
					if(tipInfo.onClickInfo.apiName != null && tipInfo.onClickInfo.apiName != ''){
						
						//set ApiCalls report ViewMode Focus on DataTable page:
						notificationAnimationDelay = vm.setFocusOn(vm1_id);
						
						//filter table by the given apiName:
						FilterDatatable_singleColumn(mainDataTable_id, 1, tipInfo.onClickInfo.apiName);
						
						//set active tip & highlighting rows info: (this is needed to highlight the table without knowing it's id)
						setActiveTipInfo('', tipInfo.onClickInfo.innerRowsToHighlight);
						
						//expand row and show innerTable details: 
						expandDetailesForFirstFilteredRowInTable(mainDataTable_id);
						
						//get the id of the new inner table:
						var detailesTableID = getDetailesDataTableIDForFirstFilteredRow(mainDataTable_id);
						
						//set active tip & highlighting rows info: (this is needed to apply highlighting only to this innerTable)
						setActiveTipInfo(detailesTableID, tipInfo.onClickInfo.innerRowsToHighlight);
					}
					
					if(tipInfo.notification != null && tipInfo.notification != ''){
						setTimeout(function(){
							showNotificationCenterScreen(tipInfo.notification);
						}, notificationAnimationDelay);
					}
					
				}
			}
			
			addNewTip(tipInfo.title, tipInfo.description, tipInfo.icon, onClickFunc, tipInfo.tipID);
			
		})(i);
		
		
	}
	
}

function Graph(containerElement) {

    this.containerElement = containerElement;
    if (containerElement.id != null) {
        this.id = containerElement.id;
    }
    else{
        this.id = null;
    }
    this.plot = null;
    this.options = null;
    this.legendsDiv = null;
    this.placeholder = $(containerElement);
    this.isInitiated = false;
    this.navigationDiv = null;
    //graph data:
    this.data = null;
    this.xAxisTicks = null;
    this.yAxisTicks = null;
    this.xMin = null;
    this.xMax = null;
    this.yMin = null;
    this.yMax = null;
    //settings:
    this.xAxisName = "";
    this.yAxisName = "";
    this.animate = false;
    this.hoverable = true;
    this.clickable = true;
    this.xAxis_showTicks = false;
    this.yAxis_showTicks = false;
    this.userResizable = false;
    this.navigatable = true;
    this.horizontalGridlines = true;
    this.verticalGridlines = true;
    this.autoHighlight = true;
    //tracking functions:
    this.trackable = true;
    this.trackerMode = "x";
    this.trackerDiv = '';
    this.trackerFormatFunc = null;
    this.trackerDefaultMessage = 'hover over graph';
    this.updateLegendTimeout = null;
    this.latestPosition = null;
    //tooltip:
    this.showTooltip = true;
    this.previousPoint = null;
    this.previousLabel = null;
    //togglerDiv
    this.togglable = true;
    this.togglerDiv = '';
    //selection:
    this.selectable = true;
    this.zoomOnSelection = true;
    this.selectionMode = 'x';
    this.customSelectionFunc = null;
    this.lastSelectionState = null;
    this.blockSelectionCallbacks = false;
    //markers:
    this.markers = null;
    //zooming:
    this.zooming_xAxis_zoomable = false;
    this.zooming_xAxis_minimalZoom = 2;
    this.zooming_xAxis_maximalZoom = null;
    this.zooming_onLoad_xAxis_from = 0;
    this.zooming_onLoad_xAxis_to = 1;
    this.center_xAxis_ifElementsAreLessThan = null;
    this.zooming_yAxis_zoomable = false;
    this.zooming_yAxis_minimalZoom = 2;
    this.zooming_onLoad_yAxis_from = 0;
    this.zooming_onLoad_yAxis_to = 1;
    this.center_yAxis_ifElementsAreLessThan = null;
    //design:
    this.ticksRotationXaxis = 0;
    this.ticksTransformXaxis = 0;
    this.labelPadding_xAxis = 10;
    this.backgroundColor = { colors: ["#e7e7e7", "#ffffff"] };
	//last state:
	//this. lastState = {};
}

Graph.prototype.getState = function () {
	if (this.plot == null) {
		return {};
	}
	
	//this.saveSelectionLastState();
	
    var plotAxis = this.plot.getAxes();
    var state = {
        xMin: plotAxis.xaxis.options.min,
        xMax: plotAxis.xaxis.options.max,
        yMin: plotAxis.yaxis.options.min,
        yMax: plotAxis.yaxis.options.max,
        selection: this.lastSelectionState
    }
	
	return state;
}

Graph.prototype.applyState = function (state) {
	if (this.plot == null) {
		return;
	}
	
	//get axeses:
    var axes = this.plot.getAxes();
    var xaxis = axes.xaxis;
    var yaxis = axes.yaxis;
	
	//retrieve zooming position:
    xaxis.options.min = state.xMin;
    xaxis.options.max = state.xMax;
    yaxis.options.min = state.yMin;
    yaxis.options.max = state.yMax;
	
    //redraw the plot:
    this.plot.setupGrid();
    this.plot.draw();

	//set selection:
    if (state.selection != null) {
        this.plot.setSelection({
            xaxis: {
                from: state.selection.xFrom,
                to: state.selection.xTo
            },
            yaxis: {
                from: state.selection.yFrom,
                to: state.selection.yTo
            }
        });
    }
	
}

Graph.prototype.setData = function (dataObject) {
    this.data = dataObject.data;
    this.xAxisTicks = dataObject.xAxisTicks;
    this.yAxisTicks = dataObject.yAxisTicks;
    this.xMin = dataObject.xMin;
    this.xMax = dataObject.xMax;
    this.yMin = dataObject.yMin;
    this.yMax = dataObject.yMax;
}

Graph.prototype.setOptions = function (optionsObject) {

    this.xAxisName = optionsObject.xAxisName;
    this.yAxisName = optionsObject.yAxisName;
    this.xAxis_showTicks = optionsObject.xAxis_showTicks;
    this.yAxis_showTicks = optionsObject.yAxis_showTicks;
    this.animate = optionsObject.animate;
    this.hoverable = optionsObject.hoverable;
    this.clickable = optionsObject.clickable;
    this.navigatable = optionsObject.navigatable;
    this.horizontalGridlines = optionsObject.horizontalGridlines;
    this.verticalGridlines = optionsObject.verticalGridlines;
    this.autoHighlight = optionsObject.autoHighlight;
    this.showTooltip = optionsObject.showTooltip;
    this.selectable = optionsObject.selectable;
    this.zoomOnSelection = optionsObject.zoomOnSelection;
    this.selectionMode = optionsObject.selectionMode;
    this.markers = optionsObject.markers;
    this.trackable = optionsObject.trackable;
    this.trackerMode = optionsObject.trackerMode;
    this.trackerDiv = optionsObject.trackerDiv;
    this.trackerDefaultMessage = optionsObject.trackerDefaultMessage;
    this.togglable = optionsObject.togglable;
    this.togglerDiv = optionsObject.togglerDiv;
    this.zooming_xAxis_zoomable = optionsObject.zooming_xAxis_zoomable;
    this.zooming_xAxis_minimalZoom = optionsObject.zooming_xAxis_minimalZoom;
    this.zooming_xAxis_maximalZoom = optionsObject.zooming_xAxis_maximalZoom;
    this.zooming_onLoad_xAxis_from = optionsObject.zooming_onLoad_xAxis_from;
    this.zooming_onLoad_xAxis_to = optionsObject.zooming_onLoad_xAxis_to;
    this.center_xAxis_ifElementsAreLessThan = optionsObject.center_xAxis_ifElementsAreLessThan;
    this.zooming_yAxis_zoomable = optionsObject.zooming_yAxis_zoomable;
    this.zooming_yAxis_minimalZoom = optionsObject.zooming_yAxis_minimalZoom;
    this.zooming_onLoad_yAxis_from = optionsObject.zooming_onLoad_yAxis_from;
    this.zooming_onLoad_yAxis_to = optionsObject.zooming_onLoad_yAxis_to;
    this.center_yAxis_ifElementsAreLessThan = optionsObject.center_yAxis_ifElementsAreLessThan;
    this.showLegends = optionsObject.showLegends;
    this.backgroundColor = optionsObject.backgroundColor

    this.ticksRotationXaxis = optionsObject.ticksRotationXaxis;
    this.ticksTransformXaxis = optionsObject.ticksTransformXaxis;
    this.labelPadding_xAxis = optionsObject.labelPadding_xAxis;
};

Graph.prototype.CreateOptions = function () {
    this.options = {
        series: {
            bars: {
                align: "center",
                fill: 0.8,
                barWidth: 0.5
            }
        },
        xaxis: {
            axisLabel: this.xAxisName,
            axisLabelUseCanvas: true,
            autoscaleMargin: 0.05,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: this.labelPadding_xAxis
        },
        yaxis: {
            axisLabel: this.yAxisName,
            axisLabelUseCanvas: true,
            axisLabelFontSizePixels: 12,
            axisLabelFontFamily: 'Verdana, Arial',
            axisLabelPadding: 3,
            zoomRange: false,
            panRange: false
        },
        legend: {
            show: this.showLegends,
            noColumns: 0,
            labelBoxBorderColor: "#000000",
            position: "nw",
            backgroundColor: "Transparent"
        },
        grid: {
            borderWidth: 0.5,
            backgroundColor: this.backgroundColor,
            autoHighlight: this.autoHighlight,
            hoverable: this.hoverable,
            clickable: this.clickable,
            markings: this.markers
        }
    };

    if (!this.verticalGridlines) {
        this.options.xaxis.tickLength = 0;
    }
    if (!this.horizontalGridlines) {
        this.options.yaxis.tickLength = 0;
    }

    if (this.xAxis_showTicks) {
        this.options.xaxis.ticks = this.xAxisTicks;
    }
    if (this.yAxis_showTicks) {
        this.options.yaxis.ticks = this.yAxisTicks;
    }
    if (this.trackable) {
        this.options.crosshair = { mode: this.trackerMode }
        if (this.trackerDiv) {
            this.bindTrackerDiv();
        }
    }
    if (this.selectable) {
        this.options.selection = { mode: this.selectionMode }
    }
    if (this.animate) {
        this.options.series.grow = { active: true }
    }

}

Graph.prototype.Render = function () {
    //one-time pre-plotting:
    this.CreateOptions();
    //plotting:
    this.ReplotGraph(this.data);
    this.isInitiated = true;
    //one-time post-plotting:
    if (this.animate) {
        this.placeholder.hide();
        var graphEffect = "blind";
        this.placeholder.show(graphEffect, 500);
    }
    if (this.showTooltip) {
        this.UseTooltip();
    }
    if (this.togglable) {
        this.addSerieseToggler();
    }

}

Graph.prototype.ReplotGraph = function (datasets) {
    //pre-plotting:
    this.setZoomAndPan();
    if (this.isInitiated == false) {
        this.adjustZoomSettings();
    }
    else {

    }
    //plotting:
    this.plot = $.plot(this.containerElement, datasets, this.options);
    
    //save pointer to plot object:
    if (this.containerElement) {
        this.containerElement.plotObj = this.plot;
        this.containerElement.plotOptions = this.options;
    }

    //redefine the placeholder:
    this.placeholder = $(this.containerElement);
    //disable grow-animation after initiation:
    if (this.isInitiated == false) {
        this.options.series.grow = { active: false }
        this.isInitiated == true;
    }
    //post-plotting:
    if (this.navigatable) {
        this.addNavigationButtons();
    }

    //apply design:
    this.rotateXaxixTicks();

    //on redrawCallback:
    var graph = this;
    $(this.plot).on(this.plot.redrawOccuredCallback, function () {
        //re-set selection if it's selectable:
        if (graph.selectable == true) {
            if (graph.lastSelectionState == null) {
                graph.plot.clearSelection();
            }
            else {
                graph.blockSelectionCallbacks = true;

                graph.plot.setSelection({
                    xaxis: {
                        from: graph.lastSelectionState.xFrom,
                        to: graph.lastSelectionState.xTo
                    },
                    yaxis: {
                        from: graph.lastSelectionState.yFrom,
                        to: graph.lastSelectionState.yTo
                    }
                });

                graph.blockSelectionCallbacks = false;
            }
        }

        //rotate x-Axis ticks if demanded:
        graph.rotateXaxixTicks();

    });
    
    if (this.selectable) {
        if (this.zoomOnSelection) {
            this.setSelectionZoomBehavior();
        }
        //bind user's custom selection function callback:
        this.bindCustomSelectionFunc();
    }
}

Graph.prototype.saveSelectionLastState = function(ranges){
	this.lastSelectionState = { xFrom: null, xTo: null, yFrom: null, yTo: null };

	if (ranges.xaxis) {
		this.lastSelectionState.xFrom = ranges.xaxis.from;
		this.lastSelectionState.xTo = ranges.xaxis.to;
	}
	if (ranges.yaxis) {
		this.lastSelectionState.yFrom = ranges.yaxis.from;
		this.lastSelectionState.yTo = ranges.yaxis.to;
	}
}

//zoom & pan functions:
Graph.prototype.setZoomAndPan = function () {
    this.options.zoom = {
        interactive: this.zooming_xAxis_zoomable || this.zooming_yAxis_zoomable,
        amount: 1.1
    }
    this.options.pan = {
        interactive: (!this.selectable && (this.zooming_xAxis_zoomable || this.zooming_yAxis_zoomable))
    }
}

Graph.prototype.adjustZoomSettings = function () {
    var xRange = this.xMax - this.xMin;
    var xDisplayMin = this.xMin, xDisplayMax = this.xMax;
    //if x-Axis needs centring:
    if (this.center_xAxis_ifElementsAreLessThan != null &&
		this.center_xAxis_ifElementsAreLessThan > xRange) {
        var offset = (this.center_xAxis_ifElementsAreLessThan - xRange) / 2;
        xDisplayMin = this.xMin - offset;
        xDisplayMax = this.xMax + offset;
    }
    else {
        xDisplayMin = this.zooming_onLoad_xAxis_from;
        xDisplayMax = this.zooming_onLoad_xAxis_to;
    }
    //set zoom & pan ranges:
    var xRangeMin = Math.min(this.xMin, xDisplayMin);
    var xRangeMax = Math.max(this.xMax, xDisplayMax);
    if (this.zooming_xAxis_zoomable) {
        var maxZoomout;
        if (this.zooming_xAxis_maximalZoom != null) {
            maxZoomout = this.zooming_xAxis_maximalZoom;
        }
        else {
            maxZoomout = xDisplayMax - xDisplayMin;
        }
        this.options.xaxis.zoomRange = [this.zooming_xAxis_minimalZoom, maxZoomout];
        this.options.xaxis.panRange = [xRangeMin, xRangeMax];
    }
    this.options.xaxis.min = xDisplayMin;
    this.options.xaxis.max = xDisplayMax;



    var yRange = this.yMax - this.yMin;
    var yDisplayMin = this.yMin, yDisplayMax = this.yMax;
    //if y-Axis needs centring:
    if (this.center_yAxis_ifElementsAreLessThan != null &&
		this.center_yAxis_ifElementsAreLessThan > yRange) {
        var offset = (this.center_yAxis_ifElementsAreLessThan - yRange) / 2;
        yDisplayMin = this.yMin - offset;
        yDisplayMax = this.yMax + offset;
    }
    else {
        yDisplayMin = this.zooming_onLoad_yAxis_from;
        yDisplayMax = this.zooming_onLoad_yAxis_to;
    }
    //set zoom & pan ranges:
    var yRangeMin = Math.min(this.yMin, yDisplayMin);
    var yRangeMax = Math.max(this.yMax, yDisplayMax);
    if (this.zooming_yAxis_zoomable) {
        this.options.yaxis.zoomRange = [this.zooming_yAxis_minimalZoom, yRangeMax - yRangeMin];
        this.options.yaxis.panRange = [yRangeMin, yRangeMax];
    }
    this.options.yaxis.min = yDisplayMin;
    this.options.yaxis.max = yDisplayMax;
}

Graph.prototype.addNavigationButtons = function () {

    //append a navigationDiv to the placeholder:
    this.navigationDiv = document.createElement('div');
    this.navigationDiv.className = 'graphNavigationContainer';
    this.placeholder.append(this.navigationDiv);
  //  this.placeholder.hover(function () {
  //      $(navigationDiv).fadeToggle(250);
  //  });
    
    //append controllers to the navigationDiv:
    var navigationDiv = this.navigationDiv;
    var plot = this.plot;
    var zoomable = this.zooming_xAxis_zoomable || this.zooming_yAxis_zoomable;
    
    addArrow(navigationDiv, plot, "arrow-up", 'left: -20px; top: 0px;', { top: -30 });
    addArrow(navigationDiv, plot, "arrow-down", 'left: -20px; top: 30px;', { top: 30 });
    addArrow(navigationDiv, plot, "arrow-left", 'left: -35px; top: 15px;', { left: -30 });
    addArrow(navigationDiv, plot, "arrow-right", 'left: -5px; top: 15px;', { left: 30 });

    //navigation buttons:
    function addArrow(navigationDiv, plot, img, style, offset) {
        var panInterval;

        var element = $("<img class='graphNavigationButton' src='" + filesBaseDir + "/resources/" + img + ".gif' style='" + style + "'>")
            .appendTo(navigationDiv);

        element.mousedown(function (e) {
            panInterval = setInterval(function () { panFunc(e) }, 15);
        });
        element.mouseup(function (e) {
            clearInterval(panInterval);
            panFunc(e);
        });
        element.mouseout(function (e) {
            clearInterval(panInterval);//todo: if active?
        });

        var panFunc = function (e) {
            e.preventDefault();
            plot.pan(offset);
        }
    }

    $("<img class='graphNavigationButton' src='" + filesBaseDir + "/resources/zoomin.gif' style='left: -20px; top:50px; width: 16px; height: 16px;'>")
        .appendTo(this.navigationDiv)
        .click(function (e) {
            e.preventDefault();
            if (zoomable) {
                plot.zoom();
            }
        });

    $("<img class='graphNavigationButton' src='" + filesBaseDir + "/resources/zoomout.gif' style='left: -20px; top:70px; width: 16px; height: 16px;'>")
        .appendTo(this.navigationDiv)
        .click(function (e) {
            e.preventDefault();
            if (zoomable) {
                plot.zoomOut();
            }
        });

}

//tracker functions:
Graph.prototype.bindTrackerDiv = function () {
    var graph = this;
    document.getElementById(this.trackerDiv).innerHTML = this.trackerDefaultMessage;
    this.placeholder.bind("plothover", function (event, pos, item) {
        graph.latestPosition = pos;
        if (!graph.updateLegendTimeout) {
            graph.updateLegendTimeout = setTimeout(function () { graph.updateTrackerData() }, 50);
        }
    });
}

Graph.prototype.updateTrackerData = function () {

    if (this.trackerDiv == null) {
        return;
    }
    var trackerDivJS = document.getElementById(this.trackerDiv);
    if (trackerDivJS == null) {
        return;
    }

    this.updateLegendTimeout = null;

    var self = this;
    var resultX, resultY, resultToolTip, resultSeriesID;
    var pos = this.latestPosition;

    var axes = this.plot.getAxes();
    if (pos.x < axes.xaxis.min || pos.x > axes.xaxis.max || pos.y < axes.yaxis.min || pos.y > axes.yaxis.max) {
        trackerDivJS.innerHTML = this.trackerDefaultMessage;
        return;
    }

    var i, j, dataset = this.plot.getData();
    for (i = 0; i < dataset.length; ++i) {

        var series = dataset[i];

        if (series.bars && series.bars.show) {
            // Find the highlighted bar
            var found = false;
            for (j = 0; j < series.data.length; ++j) {
                var graphPointX = series.data[j][0];
                if (graphPointX >= pos.x - 0.25 && graphPointX <= pos.x + 0.25) {
                    resultX = graphPointX;
                    resultY = series.data[j][1];
                    resultSeriesID = series.id;
                    if (series.tt && series.tt.length >= graphPointX) {
                        resultToolTip = series.tt[graphPointX - 1];
                    }
                    else {
                        resultToolTip = null;
                    }

                    callCustomTrackerFunc();
                    found = true;
                    break;
                }
            }
            //if non is highlighted / found:
            if (!found) {
                resultX = null;
                resultY = null;
                resultSeriesID = null;
                resultToolTip = null;

                callCustomTrackerFunc();
            }
        }//--------------------------------------------
        else if (series.lines && series.lines.show && !series.lines.steps) {
            // Find the nearest points, x-wise
            for (j = 0; j < series.data.length; ++j) {
                if (series.data[j][0] > pos.x) {
                    break;
                }
            }

            //Interpolate:
            var y, p1 = series.data[j - 1], p2 = series.data[j];

            if (p1 == null) {
                y = p2[1];
            } else if (p2 == null) {
                y = p1[1];
            } else {
                y = p1[1] + (p2[1] - p1[1]) * (pos.x - p1[0]) / (p2[0] - p1[0]);
            }

            resultX = pos.x;
            resultY = y;
            resultSeriesID = series.id;
            resultToolTip = null;

            callCustomTrackerFunc();
        }//--------------------------------------------
        else if (series.lines && series.lines.show && series.lines.steps) {
            // Find the nearest points, x-wise
            for (j = 0; j < series.data.length; ++j) {
                if (series.data[j][0] > pos.x) {
                    break;
                }
            }

            //take the previous point y value:
            resultX = pos.x;
            if (series.data[j - 1]) {
                resultY = series.data[j - 1][1];
            }
            else {
                resultY = null;
            }
            resultSeriesID = series.id;
            resultToolTip = null;

            callCustomTrackerFunc();
        }
    }//--------------------------------------------

    //do the call back if defined:
    function callCustomTrackerFunc() {
        if (self.trackerFormatFunc != null) {
            self.trackerFormatFunc(trackerDivJS, resultX, resultY, resultToolTip, resultSeriesID);
        }
        else {
            trackerDivJS.innerHTML = "(" + resultX + "," + y + ")";
        }
    }
}

//tooltip functions:
Graph.prototype.UseTooltip = function () {
    var graph = this;
    this.placeholder.bind("plothover", function (event, pos, item) {
        if (item) {
            if ((graph.previousLabel != item.series.label) || (graph.previousPoint != item.dataIndex)) {
                graph.previousPoint = item.dataIndex;
                graph.previousLabel = item.series.label;
                $("#tooltip").remove();
                var x = item.datapoint[0];
                var y = item.datapoint[1];
                var color = item.series.color;
                var tt_text = item.series.tt[item.dataIndex];
                if (tt_text != null && tt_text != '') {
                    graph.drawTooltip(item.pageX, item.pageY, color, tt_text);
                }
            }
        } else {
            $("#tooltip").remove();
            graph.previousPoint = null;
        }
    });
};

Graph.prototype.drawTooltip = function (x, y, color, contents) {
    $('<div id="tooltip">' + contents + '</div>').css({
        position: 'absolute',
        zIndex: 16777271,
        display: 'none',
        top: y - 40,
        left: x - 40,
        border: '2px solid ' + color,
        padding: '3px',
        'font-size': '9px',
        'border-radius': '5px',
        'background-color': '#fff',
        'font-family': 'Verdana, Arial, Helvetica, Tahoma, sans-serif',
        opacity: 0.9
    }).appendTo("body").fadeIn(200);
}

//series toggle:
Graph.prototype.addSerieseToggler = function () {
    var graph = this;
    var choiceContainer = $(this.togglerDiv);
    $.each(graph.data, function (key, val) {
        choiceContainer.append("   <input type='checkbox' name='" + key +
        "' checked='checked' id='id" + key + "'></input>" +
        "<label for='id" + key + "'>" + val.label + "</label>");
    });

    choiceContainer.find("input").click(function () { graph.plotAccordingToChoices() });
}

Graph.prototype.plotAccordingToChoices = function () {
    var diaplayData = [];
    var graphData = this.data;
    var choiceContainer = $(this.togglerDiv);
    choiceContainer.find("input:checked").each(function () {
        var key = $(this).attr("name");
        if (key && graphData[key]) {
            diaplayData.push(graphData[key]);
        }
    });

    //if (data.length > 0) {
    this.ReplotGraph(diaplayData);

}

//selection functions:
Graph.prototype.setSelectionZoomBehavior = function () {
    var graph = this;
    this.placeholder.bind("plotselected", function (event, ranges) {
		
		graph.saveSelectionLastState(ranges);
		
        if(this.blockSelectionCallbacks){
            return;
        }
        if (graph.zoomOnSelection) {
            $.each(graph.plot.getXAxes(), function (_, axis) {
                var opts = axis.options;
                opts.min = ranges.xaxis.from;
                opts.max = ranges.xaxis.to;
            });
            $.each(graph.plot.getYAxes(), function (_, axis) {
                var opts = axis.options;
                opts.min = ranges.yaxis.from;
                opts.max = ranges.yaxis.to;
            });
            graph.plot.setupGrid();
            graph.plot.clearSelection();
            graph.plot.draw();
            
        }
    });

}

Graph.prototype.bindCustomSelectionFunc = function () {
    if (this.customSelectionFunc == null) {
        return;
    }
    var graph = this;

    //on selection:
    this.placeholder.bind("plotselected", function (event, ranges) {
		
		graph.saveSelectionLastState(ranges);
		
        if (graph.blockSelectionCallbacks) {
            return;
        }
		
		//call the user's custom onSelection function:
		graph.customSelectionFunc(graph.lastSelectionState.xFrom,
							graph.lastSelectionState.yFrom,
							graph.lastSelectionState.xTo,
							graph.lastSelectionState.yTo,
							graph.plot.getData()
						);
		
    });

    //on de-selection:
    this.placeholder.bind("plotunselected", function (event) {
        graph.lastSelectionState = null;
        graph.customSelectionFunc(null, null, null, null, null);
    });
}


//design:
Graph.prototype.rotateXaxixTicks = function () {
    if (!this.xAxis_showTicks) {
        return;
    }

    rotationDegree = 0;
    translation = 0;

    //find all ticks:
    var ticksList = $(this.containerElement).find('.flot-x-axis div.flot-tick-label');

    if (ticksList.length > 1) {
        //find longest tick (characters count):
        var longestTick = 0;
        ticksList.each(function (index, tick) {
            if (tick.innerHTML.length > longestTick) {
                longestTick = tick.innerHTML.length;
            }
        });
        //find distance between first 2 points:
        var distance = $(ticksList[1]).offset().left - $(ticksList[0]).offset().left;
        distance = Math.abs(distance);
        //if longest tick laps over it's neighbour, find the appropriate rotation degree:
        longestTick = longestTick * 7;
        if (longestTick >= distance) {
            var redundantDist = longestTick - distance;
            var cosAlpha = (longestTick - redundantDist) / longestTick;
            rotationDegree = (Math.acos(cosAlpha) * (180 / Math.PI)) % 90;
            translation = Math.round(rotationDegree / 90 * 100);

            //for bars only:
            translation = translation;
        }
    }

    //do the rotation:
    ticksList.each(function (index, tick) {
        $(tick).css({
            "transform": "translateX(" + translation + "%) rotate(" + rotationDegree + "deg)", /* CSS3 */
            "-ms-transform": "translateX(" + translation + "%) rotate(" + rotationDegree + "deg)", /* IE */
            "-moz-transform": "translateX(" + translation + "%) rotate(" + rotationDegree + "deg)", /* Firefox */
            "-webkit-transform": "translateX(" + translation + "%) rotate(" + rotationDegree + "deg)", /* Safari and Chrome */
            "-o-transform": "translateX(" + translation + "%) rotate(" + rotationDegree + "deg)", /* Opera */
            "transform-origin": "0 0"
        });
    });
}
function loadHomePage(reportItem, homePage){

	//read homePage data:
	$.ajax({
        url: homePage.source,
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			createAnalysisOverviewReport(data.overview);
			animateEntrance();
        },
        error: function(jqxhr, statusText, errorThrown){
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Home Page\":<br/> \"" + errorThrown + "\".");
        }
    });

	
	//---------------------------------------------------------------------------
	function createAnalysisOverviewReport(data){

		var layoutWrapper =  document.createElement('table');
		reportItem.appendChild(layoutWrapper);
		
		layoutWrapper.style.width = '100%';
		var tr = layoutWrapper.insertRow();
		tr.insertCell().style.width = '3%';
		var layoutWrapperCell = tr.insertCell();
		tr.insertCell().style.width = '3%';
		
		//table layout:
		var layout = document.createElement('table');
		layout.className = 'hostProfilingOverviewLayout';
		layoutWrapperCell.appendChild(layout);
		var tr;
		
		
		//---------------------- level 1 ----------------------//
		tr = layout.insertRow();
		td = tr.insertCell();
		td.innerHTML = 'Host Profiling Overview:';
		td.className = 'homePageLevelNameText';
		
		tr = layout.insertRow();
		
		//apiCalls:
		if(data.apiCallsOverview != null){
			var apiCallsContainer = tr.insertCell();
			apiCallsContainer.className = 'sectionContainer';
			var info = [
								['calls:', data.apiCallsOverview.count],
								['errors:', data.apiCallsOverview.errorsCount],
								['total time:', data.apiCallsOverview.totalTime]
							];
			var section = createSection('Api Calls', data.apiCallsOverview.tipsCount, info, null, 'linkable');
			apiCallsContainer.appendChild(section);
			
			section.onclick = function(){ mainMenuOpenPage(pagesTitles.apiCalls); };
		}
		
		//memoryCommands:
		if(data.memoryCommandsOverview != null){
			var memoryCommandsContainer = tr.insertCell();
			memoryCommandsContainer.className = 'sectionContainer';
			var info = [
								['calls:', data.memoryCommandsOverview.count],
								['errors:', data.memoryCommandsOverview.errorsCount],
								['total time', data.memoryCommandsOverview.totalTime]
								//['avg bandwidth:', data.apiCallsOverview.avgBandwidth]
							];
			var section = createSection('Memory Commands', data.memoryCommandsOverview.tipsCount, info, null, 'linkable');
			memoryCommandsContainer.appendChild(section);
			
			section.onclick = function(){ mainMenuOpenPage(pagesTitles.memoryCommands); };
		}
		
		//oclObjects:
		if(data.oclObjectsOverview != null){
			var oclObjectsContainer = tr.insertCell();
			oclObjectsContainer.className = 'sectionContainer';
			var info = [
								['total objects', data.oclObjectsOverview.count]
							];
			var section = createSection('OpenCL Objects', data.oclObjectsOverview.tipsCount, info, null, 'linkable');
			oclObjectsContainer.appendChild(section);
			
			section.onclick = function(){ mainMenuOpenPage(pagesTitles.oclObjects); };
		}
		
		//---------------------- level 2 ----------------------//
		tr = layout.insertRow();
		td = tr.insertCell();
		td.innerHTML = 'Kernels Overview:';
		td.className = 'homePageLevelNameText';
		
		tr = layout.insertRow();
		
		if(data.kernelsOverview != null){
			var container = tr.insertCell();
			container.colSpan = '3';
			container.className = 'sectionContainer';
			
			if(isNaN(parseFloat(data.kernelsOverview.avgEUActive))){
				data.kernelsOverview.avgEUActive = '[N/A]';
			}
			
			if(isNaN(parseFloat(data.kernelsOverview.avgEUStall))){
				data.kernelsOverview.avgEUStall = '[N/A]';
			}
			
			var info = [
								//line1:
								['unique kernels:', data.kernelsOverview.uniqueKernelsCount],
								['total NDRanges:', data.kernelsOverview.NDRangesCount],
								['EU Active (GPU):', data.kernelsOverview.avgEUActive],
								
								//line2:
								['overall time:', data.kernelsOverview.totalTime],
								['GPU NDRanges:', data.kernelsOverview.gpuNDRanges],
								['EU Stall (GPU):', data.kernelsOverview.avgEUStall]
							];
			var section = createSection('Kernels Profiling', data.kernelsOverview.tipsCount, null, null, 'linkable');
			
			var infoTable = document.createElement('table');
			infoTable.className = 'sectionInfoTable';
			var keyColumn1Width = '130px', keyColumn2Width = '130px', keyColumn3Width = '140px';;
			
			for(var i = 0; i < info.length; i+=3){
				var td, tr = infoTable.insertRow();
				
				//entry1:
				td = tr.insertCell();//key
				td.className = 'sectionInfoKey';
				td.innerHTML = '- ' + info[i][0];
				td.style.width = keyColumn1Width;
				
				td = tr.insertCell();//value
				td.className = 'sectionInfoValue';
				td.innerHTML = info[i][1];
				
				if(i+1 >= info.length){ continue; } //safety.
				td.style.paddingRight = '90px'; //padding.
				
				//entry2:
				td = tr.insertCell();//key
				td.className = 'sectionInfoKey';
				td.innerHTML = '- ' + info[i+1][0];
				td.style.width = keyColumn2Width;
				
				td = tr.insertCell();//value
				td.className = 'sectionInfoValue';
				td.innerHTML = info[i+1][1];
				
				if(i+2 >= info.length){ continue; } //safety.
				td.style.paddingRight = '90px'; //padding.
				
				//entry2:
				td = tr.insertCell();//key
				td.className = 'sectionInfoKey';
				td.innerHTML = '- ' + info[i+2][0];
				td.style.width = keyColumn3Width;
				
				td = tr.insertCell();//value
				td.className = 'sectionInfoValue';
				td.innerHTML = info[i+2][1];
			}
			
			section.appendChild(infoTable);
			
			
			//hottest kernels:
			if(data.kernelsOverview.hottestKernels != null){
			
				//todo: implement.
				//section.appendChild(infoTable);
			
			}
			
			container.appendChild(section);
			
			section.onclick = function(){ mainMenuOpenPage(pagesTitles.kernelsOverview); };
		}
		
		
	}
	
	
	//---------------------------------------------------------------------------
	function animateEntrance(){
		//get a list of all sections (from first to last):
		var sectionsList = $(reportItem).find('.hostProfilingOverviewSection');
		if(sectionsList.length > 0){
			for(var i=0; i<sectionsList.length; i++) (function(i){
				var section = $(sectionsList[i]);
				section.addClass('hidden');
				setTimeout(function(){ section.removeClass('hidden'); }, i * 80);
			})(i);
		}
	}


//---------------------------------------------------------------------------------------------------
	function createSection(title, tipsCount, info, keyColumnWidth, sectionClass){
		
		var section = document.createElement('div');
		section.className = 'hostProfilingOverviewSection';
		if(sectionClass != null && sectionClass != ''){
			section.className += ' ' + sectionClass;
		}
		
		var titleSpan = document.createElement('span');
		titleSpan.className = 'sectionTitle';
		titleSpan.innerHTML = title;
		section.appendChild(titleSpan);
		
		if(tipsCount > 0){//todo: parse to int first.
			var tipsSpan =document.createElement('span');
			tipsSpan.className = 'sectionTipsCount';
			tipsSpan.innerHTML = tipsCount + ' tips';
			section.appendChild(tipsSpan);
		}
		
		if(info !=null && info.length > 0){
			var infoTable = document.createElement('table');
			infoTable.className = 'sectionInfoTable';
			for(var i = 0; i < info.length; i++)(function(i){
				var tr = infoTable.insertRow();
				
				var td = tr.insertCell();
				td.className = 'sectionInfoKey';
				td.innerHTML = '- ' + info[i][0];
				if(keyColumnWidth != null){
					td.style.width = keyColumnWidth;
				}
				
				td = tr.insertCell();
				td.className = 'sectionInfoValue';
				td.innerHTML = info[i][1];
				
				//can copy?
				if(info[i][2] == true){
					td.title = 'click to copy to clipboard';
					td.className = 'copiable';
					td.onclick = function (){ copyToClipboard(info[i][1]); };
				}
			})(i);
			
			section.appendChild(infoTable);
		}
		
		return section;
	}
	
	
	
}
function loadKernelAnalysisListViewReport(reportItem, kernelAnalysisListView){

	//fill kernelAnalysisListView data:
	var infoDiv = document.createElement('div');
	infoDiv.innerHTML = JSON.stringify(kernelAnalysisListView);
	reportItem.appendChild(infoDiv);
	
}

function loadKernelReport(reportItem, kernelData){
	
	//check if report's data exists:
	var reportData =readAjaxData(kernelData.filesDirName + "/main.ajax");
	if(reportData == null){
		if(kernelData.KBSKernelName == null || kernelData.KBSConfiguration == null){
			appendCriticalErrorMessage(reportItem , "Error: Data corruption! missing analysis command info.");
		}
		else{
			var desabledData =readAjaxData(filesBaseDir + "/data/disableDeep.ajax");
			if(desabledData != null){
				displayDeepIsDisabled(reportItem, kernelData.KBSKernelName, kernelData.KBSConfiguration);
				return;
			}
			displayNotAnalyzedYet(reportItem, kernelData.KBSKernelName, kernelData.KBSConfiguration);
		}
		return; //stop
	}
	
	
	//data exists, build the report:
	if(!kernelData.lastState){
		kernelData.lastState = { 'activePage': null };
	}
	
	var reportTitle = kernelData.kernelUniqueName;
	var vm = new ViewMode(reportItem, '250px', reportTitle + ':', 'reportTitle');
	reportItem.appendChild(CreateSeperator());
	var tl = new TransitionList(reportItem, '100%', false, 'fxPressAwayFAST', '', 400, 'transitionListItemContainer', onPageLoad, onPageDispose);
	
	//ids:
	//var vm1_id = 'kernelAnalysis_overview', page1_id = vm1_id+'Page';
	var vm2_id = 'kernelAnalysis_occupancy', page2_id = vm2_id+'Page';
	var vm3_id = 'kernelAnalysis_latency', page3_id = vm3_id+'Page';
	var vm4_id = 'kernelAnalysis_memoryDiagram', page4_id = vm4_id+'Page';
	
	//============ create pages ============
	/*f(reportData.overview){
		vm.add(vm1_id, 'Overview', function () { tl.switchTo(page1_id); });
		var page1 = tl.addReportToList(page1_id);
		page1.loadingFunc = function(){ buildKernelOverviewReport(reportData.overview, page1); };
		
		//last state:
		if(kernelData.lastState && kernelData.lastState.activePage == page1_id){
			page1.loadingFunc();
		}
	}//-------------------------------------
	*/
	
	if(reportData.occupancy != null && reportData.occupancy.source != null){
		vm.add(vm2_id, 'Occupancy', function () { tl.switchTo(page2_id); });
		var page2 = tl.addReportToList(page2_id);
		if(kernelData.lastState.occupancy == null) {	kernelData.lastState.occupancy = {}; };
		page2.loadingFunc = function(){ buildKernelOccupancyReport(reportData.occupancy, page2, kernelData.lastState.occupancy); };
		
		//last state:
		if(kernelData.lastState && kernelData.lastState.activePage == page2_id){
			//vm.setFocusOn(vm2_id);
			page2.loadingFunc();
		}
	}//-------------------------------------

	if(reportData.latency != null && reportData.latency.source != null){
		vm.add(vm3_id, 'Latency', function () { tl.switchTo(page3_id); });
		var page3 = tl.addReportToList(page3_id);
		if(kernelData.lastState.latency == null) {	kernelData.lastState.latency = {}; };
		page3.loadingFunc = function(){ buildKernelLatencyReport(reportData.latency, page3, kernelData.lastState.latency); };
		
		//last state:
		if(kernelData.lastState && kernelData.lastState.activePage == page3_id){
			if(reportData.occupancy != null && reportData.occupancy.source != null){
				page3.loadingFunc();
				//vm.setFocusOn(vm3_id);//todo: instead of this, check if there's no occupancy tab! (currently it does Double-Load).
			}
			else{
				vm.setFocusOn(vm3_id);
			}
		}
	}//-------------------------------------
	
	if(reportData.memdiagram != null && reportData.memdiagram.source != null){
		vm.add(vm4_id, 'Hardware Counters', function () { tl.switchTo(page4_id); });
		var page4 = tl.addReportToList(page4_id);
		if(kernelData.lastState.memdiagram == null) {	kernelData.lastState.memdiagram = {}; };
		page4.loadingFunc = function(){ buildKernelCounterReport(reportData.memdiagram, page4, kernelData.lastState.memdiagram); };
		
		//last state:
		if(kernelData.lastState && kernelData.lastState.activePage == page4_id){
			if(reportData.occupancy != null && reportData.occupancy.source != null){
				page4.loadingFunc();
				vm.setFocusOn(vm4_id);//todo: instead of this, check if there's no occupancy tab! (currently it does Double-Load).
			}
			else{
				vm.setFocusOn(vm4_id);
			}
		}
	}//-------------------------------------
	
	
	vm.autoSetWidth(125);
	
	//if no last-state set yet, set it to be the first:
	if(kernelData.lastState.activePage == null && tl.itemsCount > 0){
		var firstPageId = tl.callLoadOnFirstItem();
		kernelData.lastState.activePage = firstPageId;
	}
	
	
	addEditKernelButtonIfcanEditKernels(reportItem);
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	
	/*****************************************/
	/* Help functions */
	/*****************************************/
	function addEditKernelButtonIfcanEditKernels(parent){
		$.ajax({
				url: "KernelAnalysis?canEditKernels",
				type: "POST",
				async: true,
				dataType: "text",
				success: function () {
					var editButton = CreateEditKernelButton();
					editButton.style.position = 'absolute';
					editButton.style.top = '10px';
					editButton.style.right = '60px';
					editButton.onclick = function(){
						EditKernel(kernelData.KBSKernelName, kernelData.KBSConfiguration, 
									  kernelData.KBFilename, kernelData.KBFolderName, kernelData.KBSessionName);
					};
					parent.appendChild(editButton);
				},
				error: function () {}
			});
	}

	function EditKernel(KBSKernelName, KBSConfiguration, KBFilename, KBFolderName, KBSessionName){
		appendLoadingMessage(document.body);
		$.ajax({
			url: "KernelAnalysis?EditKernel=" + KBSKernelName + '&' + KBSConfiguration + '&' + KBFilename
													   + '&' + KBFolderName + '&' + KBSessionName,
			type: "POST",
			async: true,
		dataType: "text",
		success: function () {
			removeLoadingMessage(document.body);
		},
		error: function () {
			removeLoadingMessage(document.body);
		}
	});
}

	function CreateEditKernelButton(){
		var button = document.createElement('span');
		button.className = 'editKernelButton';
		button.innerHTML = 'Edit Kernel';
		button.title = 'You can edit your kernel and rerun the analysis on it.\n' +
						   'Very useful when trying to improve the perfomance of your kernels.';
						   
		return button;
	}

	
	
	function displayDeepIsDisabled(reportItem, KBSKernelName, KBSConfiguration){
		
		var layoutWrapper =  document.createElement('table');
		layoutWrapper.style.width = '100%';
		reportItem.appendChild(layoutWrapper);
		var tr = layoutWrapper.insertRow();
		tr.insertCell().style.width = '3%';
		var layoutWrapperCell = tr.insertCell();
		tr.insertCell().style.width = '3%';
		
		//table layout:
		var layout = document.createElement('table');
		layout.className = 'hostProfilingOverviewLayout';
		layoutWrapperCell.appendChild(layout);
		var tr;

		tr = layout.insertRow();
		var container = tr.insertCell();
		container.style.textAlign = 'center';
		container.style.position = 'relative';
		
		var headerText = document.createElement('div');
		container.appendChild(headerText);
		headerText.innerHTML = 'Session has been modified and the analysis input aren\'t relavent anymore!<br>' +
                               'Deep analysis for kernel "' + KBSKernelName + '" has been disabled.';
		headerText.style.fontSize = '16px';
		headerText.style.paddingTop = '50px';
		headerText.style.paddingBottom = '30px';
		headerText.style.color = 'gray';
		
		
		
		
	}
	
	function displayNotAnalyzedYet(reportItem, KBSKernelName, KBSConfiguration){
		
		var layoutWrapper =  document.createElement('table');
		layoutWrapper.style.width = '100%';
		reportItem.appendChild(layoutWrapper);
		var tr = layoutWrapper.insertRow();
		tr.insertCell().style.width = '3%';
		var layoutWrapperCell = tr.insertCell();
		tr.insertCell().style.width = '3%';
		
		//table layout:
		var layout = document.createElement('table');
		layout.className = 'hostProfilingOverviewLayout';
		layoutWrapperCell.appendChild(layout);
		var tr;

		updateMode();

		if(mode == 'localHost') {
			
			addEditKernelButtonIfcanEditKernels(layout);
			
			tr = layout.insertRow();
			var container = tr.insertCell();
			container.style.textAlign = 'center';
			container.style.position = 'relative';
			
			var headerText = document.createElement('div');
			container.appendChild(headerText);
			headerText.innerHTML = '"' + KBSKernelName + '" has not been analyzed yet, click below to start kernel analysis.<br>';
			headerText.style.fontSize = '16px';
			headerText.style.paddingTop = '50px';
			headerText.style.paddingBottom = '30px';
			headerText.style.color = 'gray';
			
			var launchButtonContainer = document.createElement('div');
			launchButtonContainer.style.paddingTop = '150px';
			
			container.appendChild(launchButtonContainer);
			
			var launchSpan = document.createElement('span');
			launchSpan.className = 'deepAnalysisLauncher';
			launchButtonContainer.appendChild(launchSpan);
			launchSpan.innerHTML = 'Launch analysis';

			launchSpan.onclick = function(){
				$(reportItem).empty();
				
				//check if it has been disabled in the time it was opened:
				var desabledData =readAjaxData(filesBaseDir + "/data/disableDeep.ajax");
				if(desabledData != null){
					displayDeepIsDisabled(reportItem, kernelData.KBSKernelName, kernelData.KBSConfiguration);
					return;
				}
				
				//send launch request to parent:
				var iterationsCount = null;
				var Lx = null;
				var Ly = null;
				var Lz = null;
				
				if(kernelData.Lx && kernelData.Lx != ""){
					Lx = kernelData.Lx;
				}
				if(kernelData.Ly && kernelData.Ly != ""){
					Ly = kernelData.Ly;
				}
				if(kernelData.Lz && kernelData.Lz != ""){
					Lz = kernelData.Lz;
				}
									
				//window.external.launchKernelAnalysis(KBSKernelName, KBSConfiguration, kernelData.KBFilename, kernelData.KBFolderName, 
				//							kernelData.KBSessionName, kernelData.filesDirName, iterationsCount, Lx, Ly, Lz);
											
				var criticalError = false;	
				$.ajax({
					url: 'KernelAnalysis?launchKernelAnalysis=' + KBSKernelName + '&' + KBSConfiguration + '&' + kernelData.KBFilename + '&' + kernelData.KBFolderName + '&' +
											kernelData.KBSessionName + '&' + kernelData.filesDirName + '&' + iterationsCount + '&' + Lx + '&' + Ly + '&' + Lz,
					type: "POST",
					async: false,
					dataType: "text",
					success: function (data) {
					},
					error: function (jqxhr, statusText, errorThrown){
						criticalError = true;
						alert(errorThrown);
					}
				});
					
				if(criticalError == true){
					return;
				}

				
				//cover / disable top menu selections:
				var menuCover = document.createElement('div');
				menuCover.style.position = 'fixed';
				menuCover.style.width = '100%';
				menuCover.style.height = '50px';
				menuCover.style.top = '0px';
				menuCover.style.left = '0px';
				menuCover.style.zIndex = '9999999999';
				menuCover.style.background = 'white';
				menuCover.style.opacity = '0.5';
				
				document.body.appendChild(menuCover);
				
				$(menuCover).hide();
				$(menuCover).fadeIn(100);
				
				//create progrss & cancelation layout:
				var layoutWrapper =  document.createElement('table');
				layoutWrapper.style.width = '100%';
				reportItem.appendChild(layoutWrapper);
				var tr = layoutWrapper.insertRow();
				tr.insertCell().style.width = '10%';
				var layoutWrapperCell = tr.insertCell();
				tr.insertCell().style.width = '10%';
				
				//table layout:
				var layout = document.createElement('table');
				layout.className = 'hostProfilingOverviewLayout';
				layoutWrapperCell.appendChild(layout);
				var tr = layout.insertRow();
				var td = tr.insertCell();
				
				var container = document.createElement('div');
				td.appendChild(container);
				container.className = 'deepAnalysisProgressContainer';
				
				var headerTitle = document.createElement('span');
				headerTitle.className = 'headerTitle';
				container.appendChild(headerTitle);
				
				var progressHeader = document.createElement('span');
				progressHeader.className = 'headerStatus';
				container.appendChild(progressHeader);
				
				var progress = document.createElement('div');
				progress.className = 'progress';
				container.appendChild(progress);
								
				var number = document.createElement('span');
				number.className = 'number';
				container.appendChild(number);
				
				var currentNumber = document.createElement('span');
				currentNumber.id = 'number-current';
				currentNumber.className = 'number-current';
				number.appendChild(currentNumber);
				
				var totalNumber = document.createElement('span');
				totalNumber.id = 'number-total';
				totalNumber.className = 'number-total';
				number.appendChild(totalNumber);
				
				var totalSteps = 4;
				var currentStep = 0;
				totalNumber.innerHTML = totalSteps;
				//currentNumber.innerHTML = 0;
				updateProgress(currentStep);
				
				function updateProgress(stepNum){
					progress.style.width = (stepNum)* ( 100 / totalSteps ) + '%';
					currentNumber.innerHTML = stepNum;
				}
				
				//loading img:
				var loadingImg = document.createElement('img');
				container.appendChild(loadingImg);
				loadingImg.className = 'loadingImage';
				loadingImg.src = filesBaseDir + '/resources/loading.gif';
				
				var cancelAnalysisSpanContainer = document.createElement('div');
				cancelAnalysisSpanContainer.style.paddingTop = '5px';
				container.appendChild(cancelAnalysisSpanContainer);
				
				var cancelAnalysisSpan = document.createElement('span');
				cancelAnalysisSpan.className = 'cancelAnalysisSpan';
				container.appendChild(cancelAnalysisSpan);
				
				
				cancelAnalysisSpan.innerHTML = 'cancel analysis';
				
				cancelAnalysisSpan.onclick = function(){
					
				var criticalError = false;
				$.ajax({
					url: 'KernelAnalysis?cancelAnalysis',
					type: "POST",
					async: true,
					dataType: "text",
					success: function (data) {
					},
					error: function (jqxhr, statusText, errorThrown){
						alert('failed to cancel analysis');
					}
				});
					
				if(criticalError == true){
					return;
				}
					
				}
				
				headerTitle.innerHTML = 'Analyzing kernel "' + KBSKernelName +'"...';
				progressHeader.innerHTML = 'preparing analysis, please wait...';
				
				fetchProgressUpdate();
				
				//get the analysis progress (async request):
				function fetchProgressUpdate(){
					
					$.ajax({
						url: 'KernelAnalysis?getProgressStatus',
						type: "POST",
						async: true,
						dataType: "json",
						success: function (data) {
							//alert('signal received: ' + JSON.stringify(data));
							if(data.title != null){
								headerTitle.innerHTML = data.title;
							}
							
							if(data.header != null){
								progressHeader.innerHTML = data.header;
							}
							
							if(data.step != null && data.step == true){
								currentStep++;
								updateProgress(currentStep);
							}
							
							if(data.done != null && data.done == true){
								$(reportItem).empty();
								loadKernelReport(reportItem, kernelData);
								$(menuCover).remove();
								
								//errors?
								if(data.errors != null && data.errors.trim() != ''){
									alert(data.errors);
								}
								return;
							}
							
							if(data.canceled != null && data.canceled == true){
								$(cancelAnalysisSpan).hide();
								headerTitle.innerHTML = 'Canceling analysis.';
								progressHeader.innerHTML = 'cleaning up temp file, please wait....';
								currentStep = 0;
								updateProgress(currentStep);
							}
							
							fetchProgressUpdate();
							
						},
						error: function (jqxhr, statusText, errorThrown){
							console.log('an error occured while waiting for progressUpdate:\n' + errorThrown);
							alert('failed to get analysis signal: ' + errorThrown);
							//todo: some test to determin if to retry or not:
							if(false){
								//retry:
								fetchProgressUpdate();
							}
						}
					});
					
				}
				
				
			}
			
		}
		
		//Browser mode:
		else{
			tr = layout.insertRow();
			
			//---------------------- level 1 ----------------------//
			tr = layout.insertRow();
			var td = tr.insertCell();
			td.innerHTML = '"' + KBSKernelName + '" has not been analyzed yet. please manually run the following command:';
			//td.style.paddingLeft = '20px';
			td.style.textAlign = 'center';
			td.style.fontSize = '16px';
			td.style.paddingTop = '50px';
			td.style.paddingBottom = '30px';
			
			//---------------------- level 2 ----------------------//
			tr = layout.insertRow();
			//application info:
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var section = createSection('', null, null);
			section.style.padding = '20px 20px';
			section.style.fontSize = '12px';
			section.title = 'click to copy to clipboard';
			section.className += ' copiable';
			section.onclick = function (){ copyToClipboard(section.innerHTML); };
			container.appendChild(section);
			
			//============ analysis-types flags ============
			var switchesHeader = document.createElement('span');
			//switchesHeader.className = 'toggelableText on';
			switchesHeader.innerHTML = '- Enable/disable analysis types:';
			//switchesHeader.title = 'makes sure your working directory / export path matches the report\'s expectations.';
			container.appendChild(switchesHeader);
			
			//styling & positioning:
			switchesHeader.style.fontSize = '13px';
			switchesHeader.style.paddingLeft = '15px';//'50px';
			switchesHeader.style.paddingTop = '10px';
			
			
			var runOccupancy = document.createElement('span');
			runOccupancy.className = 'toggelableText on';
			runOccupancy.innerHTML = 'occupancy';
			//runOccupancy.title = 'makes sure your working directory / export path matches the report\'s expectations.';
			container.appendChild(runOccupancy);
			
			//styling & positioning:
			runOccupancy.style.fontSize = '13px';
			runOccupancy.style.paddingLeft = '15px';
			runOccupancy.style.paddingTop = '10px';
			
			//behaviour:
			runOccupancy.onclick = function(){
				var jq = $(runOccupancy);
				if(jq.hasClass('off')){
					jq.removeClass('off').addClass('on');
				}
				else{
					jq.removeClass('on').addClass('off');
				}
				updateKernelAnalysisCommand();
			};
			
			var runLatency = document.createElement('span');
			runLatency.className = 'toggelableText on';
			runLatency.innerHTML = 'latency';
			//runLatency.title = 'makes sure your working directory / export path matches the report\'s expectations.';
			container.appendChild(runLatency);
			
			//styling & positioning:
			runLatency.style.fontSize = '13px';
			runLatency.style.paddingLeft = '15px';
			runLatency.style.paddingTop = '10px';
			
			//behaviour:
			runLatency.onclick = function(){
				var jq = $(runLatency);
				if(jq.hasClass('off')){
					jq.removeClass('off').addClass('on');
				}
				else{
					jq.removeClass('on').addClass('off');
				}
				updateKernelAnalysisCommand();
			};
			
			
			var force = document.createElement('span');
			force.className = 'toggelableText on';
			force.innerHTML = 'override existing analysis results';
			force.title = 'overrides the existing results (of the previous analysis).';
			container.appendChild(force);
			
			//styling & positioning:
			force.style.position = 'absolute';
			force.style.top = '122px';
			force.style.right = '10%';
			force.style.fontSize = '13px';
			//force.style.paddingRight = '15px';//'50px';
			//force.style.paddingTop = '10px';
			
			//behaviour:
			force.onclick = function(){
				var jq = $(force);
				if(jq.hasClass('off')){
					jq.removeClass('off').addClass('on');
				}
				else{
					jq.removeClass('on').addClass('off');
				}
				updateKernelAnalysisCommand();
			};
			
			updateKernelAnalysisCommand();
			
			//section.appendChild(infoTable);
			container.appendChild(section);
			
			
			
			
			
			//---------------------- level 3 ----------------------//
			//tr = layout.insertRow();
			tr = layout.insertRow();
			var td = tr.insertCell();
			//td.style.paddingLeft = '20px';
			td.style.textAlign = 'center';
			td.style.fontSize = '16px';
			td.style.paddingTop = '50px';
			td.style.paddingBottom = '30px';

			var loadResultsSpan = document.createElement('span');
			loadResultsSpan.className = 'deepAnalysisLauncher';
			td.appendChild(loadResultsSpan);
			loadResultsSpan.innerHTML = 'Load analysis results';
			loadResultsSpan.title = 'click this after the manual analysis command is done to load the results.';

			loadResultsSpan.onclick = function(){
				$(reportItem).empty();
				loadKernelReport(reportItem, kernelData);
				return;
			};
			
			return layoutWrapper;
			
		}
		
		
		
		function updateKernelAnalysisCommand(){
			if(section == null){
					return;
				}
				
				var mainHTML = window.location.pathname;
				//to fix the "%20" added by the browser:
				mainHTML = mainHTML.replace(/%20/gi, " ");
				
				if(mainHTML.startsWith('file:///')){
					mainHTML = mainHTML.replace("file:///", "");
				}
				
				if (window.navigator.userAgent.indexOf("Linux")==-1){//for windows
					while(mainHTML.startsWith('/')){
						mainHTML = mainHTML.substring(1);
					}
				}
				
				var folderEndIndex = mainHTML.lastIndexOf("/");
				var baseDir = mainHTML.substring(0, folderEndIndex) + '/';

				var outputDir = kernelData.filesDirName;
				
				function isNullOrEmpty(value){
					return value == null || value == '';
				}
				
				var locals = '';
				if(!isNullOrEmpty(kernelData.Lx) || !isNullOrEmpty(kernelData.Ly) || !isNullOrEmpty(kernelData.Lz)){
					var Lx = '0', Ly = '0', Lz = '0';
					
					if(!isNullOrEmpty(kernelData.Lx)){
						Lx = kernelData.Lx;
					}
					if(!isNullOrEmpty(kernelData.Ly)){
						Ly = kernelData.Ly;
					}
					if(!isNullOrEmpty(kernelData.Lz)){
						Lz = kernelData.Lz;
					}
					locals = ' --locals "' + Lx + ';' + Ly + ';' + Lz + '"';
				}
				
				
				
				var preCommand = '';
				//if (window.navigator.userAgent.indexOf("Linux")!=-1){
				//	preCommand = 'mono ';
				//}
				
				//original command:
				section.innerHTML = preCommand + 'CodeBuilder analyze-kernel -k "' + KBSKernelName + '" -c "' + KBSConfiguration + '" -s "' + kernelData.KBFilename +
											'"' + locals + ' -o "' + outputDir + '" --mainhtml "' + mainHTML + '"';
				
				//analysis types flags:
				if($(runOccupancy).hasClass('on')){
					section.innerHTML += ' --occupancy';
				}
				if($(runLatency).hasClass('on')){
					section.innerHTML += ' --latency';
				}
				
				//additional flags
				if($(force).hasClass('on')){
					section.innerHTML += ' -f';
				}
		}
		
		
		//---------------------------------------------------------------------------------------------------
		function createSection(title, tipsCount, info, keyColumnWidth){
			
			var section = document.createElement('div');
			section.className = 'hostProfilingOverviewSection';
			
			var titleSpan = document.createElement('span');
			titleSpan.className = 'sectionTitle';
			titleSpan.innerHTML = title;
			section.appendChild(titleSpan);
			
			if(tipsCount > 0){//todo: parse to int first.
				var tipsSpan =document.createElement('span');
				tipsSpan.className = 'sectionTipsCount';
				tipsSpan.innerHTML = tipsCount + ' tips';
				section.appendChild(tipsSpan);
			}
			
			if(info !=null && info.length > 0){
				var infoTable = document.createElement('table');
				infoTable.className = 'sectionInfoTable';
				for(var i = 0; i < info.length; i++)(function(i){
					var tr = infoTable.insertRow();
					
					var td = tr.insertCell();
					td.className = 'sectionInfoKey';
					td.innerHTML = '- ' + info[i][0];
					if(keyColumnWidth != null){
						td.style.width = keyColumnWidth;
					}
					
					td = tr.insertCell();
					td.className = 'sectionInfoValue';
					td.innerHTML = info[i][1];
					
					//can copy?
					if(info[i][2] == true){
						td.title = 'click to copy to clipboard';
						td.className = 'copiable';
						td.onclick = function (){ copyToClipboard(info[i][1]); };
					}
				})(i);
				
				section.appendChild(infoTable);
			}
			
			return section;
		}
		
		
	}
	
	
	function readAjaxData(source){
		//basic check:
		if(source == null){
			return null;
		}
		
		//get and parse the data:
		var ajaxData = null;
		
		$.ajax({
			url: source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				ajaxData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				ajaxData = null;
				//appendCriticalErrorMessage(reportItem , "Error: unable to retrieve Kernel's data:<br/> \"" + errorThrown + "\".");
			}
		});
		
		return ajaxData;
	}
	
	function buildKernelOverviewReport(overviewData, page){
		page.innerHTML = JSON.stringify(overviewData);
	}
	
	
	/*****************************************/
	/* Load / Dispose functions */
	/*****************************************/
	function onPageLoad(id){
		//console.log('inner load: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			//appendCriticalErrorMessage(parent , "Error: unable to find report!");
			alert("Error: unable to find report!");
			return;
		}
		kernelData.lastState.activePage = id;
		
		//call it's loading function (if it has any):
		if (typeof page.loadingFunc == 'function') {
			page.loadingFunc();
		}
		else{
			console.log('no loading function found for ' + id);
		}
		
	}
	
	function onPageDispose(id){
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			alert("Error: unable to find report!");
			return;
		}
		
		//if(id == page1_id){
			//todo.
		//}
		
		if(id == page2_id){
			//todo.
		}
		
		//call the item's special dispose function (if it has any):
		if (typeof page.onItemDispose == 'function') {
			page.onItemDispose();
		}
		
		$(page).empty();
	}
	
	reportItem.onItemDispose = function(){
		var activePage = tl.getCurrentItem();
		onPageDispose(activePage.id);
	}
	
	
	
	
	
	
	
	
}

function loadKernelsOverviewReport(reportItem, kernelsOverview){

	//*****************************************/
	/* Building report structure */
	/*****************************************/
	//basics:
	if(!kernelsOverview.lastState){
		kernelsOverview.lastState = { 'activePage': null };
	}
	
	var vm = new ViewMode(reportItem, 140, 'Kernels Overview:', 'reportTitle');
	reportItem.appendChild(CreateSeperator('100%', null, '5px'));
	var tl = new TransitionList(reportItem, '100%', false, 'fxPressAwayFAST', '', 400, 'transitionListItemContainer', onPageLoad, onPageDispose);
	
	//ids:
	var vm1_id = 'hostProf_kernelsOverview_tableView', page1_id = 'hostProf_kernelsOverview_tablePage';
	var vm2_id = 'hostProf_kernelsOverview_graphView', page2_id = 'hostProf_kernelsOverview_graphPage';
	
	//create pages:
	if(kernelsOverview.table){
		vm.add(vm1_id, 'Data Table', function () { tl.switchTo(page1_id); });
		var page1 = tl.addReportToList(page1_id);
		page1.loadingFunc = function(){ buildkernelsOverviewTable(kernelsOverview.table, page1); };
		
		//last state:
		if(kernelsOverview.lastState && kernelsOverview.lastState.activePage == page1_id){
			page1.loadingFunc();
		}
	}
	
	if(kernelsOverview.graph != null && kernelsOverview.graph != ''){
		vm.add(vm2_id, 'Graphical View', function () { tl.switchTo(page2_id); });
		var page2 = tl.addReportToList(page2_id);
		page2.loadingFunc = function(){ buildkernelsOverviewGraph(kernelsOverview.graph, page2); };
		
		//last state:
		if(kernelsOverview.lastState && kernelsOverview.lastState.activePage == page2_id){
			vm.setFocusOn(vm2_id);
		}
	}

	//if no last-state set yet, set it to be the first:
	if(kernelsOverview.lastState.activePage == null && tl.itemsCount > 0){
		//kernelsOverview.lastState = { 'activePage': null };
		var firstPageId = tl.callLoadOnFirstItem();
		kernelsOverview.lastState.activePage = firstPageId;
	}
	
	
	//build tips:
	if(kernelsOverview.tips){
		buildKernelsOverviewTips(kernelsOverview.tips);
	}
	
	
	
	/*****************************************/
	/* Load / Dispose functions */
	/*****************************************/
	function onPageLoad(id){
		//console.log('inner load: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			//appendCriticalErrorMessage(parent , "Error: unable to find report!");
			alert("Error: unable to find report!");
			return;
		}
		kernelsOverview.lastState.activePage = id;
		
		//call it's loading function (if it has any):
		if (typeof page.loadingFunc == 'function') {
			page.loadingFunc();
		}
		else{
			console.log('no loading function found for ' + id);
		}
		
	}
	
	function onPageDispose(id){
		//console.log('inner dispose: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			alert("Error: unable to find report!");
			return;
		}
		
		if(id == page1_id){
			kernelsOverview.lastState.tableView = {'tableState': null};
		}
		
		if(id == page2_id){
			//get graph's last state:
			if(page.objectsMap && page.objectsMap.graph != null){
				var graphLastState = page.objectsMap.graph.getState();
				kernelsOverview.lastState.graphView = {'graphState': graphLastState};
			}
		}
		
		$(page).empty();
	}
	
	reportItem.onItemDispose = function(){
		var activePage = tl.getCurrentItem();
		onPageDispose(activePage.id);
	}
	
	
	
	/*****************************************/
	/* Build page1 - table view */
	/*****************************************/
		function buildkernelsOverviewTable(pageData, parent) {
		//spcial handling for bad datatable plug-in margin in IE:
		if(browserInfo.isIE == true){
			$(parent).addClass('IEmode');
		}
		
		//special handling for bad datatable plug-in body-height in Chrome:
		if(browserInfo.isChrome == true){
			parent.style.overflowY = 'hidden';
		}
		
		var id = 'hostProf_kernelsOverview_tableView_table';
		var OCLObjects = [];
		var ActiveTipInfo = {};
		var metricsInfo = [];
		
		//get the oclObjects info:
		$.ajax({
			url: kernelsOverview.oclObjects.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				OCLObjects = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				OCLObjects = [];
			}
		});
		
		//get the HW metrics info:
		$.ajax({
			url: pageData.metricsInfo,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				metricsInfo = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				alert('failed to get metrics info: ' + errorThrown);//todo: remove.
				metricsInfo = {};
			}
		});
		
		//transition list height binding to window size:
		window.addEventListener('resize', function (event) {
			resizeTableToFitScreen();
		});
		
		function resizeTableToFitScreen(){
			var scrollBodies = $(parent).find('.dataTables_scrollBody');
			if (scrollBodies != null && scrollBodies.length > 0) {
				$(scrollBodies[0]).css('height', ($(parent).height() - 51));
			}
    
		}
		
		var columns = [
				{
					"title": "",
					"defaultContent": "+",
					"searchable": false,
					"className": 'details-control',
					"orderable": false
				},
				{
					"title": "<span class='hwCountersHeaders'>Kernel Name</span>",
					"data": "kernelName",
					"contentPadding": "mmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Global Work Size</span>",
					"data": "globalWorkSize",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Local Work Size</span>",
					"data": "localWorkSize",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Device Type</span>",
					"data": "deviceType",
					"contentPadding": "mm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Count</span>",
					"data": "executionsCount",
					"contentPadding": "mmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Total Duration (µs)</span>",
					"data": "totalDuration",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Avg Duration (µs)</span>",
					"data": "avgDuration",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Min Duration (µs)</span>",
					"data": "minDuration",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Max Duration (µs)</span>",
					"data": "maxDuration",
					"contentPadding": "mmmm"
				}
			];
			
			
			
		if(metricsInfo.stats != null){

				var memoryDiagramColumn = {
						"title": "",
						"className": "memoryDiagramLauncher",
						"searchable": false,
						"orderable": false,
						"render": function (data, type, row) {							
							//check if needed data exists:
							if(row.EuActive != null && row.EuActive != '' && row.EuActive != '[N/A]'){
								var spanHTML = '<span class="linkableTextIntelBlue" style="margin-right: 10px;" ' +
													   'title="view data as a memory diagram">[...]</span>';
								return spanHTML;
							}
							return '';
						}
					};
				
				columns.push(memoryDiagramColumn);
			
			}
			
			
		//HW metrics columns definition:
		if(metricsInfo.stats != null){
			columns = columns.concat(metricsInfo.stats);
		}
		
		$('<table id="' + id + '" class="display "/>').appendTo(parent);
		var dataTableObj = $('#' + id).DataTable({
			"ajax": pageData.source,
			"columns": columns,
			"order": [[1, 'asc']],
			//"bLengthChange": false,
			//"bFilter": false,
			"bInfo": false,
			//"aLengthMenu": [10],
			"scrollY": "auto",
			"sScrollX": "100%",
			"bPaginate": false,
			"bSortClasses": false,
			"language": { "emptyTable": "no records available." }
			//	"sRowSelect": "single"
			
		});
		$('#' + id).css({ 'min-width': '1200px' });

		resizeTableToFitScreen();
		
		var selectedRow = null;
		$($('#' + id).find('tbody')).on('click', 'tr', function () {
			if(selectedRow != null){
				$(selectedRow).removeClass('selected');
			}
			
			selectedRow = this;
			$(selectedRow).addClass('selected');
		} );
		
		$($('#' + id).find('tbody')).on('dblclick', 'tr', function () {
			
			var td = $(this).find('td.details-control')[0];
			$(td).click();
		} );
		
		
		// Add event listener for opening and closing details
			var count = 0;
			$($('#' + id).find('tbody')).on('click', 'td.memoryDiagramLauncher', function () {
				if(this.innerHTML == ''){
					return;
				}
				
				count++;
				this.style.cursor = 'pointer';
				var t1_parentTR = this.parentNode;
				var t1_row = dataTableObj.row(t1_parentTR);
				var t1_data = t1_row.data();
				
				openMemoryDiagram(t1_parentTR, t1_row, t1_data);
				
			});

			if(count == 0){
				//alert('todo: hide the column');
			}
		
		// Add event listener for opening and closing details
		$('#' + id + ' tbody').on('click', 'td.details-control', function () {
			var tr = $(this).closest('tr');
			var row = dataTableObj.row(tr);

			if (row.child.isShown()) {
				// This row is already open - close it
				row.child.hide();
				row.child.remove();
				RowDetailsHidden($(this));
				
				//clear highlight:
				$(tr).find('.tableFocusedRow_topLeft').removeClass('tableFocusedRow_topLeft');
				$(tr).find('.tableFocusedRow_top').removeClass('tableFocusedRow_top');
				
			}
			else {
				//close previouse active rows:
				closeActiveDetailRows();
				
				// Open this row
				child = createRowDetails(tr, row, row.data());
				child.show();
				RowDetailsShown($(this));
				
				
			}

		});
		
		function closeActiveDetailRows(){
			var activeRows = $('#' + id).find('.activeDetailsParentRow');
			if(activeRows.length > 0){
				activeRows.trigger('click');
			}
		}

		function createRowDetails(parentTR, row, rowData) {
			
			var parentCells = $(parentTR).find('td');
			for(var i=0; i<parentCells.length; i++){
				if(i==0){
					$(parentCells[0]).addClass('tableFocusedRow_topLeft');
				}
				else{
					$(parentCells[i]).addClass('tableFocusedRow_top');
				}
			}
			
			var div = document.createElement('div');
			div.style.background = 'white';//'#bfc7ce';
			div.style.height = '198px';
			//div.style.minHeight = '190px';
			//div.style.maxHeight = '190px';
			div.style.width = 'calc(100% - 40px)';
			//div.style.minWidth = '1200px';
			div.style.marginLeft = '20px';
			div.style.overflow = 'auto';
			div.style.overflowY = 'hidden';
			child = row.child(div);
			
			$(div.parentNode).addClass('tableFocusedRow_left');
			
			
			
			var tableLayout = document.createElement('table');
			tableLayout.style.width = '100%';
			var tr = tableLayout.insertRow();

			var cell_datatable = tr.insertCell();
			cell_datatable.style.width = '70%';
			cell_datatable.style.minWidth = '500px';
			cell_datatable.style.paddingBottom = '0px';

			var cell_graph = tr.insertCell();
			cell_graph.className = 'cell_detailesGraph';
			$(div).append(tableLayout);

			var tableContainer = document.createElement('div');
			tableContainer.style.background = '#fcfcfc';
			tableContainer.style.marginRight = '5px';
			tableContainer.style.marginTop = '15px';
			$(cell_datatable).append(tableContainer);


			
			/*
			var headerDiv = document.createElement('div');
			headerDiv.className = 'kernelsOverviewInnerHeaderDiv';
			div.appendChild(headerDiv);
			
			var title = document.createElement('div');
			title.className = 'kernelsOverviewInnerHeaderTitle';
			title.innerHTML = ' actions:';
			headerDiv.appendChild(title);
			
			var viewSrcButton = document.createElement('span');
			viewSrcButton.className = 'kernelsOverviewInnerHeaderButton';
			viewSrcButton.innerHTML = 'source';
			viewSrcButton.title = 'view source code';
			headerDiv.appendChild(viewSrcButton);
			
			var deepAnalysisButton = document.createElement('span');
			deepAnalysisButton.className = 'kernelsOverviewInnerHeaderButton';
			deepAnalysisButton.innerHTML = 'analysis';
			deepAnalysisButton.title = 'deep analysis';
			headerDiv.appendChild(deepAnalysisButton);
			
			var editInKDFButton = document.createElement('span');
			editInKDFButton.className = 'kernelsOverviewInnerHeaderButton';
			editInKDFButton.innerHTML = 'edit';
			editInKDFButton.title = 'edit in KDF';
			headerDiv.appendChild(editInKDFButton);
			*/
			
			/*var tableWrapper = document.createElement('div');
			tableWrapper.className = 'kernelsOverviewInnerTableWrapper';
			div.appendChild(tableWrapper);
			*/
			
			
			
			var graphContainer = document.createElement('div');
			graphContainer.className = 'kernelsOverviewInnerGraphContainer';
			cell_graph.appendChild(graphContainer);
			graphContainer.style.width = '100%';
			graphContainer.style.height = '180px';
			graphContainer.style.position = 'relative';
			
			//div.appendChild(CreateSeperator());
			
			/*cell_graph = tr.insertCell();
			$(div).append(tableLayout);

			tableContainer = document.createElement('div');
			tableContainer.style.background = '#fcfcfc';
			tableContainer.style.marginRight = '5px';
			tableContainer.style.marginTop = '15px';
			$(cell_datatable).append(tableContainer);
*/
			var table = document.createElement('table');
			table.className = 'display'; //apiTraceTable
			$(tableContainer).append(table);
			table.rowData = rowData;
			
			var columns = [
				//{
				//	"title": "Type",
				//	"data": "type"
				//},
				{
					"title": "<span class='hwCountersHeaders'>Duration (µs)</span>",
					"data": "duration"
				},
				{
					"title": "<span class='hwCountersHeaders'>Start Time (µs)</span>",
					"data": "startTime"
				},
				{
					"title": "<span class='hwCountersHeaders'>End Time (µs)</span>",
					"data": "endTime"
				},
				{
					"title": "<span class='hwCountersHeaders'>Latency (µs)</span>",
					"data": "latency",
					"chartable": "true"
				},
				//{
				//	"title": "Return Value",
				//	"data": "returnValue"
				//},
				//{
				//	"title": "Command Queue ID",
				//	"data": "commandQueueID"
				//},
				//{
				//	"title": "Context ID",
				//	"data": "contextID"
				//},
				{
					"title": "<span class='hwCountersHeaders'>Global Work Offset</span>",
					"data": "globalWorkOffset"
				}
			];
			
			var scrollY = null;
			if(rowData.executionsCount != null && rowData.executionsCount > 4){
				scrollY = '100px';
			}
			
			
			
			if(rowData.deviceType.toLowerCase() == "gpu" && metricsInfo.details != null){

				var memoryDiagramColumn = {
						"title": "",
						"className": "t2_memoryDiagramLauncher",
						"searchable": false,
						"orderable": false,
						"render": function (data, type, row) {							
							//check if needed data exists:
							if(row.EuActive != null && row.EuActive != '' && row.EuActive != '[N/A]'){
								var spanHTML = '<span class="linkableTextIntelBlue" style="margin-right: 10px;" ' +
													   'title="view data as a memory diagram">[...]</span>';
								return spanHTML;
							}
							return '';
						}
					};
				
				columns.push(memoryDiagramColumn);
			
			}
			
			
			
			//HW metrics columns definition:
			if(rowData.deviceType.toLowerCase() == "gpu" && metricsInfo.details != null){
				columns = columns.concat(metricsInfo.details);
			}
		
			
			detailsTableObj = $(table).DataTable({

				"ajax": rowData.details,
				"columns": columns,
				"bSortClasses": false,
				"scrollY": "100px",
				"bDeferRender": true,
				"processing": true,
				"serverSide": false,
				//"bFilter": false,
				//"bLengthChange": false,
				//"bInfo": false,
				//"scrollY": "130px",
				//"sScrollX": "100%",
				//"bPaginate": false,
				//"bInfo": false,
				"aLengthMenu": [4],
				"fnInitComplete": function (oSettings, json) {
					//create bars-chart:
					createGraphFromTableData(graphContainer, json.data, 'duration');
				}
			});

			// Add resize listener:
			$(table).resize(function () {
				detailsTableObj.columns.adjust();
			});
			
			
			// Add event listener for opening and closing details
			var count = 0;
			$($(table).find('tbody')).on('click', 'td.t2_memoryDiagramLauncher', function () {
				if(this.innerHTML == ''){
					return;
				}
				
				count++;
				this.style.cursor = 'pointer';
				var t2_parentTR = this.parentNode;
				var t2_row = detailsTableObj.row(t2_parentTR);
				var t2_data = t2_row.data();
				
				openMemoryDiagram(t2_parentTR, t2_row, t2_data);
				
			});

			if(count == 0){
				//alert('todo: hide the column');
			}
			
			return child;
		}
	
	
	}
	
	
	
	function openMemoryDiagram(parentTR, row, allData){
		
		var popupDiv = openOverlayLayout('850px', '380px', true);
		
		var title = document.createElement('div');
		title.innerHTML = 'Memory Diagram:';
		title.style.textAlign = 'left';
		title.style.color = 'gray';
		title.style.marginTop = '20px';
		title.style.marginLeft = '20px';
		popupDiv.appendChild(title);
		
		var seperator = CreateSeperator('80%', null, '0px');
		seperator.style.marginLeft = '12px';
		popupDiv.appendChild(seperator);
		
		var diagramContainer = document.createElement('div');
		diagramContainer.style.marginTop = '20px';
		diagramContainer.style.marginLeft = '10px';
		diagramContainer.style.marginRight = '10px';
		popupDiv.appendChild(diagramContainer);
		
		var memoryDiagram = new MemoryDiagram(diagramContainer, 'hsw');
		
		//calculations:
		var EU_text = '';
		if(allData.EuStall && allData.EuStall != ''){
			EU_text += 'EU Stall: ' + allData.EuStall + '<br/>';
		}
		if(allData.EuActive && allData.EuActive != ''){
			EU_text += 'EU Active: ' + allData.EuActive + '<br/>';
		}
		if(allData.EuIdle && allData.EuIdle != ''){
			EU_text += 'EU Idle: ' + allData.EuIdle + '<br/>';
		}
		if(allData.EuThreadOccupancy && allData.EuThreadOccupancy != ''){
			EU_text += 'Occupancy: ' + allData.EuThreadOccupancy + '<br/>';
		}
		

		var arrow_EU_L3 = '';
		if(allData.SlmBytesRead && allData.SlmBytesRead != ''){
			arrow_EU_L3 += 'Slm Bytes Read: ' + allData.SlmBytesRead + '<br/>';
		}
		if(allData.SlmBytesWritten && allData.SlmBytesWritten != ''){
			arrow_EU_L3 += 'Slm Bytes Written: ' + allData.SlmBytesWritten + '<br/>';
		}
		if(allData.TypedBytesRead && allData.TypedBytesRead != ''){
			arrow_EU_L3 += 'Typed Bytes Read: ' + allData.TypedBytesRead + '<br/>';
		}
		if(allData.TypedBytesWritten && allData.TypedBytesWritten != ''){
			arrow_EU_L3 += 'Typed Bytes Written: ' + allData.TypedBytesWritten + '<br/>';
		}
		if(allData.UntypedBytesRead && allData.UntypedBytesRead != ''){
			arrow_EU_L3 += 'Untyped Bytes Read: ' + allData.UntypedBytesRead + '<br/>';
		}
		if(allData.UntypedBytesWritten && allData.UntypedBytesWritten != ''){
			arrow_EU_L3 += 'Untyped Bytes Written: ' + allData.UntypedBytesWritten + '<br/>';
		}
		
		var arrow_L3_LLC = '';
		if(allData.LlcAccesses && allData.LlcAccesses != ''){
			arrow_L3_LLC += 'LLC Accesses: ' + allData.LlcAccesses + '<br/>';
		}
		if(allData.LlcHits && allData.LlcHits != ''){
			arrow_L3_LLC += 'LLC Hits: ' + allData.LlcHits + '<br/>';
		}

		
		memoryDiagram.setValues(
									EU_text, //EU
									'', //unit_L1
									'', //unit_L2
									'',//unit_L3
									'',//unit_LLC
									'',//unit_DRAM
									'',//arrow_EU_L1
									'',//arrow_L1_L2
									'',//arrow_L2_L3
									arrow_L3_LLC,
									'',//arrow_LLC_DRAM_up
									arrow_EU_L3
								);
	}
	
	
	/*****************************************/
	/* Build page2 - graph view */
	/*****************************************/
	function buildkernelsOverviewGraph(pageData, parent){
		//objects map:
		parent.objectsMap = {};
		
		//read graph data:
		$.ajax({
			url: pageData.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (graphData) {
				//build graph:
				var graphContainer = document.createElement('div');
				graphContainer.className = 'apiCallsGraphContainer';
				parent.appendChild(graphContainer);
				
				var graph = new Graph(graphContainer);
				graph.setData(graphData.datasets);
				graph.setOptions(graphData.options);
				graph.Render();
				
				//save reference:
				parent.objectsMap.graph = graph;
				
				//apply last state (if there any):
				if(kernelsOverview.lastState.graphView && kernelsOverview.lastState.graphView.graphState != null){
					graph.applyState(kernelsOverview.lastState.graphView.graphState);
				}
			},
			error: function(jqxhr, statusText, errorThrown){
				appendCriticalErrorMessage(parent , "Error: unable to retrieve \"Kernels Overview\" graph:<br/> \"" + errorThrown + "\".");
			}
		});
		
	
	}
	
	
	/*****************************************/
	/* Build KernelsOverview Tips */
	/*****************************************/
	function buildKernelsOverviewTips(pageData){
		
		var tipsData = [];
		
		//read graph data:
		$.ajax({
			url: pageData.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				tipsData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				alert('Warning: failed to read analysis tips: ' + errorThrown);
				tipsData = [];
			}
		});
		
		//build tips list:
		var len = tipsData.length;
		for(var i=0; i<len; i++) (function(i){
			var tipInfo = tipsData[i];
			
			var onClickFunc = null;
			if(tipInfo.onClickInfo != null){
				onClickFunc = function(){
					
					var notificationAnimationDelay = 0;
					
					//if the tip wants to filter by an ApiName:
					if(tipInfo.onClickInfo.apiName != null && tipInfo.onClickInfo.apiName != ''){
						
						//set ApiCalls report ViewMode Focus on DataTable page:
						notificationAnimationDelay = vm.setFocusOn(vm1_id);
						
						//filter table by the given apiName:
						FilterDatatable_singleColumn(mainDataTable_id, 1, tipInfo.onClickInfo.apiName);
						
						//set active tip & highlighting rows info: (this is needed to highlight the table without knowing it's id)
						setActiveTipInfo('', tipInfo.onClickInfo.innerRowsToHighlight);
						
						//expand row and show innerTable details: 
						expandDetailesForFirstFilteredRowInTable(mainDataTable_id);
						
						//get the id of the new inner table:
						var detailesTableID = getDetailesDataTableIDForFirstFilteredRow(mainDataTable_id);
						
						//set active tip & highlighting rows info: (this is needed to apply highlighting only to this innerTable)
						setActiveTipInfo(detailesTableID, tipInfo.onClickInfo.innerRowsToHighlight);
					}
					
					if(tipInfo.notification != null && tipInfo.notification != ''){
						setTimeout(function(){
							showNotificationCenterScreen(tipInfo.notification);
						}, notificationAnimationDelay);
					}
					
				}
			}
			
			addNewTip(tipInfo.title, tipInfo.description, tipInfo.icon, onClickFunc, tipInfo.tipID);
			
		})(i);
		
		
	}
	
	
}

function buildKernelLatencyReport(latencyMainAjax, reportItem, lastState){
	
	//globals:
	var latencyArray;

	//last state initialization:
	if(lastState == null){
		lastState = {};
	}
		
		
	//if we have any errors, show them and return:
	if(latencyMainAjax.latencyErrors != null && latencyMainAjax.latencyErrors != ''){
		appendCriticalErrorMessage(reportItem , latencyMainAjax.latencyErrors);
	}
		
		
	//read homePage data:	
	var criticalError = false;
	$.ajax({
        url: latencyMainAjax.source,
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			latencyArray = data;
        },
        error: function(jqxhr, statusText, errorThrown){
			criticalError = true;
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Kernel Latency\":<br/> \"" + errorThrown + "\".");
        }
    });
	
	if(criticalError == true){
		return;
	}
	

	var currentLatencyElement = latencyArray[0];
	if(currentLatencyElement == null){
		return;
	}
	
	//read source code:
	var srcCode;
	$.ajax({
        url: currentLatencyElement.srcCodeSource,
        type: "POST",
        dataType: "text",
		async: false,
        success: function (data) {
			srcCode = data;
        },
        error: function(jqxhr, statusText, errorThrown){
			criticalError = true;
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve kernel's source code:<br/> \"" + errorThrown + "\".");
        }
    });
	
	if(criticalError == true){
		return;
	}
	
	//read table data:
	var linesData;
	$.ajax({
        url: currentLatencyElement.latencyDataSource,
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			linesData = data;
        },
        error: function(jqxhr, statusText, errorThrown){
			criticalError = true;
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Kernel Latency\":<br/> \"" + errorThrown + "\".");
        }
    });
	
	if(criticalError == true){
		return;
	}
	
	//create a table container:
    var linesTableContainer = document.createElement('div');
    linesTableContainer.className = 'linesTableContainer';
    reportItem.appendChild(linesTableContainer);	

    //create a source code viewer:
    var srcViewer = document.createElement('div');
    srcViewer.className = 'srcCodeView';
    reportItem.appendChild(srcViewer);
	
	//create source code viewer:
	srcViewer.appendChild(CreateSrcViewer(srcCode));

    //apply syntax highlighter:
    SyntaxHighlighter.defaults.toolbar = false;
    SyntaxHighlighter.highlight();
	
	//resize the srcViewer on window size:
	$(window).resize(onLatencyReportResize);
	
	function onLatencyReportResize(){
		var topOffset = $(srcViewer).position().top;
        $(srcViewer).css({ 'height': 'calc(100% - ' + topOffset + 'px - 10px)' });
	}
	
	//set inner heights to 100% (to make the horizontal scroller visible all the time):
	$(srcViewer).find('div:first').css({ 'height': '100%' });
	var highlighterDiv = $(srcViewer).find('.syntaxhighlighter')[0];
	highlighterDiv.style.height = '100%';
	
	//apply last state (if there is one):
    if (lastState.lastState_srcTarget) {
        srcViewer_scrollTo(highlighterDiv, lastState.lastState_srcTarget, 0, 0);
    }
	
	//create the lines data table:
	createLinesDataTable('latency_linesTable', linesTableContainer, linesData, highlighterDiv);
	
	//call resize function after everything is created to adjust the scrollers:
	onLatencyReportResize();
	
	
	/*****************************************/
	/* dispose function */
	/*****************************************/
	reportItem.onItemDispose = function(){
		//todo: save last state.
		$(window).off("resize", onLatencyReportResize);		
	}	
	
	
	
	
	/*****************************************/
	/* Help functions */
	/*****************************************/
	
	function createLinesDataTable(id, parentToAppendTo, data, srcViewer) {
		var table = document.createElement('table');
		table.id = id;
		table.className = 'display latencyTable';
		table.linkedSrcViewer = srcViewer;
		$(table).appendTo(parentToAppendTo);

		var dataTableObj = $('#' + id).DataTable(
		{
			"aaData": data,
			"aoColumns":
			[
				{
					"title": "Line #",
					"mDataProp": "lineNumber",
					"className": "linkableSrcCode",
				},
				{
					"title": "Total Latency (%)",
					"mDataProp": "totalLatency_percentages"
				},
				{
					"title": "Total latency (cycles)",
					"mDataProp": "totalLatency_cycles"
				},
				{
					"title": "Count",
					"mDataProp": "count"
				},
				{
					"title": "Average Latency (cycles)",
					"mDataProp": "avgLatency_cycles"
				}
			],
			"order": [[1, 'desc']],
			"bLengthChange": false,
			"bFilter": false,
			//"bInfo": false,
			"aLengthMenu": [5],
			"language": {"emptyTable": "no records available."}
		});

		// Add event listener for opening and closing details
		$('#' + id + ' tbody').on('click', 'tr', function () {
			var rowData = dataTableObj.row(this).data();
			srcViewer_scrollTo(table.linkedSrcViewer, rowData.lineNumber, 800, 1000);
			return false;
		});
	}
	
	
	function srcViewer_scrollTo(viewer, target, speed, highlightDelay) {
		
		if(target == null){
			return;
		}
		
		if(speed == null){
			speed = 800;
		}
		
		if (highlightDelay == null) {
			highlightDelay = 1000;
		}

		//unhighlight everything currently highlighted:
		$(viewer).find('.highlighted').removeClass('highlighted');

		//calc new scrolling target:
		viewerJquery = $(viewer);
		var lineToHighlightJquery = $(viewer.getElementsByClassName('line number' + target));
		var viewerOffset = viewerJquery.offset().top;
		var targetOffset = lineToHighlightJquery.offset().top - viewerOffset + viewerJquery.scrollTop();
		var viewerHeight = viewerJquery.height();
		var scrollingOffset = targetOffset - (viewerHeight / 2);

		viewerJquery.animate({ scrollTop: scrollingOffset }, speed);

		setTimeout(function () {
			//get elements to be highlighted:
			lineToHighlight = viewer.getElementsByClassName('line number' + target);
			var lineNumberTD = lineToHighlight[0];
			var SrcCodeTD = lineToHighlight[1];

			//unhighlight everything currently highlighted:
			$(viewer).find('.highlighted').removeClass('highlighted');

			//apply highlight class to target elements:
			$(lineNumberTD).addClass('highlighted');
			$(SrcCodeTD).addClass('highlighted');

		}, highlightDelay);

		//save target for last state purposes:
		lastState.lastState_srcTarget = target;
		
	}


}


function loadMemoryCommandsReport(reportItem, memoryCommands){
	/*****************************************/
	/* Building report structure */
	/*****************************************/
	//basics:
	if(!memoryCommands.lastState){
		memoryCommands.lastState = { 'activePage': null };
	}
	
	var vm = new ViewMode(reportItem, 140, 'Memory Commands:', 'reportTitle');
	reportItem.appendChild(CreateSeperator('100%', null, '5px'));
	var tl = new TransitionList(reportItem, '100%', false, 'fxPressAwayFAST', '', 400, 'transitionListItemContainer', onPageLoad, onPageDispose, 0);
	
	//ids:
	var vm1_id = 'hostProf_memoryCommands_tableView', page1_id = 'hostProf_memoryCommands_tablePage';
	var vm2_id = 'hostProf_memoryCommands_graphView', page2_id = 'hostProf_memoryCommands_graphPage';
	var mainDataTable_id = 'hostProf_memoryCommands_tableView_table';
	
	//create pages:
	if(memoryCommands.table){
		vm.add(vm1_id, 'Data Table', function () { tl.switchTo(page1_id); });
		var page1 = tl.addReportToList(page1_id);
		page1.loadingFunc = function(){
			if( $(page1).is(':empty') ) {
				buildMemoryCommandsTable(memoryCommands.table, page1);
			}
		};
		
		//last state:
		if(memoryCommands.lastState && memoryCommands.lastState.activePage == page1_id){
			page1.loadingFunc();
		}
	}
	
	if(memoryCommands.graph && memoryCommands.graph.source != null){
		vm.add(vm2_id, 'Graphical View', function () { tl.switchTo(page2_id); });
		var page2 = tl.addReportToList(page2_id);
		page2.loadingFunc = function(){
			if( $(page2).is(':empty') ) {
				buildMemoryCommandsGraph(memoryCommands.graph, page2);
			}
		};
		
		//last state:
		if(memoryCommands.lastState && memoryCommands.lastState.activePage == page2_id){
			vm.setFocusOn(vm2_id);
		}
	}

	//if no last-state set yet, set it to be the first:
	if(memoryCommands.lastState.activePage == null && tl.itemsCount > 0){
		var firstPageId = tl.callLoadOnFirstItem();
		memoryCommands.lastState.activePage = firstPageId;
	}
	
	
	//build tips:
	if(memoryCommands.tips){
		buildMemoryCommandsTips(memoryCommands.tips);
	}
	
	
	
	/*****************************************/
	/* Load / Dispose functions */
	/*****************************************/
	function onPageLoad(id){
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			//appendCriticalErrorMessage(parent , "Error: unable to find report!");
			alert("Error: unable to find report!");
			return;
		}
		memoryCommands.lastState.activePage = id;
		
		//call it's loading function (if it has any):
		if (typeof page.loadingFunc == 'function') {
			page.loadingFunc();
		}
		else{
			console.log('no loading function found for ' + id);
		}
		
	}
	
	function onPageDispose(id){
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			alert("Error: unable to find report!");
			return;
		}
		
		if(id == page1_id){
			memoryCommands.lastState.tableView = {'tableState': null};
		}
		
		if(id == page2_id){
			//get graph's last state:
			if(page.objectsMap && page.objectsMap.graph != null){
				var graphLastState = page.objectsMap.graph.getState();
				memoryCommands.lastState.graphView = {'graphState': graphLastState};
			}
		}
		
		//$(page).empty();
	}
	
	reportItem.onItemDispose = function(){
		var activePage = tl.getCurrentItem();
		onPageDispose(activePage.id);
	}
	
	
	
	/*****************************************/
	/* Build page1 - table view */
	/*****************************************/
	function buildMemoryCommandsTable(pageData, parent) {
		//spcial handling for bad datatable plug-in margin in IE:
		if(browserInfo.isIE == true){
			$(parent).addClass('IEmode');
		}
		
		//special handling for bad datatable plug-in body-height in Chrome:
		if(browserInfo.isChrome == true){
			parent.style.overflowY = 'hidden';
		}
		
		var id = mainDataTable_id;
		var OCLObjects = [];
		
		
		//get the oclObjects info:
		if(memoryCommands.oclObjects != null){
			$.ajax({
				url: memoryCommands.oclObjects.source,
				type: "POST",
				dataType: "json",
				async: false,
				success: function (data) {
					OCLObjects = data;
				},
				error: function(jqxhr, statusText, errorThrown){
					OCLObjects = [];
				}
			});
		}
		
		
		//transition list height binding to window size:
		window.addEventListener('resize', function (event) {
			resizeTableToFitScreen();
		});
		
		function resizeTableToFitScreen(){
			var scrollBodies = $(parent).find('.dataTables_scrollBody');
			if (scrollBodies != null && scrollBodies.length > 0) {
				$(scrollBodies[0]).css('height', ($(parent).height() - 51));
			}
    
		}

		
		$('<table id="' + id + '" class="display apiTraceTable"/>').appendTo(parent);
		var dataTableObj = $('#' + id).DataTable(
		{
			"ajax": pageData.source,
			"columns":
			[
				{
					"title": "",
					"defaultContent": "+",
					"searchable": false,
					"className": 'details-control',
					"orderable": false,
				},
				{
					"title": "Command Name",
					"data": "commandName"
				},
				{
					"title": "Count",
					"data": "executionsCount"
				},
				{
					"title": "# Errors",
					"data": "errorCount"
				},
				{
					"title": "Total Duration (µs)",
					"data": "totalDuration"
				},
				{
					"title": "Avg Duration (µs)",
					"data": "avgDuration"
				},
				{
					"title": "Min Duration (µs)",
					"data": "minDuration"
				},
				{
					"title": "Max Duration (µs)",
					"data": "maxDuration"
				}
			],
			"order": [[1, 'asc']],
			//"bLengthChange": false,
			//"bFilter": false,
			"bInfo": false,
			//"aLengthMenu": [10],
			"scrollY": "auto",
			"sScrollX": "100%",
			"bPaginate": false,
			"bSortClasses": false,
			"language": { "emptyTable": "no records available." }
		});
		
		resizeTableToFitScreen();
		$('#' + id).css({ 'min-width': '800px' });

		// Add event listener for opening and closing details
		$('#' + id + ' tbody').on('click', 'td.details-control', function () {

			var tr = $(this).closest('tr');
			var row = dataTableObj.row(tr);

			if (row.child.isShown()) {
				// This row is already open - close it
				row.child.hide();
				row.child.remove();
				RowDetailsHidden($(this));
			}
			else {
				// Open this row
				child = createRowDetails(row, row.data());
				child.show();
				RowDetailsShown($(this));
			}

		});

		function createRowDetails(row, rowData) {
			div = document.createElement('div');
			div.style.background = '#bfc7ce';
			div.style.height = '198px';
			div.style.minHeight = '198px';
			div.style.maxHeight = '198px';
			//div.style.width = 'calc(100% - 30px)';
			div.style.paddingLeft = '0px';
			div.style.overflow = 'auto';
			div.style.overflowY = 'hidden';
			child = row.child(div);

			tableLayout = document.createElement('table');
			tableLayout.style.width = '100%';
			tr = tableLayout.insertRow();

			cell_datatable = tr.insertCell();
			cell_datatable.style.width = '70%';
			cell_datatable.style.minWidth = '800px';
			cell_datatable.style.paddingBottom = '0px';

			cell_graph = tr.insertCell();
			$(div).append(tableLayout);

			tableContainer = document.createElement('div');
			tableContainer.style.background = '#fcfcfc';
			tableContainer.style.marginRight = '5px';
			tableContainer.style.marginTop = '15px';
			$(cell_datatable).append(tableContainer);

			table = document.createElement('table');
			table.className = 'display apiTraceTable';
			$(tableContainer).append(table);
			table.rowData = rowData;

			detailsTableObj = $(table).DataTable({

				"ajax": rowData.details,
				"columns":
				[
					{
						"title": "Objects",
						"defaultContent": "[...]",
						"searchable": false,
						"className": 'apiCallsDetails-args',
						"orderable": false,
					},
					{
						"title": "Return Value",
						"data": "returnValue"
					},
					{
						"title": "Duration (µs)",
						"data": "duration"
					},
					{
						"title": "Latency (µs)",
						"data": "latency"
					},
					{
						"title": "Size (byte)",
						"data": "size"
					},
					{
						"title": "Queued Time (µs)",
						"data": "queuedTime"
					},
					{
						"title": "Start Time (µs)",
						"data": "startTime"
					},
					{
						"title": "End Time (µs)",
						"data": "endTime"
					},
					{
						"title": "Context ID",
						"data": "context"
					}
				],
				"order": [[5, 'asc']],
				"bSortClasses": false,
				"scrollY": "100px",
				"bDeferRender": true,
				"processing": true,
				"serverSide": false,
				//"scrollY": "130px",
				//"sScrollX": "100%",
				//"deferRender": true,
				//"bPaginate": false,
				//"bInfo": false,
				//"bSortClasses": false
				//"aLengthMenu": [5],
				"fnCreatedRow": function (nRow, rowData, iDataIndex) {
					$(nRow).find('td.apiCallsDetails-args').on('click', function () {
						var innerTable = $(nRow).closest('.dataTable');
						var row = $(innerTable).DataTable().row(nRow);

						if (row.child.isShown()) {
							// This row is already open - close it
							row.child.hide();
							row.child.remove();
						}
						else {
							// Open this row
							div = document.createElement('div');
							div.style.background = '#bfc7ce';
							div.style.paddingLeft = '0px';
							//div.style.overflow = 'auto';
							//div.style.overflowY = 'hidden';
							child = row.child(div);

							var relatedMemoryObjects = row.data().relatedMemoryObjects;
							var memObjsTable = document.createElement('table');
							memObjsTable.style.width = '100%';
							var argsLen = relatedMemoryObjects.length;
							for (var i = 0; i < argsLen; i++) {

								//add memObj to table:
								argumentsTableRow = memObjsTable.insertRow();
								td = argumentsTableRow.insertCell();
								td.innerHTML = '#' + i + ':';
								td = argumentsTableRow.insertCell();
								var memObjName = relatedMemoryObjects[i];
								td.innerHTML = memObjName;

								//create tooltip:
								var objInfoTooltip = '';
								oclObjInfo = getOclObjInfoFor(memObjName);
								if(oclObjInfo != null){
									var len = oclObjInfo.length;
									for (var j = 0; j < len; j++) {
										if (j != 0) {
											objInfoTooltip += '\n';
										}
										objInfoTooltip += oclObjInfo[j][0] + ': ' + oclObjInfo[j][1];
									}
									td.title = objInfoTooltip;
									td.className = 'linkableArgToOclObj';
								}
							}

							$(div).append(memObjsTable);

							child.show();

							function getOclObjInfoFor(objName) {
								var len = OCLObjects.length;
								for (var n = 0; n < len; n++) {
									if (OCLObjects[n].name == objName) {
										return OCLObjects[n].info;
									}
								}
								return null;
							}
						}
					});

					$(nRow).find('td.apiCallsDetails-args').each(function (index, td) {
						var relatedMemoryObjects = rowData.relatedMemoryObjects;
						var toolTip = '';
						for (var i = 0; i < relatedMemoryObjects.length; i++) {
							if (i != 0) {
								toolTip += '\n';
							}
							toolTip += relatedMemoryObjects[i];
						}
						td.title = toolTip;
					});
					
					//highlight row if it's related to the active tip:
					var currentRowIndex = $($(nRow).closest('.dataTable')).DataTable().row(nRow).index().selector.rows._DT_RowIndex;
					if (ActiveTipInfo!= null && ActiveTipInfo.TableToHighlight == '' || ActiveTipInfo.TableToHighlight == table.id) {
						if (ActiveTipInfo.LinesToHighlight == null || ActiveTipInfo.LinesToHighlight.indexOf(currentRowIndex) != -1) {
							highlightJavascriptElement(nRow);
							activeTipHighlightedRows.push(nRow);
						}
					}
					
				},
				"fnInitComplete": function (oSettings, json) {
					//create bars-chart:
					cell_graph.className = 'cell_detailesGraph';
					graphContainer = document.createElement('div');
					graphContainer.style.width = '100%';
					graphContainer.style.height = '180px';
					graphContainer.style.position = 'relative';
					$(cell_graph).append(graphContainer);

					createGraphFromTableData(graphContainer, json.data, 'duration');
				}
			});

			// Add resize listener:
			$(table).resize(function () {
				detailsTableObj.columns.adjust();
			});

			return child;
		}


	}

	
	
	/*****************************************/
	/* Build page2 - graph view */
	/*****************************************/
	function buildMemoryCommandsGraph(pageData, parent){
		//objects map:
		parent.objectsMap = {};
		
		//read graph data:
		$.ajax({
			url: pageData.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (graphData) {
				//build graph:
				var graphContainer = document.createElement('div');
				graphContainer.className = 'memoryCommandsGraphContainer';
				parent.appendChild(graphContainer);
				
				var graph = new Graph(graphContainer);
				graph.setData(graphData.datasets);
				graph.setOptions(graphData.options);
				graph.Render();
				
				//save reference:
				parent.objectsMap.graph = graph;
				
				//apply last state (if there any):
				if(memoryCommands.lastState.graphView && memoryCommands.lastState.graphView.graphState != null){
					graph.applyState(memoryCommands.lastState.graphView.graphState);
				}
			},
			error: function(jqxhr, statusText, errorThrown){
				appendCriticalErrorMessage(parent , "Error: unable to retrieve \"Memory Commands graph\":<br/> \"" + errorThrown + "\".");
			}
		});
	
	}
	
	
	
	/*****************************************/
	/* Build MemoryCommands Tips */
	/*****************************************/
	function buildMemoryCommandsTips(pageData){
		
		var tipsData = [];
		
		//read graph data:
		$.ajax({
			url: pageData.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				tipsData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				alert('Warning: failed to read analysis tips: ' + errorThrown);
				tipsData = [];
			}
		});
		
		//build tips list:
		var len = tipsData.length;
		for(var i=0; i<len; i++) (function(i){
			var tipInfo = tipsData[i];
			
			var onClickFunc = null;
			if(tipInfo.onClickInfo != null){
				onClickFunc = function(){
					
					var notificationAnimationDelay = 0;
					
					//if the tip wants to filter by an ApiName:
					if(tipInfo.onClickInfo.apiName != null && tipInfo.onClickInfo.apiName != ''){
						
						//set ApiCalls report ViewMode Focus on DataTable page:
						notificationAnimationDelay = vm.setFocusOn(vm1_id);
						
						//filter table by the given apiName:
						FilterDatatable_singleColumn(mainDataTable_id, 1, tipInfo.onClickInfo.apiName);
						
						//set active tip & highlighting rows info: (this is needed to highlight the table without knowing it's id)
						setActiveTipInfo('', tipInfo.onClickInfo.innerRowsToHighlight);
						
						//expand row and show innerTable details: 
						expandDetailesForFirstFilteredRowInTable(mainDataTable_id);
						
						//get the id of the new inner table:
						var detailesTableID = getDetailesDataTableIDForFirstFilteredRow(mainDataTable_id);
						
						//set active tip & highlighting rows info: (this is needed to apply highlighting only to this innerTable)
						setActiveTipInfo(detailesTableID, tipInfo.onClickInfo.innerRowsToHighlight);
					}
					
					if(tipInfo.notification != null && tipInfo.notification != ''){
						setTimeout(function(){
							showNotificationCenterScreen(tipInfo.notification);
						}, notificationAnimationDelay);
					}
					
				}
			}
			
			addNewTip(tipInfo.title, tipInfo.description, tipInfo.icon, onClickFunc, tipInfo.tipID);
			
		})(i);
		
		
	}
	
	
	
	
}

function buildKernelOccupancyReport(occupancyMainAjax, reportItem, lastState){

	//globals:
	var occupancyData;
	
	//last state initializing:
	if(!lastState){
		lastState = { 'activePage': null };
	}
	
	//read occupancy data:
	var criticalError = false;
	$.ajax({
        url: occupancyMainAjax.source,
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			occupancyData = data;
        },
        error: function(jqxhr, statusText, errorThrown){
			criticalError = true;
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Kernel Occupancy\":<br/> \"" + errorThrown + "\".");
        }
    });
	
	if(criticalError == true){
		return;
	}
	

    //get reportNode:
    var reportNode = $(reportItem);
    
    //add general info table:
    table = CreateKernelOccpancyMainTable(occupancyData.generalInfo.kernelOccupancyPercentages,
														   occupancyData.generalInfo.ThreadCount,
														   occupancyData.generalInfo.LongestThread,
														   occupancyData.generalInfo.ShortestThread,
														   occupancyData.generalInfo.AvgThreadDuration
														 );
    reportItem.appendChild(table);

	table.style.paddingBottom = '20px';
	
	//inner viewMode & transition list:
	var vm = new ViewMode(reportItem, 180, 'View Mode:', 'reportTitle');
	reportItem.appendChild(CreateSeperator());
	var tl = new TransitionList(reportItem, '440px', false, 'fxPressAwayFAST', '', 400, 'transitionListItemContainer', onPageLoad, onPageDispose);
	
	//ids:
	var vm1_id = 'kernelAnalysis_eus', page1_id = vm1_id+'Page';
	var vm2_id = 'kernelAnalysis_timePerThreads', page2_id = vm2_id+'Page';
	var vm3_id = 'kernelAnalysis_threadsPerTime', page3_id = vm3_id+'Page';
	
	//============ create pages ============
	if(occupancyData.eus){
		vm.add(vm1_id, 'Execution Units', function () { tl.switchTo(page1_id); });
		var page1 = tl.addReportToList(page1_id);
		page1.loadingFunc = function(){ buildEUsReport(occupancyData.eus, page1); };
		
		//last state:
		if(lastState.activePage == page1_id){
			page1.loadingFunc();
		}
	}//-------------------------------------
	
	if(occupancyData.timePerThreads){
		vm.add(vm2_id, 'Ticks Per Threads', function () { tl.switchTo(page2_id); });
		var page2 = tl.addReportToList(page2_id);
		page2.loadingFunc = function(){ buildTimePerThreadsReport(occupancyData.timePerThreads, page2); };
		
		//last state:
		if(lastState.activePage == page2_id){
			vm.setFocusOn(vm2_id);
		}
		
	}//-------------------------------------
	
	if(occupancyData.threadPerTime){
		vm.add(vm3_id, 'Threads Per Time', function () { tl.switchTo(page3_id); });
		var page3 = tl.addReportToList(page3_id);
		page3.loadingFunc = function(){ buildThreadPerTimeReport(occupancyData.threadPerTime, page3); };
		
		//last state:
		if(lastState.activePage == page3_id){
			vm.setFocusOn(vm3_id);
		}
	}//-------------------------------------
	
	
	
	//if no last-state set yet, set it to be the first:
	if(lastState.activePage == null && tl.itemsCount > 0){
		var firstPageId = tl.callLoadOnFirstItem();
		lastState.activePage = firstPageId;
	}
	
	

	
	
	/*****************************************/
	/* Help functions */
	/*****************************************/
	
	function CreateKernelOccpancyMainTable(occupancy, threadCount, longestThread, shortestThread, avgThreadDuration) {
		
		var tr, td;
		var mainTable = document.createElement('table');
		mainTable.style.width = '80%';
		//mainTable.style.fontsize = '19px';
		
		tr = mainTable.insertRow();
		var leftSide = tr.insertCell();
		var rightSide = tr.insertCell();
		
		//occupancyInfo table:
		var table1 = document.createElement('table');
		leftSide.appendChild(table1);
		//table.className = 'infoTable11';
		tr = table1.insertRow();
		td = tr.insertCell();
		td.style.width = '130px';
		td.innerHTML = '- Occupancy:';
		td = tr.insertCell();
		td.className = 'OccupancyReport_occupancy';
		td.innerHTML = occupancy;
		
		tr = table1.insertRow();
		td = tr.insertCell();
		td.innerHTML = '- Memory stall:';
		td = tr.insertCell();
		td.className = 'OccupancyReport_MemoryStall';
		td.innerHTML = '[N/A]';
		
		tr = table1.insertRow();
		td = tr.insertCell();
		td.innerHTML = '- Threads launched:';
		td = tr.insertCell();
		td.className = 'OccupancyReport_ThreadsLaunched';
		td.innerHTML = threadCount;
		
		
		var table2 = document.createElement('table');
		rightSide.appendChild(table2);
		tr = table2.insertRow();
		td = tr.insertCell();
		td.style.width = '200px';
		td.innerHTML = '- Avg thread time (cycles):';
		td = tr.insertCell();
		td.className = 'OccupancyReport_avgThreadTime';
		td.innerHTML = avgThreadDuration;
		
		tr = table2.insertRow();
		td = tr.insertCell();
		td.innerHTML = '- Shotest thread (cycles):';
		td = tr.insertCell();
		td.className = 'OccupancyReport_shortestThread';
		td.innerHTML = shortestThread;
		
		tr = table2.insertRow();
		td = tr.insertCell();
		td.innerHTML = '- Longest thread (cycles):';
		td = tr.insertCell();
		td.className = 'OccupancyReport_longestThread';
		td.innerHTML = longestThread;

		//reportItem.appendChild(table);

		return mainTable;
	}
	
	function buildEUsReport(EUsAjax, page){
		
		var graphData;
		page.objectsMap = {};
		
		//read EUs data:
		var criticalError = false;
		
		$.ajax({
			url: EUsAjax.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				graphData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				criticalError = true;
				appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Execution Units\":<br/> \"" + errorThrown + "\".");
			}
		});
		
		if(criticalError == true){
			return;
		}
		
		
		//data was read successfully, build the report:
		var graphContainer = document.createElement('div');
        graphContainer.className = 'occupancyGraphContainer';
        page.appendChild(graphContainer);
		
		var graph = new Graph(graphContainer);
        graph.setData(graphData.datasets);
        graph.setOptions(graphData.options);
        graph.Render();
		
		//save reference:
		page.objectsMap.graph = graph;
				
		//apply last state (if there any):
		if(lastState.eus && lastState.eus.graphState != null){
			graph.applyState(lastState.eus.graphState);
		}
		
	}
	
	function buildTimePerThreadsReport(timePerThreadsAjax, page){
		
		var graphData;
		page.objectsMap = {};
		
		//read EUs data:
		var criticalError = false;
		
		$.ajax({
			url: timePerThreadsAjax.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				graphData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				criticalError = true;
				appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Time Per Threads\":<br/> \"" + errorThrown + "\".");
			}
		});
		
		if(criticalError == true){
			return;
		}
		
		
		
		//data was read successfully, build the report:
		var graphContainer = document.createElement('div');
        graphContainer.className = 'occupancyGraphContainer';
        page.appendChild(graphContainer);
		
		var graph = new Graph(graphContainer);
        graph.setData(graphData.datasets);
        graph.setOptions(graphData.options);
        graph.Render();
		
		page.objectsMap.graph = graph;
		
		
		
		//append tracker:
		appendTracker(graphContainer, graph, function (trackerDiv, x, y, tooltip, seriesID) {
                if (x && y) {
                    trackerDiv.innerHTML = Math.round(x) + ' threads ran at cycle ' + Math.round(y);
                }
                else {
                    trackerDiv.innerHTML = '';
                }
        });
			
			
		//setup custom selection handlers:
		var selectionDiv = document.createElement('div');
		selectionDiv.className = 'occupancyGraphOverlayTracker1';
		selectionDiv.innerHTML = 'select a range of the graph';
		graphContainer.appendChild(selectionDiv);
	
		var onSelection = function (xFrom, yFrom, xTo, yTo, dataset) {
			if (xFrom == null || xTo == null) {
				selectionDiv.innerHTML = 'select a range of the graph';
			}
			else if (occupancyData.generalInfo.TotalCycles > 0) {
				xFrom = xFrom.toFixed(0);
				xTo = xTo.toFixed(0);
				var seriesData = dataset[0].data;
				var len = seriesData.length;
				var rangeTotalCycles = 0;
	
				for (var i = 0; i < len; i++) {
					var entry = seriesData[i];
					if (entry[0] >= xFrom) {
						if (entry[0] <= xTo) {
							rangeTotalCycles += entry[1];
						}
						else {
							break;
						}
					}
				}
	
				var executionPercentage = rangeTotalCycles / occupancyData.generalInfo.TotalCycles * 100;
				selectionDiv.innerHTML = "for " + executionPercentage.toFixed(2) + "% of the kernel's time, a range of " + xFrom + " - " + xTo +
										" out of the " + (occupancyData.platform.TotalEUs * occupancyData.platform.ThreadsPerEU) + " threads were active.";
			}
		}
	
		graph.customSelectionFunc = onSelection;
		graph.bindCustomSelectionFunc();
	
		//position selectionDiv:
		var yaxisBox = graphContainer.plotObj.getAxes().yaxis.box;
		selectionDiv.style.top = (yaxisBox.top + 10) + 'px';
		selectionDiv.style.left = (yaxisBox.left + yaxisBox.width + 300) + 'px';
			
		
		//apply last state (if there any):
		if(lastState.timePerThreads && lastState.timePerThreads.graphState != null){
			graph.applyState(lastState.timePerThreads.graphState);
		}
	}
	
	function buildThreadPerTimeReport(threadsPerTimeAjax, page){
		
		var graphData;
		var timelineData;
		page.objectsMap = {};
		
		//read threads-per-time data:
		var criticalError = false;
		
		$.ajax({
			url: threadsPerTimeAjax.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				graphData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				criticalError = true;
				appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Threads Per Time\":<br/> \"" + errorThrown + "\".");
			}
		});
		
		if(criticalError == true){
			return;
		}
		
		
		
		
		
		//read timeline data:
		$.ajax({
			url:threadsPerTimeAjax.timelineSource,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				timelineData = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				criticalError = true;
				appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Threads Per Time' - Timeline\":<br/> \"" + errorThrown + "\".");
			}
		});
		
		if(criticalError == true){
			return;
		}
		
		
		
		
		
		//data was read successfully, build the report:
		var graphContainer = document.createElement('div');
        graphContainer.className = 'occupancyGraphContainer';
        page.appendChild(graphContainer);
		
		var graph = new Graph(graphContainer);
        graph.setData(graphData.datasets);
        graph.setOptions(graphData.options);
        graph.Render();
		
		page.objectsMap.graph = graph;
		
		appendTracker(graphContainer, graph, function (trackerDiv, x, y) {
                trackerDiv.innerHTML = Math.round(y) + ' threads ran at cycle ' + Math.round(x);
        });
		
		var graphXaxisRange = graph.xMax - graph.xMin;
		
		//create a timeline overview div:
       var timeLineIsLocked = false;
       var timelineContainerDiv = document.createElement('div');
       timelineContainerDiv.className = 'timelineContainerDiv';
       graphContainer.appendChild(timelineContainerDiv);
       
       var timelineGraphDiv = document.createElement('div');
       timelineContainerDiv.appendChild(timelineGraphDiv);
       
       var timelinePositionDiv = document.createElement('div');
       timelinePositionDiv.className = 'timelinePositionDiv';
       timelinePositionDiv.style.background = 'black';
       timelinePositionDiv.style.opacity = '0.4';
       timelinePositionDiv.style.height = '100%';
       timelinePositionDiv.style.width = '50px';
       
       $(timelinePositionDiv).draggable({
           containment: timelineContainerDiv,
           axis: "x",
           drag: function () { timelinePositionDivmanualReposition(); },
           stop: function () { timelinePositionDivmanualReposition(); }
       });
       
       timelineContainerDiv.appendChild(timelinePositionDiv);
       
       //bind it to the graph's redraw callback:
       $(graphContainer.plotObj).on(graphContainer.plotObj.redrawOccuredCallback,
		function () {
		    if (timeLineIsLocked == true) {
		        return;
		    }
		    timeLineIsLocked = true;
		    updateTimelineDivPosition();
		    timeLineIsLocked = false;
		});
       
       //bind user's timeline clicks to positionDiv location:
       var isUserRelocatingPositionDiv = false;
       
       //start ineraction:
       $(timelineContainerDiv).mousedown(function (e) {
           isUserRelocatingPositionDiv = true;
           updateUserPositionDivRelocation(e);
       });
       //end ineraction:
       $(timelineContainerDiv).mouseup(function (e) {
           isUserRelocatingPositionDiv = false;
           updateUserPositionDivRelocation(e);
       });
       //ineracting:
       $(timelineContainerDiv).mousemove(function (e) {
           if (!isUserRelocatingPositionDiv) {
               return;
           }
           updateUserPositionDivRelocation(e);
       });
       
       
       var updateUserPositionDivRelocation = function(e){
           var clickOffsetX = e.clientX - $(timelineContainerDiv).offset().left;
           var positionDivWidth = $(timelinePositionDiv).width();
           var targetX = clickOffsetX - (positionDivWidth / 2);
           var timelineContainerWidth = $(timelineContainerDiv).width();
       
           //stay in bounds:
           if (targetX < 0) {
               targetX = 0;
           }
       
           if (targetX + positionDivWidth > timelineContainerWidth) {
               targetX = timelineContainerWidth - positionDivWidth;
           }
       
           timelinePositionDiv.style.left = targetX + 'px';
           timelinePositionDivmanualReposition();
       }
       
       var timelinePositionDivmanualReposition = function () {
           var timelinePositionDivLeftOffset = $(timelinePositionDiv).offset().left - $(timelineContainerDiv).offset().left;
           var timelinePositionDivRightOffset = timelinePositionDivLeftOffset + $(timelinePositionDiv).width();
           var timelineContainerWidth = $(timelineContainerDiv).width();
           var xaxis = graphContainer.plotObj.getAxes().xaxis;
       
           xaxis.options.min = Math.max(timelinePositionDivLeftOffset / timelineContainerWidth * graphXaxisRange, graph.xMin);
           xaxis.options.max = Math.min(timelinePositionDivRightOffset / timelineContainerWidth * graphXaxisRange, graph.xMax);
       
           timeLineIsLocked = true;
           graphContainer.plotObj.setupGrid();
           graphContainer.plotObj.draw();
           timeLineIsLocked = false;
       }
       
       var updateTimelineDivPosition = function () {
           var xaxis = graphContainer.plotObj.getAxes().xaxis;
           var visibleFrom = xaxis.options.min;
           var visibleTo = xaxis.options.max;
           var timelineContainerWidth = $(timelineContainerDiv).width();
           var targetFromOffset = visibleFrom / graphXaxisRange * timelineContainerWidth;
           var targetToOffset = visibleTo / graphXaxisRange * timelineContainerWidth;
       
           timelinePositionDiv.style.left = targetFromOffset + 'px';
           timelinePositionDiv.style.width = (targetToOffset - targetFromOffset) + 'px';
       }
       
       var xAxisPadding = 9, timelineHeight = 25;
       
       graphContainer.style.height = ($(graphContainer).height() - timelineHeight) + 'px'; //happens only once - at initializing.
       graphContainer.style.marginTop = (timelineHeight + 5) + 'px';

       
       function resetTimelineContainerPosition() {
           var axis = graphContainer.plotObj.getAxes(),
			xaxis = axis.xaxis,
			yaxis = axis.yaxis;
       
           timelineContainerDiv.style.position = 'absolute';
           timelineContainerDiv.style.background = 'yellow';
           timelineContainerDiv.style.overflow = 'hidden';
           timelineContainerDiv.style.height = (timelineHeight + 5) + 'px';
           timelineContainerDiv.style.width = (xaxis.box.width - 2 * xAxisPadding - 5) + 'px';
           timelineContainerDiv.style.top = (-timelineHeight) + 'px';
           timelineContainerDiv.style.left = (xaxis.box.left + 2) + 'px';
           timelineContainerDiv.style.marginLeft = xAxisPadding + 'px';
       
           timelineGraphDiv.style.position = 'absolute';
           timelineGraphDiv.style.height = (timelineHeight + 20) + 'px';
           timelineGraphDiv.style.width = (xaxis.box.width - xAxisPadding) + 'px';
           timelineGraphDiv.style.top = '-7px';//(-timelineHeight) + 'px';
           timelineGraphDiv.style.left = '-7px';//xaxis.box.left + 'px';
           //timelineGraphDiv.style.marginLeft = xAxisPadding + 'px';
       
           updateTimelineDivPosition();
       }
       
       resetTimelineContainerPosition();
       
       $(graphContainer).resize(function () {
           resetTimelineContainerPosition();
       });
       
       //create timeline graph:
       var timelineGraph = new Graph(timelineGraphDiv);
       timelineGraph.setData(timelineData.datasets);
       timelineGraph.setOptions(timelineData.options);
       timelineGraph.Render();
	   
	   page.objectsMap.timelineGraph = timelineGraph;
	   
	   //apply last state (if there any):
		if(lastState.threadsPerTime && lastState.threadsPerTime.graphState != null){
			graph.applyState(lastState.threadsPerTime.graphState);
		}
		
		if(lastState.threadsPerTime && lastState.threadsPerTime.timelineGraphState != null){
			timelineGraph.applyState(lastState.threadsPerTime.timelineGraphState);
		}
		
	}
	
	function appendTracker(graphContainer, graph, trackerFunc){
		
		var trackerDiv = document.createElement('div');
        trackerDiv.className = 'occupancyGraphOverlayTracker1';
        graphContainer.appendChild(trackerDiv);
		
        trackerDiv.id = 'occupancy_trackerDiv';
        graph.trackerDiv = trackerDiv.id;
		graph.trackerFormatFunc = trackerFunc;
        graph.bindTrackerDiv();

        //position trackerDiv:
        var yaxisBox = graphContainer.plotObj.getAxes().yaxis.box;
        trackerDiv.style.top = (yaxisBox.top + 10) + 'px';
        trackerDiv.style.left = (yaxisBox.left + yaxisBox.width + 15) + 'px';
	}
	
	
	/*****************************************/
	/* Load / Dispose functions */
	/*****************************************/
	function onPageLoad(id){
		//console.log('inner load: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			//appendCriticalErrorMessage(parent , "Error: unable to find report!");
			alert("Error: unable to find report!");
			return;
		}
		lastState.activePage = id;
		
		//call it's loading function (if it has any):
		if (typeof page.loadingFunc == 'function') {
			page.loadingFunc();
		}
		else{
			console.log('no loading function found for ' + id);
		}
		
	}
	
	function onPageDispose(id){
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			alert("Error: unable to find report!");
			return;
		}
		
		if(id == page1_id){
			//get graph's last state:
			if(page.objectsMap && page.objectsMap.graph != null){
				var graphLastState = page.objectsMap.graph.getState();
				lastState.eus = {'graphState': graphLastState};
			}
		}
		
		if(id == page2_id){
			//get graph's last state:
			if(page.objectsMap && page.objectsMap.graph != null){
				var graphLastState = page.objectsMap.graph.getState();
				lastState.timePerThreads = {'graphState': graphLastState};
			}
		}
		
		if(id == page3_id){
			
			if(lastState.threadsPerTime == null){ lastState.threadsPerTime = {}; }
			
			//get graph's last state:
			if(page.objectsMap && page.objectsMap.graph != null){
				var graphLastState = page.objectsMap.graph.getState();
				lastState.threadsPerTime.graphState = graphLastState;
			}
			
			//get timeline graph's last state:
			if(page.objectsMap && page.objectsMap.timelineGraph != null){
				var graphLastState = page.objectsMap.timelineGraph.getState();
				lastState.threadsPerTime.timelineGraphState = graphLastState;
			}
		}
		
		$(page).empty();
	}
	
	
	reportItem.onItemDispose = function(){
		var activePage = tl.getCurrentItem();
		onPageDispose(activePage.id);
	}
	
	
}
function loadOCLObjectsReport(reportItem, oclObjects){
	
	//basics:
	var objectsInfo = [];
	var objectsTree = [];
	var treeElementsMap = [];
	
	//read oclObjects data:
	if(readOclObjectsInfo() == false){
		return; //stop on failure.
	}
	
	//read oclObjectsTree data:
	if(readOclObjectsTreeData() == false){
		return; //stop on failure.
	}
	
	//filters:
	if(oclObjects.tree.filtersState == null){
		oclObjects.tree.filtersState = {};
	}
	var filtersState = oclObjects.tree.filtersState;
	
	//buildTreeReport:
	var header = document.createElement('table');
	reportItem.appendChild(header);
	var tr = header.insertRow();
	
	//insert tite cell:
	var td = tr.insertCell();
	td.className = 'reportTitle';
	td.innerHTML = 'OpenCL Objects Filters:';
	
	//insert filters-wrapping cell:
	var filtersContainer = tr.insertCell();
	filtersContainer.className = 'viewModeContainer';
	filtersContainer.style.width = '350px';
	
	buildHeaderFilters(filtersContainer);
	reportItem.appendChild(CreateSeperator());
	buildObjectsTree(reportItem, objectsTree);
	
	
	//redraw arrows on window size:
	//console.log('REGISTERED == redrawing oclObjectsTree arrows');
	$(window).resize(onTreeResize);
	
	function onTreeResize(){
		//console.log('redrawing oclObjectsTree arrows');
		ClearTreeConnections();
		buildTreeConnections();
	}
	
	//make the tree container height stretches to fill the page:
	$(window).resize(onTreeContainerResize);
	
	
	function onTreeContainerResize(){
		var containers = $(reportItem).find('.oclObjectsTreeContainer');
		if(containers.length != 1){
			return;
		}
		
		var container = containers[0];
		var topOffset = Math.abs($(container).offset().top - $(reportItem).offset().top);
		$(container).css('height', 'calc(100% - ' + topOffset + 'px)');
		
	}
	
	onTreeContainerResize();
	
	//addNewTip();
	
	
	//==============================================
	// report dispose:
	//==============================================
	reportItem.onItemDispose = function(){
		//console.log('UNREGISTERING == redrawing oclObjectsTree arrows');
		$(window).off("resize", onTreeResize);
		$(window).off("resize", onTreeContainerResize);
	}
	
	
	
	//==============================================
	// help functions:
	//==============================================
	function buildHeaderFilters(filtersContainer){
	
		//empty container's content (for tips state-forcing):
		$(filtersContainer).empty();

		var nav = document.createElement('nav');
		nav.className = 'tabs-style-bar';
		filtersContainer.appendChild(nav);

		var filtersList = document.createElement('ul');
		nav.appendChild(filtersList);
		
		var filterItem, a;
		
		//filter 1: platforms:
		filterItem = document.createElement('li'); a = document.createElement('a');
		a.innerHTML = 'platforms'; a.className = 'oclObjectsTreeFilterCategory';
		filterItem.appendChild(a); filtersList.appendChild(filterItem);
		a.filters = [];
		var platformFilters = a.filters;
		
		
		//filter 2: context:
		filterItem = document.createElement('li'); a = document.createElement('a');
		a.innerHTML = 'contexts'; a.className = 'oclObjectsTreeFilterCategory';
		filterItem.appendChild(a); filtersList.appendChild(filterItem);
		a.filters = [];
		var contextFilters = a.filters;
		
		
		//filter 3: device type:
		filterItem = document.createElement('li'); a = document.createElement('a');
		a.innerHTML = "devices"; a.className = 'oclObjectsTreeFilterCategory';
		filterItem.appendChild(a); filtersList.appendChild(filterItem);
		a.filters = [];
		var devicesFilters = a.filters;


		//get filters:
		fillFiltersListsContent(objectsTree);
		

		//build filtersMenu:
		var filtersList = $(filtersContainer).find('.oclObjectsTreeFilterCategory');
		for(var i = 0; i<filtersList.length; i++)(function(i){
			var currentFilter = filtersList[i];
			
			//remove empty categories:
			if(currentFilter.filters.length == 0){
				$(currentFilter.parentNode).remove();
			}
			
			//on click menu:
			else{
				currentFilter.onclick = function(){
					
					parentFilter = this;					
					var filterMenu = document.createElement('div');
					filterMenu.className = 'oclObjectsFilterMenu';
					filterMenu.style.position = 'absolute';
					filterMenu.style.top = ($(currentFilter).offset().top - $(reportItem).offset().top + 2*$(currentFilter).height() )+ 'px';
					filterMenu.style.left =($(currentFilter).offset().left  - $(reportItem).offset().left )+ 'px';
					
					filterMenu.style.zIndex = '500';
					//filterMenu.style.width = '200px';
					//filterMenu.style.height = '200px';
					reportItem.appendChild(filterMenu);
					
					var filterMenuRelative = document.createElement('div');
					filterMenuRelative.style.position = 'relative';
					filterMenuRelative.style.background = 'white';
					filterMenuRelative.style.width = '100%';
					filterMenuRelative.style.height = '100%';
					filterMenuRelative.style.padding = '20px';
					filterMenu.appendChild(filterMenuRelative);
										
					var closeListener = function(ev){
						console.log('listening!');
						var target = ev.target;
						if( target !== filterMenu && target != parentFilter ) {
							reportItem.removeEventListener( 'click', closeListener );
							$(filterMenu).remove();
						}
					}
					
					//close the tips menu if the target isn't the menu element or one of its descendants..
					reportItem.addEventListener( 'click', closeListener );
					
					
					
					//fill it with the filters:
					for(var j = 0; j< currentFilter.filters.length; j++)(function(j){
						var filterName = currentFilter.filters[j];
						
						var filterElementWrapper = document.createElement('div');
						filterMenuRelative.appendChild(filterElementWrapper);
						
						var element = $('<label><input type="checkbox">' + filterName +'</label>');
						$(filterElementWrapper).append(element);
						
						var checkbox = element.find('input:checkbox')[0];
						if(filtersState[filterName] == true){
							checkbox.checked = false;
						}
						else{
							checkbox.checked = true;
						}
						
						//checkbox event:
						checkbox.onclick = function(){
							filtersState[filterName] = !checkbox.checked;
							removeObjectsTree();
							//ClearTreeConnections();
							buildObjectsTree(reportItem, objectsTree);
						};
						
					})(j);
					
				}
			}
		})(i);
		
		
		
		function fillFiltersListsContent(children){
			var childrenLen = children.length;
			for(var i=0; i<childrenLen; i++){
				var child = children[i];
				
				if(child.name.startsWith('Platform ')){
					platformFilters.push(child.name);
				}
				if(child.name.startsWith('Context ')){
					contextFilters.push(child.name);
				}
				if(child.name.startsWith('Device ')){
					devicesFilters.push(child.name);
				}

				if(child.children != null && child.children.length > 0){
					fillFiltersListsContent(child.children);
				}
			}
		}
		
		
	}
	
	
	function removeObjectsTree(){
		//ClearTreeConnections();
		$(reportItem).find('.oclObjectsTreeContainer').remove();
	}
	
	
	function buildObjectsTree(parent, children){
	
		var treeContainer = document.createElement('div');
		treeContainer.className = 'oclObjectsTreeContainer';
		parent.appendChild(treeContainer);
		
		//clear treeElementsMap:
		ClearTreeConnections();
		//build tree:
		buildTree(treeContainer, children);
		//build new arrows:
		buildTreeConnections();
		
		
		
		//======= help functions =======//
		function buildTree(parent, children, parentNode){
			treeElementsMap = [];
			var tableLayout = document.createElement('table');
			tableLayout.className = 'oclObjectsTreeTable';
			if(parentNode == null){ tableLayout.className += ' oclObjectsTreeTableRoot'; }
			parent.appendChild(tableLayout);		
			
			var tr = tableLayout.insertRow();
			var childrenLen = children.length;
			var childrenNodes = [];
			
			for(var i=0; i<childrenLen; i++){
				var child = children[i];
				
				//filter our hidden elements:
				if(filtersState[child.name] == true){
					continue;
				}

				var td = tr.insertCell();
				var node = createTreeNode(child.name);
				td.appendChild(node);
				childrenNodes.push(node);
				
				if(child.children != null && child.children.length > 0){
					if(child.name.startsWith('Context') && child.children.length > 8){
						//alert('minimizing ' + child.name + ' children');
						//build a string of all the children names:
						var innerChildrenCount = child.children.length;
						var joinedChildrenText = '';
						for(var cIdx=0; cIdx<innerChildrenCount; cIdx++){
							joinedChildrenText += child.children[cIdx].name + '<br/>';
						}
						var joinedChildrenObj = [
															{
																"name": joinedChildrenText,
																"children": []
															}
														];
						buildTree(td, joinedChildrenObj, node);
						
					}
					else{
						buildTree(td, child.children, node);
					}
				}
			}
			
			if(parentNode != null){
				treeElementsMap.push([parentNode, childrenNodes]);
			}
		}
		
		
		function createTreeNode(name, type){//todo: pass and use type for icons.
			var node = document.createElement('div');
			var span =  document.createElement('span');
			node.className = 'oclObjectsTreeNode';
			span.innerHTML = name;
			span.className = 'oclObjectsTreeNodeSpan';
			node.appendChild(span);
			displayOclObjectInfo(name, node);
			return node;
		}
		
		
	}
	
	
	function ClearTreeConnections(){
		$(reportItem).find('.oclObjectsTreeArrowsContainer').remove();
	}
	
	
	function buildTreeConnections(){
		//find oclObjectsTreeRoot element:
		var roots = $(reportItem).find('.oclObjectsTreeContainer');
		if(roots.length < 1){
			//alert('error finding root: ' + roots.length);
			return;
		}
		var rootsLen = roots.length;
		var root;
		for(var rootIdx = 0; rootIdx < rootsLen; rootIdx++){
		
			root = $(roots[rootIdx]);
			
			//add a layer on top of main table:
			var arrowsContainer = document.createElement('div');
			arrowsContainer.className = 'oclObjectsTreeArrowsContainer';
			arrowsContainer.style.position = 'absolute';
			arrowsContainer.style.zIndex = '5';
			arrowsContainer.style.top = '0px';
			arrowsContainer.style.left = '0px';
			arrowsContainer.style.width = root.width() + 'px';
			arrowsContainer.style.height = root.height() + 'px';
			root.append(arrowsContainer);
			
			var relativeDiv = document.createElement('div');
			relativeDiv.style.position = 'relative';
			relativeDiv.style.width = '100%';
			relativeDiv.style.height = '100%';
			arrowsContainer.appendChild(relativeDiv);
			
			for(var i=0; i<treeElementsMap.length; i++){
					var pair = treeElementsMap[i];
					var node= pair[0];
					if(node == null){
						continue;
					}
					var children = pair[1];
					ConnectElements(relativeDiv, node, children, 'gray', 3);
			};
		}
		
		function ConnectElements(container, node, children, color, thickness){
			//if no children are available, nothing to connect with.
			if(children.length < 1){
				return;
			}
			
			var JQnode = $(node);
			var JQcontainer = $(container);
			
			//line 1: parent center, verically, half way through:
			var containerTop = JQcontainer.offset().top;
			var containerLeft = JQcontainer.offset().left;
			var parentBottom = JQnode.offset().top + JQnode.height() - containerTop;
			var parentCenter = JQnode.offset().left + JQnode.width()/2 - containerLeft;
			var firstChildTop = $(children[0]).offset().top - containerTop;
			
			var halfHeight = Math.abs(parentBottom - firstChildTop) / 2;

			drawLineDiv(container, parentCenter, parentBottom, halfHeight, thickness, 0, color);
			
			
			//line 2: center height, horizontally, from first child center to last child center:
			var centerHeight = parentBottom + halfHeight;
			var JQfirstChild = $(children[0])
			var firstChildCenter = JQfirstChild.offset().left + JQfirstChild.width()/2 - containerLeft;
			var JQlastChild = $(children[children.length - 1])
			var lastChildCenter = JQlastChild.offset().left + JQlastChild.width()/2 - containerLeft;
			
			var centerLineWidth =  lastChildCenter - firstChildCenter;
			
			drawLineDiv(container, firstChildCenter, centerHeight, thickness, centerLineWidth, 0, color);
			
			
			//line 3: center height, vertically, to child's top:
			for(var i=0; i<children.length; i++){
				var currentChild = $(children[i]);
				var childCenter =  currentChild.offset().left + currentChild.width()/2 - containerLeft;
				
				drawLineDiv(container, childCenter, centerHeight, halfHeight, thickness, 0, color);
			}
			
		}
		

		function drawLineDiv(container, left, top, height, width, angle, color){
			$(container).append($("<div style='" +
					"padding:0px; margin:0px;" + 
					"height:" + height + "px;" +
					"background-color:" + color + ";" + 
					"line-height:1px;" + 
					"position:absolute;" + 
					"left:" + left + "px;" +
					"top:" + top + "px;" +
					"width:" + width + "px;"+
					"-moz-transform:rotate(" + angle + "deg);"+
					"-webkit-transform:rotate(" + angle + "deg);"+
					"-o-transform:rotate(" + angle + "deg); "+
					"-ms-transform:rotate(" + angle + "deg);"+
					"transform:rotate(" + angle + "deg);" +
				"' />"));
		}
		
		
		
	}
	
	
	function displayOclObjectInfo(name, node){
		var oclObjInfo = getOclObjInfoFor(name);
		if (oclObjInfo != null) {
			//create tooltip:
			var objInfoTooltip = '';
			var len = oclObjInfo.length;
			for (var j = 0; j < len; j++) {
				if (j != 0) {
					objInfoTooltip += '\n';
				}
				objInfoTooltip += oclObjInfo[j][0] + ': ' + oclObjInfo[j][1];
			}
			node.title = objInfoTooltip;
		}
		
		
		function getOclObjInfoFor(objName) {
			var len = objectsInfo.length;
			for (var n = 0; n < len; n++) {
				if (objectsInfo[n].name == objName) {
					return objectsInfo[n].info;
				}
			}
			return null;
		}

	}
	
	
	function readOclObjectsInfo(){
	
		//basic check:
		if(oclObjects.objectsInfo == null){
			appendCriticalErrorMessage(reportItem , "Error: OpenCL objects data are not defined.");
			return false;
		}
		
		var ret = false;
		//get and parse the data:
		$.ajax({
			url: oclObjects.objectsInfo.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				objectsInfo = data;
				ret = true;
			},
			error: function(jqxhr, statusText, errorThrown){
				appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"OpenCL Objects\":<br/> \"" + errorThrown + "\".");
				objectsInfo = [];
			}
		});
		return ret;
	}
	
	
	function readOclObjectsTreeData(){
	
		//basic check:
		if(oclObjects.tree == null){
			appendCriticalErrorMessage(reportItem , "Error: OpenCL objects tree data are not defined.");
			return false;
		}
		
		//get and parse the data:
		var ret = false;
		//get and parse the data:
		$.ajax({
			url: oclObjects.tree.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (data) {
				objectsTree = data;
				ret = true;
			},
			error: function(jqxhr, statusText, errorThrown){
				appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"OpenCL Objects Tree\":<br/> \"" + errorThrown + "\".");
				objectsTree = [];
			}
		});
		return ret;
	}
	
	
	
}
function loadSessionInfoReport(reportItem, sessionInfo){
	
	//read sessionInfo data:
	$.ajax({
        url: sessionInfo.source,
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			buildApplicationInfoReport(data);
        },
        error: function(jqxhr, statusText, errorThrown){
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Application Info\":<br/> \"" + errorThrown + "\".");
        }
    });


//==============================================
// help functions:
//==============================================
	function buildApplicationInfoReport(data){
		
		var vm = new ViewMode(reportItem, 140, 'Session Info:', 'reportTitle');
		reportItem.appendChild(CreateSeperator());
		var tl = new TransitionList(reportItem, '100%', false, 'fxPressAwayFAST', '', 400, 'transitionListItemContainer', null, null);
		
		if(data.generalInfo){
			vm.add('sessionOverview_appInfo', 'Session Info', function () { tl.switchTo('sessionOverview_appInfoPage'); });
			var page1 = tl.addReportToList('sessionOverview_appInfoPage');
			page1.appendChild(createGeneralInfoSection(data.generalInfo, null, data.rerunCommand, data.platformInfo));
		}
		
		if(data.output){
			vm.add('sessionOverview_appOutput', 'Application Output', function () { tl.switchTo('sessionOverview_appOutputPage'); });
			var page2 = tl.addReportToList('sessionOverview_appOutputPage');
			page2.appendChild(createApplicationOutputSection(data.output));
		}
		
		if(data.KDFSessionInfo){
			vm.add('sessionOverview_KDFInfo', 'Session Info', function () { tl.switchTo('sessionOverview_KDFInfoPage'); });
			var page3 = tl.addReportToList('sessionOverview_KDFInfoPage');
			page3.appendChild(createGeneralInfoSection(data.generalInfo, data.KDFSessionInfo, data.rerunCommand, data.platformInfo));
		}
		
		if(data.sourceCode != null){
			vm.add('sessionOverview_source', 'Kernel Code', function () { tl.switchTo('sessionOverview_sourcePage'); });
			var page4 = tl.addReportToList('sessionOverview_sourcePage');
			createSourceCodeViewer(data.sourceCode, page4);
		}
		
	}
	
		
//---------------------------------------------------------------------------
	function createGeneralInfoSection(generalInfo, KDFSessionInfo, rerunCommand, platformInfo){
		
		var layoutWrapper =  document.createElement('table');
		layoutWrapper.style.width = '100%';
		reportItem.appendChild(layoutWrapper);
		var tr = layoutWrapper.insertRow();
		tr.insertCell().style.width = '3%';
		var layoutWrapperCell = tr.insertCell();
		tr.insertCell().style.width = '3%';
		
		//table layout:
		var layout = document.createElement('table');
		layout.className = 'hostProfilingOverviewLayout';
		layoutWrapperCell.appendChild(layout);
		var tr;
		
		//---------------------- level 1 ----------------------//
		tr = layout.insertRow();
		
		//application info (CodeAnalyzer mode):
		if(generalInfo != null && KDFSessionInfo == null){
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var info = [
								['analysis start:', generalInfo.analysisStart, false],
								['executable:', generalInfo.executable, true],
								['arguments:', generalInfo.arguments, true],
								['working directory:', generalInfo.workDir, true],
								['exit code:', generalInfo.exitCode, false]
							];
			var section = createSection('Application Info', null, info, '150px');
			container.appendChild(section);
		}
		
		//KDF session info:
		if(KDFSessionInfo != null){
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var info = [
								['Analysis start:', KDFSessionInfo.analysisStart, false],
								['Target Machine:', KDFSessionInfo.TargetMachine, true],
								['Platform name:', KDFSessionInfo.PlatformName, true],
								['Device name:', KDFSessionInfo.DeviceName, true],
								['Session architecture:', KDFSessionInfo.SessionArchitecture, false],
								['Build options:', KDFSessionInfo.BuildOptions, true],
								['Global sizes:', KDFSessionInfo.GlobalSize, false],
								['Local sizes:', KDFSessionInfo.LocalSize, false],
								['Iterations:', KDFSessionInfo.Iteration, false],
								['Assigned variables:', KDFSessionInfo.AssignedVariables, false]
							];
			var section = createSection('Session Info', null, info, '150px');
			container.appendChild(section);
		}
		
		//---------------------- level 2 ----------------------//
		tr = layout.insertRow();
		
		//analysis rerun:
		if(rerunCommand != null){
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var section = createSection('Analysis Manual Re-run Command', null, null);
			
			//append text to section:
			var infoTable = document.createElement('table');
			infoTable.className = 'sectionInfoTable';
			var tr = infoTable.insertRow();
			var rerunCommandContainer = tr.insertCell();
			rerunCommandContainer.className = 'sectionInfoValue';
			rerunCommandContainer.innerHTML = rerunCommand;
			rerunCommandContainer.title = 'click to copy to clipboard';
			rerunCommandContainer.className = 'copiable';
			rerunCommandContainer.onclick = function (){ copyToClipboard(rerunCommandContainer.innerHTML); };
			
			
			//additional flags:
			var autoviewFlag = document.createElement('span');
			autoviewFlag.className = 'toggelableText off';
			autoviewFlag.innerHTML = 'auto view';
			autoviewFlag.title = 'automatically open the reports after the analysis is done.';
			section.appendChild(autoviewFlag);
			
			//styling & positioning:
			autoviewFlag.style.position = 'absolute';
			autoviewFlag.style.top = '10px';
			autoviewFlag.style.right = '20px';
			autoviewFlag.style.fontSize = '14px';
			
			//behaviour:
			autoviewFlag.onclick = function(){
				var jqAutoview = $(autoviewFlag);
				if(jqAutoview.hasClass('off')){
					jqAutoview.removeClass('off').addClass('on');
				}
				else{
					jqAutoview.removeClass('on').addClass('off');
				}
				updateRerunCommand();
			};
			
			section.appendChild(infoTable);
			container.appendChild(section);
			
			//HELP FUNCTION:
			function updateRerunCommand(){
				if(rerunCommandContainer == null){
					return;
				}
				//original command:
				rerunCommandContainer.innerHTML = rerunCommand;
				
				//additional flags:
				if($(autoviewFlag).hasClass('on')){
					rerunCommandContainer.innerHTML += ' --autoview';
				}
			}
			
			
		}
		
		//---------------------- level 3 ----------------------//
		/*tr = layout.insertRow();
		
		//platform info:
		if(platformInfo !=null){
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var info = [
								['platform:', 'HSW', false],
								['Devices:', 'list of devices', true],
								['others:', 'stuff about things...', true]
							];
			var section = createSection('Platform Info', null, info, '90px');
			container.appendChild(section);
		}*/
		
		return layoutWrapper;
	}
	
	
//---------------------------------------------------------------------------------------------------
	function createSection(title, tipsCount, info, keyColumnWidth, sectionClass){
		
		var section = document.createElement('div');
		section.className = 'hostProfilingOverviewSection';
		if(sectionClass != null && sectionClass != ''){
			section.className += ' ' + sectionClass;
		}
		
		var titleSpan = document.createElement('span');
		titleSpan.className = 'sectionTitle';
		titleSpan.innerHTML = title;
		section.appendChild(titleSpan);
		
		if(tipsCount > 0){//todo: parse to int first.
			var tipsSpan =document.createElement('span');
			tipsSpan.className = 'sectionTipsCount';
			tipsSpan.innerHTML = tipsCount + ' tips';
			section.appendChild(tipsSpan);
		}
		
		if(info !=null && info.length > 0){
			var infoTable = document.createElement('table');
			infoTable.className = 'sectionInfoTable';
			for(var i = 0; i < info.length; i++)(function(i){
				var tr = infoTable.insertRow();
				
				var td = tr.insertCell();
				td.className = 'sectionInfoKey';
				td.innerHTML = '- ' + info[i][0];
				if(keyColumnWidth != null){
					td.style.width = keyColumnWidth;
				}
				
				td = tr.insertCell();
				td.className = 'sectionInfoValue';
				td.innerHTML = info[i][1];
				
				//can copy?
				if(info[i][2] == true){
					td.title = 'click to copy to clipboard';
					td.className = 'copiable';
					td.onclick = function (){ copyToClipboard(info[i][1]); };
				}
			})(i);
			
			section.appendChild(infoTable);
		}
		
		return section;
	}
	
	
//---------------------------------------------------------------------------------------------------
	function createApplicationOutputSection(output){
		
		var layoutWrapper =  document.createElement('table');
		layoutWrapper.style.width = '100%';
		reportItem.appendChild(layoutWrapper);
		var tr = layoutWrapper.insertRow();
		tr.insertCell().style.width = '3%';
		var layoutWrapperCell = tr.insertCell();
		tr.insertCell().style.width = '3%';
		
		//table layout:
		var layout = document.createElement('table');
		layout.className = 'hostProfilingOverviewLayout';
		layoutWrapperCell.appendChild(layout);
		var tr;
		
		//---------------------- level 1 ----------------------//
		//togglers:
		tr = layout.insertRow();
		var td = tr.insertCell();
		td.innerHTML = 'filters:';
		td.style.paddingLeft = '30px';
		td.style.fontSize = '14px';
		
		var stdoutToggler = document.createElement('span');
		stdoutToggler.className = 'toggelableText on';
		stdoutToggler.innerHTML = 'stdout';
		stdoutToggler.title = 'show / hide standard output.';
		stdoutToggler.style.paddingLeft = '30px';
		td.appendChild(stdoutToggler);
		stdoutToggler.onclick = function(){
			var jq = $(stdoutToggler);
				if(jq.hasClass('off')){
					jq.removeClass('off').addClass('on');
				}
				else{
					jq.removeClass('on').addClass('off');
				}
			updateApplicationOutputView();
		};
		
		
		var stderrToggler = document.createElement('span');
		stderrToggler.className = 'toggelableText on';
		stderrToggler.innerHTML = 'stderr';
		stderrToggler.title = 'show / hide standard error.';
		stderrToggler.style.paddingLeft = '30px';
		td.appendChild(stderrToggler);
		stderrToggler.onclick = function(){
			var jq = $(stderrToggler);
				if(jq.hasClass('off')){
					jq.removeClass('off').addClass('on');
				}
				else{
					jq.removeClass('on').addClass('off');
				}
			updateApplicationOutputView();
		};
		
		//---------------------- level 2 ----------------------//
		tr = layout.insertRow();
		
		//application info:
		var container = tr.insertCell();
		container.className = 'sectionContainer';
		var section = createSection('', null, null);
		section.style.padding = '10px 20px';
		section.style.fontSize = '14px';
		section.innerHTML = output;
		container.appendChild(section);
	
	
		//section.appendChild(infoTable);
		container.appendChild(section);
	
		return layoutWrapper;
		
		
		//HELP FUNCTION:
		function updateApplicationOutputView(){
			if($(stdoutToggler).hasClass('on')){
				$(section).find('.stdout').show();
			}
			else{
				$(section).find('.stdout').hide();
			}
			
			if($(stderrToggler).hasClass('on')){
				$(section).find('.stderr').show();
			}
			else{
				$(section).find('.stderr').hide();
			}
		}
		
	}
	
	
	function createSourceCodeViewer(sourceFile, pageItem){
		var sourceWrapper = document.createElement('div');
		sourceWrapper.style.width = '100%';
		sourceWrapper.style.height = '100%';
		pageItem.appendChild(sourceWrapper);
		
		var sourceCode = "";
		var success = false;
		//get and parse the data:
		$.ajax({
			url: sourceFile,
			type: "POST",
			dataType: "text",
			async: false,
			success: function (data) {
				sourceCode = data;
				success = true;
			},
			error: function(jqxhr, statusText, errorThrown){
				appendCriticalErrorMessage(sourceWrapper , "Error: unable to retrieve \"Kernel Code\":<br/> \"" + errorThrown + "\".");
				success = false;
			}
		});
		
		if(success == true) {
			sourceWrapper.appendChild(CreateSrcViewer(sourceCode));
			
			//apply syntax highlighter:
			SyntaxHighlighter.defaults.toolbar = false;
			SyntaxHighlighter.highlight();
		}
		
	
	}
	
	
}


function loadExectionViewReport(reportItem, execution){

	//*****************************************/
	/* Building report structure */
	/*****************************************/
	//basics:
	if(!execution.lastState){
		execution.lastState = { 'activePage': null };
	}
	
	var vm = new ViewMode(reportItem, 140, 'Execution View:', 'reportTitle');
	reportItem.appendChild(CreateSeperator('100%', null, '5px'));
	var tl = new TransitionList(reportItem, '100%', false, 'fxPressAwayFAST', '', 400, 'transitionListItemContainer', onPageLoad, onPageDispose);
	
	//ids:
	var vm1_id = 'executionView_basicExecutionView', page1_id = 'executionView_basicExecutionPage';
	var vm2_id = 'executionView_graphView', page2_id = 'executionView_graphPage';
	var vm3_id = 'executionView_advancedExecutionView', page3_id = 'executionView_advancedExecutionPage';
	
	//create pages:
	if(execution.run){
		vm.add(vm1_id, 'Execution', function () { tl.switchTo(page1_id); });
		var page1 = tl.addReportToList(page1_id);
		page1.loadingFunc = function(){ loadKDFRunReportFromFile(page1, execution.run); };
		
		//last state:
		if(execution.lastState && execution.lastState.activePage == page1_id){
			page1.loadingFunc();
		}
	}
	
	if(execution.table){
		vm.add(vm3_id, 'Advanced', function () { tl.switchTo(page3_id); });
		var page3 = tl.addReportToList(page3_id);
		page3.loadingFunc = function(){ buildExecutionTableView(execution.table, true, page3, page3_id); };
		
		//last state:
		if(execution.lastState && execution.lastState.activePage == page3_id){
			vm.setFocusOn(vm3_id);
		}
	}
	
	if(execution.graph != null && execution.graph.source != null){
		vm.add(vm2_id, 'Graphical View', function () { tl.switchTo(page2_id); });
		var page2 = tl.addReportToList(page2_id);
		page2.loadingFunc = function(){ buildExecutionGraphView(execution.graph, page2); };
		
		//last state:
		if(execution.lastState && execution.lastState.activePage == page2_id){
			vm.setFocusOn(vm2_id);
		}
	}
	
	

	//if no last-state set yet, set it to be the first:
	if(execution.lastState.activePage == null && tl.itemsCount > 0){
		//execution.lastState = { 'activePage': null };
		var firstPageId = tl.callLoadOnFirstItem();
		execution.lastState.activePage = firstPageId;
	}
	
	
	//build tips:
	//addNewTip();
	
	
	
	/*****************************************/
	/* Load / Dispose functions */
	/*****************************************/
	function onPageLoad(id){
		//console.log('inner load: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			//appendCriticalErrorMessage(parent , "Error: unable to find report!");
			alert("Error: unable to find report!");
			return;
		}
		execution.lastState.activePage = id;
		
		//call it's loading function (if it has any):
		if (typeof page.loadingFunc == 'function') {
			page.loadingFunc();
		}
		else{
			console.log('no loading function found for ' + id);
		}
		
	}
	
	function onPageDispose(id){
		//console.log('inner dispose: ' + id);
		//get page element:
		var page = document.getElementById(id);
		if(page == null){
			alert("Error: unable to find report!");
			return;
		}
		
		if(id == page1_id){
			execution.lastState.tableView = {'tableState': null};
		}
		
		if(id == page2_id){
			//get graph's last state:
			if(page.objectsMap && page.objectsMap.graph != null){
				var graphLastState = page.objectsMap.graph.getState();
				execution.lastState.graphView = {'graphState': graphLastState};
			}
		}
		
		$(page).empty();
	}
	
	reportItem.onItemDispose = function(){
		var activePage = tl.getCurrentItem();
		onPageDispose(activePage.id);
	}
	
	
	
	/*****************************************/
	/* Build page1 - table view */
	/*****************************************/
	function buildExecutionTableView(pageData, showCounters, parent, id_suffix) {
		//spcial handling for bad datatable plug-in margin in IE:
		if(browserInfo.isIE == true){
			$(parent).addClass('IEmode');
		}
		
		//special handling for bad datatable plug-in body-height in Chrome:
		if(browserInfo.isChrome == true){
			parent.style.overflowY = 'hidden';
		}
		
		
		//best/worst configurations:
		var bestAndWorstConfigDiv = document.createElement('div');
		parent.appendChild(bestAndWorstConfigDiv);
		bestAndWorstConfigDiv.style.height = '21px';
		
		var spaceNumber = ' ';
		var space = '';
		for(var i=0; i<8; i++){
			space += spaceNumber;
		}
		bestAndWorstConfigDiv.innerHTML = '<b>Best Configuration:</b> <span style="color: #0071c5;">' + execution.bestConf.name + '</span> - <span style="color: gray;">median (ms): ' + execution.bestConf.median + '</span>';// +
														// space +'|' + space +
														// '<b>Worst Configuration:</b> <span style="color: #0071c5;">' + execution.worstConf.name + '</span> - <span style="color: gray;">median (ms): ' + execution.worstConf.median + '</span>';
													
		
		
		var id = 'executionView_tableView_'+id_suffix;
		var ActiveTipInfo = {};
		var metricsInfo = {};
		
		if(showCounters == true){
			
			//get the HW metrics info:
			$.ajax({
				url: pageData.metricsInfo,
				type: "POST",
				dataType: "json",
				async: false,
				success: function (data) {
					metricsInfo = data;
				},
				error: function(jqxhr, statusText, errorThrown){
					//alert('failed to get metrics info: ' + errorThrown);//todo: remove.
					metricsInfo = {};
				}
			});
		}
		
		//transition list height binding to window size:
		window.addEventListener('resize', function (event) {
			resizeTableToFitScreen();
		});
		
		function resizeTableToFitScreen(){
			var scrollBodies = $(parent).find('.dataTables_scrollBody');
			if (scrollBodies != null && scrollBodies.length > 0) {
				$(scrollBodies[0]).css('height', ($(parent).height() - 51));
			}
    
		}
		
		var columns = [
				{
					"title": "",
					"defaultContent": "+",
					"searchable": false,
					"className": 'details-control',
					"orderable": false
				},
				{
					"title": "<span class='hwCountersHeaders'>Gx</span>",
					"data": "Gx",
					"contentPadding": ""
				},
				{
					"title": "<span class='hwCountersHeaders'>Gy</span>",
					"data": "Gy",
					"contentPadding": ""
				},
				{
					"title": "<span class='hwCountersHeaders'> Gz</span>",
					"data": "Gz",
					"contentPadding": ""
				},
				{
					"title": "<span class='hwCountersHeaders'>Lx</span>",
					"data": "Lx",
					"contentPadding": ""
				},
				{
					"title": "<span class='hwCountersHeaders'>Ly</span>",
					"data": "Ly",
					"contentPadding": ""
				},
				{
					"title": "<span class='hwCountersHeaders'>Lz</span>",
					"data": "Lz",
					"contentPadding": ""
				},
				{
					"title": "<span class='hwCountersHeaders'>Iterations</span>",
					"data": "iterations",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Total (ms)</span>",
					"data": "total",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Queue (ms)</span>",
					"data": "queue",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Submit (ms)</span>",
					"data": "submit",
					"contentPadding": "mmmm"
				},
				{
					"title": "<span class='hwCountersHeaders'>Execution (ms)</span>",
					"data": "execution",
					"contentPadding": "mmmm"
				}
			];
			
			
		var canViewVariables = false;
		try{
			canViewVariables = window.external.CanViewVariables();
		}
		catch(ex){
			canViewVariables = false;
		}
			
		//do variables?
		if(canViewVariables && execution.variables == true){

				var variablesColumn = {
						"title": "Variables",
						"className": "variablesLauncher",
						"searchable": false,
						"orderable": false,
						"render": function (data, type, row) {							
							//check if needed data exists:
							if(row.variables != null && row.variables.length != 0){
								var spanHTML = '<span class="linkableTextIntelBlue" style="margin-right: 10px;" ' +
													   'title="view variables">[...]</span>';
								return spanHTML;
							}
							return '';
						}
					};
				
				columns.splice(7, 0, variablesColumn);//at index 7.
			
			}
			
			
			
		if(metricsInfo.stats != null){

				var memoryDiagramColumn = {
						"title": "",
						"className": "memoryDiagramLauncher",
						"searchable": false,
						"orderable": false,
						"render": function (data, type, row) {							
							//check if needed data exists:
							if(row.EuActive != null && row.EuActive != '' && row.EuActive != '[N/A]'){
								var spanHTML = '<span class="linkableTextIntelBlue" style="margin-right: 10px;" ' +
													   'title="view data as a memory diagram">[...]</span>';
								return spanHTML;
							}
							return '';
						}
					};
				
				columns.push(memoryDiagramColumn);
			
			}
			
			
		//HW metrics columns definition:
		if(metricsInfo.stats != null){
			columns = columns.concat(metricsInfo.stats);
		}
		
		$('<table id="' + id + '" class="display "/>').appendTo(parent);
		var dataTableObj = $('#' + id).DataTable({
			"ajax": pageData.source,
			"columns": columns,
			"order": [[1, 'asc']],
			//"bLengthChange": false,
			"bFilter": false,
			"bInfo": false,
			//"aLengthMenu": [10],
			"scrollY": "auto",
			"sScrollX": "100%",
			"bPaginate": false,
			"bSortClasses": false,
			"language": { "emptyTable": "no records available." }
			//	"sRowSelect": "single"
			
		});
		$('#' + id).css({ 'min-width': '600px' });

		resizeTableToFitScreen();
		
		var selectedRow = null;
		$($('#' + id).find('tbody')).on('click', 'tr', function () {
			if(selectedRow != null){
				$(selectedRow).removeClass('selected');
			}
			
			selectedRow = this;
			$(selectedRow).addClass('selected');
		} );
		
		$($('#' + id).find('tbody')).on('dblclick', 'tr', function () {
			
			var td = $(this).find('td.details-control')[0];
			$(td).click();
		} );
		
		
		//variablesLauncher events:
		var count = 0;
		$($('#' + id).find('tbody')).on('click', 'td.variablesLauncher', function () {
			if(this.innerHTML == ''){
				return;
			}
			
			count++;
			this.style.cursor = 'pointer';
			var t1_parentTR = this.parentNode;
			var t1_row = dataTableObj.row(t1_parentTR);
			var t1_data = t1_row.data();
			
			openVariablesLauncher(t1_parentTR, t1_row, t1_data);
			
		});
			
		// Add event listener for opening and closing details
			var count = 0;
			$($('#' + id).find('tbody')).on('click', 'td.memoryDiagramLauncher', function () {
				if(this.innerHTML == ''){
					return;
				}
				
				count++;
				this.style.cursor = 'pointer';
				var t1_parentTR = this.parentNode;
				var t1_row = dataTableObj.row(t1_parentTR);
				var t1_data = t1_row.data();
				
				openMemoryDiagram(t1_parentTR, t1_row, t1_data);
				
			});

			if(count == 0){
				//alert('todo: hide the column');
			}
		
		// Add event listener for opening and closing details
		$('#' + id + ' tbody').on('click', 'td.details-control', function () {
			var tr = $(this).closest('tr');
			var row = dataTableObj.row(tr);

			if (row.child.isShown()) {
				// This row is already open - close it
				row.child.hide();
				row.child.remove();
				RowDetailsHidden($(this));
				
				//clear highlight:
				$(tr).find('.tableFocusedRow_topLeft').removeClass('tableFocusedRow_topLeft');
				$(tr).find('.tableFocusedRow_top').removeClass('tableFocusedRow_top');
				
			}
			else {
				//close previouse active rows:
				closeActiveDetailRows();
				
				// Open this row
				child = createRowDetails(tr, row, row.data());
				child.show();
				RowDetailsShown($(this));
				
				
			}

		});
		
		function closeActiveDetailRows(){
			var activeRows = $('#' + id).find('.activeDetailsParentRow');
			if(activeRows.length > 0){
				activeRows.trigger('click');
			}
		}

		function createRowDetails(parentTR, row, rowData) {
			
			var parentCells = $(parentTR).find('td');
			for(var i=0; i<parentCells.length; i++){
				if(i==0){
					$(parentCells[0]).addClass('tableFocusedRow_topLeft');
				}
				else{
					$(parentCells[i]).addClass('tableFocusedRow_top');
				}
			}
			
			var div = document.createElement('div');
			div.style.background = 'white';//'#bfc7ce';
			div.style.height = '198px';
			//div.style.minHeight = '190px';
			//div.style.maxHeight = '190px';
			div.style.width = 'calc(100% - 40px)';
			//div.style.minWidth = '1200px';
			div.style.marginLeft = '20px';
			div.style.overflow = 'auto';
			div.style.overflowY = 'hidden';
			child = row.child(div);
			
			$(div.parentNode).addClass('tableFocusedRow_left');
			
			
			
			var tableLayout = document.createElement('table');
			tableLayout.style.width = '100%';
			var tr = tableLayout.insertRow();

			var cell_datatable = tr.insertCell();
			cell_datatable.style.width = '70%';
			cell_datatable.style.minWidth = '500px';
			cell_datatable.style.paddingBottom = '0px';

			var cell_graph = tr.insertCell();
			cell_graph.className = 'cell_detailesGraph';
			$(div).append(tableLayout);

			var tableContainer = document.createElement('div');
			tableContainer.style.background = '#fcfcfc';
			tableContainer.style.marginRight = '5px';
			tableContainer.style.marginTop = '15px';
			$(cell_datatable).append(tableContainer);

			var graphContainer = document.createElement('div');
			graphContainer.className = 'kernelsOverviewInnerGraphContainer';
			cell_graph.appendChild(graphContainer);
			graphContainer.style.width = '100%';
			graphContainer.style.height = '180px';
			graphContainer.style.position = 'relative';
			

			var table = document.createElement('table');
			table.className = 'display'; //apiTraceTable
			$(tableContainer).append(table);
			table.rowData = rowData;
			
			var columns = [
				{
					"title": "<span class='hwCountersHeaders'>Measurement/Iteration</span>",
					"data": "measurement"
				},
				{
					"title": "<span class='hwCountersHeaders'>Total (ms)</span>",
					"data": "total"
				},
				{
					"title": "<span class='hwCountersHeaders'>Submit (ms)</span>",
					"data": "submit"
				},
				{
					"title": "<span class='hwCountersHeaders'>Queue (ms)</span>",
					"data": "queue",
					"chartable": "true"
				},
				{
					"title": "<span class='hwCountersHeaders'>Execution (ms)</span>",
					"data": "execution"
				}
			];
			
			var scrollY = null;
			if(rowData.executionsCount != null && rowData.executionsCount > 4){
				scrollY = '100px';
			}
			
			
			
			if(metricsInfo.details != null){

				var memoryDiagramColumn = {
						"title": "",
						"className": "t2_memoryDiagramLauncher",
						"searchable": false,
						"orderable": false,
						"render": function (data, type, row) {							
							//check if needed data exists:
							if(row.EuActive != null && row.EuActive != '' && row.EuActive != '[N/A]'){
								var spanHTML = '<span class="linkableTextIntelBlue" style="margin-right: 10px;" ' +
													   'title="view data as a memory diagram">[...]</span>';
								return spanHTML;
							}
							return '';
						}
					};
				
				columns.push(memoryDiagramColumn);
			
			}
					
			//HW metrics columns definition:
			if(metricsInfo.details != null){
				columns = columns.concat(metricsInfo.details);
			}
		
			
			detailsTableObj = $(table).DataTable({

				"ajax": rowData.details,
				"columns": columns,
				"bSortClasses": false,
				"scrollY": "100px",
				"bDeferRender": true,
				"processing": true,
				"serverSide": false,
				//"bFilter": false,
				//"bLengthChange": false,
				//"bInfo": false,
				//"scrollY": "130px",
				//"sScrollX": "100%",
				//"bPaginate": false,
				//"bInfo": false,
				"aLengthMenu": [4],
				"fnInitComplete": function (oSettings, json) {
					//create bars-chart:
					createGraphFromTableData(graphContainer, json.data, 'total');
				}
			});

			// Add resize listener:
			$(table).resize(function () {
				detailsTableObj.columns.adjust();
			});
			
			
			// Add event listener for opening and closing details
			var count = 0;
			$($(table).find('tbody')).on('click', 'td.t2_memoryDiagramLauncher', function () {
				if(this.innerHTML == ''){
					return;
				}
				
				count++;
				this.style.cursor = 'pointer';
				var t2_parentTR = this.parentNode;
				var t2_row = detailsTableObj.row(t2_parentTR);
				var t2_data = t2_row.data();
				
				openMemoryDiagram(t2_parentTR, t2_row, t2_data);
				
			});

			if(count == 0){
				//alert('todo: hide the column');
			}
			
			return child;
		}
	
	
	}
	
	
	function openVariablesLauncher(parentTR, row, allData){
		
		var popupDiv = openOverlayLayout('850px', '380px', true);
		popupDiv.style.textAlign = 'left';
		
		var title = document.createElement('div');
		title.innerHTML = 'Kernel Variables:';
		title.style.textAlign = 'left';
		title.style.color = 'gray';
		title.style.marginTop = '20px';
		title.style.marginLeft = '20px';
		popupDiv.appendChild(title);
		
		var seperator = CreateSeperator('80%', null, '0px');
		seperator.style.marginLeft = '12px';
		popupDiv.appendChild(seperator);
		
		var tableContainer = document.createElement('div');
		tableContainer.style.marginTop = '5px';
		tableContainer.style.marginLeft = '10px';
		tableContainer.style.marginRight = '10px';
		popupDiv.appendChild(tableContainer);
		
		var table = document.createElement('table');
			table.className = 'display'; //apiTraceTable
			$(tableContainer).append(table);
			
			var columns = [
				{
					"title": "<span class='hwCountersHeaders'>Variable Name</span>",
					"data": "name",
					"render": function (data, type, row) {				
								 var spanHTML = '<span class="variableLauncherSpan" style="color: #0071C5; text-decoration: underline;" ' +
															'title="view variable content">' + data +
														'</span>';
								 return spanHTML;
							}
				},
				{
					"title": "<span class='hwCountersHeaders'>Read Time (ms)</span>",
					"data": "readTime"
				},
				{
					"title": "<span class='hwCountersHeaders'>Read Back Time (ms)</span>",
					"data": "readBackTime"
				},
				{
					"title": "<span class='hwCountersHeaders'>Data Type</span>",
					"data": "dataType",
				}
			];
			
			detailsTableObj2 = $(table).DataTable({

				"aaData": allData.variables.data,
				"columns": columns,
				"bSortClasses": false,
				"scrollY": "100px",
				"bDeferRender": true,
				"processing": true,
				"serverSide": false,
				"bFilter": false,
				"bLengthChange": false,
				"bInfo": false,
				"scrollY": "280px",
				//"sScrollX": "100%",
				"bPaginate": false,
				//"bInfo": false,
			});
			
			
			$.each($(table).find('span.variableLauncherSpan'), function( index, variableSpan ) {
				var variableData = detailsTableObj2.row($(variableSpan).closest('tr')).data();
				if(variableData.dataType == 'image2d_t'){
					$(variableSpan).addClass('allowYUVContextMenu');
				}
				variableSpan.variableData = variableData;
				variableSpan.style.cursor = 'pointer';
			});
			
			$($(table).find('tbody')).on('click', 'span.variableLauncherSpan', function () {
				OpenVariableViewer(this.variableData);
			});
			
		
	}
	
	
	function openMemoryDiagram(parentTR, row, allData){
		
		var popupDiv = openOverlayLayout('850px', '380px', true);
		
		var title = document.createElement('div');
		title.innerHTML = 'Memory Diagram:';
		title.style.textAlign = 'left';
		title.style.color = 'gray';
		title.style.marginTop = '20px';
		title.style.marginLeft = '20px';
		popupDiv.appendChild(title);
		
		var seperator = CreateSeperator('80%', null, '0px');
		seperator.style.marginLeft = '12px';
		popupDiv.appendChild(seperator);
		
		var diagramContainer = document.createElement('div');
		diagramContainer.style.marginTop = '20px';
		diagramContainer.style.marginLeft = '10px';
		diagramContainer.style.marginRight = '10px';
		popupDiv.appendChild(diagramContainer);
		
		var memoryDiagram = new MemoryDiagram(diagramContainer, 'hsw');
		
		//calculations:
		var EU_text = '';
		if(allData.EuStall && allData.EuStall != ''){
			EU_text += 'EU Stall: ' + allData.EuStall + '<br/>';
		}
		if(allData.EuActive && allData.EuActive != ''){
			EU_text += 'EU Active: ' + allData.EuActive + '<br/>';
		}
		if(allData.EuIdle && allData.EuIdle != ''){
			EU_text += 'EU Idle: ' + allData.EuIdle + '<br/>';
		}
		if(allData.EuThreadOccupancy && allData.EuThreadOccupancy != ''){
			EU_text += 'Occupancy: ' + allData.EuThreadOccupancy + '<br/>';
		}
		

		var arrow_EU_L3 = '';
		if(allData.SlmBytesRead && allData.SlmBytesRead != ''){
			arrow_EU_L3 += 'Slm Bytes Read: ' + allData.SlmBytesRead + '<br/>';
		}
		if(allData.SlmBytesWritten && allData.SlmBytesWritten != ''){
			arrow_EU_L3 += 'Slm Bytes Written: ' + allData.SlmBytesWritten + '<br/>';
		}
		if(allData.TypedBytesRead && allData.TypedBytesRead != ''){
			arrow_EU_L3 += 'Typed Bytes Read: ' + allData.TypedBytesRead + '<br/>';
		}
		if(allData.TypedBytesWritten && allData.TypedBytesWritten != ''){
			arrow_EU_L3 += 'Typed Bytes Written: ' + allData.TypedBytesWritten + '<br/>';
		}
		if(allData.UntypedBytesRead && allData.UntypedBytesRead != ''){
			arrow_EU_L3 += 'Untyped Bytes Read: ' + allData.UntypedBytesRead + '<br/>';
		}
		if(allData.UntypedBytesWritten && allData.UntypedBytesWritten != ''){
			arrow_EU_L3 += 'Untyped Bytes Written: ' + allData.UntypedBytesWritten + '<br/>';
		}
		
		var arrow_L3_LLC = '';
		if(allData.LlcAccesses && allData.LlcAccesses != ''){
			arrow_L3_LLC += 'LLC Accesses: ' + allData.LlcAccesses + '<br/>';
		}
		if(allData.LlcHits && allData.LlcHits != ''){
			arrow_L3_LLC += 'LLC Hits: ' + allData.LlcHits + '<br/>';
		}

		
		memoryDiagram.setValues(
									EU_text, //EU
									'', //unit_L1
									'', //unit_L2
									'',//unit_L3
									'',//unit_LLC
									'',//unit_DRAM
									'',//arrow_EU_L1
									'',//arrow_L1_L2
									'',//arrow_L2_L3
									arrow_L3_LLC,
									'',//arrow_LLC_DRAM_up
									arrow_EU_L3
								);
	}
	
	
	/*****************************************/
	/* Build page2 - graph view */
	/*****************************************/
	function buildExecutionGraphView(pageData, parent){
		//objects map:
		parent.objectsMap = {};
		
		//read graph data:
		$.ajax({
			url: pageData.source,
			type: "POST",
			dataType: "json",
			async: false,
			success: function (graphData) {
				//build graph:
				var graphContainer = document.createElement('div');
				graphContainer.className = 'apiCallsGraphContainer';
				parent.appendChild(graphContainer);
				
				var graph = new Graph(graphContainer);
				graph.setData(graphData.datasets);
				graph.setOptions(graphData.options);
				graph.Render();
				
				//save reference:
				parent.objectsMap.graph = graph;
				
				//apply last state (if there any):
				if(execution.lastState.graphView && execution.lastState.graphView.graphState != null){
					graph.applyState(execution.lastState.graphView.graphState);
				}
			},
			error: function(jqxhr, statusText, errorThrown){
				appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"Kernels Overview\" graph:<br/> \"" + errorThrown + "\".");
			}
		});
		
		
	
	}
	
	
}


function createKDFVariablesContextMenuFor(variableSpan, event){
	
	//context menu container:
	var contextMenuDiv = document.createElement('div');
	contextMenuDiv.className = 'customeContextMenu';
	document.body.appendChild(contextMenuDiv);
	
	contextMenuDiv.style.position = 'fixed';
	contextMenuDiv.style.top = event.pageY + 'px';
	contextMenuDiv.style.left = event.pageX + 'px';
	contextMenuDiv.style.background = 'white';
	contextMenuDiv.style.padding = '5px';
	contextMenuDiv.style.border = '1px solid #CCC';
	contextMenuDiv.style. borderRadius = '5px';
	contextMenuDiv.style.zIndex = '9999999999';
	
	//"view variable" item:
	var showVariableMenuItem = document.createElement('li');
	contextMenuDiv.appendChild(showVariableMenuItem);
	showVariableMenuItem.innerHTML = 'View Variable';
	showVariableMenuItem.style.cursor = 'pointer';
		
	//"view as YUV image" item:
	var showVariableAsYUVItem = null;
	if($(variableSpan).hasClass('allowYUVContextMenu')){
		showVariableAsYUVItem = document.createElement('div');
		contextMenuDiv.appendChild(showVariableAsYUVItem);
		showVariableAsYUVItem.innerHTML = 'View as YUV Image';
		showVariableAsYUVItem.style.cursor = 'pointer';
	}
	

	var clickAwayEventHandler = function (e) {
		// If the clicked element is not the menu
		if (!$(e.target).parents(".customeContextMenu").length > 0) {
			document.body.removeChild(contextMenuDiv);
			$(document).unbind("mousedown", clickAwayEventHandler);
		}
		else{
			if(e.target == showVariableMenuItem){
				TriggerVariableViewerFromSpanData(variableSpan);
				document.body.removeChild(contextMenuDiv);
				$(document).unbind("mousedown", clickAwayEventHandler);
			}
			else if(showVariableAsYUVItem != null && e.target == showVariableAsYUVItem){
				OpenVariableYUVViewer(variableSpan);
				document.body.removeChild(contextMenuDiv);
				$(document).unbind("mousedown", clickAwayEventHandler);
			}


			
		}
	}
	
	// If the document is clicked somewhere
	$(document).bind("mousedown", clickAwayEventHandler);

}

function OpenVariableYUVViewer(variableSpan){
	
	var variableData = $(variableSpan).data();
	var overlayDiv = openOverlayLayout('400px','350px', true, null, null, null, true);
		//overlayDiv.style.paddingLeft = '10px';
		overlayDiv.style.textAlign = 'center';
		var title = document.createElement('div');
		overlayDiv.appendChild(title);
		title.innerHTML = 'YUV Planes Combiner:';
		title.style.fontSize = '16px';
		title.style.paddingTop = '50px';
		title.style.paddingBottom = '10px';
		title.style.color = 'gray';

		
		var span = document.createElement('span');
		span.className = 'bufferViewerSpanInputName';
		span.innerHTML = '- Planes Format:';
		overlayDiv.appendChild(span);
		
		//planes format:
		var planesFormatSelect = document.createElement('select');
		planesFormatSelect.className = "textInput";
		planesFormatSelect.style.width = '200px';
		planesFormatSelect.style.marginLeft = '10px';
		planesFormatSelect.style.marginRight = '40px';
		overlayDiv.appendChild(planesFormatSelect);
		var yuvOptions = ['YUV - NV12', 'YUV - NV21', 'YUV - YV12'];
		for(i = 0; i<yuvOptions.length; i++) { 
			var opt = document.createElement('option');
			opt.value = yuvOptions[i];
			opt.innerHTML = yuvOptions[i];
			planesFormatSelect.appendChild(opt);
		}
		planesFormatSelect.onchange=function(){ onPlanesFormateSelectionChange(); };
		
		function onPlanesFormateSelectionChange(){
			if(planesFormatSelect.value == 'YUV - YV12'){
				$(overlayDiv).find('.uvPlane_class').css({'display': 'none'});
				$(overlayDiv).find('.vPlane_class').css({'display': ''});
				$(overlayDiv).find('.uPlane_class').css({'display': ''});
			}
			else{
				$(overlayDiv).find('.uvPlane_class').css({'display': ''});
				$(overlayDiv).find('.vPlane_class').css({'display': 'none'});
				$(overlayDiv).find('.uPlane_class').css({'display': 'none'});
			}
		}
		
		overlayDiv.appendChild(document.createElement("br"));
		
		
		
		addYUVInputFieldsSet('- Y Plane :', true, true, 'yPlane_class', variableData.path);
		addYUVInputFieldsSet('- UV Plane:', true, true, 'uvPlane_class', null);
		addYUVInputFieldsSet('- V Plane :', true, true, 'vPlane_class', null);
		addYUVInputFieldsSet('- U Plane :', true, true, 'uPlane_class', null);
		addYUVInputFieldsSet('- Width :', false, false, 'imageWidth', variableData.width, '57px');
		addYUVInputFieldsSet('- Height :', false, false, 'imageHeight', variableData.height, '62px');
		
		overlayDiv.appendChild(document.createElement("br"));
		//overlayDiv.appendChild(document.createElement("br"));
		
		var createImageButton = document.createElement('span');
		createImageButton.className = 'intelLinkHoverColor';
		overlayDiv.appendChild(createImageButton);
		createImageButton.innerHTML = 'create YUV image';
		createImageButton.style.fontSize = '14px';
		
		overlayDiv.appendChild(document.createElement("br"));
		
		var errorSpan = document.createElement('span');
		overlayDiv.appendChild(errorSpan);
		errorSpan.innerHTML = '';
		errorSpan.style.fontSize = '14px';
		errorSpan.style.color = 'red';
		
		onPlanesFormateSelectionChange();
		
		createImageButton.onclick = function(){
			
			var selectedMode = planesFormatSelect.value;
			var yPlane = $('input.yPlane_class:text')[0].value;
			if($($('.yPlane_class.toggelableText')[0]).hasClass('on')){
				yPlane = 'Auto';
			}
			
			var uvPlane = $('input.uvPlane_class:text')[0].value;
			if($($('.uvPlane_class.toggelableText')[0]).hasClass('on')){
				uvPlane = 'Auto';
			}
			
			var vPlane = $('input.vPlane_class:text')[0].value;
			if($($('.vPlane_class.toggelableText')[0]).hasClass('on')){
				vPlane = 'Auto';
			}
			
			var uPlane = $('input.uPlane_class:text')[0].value;
			if($($('.uPlane_class.toggelableText')[0]).hasClass('on')){
				uPlane = 'Auto';
			}
			
			var imageWidth = $('input.imageWidth:text')[0].value;
			var imageHeight = $('input.imageHeight:text')[0].value;
			
			//call the YUV combine service:
			$.ajax({
				url:  'ImageViewer?combineYUVImageAndGetPath=' + selectedMode + '&' + yPlane + '&' + uvPlane + '&' + 
				vPlane + '&' + uPlane + '&' + imageWidth + '&' + imageHeight + '&' + variableData.name,
				type: "POST",
				async: false,
				dataType: "text",
				success: function (bitmapPath) {
					var clonedSpan = $(variableSpan).clone();
					$(clonedSpan).data('path', bitmapPath);
					TriggerVariableViewerFromSpanData(clonedSpan);
					errorSpan.innerHTML = '';
				},
				error: function(jqxhr, statusText, errorThrown){
					errorSpan.innerHTML =  errorThrown;
				}
			});
		}
		
		
		function addYUVInputFieldsSet(labelText, allowBrowseButton, allowAutoButton, groupClass, defaultValue, extraMargin){
			
			var span = document.createElement('span');
			overlayDiv.appendChild(span);
			span.className = 'bufferViewerSpanInputName ' + groupClass;
			span.innerHTML = labelText;
			
			var yPlaneInput = document.createElement('input');
			yPlaneInput.type = "text";
			yPlaneInput.className = "textInput " + groupClass;
			yPlaneInput.style.width = '200px';
			yPlaneInput.style.marginLeft = '19px';
			if(defaultValue != null){
				yPlaneInput.value = defaultValue;
			}
			overlayDiv.appendChild(yPlaneInput);
			
			var button = null;
			if(allowBrowseButton == true){
				button = document.createElement('button');
				button.className = groupClass;
				button.innerHTML = '...';
				button.onclick = function(){
					yPlaneInput.value = openFileSelector();
				}
				overlayDiv.appendChild(button);
			}

			var auto = null;
			if(allowAutoButton == true){
				auto = document.createElement('span');
				auto.className = 'toggelableText off ' + groupClass;
				auto.style.marginLeft = '5px';
				auto.innerHTML = 'Auto';
				overlayDiv.appendChild(auto);
				auto.onclick = function(){
					var jq = $(auto);
					if(jq.hasClass('off')){
						yPlaneInput.disabled = true;
						if(button != null){
							button.disabled = true;
						}
						jq.removeClass('off').addClass('on');
					}
					else{
						yPlaneInput.disabled = false;
						if(button != null){
							button.disabled = false;
						}
						jq.removeClass('on').addClass('off');
					}
				};
				overlayDiv.appendChild(auto);
			}
			
			if(extraMargin != null){
				var lastElement;
				if(auto != null){
					lastElement = auto;
				}
				else if(button != null){
					lastElement = button;
				}
				else{
					lastElement = yPlaneInput;
				}
				lastElement.style.marginRight = extraMargin;
			}
			
			var lineBreak = document.createElement("br");
			lineBreak.className = groupClass;
			overlayDiv.appendChild(lineBreak);
		
		
		
			function openFileSelector(){
				var selectedPath = '';
				$.ajax({
					url: "Generic?selectFileDialog",
					type: "POST",
					async: false,
					dataType: "text",
					success: function (path) {
						selectedPath = path;
					},
					error: function (jqxhr, statusText, errorThrown) {
						selectedPath = '';
					}
				});
				return selectedPath;
			}
			
		}
				
}


function loadKDFRunReportFromFile(reportItem, source){
	//read homePage data:	
	var criticalError = false;
	var runData = null;
	$.ajax({
        url: source,
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			runData = data;
        },
        error: function(jqxhr, statusText, errorThrown){
			criticalError = true;
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"overview data\":<br/> \"" + errorThrown + "\".");
        }
    });
	
	if(criticalError == true){
		return;
	}
	loadKDFRunReport(reportItem, runData);
	
}

function loadKDFRunReport(reportItem, runMenuData){
	if(!runMenuData){
		alert('Error, run results are missing.');
		return;
	}
	
	//read homePage data:	
	var criticalError = false;
	var configurationsArray = null;
	$.ajax({
        url: runMenuData.configurations,
        type: "POST",
        dataType: "json",
		async: false,
        success: function (data) {
			configurationsArray = data.data;
        },
        error: function(jqxhr, statusText, errorThrown){
			criticalError = true;
			appendCriticalErrorMessage(reportItem , "Error: unable to retrieve \"executed configurations\":<br/> \"" + errorThrown + "\".");
        }
    });
	
	if(criticalError == true){
		return;
	}

	if(configurationsArray.length == 0){
		appendCriticalErrorMessage(reportItem , "there're no executed configurations to show.");
		return;
	}
	else if(configurationsArray.length == 1){
		createSingleConfigurationRunReport(reportItem, runMenuData, configurationsArray[0]);
		return;
	}
	else{
		createMultipleConfigurationsRunReport(reportItem, runMenuData, configurationsArray);
		return;
	}
	
	
	function createSingleConfigurationRunReport(parent, runData, configurationData){
		var layoutWrapper =  document.createElement('table');
		layoutWrapper.style.width = '100%';
		parent.appendChild(layoutWrapper);
		var tr = layoutWrapper.insertRow();
		tr.insertCell().style.width = '3%';
		var layoutWrapperCell = tr.insertCell();
		tr.insertCell().style.width = '3%';
		
		//table layout:
		var layout = document.createElement('table');
		layout.className = 'hostProfilingOverviewLayout';
		layoutWrapperCell.appendChild(layout);
		var tr;
		
		//---------------------- Overview ----------------------//
		tr = layout.insertRow();
		
		var container = tr.insertCell();
		container.className = 'sectionContainer';
		var validationResult = '';
		if(configurationData.validationStatus == true){
			validationResult = '<span style="color: green; font-weight: 700;">SUCCESS</span>';
		}
		else if(configurationData.validationStatus == false){
			validationResult = '<span style="color: red; font-weight: 700;">FAILED</span>';
		}
		else{
			validationResult = '<span style="color: black; font-weight: 700;">not set</span>';
		}
		
		var configurationName = 'G(' + configurationData.Gx + ',' + configurationData.Gy + ',' + configurationData.Gz + ') ' +
										  'L(' + configurationData.Lx + ',' + configurationData.Ly + ',' + configurationData.Lz + ')';
										  
		var info = [
							['Kernel:', runData.overview.kernelName + ' - ' + 
							'<span style="color: gray;">' + configurationName + '</span>', false]
					  ];

		if(runData.overview.iteration != null && runData.overview.iteration > 1){
			info.push(['Execution Median:', configurationData.executionMedian + ' (ms)', false]);
			info.push(['Iterations:', runData.overview.iteration, false]);
		}
		else{
			info.push(['Execution:', configurationData.executionMedian + ' (ms)', false]);
		}
		info.push(['Validation:', validationResult, false]);
					  
		var section = createSection('Execution Overview:', null, info, '100px');
		section.style.minHeight = '130px';
		container.appendChild(section);
		
		//---------------------- output validation results ----------------------//
		//get list of variables with validation reference:
		var validation = [];
		if(configurationData.variables != null){
			for(var i=0; i<configurationData.variables.length; i++){
				var variable = configurationData.variables[i];
				if(variable.refPath != null){
					validation.push(variable);
				}
			}
		}
		
				if(validation.length > 0){
			tr = layout.insertRow();
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var info = [];
			
			for(var i=0; i<validation.length; i++){
				var outVar = validation[i];
				var spanHTML;
				var dataAttributes = 'onclick="TriggerVariableViewerFromSpanData(this);" ' +
											 'data-variabletype = "' + outVar.dataType + '" ' +
														  'data-name = "' + outVar.name + '" ' +
														  'data-path = "' + outVar.path + '" ' +
														  'data-refpath = "' + outVar.refPath + '" ' +
														  'data-width = "' + outVar.width + '" ' +
														  'data-height = "' + outVar.height + '" ' +
														  'data-channelorder = "' + outVar.channelOrder + '" ' +
														  'data-channeltype = "' + outVar.channelType + '" ' +
														  'data-rowpitch = "' + outVar.rowPitch + '" ';
				var additionalClasses = ' variableLauncherSpan';
				if(outVar.dataType == 'image2d_t'){
					additionalClasses += ' allowYUVContextMenu';
				}
				var key = '<span class="linkableTextIntelBlue' + additionalClasses + '" ' + dataAttributes + '>' + outVar.name + '</span>' + 
							  '<span style="color: gray; margin-left: 5px;">' + '(' + outVar.dataType + ')</span>';
							  
				if(outVar.success == true){
					spanHTML = '<span style="margin-left: 30px; color: green; font-weight: 700; cursor: pointer;" ' + dataAttributes +'>Passed.</span>';
				}
				else{
					spanHTML = '<span style="margin-left: 30px; color: red; font-weight: 700; cursor: pointer;" ' + dataAttributes +'>Validation failed.</span>';
									 //'<span style="color: gray;"> (' + outVar.matchPrecentage + ' mismatch)</span>';
				}
				
				info.push([' ', key + spanHTML, false]);
			}
			
			var section = createSection('Output Validation:', null, info);
			section.style.minHeight = '130px';
			container.appendChild(section);
		}
		
		
		
		//---------------------- Variables viewing ----------------------//
		if(configurationData.variables && configurationData.variables.length > 0){
			tr = layout.insertRow();
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var info = [];
			var variables = configurationData.variables;
			
			for(var i=0; i<variables.length; i++){
				var v = variables[i];
				var additionalClasses = ' variableLauncherSpan';
				if(v.dataType == 'image2d_t'){
					additionalClasses += ' allowYUVContextMenu';
				}
				var spanHTML = '<span>#' + i + ':</span>' +
									   '<span class="linkableTextIntelBlue' + additionalClasses + '" style="margin-left: 20px;" onclick="TriggerVariableViewerFromSpanData(this);" ' +
														  'data-variabletype = "' + v.dataType + '" ' +
														  'data-name = "' + v.name + '" ' +
														  'data-path = "' + v.path + '" ' +
														  'data-width = "' + v.width + '" ' +
														  'data-height = "' + v.height + '" ' +
														  'data-channelorder = "' + v.channelOrder + '" ' +
														  'data-channeltype = "' + v.channelType + '" ' +
														  'data-rowpitch = "' + v.rowPitch + '" ' +
									   '>' + v.name + '</span>' + '<span style="color: gray; margin-left: 5px;">' + '(' + v.dataType + ')</span>';
				info.push(['', spanHTML, false]);
			}
			
			var section = createSection('Kernel Variables:', null, info);
			section.style.minHeight = '130px';
			container.appendChild(section);
		}
		
		
	}

	
	
	function createMultipleConfigurationsRunReport(parent, runData, configurationsArray){
		var layoutWrapper =  document.createElement('table');
		layoutWrapper.style.width = '100%';
		parent.appendChild(layoutWrapper);
		var tr = layoutWrapper.insertRow();
		tr.insertCell().style.width = '3%';
		var layoutWrapperCell = tr.insertCell();
		tr.insertCell().style.width = '3%';
		
		//table layout:
		var layout = document.createElement('table');
		layout.className = 'hostProfilingOverviewLayout';
		layoutWrapperCell.appendChild(layout);
		var tr;
		
		//---------------------- Overview ----------------------//
		tr = layout.insertRow();
		
		//application info (CodeAnalyzer mode):
		if(runData.overview != null){
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			
			var info = [
								['Kernel Name:', runData.overview.kernelName, false],
								['Configurations count:', runData.overview.confCount, false],
								['Iterations Per Configuration:', runData.overview.iteration, false],
								['Best Configuration:', runData.overview.bestConf.name, false],
								['Best Configuration execution median:', runData.overview.bestConf.median + ' (ms)', false]
								//'Validation:', validationResult, false]
							];
			var section = createSection('Execution Overview:', null, info, '250px');
			section.style.minHeight = '130px';
			container.appendChild(section);
		}
		
		//---------------------- Variables viewing ----------------------//
		if(configurationsArray && configurationsArray.length > 0){
			tr = layout.insertRow();
			var container = tr.insertCell();
			container.className = 'sectionContainer';
			var section = createSection('Configurations:', null, null);
			section.style.minHeight = '130px';
			container.appendChild(section);
			//section.innerHTML += '</br></br></br>';
			createMultipleRunExecutionTable(section, runData, configurationsArray);
		}
	}
	
//---------------------------------------------------------------------------------------------------
	function createSection(title, tipsCount, info, keyColumnWidth, sectionClass){
		
		var section = document.createElement('div');
		section.className = 'hostProfilingOverviewSection';
		if(sectionClass != null && sectionClass != ''){
			section.className += ' ' + sectionClass;
		}
		
		var titleSpan = document.createElement('span');
		titleSpan.className = 'sectionTitle';
		titleSpan.innerHTML = title;
		section.appendChild(titleSpan);
		
		if(tipsCount > 0){//todo: parse to int first.
			var tipsSpan =document.createElement('span');
			tipsSpan.className = 'sectionTipsCount';
			tipsSpan.innerHTML = tipsCount + ' tips';
			section.appendChild(tipsSpan);
		}
		
		if(info !=null && info.length > 0){
			var infoTable = document.createElement('table');
			infoTable.className = 'sectionInfoTable';
			for(var i = 0; i < info.length; i++)(function(i){
				var tr = infoTable.insertRow();
				
				var td = tr.insertCell();
				td.className = 'sectionInfoKey';
				if(info[i][0] != null && info[i][0] != ''){
					td.innerHTML = '- ' + info[i][0];
				}
				if(keyColumnWidth != null){
					td.style.width = keyColumnWidth;
				}
				
				td = tr.insertCell();
				td.className = 'sectionInfoValue';
				td.innerHTML = info[i][1];
				
				//can copy?
				if(info[i][2] == true){
					td.title = 'click to copy to clipboard';
					td.className = 'copiable';
					td.onclick = function (){ copyToClipboard(info[i][1]); };
				}
			})(i);
			
			section.appendChild(infoTable);
		}
		
		return section;
	}

//---------------------------------------------------------------------------------------------------
	function createMultipleRunExecutionTable(parent, runData, configurationsArray){
		var columns = [
			{
				"title": "<span class='hwCountersHeaders'>Gx</span>",
				"data": "Gx"
			},
			{
				"title": "<span class='hwCountersHeaders'>Gy</span>",
				"data": "Gy"
			},
			{
				"title": "<span class='hwCountersHeaders'>Gz</span>",
				"data": "Gz"
			},
			{
				"title": "<span class='hwCountersHeaders'>Lx</span>",
				"data": "Lx"
			},
			{
				"title": "<span class='hwCountersHeaders'>Ly</span>",
				"data": "Ly"
			},
			{
				"title": "<span class='hwCountersHeaders'>Lz</span>",
				"data": "Lz"
			},
			{
				"title": "<span class='hwCountersHeaders'>Execution Median (ms)</span>",
				"data": "executionMedian"
			},
			{
				"title": "<span class='hwCountersHeaders'>Validation Status</span>",
				"data": "validationStatus",
				"render": function (data, type, row) {
							 var text, color;
							 if(data == true){
								 text = 'Passed';
								 color = 'green';
							 }
							 else if(data == false){
								 text = 'Failed';
								 color = 'red';
							 }
							 else{
								 text = 'not set';
								 color = 'black';
							 }
							 var spanHTML = '<span style="color: ' + color + ';" >' + text + '</span>';
							 return spanHTML;
						}
			},
			{
				"title": "<span class='hwCountersHeaders'>Details</span>",
				//"data": "name",
				"render": function (data, type, row) {				
							 var spanHTML = '<span class="variableLauncherSpan" style="color: #0071C5; text-decoration: underline; cursor: pointer;" ' +
															 'title="view variables details">' + 'show configuration details' +
													'</span>';
							 return spanHTML;
						}
			},
		];
		
		var tableContainer = document.createElement('div');
		tableContainer.style.marginTop = '15px';
		tableContainer.style.marginLeft = '10px';
		tableContainer.style.marginRight = '10px';
		parent.appendChild(tableContainer);
		
		var table = document.createElement('table');
		table.className = 'display'; //apiTraceTable
		$(tableContainer).append(table);
		
		detailsTableObj = $(table).DataTable({

			"aaData": configurationsArray,
			"columns": columns,
			"bSortClasses": false,
			"scrollY": "100px",
			"bDeferRender": true,
			"processing": true,
			"serverSide": false,
			"bFilter": true,
			"bLengthChange": false,
			"bInfo": false,
			//"scrollY": "280px",
			//"sScrollX": "100%",
			"bPaginate": false,
			//"bInfo": false,
		});
		
		
		$($(table).find('tbody')).on('click', 'span.variableLauncherSpan', function () {
			var popupDiv = openOverlayLayout('100%', '100%', true, null, null, null, true);
			popupDiv.style.textAlign = 'left';
			
			var row = detailsTableObj.row($(this).closest('tr'));
			var rowData = row.data();
			createSingleConfigurationRunReport(popupDiv, runData, rowData);
		});
		
		var dataTableObj2 = $(table).dataTable();
		$(window).resize( function () {
			dataTableObj2.fnAdjustColumnSizing();
		});
				
		//resize event:
		window.addEventListener('resize', function (event) {
			resizeTableToFitScreen();
		});
		
		function resizeTableToFitScreen(){
			var scrollBodies = $(parent).find('.dataTables_scrollBody');
			if (scrollBodies != null && scrollBodies.length > 0) {
				var topOffset = $(table).position().top;
				$(scrollBodies[0]).css({ 'height': 'calc(100% - ' + topOffset + 'px - 10px)' });
			}
		}
		
		resizeTableToFitScreen();

		
				
	}
	
}

function TriggerVariableViewerFromSpanData(element){
	
	if(mode != 'localHost') {
		showUnavailableViewersOverlay();
		return;
	}
	
	var data = $(element).data();
	//images:
	if(data.variabletype == 'image2d_t'){
		var onCloseFunction = function(){
			imageViewer.dispose();
		}
		var overlayDiv = openOverlayLayout('100%','100%', true, onCloseFunction, null, null, true);
		//overlayDiv.style.minHeight = '650px';
		//overlayDiv.style.minWidth = '1000px';
		
		var containerDiv = document.createElement('div');
		containerDiv.style.position = 'relative';
		containerDiv.style.width = '100%';
		containerDiv.style.height = '100%';
		overlayDiv.appendChild(containerDiv);
		
		//add selected image to view:
		var imageViewer = new ImageViewer(containerDiv);
		var requestStr = 'ImageViewer?add=' + data.name + '&' + data.path + '&' + data.width + '&' + data.height + '&' + 
								data.channelorder + '&' + data.channeltype + '&' + data.rowpitch;
		imageViewer.AddImage(requestStr, data.name);
		
		if(data.refpath != null && data.refpath != ''){
			var cmpRequestStr = 'ImageViewer?add=' + data.name + ' reference' + '&' + data.refpath + '&' + data.width + '&' + data.height + '&' + 
										  data.channelorder + '&' + data.channeltype + '&' + data.rowpitch;
			imageViewer.AddImage(cmpRequestStr, data.name + ' reference');
			
			//trigger next diff:
			//imageViewer.getNextDiff('1');
		}
		
		//add the rest of the images as comparables:
		var dataSpans = $($(element.parentNode).closest('.sectionInfoTable')).find('.linkableTextIntelBlue');
		for(var i=0; i<dataSpans.length; i++){
			var comparableData = $(dataSpans[i]).data();
			if(comparableData.variabletype != 'image2d_t' || comparableData.name == data.name){
				continue;
			}
			imageViewer.addComparableImage(comparableData.path, comparableData.name, comparableData.width, 
							comparableData.height, comparableData.channelorder, comparableData.channeltype, comparableData.rowpitch);
		}
	}
	//buffers:
	else if(data.variabletype.toLowerCase().indexOf("image") < 0){//not Image3d_t
		var onCloseFunction = function(){
			bufferViewer.dispose();
		}
		var overlayDiv = openOverlayLayout('100%','100%', true, onCloseFunction, null, null, true);
		//overlayDiv.style.minHeight = '650px';
		//overlayDiv.style.minWidth = '1000px';
		var containerDiv = document.createElement('div');
		containerDiv.style.position = 'relative';
		containerDiv.style.width = '100%';
		containerDiv.style.height = '100%';
		overlayDiv.appendChild(containerDiv);
		//add selected buffer to view:
		var bufferViewer = new BufferViewer(containerDiv);
		bufferViewer.AddBuffer(data.name, data.path, data.variabletype);
		
		if(data.refpath != null && data.refpath != ''){
			
			bufferViewer.AddBuffer(data.name + ' reference', data.refpath, data.variabletype);			
			//trigger next diff:
			//bufferViewer.getNextDiff('1');
		}
		
		//add the rest of the buffers as comparables:
		var dataSpans = $($(element.parentNode).closest('.sectionInfoTable')).find('.linkableTextIntelBlue');
		for(var i=0; i<dataSpans.length; i++){
			var comparableData = $(dataSpans[i]).data();
			if(comparableData.variabletype == 'image2d_t' || comparableData.name == data.name){
				continue;
			}
			bufferViewer.addComparableBuffer(comparableData.path, comparableData.name, comparableData.variabletype);
		}
	}
	else{
		alert('requested image type is not supported.');
	}

}


function showUnavailableViewersOverlay(){
	// create a warning box:
	var overlayDiv = openOverlayLayout('400px','300px', true, null, null, true, null);
    overlayDiv.style.background = '#fcfcfc';
    var title = document.createElement('h2');
    title.innerHTML = 'Viewers unavailable';
    $(overlayDiv).append(title);

    var message = document.createElement('div');
    message.style.textAlign = 'left';
    message.style.marginLeft = '10px';
    message.style.marginRight = '10px';
	
	
	var mainHTML = window.location.pathname;
	//to fix the "%20" added by the browser:
	mainHTML = mainHTML.replace(/%20/gi, " ");
	
	if(mainHTML.startsWith('file:///')){
		mainHTML = mainHTML.replace("file:///", "");
	}
	
	if (window.navigator.userAgent.indexOf("Linux")==-1){//for windows
		while(mainHTML.startsWith('/')){
			mainHTML = mainHTML.substring(1);
		}
	}
	
	var span1 = document.createElement('span');
    span1.innerHTML = "To be able to use the images and buffers viewers " +
								  "please run the following command: <br/>";
								  
	message.appendChild(span1);
	
	var section = document.createElement('div');
	section.className = 'hostProfilingOverviewSection sectionInfoValue';
	section.style.padding = '20px 20px';
	section.style.fontSize = '12px';
	section.title = 'click to copy to clipboard';
	section.className += ' copiable';
	section.style.minHeight = '0px';
	section.style.height = '';
	section.innerHTML = "CodeBuilder --view \"" +mainHTML +"\"";
	section.onclick = function (){ copyToClipboard(section.innerHTML); };
	message.appendChild(section);
	
    $(overlayDiv).append(message);	
}



function LoadVariablesViewer(reportItem, variablesInputAsText){
	
	//parse input:
	var variablesArray;
	try{
		variablesArray = JSON.parse(variablesInputAsText);
	}
	catch(ex){
		appendCriticalErrorMessage(reportItem , "Error: Variables info badly formatted: " + ex);
		return;
	}
	
	if(variablesArray.length == 0){
		appendCriticalErrorMessage(reportItem , "there are no variables to show.");
		return;
	}
	
	var mainVariable = variablesArray[0];
		
	if(mainVariable.dataType == 'image2d_t'){
		//add selected image to view:
		var imageViewer = new ImageViewer(reportItem);
		var requestStr = 'ImageViewer?add=' + mainVariable.name + '&' + mainVariable.path + '&' + mainVariable.width + '&' + mainVariable.height + '&' + 
								mainVariable.channelOrder + '&' + mainVariable.channelType + '&' + mainVariable.rowPitch;
		imageViewer.AddImage(requestStr, mainVariable.name);
		
	
		//add the rest of the images as comparables:
		for(var i=1; i<variablesArray.length; i++){
			var comparableData = variablesArray[i];
			if(comparableData.dataType != 'image2d_t' || comparableData.name == mainVariable.name){
				continue;
			}
			imageViewer.addComparableImage(comparableData.path, comparableData.name, comparableData.width, 
							comparableData.height, comparableData.channelOrder, comparableData.channelType, comparableData.rowPitch);
		}
	}
	//buffers:
	else if(mainVariable.dataType.toLowerCase().indexOf("image") < 0){//not Image3d_t
		//add selected buffer to view:
		var bufferViewer = new BufferViewer(reportItem);
		bufferViewer.AddBuffer(mainVariable.name, mainVariable.path, mainVariable.dataType);
		
		//add the rest of the buffers as comparables:
		for(var i=1; i<variablesArray.length; i++){
			var comparableData = variablesArray[i];
			if(comparableData.dataType == 'image2d_t' || comparableData.name == mainVariable.name){
				continue;
			}
			bufferViewer.addComparableBuffer(comparableData.path, comparableData.name, comparableData.dataType);
		}
	}
	else{
		alert('requested image type is not supported.');
	}

	
}


