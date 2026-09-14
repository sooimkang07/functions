// had to add this back in because chrome won't let the popup switch tabs/windows while it's still open
// tried doing it directly in popup.js but the focus call didn't do anything
// the background script runs outside the popup so it can actually take over after the popup closes

const pingTab = async (tabId) => {
	await chrome.tabs.sendMessage(tabId, { action: 'notate-ping' })
}

const injectWebpageScript = async (tabId) => {
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ['scripts/webpage.js']
	})
	await chrome.scripting.insertCSS({
		target: { tabId },
		files: ['styles/webpage.css']
	})
}

const ensureWebpageScript = async (tabId) => {
	try {
		await pingTab(tabId)
		return true
	} catch {
		try {
			await injectWebpageScript(tabId)
			return true
		} catch {
			return false
		}
	}
}

// chrome.runtime.onMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.action !== 'activate-tab') return

	const { tabId, windowId } = message

	// focus the right window, make the tab active, tell it to enter annotation mode
	// also gets the selector from storage and passes it along so it can scroll to a specific annotation
	// chrome.windows.update: https://developer.chrome.com/docs/extensions/reference/api/windows
	// chrome.tabs.update: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-update
	// chrome.tabs.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-sendMessage
	const activateTab = async () => {
		const stored = await chrome.storage.local.get('notate-pending-selector')
		const selector = stored['notate-pending-selector'] || null

		await chrome.windows.update(windowId, { focused: true })
		await chrome.tabs.update(tabId, { active: true })
		await ensureWebpageScript(tabId)

		try {
			await chrome.tabs.sendMessage(tabId, {
				action: 'enter-annotation-mode-scroll',
				selector
			})
		} catch {
			// content script still missing (chrome:// page, or files not on disk yet)
		}

		await chrome.storage.local.remove(['notate-pending-url', 'notate-pending-selector'])
	}

	activateTab().finally(() => sendResponse({ ok: true }))
	return true
})
