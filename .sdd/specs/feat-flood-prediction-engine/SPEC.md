# Feature Specification: National Flood Prediction Engine (feat-flood-prediction-engine)

**Feature Branch**: `feat-flood-prediction-engine`  
**Created**: 2026-09-27  
**Status**: Approved  
**Priority**: P0 (Core Intelligence Engine)  
**Input**: Phủ sóng 63 tỉnh thành Việt Nam, tích hợp phân tích thời tiết siêu chuẩn xác theo từng khu vực tìm kiếm, khai thác dữ liệu thống kê điểm đen ngập theo từng huyện/tỉnh, thiết kế thuật toán dự đoán ngập lụt đa yếu tố (thời tiết thực tế + lịch sử ngập + địa hình/tiêu thoát).

---

## 1. Mục Tiêu Nghiệp Vụ & Bối Cảnh (Business Context)

### 1.1 Nỗi đau thực tế (Real-world Pain Points)
- **Vấn đề ngập úng trũng kéo dài (The Underpass Problem)**: Điển hình như các đợt mưa bão tại Hà Nội, hầm chui số 19 Đại lộ Thăng Long (An Khánh - Hoài Đức) và các hầm chui gom bị ngập sâu 1 - 2 mét suốt cả tuần. Các ứng dụng hiện tại chỉ nhìn lượng mưa tức thời: khi trời tạnh ráo, hệ thống lập tức báo "Đường khô ráo / An toàn", khiến hàng nghìn phương tiện đi vào rồi phải quay đầu trong tuyệt vọng.
- **Dữ liệu phân tán & thiếu chi tiết**: Người dùng tìm kiếm một huyện/thị xã hoặc một tuyến phố không xem được phân tích khí tượng chuyên sâu (lượng mưa tích lũy 24h-72h, độ bão hòa đất, dự báo mưa từng giờ tới) và không biết cụ thể điểm nào trên địa bàn sắp bị ngập.
- **Thiếu mô hình dự báo khoa học**: Cần một động cơ dự đoán (Prediction Engine) kết hợp dữ liệu khí tượng thực tế theo thời gian thực (Real-time Meteorological Telemetry) với đặc tính thủy văn - trắc địa từng điểm ngập (Địa hình phễu, năng lực thoát nước, phụ thuộc máy bơm cưỡng bức, mực nước triều cường).

### 1.2 Giải pháp cung cấp
1. **Bản đồ dữ liệu 63 Tỉnh/Thành & Quận/Huyện toàn quốc**: Hệ thống địa danh chuẩn GIS toàn quốc cho phép tìm kiếm bất kỳ địa bàn nào.
2. **Bộ phân tích khí tượng chuyên sâu (Hyper-Local Weather Analyzer)**: Bóc tách mưa tức thời, mưa tích lũy (1h, 3h, 6h, 12h, 24h, 48h, 72h), dự báo mưa 24h tới, và chỉ số bão hòa ẩm của đất (Soil Saturation).
3. **Cơ sở tri thức điểm đen ngập lụt toàn quốc (National Flood Hotspots Database)**: Danh mục các điểm ngập nhức nhối theo từng huyện/tỉnh với các tham số trắc địa: ngưỡng mưa kích hoạt, loại ngập, hệ số tiêu thoát, cờ phụ thuộc máy bơm, độ trễ rút nước.
4. **Thuật toán dự đoán ngập đa yếu tố HTPM (Hydro-Topographic Prediction Model)**: Đánh giá nguy cơ ngập tức thời, dự báo độ sâu ngập ($D_{\text{cm}}$), cảnh báo trước 1-3 giờ, và ước lượng chính xác thời gian nước rút (Recession Lag Time).

---

## 2. User Scenarios & Testing *(Prioritized User Journeys)*

### User Story 1 - Tra Cứu Dự Đoán Ngập Tại Tuyến Đường / Hầm Chui Nguy Cơ (Priority: P1)
**Mô tả**: Người lái xe hoặc người dân chuẩn bị di chuyển qua khu vực hay ngập (ví dụ: Hầm chui số 19 Đại lộ Thăng Long, Ngã tư Thái Hà, Đường Huỳnh Tấn Phát) tìm kiếm hoặc chọn điểm trên bản đồ để xem trạng thái: đang ngập bao nhiêu cm, có an toàn để đi qua không, và nếu ngập thì bao lâu nữa nước rút.

