const svgModules = import.meta.glob('../../icon/**/*.svg', {
  eager: true,
  query: '?raw',
  import: 'default',
})

const state = {
  packs: [],
  activePack: null,
  searchQuery: '',
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

function init() {
  parsePacks()

  if (state.packs.length > 0) {
    state.activePack = state.packs[0].name
  }

  renderSidebar()
  renderGrid()

  const searchInput = document.getElementById('search')
  let debounce
  searchInput.addEventListener('input', () => {
    clearTimeout(debounce)
    debounce = setTimeout(() => {
      state.searchQuery = searchInput.value
      renderGrid()
    }, 150)
  })

  const btnGen = document.getElementById('btn-generate')
  btnGen.addEventListener('click', async () => {
    if (!state.activePack) return
    btnGen.disabled = true
    btnGen.innerHTML = 'Generating...'

    try {
      const resp = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pack: state.activePack }),
      })
      if (!resp.ok) throw new Error('Server unavailable')
      const data = await resp.json()
      if (data.ok) {
        showToast(`Pack "${state.activePack}" generated (${data.savings}% savings)`)
      } else {
        showToast(`Error: ${data.error}`)
      }
    } catch {
      const cmd = `pnpm generate --pack "${state.activePack}"`
      try {
        await navigator.clipboard.writeText(cmd)
        showToast(`Command copied: ${cmd}`)
      } catch {
        showToast(`Run: ${cmd}`)
      }
    }
    btnGen.disabled = false
    btnGen.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg> Generate Pack`
  })
}

init()
