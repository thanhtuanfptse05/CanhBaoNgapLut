import test from 'node:test';
import assert from 'node:assert/strict';
import { FloodPoint } from '../../src/domain/entities/FloodPoint.js';
import { FloodAlert } from '../../src/domain/entities/FloodAlert.js';
import { FloodStation } from '../../src/domain/entities/FloodStation.js';

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
