// looked up: https://www.google.com/search?q=how+to+start+my+chrome+extension+on+click+not+on+popup&rlz=1C5CHFA_enUS976US983&oq=how+to+start+my+chrome+extension+on+click+not+on+popup&gs_lcrp=EgZjaHJvbWUyBggAEEUYOTIHCAEQIRigATIHCAIQIRigATIHCAMQIRigATIHCAQQIRigAdIBCDgwNzZqMGo3qAIAsAIA&sourceid=chrome&ie=UTF-8 pulling from https://developer.chrome.com/docs/extensions/reference/api/action 
// so now when user clicks the extension icon, background.js runs and sends a message to webpage.js to toggle annotation mode on/off and toolbar appears (instead of opening a popup where user has to click another button to start annotation mode)
chrome.action.onClicked.addListener((tab) => {
	if (!tab?.id) return

	chrome.tabs.sendMessage(tab.id, {
		action: 'toggle-annotate-mode'
	})
})