- **Why this priority**: Cốt lõi của hệ thống giải quyết trực tiếp việc người dân không bị "mắc bẫy" ngập úng sau mưa.
- **Independent Test**: Gửi tọa độ Hầm chui số 19 với kịch bản mưa tích lũy 48h là 180mm nhưng mưa tức thời hiện tại bằng 0 (trời tạnh ráo). Hệ thống phải trả về trạng thái `CRITICAL_FLOOD` hoặc `FLOODED` kèm độ sâu ước tính > 50cm, thông báo "Đang ứ đọng chờ bơm tiêu", không được trả về `SAFE`.

**Acceptance Scenarios**:
1. **Given** Hầm chui 19 có cấu hình phụ thuộc máy bơm (`is_pump_dependent = true`) và mưa tích lũy 48h qua đạt 120mm, **When** người dùng tra cứu khi trời vừa tạnh mưa (`current_rain = 0`), **Then** hệ thống hiển thị trạng thái `FLOODED` (Đang ngập ~60cm), cảnh báo "Nước rút chậm do địa hình phễu trũng, chờ trạm bơm vận hành" kèm thời gian ước tính rút nước 36h.
2. **Given** một điểm ngã tư nội thành thoát nước tự nhiên tốt (`recession_lag_hours = 2h`), **When** mưa tạnh sau 3 giờ, **Then** hệ thống chuyển trạng thái sang `CLEARED` (Mặt đường khô ráo, an toàn).

---

### User Story 2 - Phân Tích Thời Tiết & Nguy Cơ Ngập Chi Tiết Theo Quận/Huyện (Priority: P2)
**Mô tả**: Người dùng gõ tìm kiếm một huyện/thành phố (ví dụ: "Huyện Hoài Đức, Hà Nội" hoặc "Quận 7, TP.HCM"). Hệ thống trả về bảng phân tích thời tiết đa chỉ số chuyên sâu và danh sách các điểm có nguy cơ ngập cao nhất trên địa bàn đó.

- **Why this priority**: Phục vụ nhu cầu tra cứu diện rộng, quy hoạch lộ trình di chuyển trước khi ra khỏi nhà.
- **Independent Test**: Tìm kiếm "Hoài Đức" $\rightarrow$ Hệ thống gọi API thời tiết độ phân giải cao tại tọa độ Hoài Đức, hiển thị lượng mưa tức thời, tích lũy 24h, độ ẩm đất, và liệt kê ngay Hầm chui số 19, Hầm chui số 3, KĐT Geleximco với mức nguy cơ tương ứng.

**Acceptance Scenarios**:
1. **Given** người dùng chọn hoặc tìm kiếm một quận/huyện bất kỳ trong 63 tỉnh thành, **When** dữ liệu được tải, **Then** giao diện hiển thị:
   - Thẻ thời tiết chi tiết: Nhiệt độ, gió, độ ẩm, lượng mưa tức thời (mm/h), mưa tích lũy 24h, độ bão hòa đất (%).
   - Biểu đồ mini dự báo mưa 24h tới.
   - Thẻ điểm ngập liên đới: Liệt kê các điểm đen trong bán kính 10km kèm cấp độ nguy cơ được tính toán bởi thuật toán HTPM.

---

### User Story 3 - Cảnh Báo Sớm Ngập Trước 1 - 3 Giờ (Early Warning Forecast) (Priority: P3)
**Mô tả**: Khi trời chuẩn bị có cơn mưa dông cực lớn đổ bộ theo dự báo thời tiết giờ tới, hệ thống tự động phát hiện các điểm ngập nhạy cảm và gán nhãn `WARNING_SOON` ("Nguy cơ ngập trong 45 - 90 phút tới") để người dân chủ động né tránh hoặc kê kích tài sản.

- **Why this priority**: Chuyển từ "Cảnh báo khi đã ngập" sang "Cảnh báo trước khi ngập" (Predictive Early Warning).
- **Independent Test**: Mô phỏng dữ liệu dự báo mưa 2 giờ tới đạt 60mm/h tại khu vực trũng $\rightarrow$ Hệ thống kích hoạt trạng thái `WARNING_SOON` dù mặt đất hiện tại chưa ngập sâu.

