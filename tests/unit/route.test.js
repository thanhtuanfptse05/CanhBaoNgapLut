/**
 * Unit Tests: Flood Route Planner Domain Logic
 * feat-flood-route-planner v1.0.0
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';


// ===== Inline domain functions (mirror of app.js implementation) =====

function haversineDistance(lat1, lon1, lat2, lon2) {
  const R = 6371000; // meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
    * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Khoảng cách từ điểm P đến đoạn thẳng A-B (meters)
 */
function pointToSegmentDistance(pLat, pLon, aLat, aLon, bLat, bLon) {
  const dx = bLon - aLon;
  const dy = bLat - aLat;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return haversineDistance(pLat, pLon, aLat, aLon);
  let t = ((pLon - aLon) * dx + (pLat - aLat) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  const nearLat = aLat + t * dy;
  const nearLon = aLon + t * dx;
  return haversineDistance(pLat, pLon, nearLat, nearLon);
}

/**
 * Phân tích điểm ngập nào nằm trong buffer quanh tuyến đường
 * @param {Array<[number,number]>} coords - [[lng,lat], ...] của tuyến đường
 * @param {Array<{latitude,longitude,...}>} floodPoints
 * @param {number} bufferMeters
 */
function analyzeFloodOnRoute(coords, floodPoints, bufferMeters = 150) {
  if (!coords || coords.length < 2 || !floodPoints) return [];
  return floodPoints.filter(fp => {
    for (let i = 0; i < coords.length - 1; i++) {
      const [aLng, aLat] = coords[i];
      const [bLng, bLat] = coords[i + 1];
      const dist = pointToSegmentDistance(fp.latitude, fp.longitude, aLat, aLng, bLat, bLng);
      if (dist <= bufferMeters) return true;
    }
    return false;
  });
}

/**
 * Tính SafetyScore và label cho một tuyến đường
 */
function scoreRoute(floodPointsOnRoute) {
  const count = floodPointsOnRoute.length;
  const totalDepth = floodPointsOnRoute.reduce((s, p) => s + (p.current_depth_cm || 0), 0);
  const level3Count = floodPointsOnRoute.filter(p => p.severity === 'LEVEL_3').length;
  const score = Math.max(0, 100 - count * 20 - Math.floor(totalDepth / 10) - level3Count * 15);
  let label;
  if (score >= 80) label = 'AN TOÀN';
  else if (score >= 50) label = 'THẬN TRỌNG';
  else label = 'NGUY HIỂM';
  return { score, label };
}

/**
 * Xếp hạng tuyến đường theo SafetyScore giảm dần, rồi distance tăng dần
 */
function rankRoutes(analyzedRoutes) {
  return [...analyzedRoutes].sort((a, b) => {
    if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
    return a.distance_m - b.distance_m;
  });
}

// ===== Test Cases =====

describe('analyzeFloodOnRoute - Flood detection on route polyline', () => {
  const straightRoute = [
    [105.80, 21.00],
    [105.81, 21.00],
    [105.82, 21.00]
  ]; // East-west line at lat 21.00

  it('detects flood point within 150m buffer of route', () => {
    const floodPoints = [
      { id: 'fp1', latitude: 21.0005, longitude: 105.805, current_depth_cm: 40, severity: 'LEVEL_2' }
    ];
    const result = analyzeFloodOnRoute(straightRoute, floodPoints, 150);
    assert.equal(result.length, 1, 'Should detect 1 flood point near route');
  });

  it('excludes flood point more than 150m away from route', () => {
    const floodPoints = [
      { id: 'fp2', latitude: 21.005, longitude: 105.805, current_depth_cm: 30, severity: 'LEVEL_1' }
      // ~555m north of route
    ];
    const result = analyzeFloodOnRoute(straightRoute, floodPoints, 150);
    assert.equal(result.length, 0, 'Should not detect distant flood point');
  });

  it('handles empty flood points array', () => {
    const result = analyzeFloodOnRoute(straightRoute, [], 150);
    assert.deepEqual(result, []);
  });

  it('handles empty route coordinates', () => {
    const result = analyzeFloodOnRoute([], [{ id: 'fp', latitude: 21.0, longitude: 105.8, current_depth_cm: 20 }], 150);
    assert.deepEqual(result, []);
  });

  it('detects multiple flood points along route', () => {
    const floodPoints = [
      { id: 'a', latitude: 21.0001, longitude: 105.801, current_depth_cm: 20, severity: 'LEVEL_1' },
      { id: 'b', latitude: 21.0001, longitude: 105.815, current_depth_cm: 45, severity: 'LEVEL_2' },
      { id: 'c', latitude: 21.010,  longitude: 105.805, current_depth_cm: 60, severity: 'LEVEL_3' } // far away
    ];
    const result = analyzeFloodOnRoute(straightRoute, floodPoints, 150);
    assert.equal(result.length, 2, 'Should detect 2 nearby flood points, exclude 1 far away');
  });
});

describe('scoreRoute - Safety scoring algorithm', () => {
  it('returns score=100, label=AN TOÀN when no flood points', () => {
    const { score, label } = scoreRoute([]);
    assert.equal(score, 100);
    assert.equal(label, 'AN TOÀN');
  });

  it('deducts 20 points per flood point', () => {
    const points = [
      { current_depth_cm: 0, severity: 'LEVEL_1' },
      { current_depth_cm: 0, severity: 'LEVEL_1' }
    ];
    const { score } = scoreRoute(points);
    assert.equal(score, 60);
  });

  it('deducts extra 15 per LEVEL_3 flood point', () => {
    const points = [
      { current_depth_cm: 0, severity: 'LEVEL_3' }
    ];
    const { score } = scoreRoute(points);
    // 100 - 20 (count) - 15 (level3) = 65
    assert.equal(score, 65);
  });

  it('deducts depth score correctly (1 point per 10cm)', () => {
    const points = [
      { current_depth_cm: 50, severity: 'LEVEL_2' }
    ];
    const { score } = scoreRoute(points);
    // 100 - 20 - 5 (50cm/10) = 75
    assert.equal(score, 75);
  });

  it('clamps score to 0 minimum (never negative)', () => {
    const points = Array(10).fill({ current_depth_cm: 100, severity: 'LEVEL_3' });
    const { score } = scoreRoute(points);
    assert.equal(score, 0);
  });

  it('labels THẬN TRỌNG for score 50-79', () => {
    // 1 level2 point: 100 - 20 = 80... need 2 points for 60
    const points = [
      { current_depth_cm: 20, severity: 'LEVEL_2' },
      { current_depth_cm: 20, severity: 'LEVEL_2' }
    ];
    // 100 - 40 - 4 = 56 → THẬN TRỌNG
    const { label } = scoreRoute(points);
    assert.equal(label, 'THẬN TRỌNG');
  });

  it('labels NGUY HIỂM for score < 50', () => {
    const points = [
      { current_depth_cm: 60, severity: 'LEVEL_3' },
      { current_depth_cm: 60, severity: 'LEVEL_3' }
    ];
    // 100 - 40 - 12 - 30 = 18 → NGUY HIỂM
    const { label } = scoreRoute(points);
    assert.equal(label, 'NGUY HIỂM');
  });
});

describe('rankRoutes - Route ranking by safety', () => {
  it('ranks safest route first', () => {
    const routes = [
      { safetyScore: 40, distance_m: 2000 },
      { safetyScore: 90, distance_m: 3000 },
      { safetyScore: 65, distance_m: 1500 }
    ];
    const ranked = rankRoutes(routes);
    assert.equal(ranked[0].safetyScore, 90);
    assert.equal(ranked[1].safetyScore, 65);
    assert.equal(ranked[2].safetyScore, 40);
  });

  it('breaks ties by shorter distance when same safety score', () => {
    const routes = [
      { safetyScore: 80, distance_m: 5000 },
      { safetyScore: 80, distance_m: 2000 }
    ];
    const ranked = rankRoutes(routes);
    assert.equal(ranked[0].distance_m, 2000, 'Shorter route wins on tie');
  });

  it('does not mutate original array', () => {
    const routes = [
      { safetyScore: 30, distance_m: 1000 },
      { safetyScore: 90, distance_m: 2000 }
    ];
    rankRoutes(routes);
    assert.equal(routes[0].safetyScore, 30, 'Original order preserved');
  });
});
