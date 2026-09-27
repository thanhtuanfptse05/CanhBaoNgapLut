/**
 * Domain Entity: FloodPoint
 * Represents a geographical flood monitoring location.
 * Pure business logic without UI or external framework dependencies.
 */

export class FloodPoint {
  constructor({
    id,
    name,
    provinceCode,
    latitude,
    longitude,
    currentDepthCm = 0,
    severity = null,
    cause = 'HEAVY_RAIN',
    status = 'STABLE',
    lastUpdated = new Date()
  }) {
    this.id = id;
    this.name = name;
    this.provinceCode = provinceCode;
    this.latitude = latitude;
    this.longitude = longitude;
    this.currentDepthCm = currentDepthCm;
    this.severity = severity || this.calculateSeverity(currentDepthCm);
    this.cause = cause;
    this.status = status;
    this.lastUpdated = lastUpdated;
  }

  /**
   * Determine flood severity level based on water depth in centimeters
   */
  calculateSeverity(depthCm) {
    if (depthCm >= 50) return 'LEVEL_3'; // Ngập sâu nguy hiểm
    if (depthCm >= 30) return 'LEVEL_2'; // Xe máy chết máy
    if (depthCm >= 10) return 'LEVEL_1'; // Xe đi chậm
    return 'SAFE';                       // Thông thoáng
  }

  isDangerous() {
    return this.severity === 'LEVEL_3';
  }

  canPassMotorbike() {
    return this.currentDepthCm < 25;
  }
}
