import { useCallback, useSyncExternalStore } from 'react'

const read = () => window.location.hash.replace(/^#/, '') || '/'
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function navigate(path: string, replace = false) {
  if (replace) window.history.replaceState(null, '', '#' + path)
  else window.location.hash = path
  if (replace) window.dispatchEvent(new HashChangeEvent('hashchange'))
}

export function useRoute() {
  const full = useSyncExternalStore(subscribe, read)
  const [path, query = ''] = full.split('?')
  const params = new URLSearchParams(query)
  const segs = path.split('/').filter(Boolean)
  const setParam = useCallback(
    (key: string, value?: string) => {
      const p = new URLSearchParams(query)
      if (value) p.set(key, value)
      else p.delete(key)
      const qs = p.toString()
      navigate(path + (qs ? '?' + qs : ''), true)
    },
    [path, query],
  )
  return { path, page: segs[0] ?? '', id: segs[1], params, setParam, full }
}
