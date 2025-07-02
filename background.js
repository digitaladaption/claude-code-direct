// Background service worker for Chrome extension
chrome.runtime.onInstalled.addListener(() => {
  console.log('Claude Code Web Annotator installed');
});

// Handle extension icon click (optional - popup handles it)
chrome.action.onClicked.addListener(async (tab) => {
  // This won't fire if we have a popup, but included for completeness
  chrome.tabs.sendMessage(tab.id, { 
    action: 'startAnnotating',
    port: 3180 
  });
});