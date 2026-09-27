# SHARED CONTEXT — CROSS-AGENT SYNCHRONIZATION

## Current Project State
- Stage: Khởi tạo cấu trúc dự án chuẩn SDD & ADD
- Active Features:
  - `feat-flood-map`: Bản đồ GIS & hiển thị điểm ngập lụt
  - `feat-flood-alert`: Hệ thống cảnh báo & ngưỡng ngập lụt

## Core Decisions & Shared Memory
- Model kiến trúc: Clean Architecture (Domain - Usecase - Interface - Infra)
- Chuẩn tọa độ: WGS84 (EPSG:4326)
- Chuẩn định dạng dữ liệu GIS: GeoJSON
