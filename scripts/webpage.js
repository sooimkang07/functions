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
//   badge.classList.add("color-secondary-text", "type--caption");
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
let annotatedClass = 'is-annotated'
let editingAnnotationId = null
// save all current annotations in the browser so they still exist when visiting site later
// Storage.setItem: https://developer.mozilla.org/en-US/docs/Web/API/Storage/setItem, JSON.stringify: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/JSON/stringify
// takes annotations array and saves it under storageKey as a string
let storageKey = 'notate-annotations'

// keep one shared saved object in chrome storage so popup and content script can both read it
// chrome.storage.local.get: https://developer.chrome.com/docs/extensions/reference/api/storage, async: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function, await from Eric demo, logical OR operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Logical_OR
const getStoredAnnotations = async () => {
	const stored = await chrome.storage.local.get(storageKey)
	return stored[storageKey] || {}
}

// use the current page url as the key for that page's annotation group
// Location.href: https://developer.mozilla.org/en-US/docs/Web/API/Location/href
// keeps each page's saved notes separated by its own url
const getPageKey = () => {
	return location.href
}

// save this page back into the extension storage
// chrome.storage.local.set: https://developer.chrome.com/docs/extensions/reference/api/storage
// stores title, url, annotations, and updatedAt so the popup can sort by recency later
const saveAnnotations = async () => {
	// instead of saving one array per page in localStorage, save this page inside the shared extension storage
	const storedAnnotations = await getStoredAnnotations()

	storedAnnotations[getPageKey()] = {
		title: document.title,
		url: location.href,
		annotations,
		updatedAt: Date.now()
	}

	await chrome.storage.local.set({
		[storageKey]: storedAnnotations
	})
}

// pull saved annotations back in when the page loads
// chrome.storage.local.get returns the shared annotation object, then this page pulls only its own annotations back out
const loadAnnotations = async () => {
	const storedAnnotations = await getStoredAnnotations()
	const pageData = storedAnnotations[getPageKey()]

	annotations = pageData?.annotations || []
}

// remove this page's saved record completely when it no longer has any annotations
// delete operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/delete
const removeStoredPage = async () => {
	const storedAnnotations = await getStoredAnnotations()
	delete storedAnnotations[getPageKey()]

	await chrome.storage.local.set({
		[storageKey]: storedAnnotations
	})
}

// modal resets after save/cancel
// HTMLTextAreaElement.value: https://developer.mozilla.org/en-US/docs/Web/API/HTMLTextAreaElement#value
// clears textarea.value, activeTarget and editingAnnotationId so nothing carries over
const resetModalState = () => {
	textarea.value = ''
	activeTarget = null
	editingAnnotationId = null
}

// close modal
// HTMLDialogElement.close: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/close
// resets the modal state first then closes
const closeModal = () => {
	if (!modal) return

	resetModalState()
	modal.close()
}

// open modal to create a new annotation
// HTMLDialogElement.showModal: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
// stores the clicked target in activeTarget, clears edit mode, opens modal
const openCreateModal = (target) => {
	createModal()

	activeTarget = target
	editingAnnotationId = null
	textarea.value = ''
	modal.showModal()
}

// open the modal with an existing annotation
// Document.querySelector: https://developer.mozilla.org/en-US/docs/Web/API/Document/querySelector, HTMLDialogElement.showModal: https://developer.mozilla.org/en-US/docs/Web/API/HTMLDialogElement/showModal
// uses annotation.selector, annotation.id, and annotation.text to reopen the right note in edit mode
const openEditModal = (annotation) => {
	createModal()

	editingAnnotationId = annotation.id
	activeTarget = document.querySelector(annotation.selector)
	textarea.value = annotation.text
	modal.showModal()
}

