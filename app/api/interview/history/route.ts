import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/db/prisma';

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== 'STUDENT') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const sessionId = searchParams.get('id');

  try {
    if (sessionId) {
      const single = await prisma.interviewSession.findFirst({
        where: { id: sessionId, userId: session.user.id },
      });
      if (!single) {
        return NextResponse.json({ error: 'Session not found' }, { status: 404 });
      }
      return NextResponse.json({ data: { session: single } });
    }

    const sessions = await prisma.interviewSession.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    const completed = sessions.filter((s) => s.status === 'completed' && s.overallScore !== null);

    // Compute progress metrics over time
    const totalSessions = completed.length;
    const scores = completed.map((s) => s.overallScore as number);
    const averageScore = scores.length > 0
      ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length)
      : 0;

    // Progress trend in chronological order
    const scoreTrend = [...completed]
      .reverse()
      .map((s) => ({
        id: s.id,
        date: s.createdAt.toISOString(),
        score: s.overallScore,
        roleTitle: s.roleTitle || s.projectTitle || 'Software Engineer',
        projectTitle: s.projectTitle,
        seniority: s.seniority || 'entry_mid',
      }));

    // Growth percentage compared to the initial session
    let growthRate: number | null = null;
    if (scoreTrend.length >= 2) {
      const firstScore = scoreTrend[0].score || 0;
      const latestScore = scoreTrend[scoreTrend.length - 1].score || 0;
      if (firstScore > 0) {
        growthRate = Math.round(((latestScore - firstScore) / firstScore) * 100);
      }
    }

    // Aggregated metrics
    const metricsSum = {
      roleFoundations: 0,
      projectDepth: 0,
      architecture: 0,
      communication: 0,
      count: 0,
    };
    const allStrengths: string[] = [];
    const allAreasToImprove: string[] = [];

    for (const s of completed) {
      const m = s.metrics as {
        roleFoundations?: number;
        projectDepth?: number;
        technicalDepth?: number;
        architecture?: number;
        communication?: number;
        clarity?: number;
      } | null;

      if (m) {
        metricsSum.roleFoundations += m.roleFoundations || m.technicalDepth || 0;
        metricsSum.projectDepth += m.projectDepth || m.technicalDepth || 0;
        metricsSum.architecture += m.architecture || 0;
        metricsSum.communication += m.communication || m.clarity || 0;
        metricsSum.count++;
      }

      const fb = s.feedback as { strengths?: string[]; areasToImprove?: string[] } | null;
      if (fb?.strengths) allStrengths.push(...fb.strengths);
      if (fb?.areasToImprove) allAreasToImprove.push(...fb.areasToImprove);
    }

    const metricsAverage = metricsSum.count > 0 ? {
      roleFoundations: Math.round(metricsSum.roleFoundations / metricsSum.count),
      projectDepth: Math.round(metricsSum.projectDepth / metricsSum.count),
      architecture: Math.round(metricsSum.architecture / metricsSum.count),
      communication: Math.round(metricsSum.communication / metricsSum.count),
    } : null;

    return NextResponse.json({
      data: {
        sessions,
        stats: {
          totalSessions,
          averageScore,
          growthRate,
          scoreTrend,
          metricsAverage,
          topStrengths: Array.from(new Set(allStrengths)).slice(0, 5),
          topAreasToImprove: Array.from(new Set(allAreasToImprove)).slice(0, 5),
        },
      },
    });
  } catch (error) {
    console.error('Failed to fetch interview history:', error);
    return NextResponse.json({ error: 'Failed to fetch interview history' }, { status: 500 });
  }
}
