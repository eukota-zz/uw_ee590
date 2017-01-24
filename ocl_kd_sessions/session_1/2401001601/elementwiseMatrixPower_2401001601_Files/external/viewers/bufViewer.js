//BUFFER VIEWER:
//---------------
function BufferViewer(parent, IsfromImageViewer){
	var self = this;
	this.container = parent;
	parent.style.position = 'relative';
	
	//clear parent and create the basic controllers:
	parent.innerHTML = '';
	this.activePreviews = [];
	parent.style.background = '#eeeeee';
	parent.style.overflowX = 'auto';
	this.currentRotationDegree = 0;
	var activeXHR = null;
	var isDisposed = false;
	var isFunctionalityBlocked = false;
	
	//create footer controls:
	$(parent).append ($(
		'<div class="viewer-container">' +
		  '<div class="viewer-footer" style="height: 40px;">' +
			'<ul class="viewer-toolbar bufferViewer">' +
			  '<li class="viewer-icon-button viewer-move-up" title="previous page"></li>' +
			  '<li class="viewer-icon-button viewer-move-down" title="next page"></li>' +
			  '<li class="viewer-icon-button viewer-move-left" title="previous page"></li>' +
			  '<li class="viewer-icon-button viewer-move-right" title="next page"></li>' +
			  '<li class="viewer-icon-button viewer-move-top" title="buffer top"></li>' +
			  '<li class="viewer-icon-button viewer-move-bottom" title="buffer end"></li>' +
			  '<li class="viewer-icon-button viewer-reset" title="reset buffer view"></li>' +
			  '<li class="viewer-icon-button viewer-goToLine" title="go to line"></li>' +
			  '<li class="viewer-icon-button viewer-changeDataType" title="change data type"></li>' +
			  '<li class="viewer-icon-button viewer-reshapeBuffer" title="reshape buffer"></li>' +
			  '<li class="viewer-icon-button viewer-bufferToImage" title="view buffer as an image"></li>' +

			  '<li class="viewer-icon-button viewer-compare" title="Compare Menu" style="position: absolute; right: 20px;"></li>' +
			  
			  '<li class="viewer-icon-button viewer-diffControl-elements viewer-diffControl viewer-diffControl-left" data-direction="-1" title="prev diff" style="position: absolute; left: 20px;"></li>' +
			  '<li class="viewer-icon-button viewer-diffControl-elements viewer-diffControl viewer-diffControl-right" data-direction="1" title="next diff" style="position: absolute; left: 45px;"></li>' +
			'</ul>' +
		  '</div>' +
		'</div>'
	  ));
	
	if(IsfromImageViewer == true){
		$(parent).find('.viewer-changeDataType').remove();
		$(parent).find('.viewer-bufferToImage').remove();
		$(parent).find('.viewer-reshapeBuffer').remove();
	}
	
	$(parent).find('.viewer-compare')[0].style.display = 'none';
	
	this.applyVerticalScroll = function(numberOfElement, noTimeOut){
		if(self.isFunctionalityBlocked == true) {return;}
		
		var scrollingFunc = function(numberOfElement, noTimeOut){
			var len = self.activePreviews.length;
			var redrawAll = false;
			for(var i=0; i<len; i++){
				var previewInstance = self.activePreviews[i];
				var oldRowOffset = previewInstance.rowsOffset;
				if(numberOfElement > 0){
					previewInstance.rowsOffset = Math.min(previewInstance.rowsOffset + numberOfElement, previewInstance.rowsCount - previewInstance.visibleRows);//todo: -1 ?
				}
				else{
					previewInstance.rowsOffset = Math.max(previewInstance.rowsOffset + numberOfElement, 0);
				}
				if(previewInstance.rowsOffset != oldRowOffset){
					redrawAll = true;
				}
			}
			
			if(redrawAll == true){
				self.rebuildBuffersDataTables();
			}
			
			if(noTimeOut != true){
				removeLoadingMessage(parent);
			}
		};
		
		//call scroll:
		if(noTimeOut == true){
			scrollingFunc(numberOfElement, noTimeOut);
			return;
		}
		appendLoadingMessage(parent);
		setTimeout(function(){ scrollingFunc(numberOfElement, noTimeOut); }, 1);
	}
	
	this.applyHorizontalScroll = function(numberOfElement, noTimeOut){
		
		var scrollingFunc = function(numberOfElement, noTimeOut){
			var len = self.activePreviews.length;
			var redrawAll = false;
			for(var i=0; i<len; i++){
				var previewInstance = self.activePreviews[i];
				var oldColumnOffset = previewInstance.columnsOffset;
				if(numberOfElement > 0){
					previewInstance.columnsOffset = Math.min(previewInstance.columnsOffset + numberOfElement, previewInstance.columnsCount - previewInstance.visibleColumns);//todo: -1 ?
				}
				else{
					previewInstance.columnsOffset = Math.max(previewInstance.columnsOffset + numberOfElement, 0);
				}
				if(previewInstance.columnsOffset != oldColumnOffset){
					redrawAll = true;
				}
			}
			
			if(redrawAll == true){
				self.rebuildBuffersDataTables();
			}
			
			if(noTimeOut != true){
				removeLoadingMessage(parent);
			}
		};
		
		//call scroll:
		if(noTimeOut == true){
			scrollingFunc(numberOfElement, noTimeOut);
			return;
		}
		appendLoadingMessage(parent);
		setTimeout(function(){ scrollingFunc(numberOfElement, noTimeOut); }, 1);
	}
	
	
	//register buttons functionalities:
	$(parent).find('.viewer-move-down').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		self.applyVerticalScroll(1);
	});
	
	$(parent).find('.viewer-move-up').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		self.applyVerticalScroll(-1);
	});
	
	$(parent).find('.viewer-move-right').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		self.applyHorizontalScroll(1);
	});
	
	$(parent).find('.viewer-move-left').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		self.applyHorizontalScroll(-1);
	});

	$(parent).find('.viewer-move-bottom').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		var rowsCount = self.activePreviews[0].rowsCount;
		self.applyVerticalScroll(rowsCount);
	});
	
	$(parent).find('.viewer-move-top').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		var rowsCount = self.activePreviews[0].rowsCount;
		self.applyVerticalScroll(-rowsCount);
	});
	
	$(parent).find('.viewer-reset').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		//update server and get original display info:
		$.ajax({
			url:  'BufferViewer?resetView',
			type: "POST",
			async: false,
			dataType: "json",
			success: function (data) {
				for(var i=0; i<self.activePreviews.length; i++){
					self.activePreviews[i].rowsCount = data.rowsCount;
					self.activePreviews[i].columnsCount = data.columnsCount;
					self.activePreviews[i].currentDataType = data.displayType;
					
					self.activePreviews[i].rowsOffset = 0;
					self.activePreviews[i].columnsOffset = 0;
				}
				
				//redraw all tables:
				self.rebuildBuffersDataTables();
			},
			error: function(jqxhr, statusText, errorThrown){
				alert('failed to reset viewer!');
			}
		});
		
	});
	
	$(parent).find('.viewer-reshapeBuffer').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		var overlayDiv = openOverlayLayout('300px','200px', true);
		//overlayDiv.style.paddingLeft = '10px';
		overlayDiv.style.textAlign = 'center';
		
		
		var title = document.createElement('div');
		overlayDiv.appendChild(title);
		title.innerHTML = 'Enter the new number of columns:';
		title.style.fontSize = '16px';
		title.style.paddingTop = '50px';
		title.style.paddingBottom = '10px';
		title.style.color = 'gray';
		
		var columnsInput = document.createElement('input');
		columnsInput.type = "text";
		columnsInput.className = "textInput";
		columnsInput.style.width = '200px';
		overlayDiv.appendChild(columnsInput);
		columnsInput.value = self.activePreviews[0].columnsCount;
		
		overlayDiv.appendChild(document.createElement("br"));
		overlayDiv.appendChild(document.createElement("br"));
		
		var reshapeButton = document.createElement('span');
		reshapeButton.className = 'intelLinkHoverColor';
		overlayDiv.appendChild(reshapeButton);
		reshapeButton.innerHTML = 'reshape buffer';
		reshapeButton.style.fontSize = '14px';
		
		overlayDiv.appendChild(document.createElement("br"));
		
		var errorSpan = document.createElement('span');
		overlayDiv.appendChild(errorSpan);
		errorSpan.innerHTML = '';
		errorSpan.style.fontSize = '14px';
		errorSpan.style.color = 'red';
		
		//on reshape:
		reshapeButton.onclick = function(){
			$.ajax({
				url:  'BufferViewer?reshape=' + columnsInput.value,
				type: "POST",
				async: false,
				dataType: "json",
				success: function (data) {
					for(var i=0; i<self.activePreviews.length; i++){
						self.activePreviews[i].rowsCount = data.rowsCount;
						self.activePreviews[i].columnsCount = data.columnsCount;
					}
					
					//redraw all tables:
					self.rebuildBuffersDataTables();
					
					//close dialog:
					$(overlayDiv).find('.overlayDivCloseButton').click();
					
				},
				error: function(jqxhr, statusText, errorThrown){
					errorSpan.innerHTML =  errorThrown;
				}
			});
		};
		
		//put focus on the input:
		columnsInput.focus();
		columnsInput.select();
		
		$(columnsInput).keypress(function (e) {
			if (e.which == 13) {
				reshapeButton.click();
			}
		});
		
	});

	$(parent).find('.viewer-goToLine').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		var overlayDiv = openOverlayLayout('300px','200px', true);
		//overlayDiv.style.paddingLeft = '10px';
		overlayDiv.style.textAlign = 'center';
		
		
		var title = document.createElement('div');
		overlayDiv.appendChild(title);
		title.innerHTML = 'Go to line:';
		title.style.fontSize = '16px';
		title.style.paddingTop = '50px';
		title.style.paddingBottom = '10px';
		title.style.color = 'gray';
		
		var columnsInput = document.createElement('input');
		columnsInput.type = "text";
		columnsInput.className = "textInput";
		columnsInput.style.width = '200px';
		overlayDiv.appendChild(columnsInput);
		columnsInput.value = self.activePreviews[0].columnsCount;
		
		overlayDiv.appendChild(document.createElement("br"));
		overlayDiv.appendChild(document.createElement("br"));
		
		var reshapeButton = document.createElement('span');
		reshapeButton.className = 'intelLinkHoverColor';
		overlayDiv.appendChild(reshapeButton);
		reshapeButton.innerHTML = 'ok';
		reshapeButton.style.fontSize = '14px';
		
		overlayDiv.appendChild(document.createElement("br"));
		
		var errorSpan = document.createElement('span');
		overlayDiv.appendChild(errorSpan);
		errorSpan.innerHTML = '';
		errorSpan.style.fontSize = '14px';
		errorSpan.style.color = 'red';
		
		//on goToLine:
		reshapeButton.onclick = function(){
			self.goToLine(columnsInput.value);
			
			//close dialog:
			$(overlayDiv).find('.overlayDivCloseButton').click();
		};
		
		//put focus on the input:
		columnsInput.focus();
		columnsInput.select();
		
		$(columnsInput).keypress(function (e) {
			if (e.which == 13) {
				reshapeButton.click();
			}
		});
		
	});

	
	$(parent).find('.viewer-changeDataType').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		//get supported datatypes:
		var succeded = false;
		var supportedTypes = [];
		$.ajax({
			url:  'BufferViewer?getSupportedDataTypes',
			type: "POST",
			async: false,
			dataType: "json",
			success: function (data) {
				succeded = true;
				supportedTypes = data;
			},
			error: function(jqxhr, statusText, errorThrown){
				alert('Failed to get supported datatypes:<br/>"'  + errorThrown + '".');
			}
		});
		
		if(succeded != true){
			return;
		}
		
		var overlayDiv = openOverlayLayout('600px','400px', true);
		overlayDiv.style.paddingLeft = '10px';
		var title = document.createElement('div');
		
		title.innerHTML = '- Choose a new DataType:';
		title.style.textAlign = 'left';
		title.style.color = 'gray';
		title.style.marginTop = '20px';
		title.style.marginLeft = '10px';
		overlayDiv.appendChild(title);
		
		var seperator = CreateSeperator('80%', null, '0px');
		seperator.style.marginLeft = '2px';
		overlayDiv.appendChild(seperator);
		
		var tableContent = '';
		for(var i=0; i<supportedTypes.length; i++){
			var dataType = supportedTypes[i];
			var additionalClass = '';
			if(self.activePreviews[0].currentDataType.replace("*", "") == dataType){
				additionalClass = ' comparableImageTitle-selected';
			}
			tableContent += '<tr><td class="comparableImageTitle' + additionalClass + '">' +
												dataType + 
								   '</td></tr>';
		}
		var tableContainer = document.createElement('div');
		overlayDiv.appendChild(tableContainer);
		tableContainer.innerHTML = '<table class="newAnalysisInputTable" style="position: relative; width: 100%; margin-left: 0px;">' + 
											  tableContent + '</table>';
		
		$(tableContainer).find('.comparableImageTitle').click(function(){
			//get datatype text:
			var selectedDataType = this.innerHTML;
			
			//close dialog:
			$(overlayDiv).find('.overlayDivCloseButton').click();
			
			//call the changeType method:
			appendLoadingMessage(parent);
			setTimeout(function(){
				self.ChangeDataType(selectedDataType);
				removeLoadingMessage(parent);
			}, 1);
		});
	});

	$(parent).find('.viewer-bufferToImage').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		
		//get supported channelTypes and channelOrders:
		var succeded = false;
		var supportedChannelTypes = [];
		var supportedChannelOrders = [];
		$.ajax({
			url:  'BufferViewer?getSupportedImagesTypes',
			type: "POST",
			async: false,
			dataType: "json",
			success: function (data) {
				succeded = true;
				supportedChannelTypes = data.channelTypes;
				supportedChannelOrders = data.channelOrders;
			},
			error: function(jqxhr, statusText, errorThrown){
				alert('Failed to get supported images types:<br/>"'  + errorThrown + '".');
			}
		});
		
		if(succeded != true){
			return;
		}
		
		
		var overlayDiv = openOverlayLayout('400px','300px', true);
		//overlayDiv.style.paddingLeft = '10px';
		overlayDiv.style.textAlign = 'center';

		var title = document.createElement('div');
		overlayDiv.appendChild(title);
		title.innerHTML = 'Enter the image info:';
		title.style.fontSize = '16px';
		title.style.paddingTop = '50px';
		title.style.paddingBottom = '10px';
		title.style.color = 'gray';
		
		//image width:
		var span = document.createElement('span');
		overlayDiv.appendChild(span);
		span.className = 'bufferViewerSpanInputName';
		span.innerHTML = '- Image width:';
		
		var imageWidthInput = document.createElement('input');
		imageWidthInput.type = "text";
		imageWidthInput.className = "textInput";
		imageWidthInput.style.width = '200px';
		imageWidthInput.style.marginLeft = '19px';
		overlayDiv.appendChild(imageWidthInput);
		
		overlayDiv.appendChild(document.createElement("br"));
		
		//image height:
		var span = document.createElement('span');
		overlayDiv.appendChild(span);
		span.className = 'bufferViewerSpanInputName';
		span.innerHTML = '- Image height:';
		
		var imageheightInput = document.createElement('input');
		imageheightInput.type = "text";
		imageheightInput.className = "textInput";
		imageheightInput.style.width = '200px';
		imageheightInput.style.marginLeft = '16px';
		overlayDiv.appendChild(imageheightInput);
		
		overlayDiv.appendChild(document.createElement("br"));
		
		//channel order:
		var span = document.createElement('span');
		overlayDiv.appendChild(span);
		span.className = 'bufferViewerSpanInputName';
		span.innerHTML = '- Channel order:';
		
		var channelOrderInput = document.createElement('select');
		//channelOrderInput.type = "select";
		channelOrderInput.className = "textInput";
		channelOrderInput.style.width = '200px';
		channelOrderInput.style.marginLeft = '10px';
		overlayDiv.appendChild(channelOrderInput);
		for(i = 0; i<supportedChannelOrders.length; i++) { 
			var opt = document.createElement('option');
			opt.value = supportedChannelOrders[i];
			opt.innerHTML = supportedChannelOrders[i];
			channelOrderInput.appendChild(opt);
		}
		
		overlayDiv.appendChild(document.createElement("br"));
		
		//channel type:
		var span = document.createElement('span');
		overlayDiv.appendChild(span);
		span.className = 'bufferViewerSpanInputName';
		span.innerHTML = '- Channel type:';
		
		var channelTypeInput = document.createElement('select');
		channelTypeInput.type = "text";
		channelTypeInput.className = "textInput";
		channelTypeInput.style.width = '200px';
		channelTypeInput.style.marginLeft = '15px';
		overlayDiv.appendChild(channelTypeInput);
		for(i = 0; i<supportedChannelTypes.length; i++) { 
			var opt = document.createElement('option');
			opt.value = supportedChannelTypes[i];
			opt.innerHTML = supportedChannelTypes[i];
			channelTypeInput.appendChild(opt);
		}
		
		overlayDiv.appendChild(document.createElement("br"));
		
		//row pitch:
		var span = document.createElement('span');
		overlayDiv.appendChild(span);
		span.className = 'bufferViewerSpanInputName';
		span.innerHTML = '- Row pitch:';
		
		var rowPitchInput = document.createElement('input');
		rowPitchInput.type = "text";
		rowPitchInput.placeholder = "optional";
		rowPitchInput.className = "textInput";
		rowPitchInput.style.width = '200px';
		rowPitchInput.style.marginLeft = '32px';
		overlayDiv.appendChild(rowPitchInput);
		
		overlayDiv.appendChild(document.createElement("br"));
		overlayDiv.appendChild(document.createElement("br"));
		
		var createImageButton = document.createElement('span');
		createImageButton.className = 'intelLinkHoverColor';
		overlayDiv.appendChild(createImageButton);
		createImageButton.innerHTML = 'create image';
		createImageButton.style.fontSize = '14px';
		
		overlayDiv.appendChild(document.createElement("br"));
		
		var errorSpan = document.createElement('span');
		overlayDiv.appendChild(errorSpan);
		errorSpan.innerHTML = '';
		errorSpan.style.fontSize = '14px';
		errorSpan.style.color = 'red';
		
		//put focus on the input:
		imageWidthInput.focus();
		imageWidthInput.select();
		
		//register "enter" key press on all inputs:
		$(imageWidthInput).keypress(function (e) { if (e.which == 13) { createImageButton.click(); }});
		$(imageheightInput).keypress(function (e) { if (e.which == 13) { createImageButton.click(); }});
		$(channelOrderInput).keypress(function (e) { if (e.which == 13) { createImageButton.click(); }});
		$(channelTypeInput).keypress(function (e) { if (e.which == 13) { createImageButton.click(); }});
		$(rowPitchInput).keypress(function (e) { if (e.which == 13) { createImageButton.click(); }});
		
		//on reshape:
		createImageButton.onclick = function(){
			//validate inputs and get imageDescriptor ajax:
			var imageDescriptor;
			var succeded = false;
			$.ajax({
				url:  'BufferViewer?validateBufferToImageInput=' + imageWidthInput.value + '&' +
																					imageheightInput.value + '&' +
																					channelOrderInput.value + '&' +
																					channelTypeInput.value + '&' +
																					rowPitchInput.value,
				type: "POST",
				async: false,
				dataType: "json",
				success: function (data) {
					succeded = true;
					imageDescriptor = data;
				},
				error: function(jqxhr, statusText, errorThrown){
					errorSpan.innerHTML =  errorThrown;
				}
			});
			
			if(succeded != true){
				return;
			}
			
			//imageDescriptor:
			var imageViewer;
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
			var imageViewer = new ImageViewer(containerDiv, true);
			
			for(var i=0; i<self.activePreviews.length; i++){
				var bufferSrc = self.activePreviews[i].bufferSrc;
				var title = self.activePreviews[i].title;
				var requestStr = 'ImageViewer?add=' + title + '&' + bufferSrc + '&' + 
										imageDescriptor.width + '&' + imageDescriptor.height + '&' + imageDescriptor.channelOrder + '&' + 
										imageDescriptor.datatype + '&' + imageDescriptor.rowpitch;
				imageViewer.AddImage(requestStr, title);
			}
					
			
		};
		
	});

	
	
	//create diff-info container:
	this.diffInfoSpan = document.createElement('span');
	this.diffInfoSpan.className = 'diffInfoSpan comparableImageTitle viewer-diffControl-elements';
	this.diffInfoSpan.onclick = function(){
		alert(this.title);
	};
	parent.appendChild(this.diffInfoSpan);
	
	//previews wrapper:
	var previewsTable = document.createElement('table');
	parent.appendChild(previewsTable);
	previewsTable.style.width = '100%';
	previewsTable.style.overflow = 'visible';
	previewsTable.style.paddingTop = '30px';
	this.previewsRow = previewsTable.insertRow();
	
	//comparables list:
	this.comparablesList = [];
	
	$(parent).find('.viewer-compare').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		
		var overlayDiv = openOverlayLayout('600px','400px', true);
		overlayDiv.style.paddingLeft = '10px';
		var title = document.createElement('div');
		
		title.innerHTML = '- Choose buffers to compare to:';
		title.style.textAlign = 'left';
		title.style.color = 'gray';
		title.style.marginTop = '20px';
		title.style.marginLeft = '10px';
		overlayDiv.appendChild(title);
		
		var seperator = CreateSeperator('80%', null, '0px');
		seperator.style.marginLeft = '2px';
		overlayDiv.appendChild(seperator);
		
		var tableContent = '';
		for(var i=0; i<self.comparablesList.length; i++){
			var comparableBuffer = self.comparablesList[i];
			var additionalClass = '';
			if(self.IsBufferDisplayed(comparableBuffer.name)){
				additionalClass = ' comparableImageTitle-selected';
			}
			tableContent += '<tr><td class="comparableImageTitle' + additionalClass + '" ' +
										'data-name = "' + comparableBuffer.name + '" ' +
										'data-path = "' + comparableBuffer.path + '" ' +
										'data-datatype = "' + comparableBuffer.datatype + '" ' +
									'">' + 
									comparableBuffer.name + '</td><td>' +
									comparableBuffer.datatype + '</td></tr>';
		}
		var tableContainer = document.createElement('div');
		overlayDiv.appendChild(tableContainer);
		tableContainer.innerHTML = '<table class="newAnalysisInputTable" style="position: relative; width: 100%; margin-left: 0px;">' + 
											  '<thead><tr style="outline: thin solid;"><td>Variable Name</td><td>Data Type</td></tr></thead><tbody>' + tableContent + '</tbody></table>';
		
		$(tableContainer).find('.comparableImageTitle').click(function(){
			if($(this).hasClass('comparableImageTitle-selected')){
				$(this).removeClass('comparableImageTitle-selected');
				self.RemoveBuffer($(this).data().name);
			}
			else{
				$(this).addClass('comparableImageTitle-selected');
				var data = $(this).data();
				self.AddBuffer(data.name, data.path, data.datatype);
			}
		});
	});
	
	$(parent).find('.viewer-diffControl').click(function(){
		if(self.isFunctionalityBlocked == true) {return;}
		
		var data = $(this).data();
		self.getNextDiff(data.direction, true);
	});
	
	//register window size event:
	this.onWindowResize =  function(){
		var len = self.activePreviews.length;
		for(var i=0; i<len; i++){
			self.activePreviews[i].clearTableBody();
		}
	
		var newHeight = $(self.container).height() - 80;
		var DTwidth = ($(document.body).width() / $(self.previewsRow).find('.bufferContainerTD').length);
		$(self.previewsRow).find('.bufferContainerTD').css({"height": newHeight + 'px'});
		//console.log('DTwidth= ' + DTwidth);

		for(var i=0; i<len; i++){
			var previewInstance = self.activePreviews[i];
			previewInstance.bufferViewContainer.style.width =  (DTwidth - 10) + 'px';
		}
		self.rebuildBuffersDataTables();
	}
	
	//hide "compare" controllers:
	$(this.container).find('.viewer-diffControl-elements').css({"visibility": 'hidden'});
	
	$(window).resize(this.onWindowResize);
}

