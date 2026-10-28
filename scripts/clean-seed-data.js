/**
 * Script dọn dẹp dữ liệu thừa từ các đợt test và nạp lại bộ dữ liệu mẫu chuẩn QNU:
 * - GV: GV001 - GV010 (TS. Nguyễn Thanh Bình, ThS. Trần Thị Mai...)
 * - DT: DT001 - DT020 (Toàn bộ 20 đề tài & lớp học phần chuẩn QNU)
 * - SV: SV001 - SV005 (Vũ Đức Hiếu, Lê Minh Châu, Trần Quốc Đạt...)
 * - Đăng ký: Đăng ký mẫu đa dạng trạng thái (Đã duyệt, Chờ duyệt, Từ chối, Đã chấm điểm)
 * - Thông báo: Thông báo chào mừng, phân công đề tài và duyệt đăng ký
 */

const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || ''
};

async function main() {
    const conn = await mysql.createConnection(dbConfig);
    console.log('🔄 Bắt đầu dọn dẹp và chuẩn hóa dữ liệu mẫu hệ thống QNU SOA...');

    const defaultHash = await bcrypt.hash('123456', 10);

    // =========================================================================
    // 1. DỌN DẸP & NẠP TÀI KHOẢN (soa_auth.TAIKHOAN)
    // =========================================================================
    await conn.query('USE soa_auth');
    await conn.query('DELETE FROM TAIKHOAN');
    await conn.query('ALTER TABLE TAIKHOAN AUTO_INCREMENT = 1');

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
        { u: 'SV003', p: defaultHash, n: 'Trần Quốc Đạt', r: 'sinhvien', e: 'dattq@qnu.edu.vn', m: 'SV003', d: 'Hệ thống thông tin' },
        { u: 'SV004', p: defaultHash, n: 'Nguyễn Thị Bích', r: 'sinhvien', e: 'bichnt@qnu.edu.vn', m: 'SV004', d: 'Công nghệ phần mềm' },
        { u: 'SV005', p: defaultHash, n: 'Phạm Văn Nam', r: 'sinhvien', e: 'nampv@qnu.edu.vn', m: 'SV005', d: 'Khoa học máy tính' }
    ];

    for (const u of seedUsers) {
        await conn.query(
            'INSERT INTO TAIKHOAN (TenDangNhap, MatKhau, HoTen, Email, VaiTro, MaSV, Nganh) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [u.u, u.p, u.n, u.e, u.r, u.m, u.d]
        );
    }
    console.log(`✅ [soa_auth] Đã nạp ${seedUsers.length} tài khoản chuẩn (admin, GV001 - GV010, SV001 - SV005, pass: 123456)`);

    // =========================================================================
    // 2. DỌN DẸP & NẠP HỒ SƠ SINH VIÊN (soa_student.SINHVIEN)
    // =========================================================================
    await conn.query('USE soa_student');
    await conn.query('DELETE FROM SINHVIEN');

    const seedStudents = [
        ['SV001', 'Vũ Đức Hiếu', 'hieuvd@qnu.edu.vn', 'DHKTPM20', 'Công nghệ phần mềm', 3.45, 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm, Lập trình Web, Kiến trúc phần mềm', 122],
        ['SV002', 'Lê Minh Châu', 'chaulm@qnu.edu.vn', 'DHKTPM20', 'Công nghệ phần mềm', 3.10, 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm, Cấu trúc dữ liệu & giải thuật', 112],
        ['SV003', 'Trần Quốc Đạt', 'dattq@qnu.edu.vn', 'DHHTTT20', 'Hệ thống thông tin', 2.85, 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Phân tích thiết kế HTTT', 105],
        ['SV004', 'Nguyễn Thị Bích', 'bichnt@qnu.edu.vn', 'DHKTPM21', 'Công nghệ phần mềm', 2.20, 'Giải tích, Lập trình căn bản, Cơ sở dữ liệu', 65],
        ['SV005', 'Phạm Văn Nam', 'nampv@qnu.edu.vn', 'DHKHMT20', 'Khoa học máy tính', 3.35, 'Giải tích, Đại số tuyến tính, Cơ sở dữ liệu, Cấu trúc dữ liệu & giải thuật, Trí tuệ nhân tạo', 118]
    ];

    for (const s of seedStudents) {
        await conn.query(
            'INSERT INTO SINHVIEN (MaSV, HoTen, Email, Lop, Nganh, GPA, MonDaHoc, SoTCTichLuy) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
            s
        );
    }
    console.log(`✅ [soa_student] Đã nạp ${seedStudents.length} sinh viên mẫu (SV001 -> SV005)`);

    // =========================================================================
    // 3. DỌN DẸP & NẠP 20 ĐỀ TÀI / LỚP HỌC PHẦN (soa_topic.DETAI)
    // =========================================================================
    await conn.query('USE soa_topic');
    await conn.query('DELETE FROM DETAI');

    const seedTopics = [
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

    for (const t of seedTopics) {
        await conn.query(
            `INSERT INTO DETAI (MaDT, TenDT, MoTa, GiangVienHuongDan, MaGV, Nganh, SoTinChi, HocKy, MonBatBuoc, GioiHanSV, DiemGPAToiThieu, TrangThaiMo)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            t
        );
    }
    console.log(`✅ [soa_topic] Đã nạp đầy đủ ${seedTopics.length} đề tài chuẩn QNU (DT001 -> DT020)`);

    // =========================================================================
    // 4. DỌN DẸP & NẠP ĐĂNG KÝ HỌC PHẦN / ĐỒ ÁN (soa_registration.DANGKY)
    // =========================================================================
    await conn.query('USE soa_registration');
    await conn.query('DELETE FROM DANGKY');
    await conn.query('ALTER TABLE DANGKY AUTO_INCREMENT = 1');

    const seedRegistrations = [
        ['SV001', 'DT001', '2026-10-15', 'Da duyet', 9.5, 'Đồ án hoàn thành xuất sắc, kiến trúc phân tán chuẩn SOA, báo cáo tự tin.', null],
        ['SV002', 'DT002', '2026-10-18', 'Da duyet', null, 'Đã thẩm tra đầy đủ môn tiên quyết và GPA. Đạt điều kiện thực hiện.', null],
        ['SV003', 'DT006', '2026-10-22', 'Cho duyet', null, null, null],
        ['SV004', 'DT003', '2026-10-23', 'Tu choi', null, null, 'Chưa hoàn thành môn tiên quyết Lập trình thiết bị di động'],
        ['SV005', 'DT013', '2026-10-20', 'Da duyet', 8.5, 'Thuật toán di truyền tối ưu tốt, mô phỏng tuyến đường chính xác.', null]
    ];

    for (const r of seedRegistrations) {
        await conn.query(
            'INSERT INTO DANGKY (MaSV, MaDT, NgayDangKy, TrangThai, Diem, NhanXet, LyDoTuChoi) VALUES (?, ?, ?, ?, ?, ?, ?)',
            r
        );
    }
    console.log(`✅ [soa_registration] Đã nạp ${seedRegistrations.length} đăng ký mẫu sinh động (Đã duyệt, Chờ duyệt, Từ chối, Đã chấm điểm)`);

    // =========================================================================
    // 5. DỌN DẸP & NẠP THÔNG BÁO HỆ THỐNG (soa_notification.NOTIFICATIONS)
    // =========================================================================
    await conn.query('USE soa_notification');
    await conn.query('DELETE FROM notifications');
    await conn.query('ALTER TABLE notifications AUTO_INCREMENT = 1');

    const seedNotifs = [
        // Thông báo chung toàn trường
        ['seed-all-1', 'system.announcement', 'all', '📢 Khởi động Đợt Đăng ký Đồ án Tốt nghiệp & Lớp Học phần K20', 'Cổng Đào tạo Trường Đại học Quy Nhơn thông báo mở cổng đăng ký đề tài tốt nghiệp cho sinh viên khóa 2022 - 2026. Thời gian đăng ký từ 15/10 đến 30/11.'],
        ['seed-all-2', 'topic.created', 'all', '📚 Mở đăng ký 20 đề tài & lớp học phần mới', 'Bộ môn và Khoa CNTT đã công bố 20 đề tài tốt nghiệp mới với các hướng Công nghệ phần mềm, Hệ thống thông tin, AI, Khoa học dữ liệu.'],

        // Thông báo cho Ban điều hành / Giảng viên (staff)
        ['seed-staff-1', 'registration.created', 'staff', '📝 Sinh viên nộp hồ sơ đăng ký đề tài', 'Sinh viên Vũ Đức Hiếu (SV001) đã đăng ký đề tài [DT001]. Trạng thái: Đã duyệt đăng ký.'],
        ['seed-staff-2', 'registration.created', 'staff', '📝 Sinh viên nộp hồ sơ đăng ký đề tài', 'Sinh viên Lê Minh Châu (SV002) đã đăng ký đề tài [DT002]. Trạng thái: Đã duyệt đăng ký.'],
        ['seed-staff-3', 'registration.created', 'staff', '📝 Sinh viên nộp hồ sơ đăng ký đề tài', 'Sinh viên Trần Quốc Đạt (SV003) vừa đăng ký đề tài [DT006]. Trạng thái: Chờ duyệt.'],

        // Thông báo cho Quản trị viên
        ['seed-admin-1', 'user.registered', 'admin', '🛡️ Quản trị hệ thống', 'Hệ thống đã đồng bộ toàn bộ dịch vụ SOA (Auth, Student, Topic, Registration, Notification).'],

        // Thông báo chào mừng & phân công cho các Giảng viên GV001 - GV010
        ['seed-gv-1a', 'user.registered', 'user:GV001', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào TS. Nguyễn Thanh Bình (GV001). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.'],
        ['seed-gv-1b', 'topic.created', 'user:GV001', '📌 Phân công hướng dẫn đề tài tốt nghiệp', 'Quý Thầy/Cô đã được phân công phụ trách đề tài [DT001], [DT002], [DT005] thuộc chuyên ngành Công nghệ phần mềm.'],
        ['seed-gv-1c', 'registration.created', 'user:GV001', '📝 Sinh viên đăng ký lớp học phần của bạn', 'Sinh viên Vũ Đức Hiếu (SV001) đã đăng ký đề tài [DT001]. Bạn đã duyệt và chấm điểm đạt 9.5/10.'],

        ['seed-gv-2a', 'user.registered', 'user:GV002', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào ThS. Trần Thị Mai (GV002). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.'],
        ['seed-gv-2b', 'topic.created', 'user:GV002', '📌 Phân công hướng dẫn đề tài tốt nghiệp', 'Quý Thầy/Cô đã được phân công phụ trách đề tài [DT006], [DT007], [DT009] thuộc chuyên ngành Hệ thống thông tin.'],
        ['seed-gv-2c', 'registration.created', 'user:GV002', '📝 Sinh viên đăng ký lớp học phần của bạn', 'Sinh viên Trần Quốc Đạt (SV003) vừa nộp hồ sơ đăng ký đề tài [DT006]. Vui lòng truy cập mục "Duyệt sinh viên đăng ký" để xem xét.'],

        ['seed-gv-3a', 'user.registered', 'user:GV003', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào TS. Vũ Thị Phương (GV003). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng đào tạo QNU (Bộ môn Trí tuệ nhân tạo).'],
        ['seed-gv-3b', 'topic.created', 'user:GV003', '📌 Phân công hướng dẫn đề tài tốt nghiệp', 'Quý Thầy/Cô đã được phân công phụ trách đề tài [DT010], [DT011], [DT012] thuộc chuyên ngành Trí tuệ nhân tạo.'],

        ['seed-gv-4a', 'user.registered', 'user:GV004', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào PGS.TS. Lê Văn Hoàng (GV004). Tài khoản giảng viên hướng dẫn của Quý Thầy/Cô đã được kích hoạt trên Cổng quản trị đào tạo QNU.'],
        ['seed-gv-4b', 'topic.created', 'user:GV004', '📌 Phân công hướng dẫn đề tài tốt nghiệp', 'Quý Thầy/Cô đã được phân công phụ trách đề tài [DT013], [DT017] thuộc chuyên ngành Khoa học máy tính.'],

        ['seed-gv-5', 'user.registered', 'user:GV005', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào ThS. Phạm Quốc Tuấn (GV005). Bạn được phân công phụ trách đề tài [DT015], [DT016] Mạng máy tính & ATTT.'],
        ['seed-gv-6', 'user.registered', 'user:GV006', '🎉 Kích hoạt tài khoản Giảng viên thành công!', 'Xin chào TS. Vũ Hải Đăng (GV006). Tài khoản giảng viên của Quý Thầy/Cô đã được kích hoạt trên hệ thống đào tạo QNU.'],

        // Thông báo cho Sinh viên
        ['seed-sv-1', 'registration.status_changed', 'user:SV001', '🎉 Điểm số đồ án tốt nghiệp chính thức', 'Đề tài [DT001] "Xây dựng hệ thống quản lý đào tạo theo kiến trúc SOA" của bạn đã được giảng viên TS. Nguyễn Thanh Bình chấm 9.5 / 10 điểm.'],
        ['seed-sv-2', 'registration.status_changed', 'user:SV002', '✅ Đã duyệt đăng ký đề tài tốt nghiệp', 'Đăng ký đề tài [DT002] "Ứng dụng AI điểm danh sinh viên" của bạn đã được duyệt thành công.'],
        ['seed-sv-3', 'registration.created', 'user:SV003', '📝 Đã ghi nhận đăng ký đề tài', 'Hồ sơ đăng ký đề tài [DT006] của bạn đã gửi đến ThS. Trần Thị Mai. Vui lòng chờ xét duyệt.']
    ];

    for (const n of seedNotifs) {
        await conn.query(
            'INSERT INTO notifications (event_id, topic, audience, title, message, is_read) VALUES (?, ?, ?, ?, ?, 0)',
            n
        );
    }
    console.log(`✅ [soa_notification] Đã nạp ${seedNotifs.length} thông báo mẫu sạch sẽ, thực tế`);

    await conn.end();
    console.log('🎉 Hoàn tất dọn dẹp và chuẩn hóa dữ liệu mẫu toàn hệ thống QNU SOA!');
}

main().catch((err) => {
    console.error('❌ Lỗi:', err);
    process.exit(1);
});

