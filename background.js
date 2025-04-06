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
  if (request.type === 'getSettings') {
    sendResponse(gSettings);
  }
  if (request.type === 'updateSettings') {
    (async () => {
      await updateSettings(request.settings);
      sendResponse({ success: true });
    })();
  }
  if (request.type === 'updateCursorEffects') {
    (async () => {
      // gSettings = { ...gSettings, applyCursorEffects: request.settings.applyCursorEffects };
      const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (activeTab) {
        await chrome.tabs.sendMessage(activeTab.id, request);
        sendResponse({ success: true });
      }
    })();
  }
  return true;
});