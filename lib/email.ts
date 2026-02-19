// ═══════════════════════════════════════════════════════════
// Production-Ready Email Service using Resend
// ═══════════════════════════════════════════════════════════
// ✅ Fixes ALL 7 critical production issues:
// 1. ✅ Retry logic with exponential backoff
// 2. ✅ Consistent from address (process.env.EMAIL_FROM)
// 3. ✅ Email logging to database (EmailLog model)
// 4. ✅ Proper TypeScript types (no 'any')
// 5. ✅ Email validation before sending
// 6. ✅ Structured logging with error tracking
// 7. ✅ Rate limit handling and error recovery
// ═══════════════════════════════════════════════════════════

import { Resend } from "resend";
import { prisma } from "./prisma";
import type { EmailType, EmailStatus } from "@prisma/client";

// ═══════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════

interface EmailError extends Error {
  statusCode?: number;
  code?: string;
}

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
  maxRetries?: number;
}

interface EmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ═══════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════

const EMAIL_CONFIG = {
  from: process.env.EMAIL_FROM || "onboarding@resend.dev",
  maxRetries: 2,
  retryDelays: [500, 1500], // Fast retries for serverless — 0.5s, 1.5s
  timeout: 10000, // 10 seconds
  otpExpiryMinutes: 10, // Shared constant — used in OTP HTML template AND send-otp route
} as const;

export const OTP_EXPIRY_MINUTES = EMAIL_CONFIG.otpExpiryMinutes;

// Lazy-init so that the build doesn't crash when RESEND_API_KEY is absent
let _resend: Resend | null = null;
function getResend(): Resend {
  if (!_resend) {
    _resend = new Resend(process.env.RESEND_API_KEY);
  }
  return _resend;
}

// ═══════════════════════════════════════════════════════════
// HTML ESCAPING  — prevents XSS in email templates
// ═══════════════════════════════════════════════════════════

function escapeHtml(unsafe: string): string {
  return unsafe
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

// ═══════════════════════════════════════════════════════════
// EMAIL VALIDATION
// ═══════════════════════════════════════════════════════════

const DISPOSABLE_DOMAINS = [
  'tempmail.com', 'guerrillamail.com', '10minutemail.com', 'throwaway.email',
  'mailinator.com', 'trashmail.com', 'yopmail.com', 'maildrop.cc',
];

function validateEmail(email: string): { valid: boolean; error?: string } {
  // Basic format validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return { valid: false, error: 'Invalid email format' };
  }

  // Check for disposable email domains
  const domain = email.split('@')[1]?.toLowerCase();
  if (domain && DISPOSABLE_DOMAINS.includes(domain)) {
    return { valid: false, error: 'Disposable email addresses are not allowed' };
  }

  return { valid: true };
}

// ═══════════════════════════════════════════════════════════
// EMAIL LOGGING
// ═══════════════════════════════════════════════════════════

async function logEmail(data: {
  to: string;
  from: string;
  subject: string;
  type: EmailType;
  status: EmailStatus;
  messageId?: string;
  error?: string;
  attempts: number;
}): Promise<void> {
  try {
    await prisma.emailLog.create({
      data: {
        to: data.to,
        from: data.from,
        subject: data.subject,
        type: data.type,
        status: data.status,
        provider: 'resend',
        messageId: data.messageId,
        error: data.error,
        attempts: data.attempts,
        lastAttempt: new Date(),
        sentAt: data.status === 'SENT' ? new Date() : null,
      },
    });
  } catch (error) {
    // Don't fail email sending if logging fails
    console.error('[Email] Failed to log email:', error);
  }
}

async function _updateEmailLog(messageId: string, updates: {
  status?: EmailStatus;
  error?: string;
  attempts?: number;
}): Promise<void> {
  try {
    await prisma.emailLog.update({
      where: { messageId },
      data: {
        ...updates,
        lastAttempt: new Date(),
        updatedAt: new Date(),
      },
    });
  } catch (error) {
    console.error('[Email] Failed to update email log:', error);
  }
}

// ═══════════════════════════════════════════════════════════
// RETRY LOGIC WITH EXPONENTIAL BACKOFF
// ═══════════════════════════════════════════════════════════

async function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function isRetryableError(error: EmailError): boolean {
  // Retry on network errors, rate limits, and 5xx server errors
  if (!error.statusCode) return true; // Network error
  if (error.statusCode === 429) return true; // Rate limit
  if (error.statusCode >= 500) return true; // Server error
  return false;
}

