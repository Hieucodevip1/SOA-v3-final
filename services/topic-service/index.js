// TOPIC SERVICE – quản lý đề tài / lớp học phần tốt nghiệp (database riêng: soa_topic)
const express = require('express');
const { createService, HttpError } = require('../../shared/service-base');

function isTopicOwner(topic, user) {
    if (!user) return false;
    if (user.VaiTro === 'admin') return true;
    if (user.VaiTro !== 'giangvien') return false;

    const uName = String(user.TenDangNhap || '').trim().toLowerCase();
    const uHoTen = String(user.HoTen || '').trim().toLowerCase();
    const topicMaGV = String(topic.MaGV || '').trim().toLowerCase();
    const topicGV = String(topic.GiangVienHuongDan || '').trim().toLowerCase();

    // 1. So khớp mã giảng viên (ví dụ GV001 / gv01 / GV01)
    if (topicMaGV && uName) {
        if (topicMaGV === uName) return true;
        const normTopic = topicMaGV.replace(/^gv0*/i, '');
        const normUser = uName.replace(/^gv0*/i, '');
        if (normTopic && normUser && normTopic === normUser) return true;
    }

    // 2. So khớp họ tên giảng viên
    if (topicGV && uHoTen) {
        if (topicGV.includes(uHoTen) || uHoTen.includes(topicGV)) return true;
    }

    return false;
}

