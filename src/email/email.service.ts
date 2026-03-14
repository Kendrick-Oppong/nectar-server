import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private transporter: nodemailer.Transporter;

  constructor() {
    this.transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST ?? '',
      port: Number(process.env.SMTP_PORT) ?? 587,
      auth: {
        user: process.env.SMTP_USER ?? '',
        pass: process.env.SMTP_PASS ?? '',
      },
    });
  }

  async sendPasswordResetEmail(to: string, token: string): Promise<boolean> {
    try {
      const resetLink = `http://localhost:3000/auth/reset-password?token=${token}`;

      const info = await this.transporter.sendMail({
        from: process.env.FROM_EMAIL ?? '',
        to,
        subject: 'Password Reset Request',
        text: `You requested a password reset. Click this link to reset your password: ${resetLink}. It expires in 15 minutes.`,
        html: `
          <h3>Password Reset Request</h3>
          <p>You recently requested to reset your password.</p>
          <p>Click the link below to set a new password:</p>
          <a href="${resetLink}" style="padding: 10px 15px; background: #FF7043; color: white; text-decoration: none; border-radius: 5px;">
            Reset Password
          </a>
          <br/><br/>
          <p>If you didn't request this, please ignore this email. The link will expire in 15 minutes.</p>
        `,
      });

      console.log('Message sent: %s', info.messageId);
      // For testing, ethereal email provides a URL to view the sent email
      if (info.messageId && process.env.SMTP_HOST === 'smtp.ethereal.email') {
        this.logger.log(`Preview URL: ${nodemailer.getTestMessageUrl(info)}`);
      }
      return true;
    } catch (error) {
      this.logger.error(`Failed to send OTP to ${to}`, error);
      return false;
    }
  }
}
