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
let storageKey = 'notate-annotations'



// SAVE ANNOTATIONS- localStorage ______________________________________________________________________________________

const saveAnnotations = () => {
	// in Eric's setting up JSON in HTML lecture, he said local storage can only handle strings so JSON stringify converts the annotations array into a string the browser can save.
	localStorage.setItem(storageKey, JSON.stringify(annotations))
}

const loadAnnotations = () => {
	const saved = localStorage.getItem(storageKey)

	if (saved) {
		annotations = JSON.parse(saved)
	}
}



// MODAL STATES ______________________________________________________________________________________

const resetModalState = () => {
	textarea.value = ''
	activeTarget = null
	editingAnnotationId = null
}

const closeModal = () => {
	resetModalState()
	modal.close()
}

const openCreateModal = (target) => {
	activeTarget = target
	editingAnnotationId = null
	textarea.value = ''
	modal.showModal()
}

const openEditModal = (annotation) => {
	editingAnnotationId = annotation.id
	activeTarget = document.querySelector(annotation.selector)
	textarea.value = annotation.text
	modal.showModal()
}



// ANNOTATION MODE UI______________________________________________________________________________________

// like in Eric's reading time demo, adding a toolbar to show that we're in annotation mode, allow users to exit annotation mode, clear annotations, and eventually customize annotation style
const createToolbar = () => {
	if (toolbar) return

	toolbar = document.createElement('aside')
	toolbar.id = 'notate-toolbar'
	toolbar.textContent = 'Annotating'

	document.body.append(toolbar)
}

// remove toolbar when exiting annotate mode
// MDN remove(): https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
const removeToolbar = () => {
	if (!toolbar) return

	toolbar.remove()
	toolbar = null
}

// create parent layer for notes
const createLayer = () => {
	if (layer) return

	layer = document.createElement('aside')
	layer.id = 'notate-layer'
	layer.hidden = true

	document.body.append(layer)
}

