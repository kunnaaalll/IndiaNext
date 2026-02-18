
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { 
      track, 
      leaderEmail,
      teamName,
      leaderName,
      leaderPhone,
      leaderCollege,
      
      // Track A fields
      pastHackathonExperience,
      
      // Track B fields
      projectTitle,
      projectAbstract,
      techStack,
      focusArea,
      
      // Members (flat)
      member2Name, member2Email, member2Github, member2Linkedin,
      member3Name, member3Email, member3Github, member3Linkedin,
      member4Name, member4Email, member4Github, member4Linkedin,
      
      // Leader Extras
      leaderGithub,
      leaderLinkedin
    } = body;

    if (!track || !leaderEmail) {
      return NextResponse.json({ error: 'Track and Email are required' }, { status: 400 });
    }

    // Verify OTP status (Must be verified before calling this)
    const otpRecord = await prisma.otp.findUnique({
      where: { email: leaderEmail },
    });

    if (!otpRecord || !otpRecord.verified) {
      return NextResponse.json({ error: 'Email not verified. Please verify OTP first.' }, { status: 403 });
    }

    // Check if ALREADY registered FOR THIS TRACK
    if (track === 'A') {
      const existing = await prisma.solverRegistration.findUnique({
        where: { leaderEmail },
      });
      if (existing) {
        return NextResponse.json({ error: 'You have already registered for Track A (The Solvers).' }, { status: 409 });
      }

      await prisma.solverRegistration.create({
        data: {
          teamName,
          leaderName,
          leaderEmail,
          leaderPhone,
          leaderCollege,
          leaderGithub,
          leaderLinkedin,
          member2Name,
          member2Github,
          member2Linkedin,
          member3Name,
          member3Github,
          member3Linkedin,
          member4Name,
          member4Github,
          member4Linkedin,
          pastHackathonExperience,
        },
      });
    } else if (track === 'B') {
      const existing = await prisma.visionaryRegistration.findUnique({
        where: { leaderEmail },
      });
      if (existing) {
        return NextResponse.json({ error: 'You have already registered for Track B (The Visionaries).' }, { status: 409 });
      }

      await prisma.visionaryRegistration.create({
        data: {
          teamName,
          leaderName,
          leaderEmail,
          leaderPhone,
          leaderCollege,
          leaderGithub,
          leaderLinkedin,
          member2Name,
          member2Github,
          member2Linkedin,
          member3Name,
          member3Github,
          member3Linkedin,
          member4Name,
          member4Github,
          member4Linkedin,
          projectTitle,
          projectAbstract,
          techStack,
          focusArea,
        },
      });
    } else {
      return NextResponse.json({ error: 'Invalid Track' }, { status: 400 });
    }

    // Optional: Send confirmation email
    // ...

    return NextResponse.json({ message: 'Registration Successful!' });

  } catch (error) {
    console.error('Registration Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
