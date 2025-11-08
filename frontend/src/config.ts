export const API_BASE: string = (import.meta as any).env?.VITE_API_BASE || 'http://localhost:8001'

export const getApiUrl = (path: string) => `${API_BASE}${path.startsWith('/') ? '' : '/'}${path}`
