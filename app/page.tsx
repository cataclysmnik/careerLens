import Link from "next/link";
import { ArrowRight, FileText, GitFork, Globe, ShieldCheck, Zap, Code2, LineChart } from "lucide-react";

export default function Home() {
  return (
    <div className="min-h-screen font-sans overflow-x-hidden selection:bg-blue-500/30">
      {/* Navigation */}
      <nav className="fixed top-0 w-full z-50 bg-white/70 dark:bg-zinc-950/70 backdrop-blur-xl border-b border-gray-200/50 dark:border-zinc-800/50 transition-all">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-gradient-to-tr from-blue-600 to-indigo-500 rounded-lg flex items-center justify-center text-white font-bold shadow-lg shadow-blue-500/20">C</div>
            <span className="font-bold text-xl tracking-tight">CareerLens</span>
          </div>
          <div className="flex items-center gap-6">
            <Link href="/login" className="text-sm font-semibold text-gray-600 dark:text-gray-300 hover:text-black dark:hover:text-white transition-colors">
              Sign In
            </Link>
            <Link 
              href="/register" 
              className="px-5 py-2.5 bg-black dark:bg-white text-white dark:text-black text-sm font-bold rounded-lg shadow-md hover:shadow-lg transition-all"
            >
              Get Started Free
            </Link>
          </div>
        </div>
      </nav>

      <main className="pt-32 pb-24">
        {/* Hero Section */}
        <section className="max-w-7xl mx-auto px-6 text-center space-y-8 relative">
          {/* Background Glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[600px] bg-blue-500/10 dark:bg-blue-600/15 blur-[120px] rounded-full -z-10 pointer-events-none"></div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 dark:bg-blue-900/20 border border-blue-200/50 dark:border-blue-800/50 text-blue-700 dark:text-blue-400 text-xs font-bold uppercase tracking-wider mb-2 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <Zap className="w-4 h-4 text-blue-600" /> Introducing CareerLens 2.0
          </div>
          
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter leading-[1.05] animate-in fade-in slide-in-from-bottom-6 duration-700 delay-100">
            Stop Guessing. <br className="hidden md:block" />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-indigo-500 dark:from-blue-400 dark:to-indigo-300">Prove Your Value.</span>
          </h1>
          
          <p className="max-w-2xl mx-auto text-lg md:text-xl text-gray-500 dark:text-gray-400 leading-relaxed animate-in fade-in slide-in-from-bottom-6 duration-700 delay-200 mt-6">
            The ultimate developer intelligence platform. Upload your resume, and let our engine cross-reference your GitHub and Portfolio to build an undeniable proof-of-skill model.
          </p>
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-10 animate-in fade-in slide-in-from-bottom-6 duration-700 delay-300">
            <Link 
              href="/register" 
              className="flex items-center gap-2 px-8 py-4 bg-blue-600 text-white font-bold rounded-xl shadow-lg shadow-blue-600/25 hover:bg-blue-700 transition-all w-full sm:w-auto justify-center group"
            >
              Analyze Your Profile
              <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
            <Link 
              href="/matcher" 
              className="flex items-center gap-2 px-8 py-4 bg-white dark:bg-zinc-900 text-gray-900 dark:text-white font-bold rounded-xl transition-all w-full sm:w-auto justify-center"
            >
              Try Job Matcher
            </Link>
          </div>
        </section>

        {/* Feature UI Sneak Peek */}
        <section className="max-w-5xl mx-auto px-6 mt-32">
          <div className="relative rounded-2xl border border-gray-200/60 dark:border-zinc-800/60 bg-white/50 dark:bg-zinc-900/40 backdrop-blur-xl shadow-2xl p-2 pb-0 overflow-hidden ring-1 ring-white/50 dark:ring-white/5">
            <div className="absolute inset-0 bg-gradient-to-b from-transparent to-[var(--background)] z-10 top-[60%]"></div>
            <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200/50 dark:border-zinc-800/50">
              <div className="w-3 h-3 rounded-full bg-red-400"></div>
              <div className="w-3 h-3 rounded-full bg-amber-400"></div>
              <div className="w-3 h-3 rounded-full bg-green-400"></div>
            </div>
            <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-6 relative z-0">
              {/* Mock UI Cards */}
              <div className="col-span-2 bg-gray-50 dark:bg-zinc-950 border border-gray-200/50 dark:border-zinc-800/50 rounded-xl p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="font-bold">Verified Skills Model</h3>
                  <span className="text-xs bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 px-3 py-1.5 rounded-md font-bold">92% Readiness</span>
                </div>
                <div className="space-y-3">
                  {['React', 'TypeScript', 'Node.js'].map((skill, i) => (
                    <div key={i} className="flex items-center justify-between p-3.5 bg-white dark:bg-zinc-900 rounded-lg">
                      <div className="flex items-center gap-3">
                        <Code2 className="w-5 h-5 text-blue-500" />
                        <span className="font-semibold text-sm">{skill}</span>
                      </div>
                      <div className="flex gap-2">
                        <span className="text-[10px] px-2 py-1 bg-gray-100 dark:bg-zinc-800 rounded font-bold uppercase text-gray-500">Resume</span>
                        <span className="text-[10px] px-2 py-1 bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 rounded font-bold uppercase">Github</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="space-y-6">
                <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200/50 dark:border-zinc-800/50 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full">
                   <LineChart className="w-8 h-8 text-indigo-500 mb-4" />
                   <h4 className="font-bold text-2xl mb-1">Top 5%</h4>
                   <p className="text-sm font-medium text-gray-500">Engineering Practices</p>
                </div>
                <div className="bg-gray-50 dark:bg-zinc-950 border border-gray-200/50 dark:border-zinc-800/50 rounded-xl p-6 flex flex-col items-center justify-center text-center h-full">
                   <ShieldCheck className="w-8 h-8 text-green-500 mb-4" />
                   <h4 className="font-bold text-2xl mb-1">100%</h4>
                   <p className="text-sm font-medium text-gray-500">Portfolio A11y</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Features Grid */}
        <section className="max-w-7xl mx-auto px-6 mt-40">
          <div className="text-center mb-20">
            <h2 className="text-3xl md:text-5xl font-black mb-6 tracking-tight">A complete picture of your talent.</h2>
            <p className="text-gray-500 dark:text-gray-400 text-lg md:text-xl font-medium">We don't just read words on a page. We verify your code.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-white dark:bg-zinc-900 p-8 group cursor-default">
              <div className="w-14 h-14 bg-blue-50 dark:bg-blue-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <FileText className="w-7 h-7 text-blue-600 dark:text-blue-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">AI Resume Parsing</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                Upload any PDF. Our hybrid deterministic and semantic engine extracts exactly what you claim to know.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 group cursor-default">
              <div className="w-14 h-14 bg-indigo-50 dark:bg-indigo-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:-rotate-3 transition-transform duration-300">
                <GitFork className="w-7 h-7 text-indigo-600 dark:text-indigo-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Deep GitHub Analysis</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                We scan your repositories, file trees, and contribution graphs to prove you actually write the code you claim.
              </p>
            </div>

            <div className="bg-white dark:bg-zinc-900 p-8 group cursor-default">
              <div className="w-14 h-14 bg-purple-50 dark:bg-purple-900/20 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform duration-300">
                <Globe className="w-7 h-7 text-purple-600 dark:text-purple-400" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Portfolio Scraper</h3>
              <p className="text-gray-500 dark:text-gray-400 leading-relaxed font-medium">
                We automatically detect your portfolio domain, scrape the source code, and run heuristics for SEO and Accessibility.
              </p>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
