(() => {
	if (globalThis.notateConfirm) return
	let pendingConfirmation = null
	globalThis.notateConfirm = ({ title, message, confirmLabel = 'Clear all', followSystemTheme = false }) => {
		if (pendingConfirmation) return pendingConfirmation
		pendingConfirmation = new Promise(resolve => {
		const previousFocus = document.activeElement
		const host = document.createElement('div')
		host.id = 'notate-confirm-host'
		if (followSystemTheme) host.setAttribute('data-system-theme', '')
		const root = host.attachShadow({ mode: 'closed' })
		root.innerHTML = `<style>
			dialog, dialog::backdrop { cursor:default; }
			dialog { position:fixed; inset:0; margin:auto; width:min(320px,calc(100vw - 32px)); height:fit-content; max-height:calc(100vh - 32px); overflow:auto; box-sizing:border-box; padding:20px; border:1px solid #dededb; border-radius:8px; background:white; color:#37352f; box-shadow:0 12px 36px #0002; font:14px/1.45 system-ui,sans-serif; }
			dialog::backdrop { background:#0004; }
			h2 { margin:0 0 8px; font-size:14px; font-weight:600; }
			p { margin:0 0 20px; color:#68665f; }
			form { display:flex; gap:8px; justify-content:flex-end; }
			button { padding:6px 10px; border:0; border-radius:4px; font:500 12px/1.3 system-ui; cursor:pointer; background:transparent; color:#37352f; }
			button[value=confirm] { background:#a33632; color:white; }
			button[value=cancel]:hover { background:rgba(55,53,47,.08); }
			button[value=cancel]:active { background:rgba(55,53,47,.12); }
			button[value=confirm]:hover { filter:brightness(.94); }
			button:focus-visible { outline:2px solid #2383e2; outline-offset:2px; }
			@media (prefers-color-scheme: dark) {
				:host([data-system-theme]) dialog { color-scheme:dark; background:#202124; color:#f1f0ed; border:0; box-shadow:0 12px 36px #0007; }
				:host([data-system-theme]) dialog::backdrop { background:#0008; }
				:host([data-system-theme]) p { color:#bdbbb5; }
				:host([data-system-theme]) button { color:#f1f0ed; }
				:host([data-system-theme]) button[value=confirm] { background:#ffaaa3; color:#351310; }
				:host([data-system-theme]) button[value=cancel]:hover { background:#ffffff14; }
				:host([data-system-theme]) button[value=cancel]:active { background:#ffffff24; }
				:host([data-system-theme]) button:focus-visible { outline-color:#8bc4ff; }
			}
		</style><dialog aria-labelledby="title" aria-describedby="message"><h2 id="title"></h2><p id="message"></p><form method="dialog"><button value="cancel" autofocus>Cancel</button><button value="confirm"></button></form></dialog>`
		const dialog = root.querySelector('dialog')
		root.querySelector('h2').textContent = title
		root.querySelector('p').textContent = message
		root.querySelector('[value=confirm]').textContent = confirmLabel
		dialog.addEventListener('close', () => {
			const confirmed = dialog.returnValue === 'confirm'
			host.remove()
			pendingConfirmation = null
			previousFocus?.focus?.()
			resolve(confirmed)
		}, { once: true })
		document.body.append(host)
		dialog.showModal()
		})
		return pendingConfirmation
	}
})()