BufferViewer.prototype.AddBuffer = function (title, bufferSrc, dataType){

	//add new TD to previewsTable:
	var newTD = this.previewsRow.insertCell();
	newTD.style.border = '1px solid #ccc';
	//newTD.style.overflow = 'hidden';
	newTD.className = 'bufferContainerTD';
	var DTwidth = (100 / $(this.previewsRow).find('td').length) + '%';
	
	//create instance:
	var previewInstance = new BufferPreview(title, bufferSrc, dataType, newTD, this.syncFunction, this);
	
	//set marker if there's one:
	this.updateDiffMarkers();
	
	//add to active previews:
	this.activePreviews.push(previewInstance);
	
	//$(this.container).find('.bufferContainerTD').css({ width: DTwidth});
	
	//trigger resize to avoid buggy view:
	$(window).resize();
	
	if(this.activePreviews.length > 1){
		$(this.container).find('.viewer-diffControl-elements').css({"visibility": ''});
	}

	var self = this;

	//mouse wheel scroll events:
	 $(newTD).bind('DOMMouseScroll', function(e){
		 if(e.originalEvent.detail > 0) {
			 //scroll down
			 self.applyVerticalScroll(5);
		 }else {
			 //scroll up
			self.applyVerticalScroll(-5);
		 }

		 //prevent page fom scrolling
		 return false;
	 });

	 //IE, Opera, Safari
	 $(newTD).bind('mousewheel', function(e){
		 if(e.originalEvent.wheelDelta < 0) {
			 //scroll down
			 self.applyVerticalScroll(5);
		 }else {
			 //scroll up
			 self.applyVerticalScroll(-5);
		 }

		 //prevent page fom scrolling
		 return false;
	 });
	
}


