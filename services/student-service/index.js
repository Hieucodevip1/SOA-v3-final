// STUDENT SERVICE – quản lý sinh viên (database riêng: soa_student)
const express = require('express');
const { createService, HttpError } = require('../../shared/service-base');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

createService({
    name: 'student-service',
    port: 3002,
    db: {
        name: process.env.DB_NAME_STUDENT || 'soa_student',
        schema: [
            `CREATE TABLE IF NOT EXISTS SINHVIEN (
                MaSV VARCHAR(20) NOT NULL PRIMARY KEY,
                HoTen VARCHAR(100) NOT NULL,
                Email VARCHAR(100) NULL,
                Lop VARCHAR(50) NULL,
                Nganh VARCHAR(100) DEFAULT 'Công nghệ phần mềm',
                GPA DECIMAL(3,2) DEFAULT 3.00,
                MonDaHoc TEXT NULL,
                SoTCTichLuy INT DEFAULT 110
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ]
    },
    // Lắng nghe sự kiện từ Event Bus: khi sinh viên tự đăng ký tài khoản ở Auth Service
    events: {
        'user.registered': async ({ TenDangNhap, HoTen, Email, VaiTro, MaSV, Lop, Nganh }, ev, { pool, log }) => {
            if (VaiTro !== 'sinhvien') return;
            const studentCode = (MaSV || TenDangNhap || '').trim().toUpperCase();
            if (!studentCode) return;
            const [exist] = await pool.query('SELECT MaSV FROM SINHVIEN WHERE MaSV = ?', [studentCode]);
            if (!exist[0]) {
                await pool.query(
                    'INSERT INTO SINHVIEN (MaSV, HoTen, Email, Lop, Nganh, GPA, MonDaHoc, SoTCTichLuy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [
                        studentCode,
                        HoTen || 'Sinh viên mới',
                        Email || null,
                        Lop || 'DHKTPM20',
                        Nganh || 'Công nghệ phần mềm',
                        3.00,
                        'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm, Lập trình Web',
                        110
                    ]
                );
                log(`[user.registered] Tự động tạo hồ sơ sinh viên: ${studentCode} (${HoTen})`);
            } else {
                await pool.query(
                    'UPDATE SINHVIEN SET HoTen = COALESCE(?, HoTen), Email = COALESCE(?, Email), Lop = COALESCE(?, Lop), Nganh = COALESCE(?, Nganh) WHERE MaSV = ?',
                    [HoTen || null, Email || null, Lop || null, Nganh || null, studentCode]
                );
            }
        }
    },
    openapi: {
        description: 'Dịch vụ quản lý thông tin sinh viên, GPA, môn đã học',
        routes: [
            { method: 'GET', path: '/api/students', summary: 'Danh sách sinh viên (lọc theo ?ids=SV001,SV002 hoặc ?nganh=...)', query: ['ids', 'nganh'] },
            { method: 'GET', path: '/api/students/:id', summary: 'Chi tiết sinh viên' },
            { method: 'POST', path: '/api/students', summary: 'Thêm sinh viên', roles: ['admin', 'giangvien'], body: ['MaSV', 'HoTen', 'Email', 'Lop', 'Nganh', 'GPA', 'MonDaHoc', 'SoTCTichLuy'], required: ['MaSV', 'HoTen'] },
            { method: 'PUT', path: '/api/students/:id', summary: 'Cập nhật sinh viên', roles: ['admin', 'giangvien'], body: ['HoTen', 'Email', 'Lop', 'Nganh', 'GPA', 'MonDaHoc', 'SoTCTichLuy'], required: ['HoTen'] },
            { method: 'DELETE', path: '/api/students/:id', summary: 'Xóa sinh viên (phát sự kiện student.deleted)', roles: ['admin'] }
        ]
    },
    async init(app, { pool, log, publish }) {
        const router = express.Router();

        // Đảm bảo các cột mới tồn tại
        try {
            await pool.query("ALTER TABLE SINHVIEN ADD COLUMN IF NOT EXISTS Nganh VARCHAR(100) DEFAULT 'Công nghệ phần mềm'");
            await pool.query("ALTER TABLE SINHVIEN ADD COLUMN IF NOT EXISTS GPA DECIMAL(3,2) DEFAULT 3.00");
            await pool.query("ALTER TABLE SINHVIEN ADD COLUMN IF NOT EXISTS MonDaHoc TEXT NULL");
            await pool.query("ALTER TABLE SINHVIEN ADD COLUMN IF NOT EXISTS SoTCTichLuy INT DEFAULT 110");
        } catch { /* Bỏ qua nếu đã tồn tại */ }

        // Khởi tạo dữ liệu mẫu nếu chưa có
        const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM SINHVIEN');
        if (count === 0) {
            const initialStudents = [
                ['SV001', 'Vũ Đức Hiếu', 'hieuvd@qnu.edu.vn', 'DHKTPM20', 'Công nghệ phần mềm', 3.45, 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm, Lập trình Web', 122],
                ['SV002', 'Lê Minh Châu', 'chaulm@qnu.edu.vn', 'DHKTPM20', 'Công nghệ phần mềm', 3.10, 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm', 112],
                ['SV003', 'Trần Quốc Đạt', 'dattq@qnu.edu.vn', 'DHHTTT20', 'Hệ thống thông tin', 2.85, 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Phân tích thiết kế HTTT', 105],
                ['SV004', 'Nguyễn Thị Bích', 'bichnt@qnu.edu.vn', 'DHKTPM21', 'Công nghệ phần mềm', 2.20, 'Giải tích, Lập trình căn bản, Cơ sở dữ liệu', 65],
                ['SV005', 'Phạm Văn Nam', 'nampv@qnu.edu.vn', 'DHKHMT20', 'Khoa học máy tính', 3.35, 'Giải tích, Đại số tuyến tính, Cơ sở dữ liệu, Cấu trúc dữ liệu & giải thuật, Trí tuệ nhân tạo', 118]
            ];
            for (const s of initialStudents) {
                await pool.query(
                    'INSERT IGNORE INTO SINHVIEN (MaSV, HoTen, Email, Lop, Nganh, GPA, MonDaHoc, SoTCTichLuy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    s
                );
            }
            log('Đã nạp 5 sinh viên mẫu (SV001 -> SV005)');
        }

        router.get('/', async (req, res) => {
            let rows;
            const { ids, nganh } = req.query;
            if (ids !== undefined) {
                const idList = String(ids).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500);
                rows = idList.length ? (await pool.query('SELECT * FROM SINHVIEN WHERE MaSV IN (?)', [idList]))[0] : [];
            } else if (nganh) {
                [rows] = await pool.query('SELECT * FROM SINHVIEN WHERE Nganh = ? ORDER BY MaSV', [nganh]);
            } else {
                [rows] = await pool.query('SELECT * FROM SINHVIEN ORDER BY MaSV');
            }
            res.json({ success: true, data: rows });
        });

        router.get('/:id', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM SINHVIEN WHERE MaSV = ?', [req.params.id]);
            if (!rows[0]) throw new HttpError(404, 'Không tìm thấy sinh viên');
            res.json({ success: true, data: rows[0] });
        });

        router.post('/', async (req, res) => {
            const { MaSV, HoTen, Email, Lop, Nganh, GPA, MonDaHoc, SoTCTichLuy } = req.body || {};
            if (!MaSV || !HoTen) throw new HttpError(400, 'Mã sinh viên và họ tên là bắt buộc');
            if (Email && !EMAIL_RE.test(Email)) throw new HttpError(400, 'Email không hợp lệ');
            const gpaVal = GPA !== undefined && GPA !== '' ? Number(GPA) : 3.00;
            const tcVal = SoTCTichLuy !== undefined && SoTCTichLuy !== '' ? Number(SoTCTichLuy) : 110;

            try {
                await pool.query(
                    'INSERT INTO SINHVIEN (MaSV, HoTen, Email, Lop, Nganh, GPA, MonDaHoc, SoTCTichLuy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [MaSV, HoTen, Email || null, Lop || null, Nganh || 'Công nghệ phần mềm', gpaVal, MonDaHoc || null, tcVal]
                );
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Mã sinh viên đã tồn tại');
                throw e;
            }
            publish('student.created', {
                MaSV: String(MaSV).trim().toUpperCase(),
                HoTen,
                Email: Email || null,
                Lop: Lop || null,
                Nganh: Nganh || 'Công nghệ phần mềm'
            });
            res.status(201).json({ success: true, message: 'Thêm sinh viên thành công' });
        });

        router.put('/:id', async (req, res) => {
            const { HoTen, Email, Lop, Nganh, GPA, MonDaHoc, SoTCTichLuy } = req.body || {};
            if (!HoTen) throw new HttpError(400, 'Họ tên là bắt buộc');
            if (Email && !EMAIL_RE.test(Email)) throw new HttpError(400, 'Email không hợp lệ');

            const gpaVal = GPA !== undefined && GPA !== '' ? Number(GPA) : 3.00;
            const tcVal = SoTCTichLuy !== undefined && SoTCTichLuy !== '' ? Number(SoTCTichLuy) : 110;

            const [r] = await pool.query(
                'UPDATE SINHVIEN SET HoTen = ?, Email = ?, Lop = ?, Nganh = ?, GPA = ?, MonDaHoc = ?, SoTCTichLuy = ? WHERE MaSV = ?',
                [HoTen, Email || null, Lop || null, Nganh || 'Công nghệ phần mềm', gpaVal, MonDaHoc || null, tcVal, req.params.id]
            );
            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy sinh viên');
            res.json({ success: true, message: 'Cập nhật sinh viên thành công' });
        });

        router.delete('/:id', async (req, res) => {
            const [r] = await pool.query('DELETE FROM SINHVIEN WHERE MaSV = ?', [req.params.id]);
            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy sinh viên');
            // Báo cho các dịch vụ khác biết qua Event Bus để hủy đăng ký liên quan
            publish('student.deleted', { MaSV: req.params.id });
            res.json({ success: true, message: 'Xóa sinh viên thành công' });
        });

        app.use('/api/students', router);
    }
});
