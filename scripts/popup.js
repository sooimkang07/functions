let storageKey = 'notate-annotations'

let list = document.querySelector('#annotation-pages')
let annotateButton = document.querySelector('[data-action="start-annotating"]')

window.addEventListener('unhandledrejection', (event) => {
	const message = String(event.reason?.message || event.reason || '')
	if (!message.includes("reading 'local'")) return

	event.preventDefault()
	renderStatusMessage('Notate could not reach Chrome storage. Reload unpacked from a local folder (not iCloud), then use the toolbar icon.')
})

const setHeaderIcon = () => {
	const icon = document.querySelector('.popup-header-favicon')
	if (!icon) return

	try {
		const fileUrl = chrome?.runtime?.getURL?.('images/icon-32.png')
		if (!fileUrl) return

		const probe = new Image()
		probe.onload = () => {
			icon.src = fileUrl
		}
		probe.src = fileUrl
	} catch {
		// keep the embedded data URI already in index.html
	}
}

const isRestrictedTab = (tab) => {
	const url = tab?.url || ''
	return !/^https?:/.test(url)
}

let bannerIsError = false

const renderStatusMessage = (text) => {
	const banner = document.querySelector('#popup-banner')
	bannerIsError = true
	if (banner) {
		banner.hidden = false
		banner.textContent = text
		return
	}

	if (!list) return

	list.innerHTML = `
		<li class="popup-empty-state">${text}</li>
	`
}

const syncAddNoteAction = async () => {
	const tab = await getActiveTab()
	const pageOk = Boolean(tab?.id) && !isRestrictedTab(tab)

	if (annotateButton) {
		annotateButton.hidden = !pageOk
	}

	const banner = document.querySelector('#popup-banner')
	if (!banner || bannerIsError) return

	if (!pageOk) {
		banner.hidden = false
		banner.textContent = 'Open a website to add a note. New Tab and chrome:// pages cannot be marked.'
		return
	}

	banner.hidden = true
	banner.textContent = ''
}

const escapeHtml = (value = '') => notateEscapeHtml(value)

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

// content scripts do not attach to tabs that were already open before Load unpacked / Reload
// ping first so we do not inject webpage.js twice
const ensureWebpageScript = async (tabId) => {
	try {
		await pingTab(tabId)
		return 'ready'
	} catch {
		try {
			await injectWebpageScript(tabId)
			return 'injected'
		} catch {
			return 'missing'
		}
	}
}