BufferViewer.prototype.ChangeDataType = function (datatype){
	
	//update server:
	var succeded = false;
	var newDisplayInfo = [];
	$.ajax({
		url: 'BufferViewer?changeDataType=' + datatype,
		type: "POST",
		async: false,
		dataType: "json",
		success: function (data) {
			succeded = true;
			newDisplayInfo = data;
		},
		error: function(jqxhr, statusText, errorThrown){
			alert('Failed to change datatype to "' + datatype +'" :<br/>"'  + errorThrown + '".');
		}
	});
	
	if(succeded != true){
		return;
	}
	
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		previewInstance.rowsCount = newDisplayInfo.rowsCount;
		previewInstance.columnsCount = newDisplayInfo.columnsCount;
		previewInstance.currentDataType = datatype;
	}
	
	this.rebuildBuffersDataTables();
	
}

BufferViewer.prototype.goToLine = function (lineNumber){
	//todo: parse lineNumber, make sure it's an int.
	
	var fromRow = this.activePreviews[0].rowsOffset;
	var offset = lineNumber - fromRow;
	this.applyVerticalScroll(offset, true);
	//for(var i=0; i<this.activePreviews.length; i++){
	//	this.activePreviews[i].goToLine(lineNumber);
	//}
}

BufferViewer.prototype.RemoveBuffer = function (title){
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		if(previewInstance != null && previewInstance.title == title){
			$(previewInstance.parentTD).remove();
			this.activePreviews.splice(i,1); //remove index i.
			
			$.ajax({
				url:  'BufferViewer?remove=' + title,
				type: "POST",
				async: false,
				dataType: "text",
				success: function () {},
				error: function () {}
			});
			
			//trigger resize to avoid buggy view:
			$(window).resize();
			
			if(this.activePreviews.length <= 1){
				$(this.container).find('.viewer-diffControl-elements').css({"visibility": "hidden"});
			}
		}
	}
}

