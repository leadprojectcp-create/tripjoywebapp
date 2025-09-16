import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "./contexts/AuthContext";
import { TranslationProvider } from "./contexts/TranslationContext";
import { Footer } from "./components/Footer";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "트립조이",
  description: "여행 이상의 연결, 트립조이",
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/logo.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko">
      <head>
        {/* 성능: 인증/파이어스토어로의 초기 연결 지연 감소 */}
        <link rel="preconnect" href="https://identitytoolkit.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <script
          src="https://developers.kakao.com/sdk/js/kakao.js"
          async
        />
      </head>
      <body className={inter.className}>
        <TranslationProvider>
          <AuthProvider>
            {children}
            <Footer />
          </AuthProvider>
        </TranslationProvider>
      </body>
    </html>
  );
}
