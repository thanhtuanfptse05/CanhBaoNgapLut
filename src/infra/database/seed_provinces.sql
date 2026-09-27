-- =============================================================================
-- SAMPLE SEED DATA: CÁC TỈNH/THÀNH PHỐ VÀ TRẠM QUAN TRẮC TRỌNG ĐIỂM
-- =============================================================================

-- 1. Insert Tỉnh / Thành Phố Đại Diện
INSERT INTO provinces (code, name, slug, region, center_lat, center_lng, zoom_level) VALUES
('01', 'Thành phố Hà Nội', 'ha-noi', 'BAC_BO', 21.028511, 105.804817, 12),
('79', 'Thành phố Hồ Chí Minh', 'ho-chi-minh', 'NAM_BO', 10.823099, 106.629664, 12),
('48', 'Thành phố Đà Nẵng', 'da-nang', 'TRUNG_BO', 16.054407, 108.202167, 13),
('46', 'Tỉnh Thừa Thiên Huế', 'thua-thien-hue', 'TRUNG_BO', 16.463713, 107.590866, 12),
('92', 'Thành phố Cần Thơ', 'can-tho', 'NAM_BO', 10.045162, 105.746857, 13),
('22', 'Tỉnh Quảng Ninh', 'quang-ninh', 'BAC_BO', 20.950454, 107.073364, 11),
('31', 'Thành phố Hải Phòng', 'hai-phong', 'BAC_BO', 20.844912, 106.688084, 12),
('40', 'Tỉnh Nghệ An', 'nghe-an', 'TRUNG_BO', 19.304675, 104.918987, 10),
('49', 'Tỉnh Quảng Nam', 'quang-nam', 'TRUNG_BO', 15.599438, 108.000000, 11)
ON CONFLICT (code) DO NOTHING;

-- 2. Insert Lưu Vực Sông Chính
INSERT INTO river_basins (id, code, name, description) VALUES
('basin-01', 'SONG_HONG', 'Lưu vực sông Hồng - sông Thái Bình', 'Hệ thống sông lớn nhất miền Bắc'),
('basin-02', 'SONG_HUONG', 'Lưu vực sông Hương', 'Hệ thống sông trọng điểm tỉnh Thừa Thiên Huế'),
('basin-03', 'SONG_VU_GIA_THU_BON', 'Lưu vực sông Vu Gia - Thu Bồn', 'Hệ thống sông ảnh hưởng trực tiếp đến Đà Nẵng và Quảng Nam'),
('basin-04', 'SONG_DONG_NAI', 'Lưu vực sông Đồng Nai - Sài Gòn', 'Ảnh hưởng vùng đô thị TP.HCM và Đông Nam Bộ'),
('basin-05', 'SONG_MEKONG', 'Lưu vực sông Cửu Long', 'Ảnh hưởng toàn vùng Đồng bằng sông Cửu Long')
ON CONFLICT (code) DO NOTHING;

-- 3. Insert Trạm Quan Trắc Tiêu Biểu
INSERT INTO stations (id, code, name, station_type, province_code, river_basin_id, latitude, longitude, elevation_m, status) VALUES
('st-hn-01', 'ST-HN-LONG_BIEN', 'Trạm Thủy Văn Long Biên (Sông Hồng)', 'HYDRO', '01', 'basin-01', 21.0427, 105.8612, 12.5, 'ACTIVE'),
('st-hcm-01', 'ST-HCM-PHU_AN', 'Trạm Phú An (Sông Sài Gòn - Đo Triều)', 'TIDE', '79', 'basin-04', 10.7938, 106.7118, 1.2, 'ACTIVE'),
('st-dn-01', 'ST-DN-CAM_LE', 'Trạm Cẩm Lệ (Sông Cẩm Lệ)', 'HYDRO', '48', 'basin-03', 15.9984, 108.1925, 2.8, 'ACTIVE'),
('st-hue-01', 'ST-HUE-KIM_LONG', 'Trạm Kim Long (Sông Hương)', 'HYDRO', '46', 'basin-02', 16.4678, 107.5642, 3.5, 'ACTIVE')
ON CONFLICT (code) DO NOTHING;

-- 4. Insert Ngưỡng Báo Động
INSERT INTO station_thresholds (id, station_id, level_1_alert, level_2_alert, level_3_alert, danger_level) VALUES
('th-hn-01', 'st-hn-01', 950.0, 1050.0, 1150.0, 1340.0), -- cm trên mực nước chuẩn
('th-hcm-01', 'st-hcm-01', 140.0, 150.0, 160.0, 175.0),  -- cm triều cường
('th-dn-01', 'st-dn-01', 100.0, 180.0, 250.0, 320.0),
('th-hue-01', 'st-hue-01', 100.0, 200.0, 350.0, 420.0)
ON CONFLICT (station_id) DO NOTHING;
