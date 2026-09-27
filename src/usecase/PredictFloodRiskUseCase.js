/**
 * UseCase: PredictFloodRiskUseCase
 * Coordinates fetching weather telemetry, querying flood hotspots,
 * and running the Hydro-Topographic Prediction Model.
 */

import { HydroTopographicModel } from '../domain/services/HydroTopographicModel.js';

export class PredictFloodRiskUseCase {
  constructor({ hotspotRepository, weatherService }) {
    if (!hotspotRepository || !weatherService) {
      throw new Error('hotspotRepository and weatherService are mandatory');
    }
    this.hotspotRepo = hotspotRepository;
    this.weatherService = weatherService;
  }

  /**
   * Execute prediction for a single hotspot
   */
  async executeForHotspot(hotspotId) {
    const hotspot = this.hotspotRepo.getById(hotspotId);
    if (!hotspot) {
      throw new Error(`Hotspot not found: ${hotspotId}`);
    }

    const weather = await this.weatherService.getDetailedWeather(
      hotspot.latitude,
      hotspot.longitude
    );

    const prediction = HydroTopographicModel.predict(hotspot, weather);
    return {
      hotspot,
      weather,
      prediction
    };
  }

  /**
   * Execute predictions for all hotspots in a province
   */
  async executeForProvince(provinceCode) {
    const hotspots = this.hotspotRepo.getByProvince(provinceCode);
    if (hotspots.length === 0) return [];

    // Group weather requests by approximate coordinates to leverage caching
    const predictions = await Promise.all(
      hotspots.map(async (spot) => {
        try {
          const weather = await this.weatherService.getDetailedWeather(
            spot.latitude,
            spot.longitude
          );
          const prediction = HydroTopographicModel.predict(spot, weather);
          return {
            ...spot,
            prediction,
            currentDepthCm: prediction.predictedDepthCm,
            severity: prediction.severity,
            status: prediction.status,
            recessionHours: prediction.estimatedRecessionHours
          };
        } catch (err) {
          return {
            ...spot,
            prediction: null,
            currentDepthCm: 0,
            severity: 'SAFE',
            status: 'CLEARED'
          };
        }
      })
    );

    return predictions;
  }

  /**
   * Execute prediction for an arbitrary searched location (lat, lng)
   * Fetches weather for that location, finds nearby hotspots within radius,
   * and evaluates flood risk.
   */
  async executeForSearchedLocation(lat, lng, radiusKm = 15) {
    const weather = await this.weatherService.getDetailedWeather(lat, lng);
    const nearbyHotspots = this.hotspotRepo.findNearby(lat, lng, radiusKm);

    const evaluatedSpots = nearbyHotspots.map(spot => {
      const pred = HydroTopographicModel.predict(spot, weather);
      return {
        ...spot,
        prediction: pred,
        currentDepthCm: pred.predictedDepthCm,
        severity: pred.severity,
        status: pred.status,
        recessionHours: pred.estimatedRecessionHours
      };
    });

    // Find highest risk in area
    let areaRisk = 'SAFE';
    if (evaluatedSpots.some(s => s.severity === 'CRITICAL_FLOOD')) {
      areaRisk = 'CRITICAL_FLOOD';
    } else if (evaluatedSpots.some(s => s.severity === 'SEVERE_FLOOD')) {
      areaRisk = 'SEVERE_FLOOD';
    } else if (evaluatedSpots.some(s => s.severity === 'MODERATE_FLOOD')) {
      areaRisk = 'MODERATE_FLOOD';
    } else if (evaluatedSpots.some(s => s.severity === 'WARNING_SOON')) {
      areaRisk = 'WARNING_SOON';
    }

    return {
      coordinates: { lat: Number(lat), lng: Number(lng) },
      weather,
      areaRisk,
      nearbyHotspotsCount: nearbyHotspots.length,
      hotspots: evaluatedSpots
    };
  }
}
