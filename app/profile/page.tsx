import Link from "next/link"

export default async function ProfilePage() {
  const user = { profile: { targetRole: "Software Engineer", githubUsername: "guest", portfolioUrl: "", location: "Remote" } }

  async function updateProfile(formData: FormData) {
    'use server';
    // Mock save
    console.log("Saving...", formData)
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-black font-sans">
      <header className="bg-white dark:bg-zinc-900 border-b border-gray-200 dark:border-zinc-800 px-6 py-4 flex items-center justify-between">
        <h1 className="text-xl font-bold tracking-tight text-gray-900 dark:text-white">Edit Profile</h1>
        <div className="flex items-center gap-4">
          <Link href="/profile/portfolio" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            Portfolio Analyzer
          </Link>
          <Link href="/profile/github" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white transition-colors">
            GitHub Analyzer
          </Link>
          <Link href="/profile/resume" className="text-sm font-medium text-blue-600 hover:text-blue-500">
            Resume Parser Engine
          </Link>
          <Link href="/dashboard" className="text-sm font-medium text-gray-600 hover:text-gray-900 dark:text-gray-300 dark:hover:text-white">
            Back to Dashboard
          </Link>
        </div>
      </header>
      
      <main className="mx-auto max-w-2xl p-6 mt-8">
        <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 rounded-xl p-8 shadow-sm">
          <h2 className="text-xl font-semibold mb-6 text-gray-900 dark:text-white">Your Information</h2>
          
          <form action={updateProfile} className="space-y-6">
            <div>
              <label htmlFor="targetRole" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Target Role</label>
              <input 
                type="text" 
                id="targetRole" 
                name="targetRole" 
                defaultValue={user.profile?.targetRole || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="e.g. Full Stack Developer"
              />
            </div>
            
            <div>
              <label htmlFor="githubUsername" className="block text-sm font-medium text-gray-700 dark:text-gray-300">GitHub Username</label>
              <input 
                type="text" 
                id="githubUsername" 
                name="githubUsername" 
                defaultValue={user.profile?.githubUsername || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="octocat"
              />
            </div>
            
            <div>
              <label htmlFor="portfolioUrl" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Portfolio URL</label>
              <input 
                type="url" 
                id="portfolioUrl" 
                name="portfolioUrl" 
                defaultValue={user.profile?.portfolioUrl || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="https://yourwebsite.com"
              />
            </div>
            
            <div>
              <label htmlFor="location" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Location</label>
              <input 
                type="text" 
                id="location" 
                name="location" 
                defaultValue={user.profile?.location || ''}
                className="mt-1 block w-full rounded-md border border-gray-300 py-2 px-3 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-blue-500 sm:text-sm dark:bg-zinc-800 dark:border-zinc-700 dark:text-white"
                placeholder="San Francisco, CA"
              />
            </div>
            
            <div className="pt-4 border-t border-gray-200 dark:border-zinc-800 flex justify-end">
              <button 
                type="submit" 
                className="rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600"
              >
                Save Changes
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  )
}
