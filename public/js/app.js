/**
 * CỔNG THÔNG TIN ĐÀO TẠO & QUẢN LÝ ĐỒ ÁN TỐT NGHIỆP - TRƯỜNG ĐẠI HỌC QUY NHƠN (QNU)
 * Kiến trúc Hướng Dịch Vụ (SOA) - Express.js
 */

const API_BASE = '/api';

// Escape HTML chống XSS
const esc = (s) => String(s === null || s === undefined ? '' : s)
    .replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(message, isError = false) {
    let box = document.getElementById('toastBox');
    if (!box) {
        box = document.createElement('div');
        box.id = 'toastBox';
        document.body.appendChild(box);
    }
    const t = document.createElement('div');
    t.className = `toast-item ${isError ? 'error' : 'success'}`;
    t.textContent = message;
    box.appendChild(t);
    setTimeout(() => t.remove(), 4000);
}

// ==========================================================================
// 1. QUẢN LÝ PHIÊN & ĐĂNG NHẬP (AUTH / JWT)
// ==========================================================================

const getToken = () => localStorage.getItem('token');
const getUser = () => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
};

function saveSession(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('user', JSON.stringify(data.user));
}

function clearSession() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function switchAuthMode(mode) {
    const tabLogin = document.getElementById('tabBtnLogin');
    const tabRegister = document.getElementById('tabBtnRegister');
    const loginForm = document.getElementById('authLoginFormContainer');
    const regForm = document.getElementById('authRegisterFormContainer');

    if (mode === 'register') {
        if (tabLogin) tabLogin.classList.remove('active');
        if (tabRegister) tabRegister.classList.add('active');
        if (loginForm) loginForm.style.display = 'none';
        if (regForm) regForm.style.display = 'block';
    } else {
        if (tabLogin) tabLogin.classList.add('active');
        if (tabRegister) tabRegister.classList.remove('active');
        if (loginForm) loginForm.style.display = 'block';
        if (regForm) regForm.style.display = 'none';
    }
}

async function registerStudentAccount() {
    const maSVInput = document.getElementById('regMaSV');
    const hoTenInput = document.getElementById('regHoTen');
    const lopInput = document.getElementById('regLop');
    const nganhInput = document.getElementById('regNganh');
    const emailInput = document.getElementById('regEmail');
    const passInput = document.getElementById('regPassword');
    const passConfInput = document.getElementById('regPasswordConfirm');

    const maSVErr = document.getElementById('regMaSVError');
    const hoTenErr = document.getElementById('regHoTenError');
    const passErr = document.getElementById('regPasswordError');
    const passConfErr = document.getElementById('regPasswordConfirmError');

    const MaSV = maSVInput ? maSVInput.value.trim().toUpperCase() : '';
    const HoTen = hoTenInput ? hoTenInput.value.trim() : '';
    const Lop = lopInput ? lopInput.value.trim() : 'DHKTPM20';
    const Nganh = nganhInput ? nganhInput.value : 'Công nghệ phần mềm';
    const Email = emailInput ? emailInput.value.trim() : '';
    const MatKhau = passInput ? passInput.value : '';
    const MatKhauXacNhan = passConfInput ? passConfInput.value : '';

    let hasErr = false;

    if (!MaSV) {
        if (maSVInput) maSVInput.classList.add('error');
        if (maSVErr) maSVErr.classList.add('show');
        hasErr = true;
    } else {
        if (maSVInput) maSVInput.classList.remove('error');
        if (maSVErr) maSVErr.classList.remove('show');
    }

    if (!HoTen) {
        if (hoTenInput) hoTenInput.classList.add('error');
        if (hoTenErr) hoTenErr.classList.add('show');
        hasErr = true;
    } else {
        if (hoTenInput) hoTenInput.classList.remove('error');
        if (hoTenErr) hoTenErr.classList.remove('show');
    }

    if (!MatKhau || MatKhau.length < 6) {
        if (passInput) passInput.classList.add('error');
        if (passErr) passErr.classList.add('show');
        hasErr = true;
    } else {
        if (passInput) passInput.classList.remove('error');
        if (passErr) passErr.classList.remove('show');
    }

    if (MatKhau !== MatKhauXacNhan) {
        if (passConfInput) passConfInput.classList.add('error');
        if (passConfErr) passConfErr.classList.add('show');
        hasErr = true;
    } else {
        if (passConfInput) passConfInput.classList.remove('error');
        if (passConfErr) passConfErr.classList.remove('show');
    }

    if (hasErr) return;

    try {
        const res = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                TenDangNhap: MaSV,
                MatKhau,
                HoTen,
                Email: Email || null,
                VaiTro: 'sinhvien',
                MaSV,
                Lop,
                Nganh
            })
        });
        const result = await res.json().catch(() => ({}));

        if (!res.ok) {
            return toast(result.message || 'Đăng ký tài khoản không thành công', true);
        }

        toast('🎉 Đăng ký tài khoản sinh viên thành công! Đang tự động đăng nhập...');

        // Tự động chuyển về form đăng nhập và điền thông tin để đăng nhập luôn
        switchAuthMode('login');
        const usernameInput = document.getElementById('loginUsername');
        const passwordInput = document.getElementById('loginPassword');
        if (usernameInput) usernameInput.value = MaSV;
        if (passwordInput) passwordInput.value = MatKhau;

        await login();
    } catch (e) {
        console.error(e);
        toast('Không thể kết nối đến máy chủ Gateway (3000)', true);
    }
}

function quickFillLogin(username, password) {
    document.getElementById('loginUsername').value = username;
    document.getElementById('loginPassword').value = password;
    login();
}

async function login() {
    const usernameInput = document.getElementById('loginUsername');
    const passwordInput = document.getElementById('loginPassword');
    const uErr = document.getElementById('usernameError');
    const pErr = document.getElementById('passwordError');

    const TenDangNhap = usernameInput.value.trim();
    const MatKhau = passwordInput.value;

    let hasErr = false;
    if (!TenDangNhap) {
        usernameInput.classList.add('error');
        if (uErr) uErr.classList.add('show');
        hasErr = true;
    } else {
        usernameInput.classList.remove('error');
        if (uErr) uErr.classList.remove('show');
    }

    if (!MatKhau) {
        passwordInput.classList.add('error');
        if (pErr) pErr.classList.add('show');
        hasErr = true;
    } else {
        passwordInput.classList.remove('error');
        if (pErr) pErr.classList.remove('show');
    }

    if (hasErr) return;

    try {
        const res = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ TenDangNhap, MatKhau })
        });
        const result = await res.json().catch(() => ({}));

        if (!res.ok) {
            return toast(result.message || 'Đăng nhập không thành công', true);
        }

        saveSession(result);
        toast(`Xin chào ${result.user.HoTen}! Đăng nhập thành công.`);
        updateAuthUI();
        showSection('dashboard');
    } catch (e) {
        console.error(e);
        toast('Không thể kết nối đến máy chủ Gateway (3000)', true);
    }
}

function logout() {
    clearSession();
    updateAuthUI();
    toast('Đã đăng xuất tài khoản an toàn');
}

function updateAuthUI() {
    const user = getUser();
    const token = getToken();
    const loginScreen = document.getElementById('loginScreen');
    const appLayout = document.getElementById('appLayout');

    if (!token || !user) {
        if (loginScreen) loginScreen.style.display = 'flex';
        if (appLayout) appLayout.style.display = 'none';
        return;
    }

    if (loginScreen) loginScreen.style.display = 'none';
    if (appLayout) appLayout.style.display = 'flex';

    // Cập nhật thông tin thẻ người dùng ở sidebar trái (Ảnh 2)
    const nameEl = document.getElementById('sidebarUserName');
    const roleEl = document.getElementById('sidebarUserRole');

    if (nameEl) nameEl.textContent = user.HoTen || user.TenDangNhap;
    if (roleEl) {
        if (user.VaiTro === 'sinhvien') {
            roleEl.textContent = `Sinh viên - ${user.MaSV || user.TenDangNhap}`;
        } else if (user.VaiTro === 'giangvien') {
            roleEl.textContent = `Giảng viên - ${user.Nganh || 'Khoa CNTT'}`;
        } else if (user.VaiTro === 'admin') {
            roleEl.textContent = 'Quản trị viên hệ thống';
        }
    }

    // Phân quyền hiển thị Menu Accordion
    const teacherMenu = document.getElementById('sectionTeacherMenu');
    const adminMenu = document.getElementById('sectionAdminMenu');

    if (teacherMenu) {
        teacherMenu.style.display = (user.VaiTro === 'giangvien' || user.VaiTro === 'admin') ? 'block' : 'none';
    }
    if (adminMenu) {
        adminMenu.style.display = (user.VaiTro === 'admin') ? 'block' : 'none';
    }

    // Tùy biến nhãn menu Học vụ theo vai trò (Sinh viên vs Giảng viên vs Admin)
    const navDashboard = document.getElementById('navDashboardLabel');
    const navHocVuTitle = document.getElementById('navHocVuSectionTitle');
    const navReg = document.getElementById('navRegLabel');
    const navGrades = document.getElementById('navGradesLabel');

    if (user.VaiTro === 'sinhvien') {
        if (navDashboard) navDashboard.textContent = 'Tổng quan học tập';
        if (navHocVuTitle) navHocVuTitle.textContent = 'HỌC VỤ';
        if (navReg) navReg.textContent = 'Đăng ký đề tài tốt nghiệp';
        if (navGrades) navGrades.textContent = 'Xem điểm & Kết quả';
    } else if (user.VaiTro === 'giangvien') {
        if (navDashboard) navDashboard.textContent = 'Tổng quan giảng dạy';
        if (navHocVuTitle) navHocVuTitle.textContent = 'HỌC VỤ & SINH VIÊN';
        if (navReg) navReg.textContent = 'Đăng ký đề tài cho SV';
        if (navGrades) navGrades.textContent = 'Tra cứu bảng điểm SV';
    } else if (user.VaiTro === 'admin') {
        if (navDashboard) navDashboard.textContent = 'Tổng quan điều hành';
        if (navHocVuTitle) navHocVuTitle.textContent = 'HỌC VỤ TOÀN TRƯỜNG';
        if (navReg) navReg.textContent = 'Đăng ký đề tài cho SV';
        if (navGrades) navGrades.textContent = 'Bảng điểm sinh viên toàn trường';
    }

    checkUnreadNotifications();
}

// Gọi API với xử lý chịu lỗi & Loose Coupling (SOA)
async function api(method, path, body = undefined) {
    const token = getToken();
    const headers = {};
    if (token) headers['Authorization'] = `Bearer ${token}`;
    if (body !== undefined) headers['Content-Type'] = 'application/json';

    try {
        const res = await fetch(`${API_BASE}${path}`, {
            method,
            headers,
            body: body !== undefined ? JSON.stringify(body) : undefined
        });

        if (res.status === 401) {
            clearSession();
            updateAuthUI();
            toast('Phiên đăng nhập đã hết hạn, vui lòng đăng nhập lại', true);
            return null;
        }

        const degraded = res.headers.get('x-degraded') === 'true';
        if (degraded) {
            showDegradedNotice('Hệ thống đang hoạt động ở chế độ phân tán suy giảm (Degraded Mode). Dữ liệu liên dịch vụ vẫn được bảo toàn.');
        } else {
            hideDegradedNotice();
        }

        const json = await res.json().catch(() => ({}));

        if (res.status === 503) {
            showDegradedNotice(json.message || 'Dịch vụ liên quan tạm thời không phản hồi. Nhờ kiến trúc SOA (Loose Coupling), các phân hệ khác vẫn hoạt động bình thường.');
        }

        return {
            ok: res.ok,
            status: res.status,
            data: json.data,
            message: json.message,
            degraded: json.degraded || degraded
        };
    } catch (e) {
        console.warn(`[SOA Fault Tolerance] API call ${path} failed:`, e.message);
        showDegradedNotice(`Dịch vụ liên quan tạm thời không phản hồi. Các chức năng khác của hệ thống vẫn hoạt động bình thường.`);
        return { ok: false, status: 503, message: 'Dịch vụ tạm thời không khả dụng' };
    }
}

function showDegradedNotice(msg) {
    const alert = document.getElementById('soaDegradedAlert');
    const text = document.getElementById('soaDegradedMsg');
    if (alert && text) {
        text.innerHTML = `<strong>Đặc tính chịu lỗi SOA (Fault Tolerance):</strong> ${esc(msg)}`;
        alert.style.display = 'flex';
    }
}

function hideDegradedNotice() {
    const alert = document.getElementById('soaDegradedAlert');
    if (alert) alert.style.display = 'none';
}

function retryCurrentSection() {
    hideDegradedNotice();
    if (currentSection) showSection(currentSection);
}

// ==========================================================================
// 2. ĐIỀU HƯỚNG VÀ CHUYỂN PHÂN HỆ (NAVIGATION)
// ==========================================================================

let currentSection = 'dashboard';

const SECTION_TITLES = {
    'dashboard': 'Tổng quan học tập',
    'curriculum': 'Chương trình đào tạo',
    'registration': 'Đăng ký đề tài tốt nghiệp',
    'grades': 'Xem điểm & Kết quả học tập',
    'schedule': 'Thời khóa biểu & Lịch thi',
    'profile': 'Thông tin cá nhân',
    'notifications': 'Tin nhắn & Thông báo',
    'teacher-topics': 'Tạo & Quản lý lớp học phần',
    'teacher-approvals': 'Duyệt sinh viên đăng ký',
    'teacher-grading': 'Chấm điểm kết quả học tập',
    'student-lookup': 'Tra cứu hồ sơ sinh viên theo mã SV',
    'admin-users': 'Quản trị người dùng & Phân quyền',
    'admin-students': 'Quản lý hồ sơ sinh viên',
    'soa-system': 'Trạng thái hệ thống SOA'
};

function getSectionTitle(sectionId, role) {
    if (sectionId === 'dashboard') {
        if (role === 'admin') return 'Trung tâm điều hành & Quản trị đào tạo';
        if (role === 'giangvien') return 'Tổng quan giảng dạy & Hướng dẫn đồ án';
        return 'Tổng quan học tập';
    }
    if (sectionId === 'registration') {
        if (role === 'admin' || role === 'giangvien') return 'Đăng ký đề tài cho sinh viên';
        return 'Đăng ký đề tài tốt nghiệp';
    }
    if (sectionId === 'grades') {
        if (role === 'admin' || role === 'giangvien') return 'Tra cứu bảng điểm & Kết quả sinh viên';
        return 'Xem điểm & Kết quả học tập';
    }
    return SECTION_TITLES[sectionId] || sectionId;
}

function getSectionCategory(sectionId, role) {
    if (['dashboard', 'profile', 'notifications'].includes(sectionId)) {
        return 'Trang cá nhân';
    }
    if (['curriculum', 'registration', 'grades', 'schedule'].includes(sectionId)) {
        if (role === 'admin') return 'Học vụ toàn trường';
        if (role === 'giangvien') return 'Học vụ & Sinh viên';
        return 'Học vụ';
    }
    if (['teacher-topics', 'teacher-approvals', 'teacher-grading'].includes(sectionId)) {
        return 'Quản lý đào tạo (Giảng viên)';
    }
    if (['admin-users', 'admin-students', 'soa-system'].includes(sectionId)) {
        return 'Quản trị hệ thống';
    }
    if (sectionId === 'student-lookup') {
        if (role === 'admin') return 'Quản trị hệ thống';
        return 'Quản lý đào tạo (Giảng viên)';
    }
    return 'Học vụ';
}

function showSection(sectionId) {
    currentSection = sectionId;

    const user = getUser();
    const role = user ? user.VaiTro : 'sinhvien';

    // Cập nhật Breadcrumbs (Danh mục cha & Tên mục)
    const bcCat = document.getElementById('breadcrumbCategory');
    if (bcCat) bcCat.textContent = getSectionCategory(sectionId, role);

    const bc = document.getElementById('breadcrumbCurrent');
    if (bc) bc.textContent = getSectionTitle(sectionId, role);

    // Cập nhật Active Menu Item & tự động mở accordion cha
    document.querySelectorAll('.sidebar-nav-item').forEach((item) => {
        const isActive = item.dataset.section === sectionId;
        item.classList.toggle('active', isActive);
        if (isActive) {
            const parentAccordion = item.closest('.accordion-section');
            if (parentAccordion) parentAccordion.classList.remove('collapsed');
        }
    });

    // Ẩn tất cả các view, chỉ hiện view được chọn
    document.querySelectorAll('.portal-view').forEach((v) => v.style.display = 'none');
    const targetView = document.getElementById(`view-${sectionId}`);
    if (targetView) targetView.style.display = 'block';

    // Nạp dữ liệu tương ứng
    if (sectionId === 'dashboard') loadDashboardView();
    else if (sectionId === 'curriculum') renderCurriculumTable();
    else if (sectionId === 'registration') {
        loadAvailableTopics();
        loadStudentRegistrations();
        switchRegViewTab(currentRegTab || 'topics');
    }
    else if (sectionId === 'grades') loadGradesView();
    else if (sectionId === 'profile') loadProfileView();
    else if (sectionId === 'notifications') loadNotificationsList();
    else if (sectionId === 'teacher-topics') loadTeacherTopics();
    else if (sectionId === 'teacher-approvals') loadTeacherApprovals();
    else if (sectionId === 'teacher-grading') loadTeacherGrading();
    else if (sectionId === 'admin-users') loadAdminUsers();
    else if (sectionId === 'admin-students') loadAdminStudents();
    else if (sectionId === 'soa-system') loadSoaSystemView();
}

function toggleSidebar() {
    const sidebar = document.getElementById('leftSidebar');
    if (sidebar) sidebar.classList.toggle('show-mobile');
}

function toggleAccordion(button) {
    const section = button.closest('.accordion-section');
    if (section) section.classList.toggle('collapsed');
}

function toggleUserDropdown() {
    showSection('profile');
}

// ==========================================================================
// 3. VIEW 1: TỔNG QUAN (DASHBOARD) - TỰ ĐỘNG THÍCH ỨNG THEO VAI TRÒ
// ==========================================================================

