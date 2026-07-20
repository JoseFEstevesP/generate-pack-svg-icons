const svgModules = import.meta.glob('../../icon/**/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const state = {
  packs: [],
  activePack: null,
  searchQuery: '',
  outputHistory: [{ path: 'output', alias: '' }],
  dirHandle: null,
  browsePath: '',
  editingIndex: -1,
}

function parsePacks() {
  const packMap = {}
  for (const [filepath, raw] of Object.entries(svgModules)) {
    const parts = filepath.replace(/^.*\/icon\//, '').split('/')
    const packName = parts[0]
    const fileName = parts.slice(1).join('/')
    if (!packMap[packName]) packMap[packName] = []
    packMap[packName].push({
      id: fileName.replace(/\.svg$/i, ''),
      name: fileName,
      content: typeof raw === 'string' ? raw : '',
    })
  }
  state.packs = Object.entries(packMap).map(([name, icons]) => ({
    name,
    icons: icons.sort((a, b) => a.name.localeCompare(b.name)),
  }))
}

async function loadConfig() {
  try {
    const resp = await fetch('/api/config')
    const config = await resp.json()
    if (config.output_history) {
      state.outputHistory = config.output_history.map(e =>
        typeof e === 'string' ? { path: e, alias: '' } : e
      )
    }
    if (config.last_used && !state.activePack) {
      const match = state.packs.find(p => p.name === config.last_used)
      if (match) state.activePack = match.name
    }
  } catch {}
}

async function saveConfigToServer() {
  try {
    await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        last_used: state.activePack || '',
        output_history: state.outputHistory,
      }),
    })
  } catch {}
}

function getFilteredIcons() {
  const pack = state.packs.find(p => p.name === state.activePack)
  if (!pack) return []
  const q = state.searchQuery.toLowerCase().trim()
  if (!q) return pack.icons
  return pack.icons.filter(icon =>
    icon.id.toLowerCase().includes(q)
  )
}

function getTotalCount() {
  const pack = state.packs.find(p => p.name === state.activePack)
  return pack ? pack.icons.length : 0
}

function renderSidebar() {
  const list = document.getElementById('pack-list')
  const label = list.querySelector('.pack-list-label')
  let html = label.outerHTML

  for (const pack of state.packs) {
    const isActive = pack.name === state.activePack
    html += `
      <button class="pack-item${isActive ? ' active' : ''}" data-pack="${pack.name}">
        <span>${pack.name}</span>
        <span class="pack-item-count">${pack.icons.length}</span>
      </button>
    `
  }
  list.innerHTML = html

  list.querySelectorAll('.pack-item').forEach(btn => {
    btn.addEventListener('click', () => {
      state.activePack = btn.dataset.pack
      state.searchQuery = ''
      document.getElementById('search').value = ''
      renderSidebar()
      renderGrid()
    })
  })
}

function renderGrid() {
  const grid = document.getElementById('icon-grid')
  const empty = document.getElementById('empty-state')
  const countEl = document.getElementById('icon-count')
  const btnGen = document.getElementById('btn-generate')

  const icons = getFilteredIcons()
  const total = getTotalCount()

  countEl.textContent = `${icons.length} of ${total} icons`
  btnGen.disabled = !state.activePack

  if (state.packs.length === 0) {
    empty.style.display = 'flex'
    grid.style.display = 'none'
    empty.querySelector('h2').textContent = 'No icons yet'
    empty.querySelector('p').innerHTML = 'Add SVG files to a folder inside <code>icon/</code> and they will appear here.'
    return
  }

  const hasFilter = state.searchQuery.trim().length > 0
  if (icons.length === 0 && !hasFilter) {
    empty.style.display = 'flex'
    grid.style.display = 'none'
    empty.querySelector('h2').textContent = 'No icons in this pack'
    empty.querySelector('p').innerHTML = 'Add SVG files to <code>icon/' + state.activePack + '/</code>'
    return
  }

  if (icons.length === 0 && hasFilter) {
    empty.style.display = 'flex'
    grid.style.display = 'none'
    empty.querySelector('h2').textContent = 'No matches'
    empty.querySelector('p').textContent = 'Try a different search term'
    return
  }

  empty.style.display = 'none'
  grid.style.display = 'grid'
  grid.innerHTML = icons.map(icon => `
    <div class="icon-card" data-id="${icon.id}">
      ${icon.content}
      <span class="icon-card-label">${icon.id}</span>
    </div>
  `).join('')

  grid.querySelectorAll('.icon-card').forEach(card => {
    card.addEventListener('click', () => {
      const id = card.dataset.id
      navigator.clipboard.writeText(id).then(() => {
        showToast(`Copied "${id}"`)
      }).catch(() => {
        showToast(`"${id}"`)
      })
    })
  })
}

