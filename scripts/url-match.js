(() => {
	if (globalThis.pageUrlsMatch) return

	// Ignore section anchors, but preserve conventional SPA hash routes.
	globalThis.normalizePageUrl = (url = '') => {
		try {
			const parsed = new URL(url)
			const routeHash = /^#(?:\/|!\/)/.test(parsed.hash) ? parsed.hash : ''
			if (parsed.pathname.length > 1 && parsed.pathname.endsWith('/')) {
				parsed.pathname = parsed.pathname.slice(0, -1)
			}
			return `${parsed.origin}${parsed.pathname}${parsed.search}${routeHash}`
		} catch {
			return url
		}
	}

	globalThis.pageUrlsMatch = (left, right) => {
		if (!left || !right) return false
		if (left === right) return true
		return globalThis.normalizePageUrl(left) === globalThis.normalizePageUrl(right)
	}

	globalThis.findStoredPageKey = (storedAnnotations = {}, url = '') => {
		if (storedAnnotations[url]) return url

		const match = Object.entries(storedAnnotations).find(([, page]) => {
			return globalThis.pageUrlsMatch(page?.url, url)
		})

		return match?.[0] || url
	}

	globalThis.findStoredPage = (storedAnnotations = {}, url = '') => {
		return storedAnnotations[globalThis.findStoredPageKey(storedAnnotations, url)] || null
	}
})()
