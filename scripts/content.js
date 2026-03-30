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

// setup my variables
const layerId = 'notate-layer'
const modalId = 'notate-modal'
// need to get the page's built-in info to use for saving notes even after leaving page and coming back
const pageKey = `${window.location.hostname}${window.location.pathname}`

const state = {
	isAnnotating: false,
	isVisible: true,
	activeTarget: null,
	activeNoteId: null,
	notes: []
}