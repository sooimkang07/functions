// like Eric's chrome extension demo selecting for all ul buttons, but here I'm selecting for all elements in popup that has data-action attribute like Eric did with the tabId for the chrome tabs demo.
const controls = document.querySelectorAll('[data-action]')

const sendAction = async (event) => {
	const control = event.currentTarget

	// I only need the active tab in the current window because that's the page I want to annotate
	const [tab] = await chrome.tabs.query({
		active: true,
		currentWindow: true
	})

	// if there is no active tab id then there is nothing to send
	if (!tab?.id) return

	// the id of the active tab is what I need to send the message to the content script so it can do something with it. 
	chrome.tabs.sendMessage(tab.id, {
		action: control.dataset.action
	})
}

controls.forEach((control) => {
	control.addEventListener('click', sendAction)
})