import Link from "next/link";

export default function Home() {
  return (
    <div
      className="flex flex-col min-h-full"
      style={{ backgroundColor: "#0A0A0F", color: "#F0EDE6", fontFamily: "var(--font-inter), sans-serif" }}
    >
      {/* Nav */}
      <header
        className="flex items-center justify-between px-8 py-5"
        style={{ borderBottom: "1px solid rgba(108,99,255,0.3)" }}
      >
        {/* Logo */}
        <span className="flex items-center gap-2 text-2xl select-none">
          <span style={{ color: "#F0EDE6", fontFamily: "var(--font-playfair), serif", fontWeight: 900 }}>
            Book
          </span>
          {/* Film-frame separator */}
          <span
            style={{
              display: "inline-block",
              width: "12px",
              height: "12px",
              border: "2px solid #F5A623",
              outline: "1px solid #F5A623",
              outlineOffset: "2px",
              backgroundColor: "#0A0A0F",
            }}
          />
          <span
            style={{
              color: "#F5A623",
              fontFamily: "var(--font-playfair), serif",
              fontWeight: 900,
              fontStyle: "italic",
            }}
          >
            Reel
          </span>
        </span>
        <nav className="flex gap-4">
          <Link
            href="/login"
            className="px-5 py-2 rounded-full text-sm font-medium transition-colors"
            style={{
              border: "1px solid rgba(108,99,255,0.5)",
              color: "#8A8A9A",
            }}
          >
            Login
          </Link>
          <Link
            href="/signup"
            className="px-5 py-2 rounded-full text-sm font-semibold transition-colors"
            style={{ backgroundColor: "#F5A623", color: "#0A0A0F" }}
          >
            Get Started
          </Link>
        </nav>
      </header>

      <main className="flex flex-col items-center flex-1">
        {/* Hero */}
        <section className="flex flex-col items-center text-center px-6 pt-28 pb-24 max-w-4xl mx-auto">
          <div
            className="mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-semibold uppercase tracking-widest"
            style={{
              border: "1px solid rgba(245,166,35,0.35)",
              backgroundColor: "rgba(245,166,35,0.08)",
              color: "#F5A623",
            }}
          >
            🎬 AI-Powered Book Marketing
          </div>
          <h1
            className="text-5xl sm:text-6xl lg:text-7xl leading-tight mb-8"
            style={{
              fontFamily: "var(--font-playfair), serif",
              fontWeight: 900,
              color: "#F0EDE6",
              lineHeight: 1.1,
            }}
          >
            Your Book Deserves a<br />
            <span style={{ color: "#F5A623" }}>Cinematic Moment.</span>
          </h1>
          <p
            className="text-lg max-w-2xl mb-10 leading-relaxed"
            style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif", fontWeight: 400 }}
          >
            Upload your manuscript. BookReel&apos;s AI crafts a stunning video trailer — ready to
            share in minutes. Turn readers into an audience.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/signup"
              className="px-8 py-4 rounded-full text-base font-semibold transition-all shadow-lg"
              style={{ backgroundColor: "#F5A623", color: "#0A0A0F" }}
            >
              🎬 Generate My Trailer — It&apos;s Free
            </Link>
            <a
              href="#how-it-works"
              className="px-8 py-4 rounded-full text-base font-medium transition-all"
              style={{
                border: "1px solid rgba(240,237,230,0.25)",
                color: "#F0EDE6",
              }}
            >
              See How It Works ↓
            </a>
          </div>
        </section>

        {/* Divider */}
        <div className="w-full max-w-5xl px-6">
          <div
            className="h-px"
            style={{ background: "linear-gradient(to right, transparent, #6C63FF44, transparent)" }}
          />
        </div>

        {/* Features Section */}
        <section className="w-full max-w-6xl px-6 py-24">
          <h2
            className="text-center text-3xl sm:text-4xl mb-4"
            style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
          >
            Why BookReel?
          </h2>
          <p
            className="text-center mb-16 max-w-xl mx-auto"
            style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif" }}
          >
            The complete cinematic toolkit for indie authors.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-8">
            {/* Feature 1 */}
            <div
              className="flex flex-col p-8 rounded-2xl transition-all"
              style={{
                backgroundColor: "#12121E",
                border: "1px solid rgba(108,99,255,0.2)",
              }}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
                style={{
                  backgroundColor: "rgba(245,166,35,0.15)",
                  color: "#F5A623",
                  fontFamily: "var(--font-playfair), serif",
                  fontWeight: 900,
                }}
              >
                01
              </div>
              <h3
                className="text-xl mb-3"
                style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
              >
                From PDF to Premiere in Minutes
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif", fontWeight: 400 }}
              >
                Drop in your manuscript and BookReel reads your story&apos;s tone, genre, and voice
                to build the perfect visual brief.
              </p>
            </div>

            {/* Feature 2 */}
            <div
              className="flex flex-col p-8 rounded-2xl transition-all"
              style={{
                backgroundColor: "#12121E",
                border: "1px solid rgba(108,99,255,0.2)",
              }}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
                style={{
                  backgroundColor: "rgba(245,166,35,0.15)",
                  color: "#F5A623",
                  fontFamily: "var(--font-playfair), serif",
                  fontWeight: 900,
                }}
              >
                02
              </div>
              <h3
                className="text-xl mb-3"
                style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
              >
                AI That Understands Story, Not Just Text
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif", fontWeight: 400 }}
              >
                Our cinematic AI maps your narrative arc, identifies emotional beats, and sequences
                scenes the way a film director would.
              </p>
            </div>

            {/* Feature 3 */}
            <div
              className="flex flex-col p-8 rounded-2xl transition-all"
              style={{
                backgroundColor: "#12121E",
                border: "1px solid rgba(108,99,255,0.2)",
              }}
            >
              <div
                className="mb-5 flex h-12 w-12 items-center justify-center rounded-full text-xl font-bold"
                style={{
                  backgroundColor: "rgba(245,166,35,0.15)",
                  color: "#F5A623",
                  fontFamily: "var(--font-playfair), serif",
                  fontWeight: 900,
                }}
              >
                03
              </div>
              <h3
                className="text-xl mb-3"
                style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
              >
                Get Found by Readers Who Are Ready to Watch
              </h3>
              <p
                className="text-sm leading-relaxed"
                style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif", fontWeight: 400 }}
              >
                Every trailer lives in BookReel&apos;s discovery feed — surfaced to readers by genre,
                mood, and reading taste.
              </p>
            </div>
          </div>
        </section>

        {/* How It Works */}
        <section
          id="how-it-works"
          className="w-full py-24"
          style={{ backgroundColor: "#12121E", borderTop: "1px solid rgba(108,99,255,0.15)", borderBottom: "1px solid rgba(108,99,255,0.15)" }}
        >
          <div className="max-w-5xl mx-auto px-6">
            <h2
              className="text-center text-3xl sm:text-4xl mb-4"
              style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
            >
              How It Works
            </h2>
            <p
              className="text-center mb-16 max-w-lg mx-auto"
              style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif" }}
            >
              Three steps from manuscript to cinematic trailer.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-10 relative">
              {/* Step 1 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                  style={{
                    backgroundColor: "#F5A623",
                    color: "#0A0A0F",
                    fontFamily: "var(--font-playfair), serif",
                    fontWeight: 900,
                  }}
                >
                  1
                </div>
                <h3
                  className="text-lg mb-2"
                  style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
                >
                  Upload
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Drop your manuscript or PDF into BookReel. We&apos;ll handle the rest.
                </p>
              </div>

              {/* Step 2 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                  style={{
                    backgroundColor: "#F5A623",
                    color: "#0A0A0F",
                    fontFamily: "var(--font-playfair), serif",
                    fontWeight: 900,
                  }}
                >
                  2
                </div>
                <h3
                  className="text-lg mb-2"
                  style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
                >
                  AI Analyzes
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Our AI reads your story&apos;s tone, genre, and emotional arc — building a cinematic visual brief.
                </p>
              </div>

              {/* Step 3 */}
              <div className="flex flex-col items-center text-center">
                <div
                  className="mb-5 flex h-16 w-16 items-center justify-center rounded-full text-2xl font-bold"
                  style={{
                    backgroundColor: "#F5A623",
                    color: "#0A0A0F",
                    fontFamily: "var(--font-playfair), serif",
                    fontWeight: 900,
                  }}
                >
                  3
                </div>
                <h3
                  className="text-lg mb-2"
                  style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, color: "#F0EDE6" }}
                >
                  Get Your Trailer
                </h3>
                <p
                  className="text-sm leading-relaxed"
                  style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif" }}
                >
                  Your polished video trailer is ready to share in minutes — on social, your site, or BookReel&apos;s feed.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom CTA Banner */}
        <section className="w-full max-w-5xl px-6 py-24">
          <div
            className="rounded-3xl p-12 sm:p-16 text-center"
            style={{ backgroundColor: "#F5A623" }}
          >
            <h2
              className="text-3xl sm:text-4xl mb-4"
              style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 900, color: "#0A0A0F" }}
            >
              Ready to give your book its cinematic moment?
            </h2>
            <p
              className="mb-8 max-w-md mx-auto text-base"
              style={{ color: "#12121E", fontFamily: "var(--font-inter), sans-serif", fontWeight: 500 }}
            >
              Join thousands of indie authors using BookReel to reach readers they never could before.
            </p>
            <Link
              href="/signup"
              className="inline-block px-10 py-4 rounded-full font-semibold text-base transition-colors"
              style={{ backgroundColor: "#0A0A0F", color: "#F5A623" }}
            >
              🎬 Generate My Trailer — It&apos;s Free
            </Link>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer
        className="px-8 py-8 text-center"
        style={{ borderTop: "1px solid rgba(108,99,255,0.2)" }}
      >
        <p
          className="text-lg mb-2"
          style={{ fontFamily: "var(--font-playfair), serif", fontWeight: 700, fontStyle: "italic", color: "#F5A623" }}
        >
          Every story deserves a trailer.
        </p>
        <p
          className="text-xs"
          style={{ color: "#8A8A9A", fontFamily: "var(--font-inter), sans-serif" }}
        >
          © {new Date().getFullYear()} BookReel. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
