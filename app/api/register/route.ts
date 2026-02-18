
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const { 
      teamName, 
      leaderName, 
      email, 
      phone, 
      college, 
      track, 
      projectTitle, 
      projectAbstract, 
      techStack, 
      screeningSolution, 
      skills, 
      portfolio, 
      comments 
    } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: 'Email is required' },
        { status: 400 }
      );
    }

    // Verify email is verified in OTP table first
    const otpRecord = await prisma.otp.findUnique({
      where: { email },
    });

    if (!otpRecord || !otpRecord.verified) {
      return NextResponse.json(
        { error: 'Please verify your email address first.' },
        { status: 400 }
      );
    }

    // Check if already registered
    const existingReg = await prisma.registration.findUnique({
      where: { email },
    });

    if (existingReg) {
      return NextResponse.json(
        { error: 'A team with this leader email is already registered.' },
        { status: 409 }
      );
    }

    // Depending on track, some fields might be optional/null, Prisma handles optional fields if they are ? in schema
    const registration = await prisma.registration.create({
      data: {
        teamName,
        leaderName,
        email,
        phone,
        college,
        track,
        projectTitle: projectTitle || null,
        projectAbstract: projectAbstract || null,
        techStack: techStack || null,
        screeningSolution: screeningSolution || null,
        skills: skills || null,
        portfolio: portfolio || null,
        comments: comments || null,
      },
    });

    return NextResponse.json({ 
      message: 'Registration successful! See you at the hackathon.',
      data: registration 
    }, { status: 201 });

  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Something went wrong during registration.' },
      { status: 500 }
    );
  }
}
