(() => {
	if (globalThis.notateNormalizeAnnotation) return

	globalThis.NOTATE_COLORS = ['yellow', 'mint', 'sky', 'peach', 'lilac', 'rose']
	globalThis.NOTATE_COLOR_DEFAULT = 'yellow'
	globalThis.NOTATE_UNGROUPED = 'Ungrouped'
	globalThis.NOTATE_STATES = ['default', 'hover', 'active', 'focus', 'scroll', 'cursor']
	globalThis.NOTATE_STATE_DEFAULT = 'default'

	globalThis.notateEscapeHtml = (value = '') => {
		return String(value)
			.replace(/&/g, '&amp;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
	}

	globalThis.notateNormalizeColor = (color) => {
		return globalThis.NOTATE_COLORS.includes(color) ? color : globalThis.NOTATE_COLOR_DEFAULT
	}

	globalThis.notateNormalizeGroup = (group = '') => String(group).trim()

	globalThis.notateNormalizeState = (kind) => {
		return globalThis.NOTATE_STATES.includes(kind) ? kind : globalThis.NOTATE_STATE_DEFAULT
	}

	globalThis.notateReadCursor = (element) => {
		if (!element || element.nodeType !== 1) return 'auto'
		try {
			return getComputedStyle(element).cursor || 'auto'
		} catch {
			return 'auto'
		}
	}

	globalThis.notateNormalizeInteraction = (interaction = {}, element) => {
		const kind = globalThis.notateNormalizeState(interaction.kind)
		const cursor = String(interaction.cursor || globalThis.notateReadCursor(element) || 'auto')
		const scrollY = Number.isFinite(Number(interaction.scrollY))
			? Math.round(Number(interaction.scrollY))
			: Math.round(globalThis.scrollY || 0)

		return { kind, cursor, scrollY }
	}

	globalThis.notateInteractionLabel = (interaction = {}) => {
		const { kind, cursor } = globalThis.notateNormalizeInteraction(interaction)
		if (kind === globalThis.NOTATE_STATE_DEFAULT) return ''
		if (kind === 'cursor' || (cursor && cursor !== 'auto' && cursor !== 'default')) {
			return `${kind} · ${cursor}`
		}
		return kind
	}

	globalThis.notateNormalizeAnnotation = (annotation = {}) => ({
		...annotation,
		color: globalThis.notateNormalizeColor(annotation.color),
		group: globalThis.notateNormalizeGroup(annotation.group),
		offsetInline: annotation.offsetInline || 0,
		offsetBlock: annotation.offsetBlock || 0,
		interaction: globalThis.notateNormalizeInteraction(annotation.interaction)
	})

	globalThis.notateGroupKey = (group) => {
		return globalThis.notateNormalizeGroup(group) || globalThis.NOTATE_UNGROUPED
	}

	globalThis.notateGroupedAnnotations = (annotations = []) => {
		const groups = new Map()

		annotations.forEach((annotation) => {
			const key = globalThis.notateGroupKey(annotation.group)
			if (!groups.has(key)) groups.set(key, [])
			groups.get(key).push(annotation)
		})

		const named = [...groups.keys()]
			.filter((key) => key !== globalThis.NOTATE_UNGROUPED)
			.sort((left, right) => left.localeCompare(right))
		const order = groups.has(globalThis.NOTATE_UNGROUPED)
			? [...named, globalThis.NOTATE_UNGROUPED]
			: named

		return order.map((name) => [name, groups.get(name)])
	}

	globalThis.notateUniqueGroups = (annotations = []) => {
		return [...new Set(
			annotations
				.map((annotation) => globalThis.notateNormalizeGroup(annotation.group))
				.filter(Boolean)
		)].sort((left, right) => left.localeCompare(right))
	}

	globalThis.notateExportPayload = (storedAnnotations = {}) => {
		const pages = Object.values(storedAnnotations).sort((pageA, pageB) => {
			return (pageB.updatedAt || 0) - (pageA.updatedAt || 0)
		})

		return {
			app: 'Notate',
			exportedAt: new Date().toISOString(),
			pages: pages.map((page) => ({
				title: page.title,
				url: page.url,
				updatedAt: page.updatedAt,
				annotations: (page.annotations || []).map((annotation) => {
					return globalThis.notateNormalizeAnnotation(annotation)
				})
			}))
		}
	}

	globalThis.notateDownloadJson = (payload, filename) => {
		const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' })
		const url = URL.createObjectURL(blob)
		const link = document.createElement('a')
		link.href = url
		link.download = filename
		link.click()
		URL.revokeObjectURL(url)
	}
})()
