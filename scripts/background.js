importScripts('url-match.js', 'safe-storage.js', 'icons.js')

// had to add this back in because chrome won't let the popup switch tabs/windows while it's still open
// tried doing it directly in popup.js but the focus call didn't do anything
// the background script runs outside the popup so it can actually take over after the popup closes

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})

const pingTab = async (tabId) => {
	await chrome.tabs.sendMessage(tabId, { action: 'notate-ping' })
}

const injectWebpageScript = async (tabId) => {
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ['scripts/url-match.js', 'scripts/safe-storage.js', 'scripts/note-meta.js', 'scripts/webpage.js']
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

const PENDING_MAX_AGE_MS = 15000

const isFreshPending = (stored = {}) => {
	const startedAt = stored['notate-pending-at'] || 0
	return Date.now() - startedAt < PENDING_MAX_AGE_MS
}

const clearPending = async () => {
	await extensionStorageRemove([
		'notate-pending-url',
		'notate-pending-selector',
		'notate-pending-at',
		'notate-pending-mode'
	])
}

const messageForMode = (mode, selector) => {
	if (mode === 'annotate') {
		return selector ? 'enter-annotation-mode-scroll' : 'enter-annotation-mode'
	}

	return selector ? 'enter-preview-mode-scroll' : 'enter-preview-mode'
}

const enterOnTab = async (tabId, selector, mode = 'preview') => {
	const ready = await ensureWebpageScript(tabId)
	if (!ready) return false

	await chrome.tabs.sendMessage(tabId, {
		action: messageForMode(mode, selector),
		selector: selector || null
	})
	return true
}

const tryEnterPendingOnTab = async (tab) => {
	if (!tab?.id || !tab.url) return

	const stored = await extensionStorageGet([
		'notate-pending-url',
		'notate-pending-selector',
		'notate-pending-at',
		'notate-pending-mode'
	])
	const pendingUrl = stored['notate-pending-url']

	if (!pendingUrl || !isFreshPending(stored) || !pageUrlsMatch(pendingUrl, tab.url)) return

	try {
		const ok = await enterOnTab(
			tab.id,
			stored['notate-pending-selector'] || null,
			stored['notate-pending-mode'] === 'annotate' ? 'annotate' : 'preview'
		)
		if (ok) await clearPending()
	} catch {
	}
}

// chrome.runtime.onMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.action !== 'activate-tab') return

	const { tabId, windowId, selector, mode } = message

	const activateTab = async () => {
		const stored = await extensionStorageGet(['notate-pending-selector', 'notate-pending-mode'])
		const nextSelector = selector || stored['notate-pending-selector'] || null
		const nextMode = mode || stored['notate-pending-mode'] || 'preview'

		// focus the right window, make the tab active, tell it to enter annotation mode
		// also gets the selector from storage and passes it along so it can scroll to a specific annotation
		// chrome.windows.update: https://developer.chrome.com/docs/extensions/reference/api/windows
		// chrome.tabs.update: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-update  
	    // chrome.tabs.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-sendMessage
		if (windowId) {
			try {
				await chrome.windows.update(windowId, { focused: true })
			} catch {
			}
		}

		await chrome.tabs.update(tabId, { active: true })

		try {
			const ok = await enterOnTab(tabId, nextSelector, nextMode)
			if (ok) await clearPending()
		} catch {
		}
	}

	activateTab().finally(() => sendResponse({ ok: true }))
	return true
})

// chrome.tabs.onUpdated.addListener https://developer.chrome.com/docs/extensions/reference/api/tabs#event-onUpdated
// chrome.scripting.executeScript https://developer.chrome.com/docs/extensions/reference/api/scripting#method-executeScript
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
	if (changeInfo.status !== 'complete') return
	tryEnterPendingOnTab(tab)
})

const imageDataFromDataUri = async (dataUri) => {
	const response = await fetch(dataUri)
	const blob = await response.blob()
	const bitmap = await createImageBitmap(blob)
	const canvas = new OffscreenCanvas(bitmap.width, bitmap.height)
	const context = canvas.getContext('2d')
	context.drawImage(bitmap, 0, 0)
	return context.getImageData(0, 0, bitmap.width, bitmap.height)
}

const applyToolbarIcon = async () => {
	try {
		const response = await fetch(chrome.runtime.getURL('images/icon-32.png'))
		const blob = await response.blob()
		if (response.ok && blob.size > 50) {
			await chrome.action.setIcon({
				path: {
					16: 'images/icon-16.png',
					32: 'images/icon-32.png',
					48: 'images/icon-48.png',
					128: 'images/icon-128.png'
				}
			})
			return
		}
	} catch {
	}

	try {
		const imageData = {
			16: await imageDataFromDataUri(NOTATE_ICON_16_DATA_URI),
			32: await imageDataFromDataUri(NOTATE_ICON_32_DATA_URI)
		}
		await chrome.action.setIcon({ imageData })
	} catch {
	}
}

chrome.runtime.onInstalled.addListener(() => {
	chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true }).catch(() => {})
	applyToolbarIcon()
})
chrome.runtime.onStartup.addListener(applyToolbarIcon)
applyToolbarIcon()