**Acceptance Scenarios**:
1. **Given** dự báo lượng mưa trong 1-2h tới vượt ngưỡng chịu đựng của cống thoát nước tại điểm, **When** thuật toán chạy dự báo, **Then** trạng thái điểm ngập chuyển sang `WARNING_SOON` với cảnh báo "Dự báo ngập sâu 30-50cm sau 45 phút mưa to".

---

## 3. Đặc Tả Yêu Cầu Chức Năng (Functional Requirements)

### 3.1 Dữ liệu Địa giới Toàn Quốc (National Administrative Geography)
- **FR-001**: Hệ thống PHẢI hỗ trợ đầy đủ danh mục **63 tỉnh/thành phố** và các quận/huyện trọng điểm tại Việt Nam kèm tọa độ trung tâm (WGS84) và mức zoom tối ưu.
- **FR-002**: Hệ thống PHẢI cho phép tìm kiếm nhanh (Autocomplete / Fuzzy Search) theo tên tỉnh, huyện, tên tuyến đường hoặc tên điểm đen ngập lụt.

### 3.2 Khai thác Khí tượng & Phân tích Chuyên sâu (Hyper-Local Weather Analysis)
- **FR-003**: Hệ thống PHẢI tích hợp API thời tiết độ phân giải cao thời gian thực (Open-Meteo High-Resolution Model) theo tọa độ chính xác của từng vị trí tìm kiếm.
- **FR-004**: Hệ thống PHẢI bóc tách và phân tích các chỉ số khí tượng nâng cao:
  - Lượng mưa tức thời (`precipitation_rate` mm/h).
  - Lượng mưa tích lũy trong quá khứ (`accumulated_rain` 1h, 3h, 6h, 12h, 24h, 48h, 72h).
  - Độ ẩm bão hòa tầng đất mặt (`soil_moisture_0_to_7cm` và `7_to_28cm` $m^3/m^3$).
  - Dự báo chuỗi mưa 24 giờ tới theo từng mốc 1 giờ (`hourly_precipitation_forecast`).
  - Sức gió giật (`wind_gusts`), mã thời tiết quốc tế WMO (`weather_code`).

### 3.3 Cơ sở Dữ liệu Điểm Đen Ngập Toàn Quốc (National Flood Vulnerability Knowledge Base)
- **FR-005**: Hệ thống PHẢI duy trì danh mục điểm đen ngập úng được chuẩn hóa từ dữ liệu của các đơn vị thoát nước đô thị và trắc địa giao thông (HSDC Hà Nội, UDI Maps TP.HCM, Thoát nước Đà Nẵng, Cần Thơ, Hải Phòng, Nghệ An, Thừa Thiên Huế...).
- **FR-006**: Mỗi điểm ngập trong cơ sở dữ liệu BẮT BUỘC phải có các trường thuộc tính thủy văn:
  - `id`: Mã định danh duy nhất (VD: `fp-hn-thanglong-19`).
  - `name`: Tên định danh (VD: `Hầm chui số 19 Đại lộ Thăng Long (An Khánh)`).
  - `province_code`, `district_name`, `latitude`, `longitude`.
  - `topography_type`: Phân loại địa hình (`UNDERPASS`, `DEPRESSION`, `RIVER_BANK`, `COASTAL_TIDAL`, `URBAN_INTERSECTION`).
  - `threshold_rain_1h`: Ngưỡng mưa 1 giờ gây ngập (mm).
  - `threshold_rain_accum`: Ngưỡng mưa tích lũy 24h-48h gây ngập (mm).
  - `drainage_capacity_mm_per_h`: Năng lực tiêu thoát nước tự nhiên (mm/h).
  - `is_pump_dependent`: Có phụ thuộc máy bơm cưỡng bức hay không (true/false).
  - `recession_lag_hours`: Thời gian trễ nước rút tự nhiên sau mưa (giờ).

