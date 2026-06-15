import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col min-h-full bg-zinc-950 text-white font-sans">
      {/* Nav */}
      <header className="flex items-center justify-between px-8 py-5 border-b border-zinc-800">
        <span className="text-2xl font-bold tracking-tight text-white">
          Book<span className="text-indigo-400">Reel</span>
        </span>
        <nav className="flex gap-4">
          <Link
            href="/login"
            className="px-5 py-2 rounded-full border border-zinc-700 text-sm font-medium text-zinc-300 hover:border-indigo-500 hover:text-white transition-colors"
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 rounded-full bg-indigo-600 text-sm font-medium text-white hover:bg-indigo-500 transition-colors"
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex flex-col items-center flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-24 pb-20 max-w-3xl mx-auto">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-indigo-500/40 bg-indigo-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-widest text-indigo-300">
            AI-Powered Book Marketing
          </div>
          <h1 className="text-5xl sm:text-6xl font-extrabold tracking-tight leading-tight mb-6">
            Turn your book into a{" "}
            <span className="text-indigo-400">cinematic trailer</span>{" "}
            in minutes
          </h1>
          <p className="text-lg text-zinc-400 max-w-xl mb-10">
            BookReel uses AI to craft stunning video trailers from your manuscript.
            Captivate readers before they even open the first page.
          </p>
          <div className="flex flex-col sm:flex-row gap-4">
            <Link
              href="/signup"
              className="px-8 py-3 rounded-full bg-indigo-600 text-base font-semibold hover:bg-indigo-500 transition-colors shadow-lg shadow-indigo-900/40"
            >
              Get Started — It&apos;s Free
            </Link>
            <Link
              href="/login"
              className="px-8 py-3 rounded-full border border-zinc-700 text-base font-semibold text-zinc-300 hover:border-indigo-500 hover:text-white transition-colors"
            >
              Login
            </Link>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full max-w-4xl px-6">
          <div className="h-px bg-gradient-to-r from-transparent via-zinc-700 to-transparent" />
        </div>

        {/* Feature Highlights */}
        <section className="w-full max-w-5xl px-6 py-20">
          <h2 className="text-center text-2xl font-bold text-zinc-200 mb-12">
            How it works
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/50 transition-colors">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M12 16.5v-9m0 0-3 3m3-3 3 3M3 17.25V19.5a2.25 2.25 0 0 0 2.25 2.25h13.5A2.25 2.25 0 0 0 21 19.5v-2.25M3 17.25h18"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Upload Your Book</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Drop in your manuscript or paste a synopsis. BookReel reads your story and
                extracts the essence that will captivate viewers.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/50 transition-colors">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09Z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">AI Generates Your Trailer</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Our AI selects cinematic visuals, generates a voiceover script, and produces a
                polished video trailer — in minutes, not weeks.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="flex flex-col items-center text-center p-8 rounded-2xl border border-zinc-800 bg-zinc-900 hover:border-indigo-500/50 transition-colors">
              <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600/20 text-indigo-400">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                  strokeWidth={1.5}
                  stroke="currentColor"
                  className="w-7 h-7"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.964-7.178Z"
                  />
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
                  />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-white mb-2">Readers Discover You</h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Share your trailer across social media, your author website, or BookReel&apos;s
                discovery feed. Turn viewers into lifelong readers.
              </p>
            </div>
          </div>
        </section>

        {/* CTA Banner */}
        <section className="w-full max-w-4xl px-6 pb-24">
          <div className="rounded-2xl bg-gradient-to-br from-indigo-700 to-indigo-900 p-12 text-center shadow-2xl shadow-indigo-950/60">
            <h2 className="text-3xl font-bold mb-4">Ready to bring your story to life?</h2>
            <p className="text-indigo-200 mb-8 max-w-md mx-auto">
              Join thousands of indie authors using BookReel to reach readers they never
              could before.
            </p>
            <Link
              href="/signup"
              className="inline-block px-10 py-3 rounded-full bg-white text-indigo-700 font-semibold text-base hover:bg-indigo-50 transition-colors shadow-md"
            >
              Create Your Free Trailer
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="border-t border-zinc-800 px-8 py-6 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} BookReel. All rights reserved.
      </footer>
    </div>
  );
}
