// NOTIFICATION SERVICE – nhận sự kiện bất đồng bộ từ Event Bus và lưu thông báo (database riêng: soa_notification)
const express = require('express');
const { createService, HttpError } = require('../../shared/service-base');

const builders = {
    'registration.created': (p) => {
        const notifs = [
            ['staff', 'Đăng ký đề tài mới', `Sinh viên ${p.HoTen || p.MaSV} (${p.MaSV}) vừa đăng ký đề tài "${p.TenDT || p.MaDT}" - Trạng thái: Chờ duyệt`],
            [`user:${p.MaSV}`, 'Đã ghi nhận đăng ký đề tài', `Đăng ký đề tài "${p.TenDT || p.MaDT}" đã được gửi lên hệ thống. Vui lòng chờ giảng viên duyệt.`]
        ];
        if (p.MaGV) {
            notifs.push([`user:${p.MaGV}`, '📝 Sinh viên đăng ký lớp học phần của bạn', `Sinh viên ${p.HoTen || p.MaSV} (${p.MaSV}) vừa đăng ký đề tài [${p.MaDT}] "${p.TenDT || ''}" do bạn phụ trách. Vui lòng vào duyệt.`]);
        }
        if (p.GiangVienHuongDan) {
            notifs.push([`user:${p.GiangVienHuongDan}`, '📝 Sinh viên đăng ký lớp học phần của bạn', `Sinh viên ${p.HoTen || p.MaSV} (${p.MaSV}) vừa đăng ký đề tài [${p.MaDT}] "${p.TenDT || ''}" do bạn phụ trách. Vui lòng vào duyệt.`]);
        }
        return notifs;
    },
    'registration.status_changed': (p) => {
        const notifs = [
            ['staff', 'Trạng thái đăng ký thay đổi', `Đăng ký #${p.MaDK} (${p.MaSV} – ${p.MaDT}): "${p.from || ''}" → "${p.to || ''}"`]
        ];
        if (p.to === 'Da duyet') {
            notifs.push([`user:${p.MaSV}`, 'Đã duyệt đăng ký đề tài!', `Chúc mừng! Giảng viên đã DUYỆT đăng ký đề tài "${p.MaDT}" của bạn. Trạng thái: Đã duyệt đăng ký.`]);
        } else if (p.to === 'Tu choi') {
            notifs.push([`user:${p.MaSV}`, 'Đăng ký đề tài bị từ chối', `Đăng ký đề tài "${p.MaDT}" của bạn đã bị từ chối. Lý do: ${p.LyDoTuChoi || 'Không đạt điều kiện chuyên môn'}. Bạn có thể đăng ký đề tài khác.`]);
        } else if (p.to === 'Da huy') {
            notifs.push([`user:${p.MaSV}`, 'Đã hủy đăng ký', `Đăng ký đề tài "${p.MaDT}" đã được hủy thành công.`]);
        } else {
            notifs.push([`user:${p.MaSV}`, 'Cập nhật đăng ký', `Trạng thái đề tài ${p.MaDT} của bạn đã đổi sang "${p.to}".`]);
        }
        return notifs;
    },
    'registration.graded': (p) => [
        ['staff', 'Đã lưu điểm đồ án', `Đăng ký #${p.MaDK} (${p.MaSV} – ${p.MaDT}) được chấm ${p.Diem} điểm`],
        [`user:${p.MaSV}`, 'Đã có kết quả điểm học tập đồ án!', `Đề tài ${p.MaDT} của bạn đạt ${p.Diem}/10 điểm.${p.NhanXet ? ' Nhận xét: ' + p.NhanXet : ''}`]
    ],
    'user.registered': (p) => {
        const notifs = [
            ['staff', 'Tài khoản mới', `${p.HoTen} (${p.TenDangNhap}) vừa tham gia hệ thống với vai trò: ${p.VaiTro || 'thành viên'}`],
            [`user:${p.TenDangNhap}`, 'Chào mừng đến Cổng Đào Tạo QNU', `Xin chào ${p.HoTen}, tài khoản của bạn (${p.TenDangNhap}) đã được kích hoạt thành công.`]
        ];
        if (p.VaiTro === 'giangvien') {
            notifs.push([`user:${p.TenDangNhap}`, '👨‍🏫 Kích hoạt tài khoản Giảng viên thành công!', `Xin chào Quý Thầy/Cô ${p.HoTen} (${p.TenDangNhap}). Bạn có quyền tạo đề tài, quản lý lớp học phần, duyệt đăng ký sinh viên và chấm điểm học phần.`]);
        }
        return notifs;
    },
    'student.created': (p) => [['staff', 'Sinh viên mới', `Đã thêm sinh viên ${p.HoTen || ''} (${p.MaSV}) vào cơ sở dữ liệu`]],
    'topic.created': (p) => {
        const notifs = [
            ['staff', 'Đề tài mới mở đăng ký', `Đã thêm đề tài ${p.MaDT}: "${p.TenDT || ''}" (${p.Nganh || ''})`],
            ['all', 'Đề tài tốt nghiệp mới', `Đề tài "${p.TenDT || ''}" do ${p.GiangVienHuongDan || 'Giảng viên'} phụ trách đã mở đăng ký.`]
        ];
        if (p.MaGV) {
            notifs.push([`user:${p.MaGV}`, '📌 Phân công hướng dẫn lớp học phần mới', `Quý Thầy/Cô đã được phân công hướng dẫn lớp học phần / đề tài [${p.MaDT}] "${p.TenDT}".`]);
        }
        if (p.GiangVienHuongDan) {
            notifs.push([`user:${p.GiangVienHuongDan}`, '📌 Phân công hướng dẫn lớp học phần mới', `Quý Thầy/Cô đã được phân công hướng dẫn lớp học phần / đề tài [${p.MaDT}] "${p.TenDT}".`]);
        }
        return notifs;
    },
    'student.deleted': (p) => [['staff', 'Sinh viên bị xóa', `Sinh viên ${p.MaSV} đã bị xóa; các đăng ký liên quan được hủy tự động`]],
    'topic.deleted': (p) => [['staff', 'Đề tài bị xóa', `Đề tài ${p.MaDT} đã bị xóa; các đăng ký liên quan được hủy tự động`]]
};

