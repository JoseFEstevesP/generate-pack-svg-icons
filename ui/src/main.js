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

async function handleFolderPick() {
  if (!window.showDirectoryPicker) {
    showToast('Your browser does not support folder picking. Type the path manually.')
    return
  }
  try {
    const handle = await window.showDirectoryPicker()
    state.dirHandle = handle
    document.getElementById('modal-output').value = handle.name
    showToast(`Selected: ${handle.name}`)
  } catch {
    state.dirHandle = null
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
}

function showResult(msg, type) {
  const el = document.getElementById('modal-result')
  el.textContent = msg
  el.className = 'modal-result ' + type
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
      showResult(
        `Generated: ${dirName}/${fileName}\n${data.icons.processed} icons · ${(data.size.raw / 1024).toFixed(1)}KB → ${(data.size.optimized / 1024).toFixed(1)}KB (${data.savings}% savings)`,
        'success'
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

      showResult(
        `Generated: ${data.output}\n${data.icons.processed} icons · ${(data.size.raw / 1024).toFixed(1)}KB → ${(data.size.optimized / 1024).toFixed(1)}KB (${data.savings}% savings)`,
        'success'
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

  document.getElementById('modal-output').addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleGenerate()
  })
}

init()
