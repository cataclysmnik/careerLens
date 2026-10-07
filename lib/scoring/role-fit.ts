// lib/scoring/role-fit.ts
// §13 role fit, §18 skill gap, §19 gap priority, §20 action ROI, §21 what-if.

import {
  ACTION_EFFORT,
  ACTION_TARGET_COMPONENT_VALUE,
  SKILL_COMPONENT_WEIGHTS,
  TARGET_BY_IMPORTANCE,
  UNOFFERED_SKILL_COMPONENTS,
  type SkillComponentKey,
  type VerificationLevel,
} from './config';
import { round1, verificationLevel } from './normalize';
import { resolveSkillScore, type ProofSource, type SkillScore } from './skill-score';
import { skillLabel } from './skill-taxonomy';

export type RoleRequirement = {
  id: string;
  label?: string;
  /** Other skills that satisfy this requirement equally ("Java or Python"). The best one counts. */
  alternatives?: string[];
  importance: 1 | 2 | 3 | 4 | 5;
  requirement?: 'required' | 'preferred';
  quote?: string;
};

export type RequirementResult = {
  id: string;
  label: string;
  alternatives: string[];
  /** Which skill satisfied the requirement when it has alternatives. */
  matchedSkill: string | null;
  importance: number;
  requirement: 'required' | 'preferred';
  quote: string;
  target: number;
  score: number;
  via: 'direct' | 'implied' | 'none';
  viaSkill: string | null;
  verification: VerificationLevel;
  insufficientEvidence: boolean;
  confidence: number;
  claimed: boolean;
  /** Proof behind the skill that satisfied this requirement; empty = no proof. */
  proof: ProofSource[];
  gap: number;
  priority: number;
  /** score × importance — this skill's numerator share in the role-fit formula. */
  contribution: number;
};

export type RoleFitResult = {
  fit: number;
  exactFit: number;
  numerator: number;
  denominator: number;
  requirements: RequirementResult[];
  /** Gaps > 0, highest priority first (§19). */
  gaps: RequirementResult[];
};

/** §13 — Role Fit = Σ(score × weight) / Σ(weight). Missing skills score 0 (§26). */
export function computeRoleFit(reqs: RoleRequirement[], scores: Map<string, SkillScore>): RoleFitResult {
  const requirements = reqs.map<RequirementResult>((r) => {
    const options = [r.id, ...(r.alternatives ?? [])];
    const best = options
      .map((id) => ({ id, resolved: resolveSkillScore(id, scores) }))
      .reduce((a, b) => (b.resolved.score > a.resolved.score ? b : a));
    const resolved = best.resolved;
    const target = TARGET_BY_IMPORTANCE[r.importance];
    const score = round1(resolved.score);
    const gap = round1(Math.max(0, target - score));
    const basis = resolved.via === 'implied' ? resolved.viaSkill : resolved.skill;
    return {
      id: best.id,
      label: r.label ?? options.map(skillLabel).join(' / '),
      alternatives: r.alternatives ?? [],
      matchedSkill: options.length > 1 && resolved.via !== 'none' ? skillLabel(best.id) : null,
      importance: r.importance,
      requirement: r.requirement ?? (r.importance >= 3 ? 'required' : 'preferred'),
      quote: r.quote ?? '',
      target,
      score,
      via: resolved.via,
      viaSkill: resolved.via === 'implied' ? resolved.viaSkill!.label : null,
      verification: verificationLevel(score),
      insufficientEvidence: basis ? basis.insufficientEvidence : true,
      confidence: basis?.confidence ?? 0,
      claimed: resolved.skill?.claimed ?? false,
      proof: basis?.proof ?? [],
      gap,
      priority: round1(gap * r.importance),
      contribution: round1(score * r.importance),
    };
  });

  const numerator = requirements.reduce((a, r) => a + r.score * r.importance, 0);
  const denominator = requirements.reduce((a, r) => a + r.importance, 0);
  const exactFit = denominator > 0 ? numerator / denominator : 0;

  return {
    fit: Math.round(exactFit),
    exactFit: round1(exactFit),
    numerator: round1(numerator),
    denominator,
    requirements,
    gaps: requirements.filter((r) => r.gap > 0).sort((a, b) => b.priority - a.priority || b.importance - a.importance),
  };
}

// ---------------------------------------------------------------------------
// Next best action (§20) with a what-if estimate (§21)
// ---------------------------------------------------------------------------

export type ActionKind = keyof typeof ACTION_EFFORT;

export type NextAction = {
  skillId: string;
  skill: string;
  kind: ActionKind;
  title: string;
  description: string;
  /** Expected skill-score gain if the action is completed. */
  expectedImprovement: number;
  importance: number;
  effort: number;
  /** (expected improvement × role importance) / effort */
  roi: number;
  /** Rough what-if: change in role fit (§21). A simulation, not a guarantee. */
  estimatedRoleFitGain: number;
  impact: 'High Impact' | 'Medium Impact' | 'Low Impact';
};

type Template = { kind: ActionKind; components: SkillComponentKey[]; title: (s: string) => string; description: (s: string) => string };

