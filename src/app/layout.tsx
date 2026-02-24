// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/context/AuthContext";
import { ThemeProvider } from "@/context/ThemeContext";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "JagaDoku - Asisten Finansial AI",
  description: "Kelola keuangan Anda dengan AI",
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: '/favicon.ico?v=2', sizes: 'any' },
      { url: '/icons/favicon-32x32.png?v=2', sizes: '32x32', type: 'image/png' },
      { url: '/icons/favicon-16x16.png?v=2', sizes: '16x16', type: 'image/png' },
    ],
    shortcut: '/favicon.ico?v=2',
    apple: '/icons/apple-touch-icon.png?v=2',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" data-scroll-behavior="smooth" suppressHydrationWarning style={{ backgroundColor: "#f8f9fc", colorScheme: "light" }}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                const theme = localStorage.getItem('jagadoku-theme') || 'light';
                const isDark = theme === 'dark';
                document.documentElement.style.backgroundColor = isDark ? '#0b1220' : '#f8f9fc';
                document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
                if (isDark) {
                  document.documentElement.classList.add('dark');
                } else {
                  document.documentElement.classList.remove('dark');
                }
              })();
            `,
          }}
        />
      </head>
      <body className={`${inter.className} bg-gray-50`} style={{ backgroundColor: "#f8f9fc" }}>
        <ThemeProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}