async function loadDashboardView() {
    const user = getUser();
    const container = document.getElementById('dashContainer');
    if (!user || !container) return;

    // Nạp thông báo gần nhất
    const nRes = await api('GET', '/notifications');
    let latestNotifHtml = 'Không có thông báo mới.';
    if (nRes && nRes.ok && nRes.data && nRes.data.length > 0) {
        const latest = nRes.data[0];
        latestNotifHtml = `<strong>${esc(latest.title)}:</strong> ${esc(latest.message)}`;
        updateNotifBadge(nRes.unread);
    }

    // ==========================================
    // 1. SINH VIÊN DASHBOARD (Tổng quan học tập)
    // ==========================================
    if (user.VaiTro === 'sinhvien') {
        const sRes = await api('GET', `/students/${user.MaSV || user.TenDangNhap}`);
        const rRes = await api('GET', '/registrations');

        let gpaVal = '3.45';
        let creditsVal = '122 / 135';
        if (sRes && sRes.ok && sRes.data) {
            const s = sRes.data;
            gpaVal = s.GPA ? Number(s.GPA).toFixed(2) : '3.45';
            creditsVal = `${s.SoTCTichLuy || 122} / 135`;
        }

        const myRegs = (rRes && rRes.ok && Array.isArray(rRes.data))
            ? rRes.data.filter((r) => r.MaSV === (user.MaSV || user.TenDangNhap))
            : [];

        let statusText = 'Chưa đăng ký';
        let scoreText = '- / 10';
        let regRowsHtml = '';

        if (myRegs.length > 0) {
            const activeReg = myRegs[0];
            statusText = statusBadgeText(activeReg.TrangThai);
            scoreText = activeReg.Diem !== null && activeReg.Diem !== undefined ? `${activeReg.Diem} / 10` : '- / 10';

            regRowsHtml = myRegs.map((r) => `
                <tr>
                    <td class="text-center"><strong>#${r.MaDK}</strong></td>
                    <td class="text-center"><code>${esc(r.MaDT)}</code></td>
                    <td><strong>${esc(r.TenDT)}</strong></td>
                    <td>
                        <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')" title="Nhấp để xem thông tin giảng viên">
                            ${esc(r.GiangVienHuongDan || 'Giảng viên')}
                        </button>
                    </td>
                    <td class="text-center">${esc(formatDateVN(r.NgayDangKy))}</td>
                    <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
                    <td class="text-center font-bold" style="color:#004882;">${r.Diem !== null && r.Diem !== undefined ? esc(r.Diem) : '-'}</td>
                    <td class="text-center">
                        ${r.TrangThai === 'Cho duyet' ? `<button class="btn-table-action btn-cancel-reg" onclick="cancelRegistration(${r.MaDK})">Hủy đăng ký</button>` : '—'}
                    </td>
                </tr>
            `).join('');
        } else {
            regRowsHtml = `<tr><td colspan="8" class="text-center" style="padding: 24px; color: #888;">
                Bạn chưa có đăng ký đề tài nào. Vui lòng vào mục <a href="javascript:void(0)" onclick="showSection('registration')" style="color:#004882; font-weight:bold;">Đăng ký đề tài tốt nghiệp</a> để chọn đề tài.
            </td></tr>`;
        }

        container.innerHTML = `
            <div class="dashboard-metrics-grid">
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${gpaVal}</div>
                        <div class="metric-card-label">Điểm GPA tích lũy</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${creditsVal}</div>
                        <div class="metric-card-label">Số tín chỉ tích lũy</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${statusText}</div>
                        <div class="metric-card-label">Trạng thái đồ án tốt nghiệp</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${scoreText}</div>
                        <div class="metric-card-label">Điểm kết quả đồ án</div>
                    </div>
                </div>
            </div>

            <div class="filter-dropdown-bar">
                <div class="filter-group">
                    <span class="filter-label">Thông báo học tập gần nhất:</span>
                    <span style="font-size: 13.5px; color: #444;">${latestNotifHtml}</span>
                </div>
                <button class="btn-primary-action" onclick="showSection('registration')">
                    Xem đăng ký đề tài →
                </button>
            </div>

            <div class="qnu-table-container">
                <table class="qnu-table">
                    <thead>
                        <tr>
                            <th>MÃ ĐĂNG KÝ</th>
                            <th>MÃ ĐỀ TÀI / HỌC PHẦN</th>
                            <th>TÊN ĐỀ TÀI TỐT NGHIỆP</th>
                            <th>GIẢNG VIÊN HƯỚNG DẪN</th>
                            <th>NGÀY ĐĂNG KÝ</th>
                            <th>TRẠNG THÁI DUYỆT</th>
                            <th>ĐIỂM KẾT QUẢ</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${regRowsHtml}
                    </tbody>
                </table>
            </div>
        `;
        return;
    }

    // ==========================================
    // 2. GIẢNG VIÊN DASHBOARD (Bàn làm việc giảng dạy)
    // ==========================================
    if (user.VaiTro === 'giangvien') {
        const [tRes, rRes] = await Promise.all([
            api('GET', '/topics'),
            api('GET', '/registrations')
        ]);

        const allTopics = (tRes && tRes.ok && Array.isArray(tRes.data)) ? tRes.data : [];
        const allRegs = (rRes && rRes.ok && Array.isArray(rRes.data)) ? rRes.data : [];

        const myTopics = allTopics.filter((t) => t.MaGV === user.TenDangNhap || (t.GiangVienHuongDan && t.GiangVienHuongDan.includes(user.HoTen)) || true);
        const pendingRegs = allRegs.filter((r) => r.TrangThai === 'Cho duyet');
        const approvedRegs = allRegs.filter((r) => r.TrangThai === 'Da duyet' || r.TrangThai === 'Dang thuc hien');
        const needGrading = allRegs.filter((r) => (r.TrangThai === 'Da duyet' || r.TrangThai === 'Dang thuc hien') && (r.Diem === null || r.Diem === undefined));

        let teacherRowsHtml = '';
        if (allRegs.length === 0) {
            teacherRowsHtml = `<tr><td colspan="8" class="text-center" style="padding:24px; color:#777;">Hiện tại chưa có sinh viên nào đăng ký đề tài của Thầy/Cô.</td></tr>`;
        } else {
            teacherRowsHtml = allRegs.slice(0, 10).map((r) => `
                <tr>
                    <td class="text-center"><strong>#${r.MaDK}</strong></td>
                    <td class="text-center"><code>${esc(r.MaSV)}</code></td>
                    <td><strong>${esc(r.HoTen)}</strong></td>
                    <td>${esc(r.Lop || 'DHKTPM20')}</td>
                    <td><strong>${esc(r.TenDT)}</strong></td>
                    <td class="text-center">${esc(formatDateVN(r.NgayDangKy))}</td>
                    <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
                    <td class="text-center">
                        ${r.TrangThai === 'Cho duyet' ? `
                            <button class="btn-table-action btn-approve" onclick="approveRegistration(${r.MaDK})">Duyệt nhanh</button>
                            <button class="btn-table-action btn-reject" onclick="rejectRegistrationPrompt(${r.MaDK})">Từ chối</button>
                        ` : ''}
                        ${r.TrangThai === 'Da duyet' && (r.Diem === null || r.Diem === undefined) ? `
                            <button class="btn-table-action btn-grade" onclick="openGradeModal(${r.MaDK}, '${esc(r.HoTen)}', '${esc(r.TenDT)}', 0, '')">Chấm điểm</button>
                        ` : ''}
                        <button class="btn-table-action btn-register" onclick="openEditRegistrationModal(${r.MaDK})">Sửa</button>
                        <button class="btn-table-action btn-reject" onclick="deleteRegistration(${r.MaDK})">Xóa</button>
                        <button class="btn-table-action" style="background:#0e4b85; color:#fff;" onclick="quickLookupCode('${esc(r.MaSV)}')">Tra cứu</button>
                    </td>
                </tr>
            `).join('');
        }

        container.innerHTML = `
            <div style="background:#fff; border:1px solid #dbe2ea; border-radius:8px; padding:18px 22px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                    <h2 style="font-size:20px; font-weight:800; color:#0c3258; margin-bottom:4px;">
                        BÀN LÀM VIỆC GIẢNG VIÊN - QUẢN LÝ ĐÀO TẠO & HƯỚNG DẪN
                    </h2>
                    <div style="font-size:13.5px; color:#64748b;">
                        Giảng viên: <strong>${esc(user.HoTen)}</strong> &bull; Đơn vị: <strong>${esc(user.Nganh || 'Khoa Công nghệ thông tin')}</strong> &bull; Học kỳ 1 Niên khóa 2022 - 2026
                    </div>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn-primary-action" onclick="openTopicModal()">Tạo lớp học phần mới</button>
                    <button class="btn-primary-action" style="background:#0e4b85;" onclick="showSection('student-lookup')">Tra cứu mã SV</button>
                </div>
            </div>

            <div class="dashboard-metrics-grid">
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${myTopics.length} đề tài</div>
                        <div class="metric-card-label">Lớp học phần phụ trách</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value" style="color:#d97706;">${pendingRegs.length} SV</div>
                        <div class="metric-card-label">Sinh viên đang chờ duyệt</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value" style="color:#16a34a;">${approvedRegs.length} SV</div>
                        <div class="metric-card-label">Sinh viên đã duyệt hướng dẫn</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value" style="color:#7c3aed;">${needGrading.length} đồ án</div>
                        <div class="metric-card-label">Đồ án cần chấm điểm</div>
                    </div>
                </div>
            </div>

            <div class="filter-dropdown-bar">
                <div class="filter-group">
                    <span class="filter-label">Danh sách đăng ký sinh viên cần xử lý gần đây:</span>
                </div>
                <div class="action-btn-group">
                    <button class="btn-primary-action" onclick="showSection('teacher-approvals')">Tới trang Duyệt sinh viên →</button>
                    <button class="btn-primary-action" style="background:#15803d;" onclick="showSection('teacher-grading')">Tới trang Chấm điểm →</button>
                </div>
            </div>

            <div class="qnu-table-container">
                <table class="qnu-table">
                    <thead>
                        <tr>
                            <th>MÃ ĐK</th>
                            <th>MÃ SV</th>
                            <th>HỌ VÀ TÊN SINH VIÊN</th>
                            <th>LỚP</th>
                            <th>TÊN LỚP HỌC PHẦN / ĐỀ TÀI</th>
                            <th>NGÀY ĐĂNG KÝ</th>
                            <th>TRẠNG THÁI</th>
                            <th>THAO TÁC XỬ LÝ</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${teacherRowsHtml}
                    </tbody>
                </table>
            </div>
        `;
        return;
    }

    // ==========================================
    // 3. ADMIN DASHBOARD (Trung tâm điều hành đào tạo toàn trường)
    // ==========================================
    if (user.VaiTro === 'admin') {
        const [sRes, tRes, rRes, uRes] = await Promise.all([
            api('GET', '/students'),
            api('GET', '/topics'),
            api('GET', '/registrations'),
            api('GET', '/auth/users')
        ]);

        const students = (sRes && sRes.ok && Array.isArray(sRes.data)) ? sRes.data : [];
        const topics = (tRes && tRes.ok && Array.isArray(tRes.data)) ? tRes.data : [];
        const regs = (rRes && rRes.ok && Array.isArray(rRes.data)) ? rRes.data : [];
        const users = (uRes && uRes.ok && Array.isArray(uRes.data)) ? uRes.data : [];

        let adminRowsHtml = '';
        if (regs.length === 0) {
            adminRowsHtml = `<tr><td colspan="9" class="text-center" style="padding:24px; color:#777;">Hệ thống chưa có bản ghi đăng ký nào.</td></tr>`;
        } else {
            adminRowsHtml = regs.slice(0, 10).map((r) => `
                <tr>
                    <td class="text-center"><strong>#${r.MaDK}</strong></td>
                    <td class="text-center"><code>${esc(r.MaSV)}</code></td>
                    <td><strong>${esc(r.HoTen)}</strong></td>
                    <td>${esc(r.Lop || 'DHKTPM20')}</td>
                    <td><strong>${esc(r.TenDT)}</strong></td>
                    <td>
                        <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')" title="Nhấp để xem thông tin giảng viên">
                            ${esc(r.GiangVienHuongDan || 'Giảng viên')}
                        </button>
                    </td>
                    <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
                    <td class="text-center font-bold" style="color:#004882;">${r.Diem !== null && r.Diem !== undefined ? Number(r.Diem).toFixed(1) : '-'}</td>
                    <td class="text-center">
                        <button class="btn-table-action btn-register" onclick="openEditRegistrationModal(${r.MaDK})">Sửa</button>
                        <button class="btn-table-action btn-reject" onclick="deleteRegistration(${r.MaDK})">Xóa</button>
                        <button class="btn-table-action" style="background:#0e4b85; color:#fff;" onclick="quickLookupCode('${esc(r.MaSV)}')">Tra cứu</button>
                    </td>
                </tr>
            `).join('');
        }

        container.innerHTML = `
            <div style="background:#fff; border:1px solid #dbe2ea; border-radius:8px; padding:18px 22px; margin-bottom:20px; display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                <div>
                    <h2 style="font-size:20px; font-weight:800; color:#0c3258; margin-bottom:4px;">
                        TRUNG TÂM ĐIỀU HÀNH & QUẢN TRỊ ĐÀO TẠO TOÀN TRƯỜNG
                    </h2>
                    <div style="font-size:13.5px; color:#64748b;">
                        Quản trị viên: <strong>${esc(user.HoTen)}</strong> &bull; Trường Đại học Quy Nhơn (QNU) &bull; Kiến trúc SOA Microservices
                    </div>
                </div>
                <div style="display:flex; gap:10px; flex-wrap:wrap;">
                    <button class="btn-primary-action" onclick="openStudentModal()">Thêm sinh viên</button>
                    <button class="btn-primary-action" style="background:#0e4b85;" onclick="showSection('student-lookup')">Tra cứu mã SV</button>
                    <button class="btn-primary-action" style="background:#15803d;" onclick="showSection('soa-system')">Giám sát SOA</button>
                </div>
            </div>

            <div class="dashboard-metrics-grid">
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${students.length} sinh viên</div>
                        <div class="metric-card-label">Tổng sinh viên toàn trường</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${topics.length} đề tài</div>
                        <div class="metric-card-label">Tổng lớp học phần / đề tài mở</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value">${regs.length} lượt</div>
                        <div class="metric-card-label">Tổng lượt đăng ký học vụ</div>
                    </div>
                </div>
                <div class="metric-card">
                    
                    <div>
                        <div class="metric-card-value" style="color:#16a34a; font-size:17px;">100% Khỏe mạnh</div>
                        <div class="metric-card-label">Kiến trúc SOA 5 Services</div>
                    </div>
                </div>
            </div>

            <div class="filter-dropdown-bar">
                <div class="filter-group">
                    <span class="filter-label">Nhật ký đăng ký học vụ toàn trường gần nhất:</span>
                </div>
                <div class="action-btn-group">
                    <button class="btn-primary-action" onclick="showSection('admin-students')">Quản lý sinh viên →</button>
                    <button class="btn-primary-action" style="background:#0e4b85;" onclick="showSection('admin-users')">Quản lý tài khoản →</button>
                </div>
            </div>

            <div class="qnu-table-container">
                <table class="qnu-table">
                    <thead>
                        <tr>
                            <th>MÃ ĐK</th>
                            <th>MÃ SV</th>
                            <th>HỌ VÀ TÊN SINH VIÊN</th>
                            <th>LỚP</th>
                            <th>TÊN LỚP HỌC PHẦN / ĐỀ TÀI</th>
                            <th>GIẢNG VIÊN HƯỚNG DẪN</th>
                            <th>TRẠNG THÁI</th>
                            <th>ĐIỂM KẾT QUẢ</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${adminRowsHtml}
                    </tbody>
                </table>
            </div>
        `;
    }
}

// ==========================================================================
// 4. VIEW 2: CHƯƠNG TRÌNH ĐÀO TẠO (CHUẨN FORM ẢNH 2 daotao.qnu.edu.vn)
// ==========================================================================

const SAMPLE_CURRICULUM_DATA = [
    // Học kỳ 1
    { tt: 1, ma: '1010245', ten: 'Giải tích', tc: 3, lt: 45, th: 0, tl: 0, tt_val: 0, btl: 0, da: 0, kl: 0, truoc: '', thay: '' },
    { tt: 2, ma: '1010038', ten: 'Đại số tuyến tính', tc: 3, lt: 45, th: 0, tl: 0, tt_val: 0, btl: 0, da: 0, kl: 0, truoc: '', thay: '' },
    { tt: 3, ma: '1050074', ten: 'Toán logic', tc: 2, lt: 30, th: 0, tl: 0, tt_val: 0, btl: 0, da: 0, kl: 0, truoc: '', thay: '' },
    { tt: 4, ma: '1050124', ten: 'Thực hành máy tính (lắp ráp, cài đặt, bảo trì)', tc: 1, lt: 0, th: 30, tl: 0, tt_val: 0, btl: 0, da: 0, kl: 0, truoc: '', thay: '' },
    { tt: 5, ma: '1050273', ten: 'Lập trình cơ bản', tc: 3, lt: 30, th: 30, tl: 0, tt_val: 0, btl: 0, da: 0, kl: 0, truoc: '', thay: '' },
    { tt: 6, ma: '1090061', ten: 'Tiếng Anh 1', tc: 3, lt: 45, th: 0, tl: 0, tt_val: 0, btl: 0, da: 0, kl: 0, truoc: '', thay: '' },
    { tt: 7, ma: '1130299', ten: 'Triết học Mác - Lênin', tc: 3, lt: 40, th: 0, tl: 10, tt_val: 0, btl: 0, da: 0, kl: 0, truoc: '', thay: '' },
    // Khóa luận tốt nghiệp
    { tt: 8, ma: '1050999', ten: 'Đồ án tốt nghiệp / Khóa luận tốt nghiệp', tc: 10, lt: 0, th: 0, tl: 0, tt_val: 0, btl: 0, da: 10, kl: 1, truoc: 'Kiến trúc phần mềm, Lập trình Web', thay: '' }
];

function renderCurriculumTable() {
    const tbody = document.getElementById('curriculumTableBody');
    if (!tbody) return;

    let html = `
        <tr class="group-header-semester">
            <td colspan="12">Học kỳ 1 (20.0 tín chỉ)</td>
        </tr>
        <tr class="group-header-mandatory">
            <td colspan="12">Bắt buộc (18.0 tín chỉ)</td>
        </tr>
    `;

    SAMPLE_CURRICULUM_DATA.slice(0, 7).forEach((c) => {
        html += `
            <tr>
                <td class="text-center">${c.tt}</td>
                <td class="text-center"><code>${c.ma}</code></td>
                <td><strong>${esc(c.ten)}</strong></td>
                <td class="text-center font-bold">${c.tc}</td>
                <td class="text-center">${c.lt}</td>
                <td class="text-center">${c.th}</td>
                <td class="text-center">${c.tl}</td>
                <td class="text-center">${c.tt_val}</td>
                <td class="text-center">${c.btl}</td>
                <td class="text-center">${c.da}</td>
                <td class="text-center">${c.kl}</td>
                <td>${esc(c.truoc)}</td>
                <td>${esc(c.thay)}</td>
            </tr>
        `;
    });

    html += `
        <tr class="group-header-semester">
            <td colspan="12">Học kỳ 8 - Khóa luận tốt nghiệp (10.0 tín chỉ)</td>
        </tr>
        <tr class="group-header-mandatory">
            <td colspan="12">Bắt buộc tốt nghiệp (Đồ án tốt nghiệp chuyên ngành)</td>
        </tr>
        <tr>
            <td class="text-center">8</td>
            <td class="text-center"><code>1050999</code></td>
            <td><strong>Đồ án tốt nghiệp (Học phần tốt nghiệp theo chuẩn SOA)</strong></td>
            <td class="text-center font-bold">10</td>
            <td class="text-center">0</td>
            <td class="text-center">0</td>
            <td class="text-center">0</td>
            <td class="text-center">0</td>
            <td class="text-center">0</td>
            <td class="text-center">10</td>
            <td class="text-center">1</td>
            <td><strong style="color:#c31e24;">Kiến trúc phần mềm, Lập trình Web (GPA >= 2.50)</strong></td>
            <td>-</td>
        </tr>
    `;

    tbody.innerHTML = html;
}

// ==========================================================================
// 5. VIEW 3: ĐĂNG KÝ ĐỀ TÀI / LỚP HỌC PHẦN (CHO SINH VIÊN)
// ==========================================================================

let availableTopicsCache = [];
let registeredCountsCache = {};
let currentStudentInfo = null;
let cachedRegistrations = [];
let selectedTopicId = null;
let selectedRegId = null;
let currentFilterTopicId = null;
let currentRegTab = 'topics';

function switchRegViewTab(tabName) {
    currentRegTab = tabName;
    const tabTopics = document.getElementById('tabBtnTopics');
    const tabStudents = document.getElementById('tabBtnStudents');
    const panelTopics = document.getElementById('panelAvailableTopics');
    const panelStudents = document.getElementById('panelStudentRegistrations');

    if (tabName === 'topics') {
        if (tabTopics) tabTopics.classList.add('active');
        if (tabStudents) tabStudents.classList.remove('active');
        if (panelTopics) panelTopics.style.display = 'block';
        if (panelStudents) panelStudents.style.display = 'none';
    } else {
        if (tabTopics) tabTopics.classList.remove('active');
        if (tabStudents) tabStudents.classList.add('active');
        if (panelTopics) panelTopics.style.display = 'none';
        if (panelStudents) panelStudents.style.display = 'block';
    }
}

async function loadAvailableTopics() {
    const tbody = document.getElementById('availableTopicsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="11" class="text-center">Đang tải danh sách đề tài mở đăng ký...</td></tr>`;

    const user = getUser();
    const majorFilter = document.getElementById('topicMajorFilter')?.value || '';

    // Lấy thông tin sinh viên hiện tại để kiểm tra điều kiện
    if (user && user.VaiTro === 'sinhvien') {
        const sRes = await api('GET', `/students/${user.MaSV || user.TenDangNhap}`);
        if (sRes && sRes.ok) currentStudentInfo = sRes.data;
    }

    // Gọi đồng thời topic-service và registration-service (đếm số lượng đã đăng ký)
    let topicUrl = '/topics';
    if (majorFilter) topicUrl += `?nganh=${encodeURIComponent(majorFilter)}`;

    const [tRes, cRes] = await Promise.all([
        api('GET', topicUrl),
        api('GET', '/registrations/counts')
    ]);

    if (!tRes || !tRes.ok || !Array.isArray(tRes.data)) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center" style="color:#c62828;">Không thể tải danh sách đề tài (topic-service tạm thời không phản hồi).</td></tr>`;
        return;
    }

    availableTopicsCache = tRes.data;
    registeredCountsCache = (cRes && cRes.ok && cRes.data) ? cRes.data : {};

    const topicCountBadge = document.getElementById('topicCountBadge');
    if (topicCountBadge) topicCountBadge.textContent = `${availableTopicsCache.length} đề tài`;

    if (availableTopicsCache.length === 0) {
        tbody.innerHTML = `<tr><td colspan="11" class="text-center">Không có đề tài / lớp học phần nào mở đăng ký trong chuyên ngành này.</td></tr>`;
        return;
    }

    tbody.innerHTML = availableTopicsCache.map((t, idx) => {
        const registeredCount = registeredCountsCache[t.MaDT] || 0;
        const maxCapacity = t.GioiHanSV || 5;
        const isFull = registeredCount >= maxCapacity;
        const isStudent = user && user.VaiTro === 'sinhvien';

        // Kiểm tra điều kiện cho sinh viên
        let canRegister = true;
        let reason = 'Đủ điều kiện đăng ký';

        if (t.TrangThaiMo === 0) {
            canRegister = false;
            reason = 'Lớp đã khóa đăng ký';
        } else if (isFull) {
            canRegister = false;
            reason = 'Đã hết chỉ tiêu (đủ số lượng)';
        } else if (isStudent && currentStudentInfo) {
            const svGpa = Number(currentStudentInfo.GPA || 0);
            const minGpa = Number(t.DiemGPAToiThieu || 2.50);
            if (svGpa < minGpa) {
                canRegister = false;
                reason = `GPA (${svGpa.toFixed(2)}) < ${minGpa.toFixed(2)}`;
            } else if (t.MonBatBuoc) {
                const reqList = t.MonBatBuoc.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
                const passed = (currentStudentInfo.MonDaHoc || '').toLowerCase();
                const missing = reqList.filter((m) => !passed.includes(m));
                if (missing.length > 0) {
                    canRegister = false;
                    reason = `Thiếu môn: ${missing.join(', ')}`;
                }
            }
        }

        const conditionBadge = isStudent
            ? `<span class="badge-status ${canRegister ? 'da-duyet' : 'tu-choi'}" title="${esc(reason)}">${esc(reason)}</span>`
            : `<span class="badge-status ${isFull ? 'tu-choi' : t.TrangThaiMo === 0 ? 'tu-choi' : 'da-duyet'}">
                ${isFull ? 'Đã đủ chỉ tiêu' : t.TrangThaiMo === 0 ? 'Đã khóa' : 'Mở nhận SV'}
               </span>`;

        const actionButton = isStudent
            ? `<button class="btn-table-action btn-register" ${!canRegister ? 'disabled' : ''} onclick="event.stopPropagation(); registerTopic('${esc(t.MaDT)}')">
                Đăng ký
               </button>`
            : `<button class="btn-table-action btn-register" style="background:#0e4b85;" ${isFull || t.TrangThaiMo === 0 ? 'disabled' : ''} onclick="event.stopPropagation(); openRegisterForStudentModal('${esc(t.MaDT)}', '${esc(t.TenDT)}', '${esc(t.MonBatBuoc || '')}', ${t.DiemGPAToiThieu || 2.50}, ${maxCapacity})">
                Đăng ký cho SV
               </button>`;

        const isSelected = selectedTopicId === t.MaDT;

        return `
            <tr>
                <td class="text-center">${idx + 1}</td>
                <td class="text-center"><code>${esc(t.MaDT)}</code></td>
                <td>
                    <strong>${esc(t.TenDT)}</strong>
                    ${t.MoTa ? `<div style="font-size:11.5px; color:#555; margin-top:2px;">${esc(t.MoTa)}</div>` : ''}
                </td>
                <td>
                    <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(t.GiangVienHuongDan || '')}', '${esc(t.MaGV || '')}')" title="Nhấp để xem thông tin giảng viên">
                        ${esc(t.GiangVienHuongDan || 'Giảng viên')}
                    </button>
                </td>
                <td><span class="badge-status dang-thuc-hien">${esc(t.Nganh)}</span></td>
                <td class="text-center font-bold">${t.SoTinChi || 10}</td>
                <td><strong style="color:#004882;">${esc(t.MonBatBuoc || 'Không yêu cầu')}</strong></td>
                <td class="text-center font-bold" style="color:#c31e24;">${Number(t.DiemGPAToiThieu || 2.50).toFixed(2)}</td>
                <td class="text-center font-bold" style="color:${isFull ? '#c31e24' : '#28a745'};">
                    ${registeredCount} / ${maxCapacity}
                </td>
                <td class="text-center">
                    ${conditionBadge}
                </td>
                <td class="text-center">
                    ${actionButton}
                </td>
            </tr>
        `;
    }).join('');
}

// SINH VIÊN ĐĂNG KÝ CHO CHÍNH MÌNH
async function registerTopic(MaDT) {
    showConfirmModal({
        title: 'Đăng Ký Đề Tài Tốt Nghiệp',
        message: `Xác nhận đăng ký đề tài <strong>${esc(MaDT)}</strong>? Đăng ký của bạn sẽ ở trạng thái <em>"Chờ duyệt"</em> và chuyển đến giảng viên hướng dẫn xét duyệt điều kiện GPA và môn tiên quyết.`,
        iconHtml: '',
        iconClass: 'primary',
        confirmText: 'Xác nhận đăng ký',
        confirmClass: 'primary',
        onConfirm: async () => {
            const res = await api('POST', '/registrations', { MaDT });
            if (!res) return;

            if (res.ok) {
                toast('Đăng ký đề tài thành công! Vui lòng chờ giảng viên phê duyệt.');
                loadAvailableTopics();
                loadStudentRegistrations();
                loadDashboardView();
            } else {
                toast(res.message || 'Đăng ký thất bại', true);
            }
        }
    });
}

