# Quản Lý Quỹ Lớp (Class Fund Manager)

Ứng dụng web quản lý thu chi quỹ lớp học đơn giản, minh bạch và tiện dụng, được xây dựng theo kiến trúc Monorepo phân tách rõ ràng giữa Frontend (`apps/web`) và Backend (`apps/api`).

---

## 1. Mục tiêu và Phạm vi MVP

- **Mục tiêu:** Giúp ban cán sự (lớp trưởng, thủ quỹ) và toàn thể thành viên lớp học theo dõi số dư quỹ, các đợt đóng quỹ và lịch sử chi tiêu một cách minh bạch, trực quan mà không bị phức tạp như các phần mềm kế toán doanh nghiệp.
- **Phạm vi MVP:**
  - Hỗ trợ **1 lớp, 1 quỹ duy nhất, đơn vị tiền tệ VND (số nguyên)**.
  - **2 vai trò chính:**
    - `ADMIN`: Tạo đợt thu quỹ, xác nhận thành viên đã đóng tiền, ghi nhận các khoản thu ngoài / chi tiêu, quản lý danh sách thành viên.
    - `MEMBER`: Xem số dư quỹ, theo dõi trạng thái đóng quỹ của cá nhân và danh sách đóng tiền công khai của cả lớp, xem sổ thu chi minh bạch kèm chứng từ; không thể sửa dữ liệu tài chính.
  - **Quy tắc tài chính cốt lõi:**
    - $\text{Số dư quỹ} = \sum(\text{Giao dịch THU}) - \sum(\text{Giao dịch CHI})$.
    - Xác nhận đóng quỹ được thực hiện trong database transaction: tạo bản ghi `Payment` và giao dịch `Transaction` (INCOME), có ràng buộc `@@unique([collectionId, memberId])` chống xác nhận trùng.
    - Chặn ghi nhận khoản chi nếu số tiền chi vượt quá số dư hiện có.
    - Không xóa cứng (`hard-delete`) lịch sử giao dịch và tài chính.

---

## 2. Công nghệ sử dụng (Stack)

- **Monorepo:** npm workspaces.
- **Frontend (`apps/web`):**
  - React 19, TypeScript, Vite 8.
  - Styling: Tailwind CSS v4 (`@tailwindcss/vite`).
  - Router: Hash Router linh hoạt.
  - API Client: Fetch API tập trung, hỗ trợ credentials (HttpOnly cookie), chống CSRF.
- **Backend (`apps/api`):**
  - Node.js, Express, TypeScript.
  - Database & ORM: PostgreSQL + Prisma ORM.
  - Validation: Zod.
  - Authentication: JWT lưu trong cookie `HttpOnly`, `SameSite: 'lax'`, kèm rate-limiting và mã hóa mật khẩu `bcrypt`.
  - Testing: Vitest & Supertest.
- **Cơ sở dữ liệu Local:** Docker Compose (PostgreSQL 16).

---

## 3. Cấu trúc thư mục

```
class-fund-manager/
├── apps/
│   ├── web/                     # Ứng dụng Frontend (React + Vite)
│   │   ├── src/
│   │   │   ├── components/      # Shell layout, UI components, Modal, Form
│   │   │   ├── lib/             # API client, Auth store, format, router
│   │   │   ├── pages/           # Dashboard, Collections, Ledger, Members, Login
│   │   │   ├── App.tsx
│   │   │   └── main.tsx
│   │   ├── public/
│   │   ├── .env.example
│   │   ├── package.json
│   │   └── vite.config.ts
│   └── api/                     # Ứng dụng Backend API (Express + Prisma)
│       ├── src/
│       │   ├── config/          # Đọc & validate biến môi trường (Zod)
│       │   ├── lib/             # Prisma client, Auth JWT/Bcrypt, Logger
│       │   ├── middleware/      # Auth, CSRF, Rate-limit, Error, Validation
│       │   ├── modules/
│       │   │   ├── auth/        # Login, Logout, Me
│       │   │   ├── members/     # Danh sách & quản lý thành viên
│       │   │   ├── collections/ # Đợt thu quỹ & Xác nhận đóng tiền
│       │   │   ├── transactions/# Thu chi, số dư & ghi nhận khoản chi
│       │   │   └── dashboard/   # Dữ liệu tổng hợp trang chủ
│       │   ├── app.ts           # Cấu hình Express, Middleware & Routes
│       │   └── server.ts        # Entrypoint, Graceful shutdown
│       ├── prisma/
│       │   ├── schema.prisma    # Data models (User, Member, Collection, Payment, Transaction)
│       │   └── seed.ts          # Khởi tạo dữ liệu mẫu cho môi trường local
│       ├── tests/               # Unit test & Integration test (RBAC, Zod, Business rules)
│       ├── .env.example
│       └── package.json
├── compose.yaml                 # Docker Compose chạy PostgreSQL local
├── .env.example                 # Mẫu biến môi trường cấp root cho Docker
├── .gitignore                   # Quy tắc bỏ qua file nhạy cảm và build artifact
├── package.json                 # Cấu hình npm workspaces và script chạy toàn bộ dự án
└── README.md
```

