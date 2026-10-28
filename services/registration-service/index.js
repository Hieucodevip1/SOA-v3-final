// REGISTRATION SERVICE – đăng ký đề tài & lớp học phần tốt nghiệp (database riêng: soa_registration)
// Dịch vụ "điều phối": không JOIN sang dữ liệu của dịch vụ khác mà GỌI student-service / topic-service qua HTTP.
const express = require('express');
const { createService, HttpError } = require('../../shared/service-base');

const CANCELLED = 'Da huy';
const REJECTED = 'Tu choi';
const APPROVED = 'Da duyet';
const PENDING = 'Cho duyet';
const IN_PROGRESS = 'Dang thuc hien';
const COMPLETED = 'Hoan thanh';

// Trạng thái "không còn hiệu lực": SV được đăng ký đề tài khác
const INACTIVE = [CANCELLED, REJECTED];
// Các trạng thái hợp lệ của một đăng ký
const STATUSES = [PENDING, APPROVED, REJECTED, IN_PROGRESS, COMPLETED, CANCELLED];

function normalizeStatus(v, fallback) {
    if (v === undefined || v === null || v === '') return fallback;
    if (!STATUSES.includes(v)) throw new HttpError(400, `Trạng thái phải là một trong: ${STATUSES.join(', ')}`);
    return v;
}

const today = () => {
    const d = new Date();
    const p = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};

function normalizeScore(v) {
    if (v === undefined || v === null || v === '') return null;
    const n = Number(v);
    if (Number.isNaN(n) || n < 0 || n > 10) throw new HttpError(400, 'Điểm phải nằm trong khoảng từ 0 đến 10');
    return n;
}

