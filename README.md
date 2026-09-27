# CanhBaoNgapLut — Hệ Thống Cảnh Báo Ngập Lụt

Hệ thống Web giám sát và cảnh báo ngập lụt theo thời gian thực dựa trên bản đồ GIS, trạm quan trắc mực nước và các thuật toán đánh giá rủi ro ngập úng đô thị.

## 🏛️ Kiến trúc dự án
Dự án được phát triển theo mô hình **Hybrid SDD (Spec-Driven Development & Agent-Driven Development)** và **Clean Architecture**:
- `.sdd/`: Toàn bộ đặc tả tính năng (`specs/`), hiến pháp dự án (`constitution.md`), ràng buộc kỹ thuật (`constraints/`) và quyết định kiến trúc (`rfcs/`).
- `.agents/`: Cấu hình context, quy tắc và tri thức cho AI coding agents (`AGENTS.md`, `CLAUDE.md`).
- `src/`: Mã nguồn phân tầng Clean Architecture (`domain/`, `usecase/`, `interface/`, `infra/`).
- `tests/`: Kiểm thử tự động (`unit/`, `integration/`, `e2e/`).
- `docs/`: Tài liệu API (OpenAPI/Swagger) và sơ đồ kiến trúc hệ thống.

## 🚀 Tính năng cốt lõi (Specs)
1. **Bản đồ ngập lụt thời gian thực** (`feat-flood-map`): Hiển thị bản đồ GIS, trạm đo mực nước và mật độ rủi ro ngập.
2. **Cảnh báo khẩn cấp** (`feat-flood-alert`): Cảnh báo tự động khi mực nước vượt ngưỡng an toàn.
