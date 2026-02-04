import { Outlet } from "react-router-dom";
import Footer from "./Footer";
import Navbar from "./Navbar";

export default function SiteLayout() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      <Navbar />
      <main className="min-h-[70vh]">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
}
