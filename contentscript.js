// TODO:
// - Statistics, info panel
// - Why did Equinox zoom box work ok?
// - Simple vs advanced tab
// - Also affect mouse cursor
// - Option to follow mouse cursor
// - Might be more starfish shaped:
// - Misshapen macular degenation blob, add blur to outside
// - Stargardt's add brightness, some good holes in it, loss of contrast sensitivity

// allows browser refresh to reset the settings
browser.runtime.sendMessage({ type: 'contentScriptLoaded' });

let oldViewData = {};
let flutterCount = 0;

const kSvgDocClassName = 'noCoffeeSvgFilterDoc';
const kSvgBodyClassName = 'noCoffeeSvgFilterBody';
const kSvgOverlayClassName = 'noCoffeeSvgOverlay';
const kBlockerClassName = 'noCoffeeVisionBlockingDiv';
const kCloudyClassName = 'noCoffeeVisionCloudyDiv';
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

const kCursorWrapperClassName = 'noCoffeeCursorWrapper';
const kCustomCursorClassName = 'noCoffeeCustomCursor';

const cursorSVGs = {
  default: `
    <svg width="32px" height="32px" viewBox="0 0 1024 1024" class="icon" version="1.1" xmlns="http://www.w3.org/2000/svg" fill="#000000">
      <g stroke-width="0"/>
      <g stroke-linecap="round" stroke-linejoin="round"/>
      <g>
        <path d="M593.066667 846.933333c-2.133333 0-4.266667 0-8.533334-2.133333s-8.533333-6.4-12.8-10.666667l-78.933333-183.466666-96 89.6c-2.133333 4.266667-6.4 6.4-12.8 6.4-2.133333 0-6.4 0-8.533333-2.133334-6.4-2.133333-12.8-10.666667-12.8-19.2V256c0-8.533333 4.266667-17.066667 12.8-19.2 2.133333-2.133333 6.4-2.133333 8.533333-2.133333 4.266667 0 10.666667 2.133333 14.933333 6.4l341.333334 320c6.4 6.4 8.533333 14.933333 6.4 23.466666-2.133333 8.533333-10.666667 12.8-19.2 14.933334l-134.4 12.8 83.2 181.333333c2.133333 4.266667 2.133333 10.666667 0 17.066667-2.133333 4.266667-6.4 10.666667-10.666667 12.8l-61.866667 27.733333c-4.266667-4.266667-8.533333-4.266667-10.666666-4.266667z" fill="#ffffff"/>
        <path d="M384 256l341.333333 320-164.266666 14.933333 96 209.066667-61.866667 27.733333-91.733333-211.2L384 725.333333V256m0-42.666667c-6.4 0-10.666667 2.133333-17.066667 4.266667-14.933333 6.4-25.6 21.333333-25.6 38.4v469.333333c0 17.066667 10.666667 32 25.6 38.4 6.4 4.266667 12.8 4.266667 17.066667 4.266667 10.666667 0 21.333333-4.266667 29.866667-10.666667l72.533333-68.266666 66.133333 155.733333c4.266667 10.666667 12.8 19.2 23.466667 23.466667 4.266667 2.133333 10.666667 2.133333 14.933333 2.133333 6.4 0 10.666667-2.133333 17.066667-4.266667l61.866667-27.733333c10.666667-4.266667 19.2-12.8 23.466666-23.466667 4.266667-10.666667 4.266667-23.466667 0-32l-70.4-153.6 104.533334-8.533333c17.066667-2.133333 32-12.8 36.266666-27.733333 6.4-14.933333 2.133333-34.133333-10.666666-44.8l-341.333334-320c-6.4-10.666667-17.066667-14.933333-27.733333-14.933334z" fill="#ffffff212121"/>
      </g>
    </svg>
  `,
  pointer: `
    <svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" viewBox="0,0,256,256" width="26px" height="26px" fill-rule="nonzero">
      <g fill="#000000" fill-rule="nonzero" stroke="none" stroke-width="1" stroke-linecap="butt" stroke-linejoin="miter" stroke-miterlimit="10" stroke-dasharray="" stroke-dashoffset="0" font-family="none" font-weight="none" font-size="none" text-anchor="none" style="mix-blend-mode: normal">
        <g transform="scale(8,8)"><path d="M13,2c-1.64453,0 -3,1.35547 -3,3v11.8125l-0.65625,-0.6875l-0.25,-0.21875c-1.15234,-1.15234 -3.03516,-1.15234 -4.1875,0c-1.15234,1.15234 -1.15234,3.03516 0,4.1875v0.03125l8.1875,8.09375l0.0625,0.03125l0.03125,0.0625c1.34766,1.01172 3.06641,1.6875 5,1.6875h1.71875c4.53516,0 8.1875,-3.65234 8.1875,-8.1875v-7.8125c0,-1.64453 -1.35547,-3 -3,-3c-0.42578,0 -0.82031,0.11719 -1.1875,0.28125c-0.32812,-1.30078 -1.51172,-2.28125 -2.90625,-2.28125c-0.76562,0 -1.46875,0.30078 -2,0.78125c-0.53125,-0.48047 -1.23437,-0.78125 -2,-0.78125c-0.35156,0 -0.68359,0.07422 -1,0.1875v-4.1875c0,-1.64453 -1.35547,-3 -3,-3zM13,4c0.55469,0 1,0.44531 1,1v11h2v-4c0,-0.55469 0.44531,-1 1,-1c0.55469,0 1,0.44531 1,1v4h2v-4c0,-0.55469 0.44531,-1 1,-1c0.55469,0 1,0.44531 1,1v4h2.09375v-2c0,-0.55469 0.44531,-1 1,-1c0.55469,0 1,0.44531 1,1v7.8125c0,3.46484 -2.72266,6.1875 -6.1875,6.1875h-1.71875c-1.46484,0 -2.73047,-0.52344 -3.78125,-1.3125l-8.09375,-8c-0.44531,-0.44531 -0.44531,-0.92969 0,-1.375c0.44531,-0.44531 0.92969,-0.44531 1.375,0l4.3125,4.3125v-16.625c0,-0.55469 0.44531,-1 1,-1z"></path>
        </g>
      </g>
    </svg>
  `,
  text: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 256 512" width="10px" height="20px">
      <path d="M.1 29.3C-1.4 47 11.7 62.4 29.3 63.9l8 .7C70.5 67.3 96 95 96 128.3L96 224l-32 0c-17.7 0-32 14.3-32 32s14.3 32 32 32l32 0 0 95.7c0 33.3-25.5 61-58.7 63.8l-8 .7C11.7 449.6-1.4 465 .1 482.7s16.9 30.7 34.5 29.2l8-.7c34.1-2.8 64.2-18.9 85.4-42.9c21.2 24 51.2 40 85.4 42.9l8 .7c17.6 1.5 33.1-11.6 34.5-29.2s-11.6-33.1-29.2-34.5l-8-.7C185.5 444.7 160 417 160 383.7l0-95.7 32 0c17.7 0 32-14.3 32-32s-14.3-32-32-32l-32 0 0-95.7c0-33.3 25.5-61 58.7-63.8l8-.7c17.6-1.5 30.7-16.9 29.2-34.5S239-1.4 221.3 .1l-8 .7C179.2 3.6 149.2 19.7 128 43.7c-21.2-24-51.2-40-85.4-42.9l-8-.7C17-1.4 1.6 11.7 .1 29.3z"/>
    </svg>
  `
};

// When page loads, reset settings
// window.addEventListener('reload', async () => {
//   await browser.runtime.sendMessage({ type: 'pageRefreshed' });
// });

// https://stackoverflow.com/questions/10389459/is-there-a-way-to-detect-if-im-hovering-over-text
function isPointOverText(x, y) {
  const element = document.elementFromPoint(x, y);
  if (element == null) return false;
  const nodes = element.childNodes;
  for (let i = 0, node; (node = nodes[i++]); ) {
      if (node.nodeType === 3) {
          const range = document.createRange();
          range.selectNode(node);
          const rects = range.getClientRects();
          for (let j = 0, rect; (rect = rects[j++]); ) {
              if (
                  x > rect.left &&
                  x < rect.right &&
                  y > rect.top &&
                  y < rect.bottom
              ) {
                  if (node.nodeType === Node.TEXT_NODE) return true;
              }
          }
      }
  }
  return false;
}


let originalCursorType;
function detectCursorType(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
 
  if (element) {
    // Get the original cursor type by temporarily removing our cursor style
    const tempCursorType = element.style.cursor;
    element.style.cursor = '';
    const computedStyle = window.getComputedStyle(element);
    let browserCursor = computedStyle.cursor;
    // Restore our cursor style
    element.style.cursor = tempCursorType;
   
    console.log('Cursor type:', browserCursor);
   
    if (originalCursorType !== browserCursor) {
      originalCursorType = browserCursor;
    }
   
    updateCustomCursor(event);
   
    // Hide cursor on the element. Not working for scrollbars and shadow roots
    element.style.cursor = 'none';
   
  }
}

function updateCustomCursor(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const existingCursor = document.querySelector('.' + kCustomCursorClassName);
 
  if (!existingCursor) return;

  let svgType;

  const isInteractive = element.tagName === 'A' ||
                        element.tagName === 'BUTTON' ||  
                        element.tagName === 'SELECT' ||
                        element.closest('a') ||
                        element.closest('button') ||
                        element.closest('select');

  if (originalCursorType.includes('pointer') || isInteractive) {
    svgType = 'pointer';
  } else if (originalCursorType.includes('text') || isPointOverText(event.clientX, event.clientY)) {
    svgType = 'text';
  } else if (originalCursorType.includes('auto')) {
    svgType = 'default';
  }
 
  if (existingCursor && cursorSVGs[svgType]) {
    existingCursor.innerHTML = cursorSVGs[svgType];
  }
}

function updateCursorEffects(view, viewData) {
  const existingCursor = document.querySelector('.' + kCustomCursorClassName);
 
  if (existingCursor) {
    existingCursor.remove();
  }
 
  if (!viewData.applyCursorEffects) {
    document.body.style.cursor = '';
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element.style.cursor === 'none') {
        element.style.cursor = '';
      }
    }
    
    // Remove existing event handlers
    document.removeEventListener('mousemove', detectCursorType);
    return;
  }
 
  const cursor = document.createElement('div');
  cursor.className = kCustomCursorClassName;
  cursor.style.cssText = `
    position: absolute;
    pointer-events: none;
    z-index: 2147483640;
    transform: translate(-50%, -10%);
  `;
 
  // Apply filters
  let cursorFilters = [];
  if (view.doc.cssFilter) cursorFilters.push(view.doc.cssFilter);
 
  if (viewData.blur) {
    cursorFilters.push(`blur(${viewData.blur}px)`);
  }
  if (viewData.contrast !== 100) {
    cursorFilters.push(`contrast(${viewData.contrast}%)`);
  }
  if (viewData.brightness) {
    cursorFilters.push(`brightness(${viewData.brightness}%)`);
  }
 
  cursor.style.filter = cursorFilters.join(' ');
  document.body.appendChild(cursor);
 
  let lastX = 0;
  let lastY = 0;
  let rafId = null;


  const updatePosition = (e) => {
    lastX = e.clientX;
    lastY = e.clientY;


    if (!rafId) {
      rafId = requestAnimationFrame(() => {
        cursor.style.left = `${lastX + window.scrollX}px`;
        cursor.style.top = `${lastY + window.scrollY}px`;
        rafId = null;
      });
    }
  };
 
  document.addEventListener('mousemove', updatePosition);
  document.addEventListener('mousemove', detectCursorType);
 
  document.addEventListener('mouseenter', () => {
    cursor.style.display = 'block';
  });
 
  document.addEventListener('mouseleave', () => {
    cursor.style.display = 'none';
  });
}


function createSvgFilter(filterMarkup, className) {
  let svgMarkup =
'<svg xmlns="http://www.w3.org/2000/svg" version="1.1">' +
  '<defs>' +
 '<filter id="' + className + Date.now() + '" >' +
   filterMarkup +
 '</filter>' +
   '</defs>' +
'</svg>';

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
  let str = '<feColorMatrix type="matrix" values="' + colorMatrixValues + '" />';
  return str;
}

function getSvgGhostingFilter(ghostingLevel) {
  if (!ghostingLevel) {
    return '';
  }
  let str =
        '<feOffset result="offOut" in="SourceGraphic" dx="' + ghostingLevel + '" dy="0" />' +
        '<feBlend in="SourceGraphic" in2="offOut" mode="multiply" />';
  return str;
}

function getSvgFlutterFilter(flutter) {
  if (!flutter || !flutter.flutterLevel) {
    return '';
  }
  let horizMovement = kFlutterDist / flutter.zoom;
  let str =
        '<feOffset result="offOut" in="SourceGraphic" dx="' + horizMovement + '" dy="0" />';
  return str;
}

function oneFlutter(bodyCssFilter) {
  if (--flutterCount <= 0) {
    stopFluttering();
  }
  document.body.style.filter = document.body.style.filter ? '' : bodyCssFilter;
}

function stopFluttering() {
  document.body.style.filter = '';
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
  let randomized = Math.random() * 1000;
  if (randomized < flutter.flutterLevel) {
    startFluttering(flutter, bodyCssFilter);
  }
}

function initFlutter(flutter, bodyCssFilter) {
  startFluttering(flutter, bodyCssFilter);
  window.addEventListener('scroll', function() { maybeStartFluttering(flutter, bodyCssFilter); });
  window.addEventListener('mousemove', function() { maybeStartFluttering(flutter, bodyCssFilter); });
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

function resetFloaters(blockerDiv, floaters) {
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
    blockerDiv.appendChild(floaterImg);
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
    floaterStyleElt.innerText = '#' + floaterImg.id + ' { ' +
   'top: ' + top + '% !important; ' +
   'left: ' + left + '% !important; ' +
   'transform: rotate(' + newRotation + 'deg) !important;' +
   'transition: all ' + seconds + 's;' +
  '}';

    floaterImg.parentNode.appendChild(floaterStyleElt);
  }, delay * 1000);
}

function createCloudyDiv(cloudy) {
  if (!cloudy || !cloudy.cloudyLevel) {
    return null;
  }
  let cloudyDiv = document.createElement('div');
  cloudyDiv.className = kCloudyClassName;
  let size = 100 * cloudy.zoom;

  let style =
  'z-index:2147483646 !important; ' +
  'transform: scale(' + (1 / cloudy.zoom) + '); ' +
  'transform-origin: 0 0;' +
  'pointer-events: none; ' +
  'position: fixed; left: 0; top: 0; height: ' + size + '%; width: ' + size + '%; ' +
    'background-image: url(' + browser.runtime.getURL('overlays/cataracts.png') + '); ' +
  'background-repeat: no-repeat; background-size: 100% 100%; ' +
  'background-position: 0 0; filter: opacity(' + cloudy.cloudyLevel + '%);';

  cloudyDiv.setAttribute('style', style);
  return cloudyDiv;
}

function createBlockerDiv(block) {
  if (!block) {
    return null;
  }
  let blockerDiv = document.createElement('div');
  blockerDiv.className = kBlockerClassName;
  let style =
  'z-index:2147483646 !important; ' +
  'pointer-events: none; ' +
  'position: fixed; ';
  if (block.image) {
    style += "background-image: url('" + block.image + "'); " +
 'background-repeat: no-repeat; background-size: 100% 100%; ' +
 'left: ' + block.xPosition + '; top: ' + block.yPosition + '; filter: opacity(' + block.opacity + '%);';
    // "filter: url(#noCoffeeDisplacementFilter);
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
  } else if (block.innerStrength) {
    style += 'left: 0; top: 0; height: 100%; width: 100%;';
    if (block.type === 'radial') {
      style += 'background-image: radial-gradient(circle, ' +
     block.innerColor + ' ' + block.innerStrength + '%, ' +
 block.outerColor + ' ' + block.outerStrength + '%);';
    } else {
      // (feb-2025-refactor) side filter not working without -webkit in linear-gradient
      style += 'background-image: -webkit-linear-gradient(left, ' +
     block.innerColor + ' ' + block.innerStrength + '%, ' +
 block.outerColor + ' ' + block.outerStrength + '%);';
    }
  }

  if (block.floaters) {
    resetFloaters(blockerDiv, block.floaters);
  }

  if (block.zoom) {
    let size = 100 * block.zoom;
    style += 'transform: scale(' + 1 / block.zoom + '); transform-origin: 0 0; ' +
 'width: ' + size + '%; height: ' + size + '%; left: 0; top: 0;';
  }

  blockerDiv.setAttribute('style', style);

  return blockerDiv;
}

function createSvgSnowOverlay(snow) {
  if (!snow || !snow.amount) {
    return null;
  }
  let svgOverlay = document.createElement('div');
  svgOverlay.className = kSvgOverlayClassName;
  let size = 100 * snow.zoom;
  let startPos = (100 - size) / 2;
  svgOverlay.setAttribute('style',
    'transform: scale(' + (1 / snow.zoom) + '); ' +
  'z-index:2147483645 !important; ' +
  'pointer-events: none; ' +
  'position: fixed; left: ' + startPos + '%; top: ' + startPos + '%; height: ' + size + '%; width: ' + size + '%; ');
  svgOverlay.innerHTML =
  '<svg xmlns="http://www.w3.org/2000/svg" style="width: 100%; height: 100%" preserveAspectRatio="xMidYMid meet">' +
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
  let view = {
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
  // Needs to go on body element otherwise the filter does not work in Firefox
  let svgColorFilterMarkup = getSvgColorMatrixFilter(viewData.colorMatrixValues);
  if (svgColorFilterMarkup) {
    view.body.svgFilterElt = createSvgFilter(svgColorFilterMarkup, kSvgBodyClassName);
    let id = view.body.svgFilterElt.querySelector('filter').id;
    view.body.cssFilter += 'url(#' + id + ') ';
  }

  // Create new svg ghosting filter -- old one will be removed
  // Ghosting filter needs to go on body -- learned through trial and error. Seems to be a bug in Chrome.
  let svgGhostingFilterMarkup = getSvgGhostingFilter(viewData.ghosting);
  let svgFlutterFilterMarkup = getSvgFlutterFilter(viewData.flutter);
  stopFluttering();
  if (svgGhostingFilterMarkup || svgFlutterFilterMarkup) {
    view.body.svgFilterElt = createSvgFilter(svgFlutterFilterMarkup || svgGhostingFilterMarkup, kSvgBodyClassName);
    let id = view.body.svgFilterElt.querySelector('filter').id;
    view.body.cssFilter += 'url(#' + id + ')';
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
  let zoom = getZoom();

  // When there is any ghosting, add a little blur
  let blurPlusExtra = settings.blurLevel + (settings.ghostingLevel > 0 ? 3 : 0) + (settings.cloudyLevel / 2.5);

  let viewData = {
    blur: (blurPlusExtra / zoom) / 2,
    contrast: settings.contrastLevel ? 60 - settings.contrastLevel : 100,
    colorMatrixValues: settings.colorDeficiencyMatrixValues,
    brightness: settings.brightnessLevel * 1.2,
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
          innerColor: 'rgba(150,150,150,' + (0.9 + settings.blockStrength / 1000) + ')',
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
  let view = getView(viewData);

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

  document.documentElement.style.filter = view.doc.cssFilter;
  document.body.style.filter = view.body.cssFilter;

  updateCursorEffects(view, viewData);
}


browser.runtime.onMessage.addListener(
  function(request) {
    if (request.type === 'refresh') {
      let viewData = getViewData(request.settings);
     
      // Add a flag to determine if cursor effects should be applied
      viewData.applyCursorEffects = request.settings.applyCursorEffects === true;
     
      if (!deepEquals(viewData, oldViewData)) {
        refresh(viewData); // View data has changed -- re-render
        oldViewData = viewData;
      }
    }
  });

let isInitialized = false;
// (feb-2025-refactor) it has to be a promise to avoid a no-matching-signature error on the extensions page
async function initIfStillNecessaryAndBodyExists() {
  if (document.body && !isInitialized) {
    try {
      await browser.runtime.sendMessage({type: 'getSettings'});
      isInitialized = true;
    } catch (error) {
      console.error('Failed to initialize:', error);
    }
  }
}
 
setTimeout(initIfStillNecessaryAndBodyExists, 0);

// Refresh once on first load
document.addEventListener('readystatechange', function() {
  initIfStillNecessaryAndBodyExists();
});