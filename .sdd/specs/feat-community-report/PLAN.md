# Execution Plan: feat-community-report

## Phase 1: Interactive Pin Placement UI
- Nút kích hoạt báo ngập nhanh cố định trên thanh điều hướng hoặc góc phải dưới.
- Cơ chế thả ghim vị trí ngập tương tác trên bản đồ Leaflet.
- Geocoding ngược đơn giản hoặc hiển thị tọa độ chuẩn xác.

## Phase 2: Visual Water Level Selector
- Thiết kế 4 thẻ chọn mức ngập trực quan với hình minh họa dễ nhận biết.
- Tùy chọn trạng thái nước: "Đang dâng ⬆", "Đứng yên ⏸", "Đang rút ⬇".
- Ô nhập mô tả ngắn gọn (tối đa 150 ký tự) cho tình trạng giao thông.

## Phase 3: Supabase Submission & Optimistic UI
- Gửi dữ liệu vào bảng `community_reports` của Supabase qua REST endpoint.
- Hiển thị ngay marker trên bản đồ (Optimistic Update) không để người dùng chờ đợi.
- Lưu LocalStorage để ghi nhớ báo cáo của người dùng và chống gửi lặp.

## Phase 4: Community Feed Drawer
- Danh sách các điểm ngập do cộng đồng vừa báo trong 24 giờ qua.
- Thống kê số lượt người dân xác nhận ("Đúng ngập" / "Đã hết ngập").