// place clear and exit buttons in toolbar when annotation mode is on
// Document.createElement: https://developer.mozilla.org/en-US/docs/Web/API/Document/createElement, Element.append: https://developer.mozilla.org/en-US/docs/Web/API/Element/append
// builds #notate-toolbar, fills it with the two buttons, inserts it into document.body to show up on page
const createToolbar = () => {
	if (toolbar) return

	toolbar = document.createElement('aside')
	toolbar.id = 'notate-toolbar'

	toolbar.innerHTML = `
		<div class="notate-toolbar-group">
			<button class="notate-toolbar-button" type="button" data-action="clear">
				Clear all notations
			</button>
			<button class="notate-toolbar-button" type="button" data-action="exit">
				Exit Notate
			</button>
		</div>
	`

	document.body.append(toolbar)
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
			<textarea id="annotation-text" name="annotation-text"></textarea>
			<menu>
				<li>
					<button type="submit" name="intent" value="cancel">Cancel</button>
				</li>
				<li>
					<button type="submit" name="intent" value="save">Save</button>
				</li>
			</menu>
		</form>
	`

	// so that the modal is part of the page and can be interacted with, instead of just being created in the background and not showing up
	document.body.append(modal)

	form = modal.querySelector('form')
	textarea = modal.querySelector('textarea')

	form.addEventListener('submit', onModalSubmit)
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
	if (element.id) return `#${element.id}`

	const parts = []
	let current = element

	while (current && current.nodeType === 1 && current !== document.body) {
		let selector = current.tagName.toLowerCase()

		const parent = current.parentElement
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
const getNotePosition = (target) => {
	
	const rect = target.getBoundingClientRect()
	const gap = 8
	const noteWidth = 12 * 16
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

	return {
		top,
		left
	}
}

// outline the targeted element
// Element.classList: https://developer.mozilla.org/en-US/docs/Web/API/Element/classList
// re-finds the element from selector and adds the 'is-annotated' class
const highlightTarget = (selector) => {
	const target = document.querySelector(selector)
	if (!target) return

	target.classList.add(annotatedClass)
}

// remove outline when not targeted or deleted
// DOMTokenList.remove: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/remove
// removes 'is-annotated'` class
const unhighlightTarget = (selector) => {
	const target = document.querySelector(selector)
	if (!target) return

	target.classList.remove(annotatedClass)
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
	if (!layer) return

	layer.hidden = true
}

// clear all rendered note markup before rebuilding
// Element.innerHTML: https://developer.mozilla.org/en-US/docs/Web/API/Element/innerHTML
// empties the note layer by setting layer.innerHTML = ''
const clearRenderedAnnotations = () => {
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
const renderAnnotation = (annotation) => {
	createLayer()

	const target = document.querySelector(annotation.selector)
	if (!target) return

	const position = getNotePosition(target)

	highlightTarget(annotation.selector)

	const note = document.createElement('aside')
	note.className = 'notate-note'
	note.dataset.id = annotation.id

	// "x" corner button to delete the annotation, inserting through html
	note.innerHTML = `
		<button class="notate-delete" type="button" aria-label="Delete annotation">×</button>
		<p>${annotation.text}</p>
	`

	note.style.insetBlockStart = `${position.top}px`
	note.style.insetInlineStart = `${position.left}px`

	layer.append(note)
}

// all saved annotations to render back onto the page together
// shows the layer, clears old note markup, re-renders every item in annotations
const renderAllAnnotations = () => {
	showLayer()
	clearRenderedAnnotations()

	annotations.forEach((annotation) => {
		renderAnnotation(annotation)
	})
}

// saving a new note to create the object, store it, and show it right away
// Array.push: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/push
// builds a new annotation from activeTarget and text, inserts into annotations, saves it, renders it
const createAnnotation = async (text) => {
	const annotation = {
		id: createAnnotationId(),
		selector: getSelector(activeTarget),
		text
	}

	annotations.push(annotation)

	await saveAnnotations()
	renderAnnotation(annotation)
}

// editing a note updates both the saved data and the visible note text
// Node.textContent: https://developer.mozilla.org/en-US/docs/Web/API/Node/textContent
// updates the matching annotation object, saves annotations, updates the <p> inside .notate-note[data-id="${id}"]
const updateAnnotation = async (id, text) => {
	const annotation = getAnnotationById(id)
	annotation.text = text

	await saveAnnotations()

	const note = document.querySelector(`.notate-note[data-id="${id}"]`)
	const noteText = note.querySelector('p')
	noteText.textContent = text
}

// clicking the x fully removes that annotation everywhere
// Array.filter: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/filter, Element.remove https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
// unhighlights the target, filters the item out of annotations, saves again, removes that note element from page
const deleteAnnotation = async (id) => {
	const annotation = getAnnotationById(id)

	unhighlightTarget(annotation.selector)

	annotations = annotations.filter((item) => {
		return item.id !== id
	})

	// to save an empty annotations array or remove the page's record entirely when the last annotation is deleted, so that the popup can show the empty state instead of a page with 0 annotations
	if (annotations.length) {
		await saveAnnotations()
	} else {
		await removeStoredPage()
	}

	// grab annotation by id, unhighlight its target, filter it out of annotations array, save again, then find the note element by id and remove it from the page
	const note = document.querySelector(`.notate-note[data-id="${id}"]`)
	note.remove()
}

// clear this page's annotations everywhere at once
// resets annotations to an empty array, removes this page from extension storage, clears the layer
const clearAnnotations = async () => {
	clearHighlights()

	annotations = []
	await removeStoredPage()

	clearRenderedAnnotations()
	hideLayer()
}

// DOMTokenList.add: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/add
// sets isAnnotating = true, adds 'is-annotating' on document.documentElement, creates toolbar, renders notes
const startAnnotating = () => {
	isAnnotating = true
	document.documentElement.classList.add('is-annotating')
	createToolbar()
	renderAllAnnotations()
}

// DOMTokenList.remove: https://developer.mozilla.org/en-US/docs/Web/API/DOMTokenList/remove
// sets isAnnotating = false, removes 'is-annotating', removes toolbar, hides layer, clears highlights
const stopAnnotating = () => {
	isAnnotating = false
	document.documentElement.classList.remove('is-annotating')
	removeToolbar()
	hideLayer()	
	if (modal?.open) {
		closeModal()
	}
	clearHighlights()
}

// conditional operator: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/Conditional_operator
// picks either startAnnotating or stopAnnotating based on isAnnotating and then runs it, so i can consolidate same function to toggle both on and off
const toggleAnnotating = () => {
	const nextAction = isAnnotating ? stopAnnotating : startAnnotating
	nextAction()
}

// all exitAnnotating calls stopAnnotating so wherever I call, same exit happens
const exitAnnotating = () => {
	stopAnnotating()
}

// Event.preventDefault: https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault, SubmitEvent.submitter: https://developer.mozilla.org/en-US/docs/Web/API/SubmitEvent/submitter
// consolidate to one function so it reads event.submitter.value and textarea.value.trim() to either cancel, ignore blank text, update an existing note, or create a new one
const onModalSubmit = async (event) => {
	event.preventDefault()

	const formData = new FormData(form)
	const submitValue = event.submitter?.value || formData.get('intent') || 'save'
	const text = textarea.value.trim()

	if (submitValue === 'cancel') {
		closeModal()
		return
	}

	if (!text) {
		closeModal()
		return
	}

	if (editingAnnotationId) {
		await updateAnnotation(editingAnnotationId, text)
		closeModal()
		return
	}

	await createAnnotation(text)
	closeModal()
}

// click the x button inside a note to delete only that note
// Element.closest: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
// checks for .notate-delete, finds the parent .notate-note, deletes it using note.dataset.id
const onLayerClick = async (event) => {
	const deleteButton = event.target.closest('.notate-delete')
	if (!deleteButton) return

	event.preventDefault()
	event.stopPropagation()

	const note = deleteButton.closest('.notate-note')
	await deleteAnnotation(note.dataset.id)
}

// page clicks anywhere except on modal, toolbar, and note open modal
// Array.some: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/some, Event.stopPropagation: https://developer.mozilla.org/en-US/docs/Web/API/Event/stopPropagation
// ignores #notate-modal, #notate-toolbar, and .notate-note, then opens create mode on the clicked page element
const onPageClick = (event) => {
	const blockedSelectors = ['#notate-modal', '#notate-toolbar', '.notate-note']
	const clickedInsideBlockedUi = blockedSelectors.some((selector) => {
		return event.target.closest(selector)
	})

	if (!isAnnotating || modal?.open || clickedInsideBlockedUi) return

	event.preventDefault()
	event.stopPropagation()

	openCreateModal(event.target)
}

// click an existing note to reopen for editing
// HTMLElement.dataset: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset, Element.closest: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
// ignores the delete button, finds the clicked .notate-note, gets its id from note.dataset.id, opens that annotation in edit mode
const onNoteClick = (event) => {
	if (event.target.closest('.notate-delete')) return

	const note = event.target.closest('.notate-note')
	if (!note) return

	event.preventDefault()
	event.stopPropagation()

	const annotation = getAnnotationById(note.dataset.id)

	openEditModal(annotation)
}



// toolbar buttons do different actions depending on which one i clicked
// Element.closest: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest, dataset: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
// finds clicked toolbar button inside #notate-toolbar, reads its data-action, then runs clearAnnotations or exitAnnotating
const onToolbarClick = async (event) => {
	const button = event.target.closest('#notate-toolbar [data-action]')
	const action = button?.dataset.action
	const toolbarActions = {
		clear: clearAnnotations,
		exit: exitAnnotating
	}

	if (!action || !toolbarActions[action]) return

	event.preventDefault()
	event.stopPropagation()

	await toolbarActions[action]()
}

// Escape key exits annotation mode
// KeyboardEvent.key: https://developer.mozilla.org/en-US/docs/Web/API/KeyboardEvent/key
const onKeydown = (event) => {
	if (event.key !== 'Escape' || !isAnnotating) return

	exitAnnotating()
}

// each note moves with its annotated element when the page shifts
// HTMLElement.dataset: https://developer.mozilla.org/en-US/docs/Web/API/HTMLElement/dataset
// CSS logical properties: https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_logical_properties_and_values
// grabs the saved id off the note, re-finds the original target, then updates the note position
const repositionNote = (note) => {
	const id = note.dataset.id
	const annotation = getAnnotationById(id)
	const target = document.querySelector(annotation.selector)
	const position = getNotePosition(target)

	note.style.insetBlockStart = `${position.top}px`
	note.style.insetInlineStart = `${position.left}px`
}

// all notes reposition together on scroll and resize
// Element.querySelectorAll: https://developer.mozilla.org/en-US/docs/Web/API/Element/querySelectorAll
// NodeList.forEach: https://developer.mozilla.org/en-US/docs/Web/API/NodeList/forEach
// only runs while annotating so this isn't doing extra work all the time
const repositionAnnotations = () => {
	if (!isAnnotating || !layer) return

	layer.querySelectorAll('.notate-note').forEach((note) => {
		repositionNote(note)
	})
}



// INITIAL LOAD______________________________________________________________________________________

// when page loads, pull this page's annotations from shared extension storage
// async functions: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
const initAnnotations = async () => {
	await loadAnnotations()
}

initAnnotations()



// EVENT LISTENERS______________________________________________________________________________________

document.addEventListener('click', onLayerClick, true)
document.addEventListener('click', onPageClick, true)
document.addEventListener('click', onNoteClick, true)
document.addEventListener('click', onToolbarClick, true)
document.addEventListener('keydown', onKeydown)

window.addEventListener('scroll', repositionAnnotations)
window.addEventListener('resize', repositionAnnotations)


// listen for popup messages like start annotating or clear this page
// chrome.runtime.onMessage: https://developer.chrome.com/docs/extensions/reference/api/runtime
chrome.runtime.onMessage.addListener((message) => {
	const runtimeActions = {
		'enter-annotation-mode': startAnnotating,
		'toggle-annotate-mode': toggleAnnotating,
		'clear-annotations': clearAnnotations
	}
	const action = runtimeActions[message.action]

	if (!action) return

	action()
})