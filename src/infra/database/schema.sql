-- =============================================================================
-- HỆ THỐNG CẢNH BÁO NGẬP LỤT TOÀN QUỐC (VIỆT NAM) - DATABASE DDL SCHEMA
-- Compatible with: PostgreSQL 14+ / PostGIS (or standard SQL with minor types)
-- Coordinate Reference: WGS 84 (EPSG:4326)
-- =============================================================================

-- 1. BẢNG TỈNH / THÀNH PHỐ VIỆT NAM (63 Tỉnh/Thành)
CREATE TABLE IF NOT EXISTS provinces (
    code VARCHAR(10) PRIMARY KEY, -- Mã theo Tổng cục thống kê (01: Hà Nội, 79: TP.HCM, 48: Đà Nẵng)
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL UNIQUE,
    region VARCHAR(50) NOT NULL, -- 'BAC_BO', 'TRUNG_BO', 'NAM_BO', 'TAY_NGUYEN', v.v.
    center_lat NUMERIC(9, 6) NOT NULL,
    center_lng NUMERIC(9, 6) NOT NULL,
    zoom_level INTEGER DEFAULT 11,
    boundary_geojson JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. BẢNG QUẬN / HUYỆN / THỊ XÃ
CREATE TABLE IF NOT EXISTS districts (
    code VARCHAR(10) PRIMARY KEY,
    province_code VARCHAR(10) NOT NULL REFERENCES provinces(code) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(100) NOT NULL,
    center_lat NUMERIC(9, 6),
    center_lng NUMERIC(9, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. BẢNG PHƯỜNG / XÃ / THỊ TRẤN
CREATE TABLE IF NOT EXISTS communes (
    code VARCHAR(10) PRIMARY KEY,
    district_code VARCHAR(10) NOT NULL REFERENCES districts(code) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. BẢNG LƯU VỰC SÔNG
CREATE TABLE IF NOT EXISTS river_basins (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- 'SONG_HONG', 'SONG_MEKONG', 'SONG_DONG_NAI'
    name VARCHAR(150) NOT NULL,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. TRẠM QUAN TRẮC THỦY VĂN / ĐO MƯA / TRIỀU CƯỜNG
CREATE TABLE IF NOT EXISTS stations (
    id VARCHAR(36) PRIMARY KEY,
    code VARCHAR(50) NOT NULL UNIQUE, -- e.g., 'ST-HN-001'
    name VARCHAR(150) NOT NULL,
    station_type VARCHAR(30) NOT NULL CHECK (station_type IN ('HYDRO', 'RAIN', 'TIDE', 'COMBINED')),
    province_code VARCHAR(10) NOT NULL REFERENCES provinces(code),
    district_code VARCHAR(10) REFERENCES districts(code),
    river_basin_id VARCHAR(36) REFERENCES river_basins(id),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    elevation_m NUMERIC(7, 2), -- Cao trình trạm so với mực nước biển
    status VARCHAR(20) DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE', 'MAINTENANCE', 'OFFLINE')),
    install_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. NGƯỠNG CẢNH BÁO MỰC NƯỚC CỦA TRẠM
CREATE TABLE IF NOT EXISTS station_thresholds (
    id VARCHAR(36) PRIMARY KEY,
    station_id VARCHAR(36) NOT NULL UNIQUE REFERENCES stations(id) ON DELETE CASCADE,
    level_1_alert NUMERIC(7, 2) NOT NULL, -- Mức Báo động I (cm)
    level_2_alert NUMERIC(7, 2) NOT NULL, -- Mức Báo động II (cm)
    level_3_alert NUMERIC(7, 2) NOT NULL, -- Mức Báo động III (cm)
    danger_level NUMERIC(7, 2) NOT NULL,  -- Mức nguy hiểm đặc biệt (cm)
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. NHẬT KÝ ĐO MỰC NƯỚC (TIME-SERIES LOG)
CREATE TABLE IF NOT EXISTS water_level_logs (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(36) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    water_level_cm NUMERIC(7, 2) NOT NULL,
    flow_rate_m3s NUMERIC(10, 2),
    battery_percentage NUMERIC(5, 2),
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. NHẬT KÝ LƯỢNG MƯA
CREATE TABLE IF NOT EXISTS rainfall_logs (
    id BIGSERIAL PRIMARY KEY,
    station_id VARCHAR(36) NOT NULL REFERENCES stations(id) ON DELETE CASCADE,
    rainfall_mm NUMERIC(7, 2) NOT NULL,
    period_minutes INTEGER DEFAULT 60,
    recorded_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. ĐIỂM NGẬP LỤT THỜI GIAN THỰC (FLOOD POINTS)
CREATE TABLE IF NOT EXISTS flood_points (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(200) NOT NULL, -- Ví dụ: "Đường Nguyễn Văn Linh - Cầu Rồng"
    province_code VARCHAR(10) NOT NULL REFERENCES provinces(code),
    district_code VARCHAR(10) REFERENCES districts(code),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    current_depth_cm NUMERIC(6, 2) DEFAULT 0.0,
    severity VARCHAR(20) DEFAULT 'SAFE' CHECK (severity IN ('SAFE', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3')),
    cause VARCHAR(30) DEFAULT 'HEAVY_RAIN' CHECK (cause IN ('HEAVY_RAIN', 'HIGH_TIDE', 'RIVER_OVERFLOW', 'DAM_RELEASE')),
    status VARCHAR(20) DEFAULT 'STABLE' CHECK (status IN ('RISING', 'STABLE', 'RECEDING', 'CLEARED')),
    affected_radius_m INTEGER DEFAULT 100,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. BÁO CÁO NGẬP TỪ CỘNG ĐỒNG (CROWDSOURCING)
CREATE TABLE IF NOT EXISTS community_reports (
    id VARCHAR(36) PRIMARY KEY,
    flood_point_id VARCHAR(36) REFERENCES flood_points(id) ON DELETE SET NULL,
    province_code VARCHAR(10) REFERENCES provinces(code),
    reporter_name VARCHAR(100),
    reporter_phone VARCHAR(20),
    latitude NUMERIC(9, 6) NOT NULL,
    longitude NUMERIC(9, 6) NOT NULL,
    address_text VARCHAR(255) NOT NULL,
    estimated_depth_cm NUMERIC(6, 2),
    image_url VARCHAR(500),
    note TEXT,
    upvote_count INTEGER DEFAULT 0,
    downvote_count INTEGER DEFAULT 0,
    verification_status VARCHAR(20) DEFAULT 'PENDING' CHECK (verification_status IN ('PENDING', 'VERIFIED', 'REJECTED')),
    reported_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. SỰ KIỆN CẢNH BÁO THIÊN TAI / NGẬP LỤT
CREATE TABLE IF NOT EXISTS flood_alerts (
    id VARCHAR(36) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    alert_level VARCHAR(20) NOT NULL CHECK (alert_level IN ('WATCH', 'WARNING', 'EMERGENCY')),
    province_code VARCHAR(10) REFERENCES provinces(code),
    affected_polygon JSONB, -- GeoJSON lưu tọa độ vùng ảnh hưởng
    safety_instructions TEXT, -- Hướng dẫn an toàn, đường dây cứu hộ
    issued_by VARCHAR(100) DEFAULT 'Ban Chỉ Huy PCTT',
    is_active BOOLEAN DEFAULT TRUE,
    starts_at TIMESTAMP WITH TIME ZONE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. NGƯỜI DÙNG ĐĂNG KÝ NHẬN CẢNH BÁO (SUBSCRIPTIONS)
CREATE TABLE IF NOT EXISTS user_subscriptions (
    id VARCHAR(36) PRIMARY KEY,
    user_identifier VARCHAR(150) NOT NULL, -- FCM WebPush Token, Email, hoặc Số điện thoại
    channel VARCHAR(20) DEFAULT 'WEB_PUSH' CHECK (channel IN ('WEB_PUSH', 'TELEGRAM', 'SMS', 'EMAIL')),
    province_code VARCHAR(10) REFERENCES provinces(code),
    target_latitude NUMERIC(9, 6),
    target_longitude NUMERIC(9, 6),
    radius_km NUMERIC(5, 2) DEFAULT 5.0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- =============================================================================
-- INDEXES & PERFORMANCE OPTIMIZATION
-- =============================================================================

-- Indexes lọc theo địa phương
CREATE INDEX IF NOT EXISTS idx_districts_province ON districts(province_code);
CREATE INDEX IF NOT EXISTS idx_communes_district ON communes(district_code);
CREATE INDEX IF NOT EXISTS idx_stations_province ON stations(province_code);
CREATE INDEX IF NOT EXISTS idx_flood_points_province ON flood_points(province_code);

-- Indexes truy vấn thời gian thực cho cảm biến
CREATE INDEX IF NOT EXISTS idx_water_level_time ON water_level_logs(station_id, recorded_at DESC);
CREATE INDEX IF NOT EXISTS idx_rainfall_time ON rainfall_logs(station_id, recorded_at DESC);

-- Indexes tìm kiếm điểm ngập và cảnh báo đang hoạt động
CREATE INDEX IF NOT EXISTS idx_flood_points_status ON flood_points(province_code, status, severity);
CREATE INDEX IF NOT EXISTS idx_flood_alerts_active ON flood_alerts(is_active, starts_at, expires_at);
CREATE INDEX IF NOT EXISTS idx_community_reports_status ON community_reports(verification_status, reported_at DESC);
