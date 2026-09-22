// Synthetic preview data only. No Chrome storage or extension APIs are used.
const folders = [
 ['Design feedback','yellow'],['Copy edits','mint'],['Research','sky'],
 ['Inspiration','peach'],['Accessibility','lilac'],['To revisit','rose'],
 ['Interactions','sky'],['Portfolio','mint'],['Reading list','yellow']
];
const pages = [
 {title:'Studio — Selected work', notes:[['Give the project images more breathing room.','Design feedback'],['This introduction feels clear and personal.','Copy edits'],['Keep this hover interaction as a reference.','Interactions']]},
 {title:'A guide to accessible interfaces', notes:[['Check keyboard focus on the navigation.','Accessibility'],['Useful contrast examples for the next review.','Research']]},
 {title:'Weekend reading', notes:[['Come back to this essay.','Reading list'],['An interesting idea worth remembering.','']]}
];
const menu=document.querySelector('#group-tabs');
const list=document.querySelector('#annotation-pages');
let selected='';
const colorFor=name=>folders.find(folder=>folder[0]===name)?.[1];
function render(){
 const position=menu.parentElement.scrollLeft;
 menu.replaceChildren();
 [['All',''],...folders.map(([name])=>[name,name])].forEach(([label,name])=>{
  const li=document.createElement('li');li.dataset.group=name;
  const button=document.createElement('button');button.type='button';button.dataset.action='view-group';button.dataset.group=name;button.setAttribute('aria-selected',String(selected===name));button.textContent=label;
  if(name)button.dataset.color=colorFor(name);
  button.onclick=()=>{selected=name;render()};li.append(button);menu.append(li);
 });
 menu.parentElement.scrollLeft=position;
 list.replaceChildren();
 pages.forEach(page=>{
  const notes=page.notes.filter(([,folder])=>!selected||folder===selected);
  if(!notes.length)return;
  const item=document.createElement('li');item.className='popup-page-item';
  const row=document.createElement('section');row.className='popup-page-row';
  const pageButton=document.createElement('button');pageButton.type='button';pageButton.className='popup-page-button';
  const icon=document.createElement('img');icon.className='popup-page-favicon';icon.src='images/page.svg';icon.alt='';
  const title=document.createElement('span');title.className='popup-page-title';title.textContent=page.title;pageButton.append(icon,title);
  const toggle=document.createElement('button');toggle.type='button';toggle.className='popup-page-toggle is-open';toggle.setAttribute('aria-expanded','true');toggle.setAttribute('aria-label',`${notes.length} notes`);
  toggle.innerHTML=`<span class="popup-page-count">${notes.length}</span><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m7 10 5 5 5-5" fill="none" stroke="currentColor" stroke-width="2"/></svg>`;
  const children=document.createElement('ul');children.className='popup-annotation-list';
  notes.forEach(([text,folder])=>{const li=document.createElement('li');const button=document.createElement('button');button.type='button';button.className='popup-annotation-item';if(folder)button.dataset.color=colorFor(folder);const span=document.createElement('span');span.className='popup-annotation-text';span.textContent=text;button.append(span);li.append(button);children.append(li)});
  const expand=()=>{children.hidden=!children.hidden;toggle.classList.toggle('is-open',!children.hidden);toggle.setAttribute('aria-expanded',String(!children.hidden))};
  toggle.onclick=expand;pageButton.onclick=expand;row.append(pageButton,toggle);item.append(row,children);list.append(item);
 });
 if(!list.children.length){const item=document.createElement('li');item.className='popup-empty-state';item.textContent='No notes in this folder yet';list.append(item)}
}
render();
