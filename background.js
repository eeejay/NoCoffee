const defaultSettings = {
  blurLevel: 0,
  contrastLevel: 0,
  brightnessLevel: 0,
  ghostingLevel: 0,
  snowLevel: 0,
  cloudyLevel: 0,
  flutterLevel: 0,
  colorDeficiencyTypeIndex: 0,
  colorDeficiencyMatrixValues: null,
  blockType: 'noBlock',
  blockStrength: 40,
  applyCursorEffects: false
};

async function updateActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;

  // Get settings from storage
  const result = await chrome.storage.local.get(`tab_${activeTab.id}`);
  const settings = result[`tab_${activeTab.id}`] || defaultSettings;
 
  chrome.tabs.sendMessage(activeTab.id, {
    type: 'refresh',
    settings: settings
  })
}

async function updateSettings(settings) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;
 
  // Get current settings from storage
  const result = await chrome.storage.local.get(`tab_${activeTab.id}`);
  const currentSettings = result[`tab_${activeTab.id}`] || {};
 
  // Save to storage
  await chrome.storage.local.set({[`tab_${activeTab.id}`]: {...currentSettings, ...settings}});
 
  await updateActiveTab();
}

// Listen for messages
// (2025-refactor) Must use chrome.runtime (not browser.runtime) to avoid undefined error
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // (2025-refactor) browser refresh can reset settings
  if (request.type === 'browserRefresh' && sender.tab) {
    chrome.storage.local.remove(`tab_${sender.tab.id}`);
  }

  if (request.type === 'applyCustomCursor') {
    (async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!activeTab) return;
     
      const result = await chrome.storage.local.get(`tab_${activeTab.id}`);
      const currentSettings = result[`tab_${activeTab.id}`] || {};
     
      await chrome.storage.local.set({[`tab_${activeTab.id}`]: {
        ...currentSettings,
        applyCursorEffects: request.settings.applyCursorEffects
      }});
     
      await updateActiveTab();
      sendResponse({ success: true });
     
    })();
    return true;
  }

  if (request.type === 'getSettings') {
    (async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        const result = await chrome.storage.local.get(`tab_${activeTab.id}`);
        const settings = result[`tab_${activeTab.id}`] || defaultSettings;
        sendResponse(settings);
      } else {
        sendResponse(defaultSettings);
       
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

// remove settings for the tab when it is closed
chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.remove(`tab_${tabId}`);
});