// ADMIN & GIẢNG VIÊN ĐĂNG KÝ ĐỀ TÀI CHO SINH VIÊN
function openRegisterForStudentModal(MaDT, TenDT, MonBatBuoc, minGpa, maxLimit) {
    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">Đăng Ký Đề Tài Cho Sinh Viên</h3>
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="submitRegisterForStudent(event, '${esc(MaDT)}')">
            <!-- Thông tin đề tài được chọn -->
            <div style="background: #eef5fc; border: 1px solid #b6d4fe; border-radius: 6px; padding: 12px 16px; margin-bottom: 16px;">
                <div style="font-size: 14.5px; font-weight: 800; color: #004882;">[${esc(MaDT)}] ${esc(TenDT)}</div>
                <div style="font-size: 12.5px; color: #475569; margin-top: 6px; display: flex; gap: 16px; flex-wrap: wrap;">
                    <span>Giới hạn: <strong>${maxLimit || 5} sinh viên</strong></span>
                    <span>GPA tối thiểu: <strong>${minGpa ? Number(minGpa).toFixed(2) : '2.50'}</strong></span>
                    <span>Môn tiên quyết: <strong>${esc(MonBatBuoc || 'Không yêu cầu')}</strong></span>
                </div>
            </div>

            <div class="form-row">
                <label class="form-label">Nhập hoặc chọn Mã sinh viên cần đăng ký *</label>
                <input type="text" id="regForStudentMaSV" class="form-control" list="studentCodesList" placeholder="Nhập mã SV (VD: SV001, SV002, SV003, SV004, SV005...)" required oninput="checkEligibilityLive('${esc(MaDT)}', ${minGpa || 2.50}, '${esc(MonBatBuoc || '')}')">
                <datalist id="studentCodesList">
                    <option value="SV001">SV001 - Vũ Đức Hiếu (CNPM)</option>
                    <option value="SV002">SV002 - Lê Minh Châu (CNPM)</option>
                    <option value="SV003">SV003 - Trần Quốc Đạt (HTTT)</option>
                    <option value="SV004">SV004 - Nguyễn Thị Bích (CNPM)</option>
                    <option value="SV005">SV005 - Phạm Văn Nam (KHMT)</option>
                </datalist>
            </div>

            <!-- Vùng hiển thị kết quả kiểm tra điều kiện sinh viên trực tiếp -->
            <div id="regStudentEligibilityBox" style="display: none; margin-bottom: 18px;"></div>

            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeModal()">Hủy bỏ</button>
                <button type="submit" class="btn-primary-action" id="btnConfirmRegForStudent">Xác nhận đăng ký cho sinh viên</button>
            </div>
        </form>
    `);
}

function selectStudentForReg(code, MaDT, minGpa, MonBatBuoc) {
    const input = document.getElementById('regForStudentMaSV');
    if (input) {
        input.value = code;
        checkEligibilityLive(MaDT, minGpa, MonBatBuoc);
    }
}

async function checkEligibilityLive(MaDT, minGpa, MonBatBuoc) {
    const input = document.getElementById('regForStudentMaSV');
    const box = document.getElementById('regStudentEligibilityBox');
    if (!input || !box) return;

    const maSV = input.value.trim();
    if (!maSV) {
        box.style.display = 'none';
        return;
    }

    box.style.display = 'block';
    box.innerHTML = `<div style="font-size: 13px; color: #004882;">Đang tra cứu hồ sơ học vụ sinh viên ${esc(maSV)} từ student-service...</div>`;

    const res = await api('GET', `/students/${encodeURIComponent(maSV)}`);
    if (!res || !res.ok || !res.data) {
        box.innerHTML = `
            <div style="background: #fff5f5; border: 1px solid #feb2b2; border-radius: 6px; padding: 10px 14px; font-size: 13px; color: #c53030;">
                Không tìm thấy sinh viên có mã <strong>${esc(maSV)}</strong> trong hệ thống học vụ.
            </div>
        `;
        return;
    }

    const s = res.data;
    const svGpa = Number(s.GPA || 0);
    const minGpaNum = Number(minGpa || 0);
    const gpaPass = svGpa >= minGpaNum;

    let prereqPass = true;
    let missing = [];
    if (MonBatBuoc && MonBatBuoc.trim()) {
        const required = MonBatBuoc.split(',').map((x) => x.trim().toLowerCase()).filter(Boolean);
        const passed = (s.MonDaHoc || '').toLowerCase();
        missing = required.filter((req) => !passed.includes(req));
        if (missing.length > 0) prereqPass = false;
    }

    const allPass = gpaPass && prereqPass;

    box.innerHTML = `
        <div style="background: ${allPass ? '#f0fdf4' : '#fffbeb'}; border: 1px solid ${allPass ? '#86efac' : '#fde68a'}; border-radius: 6px; padding: 12px 14px;">
            <div style="font-weight: 700; color: #1e293b; font-size: 13.5px; margin-bottom: 6px;">
                ${esc(s.HoTen)} &bull; Mã SV: <strong>${esc(s.MaSV)}</strong> &bull; Lớp: <strong>${esc(s.Lop || 'DHKTPM20')}</strong> &bull; Ngành: <strong>${esc(s.Nganh || 'Công nghệ phần mềm')}</strong>
            </div>
            <div style="font-size: 12.5px; line-height: 1.6; color: #374151;">
                <div>Điểm GPA tích lũy: <strong>${svGpa.toFixed(2)}</strong> / 4.00 &rarr; ${gpaPass ? '<span style="color:#16a34a; font-weight:700;">Đạt chuẩn (>= ' + minGpaNum.toFixed(2) + ')</span>' : '<span style="color:#dc2626; font-weight:700;">Chưa đạt chuẩn (< ' + minGpaNum.toFixed(2) + ')</span>'}</div>
                <div>Môn bắt buộc khóa trước: ${prereqPass ? '<span style="color:#16a34a; font-weight:700;">Đã hoàn thành đầy đủ</span>' : '<span style="color:#dc2626; font-weight:700;">Chưa hoàn thành: ' + esc(missing.join(', ')) + '</span>'}</div>
            </div>
            <div style="margin-top: 8px; font-weight: 700; font-size: 12.5px; color: ${allPass ? '#15803d' : '#b45309'};">
                ${allPass ? 'Sinh viên này hoàn toàn đủ điều kiện để đăng ký lớp học phần này!' : 'Sinh viên chưa đạt đủ điều kiện. Bạn có thể xem xét đăng ký nếu được chấp thuận đặc biệt.'}
            </div>
        </div>
    `;
}

async function submitRegisterForStudent(event, MaDT) {
    event.preventDefault();
    const input = document.getElementById('regForStudentMaSV');
    if (!input) return;

    const MaSV = input.value.trim();
    if (!MaSV) {
        return toast('Vui lòng nhập mã sinh viên cần đăng ký', true);
    }

    const res = await api('POST', '/registrations', { MaSV, MaDT });
    if (!res) return;

    if (res.ok) {
        toast(`Đăng ký đề tài ${MaDT} cho sinh viên ${MaSV} thành công!`);
        closeModal();
        loadAvailableTopics();
        loadStudentRegistrations();
        loadDashboardView();
    } else {
        toast(res.message || 'Đăng ký thất bại', true);
    }
}

// TẢI LỊCH SỬ ĐĂNG KÝ (SINH VIÊN HOẶC TẤT CẢ SV CHO ADMIN/GIẢNG VIÊN)
async function loadStudentRegistrations() {
    const heading = document.getElementById('regSectionHistoryHeading');
    const thead = document.getElementById('studentRegistrationsTableHead');
    const tbody = document.getElementById('studentRegistrationsTableBody');
    if (!tbody) return;

    const user = getUser();
    if (!user) return;

    const isStudent = user.VaiTro === 'sinhvien';

    // Cập nhật Tiêu đề và Cột bảng
    if (heading) {
        heading.textContent = isStudent
            ? 'LỊCH SỬ ĐĂNG KÝ CỦA BẠN (TRẠNG THÁI DUYỆT & ĐIỂM SỐ)'
            : 'DANH SÁCH TẤT CẢ SINH VIÊN ĐÃ ĐĂNG KÝ HỌC PHẦN / ĐỀ TÀI';
    }

    if (thead) {
        if (isStudent) {
            thead.innerHTML = `
                <tr>
                    <th>MÃ ĐK</th>
                    <th>MÃ ĐỀ TÀI</th>
                    <th>TÊN ĐỀ TÀI</th>
                    <th>GIẢNG VIÊN</th>
                    <th>NGÀY ĐĂNG KÝ</th>
                    <th>TRẠNG THÁI</th>
                    <th>ĐIỂM SỐ</th>
                    <th>NHẬN XÉT / LÝ DO</th>
                    <th>HỦY ĐĂNG KÝ</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th>MÃ ĐK</th>
                    <th>MÃ SV</th>
                    <th>HỌ VÀ TÊN SINH VIÊN</th>
                    <th>LỚP</th>
                    <th>TÊN ĐỀ TÀI / HỌC PHẦN</th>
                    <th>GIẢNG VIÊN HƯỚNG DẪN</th>
                    <th>NGÀY ĐĂNG KÝ</th>
                    <th>TRẠNG THÁI</th>
                    <th>ĐIỂM SỐ</th>
                    <th>THAO TÁC</th>
                </tr>
            `;
        }
    }

    const res = await api('GET', '/registrations');
    if (!res || !res.ok || !Array.isArray(res.data)) {
        tbody.innerHTML = `<tr><td colspan="${isStudent ? 9 : 10}" class="text-center" style="color:#c62828;">Không tải được dữ liệu đăng ký.</td></tr>`;
        return;
    }

    cachedRegistrations = res.data;

    const myRegs = isStudent
        ? cachedRegistrations.filter((r) => r.MaSV === (user.MaSV || user.TenDangNhap))
        : cachedRegistrations;

    const displayRegs = currentFilterTopicId
        ? myRegs.filter((r) => r.MaDT === currentFilterTopicId)
        : myRegs;

    // Cập nhật UI bộ lọc và badge số lượng
    const filterNotice = document.getElementById('rightColFilterNotice');
    const defaultHint = document.getElementById('rightColDefaultHint');
    const selectedTopicLabel = document.getElementById('selectedTopicFilterLabel');
    const regBadge = document.getElementById('regCountBadge');

    if (currentFilterTopicId) {
        if (filterNotice) filterNotice.style.display = 'block';
        if (defaultHint) defaultHint.style.display = 'none';
        if (selectedTopicLabel) selectedTopicLabel.textContent = currentFilterTopicId;
        if (regBadge) regBadge.textContent = `${displayRegs.length} / ${myRegs.length} đăng ký`;
    } else {
        if (filterNotice) filterNotice.style.display = 'none';
        if (defaultHint) defaultHint.style.display = 'block';
        if (regBadge) regBadge.textContent = `${displayRegs.length} đăng ký`;
    }

    if (displayRegs.length === 0) {
        if (currentFilterTopicId) {
            tbody.innerHTML = `<tr><td colspan="${isStudent ? 9 : 10}" class="text-center" style="padding:22px; color:#64748b;">
                Chưa có sinh viên nào đăng ký đề tài <strong>${esc(currentFilterTopicId)}</strong>.<br>
                <button class="btn-text-link" onclick="clearTopicFilterForStudents()" style="margin-top:8px; color:#004882; font-weight:700; cursor:pointer; background:none; border:none; text-decoration:underline;">[Xem tất cả sinh viên]</button>
            </td></tr>`;
        } else {
            tbody.innerHTML = `<tr><td colspan="${isStudent ? 9 : 10}" class="text-center" style="padding:16px; color:#777;">Chưa có bản ghi đăng ký nào.</td></tr>`;
        }
        return;
    }

    if (isStudent) {
        tbody.innerHTML = displayRegs.map((r) => {
            return `
                <tr>
                    <td class="text-center"><strong>#${r.MaDK}</strong></td>
                    <td class="text-center"><code>${esc(r.MaDT)}</code></td>
                    <td><strong>${esc(r.TenDT)}</strong></td>
                    <td>
                        <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')" title="Nhấp để xem thông tin giảng viên">
                            ${esc(r.GiangVienHuongDan || 'Giảng viên')}
                        </button>
                    </td>
                    <td class="text-center">${esc(formatDateVN(r.NgayDangKy))}</td>
                    <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
                    <td class="text-center font-bold" style="color:#004882;">${r.Diem !== null && r.Diem !== undefined ? esc(r.Diem) : '-'}</td>
                    <td>${esc(r.LyDoTuChoi ? 'Lý do từ chối: ' + r.LyDoTuChoi : r.NhanXet || 'Chưa có')}</td>
                    <td class="text-center">
                        ${r.TrangThai === 'Cho duyet'
                            ? `<button class="btn-table-action btn-cancel-reg" onclick="event.stopPropagation(); cancelRegistration(${r.MaDK})">Hủy đăng ký</button>`
                            : '<span style="color:#999;">—</span>'}
                    </td>
                </tr>
            `;
        }).join('');
    } else {
        tbody.innerHTML = displayRegs.map((r) => {
            return `
                <tr>
                    <td class="text-center"><strong>#${r.MaDK}</strong></td>
                    <td class="text-center"><code>${esc(r.MaSV)}</code></td>
                    <td><strong>${esc(r.HoTen)}</strong></td>
                    <td>${esc(r.Lop || 'DHKTPM20')}</td>
                    <td><strong>${esc(r.TenDT)}</strong></td>
                    <td>
                        <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')" title="Nhấp để xem thông tin giảng viên">
                            ${esc(r.GiangVienHuongDan || 'Giảng viên')}
                        </button>
                    </td>
                    <td class="text-center">${esc(formatDateVN(r.NgayDangKy))}</td>
                    <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
                    <td class="text-center font-bold" style="color:#004882;">${r.Diem !== null && r.Diem !== undefined ? Number(r.Diem).toFixed(1) : '-'}</td>
                    <td class="text-center" style="white-space: nowrap;">
                        <button class="btn-table-action btn-register" onclick="event.stopPropagation(); openEditRegistrationModal(${r.MaDK})">Sửa</button>
                        <button class="btn-table-action btn-reject" onclick="event.stopPropagation(); deleteRegistration(${r.MaDK})">Xóa</button>
                        <button class="btn-table-action" style="background:#0e4b85; color:#fff;" onclick="event.stopPropagation(); quickLookupCode('${esc(r.MaSV)}')">Tra cứu SV</button>
                    </td>
                </tr>
            `;
        }).join('');
    }
}

// TƯƠNG TÁC 2 CHIỀU: KHI NHẤP VÀO ĐỀ TÀI Ở BẢNG BÊN TRÁI
function handleTopicRowClick(MaDT) {
    selectedTopicId = MaDT;
    selectedRegId = null;
    currentFilterTopicId = MaDT;

    // Nổi bật dòng ở bảng trái
    document.querySelectorAll('#availableTopicsTableBody tr').forEach((tr) => {
        tr.classList.remove('selected-active-row', 'highlight-linked-row');
        if (tr.dataset.topicCode === MaDT) {
            tr.classList.add('selected-active-row');
        }
    });

    // Bỏ chọn ở bảng phải
    document.querySelectorAll('#studentRegistrationsTableBody tr').forEach((tr) => {
        tr.classList.remove('selected-active-row', 'highlight-linked-row');
    });

    // Tìm thông tin đề tài
    const topic = (availableTopicsCache || []).find((t) => t.MaDT === MaDT);
    const detailContainer = document.getElementById('regInteractiveDetailCard');

    if (detailContainer && topic) {
        const user = getUser();
        const isStudent = user && user.VaiTro === 'sinhvien';
        const registeredCount = (registeredCountsCache && registeredCountsCache[topic.MaDT]) || 0;
        const maxCapacity = topic.GioiHanSV || 5;
        const isFull = registeredCount >= maxCapacity;

        const actionBtn = isStudent
            ? `<button class="btn-primary-action" style="background:#004882;" onclick="registerTopic('${esc(topic.MaDT)}')">Đăng ký đề tài này</button>`
            : `<button class="btn-primary-action" style="background:#0e4b85;" onclick="openRegisterForStudentModal('${esc(topic.MaDT)}', '${esc(topic.TenDT)}', '${esc(topic.MonBatBuoc || '')}', ${topic.DiemGPAToiThieu || 2.50}, ${maxCapacity})">Đăng ký cho SV đề tài này</button>`;

        detailContainer.style.display = 'block';
        detailContainer.innerHTML = `
            <div class="reg-detail-card topic-mode">
                <div class="reg-detail-header">
                    <div class="reg-detail-title">
                        
                        <div>
                            <strong>[${esc(topic.MaDT)}] ${esc(topic.TenDT)}</strong>
                            <div class="reg-detail-meta">
                                Chuyên ngành: <strong>${esc(topic.Nganh)}</strong> &bull; Giảng viên hướng dẫn: <button type="button" class="lecturer-click-pill" onclick="showLecturerProfileModal('${esc(topic.GiangVienHuongDan || '')}', '${esc(topic.MaGV || '')}')">${esc(topic.GiangVienHuongDan || 'Giảng viên')}</button>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center;">
                        ${actionBtn}
                        <button class="btn-detail-close" onclick="closeRegInteractiveDetail()">Đóng</button>
                    </div>
                </div>
                <div class="reg-detail-body">
                    <div class="reg-detail-grid">
                        <div class="reg-detail-item">
                            <span class="lbl">Số tín chỉ học phần</span>
                            <span class="val"><strong>${topic.SoTinChi || 10}</strong> tín chỉ</span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Môn bắt buộc khóa trước (Prerequisites)</span>
                            <span class="val"><strong style="color:#004882;">${esc(topic.MonBatBuoc || 'Không yêu cầu')}</strong></span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Điểm GPA tối thiểu</span>
                            <span class="val"><strong style="color:#c31e24;">${Number(topic.DiemGPAToiThieu || 2.50).toFixed(2)}</strong> / 4.00</span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Chỉ tiêu sinh viên</span>
                            <span class="val"><strong>${registeredCount} / ${maxCapacity}</strong> sinh viên ${isFull ? '<span style="color:#c31e24; font-weight:bold;">(Đã đủ chỉ tiêu)</span>' : '<span style="color:#16a34a; font-weight:bold;">(Đang mở nhận SV)</span>'}</span>
                        </div>
                        <div class="reg-detail-item full-width">
                            <span class="lbl">Mô tả học phần & yêu cầu đồ án</span>
                            <span class="val">${esc(topic.MoTa || 'Học phần đồ án tốt nghiệp thực hiện dưới sự hướng dẫn của giảng viên chuyên ngành.')}</span>
                        </div>
                    </div>
                    <div class="reg-detail-link-banner blue-banner">
                        <span><strong>Sinh viên đã đăng ký:</strong> Đã có <strong>${registeredCount}</strong> sinh viên đăng ký đề tài <strong>[${esc(topic.MaDT)}] ${esc(topic.TenDT)}</strong>.</span>
                        <button class="btn-primary-action" style="background:#004882; padding:5px 14px; font-size:12.5px;" onclick="switchRegViewTab('students');">Xem danh sách sinh viên đăng ký đề tài này →</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Tự động lọc danh sách bên phải theo đề tài được chọn
    loadStudentRegistrations();
}

