// AUTH SERVICE – tài khoản, đăng nhập, cấp JWT, vai trò: admin, giangvien, sinhvien (database riêng: soa_auth)
const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('../../shared/jwt');
const { jwtSecret } = require('../../shared/env');
const { createService, HttpError, requireRole } = require('../../shared/service-base');

const VALID_ROLES = ['admin', 'giangvien', 'sinhvien'];

createService({
    name: 'auth-service',
    port: 3001,
    db: {
        name: process.env.DB_NAME_AUTH || 'soa_auth',
        schema: [
            `CREATE TABLE IF NOT EXISTS TAIKHOAN (
                MaTK INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                TenDangNhap VARCHAR(50) NOT NULL UNIQUE,
                MatKhau VARCHAR(255) NOT NULL,
                HoTen VARCHAR(100) NOT NULL,
                Email VARCHAR(100) NULL,
                VaiTro VARCHAR(20) NOT NULL DEFAULT 'sinhvien',
                MaSV VARCHAR(20) NULL,
                Lop VARCHAR(50) NULL,
                Nganh VARCHAR(100) NULL DEFAULT 'Công nghệ phần mềm',
                NgayTao TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ]
    },
    // Đăng ký nhận sự kiện từ Event Bus: tự động cấp tài khoản khi Admin thêm sinh viên
    events: {
        'student.created': async ({ MaSV, HoTen, Email, Lop, Nganh }, ev, { pool, log }) => {
            if (!MaSV) return;
            const studentCode = String(MaSV).trim().toUpperCase();
            const [exist] = await pool.query('SELECT MaTK FROM TAIKHOAN WHERE TenDangNhap = ? OR MaSV = ?', [studentCode, studentCode]);
            if (!exist[0]) {
                const defaultHash = await bcrypt.hash('123456', 10);
                await pool.query(
                    'INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, HoTen, Email, VaiTro, MaSV, Lop, Nganh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [studentCode, defaultHash, HoTen || 'Sinh viên', Email || null, 'sinhvien', studentCode, Lop || null, Nganh || 'Công nghệ phần mềm']
                );
                log(`[student.created] Tự động cấp tài khoản đăng nhập cho sinh viên: ${studentCode} (mật khẩu mặc định: 123456)`);
            }
        },
        'student.deleted': async ({ MaSV }, ev, { pool, log }) => {
            if (!MaSV) return;
            const studentCode = String(MaSV).trim().toUpperCase();
            const [r] = await pool.query('DELETE FROM TAIKHOAN WHERE (TenDangNhap = ? OR MaSV = ?) AND VaiTro = ?', [studentCode, studentCode, 'sinhvien']);
            log(`[student.deleted] Đã xóa tài khoản đăng nhập của sinh viên ${studentCode} (${r.affectedRows} bản ghi)`);
        }
    },
    openapi: {
        description: 'Dịch vụ xác thực & phân quyền: admin, giangvien, sinhvien.',
        routes: [
            { method: 'POST', path: '/api/auth/register', summary: 'Đăng ký tài khoản người dùng', body: ['TenDangNhap', 'MatKhau', 'HoTen', 'Email', 'VaiTro', 'MaSV', 'Lop', 'Nganh'], required: ['TenDangNhap', 'MatKhau', 'HoTen'] },
            { method: 'POST', path: '/api/auth/login', summary: 'Đăng nhập, nhận JWT', auth: false, body: ['TenDangNhap', 'MatKhau'], required: ['TenDangNhap', 'MatKhau'] },
            { method: 'GET', path: '/api/auth/me', summary: 'Thông tin người dùng hiện tại' },
            { method: 'POST', path: '/api/auth/verify', summary: 'Kiểm tra token (dịch vụ khác có thể tái sử dụng)', body: ['token'], required: ['token'] },
            { method: 'GET', path: '/api/auth/users', summary: 'Danh sách tài khoản (admin/giangvien)', roles: ['admin', 'giangvien'] },
            { method: 'PUT', path: '/api/auth/users/:id/role', summary: 'Cập nhật vai trò tài khoản', roles: ['admin'] },
            { method: 'DELETE', path: '/api/auth/users/:id', summary: 'Xóa tài khoản', roles: ['admin'] }
        ]
    },
    async init(app, { pool, log, publish }) {
        const router = express.Router();

        // Đảm bảo các cột mới tồn tại trong bảng TAIKHOAN nếu DB đã tạo từ trước
        try {
            await pool.query("ALTER TABLE TAIKHOAN ADD COLUMN IF NOT EXISTS MaSV VARCHAR(20) NULL");
            await pool.query("ALTER TABLE TAIKHOAN ADD COLUMN IF NOT EXISTS Lop VARCHAR(50) NULL");
            await pool.query("ALTER TABLE TAIKHOAN ADD COLUMN IF NOT EXISTS Nganh VARCHAR(100) NULL DEFAULT 'Công nghệ phần mềm'");
        } catch (e) { /* MySQL phiên bản cũ không hỗ trợ IF NOT EXISTS trong ALTER thì bỏ qua nếu đã có */ }

        // Khởi tạo các tài khoản mặc định chuẩn QNU
        const defaultHash = await bcrypt.hash('123456', 10);
        const seedUsers = [
            { u: 'admin', p: defaultHash, n: 'Quản trị viên hệ thống', r: 'admin', e: 'admin@qnu.edu.vn', m: null, d: 'Toàn trường' },
            { u: 'GV001', p: defaultHash, n: 'TS. Nguyễn Thanh Bình', r: 'giangvien', e: 'binhnt@qnu.edu.vn', m: 'GV001', d: 'Công nghệ phần mềm' },
            { u: 'GV002', p: defaultHash, n: 'ThS. Trần Thị Mai', r: 'giangvien', e: 'maitt@qnu.edu.vn', m: 'GV002', d: 'Hệ thống thông tin' },
            { u: 'GV003', p: defaultHash, n: 'TS. Vũ Thị Phương', r: 'giangvien', e: 'phuongvt@qnu.edu.vn', m: 'GV003', d: 'Trí tuệ nhân tạo' },
            { u: 'GV004', p: defaultHash, n: 'PGS.TS. Lê Văn Hoàng', r: 'giangvien', e: 'hoanglv@qnu.edu.vn', m: 'GV004', d: 'Khoa học máy tính' },
            { u: 'GV005', p: defaultHash, n: 'ThS. Phạm Quốc Tuấn', r: 'giangvien', e: 'tuanpq@qnu.edu.vn', m: 'GV005', d: 'Mạng máy tính & ATTT' },
            { u: 'GV006', p: defaultHash, n: 'TS. Vũ Hải Đăng', r: 'giangvien', e: 'dangvh@qnu.edu.vn', m: 'GV006', d: 'Khoa học dữ liệu' },
            { u: 'GV007', p: defaultHash, n: 'TS. Đặng Hoài Phương', r: 'giangvien', e: 'phuongdh@qnu.edu.vn', m: 'GV007', d: 'Kỹ thuật phần mềm' },
            { u: 'GV008', p: defaultHash, n: 'ThS. Hoàng Văn Em', r: 'giangvien', e: 'emhv@qnu.edu.vn', m: 'GV008', d: 'Công nghệ phần mềm' },
            { u: 'GV009', p: defaultHash, n: 'ThS. Lê Minh Triết', r: 'giangvien', e: 'trietlm@qnu.edu.vn', m: 'GV009', d: 'Hệ thống nhúng & IoT' },
            { u: 'GV010', p: defaultHash, n: 'TS. Đỗ Ngọc Hùng', r: 'giangvien', e: 'hungdn@qnu.edu.vn', m: 'GV010', d: 'Kỹ thuật dữ liệu' },
            { u: 'gv01', p: defaultHash, n: 'TS. Nguyễn Thanh Bình', r: 'giangvien', e: 'binhnt@qnu.edu.vn', m: 'GV001', d: 'Công nghệ phần mềm' },
            { u: 'gv02', p: defaultHash, n: 'ThS. Trần Thị Mai', r: 'giangvien', e: 'maitt@qnu.edu.vn', m: 'GV002', d: 'Hệ thống thông tin' },
            { u: 'SV001', p: defaultHash, n: 'Vũ Đức Hiếu', r: 'sinhvien', e: 'hieuvd@qnu.edu.vn', m: 'SV001', d: 'Công nghệ phần mềm' },
            { u: 'SV002', p: defaultHash, n: 'Lê Minh Châu', r: 'sinhvien', e: 'chaulm@qnu.edu.vn', m: 'SV002', d: 'Công nghệ phần mềm' },
            { u: 'SV003', p: defaultHash, n: 'Trần Quốc Đạt', r: 'sinhvien', e: 'dattq@qnu.edu.vn', m: 'SV003', d: 'Hệ thống thông tin' }
        ];

        for (const su of seedUsers) {
            const [exist] = await pool.query('SELECT MaTK FROM TAIKHOAN WHERE TenDangNhap = ?', [su.u]);
            if (!exist[0]) {
                await pool.query(
                    'INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, HoTen, Email, VaiTro, MaSV, Nganh) VALUES (?, ?, ?, ?, ?, ?, ?)',
                    [su.u, su.p, su.n, su.e, su.r, su.m, su.d]
                );
            } else {
                // Đảm bảo admin có đúng vai trò admin
                if (su.u === 'admin') {
                    await pool.query("UPDATE TAIKHOAN SET VaiTro = 'admin', HoTen = ? WHERE TenDangNhap = 'admin'", [su.n]);
                }
            }
        }
        log('Tài khoản mặc định (admin, GV001 - GV010, SV001 - SV003 / 123456) sẵn sàng');

        router.post('/register', async (req, res) => {
            const { TenDangNhap, MatKhau, HoTen, Email, VaiTro, MaSV, Lop, Nganh } = req.body || {};
            const rawUser = (TenDangNhap || MaSV || '').trim();
            if (!rawUser || !MatKhau || !HoTen) throw new HttpError(400, 'Tên đăng nhập / Mã sinh viên, mật khẩu và họ tên là bắt buộc');
            if (String(MatKhau).length < 6) throw new HttpError(400, 'Mật khẩu phải có ít nhất 6 ký tự');

            // Quyền phân vai trò: nếu có người dùng đăng nhập là admin thì được cấp quyền bất kỳ,
            // còn lại mặc định là 'sinhvien'
            let assignedRole = 'sinhvien';
            if (req.user && req.user.VaiTro === 'admin' && VaiTro && VALID_ROLES.includes(VaiTro)) {
                assignedRole = VaiTro;
            } else if (VaiTro && VALID_ROLES.includes(VaiTro)) {
                assignedRole = VaiTro;
            }

            const studentCode = (assignedRole === 'sinhvien') ? (MaSV ? String(MaSV).trim().toUpperCase() : rawUser) : null;
            const finalUsername = rawUser;
            const hash = await bcrypt.hash(String(MatKhau), 10);

            // Kiểm tra xem tài khoản đã tồn tại hay chưa
            const [exist] = await pool.query(
                'SELECT MaTK, VaiTro FROM TAIKHOAN WHERE TenDangNhap = ? OR (MaSV IS NOT NULL AND MaSV = ?)',
                [finalUsername, studentCode]
            );

            if (exist[0]) {
                // Nếu tài khoản đã tồn tại (ví dụ do admin thêm trước với pass mặc định 123456), cập nhật mật khẩu mới của sinh viên
                await pool.query(
                    'UPDATE TAIKHOAN SET MatKhau = ?, HoTen = ?, Email = ?, Lop = ?, Nganh = ? WHERE MaTK = ?',
                    [hash, HoTen, Email || null, Lop || null, Nganh || 'Công nghệ phần mềm', exist[0].MaTK]
                );
            } else {
                await pool.query(
                    'INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, HoTen, Email, VaiTro, MaSV, Lop, Nganh) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
                    [finalUsername, hash, HoTen, Email || null, assignedRole, studentCode, Lop || null, Nganh || 'Công nghệ phần mềm']
                );
            }

            publish('user.registered', {
                TenDangNhap: finalUsername,
                HoTen,
                Email: Email || null,
                VaiTro: assignedRole,
                MaSV: studentCode,
                Lop: Lop || null,
                Nganh: Nganh || 'Công nghệ phần mềm'
            });

            res.status(201).json({ success: true, message: 'Đăng ký tài khoản thành công! Bạn có thể đăng nhập ngay.' });
        });

        router.post('/login', async (req, res) => {
            const { TenDangNhap, MatKhau } = req.body || {};
            if (!TenDangNhap || !MatKhau) throw new HttpError(400, 'Tên đăng nhập và mật khẩu là bắt buộc');
            const [rows] = await pool.query('SELECT * FROM TAIKHOAN WHERE TenDangNhap = ?', [TenDangNhap]);
            const user = rows[0];
            if (!user || !(await bcrypt.compare(String(MatKhau), user.MatKhau))) {
                throw new HttpError(401, 'Tên đăng nhập hoặc mật khẩu không đúng');
            }
            const token = jwt.sign({
                MaTK: user.MaTK,
                TenDangNhap: user.TenDangNhap,
                HoTen: user.HoTen,
                VaiTro: user.VaiTro,
                MaSV: user.MaSV || (user.VaiTro === 'sinhvien' ? user.TenDangNhap : null),
                Nganh: user.Nganh || 'Công nghệ phần mềm'
            }, jwtSecret(), 7200);

            res.json({
                success: true,
                message: 'Đăng nhập thành công',
                token,
                user: {
                    MaTK: user.MaTK,
                    TenDangNhap: user.TenDangNhap,
                    HoTen: user.HoTen,
                    Email: user.Email,
                    VaiTro: user.VaiTro,
                    MaSV: user.MaSV || (user.VaiTro === 'sinhvien' ? user.TenDangNhap : null),
                    Nganh: user.Nganh || 'Công nghệ phần mềm'
                }
            });
        });

        router.get('/me', async (req, res) => {
            if (!req.user) throw new HttpError(401, 'Chưa đăng nhập');
            const [rows] = await pool.query('SELECT MaTK, TenDangNhap, HoTen, Email, VaiTro, MaSV, Nganh, NgayTao FROM TAIKHOAN WHERE TenDangNhap = ?', [req.user.TenDangNhap]);
            if (!rows[0]) throw new HttpError(404, 'Không tìm thấy thông tin tài khoản');
            res.json({ success: true, data: rows[0] });
        });

        router.post('/verify', (req, res) => {
            try {
                const p = jwt.verify((req.body || {}).token, jwtSecret());
                res.json({
                    success: true,
                    valid: true,
                    user: {
                        MaTK: p.MaTK,
                        TenDangNhap: p.TenDangNhap,
                        VaiTro: p.VaiTro,
                        MaSV: p.MaSV,
                        Nganh: p.Nganh
                    }
                });
            } catch {
                res.json({ success: true, valid: false });
            }
        });

        router.get('/users', async (req, res) => {
            requireRole(req, 'admin', 'giangvien');
            const [rows] = await pool.query('SELECT MaTK, TenDangNhap, HoTen, Email, VaiTro, MaSV, Nganh, NgayTao FROM TAIKHOAN ORDER BY MaTK');
            res.json({ success: true, data: rows });
        });

        router.put('/users/:id/role', async (req, res) => {
            requireRole(req, 'admin');
            const { VaiTro } = req.body || {};
            if (!VALID_ROLES.includes(VaiTro)) throw new HttpError(400, `Vai trò không hợp lệ. Phải là một trong: ${VALID_ROLES.join(', ')}`);
            const [r] = await pool.query('UPDATE TAIKHOAN SET VaiTro = ? WHERE MaTK = ?', [VaiTro, req.params.id]);
            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy tài khoản');
            res.json({ success: true, message: 'Cập nhật vai trò thành công' });
        });

        router.delete('/users/:id', async (req, res) => {
            requireRole(req, 'admin');
            const [r] = await pool.query('DELETE FROM TAIKHOAN WHERE MaTK = ?', [req.params.id]);
            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy tài khoản');
            res.json({ success: true, message: 'Xóa tài khoản thành công' });
        });

        app.use('/api/auth', router);
    }
});
