
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import crypto from 'crypto';
import nodemailer from 'nodemailer';

export async function POST(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Generate 6-digit OTP
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

    // Configure email transporter
    const transporter = nodemailer.createTransport({
      service: 'gmail', // Or use 'host', 'port' from env
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    // Send email
    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: 'Your Hackathon Verification Code',
      text: `Your OTP is: ${otp}. It expires in 10 minutes.`,
      html: `<div style="font-family: sans-serif; padding: 20px;">
              <h2>Hackathon Verification</h2>
              <p>Your verification code is:</p>
              <h1 style="background: #f0f0f0; padding: 10px; display: inline-block; letter-spacing: 5px;">${otp}</h1>
              <p>This code expires in 10 minutes.</p>
             </div>`,
    };

    if (process.env.EMAIL_USER) {
      await transporter.sendMail(mailOptions);
    } else {
      console.log(`[DEV] OTP for ${email}: ${otp}`);
    }

    return NextResponse.json({ message: 'OTP sent successfully' });
  } catch (error) {
    console.error('Error sending OTP:', error);
    return NextResponse.json(
      { error: 'Failed to send OTP' },
      { status: 500 }
    );
  }
}
