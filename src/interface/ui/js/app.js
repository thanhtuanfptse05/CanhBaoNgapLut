/**
 * FloodGuard Vietnam - Application Controller & GIS Map Engine
 * Handles Leaflet Map rendering, Realtime UI state, Geolocation, and Modals
 */

// Safely retrieve Mapbox token from runtime config (window.ENV_CONFIG)
const getMapboxToken = () => {
  if (typeof window !== 'undefined' && window.ENV_CONFIG) {
    if (window.ENV_CONFIG.MAPBOX_TOKEN) return window.ENV_CONFIG.MAPBOX_TOKEN;
    if (window.ENV_CONFIG.MAPBOX_ACCESS_TOKEN) return window.ENV_CONFIG.MAPBOX_ACCESS_TOKEN;
  }
  return '';
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
    this.setupRoutePlannerListeners();
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
      // Fallback OpenStreetMap Standard when no Mapbox token is configured (Zero API key watermark)
      this.tileLayers.streets = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      });
      this.tileLayers.dark = L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors'
      });
      // Satellite: Esri World Imagery (Public & Free)
      this.tileLayers.satellite = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        maxZoom: 19,
        attribution: 'Tiles © Esri'
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

    const activeFloods = (this.floodPoints || []).filter(p => (p.current_depth_cm || 0) > 0);

    if (activePointsEl) {
      activePointsEl.textContent = activeFloods.length;
    }

    if (deepestPointEl) {
      if (activeFloods.length > 0) {
        const maxPoint = [...activeFloods].sort((a, b) => b.current_depth_cm - a.current_depth_cm)[0];
        deepestPointEl.textContent = `${maxPoint.current_depth_cm}cm`;
      } else {
        deepestPointEl.textContent = '0cm';
      }
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
        if (this.currentFilter === 'safe' && pt.severity !== 'SAFE' && (pt.current_depth_cm || 0) > 0) return;
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
    const isSafe = point.severity === 'SAFE' || (point.current_depth_cm || 0) === 0;
    let color = '#d97706';
    let pulseAnim = '';

    if (point.severity === 'LEVEL_3') {
      color = '#dc2626';
      pulseAnim = 'style="animation: marker-ripple 1.6s infinite;"';
    } else if (point.severity === 'LEVEL_2') {
      color = '#ea580c';
      pulseAnim = 'style="animation: marker-ripple 2.2s infinite;"';
    } else if (isSafe) {
      color = '#059669';
    }

    const iconHtml = `
      <div class="flood-pin-marker">
        <div class="flood-pin-glow" style="background-color: ${color};" ${pulseAnim}></div>
        <div class="flood-pin-core" style="background-color: ${color};">
          ${Math.round(point.current_depth_cm || 0)}
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

    if (isSafe) {
      statusText = 'Khô ráo - Thông thoáng';
      statusBg = 'var(--safe-bg)';
      statusColor = 'var(--safe-color)';
    } else if (point.status === 'STAGNANT_PONDING') {
      statusText = 'Ứ đọng sau bão (Chờ bơm)';
      statusBg = '#fee2e2';
      statusColor = '#991b1b';
    } else if (point.status === 'RECEDING') {
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

    const recommendation = isSafe
      ? 'Đường thông thoáng, lưu thông an toàn'
      : point.current_depth_cm >= 50
      ? 'Cấm xe qua lại - Đề xuất quay đầu'
      : point.current_depth_cm >= 30
      ? 'Xe gầm thấp chú ý, nguy cơ chết máy'
      : 'Lưu thông cẩn thận';

    const sourceRow = point.source
      ? `<div class="popup-detail-row"><span>Nguồn điểm ngập:</span><span style="font-weight:600;color:var(--text-secondary);">${point.source}</span></div>`
      : '';

    const rainRow = point.live_rain !== undefined
      ? `<div class="popup-detail-row"><span>Lượng mưa tức thời:</span><strong>${point.live_rain} mm/h (Open-Meteo)</strong></div>`
      : '';

    const accumRow = point.accum48h
      ? `<div class="popup-detail-row"><span>Mưa tích lũy 48h:</span><strong>${point.accum48h} mm</strong></div>`
      : '';

    const recessionRow = (point.recession_hours && !isSafe)
      ? `<div class="popup-detail-row"><span>Dự kiến nước rút:</span><strong style="color:#d97706;">~${point.recession_hours} giờ</strong></div>`
      : '';

    const earlyWarningHtml = point.is_early_warning
      ? `<div style="margin:6px 0;padding:6px 8px;border-radius:6px;background:#fef3c7;color:#92400e;font-size:11px;font-weight:700;">⚠️ ${point.forecast_warning_msg || 'Nguy cơ ngập sớm'}</div>`
      : '';

    const popupHtml = `
      <div class="flood-popup-card">
        <div class="popup-title">
          <span>${point.name}</span>
        </div>
        ${earlyWarningHtml}
        ${communityBadge}
        <div class="popup-depth-meter">
          <span class="depth-value" style="color: ${color}">${point.current_depth_cm || 0}</span>
          <span class="depth-unit">cm ${isSafe ? '(Mặt đường khô ráo)' : '(Độ sâu ngập)'}</span>
        </div>
        <div class="popup-badge" style="background: ${statusBg}; color: ${statusColor}">
          ● ${statusText}
        </div>
        <div class="popup-detail-row">
          <span>Khuyến cáo:</span>
          <strong>${recommendation}</strong>
        </div>
        ${rainRow}
        ${accumRow}
        ${recessionRow}
        ${sourceRow}
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

          // Pass current map center for proximity-biased results
          const center = this.map ? this.map.getCenter() : null;
          const mapCenter = center ? { lat: center.lat, lng: center.lng } : null;
          const results = await window.FloodService.searchAddress(query, mapCenter);
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
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (data && data.radar && data.radar.past && data.radar.past.length > 0) {
        const latest = data.radar.past[data.radar.past.length - 1];
        // RainViewer tiles only support zoom 1-6 natively for global coverage;
        // maxNativeZoom=6 tells Leaflet to stretch tiles beyond zoom 6
        // instead of requesting non-existent high-zoom tiles ("Zoom Level Not Supported")
        const radarTileUrl = `https://tilecache.rainviewer.com${latest.path}/256/{z}/{x}/{y}/2/1_1.png`;
        this.radarLayer = L.tileLayer(radarTileUrl, {
          opacity: 0.65,
          zIndex: 500,
          maxNativeZoom: 6,   // RainViewer tiles are available up to zoom 6
          maxZoom: 20,        // Leaflet stretches them beyond zoom 6 (no error tiles)
          tileSize: 256,
          attribution: 'Radar mưa thực tế: <a href="https://rainviewer.com" target="_blank">RainViewer</a>'
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

  /**
   * GPS My Location — uses Leaflet's built-in locate() with high accuracy mode.
   * Shows accuracy circle so user can see how reliable the fix is.
   * Desktop browsers often use IP/WiFi geolocation (less accurate than mobile GPS).
   */
  handleGPSLocation() {
    const btn = document.getElementById('btn-gps');
    if (btn) btn.classList.add('loading');
    this.showToast('📍 Đang xác định vị trí GPS...');

    // Remove previous accuracy circle if any
    if (this._gpsAccuracyCircle) {
      this.map.removeLayer(this._gpsAccuracyCircle);
      this._gpsAccuracyCircle = null;
    }
    if (this._gpsMarker) {
      this.map.removeLayer(this._gpsMarker);
      this._gpsMarker = null;
    }

    this.map.locate({
      setView: true,
      maxZoom: 15,
      enableHighAccuracy: true,
      timeout: 10000
    });

    this.map.once('locationfound', (e) => {
      if (btn) btn.classList.remove('loading');
      const accuracy = Math.round(e.accuracy);

      // Draw accuracy circle
      this._gpsAccuracyCircle = L.circle(e.latlng, {
        radius: e.accuracy,
        color: '#2563eb',
        fillColor: '#2563eb',
        fillOpacity: 0.08,
        weight: 1.5,
        dashArray: '4 4'
      }).addTo(this.map);

      // GPS position marker
      const gpsIcon = L.divIcon({
        html: `<div style="width:16px;height:16px;background:#2563eb;border:3px solid white;border-radius:50%;box-shadow:0 2px 8px rgba(37,99,235,0.5);"></div>`,
        className: '',
        iconSize: [16, 16],
        iconAnchor: [8, 8]
      });
      this._gpsMarker = L.marker(e.latlng, { icon: gpsIcon });
      this._gpsMarker.bindPopup(`
        <div style="font-size:0.83rem; min-width:160px;">
          <b>📍 Vị trí hiện tại của bạn</b><br>
          Lat: ${e.latlng.lat.toFixed(5)}<br>
          Lng: ${e.latlng.lng.toFixed(5)}<br>
          <span style="color:var(--text-muted); font-size:0.75rem;">
            ${accuracy < 100 ? '✅ Chính xác cao' : accuracy < 500 ? '⚠️ Độ chính xác trung bình' : '❌ Kém chính xác (WiFi/IP)'}
            (~${accuracy}m)
          </span>
          ${accuracy > 300 ? '<br><em style="color:#dc2626; font-size:0.72rem;">Trên máy tính, GPS có thể kém chính xác. Dùng điện thoại để có kết quả tốt hơn.</em>' : ''}
        </div>
      `).openPopup();
      this._gpsMarker.addTo(this.map);

      const msg = accuracy < 100
        ? `✅ Vị trí xác định (±${accuracy}m)`
        : accuracy < 500
        ? `⚠️ Vị trí ước lượng (±${accuracy}m) — độ chính xác trung bình`
        : `❌ Vị trí kém chính xác (±${accuracy}m) — dùng điện thoại để chính xác hơn`;
      this.showToast(msg);

      // Update weather based on current location
      this.updateWeather(e.latlng.lat, e.latlng.lng, 'Vị trí của tôi');
    });

    this.map.once('locationerror', (e) => {
      if (btn) btn.classList.remove('loading');
      console.warn('[GPS] Location error:', e.message);
      if (e.message && e.message.includes('denied')) {
        this.showToast('❌ Bạn đã từ chối quyền vị trí. Hãy cho phép GPS trong trình duyệt.');
      } else {
        this.showToast('❌ Không xác định được vị trí. Kiểm tra cài đặt GPS/quyền trình duyệt.');
      }
    });
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

  async selectSearchResult(item) {
    const searchInput = document.getElementById('search-input');
    const dropdown = document.getElementById('search-suggestions');
    const clearSearchBtn = document.getElementById('btn-clear-search');

    if (searchInput) searchInput.value = item.name;
    if (clearSearchBtn) clearSearchBtn.style.display = 'flex';
    if (dropdown) dropdown.style.display = 'none';

    // 1. Smooth Fly to location
    this.map.flyTo([item.latitude, item.longitude], 16, { duration: 1.5 });

    // 2. Put a pin with loading popup
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

    // 3. Check nearby flood status (within 2500m radius) — real-time
    const nearbyFlood = this._findNearbyFlood(item.latitude, item.longitude, 2500);

    let floodSection = '';
    if (nearbyFlood.length === 0) {
      floodSection = `
        <div style="display:flex;align-items:center;gap:6px;margin-top:8px;padding:7px 10px;border-radius:8px;background:#d1fae5;color:#065f46;font-size:0.8rem;font-weight:600;">
          <span>✅</span> Khu vực an toàn — không có điểm ngập trong 2.5km
        </div>`;
    } else {
      const maxDepth = Math.max(...nearbyFlood.map(f => f.current_depth_cm || 0));
      const hasLevel3 = nearbyFlood.some(f => f.severity === 'LEVEL_3');
      const hasLevel2 = nearbyFlood.some(f => f.severity === 'LEVEL_2');
      const badgeBg   = hasLevel3 ? '#fee2e2' : hasLevel2 ? '#fef3c7' : '#fff7ed';
      const badgeClr  = hasLevel3 ? '#991b1b' : hasLevel2 ? '#92400e' : '#9a3412';
      const icon      = hasLevel3 ? '🔴' : hasLevel2 ? '🟡' : '🟠';
      const label     = hasLevel3 ? 'NGUY HIỂM — ngập sâu' : hasLevel2 ? 'CẢNH BÁO — ngập trung bình' : 'THEO DÕI — ngập nhẹ';

      const pointList = nearbyFlood.slice(0, 4).map(f => {
        const dist = this._haversineDistance(item.latitude, item.longitude, f.latitude, f.longitude);
        const distStr = dist < 1000 ? `${Math.round(dist)}m` : `${(dist/1000).toFixed(1)}km`;
        const extraNote = f.status === 'STAGNANT_PONDING'
          ? ` <span style="color:#b91c1c;font-weight:700;">(Ứ đọng sau bão, rút sau ~${f.recession_hours || 48}h)</span>`
          : f.recession_hours
          ? ` <span style="color:#d97706;">(Rút sau ~${f.recession_hours}h)</span>`
          : '';
        return `<li style="margin:4px 0;font-size:0.75rem;line-height:1.35;">📍 <strong>${f.name || 'Điểm ngập'}</strong> <span style="opacity:0.85;">(${distStr} — ${f.current_depth_cm}cm)</span>${extraNote}</li>`;
      }).join('');

      floodSection = `
        <div style="margin-top:8px;padding:8px 10px;border-radius:8px;background:${badgeBg};color:${badgeClr};">
          <div style="font-weight:700;font-size:0.8rem;margin-bottom:4px;">${icon} ${label}</div>
          <div style="font-size:0.75rem;opacity:0.85;">Độ sâu tối đa: <strong>${maxDepth}cm</strong> — ${nearbyFlood.length} điểm ngập lân cận</div>
          <ul style="margin:5px 0 0 0;padding-left:12px;">${pointList}</ul>
        </div>`;
    }

    this.searchMarker.bindPopup(`
      <div class="flood-popup-card" style="min-width:240px;max-width:320px;">
        <div class="popup-title" style="font-size:0.95rem;font-weight:700;line-height:1.3;margin-bottom:3px;">
          ${item.name}
        </div>
        <div style="font-size:0.78rem;color:var(--text-secondary);margin-bottom:6px;line-height:1.4;">
          ${item.fullName || ''}
        </div>
        <div class="popup-badge" style="background:var(--primary-subtle);color:var(--primary);margin-bottom:0;">
          📍 Vị trí tra cứu
        </div>
        ${floodSection}
      </div>
    `, { maxWidth: 320 }).openPopup();

    // 4. Update weather at this exact location
    this.updateWeather(item.latitude, item.longitude, item.name);
    this.showToast(`Đã di chuyển tới: ${item.name}`);
  }

  /**
   * Find flood points within a given radius (meters) of a coordinate.
   */
  _findNearbyFlood(lat, lng, radiusMeters = 2500) {
    if (!this.floodPoints || this.floodPoints.length === 0) return [];
    return this.floodPoints.filter(fp => {
      // Only warn about active flood hazard (depth > 0 and not SAFE)
      if ((fp.current_depth_cm || 0) <= 0 || fp.severity === 'SAFE') return false;
      const dist = this._haversineDistance(lat, lng, fp.latitude, fp.longitude);
      return dist <= radiusMeters;
    }).sort((a, b) => {
      const da = this._haversineDistance(lat, lng, a.latitude, a.longitude);
      const db = this._haversineDistance(lat, lng, b.latitude, b.longitude);
      return da - db;
    });
  }

  /**
   * Haversine distance in meters between two lat/lng pairs.
   */
  _haversineDistance(lat1, lng1, lat2, lng2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLng = (lng2 - lng1) * Math.PI / 180;
    const a = Math.sin(dLat/2)**2 + Math.cos(lat1*Math.PI/180) * Math.cos(lat2*Math.PI/180) * Math.sin(dLng/2)**2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
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

  // ============================================================
  // ROUTE PLANNER — Tìm Đường Tránh Ngập (feat-flood-route-planner)
  // ============================================================

  /** Haversine distance in meters */
  _haversineMeters(lat1, lon1, lat2, lon2) {
    const R = 6371000;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat / 2) ** 2
      + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180)
      * Math.sin(dLon / 2) ** 2;
    return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  }

  /** Min distance from point to a polyline segment */
  _pointToSegmentDist(pLat, pLon, aLat, aLon, bLat, bLon) {
    const dx = bLon - aLon, dy = bLat - aLat;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return this._haversineMeters(pLat, pLon, aLat, aLon);
    const t = Math.max(0, Math.min(1, ((pLon - aLon) * dx + (pLat - aLat) * dy) / lenSq));
    return this._haversineMeters(pLat, pLon, aLat + t * dy, aLon + t * dx);
  }

  /** Find flood points within bufferMeters of a route polyline */
  analyzeFloodOnRoute(coords, floodPoints, bufferMeters = 150) {
    if (!coords || coords.length < 2 || !floodPoints) return [];
    return floodPoints.filter(fp => {
      for (let i = 0; i < coords.length - 1; i++) {
        const [aLng, aLat] = coords[i];
        const [bLng, bLat] = coords[i + 1];
        if (this._pointToSegmentDist(fp.latitude, fp.longitude, aLat, aLng, bLat, bLng) <= bufferMeters) return true;
      }
      return false;
    });
  }

  /** Score a route by safety based on flood points on it */
  scoreRoute(floodPointsOnRoute) {
    const count = floodPointsOnRoute.length;
    const totalDepth = floodPointsOnRoute.reduce((s, p) => s + (p.current_depth_cm || 0), 0);
    const level3Count = floodPointsOnRoute.filter(p => p.severity === 'LEVEL_3').length;
    const score = Math.max(0, 100 - count * 20 - Math.floor(totalDepth / 10) - level3Count * 15);
    const label = score >= 80 ? 'AN TOÀN' : score >= 50 ? 'THẬN TRỌNG' : 'NGUY HIỂM';
    return { score, label };
  }

  /** Rank analyzed routes: best safety first, then shortest distance */
  rankRoutes(routes) {
    return [...routes].sort((a, b) => {
      if (b.safetyScore !== a.safetyScore) return b.safetyScore - a.safetyScore;
      return a.distance_m - b.distance_m;
    });
  }

  setupRoutePlannerListeners() {
    // Route panel state
    this.routeOrigin = null;    // { lat, lng, name }
    this.routeDest = null;      // { lat, lng, name }
    this.routeProfile = 'driving';
    this.routePolylines = [];
    this.routeFloodMarkers = [];
    this.routeDebounceOrigin = null;
    this.routeDebounceDestTimer = null;

    const panelRoute = document.getElementById('panel-route');
    const btnOpen    = document.getElementById('btn-route-planner');
    const btnClose   = document.getElementById('btn-close-route');
    const btnSwap    = document.getElementById('btn-swap-route');
    const btnGpsRoute= document.getElementById('btn-route-use-gps');
    const btnFind    = document.getElementById('btn-find-route');
    const btnClear   = document.getElementById('btn-clear-route');
    const originInput= document.getElementById('route-origin-input');
    const destInput  = document.getElementById('route-dest-input');
    const originSug  = document.getElementById('route-origin-suggestions');
    const destSug    = document.getElementById('route-dest-suggestions');

    if (!panelRoute || !btnOpen) return;

    // Open / close panel
    btnOpen.addEventListener('click', () => {
      const isOpen = panelRoute.style.display !== 'none';
      panelRoute.style.display = isOpen ? 'none' : 'flex';
      btnOpen.classList.toggle('active', !isOpen);
    });
    if (btnClose) btnClose.addEventListener('click', () => {
      panelRoute.style.display = 'none';
      btnOpen.classList.remove('active');
    });

    // Transport mode buttons
    document.querySelectorAll('.transport-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        document.querySelectorAll('.transport-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        this.routeProfile = btn.dataset.profile;
      });
    });

    // Swap origin ↔ dest
    if (btnSwap) btnSwap.addEventListener('click', () => {
      const tmpCoords = this.routeOrigin;
      this.routeOrigin = this.routeDest;
      this.routeDest = tmpCoords;
      if (originInput) originInput.value = this.routeOrigin ? this.routeOrigin.name : '';
      if (destInput)   destInput.value   = this.routeDest   ? this.routeDest.name   : '';
    });

    // GPS for origin
    if (btnGpsRoute) btnGpsRoute.addEventListener('click', () => {
      if (!navigator.geolocation) return;
      this.showToast('Đang xác định vị trí GPS...');
      navigator.geolocation.getCurrentPosition((pos) => {
        this.routeOrigin = { lat: pos.coords.latitude, lng: pos.coords.longitude, name: 'Vị trí của tôi' };
        if (originInput) originInput.value = 'Vị trí của tôi';
        this.showToast('Đã dùng vị trí GPS làm điểm xuất phát');
      }, () => this.showToast('Không lấy được GPS'));
    });

    // Autocomplete for origin field
    this._setupRouteInputAutocomplete(originInput, originSug, (item) => {
      this.routeOrigin = { lat: item.latitude, lng: item.longitude, name: item.name };
    });

    // Autocomplete for dest field
    this._setupRouteInputAutocomplete(destInput, destSug, (item) => {
      this.routeDest = { lat: item.latitude, lng: item.longitude, name: item.name };
    });

    // Find route button
    if (btnFind) btnFind.addEventListener('click', () => this.handleFindRoute());

    // Clear route button
    if (btnClear) btnClear.addEventListener('click', () => this.clearRoute());

    // Close dropdowns on outside click
    document.addEventListener('click', (e) => {
      if (!e.target.closest('#panel-route')) {
        if (originSug) originSug.style.display = 'none';
        if (destSug)   destSug.style.display   = 'none';
      }
    });
  }

  _setupRouteInputAutocomplete(input, dropdown, onSelect) {
    if (!input || !dropdown) return;
    let timer = null;
    input.addEventListener('input', () => {
      const q = input.value.trim();
      if (timer) clearTimeout(timer);
      if (q.length < 2) { dropdown.style.display = 'none'; return; }
      timer = setTimeout(async () => {
        const center = this.map ? this.map.getCenter() : null;
        const results = await window.FloodService.searchAddress(q, center ? { lat: center.lat, lng: center.lng } : null);
        this._renderRouteDropdown(dropdown, results, (item) => {
          input.value = item.name;
          dropdown.style.display = 'none';
          onSelect(item);
        });
      }, 260);
    });
  }

  _renderRouteDropdown(dropdown, results, onSelect) {
    dropdown.innerHTML = '';
    if (!results || results.length === 0) {
      dropdown.style.display = 'none';
      return;
    }
    results.forEach(item => {
      const el = document.createElement('div');
      el.className = 'suggestion-item';
      el.innerHTML = `
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
      el.addEventListener('click', () => onSelect(item));
      dropdown.appendChild(el);
    });
    dropdown.style.display = 'flex';
    dropdown.style.flexDirection = 'column';
  }

  async handleFindRoute() {
    if (!this.routeOrigin || !this.routeDest) {
      this.showToast('⚠️ Vui lòng chọn cả điểm xuất phát và điểm đến.');
      return;
    }

    this.clearRoute();
    this.showToast('🗺️ Đang tìm tuyến đường và phân tích ngập lụt...');
    const btnFind = document.getElementById('btn-find-route');
    if (btnFind) { btnFind.textContent = 'Đang tính...'; btnFind.disabled = true; }

    try {
      const routes = await window.FloodService.getRoutes(this.routeOrigin, this.routeDest, this.routeProfile);

      if (!routes || routes.length === 0) {
        this.showToast('❌ Không tìm được tuyến đường. Hãy kiểm tra lại địa điểm.');
        return;
      }

      // Analyze flood on each route
      const analyzed = routes.map((r, idx) => {
        const floodOnRoute = this.analyzeFloodOnRoute(r.coordinates, this.floodPoints);
        const { score, label } = this.scoreRoute(floodOnRoute);
        return { ...r, floodOnRoute, safetyScore: score, safetyLabel: label, isBest: false };
      });

      // Rank and mark best
      const ranked = this.rankRoutes(analyzed);
      ranked[0].isBest = true;

      // Draw routes on map
      this._drawRoutes(ranked);

      // Show summary cards
      this._renderRouteSummary(ranked);

      // Fit map to show all routes
      const allCoords = ranked.flatMap(r => r.coordinates.map(([lng, lat]) => [lat, lng]));
      if (allCoords.length > 0) {
        this.map.fitBounds(L.latLngBounds(allCoords), { padding: [40, 40] });
      }

      const floodTotal = ranked[0].floodOnRoute.length;
      this.showToast(floodTotal === 0
        ? `✅ Tuyến đề xuất: THÔNG THOÁNG, không có điểm ngập.`
        : `⚠️ Tuyến tốt nhất có ${floodTotal} điểm ngập. Hãy cẩn thận!`
      );
    } catch (err) {
      console.error('[RoutePlanner] Error:', err);
      this.showToast('❌ Lỗi khi tính toán tuyến đường. Vui lòng thử lại.');
    } finally {
      if (btnFind) { btnFind.textContent = 'Tìm đường tránh ngập'; btnFind.disabled = false; }
    }
  }

  _drawRoutes(rankedRoutes) {
    const ROUTE_COLORS = ['#16a34a', '#2563eb', '#7c3aed'];
    const ROUTE_WEIGHTS = [5, 4, 3];
    const ROUTE_OPACITY = [1, 0.75, 0.6];

    rankedRoutes.forEach((route, idx) => {
      const latLngs = route.coordinates.map(([lng, lat]) => [lat, lng]);
      const polyline = L.polyline(latLngs, {
        color: ROUTE_COLORS[idx] || '#94a3b8',
        weight: ROUTE_WEIGHTS[idx] || 3,
        opacity: ROUTE_OPACITY[idx] || 0.6,
        lineJoin: 'round',
        lineCap: 'round'
      });
      polyline.addTo(this.map);
      this.routePolylines.push(polyline);

      // Draw flood warning markers on this route
      route.floodOnRoute.forEach(fp => {
        const warningIcon = L.divIcon({
          html: `<div class="route-flood-marker">⚠️</div>`,
          className: '',
          iconSize: [20, 20],
          iconAnchor: [10, 10]
        });
        const marker = L.marker([fp.latitude, fp.longitude], { icon: warningIcon });
        marker.bindPopup(`
          <div style="font-size:0.83rem; min-width:160px;">
            <strong style="color:#dc2626;">⚠️ Điểm Ngập Trên Tuyến</strong><br>
            <b>${fp.name || 'Khu vực ngập'}</b><br>
            Độ sâu: <b>${fp.current_depth_cm}cm</b><br>
            Cấp độ: <b>${fp.severity === 'LEVEL_3' ? '🔴 Nguy hiểm' : fp.severity === 'LEVEL_2' ? '🟠 Cảnh báo' : '🟡 Theo dõi'}</b>
          </div>
        `);
        marker.addTo(this.map);
        this.routeFloodMarkers.push(marker);
      });
    });

    // Add origin/dest markers
    const originIcon = L.divIcon({
      html: `<div style="width:14px;height:14px;background:#22c55e;border:2px solid #16a34a;border-radius:50%;box-shadow:0 2px 6px rgba(34,197,94,0.5);"></div>`,
      className: '', iconSize: [14, 14], iconAnchor: [7, 7]
    });
    const destIcon = L.divIcon({
      html: `<div style="width:14px;height:14px;background:#ef4444;border:2px solid #dc2626;border-radius:50%;box-shadow:0 2px 6px rgba(239,68,68,0.5);"></div>`,
      className: '', iconSize: [14, 14], iconAnchor: [7, 7]
    });

    const originMarker = L.marker([this.routeOrigin.lat, this.routeOrigin.lng], { icon: originIcon });
    originMarker.bindPopup(`<b>📍 Điểm đi:</b> ${this.routeOrigin.name}`);
    originMarker.addTo(this.map);
    this.routeFloodMarkers.push(originMarker);

    const destMarker = L.marker([this.routeDest.lat, this.routeDest.lng], { icon: destIcon });
    destMarker.bindPopup(`<b>🏁 Điểm đến:</b> ${this.routeDest.name}`);
    destMarker.addTo(this.map);
    this.routeFloodMarkers.push(destMarker);
  }

  _renderRouteSummary(rankedRoutes) {
    const resultsEl = document.getElementById('route-results');
    const containerEl = document.getElementById('route-cards-container');
    const titleEl = document.getElementById('route-results-title');
    if (!resultsEl || !containerEl) return;

    const totalFlood = rankedRoutes[0].floodOnRoute.length;
    if (titleEl) titleEl.textContent = `${rankedRoutes.length} tuyến | Tốt nhất: ${rankedRoutes[0].safetyLabel}`;

    containerEl.innerHTML = '';
    rankedRoutes.forEach((route, idx) => {
      const badgeClass = route.safetyLabel === 'AN TOÀN' ? 'badge-safe'
        : route.safetyLabel === 'THẬN TRỌNG' ? 'badge-caution' : 'badge-danger';
      const COLORS = ['#16a34a', '#2563eb', '#7c3aed'];
      const dotColor = COLORS[idx] || '#94a3b8';

      const floodListHtml = route.floodOnRoute.slice(0, 3).map(fp => {
        const dotC = fp.severity === 'LEVEL_3' ? '#ef4444' : fp.severity === 'LEVEL_2' ? '#f97316' : '#eab308';
        return `<div class="route-flood-item">
          <div class="route-flood-dot" style="background:${dotC};"></div>
          <span>${fp.name || 'Điểm ngập'} — ${fp.current_depth_cm}cm</span>
        </div>`;
      }).join('');
      const moreFlood = route.floodOnRoute.length > 3
        ? `<div style="color:var(--text-dim); font-size:0.72rem;">+${route.floodOnRoute.length - 3} điểm ngập khác...</div>` : '';

      const card = document.createElement('div');
      card.className = `route-card${route.isBest ? ' best' : ''}${idx === 0 ? ' selected' : ''}`;
      card.innerHTML = `
        ${route.isBest ? '<span class="route-card-badge badge-best">⭐ Đề xuất</span>' : `<span class="route-card-badge ${badgeClass}">${route.safetyLabel}</span>`}
        <div class="route-card-title">
          <span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${dotColor};margin-right:5px;"></span>
          ${route.isBest ? 'Tuyến tốt nhất' : route.label}
        </div>
        <div class="route-card-stats">
          <span class="route-stat">📏 ${route.distance_km} km</span>
          <span class="route-stat">⏱️ ~${route.duration_min} phút</span>
          <span class="route-stat" style="color:${route.floodOnRoute.length > 0 ? '#dc2626' : '#16a34a'};">
            ${route.floodOnRoute.length > 0 ? `⚠️ ${route.floodOnRoute.length} điểm ngập` : '✅ Không có ngập'}
          </span>
        </div>
        ${route.floodOnRoute.length > 0 ? `<div class="route-flood-list">${floodListHtml}${moreFlood}</div>` : ''}
      `;

      card.addEventListener('click', () => {
        document.querySelectorAll('.route-card').forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        // Zoom to this route
        const latLngs = route.coordinates.map(([lng, lat]) => [lat, lng]);
        this.map.fitBounds(L.latLngBounds(latLngs), { padding: [40, 40] });
      });

      containerEl.appendChild(card);
    });

    resultsEl.style.display = 'block';
  }

  clearRoute() {
    this.routePolylines.forEach(p => this.map.removeLayer(p));
    this.routeFloodMarkers.forEach(m => this.map.removeLayer(m));
    this.routePolylines = [];
    this.routeFloodMarkers = [];
    const resultsEl = document.getElementById('route-results');
    if (resultsEl) resultsEl.style.display = 'none';
    const containerEl = document.getElementById('route-cards-container');
    if (containerEl) containerEl.innerHTML = '';
  }
}

// Start app on DOMContentLoaded
document.addEventListener('DOMContentLoaded', () => {
  window.floodApp = new FloodApp();
  window.floodApp.init();
});

