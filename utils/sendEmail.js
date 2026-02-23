const nodemailer = require('nodemailer');

// Create transporter - FIXED: createTransport (not createTransporter)
const transporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST,
  port: process.env.EMAIL_PORT,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
});

// Order confirmation email
const sendOrderConfirmationEmail = async (order) => {
  try {
    // If email credentials are not set, skip sending email
    if (!process.env.EMAIL_USER || !process.env.EMAIL_PASS) {
      console.log('📧 Email credentials not configured - skipping email');
      return;
    }

    const itemsHtml = order.items.map(item => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: center;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${item.price}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd; text-align: right;">$${(item.quantity * item.price).toFixed(2)}</td>
      </tr>
    `).join('');

    const mailOptions = {
      from: `"Organic Beauty Store" <${process.env.EMAIL_USER}>`,
      to: order.customer_email,
      subject: `Order Confirmation - #${order.id}`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #16a34a;">🌿 Organic Beauty Store</h2>
          <h3>Order Confirmation</h3>
          <p>Thank you for your order, ${order.customer_name}!</p>
          
          <div style="background: #f8fafc; padding: 15px; border-radius: 8px; margin: 20px 0;">
            <h4>Order Details:</h4>
            <p><strong>Order ID:</strong> #${order.id}</p>
            <p><strong>Order Date:</strong> ${new Date(order.created_at).toLocaleDateString()}</p>
            <p><strong>Total Amount:</strong> $${order.total_amount}</p>
            <p><strong>Status:</strong> ${order.order_status}</p>
          </div>

          <h4>Items Ordered:</h4>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background: #f1f5f9;">
                <th style="padding: 10px; text-align: left; border-bottom: 2px solid #ddd;">Product</th>
                <th style="padding: 10px; text-align: center; border-bottom: 2px solid #ddd;">Qty</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Price</th>
                <th style="padding: 10px; text-align: right; border-bottom: 2px solid #ddd;">Total</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>

          <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px;">
            <p><strong>Shipping Address:</strong></p>
            <p>${order.shipping_address}</p>
          </div>

          <p style="margin-top: 20px;">We'll notify you when your order ships!</p>
          
          <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
            <p style="color: #64748b; font-size: 14px;">
              Thank you for choosing Organic Beauty Store!<br>
              Pure Nature, Pure Beauty 🌿
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log('✅ Order confirmation email sent to:', order.customer_email);
    
  } catch (error) {
    console.error('❌ Error sending email:', error);
    // Don't throw error - order should still complete even if email fails
  }
};

module.exports = {
  sendOrderConfirmationEmail
};