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
chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.type === 'getSettings') {
    sendResponse(gSettings);
  } else if (request.type === 'updateSettings') {
    updateSettings(request.settings);
    sendResponse({ success: true });
  }
  return true;
});