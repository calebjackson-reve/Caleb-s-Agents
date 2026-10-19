import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "AIRE Command Center",
  description: "Caleb Jackson's morning page: leads, follow-ups due, proposals out, overnight, showings.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