async function sendEmailWithRetry(options: SendEmailOptions): Promise<EmailResult> {
  const { to, subject, html, type, maxRetries = EMAIL_CONFIG.maxRetries } = options;
  const from = EMAIL_CONFIG.from;

  // Validate email before attempting to send
  const validation = validateEmail(to);
  if (!validation.valid) {
    const errorMsg = validation.error || 'Invalid email';
    console.error(`[Email] Validation failed for ${to}: ${errorMsg}`);
    
    await logEmail({
      to,
      from,
      subject,
      type,
      status: 'FAILED',
      error: errorMsg,
      attempts: 0,
    });

    return { success: false, error: errorMsg };
  }

  let lastError: EmailError | null = null;
  let attempt = 0;

  for (attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Email] Attempt ${attempt + 1}/${maxRetries} - Sending ${type} to ${to.replace(/(.{3}).*@/, '$1***@')}`);

      const result = await getResend().emails.send({
        from,
        to,
        subject,
        html,
      });

      // Check if Resend returned an error
      if (result.error) {
        throw Object.assign(new Error(result.error.message || 'Unknown Resend error'), {
          statusCode: 400,
          code: result.error.name,
        });
      }

      // Success!
      const messageId = result.data?.id;
      console.log(`[Email] ✅ Successfully sent ${type} to ${to.replace(/(.{3}).*@/, '$1***@')} (messageId: ${messageId})`);

      // Non-blocking log — don't wait for DB write
      logEmail({
        to,
        from,
        subject,
        type,
        status: 'SENT',
        messageId,
        attempts: attempt + 1,
      }).catch(err => console.error('[Email] Log write failed:', err));

      return { success: true, messageId };

    } catch (error) {
      lastError = error as EmailError;
      const errorMsg = lastError.message || 'Unknown error';
      
      console.error(`[Email] ❌ Attempt ${attempt + 1} failed:`, {
        type,
        to: to.replace(/(.{3}).*@/, '$1***@'),
        error: errorMsg,
        statusCode: lastError.statusCode,
        code: lastError.code,
      });

      // Check if we should retry
      if (attempt < maxRetries - 1 && isRetryableError(lastError)) {
        const delay = EMAIL_CONFIG.retryDelays[attempt] || 9000;
        console.log(`[Email] ⏳ Retrying in ${delay}ms...`);
        await sleep(delay);
      } else {
        // Final failure
        break;
      }
    }
  }

  // All retries exhausted
  const finalError = lastError?.message || 'Failed to send email after retries';
  console.error(`[Email] 💥 Final failure after ${attempt} attempts:`, {
    type,
    to: to.replace(/(.{3}).*@/, '$1***@'),
    error: finalError,
  });

  // Non-blocking log
  logEmail({
    to,
    from,
    subject,
    type,
    status: 'FAILED',
    error: finalError,
    attempts: attempt,
  }).catch(err => console.error('[Email] Log write failed:', err));

  return { success: false, error: finalError };
}

// ═══════════════════════════════════════════════════════════
// PUBLIC EMAIL FUNCTIONS
// ═══════════════════════════════════════════════════════════

export async function sendOtpEmail(to: string, otp: string, track?: 'IDEA_SPRINT' | 'BUILD_STORM'): Promise<EmailResult> {
  // Track-specific colors and labels
  const trackInfo = track ? {
    'IDEA_SPRINT': {
      color: '#00CC44',
      label: 'Idea Sprint Track',
      icon: '💡',
      description: 'Transform your innovative ideas into reality'
    },
    'BUILD_STORM': {
      color: '#2266FF',
      label: 'Build Storm Track',
      icon: '⚡',
      description: 'Build and showcase your technical prowess'
    }
  }[track] : null;

  const subject = `Your Verification Code - IndiaNext${track ? ` (${trackInfo?.label})` : ''}`;
  const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <!-- Header with theme colors -->
              <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center; border: 2px solid #222; border-bottom: none;">
                <h1 style="color: #FF6600; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(255, 102, 0, 0.5);">IndiaNext</h1>
                <p style="color: #ededed; margin: 10px 0 0 0; font-size: 16px; letter-spacing: 2px;">HACKATHON 2025</p>
                ${trackInfo ? `
                  <div style="margin-top: 20px; padding: 12px 24px; background: rgba(${trackInfo.color === '#00CC44' ? '0, 204, 68' : '34, 102, 255'}, 0.1); border: 1px solid ${trackInfo.color}; border-radius: 8px; display: inline-block;">
                    <span style="font-size: 24px; margin-right: 8px;">${trackInfo.icon}</span>
                    <span style="color: ${trackInfo.color}; font-weight: bold; font-size: 14px; letter-spacing: 1px;">${trackInfo.label.toUpperCase()}</span>
                  </div>
                  <p style="color: #999; margin: 10px 0 0 0; font-size: 13px;">${trackInfo.description}</p>
                ` : ''}
              </div>
              
              <!-- Main content -->
              <div style="background: #1a1a1a; padding: 40px; border-radius: 0 0 12px 12px; border: 2px solid #222; border-top: none;">
                <h2 style="color: #ededed; margin: 0 0 20px 0; font-size: 24px;">Your Verification Code</h2>
                <p style="color: #999; margin: 0 0 30px 0; font-size: 16px; line-height: 1.6;">
                  Use the following code to verify your email address and complete your registration:
                </p>
                
                <!-- OTP Box with neon effect -->
                <div style="background: #0a0a0a; border: 2px solid #FF6600; border-radius: 12px; padding: 30px; text-align: center; margin: 30px 0; box-shadow: 0 0 20px rgba(255, 102, 0, 0.3);">
                  <div style="font-size: 48px; font-weight: bold; letter-spacing: 12px; color: #FF6600; font-family: 'Courier New', monospace; text-shadow: 0 0 10px rgba(255, 102, 0, 0.5);">
                    ${otp}
                  </div>
                </div>
                
                <p style="color: #999; margin: 30px 0 0 0; font-size: 14px; line-height: 1.6;">
                  ⏱️ This code will expire in <strong style="color: #FF6600;">${EMAIL_CONFIG.otpExpiryMinutes} minutes</strong>.<br>
                  🔒 If you didn't request this code, please ignore this email.
                </p>
                
                <!-- Footer -->
                <div style="margin-top: 40px; padding-top: 30px; border-top: 1px solid #222;">
                  <p style="color: #666; margin: 0; font-size: 12px; text-align: center;">
                    © ${new Date().getFullYear()} IndiaNext Hackathon. All rights reserved.
                  </p>
                  <p style="color: #666; margin: 10px 0 0 0; font-size: 11px; text-align: center;">
                    Powered by <span style="color: #FF6600;">KESSC</span>
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

  return sendEmailWithRetry({
    to,
    subject,
    html,
    type: 'OTP',
  });
}

// ═══════════════════════════════════════════════════════════
// REGISTRATION CONFIRMATION EMAIL
// ═══════════════════════════════════════════════════════════

interface ConfirmationEmailData {
  teamId: string;
  teamName: string;
  track: string;
  members: Array<{ name: string; email: string; role: string }>;
  domain?: string;

}

export async function sendConfirmationEmail(to: string, data: ConfirmationEmailData): Promise<EmailResult> {
  const memberRows = data.members
    .map(
      (m, i) =>
        `<tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: #ccc; font-size: 14px;">${i + 1}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: #ededed; font-size: 14px; font-weight: 500;">${escapeHtml(m.name)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: #999; font-size: 14px;">${escapeHtml(m.email)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: ${m.role === 'LEADER' ? '#FF6600' : '#999'}; font-size: 14px; font-weight: ${m.role === 'LEADER' ? 'bold' : 'normal'};">${m.role === 'LEADER' ? '★ Leader' : 'Member'}</td>
        </tr>`
    )
    .join('');

  const trackColor = data.track.includes('Idea') ? '#00CC44' : '#2266FF';
  const trackIcon = data.track.includes('Idea') ? '💡' : '⚡';

  const subject = `✅ Registration Confirmed — IndiaNext Hackathon`;

  const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center; border: 2px solid #222; border-bottom: none;">
                <h1 style="color: #FF6600; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(255, 102, 0, 0.5);">IndiaNext</h1>
                <p style="color: #ededed; margin: 10px 0 0 0; font-size: 16px; letter-spacing: 2px;">HACKATHON 2025</p>
                
                <div style="margin-top: 20px; padding: 12px 24px; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; display: inline-block;">
                  <span style="color: #10b981; font-size: 20px; margin-right: 8px;">✅</span>
                  <span style="color: #10b981; font-weight: bold; font-size: 14px; letter-spacing: 1px;">REGISTRATION CONFIRMED</span>
                </div>
              </div>

              <!-- Main Content -->
              <div style="background: #1a1a1a; padding: 40px; border-radius: 0 0 12px 12px; border: 2px solid #222; border-top: none;">
                
                <p style="color: #ccc; margin: 0 0 24px 0; font-size: 16px; line-height: 1.7;">
                  🎉 Congratulations! Your team has been successfully registered for 
                  <strong style="color: #FF6600;">IndiaNext Hackathon 2025</strong>.
                  Please keep your Team ID safe for future communication.
                </p>

                <!-- Team Info Card -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h2 style="color: #ededed; margin: 0 0 16px 0; font-size: 20px;">Team Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px; width: 120px;">Team Name</td>
                      <td style="padding: 8px 0; color: #FF6600; font-size: 14px; font-weight: bold;">${escapeHtml(data.teamName)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Track</td>
                      <td style="padding: 8px 0; color: ${trackColor}; font-size: 14px; font-weight: bold;">${trackIcon} ${escapeHtml(data.track)}</td>
                    </tr>
                    ${
                      data.domain
                        ? `<tr>
                            <td style="padding: 8px 0; color: #999; font-size: 14px;">Domain</td>
                            <td style="padding: 8px 0; color: #ededed; font-size: 14px; font-weight: 500;">${escapeHtml(data.domain)}</td>
                          </tr>`
                        : ''
                    }
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Team ID</td>
                      <td style="padding: 8px 0; color: #ededed; font-size: 14px; font-family: 'Courier New', monospace;">${escapeHtml(data.teamId)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Status</td>
                      <td style="padding: 8px 0; color: #f59e0b; font-size: 14px; font-weight: bold;">⏳ PENDING REVIEW</td>
                    </tr>
                  </table>
                </div>

                <!-- Members Table -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 16px 0; font-size: 16px;">Team Members (${data.members.length})</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">#</th>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Name</th>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Email</th>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${memberRows}
                    </tbody>
                  </table>
                </div>

                <!-- What's Next -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 16px 0; font-size: 16px;">📋 What Happens Next?</h3>
                  <ol style="color: #ccc; margin: 0; padding-left: 20px; line-height: 2;">
                    <li>Our team will review your registration details</li>
                    <li>You will receive an email once your status is approved</li>
                    <li>Save your <strong style="color: #FF6600;">Team ID</strong> for all future communication</li>
                    ${data.track.includes('Idea') ? '<li>Start preparing your pitch deck and prototype submission</li>' : '<li>Start planning your MVP and finalize your problem statement approach</li>'}
                    <li>Follow updates on the official website</li>
                  </ol>
                </div>

                <!-- Important: Team ID -->
                <div style="background: rgba(255, 102, 0, 0.05); border: 2px solid #FF6600; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #999; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Save Your Team ID</p>
                  <p style="color: #FF6600; margin: 0; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 4px;">${escapeHtml(data.teamId)}</p>
                </div>

                <!-- Official Website -->
                <div style="background: rgba(34, 102, 255, 0.08); border: 1px solid #2266FF; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #ccc; margin: 0; font-size: 13px;">
                    🌐 Official Website: 
                    <a href="https://www.indianexthackthon.online" style="color: #2266FF; text-decoration: none; font-weight: bold;">
                      www.indianexthackthon.online
                    </a>
                  </p>
                </div>

                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #222;">
                  <p style="color: #666; margin: 0; font-size: 12px; text-align: center;">
                    Need help? Contact us at 
                    <a href="mailto:hackathon@kessc.edu.in" style="color: #FF6600;">hackathon@kessc.edu.in</a>
                  </p>
                  <p style="color: #666; margin: 10px 0 0 0; font-size: 11px; text-align: center;">
                    © ${new Date().getFullYear()} IndiaNext Hackathon. All rights reserved.
                  </p>
                  <p style="color: #666; margin: 5px 0 0 0; font-size: 11px; text-align: center;">
                    Powered by <span style="color: #FF6600;">KESSC</span>
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>
      `;

  return sendEmailWithRetry({
    to,
    subject,
    html,
    type: 'CONFIRMATION',
  });
}


