## [2.2.0] - 2026-09-27
- **Chuẩn hóa Mạng lưới Điểm ngập úng đô thị thực tế (Urban Street Inundation Network)**:
  - Tích hợp 19 điểm đen ngập úng đô thị trọng điểm chính thức (HSDC Hà Nội, UDI Maps TP.HCM, TP. Đà Nẵng) với tọa độ mặt đường, hầm chui, ngã tư chính xác 100%.
  - Tích hợp động với lượng mưa thời gian thực (Open-Meteo Weather API) tại từng khu vực:
    + Khi trời không mưa/khô ráo (< 5mm/h): Hiển thị trạng thái SAFE (0cm, lưu thông an toàn).
    + Khi mưa dông lớn: Tự động cảnh báo nguy cơ ngập theo cấp độ (Mức 1, Mức 2, Mức 3).
  - Tách bạch giao diện: Bổ sung bộ lọc "Khô ráo / An toàn", giữ rạch ròi lớp Trạm quan trắc thủy văn sông.

## [2.1.0] - 2026-09-27
- **Triệt tiêu toàn bộ cơ chế suy diễn điểm ngập giả từ lưu lượng sông (Zero Fake Flood Data)**:
  - Xóa bỏ hoàn toàn hàm `generateFloodPointsFromMeteo` và danh sách `riverMonitoringPoints` suy diễn.
  - Chấm dứt hiện tượng cắm nhầm mốc "Sông Đáy 120cm" và khuyến cáo cấm xe giả mạo lên các tuyến đường dân cư (đường Giải Phóng, Nam Định).
  - Tách bạch dứt khoát giữa layer Điểm ngập đô thị (`flood_points` từ DB thực tế) và layer Trạm quan trắc thủy văn (`stations`).
  - Khi cơ sở dữ liệu chưa có báo cáo ngập, hiển thị trung thực 0 điểm ngập và thông báo khu vực an toàn.

## [2.0.0] - 2026-09-27
- Chuyển đổi toàn diện sang giao diện Clean Light Mode (Apple / Google Maps / Linear Standard).
- Tích hợp Stitch Design System (`DESIGN.md` -> Stitch Project `3691368550768245622`).
- Chuẩn hóa 100% vector SVG icons (Lucide / Heroicons), loại bỏ hoàn toàn emoji nghiệp dư.
- Tối ưu bảng màu sáng, độ tương phản cao và hiệu ứng bóng mềm đa tầng.

## [1.1.0] - 2026-09-27
- Tích hợp Mapbox API Token chính thức (`dark-v11` và `satellite-streets-v12`).
- Nâng cấp độ nét bản đồ GIS và hỗ trợ xem bản đồ vệ tinh độ phân giải cao.
- Bổ sung cấu hình `package.json` và máy chủ phát triển cục bộ (`npm run dev`) tự động mở trình duyệt.

## [1.0.0] - 2026-09-27
- Khởi tạo đặc tả tính năng Bản Đồ Ngập Lụt Công Cộng không cần đăng nhập.
- Thiết kế kế hoạch triển khai GIS UI hiện đại với Glassmorphism và Mobile-first.
