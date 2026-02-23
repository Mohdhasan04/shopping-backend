const nodemailer = require('nodemailer');

// ✅ FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Email templates (same as before)
const emailTemplates = {
  orderConfirmation: (order, customer) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .order-details { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; }
        .product-item { border-bottom: 1px solid #eee; padding: 10px 0; }
        .total { font-weight: bold; font-size: 1.2em; margin-top: 15px; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 Organic Beauty</h1>
          <h2>Order Confirmation</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${customer.name}</strong>,</p>
          <p>Thank you for your order! We're excited to prepare your organic beauty products.</p>
          
          <div class="order-details">
            <h3>Order #${order.id}</h3>
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Status:</strong> <span style="color: #10B981;">${order.order_status}</span></p>
            
            <h4>Items Ordered:</h4>
            ${order.items.map(item => `
              <div class="product-item">
                <strong>${item.product_name}</strong><br>
                Quantity: ${item.quantity} × ₹${item.price}<br>
                Subtotal: ₹${(item.quantity * item.price).toFixed(2)}
              </div>
            `).join('')}
            
            <div class="total">
              Total Amount: ₹${order.total_amount?.toFixed(2)}
            </div>
          </div>
          
          <p><strong>Shipping Address:</strong><br>${order.shipping_address}</p>
          
          <p>You can track your order status by logging into your account.</p>
          <p>If you have any questions, please contact our customer support.</p>
        </div>
        <div class="footer">
          <p>Thank you for choosing Organic Beauty!<br>Natural • Organic • Sustainable</p>
        </div>
      </div>
    </body>
    </html>
  `,

  orderStatusUpdate: (order, customer, oldStatus, newStatus) => `
    <!DOCTYPE html>
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
        .header { background: #3B82F6; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
        .content { background: #f9f9f9; padding: 20px; border-radius: 0 0 8px 8px; }
        .status-update { background: white; padding: 15px; border-radius: 5px; margin: 15px 0; text-align: center; }
        .footer { text-align: center; margin-top: 20px; color: #666; font-size: 0.9em; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌿 Organic Beauty</h1>
          <h2>Order Status Updated</h2>
        </div>
        <div class="content">
          <p>Dear <strong>${customer.name}</strong>,</p>
          <p>Your order status has been updated:</p>
          
          <div class="status-update">
            <h3>Order #${order.id}</h3>
            <p style="font-size: 1.2em; margin: 10px 0;">
              Status changed from <strong style="color: #6B7280;">${oldStatus}</strong> to 
              <strong style="color: #10B981;">${newStatus}</strong>
            </p>
          </div>
          
          <p>You can view your order details and track progress by logging into your account.</p>
          <p>Thank you for shopping with us!</p>
        </div>
        <div class="footer">
          <p>Organic Beauty - Pure Natural Care</p>
        </div>
      </div>
    </body>
    </html>
  `
};

// Send email function
const sendEmail = async (to, subject, html) => {
  try {
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: to,
      subject: subject,
      html: html
    };

    const result = await transporter.sendMail(mailOptions);
    console.log('✅ Email sent successfully:', result.messageId);
    return true;
  } catch (error) {
    console.error('❌ Email sending failed:', error);
    return false;
  }
};

// Send order confirmation email
const sendOrderConfirmation = async (order, customer) => {
  const subject = `Order Confirmation #${order.id} - Organic Beauty`;
  const html = emailTemplates.orderConfirmation(order, customer);
  
  return await sendEmail(customer.email, subject, html);
};

// Send order status update email
const sendOrderStatusUpdate = async (order, customer, oldStatus, newStatus) => {
  const subject = `Order #${order.id} Status Updated - Organic Beauty`;
  const html = emailTemplates.orderStatusUpdate(order, customer, oldStatus, newStatus);
  
  return await sendEmail(customer.email, subject, html);
};

module.exports = {
  sendOrderConfirmation,
  sendOrderStatusUpdate
};