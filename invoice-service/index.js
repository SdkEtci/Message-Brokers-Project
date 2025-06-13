const amqp = require('amqplib');

async function createInvoice(payment) {
    if (payment.status === 'success') {
        const invoice = {
            invoiceId: Math.floor(Math.random() * 10000),
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            amount: payment.amount,
            createdAt: new Date().toISOString()
        };
        console.log("Fatura oluşturuldu:", invoice);
    } else {
        console.log(`Ödeme başarısız olduğu için fatura oluşturulmadı. Sipariş ID: ${payment.orderId}`);
    }
}

async function listenForPayments() {
    const conn = await amqp.connect('amqp://rabbitmq');
    const ch = await conn.createChannel();
    const q = 'payments';

    await ch.assertQueue(q);
    console.log("Fatura servisi ödeme sonuçlarını dinleniyor...");

    ch.consume(q, (msg) => {
        if (msg) {
            const payment = JSON.parse(msg.content.toString());
            console.log("Ödeme sonucu alındı:", payment);
            createInvoice(payment);
            ch.ack(msg);
        }
    });
}

listenForPayments();