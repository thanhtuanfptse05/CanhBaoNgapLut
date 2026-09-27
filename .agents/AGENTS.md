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

## 3. ARCHITECTURE PRINCIPLES
- Core Domain & Entities không phụ thuộc vào UI hay external libraries.
- Mọi feature mới phải có file spec trong `.sdd/specs/feat-{name}/` trước khi viết code.
- Xử lý lỗi tập trung, không để crash ứng dụng khi mất kết nối trạm đo.

## 4. FORBIDDEN PATTERNS
- KHÔNG hardcode API keys, secrets trong mã nguồn.
- KHÔNG commit code vi phạm các nguyên tắc trong `.sdd/constitution.md`.
- KHÔNG bỏ qua khâu kiểm thử (unit tests) cho các thuật toán đánh giá mức ngập.

## 5. DEFINITION OF DONE
- [ ] Spec, Plan, Tasks được cập nhật trong `.sdd/specs/`
- [ ] Code tuân thủ Clean Architecture
- [ ] Unit tests đầy đủ và vượt qua
