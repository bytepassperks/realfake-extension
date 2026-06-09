// Minimal MV3 service worker. The extension runs entirely from the popup;
// this only handles first-install housekeeping.
chrome.runtime.onInstalled.addListener(() => {
  // No-op: all data is bundled and generation happens locally in the popup.
});
