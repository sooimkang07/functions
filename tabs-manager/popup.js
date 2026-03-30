
// await says hold up i'm gonna use this tabs variable but i need it to actually have content in it first so wait for this entire query to come back before i do anything else.
const tabs = await chrome.tabs.query({});

// giving back the list of chrome tabs open
console.log(tabs)

let ul = document.querySelector('ul')

tabs.forEach((tab) => {
    let content = `
    <li>
        <h1>${tab.title}</h1>
        <p>${tab.url}</p>
        // data attribute can add to any html element and pass in data without necessarily modifying anything else. always starts with data- and then whatever you want to call it. 
        <button data-tab-id="${tab.id}">Make Active</button>
    </li>
    `
    ul.insertAdjacentHTML('beforeend', content)
})

// looking for only all my ul buttons inside my ul instead of in the whole page
const buttons = document.querySelectorAll('ul button')

// each button click gets the tab id from chrome's tab API
buttons.forEach((button) => {
    button.addEventListener('click', () => {
        // parseInt turns the string into number which is what chrome needs. 
        // dataset is hs that says look for anything that starts with data attribute and the tadId is the value so converting all tab-id to tabId.
        let tabId = parseInt(button.dataset.tabId)
        chrome.tabs.update(tabId, {active: true})
    })
})