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

	globalThis.extensionStorageGet = async (keys) => {
		try {
			const storage = globalThis.getExtensionStorage()
			if (!storage?.get) return {}
			return await storage.get(keys)
		} catch {
			return {}
		}
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
