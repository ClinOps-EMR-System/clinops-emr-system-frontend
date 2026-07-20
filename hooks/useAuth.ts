import { api } from "@/lib/api";
import { useAuth as useAuthContext, User } from "@/store/RoleContext";

export function useAuth() {
  const { login: ctxLogin, ...ctx } = useAuthContext();

  const login = async (credentials: {
    email?: string;
    username?: string;
    password: string;
    remember?: boolean;
  }) => {
    const data = await api.post("/login", credentials) as {
      data: { token: string; user: User };
    };
    const token = data.data.token;

    const me = await api.get("/user", token) as { data: User };
    ctxLogin(token, me.data);
    return token;
  };

  const signup = async (payload: {
    name: string;
    username: string;
    email: string;
    password: string;
  }) => {
    return api.post("/signup", payload);
  };

  const forgotPassword = async (email: string) => {
    return api.post("/forgot-password", { email });
  };

  const resetPassword = async (payload: {
    token: string;
    email: string;
    password: string;
    password_confirmation: string;
  }) => {
    return api.post("/reset-password", payload);
  };

  return { ...ctx, login, signup, forgotPassword, resetPassword };
}
