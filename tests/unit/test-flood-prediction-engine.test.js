import { test } from 'node:test';
import assert from 'node:assert/strict';
import { HydroTopographicModel } from '../../src/domain/services/HydroTopographicModel.js';
import { Province } from '../../src/domain/entities/Province.js';
import { FloodHotspotRepository } from '../../src/infra/repositories/FloodHotspotRepository.js';
import { PredictFloodRiskUseCase } from '../../src/usecase/PredictFloodRiskUseCase.js';
import geographyData from '../../src/infra/data/vietnam_geography.json' with { type: 'json' };

test('Phase 1 - Vietnam Geography coverage: 63 provinces & key entities', () => {
  assert.equal(geographyData.length, 63, 'Vietnam geography must contain all 63 provinces/cities');
  
  const hanoi = geographyData.find(p => p.code === '01');
  assert.ok(hanoi, 'Hanoi must exist');
  assert.equal(hanoi.name, 'Hà Nội');
  assert.ok(hanoi.districts.includes('Hoài Đức'), 'Hanoi districts must include Hoài Đức');

  const provinceEntity = new Province({
    code: hanoi.code,
    name: hanoi.name,
    region: hanoi.region,
    centerLat: hanoi.lat,
    centerLng: hanoi.lng,
    districts: hanoi.districts.map(name => ({ name }))
  });

  assert.equal(provinceEntity.code, '01');
  assert.equal(provinceEntity.hasDistrict('Hoài Đức'), true);
  assert.equal(provinceEntity.hasDistrict('Không Tồn Tại'), false);
});

test('Phase 2 - Hotspot Repository queries and spatial lookups', () => {
  const repo = new FloodHotspotRepository();
  const allHotspots = repo.getAll();
  assert.ok(allHotspots.length >= 10, 'Hotspots repository must have at least 10 key national hotspots');

  // Verify Underpass No. 19 is present
  const underpass19 = repo.getById('fp-hn-thanglong-19');
  assert.ok(underpass19, 'Underpass 19 must exist in database');
  assert.equal(underpass19.district, 'Hoài Đức');
  assert.equal(underpass19.is_pump_dependent, true);
  assert.equal(underpass19.topography_type, 'UNDERPASS');

  // Spatial search around An Khanh / Hoai Duc (20.9942, 105.7185)
  const nearby = repo.findNearby(20.9942, 105.7185, 10);
  assert.ok(nearby.length > 0, 'Should find hotspots nearby Hoai Duc');
  assert.equal(nearby[0].id, 'fp-hn-thanglong-19', 'Closest hotspot should be Underpass 19');
});

test('Phase 3 - THE UNDERPASS 19 TEST: Rain stops after 1 week storm, underpass MUST remain flooded', () => {
  const repo = new FloodHotspotRepository();
  const underpass19 = repo.getById('fp-hn-thanglong-19');

  // Scenario: Sun is shining (rainRate = 0), but past 48h was catastrophic (160mm rain)
  const weatherPostStorm = {
    rainRate: 0,
    weatherCode: 1, // Mainly clear
    accumulated: {
      h1: 0,
      h3: 0,
      h6: 0,
      h12: 15,
      h24: 75,
      h48: 160,
      h72: 240
    },
    soil: {
      moisture: 0.44, // Fully saturated
      level: 'SATURATED'
    },
    forecast: {
      next3hMaxRain: 0,
      hourly: []
    }
  };

  const prediction = HydroTopographicModel.predict(underpass19, weatherPostStorm);

  // Assertions solving the real-world bug:
  assert.ok(prediction.predictedDepthCm >= 70, `Depth must remain high after rain stops, got ${prediction.predictedDepthCm}cm`);
  assert.ok(['CRITICAL_FLOOD', 'SEVERE_FLOOD'].includes(prediction.severity), `Severity must be critical/severe, got ${prediction.severity}`);
  assert.equal(prediction.status, 'STAGNANT_PONDING');
  assert.ok(prediction.estimatedRecessionHours >= 24, `Recession time must be at least 24h for pump drainage, got ${prediction.estimatedRecessionHours}h`);
  assert.match(prediction.recommendation, /quay đầu/i, 'Recommendation must advise turning back');
  assert.match(prediction.reason, /trạm bơm/i, 'Reason must state dependency on pumping stations');
});

