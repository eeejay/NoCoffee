// TODO:
// - Statistics, info panel
// - Why did Equinox zoom box work ok?
// - Simple vs advanced tab
// - Also affect mouse cursor
// - Option to follow mouse cursor

// - Might be more starfish shaped:
// - Misshapen macular degenation blob, add blur to outside
// - Stargardt's add brightness, some good holes in it, loss of contrast sensitivity

var oldViewData = {};
var uniqueNumber = 0; // So that we generate new ids

var kSvgDocClassName  = 'noCoffeeSvgFilterDoc';
var kSvgBodyClassName = 'noCoffeeSvgFilterBody';
var kSvgOverlayClassName = 'noCoffeeSvgOverlay';
var kBlockerClassName = 'noCoffeeVisionBlockingDiv';
var kCloudyClassName = 'noCoffeeVisionCloudyDiv';
var kMaxFloaters = 15;
var kMaxFloaterTravel = 10; // Percent of screen
var kMinFloaterTravelTime = 3; // Seconds
var kMaxFloaterTravelTime = 20; // Seconds
var kMaxFloaterTravelDelayTime = 20; // Seconds
var kMaxFloaterRotation = 40;
var kMinFloaterWidth = 10;
var kMinFloaterOpacity = .1;
var kMaxFloaterOpacity = .4;
var kFlutterDist = 15;
var flutterInterval = 0;
var flutterCount = 0;

function createSvgFilter(filterMarkup, className) {
	var svgMarkup =
'<svg xmlns="http://www.w3.org/2000/svg" version="1.1">' +
  '<defs>' +
	 '<filter id="'+ className + window.uniqueNumber +'" >' +
	   filterMarkup +
	 '</filter>' +
   '</defs>' +
'</svg>';

	var containerElt = document.createElement('div');
	containerElt.style.visibility = 'hidden';
	containerElt.className = className;
	containerElt.innerHTML = svgMarkup;
	return containerElt;
}

function getSvgColorMatrixFilter(colorMatrixValues) {
	if (!colorMatrixValues) {
		return '';
	}
	var str = '<feColorMatrix type="matrix" values="' + colorMatrixValues + '" />';
	return str;
}

function getSvgGhostingFilter(ghostingLevel) {
	if (!ghostingLevel) {
		return '';
	}
	var str =
        '<feOffset result="offOut" in="SourceGraphic" dx="' + ghostingLevel + '" dy="0" />' +
        '<feBlend in="SourceGraphic" in2="offOut" mode="multiply" />';
    return str;
}

function getSvgFlutterFilter(flutter) {
	if (!flutter || !flutter.flutterLevel) {
		return '';
	}
	var horizMovement = kFlutterDist / flutter.zoom;
	var str =
        '<feOffset result="offOut" in="SourceGraphic" dx="' + horizMovement + '" dy="0" />';
    return str;
}

function oneFlutter(bodyCssFilter) {
	if (-- flutterCount <= 0) {
		stopFluttering();
	}
	document.body.style.webkitFilter = document.body.style.webkitFilter ? '' : bodyCssFilter;
}


function stopFluttering() {
	document.body.webkitFilter = '';
	clearInterval(window.flutterInterval);
	window.flutterInterval = 0;
}

function startFluttering(flutter, bodyCssFilter) {
	if (!window.flutterInterval) {
		window.flutterCount = Math.random() * flutter.flutterLevel * 1.5 + 5;
		window.flutterInterval = setInterval(function() { oneFlutter(bodyCssFilter); }, 10);
	}
}

function maybeStartFluttering(flutter, bodyCssFilter) {
	var randomized = Math.random() * 1000;
	if (randomized < flutter.flutterLevel) {
		startFluttering(flutter, bodyCssFilter);
	}
}

function initFlutter(flutter, bodyCssFilter) {
	startFluttering(flutter, bodyCssFilter);

	window.addEventListener('scroll', function() {  maybeStartFluttering(flutter, bodyCssFilter); } );
	window.addEventListener('mousemove', function() { maybeStartFluttering(flutter, bodyCssFilter); } );
}