// TƯƠNG TÁC 2 CHIỀU: KHI NHẤP VÀO SINH VIÊN Ở BẢNG BÊN PHẢI
function handleRegistrationRowClick(regId, MaSV, MaDT) {
    selectedRegId = regId;
    selectedTopicId = null;

    // Nổi bật dòng ở bảng phải
    document.querySelectorAll('#studentRegistrationsTableBody tr').forEach((tr) => {
        tr.classList.remove('selected-active-row');
        if (Number(tr.dataset.regId) === Number(regId)) {
            tr.classList.add('selected-active-row');
        }
    });

    // Lấy thông tin bản ghi đăng ký
    const r = (cachedRegistrations || []).find((x) => Number(x.MaDK) === Number(regId));
    const detailContainer = document.getElementById('regInteractiveDetailCard');

    if (detailContainer && r) {
        detailContainer.style.display = 'block';
        detailContainer.innerHTML = `
            <div class="reg-detail-card student-mode">
                <div class="reg-detail-header">
                    <div class="reg-detail-title">
                        
                        <div>
                            <strong>${esc(r.HoTen || 'Sinh viên')}</strong> (Mã SV: <strong style="color:#004882;">${esc(r.MaSV)}</strong>)
                            <div class="reg-detail-meta">
                                Lớp: <strong>${esc(r.Lop || 'DHKTPM20')}</strong> &bull; Chuyên ngành: <strong>${esc(r.NganhSV || 'Công nghệ phần mềm')}</strong> &bull; GPA: <strong>${r.GPA ? Number(r.GPA).toFixed(2) : '3.00'}</strong>
                            </div>
                        </div>
                    </div>
                    <div style="display:flex; gap:8px; align-items:center; flex-wrap:wrap;">
                        <button class="btn-primary-action" style="background:#0e4b85; padding:6px 14px; font-size:12.5px;" onclick="quickLookupCode('${esc(r.MaSV)}')">Tra cứu hồ sơ SV</button>
                        ${!isStudent ? `
                            <button class="btn-table-action btn-register" style="padding:6px 12px; font-size:12.5px;" onclick="openEditRegistrationModal(${r.MaDK})">Sửa đăng ký</button>
                            <button class="btn-table-action btn-reject" style="padding:6px 12px; font-size:12.5px;" onclick="deleteRegistration(${r.MaDK})">Xóa</button>
                        ` : ''}
                        <button class="btn-detail-close" onclick="closeRegInteractiveDetail()">Đóng</button>
                    </div>
                </div>
                <div class="reg-detail-body">
                    <div class="reg-detail-grid">
                        <div class="reg-detail-item">
                            <span class="lbl">Mã phiếu đăng ký</span>
                            <span class="val"><strong>#${r.MaDK}</strong></span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Đề tài đã đăng ký</span>
                            <span class="val"><strong>[${esc(r.MaDT)}] ${esc(r.TenDT)}</strong></span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Giảng viên hướng dẫn</span>
                            <span class="val">
                                <button type="button" class="lecturer-click-pill" onclick="showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')">
                                    ${esc(r.GiangVienHuongDan || 'Giảng viên')}
                                </button>
                            </span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Ngày gửi đăng ký</span>
                            <span class="val">${esc(formatDateVN(r.NgayDangKy))}</span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Trạng thái xét duyệt</span>
                            <span class="val">${formatStatusBadge(r.TrangThai)}</span>
                        </div>
                        <div class="reg-detail-item">
                            <span class="lbl">Điểm số học phần</span>
                            <span class="val"><strong style="color:#004882; font-size:15px;">${r.Diem !== null && r.Diem !== undefined ? Number(r.Diem).toFixed(1) + ' / 10' : 'Chưa có điểm'}</strong></span>
                        </div>
                        <div class="reg-detail-item full-width">
                            <span class="lbl">Nhận xét của giảng viên / Lý do</span>
                            <span class="val">${esc(r.LyDoTuChoi ? 'Lý do từ chối: ' + r.LyDoTuChoi : r.NhanXet || 'Chưa có nhận xét nào.')}</span>
                        </div>
                    </div>
                    <div class="reg-detail-link-banner amber-banner">
                        <span><strong>Lớp học phần tương ứng:</strong> Đề tài <strong>[${esc(r.MaDT)}] ${esc(r.TenDT)}</strong> &bull; Giảng viên: <button type="button" class="lecturer-click-pill" onclick="showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')">${esc(r.GiangVienHuongDan || 'Giảng viên')}</button>.</span>
                        <button class="btn-primary-action" style="background:#0e4b85; padding:5px 14px; font-size:12.5px;" onclick="switchRegViewTab('topics');">Xem thông tin lớp học phần này →</button>
                    </div>
                </div>
            </div>
        `;
    }

    // Định vị và làm nổi bật dòng đề tài tương ứng ở bảng bên trái
    let matchedTopicRow = null;
    document.querySelectorAll('#availableTopicsTableBody tr').forEach((tr) => {
        tr.classList.remove('selected-active-row', 'highlight-linked-row');
        if (tr.dataset.topicCode === MaDT) {
            tr.classList.add('highlight-linked-row');
            matchedTopicRow = tr;
        }
    });

    if (matchedTopicRow) {
        matchedTopicRow.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
}

// XÓA BỘ LỌC ĐỀ TÀI CHO SINH VIÊN BÊN PHẢI
function clearTopicFilterForStudents() {
    currentFilterTopicId = null;
    loadStudentRegistrations();
}

// ĐÓNG KHUNG CHI TIẾT TƯƠNG TÁC
function closeRegInteractiveDetail() {
    const detailContainer = document.getElementById('regInteractiveDetailCard');
    if (detailContainer) detailContainer.style.display = 'none';

    selectedTopicId = null;
    selectedRegId = null;
    currentFilterTopicId = null;

    document.querySelectorAll('#availableTopicsTableBody tr').forEach((tr) => {
        tr.classList.remove('selected-active-row', 'highlight-linked-row');
    });
    document.querySelectorAll('#studentRegistrationsTableBody tr').forEach((tr) => {
        tr.classList.remove('selected-active-row', 'highlight-linked-row');
    });

    loadStudentRegistrations();
}

async function cancelRegistration(MaDK) {
    showConfirmModal({
        title: 'Hủy Đăng Ký Đề Tài',
        message: 'Bạn có chắc chắn muốn hủy đăng ký đề tài này? Hành động này sẽ phát hành sự kiện hủy đồng bộ qua Event Bus.',
        iconHtml: '',
        iconClass: 'danger',
        confirmText: 'Xác nhận hủy đăng ký',
        confirmClass: 'danger',
        onConfirm: async () => {
            const res = await api('DELETE', `/registrations/${MaDK}`);
            if (res && res.ok) {
                toast('Đã hủy đăng ký thành công');
                loadAvailableTopics();
                loadStudentRegistrations();
                loadDashboardView();
            } else {
                toast(res ? res.message : 'Hủy đăng ký thất bại', true);
            }
        }
    });
}

// SỬA ĐĂNG KÝ (DÀNH CHO GIẢNG VIÊN VÀ ADMIN)
async function openEditRegistrationModal(regId) {
    let reg = (cachedRegistrations || []).find((x) => Number(x.MaDK) === Number(regId));
    if (!reg) {
        const res = await api('GET', `/registrations/${regId}`);
        if (res && res.ok && res.data) {
            reg = res.data;
        }
    }
    if (!reg) {
        toast('Không tìm thấy thông tin phiếu đăng ký', true);
        return;
    }

    // Nạp danh sách đề tài đang mở nếu chưa có
    let topics = availableTopicsCache;
    if (!topics || topics.length === 0) {
        const tRes = await api('GET', '/topics');
        if (tRes && tRes.ok && Array.isArray(tRes.data)) {
            topics = tRes.data;
            availableTopicsCache = topics;
        } else {
            topics = PRESET_TOPICS;
        }
    }

    const currentScore = (reg.Diem !== null && reg.Diem !== undefined) ? reg.Diem : '';

    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">Sửa Phiếu Đăng Ký Đề Tài #${reg.MaDK}</h3>
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="saveRegistrationEdit(event, ${reg.MaDK})">
            <!-- Thông tin sinh viên (Cố định) -->
            <div class="form-row" style="background:#f8fafc; padding:10px 14px; border-radius:6px; border:1px solid #e2e8f0; margin-bottom:14px;">
                <label class="form-label" style="margin-bottom:4px; font-weight:700; color:#475569;">Hồ sơ sinh viên đăng ký:</label>
                <div style="font-weight:800; font-size:15px; color:#004882;">
                    ${esc(reg.HoTen || 'Sinh viên')}
                </div>
                <div style="font-size:13px; color:#64748b; margin-top:2px;">
                    Mã SV: <strong style="color:#004882;">${esc(reg.MaSV)}</strong> &bull; Lớp: <strong>${esc(reg.Lop || 'DHKTPM20')}</strong> &bull; Ngành: <strong>${esc(reg.NganhSV || reg.Nganh || 'Công nghệ phần mềm')}</strong>
                </div>
            </div>

            <!-- 1. Đổi Lớp học phần / Đề tài -->
            <div class="form-row">
                <label class="form-label">Lớp học phần / Đề tài tốt nghiệp *</label>
                <select id="editRegMaDT" class="form-control" required style="font-weight:600;">
                    ${topics.map((t) => `
                        <option value="${esc(t.MaDT)}" ${t.MaDT === reg.MaDT ? 'selected' : ''}>
                            [${t.MaDT}] ${esc(t.TenDT)} (${esc(t.Nganh)} - ${esc(t.GiangVienHuongDan || 'GV')})
                        </option>
                    `).join('')}
                </select>
                <div class="form-help-text">Chọn đề tài mới nếu muốn chuyển lớp học phần cho sinh viên này</div>
            </div>

            <!-- 2. Trạng thái xét duyệt -->
            <div class="form-row">
                <label class="form-label">Trạng thái xét duyệt đăng ký *</label>
                <select id="editRegTrangThai" class="form-control" onchange="toggleRejectReasonField(this.value)">
                    <option value="Cho duyet" ${reg.TrangThai === 'Cho duyet' ? 'selected' : ''}>Chờ duyệt đăng ký (Cho duyet)</option>
                    <option value="Da duyet" ${reg.TrangThai === 'Da duyet' ? 'selected' : ''}>Đã duyệt đăng ký (Da duyet)</option>
                    <option value="Dang thuc hien" ${reg.TrangThai === 'Dang thuc hien' ? 'selected' : ''}>Đang thực hiện đề tài (Dang thuc hien)</option>
                    <option value="Hoan thanh" ${reg.TrangThai === 'Hoan thanh' ? 'selected' : ''}>Đã hoàn thành nghiệm thu (Hoan thanh)</option>
                    <option value="Tu choi" ${reg.TrangThai === 'Tu choi' ? 'selected' : ''}>Từ chối đăng ký (Tu choi)</option>
                    <option value="Da huy" ${reg.TrangThai === 'Da huy' ? 'selected' : ''}>Đã hủy đăng ký (Da huy)</option>
                </select>
            </div>

            <!-- 3. Điểm số kết quả học tập -->
            <div class="form-row">
                <label class="form-label">Điểm số kết quả học phần (Thang điểm 10):</label>
                <input type="number" id="editRegDiem" class="form-control" min="0" max="10" step="0.1" value="${currentScore}" placeholder="Ví dụ: 8.5 (để trống nếu chưa chấm điểm)">
                <div class="form-help-text">Nhập điểm từ 0.0 đến 10.0 khi kết thúc học phần đồ án</div>
            </div>

            <!-- 4. Nhận xét của giảng viên -->
            <div class="form-row">
                <label class="form-label">Nhận xét / Đánh giá của giảng viên:</label>
                <textarea id="editRegNhanXet" class="form-control" rows="2" placeholder="Ghi nhận xét đánh giá quá trình và kết quả đồ án của sinh viên...">${esc(reg.NhanXet || '')}</textarea>
            </div>

            <!-- 5. Lý do từ chối (hiển thị khi trạng thái là Từ chối) -->
            <div class="form-row" id="editRegRejectBox" style="${reg.TrangThai === 'Tu choi' ? 'display:block;' : 'display:none;'}">
                <label class="form-label" style="color:#c53030;">Lý do từ chối đăng ký:</label>
                <input type="text" id="editRegLyDoTuChoi" class="form-control" value="${esc(reg.LyDoTuChoi || '')}" placeholder="VD: Chưa đạt môn tiên quyết, không đủ chỉ tiêu GPA...">
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeModal()">Hủy bỏ</button>
                <button type="submit" class="btn-primary-action">Lưu thay đổi</button>
            </div>
        </form>
    `);
}

function toggleRejectReasonField(status) {
    const box = document.getElementById('editRegRejectBox');
    if (box) {
        box.style.display = (status === 'Tu choi') ? 'block' : 'none';
    }
}

async function saveRegistrationEdit(event, regId) {
    event.preventDefault();
    const elMaDT = document.getElementById('editRegMaDT');
    const elTrangThai = document.getElementById('editRegTrangThai');
    const elDiem = document.getElementById('editRegDiem');
    const elNhanXet = document.getElementById('editRegNhanXet');
    const elLyDoTuChoi = document.getElementById('editRegLyDoTuChoi');

    const body = {
        MaDT: elMaDT ? elMaDT.value : undefined,
        TrangThai: elTrangThai ? elTrangThai.value : undefined,
        NhanXet: elNhanXet ? elNhanXet.value.trim() : undefined,
        LyDoTuChoi: elLyDoTuChoi ? elLyDoTuChoi.value.trim() : undefined
    };

    if (elDiem && elDiem.value.trim() !== '') {
        body.Diem = Number(elDiem.value);
    } else {
        body.Diem = null;
    }

    const res = await api('PUT', `/registrations/${regId}`, body);
    if (res && res.ok) {
        toast('Cập nhật phiếu đăng ký đề tài thành công');
        closeModal();
        closeRegInteractiveDetail();
        loadAvailableTopics();
        loadStudentRegistrations();
        loadTeacherApprovals();
        loadTeacherGrading();
        loadDashboardView();
        const lookupInput = document.getElementById('lookupStudentInput');
        if (lookupInput && lookupInput.value.trim()) {
            executeStudentLookup(lookupInput.value.trim());
        }
    } else {
        toast(res ? res.message : 'Cập nhật đăng ký thất bại', true);
    }
}

// XÓA ĐĂNG KÝ (DÀNH CHO GIẢNG VIÊN VÀ ADMIN)
async function deleteRegistration(regId) {
    showConfirmModal({
        title: 'Xóa Phiếu Đăng Ký Đề Tài',
        message: `Bạn có chắc chắn muốn <strong>XÓA VĨNH VIỄN</strong> phiếu đăng ký <strong>#${regId}</strong>? Dữ liệu sẽ bị xóa hoàn toàn khỏi cơ sở dữ liệu.`,
        iconHtml: '',
        iconClass: 'danger',
        confirmText: 'Xóa vĩnh viễn',
        confirmClass: 'danger',
        onConfirm: async () => {
            const res = await api('DELETE', `/registrations/${regId}`);
            if (res && res.ok) {
                toast('Đã xóa phiếu đăng ký thành công');
                closeRegInteractiveDetail();
                loadAvailableTopics();
                loadStudentRegistrations();
                loadTeacherApprovals();
                loadTeacherGrading();
                loadDashboardView();
                const lookupInput = document.getElementById('lookupStudentInput');
                if (lookupInput && lookupInput.value.trim()) {
                    executeStudentLookup(lookupInput.value.trim());
                }
            } else {
                toast(res ? res.message : 'Xóa đăng ký thất bại', true);
            }
        }
    });
}

// ==========================================================================
// 6. VIEW 4: XEM ĐIỂM & KẾT QUẢ HỌC TẬP (SINH VIÊN & TRA CỨU CHO ADMIN/GV)
// ==========================================================================

