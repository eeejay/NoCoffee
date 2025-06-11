// TODO:
// - Statistics, info panel
// - Why did Equinox zoom box work ok?
// - Simple vs advanced tab
// - Also affect mouse cursor
// - Option to follow mouse cursor

// - Might be more starfish shaped:
// - Misshapen macular degenation blob, add blur to outside
// - Stargardt's add brightness, some good holes in it, loss of contrast sensitivity

// (2025-refactor) allows a browser refresh to reset the settings
browser.runtime.sendMessage({ type: 'browserRefresh' });

let oldViewData = {};
window.flutterCount = 0;

const kSvgDocClassName = 'noCoffeeSvgFilterDoc';
const kSvgBodyClassName = 'noCoffeeSvgFilterBody';
const kSvgSnowOverlayClassName = 'noCoffeeSvgSnowOverlay';
const kBlockerOverlayClassName = 'noCoffeeVisionBlockingOverlay';
const kCloudyOverlayClassName = 'noCoffeeVisionCloudyOverlay';
const kMaxFloaters = 15;
const kMaxFloaterTravel = 10; // Percent of screen
const kMinFloaterTravelTime = 3; // Seconds
const kMaxFloaterTravelTime = 20; // Seconds
const kMaxFloaterTravelDelayTime = 20; // Seconds
const kMaxFloaterRotation = 40;
const kMinFloaterWidth = 10;
const kMinFloaterOpacity = 0.1;
const kMaxFloaterOpacity = 0.4;
const kFlutterDist = 15;

function createSvgFilter(filterMarkup, className) {
  const filterId = `${className}${Date.now()}`;
  let svgMarkup = `
    <svg xmlns="http://www.w3.org/2000/svg" version="1.1">
      <defs>
        <filter id="${filterId}">
          ${filterMarkup}
        </filter>
      </defs>
    </svg>`;

  let containerElt = document.createElement('div');
  containerElt.style.visibility = 'hidden';
  containerElt.className = className;
  containerElt.innerHTML = svgMarkup;
  return containerElt;
}

function getSvgColorMatrixFilter(colorMatrixValues) {
  if (!colorMatrixValues) {
    return '';
  }
  let str = `<feColorMatrix type="matrix" values="${colorMatrixValues}" />`;
  return str;
}

function getSvgGhostingFilter(ghostingLevel) {
  if (!ghostingLevel) {
    return '';
  }
  let str = `
    <feOffset result="offOut" in="SourceGraphic" dx="${ghostingLevel}" dy="0" />
    <feBlend in="SourceGraphic" in2="offOut" mode="multiply" />
  `;
  return str;
}

function getSvgFlutterFilter(flutter) {
  if (!flutter || !flutter.flutterLevel) {
    return '';
  }
  let horizMovement = kFlutterDist / flutter.zoom;
  let str = `<feOffset result="offOut" in="SourceGraphic" dx="${horizMovement}" dy="0" />`;
  return str;
}

function oneFlutter(bodyCssFilter) {
  if (--window.flutterCount <= 0) {
    stopFluttering();
  }
  document.body.style.filter = document.body.style.filter ? '' : bodyCssFilter;
}

function startFluttering(flutter, bodyCssFilter) {
  if (!window.flutterInterval) {
    window.flutterCount = Math.random() * flutter.flutterLevel * 1.5 + 5;
    window.flutterInterval = setInterval(function() { oneFlutter(bodyCssFilter); }, 10);
  }
}

function stopFluttering() {
  if (document.body) {
    document.body.style.filter = '';
  }

  if (window.flutterInterval) {
    clearInterval(window.flutterInterval);
    window.flutterInterval = 0;
  }
}

function maybeStartFluttering(flutter, bodyCssFilter) {
  let randomized = Math.random() * 1000;
  if (randomized < flutter.flutterLevel) {
    startFluttering(flutter, bodyCssFilter);
  }
}

