// Service-worker-only mutation queue. Every library writer uses this entry point.
let notateWriteQueue = Promise.resolve()
const notateCommit = async ({ requestId, operation }) => {
	const data = await chrome.storage.local.get(null)
	const receipts = data['notate-write-receipts'] || []
	if (!Array.isArray(receipts)) throw new Error('Stored operation history is invalid. No changes were made.')
	if (receipts.includes(requestId)) return { ok: true }
	const libraryKey = 'notate-annotations'
	let library = data[libraryKey] || {}
	let colors = data[NOTATE_GROUP_COLORS_KEY] || {}
	let order = data[NOTATE_GROUP_ORDER_KEY] || []
	const dates = data[NOTATE_FOLDER_CREATED_KEY] || {}
	if (!library || typeof library !== 'object' || Array.isArray(library) ||
		Object.values(library).some(page => !page || !Array.isArray(page.annotations))) {
		throw new Error('Saved annotations could not be read safely. No changes were made.')
	}
	let createdNote = false
	const op = operation
	const fail = message => { throw new Error(message) }
	const validName = name => {
		if (!name || ['__proto__', 'constructor', 'prototype', NOTATE_NEW_GROUP, NOTATE_UNGROUPED].includes(name)) fail('Choose a different folder name.')
	}
	const ensureFolder = note => {
		if (!note.group) return
		validName(note.group)
		const exists = notateCollectGroupNames(library, colors).includes(note.group)
		if (!exists && !op.newFolder) fail('This folder was removed or renamed. Choose a folder again.')
		if (!exists) {
			colors[note.group] = notateNormalizeColor(note.color)
			dates[note.group] = Date.now()
		}
		note.color = colors[note.group] || note.color
	}
	if (['create', 'edit', 'move', 'delete', 'clear-page'].includes(op.type)) {
		if (typeof op.url !== 'string' || !/^https?:/.test(op.url)) fail('Invalid page.')
		const key = findStoredPageKey(library, op.url)
		const page = library[key]
		const notes = page?.annotations || []
		const index = notes.findIndex(note => note.id === op.id)
		if (op.type === 'create') {
			if (index < 0) {
				const note = notateNormalizeAnnotation(op.note)
				if (!note.id || note.id !== op.id || !note.text || !note.selector) fail('Invalid note.')
				ensureFolder(note)
				createdNote = true
				library[key] = { ...page, title: op.title, url: op.url, annotations: [...notes, note], updatedAt: Date.now() }
			}
		} else if (op.type === 'clear-page') {
			delete library[key]
		} else if (op.type === 'delete') {
			if (page) {
				page.annotations = notes.filter(note => note.id !== op.id)
				if (!page.annotations.length) delete library[key]
			}
		} else {
			if (index < 0) fail('This note was deleted. Your draft has been kept.')
			const current = notateNormalizeAnnotation(notes[index])
			if (current.group) current.color = colors[current.group] || current.color
			const fields = op.type === 'move' ? ['offsetInline', 'offsetBlock'] : ['text', 'group', 'color', 'interaction']
			for (const field of fields) {
				if (op.expected && JSON.stringify(current[field] ?? null) !== JSON.stringify(op.expected[field] ?? null)) fail('This note changed in another tab. Your draft has been kept; reopen the saved note before editing again.')
			}
			const next = { ...current }
			for (const field of fields) if (Object.hasOwn(op.patch, field)) next[field] = op.patch[field]
			if (op.type === 'edit') ensureFolder(next)
			else if (!Number.isFinite(next.offsetInline) || !Number.isFinite(next.offsetBlock)) fail('Invalid position.')
			notes[index] = next
			page.updatedAt = Date.now()
		}
	} else if (op.type === 'clear-all') {
		library = {}
	} else if (op.type === 'folder-create') {
		validName(op.name)
		if (notateCollectGroupNames(library, colors).includes(op.name)) fail('That folder name is already used.')
		colors[op.name] = notateNormalizeColor(op.color)
		dates[op.name] = Date.now()
	} else if (op.type === 'folder-edit') {
		validName(op.to)
		if (!notateCollectGroupNames(library, colors).includes(op.from)) fail('This folder was removed or renamed.')
		const renamed = notateRenameGroup(library, colors, order, op.from, op.to)
		if (renamed.error) fail('The folder changed or that name is already used.')
		const painted = notateApplyGroupColor(renamed.stored, renamed.colors, renamed.selected, op.color)
		library = painted.stored; colors = painted.colors; order = renamed.order
		if (op.from !== op.to) { dates[op.to] = dates[op.from] || Date.now(); delete dates[op.from] }
		if (data[NOTATE_LIBRARY_GROUP_KEY] === op.from) data[NOTATE_LIBRARY_GROUP_KEY] = op.to
	} else if (op.type === 'folder-delete') {
		const next = notateDeleteGroup(library, colors, order, op.name)
		library = next.stored; colors = next.colors; order = next.order
		delete dates[op.name]
		if (data[NOTATE_LIBRARY_GROUP_KEY] === op.name) data[NOTATE_LIBRARY_GROUP_KEY] = ''
	} else fail('Unknown storage operation.')
	const changes = {
		[libraryKey]: library, [NOTATE_GROUP_COLORS_KEY]: colors,
		[NOTATE_GROUP_ORDER_KEY]: order, [NOTATE_FOLDER_CREATED_KEY]: dates,
		'notate-write-receipts': [...receipts.slice(-127), requestId]
	}
	if (op.type === 'folder-edit' || op.type === 'folder-delete') changes[NOTATE_LIBRARY_GROUP_KEY] = data[NOTATE_LIBRARY_GROUP_KEY] || ''
	// Commit setup completion atomically with the real note, never before a save.
	if (createdNote) changes['notate-first-note-saved'] = true
	await chrome.storage.local.set(changes)
	return { ok: true }
}
chrome.runtime.onMessage.addListener((message, sender, respond) => {
	if (message.action !== 'notate-mutate') return
	if (sender.id !== chrome.runtime.id || typeof message.requestId !== 'string' || !message.operation) {
		respond({ ok: false, error: 'Invalid storage request.' })
		return
	}
	const task = notateWriteQueue.then(() => notateCommit(message))
	notateWriteQueue = task.catch(() => {})
	task.then(respond, error => respond({ ok: false, error: error.message }))
	return true
})
