/**
 * FloodGuard Vietnam - Application Controller & GIS Map Engine
 * Handles Leaflet Map rendering, Realtime UI state, Geolocation, and Modals
 */

class FloodApp {
  constructor() {
    this.map = null;
    this.markersLayer = null;
    this.userLocationMarker = null;
    this.provinces = [];
    this.floodPoints = [];
    this.stations = [];
    this.currentFilter = 'all';
    this.selectedProvince = 'all';
    this.selectedDepth = 35; // Default for community report
    this.tileLayers = {};
    this.currentTile = 'dark';
  }

  async init() {
    this.initMap();
    this.setupEventListeners();
    await this.loadInitialData();
  }

  initMap() {
    // Default center on Vietnam
    this.map = L.map('map-viewport', {
      center: [16.0471, 107.8385],
      zoom: 6,
      zoomControl: false,
      attributionControl: false
    });

    // Custom Zoom control placed bottom right
    L.control.zoom({ position: 'bottomright' }).addTo(this.map);

    // CartoDB Dark Matter base layer
    this.tileLayers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      maxZoom: 19,
      subdomains: 'abcd'
    }).addTo(this.map);

    // OpenStreetMap standard layer (alternative)
    this.tileLayers.light = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19
    });

    this.markersLayer = L.layerGroup().addTo(this.map);
  }

  async loadInitialData() {
    try {
      const [provinces, floodPoints, stations, alerts] = await Promise.all([
        window.FloodService.getProvinces(),
        window.FloodService.getFloodPoints(),
        window.FloodService.getStations(),
        window.FloodService.getActiveAlerts()
      ]);

      this.provinces = provinces;
      this.floodPoints = floodPoints;
      this.stations = stations;

      this.populateProvinceSelect();
      this.renderEmergencyBanner(alerts);
      this.renderMarkers();
      this.updateHeaderStats();
    } catch (e) {
      console.error('Error loading initial data:', e);
    }
  }

  populateProvinceSelect() {
    const select = document.getElementById('province-select');
    if (!select) return;

    select.innerHTML = '<option value="all">🇻🇳 Toàn quốc (63 Tỉnh/Thành)</option>';
    this.provinces.forEach(p => {
      const opt = document.createElement('option');
      opt.value = p.code;
      opt.textContent = p.name;
      select.appendChild(opt);
    });
  }

  renderEmergencyBanner(alerts) {
    const banner = document.getElementById('emergency-banner');
    const textEl = document.getElementById('emergency-text');
    if (!banner || !textEl) return;

    if (alerts && alerts.length > 0) {
      const topAlert = alerts[0];
      textEl.innerHTML = `<strong>[${topAlert.alert_level === 'EMERGENCY' ? 'KHẨN CẤP' : 'CẢNH BÁO'}]</strong> ${topAlert.title}: ${topAlert.message}`;
      banner.classList.remove('collapsed');
    } else {
      banner.classList.add('collapsed');
    }
  }

  updateHeaderStats() {
    const activePointsEl = document.getElementById('stat-active-points');
    const deepestPointEl = document.getElementById('stat-deepest-point');

    if (activePointsEl) {
      activePointsEl.textContent = this.floodPoints.length;
    }

    if (deepestPointEl && this.floodPoints.length > 0) {
      const maxPoint = [...this.floodPoints].sort((a, b) => b.current_depth_cm - a.current_depth_cm)[0];
      deepestPointEl.textContent = `${maxPoint.current_depth_cm}cm`;
    }
  }

  renderMarkers() {
    this.markersLayer.clearLayers();

    // 1. Render Flood Points
    this.floodPoints.forEach(pt => {
      if (this.currentFilter !== 'all' && this.currentFilter !== 'stations') {
        if (this.currentFilter === 'level3' && pt.severity !== 'LEVEL_3') return;
        if (this.currentFilter === 'level2' && pt.severity !== 'LEVEL_2') return;
        if (this.currentFilter === 'level1' && pt.severity !== 'LEVEL_1') return;
      }
      if (this.currentFilter === 'stations') return; // Skip flood points if filter is stations only

      const marker = this.createFloodMarker(pt);
      marker.addTo(this.markersLayer);
    });

    // 2. Render Hydro Stations
    if (this.currentFilter === 'all' || this.currentFilter === 'stations') {
      this.stations.forEach(st => {
        const marker = this.createStationMarker(st);
        marker.addTo(this.markersLayer);
      });
    }
  }

  createFloodMarker(point) {
    let color = '#f59e0b';
    let label = '1';
    let pulseAnim = '';

    if (point.severity === 'LEVEL_3') {
      color = '#ef4444';
      label = '!';
      pulseAnim = 'style="animation: marker-ripple 1.5s infinite;"';
    } else if (point.severity === 'LEVEL_2') {
      color = '#f97316';
      label = '2';
      pulseAnim = 'style="animation: marker-ripple 2.2s infinite;"';
    }

    const iconHtml = `
      <div class="flood-pin-marker">
        <div class="flood-pin-glow" style="background-color: ${color};" ${pulseAnim}></div>
        <div class="flood-pin-core" style="background-color: ${color};">
          ${Math.round(point.current_depth_cm)}
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'custom-flood-icon',
      iconSize: [32, 32],
      iconAnchor: [16, 16]
    });

    const marker = L.marker([point.latitude, point.longitude], { icon });

    // Water status translation
    let statusText = 'Đang dâng ⬆';
    let statusBg = 'rgba(239, 68, 68, 0.2)';
    let statusColor = '#f87171';
    if (point.status === 'RECEDING') {
      statusText = 'Đang rút ⬇';
      statusBg = 'rgba(16, 185, 129, 0.2)';
      statusColor = '#34d399';
    } else if (point.status === 'STABLE') {
      statusText = 'Đứng nước ⏸';
      statusBg = 'rgba(245, 158, 11, 0.2)';
      statusColor = '#fbbf24';
    }

    const popupHtml = `
      <div class="flood-popup-card">
        <div class="popup-title">🌊 ${point.name}</div>
        <div class="popup-depth-meter">
          <span class="depth-value" style="color: ${color}">${point.current_depth_cm}</span>
          <span class="depth-unit">cm (Độ sâu ngập)</span>
        </div>
        <div class="popup-badge" style="background: ${statusBg}; color: ${statusColor}">
          ${statusText}
        </div>
        <div class="popup-detail-row">
          <span>Khuyến cáo:</span>
          <strong>${point.current_depth_cm >= 50 ? 'Cấm xe qua lại' : point.current_depth_cm >= 30 ? 'Xe gầm thấp chú ý' : 'Đi chậm an toàn'}</strong>
        </div>
        <div class="popup-detail-row">
          <span>Cập nhật:</span>
          <span>${new Date(point.last_updated).toLocaleTimeString('vi-VN')}</span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    return marker;
  }

  createStationMarker(station) {
    const iconHtml = `
      <div class="flood-pin-marker">
        <div class="flood-pin-core" style="background-color: #00d2ff; border-radius: 8px;">
          📊
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'custom-station-icon',
      iconSize: [28, 28],
      iconAnchor: [14, 14]
    });

    const marker = L.marker([station.latitude, station.longitude], { icon });

    const popupHtml = `
      <div class="flood-popup-card">
        <div class="popup-title">📈 ${station.name}</div>
        <div class="popup-depth-meter">
          <span class="depth-value" style="color: #00d2ff">${station.current_water_level || '--'}</span>
          <span class="depth-unit">cm (Mực nước trạm)</span>
        </div>
        <div class="popup-badge" style="background: rgba(0, 210, 255, 0.15); color: #00d2ff">
          Trạm quan trắc tự động
        </div>
        <div class="popup-detail-row">
          <span>Mã trạm:</span>
          <strong>${station.code}</strong>
        </div>
        <div class="popup-detail-row">
          <span>Trạng thái trạm:</span>
          <span style="color: #34d399">● Hoạt động tốt</span>
        </div>
      </div>
    `;

    marker.bindPopup(popupHtml);
    return marker;
  }

  setupEventListeners() {
    // 1. Province Dropdown Select
    const provinceSelect = document.getElementById('province-select');
    if (provinceSelect) {
      provinceSelect.addEventListener('change', (e) => {
        const code = e.target.value;
        this.selectedProvince = code;
        if (code === 'all') {
          this.map.flyTo([16.0471, 107.8385], 6);
        } else {
          const prov = this.provinces.find(p => p.code === code);
          if (prov) {
            this.map.flyTo([prov.center_lat, prov.center_lng], prov.zoom_level || 12, { duration: 1.5 });
          }
        }
      });
    }

    // 2. Filter Chips
    const chips = document.querySelectorAll('.filter-chips .chip');
    chips.forEach(chip => {
      chip.addEventListener('click', () => {
        chips.forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        this.currentFilter = chip.dataset.filter;
        this.renderMarkers();
      });
    });

    // 3. Search Bar
    const searchInput = document.getElementById('search-input');
    if (searchInput) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase().trim();
        if (!query) {
          this.renderMarkers();
          return;
        }
        const matched = this.floodPoints.filter(p => p.name.toLowerCase().includes(query));
        this.markersLayer.clearLayers();
        matched.forEach(pt => this.createFloodMarker(pt).addTo(this.markersLayer));
        if (matched.length > 0) {
          this.map.flyTo([matched[0].latitude, matched[0].longitude], 14);
        }
      });
    }

    // 4. GPS My Location Button
    const gpsBtn = document.getElementById('btn-gps');
    if (gpsBtn) {
      gpsBtn.addEventListener('click', () => this.handleGPSLocation());
    }

    // 5. Layer Tile Switcher
    const layerBtn = document.getElementById('btn-toggle-layer');
    if (layerBtn) {
      layerBtn.addEventListener('click', () => {
        if (this.currentTile === 'dark') {
          this.map.removeLayer(this.tileLayers.dark);
          this.map.addLayer(this.tileLayers.light);
          this.currentTile = 'light';
          this.showToast('Đã chuyển sang Bản đồ sáng');
        } else {
          this.map.removeLayer(this.tileLayers.light);
          this.map.addLayer(this.tileLayers.dark);
          this.currentTile = 'dark';
          this.showToast('Đã chuyển sang Bản đồ tối GIS');
        }
      });
    }

    // 6. SOS Modal Controls
    const sosOpenBtn = document.getElementById('btn-open-sos');
    const sosModal = document.getElementById('modal-sos');
    const sosCloseBtn = document.getElementById('btn-close-sos');
    if (sosOpenBtn && sosModal) {
      sosOpenBtn.addEventListener('click', () => sosModal.classList.add('active'));
    }
    if (sosCloseBtn && sosModal) {
      sosCloseBtn.addEventListener('click', () => sosModal.classList.remove('active'));
    }

    // 7. Community Report Modal Controls
    const reportOpenBtn = document.getElementById('btn-open-report');
    const reportModal = document.getElementById('modal-report');
    const reportCloseBtn = document.getElementById('btn-close-report');
    if (reportOpenBtn && reportModal) {
      reportOpenBtn.addEventListener('click', () => {
        reportModal.classList.add('active');
        this.fillReportCoordsWithCenter();
      });
    }
    if (reportCloseBtn && reportModal) {
      reportCloseBtn.addEventListener('click', () => reportModal.classList.remove('active'));
    }

    // Select Water Depth in Report Modal
    const levelCards = document.querySelectorAll('.level-card');
    levelCards.forEach(card => {
      card.addEventListener('click', () => {
        levelCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedDepth = parseInt(card.dataset.depth, 10);
      });
    });

    // Submit Report
    const submitBtn = document.getElementById('btn-submit-report');
    if (submitBtn) {
      submitBtn.addEventListener('click', () => this.handleReportSubmit());
    }

    // Copy SOS Coordinates
    const copyCoordBtn = document.getElementById('btn-copy-sos-coords');
    if (copyCoordBtn) {
      copyCoordBtn.addEventListener('click', () => {
        const center = this.map.getCenter();
        const text = `CẦN CỨU HỘ KHẨN CẤP! Vị trí của tôi: https://www.google.com/maps?q=${center.lat.toFixed(5)},${center.lng.toFixed(5)}`;
        navigator.clipboard.writeText(text).then(() => {
          this.showToast(' Đã sao chép tọa độ cứu hộ vào bộ nhớ tạm!');
        });
      });
    }

    // Banner close button
    const bannerClose = document.getElementById('btn-close-banner');
    if (bannerClose) {
      bannerClose.addEventListener('click', () => {
        document.getElementById('emergency-banner').classList.add('collapsed');
      });
    }
  }

  handleGPSLocation() {
    if (!navigator.geolocation) {
      this.showToast('Trình duyệt không hỗ trợ định vị GPS');
      return;
    }

    this.showToast(' Đang xác định vị trí của bạn...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;

        if (this.userLocationMarker) {
          this.map.removeLayer(this.userLocationMarker);
        }

        const userIcon = L.divIcon({
          html: `<div style="width:20px;height:20px;border-radius:50%;background:#00d2ff;border:3px solid #fff;box-shadow:0 0 16px #00d2ff;"></div>`,
          className: 'user-loc-icon',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });

        this.userLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
        this.userLocationMarker.bindPopup('<b>📍 Vị trí của bạn</b><br>Đang quét các điểm ngập gần đây...').openPopup();

        this.map.flyTo([lat, lng], 14, { duration: 1.5 });
        this.showToast('Đã định vị vị trí hiện tại của bạn');
      },
      (err) => {
        this.showToast('Không thể lấy vị trí: ' + err.message);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  fillReportCoordsWithCenter() {
    const center = this.map.getCenter();
    const latInput = document.getElementById('report-lat');
    const lngInput = document.getElementById('report-lng');
    if (latInput && lngInput) {
      latInput.value = center.lat.toFixed(5);
      lngInput.value = center.lng.toFixed(5);
    }
  }

  async handleReportSubmit() {
    const addressInput = document.getElementById('report-address');
    const noteInput = document.getElementById('report-note');
    const latInput = document.getElementById('report-lat');
    const lngInput = document.getElementById('report-lng');

    const address = addressInput ? addressInput.value.trim() : '';
    const note = noteInput ? noteInput.value.trim() : '';
    const lat = parseFloat(latInput.value) || 21.0285;
    const lng = parseFloat(lngInput.value) || 105.8048;

    if (!address) {
      this.showToast('⚠️ Vui lòng nhập tên đường / khu vực bị ngập');
      return;
    }

    const reportData = {
      address_text: address,
      note: note,
      depth_cm: this.selectedDepth,
      latitude: lat,
      longitude: lng,
      province_code: this.selectedProvince === 'all' ? '01' : this.selectedProvince
    };

    const result = await window.FloodService.submitCommunityReport(reportData);

    // Optimistically add to map as a new flood point
    let severity = 'LEVEL_1';
    if (this.selectedDepth >= 50) severity = 'LEVEL_3';
    else if (this.selectedDepth >= 30) severity = 'LEVEL_2';

    const newPoint = {
      id: result.report.id,
      name: `[Cộng đồng] ${address}`,
      current_depth_cm: this.selectedDepth,
      severity: severity,
      status: 'RISING',
      latitude: lat,
      longitude: lng,
      last_updated: new Date().toISOString()
    };

    this.floodPoints.unshift(newPoint);
    this.createFloodMarker(newPoint).addTo(this.markersLayer);
    this.updateHeaderStats();

    // Close modal & reset
    document.getElementById('modal-report').classList.remove('active');
    if (addressInput) addressInput.value = '';
    if (noteInput) noteInput.value = '';

    this.showToast(' Báo ngập thành công! Cảm ơn bạn đã cảnh báo.');
    this.map.flyTo([lat, lng], 15);
  }

  showToast(message) {
    let toast = document.getElementById('toast-notice');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'toast-notice';
      toast.className = 'toast-notice';
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    toast.classList.add('show');
    setTimeout(() => {
      toast.classList.remove('show');
    }, 3500);
  }
}

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.floodApp = new FloodApp();
  window.floodApp.init();
});
