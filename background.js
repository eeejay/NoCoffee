// Store settings in memory
let gSettings = {};

// Load initial settings when service worker starts
chrome.storage.local.get('settings', (result) => {
  gSettings = result.settings || {};
});

async function updateActiveTab() {
  const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
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
  await chrome.storage.local.set({ settings: gSettings });
  await updateActiveTab();
}

// Listen for messages
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === 'getSettings') {
    sendResponse(gSettings);
  } else if (request.type === 'updateSettings') {
    updateSettings(request.settings);
    sendResponse({ success: true });
  }
  return true;
});