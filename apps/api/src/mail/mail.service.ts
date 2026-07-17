import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as nodemailer from "nodemailer";
import { Transporter } from "nodemailer";

@Injectable()
export class MailService {
  private readonly transporter: Transporter;
  private readonly logger = new Logger(MailService.name);
  private readonly fromAddress: string;
  private readonly appUrl: string;

  constructor(private readonly config: ConfigService) {
    this.fromAddress = config.get("MAIL_FROM", "noreply@abytemenu.com");
    this.appUrl = config.get("APP_URL", "http://localhost:3002");

    this.transporter = nodemailer.createTransport({
      host: config.get("MAIL_HOST", "smtp.gmail.com"),
      port: config.get<number>("MAIL_PORT", 587),
      secure: config.get("MAIL_SECURE", "false") === "true",
      auth: {
        user: config.get("MAIL_USER", ""),
        pass: config.get("MAIL_PASS", ""),
      },
    });
  }

  async sendPasswordReset(toEmail: string, rawToken: string): Promise<void> {
    const resetUrl = `${this.appUrl}/auth/reset-password?token=${rawToken}`;

    try {
      await this.transporter.sendMail({
        from: `"Abyte Menu" <${this.fromAddress}>`,
        to: toEmail,
        subject: "Reset Your Password — Abyte Menu",
        html: this.buildPasswordResetTemplate(resetUrl),
      });
    } catch (error) {
      this.logger.error(`Failed to send password reset email to ${toEmail}`, error);
    }
  }

  async sendWelcome(toEmail: string, displayName: string): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: `"Abyte Menu" <${this.fromAddress}>`,
        to: toEmail,
        subject: `Welcome to Abyte Menu — ${displayName}`,
        html: this.buildWelcomeTemplate(displayName),
      });
    } catch (error) {
      this.logger.error(`Failed to send welcome email to ${toEmail}`, error);
    }
  }

  // ─── Email Templates ─────────────────────────────────────────────────────

  private buildPasswordResetTemplate(resetUrl: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
          <h2 style="color: #111827;">Reset Your Password</h2>
          <p>You requested a password reset for your Abyte Menu account.</p>
          <p>Click the button below to set a new password. This link expires in <strong>15 minutes</strong> and can only be used once.</p>
          <a href="${resetUrl}"
             style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #111827; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Reset Password
          </a>
          <p style="color: #6b7280; font-size: 13px;">If you did not request this, you can safely ignore this email. Your password will not change.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Abyte Menu — QR Digital Menu Platform</p>
        </body>
      </html>
    `;
  }

  private buildWelcomeTemplate(displayName: string): string {
    return `
      <!DOCTYPE html>
      <html>
        <body style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 24px; color: #1a1a1a;">
          <h2 style="color: #111827;">Welcome to Abyte Menu!</h2>
          <p>Your restaurant <strong>${displayName}</strong> has been approved and is now live on the platform.</p>
          <p>You can now log in to your admin portal to set up your branches, tables, and menu.</p>
          <a href="${this.appUrl}"
             style="display: inline-block; margin: 24px 0; padding: 12px 28px; background: #111827; color: #fff; text-decoration: none; border-radius: 6px; font-weight: bold;">
            Go to Admin Portal
          </a>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 24px 0;" />
          <p style="color: #9ca3af; font-size: 12px;">Abyte Menu — QR Digital Menu Platform</p>
        </body>
      </html>
    `;
  }
}
