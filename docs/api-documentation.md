# API Documentation
Flash Sale E-commerce System

---

## 1. GET /products

### Mô tả
API dùng để lấy danh sách sản phẩm hiện có trong hệ thống.

### Method
```http
GET /products
```

### Request Body
Không có

### Response thành công
```json
[
  {
    "id": 1,
    "name": "Bàn phím cơ",
    "price": 1020000,
    "stock": 500
  },
  {
    "id": 2,
    "name": "Vợt cầu lông",
    "price": 765000,
    "stock": 798
  }
]
```

### Chức năng
- Hiển thị sản phẩm ngoài frontend
- Cập nhật tồn kho realtime
- Phục vụ giỏ hàng và flash sale

---

## 2. POST /checkout

### Mô tả
API dùng để xử lý đặt hàng và đưa đơn hàng vào BullMQ Queue.

### Method
```http
POST /checkout
```

### Request Body
```json
{
  "productId": 1,
  "quantity": 2
}
```

### Response thành công
```json
{
  "status": "processing",
  "message": "Đơn hàng đang được xử lý",
  "stock_con_lai": 48
}
```

### Response thất bại (Out of Stock)
```json
{
  "message": "Out of stock"
}
```

### Chức năng
- Kiểm tra tồn kho bằng Redis
- Giảm stock bằng Atomic DECRBY
- Ngăn oversell khi nhiều user mua cùng lúc
- Đưa đơn hàng vào BullMQ Queue
- Worker xử lý bất đồng bộ và lưu xuống PostgreSQL

---

## 3. Công nghệ API sử dụng

| Thành phần | Vai trò |
| :--- | :--- |
| ExpressJS | Xây dựng REST API |
| Redis | Quản lý tồn kho realtime |
| BullMQ | Queue xử lý đơn hàng |
| PostgreSQL | Lưu dữ liệu hệ thống |

---

## 4. Flow xử lý API

```text
Frontend
→ REST API
→ Redis kiểm tra stock
→ BullMQ Queue
→ Worker xử lý
→ PostgreSQL lưu đơn hàng
```
---

## 5. Đặc điểm hệ thống

- Hỗ trợ xử lý nhiều request đồng thời
- Sử dụng Redis Atomic Operation để chống oversell
- Sử dụng BullMQ Queue để xử lý bất đồng bộ
- Hỗ trợ realtime stock update
- Hệ thống được triển khai bằng Docker