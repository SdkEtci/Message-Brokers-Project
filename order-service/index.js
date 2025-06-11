const amqp = require('amqplib');

async function sendOrder(order) {
    const conn = await amqp.connect('amqp://rabbitmq');
    const ch = await conn.createChannel();
    const q = 'orders';

    await ch.assertQueue(q);
    ch.sendToQueue(q, Buffer.from(JSON.stringify(order)));

    console.log("Sipariş gönderildi:", order);
    setTimeout(() => conn.close(), 500);
}

sendOrder({ id: 1, urun: "Kitap", fiyat: 100 });
