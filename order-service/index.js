const express = require('express');
const amqp = require('amqplib');
const app = express();
const port = 3000;

app.use(express.json());

async function sendOrder(order) {
    const conn = await amqp.connect('amqp://rabbitmq');
    const ch = await conn.createChannel();
    const q = 'orders';

    await ch.assertQueue(q);
    ch.sendToQueue(q, Buffer.from(JSON.stringify(order)));

    console.log("Sipariş gönderildi:", order);
    setTimeout(() => conn.close(), 500);
}

app.post('/orders', async (req, res) => {
    try {
        const order = req.body;
        await sendOrder(order);
        res.json({ message: 'Sipariş başarıyla oluşturuldu', order });
    } catch (error) {
        console.error('Sipariş oluşturulurken hata:', error);
        res.status(500).json({ error: 'Sipariş oluşturulamadı' });
    }
});

app.listen(port, () => {
    console.log(`Order service listening at http://localhost:${port}`);
});