BufferViewer.prototype.dispose = function(){
	//kill active request:
	try{
		if(this.activeXHR != null){
			this.isDisposed = true;
			this.activeXHR.abort();
		}
	}
	catch(error){}
	
	//clear buffers:
	var len = this.activePreviews.length;
	for(var i=len-1; i>=0; i--){
		var previewInstance = this.activePreviews[i];
		this.RemoveBuffer(previewInstance.title);
	}
	$(window).off("resize", this.onWindowResize);	
}

BufferViewer.prototype.IsBufferDisplayed = function (title){
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		var previewInstance = this.activePreviews[i];
		if(previewInstance.title == title){
			return true;
		}
	}
	return false;
}

BufferViewer.prototype.addComparableBuffer = function (path, name, datatype){
	var newComparable = {
		"path": path,
		"name": name,
		"datatype": datatype
	};
	this.comparablesList.push(newComparable);
	$(this.container).find('.viewer-compare')[0].style.display = '';	
}

BufferViewer.prototype.rebuildBuffersDataTables = function(){
	var len = this.activePreviews.length;
	for(var i=0; i<len; i++){
		this.activePreviews[i].rebuildDataTable();
	}
	
	//if in compare mode, color the diffs:
	if(len <= 1){
		return;
	}
	
	var mainPreview = this.activePreviews[0];

	//loop on rows:
	for(var i=0; i<mainPreview.visibleRows; i++){
		var markRowAsDiffContainer = false;
		var rowClass = 'bufferRow' + (mainPreview.rowsOffset + i);
		
		//loop on cells:
		for(var n=0; n<mainPreview.visibleColumns; n++){
			var markCellAsDiffContainer = false;
			var cellClass = 'bufferElement' + ((mainPreview.rowsOffset + i) * mainPreview.columnsCount + (mainPreview.columnsOffset + n));
			
			//check if all previewed buffers values match for this class:
			var cellElements = $(this.container).find('.' + cellClass);
			var len = cellElements.length;
			if(len < 2){
				continue;
			}
			var cellValue = cellElements[0].innerHTML;
			for(var index = 1; index < cellElements.length; index++){
				if(cellValue != cellElements[index].innerHTML){
					markCellAsDiffContainer = true;
					markRowAsDiffContainer = true;
					break;
				}
			}
			
			//if there's a diff, color the fields in red:
			if(markCellAsDiffContainer == true){
				for (k = 0; k < cellElements.length; k++) {
					cellElements[k].style.color = '#ed1c24';
					cellElements[k].style.fontWeight = '700';
				}
			}
		}
		
		//does the row contains a diff?
		if(markRowAsDiffContainer == true){
			$.each($(this.container).find('.' + rowClass), function( index, trElement ) {
				trElement.style.background = '#eacaca';
			});
		}
		
	}
	
	this.updateDiffMarkers();

}

