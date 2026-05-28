const express = require('express');
const path = require('path'); // Thư viện xử lý đường dẫn file hệ thống
const app = express();

app.use(express.json());

// MẢNG LƯU TRỮ HÓA ĐƠN CHƯA XỬ LÝ
let pendingDonations = [];

const TY_LE_QUY_DOI = 0.001; // 1,000đ = 1 Xu

// ----------------------------------------------------------------------------
// ĐÃ SỬA: ĐỌC VÀ HIỂN THỊ TRỰC TIẾP FILE INDEX.HTML RA TRANG CHỦ
// ----------------------------------------------------------------------------
app.get('/', (req, res) => {
    // Trả về file index.html nằm chung thư mục
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Endpoint tiếp nhận Webhook từ SePay
app.post('/hooks/sepay-payment', (req, res) => {
    try {
        const data = req.body;
        const description = data.code || data.content || ""; 
        const amount = parseFloat(data.transferAmount || data.amount || 0); 

        console.log(`[SePay Log] Giao dịch mới: "${description}" | Số tiền: ${amount} VNĐ`);

        const match = description.match(/pvemc_([a-zA-Z0-9_]{3,16})/i);

        if (match && amount >= 2000) {
            const playerName = match[1];
            const soXu = Math.floor(amount * TY_LE_QUY_DOI);

            if (soXu > 0) {
                pendingDonations.push({
                    id: data.id || Date.now().toString(),
                    player: playerName,
                    points: soXu
                });
                console.log(`[Hàng chờ] Đã lưu đơn nạp: Tài khoản ${playerName} -> +${soXu} Xu`);
            }
        }
        res.status(200).send("OK");
    } catch (error) {
        console.error("[Lỗi Hệ Thống Webhook]:", error);
        res.status(500).send("Internal Server Error");
    }
});

// 2. Endpoint cho file Python nội bộ quét đơn nạp
app.get('/get-donations', (req, res) => {
    res.json(pendingDonations);
});

// 3. Endpoint xác nhận đã cộng xu thành công -> Xóa khỏi hàng chờ
app.post('/clear-donation', (req, res) => {
    const { id } = req.body;
    pendingDonations = pendingDonations.filter(item => item.id !== id);
    console.log(`[Hàng chờ] Đã giải phóng hóa đơn ID: ${id}`);
    res.send("SUCCESS");
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`==> Gateway đang lắng nghe mượt mà tại cổng: ${PORT}`);
});
