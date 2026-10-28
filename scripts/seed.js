// Nạp 20 đề tài mẫu chuẩn QNU (SOA GRADUATION SYSTEM)
require('../shared/env');
const BASE = process.env.GATEWAY_URL || `http://localhost:${process.env.GATEWAY_PORT || 3000}`;

async function call(method, path, body, token) {
    const res = await fetch(BASE + path, {
        method,
        headers: {
            'content-type': 'application/json',
            ...(token ? { authorization: 'Bearer ' + token } : {})
        },
        body: body ? JSON.stringify(body) : undefined
    });
    return { status: res.status, json: await res.json().catch(() => ({})) };
}

(async () => {
    console.log('--- KHỞI TẠO 20 DỮ LIỆU ĐỀ TÀI & TÀI KHOẢN MẪU QNU (SOA) ---');

    // 1. Đăng nhập Admin
    const adminUser = process.env.ADMIN_USERNAME || 'admin';
    const adminPass = process.env.ADMIN_PASSWORD || '123456';
    const login = await call('POST', '/api/auth/login', { TenDangNhap: adminUser, MatKhau: adminPass });
    if (!login.json.token) {
        console.error('Không đăng nhập được admin:', login.json.message);
        process.exit(1);
    }
    const T = login.json.token;

    const put = async (label, method, path, body) => {
        const r = await call(method, path, body, T);
        console.log(`${r.status === 409 ? '=' : r.status < 300 ? '+' : '!'} ${label}${r.status >= 300 && r.status !== 409 ? ' -> ' + (r.json.message || r.status) : ''}`);
        return r;
    };

    // 2. Tạo tài khoản người dùng
    const users = [
        { TenDangNhap: 'gv01', MatKhau: '123456', HoTen: 'TS. Nguyễn Thanh Bình', Email: 'binhnt@qnu.edu.vn', VaiTro: 'giangvien', Nganh: 'Công nghệ phần mềm' },
        { TenDangNhap: 'gv02', MatKhau: '123456', HoTen: 'ThS. Trần Thị Mai', Email: 'maitt@qnu.edu.vn', VaiTro: 'giangvien', Nganh: 'Hệ thống thông tin' },
        { TenDangNhap: 'gv03', MatKhau: '123456', HoTen: 'TS. Vũ Thị Phương', Email: 'phuongvt@qnu.edu.vn', VaiTro: 'giangvien', Nganh: 'Trí tuệ nhân tạo' },
        { TenDangNhap: 'gv04', MatKhau: '123456', HoTen: 'PGS.TS. Lê Văn Hoàng', Email: 'hoanglv@qnu.edu.vn', VaiTro: 'giangvien', Nganh: 'Khoa học máy tính' },
        { TenDangNhap: 'gv05', MatKhau: '123456', HoTen: 'ThS. Phạm Quốc Tuấn', Email: 'tuanpq@qnu.edu.vn', VaiTro: 'giangvien', Nganh: 'Mạng máy tính & An toàn thông tin' },
        { TenDangNhap: 'SV001', MatKhau: '123456', HoTen: 'Vũ Đức Hiếu', Email: 'hieuvd@qnu.edu.vn', VaiTro: 'sinhvien', MaSV: 'SV001', Nganh: 'Công nghệ phần mềm' },
        { TenDangNhap: 'SV002', MatKhau: '123456', HoTen: 'Lê Minh Châu', Email: 'chaulm@qnu.edu.vn', VaiTro: 'sinhvien', MaSV: 'SV002', Nganh: 'Công nghệ phần mềm' },
        { TenDangNhap: 'SV003', MatKhau: '123456', HoTen: 'Trần Quốc Đạt', Email: 'dattq@qnu.edu.vn', VaiTro: 'sinhvien', MaSV: 'SV003', Nganh: 'Hệ thống thông tin' },
        { TenDangNhap: 'SV004', MatKhau: '123456', HoTen: 'Nguyễn Thị Bích', Email: 'bichnt@qnu.edu.vn', VaiTro: 'sinhvien', MaSV: 'SV004', Nganh: 'Công nghệ phần mềm' },
        { TenDangNhap: 'SV005', MatKhau: '123456', HoTen: 'Phạm Văn Nam', Email: 'nampv@qnu.edu.vn', VaiTro: 'sinhvien', MaSV: 'SV005', Nganh: 'Khoa học máy tính' }
    ];
    for (const u of users) await put(`Tài khoản ${u.TenDangNhap} (${u.VaiTro})`, 'POST', '/api/auth/register', u);

    // 3. Sinh viên
    const students = [
        { MaSV: 'SV001', HoTen: 'Vũ Đức Hiếu', Email: 'hieuvd@qnu.edu.vn', Lop: 'DHKTPM20', Nganh: 'Công nghệ phần mềm', GPA: 3.45, MonDaHoc: 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm, Lập trình Web, Kiến trúc phần mềm', SoTCTichLuy: 122 },
        { MaSV: 'SV002', HoTen: 'Lê Minh Châu', Email: 'chaulm@qnu.edu.vn', Lop: 'DHKTPM20', Nganh: 'Công nghệ phần mềm', GPA: 3.10, MonDaHoc: 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Kiến trúc máy tính, Kỹ thuật phần mềm, Kiến trúc phần mềm', SoTCTichLuy: 112 },
        { MaSV: 'SV003', HoTen: 'Trần Quốc Đạt', Email: 'dattq@qnu.edu.vn', Lop: 'DHHTTT20', Nganh: 'Hệ thống thông tin', GPA: 2.85, MonDaHoc: 'Giải tích, Đại số tuyến tính, Lập trình căn bản, Cơ sở dữ liệu, Phân tích thiết kế HTTT', SoTCTichLuy: 105 },
        { MaSV: 'SV004', HoTen: 'Nguyễn Thị Bích', Email: 'bichnt@qnu.edu.vn', Lop: 'DHKTPM21', Nganh: 'Công nghệ phần mềm', GPA: 2.20, MonDaHoc: 'Giải tích, Lập trình căn bản', SoTCTichLuy: 65 },
        { MaSV: 'SV005', HoTen: 'Phạm Văn Nam', Email: 'nampv@qnu.edu.vn', Lop: 'DHKHMT20', Nganh: 'Khoa học máy tính', GPA: 3.35, MonDaHoc: 'Giải tích, Đại số tuyến tính, Cấu trúc dữ liệu & giải thuật, Học máy, Trí tuệ nhân tạo', SoTCTichLuy: 118 }
    ];
    for (const s of students) {
        const r = await put(`Sinh viên ${s.MaSV} - ${s.HoTen}`, 'POST', '/api/students', s);
        if (r.status === 409) await put(`Cập nhật SV ${s.MaSV}`, 'PUT', `/api/students/${s.MaSV}`, s);
    }

    // 4. 20 ĐỀ TÀI / LỚP HỌC PHẦN TỐT NGHIỆP ĐA DẠNG NGÀNH VÀ GIẢNG VIÊN
    const topics = [
        {
            MaDT: 'DT001',
            TenDT: 'Xây dựng hệ thống quản lý đào tạo & đồ án theo kiến trúc SOA',
            MoTa: 'Thiết kế kiến trúc hướng dịch vụ độc lập, loose coupling, event-driven, registry & gateway',
            GiangVienHuongDan: 'TS. Nguyễn Thanh Bình',
            MaGV: 'gv01',
            Nganh: 'Công nghệ phần mềm',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Cơ sở dữ liệu, Kiến trúc phần mềm',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.50
        },
        {
            MaDT: 'DT002',
            TenDT: 'Ứng dụng Trí tuệ nhân tạo nhận diện khuôn mặt điểm danh sinh viên',
            MoTa: 'Mô hình học sâu kết hợp xử lý thị giác máy tính và camera giám sát trường học',
            GiangVienHuongDan: 'TS. Nguyễn Thanh Bình',
            MaGV: 'gv01',
            Nganh: 'Công nghệ phần mềm',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Cơ sở dữ liệu, Kỹ thuật phần mềm',
            GioiHanSV: 4,
            DiemGPAToiThieu: 2.80
        },
        {
            MaDT: 'DT003',
            TenDT: 'Xây dựng ứng dụng di động hỗ trợ quản lý học tập và rèn luyện sinh viên QNU',
            MoTa: 'Ứng dụng Flutter/React Native kết hợp hệ thống API Backend đồng bộ dữ liệu đào tạo',
            GiangVienHuongDan: 'ThS. Hoàng Văn Em',
            MaGV: 'gv01',
            Nganh: 'Công nghệ phần mềm',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Lập trình thiết bị di động, Cơ sở dữ liệu',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.50
        },
        {
            MaDT: 'DT004',
            TenDT: 'Phát triển nền tảng học trực tuyến E-learning tích hợp Microservices',
            MoTa: 'Hệ thống học tập trực tuyến, livestream bài giảng và chấm điểm trắc nghiệm tự động',
            GiangVienHuongDan: 'ThS. Lê Minh Triết',
            MaGV: 'gv01',
            Nganh: 'Công nghệ phần mềm',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Lập trình Web, Kiến trúc phần mềm',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.60
        },
        {
            MaDT: 'DT005',
            TenDT: 'Hệ thống kiểm thử tự động CI/CD cho dự án phần mềm doanh nghiệp',
            MoTa: 'Tích hợp Docker, Kubernetes, Jenkins và SonarQube kiểm tra chất lượng mã nguồn',
            GiangVienHuongDan: 'TS. Nguyễn Thanh Bình',
            MaGV: 'gv01',
            Nganh: 'Công nghệ phần mềm',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Kiểm thử phần mềm, Kỹ thuật phần mềm',
            GioiHanSV: 2,
            DiemGPAToiThieu: 2.70
        },
        {
            MaDT: 'DT006',
            TenDT: 'Hệ thống hỗ trợ ra quyết định & phân tích dữ liệu học tập sinh viên',
            MoTa: 'Kho dữ liệu và phân tích dữ liệu đào tạo trường Đại học',
            GiangVienHuongDan: 'ThS. Trần Thị Mai',
            MaGV: 'gv02',
            Nganh: 'Hệ thống thông tin',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Cơ sở dữ liệu, Phân tích thiết kế HTTT',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.50
        },
        {
            MaDT: 'DT007',
            TenDT: 'Xây dựng cổng thanh toán học phí trực tuyến liên ngân hàng',
            MoTa: 'Hệ thống thanh toán bảo mật chuẩn PCI-DSS, kết nối cổng thanh toán VNPay / Momo',
            GiangVienHuongDan: 'ThS. Trần Thị Mai',
            MaGV: 'gv02',
            Nganh: 'Hệ thống thông tin',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Cơ sở dữ liệu, An toàn thông tin',
            GioiHanSV: 2,
            DiemGPAToiThieu: 2.60
        },
        {
            MaDT: 'DT008',
            TenDT: 'Hệ thống hoạch định nguồn lực doanh nghiệp ERP cho chuỗi cung ứng',
            MoTa: 'Phần mềm ERP quản trị kho vận, đơn hàng, hóa đơn điện tử cho doanh nghiệp sản xuất',
            GiangVienHuongDan: 'PGS.TS. Trịnh Xuân Dũng',
            MaGV: 'gv02',
            Nganh: 'Hệ thống thông tin',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Phân tích thiết kế HTTT, Cơ sở dữ liệu',
            GioiHanSV: 4,
            DiemGPAToiThieu: 2.50
        },
        {
            MaDT: 'DT009',
            TenDT: 'Xây dựng hệ thống quản lý thông tin bệnh viện số (Hospital HIS)',
            MoTa: 'Quản trị hồ sơ bệnh án điện tử, tiếp nhận bệnh nhân, viện phí và đơn thuốc',
            GiangVienHuongDan: 'ThS. Trần Thị Mai',
            MaGV: 'gv02',
            Nganh: 'Hệ thống thông tin',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Cơ sở dữ liệu, Phân tích thiết kế HTTT',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.50
        },
        {
            MaDT: 'DT010',
            TenDT: 'Nghiên cứu mô hình ngôn ngữ lớn (LLM) hỗ trợ tư vấn tuyển sinh đại học',
            MoTa: 'Xây dựng Chatbot RAG dựa trên Llama/GPT tích hợp cơ sở tri thức tuyển sinh QNU',
            GiangVienHuongDan: 'TS. Vũ Thị Phương',
            MaGV: 'gv03',
            Nganh: 'Trí tuệ nhân tạo',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Học máy, Xử lý ngôn ngữ tự nhiên',
            GioiHanSV: 2,
            DiemGPAToiThieu: 3.00
        },
        {
            MaDT: 'DT011',
            TenDT: 'Ứng dụng Deep Learning phát hiện sớm bệnh cây trồng qua ảnh lá',
            MoTa: 'Mô hình CNN phát hiện sâu bệnh trên cây xoài và lúa tại khu vực Nam Trung Bộ',
            GiangVienHuongDan: 'TS. Vũ Thị Phương',
            MaGV: 'gv03',
            Nganh: 'Trí tuệ nhân tạo',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Thị giác máy tính, Học máy',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.80
        },
        {
            MaDT: 'DT012',
            TenDT: 'Phát hiện gian lận thi cử trực tuyến sử dụng thị giác máy tính',
            MoTa: 'Theo dõi cử chỉ mắt, tư thế ngồi và phát hiện tài liệu lạ trong phòng thi online',
            GiangVienHuongDan: 'TS. Vũ Thị Phương',
            MaGV: 'gv03',
            Nganh: 'Trí tuệ nhân tạo',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Thị giác máy tính, Cấu trúc dữ liệu & giải thuật',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.90
        },
        {
            MaDT: 'DT013',
            TenDT: 'Tối ưu hóa lập lịch xe buýt đô thị dựa trên thuật toán di truyền',
            MoTa: 'Thuật toán Genetic Algorithm giải bài toán định tuyến và phân bổ chuyến xe buýt thông minh',
            GiangVienHuongDan: 'PGS.TS. Lê Văn Hoàng',
            MaGV: 'gv04',
            Nganh: 'Khoa học máy tính',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Cấu trúc dữ liệu & giải thuật, Trí tuệ nhân tạo',
            GioiHanSV: 2,
            DiemGPAToiThieu: 2.80
        },
        {
            MaDT: 'DT014',
            TenDT: 'Xây dựng Data Warehouse & Dashboard phân tích hiệu quả kinh doanh',
            MoTa: 'Mô hình dữ liệu hình sao (Star Schema), ETL pipeline và trực quan hóa PowerBI',
            GiangVienHuongDan: 'TS. Đỗ Ngọc Hùng',
            MaGV: 'gv04',
            Nganh: 'Kỹ thuật dữ liệu',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Cơ sở dữ liệu, Khai phá dữ liệu',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.70
        },
        {
            MaDT: 'DT015',
            TenDT: 'Hệ thống giám sát và phát hiện xâm nhập mạng nội bộ (IDS/IPS)',
            MoTa: 'Phân tích gói tin mạng thời gian thực, phát hiện tấn công DDoS và mã độc',
            GiangVienHuongDan: 'ThS. Phạm Quốc Tuấn',
            MaGV: 'gv05',
            Nganh: 'Mạng máy tính & An toàn thông tin',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Mạng máy tính, An toàn thông tin',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.60
        },
        {
            MaDT: 'DT016',
            TenDT: 'Ứng dụng công nghệ Blockchain trong xác thực văn bằng và chứng chỉ số',
            MoTa: 'Smart Contract Ethereum / Polygon lưu trữ hash văn bằng tốt nghiệp chống làm giả',
            GiangVienHuongDan: 'ThS. Phạm Quốc Tuấn',
            MaGV: 'gv05',
            Nganh: 'Mạng máy tính & An toàn thông tin',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Mật mã học, An toàn thông tin',
            GioiHanSV: 2,
            DiemGPAToiThieu: 2.80
        },
        {
            MaDT: 'DT017',
            TenDT: 'Hệ thống IoT quan trắc môi trường và cảnh báo mưa lũ tại Bình Định',
            MoTa: 'Cảm biến mực nước, nhiệt độ kết nối mạng truyền thông LoRaWAN gửi dữ liệu đám mây',
            GiangVienHuongDan: 'PGS.TS. Lê Văn Hoàng',
            MaGV: 'gv04',
            Nganh: 'Khoa học máy tính',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Hệ thống nhúng và IoT, Mạng máy tính',
            GioiHanSV: 4,
            DiemGPAToiThieu: 2.50
        },
        {
            MaDT: 'DT018',
            TenDT: 'Phần mềm mô phỏng thí nghiệm vật lý ảo hỗ trợ dạy học trực quan',
            MoTa: 'Mô phỏng 3D cơ học và quang học tương tác cho học sinh trung học phổ thông',
            GiangVienHuongDan: 'TS. Nguyễn Thị Lan',
            MaGV: 'gv01',
            Nganh: 'Sư phạm Tin học',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Lập trình đồ họa, Phương pháp dạy học Tin học',
            GioiHanSV: 3,
            DiemGPAToiThieu: 2.50
        },
        {
            MaDT: 'DT019',
            TenDT: 'Xây dựng mô hình dự báo biến động giá nông sản sử dụng Time Series',
            MoTa: 'Mô hình chuỗi thời gian ARIMA kết hợp LSTM dự báo giá lúa và tiêu xuất khẩu',
            GiangVienHuongDan: 'TS. Nguyễn Thị Lan',
            MaGV: 'gv01',
            Nganh: 'Toán ứng dụng',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Xác suất thống kê, Đại số tuyến tính',
            GioiHanSV: 2,
            DiemGPAToiThieu: 2.70
        },
        {
            MaDT: 'DT020',
            TenDT: 'Nền tảng chuyển đổi số du lịch Quy Nhơn tích hợp bản đồ số thực tế ảo (VR 360)',
            MoTa: 'Bản đồ số định vị điểm đến, tour du lịch ảo 360 độ và hệ thống đặt vé tham quan',
            GiangVienHuongDan: 'ThS. Hoàng Văn Em',
            MaGV: 'gv01',
            Nganh: 'Công nghệ phần mềm',
            SoTinChi: 10,
            HocKy: 'Học kỳ 1 (Niên khóa 2022 - 2026)',
            MonBatBuoc: 'Lập trình Web, Thiết kế giao diện UI/UX',
            GioiHanSV: 4,
            DiemGPAToiThieu: 2.50
        }
    ];

    for (const t of topics) {
        const r = await put(`Đề tài ${t.MaDT} - ${t.TenDT.substring(0, 32)}...`, 'POST', '/api/topics', t);
        if (r.status === 409) await put(`Cập nhật ${t.MaDT}`, 'PUT', `/api/topics/${t.MaDT}`, t);
    }

    // 5. Đăng ký mẫu
    await put('Đăng ký SV001 - DT001 (Đã duyệt)', 'POST', '/api/registrations', {
        MaSV: 'SV001',
        MaDT: 'DT001',
        TrangThai: 'Da duyet',
        Diem: 9.5,
        NhanXet: 'Đồ án hoàn thành xuất sắc kiến trúc SOA, loose coupling và fault tolerance.'
    });

    await put('Đăng ký SV002 - DT002 (Chờ duyệt)', 'POST', '/api/registrations', {
        MaSV: 'SV002',
        MaDT: 'DT002',
        TrangThai: 'Cho duyet'
    });

    console.log('\n--- 20 ĐỀ TÀI & DỮ LIỆU ĐÃ SẴN SÀNG! ---');
})().catch((e) => {
    console.error('Seed lỗi:', e.message);
    process.exit(1);
});