function showToast(message) {
  const toast = document.getElementById('toast')
  toast.textContent = message
  toast.classList.add('visible')
  setTimeout(() => toast.classList.remove('visible'), 1800)
}

async function loadDirBrowser(dirPath) {
  const pathEl = document.getElementById('dir-browser-path')
  const listEl = document.getElementById('dir-browser-list')
  pathEl.textContent = 'Loading...'

  try {
    const resp = await fetch('/api/browse', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: dirPath }),
    })
    const data = await resp.json()

    if (!data.ok) {
      pathEl.textContent = 'Error: ' + data.error
      listEl.innerHTML = ''
      return
    }

    state.browsePath = data.current
    pathEl.textContent = data.current

    let html = ''
    if (data.parent !== data.current) {
      html += `<button class="dir-browser-item dir-browser-item-up" data-path="${data.parent}">.. (up)</button>`
    }
    if (data.dirs.length === 0 && data.parent === data.current) {
      html += '<div class="dir-browser-empty">(empty directory)</div>'
    }
    for (const d of data.dirs) {
      html += `<button class="dir-browser-item" data-path="${d.path}">${d.name}</button>`
    }
    listEl.innerHTML = html

    listEl.querySelectorAll('.dir-browser-item').forEach(btn => {
      btn.addEventListener('click', () => loadDirBrowser(btn.dataset.path))
    })
  } catch (err) {
    pathEl.textContent = 'Error: ' + err.message
    listEl.innerHTML = ''
  }
}

async function handleFolderPick() {
  if (window.showDirectoryPicker) {
    try {
      const handle = await window.showDirectoryPicker()
      state.dirHandle = handle
      document.getElementById('dir-browser').style.display = 'none'
      document.getElementById('modal-output').value = handle.name
      showToast(`Selected: ${handle.name}`)
      return
    } catch {
      state.dirHandle = null
    }
  }

  const browser = document.getElementById('dir-browser')
  browser.style.display = browser.style.display === 'none' ? 'flex' : 'none'
  if (browser.style.display === 'flex') {
    loadDirBrowser(state.browsePath)
  }
}

function renderHistory() {
  const history = document.getElementById('modal-history')
  state.editingIndex = -1

  let html = '<div class="modal-label" style="margin-bottom:4px">Saved locations</div>'
  for (let i = 0; i < state.outputHistory.length; i++) {
    const e = state.outputHistory[i]
    const label = e.alias || e.path.split('/').filter(Boolean).slice(-2).join('/') || e.path
    html += `
      <div class="history-row">
        <button class="history-row-path" data-index="${i}" title="${e.path}">${label}</button>
        <button class="history-row-btn" data-index="${i}" data-action="edit" title="Edit alias">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/></svg>
        </button>
        <button class="history-row-btn danger" data-index="${i}" data-action="delete" title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>`
  }
  html += `<button class="history-add-btn" id="btn-add-alias">
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
    Add shortcut
  </button>`

  history.innerHTML = html

  history.querySelectorAll('.history-row-path').forEach(btn => {
    btn.addEventListener('click', () => {
      const idx = parseInt(btn.dataset.index)
      state.dirHandle = null
      document.getElementById('modal-output').value = state.outputHistory[idx].path
    })
  })

  history.querySelectorAll('[data-action="edit"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const idx = parseInt(btn.dataset.index)
      state.editingIndex = idx
      renderEditForm(idx)
    })
  })

  history.querySelectorAll('[data-action="delete"]').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const idx = parseInt(btn.dataset.index)
      state.outputHistory.splice(idx, 1)
      saveConfigToServer()
      renderHistory()
    })
  })

  const addBtn = document.getElementById('btn-add-alias')
  if (addBtn) {
    addBtn.addEventListener('click', () => {
      const newEntry = { path: document.getElementById('modal-output').value.trim(), alias: '' }
      if (!newEntry.path) return
      state.outputHistory = [newEntry, ...state.outputHistory.filter(e => e.path !== newEntry.path)].slice(0, 5)
      state.editingIndex = 0
      saveConfigToServer()
      renderEditForm(0)
    })
  }
}