createService({
    name: 'registration-service',
    port: 3004,
    db: {
        name: process.env.DB_NAME_REGISTRATION || 'soa_registration',
        schema: [
            `CREATE TABLE IF NOT EXISTS DANGKY (
                MaDK INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                MaSV VARCHAR(20) NOT NULL,
                MaDT VARCHAR(20) NOT NULL,
                NgayDangKy DATE NULL,
                TrangThai VARCHAR(50) DEFAULT 'Cho duyet',
                Diem DECIMAL(4,2) NULL,
                NhanXet TEXT NULL,
                LyDoTuChoi VARCHAR(255) NULL,
                KEY idx_sv (MaSV),
                KEY idx_dt (MaDT)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ]
    },
    openapi: {
        description: 'Dịch vụ đăng ký đề tài. Gọi student-service và topic-service để xác minh điều kiện; phát sự kiện registration.*',
        routes: [
            { method: 'GET', path: '/api/registrations', summary: 'Danh sách đăng ký (kèm họ tên SV, tên đề tài lấy từ dịch vụ khác).' },
            { method: 'GET', path: '/api/registrations/counts', summary: 'Số lượng sinh viên đã đăng ký theo từng đề tài' },
            { method: 'GET', path: '/api/registrations/:id', summary: 'Chi tiết đăng ký' },
            { method: 'POST', path: '/api/registrations', summary: 'Đăng ký đề tài (kiểm tra SV/đề tài, môn bắt buộc khóa trước, GPA tối thiểu, giới hạn số lượng SV)', body: ['MaSV', 'MaDT', 'NgayDangKy', 'TrangThai', 'Diem'], required: ['MaDT'], types: { Diem: 'number' }, enums: { TrangThai: STATUSES } },
            { method: 'PUT', path: '/api/registrations/:id', summary: 'Cập nhật đăng ký / trạng thái / điểm / nhận xét', roles: ['admin', 'giangvien'] },
            { method: 'PUT', path: '/api/registrations/:id/approve', summary: 'Duyệt đăng ký (chuyển sang Đã duyệt đăng ký)', roles: ['admin', 'giangvien'] },
            { method: 'PUT', path: '/api/registrations/:id/reject', summary: 'Từ chối đăng ký', roles: ['admin', 'giangvien'], body: ['LyDoTuChoi'] },
            { method: 'PUT', path: '/api/registrations/:id/grade', summary: 'Chấm điểm kết quả học tập đồ án', roles: ['admin', 'giangvien'], body: ['Diem', 'NhanXet'], required: ['Diem'] },
            { method: 'DELETE', path: '/api/registrations/:id', summary: 'Hủy hoặc xóa đăng ký' }
        ]
    },

    // Phản ứng bất đồng bộ với sự kiện từ dịch vụ khác (thay cho khóa ngoại/cascade giữa các database)
    events: {
        'student.deleted': async ({ MaSV }, ev, { pool, log }) => {
            const [r] = await pool.query('UPDATE DANGKY SET TrangThai = ? WHERE MaSV = ? AND (TrangThai IS NULL OR TrangThai <> ?)', [CANCELLED, MaSV, CANCELLED]);
            log(`student.deleted ${MaSV}: hủy ${r.affectedRows} đăng ký`);
        },
        'topic.deleted': async ({ MaDT }, ev, { pool, log }) => {
            const [r] = await pool.query('UPDATE DANGKY SET TrangThai = ? WHERE MaDT = ? AND (TrangThai IS NULL OR TrangThai <> ?)', [CANCELLED, MaDT, CANCELLED]);
            log(`topic.deleted ${MaDT}: hủy ${r.affectedRows} đăng ký`);
        }
    },

    async init(app, { pool, publish, call, log }) {
        const router = express.Router();

        // Đảm bảo các cột mới tồn tại
        try {
            await pool.query("ALTER TABLE DANGKY ADD COLUMN IF NOT EXISTS NhanXet TEXT NULL");
            await pool.query("ALTER TABLE DANGKY ADD COLUMN IF NOT EXISTS LyDoTuChoi VARCHAR(255) NULL");
        } catch { /* Bỏ qua nếu đã có */ }

        // Khởi tạo đăng ký mẫu nếu bảng rỗng
        const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM DANGKY');
        if (count === 0) {
            await pool.query(
                `INSERT INTO DANGKY (MaSV, MaDT, NgayDangKy, TrangThai, Diem, NhanXet, LyDoTuChoi) VALUES
                 ('SV001', 'DT001', '2026-10-15', 'Da duyet', 9.50, 'Đồ án hoàn thành xuất sắc, báo cáo tự tin.', NULL),
                 ('SV002', 'DT002', '2026-10-18', 'Da duyet', NULL, 'Đạt điều kiện tiên quyết và GPA.', NULL),
                 ('SV003', 'DT006', '2026-10-22', 'Cho duyet', NULL, NULL, NULL),
                 ('SV004', 'DT003', '2026-10-23', 'Tu choi', NULL, NULL, 'Chưa hoàn thành môn tiên quyết Lập trình thiết bị di động'),
                 ('SV005', 'DT013', '2026-10-20', 'Da duyet', 8.50, 'Thuật toán di truyền tối ưu tốt.', NULL)`
            );
            log('Đã nạp 5 đăng ký mẫu chuẩn (SV001 -> SV005)');
        }

        // ----- Gọi dịch vụ khác -----
        async function fetchMany(service, basePath, ids, key) {
            const map = new Map();
            if (!ids.length) return map;
            for (let i = 0; i < ids.length; i += 100) {
                const chunk = ids.slice(i, i + 100);
                const r = await call(service, { path: `${basePath}?ids=${encodeURIComponent(chunk.join(','))}` });
                if (r.status !== 200) throw new Error('HTTP ' + r.status);
                for (const x of r.json().data) map.set(x[key], x);
            }
            return map;
        }

        // Làm giàu dữ liệu; nếu dịch vụ kia sập thì vẫn trả về danh sách (degraded) thay vì lỗi
        async function enrich(rows) {
            const sIds = [...new Set(rows.map((r) => r.MaSV))];
            const tIds = [...new Set(rows.map((r) => r.MaDT))];
            const [s, t] = await Promise.allSettled([
                fetchMany('student-service', '/api/students', sIds, 'MaSV'),
                fetchMany('topic-service', '/api/topics', tIds, 'MaDT')
            ]);
            const degraded = s.status === 'rejected' || t.status === 'rejected';
            const data = rows.map((r) => {
                const sv = s.status === 'fulfilled' ? s.value.get(r.MaSV) : null;
                const dt = t.status === 'fulfilled' ? t.value.get(r.MaDT) : null;
                return {
                    ...r,
                    HoTen: s.status === 'fulfilled' ? (sv ? sv.HoTen : '(sinh viên không tồn tại)') : '(student-service không khả dụng)',
                    Lop: sv ? sv.Lop : '',
                    NganhSV: sv ? sv.Nganh : '',
                    GPA: sv ? sv.GPA : null,
                    TenDT: t.status === 'fulfilled' ? (dt ? dt.TenDT : '(đề tài không tồn tại)') : '(topic-service không khả dụng)',
                    GiangVienHuongDan: dt ? dt.GiangVienHuongDan : '',
                    MaGV: dt ? dt.MaGV : '',
                    NganhDT: dt ? dt.Nganh : '',
                    SoTinChi: dt ? dt.SoTinChi : 10,
                    MonBatBuoc: dt ? dt.MonBatBuoc : '',
                    GioiHanSV: dt ? dt.GioiHanSV : 5,
                    DiemGPAToiThieu: dt ? dt.DiemGPAToiThieu : 2.50
                };
            });
            return { data, degraded };
        }

        async function ensureExists(service, basePath, id, label) {
            let r;
            try {
                r = await call(service, { path: `${basePath}/${encodeURIComponent(id)}` });
            } catch {
                throw new HttpError(503, `Dịch vụ ${label} tạm thời không khả dụng, chưa thể xác minh "${id}". Vui lòng thử lại sau`);
            }
            if (r.status === 404) throw new HttpError(400, `${label} "${id}" không tồn tại`);
            if (r.status !== 200) throw new HttpError(502, `Dịch vụ ${label} trả về lỗi ${r.status}`);
            return r.json().data;
        }

        // Quy tắc: mỗi sinh viên chỉ có 01 đăng ký còn hiệu lực (chưa hủy / chưa bị từ chối)
        async function assertNoActive(MaSV, excludeId = 0) {
            const [dup] = await pool.query(
                'SELECT MaDK, MaDT, TrangThai FROM DANGKY WHERE MaSV = ? AND MaDK <> ? AND (TrangThai IS NULL OR TrangThai NOT IN (?)) LIMIT 1',
                [MaSV, excludeId, INACTIVE]
            );
            if (dup[0]) {
                throw new HttpError(409, `Sinh viên ${MaSV} hiện đã có đăng ký đề tài ${dup[0].MaDT} (trạng thái: "${dup[0].TrangThai}"). Mỗi sinh viên chỉ được đăng ký 01 đề tài còn hiệu lực.`);
            }
        }

        const isStudent = (req) => !!req.user && req.user.VaiTro === 'sinhvien';
        const isTeacher = (req) => !!req.user && req.user.VaiTro === 'giangvien';
        const isAdmin = (req) => !!req.user && req.user.VaiTro === 'admin';

        // Lấy thống kê số lượng sinh viên đã đăng ký theo từng đề tài
        router.get('/counts', async (req, res) => {
            const [rows] = await pool.query(
                "SELECT MaDT, COUNT(*) AS count FROM DANGKY WHERE TrangThai NOT IN ('Da huy', 'Tu choi') GROUP BY MaDT"
            );
            const counts = {};
            for (const r of rows) counts[r.MaDT] = r.count;
            res.json({ success: true, data: counts });
        });

        // ----- Endpoints -----
        router.get('/', async (req, res) => {
            let query = 'SELECT * FROM DANGKY';
            const params = [];

            if (isStudent(req)) {
                const studentId = req.user.MaSV || req.user.TenDangNhap;
                query += ' WHERE MaSV = ?';
                params.push(studentId);
            }
            query += ' ORDER BY MaDK DESC';

            const [rows] = await pool.query(query, params);
            const { data, degraded } = await enrich(rows);
            if (degraded) res.set('X-Degraded', 'true');
            res.json({ success: true, data, degraded });
        });

        router.get('/:id', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM DANGKY WHERE MaDK = ?', [req.params.id]);
            const studentId = req.user ? (req.user.MaSV || req.user.TenDangNhap) : null;
            if (!rows[0] || (isStudent(req) && rows[0].MaSV !== studentId)) {
                throw new HttpError(404, 'Không tìm thấy đăng ký');
            }
            const { data, degraded } = await enrich(rows);
            if (degraded) res.set('X-Degraded', 'true');
            res.json({ success: true, data: data[0], degraded });
        });

        router.post('/', async (req, res) => {
            const b = { ...(req.body || {}) };
            const studentId = req.user ? (req.user.MaSV || req.user.TenDangNhap) : null;

            if (isStudent(req)) {
                if (b.MaSV && b.MaSV !== studentId) {
                    throw new HttpError(403, 'Sinh viên chỉ được đăng ký đề tài cho chính mình');
                }
                b.MaSV = studentId;
                b.TrangThai = PENDING; // Sinh viên đăng ký luôn bắt đầu ở trạng thái "Chờ duyệt"
                b.Diem = null;
                b.NhanXet = null;
            }

            if (!b.MaSV || !b.MaDT) throw new HttpError(400, 'Mã sinh viên và Mã đề tài là bắt buộc');
            const status = normalizeStatus(b.TrangThai, PENDING);
            const Diem = normalizeScore(b.Diem);

            // Xác minh tồn tại ở hai dịch vụ độc lập
            const [student, topic] = await Promise.all([
                ensureExists('student-service', '/api/students', b.MaSV, 'Sinh viên'),
                ensureExists('topic-service', '/api/topics', b.MaDT, 'Đề tài')
            ]);

            // 1. Kiểm tra trạng thái mở của đề tài
            if (topic.TrangThaiMo === 0) {
                throw new HttpError(400, `Đề tài / lớp học phần "${topic.TenDT}" hiện đã khóa đăng ký`);
            }

            // 2. Kiểm tra giới hạn số lượng sinh viên đăng ký (Max capacity)
            const [[{ currentCount }]] = await pool.query(
                "SELECT COUNT(*) AS currentCount FROM DANGKY WHERE MaDT = ? AND TrangThai NOT IN ('Da huy', 'Tu choi')",
                [b.MaDT]
            );
            const limit = topic.GioiHanSV !== undefined ? Number(topic.GioiHanSV) : 5;
            if (currentCount >= limit) {
                throw new HttpError(400, `Lớp học phần/đề tài "${topic.TenDT}" đã đủ số lượng đăng ký tối đa (${limit} sinh viên). Vui lòng chọn đề tài khác.`);
            }

            // 3. Kiểm tra điều kiện điểm GPA tối thiểu
            const minGpa = topic.DiemGPAToiThieu !== undefined && topic.DiemGPAToiThieu !== null ? Number(topic.DiemGPAToiThieu) : 0;
            const svGpa = student.GPA !== undefined && student.GPA !== null ? Number(student.GPA) : 0;
            if (minGpa > 0 && svGpa < minGpa) {
                throw new HttpError(400, `Điểm GPA của bạn (${svGpa.toFixed(2)}) chưa đạt mức tối thiểu (${minGpa.toFixed(2)}) để đăng ký học phần này.`);
            }

            // 4. Kiểm tra điều kiện môn học bắt buộc khóa trước (Prerequisites)
            if (topic.MonBatBuoc && topic.MonBatBuoc.trim()) {
                const requiredSubjects = topic.MonBatBuoc.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean);
                if (requiredSubjects.length > 0) {
                    const passedSubjects = (student.MonDaHoc || '').toLowerCase();
                    const missing = requiredSubjects.filter((reqSub) => !passedSubjects.includes(reqSub));
                    if (missing.length > 0) {
                        throw new HttpError(400, `Bạn chưa hoàn thành môn học bắt buộc khóa trước: "${missing.join(', ')}". Vui lòng kiểm tra lại chương trình đào tạo.`);
                    }
                }
            }

            // 5. Kiểm tra quy tắc 1 SV - 1 đề tài còn hiệu lực
            if (!INACTIVE.includes(status)) await assertNoActive(b.MaSV);

            const [r] = await pool.query(
                'INSERT INTO DANGKY (MaSV, MaDT, NgayDangKy, TrangThai, Diem, NhanXet) VALUES (?, ?, ?, ?, ?, ?)',
                [b.MaSV, b.MaDT, b.NgayDangKy || today(), status, Diem, b.NhanXet || null]
            );

            publish('registration.created', {
                MaDK: r.insertId,
                MaSV: b.MaSV,
                HoTen: student.HoTen,
                MaDT: b.MaDT,
                TenDT: topic.TenDT,
                TrangThai: status,
                GiangVienHuongDan: topic.GiangVienHuongDan,
                MaGV: topic.MaGV
            });

            res.status(201).json({
                success: true,
                message: 'Đăng ký đề tài thành công, vui lòng chờ giảng viên phê duyệt',
                data: { MaDK: r.insertId, TrangThai: status }
            });
        });

        // Giảng viên / Admin DUYỆT đăng ký
        router.put('/:id/approve', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM DANGKY WHERE MaDK = ?', [req.params.id]);
            const old = rows[0];
            if (!old) throw new HttpError(404, 'Không tìm thấy đăng ký');

            await pool.query(
                'UPDATE DANGKY SET TrangThai = ?, LyDoTuChoi = NULL WHERE MaDK = ?',
                [APPROVED, old.MaDK]
            );

            publish('registration.status_changed', {
                MaDK: old.MaDK,
                MaSV: old.MaSV,
                MaDT: old.MaDT,
                from: old.TrangThai,
                to: APPROVED
            });

            res.json({ success: true, message: 'Đã duyệt đăng ký thành công' });
        });

        // Giảng viên / Admin TỪ CHỐI đăng ký
        router.put('/:id/reject', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM DANGKY WHERE MaDK = ?', [req.params.id]);
            const old = rows[0];
            if (!old) throw new HttpError(404, 'Không tìm thấy đăng ký');

            const { LyDoTuChoi } = req.body || {};
            await pool.query(
                'UPDATE DANGKY SET TrangThai = ?, LyDoTuChoi = ? WHERE MaDK = ?',
                [REJECTED, LyDoTuChoi || 'Không đạt yêu cầu chuyên môn', old.MaDK]
            );

            publish('registration.status_changed', {
                MaDK: old.MaDK,
                MaSV: old.MaSV,
                MaDT: old.MaDT,
                from: old.TrangThai,
                to: REJECTED,
                LyDoTuChoi: LyDoTuChoi || 'Không đạt yêu cầu chuyên môn'
            });

            res.json({ success: true, message: 'Đã từ chối đăng ký đề tài' });
        });

        // Giảng viên / Admin CHẤM ĐIỂM
        router.put('/:id/grade', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM DANGKY WHERE MaDK = ?', [req.params.id]);
            const old = rows[0];
            if (!old) throw new HttpError(404, 'Không tìm thấy đăng ký');

            const { Diem, NhanXet } = req.body || {};
            const score = normalizeScore(Diem);
            if (score === null) throw new HttpError(400, 'Điểm số là bắt buộc (từ 0.0 đến 10.0)');

            // Khi chấm điểm có thể chuyển sang trạng thái Hoàn thành
            const newStatus = score >= 4.0 ? COMPLETED : old.TrangThai;

            await pool.query(
                'UPDATE DANGKY SET Diem = ?, NhanXet = ?, TrangThai = ? WHERE MaDK = ?',
                [score, NhanXet || old.NhanXet, newStatus, old.MaDK]
            );

            publish('registration.graded', {
                MaDK: old.MaDK,
                MaSV: old.MaSV,
                MaDT: old.MaDT,
                Diem: score,
                NhanXet: NhanXet || ''
            });

            res.json({ success: true, message: 'Chấm điểm kết quả học tập thành công' });
        });

        // Cập nhật đăng ký chung
        router.put('/:id', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM DANGKY WHERE MaDK = ?', [req.params.id]);
            const old = rows[0];
            if (!old) throw new HttpError(404, 'Không tìm thấy đăng ký');
            const b = req.body || {};

            const MaSV = b.MaSV || old.MaSV;
            const MaDT = b.MaDT || old.MaDT;
            const Diem = 'Diem' in b ? normalizeScore(b.Diem) : (old.Diem === null ? null : Number(old.Diem));
            const TrangThai = (b.TrangThai !== undefined && b.TrangThai !== '' && b.TrangThai !== old.TrangThai)
                ? normalizeStatus(b.TrangThai) : old.TrangThai;
            const NgayDangKy = b.NgayDangKy || old.NgayDangKy;
            const NhanXet = b.NhanXet !== undefined ? b.NhanXet : old.NhanXet;
            const LyDoTuChoi = b.LyDoTuChoi !== undefined ? b.LyDoTuChoi : old.LyDoTuChoi;

            if (MaSV !== old.MaSV) await ensureExists('student-service', '/api/students', MaSV, 'Sinh viên');
            if (MaDT !== old.MaDT) await ensureExists('topic-service', '/api/topics', MaDT, 'Đề tài');

            const wasInactive = INACTIVE.includes(old.TrangThai);
            if (!INACTIVE.includes(TrangThai) && (MaSV !== old.MaSV || wasInactive)) {
                await assertNoActive(MaSV, old.MaDK);
            }

            await pool.query(
                'UPDATE DANGKY SET MaSV = ?, MaDT = ?, NgayDangKy = ?, TrangThai = ?, Diem = ?, NhanXet = ?, LyDoTuChoi = ? WHERE MaDK = ?',
                [MaSV, MaDT, NgayDangKy, TrangThai, Diem, NhanXet, LyDoTuChoi, old.MaDK]
            );

            if ((old.TrangThai || null) !== (TrangThai || null)) {
                publish('registration.status_changed', { MaDK: old.MaDK, MaSV, MaDT, from: old.TrangThai, to: TrangThai });
            }
            const oldScore = old.Diem === null ? null : Number(old.Diem);
            if (Diem !== null && Diem !== oldScore) {
                publish('registration.graded', { MaDK: old.MaDK, MaSV, MaDT, Diem, NhanXet });
            }
            res.json({ success: true, message: 'Cập nhật đăng ký thành công' });
        });

        // Xóa hoặc hủy đăng ký
        router.delete('/:id', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM DANGKY WHERE MaDK = ?', [req.params.id]);
            const reg = rows[0];
            if (!reg) throw new HttpError(404, 'Không tìm thấy đăng ký');

            if (isStudent(req)) {
                const studentId = req.user.MaSV || req.user.TenDangNhap;
                if (reg.MaSV !== studentId) {
                    throw new HttpError(403, 'Bạn chỉ được hủy đăng ký của chính mình');
                }
                // Nếu sinh viên hủy khi đang chờ duyệt: chuyển sang Da huy
                await pool.query('UPDATE DANGKY SET TrangThai = ? WHERE MaDK = ?', [CANCELLED, req.params.id]);
                publish('registration.status_changed', { MaDK: reg.MaDK, MaSV: reg.MaSV, MaDT: reg.MaDT, from: reg.TrangThai, to: CANCELLED });
                return res.json({ success: true, message: 'Đã hủy đăng ký đề tài thành công' });
            }

            // Giáo viên hoặc Admin xóa hẳn
            const [r] = await pool.query('DELETE FROM DANGKY WHERE MaDK = ?', [req.params.id]);
            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy đăng ký');
            publish('registration.status_changed', { MaDK: reg.MaDK, MaSV: reg.MaSV, MaDT: reg.MaDT, from: reg.TrangThai, to: 'Da huy' });
            res.json({ success: true, message: 'Xóa đăng ký thành công' });
        });

        app.use('/api/registrations', router);
    }
});