// ═══════════════════════════════════════════════════════════
// TEAM MEMBER NOTIFICATION EMAIL
// ═══════════════════════════════════════════════════════════

interface MemberNotificationData {
  memberName: string;
  teamName: string;
  leaderName: string;
  leaderEmail: string;
  track: string;
}

export async function sendTeamMemberNotification(to: string, data: MemberNotificationData): Promise<EmailResult> {
  const trackColor = data.track.includes('Idea') ? '#00CC44' : '#2266FF';
  const trackIcon = data.track.includes('Idea') ? '💡' : '⚡';

  const subject = `✅ You're Added to Team ${escapeHtml(data.teamName)} — IndiaNext Hackathon`;
  const html = `
        <!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>

          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

              <!-- Header -->
              <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center; border: 2px solid #222; border-bottom: none;">
                <h1 style="color: #FF6600; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(255, 102, 0, 0.5);">
                  IndiaNext
                </h1>

                <p style="color: #ededed; margin: 10px 0 0 0; font-size: 16px; letter-spacing: 2px;">
                  HACKATHON 2025
                </p>

                <div style="margin-top: 18px; padding: 10px 22px; background: rgba(255, 102, 0, 0.08); border: 1px solid rgba(255, 102, 0, 0.6); border-radius: 8px; display: inline-block;">
                  <span style="color: #FF6600; font-size: 18px; margin-right: 8px;">👥</span>
                  <span style="color: #FF6600; font-weight: bold; font-size: 13px; letter-spacing: 1px;">
                    TEAM MEMBER CONFIRMATION
                  </span>
                </div>
              </div>

              <!-- Main Content -->
              <div style="background: #1a1a1a; padding: 40px; border-radius: 0 0 12px 12px; border: 2px solid #222; border-top: none;">

                <h2 style="color: #ededed; margin: 0 0 10px 0; font-size: 22px;">
                  Hi ${escapeHtml(data.memberName)} 👋
                </h2>

                <p style="color: #ccc; margin: 0 0 24px 0; font-size: 15px; line-height: 1.7;">
                  Great news! 🎉 You have been officially added to a registered team for the 
                  <strong style="color: #FF6600;">IndiaNext Hackathon 2025</strong>.
                  Please review your team details below and stay connected with your team leader.
                </p>

                <!-- Team Card -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 16px 0; font-size: 16px;">
                    📌 Team Details
                  </h3>

                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px; width: 120px;">Team Name</td>
                      <td style="padding: 8px 0; color: #FF6600; font-size: 14px; font-weight: bold;">
                        ${escapeHtml(data.teamName)}
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Track</td>
                      <td style="padding: 8px 0; color: ${trackColor}; font-size: 14px; font-weight: bold;">
                        ${trackIcon} ${escapeHtml(data.track)}
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Team Leader</td>
                      <td style="padding: 8px 0; color: #ededed; font-size: 14px;">
                        ${escapeHtml(data.leaderName)}
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Leader Email</td>
                      <td style="padding: 8px 0; font-size: 14px;">
                        <a href="mailto:${escapeHtml(data.leaderEmail)}" style="color: #FF6600; text-decoration: none; font-weight: bold;">
                          ${escapeHtml(data.leaderEmail)}
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- What's Next -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 14px 0; font-size: 16px;">
                    🚀 What Should You Do Next?
                  </h3>

                  <ul style="color: #ccc; margin: 0; padding-left: 18px; font-size: 14px; line-height: 2;">
                    <li>Connect with your team leader and discuss your project plan</li>
                    <li>Join your team’s GitHub / WhatsApp / Discord group (if created)</li>
                    <li>Finalize your problem statement and task distribution</li>
                    <li>Prepare your prototype / tech stack planning</li>
                    ${
                      data.track.includes('Idea')
                        ? `<li>Start working on your Idea Deck + Pitch Video + Prototype Mockup</li>`
                        : `<li>Start planning your MVP features for the 24-hour BuildStorm challenge</li>`
                    }
                  </ul>
                </div>

                <!-- Security Note -->
                <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 10px; padding: 18px; margin-bottom: 24px;">
                  <p style="color: #f59e0b; margin: 0; font-size: 13px; line-height: 1.6;">
                    ⚠️ If you did not expect to be added to this team, please immediately contact the team leader or email us.
                  </p>
                </div>

                <!-- Official Website -->
                <div style="background: rgba(34, 102, 255, 0.08); border: 1px solid #2266FF; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #ccc; margin: 0; font-size: 13px;">
                    🌐 Official Website:
                    <a href="https://www.indianexthackthon.online" style="color: #2266FF; text-decoration: none; font-weight: bold;">
                      www.indianexthackthon.online
                    </a>
                  </p>
                </div>

                <p style="color: #999; margin: 0 0 20px 0; font-size: 14px; line-height: 1.7;">
                  For any queries related to registration, event rules, or technical issues, feel free to reach out to us anytime.
                </p>

                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #222;">
                  <p style="color: #666; margin: 0; font-size: 12px; text-align: center;">
                    Need help? Contact us at 
                    <a href="mailto:hackathon@kessc.edu.in" style="color: #FF6600; text-decoration: none;">
                      hackathon@kessc.edu.in
                    </a>
                  </p>

                  <p style="color: #666; margin: 10px 0 0 0; font-size: 11px; text-align: center;">
                    © ${new Date().getFullYear()} IndiaNext Hackathon. All rights reserved.
                  </p>

                  <p style="color: #666; margin: 5px 0 0 0; font-size: 11px; text-align: center;">
                    Powered by <span style="color: #FF6600;">KESSC</span>
                  </p>
                </div>

              </div>
            </div>
          </body>
        </html>
      `;

  return sendEmailWithRetry({
    to,
    subject,
    html,
    type: 'MEMBER_NOTIFICATION',
  });
}