// get the shared saved annotations object the popup and webpage script both read from 
// chrome.storage.local.get: https://developer.chrome.com/docs/extensions/reference/api/storage
const getStoredAnnotations = async () => {
	const stored = await extensionStorageGet(storageKey)
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
	if (!tab?.id) return { ok: false, reason: 'no-tab' }

	if (isRestrictedTab(tab)) {
		return { ok: false, reason: 'restricted' }
	}

	await setPendingAnnotationUrl(tab.url, 'annotate')

	const selectedGroup = await getLibraryGroup()
	const groupName = selectedGroup === NOTATE_UNGROUPED ? '' : notateNormalizeGroup(selectedGroup)
	await extensionStorageSet({ 'notate-pending-group': groupName })

	const scriptState = await ensureWebpageScript(tab.id)

	if (scriptState === 'missing') {
		// last resort: reload so the content script can install on a normal page load
		await chrome.tabs.reload(tab.id)
		return { ok: true, reason: 'reloaded' }
	}

	try {
		// chrome.tabs.sendMessage: https://developer.chrome.com/docs/extensions/reference/api/tabs
		await chrome.tabs.sendMessage(tab.id, { action, group: groupName })
		// Only remove if message was received
		await extensionStorageRemove([
			'notate-pending-url',
			'notate-pending-selector',
			'notate-pending-at',
			'notate-pending-mode'
		])
		return { ok: true }
	} catch {
		// Content script not ready yet so leave pending URL in storage
		// webpage.js will pick it up with initAnnotations() once it loads
		return { ok: true, reason: 'pending' }
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
const createAnnotationButton = (page, annotation, showPage = false, color = annotation.color) => {
	let pageLabel = page.title || page.url
	try {
		pageLabel = new URL(page.url).hostname.replace(/^www\./, '')
	} catch {
	}

	const label = showPage
		? `${escapeHtml(annotation.text)} · ${escapeHtml(pageLabel)}`
		: escapeHtml(annotation.text)

	return `
		<li>
			<button class="popup-annotation-item" type="button" data-url="${escapeHtml(page.url)}" data-selector="${escapeHtml(annotation.selector)}" data-color="${escapeHtml(notateNormalizeColor(color))}" title="${escapeHtml(page.title || page.url)}">${label}</button>
		</li>
	`
}

const createPageItem = (page) => {
	const notes = page.annotations || []
	const count = notes.length
	const origin = new URL(page.url).origin
	const favicon = `https://www.google.com/s2/favicons?domain=${origin}&sz=32`
	const annotations = [...notes].map(notateNormalizeAnnotation).reverse()
	const grouped = notateGroupedAnnotations(annotations)
	const showGroupHeadings = grouped.some(([name]) => name !== NOTATE_UNGROUPED)
	const annotationItems = grouped.map(([name, items]) => {
		const buttons = items.map((annotation) => createAnnotationButton(page, annotation)).join('')
		if (!showGroupHeadings) return buttons

		return `
			<li>
				<h3>${escapeHtml(name)}</h3>
				<ul>
					${buttons}
				</ul>
			</li>
		`
	}).join('')
	// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/join

	return `
		<li class="popup-page-item">
			<section class="popup-page-row">
				<button class="popup-page-button" type="button" data-url="${escapeHtml(page.url)}" aria-current="${page.isCurrent ? 'page' : 'false'}">
					<img class="popup-page-favicon" src="${favicon}" alt="">
					<span class="popup-page-title">${escapeHtml(page.title || page.url)}</span>
				</button>
				<button class="popup-page-toggle" type="button" aria-label="${count === 1 ? '1 note' : `${count} notes`}">
					<span class="popup-page-count">${count}</span>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="currentColor"/></svg>				</button>
			</section>
			<ul class="popup-annotation-list" hidden>
				${annotationItems}
			</ul>
		</li>
	`
}

const createGroupItem = (name, items, open = true) => {
	const count = items.length
	const annotationItems = items.map((item) => {
		return createAnnotationButton(item.page, item, true)
	}).join('')

	return `
		<li class="popup-page-item">
			<section class="popup-page-row">
				<button class="popup-page-button" type="button">
					<span class="popup-page-title">${escapeHtml(name)}</span>
				</button>
				<button class="popup-page-toggle${open ? ' is-open' : ''}" type="button" aria-label="${count === 1 ? '1 note' : `${count} notes`}">
					<span class="popup-page-count">${count}</span>
					<svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path fill-rule="evenodd" clip-rule="evenodd" d="M12.7071 14.7071C12.3166 15.0976 11.6834 15.0976 11.2929 14.7071L6.29289 9.70711C5.90237 9.31658 5.90237 8.68342 6.29289 8.29289C6.68342 7.90237 7.31658 7.90237 7.70711 8.29289L12 12.5858L16.2929 8.29289C16.6834 7.90237 17.3166 7.90237 17.7071 8.29289C18.0976 8.68342 18.0976 9.31658 17.7071 9.70711L12.7071 14.7071Z" fill="currentColor"/></svg>				</button>
			</section>
			<ul class="popup-annotation-list"${open ? '' : ' hidden'}>
				${annotationItems}
			</ul>
		</li>
	`
}

const libraryViewKey = 'notate-library-view'
const libraryGroupKey = NOTATE_LIBRARY_GROUP_KEY
const groupColorsKey = NOTATE_GROUP_COLORS_KEY
const groupOrderKey = NOTATE_GROUP_ORDER_KEY

const getLibraryView = async () => {
	const stored = await extensionStorageGet(libraryViewKey)
	return stored[libraryViewKey] === 'pages' ? 'pages' : 'groups'
}

const setLibraryView = async (view) => {
	await extensionStorageSet({
		[libraryViewKey]: view === 'pages' ? 'pages' : 'groups'
	})
}

const syncLibraryViewButtons = (view) => {
	const groupsButton = document.querySelector('[data-action="view-groups"]')
	const pagesButton = document.querySelector('[data-action="view-pages"]')
	if (groupsButton) groupsButton.setAttribute('aria-pressed', view === 'groups' ? 'true' : 'false')
	if (pagesButton) pagesButton.setAttribute('aria-pressed', view === 'pages' ? 'true' : 'false')
}

const createGroupsLibrary = (storedAnnotations) => {
	const notes = notateFlattenNotes(storedAnnotations)
	const grouped = notateGroupedAnnotations(notes)
	const hasNamed = grouped.some(([name]) => name !== NOTATE_UNGROUPED)

	return grouped.map(([name, items]) => {
		const open = name !== NOTATE_UNGROUPED || !hasNamed
		return createGroupItem(name, items, open)
	}).join('')
}

const getLibraryGroup = async () => {
	const stored = await extensionStorageGet(libraryGroupKey)
	return String(stored[libraryGroupKey] || '')
}

const setLibraryGroup = async (group) => {
	await extensionStorageSet({
		[libraryGroupKey]: String(group || '')
	})
}

const getGroupColors = async () => {
	const stored = await extensionStorageGet(groupColorsKey)
	return stored[groupColorsKey] || {}
}

const getGroupOrder = async () => {
	const stored = await extensionStorageGet(groupOrderKey)
	const order = stored[groupOrderKey]
	return Array.isArray(order)
		? order.map((name) => notateNormalizeGroup(name)).filter(Boolean)
		: []
}

const setGroupOrder = async (order) => {
	await extensionStorageSet({
		[groupOrderKey]: notateOrderGroupNames(order, order)
	})
}

const hideGroupTabMenu = () => {
	const menu = document.querySelector('#group-tab-menu')
	if (!menu) return
	menu.hidden = true
	menu.dataset.group = ''
}

const placeGroupTabMenu = (event, name) => {
	const menu = document.querySelector('#group-tab-menu')
	if (!menu) return

	menu.hidden = false
	menu.dataset.group = name
	const menuWidth = menu.offsetWidth
	const menuHeight = menu.offsetHeight
	const inline = Math.min(event.clientX, window.innerWidth - menuWidth - 8)
	const block = Math.min(event.clientY, window.innerHeight - menuHeight - 8)
	menu.style.insetInlineStart = `${Math.max(8, inline)}px`
	menu.style.insetBlockStart = `${Math.max(8, block)}px`
}

const openGroupEditor = async (name, focusColor = false) => {
	const dialog = document.querySelector('#group-edit-dialog')
	const form = dialog?.querySelector('form')
	const input = form?.querySelector('[name="group-name"]')
	if (!dialog || !form || !input) return

	const colors = await getGroupColors()
	const color = notateResolveGroupColor(name, colors)
	input.value = name
	form.querySelectorAll('[name="group-color"]').forEach((radio) => {
		radio.checked = radio.value === color
	})
	hideGroupTabMenu()
	dialog.returnValue = 'cancel'
	dialog.showModal()
	if (focusColor) {
		form.querySelector('[name="group-color"]:checked')?.focus()
	} else {
		input.focus()
		input.select()
	}

	const onClose = async () => {
		dialog.removeEventListener('close', onClose)
		if (dialog.returnValue !== 'save') return

		const nextName = notateNormalizeGroup(form.querySelector('[name="group-name"]')?.value ?? '')
		const nextColor = notateNormalizeColor(
			form.querySelector('[name="group-color"]:checked')?.value || color
		)
		await saveGroupEdits(name, nextName, nextColor)
	}

	dialog.addEventListener('close', onClose)
}

const saveGroupEdits = async (from, to, color) => {
	const stored = await getStoredAnnotations()
	const colors = await getGroupColors()
	const order = await getGroupOrder()
	const renamed = notateRenameGroup(stored, colors, order, from, to || from)
	if (renamed.error === 'taken') {
		renderStatusMessage('That group name is already used.')
		return
	}
	if (renamed.error === 'empty' || renamed.error === 'missing') return

	const painted = notateApplyGroupColor(renamed.stored, renamed.colors, renamed.selected, color)
	await extensionStorageSet({
		[storageKey]: painted.stored,
		[groupColorsKey]: painted.colors,
		[groupOrderKey]: renamed.order
	})

	const selected = await getLibraryGroup()
	if (selected === from) await setLibraryGroup(renamed.selected)
	renderAnnotatedPages()
}

const deleteNamedGroup = async (name) => {
	const key = notateNormalizeGroup(name)
	if (!key) return
	if (!window.confirm(`Delete “${key}”? Notes stay in All, ungrouped.`)) return

	const stored = await getStoredAnnotations()
	const colors = await getGroupColors()
	const order = await getGroupOrder()
	const next = notateDeleteGroup(stored, colors, order, key)
	await extensionStorageSet({
		[storageKey]: next.stored,
		[groupColorsKey]: next.colors,
		[groupOrderKey]: next.order
	})

	const selected = await getLibraryGroup()
	if (selected === key) await setLibraryGroup('')
	hideGroupTabMenu()
	renderAnnotatedPages()
}

const bindGroupTabMenu = () => {
	const menu = document.querySelector('#group-tab-menu')
	if (!menu || menu.dataset.bound) return

	menu.dataset.bound = 'true'
	menu.addEventListener('click', async (event) => {
		const button = event.target.closest('[data-action]')
		const name = menu.dataset.group || ''
		if (!button || !name) return

		if (button.dataset.action === 'rename-group') {
			await openGroupEditor(name, false)
			return
		}
		if (button.dataset.action === 'recolor-group') {
			await openGroupEditor(name, true)
			return
		}
		if (button.dataset.action === 'delete-group') {
			await deleteNamedGroup(name)
		}
	})

	document.addEventListener('pointerdown', (event) => {
		if (menu.hidden) return
		if (event.target.closest('#group-tab-menu')) return
		hideGroupTabMenu()
	})

	const dialog = document.querySelector('#group-edit-dialog')
	dialog?.querySelector('form')?.addEventListener('submit', (event) => {
		if (event.submitter?.value !== 'save') return
		const input = dialog.querySelector('[name="group-name"]')
		if (notateNormalizeGroup(input?.value ?? '')) return
		event.preventDefault()
		input?.focus()
	})
}

const hideGroupTabs = () => {
	const nav = document.querySelector('.popup-group-tabs')
	if (nav) nav.hidden = true
	hideGroupTabMenu()
}

const clearGroupTabDropState = (menu) => {
	menu?.querySelectorAll('.is-drop-before, .is-drop-after, .is-dragging').forEach((item) => {
		item.classList.remove('is-drop-before', 'is-drop-after', 'is-dragging')
	})
}

const findGroupTabDrop = (menu, clientX) => {
	const items = [...menu.querySelectorAll('li[data-group]')]
	let dropItem = items[0] || null
	let after = false

	items.forEach((item) => {
		const rect = item.getBoundingClientRect()
		if (clientX >= rect.left) {
			dropItem = item
			after = clientX > rect.left + rect.width / 2
		}
	})

	return { dropItem, after }
}

const bindGroupTabDrag = (menu, names) => {
	let drag = null
	let suppressClick = false

	const paintDrop = (clientX) => {
		if (!drag?.started) return

		clearGroupTabDropState(menu)
		drag.item.classList.add('is-dragging')
		const { dropItem, after } = findGroupTabDrop(menu, clientX)
		dropItem?.classList.add(after ? 'is-drop-after' : 'is-drop-before')
	}

	const stopWindowDrag = () => {
		window.removeEventListener('pointermove', onWindowPointerMove)
		window.removeEventListener('pointerup', onWindowPointerUp)
		window.removeEventListener('pointercancel', onWindowPointerCancel)
	}

	const finishDrag = async (event) => {
		if (!drag) return

		const { name, started, pointerId, item } = drag
		const { dropItem, after } = findGroupTabDrop(menu, event.clientX)
		clearGroupTabDropState(menu)
		drag = null
		stopWindowDrag()

		try {
			item.releasePointerCapture(pointerId)
		} catch {
		}

		if (!started || !name) return

		suppressClick = true
		const to = dropItem?.dataset.group || ''
		const next = notateMoveGroupName(names, name, to, after)
		await setGroupOrder(next)
		renderAnnotatedPages()
	}

	const onWindowPointerMove = (event) => {
		if (!drag || event.pointerId !== drag.pointerId) return
		if (!drag.started) {
			if (Math.abs(event.clientX - drag.startX) < 8) return
			drag.started = true
		}

		event.preventDefault()
		paintDrop(event.clientX)
	}

	const onWindowPointerUp = (event) => {
		if (!drag || event.pointerId !== drag.pointerId) return
		finishDrag(event)
	}

	const onWindowPointerCancel = (event) => {
		if (!drag || event.pointerId !== drag.pointerId) return

		const { pointerId, item } = drag
		clearGroupTabDropState(menu)
		drag = null
		stopWindowDrag()

		try {
			item.releasePointerCapture(pointerId)
		} catch {
		}
	}

	menu.querySelectorAll('li[data-group]').forEach((item) => {
		const name = item.dataset.group || ''
		if (!name) return

		item.addEventListener('pointerdown', (event) => {
			if (event.button !== 0) return

			drag = {
				name,
				item,
				started: false,
				startX: event.clientX,
				pointerId: event.pointerId
			}

			try {
				item.setPointerCapture(event.pointerId)
			} catch {
			}

			window.addEventListener('pointermove', onWindowPointerMove, { passive: false })
			window.addEventListener('pointerup', onWindowPointerUp)
			window.addEventListener('pointercancel', onWindowPointerCancel)
		})
	})

	menu.addEventListener('click', (event) => {
		if (!suppressClick) return
		event.preventDefault()
		event.stopImmediatePropagation()
		suppressClick = false
	}, true)
}

const renderGroupTabs = (grouped, selected, colors, order = []) => {
	const nav = document.querySelector('.popup-group-tabs')
	const menu = document.querySelector('#group-tabs')
	if (!nav || !menu) return

	const named = grouped
		.map(([name]) => name)
		.filter((name) => name && name !== NOTATE_UNGROUPED)
	const ordered = notateOrderGroupNames(named, order)
	const tabs = [['', 'All'], ...ordered.map((name) => [name, name])]
	const scroll = nav.scrollLeft

	menu.innerHTML = tabs.map(([value, label]) => {
		const color = value
			? notateResolveGroupColor(value, colors)
			: ''
		const colorAttr = color ? ` data-color="${escapeHtml(color)}"` : ''
		const isSelected = value === selected

		return `
			<li data-group="${escapeHtml(value)}">
				<button type="button" draggable="false" data-action="view-group" data-group="${escapeHtml(value)}" aria-selected="${isSelected ? 'true' : 'false'}"${colorAttr}>${escapeHtml(label)}</button>
			</li>
		`
	}).join('')

	nav.hidden = false
	nav.scrollLeft = scroll
	menu.querySelector('[data-action="view-group"][aria-selected="true"]')?.scrollIntoView({
		inline: 'nearest',
		block: 'nearest'
	})

	menu.querySelectorAll('[data-action="view-group"]').forEach((button) => {
		button.addEventListener('click', async () => {
			await setLibraryGroup(button.dataset.group || '')
			renderAnnotatedPages()
		})
	})

	menu.querySelectorAll('li[data-group]').forEach((item) => {
		const name = item.dataset.group || ''
		if (!name) return

		item.addEventListener('contextmenu', (event) => {
			event.preventDefault()
			placeGroupTabMenu(event, name)
		})
	})

	bindGroupTabDrag(menu, ordered)
	bindGroupTabMenu()
}

// fallback state if nothing has been saved yet
// Element.innerHTML: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
const renderEmptyState = () => {
	hideGroupTabs()
	list.innerHTML = `
		<li class="popup-empty-state">
			<h2>No notes yet</h2>
			<p>Click New, then mark anything on the page.</p>
		</li>
	`
}

// check if one of the saved urls is already open in another tab
// Array.find: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
// chrome.tabs.query: https://developer.chrome.com/docs/extensions/reference/api/tabs#method-query
const findMatchingTab = async (url) => {
	const tabs = await chrome.tabs.query({})

	return tabs.find((tab) => pageUrlsMatch(tab.url, url))
}

// write the url I want to annotate into storage so webpage.js can read it after the page loads
// popup closes before a new tab finishes loading, so need chrome local storage to hold/send the url to webpage.js
// chrome.storage.local.set: https://developer.chrome.com/docs/extensions/reference/api/storage
const setPendingAnnotationUrl = async (url, mode = 'preview') => {
	await extensionStorageSet({
		'notate-pending-url': url,
		'notate-pending-at': Date.now(),
		'notate-pending-mode': mode
	})
}

// if the page is already open somewhere, switch to it and tell webpage.js to enter annotation mode
// await the background message before closing the popup or Chrome drops it
// if it's not open, create a new tab and let pending storage / tabs.onUpdated finish the rest
// selector gets saved to storage so webpage.js can scroll to that specific annotation
const activateOrOpenPage = async (url, selector = null) => {
	if (!url) return

	if (selector) {
		await extensionStorageSet({ 'notate-pending-selector': selector })
	} else {
		await extensionStorageRemove('notate-pending-selector')
	}

	await setPendingAnnotationUrl(url, 'preview')

	const matchingTab = await findMatchingTab(url)

	if (matchingTab?.id) {
		try {
			await chrome.tabs.update(matchingTab.id, { active: true })
		} catch {
		}

		try {
			await chrome.runtime.sendMessage({
				action: 'activate-tab',
				tabId: matchingTab.id,
				windowId: matchingTab.windowId,
				selector,
				url,
				mode: 'preview'
			})
		} catch {
			await ensureWebpageScript(matchingTab.id)
			try {
				await chrome.tabs.sendMessage(matchingTab.id, {
					action: selector ? 'enter-preview-mode-scroll' : 'enter-preview-mode',
					selector
				})
			} catch {
			}
		}
	} else {
		await chrome.tabs.create({ url })
	}
}

// link each annotated page button
// Element.querySelectorAll: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
// page button navigates to the page, arrow toggles the dropdown, annotation items jump to that specific one
const bindPageButtons = () => {
	list.querySelectorAll('.popup-page-button').forEach((button) => {
		button.addEventListener('click', async () => {
			if (button.dataset.url) {
				await activateOrOpenPage(button.dataset.url)
				return
			}

			const toggle = button.closest('.popup-page-item')?.querySelector('.popup-page-toggle')
			toggle?.click()
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
	const notes = notateFlattenNotes(storedAnnotations)
	const grouped = notateGroupedAnnotations(notes)
	const groupNames = new Set(
		grouped
			.map(([name]) => name)
			.filter((name) => name !== NOTATE_UNGROUPED)
	)
	const colors = notateResolveGroupColors(grouped, await getGroupColors())
	let selected = await getLibraryGroup()

	if (selected && !groupNames.has(selected)) {
		selected = ''
		await setLibraryGroup('')
	}

	if (!pages.length) {
		renderEmptyState()
		return
	}

	renderGroupTabs(grouped, selected, colors, await getGroupOrder())

	const visible = selected
		? notes.filter((note) => notateGroupKey(note.group) === selected)
		: notes

	if (!visible.length) {
		list.innerHTML = `
			<li class="popup-empty-state">
				<h2>No notes in this group</h2>
				<p>Switch tabs, or add a note to this group.</p>
			</li>
		`
		return
	}

	list.innerHTML = visible.map((item) => {
		const color = notateResolveGroupColor(item.group, colors, item.color)
		return createAnnotationButton(item.page, item, true, color)
	}).join('')
	bindPageButtons()
}

// popup starts annotation mode on the current tab, then closes
// Window.close: https://developer.mozilla.org/en-US/docs/Web/API/Window/close
const onStartAnnotatingClick = async () => {
	const result = await sendActionToActiveTab('enter-annotation-mode')

	if (result?.reason === 'restricted') {
		renderStatusMessage('Open a website first. New Tab and chrome:// pages cannot be marked.')
		return
	}

	if (result?.ok === false) {
		renderStatusMessage('Notate could not reach this tab. Open a regular website, then click New.')
	}
}

const exportAllAnnotations = async () => {
	const storedAnnotations = await getStoredAnnotations()
	const pages = getSortedPages(storedAnnotations)

	if (!pages.length) {
		renderStatusMessage('Nothing to export yet. Add a note first.')
		return
	}

	const stamp = new Date().toISOString().slice(0, 10)
	notateDownloadJson(notateExportPayload(storedAnnotations), `notate-${stamp}.json`)
}

// clear all annotations across every saved page at once so wipes the entire storage key
// chrome.storage.local.remove: https://developer.chrome.com/docs/extensions/reference/api/storage/StorageArea#method-StorageArea-remove
const clearAllAnnotations = async () => {
	if (!window.confirm('Clear every note? This cannot be undone.')) return

	await extensionStorageRemove(storageKey)
	renderAnnotatedPages()
}

const onboardKey = 'notate-onboarded'
const gsStepCount = 4
let gsStep = 0

const showOnboard = (visible) => {
	const onboard = document.querySelector('#getting-started')
	if (!onboard) return
	onboard.hidden = !visible
	document.body.classList.toggle('is-getting-started', visible)
	if (visible) setGettingStartedStep(gsStep)
}

const setGettingStartedStep = (step) => {
	gsStep = Math.max(0, Math.min(gsStepCount - 1, Number(step) || 0))

	document.querySelectorAll('.gs-step').forEach((btn) => {
		const index = Number(btn.dataset.gsStep)
		const isActive = index === gsStep
		const isDone = index < gsStep
		btn.classList.toggle('is-active', isActive)
		btn.classList.toggle('is-done', isDone)
		if (isActive) btn.setAttribute('aria-current', 'step')
		else btn.removeAttribute('aria-current')
	})

	document.querySelectorAll('.gs-panel').forEach((panel) => {
		const index = Number(panel.dataset.gsPanel)
		const active = index === gsStep
		panel.hidden = !active
		panel.classList.toggle('is-active', active)
	})
}

const dismissOnboard = async () => {
	try {
		await extensionStorageSet({ [onboardKey]: true })
	} catch {
		// still close the panel when storage is unavailable (preview / load errors)
	}
	showOnboard(false)
}

const finishOnboardAndAnnotate = async () => {
	await dismissOnboard()
	if (typeof onStartAnnotatingClick === 'function') {
		await onStartAnnotatingClick()
	}
}

const initOnboard = async () => {
	const forcePreview = /(?:\?|&)onboard=1(?:&|$)/.test(location.search) || location.hash === '#onboard'
	if (forcePreview) {
		showOnboard(true)
		return
	}

	const stored = await extensionStorageGet(onboardKey)
	showOnboard(!stored[onboardKey])
}

const bindGettingStarted = () => {
	document.querySelectorAll('[data-gs-step]').forEach((btn) => {
		btn.addEventListener('click', () => setGettingStartedStep(btn.dataset.gsStep))
	})

	document.querySelectorAll('[data-action="gs-next"]').forEach((btn) => {
		btn.addEventListener('click', () => setGettingStartedStep(gsStep + 1))
	})

	document.querySelector('[data-action="gs-finish"]')?.addEventListener('click', finishOnboardAndAnnotate)
	document.querySelectorAll('[data-action="dismiss-onboard"]').forEach((btn) => {
		btn.addEventListener('click', dismissOnboard)
	})
}

// initial popup load
const initPopup = () => {
	setHeaderIcon()

	if (!getExtensionStorage()) {
		renderStatusMessage('Notate has to run as a loaded Chrome extension, not as a webpage. Load unpacked from a local folder (not iCloud), then use the toolbar icon.')
		renderEmptyState()
		showOnboard(true)
		return
	}

	annotateButton?.addEventListener('click', onStartAnnotatingClick)

	document.querySelector('[data-action="clear-all"]')?.addEventListener('click', clearAllAnnotations)
	document.querySelector('[data-action="export"]')?.addEventListener('click', exportAllAnnotations)
	bindGettingStarted()
	document.querySelector('[data-action="view-groups"]')?.addEventListener('click', async () => {
		await setLibraryView('groups')
		renderAnnotatedPages()
	})

	document.querySelector('[data-action="view-pages"]')?.addEventListener('click', async () => {
		await setLibraryView('pages')
		renderAnnotatedPages()
	})

	initOnboard()
	syncAddNoteAction().catch(() => {})
	renderAnnotatedPages().catch(() => {
		renderStatusMessage('Could not read saved notes. Click Reload on chrome://extensions, and load from a local folder rather than iCloud.')
	})

	chrome.storage?.onChanged?.addListener((changes) => {
		if (changes[storageKey] || changes[libraryViewKey] || changes[libraryGroupKey] || changes[groupColorsKey] || changes[groupOrderKey]) {
			renderAnnotatedPages()
		}
	})

	chrome.tabs?.onActivated?.addListener(() => {
		syncAddNoteAction()
		renderAnnotatedPages()
	})

	chrome.tabs?.onUpdated?.addListener(async (tabId, changeInfo) => {
		if (changeInfo.status !== 'complete' && !changeInfo.url) return
		const tab = await getActiveTab()
		if (tab?.id !== tabId) return
		syncAddNoteAction()
		renderAnnotatedPages()
	})
}

initPopup()