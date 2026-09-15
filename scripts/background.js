importScripts('url-match.js', 'safe-storage.js', 'icons.js')

const pingTab = async (tabId) => {
	await chrome.tabs.sendMessage(tabId, { action: 'notate-ping' })
}

const injectWebpageScript = async (tabId) => {
	await chrome.scripting.executeScript({
		target: { tabId },
		files: ['scripts/url-match.js', 'scripts/safe-storage.js', 'scripts/webpage.js']
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
		'notate-pending-at'
	])
}

const enterOnTab = async (tabId, selector) => {
	const ready = await ensureWebpageScript(tabId)
	if (!ready) return false

	await chrome.tabs.sendMessage(tabId, {
		action: 'enter-annotation-mode-scroll',
		selector: selector || null
	})
	return true
}

const tryEnterPendingOnTab = async (tab) => {
	if (!tab?.id || !tab.url) return

	const stored = await extensionStorageGet([
		'notate-pending-url',
		'notate-pending-selector',
		'notate-pending-at'
	])
	const pendingUrl = stored['notate-pending-url']

	if (!pendingUrl || !isFreshPending(stored) || !pageUrlsMatch(pendingUrl, tab.url)) return

	try {
		const ok = await enterOnTab(tab.id, stored['notate-pending-selector'] || null)
		if (ok) await clearPending()
	} catch {
		// leave pending so a later complete event can retry
	}
}

// chrome.runtime.onMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.action !== 'activate-tab') return

	const { tabId, windowId, selector } = message

	const activateTab = async () => {
		const stored = await extensionStorageGet('notate-pending-selector')
		const nextSelector = selector || stored['notate-pending-selector'] || null

		if (windowId) {
			try {
				await chrome.windows.update(windowId, { focused: true })
			} catch {
				// popup may already have closed; focusing is best-effort
			}
		}

		await chrome.tabs.update(tabId, { active: true })

		try {
			const ok = await enterOnTab(tabId, nextSelector)
			if (ok) await clearPending()
		} catch {
			// content script still missing; tabs.onUpdated can retry
		}
	}

	activateTab().finally(() => sendResponse({ ok: true }))
	return true
})

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
		// iCloud placeholders and missing files fall through to the embedded icon
	}

	try {
		const imageData = {
			16: await imageDataFromDataUri(NOTATE_ICON_16_DATA_URI),
			32: await imageDataFromDataUri(NOTATE_ICON_32_DATA_URI)
		}
		await chrome.action.setIcon({ imageData })
	} catch {
		// leave Chrome's default icon
	}
}

chrome.runtime.onInstalled.addListener(applyToolbarIcon)
chrome.runtime.onStartup.addListener(applyToolbarIcon)
applyToolbarIcon()
