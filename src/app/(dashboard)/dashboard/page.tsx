import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // Fetch profile for display name & tier
  const { data: profile } = await supabase
    .from('profiles')
    .select('full_name, subscription_tier')
    .eq('id', user.id)
    .single()

  const displayName = profile?.full_name ?? user.email ?? 'there'
  const tier = profile?.subscription_tier ?? 'free'

  const tierLabels: Record<string, string> = {
    free: 'Free',
    basic: 'Basic',
    pro: 'Pro',
  }

  const tierColors: Record<string, string> = {
    free: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    basic: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300',
    pro: 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300',
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-950">
      {/* Top nav */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-5xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🎬</span>
            <span className="font-bold text-gray-900 dark:text-white text-lg">
              BookReel
            </span>
          </div>
          <span
            className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ${tierColors[tier] ?? tierColors.free}`}
          >
            {tierLabels[tier] ?? 'Free'} Plan
          </span>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-12 space-y-8">
        {/* Welcome */}
        <div className="space-y-1">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {displayName}! 👋
          </h1>
          <p className="text-gray-500 dark:text-gray-400">
            Ready to create your next book trailer?
          </p>
        </div>

        {/* Subscription badge */}
        <div className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 p-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
              Current Plan
            </p>
            <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">
              {tierLabels[tier] ?? 'Free'}
            </p>
          </div>
          {tier !== 'pro' && (
            <button className="rounded-lg bg-indigo-600 hover:bg-indigo-700 px-4 py-2 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
              Upgrade Plan
            </button>
          )}
        </div>

        {/* CTA */}
        <div className="rounded-xl border-2 border-dashed border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 p-10 flex flex-col items-center justify-center text-center gap-4">
          <div className="rounded-full bg-indigo-50 dark:bg-indigo-900/20 p-4">
            <span className="text-4xl">📚</span>
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
              No books yet
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Upload your first book to get started generating a trailer.
            </p>
          </div>
          <button className="mt-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 px-6 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2">
            Upload Your Book
          </button>
        </div>
      </main>
    </div>
  )
}
