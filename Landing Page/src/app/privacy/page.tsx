import React from "react";
import Footer from "@/components/Footer";

export const metadata = {
  title: "Privacy Statement | Rakshastra",
  description: "Rakshastra privacy policy and data collection commitment declaration.",
};

export default function PrivacyPage() {
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
          Privacy Statement
        </h1>
        <p style={{ color: '#8b8680', fontSize: '0.9rem', marginBottom: '3rem' }}>
          Last Updated: July 5, 2026
        </p>

        <section style={{ display: 'flex', flexDirection: 'column', gap: '2rem', lineHeight: 1.6, fontSize: '0.95rem', color: '#d1cdc7' }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: 700 }}>
              1. Local-First Architecture Commitment
            </h2>
            <p>
              Rakshastra is designed and built as a <strong>local-first, self-hosted autonomous agent</strong>. 
              All data processing, log analysis, threat intelligence evaluations, and monitoring databases run 
              entirely on your local infrastructure.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: 700 }}>
              2. Zero Data Collection Policy
            </h2>
            <p>
              We do not collect, harvest, store, or transmit any personal information, security logs, asset graphs, 
              or user identity data. There are no external databases, telemetry endpoints, or analytical trackers 
              configured inside the Rakshastra core platform. 
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: 700 }}>
              3. Security Logs and Local Storage
            </h2>
            <p>
              Any operational configurations, session databases, or telemetry metrics gathered by the local daemon 
              are written solely to your local disk (typically within the <code>~/.rakshastra/</code> workspace directory). 
              This information is never transmitted back to the authors or any third-party entities.
            </p>
          </div>

          <div>
            <h2 style={{ fontSize: '1.25rem', color: '#ffffff', marginBottom: '0.75rem', fontWeight: 700 }}>
              4. Open-Source Verification
            </h2>
            <p>
              As a project developed by student researchers and developers, the codebase is fully open-source. 
              Operators are encouraged to audit, inspect, and verify the network behavior of the application 
              directly from the public source repository.
            </p>
          </div>

          <div style={{ marginTop: '2rem', padding: '1.25rem', border: '1px solid rgba(255, 125, 54, 0.15)', borderRadius: '6px', background: 'rgba(255, 125, 54, 0.02)' }}>
            <h3 style={{ fontSize: '1rem', color: '#ff7d36', marginBottom: '0.5rem', fontWeight: 700 }}>
              Contact and False Positive Disclosures
            </h3>
            <p style={{ margin: 0, fontSize: '0.9rem', color: '#a39e95' }}>
              If you have any questions regarding privacy boundaries, or if security utilities flag Rakshastra due to 
              its local agent auditing capabilities, please contact the development team via the project repository channel.
            </p>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  );
}
