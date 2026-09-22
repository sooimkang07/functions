(() => {
	if (globalThis.getExtensionStorage) return

	// never throw "Cannot read properties of undefined (reading 'local')"
	// that happens when this file runs outside the extension, or chrome.storage is missing
	globalThis.getExtensionStorage = () => {
		try {
			if (typeof chrome === 'undefined') return null
			if (!chrome.storage) return null
			return chrome.storage.local || null
		} catch {
			return null
		}
	}


	// Reads must never turn failure into an empty library that a later write can erase.
	globalThis.extensionStorageGet = async (keys) => {
		try {
			const storage = globalThis.getExtensionStorage()
			if (!storage?.get) throw new Error('Storage unavailable')
			return await storage.get(keys)
		} catch (cause) {
			const invalidated = /context invalidated/i.test(cause?.message || '')
			const error = new Error(invalidated
				? 'Notate was reloaded. Refresh this webpage to reconnect. Your saved notes have not been replaced.'
				: 'Could not read Chrome storage. Your saved data has not been replaced. Please refresh the page and try again.', { cause })
			error.code = 'NOTATE_STORAGE_READ'
			throw error
		}
	}
	globalThis.extensionStorageSetRequired = async (value) => {
		if (!await globalThis.extensionStorageSet(value)) {
			const error = new Error('Could not save to Chrome storage.')
			error.code = 'NOTATE_STORAGE_WRITE'
			throw error
		}
	}

	globalThis.notateMutate = async operation => {
		const message = { action: 'notate-mutate', requestId: crypto.randomUUID(), operation }
		let response
		try { response = await chrome.runtime.sendMessage(message) }
		catch { response = await chrome.runtime.sendMessage(message) }
		if (!response?.ok) throw new Error(response?.error || 'Could not confirm the save. Please retry.')
		return response
	}

	globalThis.extensionStorageSet = async (value) => {
		try {
			const storage = globalThis.getExtensionStorage()
			if (!storage?.set) return false
			await storage.set(value)
			return true
		} catch {
			return false
		}
	}

	globalThis.extensionStorageRemove = async (keys) => {
		try {
			const storage = globalThis.getExtensionStorage()
			if (!storage?.remove) return false
			await storage.remove(keys)
			return true
		} catch {
			return false
		}
	}
})()
