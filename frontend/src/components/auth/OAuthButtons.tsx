import { FaApple, FaFacebook, FaGoogle } from "react-icons/fa";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export default function OAuthButtons() {
  const handleOAuthLogin = (provider: "google" | "facebook" | "apple") => {
    // Redirect to the backend OAuth endpoint
    window.location.href = `${API_URL}/auth/${provider}`;
  };

  return (
    <div className="space-y-3">
      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-white/10" />
        </div>
        <div className="relative flex justify-center text-sm">
          <span className="px-2 bg-gradient-to-br from-slate-900 via-purple-900/50 to-slate-900 text-white/60">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {/* Google OAuth */}
        <button
          type="button"
          onClick={() => handleOAuthLogin("google")}
          className="group relative flex justify-center py-3 px-4 border border-white/10 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 backdrop-blur-sm"
        >
          <FaGoogle className="h-5 w-5 text-white/80 group-hover:text-white transition-colors" />
        </button>

        {/* Facebook OAuth */}
        <button
          type="button"
          onClick={() => handleOAuthLogin("facebook")}
          className="group relative flex justify-center py-3 px-4 border border-white/10 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 backdrop-blur-sm"
        >
          <FaFacebook className="h-5 w-5 text-white/80 group-hover:text-white transition-colors" />
        </button>

        {/* Apple OAuth */}
        <button
          type="button"
          onClick={() => handleOAuthLogin("apple")}
          className="group relative flex justify-center py-3 px-4 border border-white/10 rounded-xl text-sm font-medium text-white bg-white/5 hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-purple-500 transition-all duration-200 backdrop-blur-sm"
        >
          <FaApple className="h-5 w-5 text-white/80 group-hover:text-white transition-colors" />
        </button>
      </div>
    </div>
  );
}
