# Execution Plan: feat-emergency-alerts

## Phase 1: Data Contracts & Entity Mapping
- Ánh xạ bảng `flood_alerts` và cấu trúc dữ liệu liên lạc khẩn cấp từ Supabase.
- Định nghĩa Usecase lấy danh sách cảnh báo thiên tai đang hiệu lực (`is_active = TRUE`).
- Chuẩn bị danh bạ cứu hộ theo vùng miền/tỉnh thành (114 Cứu nạn, 115 Y tế, BCH PCTT địa phương).

## Phase 2: Emergency Broadcast Banner Component
- Thiết kế Banner cảnh báo khẩn cấp nổi bật phía trên cùng màn hình (Hiệu ứng dải màu cảnh báo đỏ/cam, biểu tượng chuông nháy).
- Hỗ trợ cuộn tin tức cảnh báo (Marquee text hoặc Ticker) cho nhiều bản tin cùng lúc.
- Chức năng đóng/thu nhỏ (Dismiss to Floating Badge) để không che khuất bản đồ.

## Phase 3: SOS Floating Button & Hotline Modal
- Nút bấm "SOS Cứu Hộ Khẩn Cấp" cố định góc màn hình với hiệu ứng nhịp tim (Pulse animation).
- Modal danh bạ cứu trợ 1 chạm (Click-to-call `tel:...`).
- Tích hợp tính năng sao chép tọa độ GPS hiện tại kèm tin nhắn mẫu cầu cứu gửi qua Zalo/SMS.

## Phase 4: Cẩm Nang Kỹ Năng Thoát Hiểm Khi Ngập
- Modal hướng dẫn 4 tình huống thực tế: Đi bộ qua vùng ngập, Lái xe máy/ô tô, Ngập vào nhà & an toàn điện, Xử lý khi bị cô lập.
- Thiết kế infographic và danh sách kiểm tra (Safety Checklist).
