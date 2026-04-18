// had to add this back in because chrome won't let the popup switch tabs/windows while it's still open
// tried doing it directly in popup.js but the focus call didn't do anything
// the background script runs outside the popup so it can actually take over after the popup closes

// chrome.runtime.onMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
chrome.runtime.onMessage.addListener((message) => {
	if (message.action !== 'activate-tab') return

	const { tabId, windowId } = message

	// focus the right window, make the tab active, tell it to enter annotation mode
	// also gets the selector from storage and passes it along so it can scroll to a specific annotation
	// chrome.windows.update: https://developer.chrome.com/docs/extensions/reference/api/windows
	// chrome.tabs.update: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-update  
    // chrome.tabs.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-sendMessage
	chrome.storage.local.get('notate-pending-selector', (stored) => {
		const selector = stored['notate-pending-selector'] || null

		chrome.windows.update(windowId, { focused: true }, () => {
			chrome.tabs.update(tabId, { active: true }, () => {
				chrome.tabs.sendMessage(tabId, { action: 'enter-annotation-mode-scroll', selector }, () => {
					chrome.storage.local.remove(['notate-pending-url', 'notate-pending-selector'])
				})
			})
		})
	})
})