const amqp = require('amqplib');

async function listenForOrders() {
    const conn = await amqp.connect('amqp://rabbitmq');
    const ch = await conn.createChannel();
    const q = 'orders';

    await ch.assertQueue(q);
    console.log("Fatura servisi dinleniyor...");

    ch.consume(q, (msg) => {
        const order = JSON.parse(msg.content.toString());
        console.log("Fatura oluşturuluyor:", order);
        ch.ack(msg);
    });
}

listenForOrders();