function createFloater(floater) {
	var floaterImg = document.createElement('img');	
	floaterImg.style.position ='fixed';
	floaterImg.style.width = floater.width;
	floaterImg.style.left = floater.x + '%';
	floaterImg.style.top = floater.y + '%';
	floaterImg.style.opacity = floater.opacity.toString();
    floaterImg.style.webkitTransform = "rotate(" + floater.rotation + "deg)";
    floaterImg.style.zIndex = "999999";
	floaterImg.src = chrome.extension.getURL('overlays/floater-' + floater.imageNum + '.png');
	floaterImg.id = 'noCoffeeFloater-' + floater.imageNum;
	floaterImg.addEventListener( 'webkitTransitionEnd',    // Start new animation some time after last finished
    	function( event ) { animateFloater(floater, floaterImg) }, false );
	return floaterImg;
}

function resetFloaters(blockerDiv, floaters) {
	var floaterMix = [];
	var count;
	for (count = 0; count < kMaxFloaters; count ++) {
		floaterMix[count] = count + 1;
	}
	for ( count = 0; count < floaters.numFloaters; count ++) {
		var nextItemIndex = Math.floor( Math.random() * ( kMaxFloaters - count) );
		var nextItem = floaterMix[nextItemIndex];
		floaterMix[nextItemIndex] = floaterMix[kMaxFloaters - count - 1]; // Don't use same floater twice
		var floater = {
			imageNum  : nextItem,
			opacity   : Math.random() * (kMaxFloaterOpacity - kMinFloaterOpacity) + kMinFloaterOpacity,
			width     : (Math.max(kMinFloaterWidth, Math.random() * floaters.maxWidth)) / getZoom(),
			x         : Math.random() * 100,
			y         : Math.random() * 100,
			rotation  : Math.random() * 360
		};
		var floaterImg = createFloater(floater);
		blockerDiv.appendChild(floaterImg);
		animateFloater(floater, floaterImg);
	}
}

function animateFloater(floater, floaterImg) {
	var delay = Math.random() * kMaxFloaterTravelDelayTime;
	setTimeout(function() {
		var id = "noCoffeeFloaterAnimationStyle-" + floater.imageNum;
		var lastAnimation = document.getElementById(id);
		if (lastAnimation) {
			// Stabilize the coordinates to the new location so it doesn't jump back when we remove the old style
			var rect = floaterImg.getBoundingClientRect();
			floaterImg.left = rect.left + 'px';
			floaterImg.top = rect.top + 'px';
			// Remove the old style
			deleteNodeIfExists(lastAnimation);
		}
		var floaterStyleElt = document.createElement("style");
		floaterStyleElt.id = id;
		var direction = Math.random() * 360;
		var newRotation = floater.rotation + Math.random() * kMaxFloaterRotation * 2 - kMaxFloaterRotation;
		var distance = Math.random() * kMaxFloaterTravel;
		var left = floater.x + Math.sin(direction) * distance;
		var top = floater.y + Math.cos(direction) * distance;
		var seconds = Math.random() * (kMaxFloaterTravelTime - kMinFloaterTravelTime) + kMinFloaterTravelTime;
		floaterStyleElt.innerText = "#" + floaterImg.id + " { " + 
			"top: " + top + "% !important; " + 
			"left: " + left + "% !important; " + 
			"-webkit-transform: rotate(" + newRotation + "deg) !important;" +
			"-webkit-transition: all " + seconds + "s;" + 
		"}";

		floaterImg.parentNode.appendChild(floaterStyleElt);
	}, delay * 1000);
}

function createCloudyDiv(cloudy) {
	if (!cloudy || !cloudy.cloudyLevel) {
		return null;
	}
	var cloudyDiv = document.createElement('div');
	cloudyDiv.className = kCloudyClassName;
	var size = 100 * cloudy.zoom;

	var style = 
		'z-index:2147483646 !important; ' + 
		'-webkit-transform: scale(' + (1 / cloudy.zoom) + '); ' +
		'-webkit-transform-origin: 0 0;' +
		'pointer-events: none; ' +
		'position: fixed; left: 0; top: 0; height: ' + size + '%; width: ' + size + '%; ' +
	    'background-image: url(' + chrome.extension.getURL('overlays/cataracts.png') + '); ' +
		'background-repeat: no-repeat; background-size: 100% 100%; ' +
		'background-position: 0 0; -webkit-filter: opacity(' + cloudy.cloudyLevel + '%);'; 

	cloudyDiv.setAttribute('style', style);
	return cloudyDiv;
}