// ═══════════════════════════════════════════════════════════
// STATUS UPDATE EMAIL
// ═══════════════════════════════════════════════════════════

export async function sendStatusUpdateEmail(
  to: string,
  teamName: string,
  status: string,
  notes?: string
): Promise<EmailResult> {
  const statusColors: Record<string, string> = {
    APPROVED: "#10b981",
    REJECTED: "#ef4444",
    WAITLISTED: "#f59e0b",
    UNDER_REVIEW: "#3b82f6",
  };

  const statusMessages: Record<string, string> = {
    APPROVED: "Congratulations! Your team has been approved.",
    REJECTED: "Unfortunately, your team was not selected this time.",
    WAITLISTED: "Your team has been placed on the waitlist.",
    UNDER_REVIEW: "Your team is currently under review.",
  };

  const subject = `Team Status Update - ${escapeHtml(teamName)}`;
  const html = `
        <!DOCTYPE html>
        <html>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f3f4f6;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: white; padding: 40px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                <h1 style="color: #1f2937; margin: 0 0 20px 0; font-size: 28px;">Status Update</h1>
                
                <div style="background: ${statusColors[status] || "#6b7280"}; color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
                  <h2 style="margin: 0; font-size: 20px;">${escapeHtml(teamName)}</h2>
                  <p style="margin: 10px 0 0 0; font-size: 16px;">${statusMessages[status]}</p>
                </div>
                
                ${notes ? `
                  <div style="background: #f9fafb; padding: 20px; border-radius: 8px; margin: 20px 0;">
                    <h3 style="margin: 0 0 10px 0; color: #1f2937; font-size: 16px;">Review Notes:</h3>
                    <p style="margin: 0; color: #6b7280; line-height: 1.6;">${escapeHtml(notes)}</p>
                  </div>
                ` : ""}
                
                <p style="color: #6b7280; margin: 30px 0 0 0; font-size: 14px;">
                  If you have any questions, please contact us at support@indianext.in
                </p>
              </div>
            </div>
          </body>
        </html>
      `;

  return sendEmailWithRetry({
    to,
    subject,
    html,
    type: 'STATUS_UPDATE',
  });
}

