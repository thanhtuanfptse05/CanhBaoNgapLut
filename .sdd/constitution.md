# PROJECT CONSTITUTION — WEB CẢNH BÁO NGẬP LỤT

Version: 1.0.0 | Status: LOCKED
Project: Hệ thống Web Cảnh Báo Ngập Lụt Thời Gian Thực
Last updated: 2026-09-27

═══════════════════════════════════════════════════
  LAYER 1: HARD RULES — KHÔNG BAO GIỜ VI PHẠM
═══════════════════════════════════════════════════

## ARTICLE 1 — TECH STACK & ARCHITECTURE
- Follow Clean Architecture: domain / usecase / interface / infra.
- Core business & domain logic không phụ thuộc vào framework bên ngoài.
- Dữ liệu cảm biến/trạm đo & bản đồ GIS tuân thủ chuẩn GeoJSON / WGS84.

## ARTICLE 2 — SECURITY & SAFETY
- Không lưu credentials, API keys trong source code; sử dụng biến môi trường.
- Mọi dữ liệu đầu vào (tọa độ, mức nước, báo cáo ngập) phải được validate chặt chẽ.
- Bảo mật các API phát cảnh báo khẩn cấp (Emergency Broadcast).

## ARTICLE 3 — CODING & TESTING STANDARDS
- Không sử dụng các biến/hàm không rõ kiểu dữ liệu.
- Mọi usecase cốt lõi và thuật toán cảnh báo ngập lụt phải có Unit Test.
- Xử lý lỗi tập trung, không để crash ứng dụng khi mất kết nối trạm đo/sensor.
