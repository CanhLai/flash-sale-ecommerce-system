// File: loadtest.js
const url = "http://localhost:3000/checkout";
const totalRequests = 350; 
 
let successCount = 0;
let failCount = 0;

async function fireRequest() {
    try {
        const res = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ productId: 1 })
        });
        const data = await res.json();
        
        if (data.status === "processing") {
            successCount++;
        } else {
            failCount++;
        }
    } catch (error) {
        failCount++;
    }
}

async function runTest() {
    console.log(`Bắn ${totalRequests} user cùng chốt đơn 1 lúc`);
    
    // Tạo 100 mũi tên bắn cùng một lúc (Concurrency)
    const promises = [];
    for (let i = 0; i < totalRequests; i++) {
        promises.push(fireRequest());
    }
    
    // Đợi tất cả bắn xong
    await Promise.all(promises);

    // In báo cáo cho ông Lâm xem
    console.log("\n============================");
    console.log("KẾT QUẢ LOAD TEST CHÍNH THỨC");
    console.log(`- Tổng request đã gửi: ${totalRequests}`);
    console.log(`- Số success (Lọt vào Queue):  ${successCount}`);
    console.log(`- Số fail (Bị Redis chặn):     ${failCount}`);
    console.log("============================\n");
}

runTest();