function renderEditForm(index) {
  const history = document.getElementById('modal-history')
  const e = state.outputHistory[index]
  history.innerHTML = `
    <div class="modal-label" style="margin-bottom:4px">Edit shortcut</div>
    <div class="edit-form">
      <input class="modal-input edit-input" id="edit-alias" placeholder="Alias (e.g. Workshop Icons)" value="${e.alias || ''}">
      <input class="modal-input edit-input" id="edit-path" placeholder="Full path" value="${e.path}">
      <div class="edit-actions">
        <button class="btn btn-primary" id="edit-save">Save</button>
        <button class="btn modal-cancel" id="edit-cancel">Cancel</button>
      </div>
    </div>`

  document.getElementById('edit-save').addEventListener('click', () => {
    const alias = document.getElementById('edit-alias').value.trim()
    const path = document.getElementById('edit-path').value.trim()
    if (!path) return
    state.outputHistory[index] = { path, alias }
    saveConfigToServer()
    renderHistory()
  })

  document.getElementById('edit-cancel').addEventListener('click', () => {
    renderHistory()
  })
}

function openModal() {
  const modal = document.getElementById('modal')
  const overlay = document.getElementById('overlay')
  const packName = document.getElementById('modal-pack-name')
  const outputInput = document.getElementById('modal-output')
  const result = document.getElementById('modal-result')

  packName.textContent = state.activePack
  result.textContent = ''
  result.className = 'modal-result'
  document.getElementById('dir-browser').style.display = 'none'

  if (!state.dirHandle) {
    const defaultDir = state.outputHistory[0]?.path || 'output'
    outputInput.value = defaultDir
  }

  renderHistory()

  modal.classList.add('visible')
  overlay.classList.add('visible')
  outputInput.focus()
}

function closeModal() {
  document.getElementById('modal').classList.remove('visible')
  document.getElementById('overlay').classList.remove('visible')
  document.getElementById('dir-browser').style.display = 'none'
}

function showResult(msg, type) {
  const el = document.getElementById('modal-result')
  el.textContent = msg
  el.className = 'modal-result ' + type
}

function showSuccessResult(fullPath, icons, raw, opt, savings) {
  const el = document.getElementById('modal-result')
  const fileName = fullPath.split('/').pop()
  const dirPath = fullPath.slice(0, fullPath.lastIndexOf('/'))
  el.className = 'modal-result success'
  el.innerHTML = `
    <div class="result-file">${fileName}</div>
    <div class="result-path" title="${dirPath}">${dirPath}</div>
    <div class="result-stats">${icons} icons · ${(raw / 1024).toFixed(1)}KB → ${(opt / 1024).toFixed(1)}KB (${savings}% savings)</div>
  `
}