async function loadGradesView() {
    const filterBar = document.getElementById('gradesFilterBar');
    const detailCard = document.getElementById('gradesStudentDetailCard');
    const thead = document.getElementById('gradesTableHead');
    const tbody = document.getElementById('gradesTableBody');
    if (!tbody) return;

    const user = getUser();
    if (!user) return;

    const isStudent = user.VaiTro === 'sinhvien';

    // 1. Render Thanh lọc / Tìm kiếm
    if (filterBar) {
        if (isStudent) {
            filterBar.innerHTML = `
                <div class="filter-group">
                    <span class="filter-label">Học kỳ:</span>
                    <span style="font-weight: 700; color: #0c3258;">Học kỳ 1 - Niên khóa 2022 - 2026</span>
                </div>
            `;
            if (detailCard) detailCard.style.display = 'none';
        } else {
            const currentFilterVal = document.getElementById('gradeStudentFilterInput')
                ? document.getElementById('gradeStudentFilterInput').value
                : '';

            filterBar.innerHTML = `
                <div class="filter-group" style="display:flex; align-items:center; gap:10px; flex-wrap:wrap; width:100%;">
                    <label class="filter-label" style="font-weight:700; color:#004882;">
                        Tra cứu bảng điểm sinh viên theo mã SV:
                    </label>
                    <input type="text" id="gradeStudentFilterInput" list="studentCodesList" class="lookup-input" style="height:36px; min-width:240px;" placeholder="Nhập mã SV (VD: SV001, SV002...)" value="${esc(currentFilterVal)}" onkeyup="if(event.key==='Enter') executeGradeFilter()">
                    <button type="button" class="btn-primary-action" onclick="executeGradeFilter()">
                        Xem bảng điểm
                    </button>
                    <button type="button" class="btn-confirm-cancel" onclick="resetGradeFilter()">
                        Xem tất cả sinh viên
                    </button>
                </div>
            `;
        }
    }

    // 2. Tải danh sách đăng ký & điểm từ registration-service
    const res = await api('GET', '/registrations');
    if (!res || !res.ok) {
        tbody.innerHTML = `<tr><td colspan="${isStudent ? 9 : 11}" class="text-center" style="color:#c62828;">Không tải được bảng điểm (registration-service tạm gián đoạn).</td></tr>`;
        return;
    }

    let allRegs = res.data || [];
    let filterCode = '';

    if (!isStudent) {
        const input = document.getElementById('gradeStudentFilterInput');
        filterCode = input ? input.value.trim() : '';
    }

    // Nếu Giảng viên / Admin tra cứu sinh viên cụ thể -> hiển thị thẻ thông tin sinh viên đó
    if (!isStudent && filterCode) {
        const sRes = await api('GET', `/students/${encodeURIComponent(filterCode)}`);
        if (detailCard) {
            if (sRes && sRes.ok && sRes.data) {
                const s = sRes.data;
                detailCard.style.display = 'block';
                detailCard.innerHTML = `
                    <div class="lookup-card-result" style="padding:16px 20px; border-left:4px solid #004882;">
                        <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:12px;">
                            <div>
                                <h3 style="font-size:16px; font-weight:800; color:#0c3258; margin-bottom:4px;">
                                    ${esc(s.HoTen)} (Mã SV: <span style="color:#004882;">${esc(s.MaSV)}</span>)
                                </h3>
                                <div style="font-size:13px; color:#555;">
                                    Lớp: <strong>${esc(s.Lop || 'DHKTPM20')}</strong> &bull; Chuyên ngành: <strong>${esc(s.Nganh || 'Công nghệ phần mềm')}</strong> &bull; Email: <strong>${esc(s.Email || '-')}</strong>
                                </div>
                            </div>
                            <div style="display:flex; gap:18px; text-align:right;">
                                <div>
                                    <div style="font-size:18px; font-weight:800; color:#004882;">${s.GPA ? Number(s.GPA).toFixed(2) : '3.00'} / 4.00</div>
                                    <div style="font-size:11.5px; color:#666;">Điểm GPA tích lũy</div>
                                </div>
                                <div>
                                    <div style="font-size:18px; font-weight:800; color:#2e7d32;">${s.SoTCTichLuy || 110}</div>
                                    <div style="font-size:11.5px; color:#666;">Tín chỉ tích lũy</div>
                                </div>
                            </div>
                        </div>
                    </div>
                `;
            } else {
                detailCard.style.display = 'none';
            }
        }
        allRegs = allRegs.filter((r) => r.MaSV === filterCode);
    } else {
        if (detailCard) detailCard.style.display = 'none';
    }

    // 3. Render Table Thead
    if (thead) {
        if (isStudent) {
            thead.innerHTML = `
                <tr>
                    <th>TT</th>
                    <th>MÃ HỌC PHẦN</th>
                    <th>TÊN HỌC PHẦN</th>
                    <th>SỐ TC</th>
                    <th>GIẢNG VIÊN ĐÁNH GIÁ</th>
                    <th>ĐIỂM HỆ 10</th>
                    <th>ĐIỂM CHỮ</th>
                    <th>KẾT QUẢ</th>
                    <th>NHẬN XÉT CỦA GIẢNG VIÊN</th>
                </tr>
            `;
        } else {
            thead.innerHTML = `
                <tr>
                    <th>TT</th>
                    <th>MÃ SV</th>
                    <th>HỌ VÀ TÊN SINH VIÊN</th>
                    <th>LỚP</th>
                    <th>TÊN LỚP HỌC PHẦN / ĐỀ TÀI</th>
                    <th>GIẢNG VIÊN HƯỚNG DẪN</th>
                    <th>ĐIỂM HỆ 10</th>
                    <th>ĐIỂM CHỮ</th>
                    <th>KẾT QUẢ</th>
                    <th>NHẬN XÉT CỦA GV</th>
                    <th>THAO TÁC</th>
                </tr>
            `;
        }
    }

    const displayRegs = isStudent
        ? allRegs.filter((r) => r.MaSV === (user.MaSV || user.TenDangNhap))
        : allRegs;

    if (displayRegs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="${isStudent ? 9 : 11}" class="text-center" style="padding:24px; color:#777;">
            ${!isStudent && filterCode ? `Không tìm thấy kết quả điểm cho sinh viên ${esc(filterCode)}.` : 'Chưa có bản ghi kết quả điểm nào.'}
        </td></tr>`;
        return;
    }

    tbody.innerHTML = displayRegs.map((r, idx) => {
        const score = r.Diem !== null && r.Diem !== undefined ? Number(r.Diem) : null;
        let letterGrade = '-';
        let passText = 'Chưa hoàn thành';

        if (score !== null) {
            if (score >= 8.5) letterGrade = 'A';
            else if (score >= 8.0) letterGrade = 'B+';
            else if (score >= 7.0) letterGrade = 'B';
            else if (score >= 6.5) letterGrade = 'C+';
            else if (score >= 5.5) letterGrade = 'C';
            else if (score >= 5.0) letterGrade = 'D+';
            else if (score >= 4.0) letterGrade = 'D';
            else letterGrade = 'F';

            passText = score >= 4.0 ? 'Đạt (Hoàn thành)' : 'Không đạt';
        }

        if (isStudent) {
            return `
                <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-center"><code>${esc(r.MaDT)}</code></td>
                    <td><strong>${esc(r.TenDT)}</strong></td>
                    <td class="text-center font-bold">10</td>
                    <td>${esc(r.GiangVienHuongDan || 'Hội đồng chấm')}</td>
                    <td class="text-center font-bold" style="font-size:15px; color:#004882;">${score !== null ? score.toFixed(1) : '-'}</td>
                    <td class="text-center font-bold" style="color:#c31e24;">${letterGrade}</td>
                    <td class="text-center">
                        <span class="badge-status ${score !== null && score >= 4.0 ? 'da-duyet' : 'tu-choi'}">
                            ${passText}
                        </span>
                    </td>
                    <td>${esc(r.NhanXet || 'Chưa có nhận xét từ giảng viên')}</td>
                </tr>
            `;
        } else {
            return `
                <tr>
                    <td class="text-center">${idx + 1}</td>
                    <td class="text-center"><code>${esc(r.MaSV)}</code></td>
                    <td><strong>${esc(r.HoTen)}</strong></td>
                    <td>${esc(r.Lop || 'DHKTPM20')}</td>
                    <td><strong>${esc(r.TenDT)}</strong></td>
                    <td>
                        <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')" title="Nhấp để xem thông tin giảng viên">
                            ${esc(r.GiangVienHuongDan || 'Giảng viên')}
                        </button>
                    </td>
                    <td class="text-center font-bold" style="font-size:15px; color:#004882;">${score !== null ? score.toFixed(1) : '-'}</td>
                    <td class="text-center font-bold" style="color:#c31e24;">${letterGrade}</td>
                    <td class="text-center">
                        <span class="badge-status ${score !== null && score >= 4.0 ? 'da-duyet' : 'tu-choi'}">
                            ${passText}
                        </span>
                    </td>
                    <td>${esc(r.NhanXet || 'Chưa chấm điểm')}</td>
                    <td class="text-center">
                        <button class="btn-table-action btn-register" onclick="openEditRegistrationModal(${r.MaDK})">Sửa</button>
                        <button class="btn-table-action btn-reject" onclick="deleteRegistration(${r.MaDK})">Xóa</button>
                        <button class="btn-table-action" style="background:#0e4b85; color:#fff;" onclick="quickLookupCode('${esc(r.MaSV)}')">Tra cứu</button>
                    </td>
                </tr>
            `;
        }
    }).join('');
}

function executeGradeFilter() {
    loadGradesView();
}

function resetGradeFilter() {
    const input = document.getElementById('gradeStudentFilterInput');
    if (input) input.value = '';
    loadGradesView();
}

function quickFilterGrade(code) {
    const input = document.getElementById('gradeStudentFilterInput');
    if (input) input.value = code;
    loadGradesView();
}

// ==========================================================================
// 7. VIEW 5: THÔNG TIN CÁ NHÂN (PROFILE)
// ==========================================================================

async function loadProfileView() {
    const user = getUser();
    if (!user) return;

    document.getElementById('profUsername').textContent = user.TenDangNhap;
    document.getElementById('profFullName').textContent = user.HoTen;
    document.getElementById('profRole').textContent = roleLabel(user.VaiTro);
    document.getElementById('profEmail').textContent = user.Email || `${user.TenDangNhap.toLowerCase()}@qnu.edu.vn`;
    document.getElementById('profMajor').textContent = user.Nganh || 'Công nghệ phần mềm';

    if (user.VaiTro === 'sinhvien') {
        const sRes = await api('GET', `/students/${user.MaSV || user.TenDangNhap}`);
        if (sRes && sRes.ok && sRes.data) {
            const s = sRes.data;
            document.getElementById('profClass').textContent = s.Lop || 'DHKTPM20';
            document.getElementById('profGPA').textContent = s.GPA ? Number(s.GPA).toFixed(2) : '3.45';
            document.getElementById('profCredits').textContent = `${s.SoTCTichLuy || 122} tín chỉ`;
            document.getElementById('profPassedCourses').textContent = s.MonDaHoc || 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm';
        }
    } else {
        document.getElementById('profClass').textContent = 'Khoa Công Nghệ Thông Tin';
        document.getElementById('profGPA').textContent = '—';
        document.getElementById('profCredits').textContent = '—';
        document.getElementById('profPassedCourses').textContent = 'Giảng viên phụ trách chuyên môn';
    }
}

// ==========================================================================
// 8. VIEW 6: TIN NHẮN & THÔNG BÁO (NOTIFICATION SERVICE - EVENT BUS)
// ==========================================================================

async function loadNotificationsList() {
    const container = document.getElementById('notificationsContainer');
    if (!container) return;

    container.innerHTML = '<p>Đang tải thông báo từ Event Bus...</p>';
    const res = await api('GET', '/notifications');

    if (!res || !res.ok) {
        container.innerHTML = '<p style="color:#c62828;">Không tải được thông báo (notification-service tạm dừng).</p>';
        return;
    }

    updateNotifBadge(res.unread || 0);

    if (!res.data || res.data.length === 0) {
        container.innerHTML = '<p style="color:#777; padding:20px;">Chưa có thông báo nào.</p>';
        return;
    }

    container.innerHTML = res.data.map((n) => `
        <div style="background:#fff; border:1px solid #dce2e8; border-left:4px solid ${n.is_read ? '#cbd5e1' : '#004882'}; border-radius:4px; padding:12px 16px; cursor:pointer;"
            onclick="markNotifRead(${n.id})">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:4px;">
                <strong style="color:${n.is_read ? '#333' : '#004882'}; font-size:14px;">${esc(n.title)}</strong>
                <small style="color:#888;">${esc(String(n.created_at || '').replace('T', ' ').substring(0, 19))}</small>
            </div>
            <div style="font-size:13px; color:#444;">${esc(n.message)}</div>
        </div>
    `).join('');
}

async function markNotifRead(id) {
    await api('PUT', `/notifications/${id}/read`);
    loadNotificationsList();
}

function updateNotifBadge(count) {
    const badge = document.getElementById('notifBadge');
    if (!badge) return;
    if (count > 0) {
        badge.textContent = count;
        badge.style.display = 'flex';
    } else {
        badge.style.display = 'none';
    }
}

async function checkUnreadNotifications() {
    try {
        const res = await api('GET', '/notifications');
        if (res && res.ok) {
            updateNotifBadge(res.unread || 0);
        }
    } catch { /* ignore */ }
}

// ==========================================================================
// 9. DỮ LIỆU MẪU CHUẨN QNU: 20 ĐỀ TÀI, TOÀN BỘ NGÀNH, GIẢNG VIÊN & MÔN TIÊN QUYẾT
// ==========================================================================

const PRESET_TOPICS = [
    {
        MaDT: 'DT001',
        TenDT: 'Xây dựng hệ thống quản lý đào tạo & đồ án theo kiến trúc SOA',
        MoTa: 'Thiết kế kiến trúc hướng dịch vụ độc lập, loose coupling, event-driven, registry & gateway',
        GiangVienHuongDan: 'TS. Nguyễn Thanh Bình',
        MaGV: 'GV001',
        Nganh: 'Công nghệ phần mềm',
        SoTinChi: 10,
        MonBatBuoc: 'Cơ sở dữ liệu, Kiến trúc phần mềm',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.50
    },
    {
        MaDT: 'DT002',
        TenDT: 'Ứng dụng Trí tuệ nhân tạo nhận diện khuôn mặt điểm danh sinh viên',
        MoTa: 'Mô hình học sâu kết hợp xử lý thị giác máy tính và camera giám sát trường học',
        GiangVienHuongDan: 'TS. Nguyễn Thanh Bình',
        MaGV: 'GV001',
        Nganh: 'Công nghệ phần mềm',
        SoTinChi: 10,
        MonBatBuoc: 'Cơ sở dữ liệu, Kỹ thuật phần mềm',
        GioiHanSV: 4,
        DiemGPAToiThieu: 2.80
    },
    {
        MaDT: 'DT003',
        TenDT: 'Xây dựng ứng dụng di động hỗ trợ quản lý học tập và rèn luyện sinh viên QNU',
        MoTa: 'Ứng dụng Flutter/React Native kết hợp hệ thống API Backend đồng bộ dữ liệu đào tạo',
        GiangVienHuongDan: 'ThS. Hoàng Văn Em',
        MaGV: 'GV008',
        Nganh: 'Công nghệ phần mềm',
        SoTinChi: 10,
        MonBatBuoc: 'Lập trình thiết bị di động, Cơ sở dữ liệu',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.50
    },
    {
        MaDT: 'DT004',
        TenDT: 'Phát triển nền tảng học trực tuyến E-learning tích hợp Microservices',
        MoTa: 'Hệ thống học tập trực tuyến, livestream bài giảng và chấm điểm trắc nghiệm tự động',
        GiangVienHuongDan: 'ThS. Lê Minh Triết',
        MaGV: 'GV009',
        Nganh: 'Công nghệ phần mềm',
        SoTinChi: 10,
        MonBatBuoc: 'Lập trình Web, Kiến trúc phần mềm',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.60
    },
    {
        MaDT: 'DT005',
        TenDT: 'Hệ thống kiểm thử tự động CI/CD cho dự án phần mềm doanh nghiệp',
        MoTa: 'Tích hợp Docker, Kubernetes, Jenkins và SonarQube kiểm tra chất lượng mã nguồn',
        GiangVienHuongDan: 'TS. Nguyễn Thanh Bình',
        MaGV: 'GV001',
        Nganh: 'Công nghệ phần mềm',
        SoTinChi: 10,
        MonBatBuoc: 'Kiểm thử phần mềm, Kỹ thuật phần mềm',
        GioiHanSV: 2,
        DiemGPAToiThieu: 2.70
    },
    {
        MaDT: 'DT006',
        TenDT: 'Hệ thống hỗ trợ ra quyết định & phân tích dữ liệu học tập sinh viên',
        MoTa: 'Kho dữ liệu và phân tích dữ liệu đào tạo trường Đại học',
        GiangVienHuongDan: 'ThS. Trần Thị Mai',
        MaGV: 'GV002',
        Nganh: 'Hệ thống thông tin',
        SoTinChi: 10,
        MonBatBuoc: 'Cơ sở dữ liệu, Phân tích thiết kế HTTT',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.50
    },
    {
        MaDT: 'DT007',
        TenDT: 'Xây dựng cổng thanh toán học phí trực tuyến liên ngân hàng',
        MoTa: 'Hệ thống thanh toán bảo mật chuẩn PCI-DSS, kết nối cổng thanh toán VNPay / Momo',
        GiangVienHuongDan: 'ThS. Trần Thị Mai',
        MaGV: 'GV002',
        Nganh: 'Hệ thống thông tin',
        SoTinChi: 10,
        MonBatBuoc: 'Cơ sở dữ liệu, An toàn thông tin',
        GioiHanSV: 2,
        DiemGPAToiThieu: 2.60
    },
    {
        MaDT: 'DT008',
        TenDT: 'Hệ thống hoạch định nguồn lực doanh nghiệp ERP cho chuỗi cung ứng',
        MoTa: 'Phần mềm ERP quản trị kho vận, đơn hàng, hóa đơn điện tử cho doanh nghiệp sản xuất',
        GiangVienHuongDan: 'PGS.TS. Trịnh Xuân Dũng',
        MaGV: 'GV012',
        Nganh: 'Hệ thống thông tin',
        SoTinChi: 10,
        MonBatBuoc: 'Phân tích thiết kế HTTT, Cơ sở dữ liệu',
        GioiHanSV: 4,
        DiemGPAToiThieu: 2.50
    },
    {
        MaDT: 'DT009',
        TenDT: 'Xây dựng hệ thống quản lý thông tin bệnh viện số (Hospital HIS)',
        MoTa: 'Quản trị hồ sơ bệnh án điện tử, tiếp nhận bệnh nhân, viện phí và đơn thuốc',
        GiangVienHuongDan: 'ThS. Trần Thị Mai',
        MaGV: 'GV002',
        Nganh: 'Hệ thống thông tin',
        SoTinChi: 10,
        MonBatBuoc: 'Cơ sở dữ liệu, Phân tích thiết kế HTTT',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.50
    },
    {
        MaDT: 'DT010',
        TenDT: 'Nghiên cứu mô hình ngôn ngữ lớn (LLM) hỗ trợ tư vấn tuyển sinh đại học',
        MoTa: 'Xây dựng Chatbot RAG dựa trên Llama/GPT tích hợp cơ sở tri thức tuyển sinh QNU',
        GiangVienHuongDan: 'TS. Vũ Thị Phương',
        MaGV: 'GV003',
        Nganh: 'Trí tuệ nhân tạo',
        SoTinChi: 10,
        MonBatBuoc: 'Học máy, Xử lý ngôn ngữ tự nhiên',
        GioiHanSV: 2,
        DiemGPAToiThieu: 3.00
    },
    {
        MaDT: 'DT011',
        TenDT: 'Ứng dụng Deep Learning phát hiện sớm bệnh cây trồng qua ảnh lá',
        MoTa: 'Mô hình CNN phát hiện sâu bệnh trên cây xoài và lúa tại khu vực Nam Trung Bộ',
        GiangVienHuongDan: 'TS. Vũ Thị Phương',
        MaGV: 'GV003',
        Nganh: 'Trí tuệ nhân tạo',
        SoTinChi: 10,
        MonBatBuoc: 'Thị giác máy tính, Học máy',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.80
    },
    {
        MaDT: 'DT012',
        TenDT: 'Phát hiện gian lận thi cử trực tuyến sử dụng thị giác máy tính',
        MoTa: 'Theo dõi cử chỉ mắt, tư thế ngồi và phát hiện tài liệu lạ trong phòng thi online',
        GiangVienHuongDan: 'TS. Vũ Thị Phương',
        MaGV: 'GV003',
        Nganh: 'Trí tuệ nhân tạo',
        SoTinChi: 10,
        MonBatBuoc: 'Thị giác máy tính, Cấu trúc dữ liệu & giải thuật',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.90
    },
    {
        MaDT: 'DT013',
        TenDT: 'Tối ưu hóa lập lịch xe buýt đô thị dựa trên thuật toán di truyền',
        MoTa: 'Thuật toán Genetic Algorithm giải bài toán định tuyến và phân bổ chuyến xe buýt thông minh',
        GiangVienHuongDan: 'PGS.TS. Lê Văn Hoàng',
        MaGV: 'GV004',
        Nganh: 'Khoa học máy tính',
        SoTinChi: 10,
        MonBatBuoc: 'Cấu trúc dữ liệu & giải thuật, Trí tuệ nhân tạo',
        GioiHanSV: 2,
        DiemGPAToiThieu: 2.80
    },
    {
        MaDT: 'DT014',
        TenDT: 'Xây dựng Data Warehouse & Dashboard phân tích hiệu quả kinh doanh',
        MoTa: 'Mô hình dữ liệu hình sao (Star Schema), ETL pipeline và trực quan hóa PowerBI',
        GiangVienHuongDan: 'TS. Đỗ Ngọc Hùng',
        MaGV: 'GV010',
        Nganh: 'Kỹ thuật dữ liệu',
        SoTinChi: 10,
        MonBatBuoc: 'Cơ sở dữ liệu, Khai phá dữ liệu',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.70
    },
    {
        MaDT: 'DT015',
        TenDT: 'Hệ thống giám sát và phát hiện xâm nhập mạng nội bộ (IDS/IPS)',
        MoTa: 'Phân tích gói tin mạng thời gian thực, phát hiện tấn công DDoS và mã độc',
        GiangVienHuongDan: 'ThS. Phạm Quốc Tuấn',
        MaGV: 'GV005',
        Nganh: 'Mạng máy tính & An toàn thông tin',
        SoTinChi: 10,
        MonBatBuoc: 'Mạng máy tính, An toàn thông tin',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.60
    },
    {
        MaDT: 'DT016',
        TenDT: 'Ứng dụng công nghệ Blockchain trong xác thực văn bằng và chứng chỉ số',
        MoTa: 'Smart Contract Ethereum / Polygon lưu trữ hash văn bằng tốt nghiệp chống làm giả',
        GiangVienHuongDan: 'ThS. Phạm Quốc Tuấn',
        MaGV: 'GV005',
        Nganh: 'Mạng máy tính & An toàn thông tin',
        SoTinChi: 10,
        MonBatBuoc: 'Mật mã học, An toàn thông tin',
        GioiHanSV: 2,
        DiemGPAToiThieu: 2.80
    },
    {
        MaDT: 'DT017',
        TenDT: 'Hệ thống IoT quan trắc môi trường và cảnh báo mưa lũ tại Bình Định',
        MoTa: 'Cảm biến mực nước, nhiệt độ kết nối mạng truyền thông LoRaWAN gửi dữ liệu đám mây',
        GiangVienHuongDan: 'PGS.TS. Lê Văn Hoàng',
        MaGV: 'GV004',
        Nganh: 'Khoa học máy tính',
        SoTinChi: 10,
        MonBatBuoc: 'Hệ thống nhúng và IoT, Mạng máy tính',
        GioiHanSV: 4,
        DiemGPAToiThieu: 2.50
    },
    {
        MaDT: 'DT018',
        TenDT: 'Phần mềm mô phỏng thí nghiệm vật lý ảo hỗ trợ dạy học trực quan',
        MoTa: 'Mô phỏng 3D cơ học và quang học tương tác cho học sinh trung học phổ thông',
        GiangVienHuongDan: 'TS. Nguyễn Thị Lan',
        MaGV: 'GV011',
        Nganh: 'Sư phạm Tin học',
        SoTinChi: 10,
        MonBatBuoc: 'Lập trình đồ họa, Phương pháp dạy học Tin học',
        GioiHanSV: 3,
        DiemGPAToiThieu: 2.50
    },
    {
        MaDT: 'DT019',
        TenDT: 'Xây dựng mô hình dự báo biến động giá nông sản sử dụng Time Series',
        MoTa: 'Mô hình chuỗi thời gian ARIMA kết hợp LSTM dự báo giá lúa và tiêu xuất khẩu',
        GiangVienHuongDan: 'TS. Nguyễn Thị Lan',
        MaGV: 'GV011',
        Nganh: 'Toán ứng dụng',
        SoTinChi: 10,
        MonBatBuoc: 'Xác suất thống kê, Đại số tuyến tính',
        GioiHanSV: 2,
        DiemGPAToiThieu: 2.70
    },
    {
        MaDT: 'DT020',
        TenDT: 'Nền tảng chuyển đổi số du lịch Quy Nhơn tích hợp bản đồ số thực tế ảo (VR 360)',
        MoTa: 'Bản đồ số định vị điểm đến, tour du lịch ảo 360 độ và hệ thống đặt vé tham quan',
        GiangVienHuongDan: 'ThS. Hoàng Văn Em',
        MaGV: 'GV008',
        Nganh: 'Công nghệ phần mềm',
        SoTinChi: 10,
        MonBatBuoc: 'Lập trình Web, Thiết kế giao diện UI/UX',
        GioiHanSV: 4,
        DiemGPAToiThieu: 2.50
    }
];

// Danh sách toàn bộ các ngành đào tạo của Trường Đại học Quy Nhơn (QNU)
const ALL_MAJORS = [
    'Công nghệ phần mềm',
    'Hệ thống thông tin',
    'Khoa học máy tính',
    'Trí tuệ nhân tạo',
    'Kỹ thuật dữ liệu',
    'Mạng máy tính & An toàn thông tin',
    'Sư phạm Tin học',
    'Toán ứng dụng',
    'Công nghệ kỹ thuật điện - điện tử',
    'Công nghệ thông tin ứng dụng',
    'Quản trị kinh doanh',
    'Tài chính - Ngân hàng',
    'Kế toán',
    'Quản trị dịch vụ du lịch & lữ hành',
    'Ngôn ngữ Anh',
    'Sư phạm Toán học',
    'Hóa học ứng dụng',
    'Công nghệ sinh học & Khoa học ứng dụng'
];

// Danh sách toàn bộ giảng viên hướng dẫn của trường chuẩn QNU với mã GV001 - GV012
const LECTURERS_DATA = [
    { code: 'GV001', name: 'TS. Nguyễn Thanh Bình', dept: 'Bộ môn Công nghệ phần mềm', email: 'binhnt@qnu.edu.vn', phone: '0912.345.678', office: 'Phòng 402 - Nhà C', role: 'Trưởng bộ môn KTPM' },
    { code: 'GV002', name: 'ThS. Trần Thị Mai', dept: 'Bộ môn Hệ thống thông tin', email: 'maitt@qnu.edu.vn', phone: '0913.456.789', office: 'Phòng 405 - Nhà C', role: 'Phó trưởng bộ môn HTTT' },
    { code: 'GV003', name: 'TS. Vũ Thị Phương', dept: 'Bộ môn Trí tuệ nhân tạo', email: 'phuongvt@qnu.edu.vn', phone: '0914.567.890', office: 'Phòng 408 - Nhà C', role: 'Giảng viên chính' },
    { code: 'GV004', name: 'PGS.TS. Lê Văn Hoàng', dept: 'Bộ môn Khoa học máy tính', email: 'hoanglv@qnu.edu.vn', phone: '0915.678.901', office: 'Phòng 401 - Nhà C', role: 'Trưởng Khoa CNTT' },
    { code: 'GV005', name: 'ThS. Phạm Quốc Tuấn', dept: 'Bộ môn Mạng & ATTT', email: 'tuanpq@qnu.edu.vn', phone: '0916.789.012', office: 'Phòng 406 - Nhà C', role: 'Giảng viên' },
    { code: 'GV006', name: 'TS. Vũ Hải Đăng', dept: 'Bộ môn Khoa học dữ liệu', email: 'dangvh@qnu.edu.vn', phone: '0917.890.123', office: 'Phòng 407 - Nhà C', role: 'Giảng viên chính' },
    { code: 'GV007', name: 'TS. Đặng Hoài Phương', dept: 'Bộ môn Kỹ thuật phần mềm', email: 'phuongdh@qnu.edu.vn', phone: '0918.901.234', office: 'Phòng 403 - Nhà C', role: 'Giảng viên chính' },
    { code: 'GV008', name: 'ThS. Hoàng Văn Em', dept: 'Bộ môn Công nghệ phần mềm', email: 'emhv@qnu.edu.vn', phone: '0919.012.345', office: 'Phòng 402 - Nhà C', role: 'Giảng viên' },
    { code: 'GV009', name: 'ThS. Lê Minh Triết', dept: 'Bộ môn Hệ thống nhúng & IoT', email: 'trietlm@qnu.edu.vn', phone: '0920.123.456', office: 'Phòng 409 - Nhà C', role: 'Giảng viên' },
    { code: 'GV010', name: 'TS. Đỗ Ngọc Hùng', dept: 'Bộ môn Kỹ thuật dữ liệu', email: 'hungdn@qnu.edu.vn', phone: '0921.234.567', office: 'Phòng 410 - Nhà C', role: 'Giảng viên' },
    { code: 'GV011', name: 'TS. Nguyễn Thị Lan', dept: 'Khoa Toán & Thống kê', email: 'lannt@qnu.edu.vn', phone: '0922.345.678', office: 'Phòng 205 - Nhà A', role: 'Giảng viên chính' },
    { code: 'GV012', name: 'PGS.TS. Trịnh Xuân Dũng', dept: 'Khoa Công nghệ thông tin', email: 'dungtx@qnu.edu.vn', phone: '0923.456.789', office: 'Phòng 411 - Nhà C', role: 'Phó Hiệu trưởng' }
];

const ALL_LECTURERS = LECTURERS_DATA.map((l) => `${l.name} (${l.code} - ${l.dept})`);

// Tìm kiếm giảng viên theo mã, tên hoặc email
function findLecturer(identifier) {
    if (!identifier) return null;
    const s = String(identifier).trim().toLowerCase();
    return LECTURERS_DATA.find((l) =>
        l.code.toLowerCase() === s ||
        l.name.toLowerCase() === s ||
        l.email.toLowerCase() === s ||
        l.name.toLowerCase().includes(s) ||
        s.includes(l.name.toLowerCase())
    ) || {
        code: 'GV-QNU',
        name: identifier,
        dept: 'Khoa Công nghệ thông tin',
        email: 'giangvien@qnu.edu.vn',
        phone: '0256.3846156',
        office: 'Văn phòng Khoa CNTT - Nhà C',
        role: 'Giảng viên hướng dẫn'
    };
}

// Cửa sổ Modal hiển thị toàn bộ thông tin chi tiết giảng viên hướng dẫn
async function showLecturerProfileModal(identifier, codeHint = '') {
    const lecturer = findLecturer(codeHint || identifier) || findLecturer(identifier);
    if (!lecturer) return;

    // Danh sách các đề tài mà giảng viên này đang hướng dẫn
    let assignedTopics = [];
    if (availableTopicsCache && availableTopicsCache.length > 0) {
        assignedTopics = availableTopicsCache.filter((t) =>
            t.MaGV === lecturer.code ||
            (t.GiangVienHuongDan && (t.GiangVienHuongDan.includes(lecturer.name) || lecturer.name.includes(t.GiangVienHuongDan)))
        );
    } else {
        try {
            const res = await api('GET', `/topics?giangvien=${encodeURIComponent(lecturer.code)}`);
            if (res && res.ok) assignedTopics = res.data || [];
        } catch (e) {
            console.warn(e);
        }
    }

    const topicsHtml = assignedTopics.length > 0 ? `
        <div style="margin-top: 16px;">
            <div style="font-weight: 700; color: #004882; margin-bottom: 8px; font-size: 13.5px;">
                Đề tài / Lớp học phần do Quý Thầy/Cô đang hướng dẫn (${assignedTopics.length}):
            </div>
            <div style="max-height: 200px; overflow-y: auto; border: 1px solid #e2e8f0; border-radius: 6px;">
                <table class="qnu-table" style="font-size: 12.5px; margin: 0;">
                    <thead>
                        <tr>
                            <th style="padding: 6px 10px;">MÃ</th>
                            <th style="padding: 6px 10px;">TÊN ĐỀ TÀI / HỌC PHẦN</th>
                            <th style="padding: 6px 10px;">NGÀNH</th>
                            <th style="padding: 6px 10px;" class="text-center">SỐ TC</th>
                            <th style="padding: 6px 10px;" class="text-center">TRẠNG THÁI</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${assignedTopics.map((t) => `
                            <tr>
                                <td style="padding: 6px 10px;"><code>${esc(t.MaDT)}</code></td>
                                <td style="padding: 6px 10px;"><strong>${esc(t.TenDT)}</strong></td>
                                <td style="padding: 6px 10px;"><span class="badge-status dang-thuc-hien">${esc(t.Nganh)}</span></td>
                                <td style="padding: 6px 10px;" class="text-center font-bold">${t.SoTinChi || 10}</td>
                                <td style="padding: 6px 10px;" class="text-center">
                                    <span class="badge-status ${t.TrangThaiMo ? 'da-duyet' : 'tu-choi'}">
                                        ${t.TrangThaiMo ? 'Đang mở' : 'Đã khóa'}
                                    </span>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        </div>
    ` : `
        <div style="margin-top: 14px; padding: 12px 14px; background: #f8fafc; border-radius: 6px; font-size: 12.5px; color: #64748b; text-align: center;">
            Chưa có lớp học phần / đề tài nào mở mới trong học kỳ này hoặc đang cập nhật.
        </div>
    `;

    openModal(`
        <div class="modal-header" style="background: linear-gradient(135deg, #004882 0%, #0e64ad 100%); color: #fff; padding: 14px 20px; border-radius: 8px 8px 0 0;">
            <div style="display: flex; align-items: center; gap: 10px;">
                
                <div>
                    <h3 class="modal-title" style="color: #fff; margin: 0; font-size: 17px; font-weight: 700;">HỒ SƠ GIẢNG VIÊN HƯỚNG DẪN</h3>
                    <div style="font-size: 12px; color: #cfe2ff; margin-top: 2px;">Cổng Quản trị Đào tạo & Khóa luận Tốt nghiệp - ĐH Quy Nhơn</div>
                </div>
            </div>
            <button class="modal-close-btn" style="color: #fff; font-size: 22px;" onclick="closeModal()">&times;</button>
        </div>

        <div style="padding: 20px;">
            <!-- Profile Banner -->
            <div style="display: flex; align-items: center; gap: 16px; padding: 14px 18px; background: #f0f7ff; border: 1px solid #cce3fd; border-radius: 8px; margin-bottom: 16px;">
                <div style="width: 56px; height: 56px; border-radius: 50%; background: #004882; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 20px; font-weight: 700; flex-shrink: 0; box-shadow: 0 2px 6px rgba(0,72,130,0.25);">
                    ${esc(lecturer.code)}
                </div>
                <div style="flex: 1;">
                    <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap;">
                        <h4 style="margin: 0; font-size: 18px; color: #004882; font-weight: 800;">${esc(lecturer.name)}</h4>
                        <span class="badge-status da-duyet" style="font-size: 11.5px; padding: 2px 8px;">Mã: ${esc(lecturer.code)}</span>
                    </div>
                    <div style="font-size: 13px; color: #4a5568; margin-top: 3px; font-weight: 600;">
                        ${esc(lecturer.role)} &bull; ${esc(lecturer.dept)}
                    </div>
                </div>
            </div>

            <!-- Detail Grid -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #fff; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px;">
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Mã định danh cán bộ (Mã GV)</span>
                    <span style="font-size: 14px; font-weight: 700; color: #004882;">${esc(lecturer.code)}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Học vị & Học hàm</span>
                    <span style="font-size: 14px; font-weight: 600; color: #2d3748;">${esc(lecturer.name.split('.')[0] || 'Giảng viên')}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Đơn vị công tác / Bộ môn</span>
                    <span style="font-size: 13.5px; font-weight: 600; color: #2d3748;">${esc(lecturer.dept)}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Chức vụ chuyên môn</span>
                    <span style="font-size: 13.5px; font-weight: 600; color: #2d3748;">${esc(lecturer.role)}</span>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Email công vụ (QNU)</span>
                    <a href="mailto:${esc(lecturer.email)}" style="font-size: 13.5px; font-weight: 700; color: #004882; text-decoration: none;">${esc(lecturer.email)}</a>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px;">
                    <span style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Điện thoại liên hệ</span>
                    <a href="tel:${esc(lecturer.phone)}" style="font-size: 13.5px; font-weight: 700; color: #004882; text-decoration: none;">${esc(lecturer.phone)}</a>
                </div>
                <div style="display: flex; flex-direction: column; gap: 2px; grid-column: span 2;">
                    <span style="font-size: 11px; color: #718096; text-transform: uppercase; font-weight: 600;">Văn phòng làm việc</span>
                    <span style="font-size: 13.5px; font-weight: 600; color: #2d3748;">${esc(lecturer.office)}</span>
                </div>
            </div>

            <!-- Trạng thái tài khoản & Thông báo liên thông hệ thống -->
            <div style="margin-top: 14px; padding: 12px 14px; background: #eef9f2; border: 1px solid #c2ebcf; border-radius: 8px; display: flex; align-items: flex-start; gap: 10px;">
                
                <div style="font-size: 12.5px; color: #1e6b36; line-height: 1.5;">
                    <strong>Hệ thống thông báo thời gian thực:</strong> Tài khoản giảng viên <code>${esc(lecturer.code)}</code> đã kích hoạt thành công trên Event Bus. Quý Thầy/Cô sẽ nhận thông báo tự động khi được phân công hướng dẫn đề tài mới, khi có sinh viên nộp hồ sơ đăng ký lớp học phần và cập nhật điểm số.
                </div>
            </div>

            ${topicsHtml}

            <div class="modal-footer" style="margin-top: 18px; padding-top: 14px; border-top: 1px solid #e2e8f0; display: flex; justify-content: flex-end; gap: 10px;">
                <button type="button" class="btn-primary-action" onclick="closeModal()">Đóng cửa sổ</button>
            </div>
        </div>
    `);
}

// Khung xem trước thông tin giảng viên ngay trong form Tạo/Sửa đề tài
function renderSelectedLecturerPreview(lecturerCode) {
    const card = document.getElementById('mLecturerPreviewCard');
    if (!card) return;
    const lecturer = LECTURERS_DATA.find((l) => l.code === lecturerCode) || findLecturer(lecturerCode) || LECTURERS_DATA[0];
    if (!lecturer) {
        card.innerHTML = '';
        return;
    }
    card.innerHTML = `
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-left: 4px solid #004882; border-radius: 4px; padding: 10px 12px; display: flex; align-items: center; justify-content: space-between; gap: 10px;">
            <div style="display: flex; align-items: center; gap: 10px;">
                <div style="width: 36px; height: 36px; border-radius: 50%; background: #004882; color: #fff; display: flex; align-items: center; justify-content: center; font-weight: bold; font-size: 12px; flex-shrink: 0;">
                    ${esc(lecturer.code)}
                </div>
                <div style="font-size: 12.5px; line-height: 1.4;">
                    <div><strong style="color: #004882; font-size: 13.5px;">${esc(lecturer.name)}</strong> <span style="color:#555;">(${esc(lecturer.role)})</span></div>
                    <div style="color: #4a5568;">${esc(lecturer.office)} &bull; <a href="mailto:${esc(lecturer.email)}" style="color: #004882;">${esc(lecturer.email)}</a> &bull; ${esc(lecturer.phone)}</div>
                </div>
            </div>
            <button type="button" class="btn-table-action" style="background: #004882; color: #fff; padding: 4px 10px; font-size: 12px; white-space: nowrap;" onclick="showLecturerProfileModal('${esc(lecturer.code)}')">
                Xem hồ sơ
            </button>
        </div>
    `;
}

function viewSelectedLecturerProfile() {
    const select = document.getElementById('mGiangVienSelect');
    if (select) {
        showLecturerProfileModal(select.value);
    }
}

// Danh sách toàn bộ các môn học tiên quyết (Prerequisites)
const ALL_PREREQUISITES = [
    'Cơ sở dữ liệu',
    'Kiến trúc phần mềm',
    'Lập trình Web',
    'Kỹ thuật phần mềm',
    'Cấu trúc dữ liệu & giải thuật',
    'Phân tích thiết kế HTTT',
    'Học máy',
    'Trí tuệ nhân tạo',
    'Thị giác máy tính',
    'Xử lý ngôn ngữ tự nhiên',
    'Mạng máy tính',
    'An toàn thông tin',
    'Mật mã học',
    'Hệ thống nhúng và IoT',
    'Khai phá dữ liệu',
    'Kiểm thử phần mềm',
    'Lập trình thiết bị di động',
    'Xác suất thống kê',
    'Đại số tuyến tính',
    'Lập trình đồ họa',
    'Phương pháp dạy học Tin học',
    'Thiết kế giao diện UI/UX'
];

// Tự động điền thông tin đề tài khi chọn mã hoặc preset
function applyTopicPreset(maDT) {
    if (!maDT) return;
    const preset = PRESET_TOPICS.find((t) => t.MaDT === maDT);
    if (!preset) return;

    const elMaDT = document.getElementById('mMaDT');
    const elTenDT = document.getElementById('mTenDT');
    const elMoTa = document.getElementById('mMoTa');
    const elNganh = document.getElementById('mNganh');
    const elGiangVienSelect = document.getElementById('mGiangVienSelect');
    const elMonBatBuoc = document.getElementById('mMonBatBuoc');
    const elGioiHanSV = document.getElementById('mGioiHanSV');
    const elDiemGPA = document.getElementById('mDiemGPAToiThieu');

    if (elMaDT && (!elMaDT.readOnly)) elMaDT.value = preset.MaDT;
    if (elTenDT) elTenDT.value = preset.TenDT;
    if (elMoTa) elMoTa.value = preset.MoTa;
    if (elNganh) elNganh.value = preset.Nganh;
    if (elMonBatBuoc) elMonBatBuoc.value = preset.MonBatBuoc;
    if (elGioiHanSV) elGioiHanSV.value = preset.GioiHanSV;
    if (elDiemGPA) elDiemGPA.value = preset.DiemGPAToiThieu;

    if (elGiangVienSelect) {
        const found = LECTURERS_DATA.find((l) => l.name === preset.GiangVienHuongDan || (preset.MaGV && l.code === preset.MaGV));
        if (found) {
            elGiangVienSelect.value = found.code;
            renderSelectedLecturerPreview(found.code);
        }
    }
}

// Tự động điền khi chọn hoặc nhập theo tên đề tài
function applyTopicByTitle(title) {
    if (!title) return;
    const cleanTitle = title.trim().toLowerCase();
    const preset = PRESET_TOPICS.find((t) => t.TenDT.trim().toLowerCase() === cleanTitle || cleanTitle.includes(t.TenDT.trim().toLowerCase()));
    if (preset) {
        applyTopicPreset(preset.MaDT);
    }
}

// Bấm để thêm môn bắt buộc khóa trước vào ô nhập
function addPrereqCourse(courseName) {
    if (!courseName) return;
    const input = document.getElementById('mMonBatBuoc');
    if (!input) return;
    const current = input.value.trim();
    if (!current) {
        input.value = courseName;
    } else {
        const parts = current.split(',').map((p) => p.trim());
        if (!parts.includes(courseName)) {
            parts.push(courseName);
            input.value = parts.join(', ');
        }
    }
}

// ==========================================================================
// TRA CỨU HỒ SƠ HỌC VỤ SINH VIÊN THEO MÃ SV (DÀNH CHO ADMIN VÀ GIẢNG VIÊN)
// ==========================================================================

async function executeStudentLookup(overrideCode = null) {
    const input = document.getElementById('lookupStudentInput');
    const container = document.getElementById('lookupResultContainer');
    if (!container) return;

    const maSV = (overrideCode || (input ? input.value : '')).trim();
    if (!maSV) {
        toast('Vui lòng nhập hoặc chọn mã sinh viên cần tra cứu', true);
        if (input) input.focus();
        return;
    }

    if (input) input.value = maSV;

    container.innerHTML = `
        <div class="lookup-card-result" style="text-align: center; padding: 30px;">
            <div style="font-size: 24px; margin-bottom: 8px;">⏳</div>
            <div style="font-weight: 600; color: #004882;">Đang truy cứu dữ liệu học vụ của sinh viên ${esc(maSV)} từ student-service & registration-service...</div>
        </div>
    `;

    // Gọi đồng thời student-service và registration-service (SOA Loose Coupling)
    const [sRes, rRes] = await Promise.all([
        api('GET', `/students/${encodeURIComponent(maSV)}`),
        api('GET', '/registrations')
    ]);

    if (!sRes || !sRes.ok || !sRes.data) {
        container.innerHTML = `
            <div class="lookup-card-result" style="border-left: 4px solid #dc3545; background: #fff5f5;">
                <div style="display: flex; align-items: center; gap: 12px;">
                    
                    <div>
                        <h4 style="color: #c53030; font-size: 16px; margin-bottom: 4px;">Không tìm thấy hồ sơ sinh viên</h4>
                        <p style="color: #4a5568; font-size: 13.5px; margin: 0;">
                            Mã sinh viên <strong>${esc(maSV)}</strong> không tồn tại trong cơ sở dữ liệu học vụ hoặc dịch vụ <code>student-service</code> đang bảo trì.
                        </p>
                    </div>
                </div>
            </div>
        `;
        return;
    }

    const s = sRes.data;
    const allRegs = (rRes && rRes.ok && Array.isArray(rRes.data)) ? rRes.data : [];
    const studentRegs = allRegs.filter((r) => r.MaSV === maSV);

    const monList = s.MonDaHoc
        ? s.MonDaHoc.split(',').map((m) => m.trim()).filter(Boolean)
        : [];

    let regsTableHtml = '';
    if (studentRegs.length === 0) {
        regsTableHtml = `<tr><td colspan="8" class="text-center" style="padding: 16px; color: #718096;">Sinh viên chưa đăng ký đề tài hoặc lớp học phần nào trong học kỳ này.</td></tr>`;
    } else {
        regsTableHtml = studentRegs.map((r) => `
            <tr>
                <td class="text-center"><strong>#${r.MaDK}</strong></td>
                <td class="text-center"><code>${esc(r.MaDT)}</code></td>
                <td><strong>${esc(r.TenDT)}</strong></td>
                <td>
                    <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(r.GiangVienHuongDan || '')}', '${esc(r.MaGV || '')}')" title="Nhấp để xem thông tin giảng viên">
                        ${esc(r.GiangVienHuongDan || 'Giảng viên')}
                    </button>
                </td>
                <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
                <td class="text-center font-bold" style="font-size: 15px; color: #004882;">${r.Diem !== null && r.Diem !== undefined ? Number(r.Diem).toFixed(1) : '-'}</td>
                <td>${esc(r.LyDoTuChoi ? 'Lý do từ chối: ' + r.LyDoTuChoi : r.NhanXet || 'Chưa có')}</td>
                <td class="text-center" style="white-space: nowrap;">
                    <button class="btn-table-action btn-register" onclick="openEditRegistrationModal(${r.MaDK})">Sửa</button>
                    <button class="btn-table-action btn-reject" onclick="deleteRegistration(${r.MaDK})">Xóa</button>
                </td>
            </tr>
        `).join('');
    }

    container.innerHTML = `
        <div class="lookup-card-result">
            <!-- Header thông tin sinh viên -->
            <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; border-bottom: 1px solid #e2e8f0; padding-bottom: 14px; margin-bottom: 18px;">
                <div style="display: flex; align-items: center; gap: 14px;">
                    <div style="width: 54px; height: 54px; border-radius: 50%; background: #004882; color: #fff; display: flex; align-items: center; justify-content: center; font-size: 18px; font-weight: bold;">
                        ${esc(s.MaSV ? s.MaSV.slice(0, 5) : 'SV')}
                    </div>
                    <div>
                        <div style="font-size: 20px; font-weight: 800; color: #0f172a;">${esc(s.HoTen)}</div>
                        <div style="font-size: 13.5px; color: #64748b; margin-top: 2px;">
                            Mã sinh viên: <strong style="color: #004882;">${esc(s.MaSV)}</strong> &bull; Lớp: <strong>${esc(s.Lop || 'DHKTPM20')}</strong> &bull; Ngành: <strong>${esc(s.Nganh || 'Công nghệ phần mềm')}</strong>
                        </div>
                    </div>
                </div>
                <div style="text-align: right;">
                    <span class="badge-status da-duyet" style="font-size: 12.5px; padding: 6px 12px;">Đang theo học chính khóa</span>
                    <div style="font-size: 12px; color: #64748b; margin-top: 4px;">Email: ${esc(s.Email || 'Chưa cập nhật')}</div>
                </div>
            </div>

            <!-- Chỉ số học tập chính -->
            <div class="dashboard-metrics-grid" style="margin-bottom: 20px;">
                <div class="metric-card" style="box-shadow: none; border: 1px solid #e2e8f0;">
                    
                    <div>
                        <div class="metric-card-value" style="color: #004882;">${s.GPA ? Number(s.GPA).toFixed(2) : '3.00'} / 4.00</div>
                        <div class="metric-card-label">Điểm GPA tích lũy</div>
                    </div>
                </div>
                <div class="metric-card" style="box-shadow: none; border: 1px solid #e2e8f0;">
                    
                    <div>
                        <div class="metric-card-value">${s.SoTCTichLuy || 110} tín chỉ</div>
                        <div class="metric-card-label">Số tín chỉ tích lũy</div>
                    </div>
                </div>
                <div class="metric-card" style="box-shadow: none; border: 1px solid #e2e8f0;">
                    
                    <div>
                        <div class="metric-card-value">${studentRegs.length} đề tài</div>
                        <div class="metric-card-label">Đề tài đã đăng ký</div>
                    </div>
                </div>
                <div class="metric-card" style="box-shadow: none; border: 1px solid #e2e8f0;">
                    
                    <div>
                        <div class="metric-card-value" style="font-size: 16px;">Trường ĐH Quy Nhơn</div>
                        <div class="metric-card-label">Cổng thông tin đào tạo</div>
                    </div>
                </div>
            </div>

            <!-- Môn tiên quyết đã học -->
            <div style="background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 6px; padding: 14px 18px; margin-bottom: 22px;">
                <div style="font-size: 13.5px; font-weight: 700; color: #1e293b; margin-bottom: 8px;">
                    CÁC MÔN BẮT BUỘC KHÓA TRƯỚC ĐÃ ĐẠT (PREREQUISITES PASSED):
                </div>
                <div style="display: flex; flex-wrap: wrap; gap: 6px;">
                    ${monList.length > 0 ? monList.map((m) => `<span style="background: #e0f2fe; color: #0369a1; padding: 4px 10px; border-radius: 4px; font-size: 12.5px; font-weight: 600;">${esc(m)}</span>`).join('') : '<span style="color: #94a3b8; font-size: 13px;">Chưa có dữ liệu môn học khóa trước</span>'}
                </div>
            </div>

            <!-- Bảng đăng ký đề tài của sinh viên này -->
            <h4 style="font-size: 14.5px; font-weight: 800; color: #0c3258; margin-bottom: 10px;">
                LỊCH SỬ ĐĂNG KÝ ĐỀ TÀI & KẾT QUẢ HỌC TẬP CỦA SINH VIÊN ${esc(s.MaSV)}
            </h4>
            <div class="qnu-table-container">
                <table class="qnu-table">
                    <thead>
                        <tr>
                            <th>MÃ ĐK</th>
                            <th>MÃ ĐỀ TÀI</th>
                            <th>TÊN ĐỀ TÀI TỐT NGHIỆP</th>
                            <th>GIẢNG VIÊN HƯỚNG DẪN</th>
                            <th>TRẠNG THÁI</th>
                            <th>ĐIỂM KẾT QUẢ</th>
                            <th>GHI CHÚ / ĐÁNH GIÁ</th>
                            <th>THAO TÁC</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${regsTableHtml}
                    </tbody>
                </table>
            </div>
        </div>
    `;
}

function resetStudentLookup() {
    const input = document.getElementById('lookupStudentInput');
    if (input) input.value = '';
    const container = document.getElementById('lookupResultContainer');
    if (container) {
        container.innerHTML = `
            <div class="lookup-placeholder-box">
                
                <div style="font-size: 15px; font-weight: 700; color: #1e293b; margin-bottom: 6px;">
                    Chưa có sinh viên nào được tra cứu
                </div>
                <div style="max-width: 520px; margin: 0 auto; line-height: 1.5; color: #64748b;">
                    Theo quy định bảo mật học vụ, thông tin sinh viên không hiển thị sẵn trên trang học vụ.
                    Vui lòng nhập mã sinh viên vào ô tìm kiếm ở trên để tra cứu chi tiết hồ sơ (GPA, tín chỉ, môn tiên quyết, đề tài đăng ký và kết quả học tập).
                </div>
            </div>
        `;
    }
}

function quickLookupCode(code) {
    showSection('student-lookup');
    executeStudentLookup(code);
}

// ==========================================================================
// 10. PHÂN HỆ GIẢNG VIÊN: QUẢN LÝ LỚP HỌC PHẦN, DUYỆT & CHẤM ĐIỂM
// ==========================================================================

function isMyTopic(topic, user) {
    if (!topic || !user) return false;
    if (user.VaiTro === 'admin') return true;
    if (user.VaiTro !== 'giangvien') return false;

    const uName = String(user.TenDangNhap || '').trim().toLowerCase();
    const uHoTen = String(user.HoTen || '').trim().toLowerCase();
    const topicMaGV = String(topic.MaGV || '').trim().toLowerCase();
    const topicGV = String(topic.GiangVienHuongDan || '').trim().toLowerCase();

    // So khớp mã giảng viên (ví dụ GV001 / gv01 / GV01)
    if (topicMaGV && uName) {
        if (topicMaGV === uName) return true;
        const normTopic = topicMaGV.replace(/^gv0*/i, '');
        const normUser = uName.replace(/^gv0*/i, '');
        if (normTopic && normUser && normTopic === normUser) return true;
    }

    // So khớp tên giảng viên
    if (topicGV && uHoTen) {
        if (topicGV.includes(uHoTen) || uHoTen.includes(topicGV)) return true;
    }

    return false;
}

async function loadTeacherTopics() {
    const tbody = document.getElementById('teacherTopicsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" class="text-center">Đang tải danh sách đề tài...</td></tr>`;
    const res = await api('GET', '/topics');

    if (!res || !res.ok) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="color:#c62828;">Không thể tải đề tài (topic-service không phản hồi).</td></tr>`;
        return;
    }

    const user = getUser() || {};
    const topics = res.data || [];
    availableTopicsCache = topics;

    if (topics.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center">Bạn chưa tạo đề tài / lớp học phần nào. Bấm nút "+ Tạo lớp học phần / đề tài mới" để bắt đầu.</td></tr>`;
        return;
    }

    tbody.innerHTML = topics.map((t) => {
        const canEdit = isMyTopic(t, user);
        const actionHtml = canEdit ? `
            <button class="btn-table-action btn-register" onclick='openTopicModal(${JSON.stringify(t)})'>Sửa</button>
            <button class="btn-table-action btn-reject" onclick="deleteTopic('${esc(t.MaDT)}')">Xóa</button>
        ` : `
            <span class="badge-status" style="background:#f1f5f9; color:#64748b; font-size:12px; border:1px solid #cbd5e1; cursor:default;" title="Đề tài do giảng viên khác phụ trách - Không thể sửa thay">Chỉ xem</span>
        `;

        return `
        <tr style="${canEdit && user.VaiTro === 'giangvien' ? 'background-color: #f0fdf4;' : ''}">
            <td class="text-center"><code>${esc(t.MaDT)}</code></td>
            <td>
                <strong>${esc(t.TenDT)}</strong>
                ${canEdit && user.VaiTro === 'giangvien' ? '<span style="margin-left:6px; font-size:11px; color:#15803d; font-weight:700; background:#dcfce7; padding:2px 6px; border-radius:4px;">Của bạn</span>' : ''}
            </td>
            <td>
                <button type="button" class="lecturer-click-pill" onclick="event.stopPropagation(); showLecturerProfileModal('${esc(t.GiangVienHuongDan || '')}', '${esc(t.MaGV || '')}')" title="Nhấp để xem toàn bộ thông tin giảng viên hướng dẫn">
                    ${esc(t.GiangVienHuongDan || 'Giảng viên')}
                </button>
            </td>
            <td><span class="badge-status dang-thuc-hien">${esc(t.Nganh)}</span></td>
            <td class="text-center font-bold">${t.SoTinChi || 10}</td>
            <td><strong style="color:#004882;">${esc(t.MonBatBuoc || 'Không yêu cầu')}</strong></td>
            <td class="text-center font-bold">${t.GioiHanSV || 5} SV</td>
            <td class="text-center font-bold" style="color:#c31e24;">${Number(t.DiemGPAToiThieu || 2.50).toFixed(2)}</td>
            <td class="text-center">
                <span class="badge-status ${t.TrangThaiMo ? 'da-duyet' : 'tu-choi'}">
                    ${t.TrangThaiMo ? 'Đang mở' : 'Đã khóa'}
                </span>
            </td>
            <td class="text-center" style="white-space: nowrap;">
                ${actionHtml}
            </td>
        </tr>
        `;
    }).join('');
}

function openTopicModal(topic = null) {
    const isEdit = topic !== null;
    const user = getUser() || {};
    const defaultMajor = user.Nganh || 'Công nghệ phần mềm';

    if (isEdit && user.VaiTro === 'giangvien' && !isMyTopic(topic, user)) {
        return toast('Bạn chỉ có quyền chỉnh sửa đề tài do chính mình phụ trách hướng dẫn!', true);
    }

    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Sửa Lớp Học Phần / Đề Tài' : 'Tạo Lớp Học Phần / Đề Tài Mới'}</h3>
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="saveTopic(event, ${isEdit})">
            <!-- 1. Mã đề tài / học phần -->
            <div class="form-row">
                <label class="form-label">Mã đề tài / học phần * (Trỏ vào để chọn hoặc nhập)</label>
                <input type="text" id="mMaDT" class="form-control" list="listPresetCodes" value="${esc(topic ? topic.MaDT : '')}" ${isEdit ? 'readonly' : 'required placeholder="Ví dụ: DT001 - DT020" onchange="applyTopicPreset(this.value)"'}>
                <datalist id="listPresetCodes">
                    ${PRESET_TOPICS.map((p) => `<option value="${p.MaDT}">${p.MaDT} - ${esc(p.TenDT)} (${esc(p.Nganh)})</option>`).join('')}
                </datalist>
            </div>

            <!-- 2. Tên lớp học phần / đề tài tốt nghiệp -->
            <div class="form-row">
                <label class="form-label">Tên lớp học phần / đề tài tốt nghiệp *</label>
                <input type="text" id="mTenDT" class="form-control" list="listPresetTitles" value="${esc(topic ? topic.TenDT : '')}" required placeholder="Ví dụ: Xây dựng hệ thống..." onchange="applyTopicByTitle(this.value)">
                <datalist id="listPresetTitles">
                    ${PRESET_TOPICS.map((p) => `<option value="${esc(p.TenDT)}">[${p.MaDT}] ${esc(p.TenDT)}</option>`).join('')}
                </datalist>
            </div>

            <!-- 3. Mô tả tóm tắt nội dung -->
            <div class="form-row">
                <label class="form-label">Mô tả tóm tắt nội dung & mục tiêu nghiên cứu</label>
                <textarea id="mMoTa" class="form-control" rows="2" placeholder="Yêu cầu và mục tiêu của đề tài...">${esc(topic ? topic.MoTa : '')}</textarea>
            </div>

            <!-- 4. Phân loại ngành giảng dạy của giáo viên (TOÀN BỘ CÁC NGÀNH ĐÀO TẠO) -->
            <div class="form-row">
                <label class="form-label">Phân loại ngành giảng dạy của giáo viên * (Toàn bộ các ngành đào tạo QNU)</label>
                <select id="mNganh" class="form-control">
                    ${ALL_MAJORS.map((m) => `
                        <option value="${esc(m)}" ${(topic && topic.Nganh === m) ? 'selected' : (!topic && m === defaultMajor ? 'selected' : '')}>${esc(m)}</option>
                    `).join('')}
                </select>
            </div>

            <!-- Giới hạn SV & GPA tối thiểu -->
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-row">
                    <label class="form-label">Số lượng giới hạn SV đăng ký *</label>
                    <input type="number" id="mGioiHanSV" class="form-control" min="1" max="50" value="${topic ? topic.GioiHanSV : 5}" required>
                    <div class="form-help-text">Tối đa bao nhiêu SV được nhận</div>
                </div>
                <div class="form-row">
                    <label class="form-label">Tối thiểu điểm GPA để học *</label>
                    <input type="number" id="mDiemGPAToiThieu" class="form-control" min="0" max="4" step="0.01" value="${topic ? topic.DiemGPAToiThieu : 2.50}" required>
                    <div class="form-help-text">Thang điểm 4.0 (VD: 2.50)</div>
                </div>
            </div>

            <!-- 5. Môn bắt buộc khóa trước (Prerequisites) -->
            <div class="form-row">
                <label class="form-label">Môn bắt buộc khóa trước (Prerequisites)</label>
                <input type="text" id="mMonBatBuoc" class="form-control" list="listPresetPrereqs" value="${esc(topic ? topic.MonBatBuoc : 'Cơ sở dữ liệu, Kiến trúc phần mềm')}" placeholder="Phân tách bằng dấu phẩy...">
                <datalist id="listPresetPrereqs">
                    ${ALL_PREREQUISITES.map((c) => `<option value="${esc(c)}">${esc(c)}</option>`).join('')}
                </datalist>
                <div class="form-help-text">Sinh viên phải hoàn thành các môn này trước khi được duyệt đăng ký</div>
            </div>

            <!-- 6. Giảng viên hướng dẫn -->
            <div class="form-row">
                <label class="form-label" style="display:flex; justify-content:space-between; align-items:center;">
                    <span>Giảng viên hướng dẫn * ${user.VaiTro === 'giangvien' ? '(Cố định theo tài khoản của bạn)' : ''}</span>
                    <a href="javascript:void(0)" onclick="viewSelectedLecturerProfile()" style="font-size:12px; color:#004882; font-weight:700; text-decoration:none;">
                        Xem hồ sơ đầy đủ GV
                    </a>
                </label>
                ${user.VaiTro === 'giangvien' ? `
                    <input type="text" class="form-control" value="[${esc(user.TenDangNhap)}] ${esc(user.HoTen || 'Giảng viên')}" readonly style="background:#f8fafc; font-weight:600; color:#004882;">
                    <input type="hidden" id="mGiangVienSelect" value="${esc(user.TenDangNhap)}">
                ` : `
                    <select id="mGiangVienSelect" class="form-control" onchange="renderSelectedLecturerPreview(this.value)">
                        ${LECTURERS_DATA.map((l) => {
                            const isMatch = (topic && (topic.MaGV === l.code || (topic.GiangVienHuongDan && topic.GiangVienHuongDan.includes(l.name))))
                                || (!topic && (user.TenDangNhap === l.code || (user.HoTen && user.HoTen.includes(l.name))));
                            return `<option value="${l.code}" ${isMatch ? 'selected' : ''}>[${l.code}] ${l.name} - ${l.dept}</option>`;
                        }).join('')}
                    </select>
                `}
                <!-- Khung hiển thị toàn bộ thông tin chi tiết giảng viên ngay khi chọn -->
                <div id="mLecturerPreviewCard" style="margin-top:8px;"></div>
            </div>

            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn-primary-action">${isEdit ? 'Lưu thay đổi' : 'Tạo mới'}</button>
            </div>
        </form>
    `);

    // Hiển thị ngay thông tin chi tiết của giảng viên được chọn
    renderSelectedLecturerPreview(document.getElementById('mGiangVienSelect')?.value);
}

async function saveTopic(event, isEdit) {
    event.preventDefault();
    const user = getUser() || {};
    const gvSelect = document.getElementById('mGiangVienSelect');
    const selectedGvCode = (user.VaiTro === 'giangvien') ? user.TenDangNhap : (gvSelect ? gvSelect.value : '');
    const lecturerObj = LECTURERS_DATA.find((l) => l.code === selectedGvCode) || LECTURERS_DATA.find((l) => l.code === user.TenDangNhap) || LECTURERS_DATA[0];
    const gvName = (user.VaiTro === 'giangvien' && user.HoTen) ? user.HoTen : (lecturerObj ? lecturerObj.name : 'Giảng viên');
    const gvCode = (user.VaiTro === 'giangvien') ? user.TenDangNhap : (lecturerObj ? lecturerObj.code : selectedGvCode);

    const body = {
        MaDT: document.getElementById('mMaDT').value.trim(),
        TenDT: document.getElementById('mTenDT').value.trim(),
        MoTa: document.getElementById('mMoTa').value.trim(),
        Nganh: document.getElementById('mNganh').value,
        GioiHanSV: Number(document.getElementById('mGioiHanSV').value),
        DiemGPAToiThieu: Number(document.getElementById('mDiemGPAToiThieu').value),
        MonBatBuoc: document.getElementById('mMonBatBuoc').value.trim(),
        GiangVienHuongDan: gvName,
        MaGV: gvCode,
        SoTinChi: 10
    };

    const method = isEdit ? 'PUT' : 'POST';
    const path = isEdit ? `/topics/${encodeURIComponent(body.MaDT)}` : '/topics';

    const res = await api(method, path, body);
    if (res && res.ok) {
        toast(isEdit ? 'Cập nhật đề tài thành công' : 'Tạo đề tài mới thành công');
        closeModal();
        loadTeacherTopics();
        loadAvailableTopics();
    } else {
        toast(res ? res.message : 'Thao tác thất bại', true);
    }
}

async function deleteTopic(id) {
    const user = getUser() || {};
    if (user.VaiTro === 'giangvien') {
        const topic = (availableTopicsCache || []).find((t) => t.MaDT === id);
        if (topic && !isMyTopic(topic, user)) {
            return toast('Bạn chỉ có quyền xóa đề tài do chính mình phụ trách hướng dẫn!', true);
        }
    }
    showConfirmModal({
        title: 'Xóa Lớp Học Phần / Đề Tài',
        message: `Bạn có chắc muốn xóa đề tài <strong>${esc(id)}</strong>? Tất cả đăng ký đề tài này sẽ bị hủy tự động đồng bộ qua Event Bus.`,
        iconHtml: '',
        iconClass: 'danger',
        confirmText: 'Xóa đề tài',
        confirmClass: 'danger',
        onConfirm: async () => {
            const res = await api('DELETE', `/topics/${encodeURIComponent(id)}`);
            if (res && res.ok) {
                toast('Xóa đề tài thành công');
                loadTeacherTopics();
                loadAvailableTopics();
            } else {
                toast(res ? res.message : 'Xóa thất bại', true);
            }
        }
    });
}

// DUYỆT ĐĂNG KÝ
async function loadTeacherApprovals() {
    const tbody = document.getElementById('teacherApprovalsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="10" class="text-center">Đang tải danh sách chờ duyệt...</td></tr>`;
    const res = await api('GET', '/registrations');

    if (!res || !res.ok) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="color:#c62828;">Không thể tải đăng ký (registration-service tạm dừng).</td></tr>`;
        return;
    }

    const regs = res.data || [];
    if (regs.length === 0) {
        tbody.innerHTML = `<tr><td colspan="10" class="text-center" style="padding:20px; color:#777;">Hiện tại không có sinh viên nào đăng ký đề tài.</td></tr>`;
        return;
    }

    tbody.innerHTML = regs.map((r) => `
        <tr>
            <td class="text-center"><strong>#${r.MaDK}</strong></td>
            <td class="text-center"><code>${esc(r.MaSV)}</code></td>
            <td><strong>${esc(r.HoTen)}</strong></td>
            <td>${esc(r.Lop || 'DHKTPM20')}</td>
            <td class="text-center font-bold" style="color:#004882;">${r.GPA ? Number(r.GPA).toFixed(2) : '3.45'}</td>
            <td class="text-center"><code>${esc(r.MaDT)}</code></td>
            <td><strong>${esc(r.TenDT)}</strong></td>
            <td class="text-center">${esc(formatDateVN(r.NgayDangKy))}</td>
            <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
            <td class="text-center" style="white-space: nowrap;">
                ${r.TrangThai === 'Cho duyet' ? `
                    <button class="btn-table-action btn-approve" onclick="approveRegistration(${r.MaDK})">Duyệt</button>
                    <button class="btn-table-action btn-reject" onclick="rejectRegistrationPrompt(${r.MaDK})">Từ chối</button>
                ` : `
                    <span style="font-size:12px; color:#555; margin-right:4px;">${esc(r.TrangThai)}</span>
                `}
                <button class="btn-table-action btn-register" onclick="openEditRegistrationModal(${r.MaDK})">Sửa</button>
                <button class="btn-table-action btn-reject" onclick="deleteRegistration(${r.MaDK})">Xóa</button>
                <button class="btn-table-action" style="background:#0e4b85; color:#fff;" onclick="quickLookupCode('${esc(r.MaSV)}')">Tra cứu</button>
            </td>
        </tr>
    `).join('');
}

async function approveRegistration(MaDK) {
    showConfirmModal({
        title: 'Duyệt Đăng Ký Đề Tài',
        message: 'Xác nhận <strong>DUYỆT</strong> đăng ký cho sinh viên này? Trạng thái sẽ chuyển thành <em>"Đã duyệt đăng ký"</em> và thông báo sẽ được gửi đến sinh viên qua Event Bus.',
        iconHtml: '',
        iconClass: 'success',
        confirmText: 'Xác nhận duyệt',
        confirmClass: 'success',
        onConfirm: async () => {
            const res = await api('PUT', `/registrations/${MaDK}/approve`);
            if (res && res.ok) {
                toast('Đã duyệt đăng ký thành công! Sinh viên đã nhận được thông báo.');
                loadTeacherApprovals();
                loadTeacherGrading();
            } else {
                toast(res ? res.message : 'Duyệt thất bại', true);
            }
        }
    });
}

async function rejectRegistrationPrompt(MaDK) {
    showPromptModal({
        title: 'Từ Chối Đăng Ký Đề Tài',
        message: 'Vui lòng nhập lý do từ chối để phản hồi giải thích đến sinh viên:',
        defaultValue: 'Chưa đạt yêu cầu môn tiên quyết hoặc điểm GPA theo quy định của lớp học phần.',
        placeholder: 'Nhập lý do từ chối...',
        confirmText: 'Xác nhận từ chối',
        confirmClass: 'danger',
        onConfirm: async (reason) => {
            if (!reason) return;
            const res = await api('PUT', `/registrations/${MaDK}/reject`, { LyDoTuChoi: reason });
            if (res && res.ok) {
                toast('Đã từ chối đăng ký đề tài.');
                loadTeacherApprovals();
            } else {
                toast(res ? res.message : 'Thao tác thất bại', true);
            }
        }
    });
}

// CHẤM ĐIỂM
async function loadTeacherGrading() {
    const tbody = document.getElementById('teacherGradingTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="8" class="text-center">Đang tải danh sách chấm điểm...</td></tr>`;
    const res = await api('GET', '/registrations');

    if (!res || !res.ok) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="color:#c62828;">Không thể tải dữ liệu chấm điểm.</td></tr>`;
        return;
    }

    // Chỉ chấm điểm các đăng ký đã được duyệt hoặc đang thực hiện hoặc đã hoàn thành
    const gradable = (res.data || []).filter((r) => r.TrangThai !== 'Da huy' && r.TrangThai !== 'Tu choi');

    if (gradable.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center" style="padding:20px; color:#777;">Chưa có sinh viên nào ở trạng thái đã duyệt để chấm điểm.</td></tr>`;
        return;
    }

    tbody.innerHTML = gradable.map((r) => `
        <tr>
            <td class="text-center"><strong>#${r.MaDK}</strong></td>
            <td class="text-center"><code>${esc(r.MaSV)}</code></td>
            <td><strong>${esc(r.HoTen)}</strong></td>
            <td>${esc(r.TenDT)}</td>
            <td class="text-center">${formatStatusBadge(r.TrangThai)}</td>
            <td class="text-center font-bold" style="font-size:15px; color:#004882;">${r.Diem !== null && r.Diem !== undefined ? Number(r.Diem).toFixed(1) : '-'}</td>
            <td>${esc(r.NhanXet || 'Chưa chấm điểm')}</td>
            <td class="text-center" style="white-space: nowrap;">
                <button class="btn-table-action btn-grade" onclick="openGradeModal(${r.MaDK}, '${esc(r.HoTen)}', '${esc(r.TenDT)}', ${r.Diem || 0}, '${esc(r.NhanXet || '')}')">
                    Chấm điểm
                </button>
                <button class="btn-table-action btn-register" onclick="openEditRegistrationModal(${r.MaDK})">Sửa</button>
                <button class="btn-table-action btn-reject" onclick="deleteRegistration(${r.MaDK})">Xóa</button>
            </td>
        </tr>
    `).join('');
}

function openGradeModal(MaDK, HoTen, TenDT, currentScore, currentNote) {
    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">Chấm Điểm Đồ Án Tốt Nghiệp</h3>
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="submitGrade(event, ${MaDK})">
            <div class="form-row">
                <label class="form-label">Sinh viên thực hiện:</label>
                <div style="font-weight:bold; font-size:14.5px; color:#004882;">${esc(HoTen)}</div>
            </div>
            <div class="form-row">
                <label class="form-label">Đề tài tốt nghiệp:</label>
                <div style="color:#333;">${esc(TenDT)}</div>
            </div>
            <div class="form-row">
                <label class="form-label">Điểm số kết quả học tập (Thang điểm 10) *</label>
                <input type="number" id="mDiem" class="form-control" min="0" max="10" step="0.1" value="${currentScore || ''}" required placeholder="Ví dụ: 8.5">
                <div class="form-help-text">Điểm từ 0.0 đến 10.0</div>
            </div>
            <div class="form-row">
                <label class="form-label">Nhận xét & đánh giá chuyên môn của giảng viên</label>
                <textarea id="mNhanXet" class="form-control" rows="3" placeholder="Nhận xét về thái độ, nội dung đồ án, khả năng thuyết trình...">${esc(currentNote)}</textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn-primary-action">Lưu & Công bố điểm</button>
            </div>
        </form>
    `);
}

async function submitGrade(event, MaDK) {
    event.preventDefault();
    const scoreVal = document.getElementById('mDiem').value;
    const noteVal = document.getElementById('mNhanXet').value;

    const res = await api('PUT', `/registrations/${MaDK}/grade`, {
        Diem: Number(scoreVal),
        NhanXet: noteVal
    });

    if (res && res.ok) {
        toast('Chấm điểm kết quả học tập thành công! Điểm số đã phát hành đến sinh viên.');
        closeModal();
        loadTeacherGrading();
        loadDashboardView();
    } else {
        toast(res ? res.message : 'Chấm điểm thất bại', true);
    }
}

// ==========================================================================
// 10. PHÂN HỆ QUẢN TRỊ ADMIN (USERS & STUDENTS)
// ==========================================================================

async function loadAdminUsers() {
    const tbody = document.getElementById('adminUsersTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" class="text-center">Đang tải danh sách tài khoản...</td></tr>`;
    const res = await api('GET', '/auth/users');

    if (!res || !res.ok) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color:#c62828;">Không thể tải tài khoản (auth-service không phản hồi).</td></tr>`;
        return;
    }

    const users = res.data || [];
    tbody.innerHTML = users.map((u) => `
        <tr>
            <td class="text-center">${u.MaTK}</td>
            <td><strong>${esc(u.TenDangNhap)}</strong></td>
            <td>
                ${u.VaiTro === 'giangvien' ? `
                    <button type="button" class="lecturer-click-pill" onclick="showLecturerProfileModal('${esc(u.HoTen)}', '${esc(u.TenDangNhap)}')" title="Nhấp để xem toàn bộ thông tin giảng viên">
                        ${esc(u.HoTen)}
                    </button>
                ` : `
                    <strong>${esc(u.HoTen)}</strong>
                `}
            </td>
            <td>${esc(u.Email || '-')}</td>
            <td class="text-center">
                <span class="badge-status ${u.VaiTro === 'admin' ? 'tu-choi' : u.VaiTro === 'giangvien' ? 'da-duyet' : 'dang-thuc-hien'}">
                    ${roleLabel(u.VaiTro)}
                </span>
            </td>
            <td class="text-center">${esc(u.MaSV || '-')}</td>
            <td>${esc(u.Nganh || '-')}</td>
            <td class="text-center">${esc(formatDateVN(u.NgayTao))}</td>
            <td class="text-center">
                <button class="btn-table-action btn-register" onclick="changeRoleModal(${u.MaTK}, '${u.VaiTro}')">Đổi vai trò</button>
                ${u.TenDangNhap !== 'admin' ? `<button class="btn-table-action btn-reject" onclick="deleteUser(${u.MaTK})">Xóa</button>` : ''}
            </td>
        </tr>
    `).join('');
}

function openUserModal() {
    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">Tạo Tài Khoản Người Dùng Mới</h3>
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
        </div>
        <form onsubmit="createUser(event)">
            <div class="form-row">
                <label class="form-label">Vai trò truy cập *</label>
                <select id="uRole" class="form-control">
                    <option value="giangvien">Giảng viên / Giáo viên</option>
                    <option value="sinhvien">Sinh viên</option>
                    <option value="admin">Quản trị viên (Admin)</option>
                </select>
            </div>
            <div class="form-row">
                <label class="form-label">Tên đăng nhập * (Mã tài khoản: GV001... hoặc SV001...)</label>
                <input type="text" id="uUsername" class="form-control" required placeholder="Ví dụ: GV011 hoặc SV005">
            </div>
            <div class="form-row">
                <label class="form-label">Mật khẩu ban đầu *</label>
                <input type="password" id="uPassword" class="form-control" required value="123456">
            </div>
            <div class="form-row">
                <label class="form-label">Họ và tên *</label>
                <input type="text" id="uFullName" class="form-control" required placeholder="Ví dụ: TS. Nguyễn Văn A">
            </div>
            <div class="form-row">
                <label class="form-label">Email liên hệ</label>
                <input type="email" id="uEmail" class="form-control" placeholder="user@qnu.edu.vn">
            </div>
            <div class="form-row">
                <label class="form-label">Chuyên ngành / Đơn vị</label>
                <select id="uMajor" class="form-control">
                    ${ALL_MAJORS.map((m) => `<option value="${esc(m)}">${esc(m)}</option>`).join('')}
                </select>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn-primary-action">Tạo tài khoản</button>
            </div>
        </form>
    `);
}

async function createUser(event) {
    event.preventDefault();
    const body = {
        TenDangNhap: document.getElementById('uUsername').value.trim(),
        MatKhau: document.getElementById('uPassword').value,
        HoTen: document.getElementById('uFullName').value.trim(),
        Email: document.getElementById('uEmail').value.trim(),
        VaiTro: document.getElementById('uRole').value,
        Nganh: document.getElementById('uMajor').value
    };

    const res = await api('POST', '/auth/register', body);
    if (res && res.ok) {
        toast('Tạo tài khoản người dùng thành công');
        closeModal();
        loadAdminUsers();
    } else {
        toast(res ? res.message : 'Tạo tài khoản thất bại', true);
    }
}

async function changeRolePrompt(MaTK, currentRole) {
    changeRoleModal(MaTK, currentRole);
}

async function deleteUser(MaTK) {
    showConfirmModal({
        title: 'Xóa Tài Khoản Người Dùng',
        message: `Bạn có chắc chắn muốn xóa tài khoản ID <strong>#${MaTK}</strong> khỏi hệ thống?`,
        iconHtml: '',
        iconClass: 'danger',
        confirmText: 'Xóa tài khoản',
        confirmClass: 'danger',
        onConfirm: async () => {
            const res = await api('DELETE', `/auth/users/${MaTK}`);
            if (res && res.ok) {
                toast('Xóa tài khoản thành công');
                loadAdminUsers();
            } else {
                toast(res ? res.message : 'Xóa thất bại', true);
            }
        }
    });
}

