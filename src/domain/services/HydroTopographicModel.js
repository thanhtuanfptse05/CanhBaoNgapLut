/**
 * Domain Service: HydroTopographicModel (HTPM)
 * Pure mathematical model for urban flood prediction.
 * Combines real-time rainfall, soil moisture, accumulated precipitation,
 * and topographic drainage characteristics.
 * 
 * Specifically addresses the Underpass Retention Problem (e.g., Hầm chui 19).
 */

export class HydroTopographicModel {
  /**
   * Calculate dynamic runoff coefficient based on soil moisture and antecedent rain
   * @param {number} soilMoisture Soil moisture content (0.0 - 0.6 m3/m3)
   * @param {number} accumRain48h Accumulated rainfall in past 48 hours (mm)
   * @returns {number} Runoff coefficient (0.35 - 0.95)
   */
  static calculateRunoffCoefficient(soilMoisture = 0.28, accumRain48h = 0) {
    const moisture = Math.max(0.1, Math.min(0.6, Number(soilMoisture) || 0.28));
    const rain48 = Math.max(0, Number(accumRain48h) || 0);

    // Baseline runoff on impervious urban/suburban ground is ~0.45
    let runoff = 0.45;

    // Additional runoff as soil moisture approaches saturation (> 0.35 m3/m3)
    if (moisture >= 0.40) {
      runoff += 0.30;
    } else if (moisture >= 0.32) {
      runoff += 0.18;
    }

    // Antecedent precipitation saturation factor (past 48h heavy rain saturation)
    const antecedentBonus = Math.min(0.20, (rain48 / 150) * 0.20);
    runoff += antecedentBonus;

    return Math.min(0.95, Number(runoff.toFixed(2)));
  }

