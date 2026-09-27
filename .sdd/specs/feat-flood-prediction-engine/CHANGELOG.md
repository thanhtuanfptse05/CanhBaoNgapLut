# Changelog: feat-flood-prediction-engine

## [1.0.0] - 2026-09-27
### Added
- Created initial specification for `feat-flood-prediction-engine` with EARS notation and acceptance scenarios.
- Detailed requirements for 63 provinces & key districts coverage in `vietnam_geography.json` and `src/domain/entities/Province.js`.
- Implemented `OpenMeteoWeatherService.js` supporting multi-factor weather telemetry (cumulative rainfall 1h-72h, soil moisture saturation level, 24h forecast).
- Structured schema and created `national_flood_hotspots.json` containing topographic parameters, pump dependency, drainage capacity, and recession lag.
- Implemented `FloodHotspotRepository.js` supporting spatial haversine radius search and district/province queries.
- Implemented `HydroTopographicModel.js` (HTPM pure mathematical engine) solving the underpass retention problem (keeping depth high and recession lag > 24h even when rain stops at underpass No. 19).
- Implemented `PredictFloodRiskUseCase.js` orchestrating telemetry and hotspot analysis.
- Implemented comprehensive unit test suite in `tests/unit/test-flood-prediction-engine.test.js` (48/48 tests passing).
- Upgraded `supabase-service.js` with 63 provinces baseline, national hotspots network, and HTPM calculation.
- Enhanced `app.js` marker popups and search results with recession hours (~h), 48h accumulated rain, and stagnant ponding badges.