BufferViewer.prototype.getNextDiff = function (direction, withLoadingMessage){
	var self = this;
	if(withLoadingMessage == true){
		appendLoadingMessage(this.container);
		setTimeout(function(){
			self.getNextDiff(direction, false);
		}, 1);
		return;
	}
	
	//get data from server:
	var elementNumber = null;
	var tooltip = null;
	self.isFunctionalityBlocked = true;
	this.activeXHR = $.ajax({
		url:  'BufferViewer?getNextDiff=' + direction,
		type: "POST",
		async: true,
		dataType: "json",
		success: function (data) {
			self.isFunctionalityBlocked = false;
			if(self.isDisposed == true){
				removeLoadingMessage(self.container);
				return;
			}
			self.activeXHR = null;
			
			if(data.message != null && data.message != ''){
				alert(data.message);
				removeLoadingMessage(self.container);
				return;
			}
			elementNumber = data.elementNumber;
			tooltip = data.tooltip;
			
			if(elementNumber == null){
				removeLoadingMessage(self.container);
				return;
			}
			
			//get visible range info:
			var isInVisibleRange = false;
			var preview = self.activePreviews[0];
			var fromRow = preview.rowsOffset;
			var fromCol = preview.columnsOffset;
			var toRow = fromRow + preview.visibleRows ;
			var toCol = fromCol + preview.visibleColumns;
			var elementRow = Math.floor(elementNumber / preview.columnsCount);
			var elementCol = elementNumber % preview.columnsCount;
			
			//if diff marker is already in visible range, draw marker and return:
			if(elementRow >= fromRow && elementRow < toRow && elementCol >= fromCol && elementCol < toCol){
				self.setDiffMarker(elementNumber, tooltip);
				removeLoadingMessage(self.container);
				return;
			}
			
			//we're out of range! calculate the offsets we need to set:
			if(elementRow < fromRow || elementRow >= toRow){
				var numberOfElement = elementRow - Math.floor(preview.visibleRows / 2) - fromRow;
				self.applyVerticalScroll(numberOfElement, true);
			}
			
			if(elementCol < fromCol || elementCol >= toCol){
				var numberOfElement = elementCol - Math.floor(preview.visibleColumns / 2) - fromCol;
				self.applyHorizontalScroll(numberOfElement, true);
			}
			
			self.setDiffMarker(elementNumber, tooltip);
			
			removeLoadingMessage(self.container);
			
		},
		error: function(jqxhr, statusText, errorThrown){
			self.isFunctionalityBlocked = false;
			removeLoadingMessage(self.container);
			if(self.isDisposed == true){
				return;
			}
			self.activeXHR = null;
			
			alert('error while getting Next-Diff\n: "' + errorThrown + '".');
		}
	});
	
}

