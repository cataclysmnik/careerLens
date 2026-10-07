// lib/portfolio/analyzer.ts
import * as cheerio from 'cheerio';

export type PortfolioEvidence = {
  url: string;
  hasCaseStudies: boolean;
  liveLinksCount: number;
  githubLinksCount: number;
  detectedFrameworks: string[];
  metaDescription: string | null;
  title: string | null;
};

export async function scrapePortfolio(url: string): Promise<PortfolioEvidence> {
  try {
    // Add protocol if missing
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'CareerLens-PortfolioAnalyzer/1.0',
        'Accept': 'text/html,application/xhtml+xml,application/xml',
      },
      next: { revalidate: 3600 }
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch portfolio: HTTP ${response.status}`);
    }

    const html = await response.text();
    const $ = cheerio.load(html);

    // Meta analysis
    const title = $('title').text() || null;
    const metaDescription = $('meta[name="description"]').attr('content') || null;

    // Link analysis
    let liveLinksCount = 0;
    let githubLinksCount = 0;
    
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.includes('github.com')) githubLinksCount++;
        else if (href.startsWith('http') && !href.includes(new URL(targetUrl).hostname)) liveLinksCount++;
      }
    });

    // Content analysis for Case Studies
    const pageText = $('body').text().toLowerCase();
    const caseStudyKeywords = ['case study', 'architecture', 'built with', 'how i built', 'the problem', 'the solution', 'system design'];
    const hasCaseStudies = caseStudyKeywords.some(keyword => pageText.includes(keyword));

    // Framework Detection via script tags and meta tags
    const detectedFrameworks = new Set<string>();
    
    if ($('div#__next').length > 0) detectedFrameworks.add('Next.js');
    if ($('div#___gatsby').length > 0) detectedFrameworks.add('Gatsby');
    if ($('div[data-v-app]').length > 0) detectedFrameworks.add('Vue.js');
    if ($('app-root').length > 0) detectedFrameworks.add('Angular');
    
    $('script').each((_, el) => {
      const src = $(el).attr('src') || '';
      if (src.includes('react')) detectedFrameworks.add('React');
      if (src.includes('tailwind')) detectedFrameworks.add('Tailwind CSS');
    });

    return {
      url: targetUrl,
      hasCaseStudies,
      liveLinksCount,
      githubLinksCount,
      detectedFrameworks: Array.from(detectedFrameworks),
      metaDescription,
      title
    };

  } catch (error) {
    console.error("Portfolio scraping failed:", error);
    throw new Error("Could not analyze portfolio. Ensure the URL is accessible.");
  }
}
