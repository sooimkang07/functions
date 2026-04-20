let storageKey = 'notate-annotations'

let list = document.querySelector('#annotation-pages')
let annotateButton = document.querySelector('[data-action="start-annotating"]')

// get the shared saved annotations object the popup and webpage script both read from 
// chrome.storage.local.get: https://developer.chrome.com/docs/extensions/reference/api/storage
const getStoredAnnotations = async () => {
	const stored = await chrome.storage.local.get(storageKey)
	return stored[storageKey] || {}
}

// get the active tab in the current window so popup actions hit the page I'm actually on
// chrome.tabs.query: https://developer.chrome.com/docs/extensions/reference/api/tabs
const getActiveTab = async () => {
	const tabs = await chrome.tabs.query({
		active: true,
		currentWindow: true
	})

	return tabs[0]
}

// send a message from the popup to webpage.js on the active tab
// had to rabbit hole this because the popup wouldn't always work when i first loaded/clicked on it, so i first googled: https://www.google.com/search?q=chrome+extension+popup+click+does+nothing+first+time&rlz=1C5CHFA_enUS976US983&oq=chrome+extension+popup+click+does+nothing+first+time&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIHCAEQIRigATIHCAIQIRigATIHCAMQIRigATIHCAQQIRigATIHCAUQIRigATIHCAYQIRirAtIBBzI3MWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8 then followed down 4th option of background script issue not listening quick enough, then googled: https://www.google.com/search?q=chrome+extension+content+script+not+ready+first+message&rlz=1C5CHFA_enUS976US983&oq=chrome+extension+content+script+not+ready+first+message&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIHCAEQIRigATIHCAIQIRigATIHCAMQIRigATIHCAQQIRigATIHCAUQIRifBdIBBzIyNWowajeoAgCwAgA&sourceid=chrome&ie=UTF-8 then followed "recommended implementation pattern" section and clicked on this link: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/st_Nh7j3908. also looked up my console error and found this: https://romanisthere.github.io/posts/receiving-end/. then googled this from those forum references: https://www.google.com/search?q=chrome.tabs.sendMessage+try+catch+error+handling&rlz=1C5CHFA_enUS976US983&oq=chrome.tabs.sendMessage+try+catch+error+handling&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIHCAEQIRigATIHCAIQIRigATIHCAMQIRigATIHCAQQIRigATIHCAUQIRiPAtIBBzEzNmowajeoAgCwAgA&sourceid=chrome&ie=UTF-8 and followed "promise-based handling" first option for try/catch function. then found this google group forum to help with the storage fallback: https://groups.google.com/a/chromium.org/g/chromium-extensions/c/BH5_4OKxM3s 
const sendActionToActiveTab = async (action) => {
	const tab = await getActiveTab()
	if (!tab?.id) return

	await setPendingAnnotationUrl(tab.url)

	try {
		// chrome.tabs.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/tabs
		await chrome.tabs.sendMessage(tab.id, { action })
		// Only remove if message was received
		await chrome.storage.local.remove('notate-pending-url')
	} catch {
		// Content script not ready yet so leave pending URL in storage
		// webpage.js will pick it up with initAnnotations() once it loads
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
// const getAnnotationLabel = (count) => {
// 	return count === 1 ? 'notation' : 'notations'
// }

// turn one saved page object into one list item in the popup
// get the favicon from google's favicon service using just the page origin
// googled: https://www.google.com/search?q=grab+favicon+of+url+vanilla+js&sca_esv=298796d921a32d3f&rlz=1C5CHFA_enUS976US983&biw=1710&bih=898&sxsrf=ANbL-n5Bx71MbsMdyv_qO5uiL-1PgfeaDQ%3A1776223936243&ei=wAbfaeLHDqSp5NoPxuzUgQc&ved=0ahUKEwjip4vm9e6TAxWkFFkFHUY2NXAQ4dUDCBM&uact=5&oq=grab+favicon+of+url+vanilla+js&gs_lp=Egxnd3Mtd2l6LXNlcnAiHmdyYWIgZmF2aWNvbiBvZiB1cmwgdmFuaWxsYSBqczIFECEYoAEyBRAhGKABMgUQIRigATIFECEYoAEyBRAhGKABMgUQIRirAkjhAlC4AVi4AXABeAGQAQCYAV2gAV2qAQExuAEDyAEA-AEBmAICoAJlwgIKEAAYRxjWBBiwA5gDAIgGAZAGCJIHATKgB6AFsgcBMbgHY8IHAzAuMsgHAoAIAQ&sclient=gws-wiz-serp, followed to this: https://stackoverflow.com/questions/10282939/how-to-get-favicons-url-from-a-generic-webpage-in-javascript 
// URL: https://developer.mozilla.org/en-US/docs/Web/API/URL/URL
// template literals: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Template_literals
// each annotation is a clickable button with its selector saved in data-selector so I can scroll right to it
// reversed so the most recently added annotation shows up at the top of the dropdown: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/reverse
const createPageItem = (page) => {
	const count = page.annotations.length
	const origin = new URL(page.url).origin
	const favicon = `https://www.google.com/s2/favicons?domain=${origin}&sz=16`
	const annotationItems = [...page.annotations].reverse().map((a) => `
		<li>
			<button class="popup-annotation-item" type="button" data-url="${page.url}" data-selector="${a.selector}">${a.text}</button>
		</li>
	`).join('')
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join

	return `
		<li class="popup-page-item">
			<div class="popup-page-row">
				<button class="popup-page-button" type="button" data-url="${page.url}">
					<img class="popup-page-favicon" src="${favicon}" alt="" width="8" height="8">
					<span class="popup-page-title">${page.title || page.url}</span>
				</button>
				<button class="popup-page-toggle" type="button" aria-label="Toggle annotations">
					<span class="popup-page-count">(${count})</span>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="currentColor"/></svg>				</button>
			</div>
			<ul class="popup-annotation-list" hidden>
				${annotationItems}
			</ul>
		</li>
	`
}

// fallback state if nothing has been saved yet
// Element.innerHTML: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
const renderEmptyState = () => {
	list.innerHTML = `
		<li class="popup-empty-state">No Notated pages</li>
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
// tried doing the window/tab focus directly but couldn't because chrome blocks it while the popup is still open
// if it's not open, just create a new tab and let the pending url in storage handle the rest
// selector gets saved to storage so webpage.js can scroll to that specific annotation
// chrome.runtime.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
// chrome.tabs.create: https://developer.chrome.com/docs/extensions/reference/api/tabs
const activateOrOpenPage = async (url, selector = null) => {
	const matchingTab = await findMatchingTab(url)

	if (selector) {
		await chrome.storage.local.set({ 'notate-pending-selector': selector })
	}

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

// link each annotated page button
// Element.querySelectorAll: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
// page button navigates to the page, arrow toggles the dropdown, annotation items jump to that specific one
const bindPageButtons = () => {
	list.querySelectorAll('.popup-page-button').forEach((button) => {
		button.addEventListener('click', async () => {
			await activateOrOpenPage(button.dataset.url)
		})
	})

	list.querySelectorAll('.popup-page-toggle').forEach((toggle) => {
		const dropdown = toggle.closest('.popup-page-item').querySelector('.popup-annotation-list')

		toggle.addEventListener('click', () => {
			dropdown.hidden = !dropdown.hidden
			toggle.classList.toggle('is-open', !dropdown.hidden)
		})
	})

	list.querySelectorAll('.popup-annotation-item').forEach((button) => {
		button.addEventListener('click', async () => {
			await activateOrOpenPage(button.dataset.url, button.dataset.selector)
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

// clear all annotations across every saved page at once so wipes the entire storage key
// chrome.storage.local.remove: https://developer.chrome.com/docs/extensions/reference/api/storage/StorageArea#method-StorageArea-remove
const clearAllAnnotations = async () => {
	await chrome.storage.local.remove(storageKey)
	renderAnnotatedPages()
}

// initial popup load
const initPopup = () => {
	annotateButton.addEventListener('click', onStartAnnotatingClick)

	const clearAllButton = document.querySelector('[data-action="clear-all"]')
	clearAllButton.addEventListener('click', clearAllAnnotations)

	renderAnnotatedPages()
}

initPopup()