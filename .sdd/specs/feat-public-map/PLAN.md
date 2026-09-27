# Execution Plan: feat-public-map

## Phase 1: Foundation & Styling System
- Thiết kế hệ thống giao diện (CSS Design System Tokens: màu sắc cảnh báo, độ trong suốt Glassmorphism, đổ bóng mờ, phông chữ Inter).
- Khởi tạo khung ứng dụng Web (Single Page App / Vanilla JS Module) tốc độ cao, không cần build step cồng kềnh.

## Phase 2: GIS Map Engine Integration
- Tích hợp thư viện Leaflet bản đồ số với bản đồ nền tối (CartoDB Dark Matter / OpenStreetMap Humanitarian) làm nổi bật các điểm ngập cảnh báo.
- Xây dựng Custom SVG Marker hiệu ứng sóng nước nhấp nháy (Water Ripple Animation) cho các điểm ngập Mức 2 và Mức 3.
- Xây dựng Marker cho trạm quan trắc thủy văn với thanh biểu thị đo mực nước (Gauge Bar).

## Phase 3: Supabase Data Fetching & State
- Khởi tạo client kết nối Supabase REST API qua key công khai (`SUPABASE_PUBLISHABLE_KEY`).
- Viết Repository & Usecase đọc danh sách tỉnh thành (`provinces`), trạm đo (`stations`) và điểm ngập (`flood_points`).
- Cài đặt bộ đệm dữ liệu ngoại tuyến (Fallback Mock Seed Data) đảm bảo ứng dụng luôn hiển thị được ngay cả khi mất mạng.

## Phase 4: Interactive Panels & Filtering
- Thanh tìm kiếm nhanh tỉnh/thành phố và tuyến đường.
- Bộ lọc mức độ rủi ro (Tất cả, Mức 1, Mức 2, Mức 3).
- Nút GPS định vị nhanh vị trí người dùng.
- Bảng điều khiển chi tiết dạng Modal/BottomSheet khi click vào từng trạm hoặc điểm ngập.
