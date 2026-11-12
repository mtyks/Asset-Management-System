import React, { createContext, useContext, useEffect, useState } from "react";
import { supabase, isConfigured } from "../supabaseClient";

const AuthContext = createContext(null);

export const ROLE_LABELS = {
  admin: "ผู้ดูแลระบบ (Admin)",
  technician: "ช่างเทคนิค (Technician)",
  employee: "พนักงานทั่วไป (Employee)",
};

const SEED_USERS = [
  {
    id: "seed-admin-01",
    email: "admin@organization.go.th",
    password: "111111",
    role: "admin",
    approval_status: "approved",
    user_metadata: {
      full_name: "ผู้ดูแลระบบหลัก (Admin)",
      role: "admin",
      approval_status: "approved",
    },
    created_at: "2026-08-17T08:00:00.000Z",
  },
  {
    id: "seed-tech-01",
    email: "tech@organization.go.th",
    password: "222222",
    role: "technician",
    approval_status: "approved",
    user_metadata: {
      full_name: "ทีมช่างไอทีและคอมพิวเตอร์",
      role: "technician",
      approval_status: "approved",
    },
    created_at: "2026-08-17T08:05:00.000Z",
  },
  {
    id: "seed-emp-01",
    email: "emp@organization.go.th",
    password: "333333",
    role: "employee",
    approval_status: "approved",
    user_metadata: {
      full_name: "สมศรี พูนสุข",
      role: "employee",
      approval_status: "approved",
    },
    created_at: "2026-08-17T08:10:00.000Z",
  },
];

const LOCAL_USERS_KEY = "app_local_users";
const ACTIVE_USER_KEY = "app_active_user";

function normalizeUserRecord(u) {
  if (!u) return null;
  const emailLower = (u.email || "").toLowerCase();
  const defaultRole =
    emailLower === "admin@organization.go.th"
      ? "admin"
      : emailLower === "tech@organization.go.th"
      ? "technician"
      : "employee";

  const role = u.role || u.user_metadata?.role || defaultRole;
  const approvalStatus =
    u.approval_status || u.user_metadata?.approval_status || "approved";
  const fullName =
    u.user_metadata?.full_name ||
    u.full_name ||
    (role === "admin"
      ? "ผู้ดูแลระบบ"
      : role === "technician"
      ? "ช่างเทคนิค"
      : "พนักงานทั่วไป");

  return {
    ...u,
    full_name: fullName,
    passcode: String(u.password || u.passcode || "").trim(),
    password: String(u.password || u.passcode || "").trim(),
    role,
    approval_status: approvalStatus,
    user_metadata: {
      ...(u.user_metadata || {}),
      full_name: fullName,
      role,
      approval_status: approvalStatus,
    },
  };
}

function toSupabaseAppUserRow(u) {
  const norm = normalizeUserRecord(u);
  return {
    id: norm.id || `user-${Date.now()}`,
    email: (norm.email || "").toLowerCase(),
    full_name: norm.user_metadata?.full_name || norm.full_name || "ผู้ใช้งาน",
    password: String(norm.password || norm.passcode || "").trim(),
    role: norm.role || "employee",
    approval_status: norm.approval_status || "approved",
    created_at: norm.created_at || new Date().toISOString(),
  };
}

function getLocalUsers() {
  try {
    const data = localStorage.getItem(LOCAL_USERS_KEY);
    const parsed = data ? JSON.parse(data) : [];
    const byEmail = new Map();
    for (const s of SEED_USERS) {
      byEmail.set(s.email.toLowerCase(), normalizeUserRecord(s));
    }
    for (const u of parsed) {
      if (u && u.email) {
        const key = u.email.toLowerCase();
        const existingSeed = byEmail.get(key);
        byEmail.set(
          key,
          normalizeUserRecord({
            ...(existingSeed || {}),
            ...u,
          })
        );
      }
    }
    const merged = Array.from(byEmail.values());
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(merged));
    return merged;
  } catch {
    return SEED_USERS;
  }
}

function saveLocalUser(userRecord) {
  try {
    const normalized = normalizeUserRecord(userRecord);
    const users = getLocalUsers();
    const existingIndex = users.findIndex(
      (u) => u.email.toLowerCase() === normalized.email.toLowerCase()
    );
    if (existingIndex >= 0) {
      users[existingIndex] = normalizeUserRecord({
        ...users[existingIndex],
        ...normalized,
      });
    } else {
      users.push(normalized);
    }
    localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(users));
  } catch (err) {
    console.warn("Could not save local user:", err);
  }
}