async function handleGenerate() {
  const btnGen = document.getElementById('modal-generate')
  const pack = state.activePack
  const outputDir = document.getElementById('modal-output').value.trim() || 'output'
  const fileName = `${pack}-pack.svg`

  btnGen.disabled = true
  btnGen.innerHTML = 'Generating...'
  showResult('', '')
  showResult('Generating...', '')

  try {
    if (state.dirHandle) {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack, outputDir, returnContent: true }),
      })
      const data = await resp.json()

      if (!data.ok) {
        showResult(`Error: ${data.error}`, 'error')
        btnGen.disabled = false
        btnGen.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate`
        return
      }

      const fileHandle = await state.dirHandle.getFileHandle(fileName, { create: true })
      const writable = await fileHandle.createWritable()
      await writable.write(data.content)
      await writable.close()

      const dirName = state.dirHandle.name
      showSuccessResult(
        `${dirName}/${fileName}`,
        data.icons.processed,
        data.size.raw,
        data.size.optimized,
        data.savings
      )
      state.outputHistory = [{ path: dirName, alias: '' }, ...state.outputHistory.filter(e => e.path !== dirName)].slice(0, 5)
      saveConfigToServer()
      showToast(`Pack "${pack}" generated in ${dirName}`)
    } else {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack, outputDir }),
      })
      const data = await resp.json()

      if (!data.ok) {
        showResult(`Error: ${data.error}`, 'error')
        btnGen.disabled = false
        btnGen.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate`
        return
      }

      showSuccessResult(
        data.output,
        data.icons.processed,
        data.size.raw,
        data.size.optimized,
        data.savings
      )

      state.outputHistory = [{ path: outputDir, alias: '' }, ...state.outputHistory.filter(e => e.path !== outputDir)].slice(0, 5)
      saveConfigToServer()
      showToast(`Pack "${pack}" generated`)
    }
  } catch (err) {
    showResult(`Error: ${err.message}`, 'error')
  }

  btnGen.disabled = false
  btnGen.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate`
}

/* ─── Create Custom Pack ─── */

const createState = {
  selectedIcons: [],
  browsePack: null,
  pasteCounter: 0,
}

function openCreateModal() {
  createState.selectedIcons = []
  createState.pasteCounter = 0

  const modal = document.getElementById('create-modal')
  const overlay = document.getElementById('overlay')

  document.getElementById('create-error').className = 'create-error'
  document.getElementById('create-error').textContent = ''
  document.getElementById('create-success').style.display = 'none'
  document.getElementById('create-pack-name').value = ''
  document.getElementById('paste-svg').value = ''

  renderCreatePacks()
  renderCreateIcons(null)
  renderSelectedPool()

  modal.classList.add('visible')
  overlay.classList.add('visible')
}

function closeCreateModal() {
  document.getElementById('create-modal').classList.remove('visible')
  document.getElementById('overlay').classList.remove('visible')
}

function renderCreatePacks() {
  const list = document.getElementById('create-pack-list')
  list.innerHTML = state.packs.map(p => `
    <button class="create-pack-item${createState.browsePack === p.name ? ' active' : ''}" data-pack="${p.name}">
      <span>${p.name}</span>
      <span class="create-pack-count">${p.icons.length}</span>
    </button>
  `).join('')

  list.querySelectorAll('.create-pack-item').forEach(btn => {
    btn.addEventListener('click', () => {
      createState.browsePack = btn.dataset.pack
      renderCreatePacks()
      renderCreateIcons(createState.browsePack)
    })
  })
}

function renderCreateIcons(packName) {
  const container = document.getElementById('create-pack-icons')
  if (!packName) {
    container.innerHTML = '<div class="create-modal-icons-empty">Select a pack to browse icons</div>'
    return
  }
  const pack = state.packs.find(p => p.name === packName)
  if (!pack || pack.icons.length === 0) {
    container.innerHTML = '<div class="create-modal-icons-empty">No icons in this pack</div>'
    return
  }

  const selectedKeys = new Set(createState.selectedIcons.map(ic => ic._key))

  container.innerHTML = pack.icons.map(icon => {
    const key = packName + '/' + icon.id
    const isSelected = selectedKeys.has(key)
    return `
      <div class="icon-checkbox-card${isSelected ? ' selected' : ''}" data-key="${key}" data-pack="${packName}" data-id="${icon.id}">
        <div class="icon-checkbox-check">
          ${isSelected ? '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>' : ''}
        </div>
        ${icon.content}
        <span class="icon-checkbox-label">${icon.id}</span>
      </div>
    `
  }).join('')

  container.querySelectorAll('.icon-checkbox-card').forEach(card => {
    card.addEventListener('click', () => {
      const key = card.dataset.key
      const packN = card.dataset.pack
      const id = card.dataset.id
      const existingIdx = createState.selectedIcons.findIndex(ic => ic._key === key)

      if (existingIdx >= 0) {
        createState.selectedIcons.splice(existingIdx, 1)
        card.classList.remove('selected')
        card.querySelector('.icon-checkbox-check').innerHTML = ''
      } else {
        const pack = state.packs.find(p => p.name === packN)
        const icon = pack.icons.find(i => i.id === id)
        if (icon) {
          createState.selectedIcons.push({
            _key: key,
            id: icon.id,
            label: packN + '/' + icon.id,
            content: icon.content,
          })
          card.classList.add('selected')
          card.querySelector('.icon-checkbox-check').innerHTML =
            '<svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>'
        }
      }
      renderSelectedPool()
    })
  })
}

function renderSelectedPool() {
  const pool = document.getElementById('selected-icons-pool')
  const count = document.getElementById('selected-count')
  count.textContent = createState.selectedIcons.length

  if (createState.selectedIcons.length === 0) {
    pool.innerHTML = '<div class="selected-icons-empty">Pick icons from the packs, upload SVGs, or paste SVG code</div>'
    return
  }

  pool.innerHTML = createState.selectedIcons.map((icon, idx) => {
    const svgPreview = icon.content.length > 200
      ? icon.content.slice(0, 200) + '...'
      : icon.content
    return `
      <div class="selected-icon-tag" title="${icon.label}">
        ${icon.content}
        <span>${icon.label.split('/').pop()}</span>
        <button class="selected-icon-remove" data-index="${idx}" title="Remove">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
        </button>
      </div>
    `
  }).join('')

  pool.querySelectorAll('.selected-icon-remove').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation()
      const idx = parseInt(btn.dataset.index)
      const removed = createState.selectedIcons[idx]
      createState.selectedIcons.splice(idx, 1)
      const key = removed._key
      if (key) {
        const card = document.querySelector(`.icon-checkbox-card[data-key="${key}"]`)
        if (card) {
          card.classList.remove('selected')
          card.querySelector('.icon-checkbox-check').innerHTML = ''
        }
      }
      renderSelectedPool()
    })
  })
}

function handleUpload(files) {
  for (const file of files) {
    if (!file.name.toLowerCase().endsWith('.svg')) continue
    const reader = new FileReader()
    reader.onload = (e) => {
      const content = e.target.result
      const id = file.name.replace(/\.svg$/i, '')
      const key = 'uploaded/' + id
      if (createState.selectedIcons.some(ic => ic._key === key)) {
        showToast(`"${id}" already added`)
        return
      }
      createState.selectedIcons.push({
        _key: key,
        id: id,
        label: 'uploaded/' + id,
        content,
      })
      renderSelectedPool()
      showToast(`Added "${id}"`)
    }
    reader.readAsText(file)
  }
}

function handlePaste() {
  const textarea = document.getElementById('paste-svg')
  const raw = textarea.value.trim()
  if (!raw) return

  if (!raw.includes('<svg') || !raw.includes('</svg>')) {
    showToast('Invalid SVG markup')
    return
  }

  createState.pasteCounter++
  const id = 'pasted-icon-' + createState.pasteCounter
  const key = 'pasted/' + id
  createState.selectedIcons.push({
    _key: key,
    id: id,
    label: 'pasted/' + id,
    content: raw,
  })
  textarea.value = ''
  renderSelectedPool()
  showToast(`Added pasted icon`)
}

async function handleCreatePack() {
  const nameInput = document.getElementById('create-pack-name')
  const name = nameInput.value.trim()
  const errorEl = document.getElementById('create-error')
  const successEl = document.getElementById('create-success')
  const submitBtn = document.getElementById('btn-create-submit')

  errorEl.className = 'create-error'
  errorEl.textContent = ''
  successEl.style.display = 'none'

  if (!name) {
    errorEl.textContent = 'Enter a pack name'
    errorEl.className = 'create-error visible'
    nameInput.focus()
    return
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(name)) {
    errorEl.textContent = 'Use only letters, numbers, hyphens, and underscores'
    errorEl.className = 'create-error visible'
    nameInput.focus()
    return
  }

  if (state.packs.some(p => p.name === name)) {
    errorEl.textContent = `Pack "${name}" already exists`
    errorEl.className = 'create-error visible'
    nameInput.focus()
    return
  }

  if (createState.selectedIcons.length === 0) {
    errorEl.textContent = 'No icons selected'
    errorEl.className = 'create-error visible'
    return
  }

  const icons = createState.selectedIcons.map(ic => ({
    id: ic.id,
    content: ic.content,
  }))

  submitBtn.disabled = true
  submitBtn.innerHTML = 'Creating...'

  try {
    const resp = await fetch('/api/save-pack', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, icons }),
    })
    const data = await resp.json()

    if (!data.ok) {
      errorEl.textContent = data.error
      errorEl.className = 'create-error visible'
      submitBtn.disabled = false
      submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Create Pack`
      return
    }

    successEl.style.display = 'block'
    successEl.innerHTML = `
      <div class="create-success-name">${data.name}</div>
      <div class="create-success-count">${data.count} icons created</div>
    `

    showToast(`Pack "${data.name}" created with ${data.count} icons`)

    submitBtn.disabled = false
    submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Create Pack`

    setTimeout(() => {
      closeCreateModal()
      location.reload()
    }, 2000)
  } catch (err) {
    errorEl.textContent = err.message
    errorEl.className = 'create-error visible'
    submitBtn.disabled = false
    submitBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5v14"/><path d="M5 12h14"/></svg> Create Pack`
  }
}

