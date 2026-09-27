/**
 * Infrastructure Service: OpenMeteoWeatherService
 * Fetches hyper-local meteorological telemetry from Open-Meteo API.
 * Computes cumulative rainfall (1h - 72h), soil moisture saturation, and forward forecast.
 */

export class OpenMeteoWeatherService {
  constructor({ cacheTtlMs = 180000, fetchFn = null } = {}) {
    this.cacheTtlMs = cacheTtlMs;
    this.fetch = fetchFn || (typeof fetch !== 'undefined' ? fetch.bind(globalThis) : null);
    this.cache = new Map();
  }

  _getCacheKey(lat, lng) {
    // Round to ~5km grid to maximize cache efficiency
    const rLat = Number(lat).toFixed(2);
    const rLng = Number(lng).toFixed(2);
    return `${rLat},${rLng}`;
  }

  /**
   * Fetch comprehensive telemetry for coordinates
   * @param {number} lat Latitude
   * @param {number} lng Longitude
   * @returns {Promise<WeatherTelemetry>}
   */
  async getDetailedWeather(lat, lng) {
    const key = this._getCacheKey(lat, lng);
    const cached = this.cache.get(key);
    const now = Date.now();

    if (cached && (now - cached.timestamp < this.cacheTtlMs)) {
      return cached.data;
    }

    try {
      const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lng}` +
        `&current=temperature_2m,relative_humidity_2m,precipitation,rain,weather_code,wind_speed_10m,wind_gusts_10m` +
        `&hourly=precipitation,rain,soil_moisture_0_to_7cm,soil_moisture_7_to_28cm` +
        `&past_days=3&forecast_days=2&timezone=Asia%2FBangkok`;

      const res = await this.fetch(url);
      if (!res.ok) {
        throw new Error(`Open-Meteo API error: status ${res.status}`);
      }

      const json = await res.json();
      const telemetry = this._parseTelemetry(json, lat, lng);
      this.cache.set(key, { timestamp: now, data: telemetry });
      return telemetry;
    } catch (err) {
      // Fallback safe payload
      return this._createFallbackTelemetry(lat, lng, err.message);
    }
  }

  _parseTelemetry(json, lat, lng) {
    const current = json?.current || {};
    const hourly = json?.hourly || {};
    const times = hourly?.time || [];
    const hourlyPrecip = hourly?.precipitation || [];
    const soilMoisture = hourly?.soil_moisture_0_to_7cm || [];

    const currentTimeIso = current?.time || new Date().toISOString();
    // Find current index in hourly array
    let currentIndex = times.findIndex(t => t >= currentTimeIso);
    if (currentIndex === -1) currentIndex = Math.max(0, times.length - 24);

    // Calculate historical accumulated rainfall (going backward from current index)
    const accum1h = this._sumSlice(hourlyPrecip, Math.max(0, currentIndex - 1), currentIndex + 1);
    const accum3h = this._sumSlice(hourlyPrecip, Math.max(0, currentIndex - 3), currentIndex + 1);
    const accum6h = this._sumSlice(hourlyPrecip, Math.max(0, currentIndex - 6), currentIndex + 1);
    const accum12h = this._sumSlice(hourlyPrecip, Math.max(0, currentIndex - 12), currentIndex + 1);
    const accum24h = this._sumSlice(hourlyPrecip, Math.max(0, currentIndex - 24), currentIndex + 1);
    const accum48h = this._sumSlice(hourlyPrecip, Math.max(0, currentIndex - 48), currentIndex + 1);
    const accum72h = this._sumSlice(hourlyPrecip, Math.max(0, currentIndex - 72), currentIndex + 1);

    // Current soil moisture
    const currentSoilMoisture = Number(soilMoisture[currentIndex] ?? 0.28);
    let soilSaturationLevel = 'MEDIUM';
    if (currentSoilMoisture >= 0.42) soilSaturationLevel = 'SATURATED';
    else if (currentSoilMoisture >= 0.32) soilSaturationLevel = 'HIGH';
    else if (currentSoilMoisture < 0.20) soilSaturationLevel = 'LOW';

    // Forward 24h forecast
    const forecast24h = [];
    let maxNext3h = 0;
    for (let i = 1; i <= 24; i++) {
      const idx = currentIndex + i;
      if (idx < times.length) {
        const p = Number(hourlyPrecip[idx] || 0);
        forecast24h.push({
          time: times[idx],
          precipitation: p
        });
        if (i <= 3 && p > maxNext3h) {
          maxNext3h = p;
        }
      }
    }

    return {
      coordinates: { lat: Number(lat), lng: Number(lng) },
      temperature: Number(current.temperature_2m ?? 28),
      humidity: Number(current.relative_humidity_2m ?? 80),
      rainRate: Number(current.precipitation ?? current.rain ?? 0),
      weatherCode: Number(current.weather_code ?? 0),
      windSpeed: Number(current.wind_speed_10m ?? 10),
      windGusts: Number(current.wind_gusts_10m ?? 15),
      accumulated: {
        h1: Number(accum1h.toFixed(1)),
        h3: Number(accum3h.toFixed(1)),
        h6: Number(accum6h.toFixed(1)),
        h12: Number(accum12h.toFixed(1)),
        h24: Number(accum24h.toFixed(1)),
        h48: Number(accum48h.toFixed(1)),
        h72: Number(accum72h.toFixed(1))
      },
      soil: {
        moisture: Number(currentSoilMoisture.toFixed(3)),
        level: soilSaturationLevel
      },
      forecast: {
        next3hMaxRain: Number(maxNext3h.toFixed(1)),
        hourly: forecast24h
      },
      isLive: true,
      lastUpdated: new Date().toISOString()
    };
  }

  _sumSlice(arr, start, end) {
    if (!arr || arr.length === 0) return 0;
    let sum = 0;
    for (let i = start; i < Math.min(arr.length, end); i++) {
      sum += Number(arr[i] || 0);
    }
    return sum;
  }

  _createFallbackTelemetry(lat, lng, errorMsg = '') {
    return {
      coordinates: { lat: Number(lat), lng: Number(lng) },
      temperature: 28,
      humidity: 80,
      rainRate: 0,
      weatherCode: 0,
      windSpeed: 10,
      windGusts: 15,
      accumulated: { h1: 0, h3: 0, h6: 0, h12: 0, h24: 0, h48: 0, h72: 0 },
      soil: { moisture: 0.25, level: 'MEDIUM' },
      forecast: { next3hMaxRain: 0, hourly: [] },
      isLive: false,
      error: errorMsg,
      lastUpdated: new Date().toISOString()
    };
  }
}
