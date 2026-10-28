# Hệ thống Quản lý Đồ án Tốt nghiệp – Kiến trúc Hướng Dịch Vụ (SOA)
## Giao diện chuẩn Cổng thông tin đào tạo Đại học Quy Nhơn (daotao.qnu.edu.vn)

Hệ thống được thiết kế theo đúng chuẩn **Kiến trúc Hướng dịch vụ (SOA - Service-Oriented Architecture)** với tính năng **giảm thiểu tối đa sự phụ thuộc (Loose Coupling & Fault Tolerance)**:
- Mỗi dịch vụ chạy trên một **tiến trình Express riêng biệt**, sử dụng **cơ sở dữ liệu MySQL độc lập** (`soa_auth`, `soa_student`, `soa_topic`, `soa_registration`, `soa_notification`).
- Giao tiếp đồng bộ qua **REST / JSON** và bất đồng bộ qua **Event Bus**.
- Tự động dò tìm động và cân bằng tải qua **Service Registry (:3500)**.
- Kiểm soát truy cập tập trung tại **API Gateway (:3000)** với cơ chế nạp chính sách động (`config/policies.json`).
- Nếu 1 client service (ví dụ `student-service` hoặc `registration-service`) bị tạm dừng/sập, các phân hệ khác trên giao diện web **vẫn hoạt động bình thường** nhờ chế độ **Degraded Mode** và cơ chế chịu lỗi từng phần.

---

## 1. Phân quyền và Tính năng chính

### A. Sinh viên (sinhvien)
- **Đăng nhập:** Giao diện đăng nhập chuẩn trang `daotao.qnu.edu.vn/Login` (Ảnh mẫu 1) với nền cổng trường Đại học Quy Nhơn, khung đăng nhập đỏ đặc trưng, hỗ trợ đăng nhập nhanh tài khoản demo.
- **Trang cá nhân:** Xem thông tin học vụ, điểm GPA tích lũy, số tín chỉ đã đạt, danh sách các môn bắt buộc khóa trước đã hoàn thành.
- **Chương trình đào tạo:** Bảng danh mục học phần chuẩn QNU (Ảnh mẫu 2) với các khối kiến thức Bắt buộc (18 TC), Học kỳ 1 (20 TC) và Đồ án tốt nghiệp (10 TC).
- **Đăng ký đề tài tốt nghiệp / lớp học phần:**
  - Lọc theo chuyên ngành đào tạo (Công nghệ phần mềm, Hệ thống thông tin,...).
  - Tự động kiểm tra điều kiện tiên quyết: Môn bắt buộc khóa trước, Điểm GPA tối thiểu, Số lượng chỉ tiêu còn lại của đề tài.
  - Khi sinh viên bấm đăng ký, hệ thống tạo bản ghi với trạng thái **"Chờ duyệt"**.
  - Theo dõi tiến trình phê duyệt của Giảng viên hướng dẫn: chuyển từ **"Chờ duyệt"** sang **"Đã duyệt đăng ký"** (hoặc "Từ chối" kèm lý do).
  - Có thể hủy đăng ký khi còn ở trạng thái "Chờ duyệt" để đổi sang đề tài khác.
- **Xem điểm & Kết quả học tập:** Xem điểm số (thang 10), điểm chữ (A, B+, B...), xếp loại kết quả và nhận xét đánh giá chi tiết từ giảng viên.
- **Nhận thông báo tự động (Event Bus):** Nhận thông báo thời gian thực khi đăng ký thành công, khi giảng viên phê duyệt/từ chối, và khi đã có điểm chấm.

### B. Giảng viên / Giáo viên (giangvien)
- **Tạo & Quản lý lớp học phần / đề tài tốt nghiệp:**
  - Phân loại theo chuyên ngành giảng dạy (Công nghệ phần mềm, Hệ thống thông tin, Khoa học máy tính,...).
  - Tùy chỉnh **môn học bắt buộc khóa trước (Prerequisites)**: sinh viên phải học xong mới được đăng ký.
  - Tùy chỉnh **số lượng giới hạn sinh viên đăng ký (Max capacity)**.
  - Tùy chỉnh **điểm GPA tối thiểu để học (Min GPA requirement)**.
  - Bật/tắt mở đăng ký học phần.
- **Duyệt sinh viên đăng ký:**
  - Xem danh sách sinh viên đăng ký lớp học phần ở trạng thái "Chờ duyệt".
  - Xem hồ sơ học tập của sinh viên (GPA, các môn đã học, lớp).
  - Thao tác: **"Duyệt đăng ký"** (chuyển sang trạng thái "Đã duyệt đăng ký") hoặc **"Từ chối"** kèm lý do.
