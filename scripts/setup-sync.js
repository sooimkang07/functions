/* Shared first-run setup progress between welcome.html and the side panel. */
(() => {
	const STORAGE_KEY = 'notate-setup-progress'
	const ONBOARD_KEY = 'notate-onboarded'
	const STEP_COUNT = 4

	const storage = () => {
		try {
			return chrome?.storage?.local || null
		} catch {
			return null
		}
	}

	const get = (keys) =>
		new Promise((resolve) => {
			const area = storage()
			if (!area) {
				resolve({})
				return
			}
			area.get(keys, (result) => resolve(result || {}))
		})

	const set = (values) =>
		new Promise((resolve) => {
			const area = storage()
			if (!area) {
				resolve()
				return
			}
			area.set(values, () => resolve())
		})

	const clampStep = (step) => Math.max(0, Math.min(STEP_COUNT - 1, Number(step) || 0))

	const api = {
		STORAGE_KEY,
		ONBOARD_KEY,
		STEP_COUNT,
		async readStep() {
			const stored = await get([STORAGE_KEY, ONBOARD_KEY])
			if (stored[ONBOARD_KEY]) return STEP_COUNT - 1
			return clampStep(stored[STORAGE_KEY])
		},
		async writeStep(step) {
			await set({ [STORAGE_KEY]: clampStep(step) })
		},
		async markOnboarded() {
			await set({ [ONBOARD_KEY]: true, [STORAGE_KEY]: STEP_COUNT - 1 })
		},
		async isOnboarded() {
			const stored = await get(ONBOARD_KEY)
			return Boolean(stored[ONBOARD_KEY])
		},
		onChange(handler) {
			try {
				chrome?.storage?.onChanged?.addListener((changes, area) => {
					if (area !== 'local') return
					if (changes[STORAGE_KEY] || changes[ONBOARD_KEY]) handler(changes)
				})
			} catch {
				/* ignore */
			}
		}
	}

	globalThis.NotateSetupSync = api
})()
