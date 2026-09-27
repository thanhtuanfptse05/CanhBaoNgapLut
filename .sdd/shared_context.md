# SHARED CONTEXT — CROSS-AGENT SYNCHRONIZATION

## Current Project State
- Stage: Thiết kế Kiến trúc & Cơ sở dữ liệu Hệ Thống Cảnh Báo Ngập Toàn Quốc
- Active Features:
  - `feat-national-flood-system`: Hệ thống cảnh báo ngập lụt toàn quốc (Scope: 63 tỉnh/thành, lưu vực sông, trạm quan trắc)
  - `feat-flood-map`: Bản đồ GIS & hiển thị điểm ngập lụt
  - `feat-flood-alert`: Hệ thống cảnh báo & ngưỡng ngập lụt

## Core Decisions & Shared Memory
- Model kiến trúc: Clean Architecture (Domain - Usecase - Interface - Infra)
- Database: PostgreSQL + PostGIS (hoặc SQLite/SpatiaLite local)
- DDL Script: `src/infra/database/schema.sql` (12 bảng cốt lõi)
- Chuẩn tọa độ: WGS84 (EPSG:4326)
- Chuẩn định dạng dữ liệu GIS: GeoJSON
