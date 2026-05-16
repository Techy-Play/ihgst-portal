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
    html,
    attachments,
  };

  return transporter.sendMail(mailOptions);
}
