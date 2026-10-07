import { NextResponse } from 'next/server';
import { scrapePortfolio } from '@/lib/portfolio/analyzer';

export async function POST(req: Request) {
  try {
    const { url } = await req.json();

    if (!url) {
      return NextResponse.json({ error: 'Portfolio URL is required' }, { status: 400 });
    }

    const evidence = await scrapePortfolio(url);

    return NextResponse.json({
      success: true,
      data: evidence
    });

  } catch (error: any) {
    console.error('Portfolio analysis error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze portfolio' }, { status: 500 });
  }
}
