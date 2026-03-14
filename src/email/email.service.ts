import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type { Transporter } from 'nodemailer';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class EmailService {
  private readonly logger = new Logger(EmailService.name);
  private readonly transporter: Transporter;

  constructor(private readonly configService: ConfigService) {
    this.transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      port: 465,
      secure: true, // Port 465 MUST use secure: true
      auth: {
        user: this.configService.get<string>('SMTP_USER'),
        pass: this.configService.get<string>('SMTP_PASS'),
      },
    });
  }

  async sendPasswordResetEmail(to: string, code: string): Promise<boolean> {
    try {
      // While we focus on the code for mobile, we keep a link as a fallback
      await this.transporter.sendMail({
        from:
          this.configService.get<string>('FROM_EMAIL') || 'no-reply@nectar.com',
        to,
        subject: 'Password Reset Code',
        text: `Your password reset code is: ${code}. Enter this code in the app to reset your password. It expires in 15 minutes.`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #eee; border-radius: 10px;">
            <h2 style="color: #FF7043; text-align: center;">Password Reset Code</h2>
            <p>You recently requested to reset your password for your Nectar account.</p>
            <p>Use the following 6-digit security code to reset your password:</p>

            <div style="text-align: center; margin: 30px 0;">
              <span style="font-size: 32px; font-weight: bold; letter-spacing: 5px; background: #f4f4f4; padding: 10px 20px; border-radius: 5px; color: #333;">
                ${code}
              </span>
            </div>

            <p>This code will expire in 15 minutes.</p>
            <p style="font-size: 12px; color: #999; text-align: center; margin-top: 40px;">
              If you didn't request this, please ignore this email.
            </p>
          </div>
        `,
      });

      return true;
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${to}`, error);
      return false;
    }
  }
}
