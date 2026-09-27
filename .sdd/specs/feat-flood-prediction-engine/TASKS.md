# Tasks Breakdown: National Flood Prediction Engine (feat-flood-prediction-engine)

**Feature Branch**: `feat-flood-prediction-engine`  
**Spec Reference**: [.sdd/specs/feat-flood-prediction-engine/SPEC.md](file:///d:/wd%20c%20sang%20d/Documents/WEB%20c%E1%BA%A3nh%20b%C3%A1o%20ng%E1%BA%ADp%20l%E1%BB%A5t/.sdd/specs/feat-flood-prediction-engine/SPEC.md)  
**Plan Reference**: [.sdd/specs/feat-flood-prediction-engine/PLAN.md](file:///d:/wd%20c%20sang%20d/Documents/WEB%20c%E1%BA%A3nh%20b%C3%A1o%20ng%E1%BA%ADp%20l%E1%BB%A5t/.sdd/specs/feat-flood-prediction-engine/PLAN.md)

---

## Phase 1: National Geography & Telemetry Service Layer

- [x] **Task 1.1: Chuẩn hóa dữ liệu 63 Tỉnh/Thành phố & Quận/Huyện Việt Nam**
  - File: `src/domain/entities/Province.js`, `src/infra/data/vietnam_geography.json`
  - Nội dung: Cung cấp đầy đủ 63 tỉnh/thành phố với mã hành chính chuẩn Tổng cục Thống kê, tọa độ trung tâm GIS (lat/lng), danh sách quận/huyện trọng điểm.
  - Acceptance: Có thể tìm kiếm và trích xuất tọa độ bất kỳ tỉnh/huyện nào tại Việt Nam.

- [x] **Task 1.2: Triển khai Bộ phân tích thời tiết đa chỉ số chuyên sâu (WeatherAnalyzer)**
  - File: `src/infra/services/OpenMeteoWeatherService.js`
  - Nội dung: Tích hợp Open-Meteo API lấy mưa tức thời, tính toán chuỗi mưa tích lũy 1h-72h, độ bão hòa đất (soil moisture), và dự báo mưa 24h tới kèm cache thông minh.
  - Acceptance: Trả về đầy đủ payload `WeatherTelemetry` theo từng tọa độ GPS trong < 300ms (hoặc cache).

---

## Phase 2: National Flood Vulnerability Knowledge Base

- [x] **Task 2.1: Xây dựng Cơ sở Dữ liệu Điểm Đen Ngập Lụt Toàn Quốc**
  - File: `src/infra/data/national_flood_hotspots.json`
  - Nội dung: Khai thác và chuẩn hóa các điểm ngập lịch sử theo huyện/tỉnh (Hà Nội: Hầm chui 19, Hầm chui 3, 5, 6, Triều Khúc, Hoa Bằng...; TP.HCM: Huỳnh Tấn Phát, Thảo Điền, Quốc Hương, Nguyễn Hữu Cảnh...; Đà Nẵng, Cần Thơ, Hải Phòng, Nghệ An, Huế...).
  - Đầy đủ thuộc tính: `topography_type`, `threshold_rain_1h`, `threshold_rain_accum`, `drainage_capacity_mm_per_h`, `is_pump_dependent`, `recession_lag_hours`.
  - Acceptance: Dữ liệu JSON hợp lệ, có đầy đủ điểm nóng Hầm chui số 19 Đại lộ Thăng Long (An Khánh - Hoài Đức).

- [x] **Task 2.2: Triển khai Repository truy vấn Điểm Đen Ngập**
  - File: `src/infra/repositories/FloodHotspotRepository.js`
  - Nội dung: Hỗ trợ tìm kiếm điểm ngập theo mã tỉnh, quận/huyện, hoặc bán kính tọa độ GPS.

---

## Phase 3: Thuật Toán Dự Đoán Ngập Đa Yếu Tố HTPM (Core Algorithm)

- [x] **Task 3.1: Triển khai Module Toán học Thủy văn Đô thị (HydroTopographicModel)**
  - File: `src/domain/services/HydroTopographicModel.js`
  - Nội dung:
    - Công thức hệ số dòng chảy mặt động theo độ ẩm đất ($C_{\text{runoff}}$).
    - Công thức lượng nước đọng hữu hiệu ($V_{\text{eff}}$).
    - Công thức dự đoán độ sâu ngập ($D_{\text{cm}}$) cho cả kịch bản đang mưa và tạnh mưa sau bão (Hầm chui 19).
    - Công thức ước tính thời gian nước rút ($T_{\text{recede}}$).
  - Acceptance: Hàm thuần toán học (pure function), không phụ thuộc I/O.

- [x] **Task 3.2: Triển khai Usecase Dự Đoán Rủi Ro Ngập Lụt (PredictFloodRiskUseCase)**
  - File: `src/usecase/PredictFloodRiskUseCase.js`
  - Nội dung: Nhận danh sách điểm ngập + dữ liệu khí tượng $\rightarrow$ Chạy qua `HydroTopographicModel` $\rightarrow$ Trả về kết quả dự đoán (Độ sâu cm, Cấp độ rủi ro, Dự báo sớm tương lai, Thời gian nước rút).

- [x] **Task 3.3: Viết Unit Test Suite kiểm thử toàn diện Thuật toán**
  - File: `tests/unit/test-flood-prediction-engine.test.js`
  - Nội dung:
    - Test case 1: Hầm chui số 19 - Kịch bản mưa cả tuần rồi tạnh (Mưa tích lũy 48h = 160mm, mưa tức thời = 0mm/h) $\rightarrow$ BẮT BUỘC giữ trạng thái `SEVERE_FLOOD` / `CRITICAL_FLOOD`, độ sâu $> 50\text{ cm}$, thời gian rút nước $> 24\text{h}$.
    - Test case 2: Ngã tư thoát nước tốt - Tạnh mưa 3h $\rightarrow$ Trở về `SAFE` (0cm).
    - Test case 3: Cảnh báo sớm tương lai khi dự báo 1h tới có mưa dông cực lớn $\rightarrow$ `WARNING_SOON`.
  - Acceptance: Chạy qua `node --test tests/unit/test-flood-prediction-engine.test.js` đạt 100% PASS.

---

## Phase 4: Tích Hợp UI & Trực Quan Hóa Trên Web Bản Đồ

- [x] **Task 4.1: Tích hợp Engine Dự đoán vào `supabase-service.js`**
  - File: `src/interface/ui/js/supabase-service.js`
  - Nội dung: Thay thế logic tính ngập đơn giản bằng `HydroTopographicModel`, liên kết dữ liệu 63 tỉnh thành và cơ sở tri thức điểm đen ngập toàn quốc.

- [x] **Task 4.2: Nâng cấp Giao diện Tra cứu & Phân tích Thời tiết Chi Tiết**
  - File: `src/interface/ui/js/app.js`, `index.html`
  - Nội dung:
    - Mở rộng dropdown tỉnh thành hỗ trợ đầy đủ 63 tỉnh/thành phố.
    - Thanh tìm kiếm gợi ý thông minh (tỉnh, huyện, điểm đen ngập) bán kính 2.5km.
    - Cập nhật popup điểm ngập hiển thị đầy đủ: Độ sâu cm, mưa tích lũy 48h, thời gian dự kiến nước rút (~h), trạng thái Ứ đọng sau bão (Chờ bơm).
    - Huy hiệu cảnh báo rõ ràng cho Hầm chui 19: "Nước ứ đọng do trũng lòng phễu - Khuyến cáo tuyệt đối quay đầu!".

---

## Phase 5: Verification & Zero-Drift

- [x] **Task 5.1: Chạy toàn bộ test suite (`npm test`)**
  - Xác nhận mọi bài kiểm thử đều vượt qua (48/48 tests PASS).
- [ ] **Task 5.2: Cập nhật CHANGELOG.md và chuẩn bị CI/CD push**
