'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { loginAction } from '../actions'

export default function LoginPage() {
  const [state, formAction, pending] = useActionState(loginAction, null)

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-lg p-8 space-y-6">
      {/* Logo / Title */}
      <div className="text-center space-y-1">
        <div className="flex items-center justify-center gap-2 mb-2">
          <span className="text-3xl">🎬</span>
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 dark:text-white">
          Welcome back, author.
        </h1>
        <p className="text-sm text-gray-500 dark:text-gray-400">
          Your stories are waiting. Sign in to pick up where you left off.
        </p>
      </div>

      {/* Error */}
      {state?.error && (
        <div className="rounded-lg bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 px-4 py-3 text-sm text-red-700 dark:text-red-400">
          {state.error}
        </div>
      )}

      {/* Form */}
      <form action={formAction} className="space-y-4">
        <div className="space-y-1">
          <label
            htmlFor="email"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            placeholder="you@example.com"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div className="space-y-1">
          <label
            htmlFor="password"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300"
          >
            Password
          </label>
          <input
            id="password"
            name="password"
            type="password"
            required
            autoComplete="current-password"
            placeholder="••••••••"
            className="w-full rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 px-3 py-2 text-sm text-gray-900 dark:text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed px-4 py-2.5 text-sm font-semibold text-white transition-colors focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
        >
          {pending ? 'Signing in…' : 'Sign in'}
        </button>
      </form>

      {/* Footer link */}
      <p className="text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{' '}
        <Link
          href="/signup"
          className="font-medium text-indigo-600 hover:text-indigo-500 dark:text-indigo-400"
        >
          Sign up
        </Link>
      </p>
    </div>
  )
}
