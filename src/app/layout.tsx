import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import AuthProvider from "@/components/AuthProvider";

export const metadata: Metadata = {
  title: "恒识 Evercog - AI 政策情报与业务经验中台",
  description: "面向中小微企业服务公司的 AI 政策情报与业务经验中台",
  icons: {
    icon: '/favicon.svg',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="font-sans bg-[#F3F4F6] min-h-full antialiased">
        <AuthProvider>
          <div className="flex h-screen">
            <Sidebar />
            <main className="flex-1 ml-[var(--sidebar-width,260px)] overflow-auto transition-all duration-300">
              {children}
            </main>
          </div>
        </AuthProvider>
      </body>
    </html>
  );
}