createService({
    name: 'topic-service',
    port: 3003,
    db: {
        name: process.env.DB_NAME_TOPIC || 'soa_topic',
        schema: [
            `CREATE TABLE IF NOT EXISTS DETAI (
                MaDT VARCHAR(20) NOT NULL PRIMARY KEY,
                TenDT VARCHAR(255) NOT NULL,
                MoTa TEXT NULL,
                GiangVienHuongDan VARCHAR(100) NULL,
                MaGV VARCHAR(50) NULL,
                Nganh VARCHAR(100) DEFAULT 'Công nghệ phần mềm',
                SoTinChi INT DEFAULT 10,
                HocKy VARCHAR(50) DEFAULT 'Học kỳ 1 (Niên khóa 2022 - 2026)',
                MonBatBuoc VARCHAR(255) DEFAULT 'Cơ sở dữ liệu, Kiến trúc phần mềm',
                GioiHanSV INT DEFAULT 5,
                DiemGPAToiThieu DECIMAL(3,2) DEFAULT 2.50,
                TrangThaiMo TINYINT(1) DEFAULT 1
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci`
        ]
    },
    openapi: {
        description: 'Dịch vụ quản lý đề tài / lớp học phần tốt nghiệp. Tùy chỉnh môn bắt buộc, số lượng giới hạn, GPA tối thiểu, phân loại ngành dạy.',
        routes: [
            { method: 'GET', path: '/api/topics', summary: 'Danh sách đề tài (lọc theo ?ids=DT001 hoặc ?nganh=... hoặc ?giangvien=...)', query: ['ids', 'nganh', 'giangvien'] },
            { method: 'GET', path: '/api/topics/:id', summary: 'Chi tiết đề tài / lớp học phần' },
            { method: 'POST', path: '/api/topics', summary: 'Thêm đề tài mới', roles: ['admin', 'giangvien'], body: ['MaDT', 'TenDT', 'MoTa', 'GiangVienHuongDan', 'MaGV', 'Nganh', 'SoTinChi', 'HocKy', 'MonBatBuoc', 'GioiHanSV', 'DiemGPAToiThieu'], required: ['MaDT', 'TenDT'] },
            { method: 'PUT', path: '/api/topics/:id', summary: 'Cập nhật đề tài', roles: ['admin', 'giangvien'], body: ['TenDT', 'MoTa', 'GiangVienHuongDan', 'Nganh', 'SoTinChi', 'HocKy', 'MonBatBuoc', 'GioiHanSV', 'DiemGPAToiThieu', 'TrangThaiMo'], required: ['TenDT'] },
            { method: 'DELETE', path: '/api/topics/:id', summary: 'Xóa đề tài (phát sự kiện topic.deleted)', roles: ['admin', 'giangvien'] }
        ]
    },
    async init(app, { pool, log, publish }) {
        const router = express.Router();

        // Đảm bảo các cột mới tồn tại trong bảng DETAI
        try {
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS MaGV VARCHAR(50) NULL");
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS Nganh VARCHAR(100) DEFAULT 'Công nghệ phần mềm'");
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS SoTinChi INT DEFAULT 10");
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS HocKy VARCHAR(50) DEFAULT 'Học kỳ 1 (Niên khóa 2022 - 2026)'");
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS MonBatBuoc VARCHAR(255) DEFAULT 'Cơ sở dữ liệu, Kiến trúc phần mềm'");
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS GioiHanSV INT DEFAULT 5");
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS DiemGPAToiThieu DECIMAL(3,2) DEFAULT 2.50");
            await pool.query("ALTER TABLE DETAI ADD COLUMN IF NOT EXISTS TrangThaiMo TINYINT(1) DEFAULT 1");
            await pool.query("UPDATE DETAI SET MaGV = 'GV001' WHERE MaGV = 'gv01' OR GiangVienHuongDan LIKE '%Nguyễn Thanh Bình%'");
            await pool.query("UPDATE DETAI SET MaGV = 'GV002' WHERE MaGV = 'gv02' OR GiangVienHuongDan LIKE '%Trần Thị Mai%'");
        } catch { /* Bỏ qua nếu đã có */ }

        // Khởi tạo đề tài mẫu nếu bảng rỗng
        const [[{ count }]] = await pool.query('SELECT COUNT(*) AS count FROM DETAI');
        if (count === 0) {
            const initialTopics = [
                ['DT001', 'Xây dựng hệ thống quản lý đào tạo & đồ án theo kiến trúc SOA', 'Thiết kế kiến trúc hướng dịch vụ độc lập, loose coupling, event-driven, registry & gateway', 'TS. Nguyễn Thanh Bình', 'GV001', 'Công nghệ phần mềm', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Cơ sở dữ liệu, Kiến trúc phần mềm', 3, 2.50, 1],
                ['DT002', 'Ứng dụng Trí tuệ nhân tạo nhận diện khuôn mặt điểm danh sinh viên', 'Mô hình học sâu kết hợp xử lý thị giác máy tính và camera giám sát trường học', 'TS. Nguyễn Thanh Bình', 'GV001', 'Công nghệ phần mềm', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Cơ sở dữ liệu, Kỹ thuật phần mềm', 4, 2.80, 1],
                ['DT003', 'Xây dựng ứng dụng di động hỗ trợ quản lý học tập và rèn luyện sinh viên QNU', 'Ứng dụng Flutter/React Native kết hợp hệ thống API Backend đồng bộ dữ liệu đào tạo', 'ThS. Hoàng Văn Em', 'GV008', 'Công nghệ phần mềm', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Lập trình thiết bị di động, Cơ sở dữ liệu', 3, 2.50, 1],
                ['DT004', 'Phát triển nền tảng học trực tuyến E-learning tích hợp Microservices', 'Hệ thống học tập trực tuyến, livestream bài giảng và chấm điểm trắc nghiệm tự động', 'ThS. Lê Minh Triết', 'GV009', 'Công nghệ phần mềm', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Lập trình Web, Kiến trúc phần mềm', 3, 2.60, 1],
                ['DT005', 'Hệ thống kiểm thử tự động CI/CD cho dự án phần mềm doanh nghiệp', 'Tích hợp Docker, Kubernetes, Jenkins và SonarQube kiểm tra chất lượng mã nguồn', 'TS. Nguyễn Thanh Bình', 'GV001', 'Công nghệ phần mềm', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Kiểm thử phần mềm, Kỹ thuật phần mềm', 2, 2.70, 1],
                ['DT006', 'Hệ thống hỗ trợ ra quyết định & phân tích dữ liệu học tập sinh viên', 'Kho dữ liệu và phân tích dữ liệu đào tạo trường Đại học', 'ThS. Trần Thị Mai', 'GV002', 'Hệ thống thông tin', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Cơ sở dữ liệu, Phân tích thiết kế HTTT', 3, 2.50, 1],
                ['DT007', 'Xây dựng cổng thanh toán học phí trực tuyến liên ngân hàng', 'Hệ thống thanh toán bảo mật chuẩn PCI-DSS, kết nối cổng thanh toán VNPay / Momo', 'ThS. Trần Thị Mai', 'GV002', 'Hệ thống thông tin', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Cơ sở dữ liệu, An toàn thông tin', 2, 2.60, 1],
                ['DT008', 'Hệ thống hoạch định nguồn lực doanh nghiệp ERP cho chuỗi cung ứng', 'Phần mềm ERP quản trị kho vận, đơn hàng, hóa đơn điện tử cho doanh nghiệp sản xuất', 'PGS.TS. Trịnh Xuân Dũng', 'GV012', 'Hệ thống thông tin', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Phân tích thiết kế HTTT, Cơ sở dữ liệu', 4, 2.50, 1],
                ['DT009', 'Xây dựng hệ thống quản lý thông tin bệnh viện số (Hospital HIS)', 'Quản trị hồ sơ bệnh án điện tử, tiếp nhận bệnh nhân, viện phí và đơn thuốc', 'ThS. Trần Thị Mai', 'GV002', 'Hệ thống thông tin', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Cơ sở dữ liệu, Phân tích thiết kế HTTT', 3, 2.50, 1],
                ['DT010', 'Nghiên cứu mô hình ngôn ngữ lớn (LLM) hỗ trợ tư vấn tuyển sinh đại học', 'Xây dựng Chatbot RAG dựa trên Llama/GPT tích hợp cơ sở tri thức tuyển sinh QNU', 'TS. Vũ Thị Phương', 'GV003', 'Trí tuệ nhân tạo', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Học máy, Xử lý ngôn ngữ tự nhiên', 2, 3.00, 1],
                ['DT011', 'Ứng dụng Deep Learning phát hiện sớm bệnh cây trồng qua ảnh lá', 'Mô hình CNN phát hiện sâu bệnh trên cây xoài và lúa tại khu vực Nam Trung Bộ', 'TS. Vũ Thị Phương', 'GV003', 'Trí tuệ nhân tạo', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Thị giác máy tính, Học máy', 3, 2.80, 1],
                ['DT012', 'Phát hiện gian lận thi cử trực tuyến sử dụng thị giác máy tính', 'Theo dõi cử chỉ mắt, tư thế ngồi và phát hiện tài liệu lạ trong phòng thi online', 'TS. Vũ Thị Phương', 'GV003', 'Trí tuệ nhân tạo', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Thị giác máy tính, Cấu trúc dữ liệu & giải thuật', 3, 2.90, 1],
                ['DT013', 'Tối ưu hóa lập lịch xe buýt đô thị dựa trên thuật toán di truyền', 'Thuật toán Genetic Algorithm giải bài toán định tuyến và phân bổ chuyến xe buýt thông minh', 'PGS.TS. Lê Văn Hoàng', 'GV004', 'Khoa học máy tính', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Cấu trúc dữ liệu & giải thuật, Trí tuệ nhân tạo', 2, 2.80, 1],
                ['DT014', 'Xây dựng Data Warehouse & Dashboard phân tích hiệu quả kinh doanh', 'Mô hình dữ liệu hình sao (Star Schema), ETL pipeline và trực quan hóa PowerBI', 'TS. Đỗ Ngọc Hùng', 'GV010', 'Kỹ thuật dữ liệu', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Cơ sở dữ liệu, Khai phá dữ liệu', 3, 2.70, 1],
                ['DT015', 'Hệ thống giám sát và phát hiện xâm nhập mạng nội bộ (IDS/IPS)', 'Phân tích gói tin mạng thời gian thực, phát hiện tấn công DDoS và mã độc', 'ThS. Phạm Quốc Tuấn', 'GV005', 'Mạng máy tính & An toàn thông tin', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Mạng máy tính, An toàn thông tin', 3, 2.60, 1],
                ['DT016', 'Ứng dụng công nghệ Blockchain trong xác thực văn bằng và chứng chỉ số', 'Smart Contract Ethereum / Polygon lưu trữ hash văn bằng tốt nghiệp chống làm giả', 'ThS. Phạm Quốc Tuấn', 'GV005', 'Mạng máy tính & An toàn thông tin', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Mật mã học, An toàn thông tin', 2, 2.80, 1],
                ['DT017', 'Hệ thống IoT quan trắc môi trường và cảnh báo mưa lũ tại Bình Định', 'Cảm biến mực nước, nhiệt độ kết nối mạng truyền thông LoRaWAN gửi dữ liệu đám mây', 'PGS.TS. Lê Văn Hoàng', 'GV004', 'Khoa học máy tính', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Hệ thống nhúng và IoT, Mạng máy tính', 4, 2.50, 1],
                ['DT018', 'Phần mềm mô phỏng thí nghiệm vật lý ảo hỗ trợ dạy học trực quan', 'Mô phỏng 3D cơ học và quang học tương tác cho học sinh trung học phổ thông', 'TS. Nguyễn Thị Lan', 'GV011', 'Sư phạm Tin học', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Lập trình đồ họa, Phương pháp dạy học Tin học', 3, 2.50, 1],
                ['DT019', 'Xây dựng mô hình dự báo biến động giá nông sản sử dụng Time Series', 'Mô hình chuỗi thời gian ARIMA kết hợp LSTM dự báo giá lúa và tiêu xuất khẩu', 'TS. Nguyễn Thị Lan', 'GV011', 'Toán ứng dụng', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Xác suất thống kê, Đại số tuyến tính', 2, 2.70, 1],
                ['DT020', 'Nền tảng chuyển đổi số du lịch Quy Nhơn tích hợp bản đồ số thực tế ảo (VR 360)', 'Bản đồ số định vị điểm đến, tour du lịch ảo 360 độ và hệ thống đặt vé tham quan', 'ThS. Hoàng Văn Em', 'GV008', 'Công nghệ phần mềm', 10, 'Học kỳ 1 (Niên khóa 2022 - 2026)', 'Lập trình Web, Thiết kế giao diện UI/UX', 4, 2.50, 1]
            ];
            for (const t of initialTopics) {
                await pool.query(
                    'INSERT IGNORE INTO DETAI (MaDT, TenDT, MoTa, GiangVienHuongDan, MaGV, Nganh, SoTinChi, HocKy, MonBatBuoc, GioiHanSV, DiemGPAToiThieu, TrangThaiMo) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
                    t
                );
            }
            log('Đã nạp 20 đề tài mẫu chuẩn QNU (DT001 -> DT020)');
        }

        router.get('/', async (req, res) => {
            let rows;
            const { ids, nganh, giangvien } = req.query;
            if (ids !== undefined) {
                const idList = String(ids).split(',').map((s) => s.trim()).filter(Boolean).slice(0, 500);
                rows = idList.length ? (await pool.query('SELECT * FROM DETAI WHERE MaDT IN (?)', [idList]))[0] : [];
            } else if (nganh && giangvien) {
                [rows] = await pool.query('SELECT * FROM DETAI WHERE Nganh = ? AND (MaGV = ? OR GiangVienHuongDan LIKE ?) ORDER BY MaDT', [nganh, giangvien, `%${giangvien}%`]);
            } else if (nganh) {
                [rows] = await pool.query('SELECT * FROM DETAI WHERE Nganh = ? ORDER BY MaDT', [nganh]);
            } else if (giangvien) {
                [rows] = await pool.query('SELECT * FROM DETAI WHERE MaGV = ? OR GiangVienHuongDan LIKE ? ORDER BY MaDT', [giangvien, `%${giangvien}%`]);
            } else {
                [rows] = await pool.query('SELECT * FROM DETAI ORDER BY MaDT');
            }
            res.json({ success: true, data: rows });
        });

        router.get('/:id', async (req, res) => {
            const [rows] = await pool.query('SELECT * FROM DETAI WHERE MaDT = ?', [req.params.id]);
            if (!rows[0]) throw new HttpError(404, 'Không tìm thấy đề tài / lớp học phần');
            res.json({ success: true, data: rows[0] });
        });

        router.post('/', async (req, res) => {
            const {
                MaDT, TenDT, MoTa, GiangVienHuongDan, MaGV, Nganh,
                SoTinChi, HocKy, MonBatBuoc, GioiHanSV, DiemGPAToiThieu
            } = req.body || {};

            if (!MaDT || !TenDT) throw new HttpError(400, 'Mã đề tài và tên đề tài là bắt buộc');

            const gvName = (req.user && req.user.VaiTro === 'giangvien' && req.user.HoTen)
                ? req.user.HoTen
                : (GiangVienHuongDan || (req.user ? req.user.HoTen : 'Giảng viên'));
            const gvCode = (req.user && req.user.VaiTro === 'giangvien')
                ? req.user.TenDangNhap
                : (MaGV || (req.user ? req.user.TenDangNhap : null));
            const nganhVal = Nganh || (req.user && req.user.Nganh ? req.user.Nganh : 'Công nghệ phần mềm');
            const stc = SoTinChi !== undefined && SoTinChi !== '' ? Number(SoTinChi) : 10;
            const hk = HocKy || 'Học kỳ 1 (Niên khóa 2022 - 2026)';
            const mbb = MonBatBuoc !== undefined ? MonBatBuoc : null;
            const gh = GioiHanSV !== undefined && GioiHanSV !== '' ? Number(GioiHanSV) : 5;
            const gpaMin = DiemGPAToiThieu !== undefined && DiemGPAToiThieu !== '' ? Number(DiemGPAToiThieu) : 0;

            try {
                await pool.query(
                    `INSERT INTO DETAI (MaDT, TenDT, MoTa, GiangVienHuongDan, MaGV, Nganh, SoTinChi, HocKy, MonBatBuoc, GioiHanSV, DiemGPAToiThieu, TrangThaiMo)
                     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 1)`,
                    [MaDT, TenDT, MoTa || null, gvName, gvCode, nganhVal, stc, hk, mbb, gh, gpaMin]
                );
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') throw new HttpError(409, 'Mã đề tài đã tồn tại');
                throw e;
            }
            publish('topic.created', { MaDT, TenDT, GiangVienHuongDan: gvName, MaGV: gvCode, Nganh: nganhVal });
            res.status(201).json({ success: true, message: 'Thêm đề tài / lớp học phần thành công' });
        });

        router.put('/:id', async (req, res) => {
            const {
                TenDT, MoTa, GiangVienHuongDan, MaGV, Nganh,
                SoTinChi, HocKy, MonBatBuoc, GioiHanSV, DiemGPAToiThieu, TrangThaiMo
            } = req.body || {};

            if (!TenDT) throw new HttpError(400, 'Tên đề tài là bắt buộc');

            const [cur] = await pool.query('SELECT * FROM DETAI WHERE MaDT = ?', [req.params.id]);
            if (!cur[0]) throw new HttpError(404, 'Không tìm thấy đề tài');
            const old = cur[0];

            // Kiểm tra phân quyền nghiệp vụ: Giảng viên chỉ được sửa đề tài do chính mình phụ trách hướng dẫn
            if (req.user && req.user.VaiTro === 'giangvien') {
                if (!isTopicOwner(old, req.user)) {
                    throw new HttpError(403, 'Bạn chỉ có quyền chỉnh sửa đề tài do chính mình phụ trách hướng dẫn');
                }
            }

            // Nếu giảng viên sửa, giữ nguyên thông tin giảng viên của đề tài (không cho đổi sang GV khác)
            const finalGvName = (req.user && req.user.VaiTro === 'giangvien')
                ? old.GiangVienHuongDan
                : (GiangVienHuongDan || old.GiangVienHuongDan);
            const finalMaGV = (req.user && req.user.VaiTro === 'giangvien')
                ? old.MaGV
                : (MaGV !== undefined ? MaGV : old.MaGV);

            const [r] = await pool.query(
                `UPDATE DETAI SET
                    TenDT = ?, MoTa = ?, GiangVienHuongDan = ?, MaGV = ?, Nganh = ?,
                    SoTinChi = ?, HocKy = ?, MonBatBuoc = ?, GioiHanSV = ?, DiemGPAToiThieu = ?,
                    TrangThaiMo = ?
                 WHERE MaDT = ?`,
                [
                    TenDT,
                    MoTa !== undefined ? MoTa : old.MoTa,
                    finalGvName,
                    finalMaGV,
                    Nganh || old.Nganh,
                    SoTinChi !== undefined ? Number(SoTinChi) : old.SoTinChi,
                    HocKy || old.HocKy,
                    MonBatBuoc !== undefined ? MonBatBuoc : old.MonBatBuoc,
                    GioiHanSV !== undefined ? Number(GioiHanSV) : old.GioiHanSV,
                    DiemGPAToiThieu !== undefined ? Number(DiemGPAToiThieu) : old.DiemGPAToiThieu,
                    TrangThaiMo !== undefined ? Number(TrangThaiMo) : old.TrangThaiMo,
                    req.params.id
                ]
            );

            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy đề tài');
            res.json({ success: true, message: 'Cập nhật đề tài thành công' });
        });

        router.delete('/:id', async (req, res) => {
            const [cur] = await pool.query('SELECT * FROM DETAI WHERE MaDT = ?', [req.params.id]);
            if (!cur[0]) throw new HttpError(404, 'Không tìm thấy đề tài');
            const old = cur[0];

            // Giảng viên chỉ được xóa đề tài do chính mình phụ trách
            if (req.user && req.user.VaiTro === 'giangvien') {
                if (!isTopicOwner(old, req.user)) {
                    throw new HttpError(403, 'Bạn chỉ có quyền xóa đề tài do chính mình phụ trách hướng dẫn');
                }
            }

            const [r] = await pool.query('DELETE FROM DETAI WHERE MaDT = ?', [req.params.id]);
            if (r.affectedRows === 0) throw new HttpError(404, 'Không tìm thấy đề tài');
            publish('topic.deleted', { MaDT: req.params.id });
            res.json({ success: true, message: 'Xóa đề tài thành công' });
        });

        app.use('/api/topics', router);
    }
});
