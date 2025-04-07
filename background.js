let gSettings = {};

async function updateActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;
  try {
    await chrome.tabs.sendMessage(activeTab.id, {
      type: 'refresh',
      settings: gSettings
    });
  } catch (e) {
    console.warn('Error updating tab:', e);
  }
}

async function updateSettings(settings) {
  gSettings = {...gSettings, ...settings};
  await updateActiveTab();
}

// Listen for messages
// Must use chrome.runtime (not browser.runtime) to avoid undefined error
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'contentScriptLoaded') {
    gSettings = {};
    sendResponse({ success: true });
    return true;
  }

  if (request.type === 'updateCursorEffects') {
    gSettings = { ...gSettings, applyCursorEffects: request.settings.applyCursorEffects };
    (async () => {
      await updateActiveTab();
      sendResponse({ success: true });
    })();
    return true;
  }

  if (request.type === 'getSettings') {
    sendResponse(gSettings);
    return true;
  }

  if (request.type === 'updateSettings') {
    (async () => {
      await updateSettings(request.settings);
      sendResponse({ success: true });
    })();
    return true;
  }
  return false;
});


// javascript:(function() {    
//   function toggleIcon() {        
//     let icon = document.getElementById('textSpacingIcon');        
//     if (!icon) {            
//       icon = document.createElement('div');            
//       icon.id = 'textSpacingIcon';            
//       icon.style.cssText = 'position:fixed;top:3px;left:3px;width:43px;height:43px;border-radius:50%;z-index:10000;display:flex;align-items:center;justify-content:center;';                
//       const colors = ['#5dd4e1', '#fcbe22', '#de0265'];             
//       let size = 43;                 
//       colors.forEach(color => {                
//         let circle = document.createElement('div');                
//         circle.style.cssText = '%60position: absolute; width: ${size}px; height: ${size}px; border-radius: 50%; background-color: ${color}; border: 2px solid black; display: flex; align-items: center; justify-content: center;%60;'                
//         icon.appendChild(circle);                
//         size -= 15;             
//       });                
  
//       document.body.appendChild(icon);        
//     } else if (icon) {            
//       icon.remove();            
//       icon = null;        
//     }    
//   }    
//   function applyTextSpacing() {        
//     document.querySelectorAll('*').forEach(function(el) {            
//       el.style.setProperty('line-height', '1.5', 'important');            
//       el.style.setProperty('letter-spacing', '0.12em', 'important');            
//       el.style.setProperty('word-spacing', '0.16em', 'important');            
//       if (el.nodeName.toLowerCase() === 'p') {                
//         el.style.setProperty('margin-bottom', '2em', 'important');            
//       }        
//     });        
    
//     window.isTextSpacingOn = true;    
//   }    
  
//   function removeTextSpacing() {        
//     window.isTextSpacingOn = false;        
//     window.location.reload();    
//   }    
  
//   function toggleTextSpacing() {        
//     if (window.isTextSpacingOn) {            
//       removeTextSpacing();        
//     } else {            
//       applyTextSpacing();        
//     }        
//     toggleIcon();    
//   }    
//   toggleTextSpacing(); 
// })();