function init() {
  parsePacks()
  loadConfig().then(() => {
    if (state.packs.length > 0 && !state.activePack) {
      state.activePack = state.packs[0].name
    }
    renderSidebar()
    renderGrid()
  })

  const searchInput = document.getElementById('search')
  let debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      state.searchQuery = searchInput.value
      renderGrid()
    }, 150)
  })

  document.getElementById('btn-generate').addEventListener('click', openModal)
  document.getElementById('btn-folder-picker').addEventListener('click', handleFolderPick)
  document.getElementById('modal-close').addEventListener('click', closeModal)
  document.getElementById('modal-cancel').addEventListener('click', closeModal)
  document.getElementById('overlay').addEventListener('click', closeModal)
  document.getElementById('modal-generate').addEventListener('click', handleGenerate)
  document.getElementById('dir-browser-select').addEventListener('click', () => {
    const outputInput = document.getElementById('modal-output')
    outputInput.value = state.browsePath
    document.getElementById('dir-browser').style.display = 'none'
  })

  document.getElementById('modal-output').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGenerate()
  })

  /* Create Pack event listeners */
  document.getElementById('btn-create-pack').addEventListener('click', openCreateModal)
  document.getElementById('create-modal-close').addEventListener('click', closeCreateModal)
  document.getElementById('overlay').addEventListener('click', () => {
    closeModal()
    closeCreateModal()
  })

  document.getElementById('upload-area').addEventListener('click', () => {
    document.getElementById('upload-input').click()
  })
  document.getElementById('upload-input').addEventListener('change', (e) => {
    handleUpload(e.target.files)
    e.target.value = ''
  })

  document.getElementById('upload-area').addEventListener('dragover', (e) => {
    e.preventDefault()
    e.currentTarget.classList.add('dragover')
  })
  document.getElementById('upload-area').addEventListener('dragleave', (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragover')
  })
  document.getElementById('upload-area').addEventListener('drop', (e) => {
    e.preventDefault()
    e.currentTarget.classList.remove('dragover')
    if (e.dataTransfer.files.length > 0) {
      handleUpload(e.dataTransfer.files)
    }
  })

  document.getElementById('paste-svg').addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handlePaste()
    }
  })
  document.getElementById('paste-svg').addEventListener('blur', handlePaste)

  document.getElementById('create-pack-name').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleCreatePack()
  })
  document.getElementById('btn-create-submit').addEventListener('click', handleCreatePack)
}

init()
