chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === 'GET_CURRENT_TABS') {
    chrome.tabs.query({ currentWindow: true }, (tabs) => {
      const extensionUrl = chrome.runtime.getURL('');
      const restorableTabs = tabs.filter(tab =>
        tab.url &&
        !tab.url.startsWith('chrome://') &&
        !tab.url.startsWith('chrome-extension://') &&
        !tab.url.startsWith(extensionUrl)
      );

      sendResponse({ tabs: restorableTabs.map(tab => ({
        id: tab.id,
        url: tab.url,
        title: tab.title,
        favIconUrl: tab.favIconUrl,
        index: tab.index
      }))});
    });
    return true;
  }

  if (message.action === 'RESTORE_SESSION') {
    const { urls } = message;
    chrome.windows.create({ url: urls });
    sendResponse({ success: true });
    return true;
  }
});
