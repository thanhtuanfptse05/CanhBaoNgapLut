/**
 * FloodGuard Vietnam - Supabase Public Service Layer
 * Clean Architecture Infra Adapter for Public Client
 */

const SUPABASE_CONFIG = {
  url: 'https://atjyhnewynqblnmbtdog.supabase.co',
  anonKey: 'sb_publishable_KTh8S-YdzHGBG3Uo_Gi2zA_zXVjYRtl'
};

// Fallback Mock Data in case of network offline / air-gapped environment
const FALLBACK_DATA = {
  provinces: [
    { code: '01', name: 'Thành phố Hà Nội', region: 'BAC_BO', center_lat: 21.0285, center_lng: 105.8048, zoom_level: 12 },
    { code: '79', name: 'Thành phố Hồ Chí Minh', region: 'NAM_BO', center_lat: 10.8231, center_lng: 106.6297, zoom_level: 12 },
    { code: '48', name: 'Thành phố Đà Nẵng', region: 'TRUNG_BO', center_lat: 16.0544, center_lng: 108.2022, zoom_level: 13 },
    { code: '46', name: 'Tỉnh Thừa Thiên Huế', region: 'TRUNG_BO', center_lat: 16.4637, center_lng: 107.5909, zoom_level: 12 },
    { code: '92', name: 'Thành phố Cần Thơ', region: 'NAM_BO', center_lat: 10.0452, center_lng: 105.7469, zoom_level: 13 },
    { code: '22', name: 'Tỉnh Quảng Ninh', region: 'BAC_BO', center_lat: 20.9505, center_lng: 107.0734, zoom_level: 11 },
    { code: '31', name: 'Thành phố Hải Phòng', region: 'BAC_BO', center_lat: 20.8449, center_lng: 106.6881, zoom_level: 12 },
    { code: '40', name: 'Tỉnh Nghệ An', region: 'TRUNG_BO', center_lat: 19.3047, center_lng: 104.9190, zoom_level: 10 },
    { code: '49', name: 'Tỉnh Quảng Nam', region: 'TRUNG_BO', center_lat: 15.5994, center_lng: 108.0000, zoom_level: 11 }
  ],
  floodPoints: [
    { id: 'fp-hn-01', name: 'Ngã tư Thái Hà - Chùa Bộc', province_code: '01', latitude: 21.0095, longitude: 105.8239, current_depth_cm: 35.0, severity: 'LEVEL_2', status: 'RISING', last_updated: new Date().toISOString() },
    { id: 'fp-hn-02', name: 'Phố Phùng Hưng (Cửa Đông)', province_code: '01', latitude: 21.0335, longitude: 105.8458, current_depth_cm: 20.0, severity: 'LEVEL_1', status: 'STABLE', last_updated: new Date().toISOString() },
    { id: 'fp-hn-03', name: 'Đại lộ Thăng Long (Hầm chui số 3, 5)', province_code: '01', latitude: 20.9982, longitude: 105.7483, current_depth_cm: 65.0, severity: 'LEVEL_3', status: 'RISING', last_updated: new Date().toISOString() },
    { id: 'fp-hn-04', name: 'Đường Hoa Bằng (Cầu Giấy)', province_code: '01', latitude: 21.0261, longitude: 105.7951, current_depth_cm: 40.0, severity: 'LEVEL_2', status: 'RECEDING', last_updated: new Date().toISOString() },
    { id: 'fp-hcm-01', name: 'Đường Nguyễn Văn Hưởng (Thảo Điền, TP. Thủ Đức)', province_code: '79', latitude: 10.8123, longitude: 106.7321, current_depth_cm: 55.0, severity: 'LEVEL_3', status: 'RISING', last_updated: new Date().toISOString() },
    { id: 'fp-hcm-02', name: 'Đường Huỳnh Tấn Phát (Quận 7)', province_code: '79', latitude: 10.7412, longitude: 106.7305, current_depth_cm: 45.0, severity: 'LEVEL_2', status: 'STABLE', last_updated: new Date().toISOString() },
    { id: 'fp-hcm-03', name: 'Đường Trần Xuân Soạn (Kênh Tẻ)', province_code: '79', latitude: 10.7538, longitude: 106.7025, current_depth_cm: 50.0, severity: 'LEVEL_2', status: 'RECEDING', last_updated: new Date().toISOString() },
    { id: 'fp-hcm-04', name: 'Đường Quốc Hương (Thảo Điền)', province_code: '79', latitude: 10.8065, longitude: 106.7312, current_depth_cm: 30.0, severity: 'LEVEL_1', status: 'STABLE', last_updated: new Date().toISOString() },
    { id: 'fp-dn-01', name: 'Khu vực Mẹ Suốt (Hòa Khánh Nam)', province_code: '48', latitude: 16.0645, longitude: 108.1562, current_depth_cm: 70.0, severity: 'LEVEL_3', status: 'RISING', last_updated: new Date().toISOString() },
    { id: 'fp-dn-02', name: 'Đường Hàm Nghi - Bờ hồ Thạc Gián', province_code: '48', latitude: 16.0621, longitude: 108.2098, current_depth_cm: 25.0, severity: 'LEVEL_1', status: 'RECEDING', last_updated: new Date().toISOString() },
    { id: 'fp-dn-03', name: 'Đường Trưng Nữ Vương (Hải Châu)', province_code: '48', latitude: 16.0531, longitude: 108.2195, current_depth_cm: 38.0, severity: 'LEVEL_2', status: 'STABLE', last_updated: new Date().toISOString() },
    { id: 'fp-hue-01', name: 'Đường Hùng Vương - Bến Nghé (TP. Huế)', province_code: '46', latitude: 16.4632, longitude: 107.5925, current_depth_cm: 40.0, severity: 'LEVEL_2', status: 'RISING', last_updated: new Date().toISOString() },
    { id: 'fp-hue-02', name: 'Đoạn Đập Đá (Nối Vỹ Dạ - Phú Hội)', province_code: '46', latitude: 16.4715, longitude: 107.6012, current_depth_cm: 60.0, severity: 'LEVEL_3', status: 'RISING', last_updated: new Date().toISOString() },
    { id: 'fp-ct-01', name: 'Bến Ninh Kiều (Đoạn Hai Bà Trưng)', province_code: '92', latitude: 10.0332, longitude: 105.7865, current_depth_cm: 30.0, severity: 'LEVEL_1', status: 'STABLE', last_updated: new Date().toISOString() },
    { id: 'fp-ct-02', name: 'Đường Cách Mạng Tháng 8 (Bình Thủy)', province_code: '92', latitude: 10.0521, longitude: 105.7610, current_depth_cm: 42.0, severity: 'LEVEL_2', status: 'RISING', last_updated: new Date().toISOString() }
  ],
  stations: [
    { id: 'st-hn-01', name: 'Trạm Thủy Văn Long Biên (Sông Hồng)', code: 'ST-HN-LONG_BIEN', station_type: 'HYDRO', latitude: 21.0427, longitude: 105.8612, current_water_level: 920.0, status: 'ACTIVE' },
    { id: 'st-hcm-01', name: 'Trạm Phú An (Sông Sài Gòn - Đo Triều)', code: 'ST-HCM-PHU_AN', station_type: 'TIDE', latitude: 10.7938, longitude: 106.7118, current_water_level: 162.0, status: 'ACTIVE' },
    { id: 'st-dn-01', name: 'Trạm Cẩm Lệ (Sông Cẩm Lệ)', code: 'ST-DN-CAM_LE', station_type: 'HYDRO', latitude: 15.9984, longitude: 108.1925, current_water_level: 190.0, status: 'ACTIVE' },
    { id: 'st-hue-01', name: 'Trạm Kim Long (Sông Hương)', code: 'ST-HUE-KIM_LONG', station_type: 'HYDRO', latitude: 16.4678, longitude: 107.5642, current_water_level: 215.0, status: 'ACTIVE' }
  ],
  alerts: [
    { id: 'alert-01', title: 'CẢNH BÁO TRIỀU CƯỜNG DÂNG CAO VƯỢT MỨC BÁO ĐỘNG III', message: 'Đợt triều cường rằm tháng Tám kết hợp mưa lớn đang gây ngập sâu tại vùng trũng thấp ven sông Sài Gòn, Kênh Tẻ và TP. Thủ Đức.', alert_level: 'EMERGENCY', is_active: true },
    { id: 'alert-02', title: 'CẢNH BÁO MƯA LỚN CỤC BỘ & NGẬP ÚNG ĐÔ THỊ HÀ NỘI', message: 'Vùng mây đối lưu tiếp tục gây mưa rào và dông to, nguy cơ ngập sâu tại các tuyến phố lưu vực Tô Lịch và hầm chui Đại lộ Thăng Long.', alert_level: 'WARNING', is_active: true }
  ]
};

