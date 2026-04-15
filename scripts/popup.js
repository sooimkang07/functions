let storageKey = 'notate-annotations'

let list = document.querySelector('#annotation-pages')
let annotateButton = document.querySelector('[data-action="start-annotating"]')

// get the shared saved annotations object the popup and content script both read from 
// chrome.storage.local.get: https://developer.chrome.com/docs/extensions/reference/api/storage
const getStoredAnnotations = async () => {
	const stored = await chrome.storage.local.get(storageKey)
	return stored[storageKey] || {}
}

// get the active tab in the current window so popup actions hit the page you're actually on
// chrome.tabs.query: https://developer.chrome.com/docs/extensions/reference/api/tabs
const getActiveTab = async () => {
	const tabs = await chrome.tabs.query({
		active: true,
		currentWindow: true
	})

	return tabs[0]
}

// send a message from the popup to webpage.js on the active tab
// if the message fails, the pending url in storage acts as the fallback on reload
// chrome.tabs.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/tabs
const sendActionToActiveTab = async (action) => {
	const tab = await getActiveTab()
	if (!tab?.id) return

	await setPendingAnnotationUrl(tab.url)

	try {
		await chrome.tabs.sendMessage(tab.id, { action })
		await chrome.storage.local.remove('notate-pending-url')
	} catch {
		await chrome.tabs.reload(tab.id)
	}
}

// sort saved pages so the most recent ones show first in popup
// Object.values: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/values
// Array.sort: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
const getSortedPages = (storedAnnotations) => {
	return Object.values(storedAnnotations).sort((pageA, pageB) => {
		return (pageB.updatedAt || 0) - (pageA.updatedAt || 0)
	})
}

// single vs plural annotation labeling
// conditional operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
const getAnnotationLabel = (count) => {
	return count === 1 ? 'notation' : 'notations'
}

// turn one saved page object into one list item in the popup
// template literals: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
const createPageItem = (page) => {
	const count = page.annotations.length
	const annotationLabel = getAnnotationLabel(count)

	return `
		<li>
			<button class="popup-page-button" type="button" data-url="${page.url}">
				<span class="popup-page-copy">
					<span class="popup-page-title">${page.title || page.url}</span>
					<span class="popup-page-url">${page.url}</span>
				</span>
				<span class="popup-page-count">${count} ${annotationLabel}</span>
			</button>
		</li>
	`
}

// fallback state if nothing has been saved yet
// Element.innerHTML: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
const renderEmptyState = () => {
	list.innerHTML = `
		<li class="popup-empty-state">No saved notations yet</li>
	`
}

// check if one of the saved urls is already open in another tab
// Array.find: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
// chrome.tabs.query: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-query
const findMatchingTab = async (url) => {
	const tabs = await chrome.tabs.query({})

	return tabs.find((tab) => tab.url === url)
}

// write the url I want to annotate into storage so webpage.js can read it after the page loads
// popup closes before a new tab finishes loading, so need chrome local storage to hold/send the url to webpage.js
// chrome.storage.local.set: https://developer.chrome.com/docs/extensions/reference/api/storage
const setPendingAnnotationUrl = async (url) => {
	await chrome.storage.local.set({ 'notate-pending-url': url })
}

// if the page is already open somewhere, tell background.js to switch to it
// can't do the window/tab focus directly here because chrome blocks it while the popup is still open
// if it's not open, just create a new tab and let the pending url in storage handle the rest
// chrome.runtime.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
// chrome.tabs.create: https://developer.chrome.com/docs/extensions/reference/api/tabs
const activateOrOpenPage = async (url) => {
	const matchingTab = await findMatchingTab(url)

	if (matchingTab?.id) {
		await setPendingAnnotationUrl(url)
		chrome.runtime.sendMessage({ 
			action: 'activate-tab', 
			tabId: matchingTab.id, 
			windowId: matchingTab.windowId 
		})
	} else {
		await setPendingAnnotationUrl(url)
		await chrome.tabs.create({ url })
	}

	window.close()
}

// link each saved-page button
// Element.querySelectorAll: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
const bindPageButtons = () => {
	const buttons = list.querySelectorAll('button')

	buttons.forEach((button) => {
		button.addEventListener('click', async () => {
			await activateOrOpenPage(button.dataset.url)
		})
	})
}

// render annotated pages
// Array.map: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/map
// Array.join: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join
const renderAnnotatedPages = async () => {
	const storedAnnotations = await getStoredAnnotations()
	const pages = getSortedPages(storedAnnotations)

	if (!pages.length) {
		renderEmptyState()
		return
	}

	list.innerHTML = pages.map(createPageItem).join('')
	bindPageButtons()
}

// popup starts annotation mode on the current tab, then closes
// Window.close: https://developer.mozilla.org/en-US/docs/Web/API/Window/close
const onStartAnnotatingClick = async () => {
	await sendActionToActiveTab('enter-annotation-mode')
	window.close()
}

// initial popup load
const initPopup = () => {
	annotateButton.addEventListener('click', onStartAnnotatingClick)
	renderAnnotatedPages()
}

initPopup()