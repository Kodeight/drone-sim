import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drone Simulator — Flight Dynamics Workstation',
  description: 'Professional desktop flight dynamics simulator for 6-DOF multirotors.',
};

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "worker-src 'self' blob:",
].join('; ');

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <head>
        <meta httpEquiv="Content-Security-Policy" content={CSP} />
      </head>
      <body>
        <div id="root" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
