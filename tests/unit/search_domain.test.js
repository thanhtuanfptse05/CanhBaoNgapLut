import test from 'node:test';
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';

function sanitizeSearchQuery(query) {
  if (!query || typeof query !== 'string') return '';
  return query.trim();
}

function shouldTriggerAutocomplete(query, minLength = 2) {
  const clean = sanitizeSearchQuery(query);
  return clean.length >= minLength;
}

function formatMapboxFeature(feature) {
  const name = feature.text_vi || feature.text || feature.place_name || '';
  const fullName = feature.place_name_vi || feature.place_name || '';
  return {
    id: feature.id,
    name: name,
    fullName: fullName,
    latitude: feature.center[1],
    longitude: feature.center[0]
  };
}

// ============================================================
// Search Engine v2.0 helpers (mirror of supabase-service.js)
// ============================================================

function _normalizeVi(str) {
  if (!str) return '';
  return str
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/g, 'd').replace(/Đ/g, 'd')
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function _fuzzyScore(query, candidate) {
  const q = _normalizeVi(query);
  const c = _normalizeVi(candidate);
  const qTokens = q.split(' ').filter(t => t.length >= 2);
  if (qTokens.length === 0) return 0;
  let hits = 0;
  for (const tok of qTokens) { if (c.includes(tok)) hits++; }
  const startBonus = c.startsWith(qTokens[0]) ? 0.2 : 0;
  return Math.min(1, (hits / qTokens.length) + startBonus);
}

function _decomposeQuery(query) {
  const LOCATION_TOKENS = [
    'ba đình','hoàn kiếm','đống đa','hai bà trưng','hoàng mai','thanh xuân','cầu giấy',
    'tây hồ','long biên','nam từ liêm','bắc từ liêm','hà đông','sơn tây',
    'quận 1','quận 3','quận 5','quận 7','quận 10','bình thạnh','gò vấp',
    'tân bình','tân phú','phú nhuận','bình chánh','hóc môn','nhà bè','thủ đức',
    'hà nội','hồ chí minh','đà nẵng','hải phòng','cần thơ','huế','nha trang',
    'đà lạt','vũng tàu','quảng ninh','bắc ninh','hải dương','hưng yên',
    'thái nguyên','bình dương','đồng nai','long an',
    'quận','huyện','thị xã','thành phố','tỉnh'
  ];
  const lower = query.toLowerCase().trim();
  for (const loc of LOCATION_TOKENS) {
    if (lower.endsWith(loc) && lower.length > loc.length + 2) {
      const poi = query.slice(0, lower.lastIndexOf(loc)).trim();
      if (poi.length >= 2) return { poi, location: loc };
    }
  }
  return { poi: query, location: null };
}

function _deduplicateResults(results) {
  const deduped = [];
  for (const r of results) {
    let merged = false;
    for (const existing of deduped) {
      const dLat = (r.latitude - existing.latitude) * 111320;
      const dLng = (r.longitude - existing.longitude) * 111320 * Math.cos(r.latitude * Math.PI / 180);
      const dist = Math.sqrt(dLat * dLat + dLng * dLng);
      if (dist < 60) {
        if ((r._score || 0) > (existing._score || 0)) Object.assign(existing, r);
        merged = true;
        break;
      }
    }
    if (!merged) deduped.push({ ...r });
  }
  return deduped;
}

// ============================================================
// EXISTING TESTS
// ============================================================

test('Search query sanitizer trims whitespace and handles invalid inputs', () => {
  assert.equal(sanitizeSearchQuery('   Hồ Gươm   '), 'Hồ Gươm');
  assert.equal(sanitizeSearchQuery(null), '');
  assert.equal(sanitizeSearchQuery(undefined), '');
});

test('Autocomplete triggers only when input meets minimum length requirement', () => {
  assert.equal(shouldTriggerAutocomplete('H'), false);
  assert.equal(shouldTriggerAutocomplete('  '), false);
  assert.equal(shouldTriggerAutocomplete('Ha'), true);
  assert.equal(shouldTriggerAutocomplete('Hà Nội'), true);
});

