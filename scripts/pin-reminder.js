/* Optional toolbar pin reminder for first-run side panel sessions. */
(() => {
	const REMINDER_KEY = 'notate-pin-reminder-dismissed'
	const hostId = 'notate-pin-reminder'

	const storage = () => {
		try {
			return chrome?.storage?.local || null
		} catch {
			return null
		}
	}

	const getDismissed = () =>
		new Promise((resolve) => {
			const area = storage()
			if (!area) {
				resolve(false)
				return
			}
			area.get(REMINDER_KEY, (result) => resolve(Boolean(result?.[REMINDER_KEY])))
		})

	const setDismissed = () =>
		new Promise((resolve) => {
			const area = storage()
			if (!area) {
				resolve()
				return
			}
			area.set({ [REMINDER_KEY]: true }, () => resolve())
		})

	const ensureHost = () => {
		let host = document.getElementById(hostId)
		if (host) return host

		host = document.createElement('div')
		host.id = hostId
		host.setAttribute('role', 'status')
		host.hidden = true
		host.innerHTML = `
			<p>Pin Notate to the toolbar so it stays one click away.</p>
			<button type="button" data-action="dismiss-pin-reminder">Got it</button>
		`
		host.style.cssText = [
			'position:sticky',
			'top:0',
			'z-index:5',
			'display:flex',
			'gap:12px',
			'align-items:center',
			'justify-content:space-between',
			'padding:10px 14px',
			'margin:0 0 12px',
			'background:#f3f1ec',
			'border:1px solid rgba(55,53,47,.12)',
			'border-radius:10px',
			'font:500 13px/1.35 ui-sans-serif,system-ui,sans-serif',
			'color:#37352f'
		].join(';')

		const button = host.querySelector('button')
		if (button) {
			button.style.cssText =
				'border:0;background:#37352f;color:#fff;border-radius:8px;padding:6px 10px;font:600 12px/1 ui-sans-serif,system-ui,sans-serif;cursor:pointer'
		}

		const mount = document.querySelector('.popup-header') || document.body.firstElementChild || document.body
		mount.parentNode?.insertBefore(host, mount.nextSibling)
		return host
	}

	const init = async () => {
		if (!document.querySelector('.popup-header') && !document.getElementById('getting-started')) {
			return
		}

		const dismissed = await getDismissed()
		if (dismissed) return

		const host = ensureHost()
		host.hidden = false
		host.querySelector('[data-action="dismiss-pin-reminder"]')?.addEventListener('click', async () => {
			host.hidden = true
			await setDismissed()
		})
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init)
	} else {
		init()
	}
})()
