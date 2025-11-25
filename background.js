// background.js

// Listen for the global hotkey command
chrome.commands.onCommand.addListener((command) => {
  if (command === 'toggle-pip') {
    togglePipInActiveTab();
  }
});

// Helper to find the active tab and send the toggle message
async function togglePipInActiveTab() {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  
  if (tab && tab.id) {
    // Check if we can inject/communicate with the tab
    if (tab.url.startsWith('chrome://') || tab.url.startsWith('edge://')) {
      console.warn('Cannot inject into system pages.');
      return;
    }

    try {
      await chrome.tabs.sendMessage(tab.id, { action: 'toggle-pip' });
    } catch (error) {
      console.log('Content script might not be ready, injecting now...', error);
      // Optional: Inject script if not present (though manifest handles this for <all_urls>)
      // For now, we assume manifest injection worked.
    }
  }
}
