let tabSettings = new Map();

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

// (2025-refactor) each tab can have its own settings
async function updateActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;

  const settings = tabSettings.get(activeTab.id) || {};
  await chrome.tabs.sendMessage(activeTab.id, {
    type: 'refresh',
    settings: settings
  });
}

async function updateSettings(settings) {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!activeTab) return;
 
  let currentSettings = tabSettings.get(activeTab.id) || {};
  tabSettings.set(activeTab.id, {...currentSettings, ...settings});
 
  await updateActiveTab();
}

// Listen for messages
// (2025-refactor) Must use chrome.runtime (not browser.runtime) to avoid undefined error
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  // (2025-refactor) browser refresh can reset settings (it has to be paired with line 12 in content.js)
  if (request.type === 'browserRefresh' && sender.tab) {
    tabSettings.delete(sender.tab.id);
    sendResponse({ success: true });
    return true;
  }

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
  //   (async () => {
  //     const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
  //     if (activeTab) {
  //       sendResponse(tabSettings.get(activeTab.id) || {});
  //     } else {
  //       sendResponse({});
  //     }
  //   })();
  //   return true;
  // }

  if (request.type === 'getSettings') {
    (async () => {
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        const currentSettings = tabSettings.get(activeTab.id);
        sendResponse(currentSettings || defaultSettings);
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