import ErrorBoundary from "@/components/ErrorBoundary";
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import { Toaster } from "react-hot-toast";
import "./app.css";

if (process.env.NODE_ENV === "development") {
  import("../utils/debugUtils");
}

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Coinflip Game",
  description: "A simplified coinflip game",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${inter.className} h-full bg-base-100 text-base-content`}
      >
        <ErrorBoundary>
          {children}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              className: "bg-base-200 text-base-content",
              success: {
                duration: 3000,
                className: "bg-success text-success-content",
              },
              error: {
                duration: 5000,
                className: "bg-error text-error-content",
              },
            }}
          />
        </ErrorBoundary>
      </body>
    </html>
  );
}