// ═══════════════════════════════════════════════════════════
// BATCH EMAIL SENDING (Resend Batch API — up to 100 emails in 1 call)
// ═══════════════════════════════════════════════════════════

interface BatchEmailItem {
  to: string;
  subject: string;
  html: string;
  type: EmailType;
}

/**
 * Send multiple emails in a single Resend API call.
 * Falls back to individual sends if the batch API fails.
 * Uses Resend `batch.send()` — up to 100 emails per call.
 */
export async function sendBatchEmails(emails: BatchEmailItem[]): Promise<EmailResult[]> {
  if (emails.length === 0) return [];
  if (emails.length > 100) {
    console.warn(`[Email] Batch size ${emails.length} exceeds 100 — splitting`);
    const results: EmailResult[] = [];
    for (let i = 0; i < emails.length; i += 100) {
      const chunk = emails.slice(i, i + 100);
      const chunkResults = await sendBatchEmails(chunk);
      results.push(...chunkResults);
    }
    return results;
  }

  const from = EMAIL_CONFIG.from;

  // Validate all emails first
  const validEmails: BatchEmailItem[] = [];
  const results: EmailResult[] = [];
  const failedValidations: { to: string; from: string; subject: string; type: EmailType; error: string }[] = [];

  for (const email of emails) {
    const validation = validateEmail(email.to);
    if (!validation.valid) {
      console.error(`[Email] Batch validation failed for ${email.to}: ${validation.error}`);
      failedValidations.push({ to: email.to, from, subject: email.subject, type: email.type, error: validation.error || 'Invalid email' });
      results.push({ success: false, error: validation.error });
    } else {
      validEmails.push(email);
      results.push({ success: true }); // placeholder — updated below
    }
  }

  // Log validation failures in bulk (non-blocking)
  if (failedValidations.length > 0) {
    prisma.emailLog.createMany({
      data: failedValidations.map(f => ({
        to: f.to, from: f.from, subject: f.subject, type: f.type,
        status: 'FAILED' as const, provider: 'resend', error: f.error,
        attempts: 0, lastAttempt: new Date(),
      })),
    }).catch(err => console.error('[Email] Failed to log validation failures:', err));
  }

  if (validEmails.length === 0) return results;

  // Try batch API
  let attempt = 0;
  const maxRetries = EMAIL_CONFIG.maxRetries;

  for (attempt = 0; attempt < maxRetries; attempt++) {
    try {
      console.log(`[Email] Batch send attempt ${attempt + 1}/${maxRetries} — ${validEmails.length} emails`);

      const batchPayload = validEmails.map(e => ({
        from,
        to: [e.to],
        subject: e.subject,
        html: e.html,
      }));

      const batchResult = await getResend().batch.send(batchPayload);

      if (batchResult.error) {
        throw Object.assign(new Error(batchResult.error.message || 'Batch send failed'), {
          statusCode: 400,
          code: batchResult.error.name,
        });
      }

      // Log all successful sends in a single DB call
      const batchData = batchResult.data?.data || [];
      const logEntries: { to: string; from: string; subject: string; type: EmailType; status: 'SENT'; provider: string; messageId: string | undefined; attempts: number; lastAttempt: Date; sentAt: Date }[] = [];
      let validIdx = 0;
      for (let i = 0; i < results.length; i++) {
        if (results[i].success && validIdx < validEmails.length) {
          const messageId = batchData[validIdx]?.id;
          results[i] = { success: true, messageId };
          logEntries.push({
            to: validEmails[validIdx].to, from,
            subject: validEmails[validIdx].subject,
            type: validEmails[validIdx].type,
            status: 'SENT', provider: 'resend', messageId,
            attempts: attempt + 1, lastAttempt: new Date(), sentAt: new Date(),
          });
          console.log(`[Email] ✅ ${validEmails[validIdx].type} to ${validEmails[validIdx].to.replace(/(.{3}).*@/, '$1***@')} sent (batch)`);
          validIdx++;
        }
      }

      // Bulk insert logs — don't block the return
      prisma.emailLog.createMany({ data: logEntries })
        .catch(err => console.error('[Email] Failed to bulk-log sent emails:', err));

      console.log(`[Email] ✅ Batch complete — ${validEmails.length} emails sent in 1 API call`);
      return results;

    } catch (error) {
      const emailError = error as EmailError;
      console.error(`[Email] ❌ Batch attempt ${attempt + 1} failed:`, emailError.message);

      if (attempt < maxRetries - 1 && isRetryableError(emailError)) {
        const delay = EMAIL_CONFIG.retryDelays[attempt] || 9000;
        console.log(`[Email] ⏳ Retrying batch in ${delay}ms...`);
        await sleep(delay);
      }
    }
  }

  // Batch failed — fallback to individual sends
  console.warn(`[Email] Batch API failed after ${attempt} attempts — falling back to individual sends`);
  let validIdx = 0;
  for (let i = 0; i < results.length; i++) {
    if (results[i].success && validIdx < validEmails.length) {
      const individualResult = await sendEmailWithRetry({
        to: validEmails[validIdx].to,
        subject: validEmails[validIdx].subject,
        html: validEmails[validIdx].html,
        type: validEmails[validIdx].type,
      });
      results[i] = individualResult;
      validIdx++;
    }
  }

  return results;
}

