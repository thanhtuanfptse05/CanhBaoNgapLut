# SHARED CONTEXT — CROSS-AGENT SYNCHRONIZATION

## Current Project State
- Stage: Hoàn thành Spec-Driven Development (SDD) & Đang triển khai Web UI Công Cộng
- Active Features (100% Spec Approved & Documented):
  1. `feat-national-flood-system`: Kiến trúc Clean Architecture, Cơ sở dữ liệu Supabase Cloud (12 bảng & dữ liệu mẫu 63 tỉnh thành).
  2. `feat-public-map`: Bản đồ GIS công cộng không cần đăng nhập (Zero-auth), định vị GPS 1 chạm, tìm kiếm tỉnh thành, hiển thị mực nước trạm đo & điểm ngập.
  3. `feat-emergency-alerts`: Banner cảnh báo thiên tai khẩn cấp, nút SOS cứu nạn 114/115 1 chạm, chia sẻ tọa độ cứu hộ, cẩm nang sinh tồn.
  4. `feat-community-report`: Báo ngập cộng đồng 1 chạm (Crowdsourcing) 15 giây không cần đăng ký tài khoản, gửi trực tiếp vào Supabase.

## Core Decisions & Shared Memory
- Model kiến trúc: Clean Architecture (Domain - Usecase - Interface - Infra)
- Database: Supabase Cloud (PostgreSQL) `atjyhnewynqblnmbtdog` (Tokyo)
- Frontend: HTML5 / Modern CSS Design System (Glassmorphism, Dark Mode, Micro-animations) + Leaflet GIS + Supabase JS Client (Read-only anonymous public access).
- Quyền truy cập: 100% Public Access cho người dân, không rào cản đăng nhập.
