# Feature Spec: Cảnh Báo Khẩn Cấp & Hướng Dẫn Cứu Hộ (feat-emergency-alerts)

- **Feature Name**: emergency-alerts
- **Target Users**: Công chúng, người gặp nạn do ngập lụt, lực lượng cứu hộ
- **Status**: Approved
- **Version**: 1.0.0
- **Author**: Outcome Engineer
- **Date**: 2026-09-27

---

## 1. Mục Tiêu Nghiệp Vụ
Trong tình huống bão lũ hoặc triều cường dâng cao, người dân cần được cảnh báo **ngay lập tức** khi vừa mở trang web mà không phải tìm kiếm phức tạp.
Tính năng cung cấp:
1. Thanh thông báo khẩn cấp (Emergency Broadcast Banner) trên đầu trang web.
2. Danh bạ khẩn cấp nhanh (SOS Hotline) của các lực lượng cứu hộ (114, 115, Đội cứu hộ bão lũ địa phương).
3. Hướng dẫn kỹ năng an toàn khi ngập lụt (khi đi xe máy/ô tô, bảo vệ nhà cửa, tránh điện giật).

---

## 2. Đặc Tả Yêu Cầu Chức Năng (EARS Notation)

### 2.1 Banner Khẩn Cấp Nổi Bật
- **WHEN** hệ thống có sự kiện cảnh báo đang hoạt động (`is_active = TRUE`) trong bảng `flood_alerts` **THE SYSTEM SHALL** hiển thị một Banner nổi bật trên đầu trang với biểu tượng cảnh báo nhấp nháy.
- **WHEN** người dùng bấm vào Banner **THE SYSTEM SHALL** mở Modal chi tiết hiển thị toàn văn nội dung cảnh báo, phạm vi ảnh hưởng và các khuyến cáo an toàn.

### 2.2 Nút SOS Khẩn Cấp & Danh Bạ Cứu Hộ
- **WHEN** người dùng bấm nút "Cứu Hộ SOS" nổi trên góc màn hình **THE SYSTEM SHALL** mở danh bạ quay số nhanh (bấm gọi ngay 114 - Cứu nạn cứu hộ, 115 - Y tế, các số hotline PCTT theo tỉnh hiện tại).

### 2.3 Khả Năng Tắt / Thu Gọn
- **WHEN** người dùng bấm đóng Banner **THE SYSTEM SHALL** thu gọn thành một biểu tượng chuông nhỏ có chấm đỏ để không cản trở việc xem bản đồ.

---

## 3. Tiêu Chí Thành Công
- Banner tải song song và hiển thị ngay trong 500ms đầu tiên của phiên truy cập.
- Nút gọi khẩn cấp hoạt động 1 chạm trên mọi thiết bị di động (`tel:114`, `tel:115`).
