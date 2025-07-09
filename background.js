import { executeConfirmLottery } from './automation.js';

// Listen for messages from the popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === 'executeConfirmLottery') {
    executeConfirmLottery(request.selections, sendResponse);
    return true; // Required for asynchronous sendResponse
  }
});

// Listen for the extension icon click
chrome.action.onClicked.addListener(async () => {
  const extensionPageUrl = chrome.runtime.getURL('popup.html');
  const tabs = await chrome.tabs.query({ url: extensionPageUrl });

  if (tabs.length > 0) {
    // If the tab is already open, focus it
    await chrome.tabs.update(tabs[0].id, { active: true });
    await chrome.windows.update(tabs[0].windowId, { focused: true });
  } else {
    // Otherwise, create a new tab
    await chrome.tabs.create({ url: extensionPageUrl });
  }
});