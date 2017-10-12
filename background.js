//In background.js:
// React when a browser action's icon is clicked.

var settings;
var intervalId;

function updateAllTabs() {
    chrome.tabs.query({}, function(tabs) { 
	    for (var index = 0; index < tabs.length; index++ ) {
	    	var tab = tabs[index];
	    	chrome.tabs.sendMessage(tab.id, { type: 'refresh', settings: window.settings }, function(response) {});
	   }
    });
}

function updateSettings(settings) {
	window.settings = settings;
	updateAllTabs();

	if (!window.intervalId) {
        window.intervalId = setInterval(updateAllTabs, 500); // In case zoom changes
    }
}


chrome.extension.onMessage.addListener(
  function(request, sender, sendResponse) {
    if (request.type === "getSettings" && window.settings) {
    	chrome.tabs.sendMessage(sender.tab.id, { type: "refresh", settings: window.settings }, function(response) {});
    }
});
