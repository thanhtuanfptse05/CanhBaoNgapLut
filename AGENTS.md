# AGENTS.md — Root Level Context
> Tham chiếu chi tiết: [.agents/AGENTS.md](file:///.agents/AGENTS.md) và [.sdd/constitution.md](file:///.sdd/constitution.md)

Project: Web Cảnh Báo Ngập Lụt
Architecture: Clean Architecture + Spec-Driven Development (SDD)
Specs directory: `.sdd/specs/`
Constraints: `.sdd/constraints/`

## MANDATORY WORKFLOW RULES:
1. **Spec-First**: BẮT BUỘC dùng skill của speckit để viết đặc tả (`SPEC.md`) trước khi viết code.
2. **Zero-Drift**: Khi sửa code, BẮT BUỘC phải sửa đặc tả (`SPEC.md`, `CHANGELOG.md`) trước khi sửa code.
3. **CI/CD**: Hoàn thành code và test xong BẮT BUỘC phải commit và push code lên GitHub repository (`origin main`).
4. **NO BROWSER TESTING**: TUYỆT ĐỐI CẤM mở trình duyệt (`browser_subagent`) để test. Chỉ kiểm thử qua terminal/unit test (`npm test`).
