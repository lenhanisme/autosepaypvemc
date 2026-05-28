const express = require('express');
const app = express();
app.use(express.json());

// Mảng lưu trữ các hóa đơn chưa được xử lý
let pendingDonations = [];

const TY_LE_QUY_DOI = 0.001; // 1,000đ = 1 Xu

// 1. Endpoint nhận dữ liệu từ SePay
app.post('/hooks/sepay-payment', (req, res) => {
    try {
        const data = req.body;
        const description = data.code || data.content || ""; 
        const amount = parseFloat(data.transferAmount || data.amount || 0); 

        console.log(`Nhận giao dịch: ${description} | Số tiền: ${amount} VNĐ`);

        // Dùng Regex bóc tách tên người chơi sau chữ pvemc_
        const match = description.match(/pvemc_([a-zA-Z0-9_]{3,16})/i);

        if (match && amount >= 2000) {
            const playerName = match[1];
            const soXu = Math.floor(amount * TY_LE_QUY_DOI);

            if (soXu > 0) {
                // Đẩy vào danh sách chờ để Python ở nhà quét
                pendingDonations.push({
                    id: data.id || Date.now().toString(),
                    player: playerName,
                    points: soXu
                });
                console.log(`Đã thêm vào hàng chờ: ${playerName} nhận ${soXu} Xu`);
            }
        }
        res.status(200).send("OK");
    } catch (error) {
        console.error("Lỗi xử lý:", error);
        res.status(500).send("Error");
    }
});

// 2. Endpoint dành cho script Python ở máy Server Minecraft vào lấy dữ liệu
app.get('/get-donations', (req, res) => {
    // Trả về danh sách hóa đơn hiện tại
    res.json(pendingDonations);
});

// 3. Endpoint để Python báo cáo đã cộng xu thành công -> Xóa hóa đơn đó đi
app.post('/clear-donation', (req, res) => {
    const { id } = req.body;
    pendingDonations = pendingDonations.filter(item => item.id !== id);
    console.log(`Đã xóa hóa đơn ID ${id} khỏi hàng chờ sau khi cộng xu thành công.`);
    res.send("SUCCESS");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server đang chạy tại cổng ${PORT}`);
});
