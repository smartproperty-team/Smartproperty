// ===========================================
// SmartProperty - Main Layout Component
// ===========================================

import { Navbar } from "./index";

interface LayoutProps {
  children: React.ReactNode;
  showNavbar?: boolean;
}

export default function Layout({ children, showNavbar = true }: LayoutProps) {
  return (
    <div className="min-h-screen bg-gray-50">
      {showNavbar && <Navbar />}
      <main className={showNavbar ? "pt-24" : ""}>{children}</main>
    </div>
  );
}