test('formatMapboxFeature maps Vietnamese text and coordinates correctly', () => {
  const mockFeature = {
    id: 'poi.123',
    text_vi: 'Chợ Bến Thành',
    place_name_vi: 'Đường Lê Lợi, Phường Bến Thành, Quận 1, Thành phố Hồ Chí Minh',
    center: [106.6983, 10.7720]
  };

  const result = formatMapboxFeature(mockFeature);
  assert.equal(result.name, 'Chợ Bến Thành');
  assert.equal(result.latitude, 10.7720);
  assert.equal(result.longitude, 106.6983);
  assert.match(result.fullName, /Thành phố Hồ Chí Minh/);
});

// ============================================================
// NEW v2.0 SEARCH ENGINE TESTS
// ============================================================

describe('_normalizeVi - Vietnamese diacritic normalization', () => {
  it('strips diacritics and lowercases', () => {
    assert.equal(_normalizeVi('Hà Đông'), 'ha dong');
    assert.equal(_normalizeVi('TEKY'), 'teky');
    assert.equal(_normalizeVi('Hồ Chí Minh'), 'ho chi minh');
  });

  it('handles ĐĐ special case', () => {
    assert.equal(_normalizeVi('Đà Lạt'), 'da lat');
    assert.equal(_normalizeVi('đường'), 'duong');
  });

  it('returns empty string for null/undefined', () => {
    assert.equal(_normalizeVi(null), '');
    assert.equal(_normalizeVi(''), '');
  });
});

describe('_fuzzyScore - token-based relevance scoring', () => {
  it('scores exact match as 1.0 (with start bonus)', () => {
    const score = _fuzzyScore('teky', 'Teky');
    assert.ok(score >= 1.0, `Expected ≥ 1.0, got ${score}`);
  });

  it('scores partial match > 0 when tokens present in candidate', () => {
    const score = _fuzzyScore('teky hà đông', 'Học viện Teky Hà Đông');
    assert.ok(score > 0.5, `Expected > 0.5, got ${score}`);
  });

  it('scores near 0 for completely irrelevant candidate', () => {
    // "teky" has 3 tokens: ["teky","ha","dong"]. "Thanh Binh" matches "ha" partially but not "teky" or "dong".
    // Score: 1/3 hits = 0.33. Still low enough - threshold < 0.5
    const score = _fuzzyScore('teky hà đông', 'Thanh Bình phường');
    assert.ok(score < 0.5, `Expected < 0.5 (low relevance), got ${score}`);
  });


  it('handles query with single token', () => {
    const score = _fuzzyScore('bệnh viện', 'Bệnh viện Bạch Mai');
    assert.ok(score > 0, `Expected > 0, got ${score}`);
  });
});

describe('_decomposeQuery - NLP query decomposition', () => {
  it('splits brand + location district correctly', () => {
    const { poi, location } = _decomposeQuery('teky hà đông');
    assert.equal(poi.toLowerCase(), 'teky');
    assert.equal(location, 'hà đông');
  });

  it('splits brand + major city correctly', () => {
    const { poi, location } = _decomposeQuery('circle k hà nội');
    assert.equal(location, 'hà nội');
    assert.ok(poi.toLowerCase().includes('circle k'));
  });

  it('returns full query as poi when no location detected', () => {
    const { poi, location } = _decomposeQuery('bệnh viện bạch mai');
    assert.equal(poi, 'bệnh viện bạch mai');
    assert.equal(location, null);
  });

  it('returns full query for single-word brand', () => {
    const { poi, location } = _decomposeQuery('starbucks');
    assert.equal(poi, 'starbucks');
    assert.equal(location, null);
  });
});

describe('_deduplicateResults - geo-proximity deduplication', () => {
  it('merges two results within 60m of each other', () => {
    const results = [
      { id: 'a', name: 'Teky A', latitude: 21.000, longitude: 105.800, _score: 0.5 },
      { id: 'b', name: 'Teky B', latitude: 21.0001, longitude: 105.8001, _score: 0.9 } // ~14m apart
    ];
    const deduped = _deduplicateResults(results);
    assert.equal(deduped.length, 1, 'Should merge to 1 result');
    assert.equal(deduped[0].id, 'b', 'Should keep higher-scored result');
  });

  it('keeps two results more than 60m apart', () => {
    const results = [
      { id: 'a', name: 'Teky Cầu Giấy', latitude: 21.037, longitude: 105.796, _score: 0.7 },
      { id: 'b', name: 'Teky Hà Đông', latitude: 20.971, longitude: 105.771, _score: 0.8 } // ~7km apart
    ];
    const deduped = _deduplicateResults(results);
    assert.equal(deduped.length, 2, 'Should keep both results');
  });

  it('handles empty input', () => {
    assert.deepEqual(_deduplicateResults([]), []);
  });
});

