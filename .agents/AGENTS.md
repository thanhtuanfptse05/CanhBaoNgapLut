# AGENTS.md — Project Context for AI Agents
Version: 1.0 | Updated: 2026-09-27 | Project: Web Cảnh Báo Ngập Lụt

## 1. PROJECT OVERVIEW
Name: Hệ thống Web Cảnh Báo Ngập Lụt (Flood Warning System)
Type: Full-stack Web Application
Domain: GIS, Disaster Warning, Smart City
Stage: Initial Architecture Setup (SDD Phase)

## 2. TECH STACK (STRICT)
Architecture: Clean Architecture (Domain - Usecase - Interface - Infra)
Specs: Spec-Driven Development (SDD) via `.sdd/` artifacts
Mapping/GIS: Leaflet / OpenStreetMap / GeoJSON

## 3. ARCHITECTURE & WORKFLOW PRINCIPLES (MANDATORY)
- BẮT BUỘC dùng skill của `speckit` (`speckit-specify`, `speckit-plan`, `speckit-tasks`) để viết spec trước khi viết code.
- KHI SỬA CODE, BẮT BUỘC SỬA SPEC TRƯỚC: Mọi thay đổi logic/bug fix phải cập nhật `SPEC.md` và `CHANGELOG.md` trước khi sửa source code.
- Core Domain & Entities không phụ thuộc vào UI hay external libraries.
- Xử lý lỗi tập trung, không để crash ứng dụng khi mất kết nối trạm đo.

## 4. FORBIDDEN PATTERNS
- KHÔNG viết code trực tiếp khi chưa có/chưa cập nhật spec tương ứng qua Spec Kit.
- KHÔNG hardcode API keys, secrets trong mã nguồn.
- KHÔNG commit code vi phạm các nguyên tắc trong `.sdd/constitution.md`.
- KHÔNG bỏ qua khâu kiểm thử (unit tests) cho các thuật toán đánh giá mức ngập.

## 5. DEFINITION OF DONE & CI/CD
- [ ] Spec, Plan, Tasks được tạo/cập nhật đầy đủ trong `.sdd/specs/feat-{name}/`
- [ ] Code tuân thủ Clean Architecture
- [ ] Linting và Unit tests đầy đủ và vượt qua
- [ ] Thực hiện đúng quy trình CI/CD và đẩy code lên GitHub (`git push origin main`)
