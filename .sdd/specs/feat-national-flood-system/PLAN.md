# Execution Plan: feat-national-flood-system

## Phase 0: Kiến Trúc & Nghiên Cứu (Research & Foundation)
- **Hệ tọa độ**: Sử dụng WGS84 (EPSG:4326) chuẩn quốc tế và tương thích hoàn toàn với OpenStreetMap, Leaflet, Mapbox, Google Maps.
- **Lưu trữ dữ liệu GIS**: PostgreSQL + PostGIS (hoặc SQLite + SpatiaLite / GeoJSON column cho môi trường thử nghiệm/nhẹ).
- **Mô hình chuỗi thời gian (Time-series)**: Tối ưu đánh index trên `(station_id, recorded_at DESC)` cho các bảng log đo đạc mực nước và lượng mưa.

## Phase 1: Thiết Kế Mô Hình Dữ Liệu & Database First (CURRENT FOCUS)
- **Artifacts**:
  - `data-model.md`: Chi tiết ERD diagram, các bảng, trường dữ liệu, ràng buộc khóa chính/ngoại, chỉ mục không gian (Spatial Index GiST/RTree).
  - `src/infra/database/schema.sql`: Script DDL chuẩn ANSI/PostgreSQL sẵn sàng chạy khởi tạo cấu trúc DB.
- **Rà soát**: Đảm bảo đủ các thực thể địa giới hành chính Việt Nam, trạm đo, dữ liệu quan trắc, điểm ngập, báo cáo cộng đồng và sự kiện cảnh báo.

## Phase 2: Core Domain & Repositories (Backend Foundation)
- Tạo Entities trong `src/domain/entities/`:
  - `Province`, `Station`, `WaterLevelLog`, `FloodPoint`, `FloodAlert`.
- Tạo Repository Interfaces trong `src/domain/repositories/`:
  - `IFloodPointRepository`, `IStationRepository`, `IAlertRepository`.

## Phase 3: Business Logic Usecases (Application Layer)
- `GetNationalFloodMapUseCase`: Lấy danh sách điểm ngập toàn quốc có hỗ trợ phân trang & bộ lọc tỉnh/thành.
- `RecordSensorMeasurementUseCase`: Tiếp nhận dữ liệu quan trắc từ trạm và so khớp ngưỡng cảnh báo.
- `EvaluateFloodRiskUseCase`: Thuật toán phân cấp mức độ cảnh báo (Báo động I, II, III).
- `SubmitCommunityReportUseCase`: Tiếp nhận và tính điểm xác minh báo cáo ngập từ người dân.

## Phase 4: API & Presentation Interface (GIS Web UI)
- REST API Controllers trong `src/interface/controllers/`.
- Web UI: Bản đồ số Việt Nam (Leaflet/OpenStreetMap), thanh tìm kiếm tỉnh thành, bộ lọc mức ngập, popup thông tin trạm, banner cảnh báo khẩn cấp.

## Phase 5: Verification & Deployment
- Kiểm thử tự động (Unit Test cho Usecase phân loại mức ngập).
- CI/CD tự động kiểm tra cú pháp và push mã nguồn.