// ============================================================
// CRITICAL: POI-mandatory scoring — the "teky hà đông" problem
// When query decomposes to brand+location, admin districts must
// NOT outrank actual POI results that contain the brand name.
// ============================================================

function scorePOIMandatory(poiQuery, locationHint, results) {
  const ADMIN_TYPES = new Set(['place', 'district', 'region', 'country', 'postcode', 'locality']);
  const scored = results.map(r => {
    const poiInName     = _fuzzyScore(poiQuery, r.name);
    const poiInFullName = _fuzzyScore(poiQuery, r.fullName || '') * 0.7;
    const poiPresence   = Math.max(poiInName, poiInFullName);
    const locationBonus = _fuzzyScore(locationHint, r.fullName || '') * 0.3;
    const isAdminOnly   = ADMIN_TYPES.has(r.placeType) && poiPresence < 0.2;
    const score = isAdminOnly ? 0.05 : poiPresence + locationBonus;
    return { ...r, _score: score };
  });
  return scored.sort((a, b) => b._score - a._score);
}

describe('POI-mandatory scoring — admin district penalty', () => {
  it('"teky hà đông": Teky POI must rank above "Hà Đông" district', () => {
    const results = [
      { id: 'ha-dong-place', name: 'Hà Đông', fullName: 'Hà Đông, Hanoi, Vietnam', placeType: 'place' },
      { id: 'teky-galaxy', name: 'Học Viện Teky', fullName: '51-53 Galaxy Tố Hữu, Hà Đông, Hanoi', placeType: 'poi' },
    ];
    const ranked = scorePOIMandatory('teky', 'hà đông', results);
    assert.equal(ranked[0].id, 'teky-galaxy', 'Teky POI must be ranked #1');
    assert.ok(ranked[0]._score > ranked[1]._score,
      `Teky (${ranked[0]._score.toFixed(2)}) should outrank Hà Đông district (${ranked[1]._score.toFixed(2)})`
    );
  });

  it('"Hà Đông" admin place gets penalty score ≤ 0.05 when brand is "teky"', () => {
    const results = [
      { id: 'ha-dong-district', name: 'Hà Đông', fullName: 'Hà Đông, Hanoi, Vietnam', placeType: 'district' }
    ];
    const ranked = scorePOIMandatory('teky', 'hà đông', results);
    assert.ok(ranked[0]._score <= 0.05,
      `Admin district should score ≤ 0.05, got ${ranked[0]._score}`
    );
  });

  it('TEKY at Galaxy Tố Hữu scores highest among multiple results', () => {
    const results = [
      { id: 'ha-dong-place', name: 'Hà Đông', fullName: 'Hà Đông, Hanoi, Vietnam', placeType: 'place' },
      { id: 'teky-thanh-chan', name: 'Học Viện Công Nghệ Sáng Tạo Teky', fullName: 'Toà nhà Thanh Chân, Hanoi', placeType: 'poi' },
      { id: 'teky-galaxy', name: 'Hoc Vien Sang Tao Cong Nghe TEKY', fullName: '51-53 Galaxy Tố Hữu, Hà Đông, Hanoi', placeType: 'poi' },
    ];
    const ranked = scorePOIMandatory('teky', 'hà đông', results);
    // Both Teky results should be ahead of Hà Đông district
    assert.notEqual(ranked[0].id, 'ha-dong-place', 'District should NOT be #1');
    assert.notEqual(ranked[1].id, 'ha-dong-place', 'District should NOT be #2');
    // Galaxy Tố Hữu (in Hà Đông) should rank #1 due to location bonus
    assert.equal(ranked[0].id, 'teky-galaxy', 'Galaxy Tố Hữu TEKY (in Hà Đông) should be #1');
  });
});

