// lib/scoring/verdict.ts
export type FitVerdict = 'strong_fit' | 'good_fit' | 'stretch' | 'not_a_fit' | 'not_eligible';

export const VERDICT_LABEL: Record<FitVerdict, string> = {
  strong_fit: 'Strong Fit',
  good_fit: 'Good Fit',
  stretch: 'Stretch',
  not_a_fit: 'Not a Fit',
  not_eligible: 'Not Eligible',
};
