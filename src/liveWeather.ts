/**
 * liveWeather.ts —— 按玩家所在地区与实时天气自动决定环境演出
 *
 * 数据源：Open-Meteo（免费、无需 Key、允许浏览器直连）。
 * 位置：优先浏览器定位（用户授权后），拿不到就退回仁川市区坐标。
 * 隐私：只在本次页面内用，不写数据库、不做服务端转发；定位失败不影响体验。
 */

import type { WeatherMode } from './immersive';

export interface LiveWeather {
  mode: WeatherMode;
  /** 风力系数，用于落叶/雨丝漂移速度 */
  wind: number;
  night: boolean;
  tempC: number;
  /** 设置面板里显示的一行韩文说明，例如「인천 · 비 · 7°C」 */
  label: string;
}

const FALLBACK = { lat: 37.4565, lon: 126.7052, name: '인천' };

function getPosition(): Promise<{ lat: number; lon: number } | null> {
  return new Promise(resolve => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      resolve(null);
      return;
    }
    const timer = window.setTimeout(() => resolve(null), 6000);
    navigator.geolocation.getCurrentPosition(
      pos => {
        window.clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        window.clearTimeout(timer);
        resolve(null);
      },
      { timeout: 6000, maximumAge: 30 * 60 * 1000 }
    );
  });
}

/** WMO 天气代码 → 演出模式 */
function codeToMode(code: number, tempC: number, month: number): WeatherMode {
  const cold = tempC <= 0.5;
  // 降雪类
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return 'snow';
  // 阵雨 / 雨 / 毛毛雨 / 雷雨
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return cold ? 'snow' : 'rain';
  // 雾凇、冻雨
  if (code === 56 || code === 57 || code === 66 || code === 67) return cold ? 'snow' : 'rain';

  // 其余按季节：3–5 春叶、6–8 夏（无落叶）、9–11 秋叶、12–2 冬（冷则雪）
  if (month >= 9 && month <= 11) return 'leaf';
  if (month >= 3 && month <= 5) return 'leaf';
  if (month === 12 || month === 1 || month === 2) return tempC <= 1 ? 'snow' : 'none';
  return 'none';
}

function describe(code: number, tempC: number): string {
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return '눈';
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82) || code >= 95) return '비';
  if (code === 45 || code === 48) return '안개';
  if (code <= 1) return '맑음';
  if (code === 2) return '구름 조금';
  return '흐림';
}

export async function fetchLiveWeather(): Promise<LiveWeather> {
  const pos = await getPosition();
  const lat = pos?.lat ?? FALLBACK.lat;
  const lon = pos?.lon ?? FALLBACK.lon;

  const url =
    'https://api.open-meteo.com/v1/forecast' +
    `?latitude=${lat.toFixed(3)}&longitude=${lon.toFixed(3)}` +
    '&current=temperature_2m,weather_code,is_day,wind_speed_10m' +
    '&timezone=Asia%2FSeoul';

  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) throw new Error('weather http ' + res.status);
  const data = (await res.json()) as {
    current?: { temperature_2m?: number; weather_code?: number; is_day?: number; wind_speed_10m?: number };
  };
  const cur = data.current ?? {};
  const tempC = typeof cur.temperature_2m === 'number' ? cur.temperature_2m : 12;
  const code = typeof cur.weather_code === 'number' ? cur.weather_code : 0;
  const isDay = cur.is_day !== 0;
  const windKmh = typeof cur.wind_speed_10m === 'number' ? cur.wind_speed_10m : 6;
  const month = new Date().getMonth() + 1;

  const mode = codeToMode(code, tempC, month);
  const wind = Math.max(0.4, Math.min(2.2, 0.4 + windKmh / 12));
  const night = !isDay;
  const where = pos ? '현재 위치' : '인천';

  return {
    mode,
    wind,
    night,
    tempC: Math.round(tempC),
    label: `${where} · ${describe(code, tempC)} · ${Math.round(tempC)}°C`,
  };
}
