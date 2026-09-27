# Feature Spec: Báo Ngập Cộng Đồng 1 Chạm (feat-community-report)

- **Feature Name**: community-flood-report
- **Target Users**: Người dân đi đường, người dân vùng ngập (100% Không cần đăng nhập)
- **Status**: Approved
- **Version**: 1.0.0
- **Author**: Outcome Engineer
- **Date**: 2026-09-27

---

## 1. Mục Tiêu Nghiệp Vụ (User Value & Business Needs)
Trạm cảm biến quan trắc tự động không thể bao phủ toàn bộ các con ngõ, tuyến phố. Cần một kênh thu thập thông tin ngập lụt từ cộng đồng (Crowdsourcing) với trải nghiệm **dễ nhất có thể**:
1. **Không cần đăng nhập**: Người dân không phải nhập email hay mật khẩu.
2. **Thao tác 3 bước trong 15 giây**:
   - Bước 1: Vị trí tự động (GPS) hoặc chạm vào điểm trên bản đồ.
   - Bước 2: Chọn mức ngập bằng hình minh họa trực quan (Mắt cá chân ~15cm, Đầu gối ~35cm, Ngang yên xe ~60cm, Nước ngập lút nóc xe >1m).
   - Bước 3: Nhập ghi chú ngắn (tùy chọn) và bấm "Gửi Báo Cáo".
3. **Phản hồi tức thì**: Báo cáo lập tức xuất hiện trên bản đồ với huy hiệu "Cộng đồng vừa báo" để cảnh báo các tài xế khác tránh khu vực đó.

---

## 2. Tiêu Chí Thiết Kế Giao Diện (UI/UX Excellence)
- Nút bấm lớn " Báo Ngập Tại Đây" nổi bật ở thanh công cụ chính.
- Giao diện Modal / Drawer dạng thẻ trượt trên di động cực kỳ mượt mà.
- Icon minh họa mức nước ngập sinh động, dễ hiểu cho mọi lứa tuổi (người già, người đi đường đều chọn được ngay).
- Cơ chế bảo vệ chống spam: Giới hạn tần suất gửi theo IP/Client ID (tối đa 1 báo cáo / 2 phút / người dùng), không yêu cầu Captcha gây phiền toái.

---

## 3. Đặc Tả Yêu Cầu Chức Năng (EARS Notation)

### 3.1 Mở Form Báo Cáo
- **WHEN** người dùng bấm nút "Báo Ngập Tại Đây" **THE SYSTEM SHALL** mở form báo ngập và tự động điền tọa độ GPS hiện tại kèm tên đường/khu vực gần đúng.
- **WHEN** người dùng kéo chấm ghim vị trí trên bản đồ **THE SYSTEM SHALL** cập nhật tọa độ điểm báo cáo theo vị trí ghim mới.

### 3.2 Chọn Mức Độ Ngập Trực Quan
- **WHEN** người dùng chọn 1 trong 4 mức ngập:
  - 🟢 Mức 1: Mắt cá chân (~10 - 20cm - Xe đi chậm)
  - 🟡 Mức 2: Đến đầu gối (~20 - 45cm - Xe máy chết máy)
  - 🟠 Mức 3: Ngang hông / Yên xe (~45 - 75cm - Ô tô con không đi được)
  - 🔴 Mức 4: Chìm nửa xe / Lút nóc (> 75cm - Nguy hiểm tính mạng)
  **THE SYSTEM SHALL** đổi màu sắc nổi bật và cập nhật thông số ước tính tương ứng.

### 3.3 Gửi Báo Cáo & Hiển Thị Lên Bản Đồ
- **WHEN** người dùng bấm "Gửi Báo Cáo" **THE SYSTEM SHALL**:
  1. Kiểm tra ràng buộc khoảng cách địa lý (Geofencing): Vị trí báo cáo không được cách vị trí GPS thực tế của thiết bị quá 20km.
  2. Kiểm tra tần suất gửi (Rate-limiting Cooldown): Mỗi thiết bị chỉ được gửi 1 báo cáo trong vòng 3 phút (lưu vết Client Token trong LocalStorage).
  3. Gửi bản ghi vào bảng `community_reports` trên cơ sở dữ liệu Supabase với trạng thái `PENDING` (Chờ cộng đồng xác minh).
  4. Hiển thị thông báo "Báo ngập thành công. Cảm ơn đóng góp của bạn!".

### 3.4 Cơ Chế Xác Thực Cộng Đồng (Community Consensus Voting)
- **WHEN** người dùng xem một điểm báo ngập của cộng đồng **THE SYSTEM SHALL** cung cấp 2 nút bình chọn nhanh 1 chạm:
  - Nút "👍 Đúng ngập (+1)": Tăng chỉ số xác thực `upvote_count`.
  - Nút "👎 Đã rút / Báo sai (-1)": Tăng chỉ số bác bỏ `downvote_count`.
- **WHEN** số lượt `upvote_count` >= 2 **THE SYSTEM SHALL** tự động thăng hạng điểm ngập sang trạng thái `VERIFIED` (Huy hiệu xanh: "Cộng đồng đã xác thực").
- **WHEN** số lượt `downvote_count` >= 2 **THE SYSTEM SHALL** tự động đánh dấu `REJECTED` và ẩn điểm ngập khỏi bản đồ công cộng.
- **WHEN** điểm báo ngập đã tồn tại > 2 giờ mà không nhận thêm lượt xác nhận **THE SYSTEM SHALL** tự động đánh dấu hết hạn (Auto-decay) và ẩn khỏi bản đồ để bảo đảm thông tin luôn tươi mới.

---

## 4. Dữ Liệu & Hợp Đồng Giao Tiếp
- Bảng cơ sở dữ liệu Supabase: `community_reports`
  - `id`: UUID
  - `latitude`, `longitude`: Tọa độ vị trí
  - `location_address`: Tên địa điểm / tuyến phố
  - `water_depth_cm`: Độ sâu ước tính (cm)
  - `water_status`: 'rising' | 'stable' | 'receding'
  - `description`: Ghi chú tình trạng giao thông
  - `verification_status`: 'unverified' (mặc định hiển thị badge cộng đồng)
  - `created_at`: Thời gian gửi

---

## 5. Tiêu Chí Thành Công
- Thời gian từ lúc mở form đến khi gửi xong < 15 giây.
- 0 rào cản truy cập: Không bắt đăng ký tài khoản, không yêu cầu OTP SMS.
- Hoạt động mượt mà trên 100% trình duyệt điện thoại (Safari iOS, Chrome Android, Zalo browser).
