// ______________________________________________________________________________________
// ERIC'S DEMO: 
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

// END OF ERIC'S DEMO
// ______________________________________________________________________________________

let activeTarget = null
let modal
let textarea
let form

let annotations = []
let layer
let badge

let isAnnotating = false
let annotatedClass = 'is-annotated'
let editingAnnotationId = null

// like in Eric's reading time demo, adding a badge to show that we're in annotation mode, and also to have a place to put the "clear annotations" button later on.
const createBadge = () => {
	if (badge) return

	badge = document.createElement('aside')
	badge.id = 'notate-badge'
	badge.textContent = 'Annotating'

	document.body.append(badge)
}

// remove badge when exiting annotate mode
// MDN remove(): https://developer.mozilla.org/en-US/docs/Web/API/Element/remove
const removeBadge = () => {
	if (!badge) return

	badge.remove()
	badge = null
}

// create parent layer for notes
const createLayer = () => {
	if (layer) return

	layer = document.createElement('aside')
	layer.id = 'notate-layer'
	layer.hidden = true

	document.body.append(layer)
}

// Create modal 
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

// simple id generator of timestamp so that each annotation has a unique id for rendering and saving the annotations and maybe editing later?
// MDN Date.now(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
const createAnnotationId = () => {
	return `annotation-${Date.now()}`
}