- **Chấm điểm kết quả học tập:**
  - Nhập điểm số (0.00 - 10.00) và nhận xét đánh giá chuyên môn cho sinh viên đã được duyệt.
  - Khi lưu điểm, hệ thống tự động phát sự kiện qua Event Bus thông báo ngay lập tức cho sinh viên.

### C. Quản trị viên (admin)
- Quản lý toàn bộ tài khoản người dùng, phân quyền vai trò (`admin`, `giangvien`, `sinhvien`).
- Quản lý hồ sơ sinh viên toàn trường, cập nhật GPA, lớp học, môn đã học.
- Quản lý chính sách bảo mật API Gateway (`config/policies.json`).
- Giám sát sức khỏe kiến trúc SOA: Service Registry, Event Bus metrics, và kiểm thử tính chịu lỗi (Fault Tolerance).

---

## 2. Tài khoản thử nghiệm (Demo Accounts)

Mật khẩu mặc định cho tất cả tài khoản là: `123456`

| Tài khoản | Mật khẩu | Họ và tên | Vai trò | Chuyên ngành |
|---|---|---|---|---|
| `SV001` | `123456` | Vũ Đức Hiếu | Sinh viên | Công nghệ phần mềm (GPA 3.45) |
| `SV002` | `123456` | Lê Minh Châu | Sinh viên | Công nghệ phần mềm (GPA 3.10) |
| `SV003` | `123456` | Trần Quốc Đạt | Sinh viên | Hệ thống thông tin (GPA 2.85) |
| `SV004` | `123456` | Nguyễn Thị Bích | Sinh viên | Công nghệ phần mềm (GPA 2.20 - thử nghiệm GPA thấp) |
| `gv01` | `123456` | TS. Nguyễn Thanh Bình | Giảng viên | Công nghệ phần mềm |
| `gv02` | `123456` | ThS. Trần Thị Mai | Giảng viên | Hệ thống thông tin |
| `admin` | `123456` | Quản trị viên hệ thống | Quản trị viên | Toàn trường |

---

## 3. Hướng dẫn cài đặt và Chạy hệ thống

### Yêu cầu môi trường:
- **Node.js ≥ 18**
- **MySQL** đang chạy (XAMPP / MySQL Server trên cổng 3306)

### Khởi chạy:
```bash
# 1. Cài đặt các gói phụ thuộc (nếu chưa cài)
npm install

# 2. Khởi động toàn bộ các dịch vụ SOA (Registry, Event Bus, 5 Services, Gateway)
npm start
```

Mở trình duyệt: **http://localhost:3000**
Tài liệu OpenAPI tổng hợp: **http://localhost:3000/api-docs**

### Nạp lại dữ liệu mẫu (Seed):
Khi hệ thống đang chạy (`npm start`), mở một terminal mới:
```bash
npm run seed
```

---

## 4. Kiểm thử tự động (Test Suites)

- **Kiểm thử hạ tầng SOA (Unit / Mock Infrastructure):**
  ```bash
  npm test
  ```
  *(13/13 bài test kiểm tra Service Discovery, RBAC, Rate Limiting, Round-robin Load Balancing, Circuit Breaker, Service Composition)*

- **Kiểm thử đầu-cuối tích hợp (E2E Integration Test):**
  ```bash
  npm run test:e2e
  ```
  *(15/15 bài test kiểm tra luồng nghiệp vụ trên hệ thống thật với MySQL)*

---

## 5. Đặc tính Giảm sự phụ thuộc (Loose Coupling & Fault Tolerance) trong SOA

Hệ thống đáp ứng trọn vẹn yêu cầu *"nếu 1 client service bị sập thì các trang khác vẫn có thể hoạt động"*:
1. **Cô lập Database (Database-per-service):** Không có Foreign Key hoặc JOIN chéo giữa các database `soa_auth`, `soa_student`, `soa_topic`, `soa_registration`, `soa_notification`.
2. **Giao tiếp qua Service Discovery:** Các dịch vụ không hardcode địa chỉ URL của nhau; định tuyến động qua Service Registry (:3500).
3. **Cơ chế Chế độ suy giảm (Degraded Mode):** Khi `student-service` hoặc `topic-service` gián đoạn, `registration-service` dùng `Promise.allSettled` để trả về danh sách đăng ký hiện tại kèm cờ `X-Degraded: true` thay vì gây lỗi 500.
4. **Phía Giao diện Web (Resilient Frontend):** Mỗi phân hệ thực hiện gọi API độc lập. Nếu một dịch vụ trả về 503, giao diện chỉ hiển thị banner cảnh báo cục bộ bên trong phân hệ đó, đồng thời người dùng vẫn có thể thao tác bình thường trên tất cả các trang và phân hệ còn lại.
