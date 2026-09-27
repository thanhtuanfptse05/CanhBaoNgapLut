# MANDATORY RULE: SPEC-FIRST & CI/CD WORKFLOW

## 1. QUY TẮC BẮT BUỘC: SPEC-FIRST QUA SPECKIT SKILLS
- **Trước khi viết bất kỳ dòng code nào**: BẮT BUỘC phải sử dụng các skills của `speckit` (`speckit-specify`, `speckit-plan`, `speckit-tasks`) để tạo hoặc cập nhật tài liệu đặc tả trong thư mục `.sdd/specs/feat-{name}/`.
- **Nghiêm cấm**: Tuyệt đối không được phép viết code trực tiếp trong `src/` khi chưa có file `SPEC.md` và `TASKS.md` được tạo/cập nhật thông qua quy trình của Spec Kit.

## 2. QUY TẮC BẮT BUỘC: SỬA SPEC TRƯỚC KHI SỬA CODE (ZERO SPEC-CODE DRIFT)
- Khi có bất kỳ thay đổi nào về logic nghiệp vụ, sửa đổi API contract, refactor kiến trúc, hoặc sửa lỗi (bug fix):
  1. **Bước 1**: Mở và cập nhật file `SPEC.md` và `CHANGELOG.md` trong `.sdd/specs/feat-{name}/` (sử dụng skills của speckit hoặc cập nhật tương thích chuẩn EARS).
  2. **Bước 2**: Cập nhật `TASKS.md` để ghi nhận các hạng mục sửa đổi.
  3. **Bước 3**: CHỈ ĐƯỢC PHÉP sửa code trong `src/` sau khi spec đã được cập nhật chính xác.

## 3. QUY TẮC HOÀN THÀNH VÀ CI/CD (AUTO PUSH GITHUB)
- **Sau khi hoàn thành code/sửa code**:
  1. **Kiểm thử**: Chạy kiểm tra cú pháp, lint và unit tests đảm bảo không làm gãy vỡ hệ thống.
  2. **Cập nhật tiến độ**: Đánh dấu hoàn thành các task trong `plan.md` và `.sdd/specs/feat-{name}/TASKS.md`.
  3. **Git Commit**: Commit rõ ràng theo chuẩn Conventional Commits (ví dụ: `feat(spec): ...`, `feat(map): ...`, `fix(alert): ...`).
  4. **CI/CD Push**: Thực hiện `git push` lên GitHub repository `https://github.com/thanhtuanfptse05/CanhBaoNgapLut.git` ngay sau khi hoàn tất lượt việc.