---

## 4. Yêu cầu môi trường

- **Node.js:** `>= 20.x` (Đã kiểm thử thành công trên Node `v24.14.0`).
- **npm:** `>= 10.x` (Đã kiểm thử trên npm `11.9.0`).
- **Docker & Docker Compose:** Docker Desktop để chạy PostgreSQL local container.

---

## 5. Hướng dẫn cài đặt và Chạy Local

### Bước 1: Khởi tạo các file cấu hình môi trường (.env)

Tạo các file `.env` từ `.env.example` tương ứng:

```bash
# 1. Cấu hình Docker ở thư mục gốc:
copy .env.example .env

# 2. Cấu hình Backend API:
copy apps\api\.env.example apps\api\.env

# 3. Cấu hình Frontend Web:
copy apps\web\.env.example apps\web\.env
```

> **Lưu ý:** Trên Linux/macOS, dùng lệnh `cp` thay cho `copy`.

### Bước 2: Cài đặt dependencies

Từ thư mục gốc dự án:
```bash
npm install
```

### Bước 3: Khởi động cơ sở dữ liệu PostgreSQL qua Docker Compose

```bash
docker compose up -d
```
Container `class-fund-postgres` sẽ chạy ở cổng `5432` với cơ chế volume named `class-fund-pgdata` và healthcheck tự động.

### Bước 4: Tạo Prisma Client, Migration và Seed dữ liệu mẫu

```bash
# Tạo Prisma Client
npm run db:generate

# Tạo bảng trong database
npm run db:migrate

# Khởi tạo dữ liệu mẫu (chỉ dùng local)
npm run db:seed
```

### Bước 5: Chạy ứng dụng

Chạy đồng thời cả Frontend và Backend API:
```bash
npm run dev
```

Hoặc chạy từng ứng dụng riêng biệt nếu muốn:
```bash
# Chạy Backend (Cổng 4000)
npm run dev:api

# Chạy Frontend (Cổng 8443 hoặc 5173)
npm run dev:web
```

---

## 6. Địa chỉ truy cập & Kiểm tra hệ thống