function createBlockerDiv(block) {
	if (!block) {
		return null;
	}
	var blockerDiv = document.createElement('div');
	blockerDiv.className = kBlockerClassName;
	var style = 
		'z-index:2147483646 !important; ' + 
		'pointer-events: none; ' +
		'position: fixed; ';
    if (block.image) {
		style += "background-image: url('" + block.image + "'); " +
				 "background-repeat: no-repeat; background-size: 100% 100%; " +
				 "left: " +  block.xPosition + "; top: " + block.yPosition + "; -webkit-filter: opacity(" + block.opacity + "%);"; 
				 // "-webkit-filter: url(#noCoffeeDisplacementFilter);
		if (block.displacement && false) { // Don't try to do this yet
			blockerDiv.innerHTML = 
				'<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
					'<defs>' +
					  '<filter id="noCoffeeDisplacementFilter" filterUnits="userSpaceOnUse">' +
						'<feImage xlink:href="' + block.image + '" result="noCoffeeSource"/>' +
						'<feImage xlink:href="' + block.image + '" result="noCoffeeDisplacementMap"/>' +
						'<feDisplacementMap scale="1" xChannelSelector="R" yChannelSelector="R"   in="noCoffeeSource" in2="noCoffeeDisplacementMap"/>' +
					  '</filter>' +
					'</defs>' +
					'<use filter="url(#noCoffeeDisplacementFilter)" />' +
				'</svg>';	
		}
	}
	else if (block.innerStrength) {
		style += "left: 0; top: 0; height: 100%; width: 100%;";
		if (block.type === "radial")
			style += 'background-image: -webkit-radial-gradient(circle, ' + 
				  	 block.innerColor + ' ' + block.innerStrength + '%, ' + 
					 block.outerColor + ' ' + block.outerStrength + '%);';
		else 
			style += 'background-image: -webkit-linear-gradient(left, ' + 
				  	 block.innerColor + ' ' + block.innerStrength + '%, ' + 
					 block.outerColor + ' ' + block.outerStrength + '%);';
	}	

	if (block.floaters) {
		resetFloaters(blockerDiv, block.floaters);
	}

	if (block.zoom) {
		var size = 100 * block.zoom;
		style += '-webkit-transform: scale(' + 1/block.zoom + '); -webkit-transform-origin: 0 0; ' +
				 'width: ' + size + '%; height: ' + size + '%; left: 0; top: 0;';
	}

    
	blockerDiv.setAttribute('style', style);

	return blockerDiv;
}

function createSvgSnowOverlay(snow) {
	if (!snow || !snow.amount) {
		return null;
	}
	var svgOverlay = document.createElement('div');
	svgOverlay.className = kSvgOverlayClassName;
	var size = 100 * snow.zoom;
	var startPos = (100 - size) / 2;
	svgOverlay.setAttribute('style',
		'-webkit-transform: scale(' + (1 / snow.zoom) + '); ' +
		'z-index:2147483645 !important; ' + 
		'pointer-events: none; ' +
		'position: fixed; left: ' + startPos + '%; top: ' + startPos + '%; height: ' + size + '%; width: ' + size + '%; ');
	svgOverlay.innerHTML =
		'<svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">' +
			'<defs>' +
			  '<filter id="noCoffeeSnowFilter" filterUnits="userSpaceOnUse" x="0" y="0">' +
			    '<feTurbulence type="fractalNoise" baseFrequency=".25" numOctaves="1" seed="4" stitchTiles="noStitch" width="159" height="120">' +
			      '<animate attributeType="XML" attributeName="seed" from="500" to="1" dur="70s" repeatCount="indefinite" />' +
			    '</feTurbulence>' +
				'<feComponentTransfer>' +
			      '<feFuncA type="discrete" tableValues="0 0 ' + snow.amount + ' 1"/>' +
				'</feComponentTransfer>' +
			    '<feTile x="0" y="0" width="100%" height="100%" result="tiled"/>' +
			  '</filter>' +
			'</defs>' +
			'<use filter="url(#noCoffeeSnowFilter)" />' +
		'</svg>';	

	return svgOverlay;
}

