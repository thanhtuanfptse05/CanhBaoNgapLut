/**
 * Domain Entity: Province
 * Represents an administrative province/city in Vietnam.
 * Pure business logic without UI or external framework dependencies.
 */

export class Province {
  constructor({
    code,
    name,
    region,
    centerLat,
    centerLng,
    zoomLevel = 11,
    districts = []
  }) {
    if (!code || !name) {
      throw new Error('Province code and name are mandatory');
    }
    this.code = String(code).padStart(2, '0');
    this.name = name;
    this.region = region || 'BAC_BO'; // BAC_BO | TRUNG_BO | TAY_NGUYEN | DONG_NAM_BO | TAY_NAM_BO
    this.centerLat = Number(centerLat);
    this.centerLng = Number(centerLng);
    this.zoomLevel = Number(zoomLevel) || 11;
    this.districts = districts;
  }

  getCoordinates() {
    return {
      lat: this.centerLat,
      lng: this.centerLng
    };
  }

  hasDistrict(districtName) {
    if (!districtName) return false;
    const norm = districtName.toLowerCase().trim();
    return this.districts.some(d => d.name.toLowerCase().includes(norm));
  }
}
