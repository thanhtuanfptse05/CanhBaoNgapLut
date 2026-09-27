# Implementation Plan: Tìm Đường Tránh Ngập (feat-flood-route-planner)

- **Feature**: flood-route-planner
- **Status**: Ready to Implement
- **Spec**: [SPEC.md](./SPEC.md)
- **Date**: 2026-09-27

---

## Architecture Decision

Sử dụng **Mapbox Directions API** để lấy tuyến đường (JSON tuyến + waypoints).
Phân tích ngập bằng thuật toán **Point-to-Polyline Haversine Distance** chạy hoàn toàn client-side với `floodPoints` đã có trong memory — không cần API bên ngoài thêm.

```
User Input
  ↓
[RouteSearchPanel] — UI panel nhập A→B
  ↓
[FloodRouteService] — gọi Mapbox Directions API
  ↓
[FloodRouteAnalyzer] — phân tích ngập trên tuyến (client-side)
  ↓
[RouteRenderer] — vẽ tuyến + marker cảnh báo lên Leaflet map
  ↓
[RouteSummaryPanel] — hiển thị bảng thống kê + xếp hạng
```

---

## Component Design

### A. `FloodRouteService` (trong `supabase-service.js`)
- `getRoutes(originCoords, destCoords, profile)` → gọi Mapbox Directions API, trả về mảng tối đa 3 routes.
- Profile: `driving` | `cycling` | `walking`.
- Trả về: `[{ geometry: GeoJSON LineString, distance_m, duration_s, legs }]`.

### B. `FloodRouteAnalyzer` (logic thuần trong `app.js`)
- `analyzeFloodOnRoute(routeGeometry, floodPoints, bufferMeters = 150)` → với mỗi flood point, tính khoảng cách nhỏ nhất từ point đến polyline; nếu < 150m → coi là "trên tuyến".
- `scoreRoute(floodPointsOnRoute)` → tính SafetyScore theo formula trong SPEC.
- `rankRoutes(analyzedRoutes)` → sắp xếp routes theo SafetyScore giảm dần.

### C. UI Components (trong `index.html` + `style.css`)
- **`#btn-route-planner`**: Button trên toolbar.
- **`#panel-route`**: Slide-in panel trái với 2 ô search + nút đổi chiều + transport mode selector + nút Tìm đường.
- **`#route-summary`**: Card kết quả ở dưới panel hoặc trong panel, liệt kê các tuyến với badge an toàn.

---

## Data Flow

```
originCoords + destCoords
  → Mapbox Directions API
  → routes[]: { geometry, distance_m, duration_s }
  → forEach route:
      → analyzeFloodOnRoute(geometry, this.floodPoints)
      → { floodPointsOnRoute: [], safetyScore, safetyLabel }
  → rankRoutes(routes)
  → Render best route (green) + alternatives (blue, gray)
  → Render ⚠️ markers at flood points on route
  → Render summary table
```

---

## Files to Modify / Create

| File | Action | Changes |
|------|---------|---------|
| `src/interface/ui/js/supabase-service.js` | Modify | Add `getRoutes()` method |
| `src/interface/ui/js/app.js` | Modify | Add `FloodRouteAnalyzer` + `RouteRenderer` methods + event listeners |
| `index.html` | Modify | Add `#btn-route-planner`, `#panel-route`, `#route-summary` HTML |
| `style.css` | Modify | Add styles for route panel, route polylines, safety badges |
| `tests/unit/route.test.js` | Create | Unit tests for `analyzeFloodOnRoute` + `scoreRoute` + `rankRoutes` |

---

## Mapbox Directions API Endpoint

```
GET https://api.mapbox.com/directions/v5/mapbox/{profile}/{coordinates}
  ?alternatives=true
  &geometries=geojson
  &overview=full
  &language=vi
  &access_token={token}
```

- `{profile}`: `driving` | `cycling` | `walking`
- `{coordinates}`: `{originLng},{originLat};{destLng},{destLat}`
- Response: `routes[].geometry.coordinates` = array of `[lng, lat]` points

---

## SafetyScore Algorithm

```javascript
function scoreRoute(floodPointsOnRoute) {
  const count = floodPointsOnRoute.length;
  const totalDepth = floodPointsOnRoute.reduce((s, p) => s + p.current_depth_cm, 0);
  const level3Count = floodPointsOnRoute.filter(p => p.severity === 'LEVEL_3').length;
  const score = Math.max(0, 100 - count * 20 - totalDepth / 10 - level3Count * 15);
  const label = score >= 80 ? 'AN TOÀN' : score >= 50 ? 'THẬN TRỌNG' : 'NGUY HIỂM';
  return { score: Math.round(score), label };
}
```

---

## Point-to-Polyline Distance Algorithm

Để tính khoảng cách từ một flood point đến một polyline (tuyến đường):
1. Duyệt qua từng đoạn thẳng (segment) của polyline.
2. Tính khoảng cách từ điểm đến segment đó (sử dụng projection formula).
3. Lấy min của tất cả khoảng cách segment.
4. Nếu min < bufferMeters (150m) → flood point thuộc tuyến đường.

Dùng Haversine để tính khoảng cách lat/lng → meters chính xác.
