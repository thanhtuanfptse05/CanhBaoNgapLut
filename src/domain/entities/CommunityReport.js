/**
 * Domain Entity: CommunityReport
 * Crowdsourced flood report submitted by citizens.
 */

export class CommunityReport {
  constructor({
    id,
    provinceCode,
    reporterName = 'Người dân',
    latitude,
    longitude,
    addressText,
    estimatedDepthCm,
    note = '',
    verificationStatus = 'PENDING',
    reportedAt = new Date()
  }) {
    this.id = id;
    this.provinceCode = provinceCode;
    this.reporterName = reporterName;
    this.latitude = latitude;
    this.longitude = longitude;
    this.addressText = addressText;
    this.estimatedDepthCm = estimatedDepthCm;
    this.note = note;
    this.verificationStatus = verificationStatus;
    this.reportedAt = reportedAt;
  }

  isCriticalDepth() {
    return this.estimatedDepthCm >= 50;
  }
}
