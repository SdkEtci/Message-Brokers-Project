const amqp = require('amqplib');

async function connectWithRetry() {
    let retries = 10;
    while (retries > 0) {
        try {
            console.log('Payment Service: Attempting to connect to RabbitMQ...');
            const conn = await amqp.connect('amqp://rabbitmq');
            console.log('Payment Service: Connected to RabbitMQ successfully');
            return conn;
        } catch (error) {
            console.log(`Payment Service: Connection failed, retries left: ${retries - 1}`);
            retries--;
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

async function processPayment(order) {
    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000 + Math.random() * 2000));
    
    // Simulate payment processing with 80% success rate
    const isSuccess = Math.random() > 0.2;
    const payment = {
        orderId: order.id,
        amount: order.fiyat,
        product: order.urun,
        status: isSuccess ? 'success' : 'failed',
        paymentId: Math.floor(Math.random() * 100000),
        timestamp: new Date().toISOString(),
        reason: isSuccess ? 'Payment processed successfully' : 'Insufficient funds'
    };

    console.log(`💳 Ödeme işlemi ${payment.status.toUpperCase()}:`, {
        orderId: payment.orderId,
        product: payment.product,
        amount: payment.amount,
        paymentId: payment.paymentId,
        reason: payment.reason
    });
    
    return payment;
}

async function sendPaymentResult(payment) {
    try {
        const conn = await connectWithRetry();
        const ch = await conn.createChannel();
        const q = 'payments';

        await ch.assertQueue(q, { durable: true });
        ch.sendToQueue(q, Buffer.from(JSON.stringify(payment)), { persistent: true });

        console.log("📤 Ödeme sonucu gönderildi:", {
            orderId: payment.orderId,
            status: payment.status,
            paymentId: payment.paymentId
        });
        
        setTimeout(() => conn.close(), 500);
    } catch (error) {
        console.error("❌ Ödeme sonucu gönderme hatası:", error.message);
    }
}

async function listenForOrders() {
    try {
        const conn = await connectWithRetry();
        const ch = await conn.createChannel();
        const orderQueue = 'orders';

        await ch.assertQueue(orderQueue, { durable: true });
        
        // Set prefetch to 1 to distribute orders evenly
        ch.prefetch(1);
        
        console.log("🎧 Payment Service: Siparişler dinleniyor...");
        console.log("💡 Ödeme servisi hazır - siparişleri işlemeye başladı");

        ch.consume(orderQueue, async (msg) => {
            if (msg) {
                try {
                    const order = JSON.parse(msg.content.toString());
                    console.log("📦 Yeni sipariş alındı:", {
                        id: order.id,
                        product: order.urun,
                        price: order.fiyat
                    });
                    
                    // Process payment
                    const paymentResult = await processPayment(order);
                    
                    // Send payment result to payments queue
                    await sendPaymentResult(paymentResult);
                    
                    // Acknowledge the message
                    ch.ack(msg);
                    
                } catch (error) {
                    console.error("❌ Sipariş işleme hatası:", error.message);
                    ch.nack(msg, false, false); // Don't requeue on error
                }
            }
        });

        // Handle connection close
        conn.on('close', () => {
            console.log('Payment Service: Connection closed, attempting to reconnect...');
            setTimeout(listenForOrders, 5000);
        });

        conn.on('error', (error) => {
            console.error('Payment Service: Connection error:', error.message);
        });

    } catch (error) {
        console.error("❌ Payment Service başlatma hatası:", error.message);
        console.log("🔄 5 saniye sonra tekrar denenecek...");
        setTimeout(listenForOrders, 5000);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Payment Service shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Payment Service shutting down...');
    process.exit(0);
});

console.log("🚀 Payment Service starting...");
listenForOrders();