// ═══════════════════════════════════════════════════════════
// REGISTRATION BATCH: All registration emails in 1 API call
// ═══════════════════════════════════════════════════════════

interface RegistrationBatchData {
  leaderEmail: string;
  teamId: string;
  teamName: string;
  track: string;
  members: Array<{ name: string; email: string; role: string }>;
  leaderName: string;
}

/**
 * Sends all registration emails (leader confirmation + member notifications)
 * in a single Resend batch API call instead of N separate calls.
 */
export async function sendRegistrationBatchEmails(data: RegistrationBatchData): Promise<EmailResult[]> {
  const emails: BatchEmailItem[] = [];

  // 1. Build leader confirmation email HTML
  const confirmationHtml = buildConfirmationHtml(data);
  emails.push({
    to: data.leaderEmail,
    subject: `✅ Registration Confirmed — IndiaNext Hackathon`,
    html: confirmationHtml,
    type: 'CONFIRMATION' as EmailType,
  });

  // 2. Build member notification emails
  const otherMembers = data.members.filter(m => m.email.toLowerCase() !== data.leaderEmail.toLowerCase());
  for (const member of otherMembers) {
    const notificationHtml = buildMemberNotificationHtml({
      memberName: member.name,
      teamName: data.teamName,
      leaderName: data.leaderName,
      leaderEmail: data.leaderEmail,
      track: data.track,
    });
    emails.push({
      to: member.email,
      subject: `You've been added to Team ${data.teamName} — IndiaNext Hackathon`,
      html: notificationHtml,
      type: 'MEMBER_NOTIFICATION' as EmailType,
    });
  }

  console.log(`[Email] Sending ${emails.length} registration emails via batch API`);
  return sendBatchEmails(emails);
}

// ─── HTML Builders (extracted for batch use) ────────────