  /**
   * Predict flood risk, water depth, and clearance time for a specific hotspot
   * @param {Object} hotspot Target flood hotspot attributes
   * @param {Object} weather Meteorological telemetry
   * @returns {Object} Flood prediction result
   */
  static predict(hotspot, weather) {
    const rainCurrent = Number(weather?.rainRate || 0);
    const accum1h = Number(weather?.accumulated?.h1 || 0);
    const accum3h = Number(weather?.accumulated?.h3 || 0);
    const accum24h = Number(weather?.accumulated?.h24 || 0);
    const accum48h = Number(weather?.accumulated?.h48 || 0);
    const soilMoisture = Number(weather?.soil?.moisture || 0.28);
    const forecastMaxNext3h = Number(weather?.forecast?.next3hMaxRain || 0);

    const thresh1h = Number(hotspot?.threshold_rain_1h || 30);
    const threshAccum = Number(hotspot?.threshold_rain_accum || 70);
    const drainCap = Number(hotspot?.drainage_capacity_mm_per_h || 12);
    const isPumpDep = Boolean(hotspot?.is_pump_dependent);
    const funnel = Number(hotspot?.funnel_factor || 1.8);
    const baseLagHours = Number(hotspot?.recession_lag_hours || 3);
    const maxHistDepth = Number(hotspot?.historical_max_depth_cm || 100);

    // 1. Calculate dynamic runoff coefficient
    const runoffCoeff = this.calculateRunoffCoefficient(soilMoisture, accum48h);

    let depthCm = 0;
    let severity = 'SAFE';
    let status = 'CLEARED';
    let estimatedRecessionHours = 0;
    let reason = '';
    let recommendation = 'Đường khô thoáng, phương tiện lưu thông bình thường.';

    // 2. Active Rain Influx Calculation
    const effectiveInflowRate = rainCurrent * runoffCoeff * funnel;
    const netInflow = effectiveInflowRate - drainCap;

    if (rainCurrent > 0) {
      // SCENARIO 1: Currently raining
      if (rainCurrent >= thresh1h || accum3h >= threshAccum * 0.7 || netInflow > 0) {
        // Water is rising or ponding
        const influxDepth = Math.max(10, Math.round(netInflow * 1.3));
        const accumFactor = Math.min(60, Math.round(accum24h * 0.25));
        depthCm = Math.min(maxHistDepth, influxDepth + accumFactor);
        status = 'RISING';
        reason = `Mưa lớn dồn dập (${rainCurrent} mm/h) vượt công suất tiêu thoát (${drainCap} mm/h).`;
      } else if (rainCurrent >= 8) {
        // Light-moderate rain causing minor surface water
        depthCm = Math.min(20, Math.round(rainCurrent * 0.8));
        status = 'PONDING';
        reason = `Đang có mưa vừa (${rainCurrent} mm/h) - Nước đọng mặt đường.`;
      } else {
        depthCm = 0;
        status = 'CLEARED';
        reason = `Mưa nhỏ (${rainCurrent} mm/h) - Cống thoát nước đáp ứng tốt.`;
      }
    } else {
      // SCENARIO 2: Rain has stopped (rainCurrent === 0)
      // Check for Antecedent Inundation / Underpass Depression Problem
      if (isPumpDep && accum48h >= threshAccum) {
        // CRITICAL CASE: Underpass or closed depression with no gravity outlet
        // Water lingers for days until high-capacity pumps clear it
        const retentionRatio = Math.min(1.0, accum48h / 120);
        depthCm = Math.min(maxHistDepth, Math.round(40 + retentionRatio * 70));
        status = 'STAGNANT_PONDING';
        estimatedRecessionHours = Math.max(baseLagHours, Math.round(depthCm / 2.2));
        reason = `Nước ứ đọng nghiêm trọng sau đợt mưa lớn (${accum48h} mm / 48h). Địa hình lòng phễu không tự thoát, phụ thuộc trạm bơm.`;
        recommendation = `CẢNH BÁO: Hầm chui ngập sâu ~${depthCm}cm! Tuyệt đối không cố đi vào, quay đầu đi đường cầu vượt.`;
      } else if (!isPumpDep && accum3h >= threshAccum) {
        // Gravity drained street shortly after heavy rain
        depthCm = Math.min(25, Math.round(accum3h * 0.2));
        status = 'RECEDING';
        estimatedRecessionHours = Math.min(baseLagHours, 2);
        reason = `Nước đang rút sau mưa to (${accum3h} mm / 3h). Cống thoát tự nhiên đang hoạt động.`;
        recommendation = `Đang rút nước. Xe máy chú ý giảm tốc độ tránh rãnh nước.`;
      } else {
        // Completely dry and clear
        depthCm = 0;
        status = 'CLEARED';
        reason = 'Thời tiết khô ráo, mặt đường thông thoáng và an toàn.';
      }
    }

    // 3. Early Warning Forecast Assessment (Predictive Alert)
    let isEarlyWarning = false;
    let forecastWarningMsg = null;
    if (depthCm < 30 && forecastMaxNext3h >= thresh1h) {
      isEarlyWarning = true;
      forecastWarningMsg = `CẢNH BÁO SỚM: Dự báo mưa rất to (${forecastMaxNext3h} mm/h) trong 1-3h tới. Nguy cơ ngập sâu nhanh chóng!`;
      if (depthCm === 0) {
        severity = 'WARNING_SOON';
        recommendation = `Chủ động điều chỉnh lộ trình hoặc hoàn tất di chuyển trước khi cơn dông đổ bộ.`;
      }
    }

    // 4. Determine Severity Category
    if (severity !== 'WARNING_SOON') {
      if (depthCm >= 60) severity = 'CRITICAL_FLOOD';
      else if (depthCm >= 35) severity = 'SEVERE_FLOOD';
      else if (depthCm >= 15) severity = 'MODERATE_FLOOD';
      else if (depthCm > 0) severity = 'MINOR_WATERLOG';
      else severity = 'SAFE';
    }

    // 5. Estimated recession calculation if not set
    if (estimatedRecessionHours === 0 && depthCm > 0) {
      if (isPumpDep) {
        estimatedRecessionHours = Math.max(12, Math.round(depthCm / 2.5));
      } else {
        estimatedRecessionHours = Math.max(1, Math.round(depthCm / 15));
      }
    }

    if (depthCm >= 35 && !recommendation.includes('CẢNH BÁO')) {
      recommendation = `Nguy hiểm: Mực nước ngập ${depthCm}cm làm chết máy ô tô con và xe máy. Vui lòng chọn lộ trình khác.`;
    }

    return {
      hotspotId: hotspot.id,
      hotspotName: hotspot.name,
      coordinates: { lat: hotspot.latitude, lng: hotspot.longitude },
      predictedDepthCm: depthCm,
      severity,
      status,
      runoffCoefficient: runoffCoeff,
      estimatedRecessionHours,
      reason,
      recommendation,
      isEarlyWarning,
      forecastWarningMsg,
      telemetrySnapshot: {
        rainRate: rainCurrent,
        accum24h,
        accum48h,
        soilMoisture,
        forecastMaxNext3h
      },
      calculatedAt: new Date().toISOString()
    };
  }
}
