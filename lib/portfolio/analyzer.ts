// lib/portfolio/analyzer.ts
import * as cheerio from 'cheerio';

export type PortfolioEvidence = {
  url: string;
  title: string | null;
  metaDescription: string | null;
  hasCaseStudies: boolean;
  liveLinksCount: number;
  githubLinksCount: number;
  detectedFrameworks: string[];
  seoScore: number;
  accessibilityScore: number;
  features: {
    hasDarkMode: boolean;
    hasOpenGraph: boolean;
    hasResponsiveMeta: boolean;
    hasSemanticHtml: boolean;
  };
};

export async function scrapePortfolio(url: string): Promise<PortfolioEvidence> {
  try {
    let targetUrl = url.trim();
    if (!/^https?:\/\//i.test(targetUrl)) {
      targetUrl = 'https://' + targetUrl;
    }

    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'CareerLens-PortfolioAnalyzer/2.0',
        'Accept': 'text/html,application/xhtml+xml',
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
    
    // SEO & Feature Heuristics
    const hasOpenGraph = $('meta[property^="og:"]').length > 0 || $('meta[name^="twitter:"]').length > 0;
    const hasResponsiveMeta = $('meta[name="viewport"]').attr('content')?.includes('width=device-width') || false;
    const hasSemanticHtml = $('main').length > 0 && $('nav').length > 0;
    
    // Dark mode detection (heuristic: looks for class "dark" on html/body or specific theme-color meta)
    const hasDarkMode = $('html').hasClass('dark') || 
                        $('body').hasClass('dark') || 
                        $('meta[name="color-scheme"]').attr('content')?.includes('dark') ||
                        html.includes('dark:');

    // Link analysis
    let liveLinksCount = 0;
    let githubLinksCount = 0;
    let totalAriaLabels = 0;
    
    $('a').each((_, el) => {
      const href = $(el).attr('href');
      if (href) {
        if (href.includes('github.com')) githubLinksCount++;
        else if (href.startsWith('http') && !href.includes(new URL(targetUrl).hostname)) liveLinksCount++;
      }
      if ($(el).attr('aria-label')) totalAriaLabels++;
    });

    // Content analysis for Case Studies
    const pageText = $('body').text().toLowerCase();
    const caseStudyKeywords = ['case study', 'architecture', 'built with', 'how i built', 'the problem', 'the solution', 'system design', 'tech stack', 'lessons learned'];
    const hasCaseStudies = caseStudyKeywords.filter(keyword => pageText.includes(keyword)).length >= 2;

    // Framework Detection via script tags, meta tags, and class names
    const detectedFrameworks = new Set<string>();
    
    // Core React/Next ecosystem
    if ($('div#__next').length > 0) detectedFrameworks.add('Next.js');
    if ($('div#___gatsby').length > 0) detectedFrameworks.add('Gatsby');
    if (html.includes('react')) detectedFrameworks.add('React');
    
    // Vue/Angular/Svelte
    if ($('div[data-v-app]').length > 0) detectedFrameworks.add('Vue.js');
    if ($('app-root').length > 0) detectedFrameworks.add('Angular');
    if (html.includes('svelte-') || html.includes('data-svelte')) detectedFrameworks.add('Svelte');
    if (html.includes('nuxt')) detectedFrameworks.add('Nuxt.js');
    if (html.includes('astro')) detectedFrameworks.add('Astro');
    
    // Styling/Animation
    if (html.includes('tailwind')) detectedFrameworks.add('Tailwind CSS');
    if (html.includes('framer-motion')) detectedFrameworks.add('Framer Motion');
    if (html.includes('gsap')) detectedFrameworks.add('GSAP');
    if (html.includes('styled-components')) detectedFrameworks.add('Styled Components');
    if (html.includes('three.js') || html.includes('webgl')) detectedFrameworks.add('Three.js');

    // Calculate SEO & Accessibility Score (0-100)
    let seoScore = 0;
    if (title) seoScore += 40;
    if (metaDescription) seoScore += 30;
    if (hasOpenGraph) seoScore += 30;

    let accessibilityScore = 0;
    if (hasResponsiveMeta) accessibilityScore += 30;
    if (hasSemanticHtml) accessibilityScore += 30;
    
    const imgCount = $('img').length;
    const imgWithAlt = $('img[alt]').length;
    if (imgCount > 0) {
      accessibilityScore += Math.round((imgWithAlt / imgCount) * 40);
    } else {
      accessibilityScore += 40; // No images to fail alt tag check
    }

    return {
      url: targetUrl,
      title,
      metaDescription,
      hasCaseStudies,
      liveLinksCount,
      githubLinksCount,
      detectedFrameworks: Array.from(detectedFrameworks),
      seoScore,
      accessibilityScore,
      features: {
        hasDarkMode,
        hasOpenGraph,
        hasResponsiveMeta,
        hasSemanticHtml
      }
    };

  } catch (error) {
    console.error("Portfolio scraping failed:", error);
    throw new Error("Could not analyze portfolio. Ensure the URL is accessible.");
  }
}