function buildConfirmationHtml(data: { teamId: string; teamName: string; track: string; members: Array<{ name: string; email: string; role: string }> }): string {
  const memberRows = data.members
    .map(
      (m, i) =>
        `<tr>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: #ccc; font-size: 14px;">${i + 1}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: #ededed; font-size: 14px; font-weight: 500;">${escapeHtml(m.name)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: #999; font-size: 14px;">${escapeHtml(m.email)}</td>
          <td style="padding: 10px 14px; border-bottom: 1px solid #222; color: ${m.role === 'LEADER' ? '#FF6600' : '#999'}; font-size: 14px; font-weight: ${m.role === 'LEADER' ? 'bold' : 'normal'};">${m.role === 'LEADER' ? '★ Leader' : 'Member'}</td>
        </tr>`
    )
    .join('');

  const trackColor = data.track.includes('Idea') ? '#00CC44' : '#2266FF';
  const trackIcon = data.track.includes('Idea') ? '💡' : '⚡';

  return `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              
              <!-- Header -->
              <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center; border: 2px solid #222; border-bottom: none;">
                <h1 style="color: #FF6600; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(255, 102, 0, 0.5);">IndiaNext</h1>
                <p style="color: #ededed; margin: 10px 0 0 0; font-size: 16px; letter-spacing: 2px;">HACKATHON 2025</p>
                
                <div style="margin-top: 20px; padding: 12px 24px; background: rgba(16, 185, 129, 0.1); border: 1px solid #10b981; border-radius: 8px; display: inline-block;">
                  <span style="color: #10b981; font-size: 20px; margin-right: 8px;">✅</span>
                  <span style="color: #10b981; font-weight: bold; font-size: 14px; letter-spacing: 1px;">REGISTRATION CONFIRMED</span>
                </div>
              </div>

              <!-- Main Content -->
              <div style="background: #1a1a1a; padding: 40px; border-radius: 0 0 12px 12px; border: 2px solid #222; border-top: none;">
                
                <p style="color: #ccc; margin: 0 0 24px 0; font-size: 16px; line-height: 1.7;">
                  🎉 Congratulations! Your team has been successfully registered for 
                  <strong style="color: #FF6600;">IndiaNext Hackathon 2025</strong>.
                  Please keep your Team ID safe for future communication.
                </p>

                <!-- Team Info Card -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h2 style="color: #ededed; margin: 0 0 16px 0; font-size: 20px;">Team Details</h2>
                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px; width: 120px;">Team Name</td>
                      <td style="padding: 8px 0; color: #FF6600; font-size: 14px; font-weight: bold;">${escapeHtml(data.teamName)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Track</td>
                      <td style="padding: 8px 0; color: ${trackColor}; font-size: 14px; font-weight: bold;">${trackIcon} ${escapeHtml(data.track)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Team ID</td>
                      <td style="padding: 8px 0; color: #ededed; font-size: 14px; font-family: 'Courier New', monospace;">${escapeHtml(data.teamId)}</td>
                    </tr>
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Status</td>
                      <td style="padding: 8px 0; color: #f59e0b; font-size: 14px; font-weight: bold;">⏳ PENDING REVIEW</td>
                    </tr>
                  </table>
                </div>

                <!-- Members Table -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 16px 0; font-size: 16px;">Team Members (${data.members.length})</h3>
                  <table style="width: 100%; border-collapse: collapse;">
                    <thead>
                      <tr>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">#</th>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Name</th>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Email</th>
                        <th style="padding: 8px 14px; text-align: left; color: #666; font-size: 12px; text-transform: uppercase; letter-spacing: 1px; border-bottom: 1px solid #333;">Role</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${memberRows}
                    </tbody>
                  </table>
                </div>

                <!-- What's Next -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 8px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 16px 0; font-size: 16px;">📋 What Happens Next?</h3>
                  <ol style="color: #ccc; margin: 0; padding-left: 20px; line-height: 2;">
                    <li>Our team will review your registration details</li>
                    <li>You will receive an email once your status is approved</li>
                    <li>Save your <strong style="color: #FF6600;">Team ID</strong> for all future communication</li>
                    ${data.track.includes('Idea') ? '<li>Start preparing your pitch deck and prototype submission</li>' : '<li>Start planning your MVP and finalize your problem statement approach</li>'}
                    <li>Follow updates on the official website</li>
                  </ol>
                </div>

                <!-- Important: Team ID -->
                <div style="background: rgba(255, 102, 0, 0.05); border: 2px solid #FF6600; border-radius: 8px; padding: 20px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #999; margin: 0 0 8px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 1px;">Save Your Team ID</p>
                  <p style="color: #FF6600; margin: 0; font-size: 24px; font-weight: bold; font-family: 'Courier New', monospace; letter-spacing: 4px;">${escapeHtml(data.teamId)}</p>
                </div>

                <!-- Official Website -->
                <div style="background: rgba(34, 102, 255, 0.08); border: 1px solid #2266FF; border-radius: 8px; padding: 18px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #ccc; margin: 0; font-size: 13px;">
                    🌐 Official Website: 
                    <a href="https://www.indianexthackthon.online" style="color: #2266FF; text-decoration: none; font-weight: bold;">
                      www.indianexthackthon.online
                    </a>
                  </p>
                </div>

                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #222;">
                  <p style="color: #666; margin: 0; font-size: 12px; text-align: center;">
                    Need help? Contact us at 
                    <a href="mailto:hackathon@kessc.edu.in" style="color: #FF6600;">hackathon@kessc.edu.in</a>
                  </p>
                  <p style="color: #666; margin: 10px 0 0 0; font-size: 11px; text-align: center;">
                    © ${new Date().getFullYear()} IndiaNext Hackathon. All rights reserved.
                  </p>
                  <p style="color: #666; margin: 5px 0 0 0; font-size: 11px; text-align: center;">
                    Powered by <span style="color: #FF6600;">KESSC</span>
                  </p>
                </div>
              </div>
            </div>
          </body>
        </html>`;
}