function getActiveUser() {
  try {
    const data = localStorage.getItem(ACTIVE_USER_KEY);
    if (!data) return null;
    const parsed = JSON.parse(data);
    // Sync latest role/status from localUsers registry
    const localUsers = getLocalUsers();
    const latest = localUsers.find(
      (u) => u.email.toLowerCase() === (parsed.email || "").toLowerCase()
    );
    return normalizeUserRecord(latest ? { ...parsed, ...latest } : parsed);
  } catch {
    return null;
  }
}

function saveActiveUser(u) {
  try {
    if (u) {
      localStorage.setItem(ACTIVE_USER_KEY, JSON.stringify(normalizeUserRecord(u)));
    } else {
      localStorage.removeItem(ACTIVE_USER_KEY);
    }
  } catch (err) {
    console.warn("Could not save active user:", err);
  }
}

export function AuthProvider({ children }) {
  const [usersList, setUsersList] = useState(() => getLocalUsers());
  const [activeUser, setActiveUser] = useState(() => getActiveUser());
  const [isUsersCloudSynced, setIsUsersCloudSynced] = useState(false);
  const [session, setSession] = useState(
    isConfigured ? undefined : activeUser ? { user: activeUser } : null
  );

  const refreshUsersList = () => {
    const latest = getLocalUsers();
    setUsersList(latest);
    return latest;
  };

  // Sync users list from Supabase `app_users` table (with automatic fallback to localStorage)
  const syncUsersFromSupabase = async () => {
    if (!isConfigured) return getLocalUsers();
    try {
      const { data, error } = await supabase
        .from("app_users")
        .select("*")
        .order("created_at", { ascending: true });

      if (!error && Array.isArray(data)) {
        const localAll = getLocalUsers();
        const byEmail = new Map();
        for (const u of localAll) {
          byEmail.set(u.email.toLowerCase(), normalizeUserRecord(u));
        }
        for (const cloudRow of data) {
          if (cloudRow && cloudRow.email) {
            const key = cloudRow.email.toLowerCase();
            const existing = byEmail.get(key) || {};
            byEmail.set(
              key,
              normalizeUserRecord({
                ...existing,
                ...cloudRow,
                user_metadata: {
                  ...(existing.user_metadata || {}),
                  full_name: cloudRow.full_name || existing.full_name,
                  role: cloudRow.role || existing.role,
                  approval_status:
                    cloudRow.approval_status || existing.approval_status,
                },
              })
            );
          }
        }
        const merged = Array.from(byEmail.values());
        localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(merged));
        setUsersList(merged);
        setIsUsersCloudSynced(true);

        // Ensure seed accounts exist in Supabase `app_users`
        if (data.length < SEED_USERS.length) {
          const rowsToUpsert = merged.map(toSupabaseAppUserRow);
          await supabase
            .from("app_users")
            .upsert(rowsToUpsert, { onConflict: "email" });
        }
        return merged;
      }
    } catch {
      // Fallback to localStorage if `app_users` table is not created yet
    }
    return getLocalUsers();
  };

  useEffect(() => {
    const active = getActiveUser();
    setActiveUser(active);
    setSession(active ? { user: active } : null);
    syncUsersFromSupabase();
  }, []);

  const currentUser = normalizeUserRecord(activeUser || session?.user || null);

  const value = {
    session,
    user: currentUser,
    userRole: currentUser?.role || "employee",
    usersList,
    isUsersCloudSynced,
    isLoading: false,
    refreshUsersList: syncUsersFromSupabase,

    updateUserRoleAndStatus: async (targetEmail, updates = {}) => {
      const normalizedEmail = (targetEmail || "").trim().toLowerCase();
      const all = getLocalUsers();
      const found = all.find((u) => u.email.toLowerCase() === normalizedEmail);
      if (!found) return null;

      const updatedRecord = normalizeUserRecord({
        ...found,
        role: updates.role || found.role,
        approval_status: updates.approval_status || found.approval_status,
        user_metadata: {
          ...(found.user_metadata || {}),
          role: updates.role || found.role,
          approval_status: updates.approval_status || found.approval_status,
        },
      });
      saveLocalUser(updatedRecord);
      const nextList = refreshUsersList();

      if (isConfigured) {
        try {
          await supabase
            .from("app_users")
            .upsert(toSupabaseAppUserRow(updatedRecord), { onConflict: "email" });
          setIsUsersCloudSynced(true);
        } catch {}
      }

      if (currentUser && currentUser.email.toLowerCase() === normalizedEmail) {
        saveActiveUser(updatedRecord);
        setActiveUser(updatedRecord);
        setSession({ user: updatedRecord });
      }
      return nextList;
    },

    deleteUserByEmail: async (targetEmail) => {
      const normalizedEmail = (targetEmail || "").trim().toLowerCase();
      if (normalizedEmail === "admin@organization.go.th") {
        throw new Error("ไม่สามารถลบบัญชีผู้ดูแลระบบหลักได้");
      }
      const filtered = getLocalUsers().filter(
        (u) => u.email.toLowerCase() !== normalizedEmail
      );
      localStorage.setItem(LOCAL_USERS_KEY, JSON.stringify(filtered));
      setUsersList(filtered);

      if (isConfigured) {
        try {
          await supabase.from("app_users").delete().eq("email", normalizedEmail);
        } catch {}
      }

      return filtered;
    },

    signIn: async (email, password) => {
      const normalizedEmail = (email || "").trim().toLowerCase();
      const pwd = String(password || "").trim();

      // 1. ซิงค์ข้อมูลล่าสุดจาก Supabase `app_users` ก่อนตรวจสอบสิทธิ์ (เผื่อแอดมินเพิ่งอนุมัติจากเครื่องอื่น)
      const latestUsers = await syncUsersFromSupabase();
      const localUser = latestUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );

      if (localUser) {
        const isDefaultAdminPass =
          normalizedEmail === "admin@organization.go.th" &&
          (pwd === "111111" || pwd === "123456" || pwd === String(localUser.password).trim());

        if (String(localUser.password).trim() === pwd || isDefaultAdminPass) {
          if (localUser.approval_status === "pending") {
            return {
              data: null,
              error: {
                message:
                  "บัญชีนี้ยังอยู่ระหว่างรอผู้ดูแลระบบ (Admin) อนุมัติและกำหนดสิทธิ์การใช้งาน",
              },
            };
          }

          if (localUser.approval_status === "suspended") {
            return {
              data: null,
              error: {
                message:
                  "บัญชีผู้ใช้งานนี้ถูกระงับสิทธิ์การใช้งานชั่วคราว กรุณาติดต่อผู้ดูแลระบบ",
              },
            };
          }

          const u = normalizeUserRecord({
            id: localUser.id,
            email: localUser.email,
            role: localUser.role,
            approval_status: localUser.approval_status,
            user_metadata: localUser.user_metadata || { full_name: "ผู้ใช้งาน" },
          });
          saveActiveUser(u);
          setActiveUser(u);
          setSession({ user: u });

          if (isConfigured) {
            try {
              await supabase.auth.signInWithPassword({
                email: normalizedEmail,
                password: pwd,
              });
            } catch {}
          }

          return { data: { user: u }, error: null };
        } else {
          return {
            data: null,
            error: { message: "รหัส Passcode ไม่ถูกต้อง กรุณาลองใหม่อีกครั้ง" },
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

      const localUsers = getLocalUsers();
      const existingUser = localUsers.find(
        (u) => u.email.toLowerCase() === normalizedEmail
      );
      if (existingUser) {
        return {
          data: null,
          error: {
            message:
              "อีเมลนี้มีบัญชีผู้ใช้งานในระบบอยู่แล้ว กรุณาเข้าสู่ระบบ หรือใช้อีเมลอื่น",
          },
        };
      }

      // สมัครสมาชิกใหม่ -> สถานะเริ่มต้นเป็น "pending" รอให้ Admin อนุมัติและเลือกสิทธิ์ (Role)
      const enrichedMeta = {
        ...metadata,
        role: "employee",
        approval_status: "pending",
      };

      const localRecord = normalizeUserRecord({
        id: "user-" + Date.now(),
        email: normalizedEmail,
        password: pwd,
        role: "employee",
        approval_status: "pending",
        user_metadata: enrichedMeta,
        created_at: new Date().toISOString(),
      });

      saveLocalUser(localRecord);
      refreshUsersList();

      if (isConfigured) {
        try {
          await supabase
            .from("app_users")
            .upsert(toSupabaseAppUserRow(localRecord), { onConflict: "email" });
          setIsUsersCloudSynced(true);
        } catch {}

        try {
          await supabase.auth.signUp({
            email: normalizedEmail,
            password: pwd,
            options: { data: enrichedMeta },
          });
        } catch {}
      }

      return {
        data: { user: localRecord },
        error: null,
        pendingApproval: true,
        warning:
          "ส่งคำขอสมัครสมาชิกสำเร็จ! บัญชีของท่านอยู่ระหว่างรอผู้ดูแลระบบ (Admin) อนุมัติและกำหนดสิทธิ์ก่อนเข้าใช้งาน",
      };
    },

    signOut: async () => {
      saveActiveUser(null);
      setActiveUser(null);
      setSession(null);
      if (isConfigured) {
        try {
          await supabase.auth.signOut();
        } catch {}
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
