import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "IdeaTent — Your weekly content plan",
  description: "Personalised, relevant weekly content ideas for your business.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