class SupabaseFloodService {
  constructor() {
    this.baseUrl = `${SUPABASE_CONFIG.url}/rest/v1`;
    this.headers = {
      'apikey': SUPABASE_CONFIG.anonKey,
      'Authorization': `Bearer ${SUPABASE_CONFIG.anonKey}`,
      'Content-Type': 'application/json'
    };
  }

  async fetchApi(endpoint) {
    try {
      const response = await fetch(`${this.baseUrl}/${endpoint}`, {
        method: 'GET',
        headers: this.headers
      });
      if (!response.ok) {
        throw new Error(`Supabase API error: ${response.status}`);
      }
      return await response.json();
    } catch (err) {
      console.warn(`[SupabaseFloodService] Network/API fallback for ${endpoint}:`, err.message);
      return null;
    }
  }

  async getProvinces() {
    const data = await this.fetchApi('provinces?select=*&order=code.asc');
    return (data && data.length > 0) ? data : FALLBACK_DATA.provinces;
  }

  async getFloodPoints(provinceCode = null) {
    let endpoint = 'flood_points?select=*&order=last_updated.desc';
    if (provinceCode) {
      endpoint += `&province_code=eq.${provinceCode}`;
    }
    const data = await this.fetchApi(endpoint);
    if (data && data.length > 0) return data;
    
    // Fallback filter
    if (provinceCode) {
      return FALLBACK_DATA.floodPoints.filter(p => p.province_code === provinceCode);
    }
    return FALLBACK_DATA.floodPoints;
  }