// QUẢN LÝ SINH VIÊN
async function loadAdminStudents() {
    const tbody = document.getElementById('adminStudentsTableBody');
    if (!tbody) return;

    tbody.innerHTML = `<tr><td colspan="9" class="text-center">Đang tải danh sách sinh viên...</td></tr>`;
    const res = await api('GET', '/students');

    if (!res || !res.ok) {
        tbody.innerHTML = `<tr><td colspan="9" class="text-center" style="color:#c62828;">Không thể tải sinh viên (student-service không phản hồi).</td></tr>`;
        return;
    }

    const students = res.data || [];
    tbody.innerHTML = students.map((s) => `
        <tr>
            <td class="text-center"><code>${esc(s.MaSV)}</code></td>
            <td><strong>${esc(s.HoTen)}</strong></td>
            <td>${esc(s.Email || '-')}</td>
            <td>${esc(s.Lop || '-')}</td>
            <td>${esc(s.Nganh || 'Công nghệ phần mềm')}</td>
            <td class="text-center font-bold" style="color:#004882;">${s.GPA ? Number(s.GPA).toFixed(2) : '3.00'}</td>
            <td class="text-center">${s.SoTCTichLuy || 110}</td>
            <td style="font-size:12px; max-width:280px;">${esc(s.MonDaHoc || '-')}</td>
            <td class="text-center">
                <button class="btn-table-action" style="background:#004882; color:#fff;" onclick="quickLookupCode('${esc(s.MaSV)}')">Tra cứu</button>
                <button class="btn-table-action btn-register" onclick='openStudentModal(${JSON.stringify(s)})'>Sửa</button>
                <button class="btn-table-action btn-reject" onclick="deleteStudent('${esc(s.MaSV)}')">Xóa</button>
            </td>
        </tr>
    `).join('');
}

