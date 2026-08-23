import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Drone Simulator - 6-DOF Quadrotor Control',
  description: 'Interactive 3D drone simulator with real-time PID tuning and telemetry',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full antialiased">{children}</body>
    </html>
  );
}
