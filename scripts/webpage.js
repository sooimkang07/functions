// wrap so a second inject (popup ensureWebpageScript) does not redeclare lets or stack listeners
(() => {
	if (globalThis.__notateHasLoaded) return
	globalThis.__notateHasLoaded = true

// ERIC'S DEMO______________________________________________________________________________________
// function renderReadingTime(article) {
//   // If we weren't provided an article, we don't need to render anything.
//   if (!article) {
// 	return;
//   }

//   // get all text in article
//   const text = article.textContent;

//   // divied up text into words
//   const wordMatchRegExp = /[^\s]+/g; // Regular expression
//   const words = text.matchAll(wordMatchRegExp);

//   // matchAll returns an iterator, convert to array to get word count
//   // get length of array aka word count in article
//   const wordCount = [...words].length;

//   // dividing total word count by average reading time of 200 words per min and rounding to nearest whole number to get reading time
//   const readingTime = Math.round(wordCount / 200);

//   // create a badge element to show reading time info
//   const badge = document.createElement("p");
//   // Use the same styling as the publish information in an article's header
//   badge.classList.add("color-secondary-text", "type--notate-caption");
//   badge.textContent = `⏱️ ${readingTime} min read`;

//   // Support for API reference docs
//   const heading = article.querySelector("h1");
//   // Support for article docs with date
//   const date = article.querySelector("time")?.parentNode;

//   (date ?? heading).insertAdjacentElement("afterend", badge);
// }

// renderReadingTime(document.querySelector("article"));



// VARIABLES______________________________________________________________________________________

let activeTarget = null
let modal
let textarea
let form

let annotations = []
let layer
let toolbar

let isAnnotating = false
let isPreviewing = false
let isMoving = false
let noteDrag = null
let noteDidDrag = false
let pendingInteraction = null
let pendingGroup = ''
let lastPointerTarget = null
let lastPointerX = 0
let lastPointerY = 0
let annotatedClass = 'notate-annotated'
let editingAnnotationId = null
let editingBaseline = null
let draftAnnotationId = null
let draftPageUrl = null
// save all current annotations in the browser so they still exist when visiting site later
// Storage.setItem: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem, JSON.stringify: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
// takes annotations array and saves it under storageKey as a string
let storageKey = 'notate-annotations'

// keep one shared saved object in chrome storage so popup and content script can both read it
// chrome.storage.local.get: https://developer.chrome.com/docs/extensions/reference/api/storage, async: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function, await from Eric demo, logical OR operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR
const getStoredAnnotations = async () => {
	const stored = await extensionStorageGet(storageKey)
	return stored[storageKey] || {}
}

// use the current page url as the key for that page's annotation group
// Location.href: https://developer.mozilla.org/en-US/docs/Web/API/Location/href
// keeps each page's saved notes separated by its own url
const getPageKey = (storedAnnotations = {}, url = location.href) => {
	return findStoredPageKey(storedAnnotations, url)
}

// save this page back into the extension storage
// chrome.storage.local.set: https://developer.chrome.com/docs/extensions/reference/api/storage
// stores title, url, annotations, and updatedAt so the popup can sort by recency later


// pull saved annotations back in when the page loads
// chrome.storage.local.get returns the shared annotation object, then this page pulls only its own annotations back out
let annotationLoadVersion = 0
const loadAnnotations = async () => {
	const version = ++annotationLoadVersion
	const url = location.href
	const storedAnnotations = await getStoredAnnotations()
	const pageData = findStoredPage(storedAnnotations, url)
	const colors = await getGroupColors()
	if (version !== annotationLoadVersion || url !== location.href) return

	annotations = (pageData?.annotations || []).map((annotation) => {
		const normalized = notateNormalizeAnnotation(annotation)
		return {
			...normalized,
			color: notateResolveGroupColor(normalized.group, colors, normalized.color)
		}
	})
}

// remove this page's saved record completely when it no longer has any annotations
// delete operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete


// modal resets after save/cancel
// HTMLTextAreaElement.value: https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement#value
// clears textarea.value, activeTarget and editingAnnotationId so nothing carries over
const resetModalState = () => {
	textarea.value = ''
	editingBaseline = null
	draftAnnotationId = null
	form?.querySelector('[data-save-error]')?.remove()
	activeTarget = null
	editingAnnotationId = null
	pendingInteraction = null
}

// close modal
// HTMLDialogElement.close: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close
// resets the modal state first then closes
const closeModal = () => {
	if (!modal) return

	resetModalState()
	showNoteScreen()
	modal.close()
}

const remToPx = () => {
	return 16 // Notate dimensions use CSS pixels; never alter or depend on the host root.
}

const placeModalNear = (element) => {
	if (!modal) return

	if (!element?.isConnected) {
		modal.style.insetBlockStart = '50%'
		modal.style.insetInlineStart = '50%'
		modal.style.translate = '-50% -50%'
		requestAnimationFrame(clampModalToViewport)
		return
	}

	const rem = remToPx()
	const gap = rem / 2
	const rect = element.getBoundingClientRect()
	const modalRect = modal.getBoundingClientRect()
	const fallbackModal = (parseFloat(getComputedStyle(modal).getPropertyValue('--notate-inline-size-modal')) || 352)
	const modalInline = modalRect.width || fallbackModal
	const modalBlock = modalRect.height || fallbackModal
	let insetInline = rect.left
	let insetBlock = rect.bottom + gap

	if (insetInline + modalInline > window.innerWidth - gap) {
		insetInline = Math.max(gap, window.innerWidth - modalInline - gap)
	}

	if (insetBlock + modalBlock > window.innerHeight - gap) {
		insetBlock = Math.max(gap, rect.top - modalBlock - gap)
	}

	modal.style.insetBlockStart = `${Math.round(insetBlock)}px`
	modal.style.insetInlineStart = `${Math.round(insetInline)}px`
	modal.style.translate = '0'
	requestAnimationFrame(clampModalToViewport)
}

const clampModalToViewport = () => {
	if (!modal?.open) return

	const rem = remToPx()
	const gap = rem / 2
	const rect = modal.getBoundingClientRect()
	const maxInline = Math.max(gap, window.innerWidth - rect.width - gap)
	const maxBlock = Math.max(gap, window.innerHeight - rect.height - gap)
	const inline = Math.min(Math.max(rect.left, gap), maxInline)
	const block = Math.min(Math.max(rect.top, gap), maxBlock)

	modal.style.insetInlineStart = `${Math.round(inline)}px`
	modal.style.insetBlockStart = `${Math.round(block)}px`
	modal.style.translate = '0'
}

const scaleNoteType = (text = '', element) => {
	if (!element) return

	element.style.setProperty('--notate-note-len', String(text.length))
}

const confirmClear = () => {
	return notateConfirm({ title: 'Clear all on this page?', message: 'This deletes every note on this page only. Notes on other pages are kept. This cannot be undone.' })
}

const syncModalCopy = () => {
	if (!modal) return

	const heading = modal.querySelector('h2')
	const hint = modal.querySelector('form > p')

	if (heading) {
		heading.textContent = editingAnnotationId ? 'Edit note' : 'New note'
	}

	if (hint) {
		hint.textContent = editingAnnotationId
			? 'Update why this mattered.'
			: 'Write why it mattered.'
	}
}

const readChosenGroup = () => {
	const choice = form?.querySelector('[name="annotation-group-choice"]')?.value ?? ''
	const typed = notateNormalizeGroup(form?.querySelector('[name="annotation-group"]')?.value ?? '')

	if (choice === NOTATE_NEW_GROUP) return typed
	return notateNormalizeGroup(choice)
}

const draftGroupColors = new Map()

// Lucide folder-plus, ISC license; see images/LUCIDE-LICENSE.txt.
const groupPlusIcon = '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 10v6"/><path d="M9 13h6"/><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>'
let pickerFolderColors = {}
const syncGroupPicker = () => {
	const select = form?.querySelector('[name="annotation-group-choice"]')
	const trigger = form?.querySelector('[data-action="choose-group"]')
	const menu = form?.querySelector('.notate-group-menu')
	if (!select || !trigger || !menu) return
	trigger.innerHTML = groupPlusIcon
	const name = select.value
	const selected = Boolean(name && name !== NOTATE_NEW_GROUP)
	trigger.hidden = selected
	menu.classList.toggle('has-selection', selected)
	const scroll = menu.scrollLeft
	const options = [...select.options].filter(option => option.value && option.value !== NOTATE_NEW_GROUP && (!selected || option.value === name))
	menu.innerHTML = options.map(option => {
		const color = pickerFolderColors[option.value] || draftGroupColors.get(option.value) || NOTATE_COLOR_DEFAULT
		return `<button type="button" data-group-choice="${notateEscapeHtml(option.value)}" data-color="${notateEscapeHtml(color)}" aria-pressed="${option.value === name}" title="${option.value === name ? 'Selected folder' : 'Add to folder'}">${notateEscapeHtml(option.textContent)}</button>`
	}).join('')
	if (selected) menu.insertAdjacentHTML('beforeend', '<button type="button" class="notate-folder-remove" data-group-choice="" aria-label="Remove from folder">×</button>')
	menu.scrollLeft = scroll
}

const noteScreen = () => form?.querySelector('[data-screen="note"]')
const groupScreen = () => form?.querySelector('[data-screen="group"]')
const noteActions = () => form?.querySelector('[data-note-actions]')
const groupActions = () => form?.querySelector('[data-group-actions]')

const showNoteScreen = () => {
	if (!form) return

	form.dataset.screen = 'note'
	modal.dataset.screen = 'note'
	syncGroupPicker()
	if (noteScreen()) noteScreen().hidden = false
	if (groupScreen()) groupScreen().hidden = true
	if (noteActions()) noteActions().hidden = false
	if (groupActions()) groupActions().hidden = true
}

const showGroupScreen = () => {
	if (!form) return

	form.dataset.screen = 'group'
	modal.dataset.screen = 'group'
	if (noteScreen()) noteScreen().hidden = true
	if (groupScreen()) groupScreen().hidden = false
	if (noteActions()) noteActions().hidden = true
	if (groupActions()) groupActions().hidden = false
	form.querySelector('[name="annotation-group"]')?.focus()
}

const confirmNewGroup = () => {
	const select = form?.querySelector('[name="annotation-group-choice"]')
	const nameInput = form?.querySelector('[name="annotation-group"]')
	const name = notateNormalizeGroup(nameInput?.value ?? '')
	if (!select || !nameInput) return false
	if (!name) {
		nameInput.focus()
		return false
	}

	const exists = [...select.options].some((option) => option.value === name)
	if (!exists) {
		const option = document.createElement('option')
		option.value = name
		option.textContent = name
		select.insertBefore(option, select.options[1] || null)
	}

	if (!exists) {
		draftGroupColors.set(name, notateNormalizeColor(form.querySelector('[name="annotation-color"]:checked')?.value))
	}
	select.value = name
	nameInput.value = name
	showNoteScreen()
	syncGroupColorFromName()
	return true
}

const fillGroupOptions = async (preferred = '') => {
	const select = form?.querySelector('[name="annotation-group-choice"]')
	const nameInput = form?.querySelector('[name="annotation-group"]')
	if (!select) return

	const stored = await getStoredAnnotations()
	const colors = await getGroupColors()
	pickerFolderColors = colors
	const timestamps = await extensionStorageGet(NOTATE_FOLDER_CREATED_KEY)
	const names = notateFoldersNewestFirst(stored, colors, timestamps[NOTATE_FOLDER_CREATED_KEY] || {})
	const preferredName = notateNormalizeGroup(preferred)
	const namedOptions = names.map((name) => {
		return `<option value="${notateEscapeHtml(name)}">${notateEscapeHtml(name)}</option>`
	})

	select.innerHTML = [
		'<option value="" hidden></option>',
		...namedOptions,
		`<option value="${NOTATE_NEW_GROUP}">New group</option>`
	].join('')

	if (preferredName && names.includes(preferredName)) {
		select.value = preferredName
		if (nameInput) nameInput.value = preferredName
		showNoteScreen()
	} else if (preferredName) {
		select.value = NOTATE_NEW_GROUP
		if (nameInput) nameInput.value = preferredName
		showGroupScreen()
	} else {
		select.value = ''
		if (nameInput) nameInput.value = ''
		showNoteScreen()
	}
}

const getGroupColors = async () => {
	const stored = await extensionStorageGet(NOTATE_GROUP_COLORS_KEY)
	return stored[NOTATE_GROUP_COLORS_KEY] || {}
}



const syncLocalGroupColor = (group, color) => {
	const name = notateNormalizeGroup(group)
	if (!name) return

	const nextColor = notateNormalizeColor(color)

	annotations.forEach((annotation) => {
		if (notateNormalizeGroup(annotation.group) === name) {
			annotation.color = nextColor
		}
	})

	document.querySelectorAll('.notate-note').forEach((note) => {
		const annotation = getAnnotationById(note.dataset.id)
		if (annotation && notateNormalizeGroup(annotation.group) === name) {
			note.dataset.color = nextColor
		}
	})
}

const syncGroupColorFromName = async () => {
	const name = readChosenGroup()
	if (!form) return
	if (!name) {
		if (modal) modal.dataset.color = 'neutral'
		return
	}

	const colors = await getGroupColors()
	const color = colors[name] || draftGroupColors.get(name) || NOTATE_COLOR_DEFAULT

	form.querySelectorAll('[name="annotation-color"]').forEach((input) => {
		input.checked = input.value === color
	})
	if (modal) modal.dataset.color = notateNormalizeColor(color)
}

const syncModalFields = async (annotation) => {
	draftGroupColors.clear()
	const preferredGroup = annotation?.group ?? pendingGroup ?? ''
	await fillGroupOptions(preferredGroup)

	const colors = await getGroupColors()
	const groupName = readChosenGroup()
	const color = notateResolveGroupColor(groupName, colors, annotation?.color)
	modal.dataset.color = groupName ? color : 'neutral'

	form.querySelectorAll('[name="annotation-color"]').forEach((input) => {
		input.checked = input.value === color
	})

	const interaction = notateNormalizeInteraction(annotation?.interaction || pendingInteraction || {}, activeTarget)
	form.querySelectorAll('[name="annotation-state"]').forEach((input) => {
		input.checked = input.value === interaction.kind
	})
}

const readModalMeta = () => {
	const current = editingAnnotationId ? getAnnotationById(editingAnnotationId) : null

	return {
		text: textarea.value.trim(),
		color: notateNormalizeColor(
			form.querySelector('[name="annotation-color"]:checked')?.value || current?.color
		),
		group: readChosenGroup(),
		interaction: notateNormalizeInteraction({
			kind: form.querySelector('[name="annotation-state"]:checked')?.value
				|| current?.interaction?.kind
				|| pendingInteraction?.kind,
			cursor: pendingInteraction?.cursor || current?.interaction?.cursor || notateReadCursor(activeTarget),
			scrollY: pendingInteraction?.scrollY ?? current?.interaction?.scrollY ?? Math.round(window.scrollY)
		}, activeTarget)
	}
}

const inferStateKind = (element, event = {}) => {
	if (event.shiftKey) return 'cursor'
	if (event.buttons) return 'active'
	if (element && document.activeElement === element) return 'focus'
	return 'hover'
}

const captureLiveInteraction = (element, kind) => {
	return notateNormalizeInteraction({
		kind,
		cursor: notateReadCursor(element),
		scrollY: Math.round(window.scrollY)
	}, element)
}

const pointerTargetAt = (x, y) => {
	const hit = document.elementFromPoint(x, y)
	if (!hit || isBlockedHoverTarget(hit) || isRootHoverTarget(hit)) return null
	return hit
}

const openCaptureModal = (kind, event = {}) => {
	const target = lastPointerTarget?.isConnected
		? lastPointerTarget
		: pointerTargetAt(event.clientX ?? lastPointerX, event.clientY ?? lastPointerY)
	if (!target) return

	pendingInteraction = captureLiveInteraction(target, kind)
	openCreateModal(target).catch(showPageOperationError)
}

// open modal to create a new annotation
// HTMLDialogElement.showModal: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
// stores the clicked target in activeTarget, clears edit mode, opens modal
const openCreateModal = async (target) => {
	draftPageUrl = location.href
	createModal()
	const missingNotice = modal.querySelector('[data-missing-target]')
	if (missingNotice) missingNotice.hidden = true

	activeTarget = target
	editingAnnotationId = null
	textarea.value = ''
	scaleNoteType('', textarea)
	await syncModalFields({ group: pendingGroup })
	syncModalCopy()
	modal.showModal()
	placeModalNear(target)
}

// open the modal with an existing annotation
// Document.querySelector: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector, HTMLDialogElement.showModal: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
// uses annotation.selector, annotation.id, and annotation.text to reopen the right note in edit mode
const openEditModal = (annotation) => {
	if (!annotation?.id || modal?.open) return
	createModal()

	editingAnnotationId = annotation.id
	editingBaseline = structuredClone(annotation)
	draftPageUrl = location.href
	// A saved target may disappear or have an invalid legacy selector.
	// Retain the target for editing, but always center the saved-note editor.
	activeTarget = null
	try {
		activeTarget = annotation.selector ? resolveAnnotationTarget(annotation.selector) : null
	} catch {
	}
	const missingNotice = modal.querySelector?.('[data-missing-target]')
	if (missingNotice) missingNotice.hidden = Boolean(activeTarget)
	textarea.value = annotation.text
	scaleNoteType(annotation.text, textarea)
	syncModalFields(annotation)
	syncModalCopy()
	modal.showModal()
	placeModalNear(null)
}

// place clear and exit buttons in toolbar when annotation mode is on
// Document.createElement: https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement, Element.append: https://developer.mozilla.org/en-US/docs/Web/API/Element/append
// builds #notate-toolbar, fills it with the two buttons, inserts it into document.body to show up on page
const createToolbar = () => {
	if (!toolbar) {
		toolbar = document.createElement('aside')
		toolbar.id = 'notate-toolbar'

		toolbar.innerHTML = `
			<p></p>
			<menu class="notate-toolbar-group">
				<li><button class="notate-toolbar-button" type="button" data-action="clear">Clear all</button></li>
				<li><button class="notate-toolbar-button" type="button" data-action="exit" aria-keyshortcuts="Escape" title="Done (Esc)">Done <kbd aria-hidden="true">Esc</kbd></button></li>
				<li><button class="notate-toolbar-button" type="button" data-action="edit"><svg width="28" height="28" viewBox="0 0 28 28" fill="currentColor" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
				<path d="M3.72742e-06 21.793V7.67287C3.68474e-06 6.87388 -0.00130053 6.18396 0.0449256 5.61818C0.0925983 5.03506 0.198475 4.45279 0.484379 3.89162C0.910162 3.05594 1.58919 2.37607 2.42481 1.95021C2.98611 1.66422 3.56909 1.55842 4.15235 1.51076C4.71814 1.46453 5.40803 1.46584 6.20704 1.46584H11.7959C12.6242 1.46584 13.2957 2.13755 13.2959 2.96584C13.2959 3.79427 12.6243 4.46584 11.7959 4.46584H6.20704C5.35852 4.46584 4.81178 4.46706 4.39649 4.501C3.99895 4.5335 3.85503 4.58846 3.78711 4.62307C3.51593 4.76124 3.29544 4.98184 3.15723 5.25295C3.12261 5.32089 3.06766 5.46552 3.03516 5.8633C3.00126 6.27854 3 6.82462 3 7.67287V21.793C3 22.6415 3.00123 23.1882 3.03516 23.6035C3.06766 24.0011 3.12262 24.145 3.15723 24.2129C3.29542 24.4841 3.51588 24.7046 3.78711 24.8428C3.855 24.8774 3.99899 24.9324 4.39649 24.9649C4.81176 24.9988 5.35852 25 6.20704 25H20.3272C21.1754 25 21.7215 24.9988 22.1367 24.9649C22.534 24.9324 22.6782 24.8774 22.7461 24.8428H22.7471C23.0183 24.7045 23.2389 24.4839 23.377 24.2129C23.4116 24.1449 23.4665 24.0009 23.499 23.6035C23.533 23.1882 23.5342 22.6415 23.5342 21.793V15.4688C23.5342 14.6403 24.2058 13.9688 25.0342 13.9688C25.8625 13.9689 26.5342 14.6404 26.5342 15.4688V21.793C26.5342 22.592 26.5355 23.2819 26.4893 23.8477C26.4476 24.3581 26.3609 24.8678 26.1484 25.3633L26.0498 25.5752C25.6239 26.411 24.944 27.0899 24.1084 27.5156C23.5472 27.8016 22.9649 27.9074 22.3818 27.9551C21.816 28.0013 21.1262 28 20.3272 28H6.20704C5.40803 28 4.71816 28.0013 4.15235 27.9551C3.56906 27.9074 2.98614 27.8017 2.42481 27.5156C1.58937 27.0899 0.910156 26.4106 0.484379 25.5752C0.198394 25.0139 0.0925877 24.4309 0.0449256 23.8477C-0.00130114 23.2819 3.72742e-06 22.592 3.72742e-06 21.793ZM20.165 1.3008C21.8995 -0.433628 24.7118 -0.433572 26.4463 1.3008C28.181 3.03542 28.181 5.84841 26.4463 7.58303L16.3535 17.6758C15.2698 18.7597 14.6044 19.4322 13.833 19.9707C13.1702 20.4336 12.4555 20.8165 11.7041 21.1123C10.8287 21.457 9.90043 21.6392 8.39844 21.9424H8.39746L7.67969 22.0869C7.20216 22.1831 6.70767 22.0415 6.35352 21.7071C5.99932 21.3725 5.82955 20.8866 5.89844 20.4043L5.96875 19.916C6.20766 18.2438 6.34786 17.2102 6.6875 16.2344C6.97912 15.3965 7.37792 14.6001 7.87305 13.8643C8.4499 13.0071 9.19225 12.2746 10.3867 11.0801L20.165 1.3008ZM12.5078 13.2012C11.2328 14.4762 10.7396 14.9785 10.3623 15.5391C10.0109 16.0613 9.72834 16.6264 9.52149 17.2207C9.38422 17.6151 9.29374 18.032 9.18262 18.7139C9.84417 18.5699 10.236 18.4668 10.6055 18.3213C11.1391 18.1112 11.6456 17.8387 12.1152 17.5108H12.1162C12.6207 17.1586 13.0761 16.7112 14.2324 15.5547V15.5537L20.4531 9.33205L18.4141 7.29299L12.5078 13.2012ZM24.3252 3.42189C23.7623 2.85918 22.8491 2.85896 22.2861 3.42189L20.5352 5.17189L22.5742 7.21096L24.3252 5.46096C24.8882 4.89793 24.8883 3.98491 24.3252 3.42189Z" fill="currentColor"/>
				</svg><span>New</span></button></li>
			</menu>
		`

		toolbar.setAttribute('aria-label', 'Notate')
		document.body.append(toolbar)
	}

	refreshToolbar()
}

const refreshToolbar = () => {
	if (!toolbar) return

	toolbar.classList.toggle('notate-is-previewing', isPreviewing)
	toolbar.classList.toggle('notate-is-annotating', isAnnotating)
	toolbar.classList.toggle('notate-is-moving', isMoving)
	const exit = toolbar.querySelector('[data-action="exit"]')
 if (exit) {
  exit.innerHTML = `${isAnnotating ? 'Done' : 'Exit Notate'} <kbd aria-hidden="true">Esc</kbd>`
  exit.title = isAnnotating ? 'Done selecting (Esc)' : 'Exit Notate (Esc)'
 }
 const create = toolbar.querySelector('[data-action="edit"]')
 if (create) create.setAttribute('aria-pressed', String(isAnnotating))

	const status = toolbar.querySelector(':scope > p')
	if (status) {
		if (isMoving) {
			status.textContent = 'Drag to move'
		} else if (isAnnotating) {
			status.textContent = ''
		} else {
			status.textContent = ''
		}
	}

}

// remove toolbar when annotate mode off
// Element.remove: https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
const removeToolbar = () => {
	if (!toolbar) return

	toolbar.remove()
	toolbar = null
}

// one parent parent layer holds all notes
// Document.createElement: https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement, HTMLElement.hidden: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/hidden
// builds #notate-layer, hides it by default, puts it to the page
const createLayer = () => {
	if (layer) return

	layer = document.createElement('aside')
	layer.id = 'notate-layer'
	layer.hidden = true

	document.body.append(layer)
}

// insert cancel and save buttons through html in the modal
// dialog element: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/dialog
const createModal = () => {
	if (modal) return

	modal = document.createElement('dialog')
	modal.id = 'notate-modal'

	modal.innerHTML = `
		<form method="dialog">
			<section data-screen="note">
				<p data-missing-target role="status" hidden><strong>Original element unavailable</strong><br>The page may have changed. Your note is saved, and you can still edit it here.</p>
				<textarea id="annotation-text" name="annotation-text" aria-label="New note" placeholder="New note"></textarea>
				<div class="notate-group-picker">
					<select name="annotation-group-choice" aria-label="Choose a folder" hidden></select>
					<button type="button" data-action="choose-group" aria-label="New folder" title="New folder"></button>
					<div class="notate-group-menu" aria-label="Folders"></div>
				</div>
			</section>
			<section data-screen="group" hidden>
				<input name="annotation-group" placeholder="Folder name" aria-label="Folder name" autocomplete="off">
			<fieldset>
				<legend>Color</legend>
				<label data-color="yellow">
					<input type="radio" name="annotation-color" value="yellow" aria-label="Yellow" checked>
				</label>
				<label data-color="mint">
					<input type="radio" name="annotation-color" value="mint" aria-label="Mint">
				</label>
				<label data-color="sky">
					<input type="radio" name="annotation-color" value="sky" aria-label="Sky">
				</label>
				<label data-color="peach">
					<input type="radio" name="annotation-color" value="peach" aria-label="Peach">
				</label>
				<label data-color="lilac">
					<input type="radio" name="annotation-color" value="lilac" aria-label="Lilac">
				</label>
				<label data-color="rose">
					<input type="radio" name="annotation-color" value="rose" aria-label="Rose">
				</label>
			</fieldset>
			</section>
			<menu data-note-actions>
				<li>
					<button type="submit" name="intent" value="cancel">Cancel</button>
				</li>
				<li>
					<button type="submit" name="intent" value="save" aria-keyshortcuts="Meta+Enter Control+Enter" title="Save (⌘ Enter / Ctrl Enter)">Save <kbd aria-hidden="true">⌘ ↵</kbd></button>
				</li>
			</menu>
			<menu data-group-actions hidden>
				<li>
					<button type="button" data-action="back-note">Back</button>
				</li>
				<li>
					<button type="button" data-action="confirm-group">Save</button>
				</li>
			</menu>
		</form>
	`

	// so that the modal is part of the page and can be interacted with, instead of just being created in the background and not showing up
	document.body.append(modal)

	form = modal.querySelector('form')
	textarea = modal.querySelector('textarea')

	form.addEventListener('submit', onModalSubmit)
	textarea.addEventListener('input', () => {
		scaleNoteType(textarea.value, textarea)
	})
	form.querySelector('[data-action="choose-group"]').addEventListener('click', () => {
		const select = form.querySelector('[name="annotation-group-choice"]')
		select.dataset.previousGroup = select.value
		select.value = NOTATE_NEW_GROUP
		select.dispatchEvent(new Event('change'))
	})
	form.querySelector('.notate-group-menu').addEventListener('click', event => {
		const button = event.target.closest('[data-group-choice]')
		if (!button) return
		const select = form.querySelector('[name="annotation-group-choice"]')
		select.dataset.previousGroup = select.value
		if (button.dataset.groupChoice === select.value) return
		select.value = button.dataset.groupChoice
		select.dispatchEvent(new Event('change'))
	})
	form.querySelector('[name="annotation-group-choice"]')?.addEventListener('change', () => {
		const select = form.querySelector('[name="annotation-group-choice"]')
		const nameInput = form.querySelector('[name="annotation-group"]')
		if (select?.value === NOTATE_NEW_GROUP) {
			if (nameInput) nameInput.value = ''
			showGroupScreen()
			return
		}
		if (nameInput) nameInput.value = select?.value || ''
		showNoteScreen()
		syncGroupColorFromName()
	})
	form.querySelector('[name="annotation-group"]')?.addEventListener('keydown', (event) => {
		if (event.key !== 'Enter') return
		event.preventDefault()
		confirmNewGroup()
	})
	form.querySelector('[data-action="back-note"]')?.addEventListener('click', () => {
		const select = form.querySelector('[name="annotation-group-choice"]')
		if (select) select.value = select.dataset.previousGroup || ''
		showNoteScreen()
	})
	form.querySelector('[data-action="confirm-group"]')?.addEventListener('click', () => {
		confirmNewGroup()
	})
	modal.addEventListener('change', (event) => {
		if (event.target.name !== 'annotation-color') return
		modal.dataset.color = event.target.value
	})
}

// give each annotation its own id to reference
// googled: https://www.google.com/search?q=how+do+i+get+each+modal+to+have+its+own+unique+id+vanilla+js&sca_esv=11902b971e361d2f&rlz=1C5CHFA_enUS976US983&biw=1709&bih=890&sxsrf=ANbL-n5oWC9vRtJ8YIbSE2bnmta1B1g8xA%3A1775516025216&ei=eTnUae7tDMa05NoP7_Gw-Aw&ved=0ahUKEwiujufPqNqTAxVGGlkFHe84DM8Q4dUDCBE&uact=5&oq=how+do+i+get+each+modal+to+have+its+own+unique+id+vanilla+js&gs_lp=Egxnd3Mtd2l6LXNlcnAiPGhvdyBkbyBpIGdldCBlYWNoIG1vZGFsIHRvIGhhdmUgaXRzIG93biB1bmlxdWUgaWQgdmFuaWxsYSBqczIKECEYChigARjDBDIKECEYChigARjDBEiNEVCKAljCEHADeAGQAQCYAWGgAf4FqgEBObgBA8gBAPgBAZgCCKAC3QPCAgoQABhHGNYEGLADwgIFECEYqwKYAwCIBgGQBgiSBwM3LjGgB6IqsgcDNC4xuAfPA8IHBTAuNy4xyAcPgAgB&sclient=gws-wiz-serp, chose option 3, looked it up Crypto.randomUUID on MDN: https://developer.mozilla.org/en-US/docs/Web/API/Crypto/randomUUID
// returns a fresh unique id so render, edit, and delete can target the right annotation later
const createAnnotationId = () => {
	return crypto.randomUUID()
}

// use saved path later to find the same clicked element again
// referenced: https://stackoverflow.com/questions/8588301/how-to-generate-unique-css-selector-for-dom-element, then looked up: Element.id: https://developer.mozilla.org/en-US/docs/Web/API/Element/id, :nth-of-type: https://developer.mozilla.org/en-US/docs/Web/CSS/:nth-of-type
// uses an element id if there is one, or builds a parent > child:nth-of-type() path and connects it with >
const getSelector = (element) => {
	if (!element || element.nodeType !== 1 || !element.isConnected || element === document.documentElement || element === document.body) return null
	if (element.id) return `#${CSS.escape(element.id)}`

	const parts = []
	let current = element

	while (current && current.nodeType === 1 && current !== document.body) {
		let selector = current.tagName.toLowerCase()

		const parent = current.parentElement
		if (!parent) return null
		const siblings = [...parent.children].filter((child) => {
			return child.tagName === current.tagName
		})

		if (siblings.length > 1) {
			const index = siblings.indexOf(current) + 1
			selector += `:nth-of-type(${index})`
		}

		parts.unshift(selector)
		current = parent
	}

	return parts.join(' > ')
}

// needed to find single saved annotation from its id
// Array.find: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/find
// searches the annotations array and returns the annotation that matches the id
const getAnnotationById = (id) => {
	return annotations.find((annotation) => {
		return annotation.id === id
	})
}

// show each note to right of annotated element and not fall offscreen
// googled: https://www.google.com/search?q=how+to+get+position+of+element+vanilla+js&sca_esv=11902b971e361d2f&rlz=1C5CHFA_enUS976US983&biw=1709&bih=890&sxsrf=ANbL-n4AdvI89TLz6hwh0LGDcDjIV8_jWg%3A1775516305269&ei=kTrUaaqMEJmj5NoP1PWl4Q4&ved=0ahUKEwjqmKzVqdqTAxWZEVkFHdR6KewQ4dUDCBE&uact=5&oq=how+to+get+position+of+element+vanilla+js&gs_lp=Egxnd3Mtd2l6LXNlcnAiKWhvdyB0byBnZXQgcG9zaXRpb24gb2YgZWxlbWVudCB2YW5pbGxhIGpzMggQIRigARjDBDIFECEYqwJIzxhQkwRYrxdwA3gBkAEAmAFSoAHJBaoBAjEwuAEDyAEA-AEBmAINoALtBcICChAAGEcY1gQYsAPCAgYQABgHGB7CAgUQABjvBcICBhAAGB4YDcICChAhGAoYoAEYwwSYAwCIBgGQBgiSBwIxM6AH4SSyBwIxMLgH5gXCBwQzLjEwyAcPgAgB&sclient=gws-wiz-serp, which led me to MDN: Element.getBoundingClientRect: https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect, Window.scrollX: https://developer.mozilla.org/en-US/docs/Web/API/Window/scrollX 
// measures the target, calculates top and left, flips note to other side if overflows viewport
// stacks notes on the same target by adding heights of annotations that come before this one in the saved array
// using array order instead of DOM order avoids measuring the note itself or notes below it
// HTMLElement.offsetHeight: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/offsetHeight
const getNotePosition = (target, selector, annotationId) => {
	const rem = remToPx()
	const rect = target.getBoundingClientRect()
	const gap = rem / 2
	const renderedNote = annotationId && layer ? [...layer.children].find(note => note.dataset.id === annotationId) : null
	const noteWidth = renderedNote?.offsetWidth || (parseFloat(getComputedStyle(layer).getPropertyValue('--notate-inline-size-note')) || 256)
	const viewportLeft = window.scrollX
	const viewportRight = window.scrollX + window.innerWidth

	let left = rect.right + window.scrollX + gap
	let top = rect.top + window.scrollY

	// referenced this for if logic outside of viewport: https://gomakethings.com/how-to-check-if-any-part-of-an-element-is-out-of-the-viewport-with-vanilla-js/
	if (left + noteWidth > viewportRight - gap) {
		left = rect.left + window.scrollX - noteWidth - gap
	}

	if (left < viewportLeft + gap) {
		left = viewportLeft + gap
	}

	// find all annotations on the same target that were saved before this one
	// && for logical AND operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_AND
	// add their heights so this note lands below them
	// .filter: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter 
	// .findIndex: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/findIndex
	if (selector && annotationId && layer) {
		const sameTarget = annotations.filter((a) => a.selector === selector)
		const thisIndex = sameTarget.findIndex((a) => a.id === annotationId)

		// gives me part of the array i need: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/slice
		sameTarget.slice(0, thisIndex).forEach((a) => {
			// referenced this to help with calculation: https://stackoverflow.com/questions/10787782/full-height-of-a-html-element-div-including-border-padding-and-margin
			const el = layer.querySelector(`.notate-note[data-id="${a.id}"]`)
			if (el) top += el.offsetHeight + gap
		})
	}

	const annotation = getAnnotationById(annotationId)
	left += annotation?.offsetInline || 0
	top += annotation?.offsetBlock || 0

	const maxNoteWidth = Math.min(noteWidth, window.innerWidth - gap * 2)
	if (left + maxNoteWidth > viewportRight - gap) {
		left = viewportRight - maxNoteWidth - gap
	}
	if (left < viewportLeft + gap) {
		left = viewportLeft + gap
	}

	return { top, left }
}

// outline the targeted element
// Element.classList: https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
// re-finds the element from selector and adds the 'notate-annotated' class
const resolveAnnotationTarget = selector => {
	if (!selector) return null
	try { return document.querySelector(selector) } catch { return null }
}

const highlightTarget = (selector, annotation = null) => {
	const target = resolveAnnotationTarget(selector)
	if (!target) return

	const note = annotation || annotations.filter(item => item.selector === selector).at(-1)
	target.dataset.notateOutlineColor = note?.group ? notateNormalizeColor(note.color) : 'neutral'
	target.classList.add(annotatedClass)
}

// remove outline when not targeted or deleted
// DOMTokenList.remove: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/remove
// removes 'notate-annotated'` class
const unhighlightTarget = (selector) => {
	const target = resolveAnnotationTarget(selector)
	if (!target) return

	target.classList.remove(annotatedClass)
	delete target.dataset.notateOutlineColor
}

// show note layer when annotation mode is active
// HTMLElement.hidden: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/hidden
// makes sure layer exists first then sets layer.hidden = false
const showLayer = () => {
	createLayer()
	layer.hidden = false
}

// hide the note layer without deleting it
// HTMLElement.hidden: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/hidden
// flips layer.hidden back to true
const hideLayer = () => {
	clearNoteTargetPreview()
	if (!layer) return

	layer.hidden = true
}

// clear all notes
// Element.innerHTML: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
// empties the note layer by setting layer.innerHTML = ''
const clearRenderedAnnotations = () => {
	clearNoteTargetPreview()
	if (!layer) return

	layer.innerHTML = ''
}

// remove all annotation outlines from the page at once
// Array.forEach: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/forEach
// loops through annotations and calls unhighlightTarget(annotation.selector) for each one
const clearHighlights = () => {
	annotations.forEach((annotation) => {
		unhighlightTarget(annotation.selector)
	})
}

// one saved annotation object becomes one visible sticky note on page
// HTMLElement.dataset: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset 
// finds the target from annotation.selector, positions a .notate-note, sets note.dataset.id, and adds it into layer
const stickingNotes = new Map()
const deletingNotes = new Set()
const stickyMotionDuration = { stick: 560, peel: 500 }
const createPaperMesh = (note, rect) => {
	const canvas = document.createElement('canvas')
	const ratio = Math.min(devicePixelRatio || 1, 2)
	const margin = 18
	const width = rect.width + margin * 2
	const height = rect.height + margin * 2
	canvas.width = Math.ceil(width * ratio)
	canvas.height = Math.ceil(height * ratio)
	canvas.style.cssText = `all:initial;position:absolute;left:-${margin}px;top:-${margin}px;width:${width}px;height:${height}px;pointer-events:none;`
	const gl = canvas.getContext('webgl', { alpha: true, antialias: true, premultipliedAlpha: true })
	if (!gl) return null
	const shaders = [], buffers = []
	let program, texture
	const dispose = () => {
		buffers.forEach(buffer => gl.deleteBuffer(buffer))
		shaders.forEach(shader => gl.deleteShader(shader))
		if (texture) gl.deleteTexture(texture)
		if (program) gl.deleteProgram(program)
		gl.getExtension('WEBGL_lose_context')?.loseContext()
	}
	try {
		// Paint local plain-text content using actual DOM line positions.
		// No screenshots, external images, or remote rendering are involved.
		const bitmap = document.createElement('canvas')
		bitmap.width = Math.ceil(rect.width * ratio)
		bitmap.height = Math.ceil(rect.height * ratio)
		const ctx = bitmap.getContext('2d')
		ctx.scale(ratio, ratio)
		const style = getComputedStyle(note)
		ctx.fillStyle = getComputedStyle(note, '::before').backgroundColor || style.backgroundColor
		ctx.strokeStyle = style.borderTopColor
		ctx.lineWidth = parseFloat(style.borderTopWidth) || 1
		ctx.beginPath()
		ctx.roundRect(0.5, 0.5, rect.width - 1, rect.height - 1, parseFloat(style.borderRadius) || 4)
		ctx.fill()
		ctx.stroke()
		const paragraph = note.querySelector('p')
		if (paragraph) {
			const textStyle = getComputedStyle(paragraph)
			ctx.font = `${textStyle.fontWeight} ${textStyle.fontSize} ${textStyle.fontFamily}`
			ctx.fillStyle = textStyle.color
			ctx.textBaseline = 'alphabetic'
			const walker = document.createTreeWalker(paragraph, NodeFilter.SHOW_TEXT)
			let node
			while ((node = walker.nextNode())) {
				let line = '', left = 0, top = null, glyphHeight = 0
				const flush = () => {
					if (!line) return
					const metrics = ctx.measureText(line)
					const ascent = metrics.fontBoundingBoxAscent || parseFloat(textStyle.fontSize) * 0.8
					const descent = metrics.fontBoundingBoxDescent || parseFloat(textStyle.fontSize) * 0.2
					ctx.fillText(line, left, top + (glyphHeight - ascent - descent) / 2 + ascent)
				}
				for (let index = 0; index < node.length;) {
					const length = String.fromCodePoint(node.textContent.codePointAt(index)).length
					const range = document.createRange()
					range.setStart(node, index)
					range.setEnd(node, index + length)
					const box = range.getBoundingClientRect()
					if (top !== null && Math.abs(box.top - rect.top - top) > 1) { flush(); line = '' }
					if (!line) { left = box.left - rect.left; top = box.top - rect.top; glyphHeight = box.height }
					line += node.textContent.slice(index, index + length)
					index += length
				}
				flush()
			}
		}
		const compile = (type, source) => {
			const shader = gl.createShader(type)
			shaders.push(shader)
			gl.shaderSource(shader, source)
			gl.compileShader(shader)
			if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) throw new Error('Paper shader unavailable')
			return shader
		}
		program = gl.createProgram()
		gl.attachShader(program, compile(gl.VERTEX_SHADER, `
			attribute vec2 uv;
			uniform vec2 paperSize;
			uniform vec2 viewport;
			uniform float peeled;
			varying vec2 tex;
			varying float shade;
			void main() {
				tex = uv;
				// Cylindrical curl: preserve the flat sheet, wrap the lifted
				// portion around an arc, then continue along its back side.
				vec2 p = uv * paperSize;
				float radius = clamp(paperSize.x * 0.055, 8.0, 16.0);
				float axis = mix(paperSize.x + 12.0, -paperSize.x * 0.10, peeled);
				axis += (uv.y - 0.5) * 16.0 * sin(peeled * 3.14159);
				float distance = max(0.0, p.x - axis);
				float angle = min(distance / radius, 3.14159);
				float z = radius * (1.0 - cos(angle));
				if (distance > 0.0) {
					p.x = axis + radius * sin(angle) - max(0.0, distance - radius * 3.14159);
					p.y -= z * 0.16;
				}
				p += vec2(18.0);
				gl_Position = vec4(p.x / viewport.x * 2.0 - 1.0, 1.0 - p.y / viewport.y * 2.0, -z / 100.0, 1.0);
				shade = angle;
			}
		`))
		gl.attachShader(program, compile(gl.FRAGMENT_SHADER, `
			precision mediump float;
			uniform sampler2D paper;
			uniform vec3 paperBack;
			varying vec2 tex;
			varying float shade;
			void main() {
				vec4 color = texture2D(paper, tex);
				if (color.a < 0.01) discard;
				float light = 1.0 - sin(shade) * 0.16;
				vec3 face = shade > 1.5708 ? mix(paperBack, vec3(1.0), 0.12) : color.rgb;
				gl_FragColor = vec4(face * light * color.a, color.a);
			}
		`))
		gl.linkProgram(program)
		if (!gl.getProgramParameter(program, gl.LINK_STATUS)) throw new Error('Paper program unavailable')
		gl.useProgram(program)
		const vertices = []
		const columns = 96, rows = 20
		for (let y = 0; y < rows; y++) for (let x = 0; x < columns; x++) {
			for (const [dx, dy] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) vertices.push((x + dx) / columns, (y + dy) / rows)
		}
		const buffer = gl.createBuffer()
		buffers.push(buffer)
		gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(vertices), gl.STATIC_DRAW)
		const attribute = gl.getAttribLocation(program, 'uv')
		gl.enableVertexAttribArray(attribute)
		gl.vertexAttribPointer(attribute, 2, gl.FLOAT, false, 0, 0)
		texture = gl.createTexture()
		gl.bindTexture(gl.TEXTURE_2D, texture)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE)
		gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE)
		gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, bitmap)
		const back = ctx.getImageData(Math.floor(bitmap.width / 2), Math.max(1, Math.floor(ratio * 3)), 1, 1).data
		gl.uniform3f(gl.getUniformLocation(program, 'paperBack'), back[0] / 255, back[1] / 255, back[2] / 255)
		gl.enable(gl.DEPTH_TEST)
		gl.depthFunc(gl.LEQUAL)
		gl.uniform2f(gl.getUniformLocation(program, 'paperSize'), rect.width, rect.height)
		gl.uniform2f(gl.getUniformLocation(program, 'viewport'), width, height)
		const progressLocation = gl.getUniformLocation(program, 'peeled')
		gl.viewport(0, 0, canvas.width, canvas.height)
		return {
			canvas, dispose,
			draw(peeled) {
				if (gl.isContextLost()) return false
				gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)
				gl.uniform1f(progressLocation, peeled)
				gl.drawArrays(gl.TRIANGLES, 0, vertices.length / 2)
				return true
			}
		}
	} catch {
		dispose()
		return null
	}
}