function initFlutter(flutter, bodyCssFilter) {
  startFluttering(flutter, bodyCssFilter);

  window.flutterScrollListener = () => {
    maybeStartFluttering(flutter, bodyCssFilter);
  };

  window.flutterMouseListener = () => {
    maybeStartFluttering(flutter, bodyCssFilter);
  };

  document.addEventListener('scroll', window.flutterScrollListener, true);
  document.addEventListener('mousemove', window.flutterMouseListener, true);
}


function createFloater(floater) {
  let floaterImg = document.createElement('img');
  floaterImg.style.position = 'fixed';
  floaterImg.style.width = floater.width;
  floaterImg.style.left = floater.x + '%';
  floaterImg.style.top = floater.y + '%';
  floaterImg.style.opacity = floater.opacity.toString();
  floaterImg.style.transform = 'rotate(' + floater.rotation + 'deg)';
  floaterImg.style.zIndex = '999999';
  floaterImg.src = browser.runtime.getURL('overlays/floater-' + floater.imageNum + '.png');
  floaterImg.id = 'noCoffeeFloater-' + floater.imageNum;
  floaterImg.addEventListener('transitionend', // Start new animation some time after last finished
    function() { animateFloater(floater, floaterImg); }, false);
  return floaterImg;
}

function resetFloaters(blockerOverlayElt, floaters) {
  let floaterMix = [];
  let count;
  for (count = 0; count < kMaxFloaters; count++) {
    floaterMix[count] = count + 1;
  }
  for (count = 0; count < floaters.numFloaters; count++) {
    let nextItemIndex = Math.floor(Math.random() * (kMaxFloaters - count));
    let nextItem = floaterMix[nextItemIndex];
    floaterMix[nextItemIndex] = floaterMix[kMaxFloaters - count - 1]; // Don't use same floater twice
    let floater = {
      imageNum: nextItem,
      opacity: Math.random() * (kMaxFloaterOpacity - kMinFloaterOpacity) + kMinFloaterOpacity,
      width: (Math.max(kMinFloaterWidth, Math.random() * floaters.maxWidth)) / getZoom(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      rotation: Math.random() * 360
    };
    let floaterImg = createFloater(floater);
    blockerOverlayElt.appendChild(floaterImg);
    animateFloater(floater, floaterImg);
  }
}

function animateFloater(floater, floaterImg) {
  let delay = Math.random() * kMaxFloaterTravelDelayTime;
  setTimeout(function() {
    let id = 'noCoffeeFloaterAnimationStyle-' + floater.imageNum;
    let lastAnimation = document.getElementById(id);
    if (lastAnimation) {
      // Stabilize the coordinates to the new location so it doesn't jump back when we remove the old style
      let rect = floaterImg.getBoundingClientRect();
      floaterImg.left = rect.left + 'px';
      floaterImg.top = rect.top + 'px';
      // Remove the old style
      deleteNodeIfExists(lastAnimation);
    }
    let floaterStyleElt = document.createElement('style');
    floaterStyleElt.id = id;
    let direction = Math.random() * 360;
    let newRotation = floater.rotation + Math.random() * kMaxFloaterRotation * 2 - kMaxFloaterRotation;
    let distance = Math.random() * kMaxFloaterTravel;
    let left = floater.x + Math.sin(direction) * distance;
    let top = floater.y + Math.cos(direction) * distance;
    let seconds = Math.random() * (kMaxFloaterTravelTime - kMinFloaterTravelTime) + kMinFloaterTravelTime;
    floaterStyleElt.innerText = `
      #${floaterImg.id} {
        top: ${top}% !important;
        left: ${left}% !important;
        transform: rotate(${newRotation}deg) !important;
        transition: all ${seconds}s;
      }
    `;
    floaterImg.parentNode.appendChild(floaterStyleElt);
  }, delay * 1000);
}

function createCloudyOverlay(cloudy) {
  if (!cloudy || !cloudy.cloudyLevel) {
    return null;
  }
  let cloudyOverlay = document.createElement('div');
  cloudyOverlay.className = kCloudyOverlayClassName;
  let size = 100 * cloudy.zoom;

  let style = `
    z-index: 2147483646 !important;
    transform: scale(${1 / cloudy.zoom});
    transform-origin: 0 0;
    pointer-events: none;
    position: fixed;
    left: 0;
    top: 0;
    height: ${size}%;
    width: ${size}%;
    background-image: url(${browser.runtime.getURL('overlays/cataracts.png')});
    background-repeat: no-repeat;
    background-size: 100% 100%;
    background-position: 0 0;
    filter: opacity(${cloudy.cloudyLevel}%);
  `;

  cloudyOverlay.setAttribute('style', style);
  return cloudyOverlay;
}

function createBlockerOverlay(block) {
  if (!block) {
    return null;
  }
  let blockerOverlay = document.createElement('div');
  blockerOverlay.className = kBlockerOverlayClassName;
  let style = `
    z-index: 2147483646 !important;
    pointer-events: none;
    position: fixed;
  `;
  if (block.image) {
    style += `
      background-image: url('${block.image}');
      background-repeat: no-repeat;
      background-size: 100% 100%;
      left: ${block.xPosition};
      top: ${block.yPosition};
      filter: opacity(${block.opacity}%);
    `;
    // "filter: url(#noCoffeeDisplacementFilter);
    if (block.displacement && false) { // Don't try to do this yet
      blockerOverlay.innerHTML = `
        <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet">
          <defs>
            <filter id="noCoffeeDisplacementFilter" filterUnits="userSpaceOnUse">
              <feImage xlink:href="${block.image}" result="noCoffeeSource"/>
              <feImage xlink:href="${block.image}" result="noCoffeeDisplacementMap"/>
              <feDisplacementMap scale="1" xChannelSelector="R" yChannelSelector="R" in="noCoffeeSource" in2="noCoffeeDisplacementMap"/>
            </filter>
          </defs>
          <use filter="url(#noCoffeeDisplacementFilter)" />
        </svg>
      `;
    }
  } else if (block.innerStrength) {
    style += `
      left: 0;
      top: 0;
      height: 100%;
      width: 100%;
    `;
    if (block.type === 'radial') {
      style += `
        background-image: radial-gradient(circle, ${block.innerColor} ${block.innerStrength}%, ${block.outerColor} ${block.outerStrength}%);
      `;
    } else {
      style += `
        background-image: linear-gradient(to right, ${block.innerColor} ${block.innerStrength}%, ${block.outerColor} ${block.outerStrength}%);
      `;
    }
  }

  if (block.floaters) {
    resetFloaters(blockerOverlay, block.floaters);
  }

  if (block.zoom) {
    let size = 100 * block.zoom;
    style += `
      transform: scale(${1 / block.zoom});
      transform-origin: 0 0;
      width: ${size}%;
      height: ${size}%;
      left: 0;
      top: 0;
    `;
  }

  blockerOverlay.setAttribute('style', style);

  return blockerOverlay;
}

function createSvgSnowOverlay(snow) {
  if (!snow || !snow.amount) {
    return null;
  }
  let snowOverlay = document.createElement('div');
  snowOverlay.className = kSvgSnowOverlayClassName;
  const size = 100 * snow.zoom;
  const startPos = (100 - size) / 2;
  snowOverlay.style.cssText = `
    transform: scale(${1 / snow.zoom}); 
    z-index:2147483645 !important; 
    pointer-events: none; 
    position: fixed; 
    left: ${startPos}%; 
    top: ${startPos}%; 
    width: ${size}%; 
    height: ${size}%;`;
  
  snowOverlay.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMid meet" style="width:100%; height:100%">
      <defs>
        <filter id="noCoffeeSnowFilter" filterUnits="userSpaceOnUse" x="0" y="0" width="100%" height="100%">
          <feTurbulence type="fractalNoise" baseFrequency=".25" numOctaves="1" seed="0" stitchTiles="noStitch" />
          <feComponentTransfer>
            <feFuncA type="discrete" tableValues="0 0 ${snow.amount} 1"/>
          </feComponentTransfer>
          <feTile result="tiled"/>
        </filter>
      </defs>
      <rect width="100%" height="100%" filter="url(#noCoffeeSnowFilter)" />
    </svg>`;

    const feTurb = snowOverlay.querySelector('feTurbulence');
    if (feTurb) {
      const DURATION = 70000;
      let startTime = null;

      function animateSnow(timestamp) {
        if (startTime === null) startTime = timestamp;

        const progress = ((timestamp - startTime) % DURATION) / DURATION;
        const seedValue = Math.floor(500 - 499 * progress);
        feTurb.setAttribute('seed', seedValue);
        // Store animation ID for cleanup in refresh(viewData)
        snowOverlay.animationId = requestAnimationFrame(animateSnow);
      }

      snowOverlay.animationId = requestAnimationFrame(animateSnow);
    }

  return snowOverlay;
}

// Return style object
function getView(viewData) {
  if (window.flutterScrollListener) {
    document.removeEventListener('scroll', window.flutterScrollListener, true);
    window.flutterScrollListener = null;
  }
  if (window.flutterMouseListener) {
    document.removeEventListener('mousemove', window.flutterMouseListener, true);
    window.flutterMouseListener = null;
  }

  let view = {
    doc: {
      cssFilter: '',
      svgFilterElt: undefined
    },
    body: {
      cssFilter: '',
      svgFilterElt: undefined
    },
    svgSnowOverlayElt: undefined,
    blockerOverlayElt: undefined,
    cloudyOverlayElt: undefined
  };

  // Create new svg color filter -- old one will be removed
  // (2025-refactor) svg color filter needs to go on body element otherwise the filter does not work in Firefox
  let svgColorFilterMarkup = getSvgColorMatrixFilter(viewData.colorMatrixValues);
  if (svgColorFilterMarkup) {
    view.body.svgFilterElt = createSvgFilter(svgColorFilterMarkup, kSvgBodyClassName);
    let id = view.body.svgFilterElt.querySelector('filter').id;
    view.body.cssFilter += `url(#${id}) `;
  }

  // Create new svg ghosting filter -- old one will be removed
  // Ghosting filter needs to go on body -- learned through trial and error. Seems to be a bug in Chrome.
  let svgGhostingFilterMarkup = getSvgGhostingFilter(viewData.ghosting);
  let svgFlutterFilterMarkup = getSvgFlutterFilter(viewData.flutter);

  stopFluttering();
  
  if (svgGhostingFilterMarkup || svgFlutterFilterMarkup) {
    view.body.svgFilterElt = createSvgFilter(svgFlutterFilterMarkup || svgGhostingFilterMarkup, kSvgBodyClassName);
    let id = view.body.svgFilterElt.querySelector('filter').id;
    view.body.cssFilter += `url(#${id}) `;
    if (svgFlutterFilterMarkup) {
      initFlutter(viewData.flutter, view.body.cssFilter);
    }
  }

  // Create new svg overlay div -- old one will be removed
  if (!deepEquals(oldViewData.snow, viewData.snow)) {
    view.svgSnowOverlayElt = createSvgSnowOverlay(viewData.snow);
  }

  // Create new cloudy div -- old one will be removed
  if (!deepEquals(oldViewData.cloudy, viewData.cloudy)) {
    view.cloudyOverlayElt = createCloudyOverlay(viewData.cloudy);
  }

  // Create new blocker div -- old one will be removed
  if (!deepEquals(oldViewData.block, viewData.block)) {
    view.blockerOverlayElt = createBlockerOverlay(viewData.block);
  }

  if (viewData.blur) {
    view.doc.cssFilter += `blur(${viewData.blur}px) `;
  }
  if (viewData.contrast != 100) {
    view.doc.cssFilter += `contrast(${viewData.contrast}%) `;
  }
  if (viewData.brightness) {
    view.doc.cssFilter += `brightness(${viewData.brightness}%) `;
  }
  return view;
}

function getZoom() {
  return window.outerWidth / window.innerWidth; // Works in Chrome
}

// Computed values based on user settings
function getViewData(settings) {
  let zoom = getZoom();

  // When there is any ghosting, add a little blur
  let blurPlusExtra = settings.blurLevel + (settings.ghostingLevel > 0 ? 3 : 0) + (settings.cloudyLevel / 2.5);

  let viewData = {
    blur: (blurPlusExtra / zoom) / 2,
    contrast: settings.contrastLevel ? 60 - settings.contrastLevel : 100,
    colorMatrixValues: settings.colorDeficiencyMatrixValues,
    brightness: settings.brightnessLevel ? 100 - (settings.brightnessLevel * 1.9) : 100,
    ghosting: settings.ghostingLevel / zoom,
    snow: { zoom: zoom, amount: 0.03 * settings.snowLevel },
    cloudy: { zoom: zoom, cloudyLevel: settings.cloudyLevel * 6 },
    flutter: { zoom: zoom, flutterLevel: settings.flutterLevel }
  };

  if (settings.blockStrength) {
    switch (settings.blockType) {
      case 'centralBlock': // Macular degeneration
        viewData.block = {
          type: 'radial',
          innerStrength: settings.blockStrength / 2,
          outerStrength: settings.blockStrength + 10,
          innerColor: `rgba(150,150,150,${0.9 + settings.blockStrength / 1000})`,
          outerColor: 'transparent'
        };
        break;
      case 'peripheralBlock': // Glaucoma or retinitis pigmentosa
        viewData.block = {
          block: zoom,
          type: 'radial',
          innerStrength: (100 - settings.blockStrength) - 30,
          outerStrength: (100 - settings.blockStrength) * 1.5 - 20,
          innerColor: 'transparent',
          outerColor: 'black'
        };
        break;
      case 'sideBlock': // Hemianopia
        viewData.block = {
          type: 'linear',
          innerStrength: settings.blockStrength / 2,
          outerStrength: settings.blockStrength + 10,
          innerColor: 'black',
          outerColor: 'transparent'
        };
        break;
      case 'spotBlock': // Diabetic retinopathy
        viewData.blur += settings.blockStrength / 70; // Extra blur for diabetic retinopathy
        viewData.block = {
          outerWidth: window.top.outerWidth, // We rerender when zoom or window size changes
          outerHeight: window.top.outerHeight,
          xPosition: '0px',
          yPosition: '0px',
          image: browser.runtime.getURL('overlays/diabetic-retinopathy.png'),
          opacity: settings.blockStrength,
          extraOpacity: settings.blockStrength * 2,
          displacement: false,
          zoom: zoom
        };
        break;
      case 'cornerBlock': // Retinal detachment
        viewData.block = {
          outerWidth: window.top.outerWidth, // We rerender when zoom or window size chnages
          outerHeight: window.top.outerHeight,
          xPosition: (settings.blockStrength / 2.5 - 40) + '%',
          yPosition: (settings.blockStrength / 2.5 - 40) + '%',
          image: browser.runtime.getURL('overlays/retinal-detachment.png'),
          opacity: 100,
          displacement: true,
          zoom: zoom
        };
        // Fall-through -- retinal detachment comes with floaters
      case 'floaterBlock': // Floaters
        if (typeof viewData.block === 'undefined') {
          viewData.block = {};
        }
        viewData.block.floaters = {
          numFloaters: Math.min(Math.round(settings.blockStrength / 6.5 + 1), kMaxFloaters),
          maxVelocity: 2,
          maxWidth: settings.blockStrength + 50
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
  if (node) { node.parentNode.removeChild(node); }
}

function deepEquals(obj1, obj2) {
  if (!obj1 || !obj2) {
    return obj1 === obj2;
  }

  if (typeof obj1 !== typeof obj2) {
    return false;
  }

  if (typeof obj1 === 'object') {
    let item;
    for (item in obj1) {
      if (!deepEquals(obj1[item], obj2[item])) {
        return false; // Recurse for sub-sobjects
      }
    }
    for (let item2 in obj2) {
      if (typeof obj1[item2] === 'undefined') {
        return false;
      }
    }
    return true;
  }
  return obj1 === obj2;
}

function refresh(viewData) {
  const view = getView(viewData);

  // old doc/body filters must be removed unconditionally otherwise the flutter filter stays on after reset
  deleteNodeIfExists(document.querySelector('.' + kSvgDocClassName));
  if (view.doc.svgFilterElt) {
    document.documentElement.appendChild(view.doc.svgFilterElt);
  }

  deleteNodeIfExists(document.querySelector('.' + kSvgBodyClassName));
  if (view.body.svgFilterElt) {
    document.body.appendChild(view.body.svgFilterElt);
  }

  if (typeof view.svgSnowOverlayElt !== 'undefined') {
    const oldOverlay = document.querySelector('.' + kSvgSnowOverlayClassName);
    if (oldOverlay && oldOverlay.animationId) {
      cancelAnimationFrame(oldOverlay.animationId);
    }
    
    deleteNodeIfExists(oldOverlay);
    if (view.svgSnowOverlayElt) {
      document.body.appendChild(view.svgSnowOverlayElt);
    }
  }

  if (typeof view.cloudyOverlayElt !== 'undefined') {
    deleteNodeIfExists(document.querySelector('.' + kCloudyOverlayClassName)); // Delete old one
    if (view.cloudyOverlayElt) {
      document.body.appendChild(view.cloudyOverlayElt);
    }
  }

  if (typeof view.blockerOverlayElt !== 'undefined') {
    deleteNodeIfExists(document.querySelector('.' + kBlockerOverlayClassName)); // Delete old one
    if (view.blockerOverlayElt) {
      document.body.appendChild(view.blockerOverlayElt);
    }
  }

  document.documentElement.style.filter = view.doc.cssFilter;
  document.body.style.filter = view.body.cssFilter;

}

browser.runtime.onMessage.addListener(
  function(request) {

    if (request.type === 'refresh') {
      let viewData = getViewData(request.settings);
     
      if (!deepEquals(viewData, oldViewData)) {
        refresh(viewData); // View data has changed -- re-render
        oldViewData = viewData;
      }
    } 
  });

// (2025-refactor) it seems that CSS filters do not apply to the document canvas in Chrome.
// inject a default background color so that the document canvas does not show through.
function ensureDefaultBackground() {
  const els = [document.documentElement, document.body];
  const isTransparent = el => {
    const { backgroundImage, backgroundColor } = getComputedStyle(el);
    return backgroundImage === 'none' &&
           (backgroundColor === 'transparent' || backgroundColor === 'rgba(0, 0, 0, 0)');
  };

  if (els.every(isTransparent)) {
    document.documentElement.style.backgroundColor = '#ffffff';
  }
}

let isInitialized = false;
  
// (feb-2025-refactor) it has to be a promise to avoid a no-matching-signature error on the extensions page
async function initIfStillNecessaryAndBodyExists() {
  if (document.body && !isInitialized) {
    ensureDefaultBackground();
    await browser.runtime.sendMessage({type: 'getSettings'});
    isInitialized = true;
  }
}
  
setTimeout(initIfStillNecessaryAndBodyExists, 0);

// Refresh once on first load
document.addEventListener('readystatechange', () => {
  initIfStillNecessaryAndBodyExists();
});