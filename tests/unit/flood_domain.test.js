import test from 'node:test';
import assert from 'node:assert/strict';
import { FloodPoint } from '../../src/domain/entities/FloodPoint.js';
import { FloodAlert } from '../../src/domain/entities/FloodAlert.js';
import { FloodStation } from '../../src/domain/entities/FloodStation.js';
import { CommunityReport } from '../../src/domain/entities/CommunityReport.js';

test('FloodPoint entity correctly calculates severity based on water depth', () => {
  const safePoint = new FloodPoint({ id: '1', name: 'Đường A', provinceCode: '01', latitude: 21, longitude: 105, currentDepthCm: 5 });
  assert.equal(safePoint.severity, 'SAFE');
  assert.equal(safePoint.isDangerous(), false);
  assert.equal(safePoint.canPassMotorbike(), true);

  const level1Point = new FloodPoint({ id: '2', name: 'Đường B', provinceCode: '01', latitude: 21, longitude: 105, currentDepthCm: 15 });
  assert.equal(level1Point.severity, 'LEVEL_1');
  assert.equal(level1Point.isDangerous(), false);

  const level2Point = new FloodPoint({ id: '3', name: 'Đường C', provinceCode: '01', latitude: 21, longitude: 105, currentDepthCm: 35 });
  assert.equal(level2Point.severity, 'LEVEL_2');
  assert.equal(level2Point.isDangerous(), false);
  assert.equal(level2Point.canPassMotorbike(), false);

  const level3Point = new FloodPoint({ id: '4', name: 'Đường D', provinceCode: '01', latitude: 21, longitude: 105, currentDepthCm: 60 });
  assert.equal(level3Point.severity, 'LEVEL_3');
  assert.equal(level3Point.isDangerous(), true);
  assert.equal(level3Point.canPassMotorbike(), false);
});

test('FloodAlert entity recognizes active emergency levels', () => {
  const alert = new FloodAlert({
    id: 'a1',
    title: 'Bão lũ',
    message: 'Nước dâng nhanh',
    alertLevel: 'EMERGENCY',
    provinceCode: '79',
    isActive: true
  });
  assert.equal(alert.isEmergency(), true);

  const inactiveAlert = new FloodAlert({
    id: 'a2',
    title: 'Triều cường cũ',
    message: 'Nước đã rút',
    alertLevel: 'EMERGENCY',
    provinceCode: '79',
    isActive: false
  });
  assert.equal(inactiveAlert.isEmergency(), false);
});

test('FloodStation entity reports operational state', () => {
  const station = new FloodStation({
    id: 's1',
    code: 'ST-01',
    name: 'Trạm Long Biên',
    latitude: 21.04,
    longitude: 105.86,
    status: 'ACTIVE'
  });
  assert.equal(station.isOperational(), true);
});

test('CommunityReport anti-spam consensus and geofence rules', () => {
  const report = new CommunityReport({
    id: 'cr-1',
    provinceCode: '01',
    latitude: 21.0285,
    longitude: 105.8048,
    addressText: 'Nguyễn Trãi, Thanh Xuân',
    estimatedDepthCm: 40,
    upvoteCount: 1,
    downvoteCount: 0,
    verificationStatus: 'PENDING'
  });

  // Check geofence (21.03, 105.80 is very close ~1km)
  assert.equal(report.isWithinGeofence(21.0300, 105.8050, 25), true);
  // Check geofence far away (Da Nang vs Ha Noi ~600km)
  assert.equal(report.isWithinGeofence(16.0544, 108.2022, 25), false);

  // Upvote consensus promotion
  report.upvote();
  assert.equal(report.upvoteCount, 2);
  assert.equal(report.verificationStatus, 'VERIFIED');

  // Downvote consensus rejection
  report.downvote();
  report.downvote();
  assert.equal(report.downvoteCount, 2);
  assert.equal(report.verificationStatus, 'REJECTED');
});
