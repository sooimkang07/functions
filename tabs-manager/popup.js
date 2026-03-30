
// await says hold up i'm gonna use this tabs variable but i need it to actually have content in it first so wait for this entire query to come back before i do anything else.
const tabs = await chrome.tabs.query({
  url: [
    "https://developer.chrome.com/docs/webstore/*",
    "https://developer.chrome.com/docs/extensions/*",
  ]
});

// giving back the list of chrome tabs open
// console.log(tabs)

let ul = document.querySelector('ul')

tabs.forEach((tab) => {
    let content = `
    <li>
        <h1>${tab.title}</h1>
        <p>${tab.url}</p>
    </li>
    `
    ul.insertAdjacentHTML('beforeend', content)
})