BufferViewer.prototype.setDiffMarker = function (elementNumber, tooltip){
	//clear previously highlighted cells:
	this.hideDiffMarker();
	
	//set new diff marker:
	this.diffMarkerElementNumber = elementNumber;
	var cellClass = 'bufferElement' + elementNumber;
	$(this.container).find('.' + cellClass).addClass('bufferHighlightedDiff');
	this.diffInfoSpan.innerHTML = 'diff at element #' + elementNumber;
	this.diffInfoSpan.title = tooltip;
}

BufferViewer.prototype.hideDiffMarker = function (){
	var cellClass = 'bufferElement' + this.diffMarkerElementNumber;
	$(this.container).find('.' + cellClass).removeClass('bufferHighlightedDiff');
	this.diffMarkerElementNumber = null;
	this.diffInfoSpan.innerHTML = '';
	this.diffInfoSpan.title = '';
}

BufferViewer.prototype.updateDiffMarkers = function(){
	if(this.diffMarkerElementNumber != null){
		this.setDiffMarker(this.diffMarkerElementNumber, this.diffInfoSpan.title);
	}
}

function BufferPreview(title, bufferSrc, dataType, parent, syncFunction, mainViewer){
	var self = this;
	this.bufferSrc = bufferSrc;
	this.title = title;
	this.parentTD = parent;
	this.syncFunction = syncFunction;
	this.originalDataType = dataType;
	this.currentDataType = dataType;
	
	//GUI consts:
	this.rowHeight = 19;
	this.columnWidth = 100;
	
	//preview details:
	this.columnsCount = 0;
	this.rowsCount = 0;
	
	this.visibleRows = 0;
	this.visibleColumns = 0;
	
	this.rowsOffset = 0;
	this.columnsOffset = 0;
	

	this.bufferViewContainer = document.createElement('div');
	this.bufferViewContainer.className = 'bufferViewContainerDiv';
	this.bufferViewContainer.style.overflow = 'hidden';
	this.bufferViewContainer.style.height = '100%';
	this.bufferViewContainer.style.width = '400px';
	this.bufferViewContainer.style.position = 'relative';
	parent.appendChild(this.bufferViewContainer);
	
	
	//define the buffer in the server and get confirmation:
	var succeded = false;
	$.ajax({
		url:  'BufferViewer?add=' + title + '&' + bufferSrc + '&' + dataType,
		type: "POST",
		async: false,
		dataType: "json",
		success: function (data) {
			succeded = true;
			self.rowsCount = data.rowsCount;
			self.columnsCount = data.columnsCount;
		},
		error: function(jqxhr, statusText, errorThrown){
			appendCriticalErrorMessage(self.bufferViewContainer , 'Failed to add buffer "' + title + '":<br/>"'  + errorThrown + '".');
		}
	});
	
	if(succeded != true){
		return;
	}
	
	
	//create buffer-data table:
	this.dataTable = document.createElement('table');
	this.dataTable.className = 'bufferDataTable';
	this.bufferViewContainer.appendChild(this.dataTable);
	
	//add header text container:
	parent.style.position = 'relative';
	this.headerDiv = document.createElement('div');
	parent.appendChild(this.headerDiv);
	this.headerDiv.style.position = 'absolute';
	this.headerDiv.style.top = '-18px';
	this.headerDiv.style.left = '30px';
	this.headerDiv.style.zIndex = '999';
	this.headerDiv.innerHTML = title;
	
	//add a "save as" button if can save:
	var canSave = false;
	$.ajax({
		url:  'BufferViewer?canSaveAsCSV=' + self.title,
		type: "POST",
		async: false,
		dataType: "text",
		success: function () {
			canSave = true;
		},
		error: function(jqxhr, statusText, errorThrown){}
	});
	
	if(canSave == true){
		this.saveAsCSVImg = document.createElement('img');
		parent.appendChild(this.saveAsCSVImg);
		this.saveAsCSVImg.style.position = 'absolute';
		this.saveAsCSVImg.style.top = '-18px';
		this.saveAsCSVImg.style.left = '0px';
		this.saveAsCSVImg.style.width = '16px';
		this.saveAsCSVImg.style.height = '16px';
		this.saveAsCSVImg.style.zIndex = '999';
		this.saveAsCSVImg.style.cursor = 'pointer';
		this.saveAsCSVImg.title = 'save buffer';
		this.saveAsCSVImg.src = filesBaseDir + '/resources/save.png';
		
		this.saveAsCSVImg.onclick = function(){
			$.ajax({
				url:  'BufferViewer?saveAsCSV=' + self.title,
				type: "POST",
				async: false,
				dataType: "text",
				success: function (data) {
					//alert('buffer saved successfully to ""' + data + '".');
				},
				error: function(jqxhr, statusText, errorThrown){
					//alert('Failed to save buffer:\n' + statusText);
				}
			});
		}
		
	}
	
	//rebuild table:
	this.rebuildDataTable();
}

