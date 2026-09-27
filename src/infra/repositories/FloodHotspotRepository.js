/**
 * Infrastructure Repository: FloodHotspotRepository
 * Provides access to the National Flood Vulnerability Hotspots database.
 */

import hotspotsData from '../data/national_flood_hotspots.json' with { type: 'json' };

export class FloodHotspotRepository {
  constructor(initialData = null) {
    this.hotspots = Array.isArray(initialData) ? initialData : hotspotsData;
  }

  getAll() {
    return [...this.hotspots];
  }

  getById(id) {
    return this.hotspots.find(h => h.id === id) || null;
  }

  getByProvince(provinceCode) {
    if (!provinceCode || provinceCode === 'all') return this.getAll();
    const code = String(provinceCode).padStart(2, '0');
    return this.hotspots.filter(h => String(h.province_code).padStart(2, '0') === code);
  }

  getByDistrict(provinceCode, districtName) {
    const list = this.getByProvince(provinceCode);
    if (!districtName) return list;
    const norm = districtName.toLowerCase().trim();
    return list.filter(h => (h.district && h.district.toLowerCase().includes(norm)));
  }

  search(query) {
    if (!query || typeof query !== 'string') return this.getAll();
    const q = query.toLowerCase().trim();
    return this.hotspots.filter(h => {
      const matchName = h.name.toLowerCase().includes(q);
      const matchAddr = h.address_text.toLowerCase().includes(q);
      const matchDist = h.district ? h.district.toLowerCase().includes(q) : false;
      return matchName || matchAddr || matchDist;
    });
  }

  findNearby(lat, lng, radiusKm = 15) {
    const r = Number(radiusKm);
    const originLat = Number(lat);
    const originLng = Number(lng);

    return this.hotspots
      .map(h => {
        const dist = this._haversineDistanceKm(originLat, originLng, h.latitude, h.longitude);
        return { ...h, distanceKm: Number(dist.toFixed(2)) };
      })
      .filter(h => h.distanceKm <= r)
      .sort((a, b) => a.distanceKm - b.distanceKm);
  }

  _haversineDistanceKm(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }
}
