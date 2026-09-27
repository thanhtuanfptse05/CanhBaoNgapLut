# Implementation Plan: National Flood Prediction Engine (feat-flood-prediction-engine)

## 1. Kiến Trúc Hệ Thống (Clean Architecture Mapping)

Tuân thủ nghiêm ngặt **Layer 1: Hard Rules** trong [constitution.md](file:///d:/wd%20c%20sang%20d/Documents/WEB%20c%E1%BA%A3nh%20b%C3%A1o%20ng%E1%BA%ADp%20l%E1%BB%A5t/.sdd/constitution.md):
- **Core Domain & Math Models**: Không phụ thuộc vào bất kỳ framework hoặc UI bên ngoài nào. Có thể chạy độc lập trên Node.js hoặc Browser.
- **Tách biệt 4 tầng**:
  1. `Domain Layer`:
     - Entities: `Province.js`, `District.js`, `FloodHotspot.js`, `WeatherTelemetry.js`, `PredictionResult.js`.
     - Value Objects / Formulas: `HydroTopographicModel.js` (Chứa các hàm toán học thuần túy: Runoff, Soil Moisture Index, Ponding Depth, Recession Lag).
  2. `Usecase Layer`:
     - `PredictFloodRiskUseCase.js`: Điều phối nạp dữ liệu khí tượng + điểm ngập và tính toán kết quả dự đoán.
     - `AnalyzeLocalWeatherUseCase.js`: Phân tích lượng mưa tức thời, tích lũy 72h, dự báo mưa 24h và độ ẩm đất theo tọa độ.
     - `GetNationalHotspotsUseCase.js`: Lọc và truy vấn điểm đen ngập theo tỉnh/huyện/bán kính.
  3. `Infra Layer`:
     - `OpenMeteoWeatherService.js`: Gọi API Open-Meteo High Resolution / Soil Moisture / Forecast (có bộ nhớ đệm Cache 3 phút).
     - `NationalGeographyProvider.js`: Cung cấp danh mục 63 tỉnh/thành phố và các quận/huyện chuẩn GIS Việt Nam.
     - `NationalFloodHotspotsRepository.js`: Cung cấp cơ sở tri thức điểm đen ngập toàn quốc với các thông số trắc địa.
  4. `Interface / UI Layer`:
     - Cập nhật `supabase-service.js` để kết nối vào `PredictFloodRiskUseCase`.
     - Cập nhật `app.js` và `index.html`:
       - Hỗ trợ dropdown/search 63 tỉnh thành phố.
       - Modal/Panel phân tích thời tiết chi tiết khi click điểm hoặc tìm kiếm.
       - Hiển thị badge dự đoán ngập (Độ sâu ước tính, thời gian dự kiến nước rút, nguy cơ sắp tới).

---

## 2. Thiết Kế Thuật Toán Dự Đoán HTPM (Hydro-Topographic Prediction Model)

### 2.1 Các biến đầu vào (Inputs)
1. **Khí tượng (Weather Telemetry)**:
   - $R_{\text{current}}$: Lượng mưa tức thời (mm/h).
   - $R_{\text{accum\_1h}}, R_{\text{accum\_3h}}, R_{\text{accum\_24h}}, R_{\text{accum\_48h}}$: Mưa tích lũy (mm).
   - $S_{\text{soil}}$: Độ ẩm bão hòa đất ($0.0 \rightarrow 1.0$).
   - $R_{\text{forecast\_1h}}, R_{\text{forecast\_2h}}$: Dự báo mưa trong 1-2h tới (mm/h).
2. **Trắc địa & Điểm ngập (Hotspot Attributes)**:
   - $T_{\text{type}}$: Loại địa hình (`UNDERPASS`, `DEPRESSION`, `INTERSECTION`, `TIDAL`).
   - $C_{\text{drain}}$: Năng lực tiêu thoát nước cơ sở (mm/h) (ví dụ: cống nội đô tốt: 25mm/h, hầm chui trũng không bơm: 3mm/h).
   - $P_{\text{pump}}$: Cờ phụ thuộc máy bơm cưỡng bức (Boolean).
   - $F_{\text{funnel}}$: Hệ số tích tụ hình phễu trũng ($1.0 \rightarrow 3.5$).

### 2.2 Công thức toán học (Formulas)

#### Bước 1: Tính Hệ số dòng chảy bề mặt động (Dynamic Runoff Coefficient - $C_{\text{runoff}}$)
Khi đất khô ráo và mưa ít, đất thẩm thấu tốt. Khi mưa tích lũy 48h lớn hoặc độ ẩm đất cao, đất bão hòa (Runoff bùng nổ):
$$C_{\text{runoff}} = \min(0.95, 0.40 + 0.35 \times S_{\text{soil}} + 0.20 \times \min(1.0, \frac{R_{\text{accum\_24h}}}{100}))$$

#### Bước 2: Lượng nước đọng tích tụ hữu hiệu (Effective Ponding Volume - $V_{\text{eff}}$)
$$V_{\text{eff}} = (R_{\text{current}} \times C_{\text{runoff}} + R_{\text{accum\_6h}} \times 0.25) \times F_{\text{funnel}} - C_{\text{drain}}$$
Nếu $V_{\text{eff}} < 0$, nước đang tiêu thoát dần.

#### Bước 3: Độ sâu ngập dự đoán ($D_{\text{cm}}$)
Đối với hầm chui (`UNDERPASS`) hoặc điểm trũng sâu (`DEPRESSION`):
- Nếu đang mưa to: $D_{\text{cm}} = \min(150, \text{round}(V_{\text{eff}} \times 1.2))$
- Nếu tạnh mưa ($R_{\text{current}} = 0$) nhưng có mưa tích lũy bão lũ lớn ($R_{\text{accum\_48h}} \ge 100\text{mm}$) và $P_{\text{pump}} = \text{true}$ (như Hầm chui 19):
  $$D_{\text{cm}} = \min(180, \text{round}(\frac{R_{\text{accum\_48h}}}{2.2}))$$
  *(Nước duy trì ở mức sâu do trũng không thể tự thoát)*.

#### Bước 4: Dự báo thời gian nước rút (Estimated Recession Hours - $T_{\text{recede}}$)
- Với điểm thoát tự nhiên: $T_{\text{recede}} = \frac{D_{\text{cm}}}{15\text{ cm/h}}$ (Khoảng 1 - 4 giờ).
- Với hầm chui phụ thuộc trạm bơm ($P_{\text{pump}} = \text{true}$): $T_{\text{recede}} = \max(24, \text{round}(\frac{D_{\text{cm}}}{2.5\text{ cm/h}}))$ (Từ 24 đến 72 giờ tùy độ sâu).

#### Bước 5: Cảnh báo sớm tương lai (Early Warning)
Nếu $R_{\text{forecast\_1h}} \ge 35\text{ mm/h}$ và điểm có địa hình nhạy cảm $\rightarrow$ Gán trạng thái `WARNING_SOON` ("Dự báo ngập sâu trong 45 - 60 phút tới").

---

## 3. Các Giai Đoạn Triển Khai (Phased Rollout)

### Phase 1: National Geography & Weather Telemetry Engine
- Xây dựng dữ liệu chuẩn 63 tỉnh/thành phố và các quận/huyện trọng điểm (`src/domain/entities/Province.js`, `src/infra/data/provinces_vietnam.json`).
- Xây dựng `OpenMeteoWeatherService.js` hỗ trợ bóc tách mưa tức thời, mưa tích lũy 72h, độ bão hòa đất và chuỗi dự báo 24h.

### Phase 2: National Flood Hotspots Knowledge Base
- Xây dựng kho dữ liệu các điểm ngập lịch sử theo huyện/tỉnh (`src/infra/data/flood_hotspots_vietnam.json`):
  - Hà Nội: Hầm chui 19, Hầm chui 3, 5, 6, Nam Từ Liêm, Hoài Đức, Đống Đa, Cầu Giấy, Hà Đông...
  - TP.HCM: Thủ Đức, Quận 7, Quận 8, Bình Thạnh, Bình Chánh, Nhà Bè...
  - Đà Nẵng, Cần Thơ, Hải Phòng, Quảng Ninh, Thừa Thiên Huế, Nghệ An, Quảng Nam...
  - Đầy đủ thông số $T_{\text{type}}, C_{\text{drain}}, P_{\text{pump}}, F_{\text{funnel}}$.

### Phase 3: HTPM Prediction Algorithm & Usecases
- Triển khai `HydroTopographicModel.js` chứa các công thức toán học.
- Triển khai `PredictFloodRiskUseCase.js`.
- Viết Unit Tests toàn diện (`tests/unit/test-flood-prediction-engine.js`).

### Phase 4: UI Presentation & Interactive Telemetry Modal
- Cập nhật giao diện bản đồ, thanh tìm kiếm thông minh 63 tỉnh/huyện.
- Widget phân tích thời tiết chi tiết khi click vào một điểm ngập hoặc khu vực.
- Tự động hiển thị huy hiệu dự báo: "Đang ngập 65cm - Rút sau ~36h (Hầm trũng chờ bơm)".

### Phase 5: Verification & Zero-Drift Policy
- Chạy test suite `npm test`.
- Xác minh không dùng trình duyệt tự động.
- Cập nhật CHANGELOG.md và chuẩn bị commit.