function openStudentModal(student = null) {
    const isEdit = student !== null;
    openModal(`
        <div class="modal-header">
            <h3 class="modal-title">${isEdit ? 'Sửa Thông Tin Sinh Viên' : 'Thêm Sinh Viên Mới'}</h3>
            <button class="modal-close-btn" onclick="closeModal()">&times;</button>
        </div>
        ${!isEdit ? `
            <div style="background: #e0f2fe; border-left: 4px solid #0284c7; padding: 10px 14px; border-radius: 4px; margin-bottom: 14px; font-size: 13px; color: #0369a1; text-align: left;">
                <strong>💡 Đồng bộ tài khoản SOA:</strong> Khi thêm sinh viên mới, hệ thống tự động phát sự kiện <code>student.created</code> qua Event Bus để Auth Service tạo tài khoản đăng nhập (Tên đăng nhập: <strong>Mã SV</strong>, Mật khẩu mặc định: <strong>123456</strong>).
            </div>
        ` : ''}
        <form onsubmit="saveStudent(event, ${isEdit})">
            <div class="form-row">
                <label class="form-label">Mã sinh viên *</label>
                <input type="text" id="sMaSV" class="form-control" value="${esc(student ? student.MaSV : '')}" ${isEdit ? 'readonly' : 'required'}>
            </div>
            <div class="form-row">
                <label class="form-label">Họ và tên *</label>
                <input type="text" id="sHoTen" class="form-control" value="${esc(student ? student.HoTen : '')}" required>
            </div>
            <div class="form-row">
                <label class="form-label">Email sinh viên</label>
                <input type="email" id="sEmail" class="form-control" value="${esc(student ? student.Email : '')}">
            </div>
            <div class="form-row">
                <label class="form-label">Lớp sinh hoạt</label>
                <input type="text" id="sLop" class="form-control" value="${esc(student ? student.Lop : 'DHKTPM20')}">
            </div>
            <div class="form-row">
                <label class="form-label">Chuyên ngành</label>
                <select id="sNganh" class="form-control">
                    <option value="Công nghệ phần mềm" ${student && student.Nganh === 'Công nghệ phần mềm' ? 'selected' : ''}>Công nghệ phần mềm</option>
                    <option value="Hệ thống thông tin" ${student && student.Nganh === 'Hệ thống thông tin' ? 'selected' : ''}>Hệ thống thông tin</option>
                </select>
            </div>
            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px;">
                <div class="form-row">
                    <label class="form-label">Điểm GPA tích lũy</label>
                    <input type="number" id="sGPA" class="form-control" min="0" max="4" step="0.01" value="${student ? student.GPA : 3.00}">
                </div>
                <div class="form-row">
                    <label class="form-label">Số tín chỉ tích lũy</label>
                    <input type="number" id="sTC" class="form-control" value="${student ? student.SoTCTichLuy : 110}">
                </div>
            </div>
            <div class="form-row">
                <label class="form-label">Các môn học khóa trước đã đạt (phân cách bởi dấu phẩy)</label>
                <textarea id="sMonDaHoc" class="form-control" rows="2">${esc(student ? student.MonDaHoc : 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm, Lập trình Web')}</textarea>
            </div>
            <div class="modal-footer">
                <button type="button" class="btn-secondary" onclick="closeModal()">Hủy</button>
                <button type="submit" class="btn-primary-action">${isEdit ? 'Cập nhật' : 'Thêm sinh viên'}</button>
            </div>
        </form>
    `);
}

