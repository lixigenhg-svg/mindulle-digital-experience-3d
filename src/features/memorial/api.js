const API_BASE = (import.meta.env.VITE_MEMORIAL_API_BASE || 'https://mindulle.kr/api/pet').replace(/\/+$/, '');
const STORAGE_KEY = 'mdl_pet_memorial_v1';

export class MemorialApiError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'MemorialApiError';
    this.code = code || 'MEMORIAL_API_ERROR';
    this.status = status || 0;
  }
}

async function request(path, options = {}) {
  const headers = { ...(options.headers || {}) };
  if (options.body) headers['content-type'] = 'application/json';

  const response = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new MemorialApiError(
      data.error || '추모관 요청을 처리하지 못했습니다.',
      data.code,
      response.status
    );
  }
  return data;
}

export async function createMemorial({ petName, message, imageDataUrl }) {
  return request('/memorials', {
    method: 'POST',
    body: JSON.stringify({ petName, message, imageDataUrl })
  });
}

export async function getMemorial(publicId) {
  return request(`/memorials/${encodeURIComponent(publicId)}`);
}

export async function deleteMemorial(publicId, ownerToken) {
  return request(`/memorials/${encodeURIComponent(publicId)}`, {
    method: 'DELETE',
    headers: { authorization: `Bearer ${ownerToken}` }
  });
}

export function saveMemorial({ publicId, ownerToken }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ publicId, ownerToken }));
}

export function loadSavedMemorial() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed?.publicId || !parsed?.ownerToken) return null;
    return parsed;
  } catch {
    return null;
  }
}

export function clearSavedMemorial() {
  localStorage.removeItem(STORAGE_KEY);
}

const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

function loadImage(file) {
  const objectUrl = URL.createObjectURL(file);
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new MemorialApiError('사진을 읽지 못했습니다.', 'PET_PHOTO_READ_FAILED', 0));
    };
    image.src = objectUrl;
  });
}

export async function compressPhoto(file) {
  if (!(file instanceof File)) {
    throw new MemorialApiError('사진 파일을 선택해 주세요.', 'PET_PHOTO_REQUIRED', 400);
  }
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new MemorialApiError('JPG, PNG, WebP 사진만 올릴 수 있습니다.', 'PET_PHOTO_TYPE', 400);
  }
  if (file.size > 10 * 1024 * 1024) {
    throw new MemorialApiError('사진은 10MB 이하만 올릴 수 있습니다.', 'PET_PHOTO_SIZE', 400);
  }

  const { image, objectUrl } = await loadImage(file);
  try {
    const maxSide = 1200;
    const scale = Math.min(1, maxSide / Math.max(image.naturalWidth, image.naturalHeight));
    const width = Math.max(1, Math.round(image.naturalWidth * scale));
    const height = Math.max(1, Math.round(image.naturalHeight * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new MemorialApiError('사진을 처리하지 못했습니다.', 'PET_PHOTO_CANVAS', 500);

    context.fillStyle = '#f7f1e6';
    context.fillRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);

    let dataUrl = canvas.toDataURL('image/jpeg', 0.82);
    if (dataUrl.length > 1_200_000) dataUrl = canvas.toDataURL('image/jpeg', 0.68);
    return dataUrl;
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