// so that the selector is more specific to the exact element, I'm checking if it has an id first,
// and if it doesn't I'm building a parent > child path with nth-of-type so querySelector can find the right one again later.
const getSelector = (element) => {
	if (element.id) return `#${element.id}`

	const parts = []
	let current = element

	while (current && current.nodeType === 1 && current !== document.body) {
		let selector = current.tagName.toLowerCase()

		const parent = current.parentElement
		if (!parent) break

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

// get element position
// MDN getBoundingClientRect(): https://developer.mozilla.org/en-US/docs/Web/API/Element/getBoundingClientRect
const getNotePosition = (target) => {
	const rect = target.getBoundingClientRect()

	return {
		top: rect.top + window.scrollY,
		left: rect.right + window.scrollX + 8
	}
}

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

const showLayer = () => {
	createLayer()
	layer.hidden = false
}

const hideLayer = () => {
	if (!layer) return

	layer.hidden = true
}

const clearRenderedAnnotations = () => {
	if (!layer) return

	layer.innerHTML = ''
}

// render annotation
const renderAnnotation = (annotation) => {
	createLayer()

	const target = document.querySelector(annotation.selector)
	if (!target) return

	highlightTarget(annotation.selector)

	const position = getNotePosition(target)

	const note = document.createElement('aside')
	note.className = 'notate-note'
	note.dataset.id = annotation.id

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

const updateAnnotation = (id, text) => {
	const annotation = getAnnotationById(id)
	if (!annotation) return

	annotation.text = text

	localStorage.setItem('notate-annotations', JSON.stringify(annotations))

	const note = document.querySelector(`.notate-note[data-id="${id}"]`)
	if (!note) return

	const noteText = note.querySelector('p')
	if (!noteText) return

	noteText.textContent = text
}

const deleteAnnotation = (id) => {
	const annotation = getAnnotationById(id)
	if (!annotation) return

	unhighlightTarget(annotation.selector)

	annotations = annotations.filter((item) => {
		return item.id !== id
	})

	localStorage.setItem('notate-annotations', JSON.stringify(annotations))

	const note = document.querySelector(`.notate-note[data-id="${id}"]`)
	if (!note) return

	note.remove()
}

const clearAnnotations = () => {
	annotations.forEach((annotation) => {
		unhighlightTarget(annotation.selector)
	})

	annotations = []

	localStorage.removeItem('notate-annotations')

	clearRenderedAnnotations()
	hideLayer()
}

const toggleAnnotating = () => {
	isAnnotating = !isAnnotating

	document.documentElement.classList.toggle('is-annotating', isAnnotating)

	if (isAnnotating) {
		createBadge()
		renderAllAnnotations()
		return
	}

	removeBadge()
	hideLayer()

	annotations.forEach((annotation) => {
		unhighlightTarget(annotation.selector)
	})
}

const exitAnnotating = () => {
	isAnnotating = false

	document.documentElement.classList.remove('is-annotating')

	removeBadge()
	hideLayer()

	annotations.forEach((annotation) => {
		unhighlightTarget(annotation.selector)
	})
}

// modal submit so that when I submit the form, it saves the annotation and renders it on the page, and if I click cancel or submit with no text, it just closes the modal without saving anything
// MDN preventDefault(): https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
const onModalSubmit = (event) => {
	event.preventDefault()

	const submitter = event.submitter
	if (!submitter) return

	if (submitter.value === 'cancel') {
		editingAnnotationId = null
		activeTarget = null
		modal.close()
		return
	}

	const text = textarea.value.trim()
	if (!text) {
		editingAnnotationId = null
		activeTarget = null
		modal.close()
		return
	}

	if (editingAnnotationId) {
		updateAnnotation(editingAnnotationId, text)

		textarea.value = ''
		editingAnnotationId = null
		activeTarget = null

		modal.close()
		return
	}

	if (!activeTarget) {
		modal.close()
		return
	}

	const annotation = {
		id: createAnnotationId(),
		selector: getSelector(activeTarget),
		text
	}

	annotations.push(annotation)
	// in Eric's setting up JSON in HTML lecture, he said local storage can only handle strings so JSON stringify converts the annotations array into a string the browser can save.
	localStorage.setItem('notate-annotations', JSON.stringify(annotations))

	renderAnnotation(annotation)

	textarea.value = ''
	activeTarget = null
	editingAnnotationId = null

	modal.close()
}

const onLayerClick = (event) => {
	const deleteButton = event.target.closest('.notate-delete')
	if (!deleteButton) return

	event.preventDefault()
	event.stopPropagation()

	const note = deleteButton.closest('.notate-note')
	if (!note) return

	deleteAnnotation(note.dataset.id)
}

const onPageClick = (event) => {
	if (!isAnnotating) return
	// if the modal is already open, do nothing
	if (modal?.open) return

	const clickedInsideModal = event.target.closest('#notate-modal')
	if (clickedInsideModal) return

	const clickedBadge = event.target.closest('#notate-badge')
	if (clickedBadge) return

	const clickedNote = event.target.closest('.notate-note')
	if (clickedNote) return

	event.preventDefault()
	event.stopPropagation()

	activeTarget = event.target
	editingAnnotationId = null

	createModal()

	textarea.value = ''

	modal.showModal()
}

const onNoteClick = (event) => {
	const clickedDelete = event.target.closest('.notate-delete')
	if (clickedDelete) return

	const note = event.target.closest('.notate-note')
	if (!note) return

	event.preventDefault()
	event.stopPropagation()

	const annotation = getAnnotationById(note.dataset.id)
	if (!annotation) return

	createModal()

	editingAnnotationId = annotation.id
	activeTarget = document.querySelector(annotation.selector)
	textarea.value = annotation.text

	modal.showModal()
}

// I wanted to exit annotation mode when clicking escape like what the font extension: https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
const onKeydown = (event) => {
	if (event.key !== 'Escape') return
	if (!isAnnotating) return

	exitAnnotating()
}

const repositionAnnotations = () => {
	if (!isAnnotating) return

	document.querySelectorAll('.notate-note').forEach((note) => {
		const id = note.dataset.id
		const annotation = getAnnotationById(id)
		if (!annotation) return

		const target = document.querySelector(annotation.selector)
		if (!target) return

		const position = getNotePosition(target)

		note.style.insetBlockStart = `${position.top}px`
		note.style.insetInlineStart = `${position.left}px`
	})
}

// when page loads, get the annotations from local storage and render them on the page
const saved = localStorage.getItem('notate-annotations')

if (saved) {
	annotations = JSON.parse(saved)
}

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

	actions[message.action]?.()
})