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
let isAnnotating = false

// like in Eric's reading time demo, adding a badge to show that we're in annotation mode, and also to have a place to put the "clear annotations" button later on.
let badge

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

	document.body.append(layer)
}

// simple id generator
// MDN Date.now(): https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Date/now
const createAnnotationId = () => {
	return `annotation-${Date.now()}`
}

// simple selector logic
const getSelector = (element) => {
	if (element.id) return `#${element.id}`

	const parent = element.parentElement
	if (!parent) return element.tagName.toLowerCase()

	const siblings = [...parent.children].filter((child) => {
		return child.tagName === element.tagName
	})

	const index = siblings.indexOf(element) + 1

	return `${element.tagName.toLowerCase()}:nth-of-type(${index})`
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

// render annotation
const renderAnnotation = (annotation) => {
	createLayer()

	const target = document.querySelector(annotation.selector)
	if (!target) return

	const position = getNotePosition(target)

	const note = document.createElement('aside')
	note.className = 'notate-note'
	note.dataset.id = annotation.id
	note.textContent = annotation.text
	note.style.insetBlockStart = `${position.top}px`
	note.style.insetInlineStart = `${position.left}px`

	layer.append(note)
}

const toggleAnnotating = () => {
	isAnnotating = !isAnnotating

	document.documentElement.classList.toggle('is-annotating', isAnnotating)

	if (isAnnotating) createBadge()
	else removeBadge()
}

const exitAnnotating = () => {
	isAnnotating = false

	document.documentElement.classList.remove('is-annotating')

	removeBadge()
}

// I want to exit annotation mode when clicking escape like what the font extension: https://developer.mozilla.org/en-US/docs/Web/API/Element/keydown_event
const onKeydown = (event) => {
	if (event.key !== 'Escape') return
	if (!isAnnotating) return

	exitAnnotating()
}

// Create modal 
const createModal = () => {
	if (modal) return

	modal = document.createElement('dialog')
	modal.id = 'notate-modal'

	modal.innerHTML = `
		<form method="dialog">
			<label for="annotation-text">Notation</label>
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

// modal submit
// MDN preventDefault(): https://developer.mozilla.org/en-US/docs/Web/API/Event/preventDefault
const onModalSubmit = (event) => {
	event.preventDefault()

	const submitter = event.submitter
	if (!submitter) return

	if (submitter.value === 'cancel') {
		modal.close()
		return
	}

	const text = textarea.value.trim()
	if (!text) {
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

	renderAnnotation(annotation)

	textarea.value = ''
	activeTarget = null

	modal.close()
}

const onPageClick = (event) => {
	if (!isAnnotating) return
	// if the modal is already open, do nothing
	if (modal?.open) return

	const clickedInsideModal = event.target.closest('#notate-modal')
	if (clickedInsideModal) return

	const clickedBadge = event.target.closest('#notate-badge')
	if (clickedBadge) return

	event.preventDefault()
	event.stopPropagation()

	activeTarget = event.target

	createModal()

	textarea.value = ''

	modal.showModal()
}

document.addEventListener('click', onPageClick, true)

chrome.runtime.onMessage.addListener((message) => {
	const actions = {
		'toggle-annotate-mode': toggleAnnotating
	}

	actions[message.action]?.()
})

document.addEventListener('keydown', onKeydown)