// Return style object
function getView(viewData) {
	var view = {
		doc: {
			cssFilter: '',
			svgFilterElt: undefined
		},
		body: {
			cssFilter: '',
			svgFilterElt: undefined		
		},
		svgOverlayElt: undefined,
		blockerDiv: undefined
	};

	// Create new svg color filter -- old one will be removed
	// Needs to go on doc element so that background of page is always affected
	var svgColorFilterMarkup = getSvgColorMatrixFilter(viewData.colorMatrixValues);
	if (svgColorFilterMarkup) {
		view.doc.svgFilterElt = createSvgFilter(svgColorFilterMarkup, kSvgDocClassName);
		var id = view.doc.svgFilterElt.querySelector('filter').id;
		view.doc.cssFilter += 'url(#' + id +') ';
	}

	// Create new svg ghosting filter -- old one will be removed
	// Ghosting filter needs to go on body -- learned through trial and error. Seems to be a bug in Chrome.
	var svgGhostingFilterMarkup = getSvgGhostingFilter(viewData.ghosting);
	var svgFlutterFilterMarkup = getSvgFlutterFilter(viewData.flutter);
	stopFluttering();
	if (svgGhostingFilterMarkup || svgFlutterFilterMarkup) {
		view.body.svgFilterElt = createSvgFilter(svgFlutterFilterMarkup || svgGhostingFilterMarkup, kSvgBodyClassName);
		var id = view.body.svgFilterElt.querySelector('filter').id;
		view.body.cssFilter += 'url(#' + id +')';
		if (svgFlutterFilterMarkup) {
			initFlutter(viewData.flutter, view.body.cssFilter);
		}
	}

	// Create new svg overlay div -- old one will be removed
	if (!deepEquals(oldViewData.snow, viewData.snow)) {
    	view.svgOverlayElt = createSvgSnowOverlay(viewData.snow);
    }

	// Create new cloudy div -- old one will be removed
	if (!deepEquals(oldViewData.cloudy, viewData.cloudy)) {
	    view.cloudyDiv = createCloudyDiv(viewData.cloudy);
	}

	// Create new blocker div -- old one will be removed
	if (!deepEquals(oldViewData.block, viewData.block)) {
	    view.blockerDiv = createBlockerDiv(viewData.block);
	}

	if (viewData.blur) {
		view.doc.cssFilter += 'blur(' + viewData.blur + 'px) ';
	}
	if (viewData.contrast != 100) {
		view.doc.cssFilter += 'contrast(' + viewData.contrast + '%) ';			
	}
	if (viewData.brightness) {
		view.doc.cssFilter += 'brightness(' + viewData.brightness + '%) ';
	}

	return view;
}

function getZoom() {
	return window.outerWidth / window.innerWidth; // Works in Chrome
}

// Computed values based on user settings
function getViewData(settings) {
	var zoom = getZoom();

	// When there is any ghosting, add a little blur
	var blurPlusExtra = settings.blurLevel + (settings.ghostingLevel > 0 ? 3 : 0) + (settings.cloudyLevel / 2.5);

	var viewData = {
		blur      		  : (blurPlusExtra / zoom) / 2,
		contrast          : settings.contrastLevel ? 60 - settings.contrastLevel : 100,
		colorMatrixValues : settings.colorDeficiencyMatrixValues,
		brightness        : settings.brightnessLevel  * 1.2,
		ghosting          : settings.ghostingLevel / zoom,
		snow              : { zoom: zoom, amount: .03 * settings.snowLevel },
		cloudy            : { zoom: zoom, cloudyLevel: settings.cloudyLevel * 6 },
		flutter           : { zoom: zoom, flutterLevel: settings.flutterLevel }
	};

	if (settings.blockStrength) {
		switch (settings.blockType) {
		case 'centralBlock': // Macular degeneration
			viewData.block = {
				type          : "radial",
				innerStrength : settings.blockStrength /2,
				outerStrength : settings.blockStrength + 10,
			 	innerColor    : 'rgba(150,150,150,' + ( .9 + settings.blockStrength / 1000 ) + ')',
			 	outerColor    : 'transparent'
			 };
		 	break;
		case 'peripheralBlock': // Glaucoma or retinitis pigmentosa
			viewData.block = {
				block         : zoom,
				type          : "radial",
				innerStrength : (100 - settings.blockStrength) - 30,
				outerStrength : (100 - settings.blockStrength) * 1.5 - 20,
		 		innerColor    : 'transparent',
		 		outerColor    : 'black'
		 	};
		 	break;
		case 'sideBlock': // Hemianopia
			viewData.block = {
				type          : "linear",
				innerStrength : settings.blockStrength /2,
				outerStrength : settings.blockStrength + 10,
		 		innerColor    : 'black',
		 		outerColor    : 'transparent'
		 	};
		 	break;
		case 'spotBlock': // Diabetic retinopathy
			viewData.blur += settings.blockStrength / 70; // Extra blur for diabetic retinopathy
			viewData.block = {
				outerWidth    : window.top.outerWidth, // We rerender when zoom or window size changes
				outerHeight   : window.top.outerHeight,
				xPosition     : '0px',
				yPosition     : '0px',
				image         : chrome.extension.getURL('overlays/diabetic-retinopathy.png'),
				opacity       : settings.blockStrength,
				extraOpacity  : settings.blockStrength * 2,
				displacement  : false,
				zoom          : zoom
		 	};
		 	break;
		case 'cornerBlock': // Retinal detachment
			viewData.block = {
				outerWidth    : window.top.outerWidth, // We rerender when zoom or window size chnages
				outerHeight   : window.top.outerHeight,
				xPosition     : (settings.blockStrength / 2.5 - 40)  + '%',
				yPosition     : (settings.blockStrength / 2.5 - 40) + '%',
				image         : chrome.extension.getURL('overlays/retinal-detachment.png'),
				opacity       : 100,
				displacement  : true,
				zoom          : zoom
		 	};
		 	// Fall-through -- retinal detachment comes with floaters
		case 'floaterBlock': // Floaters
			if (typeof viewData.block === "undefined") {
				viewData.block = {};
			}
			viewData.block.floaters = {
				numFloaters   : Math.min(Math.round(settings.blockStrength / 6.5 + 1), kMaxFloaters),
				maxVelocity   : 2,
				maxWidth      : settings.blockStrength + 50
			};
			viewData.block.zoom = zoom;
			break;
		default:
			viewData.block = null;
			break;
		}
	}
	return viewData;
}

