/** DSH-compatible theme management using data attributes */

const THEME_KEY = 'qdagent.theme'
const DARK_ATTR = 'data-ds-dark-theme'

export type Theme = 'light' | 'dark' | 'system'

export function getTheme(): Theme {
  const stored = localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored
  return 'dark' // DSH default is dark
}

export function applyTheme(theme: Theme): void {
  const body = document.body

  if (theme === 'dark') {
    body.setAttribute(DARK_ATTR, '')
  } else if (theme === 'light') {
    body.removeAttribute(DARK_ATTR)
  } else {
    // system: follow prefers-color-scheme
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    if (prefersDark) {
      body.setAttribute(DARK_ATTR, '')
    } else {
      body.removeAttribute(DARK_ATTR)
    }
  }

  localStorage.setItem(THEME_KEY, theme)
}

export function initTheme(): void {
  applyTheme(getTheme())

  // Listen for system theme changes
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (getTheme() === 'system') {
      applyTheme('system')
    }
  })
}
