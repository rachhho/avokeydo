

chrome.runtime.onInstalled.addListener(()=> {
    chrome.storage.local.set({ showWPMOverlay: true });
});