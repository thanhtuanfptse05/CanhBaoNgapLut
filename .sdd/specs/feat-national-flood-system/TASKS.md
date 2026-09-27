# Tasks: feat-national-flood-system

## Phase 1: Database Design (Ưu tiên số 1)
- [x] Task 1.1: Đặc tả chi tiết mô hình dữ liệu quan hệ và không gian trong `data-model.md`
- [x] Task 1.2: Thiết kế sơ đồ quan hệ thực thể (ERD Diagram) bằng Mermaid
- [x] Task 1.3: Viết script DDL cơ sở dữ liệu `src/infra/database/schema.sql` (bảng hành chính, trạm đo, log đo đạc, điểm ngập, báo cáo, cảnh báo)
- [ ] Task 1.4: Tạo dữ liệu mẫu (Seed Data) cho các tỉnh thành trọng điểm (Hà Nội, TP.HCM, Đà Nẵng, Thừa Thiên Huế, Quảng Ninh, Cần Thơ)

## Phase 2: Domain Layer Entities
- [ ] Task 2.1: Triển khai các Domain Entity models trong `src/domain/entities/`
- [ ] Task 2.2: Định nghĩa các Repository Interfaces trong `src/domain/repositories/`

## Phase 3: Usecases & Logic
- [ ] Task 3.1: Viết Usecase truy vấn điểm ngập theo vị trí & bán kính
- [ ] Task 3.2: Viết Usecase đánh giá ngưỡng mực nước tự động
- [ ] Task 3.3: Viết Unit Tests cho các Usecase nghiệp vụ

## Phase 4: Interface & Map UI
- [ ] Task 4.1: Xây dựng Mock API / Controllers
- [ ] Task 4.2: Tích hợp bản đồ Leaflet hiển thị toàn cảnh bản đồ Việt Nam
