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
    upvoteCount = 1,
    downvoteCount = 0,
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
    this.upvoteCount = upvoteCount;
    this.downvoteCount = downvoteCount;
    this.verificationStatus = verificationStatus;
    this.reportedAt = reportedAt instanceof Date ? reportedAt : new Date(reportedAt);
  }

  isCriticalDepth() {
    return this.estimatedDepthCm >= 50;
  }

  upvote() {
    this.upvoteCount += 1;
    if (this.upvoteCount >= 2 && this.verificationStatus !== 'REJECTED') {
      this.verificationStatus = 'VERIFIED';
    }
  }

  downvote() {
    this.downvoteCount += 1;
    if (this.downvoteCount >= 2) {
      this.verificationStatus = 'REJECTED';
    }
  }

  isExpired(maxAgeMs = 2 * 60 * 60 * 1000) {
    const age = Date.now() - this.reportedAt.getTime();
    return age > maxAgeMs && this.upvoteCount <= 1;
  }

  isWithinGeofence(userLat, userLng, maxDistKm = 25) {
    const R = 6371; // Earth radius in km
    const dLat = (this.latitude - userLat) * Math.PI / 180;
    const dLon = (this.longitude - userLng) * Math.PI / 180;
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(userLat * Math.PI / 180) * Math.cos(this.latitude * Math.PI / 180) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    const dist = R * c;
    return dist <= maxDistKm;
  }
}
