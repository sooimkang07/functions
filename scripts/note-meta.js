(() => {
	if (globalThis.notateNormalizeAnnotation) return

	globalThis.NOTATE_COLORS = ['yellow', 'mint', 'sky', 'peach', 'lilac', 'rose']
	globalThis.NOTATE_COLOR_DEFAULT = 'yellow'
	globalThis.NOTATE_UNGROUPED = 'Ungrouped'
	globalThis.NOTATE_NEW_GROUP = '__new__'
	globalThis.NOTATE_GROUP_COLORS_KEY = 'notate-group-colors'
	globalThis.NOTATE_GROUP_ORDER_KEY = 'notate-group-order'
	globalThis.NOTATE_LIBRARY_GROUP_KEY = 'notate-library-group'
	globalThis.NOTATE_STATES = ['default', 'hover', 'active', 'focus', 'scroll', 'cursor']
	globalThis.NOTATE_STATE_DEFAULT = 'default'
	globalThis.NOTATE_STATE_LABELS = {
		default: 'As it is',
		hover: 'Hovering',
		active: 'Pressed',
		focus: 'Focused',
		scroll: 'This scroll',
		cursor: 'This cursor'
	}

	globalThis.notateStateLabel = (kind) => {
		const state = globalThis.notateNormalizeState(kind)
		return globalThis.NOTATE_STATE_LABELS[state] || globalThis.NOTATE_STATE_LABELS[globalThis.NOTATE_STATE_DEFAULT]
	}

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

		const label = globalThis.notateStateLabel(kind)
		if (kind === 'cursor' && cursor && cursor !== 'auto' && cursor !== 'default') {
			return `${label} · ${cursor}`
		}

		return label
	}

	globalThis.notateNormalizeAnnotation = (annotation = {}) => ({
		...annotation,
		color: globalThis.notateNormalizeColor(annotation.color),
		group: globalThis.notateNormalizeGroup(annotation.group),
		offsetInline: annotation.offsetInline || 0,
		offsetBlock: annotation.offsetBlock || 0,
		createdAt: Number.isFinite(Number(annotation.createdAt)) && Number(annotation.createdAt) > 0
			? Math.round(Number(annotation.createdAt))
			: 0,
		interaction: globalThis.notateNormalizeInteraction(annotation.interaction)
	})

	globalThis.notateNoteTime = (annotation = {}) => {
		const created = Number(annotation.createdAt)
		if (Number.isFinite(created) && created > 0) return created

		const pageTime = Number(annotation.page?.updatedAt)
		if (Number.isFinite(pageTime) && pageTime > 0) return pageTime

		return 0
	}

	globalThis.notateResolveGroupColor = (group, colors = {}, fallback) => {
		const name = globalThis.notateNormalizeGroup(group)
		if (name && colors[name]) return globalThis.notateNormalizeColor(colors[name])
		return globalThis.notateNormalizeColor(fallback)
	}

	globalThis.notateResolveGroupColors = (grouped = [], colors = {}) => {
		const resolved = { ...colors }

		grouped.forEach(([name, items]) => {
			if (!name || name === globalThis.NOTATE_UNGROUPED || resolved[name]) return
			resolved[name] = globalThis.notateNormalizeColor(items[0]?.color)
		})

		return resolved
	}

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

	globalThis.notateCollectGroupNames = (storedAnnotations = {}, colors = {}) => {
		const fromNotes = globalThis.notateUniqueGroups(
			Object.values(storedAnnotations).flatMap((page) => page.annotations || [])
		)
		const fromColors = Object.keys(colors)
			.map((name) => globalThis.notateNormalizeGroup(name))
			.filter(Boolean)

		return [...new Set([...fromNotes, ...fromColors])].sort((left, right) => {
			return left.localeCompare(right)
		})
	}

	globalThis.notateOrderGroupNames = (names = [], order = []) => {
		const unique = [...new Set(
			names
				.map((name) => globalThis.notateNormalizeGroup(name))
				.filter((name) => name && name !== globalThis.NOTATE_UNGROUPED)
		)]
		const seen = new Set()
		const ordered = []

		order.forEach((name) => {
			const key = globalThis.notateNormalizeGroup(name)
			if (!key || seen.has(key) || !unique.includes(key)) return
			seen.add(key)
			ordered.push(key)
		})

		unique
			.filter((name) => !seen.has(name))
			.sort((left, right) => left.localeCompare(right))
			.forEach((name) => ordered.push(name))

		return ordered
	}

	globalThis.notateMoveGroupName = (names = [], from, to, after = false) => {
		const list = globalThis.notateOrderGroupNames(names, names)
		const moving = globalThis.notateNormalizeGroup(from)
		const target = globalThis.notateNormalizeGroup(to)

		if (!moving || !list.includes(moving)) return list
		if (moving === target) return list

		const without = list.filter((name) => name !== moving)
		if (!target || !without.includes(target)) {
			without.unshift(moving)
			return without
		}

		without.splice(without.indexOf(target) + (after ? 1 : 0), 0, moving)
		return without
	}

	globalThis.notateRenameGroup = (stored = {}, colors = {}, order = [], from, to) => {
		const prev = globalThis.notateNormalizeGroup(from)
		const next = globalThis.notateNormalizeGroup(to)
		if (!prev) {
			return { stored, colors, order, selected: '', error: 'missing' }
		}
		if (!next) {
			return { stored, colors, order, selected: prev, error: 'empty' }
		}

		const names = globalThis.notateCollectGroupNames(stored, colors)
		if (next !== prev && names.includes(next)) {
			return { stored, colors, order, selected: prev, error: 'taken' }
		}

		if (next === prev) {
			return { stored, colors, order, selected: prev }
		}

		Object.values(stored).forEach((page) => {
			;(page.annotations || []).forEach((annotation) => {
				if (globalThis.notateNormalizeGroup(annotation.group) === prev) {
					annotation.group = next
				}
			})
		})

		const nextColors = { ...colors }
		if (nextColors[prev] && !nextColors[next]) {
			nextColors[next] = nextColors[prev]
		}
		delete nextColors[prev]

		const renamedOrder = order.map((name) => {
			return globalThis.notateNormalizeGroup(name) === prev ? next : name
		})

		return {
			stored,
			colors: nextColors,
			order: globalThis.notateOrderGroupNames(renamedOrder, renamedOrder),
			selected: next
		}
	}

	globalThis.notateDeleteGroup = (stored = {}, colors = {}, order = [], name) => {
		const key = globalThis.notateNormalizeGroup(name)
		if (!key) return { stored, colors, order }

		Object.values(stored).forEach((page) => {
			;(page.annotations || []).forEach((annotation) => {
				if (globalThis.notateNormalizeGroup(annotation.group) === key) {
					annotation.group = ''
				}
			})
		})

		const nextColors = { ...colors }
		delete nextColors[key]

		return {
			stored,
			colors: nextColors,
			order: order.filter((item) => globalThis.notateNormalizeGroup(item) !== key)
		}
	}

	globalThis.notateApplyGroupColor = (stored = {}, colors = {}, group, color) => {
		const name = globalThis.notateNormalizeGroup(group)
		const nextColor = globalThis.notateNormalizeColor(color)
		if (!name) return { stored, colors }

		const nextColors = { ...colors, [name]: nextColor }
		Object.values(stored).forEach((page) => {
			;(page.annotations || []).forEach((annotation) => {
				if (globalThis.notateNormalizeGroup(annotation.group) === name) {
					annotation.color = nextColor
				}
			})
		})

		return { stored, colors: nextColors }
	}

	globalThis.notateAssignNoteGroup = (stored = {}, colors = {}, pageUrl, annotationId, group) => {
		const name = globalThis.notateNormalizeGroup(group)
		const nextColor = name
			? globalThis.notateResolveGroupColor(name, colors)
			: globalThis.NOTATE_COLOR_DEFAULT
		let found = false

		Object.values(stored).forEach((page) => {
			;(page.annotations || []).forEach((annotation) => {
				if (annotation.id !== annotationId) return
				if (pageUrl && page.url !== pageUrl) return
				annotation.group = name
				if (name) annotation.color = nextColor
				found = true
			})
		})

		return { stored, found, group: name, color: nextColor }
	}

	globalThis.notateFlattenNotes = (storedAnnotations = {}) => {
		return Object.values(storedAnnotations)
			.flatMap((page) => {
				return [...(page.annotations || [])]
					.map(globalThis.notateNormalizeAnnotation)
					.map((annotation, index) => ({
						...annotation,
						page,
						sourceIndex: index
					}))
			})
			.sort((left, right) => {
				const time = globalThis.notateNoteTime(right) - globalThis.notateNoteTime(left)
				if (time) return time
				return (right.sourceIndex || 0) - (left.sourceIndex || 0)
			})
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