BufferPreview.prototype.rebuildDataTable = function (){
	if(this.dataTable == null){
		return;
	}
	
	var self = this;
	$.ajax({
		url:  'BufferViewer?getDisplayInfo=' + self.title,
		type: "POST",
		async: false,
		dataType: "json",
		success: function (data) {
			self.rowsCount = data.rowsCount;
			self.columnsCount = data.columnsCount;
		},
		error: function(jqxhr, statusText, errorThrown){}
	});
	
	//1: measurments:
	var customOffset = Math.floor($(this.bufferViewContainer).height() / this.rowHeight / 5);
	customOffset = customOffset - Math.ceil(customOffset / 5);
	var rowsThatCanBeShown = Math.floor(($(this.bufferViewContainer).height() - customOffset) / this.rowHeight) - 1 - customOffset;//todo: -5 ??
	rowsThatCanBeShown = Math.max(0, rowsThatCanBeShown);
	this.visibleRows = Math.min(this.rowsCount, rowsThatCanBeShown);
	if(this.rowsOffset + this.visibleRows > this.rowsCount){
		var goback = this.rowsOffset + this.visibleRows - this.rowsCount;
		this.rowsOffset -= goback;
	}
	
	
	var columnsThatCanBeShown = Math.ceil($(this.bufferViewContainer).width() / this.columnWidth) - 1;
	this.visibleColumns = Math.min(this.columnsCount, columnsThatCanBeShown);
	if(this.columnsOffset + this.visibleColumns > this.columnsCount){
		var goback = this.columnsOffset + this.visibleColumns - this.columnsCount;
		this.columnsOffset -= goback;
	}
	
	//build headers:
	var columnHeadersHTML = '';
	for(var i=0; i<this.visibleColumns; i++){
		columnHeadersHTML += '<th style="min-width: 100px;">' + (this.columnsOffset + i) +'</th>';
	}
	this.dataTable.innerHTML = '<thead><tr><th style="min-width: 50px;">#</th>' + columnHeadersHTML + '</tr></thead>' + '<tbody></tbody>';
	
	//build body:
	this.rebuildTableBody();
}

