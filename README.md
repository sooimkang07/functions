OVERVIEW
Notate is a Chrome extension that allows live “notating” directly on any webpage. Instead of separating notes from their source, notations are anchored directly to the user-selected DOM, allowing users to capture thoughts exactly where they occur. All saved notations are saved down the entire page as the user freely scrolls as well as within the popup itself, allowing users to jump to their notated pages and their individual notations in each one. 

This is V1 of Notate, limited by time and my current skillset. But, I aim to expand this into a more highly functional and customizable extension to eventually be put up in the extension store for users to freely use across any and all websites. 

GOALS OF THE PROJECT
* Identify an “actual” problem either in my own life or others and answer this using what we’ve learned in class so far (HTML, CSS, vanilla JS)
* Create a PRD with weekly roadmap targets within the 7-week timeline
* Continuously build week-to-week after hearing feedback from our instructors and guest critics

WHAT I COMPLETED: 
* Built a system to create, edit, and delete annotations directly on a live webpage
* Anchored annotations to DOM targets using selectors so they move with the element as the user scrolls
* Implemented stacking logic so multiple notes on the same target offset correctly
* Designed and built a modal system for creating and editing annotations
* Ensured annotations render consistently across page reloads using chrome’s local storage 
* Established clear user states to prevent conflicts:
    * page clicks
    * annotation mode
    * modal state
* Established a consistent visual system for notes, highlights, and UI elements
* Changed cursor and hover states to establish clear annotation mode
* Fixed issue around inheriting unwanted styles from host pages (ex: font size rem scaling issues)
* Built popup to show all annotated pages, ordered from most to least recent, and allow to be clicked on to take users to that page
* Inserted drop down and notation counter in popup so users can click on individual annotations per page
* Annotations scrollintoview center of viewport when clicked on in popup
* Tab behavior determined by unopened and opened links
* Referenced all my search queries and AI help

MAIN TRIUMPHS: 
* Getting annotation to reliably stick to its DOM element as user scrolls, reloads, exits, etc. 
* Getting annotation to stack correctly when annotating same element multiple times 
* Establishing a consistent design system across all buttons, interactions, hovers, etc. within the context of various webpage layouts
* All callback and storage functions, ensuring content scripts were firing correctly to appropriate receivers 
* Editing down which core features are needed at which user states
* Treating this as a scalable product system for future iterations, not just a functional tool
* Building up enough js knowledge to understand what to specifically google and how to navigate the rabbit hole of search results to get what I want

MAIN CHALLENGES: 
* Balancing precise anchoring anchoring to DOM with the variability of different site layouts/nested elements
* Handling so many edge cases where layout or content shifts affect annotation placement 
* Building around style conflicts with inherited site CSS (especially typography scaling)
* Managing interaction conflicts between:
    * annotation mode
    * clicking existing notes
    * modal interactions
    * Saving, editing, deleting, canceling notes
* Accurately opening saved annotations pages and individuals in local storage from popup, had to ensure scripts weren’t firing before url was being stored 
* Designing a visual language that stands out enough to be usable but not intrusive
* Ensuring consistent behavior across both new tabs and existing tabs

NEXT STEPS: 
* Further refining the visual design system (color logic, hierarchy, spacing)
* Potentially adding animation and micro-interactions to feel more polished and intentional
* Expanding accessibility:
    * keyboard navigation (for expert users)
    * ARIA roles and labeling
    * focus states
* Exploring less fragile anchoring strategies for dynamic or shifting layouts
* Testing across a wider range of websites and edge cases
* Add folders to organize/categorize annotated pages
* Individually delete each full page in the popup with right click?
* Click anywhere on the page, not stick to element but with specific page coordinates so I can annotate web pdfs and non-DOM elements
* Relies on the integrity of the site’s DOM and structure, so might be nice to have a fallback option for more expressive sites that are less DOM-reliant for a side extension for normal note-taking
* Add an in-between state where you can see the annotations without being in annotation mode
* Add an info icon explainer and page for brand new users, or have a temporary video walkthrough playing? 
* Build out chrome extension download page. 
* Add notation counter in toolbar of webpage.js
* Allow users to customize note colors, fonts, size, etc. maybe add stamps/images like figjam?
* Need extensive user testing across all types of sites where Dom elements maybe be heavily nested, hard to get note to stick to the exact one I want. 
* Solve for multiple interactive/hover states on one page. How would those save? Ex: drop-down menus? Only hover states?

QUESTIONS I STILL HAVE: 
* How should annotations behave on highly dynamic or reactive pages (ex: lots of hover or scroll-based animations or drop-downs)?
* What are the next core features for V2 of this in the same roadmap-format of this V1?
* Is this confusing to use for new users?
* What are various use cases for this I haven’t thought of that I may or may not need to build for?
