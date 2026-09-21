/* Welcome / Getting Started tab controller for welcome.html */
(() => {
	const sync = globalThis.NotateSetupSync
	const stepCount = sync?.STEP_COUNT || 4
	let step = 0

	const progress = document.querySelector('#setup-progress')
	const status = document.querySelector('#setup-status')
	const syncFinished = document.querySelector('#sync-finished')

	const setStep = async (next, { persist = true } = {}) => {
		step = Math.max(0, Math.min(stepCount - 1, Number(next) || 0))

		document.querySelectorAll('.gs-step').forEach((btn) => {
			const index = Number(btn.dataset.gsStep)
			const isActive = index === step
			const isDone = index < step
			btn.classList.toggle('is-active', isActive)
			btn.classList.toggle('is-done', isDone)
			if (isActive) btn.setAttribute('aria-current', 'step')
			else btn.removeAttribute('aria-current')
		})

		document.querySelectorAll('.gs-panel').forEach((panel) => {
			const index = Number(panel.dataset.gsPanel)
			const active = index === step
			panel.hidden = !active
			panel.classList.toggle('is-active', active)
		})

		if (progress) {
			progress.value = step + 1
			progress.max = stepCount
		}

		if (status) {
			status.textContent = `Step ${step + 1} of ${stepCount}`
		}

		if (persist && sync) {
			await sync.writeStep(step)
		}
	}

	const openSidePanel = async () => {
		try {
			const current = await chrome.tabs.getCurrent()
			if (current?.windowId != null && chrome.sidePanel?.open) {
				await chrome.sidePanel.open({ windowId: current.windowId })
				return
			}
		} catch {
			/* fall through */
		}

		try {
			await chrome.runtime.sendMessage({ action: 'notate-open-side-panel' })
		} catch {
			/* ignore — user can click the toolbar icon */
		}
	}

	const finishWelcome = async () => {
		if (sync) await sync.markOnboarded()
		if (syncFinished) syncFinished.hidden = false
		await openSidePanel()
	}

	const bindPractice = () => {
		const practice = document.querySelector('#practice')
		if (!practice) return

		const composer = document.querySelector('#practice-composer')
		const note = document.querySelector('#practice-note')
		const text = document.querySelector('#practice-text')
		const target = document.querySelector('#practice-target')
		const help = document.querySelector('#practice-help')
		const instruction = document.querySelector('#practice-instruction')
		const done = document.querySelector('#practice-done')

		const showComposer = (visible) => {
			if (composer) composer.hidden = !visible
			if (target) target.disabled = visible
		}

		document.querySelector('#practice-close')?.addEventListener('click', () => {
			practice.hidden = true
		})

		document.querySelector('#practice-new')?.addEventListener('click', () => {
			showComposer(true)
			text?.focus()
		})

		target?.addEventListener('click', () => {
			showComposer(true)
			text?.focus()
		})

		document.querySelector('#practice-cancel')?.addEventListener('click', () => {
			showComposer(false)
		})

		composer?.addEventListener('submit', (event) => {
			event.preventDefault()
			const value = (text?.value || '').trim()
			if (!value) return
			if (note) {
				note.hidden = false
				note.textContent = value
			}
			if (text) text.value = ''
			showComposer(false)
			if (help) help.hidden = true
			if (instruction) instruction.textContent = 'Nice — you added a practice note.'
			if (done) done.hidden = false
		})

		note?.addEventListener('click', () => {
			showComposer(true)
			if (text && note.textContent) text.value = note.textContent
			text?.focus()
		})

		done?.addEventListener('click', finishWelcome)
	}

	const bind = () => {
		document.querySelectorAll('[data-gs-step]').forEach((btn) => {
			btn.addEventListener('click', () => setStep(btn.dataset.gsStep))
		})

		document.querySelectorAll('[data-action="gs-next"]').forEach((btn) => {
			btn.addEventListener('click', () => setStep(step + 1))
		})

		document.querySelector('#open-sidebar')?.addEventListener('click', async () => {
			await openSidePanel()
			await setStep(Math.max(step, 2))
		})

		document.querySelector('#get-started')?.addEventListener('click', finishWelcome)

		bindPractice()
	}

	const init = async () => {
		bind()
		if (sync) {
			step = await sync.readStep()
			sync.onChange(async () => {
				const next = await sync.readStep()
				if (next !== step) setStep(next, { persist: false })
			})
		}
		await setStep(step, { persist: false })
	}

	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', init)
	} else {
		init()
	}
})()
