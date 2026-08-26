import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drone Simulator — Flight Dynamics Workstation',
  description: 'Professional desktop flight dynamics simulator for 6-DOF multirotors.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body>
        <div id="root" className="h-full">
          {children}
        </div>
      </body>
    </html>
  );
}
