import { NextResponse } from 'next/server';
import { fetchUserRepositories } from '@/lib/github/api';
import { analyzeGithubProfile } from '@/lib/github/analyzer';

export async function POST(req: Request) {
  try {
    const { username } = await req.json();

    if (!username) {
      return NextResponse.json({ error: 'GitHub username is required' }, { status: 400 });
    }

    const repos = await fetchUserRepositories(username);
    
    if (!repos || repos.length === 0) {
      return NextResponse.json({ error: 'No repositories found or user does not exist.' }, { status: 404 });
    }

    const evidence = analyzeGithubProfile(repos);

    return NextResponse.json({
      success: true,
      data: {
        username,
        totalRepos: repos.length,
        evidence
      }
    });

  } catch (error: any) {
    console.error('GitHub analysis error:', error);
    return NextResponse.json({ error: error.message || 'Failed to analyze GitHub profile' }, { status: 500 });
  }
}
