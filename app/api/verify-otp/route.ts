
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { email, otp } = await req.json();

    if (!email || !otp) {
      return NextResponse.json(
        { error: 'Email and OTP are required' },
        { status: 400 }
      );
    }

    const record = await prisma.otp.findUnique({
      where: { email },
    });

    if (!record) {
      return NextResponse.json(
        { error: 'No verification pending for this email. Request new OTP.' },
        { status: 404 }
      );
    }

    if (record.verified) {
      return NextResponse.json(
        { msg: 'Email already verified' },
        { status: 200 }
      );
    }

    if (new Date() > record.expiresAt) {
      return NextResponse.json(
        { error: 'OTP expired. Please request a new one.' },
        { status: 400 }
      );
    }

    if (record.otp !== otp) {
      return NextResponse.json(
        { error: 'Invalid OTP' },
        { status: 400 }
      );
    }

    // Mark as verified
    await prisma.otp.update({
      where: { email },
      data: { verified: true },
    });

    return NextResponse.json({ message: 'Email verified successfully' });
  } catch (error) {
    console.error('Error verifying OTP:', error);
    return NextResponse.json(
      { error: 'Internal Server Error' },
      { status: 500 }
    );
  }
}