test('Phase 3 - Gravity drained intersection clears naturally when rain stops', () => {
  const repo = new FloodHotspotRepository();
  const thaiHaIntersection = repo.getById('fp-hn-thaiha');

  const dryWeather = {
    rainRate: 0,
    weatherCode: 0,
    accumulated: { h1: 0, h3: 0, h6: 0, h12: 5, h24: 15, h48: 20, h72: 20 },
    soil: { moisture: 0.22, level: 'MEDIUM' },
    forecast: { next3hMaxRain: 0, hourly: [] }
  };

  const prediction = HydroTopographicModel.predict(thaiHaIntersection, dryWeather);
  assert.equal(prediction.predictedDepthCm, 0);
  assert.equal(prediction.severity, 'SAFE');
  assert.equal(prediction.status, 'CLEARED');
  assert.equal(prediction.estimatedRecessionHours, 0);
});

test('Phase 3 - Active torrential downpour triggers rising critical flood', () => {
  const repo = new FloodHotspotRepository();
  const underpass19 = repo.getById('fp-hn-thanglong-19');

  const heavyRainWeather = {
    rainRate: 65, // 65mm/h torrential rain
    weatherCode: 95,
    accumulated: { h1: 65, h3: 90, h6: 110, h24: 130, h48: 150, h72: 150 },
    soil: { moisture: 0.45, level: 'SATURATED' },
    forecast: { next3hMaxRain: 50, hourly: [] }
  };

  const prediction = HydroTopographicModel.predict(underpass19, heavyRainWeather);
  assert.ok(prediction.predictedDepthCm >= 80, 'Depth should be extreme during active downpour');
  assert.equal(prediction.severity, 'CRITICAL_FLOOD');
  assert.equal(prediction.status, 'RISING');
});

test('Phase 3 - Early Warning Forecast: warns users before storm hits', () => {
  const repo = new FloodHotspotRepository();
  const underpass19 = repo.getById('fp-hn-thanglong-19');

  // Currently dry, but a massive storm cell is arriving in 1h
  const incomingStormWeather = {
    rainRate: 0,
    weatherCode: 3,
    accumulated: { h1: 0, h3: 0, h6: 0, h24: 0, h48: 0, h72: 0 },
    soil: { moisture: 0.25, level: 'MEDIUM' },
    forecast: { next3hMaxRain: 50.0, hourly: [] } // Forecast 50mm/h incoming
  };

  const prediction = HydroTopographicModel.predict(underpass19, incomingStormWeather);
  assert.equal(prediction.isEarlyWarning, true);
  assert.equal(prediction.severity, 'WARNING_SOON');
  assert.match(prediction.forecastWarningMsg, /CẢNH BÁO SỚM/);
});

test('Phase 3 - PredictFloodRiskUseCase coordinates mock telemetry and hotspot resolution', async () => {
  const repo = new FloodHotspotRepository();
  const mockWeatherService = {
    getDetailedWeather: async (lat, lng) => ({
      coordinates: { lat, lng },
      rainRate: 0,
      accumulated: { h1: 0, h3: 0, h6: 0, h12: 0, h24: 0, h48: 150, h72: 200 },
      soil: { moisture: 0.40, level: 'HIGH' },
      forecast: { next3hMaxRain: 0, hourly: [] },
      isLive: true
    })
  };

  const usecase = new PredictFloodRiskUseCase({
    hotspotRepository: repo,
    weatherService: mockWeatherService
  });

  const result = await usecase.executeForHotspot('fp-hn-thanglong-19');
  assert.ok(result.prediction);
  assert.equal(result.prediction.hotspotId, 'fp-hn-thanglong-19');
  assert.ok(result.prediction.predictedDepthCm >= 70);

  const searchResult = await usecase.executeForSearchedLocation(20.9942, 105.7185, 10);
  assert.ok(searchResult.hotspots.length > 0);
  assert.ok(['CRITICAL_FLOOD', 'SEVERE_FLOOD'].includes(searchResult.areaRisk));
});