const animateStickyNote = (note, removing = false, elapsed = 0) => {
	if (!note || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return null
	const rect = note.getBoundingClientRect()
	const mesh = createPaperMesh(note, rect)
	// Keep the real note visible if GPU rendering is unavailable.
	if (!mesh) return null
	const overlay = document.createElement('div')
	overlay.setAttribute('aria-hidden', 'true')
	overlay.inert = true
	overlay.style.cssText = `all:initial;position:fixed;left:${rect.left}px;top:${rect.top}px;width:${rect.width}px;height:${rect.height}px;pointer-events:none;z-index:2147483647;`
	overlay.attachShadow({ mode: 'closed' }).append(mesh.canvas)
	document.body.append(overlay)
	const previousVisibility = note.style.visibility
	const duration = removing ? stickyMotionDuration.peel : stickyMotionDuration.stick
	const start = performance.now() - elapsed
	return { finished: new Promise(resolve => {
		const finish = completed => {
			overlay.remove()
			mesh.dispose()
			note.style.visibility = completed && removing ? 'hidden' : previousVisibility
			resolve()
		}
		const draw = now => {
			const progress = Math.min(1, (now - start) / duration)
			if (!note.isConnected || layer?.hidden || progress >= 1) { finish(progress >= 1); return }
			const eased = progress * progress * (3 - 2 * progress)
			const peeled = removing ? eased : 1 - eased
			if (!mesh.draw(peeled)) { finish(false); return }
			note.style.visibility = 'hidden'
			const currentRect = note.getBoundingClientRect()
			overlay.style.left = `${currentRect.left}px`
			overlay.style.top = `${currentRect.top}px`
			overlay.style.filter = `drop-shadow(-${peeled}px ${2 + peeled * 2}px ${2 + peeled * 2}px #00000018)`
			overlay.style.opacity = String(Math.min(1, (1 - peeled) / 0.16))
			requestAnimationFrame(draw)
		}
		requestAnimationFrame(draw)
	}) }
}

let noteTargetPreview = null
const clearNoteTargetPreview = () => {
	noteTargetPreview?.overlay.remove()
	noteTargetPreview = null
}
const positionNoteTargetPreview = () => {
	if (!noteTargetPreview) return
	const { target, overlay, note } = noteTargetPreview
	if (!target.isConnected || !note.isConnected || layer?.hidden) {
		clearNoteTargetPreview()
		return
	}
	const rect = target.getBoundingClientRect()
	Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` })
}
const previewNoteTarget = (note, annotation) => {
	clearNoteTargetPreview()
	clearHoverFill()
	let target
	try { target = document.querySelector(annotation.selector) } catch { return }
	if (!target) return
	const overlay = document.createElement('div')
	overlay.id = 'notate-note-target-preview'
	overlay.setAttribute('aria-hidden', 'true')
	const color = annotation.group ? notateNormalizeColor(annotation.color) : 'neutral'
	const token = color === 'neutral' ? '--notate-neutral-accent' : color === 'yellow' ? '--notate-color-note' : `--notate-color-note-${color}`
	overlay.style.setProperty('--notate-preview-color', `var(${token})`)
	overlay.style.setProperty('--notate-preview-opacity', color === 'neutral' ? '15%' : '28%')
	overlay.style.setProperty('--notate-preview-border', color === 'neutral' ? 'var(--notate-neutral-accent)' : `var(--notate-border-${color})`)
	layer.append(overlay)
	noteTargetPreview = { target, overlay, note }
	positionNoteTargetPreview()
}
window.addEventListener('scroll', positionNoteTargetPreview, true)
window.addEventListener('resize', positionNoteTargetPreview)

// Session positions cover elements removed after rendering; saved positions cover return visits.
const lastNotePositions = new Map()
const getFallbackNotePosition = annotation => {
 const saved = lastNotePositions.get(annotation.id) || annotation.pagePosition
 const known = saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)
 return {
  left: Math.max(window.scrollX + 8, Math.min(known ? saved.left + (annotation.offsetInline || 0) : window.scrollX + 24, window.scrollX + window.innerWidth - 280)),
  top: Math.max(8, known ? saved.top + (annotation.offsetBlock || 0) : window.scrollY + 96)
 }
}
const syncMissingNoteWarning = (note, missing, annotation) => {
 if (!missing) { note.querySelector('[data-missing-note-warning]')?.remove(); return }
 if (note.querySelector('[data-missing-note-warning]')) return
 const warning = document.createElement('aside')
 warning.dataset.missingNoteWarning = ''
 warning.setAttribute('role', 'status')
 const text = document.createElement('span')
 text.textContent = 'The original element is no longer available.'
 if (!lastNotePositions.has(annotation.id) && !annotation.pagePosition) text.textContent += ' Its original position was not saved.'
 warning.addEventListener('click', event => event.stopPropagation())
 const icon = document.createElement('span')
 icon.className = 'notate-warning-icon'
 icon.setAttribute('aria-hidden', 'true')
 icon.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round"><path d="m10.3 3.9-8.1 14a2 2 0 0 0 1.7 3h16.2a2 2 0 0 0 1.7-3l-8.1-14a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4m0 4h.01"/></svg>'
 warning.append(text, icon)
 note.append(warning)
}
const renderAnnotation = (annotation) => {
	createLayer()
	if ([...layer.children].some(note => note.dataset.id === annotation.id)) return

	const target = resolveAnnotationTarget(annotation.selector)
	const position = target ? getNotePosition(target, annotation.selector, annotation.id) : getFallbackNotePosition(annotation)

	highlightTarget(annotation.selector, annotation)

	const note = document.createElement('aside')
	note.className = 'notate-note'
	note.dataset.id = annotation.id
	note.dataset.color = annotation.group ? notateNormalizeColor(annotation.color) : 'neutral'
	note.dataset.state = notateNormalizeState(annotation.interaction?.kind)
	note.addEventListener('pointerenter', () => previewNoteTarget(note, getAnnotationById(annotation.id) || annotation))
	note.addEventListener('pointerleave', clearNoteTargetPreview)
	note.addEventListener('focusin', () => previewNoteTarget(note, getAnnotationById(annotation.id) || annotation))
	note.addEventListener('focusout', event => {
		if (!note.contains(event.relatedTarget)) clearNoteTargetPreview()
	})

	const stateLabel = notateInteractionLabel(annotation.interaction)

	// "x" corner button to delete the annotation, inserting through html
	note.innerHTML = `
		<button class="notate-delete" type="button" aria-label="Delete annotation">×</button>
		<p>${notateEscapeHtml(annotation.text)}</p>
		${stateLabel ? `<small>${notateEscapeHtml(stateLabel)}</small>` : ''}
	`

	note.style.insetBlockStart = `${position.top}px`
	note.style.insetInlineStart = `${position.left}px`
	scaleNoteType(annotation.text, note)
	scaleNoteType(annotation.text, note.querySelector('p'))

	layer.append(note)
	syncMissingNoteWarning(note, !target, annotation)
	const startedAt = stickingNotes.get(annotation.id)
	if (startedAt !== undefined) {
		const elapsed = performance.now() - startedAt
		if (elapsed < stickyMotionDuration.stick) animateStickyNote(note, false, elapsed)
		else stickingNotes.delete(annotation.id)
	}
}

// all saved annotations to render back onto the page together
// shows the layer, clears old note markup, re-renders every item in annotations
// then again so stacked note heights are accurate
const renderAllAnnotations = () => {
	showLayer()
	clearRenderedAnnotations()

	annotations.forEach((annotation) => {
		renderAnnotation(annotation)
	})

	requestAnimationFrame(() => {
		repositionAnnotations()
	})
}

// saving a new note to create the object, store it, and show it right away
// Array.push: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
// builds a new annotation from activeTarget and text, inserts into annotations, saves it, renders it
const createAnnotation = async (text, color, group, interaction) => {
	const selector = getSelector(activeTarget)
	if (!selector) {
		let error = form.querySelector('[data-save-error]')
		if (!error) {
			error = document.createElement('p')
			error.dataset.saveError = ''
			error.setAttribute('role', 'alert')
			form.append(error)
		}
		error.textContent = 'This element is no longer available on the page. Your draft is still here; copy it before choosing another element.'
		return false
	}
	const annotation = notateNormalizeAnnotation({
		id: draftAnnotationId || (draftAnnotationId = createAnnotationId()),
		selector,
		text,
		color,
		group,
		pagePosition: getNotePosition(activeTarget, selector, null),
		offsetInline: 0,
		offsetBlock: 0,
		createdAt: Date.now(),
		interaction: notateNormalizeInteraction(interaction || pendingInteraction, activeTarget)
	})

	await notateMutate({ type: 'create', url: location.href, title: document.title, id: annotation.id, note: annotation, newFolder: draftGroupColors.has(group) })
	await loadAnnotations()
	stickingNotes.set(annotation.id, performance.now())
	renderAnnotation(annotation)
}

// editing a note updates both the saved data and the visible note text
// Node.textContent: https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
// updates the matching annotation object, saves annotations, updates the <p> inside .notate-note[data-id="${id}"]
const updateAnnotation = async (id, text, color, group, interaction) => {
	const existing = getAnnotationById(id)
	if (!existing) throw new Error('This note is no longer available. Copy your draft before closing.')
	const annotation = { ...existing }
	annotation.text = text
	annotation.color = notateNormalizeColor(color)
	annotation.group = notateNormalizeGroup(group)
	annotation.interaction = notateNormalizeInteraction(interaction || pendingInteraction, activeTarget)

	await notateMutate({ type: 'edit', url: location.href, id, patch: annotation, expected: editingBaseline || existing, newFolder: draftGroupColors.has(group) })
	await loadAnnotations()
	highlightTarget(annotation.selector, annotation)

	const note = document.querySelector(`.notate-note[data-id="${id}"]`)
	if (!note) return

	note.dataset.color = annotation.group ? annotation.color : 'neutral'
	note.dataset.state = notateNormalizeState(annotation.interaction.kind)
	const noteText = note.querySelector('p')
	noteText.textContent = text
	const stateLabel = notateInteractionLabel(annotation.interaction)
	let meta = note.querySelector('small')
	if (stateLabel) {
		if (!meta) {
			meta = document.createElement('small')
			note.append(meta)
		}
		meta.textContent = stateLabel
	} else {
		meta?.remove()
	}
	scaleNoteType(text, note)
	scaleNoteType(text, noteText)
}

// clicking the x fully removes that annotation everywhere
// Array.filter: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter, Element.remove https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
// unhighlights the target, filters the item out of annotations, saves again, removes that note element from page
// Handle async failures at UI/message boundaries without treating a failed read as empty data.
const showPageOperationError = error => {
 createToolbar()
 reportPageStorageError(error?.message || 'Could not load your notes. Please refresh the page and try again.')
}

const reportPageStorageError = (message, onEdit = null) => {
 if (!toolbar) return
 toolbar.querySelector('[data-storage-error]')?.remove()
 const notice = document.createElement('aside')
 notice.dataset.storageError = ''
 notice.setAttribute('role', 'alert')
 const text = document.createElement('p')
 text.textContent = message
 const dismiss = document.createElement('button')
 dismiss.type = 'button'
 dismiss.className = 'notate-notice-dismiss'
 dismiss.setAttribute('aria-label', 'Dismiss warning')
 dismiss.textContent = '×'
 dismiss.addEventListener('click', event => {
  event.stopPropagation()
  notice.remove()
  toolbar?.querySelector('button')?.focus()
 })
 notice.append(text, dismiss)
 if (onEdit) {
  const edit = document.createElement('button')
  edit.type = 'button'
  edit.className = 'notate-notice-edit'
  edit.textContent = 'Edit note'
  edit.addEventListener('click', event => { event.stopPropagation(); notice.remove(); onEdit() })
  notice.append(edit)
 }
 toolbar.append(notice)
}

const deleteAnnotation = async (id) => {
	if (!getAnnotationById(id) || deletingNotes.has(id)) return
	deletingNotes.add(id)
	clearNoteTargetPreview()
	const visibleNote = [...(layer?.children || [])].find(note => note.dataset.id === id)
	try {
		// Keep the note visible until durable deletion is acknowledged.
		await notateMutate({ type: 'delete', url: location.href, id })
		if (visibleNote?.isConnected) {
			visibleNote.inert = true
			try { await animateStickyNote(visibleNote, true)?.finished } catch {}
		}
		clearHighlights()
		await loadAnnotations()
		renderAllAnnotations()
	} catch {
		if (visibleNote) { visibleNote.inert = false; visibleNote.style.visibility = '' }
		reportPageStorageError('Could not delete the note. It has been kept. Please try again.')
	} finally {
		deletingNotes.delete(id)
		stickingNotes.delete(id)
	}
}

// clear this page's annotations everywhere at once
// resets annotations to an empty array, removes this page from extension storage, clears the layer
const clearAnnotations = async () => {
	if (!await confirmClear()) return
	try {
		await notateMutate({ type: 'clear-page', url: location.href })
		clearHighlights()
		await loadAnnotations()
		renderAllAnnotations()
	} catch {
		reportPageStorageError('Could not clear this page. Please try again.')
	}
}

// DOMTokenList.add: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/add
// sets isAnnotating = true, adds 'notate-is-annotating' on document.documentElement, creates toolbar, renders notes
const startAnnotating = () => {
	isPreviewing = false
	isMoving = false
	isAnnotating = true
	document.documentElement.classList.remove('notate-is-previewing', 'notate-is-moving')
	document.documentElement.classList.add('notate-is-annotating')
	createToolbar()
	renderAllAnnotations()
}

const startPreviewing = () => {
	isAnnotating = false
	isMoving = false
	isPreviewing = true
	document.documentElement.classList.remove('notate-is-annotating', 'notate-is-moving')
	document.documentElement.classList.add('notate-is-previewing')
	clearHoverFill()
	createToolbar()
	renderAllAnnotations()
}

const startMoving = () => {
	isPreviewing = false
	isAnnotating = false
	isMoving = true
	document.documentElement.classList.remove('notate-is-previewing', 'notate-is-annotating')
	document.documentElement.classList.add('notate-is-moving')
	clearHoverFill()
	createToolbar()
	renderAllAnnotations()
}

// DOMTokenList.remove: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/remove
// sets isAnnotating = false, removes 'notate-is-annotating', removes toolbar, hides layer, clears highlights
const stopAnnotating = () => {
	isAnnotating = false
	isPreviewing = false
	isMoving = false
	document.documentElement.classList.remove('notate-is-annotating', 'notate-is-previewing', 'notate-is-moving')
	removeToolbar()
	hideLayer()	
	if (modal?.open) {
		closeModal()
	}
	clearHoverFill()
	clearHighlights()
}

// conditional operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
// picks either startAnnotating or stopAnnotating based on isAnnotating and then runs it, so i can consolidate same function to toggle both on and off
const toggleAnnotating = () => {
	const nextAction = isAnnotating ? stopAnnotating : startAnnotating
	nextAction()
}

// Event.preventDefault: https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault, SubmitEvent.submitter: https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/submitter
// consolidate to one function so it reads event.submitter.value and textarea.value.trim() to either cancel, ignore blank text, update an existing note, or create a new one
const performModalSave = async (metadata) => {
	if (draftPageUrl && location.href !== draftPageUrl) throw new Error('The page changed while you were writing. Copy your draft before choosing a new element.')
	if (form?.dataset.screen === 'group') {
		confirmNewGroup()
		return
	}
	const { text, color: chosenColor, group, interaction } = metadata
	let color = NOTATE_COLOR_DEFAULT

	if (!text) {
		closeModal()
		return
	}

	if (group) {
		const colors = await getGroupColors()
		color = notateResolveGroupColor(group, colors, draftGroupColors.get(group) || chosenColor)

	}

	if (editingAnnotationId) {
		await updateAnnotation(editingAnnotationId, text, color, group, interaction)
		closeModal()
		return
	}

	const created = await createAnnotation(text, color, group, interaction)
	if (created !== false) closeModal()
}

let modalSavePending = false
const saveFromModal = async () => {
	if (modalSavePending) return
	const metadata = readModalMeta()
	modalSavePending = true
	form?.querySelector('[data-save-error]')?.remove()
	const controls = [...form.querySelectorAll('button, input, textarea, select')]
	const disabled = controls.map(control => control.disabled)
	controls.forEach(control => { control.disabled = true })
	form.setAttribute('aria-busy', 'true')
	const preventDismiss = event => event.preventDefault()
	modal.addEventListener('cancel', preventDismiss)
	try {
		await performModalSave(metadata)
	} catch (error) {
		let notice = form.querySelector('[data-save-error]')
		if (!notice) {
			notice = document.createElement('p')
			notice.dataset.saveError = ''
			notice.setAttribute('role', 'alert')
			form.append(notice)
		}
		notice.textContent = (error.message || 'Could not save your note.') + ' Your draft is still here. Copy it before reloading, or try Save again.'
	} finally {
		controls.forEach((control, index) => { control.disabled = disabled[index] })
		form.removeAttribute('aria-busy')
		modal.removeEventListener('cancel', preventDismiss)
		modalSavePending = false
	}
}

const onModalSubmit = async (event) => {
	event.preventDefault()

	const formData = new FormData(form)
	const submitValue = event.submitter?.value || formData.get('intent') || 'save'

	if (submitValue === 'cancel') {
		closeModal()
		return
	}

	if (form?.dataset.screen === 'group') {
		confirmNewGroup()
		return
	}

	const choice = form?.querySelector('[name="annotation-group-choice"]')?.value
	if (choice === NOTATE_NEW_GROUP) {
		showGroupScreen()
		return
	}

	await saveFromModal()
}

// click the x button inside a note to delete only that note
// Element.closest: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
// checks for .notate-delete, finds the parent .notate-note, deletes it using note.dataset.id
const onLayerClick = async (event) => {
	const deleteButton = event.target.closest('.notate-delete')
	if (!deleteButton) return
	const note = deleteButton.closest('.notate-note')
	if (!layer || note?.parentElement !== layer || !getAnnotationById(note.dataset.id)) return

	event.preventDefault()
	event.stopPropagation()

	await deleteAnnotation(note.dataset.id)
}

// page clicks anywhere except on modal, toolbar, and note open modal
// Array.some: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some, Event.stopPropagation: https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation
// ignores #notate-modal, #notate-toolbar, and .notate-note, then opens create mode on the clicked page element
const onPageClick = (event) => {
	const blockedSelectors = ['#notate-modal', '#notate-toolbar', '#notate-confirm-host', '.notate-note']
	const clickedInsideBlockedUi = blockedSelectors.some((selector) => {
		return event.target.closest(selector)
	})
	const clickedRoot = event.target === document.body || event.target === document.documentElement

	if (isAnnotating && event.altKey && !modal?.open && !clickedInsideBlockedUi && !clickedRoot) {
		event.preventDefault()
		event.stopPropagation()
		lastPointerTarget = event.target
		openCaptureModal(inferStateKind(event.target, event), event)
		return
	}

	if (!isAnnotating || modal?.open || clickedInsideBlockedUi || clickedRoot) return

	event.preventDefault()
	event.stopPropagation()

	pendingInteraction = captureLiveInteraction(event.target, event.altKey ? inferStateKind(event.target, event) : 'default')
	openCreateModal(event.target).catch(showPageOperationError)
}

// click an existing note to reopen for editing
// HTMLElement.dataset: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset, Element.closest: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
// ignores the delete button, finds the clicked .notate-note, gets its id from note.dataset.id, opens that annotation in edit mode
const onNoteClick = (event) => {
	if (event.target.closest('.notate-delete, [data-missing-note-warning]')) return
	if (isMoving || noteDidDrag || noteDrag?.moved) {
		noteDidDrag = false
		return
	}

	const note = event.target.closest('.notate-note')
	if (!layer || note?.parentElement !== layer) return
	const annotation = getAnnotationById(note.dataset.id)
	// Ignore stale cards after a storage update and similarly named host elements.
	if (!annotation) return

	event.preventDefault()
	event.stopPropagation()

	openEditModal(annotation)
}



// toolbar buttons do different actions depending on which one i clicked
// Element.closest: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest, dataset: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
// finds clicked toolbar button inside #notate-toolbar, reads its data-action, then runs clearAnnotations or stopAnnotating
const onToolbarClick = async (event) => {
	const button = event.target.closest('#notate-toolbar [data-action]')
	if (!toolbar || button?.closest('#notate-toolbar') !== toolbar) return
	const action = button?.dataset.action
	const toolbarActions = {
		preview: startPreviewing,
		edit: startAnnotating,
		move: startMoving,
		clear: clearAnnotations,
		exit: () => isAnnotating ? startPreviewing() : stopAnnotating()
	}

	if (!action || !toolbarActions[action]) return

	event.preventDefault()
	event.stopPropagation()

	await toolbarActions[action]()
}

// Escape key exits annotation mode
// KeyboardEvent.key: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
const onKeydown = (event) => {
	if (document.getElementById('notate-confirm-host')) return
	if ((event.metaKey || event.ctrlKey) && event.key === 'Enter' && modal?.open) {
		event.preventDefault()
		saveFromModal()
		return
	}

	if (event.altKey && !event.metaKey && !event.ctrlKey && (event.key === 'a' || event.key === 'A') && !modal?.open && (isAnnotating || isPreviewing || isMoving)) {
		event.preventDefault()
		openCaptureModal(inferStateKind(lastPointerTarget, event), event)
		return
	}

	if (event.key !== 'Escape' || (!isAnnotating && !isPreviewing && !isMoving)) return
	if (modal?.open) return

	if (isAnnotating) startPreviewing()
	else stopAnnotating()
}

// each note moves with its annotated element when the page shifts
// HTMLElement.dataset: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
// CSS logical properties: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values
// grabs the saved id off the note, re-finds the original target, then updates the note position
// passes selector so getNotePosition can stack siblings that have already been repositioned above it
const repositionNote = (note) => {
	const id = note.dataset.id
	const annotation = getAnnotationById(id)
	const target = resolveAnnotationTarget(annotation?.selector)
	if (!annotation) { note.hidden = true; return }
	note.hidden = false

	const position = target ? getNotePosition(target, annotation.selector, annotation.id) : getFallbackNotePosition(annotation)
 if (target) lastNotePositions.set(id, { left: position.left - (annotation.offsetInline || 0), top: position.top - (annotation.offsetBlock || 0) })
 syncMissingNoteWarning(note, !target, annotation)

	note.style.insetBlockStart = `${position.top}px`
	note.style.insetInlineStart = `${position.left}px`
}

// all notes reposition together on scroll and resize
// repositions in DOM order so each note measures already-updated siblings above it for correct stacking
// Element.querySelectorAll: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
// NodeList.forEach: https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach
// only runs while annotating so this isn't doing extra work all the time
const repositionAnnotations = () => {
	if ((!isAnnotating && !isPreviewing && !isMoving) || !layer) return

	layer.querySelectorAll('.notate-note').forEach((note) => {
		repositionNote(note)
	})
}



// INITIAL LOAD______________________________________________________________________________________

// Navigate to the rendered card, including its saved drag offset, not the target bounds.
const scrollToNote = note => {
 if (!note) return
 const rect = note.getBoundingClientRect()
 window.scrollTo({
  top: Math.max(0, window.scrollY + rect.top + rect.height / 2 - window.innerHeight / 2),
  behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth'
 })
}
const scrollToFirstAnnotation = () => {
 const note = [...(layer?.children || [])].find(item => item.dataset.id === annotations[0]?.id)
 scrollToNote(note)
}

// keep the enter-annotation-mode behavior in one function so initial load and popup messages do the same thing
// scroll param controls whether to jump to the first annotation—only true when coming from the popup
// selector scrolls to that specific annotation instead of the first one
// if the tab is hidden when this runs, wait for it to become visible before scrolling so it doesn't get lost
// Document.visibilityState: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilityState
// visibilitychange event: https://developer.mozilla.org/en-US/docs/Web/API/Document/visibilitychange_event
// Element.scrollIntoView: https://developer.mozilla.org/en-US/docs/Web/API/Element/scrollIntoView
let jumpHighlightTimer = null
const showNotesOnPage = async (mode = 'annotate', scroll = false, selector = null, annotationId = null) => {
	clearTimeout(jumpHighlightTimer)
	await loadAnnotations()
	if (mode === 'preview') startPreviewing()
	else startAnnotating()

	if (!scroll) return

	const scrollTarget = () => {
		const annotation = annotations.find(item => item.id === annotationId) || (selector
			? annotations.find((item) => item.selector === selector)
			: annotations[0])
		const target = annotation
			? resolveAnnotationTarget(annotation.selector)
			: resolveAnnotationTarget(selector)

		if (annotation && !target) {
			const note = [...(layer?.children || [])].find(item => item.dataset.id === annotation.id)
			if (note) { delete note.dataset.warningDismissed; syncMissingNoteWarning(note, true, annotation); scrollToNote(note) }
			return
		}

		if (annotation && selector) {
			clearTimeout(jumpHighlightTimer)
			jumpHighlightTimer = setTimeout(() => {
				const note = [...(layer?.children || [])].find(item => item.dataset.id === annotation.id)
				if (!note || layer.hidden) return
				previewNoteTarget(note, annotation)
				const preview = noteTargetPreview
				if (!preview) return
				const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
				const pulse = preview.overlay.animate([
					{ opacity: 0, offset: 0 },
					{ opacity: 1, offset: 0.2 },
					{ opacity: 1, offset: 0.45 },
					{ opacity: 0, offset: 0.8 },
					{ opacity: 0, offset: 1 }
				], { duration: reduced ? 1 : 1400, iterations: reduced ? 1 : 2, easing: 'ease-in-out' })
				pulse.onfinish = () => {
					if (noteTargetPreview === preview && !note.matches(':hover, :focus-within')) clearNoteTargetPreview()
				}
			}, 450)
		}

		const note = [...(layer?.children || [])].find(item => item.dataset.id === annotation?.id)
		scrollToNote(note)
	}

	const runScroll = () => requestAnimationFrame(scrollTarget)

	if (document.visibilityState === 'visible') {
		runScroll()
		setTimeout(runScroll, 250)
		return
	}

	document.addEventListener('visibilitychange', () => {
		if (document.visibilityState !== 'visible') return
		runScroll()
		setTimeout(runScroll, 250)
	}, { once: true })
}

const enterAnnotationMode = async (scroll = false, selector = null, annotationId = null) => {
	await showNotesOnPage('annotate', scroll, selector, annotationId)
}

const enterPreviewMode = async (scroll = false, selector = null, annotationId = null) => {
	await showNotesOnPage('preview', scroll, selector, annotationId)
}

// when page loads, pull this page's annotations from shared extension storage
// then check if the popup flagged this url to auto-enter annotation mode
// also checks for a selector in case a specific annotation was clicked in the popup
// chrome.storage.local.remove: https://developer.chrome.com/docs/extensions/reference/api/storage
// async functions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
const initAnnotations = async () => {
	if (!getExtensionStorage()) return

	await loadAnnotations()

	const stored = await extensionStorageGet(['notate-pending-url', 'notate-pending-selector', 'notate-pending-note-id', 'notate-pending-at', 'notate-pending-mode', 'notate-pending-group'])
	const pendingUrl = stored['notate-pending-url']
	const pendingAge = Date.now() - (stored['notate-pending-at'] || 0)
	pendingGroup = notateNormalizeGroup(stored['notate-pending-group'] || '')

	if (!pendingUrl || pendingAge > 15000 || !pageUrlsMatch(pendingUrl, location.href)) return

	await extensionStorageRemove(['notate-pending-url', 'notate-pending-selector', 'notate-pending-note-id', 'notate-pending-at', 'notate-pending-mode', 'notate-pending-group'])

	const pendingSelector = stored['notate-pending-selector'] || null
	const pendingMode = stored['notate-pending-mode'] === 'annotate' ? 'annotate' : 'preview'
	await showNotesOnPage(pendingMode, true, pendingSelector, stored['notate-pending-note-id'])
}

// Refresh visible notes after library deletion/clearing without changing draft fields.
chrome.storage?.onChanged?.addListener(async (changes, area) => {
	if (area !== 'local' || !changes[storageKey] || noteDrag || deletingNotes.size || modalSavePending) return
	try {
		await loadAnnotations()
		clearHighlights()
		if (isAnnotating || isPreviewing || isMoving) renderAllAnnotations()
	} catch (error) {
		showPageOperationError(error)
	}
})

// A low-cost URL check also catches history.pushState in the page's isolated world.
// Keep drafts visible, but disable stale targeting until the user selects on the new route.
let observedPageUrl = location.href
const checkPageRoute = async () => {
 if (location.href === observedPageUrl) return
 const previous = observedPageUrl
 observedPageUrl = location.href
 if (pageUrlsMatch(previous, observedPageUrl)) return
 ++annotationLoadVersion
 clearTimeout(jumpHighlightTimer)
 clearNoteTargetPreview()
 clearHoverFill()
 clearHighlights()
 if (layer) layer.replaceChildren()
 annotations = []
 noteDrag = null
 isAnnotating = false
 isPreviewing = false
 isMoving = false
 document.documentElement.classList.remove('notate-is-annotating', 'notate-is-previewing', 'notate-is-moving')
 if (modal?.open) reportPageStorageError('The page changed. Copy your draft before selecting another element.')
 else removeToolbar()
 try { await loadAnnotations() } catch (error) { reportPageStorageError(error.message) }
}
const routeCheckTimer = setInterval(() => {
 if (!getExtensionStorage()) { clearInterval(routeCheckTimer); return }
 checkPageRoute().catch(() => {})
}, 500)
window.addEventListener('popstate', checkPageRoute)
window.addEventListener('hashchange', checkPageRoute)
initAnnotations().catch(error => { createToolbar(); reportPageStorageError(error.message) })



// EVENT LISTENERS______________________________________________________________________________________

document.addEventListener('click', onLayerClick, true)
document.addEventListener('click', onPageClick, true)
document.addEventListener('click', onNoteClick, true)
document.addEventListener('click', onToolbarClick, true)
document.addEventListener('keydown', onKeydown)
document.addEventListener('keyup', (event) => {
	if (event.key === 'Alt' && isPreviewing) clearHoverFill()
})
document.addEventListener('pointerdown', (event) => {
	if ((!isMoving && !isAnnotating && !isPreviewing) || modal?.open || event.button !== 0) return
	if (event.target.closest('.notate-delete, [data-missing-note-warning]')) return

	const note = event.target.closest('.notate-note')
	if (!note) return

	const annotation = getAnnotationById(note.dataset.id)
	if (!annotation) return

	noteDidDrag = false
	noteDrag = {
		id: annotation.id,
		baseline: structuredClone(annotation),
		startX: event.clientX,
		startY: event.clientY,
		originInline: annotation.offsetInline || 0,
		originBlock: annotation.offsetBlock || 0,
		moved: false
	}
	note.setPointerCapture(event.pointerId)
}, true)

document.addEventListener('pointermove', (event) => {
	if (!noteDrag) return

	const deltaX = event.clientX - noteDrag.startX
	const deltaY = event.clientY - noteDrag.startY
	if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
		noteDrag.moved = true
		noteDidDrag = true
	}

	const annotation = getAnnotationById(noteDrag.id)
	if (!annotation) return

	annotation.offsetInline = Math.round(noteDrag.originInline + deltaX)
	annotation.offsetBlock = Math.round(noteDrag.originBlock + deltaY)
	repositionAnnotations()
}, true)

const finishNoteDrag = async () => {
	if (!noteDrag) return
	const dragged = noteDrag
	noteDrag = null
	if (!dragged.moved) return
	const note = getAnnotationById(dragged.id)
	if (!note) return
	try {
		await notateMutate({ type: 'move', url: location.href, id: dragged.id, expected: dragged.baseline,
			patch: { offsetInline: note.offsetInline, offsetBlock: note.offsetBlock } })
		await loadAnnotations()
	} catch {
		note.offsetInline = dragged.originInline
		note.offsetBlock = dragged.originBlock
		try { await loadAnnotations() } catch {}
		reportPageStorageError('Could not save the position. The note was returned to its saved position.')
	}
	repositionAnnotations()
}
document.addEventListener('pointerup', finishNoteDrag, true)
document.addEventListener('pointercancel', () => {
	if (noteDrag) {
		const note = getAnnotationById(noteDrag.id)
		if (note) { note.offsetInline = noteDrag.originInline; note.offsetBlock = noteDrag.originBlock }
		noteDrag = null
		repositionAnnotations()
	}
}, true)

// add hover fill to only the exact element under the cursor not with CSS :hover because couldn't keep the hover state to just the hovered element. it was spreading to the whole parent if the hovered element didn't have its own background.
// closest: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
const blockedHoverSelectors = ['#notate-modal', '#notate-toolbar', '#notate-confirm-host', '.notate-note']
const isBlockedHoverTarget = (el) => blockedHoverSelectors.some((s) => el.closest(s))
const isRootHoverTarget = (el) => el === document.body || el === document.documentElement

const coyoteMs = () => {
	const value = getComputedStyle(toolbar || modal || layer || document.documentElement).getPropertyValue('--notate-duration-md').trim()
	const parsed = parseFloat(value)
	return Number.isFinite(parsed) ? parsed : 180
}

// overlay a temporary yellow div over images on hover since background-color doesn't work over <img>
let hoverOverlay = null
let hoveredEl = null
let hoverLeaveTimer = null

function clearHoverFill() {
	if (hoverOverlay) {
		hoverOverlay.remove()
		hoverOverlay = null
	}

	if (hoveredEl?.classList.contains('notate-hover')) {
		hoveredEl.classList.remove('notate-hover')
	}

	hoveredEl = null
}

const placeHoverOverlay = (element) => {
	if (!element) return

	const rect = element.getBoundingClientRect()
	if (!hoverOverlay) {
		hoverOverlay = document.createElement('div')
		hoverOverlay.id = 'notate-img-overlay'
		document.body.append(hoverOverlay)
	}

	hoverOverlay.style.insetBlockStart = `${rect.top}px`
	hoverOverlay.style.insetInlineStart = `${rect.left}px`
	hoverOverlay.style.inlineSize = `${rect.width}px`
	hoverOverlay.style.blockSize = `${rect.height}px`
}

const shouldAimOverlay = (event) => {
	if (modal?.open) return false
	if (isAnnotating) return true
	if (isPreviewing && event.altKey) return true
	return false
}

document.addEventListener('pointermove', (event) => {
	if (!isAnnotating && !isPreviewing && !isMoving) return
	if (isBlockedHoverTarget(event.target) || isRootHoverTarget(event.target)) return

	lastPointerX = event.clientX
	lastPointerY = event.clientY
	lastPointerTarget = event.target

	if (shouldAimOverlay(event)) {
		window.clearTimeout(hoverLeaveTimer)
		hoveredEl = event.target
		placeHoverOverlay(event.target)
		return
	}

	if (isPreviewing) clearHoverFill()
}, true)

document.addEventListener('mouseover', (event) => {
	if (!shouldAimOverlay(event) || isBlockedHoverTarget(event.target) || isRootHoverTarget(event.target)) return

	window.clearTimeout(hoverLeaveTimer)
	hoveredEl = event.target

	// check for if it's an image because background-color wasn't working on img elements, so i needed to make a separate hover state for them that puts a yellow overlay div on top of the image instead of trying to change the image's background-color
	// googled: "how to check if element is an image javascript" and found tagName property as second option which took me to this: https://www.encodedna.com/javascript/check-if-element-is-an-image-using-javascript-tagname-property.htm#:~:text=Let%20us%20assume%20I%20have,the%20ID%20of%20each%20image.
	if (event.target.tagName === 'IMG') {
		// used same getBoundingClientRect from getNotePosition to position the hoverOverlay exactly on top of the image, then add it to the body so it shows up on top of the image with a yellow background
		const rect = event.target.getBoundingClientRect()
		if (!hoverOverlay) {
			hoverOverlay = document.createElement('div')
			// id styled in webpage.css
			hoverOverlay.id = 'notate-img-overlay'
			// https://developer.mozilla.org/en-US/docs/Web/API/Element/append
			document.body.append(hoverOverlay)
		}
		hoverOverlay.style.insetBlockStart = `${rect.top}px`
		hoverOverlay.style.insetInlineStart = `${rect.left}px`
		hoverOverlay.style.inlineSize = `${rect.width}px`
		hoverOverlay.style.blockSize = `${rect.height}px`
	} else {
		placeHoverOverlay(event.target)
	}
}, true)

// mouseover/mouseout: https://developer.mozilla.org/en-US/docs/Web/API/Element/mouseover_event
document.addEventListener('mouseout', (event) => {
	if (!isAnnotating && !(isPreviewing && event.altKey)) return

	const leaving = event.target

	hoverLeaveTimer = window.setTimeout(() => {
		if (hoveredEl !== leaving) return
		clearHoverFill()
	}, coyoteMs())
}, true)

window.addEventListener('scroll', repositionAnnotations)
window.addEventListener('resize', repositionAnnotations)


// listen for popup messages like start annotating or clear this page
// runs a selector through for already-open tabs so they scroll to the right annotation
// chrome.runtime.onMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
chrome.runtime.onMessage.addListener((message, _sender, sendResponse) => {
	if (message.action === 'notate-ping') {
		sendResponse({ ok: true })
		return
	}

	const runtimeActions = {
		'enter-annotation-mode': () => enterAnnotationMode(false),
		'enter-annotation-mode-scroll': () => enterAnnotationMode(true, message.selector || null, message.annotationId || null),
		'enter-preview-mode': () => enterPreviewMode(false),
		'enter-preview-mode-scroll': () => enterPreviewMode(true, message.selector || null, message.annotationId || null),
		'toggle-annotate-mode': toggleAnnotating,
		'clear-annotations': clearAnnotations
	}
	const action = runtimeActions[message.action]

	if (!action) return

	if (Object.hasOwn(message, 'group')) {
		pendingGroup = notateNormalizeGroup(message.group)
	}

	Promise.resolve().then(action).catch(showPageOperationError)
})
})()
