const express = require("express");
const cors = require("cors");
const Redis = require("ioredis");
const { Pool } = require("pg");
const { Queue, Worker } = require("bullmq");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Kết nối Redis (Cache & Khóa chống Oversell)
const redis = new Redis({ host: "127.0.0.1", port: 6379 });
redis.on("connect", () => console.log("Kết nối Redis thành công!"));

// 2. Kết nối PostgreSQL (Lưu trữ đơn hàng)
const pool = new Pool({
    user: "admin",
    password: "admin",
    host: "127.0.0.1",
    port: 5432,
    database: "flashsale"
});
pool.connect()
    .then(() => console.log("Kết nối PostgreSQL thành công!"))
    .catch((err) => console.log("Lỗi PostgreSQL:", err));

// 3. Khởi tạo kho hàng trước khi Flash Sale
const initSystem = async () => {
    try {
        await redis.set("product:1:stock", 1000);
        await redis.set("product:2:stock", 800);
        await redis.set("product:3:stock", 500);

        console.log("[Redis] Đã nạp stock cho 3 sản phẩm.");
    } catch (error) {
        console.log("Lỗi khởi tạo kho:", error);
    }
};
  
// 4. Khởi tạo Message Queue (BullMQ)
const orderQueue = new Queue("orderQueue", {
    connection: { host: "127.0.0.1", port: 6379 }
});
console.log("Khởi tạo BullMQ thành công!");

// Gọi hàm nạp kho khi server khởi động
initSystem();

// Lấy thông tin sản phẩm
app.get("/products", async (req, res) => {
    const products = [
        {
            id: 1,
            name: "Bàn phím cơ",
            price: 1020000,
            stock: Number(await redis.get("product:1:stock"))
        },
        {
            id: 2,
            name: "Vợt cầu lông",
            price: 765000,
            stock: Number(await redis.get("product:2:stock"))
        },
        {
            id: 3,
            name: "Balo UIT K20",
            price: 450000,
            stock: Number(await redis.get("product:3:stock"))
        }
    ];

    res.json(products);
});

// Thêm sản phẩm vào giỏ hàng 
app.post("/cart/add", (req, res) => {
    res.json({ status: "ok", message: "Đã thêm vào giỏ hàng" });
});

// Xử lý thanh toán Flash Sale
app.post("/checkout", async (req, res) => {
    const { productId, quantity } = req.body;

    const buyQuantity = Number(quantity) || 1;

    if (!productId) {
        return res.status(400).json({ message: "Thiếu productId" });
    }

    if (buyQuantity <= 0) {
        return res.status(400).json({ message: "Số lượng không hợp lệ" });
    }

    const stock = Number(await redis.get(`product:${productId}:stock`));

    if (stock < buyQuantity) {
        return res.json({
            status: "fail",
            message: `Không đủ hàng! Chỉ còn ${stock} sản phẩm.`
        });
    }

    const newStock = await redis.decrby(`product:${productId}:stock`, buyQuantity);

    if (newStock < 0) {
        await redis.incrby(`product:${productId}:stock`, buyQuantity);

        return res.json({
            status: "fail",
            message: "Sold out"
        });
    }

    await orderQueue.add("processOrder", {
        userId: 1,
        productId: productId,
        quantity: buyQuantity
    });

    return res.json({
        status: "processing",
        message: `Đơn hàng đang được xử lý!`,
        stock_con_lai: newStock
    });
});

// Worker: Lấy đơn từ Queue và ghi vào Database
const worker = new Worker("orderQueue", async (job) => {
    const { userId, productId, quantity } = job.data;
    
    // console.log(`👷 Đang xử lý đơn: Sản phẩm ${productId}...`);

    await pool.query(`
        INSERT INTO orders (user_id, product_id, quantity, status)
        VALUES ($1, $2, $3, 'success')
    `, [userId, productId, quantity]);

    // console.log(`✅ Lưu Database thành công!`);
}, {
    connection: { host: "127.0.0.1", port: 6379 }
});

// Bật Server
app.listen(3000, () => {
    console.log("Server đang chạy tại cổng 3000");
});
 