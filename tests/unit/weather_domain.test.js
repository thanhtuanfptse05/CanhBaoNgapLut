import test from 'node:test';
import assert from 'node:assert/strict';

function evaluateFloodRiskFromRain(rainRateMm) {
  if (rainRateMm >= 35) return 'NGUY CƠ NGẬP RẤT CAO';
  if (rainRateMm >= 20) return 'NGUY CƠ NGẬP CỤC BỘ';
  if (rainRateMm > 0) return 'ĐANG CÓ MƯA';
  return 'AN TOÀN';
}

function parseWeatherCode(code, isDay = true) {
  if (code === 0) return { description: isDay ? 'Nắng ráo, quang đãng' : 'Trời quang', iconType: isDay ? 'sun' : 'moon' };
  if ([1, 2].includes(code)) return { description: isDay ? 'Ít mây, có nắng' : 'Mây rải rác', iconType: 'sun-cloud' };
  if (code === 3) return { description: 'Trời u ám nhiều mây', iconType: 'cloud' };
  if ([61, 63].includes(code)) return { description: 'Mưa rào vừa', iconType: 'rain' };
  if (code === 65 || [80, 81, 82].includes(code)) return { description: 'Mưa to xối xả', iconType: 'rain-heavy' };
  if ([95, 96, 99].includes(code)) return { description: 'Dông sét, mưa rất to', iconType: 'thunder' };
  return { description: 'Thời tiết bình thường', iconType: 'cloud' };
}

test('evaluateFloodRiskFromRain categorizes flood hazard levels correctly', () => {
  assert.equal(evaluateFloodRiskFromRain(0), 'AN TOÀN');
  assert.equal(evaluateFloodRiskFromRain(5), 'ĐANG CÓ MƯA');
  assert.equal(evaluateFloodRiskFromRain(25), 'NGUY CƠ NGẬP CỤC BỘ');
  assert.equal(evaluateFloodRiskFromRain(42), 'NGUY CƠ NGẬP RẤT CAO');
});

test('parseWeatherCode maps WMO meteorological codes to Vietnamese descriptions', () => {
  const sunny = parseWeatherCode(0, true);
  assert.equal(sunny.iconType, 'sun');
  assert.match(sunny.description, /Nắng ráo/);

  const thunder = parseWeatherCode(95, false);
  assert.equal(thunder.iconType, 'thunder');
  assert.match(thunder.description, /Dông sét/);

  const heavyRain = parseWeatherCode(65, true);
  assert.equal(heavyRain.iconType, 'rain-heavy');
});