- **Frontend App:** [http://localhost:8443](http://localhost:8443) (hoặc [http://localhost:5173](http://localhost:5173))
- **Backend API:** [http://localhost:4000/api](http://localhost:4000/api)
- **Health check & DB status:** [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## 7. Tài khoản Demo (Chỉ dùng trên Local)

Mật khẩu chung cho tất cả tài khoản demo local: `Matkhau@123`

| Vai trò | Email đăng nhập | Tên người dùng | Quyền hạn |
| :--- | :--- | :--- | :--- |
| **ADMIN (Lớp trưởng)** | `admin@lopse1902.edu.vn` | Nguyễn Minh Khôi | Toàn quyền quản lý đợt thu, ghi chi tiêu, xác nhận đóng, quản lý thành viên |
| **ADMIN (Thủ quỹ)** | `thuquy@lopse1902.edu.vn` | Trần Bảo Ngọc | Quản lý thu chi, xác nhận thanh toán, theo dõi số dư |
| **MEMBER (Thành viên)** | `anh.lh@lopse1902.edu.vn` | Lê Hoàng Anh | Xem số dư, theo dõi các khoản nợ của mình, xem lịch sử đóng tiền của cả lớp |
| **MEMBER (Thành viên)** | `ha.pt@lopse1902.edu.vn` | Phạm Thu Hà | Xem số dư, danh sách đợt thu, tình trạng đóng |

> ⚠️ **CẢNH BÁO BẢO MẬT:** Các tài khoản và mật khẩu trên được mã hóa bằng bcrypt chỉ phục vụ mục đích kiểm thử và phát triển trên máy cá nhân (`localhost`). Tuyệt đối không sử dụng thông tin đăng nhập và `JWT_SECRET` mẫu này trên môi trường Production!

---

## 8. Danh sách Scripts hữu ích

Tất cả các script sau đều chạy từ thư mục gốc dự án:

| Script | Mô tả |
| :--- | :--- |
| `npm run dev` | Chạy đồng thời cả Backend API và Frontend Web với log phân biệt màu |
| `npm run dev:api` | Chạy riêng Backend API với `tsx watch` |
| `npm run dev:web` | Chạy riêng Frontend Web với Vite |
| `npm run build` | Build production cho cả Backend (`tsc`) và Frontend (`vite build`) |
| `npm run typecheck` | Kiểm tra lỗi TypeScript cho toàn bộ monorepo |
| `npm run lint` | Kiểm tra định dạng code với `oxfmt` |
| `npm run test` | Chạy bộ kiểm thử tự động với `Vitest` |
| `npm run db:generate` | Tạo Prisma client |
| `npm run db:migrate` | Chạy migration Prisma |
| `npm run db:seed` | Nạp dữ liệu mẫu vào database local |

---

## 9. Các Endpoint API chính

Tất cả các API đều có tiền tố `/api`:

| Phương thức | Endpoint | Quyền hạn | Mô tả |
| :--- | :--- | :--- | :--- |
| `GET` | `/api/health` | Public | Kiểm tra trạng thái máy chủ và kết nối database |
| `POST` | `/api/auth/login` | Public | Đăng nhập (có rate-limit, trả cookie HttpOnly) |
| `POST` | `/api/auth/logout` | Public | Đăng xuất và xóa cookie xác thực |
| `GET` | `/api/auth/me` | Authenticated | Lấy thông tin tài khoản đang đăng nhập |
| `GET` | `/api/dashboard` | Authenticated | Dữ liệu tổng quan: số dư, tổng thu, tổng chi, việc cần làm |
| `GET` | `/api/collections` | Authenticated | Danh sách các đợt thu quỹ (kèm trạng thái cá nhân) |
| `GET` | `/api/collections/:id` | Authenticated | Chi tiết đợt thu và bảng trạng thái đóng tiền của cả lớp |
| `POST` | `/api/collections` | **ADMIN** | Tạo đợt đóng quỹ mới |
| `PATCH` | `/api/collections/:id/status` | **ADMIN** | Đóng hoặc mở lại đợt đóng quỹ |
| `POST` | `/api/collections/:id/payments` | **ADMIN** | Xác nhận thành viên đã đóng tiền (sinh giao dịch THU) |
| `GET` | `/api/transactions` | Authenticated | Sổ quỹ minh bạch: danh sách mọi giao dịch thu chi |
| `GET` | `/api/transactions/balance` | Authenticated | Lấy số dư hiện tại và tổng thu/chi |
| `POST` | `/api/transactions/expenses` | **ADMIN** | Ghi nhận khoản chi (chặn chi vượt số dư) |
| `POST` | `/api/transactions/incomes` | **ADMIN** | Ghi nhận khoản thu tài trợ / thu ngoài |
| `GET` | `/api/members` | Authenticated | Danh sách thành viên lớp |
| `POST` | `/api/members` | **ADMIN** | Thêm thành viên mới vào lớp |
| `PUT` | `/api/members/:id` | **ADMIN** | Cập nhật thông tin thành viên |
| `PATCH` | `/api/members/:id/status` | **ADMIN** | Chuyển thành viên sang ngừng hoạt động / khôi phục |

---

## 10. Chạy Kiểm Thử (Testing)

Dự án trang bị bộ kiểm thử tự động toàn diện kiểm tra tính đúng đắn của logic nghiệp vụ và bảo mật:
- Kiểm tra Zod validation: Chặn số tiền âm, số tiền 0, số tiền thập phân (float), email sai định dạng.
- Kiểm tra Auth & JWT: Mã hóa mật khẩu bcrypt, tạo và giải mã token, xử lý token giả mạo.
- Kiểm tra phân quyền RBAC: Thành viên thường (`MEMBER`) bị từ chối `403` khi cố tạo đợt thu, ghi chi tiêu, sửa thành viên hoặc duyệt tiền.
- Kiểm tra quy tắc tài chính: Công thức số dư, chống cộng trùng tiền thu từ đóng quỹ, chống xác nhận nộp tiền trùng lặp cho 1 thành viên.

Để chạy kiểm thử:
```bash
npm run test
```

---

## 11. Các giới hạn chưa triển khai ở phiên bản MVP

- **Cổng thanh toán tự động & Ngân hàng:** Chưa tích hợp Webhook ngân hàng tự động; việc xác nhận vẫn dựa trên việc thủ quỹ đối chiếu và bấm xác nhận trên hệ thống.
- **Thanh toán từng phần:** MVP chỉ hỗ trợ đóng đủ một lần cho mỗi đợt thu, chưa hỗ trợ trả góp nhiều lần.
- **Thu hồi Token Server-side (Token Revocation):** JWT sử dụng cookie HttpOnly với thời hạn 7 ngày. Khi đăng xuất, cookie bị xóa ở client. Dự án chưa lưu danh sách blacklist token trong Redis.
- **Nhiều lớp học (Multi-tenant):** Hệ thống thiết kế chuẩn chỉnh cho 1 lớp học độc lập.
