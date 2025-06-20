// TABLE OF CONTENTS:
// 0.  Send browser refresh message ................... ~ Line 22
// 1.  Constants/Variables ............................ ~ Line 24 
// 2.  Custom Cursor Logic ............................ ~ Line 49
//     - SVG Definitions .............................. ~ Line 58
//     - isPointOverText function ..................... ~ Line 93
//     - Shadow DOM Handling .......................... ~ Line 120
//     - Text Cursor Color Computation ................ ~ Line 139
//     - Custom Cursor Detection/Application .......... ~ Line 230
// 3.  Create SVG Filter Functions .................... ~ Line 406
// 4.  Flutter Effect Functions ....................... ~ Line 452
// 5.  Floater Effect Functions ....................... ~ Line 499
// 6.  Cloudy Effect Function ......................... ~ Line 572
// 7.  Blocker Overlay Function ....................... ~ Line 601
// 8.  Snow Overlay Function .......................... ~ Line 675
// 9.  getView Function ............................... ~ Line 725
// 10. getViewData Function ........................... ~ Line 802
// 11. refresh Function ............................... ~ Line 895
// 12. Browser message listener & Initialization ...... ~ Line 944
// 13. Utility Functions .............................. ~ Line 984
//     - getZoom
//     - deleteNodeIfExists
//     - deepEquals
//     - ensureDefaultBackgroundColor

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
const kCursorContainerClassName = 'noCoffeeCursorDiv';

///////////////////////////////////////////////////////////////////
// start of custom cursor logic
///////////////////////////////////////////////////////////////////

// global stylesheet to hide the native cursor when the custom cursor is applied
const customCursorStyle = document.createElement('style');
customCursorStyle.id = 'noCoffeeCustomCursorStyle';
customCursorStyle.textContent = `
  html, body, *, ::-webkit-scrollbar {
    cursor: none !important;
  }
`;