function templatesFor(skillId: string): Template[] {
  const build: Template =
    skillId === 'dsa'
      ? {
          kind: 'githubProject',
          components: ['github', 'project', 'recency'],
          title: () => 'Show your problem-solving publicly',
          description: () => 'Keep a public repo of solved DSA problems (or link an active LeetCode / Codeforces profile on your resume) and practise regularly — interviewers for this role will test it directly.',
        }
      : skillId === 'docker'
      ? {
          kind: 'dockerize',
          components: ['github', 'project'],
          title: () => 'Containerize and deploy a project',
          description: () => 'Add a Dockerfile and docker-compose.yml to one of your repos, then deploy it with a CI workflow. Each step is a higher Docker evidence milestone.',
        }
      : skillId === 'testing' || skillId === 'jest' || skillId === 'pytest'
        ? {
            kind: 'addTests',
            components: ['github', 'project'],
            title: () => 'Add automated tests to a project',
            description: () => 'Add a test suite (Jest / PyTest) to your strongest repo and run it in GitHub Actions.',
          }
        : {
            kind: 'githubProject',
            components: ['github', 'project', 'recency'],
            title: (s) => `Build and publish a project using ${s}`,
            description: (s) => `Ship a small but complete project that uses ${s}, push it to a public GitHub repo with a README, and add it to your resume. This creates observable evidence, not just a claim.`,
          };
  return [
    build,
    {
      kind: 'continueProject',
      components: ['recency', 'consistency'],
      title: (s) => `Keep your ${s} work active`,
      description: (s) => `Push meaningful updates to an existing ${s} repo over the next few weeks — recent, continued activity is part of the evidence score.`,
    },
    {
      kind: 'portfolioCaseStudy',
      components: ['portfolio'],
      title: (s) => `Showcase ${s} on your portfolio`,
      description: (s) => `Add a case study for a ${s} project to your portfolio site: the problem, your approach, and the result.`,
    },
    {
      kind: 'addToResume',
      components: ['resumeClaim'],
      title: (s) => `List ${s} on your resume`,
      description: (s) => `Your evidence shows ${s}, but your resume doesn't mention it. Add it alongside the project that demonstrates it.`,
    },
  ];
}

/**
 * For each gap, pick the evidence-building action with the best ROI, then rank
 * across gaps. Expected improvement is what the affected components would add
 * if raised to ACTION_TARGET_COMPONENT_VALUE.
 */
export function recommendActions(gaps: RequirementResult[], scores: Map<string, SkillScore>, roleWeightSum: number, limit = 5): NextAction[] {
  const actions: NextAction[] = [];

  for (const gap of gaps) {
    const skill = scores.get(gap.id);
    // For "Java / Python" requirements, recommend work on the specific skill that counted.
    const label = gap.alternatives.length ? skillLabel(gap.id) : gap.label;
    let best: NextAction | null = null;

    for (const t of templatesFor(gap.id)) {
      // "Keep it active" only makes sense when there's public work to continue.
      if (t.kind === 'continueProject' && !skill?.evidence.repos.length) continue;
      const improvement = t.components.reduce((acc, key) => {
        const c = skill?.components.find((x) => x.key === key);
        const current = c?.normalized ?? 0;
        const effW = c?.effectiveWeight ?? 0;
        if (key === 'resumeClaim') return acc + (current < 100 && skill ? effW * (100 - current) : 0);
        // A brand-new skill: use handoff weights normalized the same way as scored skills.
        const w = skill ? effW : defaultEffectiveWeight(key);
        return acc + w * Math.max(0, ACTION_TARGET_COMPONENT_VALUE - current);
      }, 0);
      if (improvement <= 0.5) continue;
      if (t.kind === 'portfolioCaseStudy' && !skill) continue;

      const effort = ACTION_EFFORT[t.kind];
      const roi = (improvement * gap.importance) / effort;
      const candidate: NextAction = {
        skillId: gap.id,
        skill: label,
        kind: t.kind,
        title: t.title(label),
        description: t.description(label),
        expectedImprovement: round1(improvement),
        importance: gap.importance,
        effort,
        roi: round1(roi),
        estimatedRoleFitGain: roleWeightSum > 0 ? round1((improvement * gap.importance) / roleWeightSum) : 0,
        impact: roi >= 15 ? 'High Impact' : roi >= 7 ? 'Medium Impact' : 'Low Impact',
      };
      if (!best || candidate.roi > best.roi) best = candidate;
    }
    if (best) actions.push(best);
  }

  return actions.sort((a, b) => b.roi - a.roi).slice(0, limit);
}

const OFFERED = (Object.keys(SKILL_COMPONENT_WEIGHTS) as SkillComponentKey[]).filter((k) => !UNOFFERED_SKILL_COMPONENTS.includes(k));
const OFFERED_SUM = OFFERED.reduce((a, k) => a + SKILL_COMPONENT_WEIGHTS[k], 0);
function defaultEffectiveWeight(key: SkillComponentKey): number {
  return OFFERED.includes(key) ? SKILL_COMPONENT_WEIGHTS[key] / OFFERED_SUM : 0;
}
