# ADR-001: Lựa Chọn Clean Architecture & Hybrid SDD cho Hệ Thống Cảnh Báo Ngập

## Status: Accepted
Date: 2026-09-27

## Context
Dự án Web Cảnh Báo Ngập Lụt yêu cầu tính ổn định cao, dữ liệu địa lý thời gian thực, dễ mở rộng thêm các loại cảm biến mới và giao diện trực quan cho người dùng.

## Decision
- Áp dụng Clean Architecture (Domain - Usecase - Interface - Infra) để tách biệt hoàn toàn core logic khỏi UI và framework.
- Áp dụng Hybrid SDD (Spec-Driven + Agent-Driven Development) để đảm bảo chất lượng kỹ thuật, có tài liệu đặc tả chặt chẽ cho các thuật toán đánh giá rủi ro ngập.

## Consequences
- Tăng tính tin cậy, code có cấu trúc chuẩn, dễ kiểm thử tự động.
- Cần tuân thủ kỷ luật spec trước khi triển khai code.
