import test from 'node:test';
import assert from 'node:assert/strict';

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