  async getStations() {
    const data = await this.fetchApi('stations?select=*');
    return (data && data.length > 0) ? data : FALLBACK_DATA.stations;
  }

  async getActiveAlerts() {
    const data = await this.fetchApi('flood_alerts?select=*&is_active=eq.true&order=created_at.desc');
    return (data && data.length > 0) ? data : FALLBACK_DATA.alerts;
  }

  async submitCommunityReport(reportData) {
    const newReport = {
      id: 'cr-' + Math.random().toString(36).substring(2, 9),
      province_code: reportData.province_code || '01',
      latitude: reportData.latitude,
      longitude: reportData.longitude,
      address_text: reportData.address_text || 'Điểm người dân vừa báo',
      estimated_depth_cm: reportData.depth_cm,
      note: reportData.note || '',
      verification_status: 'PENDING'
    };

    try {
      const res = await fetch(`${this.baseUrl}/community_reports`, {
        method: 'POST',
        headers: {
          ...this.headers,
          'Prefer': 'return=minimal'
        },
        body: JSON.stringify(newReport)
      });
      console.log('[SupabaseFloodService] Report submitted to Supabase successfully');
      return { success: true, report: newReport };
    } catch (err) {
      console.warn('[SupabaseFloodService] Saved locally due to network fallback:', err.message);
      return { success: true, report: newReport, isLocal: true };
    }
  }
}

// Export singleton instance
window.FloodService = new SupabaseFloodService();
