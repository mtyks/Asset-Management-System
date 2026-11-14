import { supabase, isConfigured } from "../supabaseClient.js";

/**
 * รวม queries ทั้งหมดที่สื่อสารกับ Supabase PostgreSQL & Storage
 * โครงสร้างตารางหลัก:
 * - assets: asset_code (PK), name, category_code, room_code, color, status, image_url, received_date, responsible_person, created_at
 * - asset_categories: category_code (PK), category_name, created_at
 * - rooms: room_code (PK), building_code, floor_number, room_name, created_at
 * - buildings: building_code (PK), name, created_at
 * - borrow_records: id (PK), asset_code, borrower_name, borrower_contact, borrowed_at, due_date, returned_at
 * - asset_status_log: id (PK), asset_code, old_status, new_status, note, changed_at
 */

// ---------------------------------------------------------------------------
// Hybrid Local + Cloud Sync Helpers (Ensures Status & Timeline work even under RLS / Public QR Scan)
// ---------------------------------------------------------------------------
const ASSET_OVERRIDES_KEY = "ams_asset_overrides_v1";
const STATUS_LOGS_KEY = "ams_status_logs_v1";

function getLocalAssetOverrides() {
  try {
    const raw = localStorage.getItem(ASSET_OVERRIDES_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveLocalAssetOverride(assetCode, updates) {
  try {
    const code = String(assetCode || "").trim().toUpperCase();
    if (!code) return;
    const all = getLocalAssetOverrides();
    all[code] = { ...(all[code] || {}), ...updates, updated_at: new Date().toISOString() };
    localStorage.setItem(ASSET_OVERRIDES_KEY, JSON.stringify(all));
  } catch (err) {
    console.warn("saveLocalAssetOverride warning:", err);
  }
}

function removeLocalAssetOverride(assetCode) {
  try {
    const code = String(assetCode || "").trim().toUpperCase();
    if (!code) return;
    const all = getLocalAssetOverrides();
    delete all[code];
    localStorage.setItem(ASSET_OVERRIDES_KEY, JSON.stringify(all));
  } catch {}
}

function applyAssetOverrides(rows = []) {
  const overrides = getLocalAssetOverrides();
  if (!overrides || Object.keys(overrides).length === 0) return rows;
  return rows.map((row) => {
    if (!row) return row;
    const code = String(row.asset_code || row.code || "").trim().toUpperCase();
    const ov = overrides[code];
    if (!ov) return row;
    return { ...row, ...ov };
  });
}

function getLocalStatusLogs(assetCode) {
  try {
    const raw = localStorage.getItem(STATUS_LOGS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    if (!assetCode) return all;
    const target = String(assetCode).trim().toUpperCase();
    return all.filter((l) => String(l.asset_code || "").trim().toUpperCase() === target);
  } catch {
    return [];
  }
}

function appendLocalStatusLog(entry) {
  try {
    const raw = localStorage.getItem(STATUS_LOGS_KEY);
    const all = raw ? JSON.parse(raw) : [];
    all.unshift(entry);
    localStorage.setItem(STATUS_LOGS_KEY, JSON.stringify(all.slice(0, 500)));
  } catch (err) {
    console.warn("appendLocalStatusLog warning:", err);
  }
}

export async function getAllStatusLogs() {
  let remoteLogs = [];
  try {
    const { data, error } = await supabase
      .from("asset_status_log")
      .select("*")
      .order("changed_at", { ascending: false })
      .limit(500);
    if (!error && Array.isArray(data)) {
      remoteLogs = data;
    }
  } catch (err) {
    console.warn("getAllStatusLogs error:", err);
  }

  const localLogs = getLocalStatusLogs();
  if (localLogs.length === 0) return remoteLogs;

  const merged = [...remoteLogs.map((r) => ({ ...r }))];
  for (const loc of localLogs) {
    const locCode = String(loc.asset_code || "").trim().toUpperCase();
    const locTime = new Date(loc.changed_at).getTime();
    const matchIdx = merged.findIndex((rem) => {
      const remCode = String(rem.asset_code || "").trim().toUpperCase();
      const remTime = new Date(rem.changed_at).getTime();
      return (
        remCode === locCode &&
        rem.new_status === loc.new_status &&
        Math.abs(remTime - locTime) < 15000
      );
    });

    if (matchIdx >= 0) {
      if (!merged[matchIdx].note && loc.note) {
        merged[matchIdx].note = loc.note;
      }
    } else {
      merged.push(loc);
    }
  }

  merged.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  return merged;
}

export async function getRepairHistorySummary() {
  try {
    const [allLogs, { data: rawAssets }] = await Promise.all([
      getAllStatusLogs(),
      supabase
        .from("assets")
        .select(
          `asset_code, name, status, responsible_person, asset_categories ( category_name ), rooms ( room_name )`
        ),
    ]);

    const assets = applyAssetOverrides(rawAssets || []);
    const assetByCode = new Map();
    for (const a of assets) {
      const code = String(a.asset_code || "").trim().toUpperCase();
      if (code) assetByCode.set(code, a);
    }

    // Also inspect maintenance tickets in localStorage if available
    let tickets = [];
    try {
      const rawTickets = localStorage.getItem("asset_maintenance_tickets_v2");
      if (rawTickets) tickets = JSON.parse(rawTickets) || [];
    } catch {}

    // Map of assetCode (UPPERCASE) -> repair summary for that asset
    const repairedMap = {};

    // Process status logs related to repair / damaged / repair completion
    const repairLogs = [];
    for (const log of allLogs) {
      const codeUpper = String(log.asset_code || "").trim().toUpperCase();
      if (!codeUpper) continue;

      const noteStr = String(log.note || "");
      const isRepairRelated =
        log.old_status === "repair" ||
        log.old_status === "damaged" ||
        log.new_status === "repair" ||
        log.new_status === "damaged" ||
        noteStr.includes("ซ่อม") ||
        noteStr.includes("ชำรุด");

      if (!isRepairRelated) continue;

      const assetObj = assetByCode.get(codeUpper);
      const currentStatus = assetObj?.status || "normal";

      const isCompletedEvent =
        log.new_status === "normal" &&
        (log.old_status === "repair" ||
          log.old_status === "damaged" ||
          noteStr.includes("ซ่อม"));

      const enrichedLog = {
        ...log,
        asset_code: assetObj?.asset_code || log.asset_code,
        asset_name: assetObj?.name || log.asset_code,
        category_name: assetObj?.asset_categories?.category_name || "ครุภัณฑ์ทั่วไป",
        room_name: assetObj?.rooms?.room_name || "-",
        current_status: currentStatus,
        is_completed_event: isCompletedEvent,
      };
      repairLogs.push(enrichedLog);

      if (!repairedMap[codeUpper]) {
        repairedMap[codeUpper] = {
          asset_code: assetObj?.asset_code || log.asset_code,
          hasRepairHistory: true,
          isRepairedAndNormal: false,
          lastCompletedAt: null,
          lastCompletedNote: null,
          lastReportedAt: null,
          lastReportedNote: null,
          completedCount: 0,
          totalEvents: 0,
        };
      }

      const entry = repairedMap[codeUpper];
      entry.totalEvents += 1;

      if (isCompletedEvent) {
        entry.completedCount += 1;
        if (
          !entry.lastCompletedAt ||
          new Date(log.changed_at) > new Date(entry.lastCompletedAt)
        ) {
          entry.lastCompletedAt = log.changed_at;
          entry.lastCompletedNote =
            log.note || "ซ่อมบำรุงเสร็จเรียบร้อย กลับมาใช้งานตามปกติ";
        }
      } else if (log.new_status === "repair" || log.new_status === "damaged") {
        if (
          !entry.lastReportedAt ||
          new Date(log.changed_at) > new Date(entry.lastReportedAt)
        ) {
          entry.lastReportedAt = log.changed_at;
          entry.lastReportedNote = log.note || "แจ้งส่งซ่อมครุภัณฑ์";
        }
      }
    }

    // Also check completed tickets in maintenance_tickets
    for (const t of tickets) {
      const codeUpper = String(t.asset_code || "").trim().toUpperCase();
      if (!codeUpper || !assetByCode.has(codeUpper)) continue;

      const assetObj = assetByCode.get(codeUpper);
      if (!repairedMap[codeUpper]) {
        repairedMap[codeUpper] = {
          asset_code: assetObj.asset_code,
          hasRepairHistory: true,
          isRepairedAndNormal: false,
          lastCompletedAt: null,
          lastCompletedNote: null,
          lastReportedAt: null,
          lastReportedNote: null,
          completedCount: 0,
          totalEvents: 0,
        };
      }
      const entry = repairedMap[codeUpper];
      if (t.status === "completed") {
        const compTime = t.completed_at || t.created_at;
        if (!entry.lastCompletedAt) {
          entry.lastCompletedAt = compTime;
          entry.lastCompletedNote =
            t.technician_note || `ซ่อมเสร็จสิ้น (${t.repair_no || "ใบงานซ่อม"})`;
          entry.completedCount += 1;
        }
      }
    }

    // Finalize which assets are currently back to normal AND have repair history
    for (const [codeUpper, entry] of Object.entries(repairedMap)) {
      const assetObj = assetByCode.get(codeUpper);
      if (!assetObj) continue;
      const curStatus = assetObj.status || "normal";
      if (curStatus === "normal" && (entry.completedCount > 0 || entry.hasRepairHistory)) {
        entry.isRepairedAndNormal = true;
        if (!entry.lastCompletedAt) {
          entry.lastCompletedAt = entry.lastReportedAt;
          entry.lastCompletedNote =
            entry.lastCompletedNote ||
            entry.lastReportedNote ||
            "ซ่อมเสร็จสิ้น กลับมาใช้งานปกติ";
        }
      }
    }

    return {
      repairedMap,
      repairLogs,
    };
  } catch (err) {
    console.warn("getRepairHistorySummary error:", err);
    return { repairedMap: {}, repairLogs: [] };
  }
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardCounts() {
  try {
    const { data, error } = await supabase.from("assets").select("asset_code, status");
    if (error) throw error;

    const merged = applyAssetOverrides(data || []);
    const counts = { total: merged.length, normal: 0, repair: 0, borrowed: 0, damaged: 0 };
    for (const row of merged) {
      const s = row.status || "normal";
      counts[s] = (counts[s] || 0) + 1;
    }

    return {
      total: counts.total || 0,
      normal: counts.normal || 0,
      borrowed: counts.borrowed || 0,
      repair: (counts.repair || 0) + (counts.damaged || 0),
      damaged: counts.damaged || 0,
    };
  } catch (err) {
    console.warn("getDashboardCounts error:", err);
    return { total: 0, normal: 0, borrowed: 0, repair: 0, damaged: 0 };
  }
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
export async function listAssets(filters = {}) {
  let query = supabase
    .from("assets")
    .select(`*, asset_categories ( category_code, category_name ), rooms ( room_code, room_name, floor_number, buildings ( building_code, name ) )`)
    .order("created_at", { ascending: false });

  const cat = filters.categoryCode || filters.categoryId;
  if (cat) query = query.eq("category_code", cat);
  const rm = filters.roomCode || filters.roomId;
  if (rm) query = query.eq("room_code", rm);
  if (filters.search && filters.search.trim()) {
    const s = filters.search.trim();
    query = query.or(
      `asset_code.ilike.%${s}%,name.ilike.%${s}%,color.ilike.%${s}%,responsible_person.ilike.%${s}%`
    );
  }

  const { data, error } = await query;
  if (error) {
    console.warn("listAssets error:", error);
    throw error;
  }

  let rows = applyAssetOverrides(data || []);

  if (filters.status === "repair_damaged") {
    rows = rows.filter((r) => r.status === "repair" || r.status === "damaged");
  } else if (filters.status) {
    rows = rows.filter((r) => (r.status || "normal") === filters.status);
  }

  return rows;
}

export async function getAssetByCode(assetCode) {
  const decoded = decodeURIComponent(String(assetCode || "")).trim();
  if (!decoded || decoded === "undefined" || decoded === "null") {
    throw new Error("รหัสครุภัณฑ์ไม่ถูกต้อง");
  }

  // 1. ค้นหาตรงๆ ด้วย asset_code
  let { data } = await supabase
    .from("assets")
    .select(`*, asset_categories ( category_code, category_name ), rooms ( room_code, room_name, floor_number, building_code, buildings ( building_code, name ) )`)
    .eq("asset_code", decoded)
    .maybeSingle();

  // 2. ถ้าไม่เจอ ลองค้นหาแบบไม่สนตัวพิมพ์เล็กใหญ่ (ilike)
  if (!data) {
    const { data: ilikeData } = await supabase
      .from("assets")
      .select(`*, asset_categories ( category_code, category_name ), rooms ( room_code, room_name, floor_number, building_code, buildings ( building_code, name ) )`)
      .ilike("asset_code", decoded)
      .maybeSingle();
    data = ilikeData;
  }

  if (!data) {
    throw new Error(`ไม่พบข้อมูลครุภัณฑ์รหัส "${decoded}" ในระบบ`);
  }
  return applyAssetOverrides([data])[0];
}

export async function getAssetById(assetCode) {
  return getAssetByCode(assetCode);
}

export async function getAssetHistory(assetCode) {
  const cleanCode = decodeURIComponent(String(assetCode || "")).trim();
  const { data } = await supabase
    .from("asset_status_log")
    .select("*")
    .eq("asset_code", cleanCode)
    .order("changed_at", { ascending: false });

  const remoteLogs = data || [];
  const localLogs = getLocalStatusLogs(cleanCode);

  if (localLogs.length === 0) return remoteLogs;

  // Merge local logs with remote logs (enriching note if remote trigger log has null note)
  const merged = [...remoteLogs.map((r) => ({ ...r }))];

  for (const loc of localLogs) {
    const locTime = new Date(loc.changed_at).getTime();
    const matchIdx = merged.findIndex((rem) => {
      const remTime = new Date(rem.changed_at).getTime();
      return (
        rem.new_status === loc.new_status &&
        Math.abs(remTime - locTime) < 15000
      );
    });

    if (matchIdx >= 0) {
      if (!merged[matchIdx].note && loc.note) {
        merged[matchIdx].note = loc.note;
      }
    } else {
      merged.push(loc);
    }
  }

  merged.sort((a, b) => new Date(b.changed_at).getTime() - new Date(a.changed_at).getTime());
  return merged;
}

export async function createAsset(asset) {
  const payload = {
    asset_code: String(asset.asset_code).trim(),
    name: String(asset.name).trim(),
    category_code: asset.category_code || asset.category_id || null,
    room_code: asset.room_code || asset.room_id || null,
    color: asset.color ? String(asset.color).trim() : null,
    status: asset.status || "normal",
    image_url: asset.image_url || null,
    received_date: asset.received_date || null,
    responsible_person: asset.responsible_person ? String(asset.responsible_person).trim() : null,
  };

  const { data, error } = await supabase.from("assets").insert(payload).select().single();
  if (error) throw error;
  return data;
}

export async function updateAsset(assetCode, updates) {
  const cleanCode = decodeURIComponent(String(assetCode || "")).trim();
  if (!cleanCode) throw new Error("รหัสครุภัณฑ์ไม่ถูกต้อง");

  const payload = { ...updates };
  if (payload.category_id) {
    payload.category_code = payload.category_id;
    delete payload.category_id;
  }
  if (payload.room_id) {
    payload.room_code = payload.room_id;
    delete payload.room_id;
  }
  delete payload.id;
  delete payload.asset_categories;
  delete payload.rooms;
  delete payload.buildings;

  // บันทึก Local Override เสมอเพื่อให้แสดงผลทันทีแม้ติด RLS บนเครื่องทดสอบ
  saveLocalAssetOverride(cleanCode, payload);

  // 1. ลองอัปเดตด้วย cleanCode ตรงๆ บน Supabase
  let { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("asset_code", cleanCode)
    .select()
    .maybeSingle();

  // 2. หากไม่พบ ลองค้นหาแบบไม่สนตัวพิมพ์เล็กใหญ่ (ilike)
  if (!data && !error) {
    const { data: ilikeData, error: ilikeErr } = await supabase
      .from("assets")
      .update(payload)
      .ilike("asset_code", cleanCode)
      .select()
      .maybeSingle();
    data = ilikeData;
    error = ilikeErr;
  }

  if (error) {
    console.warn("Supabase updateAsset fallback to local override:", error);
  }
  return data || { asset_code: cleanCode, ...payload };
}

export async function deleteAsset(assetCode) {
  const cleanCode = decodeURIComponent(String(assetCode || "")).trim();
  removeLocalAssetOverride(cleanCode);
  const { error } = await supabase.from("assets").delete().eq("asset_code", cleanCode);
  if (error) throw error;
  return true;
}

export async function bulkUpdateAssets(assetCodes, updates) {
  if (!assetCodes || assetCodes.length === 0) return [];
  const payload = { ...updates };
  if (payload.category_id) {
    payload.category_code = payload.category_id;
    delete payload.category_id;
  }
  if (payload.room_id) {
    payload.room_code = payload.room_id;
    delete payload.room_id;
  }
  delete payload.id;
  delete payload.asset_categories;
  delete payload.rooms;
  payload.updated_at = new Date().toISOString();

  for (const code of assetCodes) {
    saveLocalAssetOverride(code, payload);
  }

  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .in("asset_code", assetCodes)
    .select();

  if (error) {
    console.warn("Supabase bulkUpdateAssets fallback to local override:", error);
  }
  return data || [];
}

export async function bulkDeleteAssets(assetCodes) {
  if (!assetCodes || assetCodes.length === 0) return true;
  for (const code of assetCodes) {
    removeLocalAssetOverride(code);
  }
  const { error } = await supabase
    .from("assets")
    .delete()
    .in("asset_code", assetCodes);

  if (error) throw error;
  return true;
}

export async function updateAssetStatus(assetCode, newStatus, note = "") {
  const cleanCode = decodeURIComponent(String(assetCode || "")).trim();
  let oldStatus = "normal";
  try {
    const existingAsset = await getAssetByCode(cleanCode);
    oldStatus = existingAsset?.status || "normal";
  } catch {}

  const nowIso = new Date().toISOString();

  // 1. บันทึกสถานะใหม่และประวัติการเปลี่ยนสถานะลง Local Sync ทันที
  saveLocalAssetOverride(cleanCode, { status: newStatus });
  appendLocalStatusLog({
    id: `local-log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    asset_code: cleanCode,
    old_status: oldStatus,
    new_status: newStatus,
    note: note || null,
    changed_at: nowIso,
  });

  // 2. ซิงค์ขึ้น Supabase Cloud (หากมีสิทธิ์ Authenticated)
  let cloudData = null;
  try {
    const { data } = await supabase
      .from("assets")
      .update({ status: newStatus })
      .eq("asset_code", cleanCode)
      .select()
      .maybeSingle();
    cloudData = data;
  } catch (err) {
    console.warn("updateAssetStatus cloud sync warning:", err);
  }

  try {
    await supabase.from("asset_status_log").insert({
      asset_code: cleanCode,
      old_status: oldStatus,
      new_status: newStatus,
      note: note || null,
      changed_at: nowIso,
    });
  } catch {
    // ignore if RLS on asset_status_log restricts direct client insert
  }

  return cloudData || { asset_code: cleanCode, status: newStatus };
}

// ---------------------------------------------------------------------------
// Image Upload to Supabase Storage (with automatic compressed Data URL fallback)
// ---------------------------------------------------------------------------
export async function uploadAssetImage(file, assetCode) {
  if (!file) return null;
  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const safeCode = String(assetCode || "asset").replace(/[^a-zA-Z0-9_-]/g, "_");
    const fileName = `${safeCode}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("asset-images")
      .upload(fileName, file, { upsert: true });

    if (!uploadError) {
      const { data: publicData } = supabase.storage
        .from("asset-images")
        .getPublicUrl(fileName);
      if (publicData?.publicUrl) return publicData.publicUrl;
    }
  } catch {
    // Fallback to compressed base64 data URL if bucket "asset-images" is not created yet
  }
  return await compressImageToDataUrl(file);
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function listCategories() {
  const { data, error } = await supabase
    .from("asset_categories")
    .select("*")
    .order("category_name", { ascending: true });

  if (error) throw error;
  return (data || []).map((c) => {
    const validName =
      c.category_name && c.category_name !== "undefined"
        ? c.category_name
        : c.category_code;
    return {
      ...c,
      id: c.category_code,
      category_code: c.category_code,
      category_name: validName,
      name: validName,
    };
  });
}

export async function createCategory(categoryCode, categoryName) {
  let cCode = categoryCode;
  let cName = categoryName;
  if (!categoryName && categoryCode) {
    cName = categoryCode;
    cCode = `CAT-${Date.now().toString().slice(-4)}`;
  }
  const code = cCode || `CAT-${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase
    .from("asset_categories")
    .insert({ category_code: String(code).trim(), category_name: String(cName).trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(categoryCode, categoryName) {
  const { data, error } = await supabase
    .from("asset_categories")
    .update({ category_name: String(categoryName).trim() })
    .eq("category_code", categoryCode)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(categoryCode) {
  const { error } = await supabase
    .from("asset_categories")
    .delete()
    .eq("category_code", categoryCode);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Locations: buildings / rooms
// ---------------------------------------------------------------------------
export async function listBuildings() {
  const { data, error } = await supabase.from("buildings").select("*").order("name");
  if (error) throw error;
  return (data || []).map((b) => ({ ...b, id: b.building_code, code: b.building_code }));
}

export async function createBuilding(code, name) {
  let bCode = code;
  let bName = name;
  if (!name && code) {
    bName = code;
    bCode = `BLD-${Date.now().toString().slice(-4)}`;
  }
  const { data, error } = await supabase
    .from("buildings")
    .insert({ building_code: String(bCode).trim(), name: String(bName).trim() })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBuilding(buildingCode, name) {
  const { data, error } = await supabase
    .from("buildings")
    .update({ name: String(name).trim() })
    .eq("building_code", buildingCode)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBuilding(buildingCode) {
  const { error } = await supabase.from("buildings").delete().eq("building_code", buildingCode);
  if (error) throw error;
}

export async function listRooms(buildingCode) {
  let query = supabase.from("rooms").select("*, buildings(building_code, name)").order("floor_number").order("room_name");
  if (buildingCode) query = query.eq("building_code", buildingCode);
  const { data, error } = await query;
  if (error) throw error;
  return (data || []).map((r) => ({ ...r, id: r.room_code }));
}

export async function createRoom(buildingCode, floorNumber, roomCode, roomName) {
  const rCode = roomCode || `RM-${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase
    .from("rooms")
    .insert({
      room_code: String(rCode).trim(),
      building_code: String(buildingCode).trim(),
      floor_number: Number(floorNumber) || 1,
      room_name: String(roomName).trim(),
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoom(roomCode, floorNumber, roomName) {
  const { data, error } = await supabase
    .from("rooms")
    .update({
      floor_number: Number(floorNumber) || 1,
      room_name: String(roomName).trim(),
    })
    .eq("room_code", roomCode)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoom(roomCode) {
  const { error } = await supabase.from("rooms").delete().eq("room_code", roomCode);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Borrow Records (ยืม - คืน ครุภัณฑ์: ตาราง borrow_records + Hybrid Local Sync)
// ---------------------------------------------------------------------------
const LOCAL_BORROW_RECORDS_KEY = "ams_borrow_records_v1";

function getLocalBorrowRecords() {
  try {
    const raw = localStorage.getItem(LOCAL_BORROW_RECORDS_KEY);
    return raw ? JSON.parse(raw) || [] : [];
  } catch {
    return [];
  }
}

function saveLocalBorrowRecords(records) {
  try {
    localStorage.setItem(LOCAL_BORROW_RECORDS_KEY, JSON.stringify(records));
  } catch (err) {
    console.warn("saveLocalBorrowRecords warning:", err);
  }
}

export async function listBorrowRecords() {
  let remoteRows = [];
  try {
    const { data, error } = await supabase
      .from("borrow_records")
      .select("*, assets(asset_code, name, color, image_url, status)")
      .order("borrowed_at", { ascending: false });
    if (!error && Array.isArray(data)) {
      remoteRows = data;
    }
  } catch (err) {
    console.warn("listBorrowRecords cloud warning:", err);
  }

  const localRows = getLocalBorrowRecords();
  const overrides = getLocalAssetOverrides();
  const statusLogs = getLocalStatusLogs();

  // รวมข้อมูลจาก Cloud และ Local (ป้องกันซ้ำ และอัปเดตสถานะ returned_at / return_condition หากคืนใน Local แล้ว)
  const merged = [...remoteRows.map((r) => ({ ...r }))];
  for (const loc of localRows) {
    const idx = merged.findIndex(
      (rem) =>
        String(rem.id) === String(loc.id) ||
        (String(rem.asset_code || "").toUpperCase() ===
          String(loc.asset_code || "").toUpperCase() &&
          Math.abs(
            new Date(rem.borrowed_at || 0).getTime() -
              new Date(loc.borrowed_at || 0).getTime()
          ) < 15000)
    );
    if (idx >= 0) {
      if (!merged[idx].returned_at && loc.returned_at) {
        merged[idx].returned_at = loc.returned_at;
      }
      if (loc.return_condition) {
        merged[idx].return_condition = loc.return_condition;
      }
      if (loc.return_note) {
        merged[idx].return_note = loc.return_note;
      }
    } else {
      merged.push(loc);
    }
  }

  // ตรวจสอบสถานะการคืน (หากคืนแล้วและครุภัณฑ์ถูกตั้งเป็นชำรุดตอนคืน ให้ระบุ return_condition = "damaged")
  for (const row of merged) {
    const codeUpper = String(row.asset_code || row.assets?.asset_code || "")
      .trim()
      .toUpperCase();
    if (row.returned_at && !row.return_condition) {
      const matchingLog = statusLogs.find(
        (l) =>
          String(l.asset_code || "").trim().toUpperCase() === codeUpper &&
          String(l.note || "").includes("รับคืนแล้ว - พบการชำรุด")
      );
      const currentStatus =
        overrides[codeUpper]?.status || row.assets?.status || "normal";
      if (matchingLog) {
        row.return_condition = "damaged";
        const parts = String(matchingLog.note || "").split("รับคืนแล้ว - พบการชำรุด:");
        if (parts[1]) row.return_note = parts[1].trim();
      } else if (currentStatus === "damaged") {
        row.return_condition = "damaged";
      }
    }
  }

  merged.sort(
    (a, b) =>
      new Date(b.borrowed_at || 0).getTime() -
      new Date(a.borrowed_at || 0).getTime()
  );
  return merged;
}

// เงื่อนไขการยืม-คืนครุภัณฑ์ (Business Rules)
export const BORROW_RULES = {
  maxBorrowDays: 30, // ยืมได้สูงสุดไม่เกิน 30 วัน
  quickDays: [3, 7, 14, 30], // ปุ่มลัดเลือกระยะเวลายืม
};

function parseLocalDate(dateStr) {
  const [y, m, d] = String(dateStr || "")
    .slice(0, 10)
    .split("-")
    .map(Number);
  if (!y || !m || !d) return new Date(dateStr);
  return new Date(y, m - 1, d, 0, 0, 0, 0);
}

export async function borrowAsset(assetCode, borrowerName, borrowerContact, dueDate) {
  // 1. ตรวจข้อมูลที่จำเป็น
  if (!assetCode) throw new Error("กรุณาเลือกครุภัณฑ์ที่ต้องการยืม");
  if (!borrowerName || !borrowerName.trim()) throw new Error("กรุณาระบุชื่อผู้ยืม");
  if (!borrowerContact || !borrowerContact.trim()) {
    throw new Error("กรุณาระบุเบอร์ติดต่อ / สังกัดของผู้ยืม");
  }
  if (!dueDate) throw new Error("กรุณาระบุกำหนดวันส่งคืน");

  // 2. ตรวจวันกำหนดคืน: ห้ามย้อนหลัง และห้ามเกินระยะเวลาสูงสุด
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const due = parseLocalDate(dueDate);
  if (due < today) throw new Error("กำหนดวันส่งคืนต้องไม่ย้อนหลังก่อนวันนี้");
  const diffDays = Math.round((due - today) / 86400000);
  if (diffDays > BORROW_RULES.maxBorrowDays) {
    throw new Error(`ระยะเวลายืมต้องไม่เกิน ${BORROW_RULES.maxBorrowDays} วัน`);
  }

  // 3. ตรวจสถานะครุภัณฑ์: ต้อง "ใช้งานปกติ"
  const asset = await getAssetByCode(assetCode);
  const st = asset?.status || "normal";
  if (st !== "normal") {
    throw new Error(
      st === "borrowed"
        ? "ครุภัณฑ์ชิ้นนี้กำลังถูกยืมใช้งานอยู่ ไม่สามารถยืมซ้ำได้"
        : "ครุภัณฑ์ชิ้นนี้อยู่ในสถานะชำรุด งดให้ยืม"
    );
  }

  const nowIso = new Date().toISOString();
  const codeUpper = String(assetCode).trim().toUpperCase();

  // ปิดรายการยืมเก่าที่อาจค้างอยู่ใน Local
  const existingLocal = getLocalBorrowRecords().map((r) =>
    String(r.asset_code || "").trim().toUpperCase() === codeUpper && !r.returned_at
      ? { ...r, returned_at: nowIso }
      : r
  );

  // พยายามบันทึกลง Supabase Cloud ก่อน (ถ้าติด RLS จะใช้ Local Hybrid Sync แทนอัตโนมัติ)
  let cloudRecord = null;
  try {
    await supabase
      .from("borrow_records")
      .update({ returned_at: nowIso })
      .eq("asset_code", assetCode)
      .is("returned_at", null);

    const { data: record, error: recordError } = await supabase
      .from("borrow_records")
      .insert({
        asset_code: assetCode,
        borrower_name: borrowerName.trim(),
        borrower_contact: borrowerContact.trim(),
        due_date: dueDate,
      })
      .select()
      .single();

    if (!recordError && record) {
      cloudRecord = record;
    }
  } catch (err) {
    console.warn("borrowAsset cloud RLS fallback:", err);
  }

  const finalRecord = {
    id: cloudRecord?.id || `local-borrow-${Date.now()}`,
    asset_code: asset.asset_code || assetCode,
    borrower_name: borrowerName.trim(),
    borrower_contact: borrowerContact.trim(),
    borrowed_at: cloudRecord?.borrowed_at || nowIso,
    due_date: dueDate,
    returned_at: null,
    assets: {
      asset_code: asset.asset_code || assetCode,
      name: asset.name || assetCode,
      color: asset.color || null,
      image_url: asset.image_url || null,
    },
  };

  existingLocal.unshift(finalRecord);
  saveLocalBorrowRecords(existingLocal);

  await updateAssetStatus(assetCode, "borrowed", `ยืมโดย: ${borrowerName.trim()}`);
  return finalRecord;
}

/**
 * บันทึกรับคืนครุภัณฑ์ พร้อมตรวจสภาพตอนรับคืน
 * @param {string} condition "normal" = สภาพปกติ, "damaged" = พบการชำรุด
 */
export async function returnAsset(assetCode, borrowRecordId, condition = "normal", note = "") {
  const nowIso = new Date().toISOString();
  const codeUpper = String(assetCode || "").trim().toUpperCase();

  // 1. อัปเดตใน Local Hybrid Sync ทันที (พร้อมเก็บสภาพตอนคืน return_condition และ return_note)
  let foundInLocal = false;
  const updatedLocal = getLocalBorrowRecords().map((r) => {
    const matchId = borrowRecordId && String(r.id) === String(borrowRecordId);
    const matchCode =
      !r.returned_at && String(r.asset_code || "").trim().toUpperCase() === codeUpper;
    if (matchId || matchCode) {
      foundInLocal = true;
      return {
        ...r,
        returned_at: nowIso,
        return_condition: condition,
        return_note: note || null,
      };
    }
    return r;
  });

  if (!foundInLocal && borrowRecordId) {
    updatedLocal.unshift({
      id: borrowRecordId,
      asset_code: assetCode,
      returned_at: nowIso,
      return_condition: condition,
      return_note: note || null,
    });
  }
  saveLocalBorrowRecords(updatedLocal);

  // 2. พยายามอัปเดตขึ้น Supabase Cloud (ถ้าเป็นรายการบน Cloud และไม่ติด RLS)
  if (borrowRecordId && !String(borrowRecordId).startsWith("local-borrow-")) {
    try {
      await supabase
        .from("borrow_records")
        .update({ returned_at: nowIso })
        .eq("id", borrowRecordId);
    } catch (err) {
      console.warn("returnAsset cloud RLS fallback:", err);
    }
  }

  const isDamaged = condition === "damaged";
  const logNote = isDamaged
    ? `รับคืนแล้ว - พบการชำรุด${note ? `: ${note}` : ""}`
    : `ส่งคืนเรียบร้อย สภาพปกติ${note ? ` (${note})` : ""}`;

  await updateAssetStatus(assetCode, isDamaged ? "damaged" : "normal", logNote);
}

export async function getActiveBorrowRecord(assetCode) {
  const codeUpper = String(assetCode || "").trim().toUpperCase();
  const localActive = getLocalBorrowRecords().find(
    (r) =>
      !r.returned_at &&
      String(r.asset_code || "").trim().toUpperCase() === codeUpper
  );
  if (localActive) return localActive;

  try {
    const { data, error } = await supabase
      .from("borrow_records")
      .select("*")
      .eq("asset_code", assetCode)
      .is("returned_at", null)
      .order("borrowed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!error && data) return data;
  } catch {}
  return null;
}

// ---------------------------------------------------------------------------
// CSV Batch Import
// ---------------------------------------------------------------------------
export async function importAssetsBatch(rawItems, onProgress) {
  if (!rawItems || rawItems.length === 0) {
    throw new Error("ไม่มีรายการข้อมูลสำหรับนำเข้า");
  }

  // 1. ดึง categories, buildings และ rooms ที่มีอยู่เดิม
  const [existingCategories, existingBuildings, existingRooms] = await Promise.all([
    listCategories().catch(() => []),
    listBuildings().catch(() => []),
    listRooms().catch(() => []),
  ]);

  const categoryMap = new Map();
  for (const c of existingCategories) {
    if (c.category_name) categoryMap.set(c.category_name.toLowerCase().trim(), c.category_code);
    if (c.category_code) categoryMap.set(c.category_code.toLowerCase().trim(), c.category_code);
  }

  // เตรียม building เริ่มต้น หากยังไม่มี
  let defaultBuildingCode = existingBuildings[0]?.building_code;
  if (!defaultBuildingCode) {
    try {
      const createdB = await createBuilding("MAIN", "อาคารหลัก");
      defaultBuildingCode = createdB.building_code;
    } catch {
      defaultBuildingCode = "MAIN";
    }
  }

  const roomMap = new Map();
  for (const r of existingRooms) {
    if (r.room_name) roomMap.set(r.room_name.toLowerCase().trim(), r.room_code);
    if (r.room_code) roomMap.set(r.room_code.toLowerCase().trim(), r.room_code);
  }

  // 2. ตรวจสอบและสร้างหมวดหมู่ใหม่ที่ยังไม่มีในฐานข้อมูล
  const neededCategories = new Set();
  for (const item of rawItems) {
    const rawCat = (item.category || item.category_name || item.category_code || "").trim();
    if (rawCat && !categoryMap.has(rawCat.toLowerCase())) {
      neededCategories.add(rawCat);
    }
  }

  for (const catName of neededCategories) {
    try {
      const code = `CAT-${Math.floor(10 + Math.random() * 90)}`;
      const created = await createCategory(code, catName);
      categoryMap.set(catName.toLowerCase(), created.category_code);
      categoryMap.set(code.toLowerCase(), created.category_code);
    } catch {
      // ignore conflict
    }
  }

  // 3. ตรวจสอบและสร้างห้องใหม่ที่ยังไม่มีในฐานข้อมูล
  const neededRooms = new Set();
  for (const item of rawItems) {
    const rawRoom = (item.room || item.room_name || item.room_code || item.location || "").trim();
    if (rawRoom && !roomMap.has(rawRoom.toLowerCase())) {
      neededRooms.add(rawRoom);
    }
  }

  for (const roomName of neededRooms) {
    try {
      const code = `R${Math.floor(100 + Math.random() * 900)}`;
      const created = await createRoom(defaultBuildingCode, 1, code, roomName);
      roomMap.set(roomName.toLowerCase(), created.room_code);
      roomMap.set(code.toLowerCase(), created.room_code);
    } catch {
      // ignore conflict
    }
  }

  // 4. แปลงข้อมูลพร้อม insert
  const payloadRows = rawItems.map((item) => {
    const rawCat = (item.category || item.category_name || item.category_code || "").toLowerCase().trim();
    const resolvedCatCode = categoryMap.get(rawCat) || null;

    const rawRoom = (item.room || item.room_name || item.room_code || item.location || "").toLowerCase().trim();
    const resolvedRoomCode = roomMap.get(rawRoom) || null;

    let status = (item.status || "normal").toLowerCase().trim();
    if (status.includes("ยืม") || status === "borrowed") status = "borrowed";
    else if (status.includes("ซ่อม") || status === "repair") status = "repair";
    else if (status.includes("ชำรุด") || status === "damaged") status = "damaged";
    else status = "normal";

    return {
      asset_code: String(item.asset_code || item.code).trim(),
      name: String(item.name || "ไม่ระบุชื่อครุภัณฑ์").trim(),
      category_code: resolvedCatCode,
      room_code: resolvedRoomCode,
      color: item.color ? String(item.color).trim() : null,
      status: status,
      received_date: item.received_date ? String(item.received_date).trim() : null,
      responsible_person: item.responsible_person ? String(item.responsible_person).trim() : null,
      image_url: item.image_url ? String(item.image_url).trim() : null,
    };
  });

  // 5. บันทึกเป็น Chunks ขึ้น Supabase
  const chunkSize = 50;
  let successCount = 0;
  for (let i = 0; i < payloadRows.length; i += chunkSize) {
    const chunk = payloadRows.slice(i, i + chunkSize);
    const { error } = await supabase.from("assets").upsert(chunk, { onConflict: "asset_code" });
    if (error) throw error;
    successCount += chunk.length;
    if (onProgress) onProgress(Math.min(100, Math.round((successCount / payloadRows.length) * 100)));
  }

  return { total: payloadRows.length, success: successCount };
}

// ---------------------------------------------------------------------------
// Maintenance & Helpdesk Tickets (Supabase Cloud + LocalStorage Hybrid Sync)
// ---------------------------------------------------------------------------
const MAINTENANCE_STORAGE_KEY = "asset_maintenance_tickets_v2";

export async function resetMaintenanceTicketsToMock(defaultTickets = []) {
  try {
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(defaultTickets));
  } catch {}
  if (isConfigured && defaultTickets.length > 0) {
    try {
      await supabase.from("maintenance_tickets").upsert(defaultTickets, { onConflict: "id" });
    } catch {}
  }
  return defaultTickets;
}

export function compressImageToDataUrl(file, maxWidth = 900, quality = 0.78) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = reject;
      img.src = e.target.result;
    };
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export async function uploadRepairPhoto(file, prefix = "ticket") {
  if (!file) return null;
  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const fileName = `repairs/${prefix}-${Date.now()}.${ext}`;
    const { error: uploadError } = await supabase.storage
      .from("asset-images")
      .upload(fileName, file, { upsert: true });

    if (!uploadError) {
      const { data: publicData } = supabase.storage
        .from("asset-images")
        .getPublicUrl(fileName);
      if (publicData?.publicUrl) return publicData.publicUrl;
    }
  } catch {
    // Fallback to compressed base64 data URL
  }
  return await compressImageToDataUrl(file);
}

export async function fetchMaintenanceTickets(defaultTickets = []) {
  let localTickets = [];
  try {
    const saved = localStorage.getItem(MAINTENANCE_STORAGE_KEY);
    if (saved) {
      localTickets = JSON.parse(saved);
    } else {
      localTickets = defaultTickets;
      localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(defaultTickets));
    }
  } catch {
    localTickets = defaultTickets;
  }

  if (isConfigured) {
    try {
      const { data, error } = await supabase
        .from("maintenance_tickets")
        .select("*")
        .order("created_at", { ascending: false });

      if (!error && Array.isArray(data)) {
        if (data.length > 0 && data.length >= defaultTickets.length) {
          try {
            localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(data));
          } catch {}
          return { tickets: data, isCloudSynced: true };
        } else if (localTickets.length > 0) {
          // Seed or merge default mock tickets to Supabase table
          const existingIds = new Set(data.map((d) => String(d.id)));
          const merged = [
            ...data,
            ...localTickets.filter((t) => !existingIds.has(String(t.id))),
          ];
          await supabase.from("maintenance_tickets").upsert(merged, { onConflict: "id" });
          try {
            localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(merged));
          } catch {}
          return { tickets: merged, isCloudSynced: true };
        }
        return { tickets: [], isCloudSynced: true };
      }
    } catch {
      // Table may not be created yet; use local storage seamlessly
    }
  }

  return { tickets: localTickets, isCloudSynced: false };
}

export async function saveMaintenanceTicketToCloud(ticket, fullList) {
  try {
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(fullList));
  } catch (e) {
    console.warn("Local storage save warning:", e);
  }

  if (isConfigured && ticket) {
    try {
      await supabase.from("maintenance_tickets").upsert(ticket, { onConflict: "id" });
    } catch {
      // Ignore if table not created yet
    }
  }
}

export async function deleteMaintenanceTicketFromCloud(ticketId, updatedList) {
  try {
    localStorage.setItem(MAINTENANCE_STORAGE_KEY, JSON.stringify(updatedList));
  } catch {}

  if (isConfigured && ticketId) {
    try {
      await supabase.from("maintenance_tickets").delete().eq("id", ticketId);
    } catch {}
  }
}
