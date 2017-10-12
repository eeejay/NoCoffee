// In background.js:
// React when a browser action's icon is clicked.

/* exported updateSettings */

var gSettings = {};

function updateAllTabs() {
  chrome.tabs.query({}, function(tabs) {
    for (var index = 0; index < tabs.length; index++) {
      let tab = tabs[index];
      browser.tabs.sendMessage(tab.id,
        { type: 'refresh', settings: gSettings }).catch(e => console.warn(e));
    }
  });
}

function updateSettings(settings) {
  gSettings = settings;
  updateAllTabs();
}

browser.runtime.onMessage.addListener(
  function(request, sender) {
    if (request.type === 'getSettings' && window.settings) {
      browser.tabs.sendMessage(sender.tab.id,
        { type: 'refresh', settings: gSettings }).catch(e => console.warn(e));
    }
  });
