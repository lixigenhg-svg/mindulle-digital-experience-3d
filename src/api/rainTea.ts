export const rainTeaEndpoint = (import.meta.env.VITE_RAIN_TEA_API?.trim() || 'https://mindulle.kr/api/tea').replace(/\/+$/, '');

const tokenKey = 'mindulle.rainTea.memberToken';
let memberToken = '';

export function rememberRainTeaToken(token: unknown) {
  if (typeof token !== 'string' || !/^[A-Za-z0-9_.-]{1,2048}$/.test(token)) return;
  memberToken = token;
  try { localStorage.setItem(tokenKey, token); } catch { /* Current tab can still use the token. */ }
}

export function consumeRainTeaReturn() {
  const url = new URL(location.href);
  if (url.searchParams.get('tea') !== 'paid') return false;
  rememberRainTeaToken(url.searchParams.get('token'));
  url.searchParams.delete('token');
  url.searchParams.delete('tea');
  history.replaceState(history.state, '', url.pathname + url.search + url.hash);
  return true;
}

export async function rainTeaRequest<T>(path: string, init: RequestInit = {}): Promise<T> {
  let token = memberToken;
  try { token = localStorage.getItem(tokenKey) || token; } catch { /* Use the in-memory token. */ }
  const headers = new Headers(init.headers);
  if (token) headers.set('Authorization', `Bearer ${token}`);
  const response = await fetch(`${rainTeaEndpoint}${path}`, {
    ...init, headers, credentials: 'include', cache: 'no-store',
  });
  if (!response.ok) throw new Error(`Rain tea request failed (${response.status})`);
  return response.json() as Promise<T>;
}
