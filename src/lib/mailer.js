import nodemailer from 'nodemailer';

const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT || '587'),
  secure: process.env.SMTP_SECURE === 'true',
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
});

function wrapHtmlTemplate(content) {
  // If content already looks like a full HTML document, return it as is
  if (typeof content !== 'string' || content.toLowerCase().includes('<html')) {
    return content;
  }

  return `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <style>
        body {
          font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;
          background-color: #f8fafc;
          margin: 0;
          padding: 40px 20px;
          color: #334155;
          -webkit-font-smoothing: antialiased;
        }
        .wrapper {
          max-width: 600px;
          margin: 0 auto;
          background-color: #ffffff;
          border-radius: 12px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
          overflow: hidden;
          border: 1px solid #e2e8f0;
        }
        .header {
          background-color: #ffffff;
          padding: 24px;
          text-align: center;
          border-bottom: 1px solid #e2e8f0;
        }
        .header img {
          max-height: 48px;
          width: auto;
          display: inline-block;
        }
        .content {
          padding: 32px 24px;
          line-height: 1.6;
          font-size: 16px;
        }
        .content h1, .content h2, .content h3 {
          color: #0f172a;
          margin-top: 0;
        }
        .content a {
          color: #4f46e5;
          text-decoration: none;
        }
        .content a:hover {
          text-decoration: underline;
        }
        .footer {
          background-color: #f1f5f9;
          padding: 24px;
          text-align: center;
          font-size: 13px;
          color: #64748b;
          border-top: 1px solid #e2e8f0;
        }
      </style>
    </head>
    <body>
      <div class="wrapper">
        <div class="header">
          <img src="https://ihgst-portal.quest/logo.png" alt="IHGST Portal Logo" />
        </div>
        <div class="content">
          ${content}
        </div>
        <div class="footer">
          &copy; ${new Date().getFullYear()} IHGST Portal. All rights reserved.<br>
          This is an automated message, please do not reply directly to this email.
        </div>
      </div>
    </body>
    </html>
  `;
}

export async function sendEmail({ to, subject, text, html, attachments }) {
  if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP not configured: set SMTP_USER and SMTP_PASS in .env.local to enable email.');
  }
  if (!process.env.SMTP_HOST) {
    throw new Error('SMTP host not configured: set SMTP_HOST in .env.local (e.g., smtp.gmail.com).');
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `IHGST Portal <${process.env.SMTP_USER}>`,
    to,
    subject,
    text,
    html: html ? wrapHtmlTemplate(html) : undefined,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}
