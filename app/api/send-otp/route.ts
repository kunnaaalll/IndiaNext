
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: 'Email is required' }, { status: 400 });
    }

    // Check if user is already registered in EITHER track
    // If you want to check specific track, you need to pass it.
    // For now, let's keep it simple: just send OTP. 
    // We will validate registration uniqueness at the final submission step
    // because at this stage we might not know which track they are finalizing yet 
    // (though the new flow asks for track first, the OTP is usually generic).
    
    // Actually, prompt says: "One registration allowed per Mail id, of one track. People can apply in both track differently."
    // So sending OTP is fine even if they are registered in one track, as they might be applying for the other.

    const otp = crypto.randomInt(100000, 999999).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes from now

    // Upsert OTP record
    await prisma.otp.upsert({
      where: { email },
      update: {
        otp,
        expiresAt,
        verified: false,
      },
      create: {
        email,
        otp,
        expiresAt,
        verified: false,
      },
    });

    console.log(`Generated OTP for ${email}: ${otp}`);

    // Send email (Mock in dev if no creds, or try to send if env vars present)
    if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
      const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASS,
        },
      });

      await transporter.sendMail({
        from: `"IndiaNext Hackathon" <${process.env.EMAIL_USER}>`,
        to: email,
        subject: 'Your Verification Code',
        text: `Your OTP for IndiaNext Hackathon registration is: ${otp}. It expires in 10 minutes.`,
        html: `
          <div style="font-family: sans-serif; padding: 20px; border: 1px solid #ddd; border-radius: 8px;">
            <h2 style="color: #FF6600;">IndiaNext Login</h2>
            <p>Your verification code is:</p>
            <h1 style="color: #000; letter-spacing: 5px;">${otp}</h1>
            <p>This code expires in 10 minutes.</p>
          </div>
        `,
      });
      return NextResponse.json({ message: 'OTP sent successfully' });
    } else {
      // In development without credentials, just return success (OTP is logged)
      return NextResponse.json({ message: 'OTP generated (check console)', debugOpt: otp });
    }

  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
