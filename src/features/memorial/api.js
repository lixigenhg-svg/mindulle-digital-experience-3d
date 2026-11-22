const RAW_BASE =
  (typeof import.meta !== 'undefined' && import.meta.env && import.meta.env.VITE_MINDOLLE_API_BASE) ||
  'https://mindulle.kr';

export const PET_API_BASE = String(RAW_BASE).replace(/\/+$/, '');
const TOKEN_KEY = 'mindulle.rainbow.ownerToken';

export class PetApiError extends Error {
  constructor(message, { status = 0, code = 'PET_ERROR', payload = null } = {}) {
    super(message);
    this.name = 'PetApiError';
    this.status = status;
    this.code = code;
    this.payload = payload;
  }
}

export function getOwnerToken() {
  try {
    return localStorage.getItem(TOKEN_KEY) || '';
  } catch {
    return '';
  }
}

export function setOwnerToken(token) {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

export function clearOwnerToken() {
  setOwnerToken('');
}

async function request(path, { method = 'GET', body, token = getOwnerToken() } = {}) {
  const headers = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  if (token) headers.authorization = `Bearer ${token}`;

  const response = await fetch(`${PET_API_BASE}${path}`, {
    method,
    headers,
    credentials: 'omit',
    cache: 'no-store',
    body: body === undefined ? undefined : JSON.stringify(body),
  });

  const text = await response.text();
  let payload = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      payload = null;
    }
  }

  if (!response.ok) {
    const message = typeof payload?.error === 'string' ? payload.error : '';
    const storageError = /\b(?:EACCES|EPERM|EROFS|ENOSPC)\b/.test(message);
    throw new PetApiError(
      storageError ? '서버에 사진을 저장하지 못했습니다. 잠시 후 다시 시도해 주세요.'
        : message && !/[<>]|\p{Script=Han}/u.test(message) && /[가-힣]/.test(message)
          ? message : '요청을 처리하지 못했습니다.',
      {
      status: response.status,
      code: payload?.code || 'PET_ERROR',
      payload,
    });
  }
  return payload;
}

export const petApi = {
  config() {
    return request('/api/pet/config');
  },

  sendCode(phone) {
    return request('/api/pet/auth/send-code', {
      method: 'POST',
      body: { phone },
      token: '',
    });
  },

  verify(phone, code) {
    return request('/api/pet/auth/verify', {
      method: 'POST',
      body: { phone, code },
      token: '',
    });
  },

  listRooms() {
    return request('/api/pet/rooms');
  },

  createRoom({ petName, message }) {
    return request('/api/pet/rooms', {
      method: 'POST',
      body: { petName, message },
    });
  },

  getRoom(publicId) {
    return request(`/api/pet/rooms/${encodeURIComponent(publicId)}`);
  },

  addPhoto(roomId, imageDataUrl) {
    return request(`/api/pet/rooms/${encodeURIComponent(roomId)}/photos`, {
      method: 'POST',
      body: { imageDataUrl },
    });
  },

  deletePhoto(roomId, photoId) {
    return request(
      `/api/pet/rooms/${encodeURIComponent(roomId)}/photos/${encodeURIComponent(photoId)}`,
      { method: 'DELETE' }
    );
  },

  checkout(roomId) {
    return request(`/api/pet/rooms/${encodeURIComponent(roomId)}/checkout`, {
      method: 'POST',
      body: {},
    });
  },

  subscription(roomId) {
    return request(`/api/pet/rooms/${encodeURIComponent(roomId)}/subscription`);
  },

  cancel(roomId) {
    return request(`/api/pet/rooms/${encodeURIComponent(roomId)}/cancel`, {
      method: 'POST',
      body: {},
    });
  },

  deleteRoom(roomId) {
    return request(`/api/pet/rooms/${encodeURIComponent(roomId)}`, {
      method: 'DELETE',
    });
  },
};

export async function loadMemorialPhoto(url, { signal, download = false } = {}) {
  const address = new URL(url);
  if (address.origin !== new URL(PET_API_BASE).origin || !address.pathname.startsWith('/api/pet/rooms/')) {
    throw new Error('사진 주소를 확인할 수 없습니다.');
  }
  if (download) address.searchParams.set('download', '1');
  const token = getOwnerToken();
  const response = await fetch(address, {
    signal, credentials: 'omit', cache: 'no-store',
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok || !response.headers.get('content-type')?.startsWith('image/')) {
    throw new Error('사진을 불러오지 못했습니다.');
  }
  return response.blob();
}
