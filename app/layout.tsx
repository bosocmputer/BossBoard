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
        <Providers>
          <div className="min-h-screen md:flex">
            {!isAuthPage && <Sidebar />}
            <main className={`flex-1 overflow-auto ${isAuthPage ? "" : "pt-14 md:pt-0"}`}>
              {children}
            </main>
            {!isAuthPage && <ToastContainer />}
          </div>
        </Providers>
      </body>
    </html>
  );
}
