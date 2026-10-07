import Link from "next/link";
import { ReadinessScore } from "@/components/dashboard/ReadinessScore";
import { CategoryScoreCard } from "@/components/dashboard/CategoryScoreCard";
import { StrengthsAndGaps } from "@/components/dashboard/StrengthsAndGaps";
import { RecommendedActions } from "@/components/dashboard/RecommendedActions";
import { ShieldCheck } from "lucide-react";

export default async function DashboardPage() {
  const user = { 
    name: "Guest User", 
    profile: { githubUsername: "guest", targetRole: "Software Engineer", skills: ["React", "TypeScript"] } 
  };

  // Mock data as requested for Phase 2
  const overallScore = 74;
  const categories = [
    { title: "Technical Skills", score: 82 },
    { title: "Project Quality", score: 76 },
    { title: "Problem Solving", score: 70 },
    { title: "Engineering Practices", score: 65 },
    { title: "Portfolio Strength", score: 80 },
    { title: "Professional Presence", score: 60 },
    { title: "Experience", score: 85 },
  ];
  const evidenceStrength = 88;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans text-gray-900 dark:text-gray-100">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-bold">C</div>
          <h1 className="text-xl font-bold tracking-tight">CareerLens Dashboard</h1>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/profile" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white transition-colors">
            Edit Profile
          </Link>
          <Link href="/" className="text-sm font-medium text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
            Home
          </Link>
        </div>
      </header>
      
      <main className="mx-auto max-w-6xl p-6 mt-6 pb-24">
        {/* Header Section */}
        <div className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold mb-1">Career Readiness Overview</h2>
            <p className="text-gray-500 dark:text-gray-400 text-sm">
              Analyzing <span className="font-medium text-gray-700 dark:text-gray-300">Target Role: {user.profile.targetRole}</span>
              <span className="mx-2 px-2 py-0.5 rounded bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400 text-xs font-semibold uppercase">Mock Data</span>
            </p>
          </div>
          <div className="flex items-center gap-2 bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-3 py-1.5 rounded-full border border-green-200 dark:border-green-900/50 text-sm font-medium">
            <ShieldCheck className="w-4 h-4" />
            <span>Evidence Strength: {evidenceStrength}%</span>
          </div>
        </div>

        {/* Top Row: Overall Score & Categories */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
          <div className="lg:col-span-1">
            <ReadinessScore score={overallScore} />
          </div>
          
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-4 uppercase tracking-wider">
              Category Breakdown
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {categories.map((cat, idx) => (
                <CategoryScoreCard key={idx} title={cat.title} score={cat.score} />
              ))}
            </div>
          </div>
        </div>

        {/* Middle Row: Strengths and Gaps */}
        <div className="mb-6">
          <StrengthsAndGaps />
        </div>

        {/* Bottom Row: Recommendations */}
        <div>
          <RecommendedActions />
        </div>

      </main>
    </div>
  )
}
