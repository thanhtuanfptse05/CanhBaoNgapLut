"""
Seed Realtime Flood Points & Alerts into Supabase PostgreSQL
"""
import sys
from pathlib import Path

try:
    import psycopg
except ImportError:
    print("psycopg is needed")
    sys.exit(1)

def seed_realtime():
    project_id = "atjyhnewynqblnmbtdog"
    db_host = "aws-0-ap-northeast-1.pooler.supabase.com"
    db_port = 6543
    db_user = f"postgres.{project_id}"
    db_password = sys.argv[1] if len(sys.argv) > 1 else "@Caotuan2k5"
    db_name = "postgres"

    print("Connecting to Supabase PostgreSQL...")
    with psycopg.connect(
        host=db_host,
        port=db_port,
        user=db_user,
        password=db_password,
        dbname=db_name,
        sslmode="require",
        connect_timeout=15
    ) as conn:
        with conn.cursor() as cur:
            # 1. Enable RLS and public policies so anon key can read
            print("Configuring RLS policies for anonymous public access...")
            tables = ['provinces', 'river_basins', 'stations', 'station_thresholds', 'flood_points', 'flood_alerts', 'community_reports', 'water_level_logs']
            for t in tables:
                cur.execute(f"ALTER TABLE {t} ENABLE ROW LEVEL SECURITY;")
                cur.execute(f"DROP POLICY IF EXISTS public_read_{t} ON {t};")
                cur.execute(f"CREATE POLICY public_read_{t} ON {t} FOR SELECT USING (true);")
            
            # Allow public insert for community reports
            cur.execute("DROP POLICY IF EXISTS public_insert_community_reports ON community_reports;")
            cur.execute("CREATE POLICY public_insert_community_reports ON community_reports FOR INSERT WITH CHECK (true);")

            # 2. Insert Active Flood Points across Vietnam
            print("Seeding active flood points...")
            cur.execute("""
            INSERT INTO flood_points (id, name, province_code, latitude, longitude, current_depth_cm, severity, cause, status, affected_radius_m) VALUES
            -- Hà Nội
            ('fp-hn-01', 'Ngã tư Thái Hà - Chùa Bộc', '01', 21.0095, 105.8239, 35.0, 'LEVEL_2', 'HEAVY_RAIN', 'RISING', 150),
            ('fp-hn-02', 'Phố Phùng Hưng (Cửa Đông)', '01', 21.0335, 105.8458, 20.0, 'LEVEL_1', 'HEAVY_RAIN', 'STABLE', 100),
            ('fp-hn-03', 'Đại lộ Thăng Long (Hầm chui số 3, 5)', '01', 20.9982, 105.7483, 65.0, 'LEVEL_3', 'HEAVY_RAIN', 'RISING', 300),
            ('fp-hn-04', 'Đường Hoa Bằng (Cầu Giấy)', '01', 21.0261, 105.7951, 40.0, 'LEVEL_2', 'HEAVY_RAIN', 'RECEDING', 120),

            -- TP. Hồ Chí Minh
            ('fp-hcm-01', 'Đường Nguyễn Văn Hưởng (Thảo Điền, TP. Thủ Đức)', '79', 10.8123, 106.7321, 55.0, 'LEVEL_3', 'HIGH_TIDE', 'RISING', 250),
            ('fp-hcm-02', 'Đường Huỳnh Tấn Phát (Quận 7)', '79', 10.7412, 106.7305, 45.0, 'LEVEL_2', 'HIGH_TIDE', 'STABLE', 200),
            ('fp-hcm-03', 'Đường Trần Xuân Soạn (Kênh Tẻ)', '79', 10.7538, 106.7025, 50.0, 'LEVEL_2', 'HIGH_TIDE', 'RECEDING', 300),
            ('fp-hcm-04', 'Đường Quốc Hương (Thảo Điền)', '79', 10.8065, 106.7312, 30.0, 'LEVEL_1', 'HIGH_TIDE', 'STABLE', 150),

            -- Đà Nẵng
            ('fp-dn-01', 'Khu vực Mẹ Suốt (Hòa Khánh Nam)', '48', 16.0645, 108.1562, 70.0, 'LEVEL_3', 'HEAVY_RAIN', 'RISING', 400),
            ('fp-dn-02', 'Đường Hàm Nghi - Bờ hồ Thạc Gián', '48', 16.0621, 108.2098, 25.0, 'LEVEL_1', 'HEAVY_RAIN', 'RECEDING', 100),
            ('fp-dn-03', 'Đường Trưng Nữ Vương (Hải Châu)', '48', 16.0531, 108.2195, 38.0, 'LEVEL_2', 'HEAVY_RAIN', 'STABLE', 150),

            -- Thừa Thiên Huế
            ('fp-hue-01', 'Đường Hùng Vương - Bến Nghé (TP. Huế)', '46', 16.4632, 107.5925, 40.0, 'LEVEL_2', 'RIVER_OVERFLOW', 'RISING', 200),
            ('fp-hue-02', 'Đoạn Đập Đá (Nối Vỹ Dạ - Phú Hội)', '46', 16.4715, 107.6012, 60.0, 'LEVEL_3', 'RIVER_OVERFLOW', 'RISING', 180),

            -- Cần Thơ
            ('fp-ct-01', 'Bến Ninh Kiều (Đoạn Hai Bà Trưng)', '92', 10.0332, 105.7865, 30.0, 'LEVEL_1', 'HIGH_TIDE', 'STABLE', 120),
            ('fp-ct-02', 'Đường Cách Mạng Tháng 8 (Bình Thủy)', '92', 10.0521, 105.7610, 42.0, 'LEVEL_2', 'HIGH_TIDE', 'RISING', 180)
            ON CONFLICT (id) DO UPDATE SET
                current_depth_cm = EXCLUDED.current_depth_cm,
                severity = EXCLUDED.severity,
                status = EXCLUDED.status,
                last_updated = CURRENT_TIMESTAMP;
            """)

            # 3. Insert Active Flood Alerts
            print("Seeding active flood alerts...")
            cur.execute("""
            INSERT INTO flood_alerts (id, title, message, alert_level, province_code, safety_instructions, issued_by, is_active, starts_at, expires_at) VALUES
            ('alert-01', 'CẢNH BÁO TRIỀU CƯỜNG DÂNG CAO VƯỢT MỨC BÁO ĐỘNG III', 'Đợt triều cường rằm tháng Tám kết hợp mưa lớn đang gây ngập sâu tại vùng trũng thấp ven sông Sài Gòn, Kênh Tẻ và TP. Thủ Đức.', 'EMERGENCY', '79', 'Hạn chế di chuyển vào các tuyến đường ngập sâu >50cm. Chú ý nguy cơ rò rỉ điện, cẩn thận nắp cống hở. Gọi 114 khi cần cứu nạn.', 'Ban Chỉ Huy PCTT TP.HCM', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '24 hours'),
            ('alert-02', 'CẢNH BÁO MƯA LỚN CỤC BỘ & NGẬP ÚNG ĐÔ THỊ HÀ NỘI', 'Vùng mây đối lưu tiếp tục gây mưa rào và dông to, nguy cơ ngập sâu tại các tuyến phố lưu vực Tô Lịch và hầm chui Đại lộ Thăng Long.', 'WARNING', '01', 'Các phương tiện xe gầm thấp chủ động chuyển hướng di chuyển. Tránh trú mưa dưới các cây lớn và cột điện cao thế.', 'Trung tâm Khí tượng Thủy văn Quốc gia', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '12 hours'),
            ('alert-03', 'BÁO ĐỘNG LŨ TRÊN SÔNG HƯƠNG ĐẠT MỨC BÁO ĐỘNG II', 'Mực nước sông Hương tại trạm Kim Long đang lên nhanh do xả điều tiết hồ chứa Tả Trạch và mưa thượng nguồn.', 'WARNING', '46', 'Người dân vùng trũng ven sông chủ động kê cao tài sản, không neo đậu thuyền bè nơi dòng chảy xiết.', 'Ban Chỉ Huy PCTT Tỉnh TT-Huế', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP + INTERVAL '18 hours')
            ON CONFLICT (id) DO UPDATE SET
                title = EXCLUDED.title,
                message = EXCLUDED.message,
                alert_level = EXCLUDED.alert_level,
                is_active = EXCLUDED.is_active;
            """)

            # 4. Insert Community Sample Reports
            print("Seeding sample community reports...")
            cur.execute("""
            INSERT INTO community_reports (id, province_code, reporter_name, reporter_phone, latitude, longitude, address_text, estimated_depth_cm, note, verification_status) VALUES
            ('cr-01', '01', 'Nguyễn Văn Minh (Tài xế công nghệ)', '0901***456', 21.0112, 105.8210, 'Phố Chùa Bộc đoạn gần ngã tư Thái Hà', 35.0, 'Đang ngập đến nửa bánh xe, nhiều xe ga chết máy, bà con nên đi vòng qua Tây Sơn.', 'VERIFIED'),
            ('cr-02', '79', 'Trần Thị Thuỷ (Người dân Thảo Điền)', '0912***789', 10.8089, 106.7335, 'Đầu đường Quốc Hương, P. Thảo Điền', 45.0, 'Nước triều dâng ngập vào hiên nhà, đường ngập sâu xe ô tô nhỏ không qua được.', 'VERIFIED'),
            ('cr-03', '48', 'Lê Hùng (Người dân)', '0988***112', 16.0650, 108.1570, 'Kiệt 127 Mẹ Suốt, Hòa Khánh Nam', 65.0, 'Nước tràn từ đồi xuống rất nhanh, nước đang ngang bụng người lớn, cần hỗ trợ di dời.', 'VERIFIED')
            ON CONFLICT (id) DO NOTHING;
            """)

            conn.commit()
            print(" Seeded active flood points, alerts and community reports successfully!")

if __name__ == "__main__":
    seed_realtime()
