import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isConfigured } from "../supabaseClient";

const AuthContext = createContext(null);

const DEFAULT_DEMO_USER = {
  id: "demo-user-id",
  email: "admin@organization.go.th",
  user_metadata: { full_name: "ผู้ดูแลระบบพัสดุ" },
};

export function AuthProvider({ children }) {
  const [session, setSession] = useState(isConfigured ? undefined : { user: DEFAULT_DEMO_USER });
  const [demoUser, setDemoUser] = useState(isConfigured ? null : DEFAULT_DEMO_USER);

  useEffect(() => {
    if (!isConfigured) {
      setSession({ user: DEFAULT_DEMO_USER });
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => setSession(data?.session || null))
      .catch(() => setSession(null));

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const currentUser = isConfigured ? session?.user ?? null : demoUser;

  const value = {
    session,
    user: currentUser,
    isLoading: isConfigured && session === undefined,
    signIn: async (email, password) => {
      if (!isConfigured) {
        const u = { id: "demo-user-id", email, user_metadata: { full_name: "ผู้ดูแลระบบ" } };
        setDemoUser(u);
        setSession({ user: u });
        return { data: { user: u }, error: null };
      }
      return supabase.auth.signInWithPassword({ email, password });
    },
    signOut: async () => {
      if (!isConfigured) {
        setDemoUser(null);
        setSession(null);
        return { error: null };
      }
      return supabase.auth.signOut();
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
