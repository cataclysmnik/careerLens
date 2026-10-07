// Demo override: when true, Company and Placement-Cell accounts skip the
// placement-cell approval step. NEXT_PUBLIC_ so the register page can hide the
// "requires approval" notice; it's a feature flag, not a secret.
export const SKIP_APPROVAL = process.env.NEXT_PUBLIC_DEMO_SKIP_APPROVAL === "true"
