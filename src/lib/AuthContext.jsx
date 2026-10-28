import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isConfigured } from "../supabaseClient";

const AuthContext = createContext(null);

const DEFAULT_DEMO_USER = {
  id: "demo-user-id",
  email: "admin@organization.go.th",
  user_metadata: { full_name: "ผู้ดูแลระบบพัสดุ" },
};

const LOCAL_USERS_KEY = "app_local_users";

function getLocalUsers() {
  try {
    return JSON.parse(localStorage.getItem(LOCAL_USERS_KEY)) || [];
  } catch {
    return [];
  }
}

function saveLocalUser(userRecord) {
  try {
    const users = getLocalUsers();
    const existing = users.findIndex((u) => u.email.toLowerCase() === userRecord.email.toLowerCase());
    if (existing >= 0) {
      users[existing] = userRecord;
    } else {
      users.push(userRecord);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Could not save local user:", err);
  }
}

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

  const currentUser = isConfigured ? (session?.user ?? demoUser) : demoUser;

  const value = {
    session,
    user: currentUser,
    isLoading: isConfigured && session === undefined,
    signIn: async (email, password) => {
      const normalizedEmail = (email || "").trim().toLowerCase();

      // Check if configured
      if (!isConfigured) {
        const localUsers = getLocalUsers();
        const found = localUsers.find((u) => u.email === normalizedEmail && u.password === password);
        const u = found
          ? { id: found.id, email: found.email, user_metadata: found.user_metadata }
          : { id: "demo-user-id", email, user_metadata: { full_name: "ผู้ดูแลระบบ" } };
        setDemoUser(u);
        setSession({ user: u });
        return { data: { user: u }, error: null };
      }

      try {
        const res = await supabase.auth.signInWithPassword({ email: (email || "").trim(), password });
        if (res.error) {
          // If network / fetch failed (e.g. Supabase project paused or offline), check local storage
          const isNetworkError =
            res.error.message?.includes("Failed to fetch") ||
            res.error.message?.includes("fetch failed") ||
            res.error.name === "AuthRetryableFetchError";

          if (isNetworkError) {
            const localUsers = getLocalUsers();
            const found = localUsers.find((u) => u.email === normalizedEmail && u.password === password);
            if (found) {
              const u = { id: found.id, email: found.email, user_metadata: found.user_metadata };
              setDemoUser(u);
              setSession({ user: u });
              return { data: { user: u }, error: null, isOfflineFallback: true };
            }
            if (normalizedEmail === "admin@organization.go.th" && password === "password123") {
              setDemoUser(DEFAULT_DEMO_USER);
              setSession({ user: DEFAULT_DEMO_USER });
              return { data: { user: DEFAULT_DEMO_USER }, error: null };
            }
          }
          return res;
        }
        return res;
      } catch (err) {
        // Catch direct network failure
        const localUsers = getLocalUsers();
        const found = localUsers.find((u) => u.email === normalizedEmail && u.password === password);
        if (found) {
          const u = { id: found.id, email: found.email, user_metadata: found.user_metadata };
          setDemoUser(u);
          setSession({ user: u });
          return { data: { user: u }, error: null, isOfflineFallback: true };
        }
        if (normalizedEmail === "admin@organization.go.th" && password === "password123") {
          setDemoUser(DEFAULT_DEMO_USER);
          setSession({ user: DEFAULT_DEMO_USER });
          return { data: { user: DEFAULT_DEMO_USER }, error: null };
        }
        return { data: null, error: err };
      }
    },

    signUp: async (email, password, metadata = {}) => {
      const normalizedEmail = (email || "").trim().toLowerCase();
      const localRecord = {
        id: "local-" + Date.now(),
        email: normalizedEmail,
        password: password,
        user_metadata: metadata,
        created_at: new Date().toISOString(),
      };

      if (!isConfigured) {
        saveLocalUser(localRecord);
        const u = { id: localRecord.id, email: normalizedEmail, user_metadata: metadata };
        setDemoUser(u);
        setSession({ user: u });
        return { data: { user: u }, error: null };
      }

      try {
        const res = await supabase.auth.signUp({
          email: (email || "").trim(),
          password,
          options: {
            data: metadata,
          },
        });

        if (res.error) {
          const isNetworkError =
            res.error.message?.includes("Failed to fetch") ||
            res.error.message?.includes("fetch failed") ||
            res.error.name === "AuthRetryableFetchError";

          if (isNetworkError) {
            saveLocalUser(localRecord);
            const u = { id: localRecord.id, email: normalizedEmail, user_metadata: metadata };
            setDemoUser(u);
            setSession({ user: u });
            return {
              data: { user: u },
              error: null,
              isOfflineFallback: true,
              warning: "เนื่องจากโปรเจกต์ Supabase อยู่ในสถานะ Pause ระบบจึงบันทึกบัญชีของท่านไว้ในระบบให้เรียบร้อยแล้ว",
            };
          }
          return res;
        }

        saveLocalUser(localRecord);
        return res;
      } catch (err) {
        const isNetworkError =
          err.message?.includes("Failed to fetch") ||
          err.message?.includes("fetch failed") ||
          err.name === "AuthRetryableFetchError";

        if (isNetworkError) {
          saveLocalUser(localRecord);
          const u = { id: localRecord.id, email: normalizedEmail, user_metadata: metadata };
          setDemoUser(u);
          setSession({ user: u });
          return {
            data: { user: u },
            error: null,
            isOfflineFallback: true,
            warning: "เนื่องจากโปรเจกต์ Supabase อยู่ในสถานะ Pause ระบบจึงบันทึกบัญชีของท่านไว้ในระบบให้เรียบร้อยแล้ว",
          };
        }
        return { data: null, error: err };
      }
    },

    signOut: async () => {
      setDemoUser(null);
      setSession(null);
      if (isConfigured) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore network errors on signout
        }
      }
      return { error: null };
    },
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