async function store(pool, ev) {
    const build = builders[ev.topic];
    if (!build) return;
    for (const [audience, title, message] of build(ev.payload || {})) {
        await pool.query(
            'INSERT IGNORE INTO notifications (event_id, topic, audience, title, message) VALUES (?, ?, ?, ?, ?)',
            [ev.id, ev.topic, audience, title, message]
        );
    }
}

createService({
    name: 'notification-service',
    port: 3005,
    db: {
        name: process.env.DB_NAME_NOTIFICATION || 'soa_notification',
        schema: [
            `CREATE TABLE IF NOT EXISTS notifications (
                id INT NOT NULL AUTO_INCREMENT PRIMARY KEY,
                event_id VARCHAR(64) NOT NULL,
                topic VARCHAR(100) NOT NULL,
                audience VARCHAR(100) NOT NULL,
                title VARCHAR(200) NOT NULL,
                message VARCHAR(500) NOT NULL,
                is_read TINYINT(1) NOT NULL DEFAULT 0,
                created_at TIMESTAMP NULL DEFAULT CURRENT_TIMESTAMP,
                UNIQUE KEY uq_event_audience (event_id, audience),
                KEY idx_audience (audience)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ]
    },
    openapi: {
        description: 'Dịch vụ thông báo – hoạt động hoàn toàn dựa trên sự kiện bất đồng bộ từ Event Bus',
        routes: [
            { method: 'GET', path: '/api/notifications', summary: 'Thông báo của người dùng hiện tại (kèm số chưa đọc)' },
            { method: 'PUT', path: '/api/notifications/:id/read', summary: 'Đánh dấu đã đọc' }
        ]
    },
    events: Object.fromEntries(Object.keys(builders).map((t) => [t, async (payload, ev, { pool }) => store(pool, ev)])),

    async init(app, { pool }) {
        const router = express.Router();

        // Nạp thông báo ban đầu cho các tài khoản giảng viên GV001 - GV006
        const seedLecturerNotifs = [
            ['user:GV001', 'user.registered', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào TS. Nguyễn Thanh Bình (GV001). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.'],
            ['user:GV001', 'topic.created', '📌 Phân công hướng dẫn đề tài tốt nghiệp', 'Quý Thầy/Cô đã được phân công phụ trách đề tài [DT001] "Xây dựng hệ thống quản lý đào tạo theo kiến trúc SOA" và [DT002] "Ứng dụng AI điểm danh sinh viên".'],
            ['user:GV001', 'registration.created', '📝 Sinh viên đăng ký đề tài tốt nghiệp', 'Sinh viên Vũ Đức Hiếu (SV001) đã đăng ký đề tài [DT001]. Vui lòng truy cập mục "Duyệt sinh viên đăng ký" để xem xét.'],
            ['user:GV002', 'user.registered', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào ThS. Trần Thị Mai (GV002). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.'],
            ['user:GV002', 'topic.created', '📌 Phân công hướng dẫn đề tài tốt nghiệp', 'Quý Thầy/Cô đã được phân công phụ trách đề tài [DT003] "Hệ thống hỗ trợ ra quyết định dữ liệu sinh viên" và [DT004] "Xây dựng cổng thanh toán trực tuyến".'],
            ['user:GV003', 'user.registered', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào TS. Vũ Thị Phương (GV003). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU (Bộ môn Trí tuệ nhân tạo).'],
            ['user:GV004', 'user.registered', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào PGS.TS. Lê Văn Hoàng (GV004). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.'],
            ['user:GV005', 'user.registered', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào ThS. Phạm Quốc Tuấn (GV005). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.'],
            ['user:GV006', 'user.registered', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào TS. Vũ Hải Đăng (GV006). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.']
        ];
        for (let i = 0; i < seedLecturerNotifs.length; i++) {
            const [aud, topic, title, msg] = seedLecturerNotifs[i];
            await pool.query(
                'INSERT IGNORE INTO notifications (event_id, topic, audience, title, message) VALUES (?, ?, ?, ?, ?)',
                [`seed-lecturer-${i + 1}`, topic, aud, title, msg]
            );
        }

        function audiencesOf(user) {
            if (!user) throw new HttpError(401, 'Chưa đăng nhập');
            const a = ['all', `user:${user.TenDangNhap}`];
            if (user.MaSV) a.push(`user:${user.MaSV}`);
            if (user.HoTen) a.push(`user:${user.HoTen}`);
            if (user.VaiTro === 'giangvien' || user.VaiTro === 'admin') a.push('staff');
            if (user.VaiTro === 'admin') a.push('admin');
            return a;
        }

        router.get('/', async (req, res) => {
            const aud = audiencesOf(req.user);
            const [rows] = await pool.query(
                'SELECT id, topic, title, message, is_read, created_at FROM notifications WHERE audience IN (?) ORDER BY id DESC LIMIT 50',
                [aud]
            );
            const [[{ unread }]] = await pool.query(
                'SELECT COUNT(*) AS unread FROM notifications WHERE audience IN (?) AND is_read = 0',
                [aud]
            );
            res.json({ success: true, data: rows, unread });
        });

        router.put('/:id/read', async (req, res) => {
            const [r] = await pool.query(
                'UPDATE notifications SET is_read = 1 WHERE id = ? AND audience IN (?)',
                [req.params.id, audiencesOf(req.user)]
            );
            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy thông báo');
            res.json({ success: true });
        });

        app.use('/api/notifications', router);
    }
});
