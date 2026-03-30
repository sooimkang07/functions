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

// checking if script is running on matches (all_urls) not just the dev site from before
// console.log("is this on?")

// testing inline styling of all p on every page
// let paras = document.querySelectorAll('p')
// // console.log(paras)
// paras.forEach(paragraph => {
// 	paragraph.style.transform = 'skew(45deg)'
//  })

// styling all p elements by adding a class connected by our stylesheet css instead of inline styling so that it can be easily changed in the css file (for more complex styling later, want to keep as little js as possible)
// let paras = document.querySelectorAll('p')
// paras.forEach((paragraph) => {
// 	paragraph.classList.add('italicize')
// })

// let paras = document.querySelectorAll('p')

// // how to write the ui html for your extension
// let container = `
// 	<div id="paragraph-counter">
// 		<p>You have ${paras.length} paragraphs on this page.</p>
// 	</div>
// `
// document.body.insertAdjacentHTML('beforeend', container)

// END OF ERIC'S DEMO
// ______________________________________________________________________________________
let activeTarget = null
let modal
let textarea

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

const removeBadge = () => {
	if (!badge) return

	badge.remove()
	badge = null
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
			<label for="annotation-text">Notate</label>
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

	textarea = modal.querySelector('textarea')
}

const onPageClick = (event) => {
	if (!isAnnotating) return
	// if the modal is already open, do nothing
	if (modal?.open) return

	const clickedInsideModal = event.target.closest('#notate-modal')
	if (clickedInsideModal) return

	const clickedBadge = event.target.closest('#notate-badge')
	if (clickedBadge) return

    // stop normal clicking behavior from page while annotating to not compete
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