/**
 * FloodGuard Vietnam - Application Controller & GIS Map Engine
 * Handles Leaflet Map rendering, Realtime UI state, Geolocation, and Modals
 */

// Safely retrieve Mapbox token from runtime config (window.ENV_CONFIG)
const getMapboxToken = () => {
  return (typeof window !== 'undefined' && window.ENV_CONFIG && window.ENV_CONFIG.MAPBOX_TOKEN)
    ? window.ENV_CONFIG.MAPBOX_TOKEN
    : '';
};

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
    this.currentTile = 'streets';
    this.radarLayer = null;
    this.radarActive = false;
    this.currentUserCoords = null;
    this.searchDebounceTimer = null;
    this.searchMarker = null;
  }

  async init() {
    this.initMap();
    this.setupEventListeners();
    await this.loadInitialData();
    this.initRainRadar();
    this.updateWeather(21.0285, 105.8048, 'Hà Nội');
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

    const mapboxToken = getMapboxToken();
    const hasMapbox = mapboxToken && mapboxToken.startsWith('pk.');

    if (hasMapbox) {
      // 1. Mapbox Dark v11 (Primary default GIS layer)
      this.tileLayers.dark = L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/dark-v11/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
        {
          maxZoom: 20,
          tileSize: 512,
          zoomOffset: -1,
          attribution: '© Mapbox © OpenStreetMap'
        }
      );

      // 2. Mapbox Satellite Streets v12 (HD Satellite + Street names)
      this.tileLayers.satellite = L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/satellite-streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
        {
          maxZoom: 20,
          tileSize: 512,
          zoomOffset: -1,
          attribution: '© Mapbox'
        }
      );

      // 3. Mapbox Streets v12 (Standard Streets)
      this.tileLayers.streets = L.tileLayer(
        `https://api.mapbox.com/styles/v1/mapbox/streets-v12/tiles/512/{z}/{x}/{y}@2x?access_token=${mapboxToken}`,
        {
          maxZoom: 20,
          tileSize: 512,
          zoomOffset: -1,
          attribution: '© Mapbox © OpenStreetMap'
        }
      );
    } else {
      // Fallback CartoDB & OSM when no Mapbox token is configured
      this.tileLayers.dark = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        maxZoom: 19,
        subdomains: 'abcd'
      });
      this.tileLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19
      });
      this.tileLayers.streets = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19
      });
    }

    // Set default layer to Mapbox Streets (Clean Light Mode Standard)
    this.tileLayers.streets.addTo(this.map);
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

    select.innerHTML = '<option value="all">Toàn quốc (63 Tỉnh/Thành)</option>';
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
    let color = '#d97706';
    let pulseAnim = '';

    if (point.severity === 'LEVEL_3') {
      color = '#dc2626';
      pulseAnim = 'style="animation: marker-ripple 1.6s infinite;"';
    } else if (point.severity === 'LEVEL_2') {
      color = '#ea580c';
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
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    const marker = L.marker([point.latitude, point.longitude], { icon });

    // Status mapping with Light Mode palette
    let statusText = 'Đang dâng';
    let statusBg = 'var(--level3-bg)';
    let statusColor = 'var(--level3-color)';
    if (point.status === 'RECEDING') {
      statusText = 'Đang rút';
      statusBg = 'var(--safe-bg)';
      statusColor = 'var(--safe-color)';
    } else if (point.status === 'STABLE') {
      statusText = 'Đứng nước';
      statusBg = 'var(--level1-bg)';
      statusColor = 'var(--level1-color)';
    }

    const isCommunity = !!point.is_community;
    const communityBadge = isCommunity
      ? `<div class="vote-badge ${point.is_verified ? 'verified' : 'pending'}">
           ${point.is_verified ? '✓ Cộng đồng đã xác thực' : '⏳ Chờ cộng đồng xác minh'}
         </div>`
      : '';

    const voteActionsHtml = isCommunity
      ? `
        <div class="popup-vote-actions">
          <button class="btn-vote btn-upvote" onclick="window.floodApp.handleVote('${point.id}', true)">
            👍 Đúng ngập (${point.upvotes || 0})
          </button>
          <button class="btn-vote btn-downvote" onclick="window.floodApp.handleVote('${point.id}', false)">
            👎 Báo sai / Đã rút (${point.downvotes || 0})
          </button>
        </div>
      `
      : '';

    const popupHtml = `
      <div class="flood-popup-card">
        <div class="popup-title">
          <span>${point.name}</span>
        </div>
        ${communityBadge}
        <div class="popup-depth-meter">
          <span class="depth-value" style="color: ${color}">${point.current_depth_cm}</span>
          <span class="depth-unit">cm (Độ sâu ngập)</span>
        </div>
        <div class="popup-badge" style="background: ${statusBg}; color: ${statusColor}">
          ● ${statusText}
        </div>
        <div class="popup-detail-row">
          <span>Khuyến cáo:</span>
          <strong>${point.current_depth_cm >= 50 ? 'Cấm xe qua lại' : point.current_depth_cm >= 30 ? 'Xe gầm thấp chú ý' : 'Lưu thông cẩn thận'}</strong>
        </div>
        ${point.note ? `<div class="popup-detail-row"><span>Ghi chú:</span><span>${point.note}</span></div>` : ''}
        <div class="popup-detail-row">
          <span>Cập nhật:</span>
          <span>${new Date(point.last_updated).toLocaleTimeString('vi-VN')}</span>
        </div>
        ${voteActionsHtml}
      </div>
    `;

    marker.bindPopup(popupHtml);
    return marker;
  }

  createStationMarker(station) {
    const iconHtml = `
      <div class="flood-pin-marker">
        <div class="flood-pin-core" style="background-color: var(--primary); border-radius: 8px;">
          <svg class="icon-svg sm" viewBox="0 0 24 24" style="color:#fff; stroke-width:2.5;">
            <line x1="18" y1="20" x2="18" y2="10"/>
            <line x1="12" y1="20" x2="12" y2="4"/>
            <line x1="6" y1="20" x2="6" y2="14"/>
          </svg>
        </div>
      </div>
    `;

    const icon = L.divIcon({
      html: iconHtml,
      className: 'custom-station-icon',
      iconSize: [30, 30],
      iconAnchor: [15, 15]
    });

    const marker = L.marker([station.latitude, station.longitude], { icon });

    const dischargeText = station.live_discharge != null ? `${station.live_discharge} m³/s` : 'Đang đo';
    const rainText = station.live_rain != null ? `${station.live_rain} mm/h` : '0 mm/h';

    const popupHtml = `
      <div class="flood-popup-card">
        <div class="popup-title">
          <span>${station.name}</span>
        </div>
        <div class="popup-depth-meter">
          <span class="depth-value" style="color: var(--primary)">${station.current_water_level || '--'}</span>
          <span class="depth-unit">cm (Mực nước ước tính)</span>
        </div>
        <div class="popup-badge" style="background: var(--primary-subtle); color: var(--primary)">
          ● Trạm quan trắc thủy văn tự động
        </div>
        <div class="popup-detail-row">
          <span>Lưu lượng dòng chảy:</span>
          <strong>${dischargeText}</strong>
        </div>
        <div class="popup-detail-row">
          <span>Lượng mưa tức thời:</span>
          <strong>${rainText}</strong>
        </div>
        <div class="popup-detail-row">
          <span>Mã trạm:</span>
          <strong>${station.code}</strong>
        </div>
        <div class="popup-detail-row">
          <span>Nguồn số liệu:</span>
          <span style="color: var(--primary); font-weight:600;">Open-Meteo Live API</span>
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
          this.updateWeather(21.0285, 105.8048, 'Hà Nội');
        } else {
          const prov = this.provinces.find(p => p.code === code);
          if (prov) {
            this.map.flyTo([prov.center_lat, prov.center_lng], prov.zoom_level || 12, { duration: 1.5 });
            this.updateWeather(prov.center_lat, prov.center_lng, prov.name);
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

    // 3. Smart Address Search with Autocomplete Suggestions
    const searchInput = document.getElementById('search-input');
    const suggestionsDropdown = document.getElementById('search-suggestions');
    const clearSearchBtn = document.getElementById('btn-clear-search');

    if (searchInput && suggestionsDropdown) {
      searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        if (clearSearchBtn) {
          clearSearchBtn.style.display = query.length > 0 ? 'flex' : 'none';
        }

        if (this.searchDebounceTimer) {
          clearTimeout(this.searchDebounceTimer);
        }

        if (query.length < 2) {
          suggestionsDropdown.style.display = 'none';
          suggestionsDropdown.innerHTML = '';
          return;
        }

        this.searchDebounceTimer = setTimeout(async () => {
          suggestionsDropdown.style.display = 'flex';
          suggestionsDropdown.innerHTML = `
            <div class="suggestion-empty">
              <span>Đang tìm kiếm địa chỉ đề xuất...</span>
            </div>
          `;

          const results = await window.FloodService.searchAddress(query);
          this.renderSearchSuggestions(results, query);
        }, 260);
      });

      // Clear search button
      if (clearSearchBtn) {
        clearSearchBtn.addEventListener('click', () => {
          searchInput.value = '';
          clearSearchBtn.style.display = 'none';
          suggestionsDropdown.style.display = 'none';
          suggestionsDropdown.innerHTML = '';
          if (this.searchMarker) {
            this.map.removeLayer(this.searchMarker);
            this.searchMarker = null;
          }
        });
      }

      // Close dropdown when clicking outside or pressing Escape
      document.addEventListener('click', (e) => {
        if (!e.target.closest('.search-container')) {
          suggestionsDropdown.style.display = 'none';
        }
      });

      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          suggestionsDropdown.style.display = 'none';
        }
      });
    }

    // 4. GPS My Location Button
    const gpsBtn = document.getElementById('btn-gps');
    if (gpsBtn) {
      gpsBtn.addEventListener('click', () => this.handleGPSLocation());
    }

    // 4.1 Weather Rain Radar Toggle Button
    const radarBtn = document.getElementById('btn-toggle-radar');
    if (radarBtn) {
      radarBtn.addEventListener('click', () => this.toggleRainRadar());
    }

    // 5. Layer Tile Switcher (Streets -> Satellite -> Dark)
    const layerBtn = document.getElementById('btn-toggle-layer');
    if (layerBtn) {
      layerBtn.addEventListener('click', () => {
        if (this.currentTile === 'streets') {
          this.map.removeLayer(this.tileLayers.streets);
          this.map.addLayer(this.tileLayers.satellite);
          this.currentTile = 'satellite';
          this.showToast('Đã chuyển sang Bản đồ Vệ tinh HD');
        } else if (this.currentTile === 'satellite') {
          this.map.removeLayer(this.tileLayers.satellite);
          this.map.addLayer(this.tileLayers.dark);
          this.currentTile = 'dark';
          this.showToast('Đã chuyển sang Bản đồ Tối GIS');
        } else {
          this.map.removeLayer(this.tileLayers.dark);
          this.map.addLayer(this.tileLayers.streets);
          this.currentTile = 'streets';
          this.showToast('Đã chuyển sang Bản đồ Đường phố');
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
          this.showToast('Đã sao chép tọa độ cứu hộ vào bộ nhớ tạm.');
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

    this.showToast('Đang xác định vị trí của bạn...');
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lng = pos.coords.longitude;
        this.currentUserCoords = { lat, lng };

        if (this.userLocationMarker) {
          this.map.removeLayer(this.userLocationMarker);
        }

        const userIcon = L.divIcon({
          html: `<div style="width:18px;height:18px;border-radius:50%;background:var(--primary);border:3px solid #ffffff;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>`,
          className: 'user-loc-icon',
          iconSize: [18, 18],
          iconAnchor: [9, 9]
        });

        this.userLocationMarker = L.marker([lat, lng], { icon: userIcon }).addTo(this.map);
        this.userLocationMarker.bindPopup('<b>Vị trí hiện tại của bạn</b><br>Đang theo dõi tình hình ngập xung quanh...').openPopup();

        this.map.flyTo([lat, lng], 14, { duration: 1.5 });
        this.showToast('Đã định vị vị trí hiện tại');
        this.updateWeather(lat, lng, 'Vị trí của bạn');
      },
      (err) => {
        this.showToast('Không thể lấy vị trí: ' + err.message);
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }

  async updateWeather(lat, lng, locationName = 'Hà Nội') {
    const cityEl = document.getElementById('weather-city');
    const tempEl = document.getElementById('weather-temp');
    const descEl = document.getElementById('weather-desc');
    const rainEl = document.getElementById('weather-rain-rate');
    const humEl = document.getElementById('weather-humidity');
    const windEl = document.getElementById('weather-wind');
    const pillEl = document.getElementById('weather-pill');
    const iconBadge = document.getElementById('weather-icon-badge');

    if (cityEl) cityEl.textContent = locationName;
    if (descEl) descEl.textContent = 'Đang tải...';

    const weather = await window.FloodService.getRealtimeWeather(lat, lng);

    if (tempEl) tempEl.textContent = `${weather.temperature}°C`;
    if (descEl) descEl.textContent = weather.description;
    if (rainEl) rainEl.textContent = `🌧️ ${weather.rainRate} mm/h`;
    if (humEl) humEl.textContent = `💧 ${weather.humidity}%`;
    if (windEl) windEl.textContent = `💨 ${weather.windSpeed} km/h`;

    // Render weather SVG icon based on condition
    if (iconBadge) {
      iconBadge.innerHTML = this.getWeatherSvgIcon(weather.iconType);
    }

    // Rainfall to Flood Risk Warning
    if (pillEl) {
      if (weather.rainRate >= 20 || weather.floodRisk.includes('NGUY CƠ NGẬP')) {
        pillEl.classList.add('weather-alert');
        this.showToast(`⚠️ [Thời tiết] ${locationName}: Lượng mưa ${weather.rainRate}mm/h - ${weather.floodRisk}`);
      } else {
        pillEl.classList.remove('weather-alert');
      }
    }
  }

  getWeatherSvgIcon(iconType) {
    if (iconType === 'sun') {
      return `
        <svg class="icon-svg sm" viewBox="0 0 24 24" style="color: #f59e0b;">
          <circle cx="12" cy="12" r="5"/>
          <line x1="12" y1="1" x2="12" y2="3"/>
          <line x1="12" y1="21" x2="12" y2="23"/>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
          <line x1="1" y1="12" x2="3" y2="12"/>
          <line x1="21" y1="12" x2="23" y2="12"/>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
        </svg>
      `;
    }
    if (iconType === 'sun-cloud') {
      return `
        <svg class="icon-svg sm" viewBox="0 0 24 24" style="color: #3b82f6;">
          <path d="M12 2v2"/>
          <path d="M4.93 4.93l1.41 1.41"/>
          <path d="M20 12h2"/>
          <path d="M17.5 18H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
        </svg>
      `;
    }
    if (iconType === 'rain' || iconType === 'rain-heavy' || iconType === 'rain-light') {
      return `
        <svg class="icon-svg sm" viewBox="0 0 24 24" style="color: #2563eb;">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
          <path d="M8 19v3"/>
          <path d="M12 19v3"/>
          <path d="M16 19v3"/>
        </svg>
      `;
    }
    if (iconType === 'thunder') {
      return `
        <svg class="icon-svg sm" viewBox="0 0 24 24" style="color: #dc2626;">
          <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
          <polygon points="13 11 9 17 14 17 11 23 18 15 13 15 13 11" fill="currentColor"/>
        </svg>
      `;
    }
    // Default cloud
    return `
      <svg class="icon-svg sm" viewBox="0 0 24 24" style="color: #64748b;">
        <path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9Z"/>
      </svg>
    `;
  }

  async initRainRadar() {
    try {
      const res = await fetch('https://api.rainviewer.com/public/weather-maps.json');
      const data = await res.json();
      if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
        const latest = data.radar.past[data.radar.past.length - 1];
        const radarTileUrl = `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
        this.radarLayer = L.tileLayer(radarTileUrl, {
          opacity: 0.65,
          zIndex: 500,
          attribution: 'Radar dữ liệu thời tiết: RainViewer'
        });
      }
    } catch (err) {
      console.warn('[RainRadar] Cannot init radar layer:', err.message);
    }
  }

  toggleRainRadar() {
    const btn = document.getElementById('btn-toggle-radar');
    if (!this.radarLayer) {
      this.showToast('Đang tải dữ liệu Radar Mây Mưa...');
      return;
    }

    if (this.radarActive) {
      this.map.removeLayer(this.radarLayer);
      this.radarActive = false;
      if (btn) btn.classList.remove('active');
      this.showToast('Đã tắt lớp Radar Mây Mưa');
    } else {
      this.map.addLayer(this.radarLayer);
      this.radarActive = true;
      if (btn) btn.classList.add('active');
      this.showToast('Đã bật lớp Radar Mây Mưa thời gian thực (RainViewer)');
    }
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

  async handleVote(reportId, isUpvote) {
    const voteKey = 'voted_' + reportId;
    if (localStorage.getItem(voteKey)) {
      this.showToast('Bạn đã đánh giá điểm ngập này rồi!');
      return;
    }

    this.showToast('Đang gửi đánh giá...');
    const res = await window.FloodService.voteCommunityReport(reportId, isUpvote);
    if (!res || !res.success) {
      this.showToast('Không thể gửi đánh giá, vui lòng thử lại sau.');
      return;
    }

    localStorage.setItem(voteKey, isUpvote ? 'up' : 'down');

    // Update in memory
    const point = this.floodPoints.find(p => p.id === reportId);
    if (point) {
      point.upvotes = res.upvotes;
      point.downvotes = res.downvotes;
      if (res.status === 'REJECTED') {
        this.floodPoints = this.floodPoints.filter(p => p.id !== reportId);
        this.renderMarkers();
        this.updateHeaderStats();
        this.showToast('Điểm ngập đã bị đánh dấu báo sai và được ẩn khỏi bản đồ.');
        return;
      }
      if (res.status === 'VERIFIED') {
        point.is_verified = true;
      }
    }
    this.renderMarkers();
    this.showToast(isUpvote ? 'Cảm ơn bạn đã xác thực điểm ngập!' : 'Đã ghi nhận phản hồi báo sai.');
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
      this.showToast('Vui lòng nhập tên đường hoặc khu vực bị ngập.');
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

    // Submit with GPS coords for anti-spam distance verification
    const result = await window.FloodService.submitCommunityReport(reportData, this.currentUserCoords);
    if (!result || !result.success) {
      this.showToast(result && result.error ? result.error : 'Không thể gửi báo cáo ngập.');
      return;
    }

    // Add to map as a community flood point
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
      is_community: true,
      upvotes: 1,
      downvotes: 0,
      is_verified: false,
      note: note,
      last_updated: new Date().toISOString()
    };

    this.floodPoints.unshift(newPoint);
    this.createFloodMarker(newPoint).addTo(this.markersLayer);
    this.updateHeaderStats();

    // Close modal & reset
    document.getElementById('modal-report').classList.remove('active');
    if (addressInput) addressInput.value = '';
    if (noteInput) noteInput.value = '';

    this.showToast('Báo ngập thành công. Cảm ơn đóng góp của bạn!');
    this.map.flyTo([lat, lng], 15);
  }

  renderSearchSuggestions(results, query) {
    const dropdown = document.getElementById('search-suggestions');
    if (!dropdown) return;

    if (!results || results.length === 0) {
      dropdown.innerHTML = `
        <div class="suggestion-empty">
          <span>Không tìm thấy địa chỉ phù hợp với "${query}".</span>
        </div>
      `;
      dropdown.style.display = 'flex';
      return;
    }

    dropdown.innerHTML = '';
    results.forEach(item => {
      const itemEl = document.createElement('div');
      itemEl.className = 'suggestion-item';
      itemEl.innerHTML = `
        <div class="suggestion-icon">
          <svg class="icon-svg sm" viewBox="0 0 24 24">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </div>
        <div class="suggestion-content">
          <span class="suggestion-name">${item.name}</span>
          <span class="suggestion-address">${item.fullName}</span>
        </div>
      `;

      itemEl.addEventListener('click', () => {
        this.selectSearchResult(item);
      });

      dropdown.appendChild(itemEl);
    });

    dropdown.style.display = 'flex';
  }

  selectSearchResult(item) {
    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('search-suggestions');
    const clearSearchBtn = document.getElementById('btn-clear-search');

    if (searchInput) searchInput.value = item.name;
    if (clearSearchBtn) clearSearchBtn.style.display = 'flex';
    if (dropdown) dropdown.style.display = 'none';

    // 1. Smooth Fly to location
    this.map.flyTo([item.latitude, item.longitude], 16, { duration: 1.5 });

    // 2. Put a pin
    if (this.searchMarker) {
      this.map.removeLayer(this.searchMarker);
    }

    const pinIcon = L.divIcon({
      html: `
        <div style="display:flex;align-items:center;justify-content:center;width:34px;height:34px;background:#2563eb;color:#fff;border-radius:50%;box-shadow:0 4px 14px rgba(37,99,235,0.45);border:2px solid #fff;">
          <svg class="icon-svg sm" viewBox="0 0 24 24" style="stroke-width:2.5;">
            <circle cx="11" cy="11" r="8"/>
            <line x1="21" y1="21" x2="16.65" y2="16.65"/>
          </svg>
        </div>
      `,
      className: 'custom-search-pin',
      iconSize: [34, 34],
      iconAnchor: [17, 17]
    });

    this.searchMarker = L.marker([item.latitude, item.longitude], { icon: pinIcon }).addTo(this.map);
    this.searchMarker.bindPopup(`
      <div class="flood-popup-card" style="min-width:200px;">
        <div class="popup-title">
          <span>${item.name}</span>
        </div>
        <div style="font-size:0.8rem;color:var(--text-secondary);margin:4px 0 8px 0;line-height:1.4;">
          ${item.fullName}
        </div>
        <div class="popup-badge" style="background:var(--primary-subtle);color:var(--primary)">
          ● Vị trí tìm kiếm
        </div>
      </div>
    `).openPopup();

    // 3. Update weather at this exact location
    this.updateWeather(item.latitude, item.longitude, item.name);
    this.showToast(`Đã di chuyển tới: ${item.name}`);
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