BufferPreview.prototype.clearTableBody = function (){
	if(this.dataTable == null){
		return;
	}
	var tbody = this.dataTable.getElementsByTagName('tbody')[0];
	$(tbody).empty();
}

BufferPreview.prototype.rebuildTableBody = function (){
	if(this.dataTable == null){
		return;
	}
	var title = this.title;
	
	//fetch data matrix:
	var dataMatrix;
	var succeded = false;
	$.ajax({
		url:  'BufferViewer?readMatrix=' + title + '&' + this.rowsOffset + '&' + this.columnsOffset + '&' +
													 (this.visibleRows + this.rowsOffset) + '&' + (this.visibleColumns + this.columnsOffset),
		type: "POST",
		async: false,
		dataType: "json",
		success: function (data) {
			succeded = true;
			dataMatrix = data;
		},
		error: function(jqxhr, statusText, errorThrown){
			alert('Error while reading buffer "' + title + '" data:<br/>"'  + errorThrown + '".');
		}
	});
	
	if(succeded != true){
		return;
	}
	
	var tbody = this.dataTable.getElementsByTagName('tbody')[0];
	$(tbody).empty();
	
	for(var i=0; i<this.visibleRows; i++){
		var row = tbody.insertRow();
		row.className = 'bufferRow' + (this.rowsOffset + i);
		//line header with "row number":
		var th = document.createElement('th');
		th.innerHTML =  (this.rowsOffset + i);
		row.appendChild(th);
		var cell;
		//buffer data:
		for(var n=0; n<this.visibleColumns; n++){
			cell = row.insertCell();
			var value = dataMatrix[i][n];
			cell.innerHTML = value;
			cell.title = 'element #' + ((this.rowsOffset + i) * this.columnsCount + (this.columnsOffset + n) + ' value is:\n ' + value);
			cell.className = 'bufferElement' + ((this.rowsOffset + i) * this.columnsCount + (this.columnsOffset + n));
		}
	}
	var x = $(cell).height(); //DO NOT TOUCH!

}
