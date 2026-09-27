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

## ARTICLE 4 — SPEC-FIRST & ZERO-DRIFT POLICY (BẮT BUỘC)
- BẮT BUỘC phải dùng skill của speckit (`speckit-specify`, `speckit-plan`, `speckit-tasks`) để viết đặc tả (`SPEC.md`) trước khi bắt đầu code bất kỳ tính năng nào.
- KHI SỬA CODE, BẮT BUỘC PHẢI SỬA SPEC TRƯỚC: Nếu thay đổi logic, API hoặc sửa lỗi, phải cập nhật `SPEC.md` và `CHANGELOG.md` trước, sau đó mới được sửa code.
- Tuyệt đối nghiêm cấm viết code trực tiếp mà không có spec hoặc spec bị drift so với code.

## ARTICLE 5 — CI/CD & GITHUB PUSH
- Sau khi hoàn thành code và vượt qua các bài kiểm thử (lint & tests), BẮT BUỘC phải commit và push lên GitHub repository theo đúng quy trình CI/CD.
