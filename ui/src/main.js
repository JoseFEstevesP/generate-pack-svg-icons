const svgModules = import.meta.glob('../../icon/**/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const state = {
  packs: [],
  activePack: null,
  searchQuery: '',
  outputHistory: ['output'],
  dirHandle: null,
  browsePath: '',
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
      state.outputHistory = config.output_history
    }
    if (config.last_used && !state.activePack) {
      const match = state.packs.find(p => p.name === config.last_used)
      if (match) state.activePack = match.name
    }
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
      html += `<button class="dir-browser-item dir-browser-item-up" data-path="${data.parent}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 15-6-6-6 6"/></svg>
        ..
      </button>`
    }
    if (data.dirs.length === 0 && data.parent === data.current) {
      html += '<div class="dir-browser-empty">(empty directory)</div>'
    }
    for (const d of data.dirs) {
      html += `<button class="dir-browser-item" data-path="${d.path}">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"/></svg>
        ${d.name}
      </button>`
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

function openModal() {
  const modal = document.getElementById('modal')
  const overlay = document.getElementById('overlay')
  const packName = document.getElementById('modal-pack-name')
  const outputInput = document.getElementById('modal-output')
  const result = document.getElementById('modal-result')
  const history = document.getElementById('modal-history')

  packName.textContent = state.activePack
  result.textContent = ''
  result.className = 'modal-result'
  document.getElementById('dir-browser').style.display = 'none'

  if (!state.dirHandle) {
    const defaultDir = state.outputHistory[0] || 'output'
    outputInput.value = defaultDir
  }

  history.innerHTML = state.outputHistory.map(d =>
    `<button class="modal-history-btn" data-dir="${d}">${d}</button>`
  ).join('')
  history.querySelectorAll('.modal-history-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      state.dirHandle = null
      outputInput.value = btn.dataset.dir
    })
  })

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
      state.outputHistory = [dirName, ...state.outputHistory.filter(d => d !== dirName)].slice(0, 5)
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

      state.outputHistory = [outputDir, ...state.outputHistory.filter(d => d !== outputDir)].slice(0, 5)
      showToast(`Pack "${pack}" generated`)
    }
  } catch (err) {
    showResult(`Error: ${err.message}`, 'error')
  }

  btnGen.disabled = false
  btnGen.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate`
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
}

init()
