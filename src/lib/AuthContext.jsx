import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isConfigured } from "../supabaseClient";

const AuthContext = createContext(null);

const DEFAULT_DEMO_USER = {
  id: "demo-user-id",
  email: "admin@organization.go.th",
  user_metadata: { full_name: "ผู้ดูแลระบบพัสดุ" },
};

const LOCAL_USERS_KEY = "app_local_users";
const ACTIVE_USER_KEY = "app_active_user";

function getLocalUsers() {
  try {
    const data = localStorage.getItem(LOCAL_USERS_KEY);
    return data ? JSON.parse(data) : [];
  } catch {
    return [];
  }
}

function saveLocalUser(userRecord) {
  try {
    const users = getLocalUsers();
    const existingIndex = users.findIndex(
      (u) => u.email.toLowerCase() === userRecord.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      users[existingIndex] = { ...users[existingIndex], ...userRecord };
    } else {
      users.push(userRecord);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Could not save local user:", err);
  }
}

function getActiveUser() {
  try {
    const data = localStorage.getItem(ACTIVE_USER_KEY);
    return data ? JSON.parse(data) : null;
  } catch {
    return null;
  }
}

function saveActiveUser(u) {
  try {
    if (u) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(u));
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch (err) {
    console.warn("Could not save active user:", err);
  }
}

export function AuthProvider({ children }) {
  const [activeUser, setActiveUser] = useState(() => getActiveUser());
  const [session, setSession] = useState(isConfigured ? undefined : (activeUser ? { user: activeUser } : null));

  useEffect(() => {
    if (!isConfigured) {
      const active = getActiveUser();
      setSession(active ? { user: active } : null);
      setActiveUser(active);
      return;
    }

    supabase.auth
      .getSession()
      .then(({ data }) => {
        if (data?.session) {
          setSession(data.session);
          saveActiveUser(data.session.user);
          setActiveUser(data.session.user);
        } else {
          // If no remote session, check local active user
          const active = getActiveUser();
          setSession(active ? { user: active } : null);
          setActiveUser(active);
        }
      })
      .catch(() => {
        const active = getActiveUser();
        setSession(active ? { user: active } : null);
        setActiveUser(active);
      });

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      if (newSession?.user) {
        saveActiveUser(newSession.user);
        setActiveUser(newSession.user);
      }
    });

    return () => {
      listener?.subscription?.unsubscribe();
    };
  }, []);

  const currentUser = isConfigured ? (session?.user ?? activeUser) : activeUser;

  const value = {
    session,
    user: currentUser,
    isLoading: isConfigured && session === undefined,

    signIn: async (email, password) => {
      const normalizedEmail = (email || "").trim().toLowerCase();
      const pwd = String(password || "").trim();

      // 1. ตรวจสอบในฐานข้อมูลบัญชีท้องถิ่น (Local Users) ก่อนเสมอ
      const localUsers = getLocalUsers();
      const localUser = localUsers.find((u) => u.email === normalizedEmail);

      if (localUser) {
        if (String(localUser.password).trim() === pwd) {
          const u = {
            id: localUser.id,
            email: localUser.email,
            user_metadata: localUser.user_metadata || { full_name: "ผู้ใช้งาน" },
          };
          saveActiveUser(u);
          setActiveUser(u);
          setSession({ user: u });
          return { data: { user: u }, error: null };
        } else {
          return {
            data: null,
            error: { message: "รหัส Passcode ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" },
          };
        }
      }

      // ตรวจสอบบัญชีแอดมินจำลองเริ่มต้น
      if (normalizedEmail === "admin@organization.go.th" && pwd === "password123") {
        saveActiveUser(DEFAULT_DEMO_USER);
        setActiveUser(DEFAULT_DEMO_USER);
        setSession({ user: DEFAULT_DEMO_USER });
        return { data: { user: DEFAULT_DEMO_USER }, error: null };
      }

      // 2. หากไม่พบบัญชีในเครื่อง และมีการตั้งค่า Supabase ให้ลองตรวจสอบกับ Supabase
      if (isConfigured) {
        try {
          const res = await supabase.auth.signInWithPassword({
            email: normalizedEmail,
            password: pwd,
          });

          if (!res.error && res.data?.user) {
            saveActiveUser(res.data.user);
            setActiveUser(res.data.user);
            return res;
          }

          if (res.error) {
            const isNetworkError =
              res.error.message?.includes("Failed to fetch") ||
              res.error.message?.includes("fetch failed") ||
              res.error.name === "AuthRetryableFetchError" ||
              res.error.status === 0;

            if (isNetworkError) {
              return {
                data: null,
                error: { message: "ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาสมัครสมาชิกก่อนเข้าสู่ระบบ" },
              };
            }

            if (res.error.message?.includes("Invalid login credentials")) {
              return {
                data: null,
                error: { message: "อีเมลหรือรหัส Passcode ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" },
              };
            }

            if (res.error.message?.includes("Email not confirmed")) {
              return {
                data: null,
                error: { message: "กรุณายืนยันอีเมลในกล่องจดหมายของท่านก่อนเข้าสู่ระบบ" },
              };
            }

            return res;
          }
        } catch (err) {
          return {
            data: null,
            error: { message: "ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาสมัครสมาชิกก่อนเข้าสู่ระบบ" },
          };
        }
      }

      return {
        data: null,
        error: { message: "ไม่พบบัญชีผู้ใช้งานนี้ในระบบ กรุณาสมัครสมาชิกก่อนเข้าสู่ระบบ" },
      };
    },

    signUp: async (email, password, metadata = {}) => {
      const normalizedEmail = (email || "").trim().toLowerCase();
      const pwd = String(password || "").trim();

      // 1. ตรวจสอบว่ามีอีเมลนี้สมัครอยู่แล้วหรือไม่ (ป้องกันการสมัครซ้ำ)
      const localUsers = getLocalUsers();
      const existingUser = localUsers.find((u) => u.email === normalizedEmail);
      if (existingUser) {
        return {
          data: null,
          error: { message: "อีเมลนี้มีบัญชีผู้ใช้งานในระบบอยู่แล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น" },
        };
      }

      if (normalizedEmail === "admin@organization.go.th") {
        return {
          data: null,
          error: { message: "อีเมลนี้มีบัญชีผู้ดูแลระบบอยู่ในระบบแล้ว กรุณาเข้าสู่ระบบ" },
        };
      }

      const localRecord = {
        id: "local-" + Date.now(),
        email: normalizedEmail,
        password: pwd,
        user_metadata: metadata,
        created_at: new Date().toISOString(),
      };

      // 2. ลองส่งไปยัง Supabase หากมีการเชื่อมต่อ
      if (isConfigured) {
        try {
          const res = await supabase.auth.signUp({
            email: normalizedEmail,
            password: pwd,
            options: {
              data: metadata,
            },
          });

          if (res.error) {
            // หาก Supabase แจ้งว่าอีเมลนี้มีอยู่แล้ว
            if (
              res.error.message?.includes("already registered") ||
              res.error.message?.includes("already exists") ||
              res.error.status === 422
            ) {
              return {
                data: null,
                error: { message: "อีเมลนี้มีบัญชีผู้ใช้งานในระบบอยู่แล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น" },
              };
            }

            // หากเกิดปัญหาการเชื่อมต่อเซิร์ฟเวอร์ (เช่น Supabase ถูก Pause) ให้บันทึกลงในเครื่องทันที
            const isNetworkError =
              res.error.message?.includes("Failed to fetch") ||
              res.error.message?.includes("fetch failed") ||
              res.error.name === "AuthRetryableFetchError" ||
              res.error.status === 0;

            if (isNetworkError) {
              saveLocalUser(localRecord);
              const u = { id: localRecord.id, email: normalizedEmail, user_metadata: metadata };
              saveActiveUser(u);
              setActiveUser(u);
              setSession({ user: u });
              return {
                data: { user: u },
                error: null,
                isOfflineFallback: true,
              };
            }

            return res;
          }

          // หาก Supabase สร้างผู้ใช้สำเร็จ
          saveLocalUser(localRecord);
          if (res.data?.user) {
            saveActiveUser(res.data.user);
            setActiveUser(res.data.user);
          }
          return res;
        } catch (err) {
          // เครือข่ายล้มเหลว
          saveLocalUser(localRecord);
          const u = { id: localRecord.id, email: normalizedEmail, user_metadata: metadata };
          saveActiveUser(u);
          setActiveUser(u);
          setSession({ user: u });
          return {
            data: { user: u },
            error: null,
            isOfflineFallback: true,
          };
        }
      }

      // บันทึกลงเครื่องในโหมดออฟไลน์
      saveLocalUser(localRecord);
      const u = { id: localRecord.id, email: normalizedEmail, user_metadata: metadata };
      saveActiveUser(u);
      setActiveUser(u);
      setSession({ user: u });
      return { data: { user: u }, error: null };
    },

    signOut: async () => {
      saveActiveUser(null);
      setActiveUser(null);
      setSession(null);
      if (isConfigured) {
        try {
          await supabase.auth.signOut();
        } catch {
          // ignore
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
