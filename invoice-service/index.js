const amqp = require('amqplib');

async function connectWithRetry() {
    let retries = 10;
    while (retries > 0) {
        try {
            console.log('Invoice Service: Attempting to connect to RabbitMQ...');
            const conn = await amqp.connect('amqp://rabbitmq');
            console.log('Invoice Service: Connected to RabbitMQ successfully');
            return conn;
        } catch (error) {
            console.log(`Invoice Service: Connection failed, retries left: ${retries - 1}`);
            retries--;
            if (retries === 0) throw error;
            await new Promise(resolve => setTimeout(resolve, 5000));
        }
    }
}

async function createInvoice(payment) {
    if (payment.status === 'success') {
        // Simulate invoice creation delay
        await new Promise(resolve => setTimeout(resolve, 500 + Math.random() * 1000));
        
        const invoice = {
            invoiceId: Math.floor(Math.random() * 100000),
            orderId: payment.orderId,
            paymentId: payment.paymentId,
            product: payment.product,
            amount: payment.amount,
            createdAt: new Date().toISOString(),
            invoiceNumber: `INV-${Date.now()}`,
            status: 'created'
        };
        
        console.log("📄 Fatura oluşturuldu:", {
            invoiceId: invoice.invoiceId,
            invoiceNumber: invoice.invoiceNumber,
            orderId: invoice.orderId,
            product: invoice.product,
            amount: invoice.amount
        });
        
        return invoice;
    } else {
        console.log(`❌ Ödeme başarısız - Fatura oluşturulmadı:`, {
            orderId: payment.orderId,
            product: payment.product,
            reason: payment.reason || 'Payment failed'
        });
        return null;
    }
}

async function listenForPayments() {
    try {
        const conn = await connectWithRetry();
        const ch = await conn.createChannel();
        const q = 'payments';

        await ch.assertQueue(q, { durable: true });
        
        // Set prefetch to 1 to process payments one at a time
        ch.prefetch(1);
        
        console.log("🎧 Invoice Service: Ödeme sonuçları dinleniyor...");
        console.log("💡 Fatura servisi hazır - ödeme sonuçlarını işlemeye başladı");

        ch.consume(q, async (msg) => {
            if (msg) {
                try {
                    const payment = JSON.parse(msg.content.toString());
                    console.log("💳 Ödeme sonucu alındı:", {
                        orderId: payment.orderId,
                        status: payment.status,
                        paymentId: payment.paymentId,
                        product: payment.product
                    });
                    
                    // Create invoice based on payment result
                    const invoice = await createInvoice(payment);
                    
                    if (invoice) {
                        console.log("✅ İşlem tamamlandı - Fatura başarıyla oluşturuldu");
                    } else {
                        console.log("⚠️  İşlem tamamlandı - Ödeme başarısız olduğu için fatura oluşturulmadı");
                    }
                    
                    // Acknowledge the message
                    ch.ack(msg);
                    
                } catch (error) {
                    console.error("❌ Ödeme sonucu işleme hatası:", error.message);
                    ch.nack(msg, false, false); // Don't requeue on error
                }
            }
        });

        // Handle connection close
        conn.on('close', () => {
            console.log('Invoice Service: Connection closed, attempting to reconnect...');
            setTimeout(listenForPayments, 5000);
        });

        conn.on('error', (error) => {
            console.error('Invoice Service: Connection error:', error.message);
        });

    } catch (error) {
        console.error("❌ Invoice Service başlatma hatası:", error.message);
        console.log("🔄 5 saniye sonra tekrar denenecek...");
        setTimeout(listenForPayments, 5000);
    }
}

// Handle graceful shutdown
process.on('SIGINT', () => {
    console.log('\n🛑 Invoice Service shutting down...');
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('\n🛑 Invoice Service shutting down...');
    process.exit(0);
});

console.log("🚀 Invoice Service starting...");
listenForPayments();