// create modal 
const createModal = () => {
	if (modal) return

	modal = document.createElement('dialog')
	modal.id = 'notate-modal'

	modal.innerHTML = `
		<form method="dialog">
			<textarea id="annotation-text" name="annotation-text"></textarea>
			<menu>
				<li>
					<button type="submit" value="cancel">Cancel</button>
				</li>
				<li>
					<button type="submit" value="save">Save</button>
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



// ANNOTATION DATA______________________________________________________________________________________

// simple id generator of timestamp so that each annotation has a unique id for rendering and saving the annotations and maybe editing later?
// MDN Date.now(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
const createAnnotationId = () => {
	return `annotation-${Date.now()}`
}

// so that the selector is more specific to the exact element, I'm checking if it has an id first, and if it doesn't I'm building a parent > child path with nth-of-type so querySelector can find the right one again later
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

const getAnnotationById = (id) => {
	return annotations.find((annotation) => {
		return annotation.id === id
	})
}



// ANNOTATION POSITIONING______________________________________________________________________________________

// needed to get the selected element's position to position the note to it, so googled "how to get element position on page js" then found https://stackoverflow.com/questions/442404/retrieve-the-position-x-y-of-an-html-element which lef me to getBoundingClientRect(): https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
const getNotePosition = (target) => {
	
	const rect = target.getBoundingClientRect()
	const gap = 8
	const noteWidth = 12 * 16
	const viewportLeft = window.scrollX
	const viewportRight = window.scrollX + window.innerWidth

	let left = rect.right + window.scrollX + gap
	let top = rect.top + window.scrollY

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



// OUTLINE SELECTED ELEMENT______________________________________________________________________________________

const highlightTarget = (selector) => {
	const target = document.querySelector(selector)
	if (!target) return

	target.classList.add(annotatedClass)
}

const unhighlightTarget = (selector) => {
	const target = document.querySelector(selector)
	if (!target) return

	target.classList.remove(annotatedClass)
}



// LAYER VISIBILITY______________________________________________________________________________________

const showLayer = () => {
	createLayer()
	layer.hidden = false
}

const hideLayer = () => {
	layer.hidden = true
}

const clearRenderedAnnotations = () => {
	layer.innerHTML = ''
}

const clearHighlights = () => {
	annotations.forEach((annotation) => {
		unhighlightTarget(annotation.selector)
	})
}



// ANNOTATION RENDERING______________________________________________________________________________________

// render annotation
const renderAnnotation = (annotation) => {
	createLayer()

	const target = document.querySelector(annotation.selector)
	if (!target) return

	const position = getNotePosition(target)

	highlightTarget(annotation.selector)

	const note = document.createElement('aside')
	note.className = 'notate-note'
	note.dataset.id = annotation.id

	// want to create an "x" corner button to delete the annotation, inserting through html
	note.innerHTML = `
		<button class="notate-delete" type="button" aria-label="Delete annotation">×</button>
		<p>${annotation.text}</p>
	`

	note.style.insetBlockStart = `${position.top}px`
	note.style.insetInlineStart = `${position.left}px`

	layer.append(note)
}

const renderAllAnnotations = () => {
	showLayer()
	clearRenderedAnnotations()

	annotations.forEach((annotation) => {
		renderAnnotation(annotation)
	})
}



// ANNOTATION EDITING______________________________________________________________________________________

const createAnnotation = (text) => {
	const annotation = {
		id: createAnnotationId(),
		selector: getSelector(activeTarget),
		text
	}

	annotations.push(annotation)

	saveAnnotations()
	renderAnnotation(annotation)
}

const updateAnnotation = (id, text) => {
	const annotation = getAnnotationById(id)
	annotation.text = text

	saveAnnotations()

	const note = document.querySelector(`.notate-note[data-id="${id}"]`)
	const noteText = note.querySelector('p')
	noteText.textContent = text
}

const deleteAnnotation = (id) => {
	const annotation = getAnnotationById(id)

	unhighlightTarget(annotation.selector)

	annotations = annotations.filter((item) => {
		return item.id !== id
	})

	saveAnnotations()

	const note = document.querySelector(`.notate-note[data-id="${id}"]`)
	note.remove()
}

const clearAnnotations = () => {
	clearHighlights()

	annotations = []

	localStorage.removeItem(storageKey)

	clearRenderedAnnotations()
	hideLayer()
}



// START/STOP ANNOTATION MODE______________________________________________________________________________________

const startAnnotating = () => {
	isAnnotating = true
	document.documentElement.classList.add('is-annotating')
	createToolbar()
	renderAllAnnotations()
}

const stopAnnotating = () => {
	isAnnotating = false
	document.documentElement.classList.remove('is-annotating')
	removeToolbar()
	hideLayer()
	clearHighlights()
}

const toggleAnnotating = () => {
	const nextAction = isAnnotating ? stopAnnotating : startAnnotating
	nextAction()
}

const exitAnnotating = () => {
	stopAnnotating()
}



// SAVE MODAL______________________________________________________________________________________

// modal submit so that when I submit the form, it saves the annotation and renders it on the page, and if I click cancel or submit with no text, it just closes the modal without saving anything
// MDN preventDefault(): https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
const onModalSubmit = (event) => {
	event.preventDefault()

	const submitValue = event.submitter.value
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
		updateAnnotation(editingAnnotationId, text)
		closeModal()
		return
	}

	createAnnotation(text)
	closeModal()
}



// EVENT HANDLERS______________________________________________________________________________________

// delete note when clicking x button
// using closest to make sure that if I click the "x" button, it deletes the annotation, but if I click anywhere else on the note, it opens the edit modal, so that the delete and edit functions don't interfere with each other: https://developer.mozilla.org/en-US/docs/Web/API/Element/closest
const onLayerClick = (event) => {
	const deleteButton = event.target.closest('.notate-delete')
	if (!deleteButton) return

	event.preventDefault()
	event.stopPropagation()

	const note = deleteButton.closest('.notate-note')
	deleteAnnotation(note.dataset.id)
}

// create new modal when clicking normal page element (so not if annotation mode is off, modal already open, i clicked inside modal, clicked toolbar, and clicked existing note)
const onPageClick = (event) => {
	if (!isAnnotating) return
	if (modal?.open) return
	if (event.target.closest('#notate-modal')) return
	if (event.target.closest('#notate-toolbar')) return
	if (event.target.closest('.notate-note')) return

	event.preventDefault()
	event.stopPropagation()

	createModal()
	openCreateModal(event.target)
}

// edit existing annotation when clicked on, pull from saved object using note's id (getAnnotationById(note.dataset.id))
const onNoteClick = (event) => {
	if (event.target.closest('.notate-delete')) return

	const note = event.target.closest('.notate-note')
	if (!note) return

	event.preventDefault()
	event.stopPropagation()

	const annotation = getAnnotationById(note.dataset.id)

	createModal()
	openEditModal(annotation)
}

// I wanted to exit annotation mode when clicking escape like what the font extension: https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
const onKeydown = (event) => {
	if (event.key !== 'Escape') return
	if (!isAnnotating) return

	exitAnnotating()
}

const repositionNote = (note) => {
	const id = note.dataset.id
	const annotation = getAnnotationById(id)
	const target = document.querySelector(annotation.selector)
	const position = getNotePosition(target)

	note.style.insetBlockStart = `${position.top}px`
	note.style.insetInlineStart = `${position.left}px`
}

const repositionAnnotations = () => {
	if (!isAnnotating) return

	document.querySelectorAll('.notate-note').forEach((note) => {
		repositionNote(note)
	})
}



// INITIAL LOAD______________________________________________________________________________________

// when page loads, get the annotations from local storage and render them on the page
loadAnnotations()



// EVENT LISTENERS______________________________________________________________________________________

document.addEventListener('click', onLayerClick, true)
document.addEventListener('click', onPageClick, true)
document.addEventListener('click', onNoteClick, true)
document.addEventListener('keydown', onKeydown)

window.addEventListener('scroll', repositionAnnotations)
window.addEventListener('resize', repositionAnnotations)

chrome.runtime.onMessage.addListener((message) => {
	const actions = {
		'toggle-annotate-mode': toggleAnnotating,
		'clear-annotations': clearAnnotations
	}

	actions[message.action]()
})