import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { sendOtpEmail, OTP_EXPIRY_MINUTES } from '@/lib/email';
import { rateLimitRoute, createRateLimitHeaders } from '@/lib/rate-limit';
import crypto from 'crypto';
import { z } from 'zod';
import type { OtpPurpose } from '@prisma/client';

// Input validation schema
const SendOtpSchema = z.object({
  email: z.string().email('Invalid email format'),
  purpose: z.enum(['REGISTRATION', 'LOGIN', 'PASSWORD_RESET', 'EMAIL_VERIFICATION']).default('REGISTRATION'),
  track: z.enum(['IDEA_SPRINT', 'BUILD_STORM']).optional(),
});

export async function POST(req: Request) {
  try {
    // Parse and validate input
    const body = await req.json();
    const validation = SendOtpSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'VALIDATION_ERROR',
          message: validation.error.errors[0].message,
          details: validation.error.errors,
        },
        { status: 400 }
      );
    }

    const { email, purpose, track } = validation.data;

    // ✅ Sliding-window rate limiting (IP + Email)
    // Limits centralised in lib/rate-limit.ts → RATE_LIMITS['send-otp']
    const rateLimit = await rateLimitRoute('send-otp', req, email);

    if (!rateLimit.success) {
      return NextResponse.json(
        {
          success: false,
          error: 'RATE_LIMIT_EXCEEDED',
          message: 'Too many OTP requests. Please wait before trying again.',
          retryAfter: Math.ceil((rateLimit.reset - Date.now()) / 1000),
        },
        { 
          status: 429,
          headers: createRateLimitHeaders(rateLimit),
        }
      );
    }

    // ✅ Check if email is already registered in any team (leader or member)
    if (purpose === 'REGISTRATION') {
      const existingMembership = await prisma.teamMember.findFirst({
        where: {
          user: { email: email.toLowerCase().trim() },
          team: { deletedAt: null },
        },
        include: {
          team: { select: { name: true, track: true } },
        },
      });

      if (existingMembership) {
        return NextResponse.json(
          {
            success: false,
            error: 'ALREADY_REGISTERED',
            message: `This email is already registered in team "${existingMembership.team.name}" (${existingMembership.team.track}). Each person can only be in one team.`,
          },
          { status: 409, headers: createRateLimitHeaders(rateLimit) }
        );
      }
    }

    // Generate 6-digit OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    
    // Hash OTP before storage (SHA-256)
    const otpHash = crypto.createHash('sha256').update(otp).digest('hex');
    
    const expiresAt = new Date(Date.now() + OTP_EXPIRY_MINUTES * 60 * 1000);

    // Upsert OTP record with hashed value
    await prisma.otp.upsert({
      where: {
        email_purpose: {
          email,
          purpose: purpose as OtpPurpose,
        },
      },
      update: {
        otp: otpHash, // Store hash, not plain text
        expiresAt,
        verified: false,
        attempts: 0,
      },
      create: {
        email,
        otp: otpHash, // Store hash, not plain text
        purpose: purpose as OtpPurpose,
        expiresAt,
        verified: false,
        attempts: 0,
      },
    });

    console.log(`[OTP] Generated for ${email}: hash=${otpHash.substring(0, 8)}... (${purpose})`);

    // Send email using Resend
    try {
      await sendOtpEmail(email, otp, track);
      
      return NextResponse.json(
        {
          success: true,
          message: 'OTP sent successfully',
          expiresIn: 600, // seconds
        },
        {
          headers: createRateLimitHeaders(rateLimit),
        }
      );
    } catch (emailError) {
      console.error('[OTP] Failed to send email:', emailError);

      // In development, return OTP for testing
      if (process.env.NODE_ENV === 'development') {
        return NextResponse.json(
          {
            success: true,
            message: 'OTP generated (email service unavailable)',
            debugOtp: otp, // Only in development
            expiresIn: 600,
          },
          {
            headers: createRateLimitHeaders(rateLimit),
          }
        );
      }

      return NextResponse.json(
        {
          success: false,
          error: 'EMAIL_SEND_FAILED',
          message: 'Failed to send OTP email. Please try again.',
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('[OTP] Error:', error);
    
    return NextResponse.json(
      {
        success: false,
        error: 'INTERNAL_ERROR',
        message: 'An unexpected error occurred. Please try again.',
      },
      { status: 500 }
    );
  }
}
