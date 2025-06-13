const amqp = require('amqplib');

async function processPayment(order) {
    // Simulate payment processing
    const isSuccess = Math.random() > 0.2; // 80% success rate
    const payment = {
        orderId: order.id,
        amount: order.fiyat,
        status: isSuccess ? 'success' : 'failed',
        paymentId: Math.floor(Math.random() * 10000),
        timestamp: new Date().toISOString()
    };

    console.log(`Ödeme işlemi ${payment.status}:`, payment);
    return payment;
}

async function sendPaymentResult(payment) {
    const conn = await amqp.connect('amqp://rabbitmq');
    const ch = await conn.createChannel();
    const q = 'payments';

    await ch.assertQueue(q);
    ch.sendToQueue(q, Buffer.from(JSON.stringify(payment)));

    console.log("Ödeme sonucu gönderildi:", payment);
    setTimeout(() => conn.close(), 500);
}

async function listenForOrders() {
    const conn = await amqp.connect('amqp://rabbitmq');
    const ch = await conn.createChannel();
    const orderQueue = 'orders';

    await ch.assertQueue(orderQueue);
    console.log("Ödeme servisi dinleniyor...");

    ch.consume(orderQueue, async (msg) => {
        if (msg) {
            const order = JSON.parse(msg.content.toString());
            console.log("Sipariş alındı, ödeme işleniyor:", order);
            
            // Process payment
            const paymentResult = await processPayment(order);
            
            // Send payment result to payments queue
            await sendPaymentResult(paymentResult);
            
            ch.ack(msg);
        }
    });
}

listenForOrders();