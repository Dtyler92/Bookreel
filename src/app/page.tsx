import Link from "next/link";

export default function Home() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ backgroundColor: "var(--color-bg-primary)", color: "var(--color-text-body)", fontFamily: "var(--font-inter), sans-serif" }}
    >
      {/* Nav */}
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ backgroundColor: "var(--color-bg-primary)", borderBottom: "1px solid var(--color-border)" }}
      >
        {/* Logo */}
        <span className="flex items-center gap-2 text-2xl select-none">
          <span
            style={{
              color: "var(--color-text-heading)",
              fontFamily: "var(--font-playfair), serif",
              fontWeight: 900,
            }}
          >
            Book
          </span>
          {/* Film-frame square separator */}
          <span
            style={{
              display: "inline-block",
              width: "11px",
              height: "11px",
              border: "2px solid var(--color-accent)",
              outline: "1px solid var(--color-accent)",
              outlineOffset: "2px",
              backgroundColor: "var(--color-bg-primary)",
            }}
          />
          <span
            style={{
              color: "var(--color-accent)",
              fontFamily: "var(--font-playfair), serif",
              fontWeight: 900,
              fontStyle: "italic",
            }}
          >
            Reel
          </span>
        </span>

        {/* Nav links */}
        <nav className="flex items-center gap-6">
          <a
            href="#how-it-works"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--color-text-heading)" }}
          >
            How It Works
          </a>
          <Link
            href="/pricing"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--color-text-heading)" }}
          >
            Pricing
          </Link>
          <Link
            href="/for-authors"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--color-text-heading)" }}
          >
            For Authors
          </Link>
          <Link
            href="/login"
            className="text-sm font-medium transition-colors"
            style={{ color: "var(--color-text-heading)" }}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 text-sm font-semibold transition-colors"
            style={{
              backgroundColor: "var(--color-accent)",
              color: "var(--color-text-inverse)",
              borderRadius: "4px",
            }}
          >
            Make My Trailer
          </Link>
        </nav>
      </header>

      <main className="flex flex-col flex-1">
        {/* Hero */}
        <section
          className="flex flex-col items-center text-center px-6 max-w-5xl mx-auto w-full"
          style={{ paddingTop: "clamp(64px, 10vw, 112px)", paddingBottom: "clamp(64px, 10vw, 112px)" }}
        >
          <h1
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontWeight: 900,
              color: "var(--color-text-heading)",
              fontSize: "clamp(48px, 7vw, 88px)",
              lineHeight: 1.08,
              letterSpacing: "-0.02em",
              marginBottom: "28px",
            }}
          >
            Your Story Deserves to Be Seen.
          </h1>
          <p
            className="max-w-2xl"
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontStyle: "italic",
              fontSize: "clamp(17px, 2.2vw, 22px)",
              color: "var(--color-text-body)",
              lineHeight: 1.65,
              marginBottom: "48px",
            }}
          >
            You spent months — maybe years — writing your book. BookReel turns your manuscript into a cinematic trailer that gives readers a reason to stop scrolling and start reading. Upload your story, and we&apos;ll bring your characters and scenes to life on screen.
          </p>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <Link
              href="/signup"
              className="px-8 py-4 text-base font-semibold transition-all"
              style={{
                backgroundColor: "var(--color-accent)",
                color: "var(--color-text-inverse)",
                borderRadius: "4px",
              }}
            >
              Bring My Book to Life
            </Link>
            <a
              href="#sample-trailer"
              className="text-base transition-colors"
              style={{ color: "var(--color-text-muted)" }}
            >
              Watch a sample trailer →
            </a>
          </div>
        </section>

        {/* Thin rule below hero */}
        <div className="w-full px-8">
          <hr style={{ border: "none", borderTop: "1px solid var(--color-border)" }} />
        </div>

        {/* Features Section — Vellum background */}
        <section
          className="w-full py-24 px-6"
          style={{ backgroundColor: "var(--color-bg-surface)" }}
        >
          <div className="max-w-6xl mx-auto">
            {/* Section label */}
            <p
              className="text-center mb-3"
              style={{
                fontFamily: "var(--font-inter), sans-serif",
                fontSize: "11px",
                fontWeight: 600,
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "var(--color-text-muted)",
              }}
            >
              HOW IT WORKS
            </p>
            <p
              className="text-center mb-14"
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontStyle: "italic",
                fontSize: "clamp(16px, 2vw, 20px)",
                color: "var(--color-text-body)",
              }}
            >
              From manuscript to movie-worthy trailer — built entirely from your story.
            </p>

            {/* Feature cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Card 01 */}
              <div
                className="flex flex-col p-8"
                style={{
                  backgroundColor: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span
                  className="mb-5 text-sm font-bold"
                  style={{ color: "var(--color-accent)", fontFamily: "var(--font-inter), sans-serif", letterSpacing: "0.06em" }}
                >
                  01
                </span>
                <h3
                  className="text-xl mb-3"
                  style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "var(--color-text-heading)" }}
                >
                  We Read Your Manuscript
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter), sans-serif", fontWeight: 400 }}
                >
                  BookReel starts by reading your uploaded manuscript — your characters, your scenes, your voice. Nothing is invented or imported from anywhere else; every frame of your trailer is drawn directly from what you wrote.
                </p>
              </div>

              {/* Card 02 */}
              <div
                className="flex flex-col p-8"
                style={{
                  backgroundColor: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span
                  className="mb-5 text-sm font-bold"
                  style={{ color: "var(--color-accent)", fontFamily: "var(--font-inter), sans-serif", letterSpacing: "0.06em" }}
                >
                  02
                </span>
                <h3
                  className="text-xl mb-3"
                  style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "var(--color-text-heading)" }}
                >
                  Your Story Becomes a Storyboard
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter), sans-serif", fontWeight: 400 }}
                >
                  Our cinematic technology transforms the key moments of your book into a visual screenplay — the dramatic beats, the character introductions, the tension you crafted. Your words become the director&apos;s notes.
                </p>
              </div>

              {/* Card 03 */}
              <div
                className="flex flex-col p-8"
                style={{
                  backgroundColor: "var(--color-bg-primary)",
                  border: "1px solid var(--color-border)",
                  borderRadius: "4px",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}
              >
                <span
                  className="mb-5 text-sm font-bold"
                  style={{ color: "var(--color-accent)", fontFamily: "var(--font-inter), sans-serif", letterSpacing: "0.06em" }}
                >
                  03
                </span>
                <h3
                  className="text-xl mb-3"
                  style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "var(--color-text-heading)" }}
                >
                  A Trailer Built Around Your Book
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter), sans-serif", fontWeight: 400 }}
                >
                  In minutes, you&apos;ll have a 60–90 second trailer — original footage, a compelling voiceover, and music — built entirely from your manuscript. Ready to share anywhere readers find their next favourite book.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* How It Works Steps — white background */}
        <section
          id="how-it-works"
          className="w-full py-24 px-6"
          style={{ backgroundColor: "var(--color-bg-primary)" }}
        >
          <div className="max-w-4xl mx-auto">
            <h2
              className="text-center mb-14"
              style={{
                fontFamily: "var(--font-playfair), serif",
                fontWeight: 900,
                fontSize: "clamp(28px, 4vw, 44px)",
                color: "var(--color-text-heading)",
                lineHeight: 1.15,
              }}
            >
              Three Steps. One Trailer. All Your Story.
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center text-lg font-bold"
                  style={{
                    border: "2px solid var(--color-accent)",
                    color: "var(--color-accent)",
                    borderRadius: "50%",
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 700,
                  }}
                >
                  1
                </div>
                <h3
                  className="text-base mb-2"
                  style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, color: "var(--color-text-heading)" }}
                >
                  Upload Your Manuscript
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Drop in your PDF and let BookReel get acquainted with your story — your characters, your world, your words.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center text-lg font-bold"
                  style={{
                    border: "2px solid var(--color-accent)",
                    color: "var(--color-accent)",
                    borderRadius: "50%",
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 700,
                  }}
                >
                  2
                </div>
                <h3
                  className="text-base mb-2"
                  style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, color: "var(--color-text-heading)" }}
                >
                  Review Your Story&apos;s Highlights
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter), sans-serif" }}
                >
                  We&apos;ll surface the characters and scenes we&apos;ve pulled from your book — you confirm, adjust, and make sure it feels true to your vision.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-5 flex h-14 w-14 items-center justify-center text-lg font-bold"
                  style={{
                    border: "2px solid var(--color-accent)",
                    color: "var(--color-accent)",
                    borderRadius: "50%",
                    fontFamily: "var(--font-inter), sans-serif",
                    fontWeight: 700,
                  }}
                >
                  3
                </div>
                <h3
                  className="text-base mb-2"
                  style={{ fontFamily: "var(--font-inter), sans-serif", fontWeight: 600, color: "var(--color-text-heading)" }}
                >
                  Share Your Trailer with the World
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Download your finished trailer and post it everywhere your readers are — TikTok, Instagram, your author website, Amazon.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA — Vermillion background, full-width */}
        <section
          className="w-full py-24 px-6 text-center"
          style={{ backgroundColor: "var(--color-accent)" }}
        >
          <h2
            className="mb-4"
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontWeight: 900,
              fontSize: "clamp(28px, 4vw, 44px)",
              color: "var(--color-text-inverse)",
              lineHeight: 1.15,
            }}
          >
            Your Book Has Been Waiting for Its Moment.
          </h2>
          <p
            className="max-w-2xl mx-auto mb-8"
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontStyle: "italic",
              fontSize: "clamp(16px, 2vw, 20px)",
              color: "var(--color-text-inverse)",
              opacity: 0.9,
              lineHeight: 1.65,
            }}
          >
            Give readers something to feel before they even turn the first page. Your trailer is ready to be made — right now, from the manuscript you&apos;ve already written.
          </p>
          <Link
            href="/signup"
            className="inline-block px-10 py-4 text-base font-semibold transition-colors"
            style={{
              backgroundColor: "var(--color-text-inverse)",
              color: "var(--color-accent)",
              borderRadius: "4px",
            }}
          >
            Start With My Manuscript
          </Link>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="px-8 py-10 text-center"
        style={{ borderTop: "1px solid var(--color-border)", backgroundColor: "var(--color-bg-primary)" }}
      >
        <p
          className="mb-2 text-base"
          style={{
            fontFamily: "var(--font-playfair), serif",
            fontStyle: "italic",
            color: "var(--color-text-muted)",
          }}
        >
          Every great story deserves an audience.
        </p>
        <p
          className="text-xs"
          style={{ color: "var(--color-text-muted)", fontFamily: "var(--font-inter), sans-serif" }}
        >
          © {new Date().getFullYear()} BookReel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
