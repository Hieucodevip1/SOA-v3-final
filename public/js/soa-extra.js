// SOA EXTRA – Giám sát trạng thái kiến trúc hướng dịch vụ (Service Registry + Event Bus + Degraded Mode)
(function () {
    const esc = (s) => String(s === null || s === undefined ? '' : s)
        .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

    async function loadSoaSystemView() {
        const box = document.getElementById('soaSystemBox');
        if (!box) return;

        box.innerHTML = '<p style="padding:16px;">Đang kết nối Service Registry và Event Bus...</p>';

        const [sysRes, dashRes] = await Promise.all([
            api('GET', '/system/services'),
            api('GET', '/dashboard')
        ]);

        if (!sysRes || !sysRes.ok) {
            box.innerHTML = `
                <div class="soa-degraded-banner">
                    <div>
                        <strong>Service Registry / Gateway API:</strong> Không thể lấy trạng thái hệ thống. Hãy kiểm tra các tiến trình registry & gateway.
                    </div>
                </div>
            `;
            return;
        }

        const s = sysRes.data || {};
        const d = dashRes && dashRes.ok ? dashRes.data : null;

        let html = '';

        // Thống kê tổng hợp từ các dịch vụ (Service Composition)
        if (d) {
            html += `
                <div class="dashboard-metrics-grid" style="margin-bottom:20px;">
                    <div class="metric-card">
                        <div class="metric-card-icon blue">🎓</div>
                        <div>
                            <div class="metric-card-value">${d.students !== null ? d.students : '⚠️ Gián đoạn'}</div>
                            <div class="metric-card-label">Sinh viên (student-service)</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-card-icon green">📚</div>
                        <div>
                            <div class="metric-card-value">${d.topics !== null ? d.topics : '⚠️ Gián đoạn'}</div>
                            <div class="metric-card-label">Đề tài (topic-service)</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-card-icon orange">📝</div>
                        <div>
                            <div class="metric-card-value">${d.registrations !== null ? d.registrations : '⚠️ Gián đoạn'}</div>
                            <div class="metric-card-label">Đăng ký (registration-service)</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-card-icon purple">🌐</div>
                        <div>
                            <div class="metric-card-value" style="color:${d.degraded && d.degraded.length ? '#e65100' : '#2e7d32'};">
                                ${d.degraded && d.degraded.length ? 'Suy giảm (Degraded)' : 'Khỏe mạnh (100%)'}
                            </div>
                            <div class="metric-card-label">Trạng thái tổng thể</div>
                        </div>
                    </div>
                </div>
            `;

            if (d.degraded && d.degraded.length > 0) {
                html += `
                    <div class="soa-degraded-banner">
                        <div class="soa-degraded-text">
                            ⚠️ <strong>Chế độ phân tán suy giảm (Degraded Mode):</strong> Dịch vụ <code>${esc(d.degraded.join(', '))}</code> hiện không phản hồi. Các dịch vụ khác vẫn tiếp tục phục vụ người dùng bình thường!
                        </div>
                    </div>
                `;
            }
        }

        // Bảng Service Registry
        html += `
            <div style="margin-bottom: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px;">
                    <h3 style="font-size:15px; font-weight:800; color:#0c3258;">
                        DANH SÁCH DỊCH VỤ ĐĂNG KÝ (SERVICE REGISTRY DÒ TÌM ĐỘNG :3500)
                    </h3>
                    <span class="badge-status ${s.registry === 'UP' ? 'da-duyet' : 'tu-choi'}">
                        Registry: ${s.registry || 'UP'}
                    </span>
                </div>
                <div class="qnu-table-container">
                    <table class="qnu-table">
                        <thead>
                            <tr>
                                <th>TÊN DỊCH VỤ (SOA SERVICE)</th>
                                <th>ĐỊA CHỈ NỘI BỘ (URL)</th>
                                <th>PHIÊN BẢN</th>
                                <th>TRẠNG THÁI</th>
                                <th>HEARTBEAT GẦN NHẤT</th>
                            </tr>
                        </thead>
                        <tbody>
        `;

        const serviceNames = Object.keys(s.services || {}).sort();
        if (serviceNames.length === 0) {
            html += `<tr><td colspan="5" class="text-center">Chưa có dịch vụ nào đăng ký lên Registry.</td></tr>`;
        } else {
            for (const name of serviceNames) {
                for (const inst of s.services[name]) {
                    const isUp = inst.status === 'UP';
                    const agoSec = Math.round((inst.lastHeartbeatAgoMs || 0) / 1000);
                    html += `
                        <tr>
                            <td><strong>${esc(name)}</strong></td>
                            <td><code>${esc(inst.url)}</code></td>
                            <td class="text-center">${esc(inst.version || '1.0.0')}</td>
                            <td class="text-center">
                                <span class="badge-status ${isUp ? 'da-duyet' : 'tu-choi'}">
                                    ${esc(inst.status)}
                                </span>
                            </td>
                            <td class="text-center">${agoSec}s trước</td>
                        </tr>
                    `;
                }
            }
        }

        html += `
                        </tbody>
                    </table>
                </div>
            </div>
        `;

        // Bảng Event Bus
        const b = s.eventBus;
        html += `
            <div>
                <h3 style="font-size:15px; font-weight:800; color:#0c3258; margin-bottom:10px;">
                    HÀNG ĐỢI SỰ KIỆN BẤT ĐỒNG BỘ (EVENT BUS :3600)
                </h3>
        `;

        if (!b) {
            html += `<p style="color:#c62828;">Event Bus không phản hồi (các dịch vụ sẽ tự lưu sự kiện trong bộ nhớ và phát lại).</p>`;
        } else {
            html += `
                <div class="dashboard-metrics-grid" style="margin-bottom:16px;">
                    <div class="metric-card">
                        <div class="metric-card-icon green">📬</div>
                        <div>
                            <div class="metric-card-value">${b.delivered || 0}</div>
                            <div class="metric-card-label">Sự kiện đã giao thành công</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-card-icon orange">⏳</div>
                        <div>
                            <div class="metric-card-value">${b.pending || 0}</div>
                            <div class="metric-card-label">Sự kiện đang chờ giao</div>
                        </div>
                    </div>
                    <div class="metric-card">
                        <div class="metric-card-icon purple">⚠️</div>
                        <div>
                            <div class="metric-card-value">${b.deadLetters || 0}</div>
                            <div class="metric-card-label">Dead-letter queue</div>
                        </div>
                    </div>
                </div>

                <div class="qnu-table-container">
                    <table class="qnu-table">
                        <thead>
                            <tr>
                                <th>SUBSCRIBER SERVICE</th>
                                <th>CÁC CHỦ ĐỀ SỰ KIỆN ĐĂNG KÝ (TOPICS)</th>
                            </tr>
                        </thead>
                        <tbody>
            `;

            const subEntries = Object.entries(b.subscribers || {});
            if (subEntries.length === 0) {
                html += `<tr><td colspan="2" class="text-center">Chưa có subscriber nào.</td></tr>`;
            } else {
                for (const [subName, subInfo] of subEntries) {
                    html += `
                        <tr>
                            <td><strong>${esc(subName)}</strong></td>
                            <td><code>${esc((subInfo.topics || []).join(', '))}</code></td>
                        </tr>
                    `;
                }
            }

            html += `
                        </tbody>
                    </table>
                </div>
            `;
        }

        html += `</div>`;
        box.innerHTML = html;
    }

    window.loadSoaSystemView = loadSoaSystemView;

    // Tự động kiểm tra badge thông báo định kỳ
    async function pollNotifications() {
        if (!localStorage.getItem('token')) return;
        try {
            const res = await fetch('/api/notifications', {
                headers: { 'Authorization': 'Bearer ' + localStorage.getItem('token') }
            });
            if (res.ok) {
                const data = await res.json();
                if (typeof updateNotifBadge === 'function') {
                    updateNotifBadge(data.unread || 0);
                }
            }
        } catch { /* Bỏ qua nếu notification-service tạm tắt */ }
    }

    setInterval(pollNotifications, 10000);
    setInterval(() => {
        if (window.currentSection === 'soa-system') {
            loadSoaSystemView();
        }
    }, 6000);
})();
