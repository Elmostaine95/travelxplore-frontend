import { defineStore } from "pinia";
import {
  postLogin,
  postRegister,
  postResendVerification,
  getAuthMe,
  type AuthUser,
} from "../lib/api";

const TOKEN_KEY = "travelxplore:auth_token";
const USER_KEY = "travelxplore:auth_user";

function readStored(): { token: string | null; user: AuthUser | null } {
  try {
    const token = localStorage.getItem(TOKEN_KEY);
    const raw = localStorage.getItem(USER_KEY);
    const user = raw ? (JSON.parse(raw) as AuthUser) : null;
    return { token, user };
  } catch {
    return { token: null, user: null };
  }
}

export const useAuthStore = defineStore("auth", {
  state: () => {
    const { token, user } = readStored();
    return {
      token: token as string | null,
      user: user as AuthUser | null,
    };
  },
  getters: {
    isAuthenticated: (s) => Boolean(s.token),
    displayName: (s) =>
      s.user ? `${s.user.firstName} ${s.user.lastName}`.trim() || s.user.email : "",
  },
  actions: {
    setSession(token: string, user: AuthUser) {
      this.token = token;
      this.user = user;
      localStorage.setItem(TOKEN_KEY, token);
      localStorage.setItem(USER_KEY, JSON.stringify(user));
    },
    logout() {
      this.token = null;
      this.user = null;
      localStorage.removeItem(TOKEN_KEY);
      localStorage.removeItem(USER_KEY);
    },
    async login(email: string, password: string) {
      const res = await postLogin({ email, password });
      this.setSession(res.token, res.user);
    },
    async register(payload: {
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) {
      await postRegister(payload);
    },
    async resendVerification(email: string) {
      await postResendVerification({ email });
    },
    async fetchMe() {
      if (!this.token) return;
      try {
        const { user } = await getAuthMe(this.token);
        this.user = user;
        localStorage.setItem(USER_KEY, JSON.stringify(user));
      } catch {
        this.logout();
      }
    },
  },
});
