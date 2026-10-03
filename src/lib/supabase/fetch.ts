export function customFetch(url: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  let urlString = typeof url === 'string' ? url : url instanceof URL ? url.toString() : url.url
  const publicUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:8000'
  const internalUrl = process.env.SUPABASE_INTERNAL_URL || 'http://kong:8000'

  if (typeof window === 'undefined' && publicUrl && internalUrl && urlString.startsWith(publicUrl)) {
    urlString = urlString.replace(publicUrl, internalUrl)
  }

  const mergedHeaders = new Headers()

  // Extract headers from the Request object if it exists
  if (typeof url === 'object' && 'url' in url && !(url instanceof URL)) {
    const req = url as Request
    if (req.headers) {
      req.headers.forEach((value, key) => mergedHeaders.set(key, value))
    }
  }

  // Overwrite/append headers from init
  if (init && init.headers) {
    const initHeaders = new Headers(init.headers)
    initHeaders.forEach((value, key) => mergedHeaders.set(key, value))
  }

  // Build the final init options
  let finalInit: RequestInit = {}
  
  if (typeof url === 'object' && 'url' in url && !(url instanceof URL)) {
    const req = url as Request
    finalInit = {
      method: req.method,
      body: req.body,
      credentials: req.credentials,
      cache: req.cache,
      mode: req.mode,
      redirect: req.redirect,
      integrity: req.integrity,
      keepalive: req.keepalive,
      signal: req.signal,
    }
  }

  finalInit = { ...finalInit, ...init, headers: mergedHeaders }

  return fetch(urlString, finalInit)
}