// SVG definitions for arrow (default), pointer, and text cursor types
const cursorSVGs = {
  default: `
    <svg width="32px" height="32px" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
      <path d="M350 280 l390 400 l-174 0 l60 130 l-90 30 l-60 -150 L350 810 V280z" 
            fill="#fff" 
            stroke="#000" 
            stroke-width="16"/>
    </svg>
  `,
  pointer: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0,0,32,32" width="26px" height="26px">
      <path d="m 14.285578,2.8680272 c 1.20794,0.140206 1.496662,0.9677764 1.501053,1.522449 l 0.08708,11.0000008 -0.002,-0.217687 -0.17415,-4.000001 c -0.05974,-1.3721922 0.810952,-1.9483242 1.326905,-2.0013604 1.694183,-0.1741497 2.165713,0.9678214 2.154116,2.0448974 l -0.04354,4.043539 -0.002,-0.04354 0.04354,-4.043538 c 0.01496,-1.3897412 1.461886,-1.2424597 1.849354,-1.217687 0.909693,0.058161 1.667796,1.316108 1.675204,1.870748 l 0.04354,3.259865 -0.04492,0.08708 v -2.391837 c 0,-2.034962 1.461293,-1.52245 1.979966,-1.52245 0.518673,0 1.152755,1.054835 1.152755,1.609525 v 7.8125 c 0,3.46484 -2.545872,6.1875 -5.785733,6.1875 H 18.4396 c -1.369725,0 -5.557257,-1.263576 -7.628243,-3.750595 L 9.1207459,21.473896 C 6.6145548,18.677566 6.52748,16.799988 6.9438751,16.354678 c 0.4163951,-0.44531 1.2611601,-0.61946 1.6775552,-0.17415 l 4.0324807,2.353316 V 3.8680272 c 0,-0.55469 0.721489,-1.1056445 1.631667,-1 z"
            fill="#fff" 
            stroke="#000" 
            stroke-width="0.7"/>
    </svg>
  `,
  text: `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 21 32" 
      width="14px" 
      height="24px" 
      shape-rendering="crispEdges"
    >
      <rect x="0" y="0" width="6" height="2" fill="#000"/>
      <rect x="8" y="0" width="6" height="2" fill="#000"/>
      <rect x="6" y="1" width="2" height="22" fill="#000"/>
      <rect x="0" y="22" width="6" height="2" fill="#000"/>
      <rect x="8" y="22" width="6" height="2" fill="#000"/>
    </svg>
  `
};

// https://stackoverflow.com/questions/10389459/is-there-a-way-to-detect-if-im-hovering-over-text
// one inconsistency: this func returns a text cursor when hovering over an input's label. the browser returns an arrow cursor
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

////////////////////////////////////////////////////////////////////
// start of shadow root logic
const HIDE_BROWSER_CURSOR_IN_SHADOW_ROOT = 'noCoffeeHideBrowserCursor';

function hideBrowserCursorInShadowRoot(shadow) {
  if (shadow[HIDE_BROWSER_CURSOR_IN_SHADOW_ROOT]) return;
  const style = document.createElement('style');
  style.textContent = `
    *, *::before, *::after {
      cursor: none !important;
    }
  `;
  shadow.appendChild(style);
  shadow[HIDE_BROWSER_CURSOR_IN_SHADOW_ROOT] = true;
}
// end of shadow root logic
////////////////////////////////////////////////////////////////////

////////////////////////////////////////////////////////////////////
// start of text cursor color computation

function getLinearizedBgColor(color) {

  let r, g, b, a;

  const rgbMatch = color.match(/rgba?\(([\d.]+), ([\d.]+), ([\d.]+)(?:, ([\d.]+))?\)/);

  if (!rgbMatch) { return null; }

  r = parseInt(rgbMatch[1], 10);
  g = parseInt(rgbMatch[2], 10);
  b = parseInt(rgbMatch[3], 10);
  a = rgbMatch[4] ? parseFloat(rgbMatch[4]) : 1;

  // Normalize RGB values to [0, 1] range
  let normalR = r / 255;
  let normalG = g / 255;
  let normalB = b / 255;

  // Convert from sRGB values to linear values
  // coefficients from https://en.wikipedia.org/wiki/SRGB ( different from https://www.w3.org/WAI/GL/wiki/Relative_luminance )
  r = normalR <= 0.04045 ? normalR / 12.92 : Math.pow((normalR + 0.055) / 1.055, 2.4);
  g = normalG <= 0.04045 ? normalG / 12.92 : Math.pow((normalG + 0.055) / 1.055, 2.4);
  b = normalB <= 0.04045 ? normalB / 12.92 : Math.pow((normalB + 0.055) / 1.055, 2.4);

  return [r, g, b, a];
}

function computeAlphaBlendedRgbValues(el) {
  if (!el) {
    return [1, 1, 1];
  }

  const bgColor = window.getComputedStyle(el).backgroundColor;
  const parsed = getLinearizedBgColor(bgColor);

  if(!parsed) {
    return computeAlphaBlendedRgbValues(el.parentElement);
  }

  let [r, g, b, a] = parsed;

  if (a === 1) {
    return [r, g, b];
  }

  if (a === 0) {
    return computeAlphaBlendedRgbValues(el.parentElement);
  }

  const [parentR, parentG, parentB] = computeAlphaBlendedRgbValues(el.parentElement);
  r = r * a + parentR * (1 - a);
  g = g * a + parentG * (1 - a);
  b = b * a + parentB * (1 - a);

  return [r, g, b];
}

function getRgbInvertedBackgroundColor(el) {
  let [r, g, b] = computeAlphaBlendedRgbValues(el);

  // Convert from linear values back to sRGB values
  const gammaR = r <= 0.0031308 ? 12.92 * r : 1.055 * Math.pow(r, 1/2.4) - 0.055;
  const gammaG = g <= 0.0031308 ? 12.92 * g : 1.055 * Math.pow(g, 1/2.4) - 0.055;
  const gammaB = b <= 0.0031308 ? 12.92 * b : 1.055 * Math.pow(b, 1/2.4) - 0.055;

  // Convert to 0-255 range
  r = Math.max(0, Math.min(1, gammaR)) * 255;
  g = Math.max(0, Math.min(1, gammaG)) * 255;
  b = Math.max(0, Math.min(1, gammaB)) * 255;

  // Return inverted RGB values
  return [
    255 - Math.round(r),
    255 - Math.round(g),
    255 - Math.round(b)
  ];
}

function convertRgbToHex(el) {
  const [r, g, b] = getRgbInvertedBackgroundColor(el);
  const hex = '#' +
      r.toString(16).padStart(2, '0') +
      g.toString(16).padStart(2, '0') +
      b.toString(16).padStart(2, '0');

  return hex;
}

// end of text cursor color computation
///////////////////////////////////////////////////////////////////

let originalCursorType;

function detectCursorType(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
 
  if (element) {
    // Get the original cursor type by temporarily removing the custom cursor
    const tempCursorType = element.style.cursor;
    element.style.cursor = '';

    const browserCursor = window.getComputedStyle(element).cursor;
    // Restore the custom cursor
    element.style.cursor = tempCursorType;

    // Hide browser cursor. Not working for scrollbars
    element.style.cursor = 'none';

    if (originalCursorType !== browserCursor) {
      originalCursorType = browserCursor;
    }
   
    updateCustomCursor(event);
  }
}

function updateCustomCursor(event) {
  const element = document.elementFromPoint(event.clientX, event.clientY);
  const existingCursor = document.querySelector('.' + kCursorContainerClassName);

  if (!existingCursor || !element) return;

  let svgType;

  // this is just so we don’t lose pointer status when hovering over nested elements (like a svg wrapped in a link)
  const isInteractive = element.tagName === 'A' ||
                        element.tagName === 'BUTTON' ||  
                        element.tagName === 'SELECT' ||
                        element.closest('a') ||
                        element.closest('button') ||
                        element.closest('select');

  // isPointOverText function does not detect text in inputs and textareas, so we need to check them separately
  const isText = element.tagName === 'INPUT' || element.tagName === 'TEXTAREA';

  if (originalCursorType.includes('pointer') || isInteractive) {
    svgType = 'pointer';
  } else if (originalCursorType.includes('text') || isPointOverText(event.clientX, event.clientY) || isText) {
    svgType = 'text';
  } else {
    svgType = 'default';
  }

  if (existingCursor) {
    if (svgType === 'text') {
      const hex = convertRgbToHex(element);

      const updatedSVG = cursorSVGs[svgType]
        .replace(/fill="[^"]*"/g, `fill="${hex}"`)
        .replace(/stroke="[^"]*"/g, `stroke="${hex}"`);

      existingCursor.innerHTML = updatedSVG;
    } else {
      existingCursor.innerHTML = cursorSVGs[svgType];
    }
  }
}

// works with browser zooming. NOT working when zooming via a trackpad
function applyCustomCursor(viewData) {
  let existingCursor = document.querySelector('.' + kCursorContainerClassName);
 
  if (existingCursor) {
    existingCursor.remove();
  }
 
  if (!viewData.applyCursorEffects) {
    document.body.style.cursor = '';
    document.documentElement.style.cursor = '';
    const allElements = document.querySelectorAll('*');
    for (const element of allElements) {
      if (element.style.cursor === 'none') {
        element.style.cursor = '';
      }
    }

    // remove the global stylesheet if it exists
    if (document.head.contains(customCursorStyle)) {
      document.head.removeChild(customCursorStyle);
    }

    // Undo the shadow DOM cursor hiding
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        const style = el.shadowRoot.querySelector('style');
        if (style && style.textContent.includes('cursor: none')) {
          style.remove();
        }
        el.shadowRoot[HIDE_BROWSER_CURSOR_IN_SHADOW_ROOT] = false;
      }
    });
    
    document.removeEventListener('mousemove', detectCursorType);
    document.removeEventListener('pointerover', detectCursorType);
    return;
  }

  if (viewData.applyCursorEffects) {
    // find existing shadow roots
    document.querySelectorAll('*').forEach(el => {
      if (el.shadowRoot) {
        hideBrowserCursorInShadowRoot(el.shadowRoot);
      }
    });

    // inject the global stylesheet to hide native cursors
    // this is necessary to prevent native cursors from showing up when a filter is applied (it could happen briefly when a filter is on)
    if (!document.head.contains(customCursorStyle)) {
      document.head.appendChild(customCursorStyle);
    }

    document.body.style.cursor = 'none';
    document.documentElement.style.cursor = 'none';

    const cursor = document.createElement('div');
    cursor.className = kCursorContainerClassName;
    cursor.style.cssText = `
      position: absolute;
      pointer-events: none;
      z-index: 2147483640;
    `;

    document.body.appendChild(cursor);

    function hideCustomCursor() {
      cursor.style.display = 'none';
    }

    function showCustomCursor() {
      cursor.style.display = 'block';
    }

    window.addEventListener('mouseout', e => {
      if (!e.relatedTarget) hideCustomCursor();
    });

    window.addEventListener('mouseover', e => {
      if (!e.relatedTarget) showCustomCursor();
    });

    window.addEventListener('blur',  hideCustomCursor);
    window.addEventListener('focus', showCustomCursor);

    function updatePosition(e) {
      const zoom = getZoom();
      const x = e.clientX + window.scrollX;
      const y = e.clientY + window.scrollY;

      cursor.style.left = `${x}px`;
      cursor.style.top = `${y}px`;
      cursor.style.transform = `translate(-50%, -10%) scale(${1/zoom})`;
      cursor.style.transformOrigin = '0 0';
    }

    document.addEventListener('mousemove', detectCursorType);
    document.addEventListener('pointerover', detectCursorType);
    document.addEventListener('mousemove', updatePosition);
  }
}

// end of custom cursor logic
///////////////////////////////////////////////////////////////////

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

// Computed values based on user settings
function getViewData(settings) {
  let zoom = getZoom();

  // When there is any ghosting, add a little blur
  let blurPlusExtra = settings.blurLevel + (settings.ghostingLevel > 0 ? 3 : 0) + (settings.cloudyLevel / 2.5);

  let viewData = {
    blur: (blurPlusExtra / zoom) / 2,
    contrast: settings.contrastLevel ? 60 - settings.contrastLevel : 100,
    colorMatrixValues: settings.colorDeficiencyMatrixValues,
    // brightness: settings.brightnessLevel * 1.2,
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

  applyCustomCursor(viewData);
}

browser.runtime.onMessage.addListener(
  function(request) {
    if (request.type === 'applyCustomCursor') {
      applyCustomCursor({ applyCursorEffects: request.settings.applyCursorEffects });
    }

    if (request.type === 'refresh') {
      let viewData = getViewData(request.settings);
     
      // flag to determine if cursor effects should be applied
      viewData.applyCursorEffects = request.settings.applyCursorEffects === true;
      // applyCustomCursor({ applyCursorEffects: request.settings.applyCursorEffects });
     
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
    ensureDefaultBackgroundColor();
    await browser.runtime.sendMessage({type: 'getSettings'});
    isInitialized = true;
  }
}
  
setTimeout(initIfStillNecessaryAndBodyExists, 0);

// Refresh once on first load
document.addEventListener('readystatechange', () => {
  initIfStillNecessaryAndBodyExists();
});

//////////////////////////////////////////////////////////////////
// utility functions
//////////////////////////////////////////////////////////////////

function getZoom() {
  return window.outerWidth / window.innerWidth; // Works in Chrome
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

// (2025-refactor) it seems that CSS filters do not apply to the document canvas in Chrome.
// inject a default background color so that the document canvas does not show through.
function ensureDefaultBackgroundColor() {
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