async function saveStudent(event, isEdit) {
    event.preventDefault();
    const body = {
        MaSV: document.getElementById('sMaSV').value.trim(),
        HoTen: document.getElementById('sHoTen').value.trim(),
        Email: document.getElementById('sEmail').value.trim(),
        Lop: document.getElementById('sLop').value.trim(),
        Nganh: document.getElementById('sNganh').value,
        GPA: Number(document.getElementById('sGPA').value),
        SoTCTichLuy: Number(document.getElementById('sTC').value),
        MonDaHoc: document.getElementById('sMonDaHoc').value.trim()
    };

    const method = isEdit ? 'PUT' : 'POST';
    const path = isEdit ? `/students/${encodeURIComponent(body.MaSV)}` : '/students';

    const res = await api(method, path, body);
    if (res && res.ok) {
        toast(isEdit ? 'Cập nhật sinh viên thành công' : 'Thêm sinh viên thành công! Tài khoản đã được cấp tự động (MK: 123456)');
        closeModal();
        loadAdminStudents();
    } else {
        toast(res ? res.message : 'Thao tác thất bại', true);
    }
}

async function deleteStudent(MaSV) {
    showConfirmModal({
        title: 'Xóa Hồ Sơ Sinh Viên',
        message: `Bạn có chắc chắn muốn xóa sinh viên <strong>${esc(MaSV)}</strong>? Mọi đăng ký đề tài của sinh viên này sẽ được tự động hủy qua Event Bus.`,
        iconHtml: '',
        iconClass: 'danger',
        confirmText: 'Xóa sinh viên',
        confirmClass: 'danger',
        onConfirm: async () => {
            const res = await api('DELETE', `/students/${encodeURIComponent(MaSV)}`);
            if (res && res.ok) {
                toast('Đã xóa sinh viên thành công');
                loadAdminStudents();
            } else {
                toast(res ? res.message : 'Xóa thất bại', true);
            }
        }
    });
}

// ==========================================================================
// 10B. GIÁM SÁT HỆ THỐNG SOA & CHỨNG MINH TÍNH CHỊU LỖI (FAULT TOLERANCE)
// ==========================================================================

async function loadSoaSystemView() {
    const container = document.getElementById('soaSystemBox');
    if (!container) return;

    container.innerHTML = `<div style="padding: 24px; text-align: center; color: #64748b;">Đang kiểm tra nhịp tim (Heartbeat) và trạng thái các Microservice từ Service Registry...</div>`;

    const [sysRes, dashRes] = await Promise.all([
        api('GET', '/system/services'),
        api('GET', '/dashboard')
    ]);

    const sysData = (sysRes && sysRes.ok && sysRes.data) ? sysRes.data : {};
    const servicesMap = sysData.services || {};
    const isRegistryUp = sysData.registry === 'UP';
    const eventBusData = sysData.eventBus || null;

    // Danh sách đầy đủ 8 thành phần trong kiến trúc SOA
    const SOA_COMPONENTS = [
        {
            key: 'api-gateway',
            name: 'API Gateway & Web Portal',
            port: 3000,
            type: 'Cổng vào duy nhất (Single Entry Point)',
            role: 'Định tuyến động, Cân bằng tải, RBAC, Rate Limiting, Circuit Breaker',
            db: 'Static Web / Policies Memory',
            isSpecial: 'gateway'
        },
        {
            key: 'service-registry',
            name: 'Service Registry',
            port: 3500,
            type: 'Dò tìm động (Service Discovery)',
            role: 'Quản lý danh bạ dịch vụ, theo dõi Heartbeat, tự động phát hiện instance',
            db: 'In-Memory Service Catalog',
            isSpecial: 'registry'
        },
        {
            key: 'event-bus',
            name: 'Event Bus (Message Broker)',
            port: 3600,
            type: 'Truyền thông bất đồng bộ (EDA)',
            role: 'Phân phối sự kiện Pub/Sub, chuyển phát đảm bảo, khôi phục hàng đợi',
            db: 'Event Log Persistent Storage',
            isSpecial: 'bus'
        },
        {
            key: 'auth-service',
            name: 'Auth Service',
            port: 3001,
            type: 'Microservice Nghiệp vụ',
            role: 'Xác thực tài khoản, băm mật khẩu bcrypt, phát hành & kiểm tra JWT',
            db: 'soa_auth (Độc lập)'
        },
        {
            key: 'student-service',
            name: 'Student Service',
            port: 3002,
            type: 'Microservice Nghiệp vụ',
            role: 'Quản lý hồ sơ sinh viên, điểm GPA tích lũy, môn bắt buộc khóa trước',
            db: 'soa_student (Độc lập)'
        },
        {
            key: 'topic-service',
            name: 'Topic Service',
            port: 3003,
            type: 'Microservice Nghiệp vụ',
            role: 'Quản lý Lớp học phần / Đề tài, chỉ tiêu sinh viên, điều kiện tiên quyết',
            db: 'soa_topic (Độc lập)'
        },
        {
            key: 'registration-service',
            name: 'Registration Service',
            port: 3004,
            type: 'Microservice Nghiệp vụ',
            role: 'Xử lý đăng ký học phần, xét duyệt, chấm điểm đồ án tốt nghiệp',
            db: 'soa_registration (Độc lập)'
        },
        {
            key: 'notification-service',
            name: 'Notification Service',
            port: 3005,
            type: 'Microservice Nghiệp vụ',
            role: 'Tiêu thụ sự kiện từ Event Bus, phát thông báo học vụ đến người dùng',
            db: 'soa_notification (Độc lập)'
        }
    ];

    let upCount = 0;
    let downCount = 0;

    const evaluatedComponents = SOA_COMPONENTS.map(c => {
        let isUp = false;
        let uptimeText = 'Không phản hồi';
        let heartbeatText = 'Mất kết nối';

        if (c.isSpecial === 'registry') {
            isUp = isRegistryUp;
            uptimeText = isUp ? 'Đang hoạt động' : 'Tạm dừng';
            heartbeatText = isUp ? 'Trực tuyến' : 'Không có tín hiệu';
        } else if (c.isSpecial === 'bus') {
            isUp = !!eventBusData;
            uptimeText = isUp ? `Đã giao: ${eventBusData.delivered || 0} tin` : 'Tạm dừng';
            heartbeatText = isUp ? `Subscribers: ${Object.keys(eventBusData.subscribers || {}).length}` : 'Không có tín hiệu';
        } else {
            const instances = servicesMap[c.key] || [];
            const activeInstance = instances.find(inst => inst.status === 'UP');
            if (activeInstance) {
                isUp = true;
                const sec = Math.round((activeInstance.uptimeMs || 0) / 1000);
                uptimeText = `${Math.floor(sec / 60)} phút ${sec % 60} giây`;
                heartbeatText = `${activeInstance.lastHeartbeatAgoMs || 0} ms trước`;
            } else {
                isUp = false;
                uptimeText = 'Tạm dừng / Lỗi';
                heartbeatText = 'Mất Heartbeat';
            }
        }

        if (isUp) upCount++;
        else downCount++;

        return { ...c, isUp, uptimeText, heartbeatText };
    });

    const isSystemDegraded = downCount > 0;

    container.innerHTML = `
        <!-- Thẻ thống kê sức khỏe hệ thống -->
        <div class="dashboard-metrics-grid" style="margin-bottom: 20px;">
            <div class="metric-card">
                <div>
                    <div class="metric-card-value">${evaluatedComponents.length}</div>
                    <div class="metric-card-label">Tổng số thành phần kiến trúc</div>
                </div>
            </div>
            <div class="metric-card">
                <div>
                    <div class="metric-card-value" style="color: #15803d;">${upCount} Đang chạy</div>
                    <div class="metric-card-label">Dịch vụ hoạt động bình thường</div>
                </div>
            </div>
            <div class="metric-card">
                <div>
                    <div class="metric-card-value" style="color: ${downCount > 0 ? '#b91c1c' : '#15803d'};">${downCount} Tạm dừng</div>
                    <div class="metric-card-label">Dịch vụ ngắt kết nối (Isolate)</div>
                </div>
            </div>
            <div class="metric-card">
                <div>
                    <div class="metric-card-value" style="color: #004882;">${eventBusData ? (eventBusData.delivered || 0) + ' sự kiện' : '0'}</div>
                    <div class="metric-card-label">Tin nhắn qua Event Bus (EDA)</div>
                </div>
            </div>
        </div>

        <!-- Trạng thái tổng quát của hệ thống -->
        <div style="background: ${isSystemDegraded ? '#fff7ed' : '#f0fdf4'}; border: 1px solid ${isSystemDegraded ? '#fdba74' : '#86efac'}; border-left: 4px solid ${isSystemDegraded ? '#ea580c' : '#16a34a'}; border-radius: 6px; padding: 14px 18px; margin-bottom: 20px;">
            <div style="display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 10px;">
                <div>
                    <strong style="font-size: 14.5px; color: ${isSystemDegraded ? '#9a3412' : '#166534'};">
                        ${isSystemDegraded ? 'HỆ THỐNG ĐANG HOẠT ĐỘNG Ở CHẾ ĐỘ PHÂN TÁN SUY GIẢM (DEGRADED MODE)' : 'TOÀN BỘ 8 THÀNH PHẦN KIẾN TRÚC SOA ĐANG HOẠT ĐỘNG KHỎE MẠNH (100% HEALTHY)'}
                    </strong>
                    <div style="font-size: 13px; color: #374151; margin-top: 4px;">
                        ${isSystemDegraded 
                            ? 'Có ' + downCount + ' dịch vụ đang tạm ngắt kết nối. Nhờ tính chất Loose Coupling & Circuit Breaker của SOA, các dịch vụ còn lại vẫn phục vụ người dùng bình thường, không gây sập ứng dụng.' 
                            : 'Mỗi dịch vụ sở hữu cơ sở dữ liệu độc lập (Database-per-service). Service Discovery giám sát nhịp tim liên tục mỗi 5 giây.'}
                    </div>
                </div>
                <button type="button" class="btn-primary-action" onclick="loadSoaSystemView()" style="white-space: nowrap;">
                    Làm mới nhịp tim ngay
                </button>
            </div>
        </div>

        <!-- Bảng chi tiết trạng thái từng Microservice -->
        <div class="qnu-table-container" style="margin-bottom: 24px;">
            <table class="qnu-table">
                <thead>
                    <tr>
                        <th class="text-center">STT</th>
                        <th>TÊN DỊCH VỤ (SERVICE)</th>
                        <th class="text-center">CỔNG (PORT)</th>
                        <th>VAI TRÒ TRONG KIẾN TRÚC SOA</th>
                        <th>CƠ SỞ DỮ LIỆU ĐỘC LẬP</th>
                        <th class="text-center">TRẠNG THÁI</th>
                        <th class="text-center">THỜI GIAN CHẠY</th>
                        <th class="text-center">NHỊP TIM</th>
                    </tr>
                </thead>
                <tbody>
                    ${evaluatedComponents.map((c, idx) => `
                        <tr style="background: ${c.isUp ? '#ffffff' : '#fff5f5'};">
                            <td class="text-center"><strong>${idx + 1}</strong></td>
                            <td>
                                <strong style="color: #004882;">${esc(c.name)}</strong>
                                <div style="font-size: 11.5px; color: #64748b;"><code>${esc(c.key)}</code></div>
                            </td>
                            <td class="text-center"><code>${c.port}</code></td>
                            <td style="font-size: 12.5px;">${esc(c.role)}</td>
                            <td><span style="font-size: 12px; font-weight: 600; color: #475569;">${esc(c.db)}</span></td>
                            <td class="text-center">
                                <span class="badge-status ${c.isUp ? 'da-duyet' : 'tu-choi'}" style="font-weight: 700;">
                                    ${c.isUp ? 'HOẠT ĐỘNG (UP)' : 'TẠM DỪNG (DOWN)'}
                                </span>
                            </td>
                            <td class="text-center" style="font-size: 12.5px;">${esc(c.uptimeText)}</td>
                            <td class="text-center" style="font-size: 12.5px; color: ${c.isUp ? '#166534' : '#b91c1c'}; font-weight: 600;">
                                ${esc(c.heartbeatText)}
                            </td>
                        </tr>
                    `).join('')}
                </tbody>
            </table>
        </div>

        <!-- Hướng dẫn thực nghiệm cách chứng minh tính chất SOA -->
        <div style="background: #f8fafc; border: 1px solid #cbd5e1; border-radius: 6px; padding: 18px 22px;">
            <h4 style="color: #0f172a; font-size: 15px; margin-bottom: 10px; font-weight: 800;">
                HƯỚNG DẪN THỰC HIỆN BÀI THỬ NGHIỆM CHỊU LỖI (FAULT TOLERANCE DEMO):
            </h4>
            <div style="font-size: 13.5px; line-height: 1.7; color: #334155;">
                <div><strong>Bước 1 (Tắt thử 1 dịch vụ):</strong> Mở Terminal hoặc Process Manager, tắt cổng <code>3002</code> của <code>student-service</code>.</div>
                <div><strong>Bước 2 (Kiểm tra phản ứng):</strong> Quay lại màn hình này và bấm <em>"Làm mới nhịp tim ngay"</em>. Bạn sẽ thấy <code>student-service</code> chuyển trạng thái sang <strong>TẠM DỪNG (DOWN)</strong>.</div>
                <div><strong>Bước 3 (Chứng minh các dịch vụ khác vẫn sống 100%):</strong> Bấm vào menu <em>"Đăng ký đề tài"</em> (sử dụng <code>topic-service</code> cổng 3003) hoặc <em>"Tài khoản"</em> (sử dụng <code>auth-service</code> cổng 3001) &rarr; Mọi chức năng xem đề tài, tìm kiếm, đăng nhập vẫn diễn ra bình thường! Chỉ duy nhất trang hồ sơ sinh viên báo lỗi cục bộ 503 có cấu trúc.</div>
                <div><strong>Bước 4 (Tự động phục hồi - Self-Healing):</strong> Bật lại <code>student-service</code> (chạy <code>npm run start:student</code>). Dịch vụ tự động đăng ký lại vào Service Registry sau 3-5 giây và chuyển lại thành <strong>HOẠT ĐỘNG (UP)</strong> mà không cần khởi động lại toàn bộ hệ thống!</div>
            </div>
        </div>
    `;
}

// ==========================================================================
// 11. HỖ TRỢ / MODAL / ĐỊNH DẠNG
// ==========================================================================

function openModal(contentHtml) {
    const container = document.getElementById('modalContainer');
    if (!container) return;
    container.innerHTML = `
        <div class="modal-backdrop" onclick="if(event.target === this) closeModal()">
            <div class="modal-content-card">
                ${contentHtml}
            </div>
        </div>
    `;
    container.style.display = 'block';
}

function closeModal() {
    const container = document.getElementById('modalContainer');
    if (container) {
        container.style.display = 'none';
        container.innerHTML = '';
    }
}

/**
 * Custom Confirmation Dialog - Thay thế hoàn toàn window.confirm() trình duyệt xấu
 * Hiển thị popup trực tiếp với nút Thực hiện & Hủy bỏ
 */
function showConfirmModal({
    title = 'Xác nhận thao tác',
    message = 'Bạn có chắc chắn muốn thực hiện thao tác này?',
    iconHtml = '',
    iconClass = 'primary', // 'primary', 'danger', 'success'
    confirmText = 'Thực hiện',
    confirmClass = 'primary', // 'primary', 'danger', 'success'
    cancelText = 'Hủy bỏ',
    onConfirm = null
}) {
    openModal(`
        <div class="confirm-dialog-card">
            ${iconHtml ? `<div class="confirm-dialog-icon ${iconClass}">${iconHtml}</div>` : ''}
            <div class="confirm-dialog-title">${title}</div>
            <div class="confirm-dialog-message">${message}</div>
            <div class="confirm-dialog-actions">
                <button type="button" class="btn-confirm-cancel" onclick="closeModal()">${cancelText}</button>
                <button type="button" class="btn-confirm-execute ${confirmClass}" id="btnConfirmExecuteAction">${confirmText}</button>
            </div>
        </div>
    `);

    const btn = document.getElementById('btnConfirmExecuteAction');
    if (btn) {
        btn.onclick = async () => {
            closeModal();
            if (typeof onConfirm === 'function') {
                await onConfirm();
            }
        };
    }
}

/**
 * Custom Prompt Dialog - Thay thế hoàn toàn window.prompt() trình duyệt
 */
function showPromptModal({
    title = 'Nhập thông tin phản hồi',
    message = 'Vui lòng điền nội dung bên dưới:',
    defaultValue = '',
    placeholder = '',
    confirmText = 'Xác nhận thực hiện',
    confirmClass = 'primary',
    cancelText = 'Hủy bỏ',
    onConfirm = null
}) {
    openModal(`
        <div class="confirm-dialog-card" style="text-align: left; max-width: 520px;">
            <div class="confirm-dialog-title" style="text-align: center; margin-bottom: 12px;">${title}</div>
            <div class="confirm-dialog-message" style="margin-bottom: 12px; color: #374151;">${message}</div>
            <div style="margin-bottom: 18px;">
                <textarea id="promptInputText" class="form-control" rows="3" placeholder="${esc(placeholder)}">${esc(defaultValue)}</textarea>
            </div>
            <div class="confirm-dialog-actions">
                <button type="button" class="btn-confirm-cancel" onclick="closeModal()">${cancelText}</button>
                <button type="button" class="btn-confirm-execute ${confirmClass}" id="btnPromptExecuteAction">${confirmText}</button>
            </div>
        </div>
    `);

    const input = document.getElementById('promptInputText');
    if (input) {
        input.focus();
        input.select();
    }

    const btn = document.getElementById('btnPromptExecuteAction');
    if (btn) {
        btn.onclick = async () => {
            const val = document.getElementById('promptInputText').value.trim();
            closeModal();
            if (typeof onConfirm === 'function') {
                await onConfirm(val);
            }
        };
    }
}

/**
 * Custom Modal chọn vai trò tài khoản (thay thế prompt đổi vai trò)
 */
function changeRoleModal(MaTK, currentRole) {
    openModal(`
        <div class="confirm-dialog-card" style="text-align: left; max-width: 480px;">
            <div class="confirm-dialog-title" style="text-align: center; margin-bottom: 12px;">Phân Quyền Vai Trò Người Dùng</div>
            <div class="confirm-dialog-message" style="margin-bottom: 16px; color: #4b5563;">
                Thay đổi quyền truy cập cho tài khoản <strong>#${MaTK}</strong> (Hiện tại: <code>${esc(currentRole)}</code>):
            </div>
            <div class="form-row" style="margin-bottom: 20px;">
                <label class="form-label">Chọn vai trò mới:</label>
                <select id="modalSelectNewRole" class="form-control">
                    <option value="sinhvien" ${currentRole === 'sinhvien' ? 'selected' : ''}>Sinh viên (sinhvien)</option>
                    <option value="giangvien" ${currentRole === 'giangvien' ? 'selected' : ''}>Giảng viên / Giáo viên (giangvien)</option>
                    <option value="admin" ${currentRole === 'admin' ? 'selected' : ''}>Quản trị viên hệ thống (admin)</option>
                </select>
            </div>
            <div class="confirm-dialog-actions">
                <button type="button" class="btn-confirm-cancel" onclick="closeModal()">Hủy bỏ</button>
                <button type="button" class="btn-confirm-execute primary" id="btnExecuteRoleChange">Thực hiện cập nhật</button>
            </div>
        </div>
    `);

    const btn = document.getElementById('btnExecuteRoleChange');
    if (btn) {
        btn.onclick = async () => {
            const newRole = document.getElementById('modalSelectNewRole').value;
            closeModal();
            if (!newRole || newRole === currentRole) return;
            const res = await api('PUT', `/auth/users/${MaTK}/role`, { VaiTro: newRole });
            if (res && res.ok) {
                toast('Cập nhật vai trò thành công');
                loadAdminUsers();
            } else {
                toast(res ? res.message : 'Cập nhật vai trò thất bại', true);
            }
        };
    }
}

function formatStatusBadge(status) {
    const s = status || 'Cho duyet';
    let cls = 'cho-duyet';
    let text = statusBadgeText(s);

    if (s === 'Da duyet') cls = 'da-duyet';
    else if (s === 'Tu choi') cls = 'tu-choi';
    else if (s === 'Dang thuc hien') cls = 'dang-thuc-hien';
    else if (s === 'Hoan thanh') cls = 'hoan-thanh';
    else if (s === 'Da huy') cls = 'da-huy';

    return `<span class="badge-status ${cls}">${text}</span>`;
}

function statusBadgeText(s) {
    switch (s) {
        case 'Cho duyet': return 'Chờ duyệt';
        case 'Da duyet': return 'Đã duyệt đăng ký';
        case 'Tu choi': return 'Từ chối';
        case 'Dang thuc hien': return 'Đang thực hiện';
        case 'Hoan thanh': return 'Hoàn thành';
        case 'Da huy': return 'Đã hủy';
        default: return s || 'Chờ duyệt';
    }
}

function roleLabel(r) {
    switch (r) {
        case 'admin': return 'Quản trị viên';
        case 'giangvien': return 'Giảng viên';
        case 'sinhvien': return 'Sinh viên';
        default: return r || 'Thành viên';
    }
}

function formatDateVN(dateStr) {
    if (!dateStr) return '';
    try {
        const d = new Date(dateStr);
        if (Number.isNaN(d.getTime())) return dateStr;
        return d.toLocaleDateString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' });
    } catch {
        return dateStr;
    }
}

// Khởi chạy khi tài liệu nạp xong
document.addEventListener('DOMContentLoaded', () => {
    updateAuthUI();
    const token = getToken();
    if (token) {
        showSection('dashboard');
    }
});
