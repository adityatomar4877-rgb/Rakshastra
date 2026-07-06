import React from "react";
import Footer from "@/components/Footer";

export const metadata = {
  title: "License & Terms | Rakshastra",
  description: "Rakshastra open-source developer license and disclaimer terms.",
};

export default function LicensePage() {
  return (
    <div className="bg-background-base text-foreground-base min-h-screen flex flex-col justify-between" style={{ background: '#0a0908', color: '#f6f4f2', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      {/* Background radial depth glow */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'radial-gradient(circle at 30% 20%, rgba(255, 125, 54, 0.05) 0%, transparent 40%), radial-gradient(circle at 70% 80%, rgba(139, 92, 246, 0.04) 0%, transparent 45%)',
        zIndex: 0,
        pointerEvents: 'none'
      }} />

      <main style={{ maxWidth: '800px', margin: '0 auto', padding: '6rem 2rem', zIndex: 1, position: 'relative' }}>
        <a href="/" style={{ color: '#ff7d36', textDecoration: 'none', fontSize: '0.9rem', display: 'inline-flex', alignItems: 'center', marginBottom: '2rem', fontWeight: 600 }}>
          &larr; Back to Home
        </a>

        <h1 style={{ fontSize: '2.5rem', fontWeight: 800, marginBottom: '0.5rem', color: '#ffffff', letterSpacing: '-0.03em' }}>
          License Terms
        </h1>
        <p style={{ color: '#8b8680', fontSize: '0.9rem', marginBottom: '3rem' }}>
          Rakshastra Autonomous Cyber Defense Agent &mdash; Open-Source License
        </p>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: 1.6, fontSize: '0.95rem', color: '#d1cdc7' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: 700 }}>
              1. Developer Grant & License Agreement
            </h2>
            <p>
              The Rakshastra codebase, tools, TUI modules, and dashboard files are released under a highly permissive open-source license.
              Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation 
              files (the &quot;Software&quot;), to deal in the Software without restriction, including without limitation the rights to 
              use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: 700 }}>
              2. Disclaimer of Liability
            </h2>
            <p style={{ fontFamily: 'monospace', fontSize: '0.85rem', color: '#ffbca0', background: 'rgba(255, 125, 54, 0.04)', padding: '1rem', borderRadius: '4px', border: '1px solid rgba(255, 125, 54, 0.1)' }}>
              THE SOFTWARE IS PROVIDED &quot;AS IS&quot;, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED 
              TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS 
              OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, 
              ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: 700 }}>
              3. Purpose and Scope
            </h2>
            <p>
              Rakshastra is built solely for educational demonstration, cyber defense modeling, and security testing. 
              Operators are expected to run the daemon only on infrastructure they own or are explicitly authorized to audit.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
