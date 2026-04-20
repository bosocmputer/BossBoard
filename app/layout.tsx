import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "./sidebar";
import { ToastContainer } from "./components/Toast";
import { headers } from "next/headers";

export const metadata: Metadata = {
  title: "LEDGIO AI — ห้องประชุม AI",
  description: "ห้องประชุม AI สำหรับสำนักงานบัญชี — วิเคราะห์เร็ว ตัดสินใจเก่ง | LEDGIO AI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const headersList = await headers();
  const pathname = headersList.get("x-invoke-path") ?? headersList.get("x-pathname") ?? "";
  const isAuthPage = pathname.startsWith("/login");

  return (
    <html lang="th">
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-[100] focus:rounded-lg focus:px-3 focus:py-2 focus:text-sm focus:font-medium focus:bg-[var(--accent)] focus:text-[var(--bg)]"
        >
          ข้ามไปที่เนื้อหาหลัก
        </a>
        <Providers>
          <div className="min-h-screen md:flex">
            {!isAuthPage && <Sidebar />}
            <main id="main-content" tabIndex={-1} className={`flex-1 overflow-auto ${isAuthPage ? "" : "pt-14 md:pt-0"}`}>
              {children}
            </main>
            {!isAuthPage && <ToastContainer />}
          </div>
        </Providers>
      </body>
    </html>
  );
}
