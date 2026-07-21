const BASE = '/api';
export async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('token'); const response = await fetch(`${BASE}${path}`, { ...options, headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers || {}) } });
  if (!response.ok) { let message = `Request failed (${response.status})`; try { const body = await response.json(); message = body.error?.message || message; } catch { /* non-JSON error */ } if (response.status === 401) { localStorage.removeItem('token'); localStorage.removeItem('user'); } throw new Error(message); }
  return response.json();
}
export const endpoints = {
  login: (email: string, password: string) => api('/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  dashboard: () => api('/assay-workflow/dashboard'), evidence: (id: string) => api(`/assay-workflow/runs/${id}/evidence`),
  submit: (id: string, body: object) => api(`/assay-workflow/runs/${id}/submit`, { method: 'POST', body: JSON.stringify(body) }),
  release: (id: string, body: object) => api(`/assay-workflow/runs/${id}/release`, { method: 'POST', body: JSON.stringify(body) }),
  audit: () => api('/assay-workflow/audit/verify'),
};