### 3.4 Thuật toán Dự đoán Ngập Đa Yếu Tố HTPM (Hydro-Topographic Prediction Model)
- **FR-007**: Thuật toán PHẢI tính toán **Chỉ số bão hòa đất (Soil Saturation Factor - SSF)**: Khi lượng mưa tích lũy cao hoặc đất đã bão hòa ($> 0.35\text{ m}^3/\text{m}^3$), hệ số dòng chảy mặt (Runoff Coefficient $C$) tự động tăng từ $0.45 \rightarrow 0.90$.
- **FR-008**: Thuật toán PHẢI tính **Lượng nước đọng thực tế (Net Ponding Index - NPI)** theo công thức cân bằng thủy văn:
  $$NPI(t) = \text{Rainfall}_{\text{eff}}(t) + \text{AccumulatedPonding}(t-1) - \text{DrainageCapacity}$$
- **FR-009**: Thuật toán PHẢI dự đoán độ sâu ngập ($D_{\text{cm}}$) dựa trên $NPI$ và hệ số hình học lòng phễu địa hình (`funnel_factor`).
- **FR-010**: Thuật toán PHẢI tính toán **Thời gian nước rút dự kiến (Estimated Recession Time)**:
  - Đối với điểm ngập phụ thuộc máy bơm (`is_pump_dependent = true` như Hầm chui 19): Thời gian rút nước tính theo công suất bơm quy đổi và mức độ ngập sông ngoại vi, không tự động hạ về 0 khi vừa tạnh mưa.
- **FR-011**: Thuật toán PHẢI phân loại mức độ rủi ro thành 5 cấp:
  - `SAFE`: Khô ráo, giao thông an toàn ($0\text{ cm}$).
  - `MINOR_WATERLOG`: Nước đọng nhẹ rãnh đường ($< 15\text{ cm}$).
  - `MODERATE_FLOOD`: Ngập cục bộ, xe gầm thấp đi chậm ($15 - 35\text{ cm}$).
  - `SEVERE_FLOOD`: Ngập sâu nguy hiểm, chết máy xe máy/ô tô con ($35 - 60\text{ cm}$).
  - `CRITICAL_FLOOD`: Ngập lụt nghiêm trọng, cấm di chuyển, ngập hầm chui ($> 60\text{ cm}$).

---

## 4. Key Entities & Domain Models

- **`Province`**: Đơn vị cấp tỉnh/thành phố (Mã số, tên gọi, vùng miền, tọa độ GIS tâm, zoom mặc định).
- **`District`**: Đơn vị quận/huyện/thị xã (Tên, mã tỉnh, tọa độ GIS).
- **`FloodVulnerabilityHotspot`**: Điểm đen ngập lụt trắc địa kèm các chỉ số thủy văn và tiêu thoát.
- **`WeatherTelemetry`**: Bản ghi dữ liệu khí tượng tức thời, tích lũy lịch sử và dự báo tương lai.
- **`FloodPredictionResult`**: Kết quả đầu ra của thuật toán: độ sâu dự đoán (cm), cấp độ rủi ro, dự báo ngập tương lai, nguyên nhân ngập, thời gian nước rút ước tính.

---

## 5. Success Criteria & Verification Metrics

- **SC-001**: Thuật toán HTPM xử lý tính toán dự đoán cho 100 điểm ngập lụt đồng thời trong thời gian $< 50\text{ ms}$ (Thuần logic JavaScript/NodeJS, không có blocking I/O).
- **SC-002**: Độ chính xác bài toán Hầm chui 19: Trong kịch bản tạnh mưa sau bão lũ (`rain = 0`, mưa tích lũy 48h > 150mm), hệ thống 100% giữ cảnh báo `SEVERE_FLOOD`/`CRITICAL_FLOOD` với độ sâu $> 50\text{ cm}$ và ước tính thời gian rút nước $> 24\text{h}$.
- **SC-003**: 63/63 tỉnh thành phố của Việt Nam có thể tra cứu và hiển thị dữ liệu thời tiết thực tế từ Open-Meteo API.
- **SC-004**: Đầy đủ Unit Test kiểm thử các biên ranh giới thủy văn (mưa to đất khô, mưa nhỏ đất bão hòa, tạnh mưa hầm phễu, triều cường dâng).
- **SC-005**: 100% kiểm thử chạy qua `npm test`, TUYỆT ĐỐI KHÔNG mở trình duyệt (`browser_subagent`).
