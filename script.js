// like Eric's chrome extension demo selecting for all ul buttons, but here I'm selecting for all elements in popup that has data-action attribute like Eric did with the tabId for the chrome tabs demo.
const controls = document.querySelectorAll('[data-action]')


const sendAction = async (action) => {
	// from eric's demo: await says hold up i'm gonna use this tabs variable but i need it to actually have content in it first so wait for this entire query to come back before i do anything else.
	const [tab] = await chrome.tabs.query({
		// I don't need to ({}) all tabs because I only need the one I'm active on, so I'm setting the query to only look for the active tab in the current window.
		active: true,
		// Just need the current chrome window  
		currentWindow: true
	})

	// if no tab or id, no need to render like in reading time script example
	if (!tab?.id) return

	// the id of the active tab is what I need to send the message to the content script so it can do something with it. 
	chrome.tabs.sendMessage(tab.id, { action })
}

// like with Eric's make active button function in demo, this loops through every control and adds an event listener for click that sends the action of the click to the content script to do something with it.
controls.forEach((control) => {
	control.addEventListener('click', () => {
		sendAction(control.dataset.action)
	})
})