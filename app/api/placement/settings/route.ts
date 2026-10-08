import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import fs from "fs";
import path from "path";
import { READINESS_WEIGHTS } from "@/lib/scoring/config";
import { ROLE_CATALOG } from "@/lib/scoring/roles-catalog";

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    data: {
      weights: READINESS_WEIGHTS,
      roles: ROLE_CATALOG,
    }
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || session.user.role !== "PLACEMENT_CELL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { weights, roles } = await req.json();

  if (!weights || !roles) {
    return NextResponse.json({ error: "Invalid payload" }, { status: 400 });
  }

  const sum = Object.values(weights).reduce((a: any, b: any) => a + b, 0);
  if (Math.abs(sum - 1) > 1e-9) {
    return NextResponse.json({ error: "Weights must sum to 1.0" }, { status: 400 });
  }

  try {
    const configPath = path.join(process.cwd(), "lib/scoring/config.ts");
    let configContent = fs.readFileSync(configPath, "utf8");
    const weightsReplacement = `export const READINESS_WEIGHTS: Record<ReadinessDimensionKey, number> = ${JSON.stringify(weights, null, 2)};`;
    configContent = configContent.replace(
      /export const READINESS_WEIGHTS[^=]+=\s*\{[\s\S]*?\};/,
      weightsReplacement
    );
    // Auto-bump scoring version so reports update
    configContent = configContent.replace(
      /export const SCORING_VERSION = 'v([^']+)';/,
      (match, p1) => {
        const parts = p1.split('.');
        const minor = parseInt(parts[parts.length - 1], 10) + 1;
        parts[parts.length - 1] = minor.toString();
        return `export const SCORING_VERSION = 'v${parts.join('.')}';`;
      }
    );
    fs.writeFileSync(configPath, configContent);

    const rolesPath = path.join(process.cwd(), "lib/scoring/roles-catalog.ts");
    let rolesContent = fs.readFileSync(rolesPath, "utf8");
    const rolesReplacement = `export const ROLE_CATALOG: RoleDefinition[] = ${JSON.stringify(roles, null, 2)};`;
    rolesContent = rolesContent.replace(
      /export const ROLE_CATALOG[^=]+=\s*\[[\s\S]*?\];/,
      rolesReplacement
    );
    fs.writeFileSync(rolesPath, rolesContent);

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
