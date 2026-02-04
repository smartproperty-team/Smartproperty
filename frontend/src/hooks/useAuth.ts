import toast from "react-hot-toast";
import { useNavigate } from "react-router-dom";
import authService, {
  LoginRequest,
  RegisterRequest,
} from "../services/auth.service";
import { useAuthStore } from "../store/authStore";

export const useAuth = () => {
  const navigate = useNavigate();
  const {
    user,
    isAuthenticated,
    isLoading,
    error,
    login: storeLogin,
    logout: storeLogout,
    setLoading,
    setError,
    setTokens,
  } = useAuthStore();

  const login = async (credentials: LoginRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.login(credentials);
      const { accessToken, refreshToken } = response.tokens;
      const userData = response.user;

      // Store tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(userData));

      // Update store
      storeLogin(userData, accessToken, refreshToken);

      toast.success("Login successful!");
      navigate("/dashboard");
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Login failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const register = async (data: RegisterRequest) => {
    setLoading(true);
    setError(null);

    try {
      const response = await authService.register(data);
      const { accessToken, refreshToken } = response.tokens;
      const userData = response.user;

      // Store tokens
      localStorage.setItem("accessToken", accessToken);
      localStorage.setItem("refreshToken", refreshToken);
      localStorage.setItem("user", JSON.stringify(userData));

      // Update store
      storeLogin(userData, accessToken, refreshToken);

      toast.success("Registration successful!");
      navigate("/dashboard");
    } catch (err: any) {
      const message =
        err.response?.data?.message || "Registration failed. Please try again.";
      setError(message);
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  const logout = async () => {
    setLoading(true);

    try {
      await authService.logout();
    } catch (err) {
      console.error("Logout error:", err);
    } finally {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      localStorage.removeItem("user");

      storeLogout();
      setLoading(false);
      toast.success("Logged out successfully");
      navigate("/login");
    }
  };

  const refreshAccessToken = async () => {
    const refreshToken = localStorage.getItem("refreshToken");
    if (!refreshToken) {
      logout();
      return;
    }

    try {
      const response = await authService.refreshToken(refreshToken);
      const { accessToken } = response.tokens;

      localStorage.setItem("accessToken", accessToken);
      setTokens(accessToken, refreshToken);
    } catch (err) {
      logout();
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    login,
    register,
    logout,
    refreshAccessToken,
  };
};
