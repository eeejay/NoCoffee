// let gSettings = {};
let tabSettings = new Map();

// async function updateActiveTab() {
//   const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
//   if (!activeTab) return;
//   try {
//     await chrome.tabs.sendMessage(activeTab.id, {
//       type: 'refresh',
//       settings: gSettings
//     });
//   } catch (e) {
//     console.warn('Error updating tab:', e);
//   }
// }
async function updateActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;
  
  const settings = tabSettings.get(activeTab.id) || {};
  await chrome.tabs.sendMessage(activeTab.id, {
    type: 'refresh',
    settings: settings
  });
}

// async function updateSettings(settings) {
//   gSettings = {...gSettings, ...settings};
//   await updateActiveTab();
// }
async function updateSettings(settings) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;
  
  let currentSettings = tabSettings.get(activeTab.id) || {};
  
  tabSettings.set(activeTab.id, {...currentSettings, ...settings});
  
  await updateActiveTab();
}

// Listen for messages
// Must use chrome.runtime (not browser.runtime) to avoid undefined error
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // if (request.type === 'contentScriptLoaded') {
  //   gSettings = {};
  //   sendResponse({ success: true });
  //   return true;
  // }
  // allows browser refresh to reset the settings (it has to be paired with line 12 in content.js)
  // if (request.type === 'contentScriptLoaded' && sender.tab) {
  //   tabSettings.delete(sender.tab.id);
  //   sendResponse({ success: true });
  //   return true;
  // }

  // if (request.type === 'updateCursorEffects') {
  //   gSettings = { ...gSettings, applyCursorEffects: request.settings.applyCursorEffects };
  //   (async () => {
  //     await updateActiveTab();
  //     sendResponse({ success: true });
  //   })();
  //   return true;
  // }
  if (request.type === 'updateCursorEffects') {
    (async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        let currentSettings = tabSettings.get(activeTab.id) || {};
        
        tabSettings.set(activeTab.id, { 
          ...currentSettings, 
          applyCursorEffects: request.settings.applyCursorEffects 
        });
        
        await updateActiveTab();
        sendResponse({ success: true });
      }
    })();
    return true;
  }

  // if (request.type === 'getSettings') {
  //   sendResponse(gSettings);
  //   return true;
  // }
  if (request.type === 'getSettings') {
    (async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        sendResponse(tabSettings.get(activeTab.id) || {});
      } else {
        sendResponse({});
      }
    })();
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

// Clean up settings when tabs are closed
chrome.tabs.onRemoved.addListener((tabId) => {
  tabSettings.delete(tabId);
});