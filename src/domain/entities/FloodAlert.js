/**
 * Domain Entity: FloodAlert
 * Emergency disaster and heavy rain broadcast alert.
 */

export class FloodAlert {
  constructor({
    id,
    title,
    message,
    alertLevel = 'WARNING', // WATCH | WARNING | EMERGENCY
    provinceCode,
    safetyInstructions,
    issuedBy = 'Ban Chỉ Huy PCTT',
    isActive = true,
    startsAt = new Date(),
    expiresAt = null
  }) {
    this.id = id;
    this.title = title;
    this.message = message;
    this.alertLevel = alertLevel;
    this.provinceCode = provinceCode;
    this.safetyInstructions = safetyInstructions;
    this.issuedBy = issuedBy;
    this.isActive = isActive;
    this.startsAt = startsAt;
    this.expiresAt = expiresAt;
  }

  isEmergency() {
    return this.alertLevel === 'EMERGENCY' && this.isActive;
  }
}
