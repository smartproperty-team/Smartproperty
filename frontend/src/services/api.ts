import axios, { AxiosError, AxiosInstance } from "axios";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3000/api";

export const apiClient: AxiosInstance = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

// Add token to requests
apiClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  },
);

// Handle token refresh on 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as any;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        const refreshToken = localStorage.getItem("refreshToken");
        if (!refreshToken) {
          throw new Error("No refresh token");
        }

        const response = await axios.post(`${API_URL}/auth/refresh-token`, {
          refreshToken,
        });

        const { accessToken } = response.data.tokens;
        localStorage.setItem("accessToken", accessToken);

        originalRequest.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(originalRequest);
      } catch (refreshError) {
        localStorage.removeItem("accessToken");
        localStorage.removeItem("refreshToken");
        localStorage.removeItem("user");
        window.location.href = "/login";
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);

export default apiClient;