function deleteNodeIfExists(node) {
	if (node)
		node.parentNode.removeChild(node);

}

function deepEquals(obj1, obj2) {
	if (!obj1 || !obj2) {
		return obj1 === obj2;
	}

	if (typeof obj1 !== typeof obj2) {
		return false;
	}

	if (typeof obj1 === 'object') {
		var item;
		for (item in obj1) {
			if (!deepEquals(obj1[item], obj2[item])) {
				return false; // Recurse for sub-sobjects
			}
		}
		for (item2 in obj2) {
			if (typeof obj1[item2] === 'undefined') {
				return false;
			}
		}
		return true;
	}

	return obj1 === obj2;
}

function refresh(viewData) {
	var view = getView(viewData);

	if (typeof view.doc.svgFilterElt !== 'undefined') {
		deleteNodeIfExists(document.querySelector('.' + kSvgDocClassName)); // Delete old one
		if (view.doc.svgFilterElt) {
			document.body.appendChild(view.doc.svgFilterElt);
		}
	}
	if (typeof view.body.svgFilterElt !== 'undefined') {
		deleteNodeIfExists(document.querySelector('.' + kSvgBodyClassName)); // Delete old one
		if (view.body.svgFilterElt) {
			document.body.appendChild(view.body.svgFilterElt);
		}
	}

	if (typeof view.svgOverlayElt !== 'undefined') {
		deleteNodeIfExists(document.querySelector('.' + kSvgOverlayClassName)); // Delete old one
		if (view.svgOverlayElt) {
			document.body.appendChild(view.svgOverlayElt);
		}		
	}

	if (typeof view.cloudyDiv !== 'undefined') {
		deleteNodeIfExists(document.querySelector('.' + kCloudyClassName)); // Delete old one
		if (view.cloudyDiv) {
			document.body.appendChild(view.cloudyDiv);
		}
	}

	if (typeof view.blockerDiv !== 'undefined') {
		deleteNodeIfExists(document.querySelector('.' + kBlockerClassName)); // Delete old one
		if (view.blockerDiv) {
			document.body.appendChild(view.blockerDiv);
		}
	}

	document.documentElement.style.webkitFilter = view.doc.cssFilter;
	document.body.style.webkitFilter = view.body.cssFilter;
}

// Setup refresh listener
chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.type === "refresh") {
		++ window.uniqueNumber;
		var viewData = getViewData(request.settings);
		if (!deepEquals(viewData, window.oldViewData)) {
	    	refresh(viewData);  // View data has changed -- re-render
			window.oldViewData = viewData;
		}
    }
});

function initIfStillNecessaryAndBodyExists() {
	if (document.body && !isInitialized) {
		chrome.extension.sendMessage({type: "getSettings"}, function(response) {});
		isInitialized = true;
	}
}

var isInitialized = false;
setTimeout(initIfStillNecessaryAndBodyExists, 0);

// Refresh once on first load
document.addEventListener('readystatechange', function() {
	initIfStillNecessaryAndBodyExists();
});
