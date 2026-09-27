/**
 * Domain Entity: FloodStation
 * Represents an automatic hydrological or tide monitoring station.
 */

export class FloodStation {
  constructor({
    id,
    code,
    name,
    stationType = 'HYDRO', // HYDRO | TIDE | RAIN
    provinceCode,
    riverBasinId,
    latitude,
    longitude,
    currentWaterLevel = null,
    status = 'ACTIVE'
  }) {
    this.id = id;
    this.code = code;
    this.name = name;
    this.stationType = stationType;
    this.provinceCode = provinceCode;
    this.riverBasinId = riverBasinId;
    this.latitude = latitude;
    this.longitude = longitude;
    this.currentWaterLevel = currentWaterLevel;
    this.status = status;
  }

  isOperational() {
    return this.status === 'ACTIVE';
  }
}
