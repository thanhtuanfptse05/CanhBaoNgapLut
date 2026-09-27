# Safety Constraints & Agent Guardrails

- Không chỉnh sửa trực tiếp dữ liệu môi trường production.
- Không hardcode các endpoint bí mật hay key dịch vụ bản đồ (Mapbox/Google Maps/OpenStreetMap).
- Kiểm tra rate limit đối với các request polling dữ liệu ngập thời gian thực.
