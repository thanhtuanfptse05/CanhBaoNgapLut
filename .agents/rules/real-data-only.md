# Rule: Real Data Only — Dữ Liệu Phải Là Thực Tế

## Nguyên Tắc Cốt Lõi

**TUYỆT ĐỐI CẤM** sử dụng dữ liệu giả, hardcode, mock, hay placeholder trong bất kỳ layer dữ liệu nào của ứng dụng.

## Áp Dụng Cho

### 1. Dữ Liệu Ngập Lụt (Flood Points)
- PHẢI lấy từ database Supabase thực (bảng `flood_alerts`, `flood_stations`)
- PHẢI lấy level nước từ Open-Meteo Flood API hoặc dữ liệu trạm thủy văn thực tế
- KHÔNG tự tạo ra các điểm ngập giả để "demo"

### 2. Dữ Liệu Thời Tiết
- PHẢI lấy từ Open-Meteo API thực tế (`https://api.open-meteo.com/v1/forecast`)
- KHÔNG hardcode nhiệt độ, độ ẩm, tốc độ gió

### 3. Dữ Liệu Radar Mưa
- PHẢI lấy từ RainViewer API thực tế (`https://api.rainviewer.com/public/weather-maps.json`)
- KHÔNG dùng tile giả hoặc tile cố định

### 4. Dữ Liệu Trạm Quan Trắc
- PHẢI là trạm thủy văn thực có tọa độ thực từ danh sách tỉnh/thành của Việt Nam
- KHÔNG tự bịa tọa độ, tên trạm, hoặc mã trạm

### 5. Vị Trí GPS
- PHẢI dùng `navigator.geolocation` / Leaflet `map.locate()` thực
- PHẢI hiển thị độ chính xác (accuracy radius) để người dùng biết mức độ tin cậy
- PHẢI thông báo rõ khi GPS kém chính xác (trên desktop thường dùng IP/WiFi)

## Xử Lý Khi Không Có Data

Khi API thực tế không trả về dữ liệu hoặc gặp lỗi:
1. Hiển thị thông báo rõ ràng: "Đang tải dữ liệu..." hoặc "Không thể tải dữ liệu thực tế"
2. KHÔNG thay thế bằng dữ liệu fake
3. Retry với backoff hợp lý

## Enforcement

- Mọi PR/commit vi phạm rule này phải bị từ chối
- Bất kỳ `const mockData`, `const fakeData`, `hardcoded coordinates` nào cần bị xóa ngay