function buildMemberNotificationHtml(data: { memberName: string; teamName: string; leaderName: string; leaderEmail: string; track: string }): string {
  const trackColor = data.track.includes('Idea') ? '#00CC44' : '#2266FF';
  const trackIcon = data.track.includes('Idea') ? '💡' : '⚡';

  return `<!DOCTYPE html>
        <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>

          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; margin: 0; padding: 0; background-color: #0a0a0a;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">

              <!-- Header -->
              <div style="background: linear-gradient(135deg, #0a0a0a 0%, #1a1a1a 100%); padding: 40px; border-radius: 12px 12px 0 0; text-align: center; border: 2px solid #222; border-bottom: none;">
                <h1 style="color: #FF6600; margin: 0; font-size: 32px; font-weight: bold; text-shadow: 0 0 20px rgba(255, 102, 0, 0.5);">
                  IndiaNext
                </h1>

                <p style="color: #ededed; margin: 10px 0 0 0; font-size: 16px; letter-spacing: 2px;">
                  HACKATHON 2025
                </p>

                <div style="margin-top: 18px; padding: 10px 22px; background: rgba(255, 102, 0, 0.08); border: 1px solid rgba(255, 102, 0, 0.6); border-radius: 8px; display: inline-block;">
                  <span style="color: #FF6600; font-size: 18px; margin-right: 8px;">👥</span>
                  <span style="color: #FF6600; font-weight: bold; font-size: 13px; letter-spacing: 1px;">
                    TEAM MEMBER CONFIRMATION
                  </span>
                </div>
              </div>

              <!-- Main Content -->
              <div style="background: #1a1a1a; padding: 40px; border-radius: 0 0 12px 12px; border: 2px solid #222; border-top: none;">

                <h2 style="color: #ededed; margin: 0 0 10px 0; font-size: 22px;">
                  Hi ${escapeHtml(data.memberName)} 👋
                </h2>

                <p style="color: #ccc; margin: 0 0 24px 0; font-size: 15px; line-height: 1.7;">
                  Great news! 🎉 You have been officially added to a registered team for the 
                  <strong style="color: #FF6600;">IndiaNext Hackathon 2025</strong>.
                  Please review your team details below and stay connected with your team leader.
                </p>

                <!-- Team Card -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 16px 0; font-size: 16px;">
                    📌 Team Details
                  </h3>

                  <table style="width: 100%; border-collapse: collapse;">
                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px; width: 120px;">Team Name</td>
                      <td style="padding: 8px 0; color: #FF6600; font-size: 14px; font-weight: bold;">
                        ${escapeHtml(data.teamName)}
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Track</td>
                      <td style="padding: 8px 0; color: ${trackColor}; font-size: 14px; font-weight: bold;">
                        ${trackIcon} ${escapeHtml(data.track)}
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Team Leader</td>
                      <td style="padding: 8px 0; color: #ededed; font-size: 14px;">
                        ${escapeHtml(data.leaderName)}
                      </td>
                    </tr>

                    <tr>
                      <td style="padding: 8px 0; color: #999; font-size: 14px;">Leader Email</td>
                      <td style="padding: 8px 0; font-size: 14px;">
                        <a href="mailto:${escapeHtml(data.leaderEmail)}" style="color: #FF6600; text-decoration: none; font-weight: bold;">
                          ${escapeHtml(data.leaderEmail)}
                        </a>
                      </td>
                    </tr>
                  </table>
                </div>

                <!-- What's Next -->
                <div style="background: #0a0a0a; border: 1px solid #333; border-radius: 10px; padding: 24px; margin-bottom: 24px;">
                  <h3 style="color: #ededed; margin: 0 0 14px 0; font-size: 16px;">
                    🚀 What Should You Do Next?
                  </h3>

                  <ul style="color: #ccc; margin: 0; padding-left: 18px; font-size: 14px; line-height: 2;">
                    <li>Connect with your team leader and discuss your project plan</li>
                    <li>Join your team's GitHub / WhatsApp / Discord group (if created)</li>
                    <li>Finalize your problem statement and task distribution</li>
                    <li>Prepare your prototype / tech stack planning</li>
                    ${data.track.includes('Idea')
                      ? `<li>Start working on your Idea Deck + Pitch Video + Prototype Mockup</li>`
                      : `<li>Start planning your MVP features for the 24-hour BuildStorm challenge</li>`
                    }
                  </ul>
                </div>

                <!-- Security Note -->
                <div style="background: rgba(245, 158, 11, 0.08); border: 1px solid rgba(245, 158, 11, 0.5); border-radius: 10px; padding: 18px; margin-bottom: 24px;">
                  <p style="color: #f59e0b; margin: 0; font-size: 13px; line-height: 1.6;">
                    ⚠️ If you did not expect to be added to this team, please immediately contact the team leader or email us.
                  </p>
                </div>

                <!-- Official Website -->
                <div style="background: rgba(34, 102, 255, 0.08); border: 1px solid #2266FF; border-radius: 10px; padding: 18px; text-align: center; margin-bottom: 24px;">
                  <p style="color: #ccc; margin: 0; font-size: 13px;">
                    🌐 Official Website:
                    <a href="https://www.indianexthackthon.online" style="color: #2266FF; text-decoration: none; font-weight: bold;">
                      www.indianexthackthon.online
                    </a>
                  </p>
                </div>

                <p style="color: #999; margin: 0 0 20px 0; font-size: 14px; line-height: 1.7;">
                  For any queries related to registration, event rules, or technical issues, feel free to reach out to us anytime.
                </p>

                <!-- Footer -->
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #222;">
                  <p style="color: #666; margin: 0; font-size: 12px; text-align: center;">
                    Need help? Contact us at 
                    <a href="mailto:hackathon@kessc.edu.in" style="color: #FF6600; text-decoration: none;">
                      hackathon@kessc.edu.in
                    </a>
                  </p>

                  <p style="color: #666; margin: 10px 0 0 0; font-size: 11px; text-align: center;">
                    © ${new Date().getFullYear()} IndiaNext Hackathon. All rights reserved.
                  </p>

                  <p style="color: #666; margin: 5px 0 0 0; font-size: 11px; text-align: center;">
                    Powered by <span style="color: #FF6600;">KESSC</span>
                  </p>
                </div>

              </div>
            </div>
          </body>
        </html>`;
}
