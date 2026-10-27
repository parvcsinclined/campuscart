"use client";

// Last-resort boundary for errors in the root layout itself. It must render its own <html>.
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: "system-ui, sans-serif", display: "grid", placeItems: "center", minHeight: "100vh", margin: 0, background: "#f7f5ef", color: "#1d1b16" }}>
        <main style={{ textAlign: "center", padding: 24 }}>
          <h1 style={{ fontSize: 28, marginBottom: 8 }}>CampusCart is having a moment</h1>
          <p style={{ color: "#6a645a" }}>Something went wrong while loading the app. Please try again.</p>
          {error.digest && <p style={{ fontSize: 12, color: "#6a645a" }}>Reference: {error.digest}</p>}
          <button onClick={reset} style={{ marginTop: 16, padding: "10px 18px", borderRadius: 12, border: 0, background: "#0e6b50", color: "#fff", fontWeight: 600 }}>
            Try again
          </button>
        </main>
      </body>
    </html>
  );
}
