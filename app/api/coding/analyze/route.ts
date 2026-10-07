import { NextResponse } from 'next/server';
import { CODING_PLATFORMS, parseCodingHandle, type CodingPlatform } from '@/lib/coding/handles';
import { CodingProfileError, fetchCodingProfile } from '@/lib/coding/platforms';
import { summarizeCodingProfiles, type CodingPlatformStats } from '@/lib/coding/analyzer';

export async function POST(req: Request) {
  let handles: Record<string, unknown>;
  try {
    ({ handles } = await req.json());
  } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }
  if (!handles || typeof handles !== 'object') {
    return NextResponse.json({ error: 'Provide at least one coding profile' }, { status: 400 });
  }

  const requested: [CodingPlatform, string][] = [];
  const errors: Partial<Record<CodingPlatform, string>> = {};
  for (const platform of CODING_PLATFORMS) {
    const raw = handles[platform];
    if (typeof raw !== 'string' || !raw.trim()) continue;
    const handle = parseCodingHandle(platform, raw);
    if (handle) requested.push([platform, handle]);
    else errors[platform] = 'Not a valid username or profile URL for this platform.';
  }
  if (requested.length === 0 && Object.keys(errors).length === 0) {
    return NextResponse.json({ error: 'Provide at least one coding profile' }, { status: 400 });
  }

  const settled = await Promise.allSettled(requested.map(([platform, handle]) => fetchCodingProfile(platform, handle)));
  const platforms: CodingPlatformStats[] = [];
  settled.forEach((result, i) => {
    const [platform] = requested[i];
    if (result.status === 'fulfilled') {
      platforms.push(result.value);
    } else {
      const err = result.reason;
      if (!(err instanceof CodingProfileError)) console.error(`Coding profile analysis failed (${platform}):`, err);
      errors[platform] = err instanceof CodingProfileError ? err.message : 'Analysis failed. Try again later.';
    }
  });

  return NextResponse.json({ data: summarizeCodingProfiles(platforms), errors });
}
