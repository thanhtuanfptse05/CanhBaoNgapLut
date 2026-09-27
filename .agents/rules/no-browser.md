# NO-BROWSER RULE — CẤM MỞ TRÌNH DUYỆT TEST

## MANDATORY CONSTRAINT
- **TUYỆT ĐỐI CẤM** gọi công cụ `browser_subagent` hoặc bất kỳ công cụ tương tác trình duyệt tự động nào để mở trình duyệt, mở tab, hay test UI.
- Người dùng sẽ tự mở và trải nghiệm ứng dụng trên trình duyệt của họ.
- Mọi khâu kiểm thử chỉ được thực hiện qua:
  1. Terminal test suites: `npm test`, `node --test`
  2. Static analysis / syntax validation qua shell
  3. API testing trực tiếp qua `curl` hoặc Node.js script.
