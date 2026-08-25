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
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardCounts() {
  try {
    const { data, error } = await supabase.from("assets").select("status");
    if (error) throw error;

    const counts = { total: data.length, normal: 0, repair: 0, borrowed: 0, damaged: 0, disposed: 0 };
    for (const row of data) {
      const s = row.status || "normal";
      counts[s] = (counts[s] || 0) + 1;
    }

    return {
      total: counts.total || 0,
      normal: counts.normal || 0,
      borrowed: counts.borrowed || 0,
      repair: (counts.repair || 0) + (counts.damaged || 0),
      damaged: counts.damaged || 0,
      disposed: counts.disposed || 0,
    };
  } catch (err) {
    console.warn("getDashboardCounts error:", err);
    return { total: 0, normal: 0, borrowed: 0, repair: 0, damaged: 0, disposed: 0 };
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

  if (filters.status) query = query.eq("status", filters.status);
  const cat = filters.categoryCode || filters.categoryId;
  if (cat) query = query.eq("category_code", cat);
  const rm = filters.roomCode || filters.roomId;
  if (rm) query = query.eq("room_code", rm);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) {
    console.warn("listAssets error:", error);
    throw error;
  }
  return data || [];
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
  return data;
}

export async function getAssetById(assetCode) {
  return getAssetByCode(assetCode);
}

export async function getAssetHistory(assetCode) {
  const { data, error } = await supabase
    .from("asset_status_log")
    .select("*")
    .eq("asset_code", assetCode)
    .order("changed_at", { ascending: false });

  if (error) return [];
  return data || [];
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

  const { data, error } = await supabase
    .from("assets")
    .update(payload)
    .eq("asset_code", assetCode)
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function deleteAsset(assetCode) {
  const { error } = await supabase.from("assets").delete().eq("asset_code", assetCode);
  if (error) throw error;
  return true;
}

export async function updateAssetStatus(assetCode, newStatus, note = "") {
  const { data: current } = await supabase
    .from("assets")
    .select("status")
    .eq("asset_code", assetCode)
    .maybeSingle();

  const oldStatus = current?.status || null;

  const { data, error } = await supabase
    .from("assets")
    .update({ status: newStatus })
    .eq("asset_code", assetCode)
    .select()
    .single();

  if (error) throw error;

  try {
    await supabase.from("asset_status_log").insert({
      asset_code: assetCode,
      old_status: oldStatus,
      new_status: newStatus,
      note: note || null,
      changed_at: new Date().toISOString(),
    });
  } catch (logErr) {
    console.warn("log status change error:", logErr);
  }

  return data;
}

// ---------------------------------------------------------------------------
// Image Upload to Supabase Storage
// ---------------------------------------------------------------------------
export async function uploadAssetImage(file, assetCode) {
  const ext = file.name.split(".").pop();
  const fileName = `${assetCode}-${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage
    .from("asset-images")
    .upload(fileName, file, { upsert: true });

  if (uploadError) throw uploadError;

  const { data: publicData } = supabase.storage
    .from("asset-images")
    .getPublicUrl(fileName);

  return publicData.publicUrl;
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
  return (data || []).map((c) => ({
    ...c,
    id: c.category_code,
    category_code: c.category_code,
    category_name: c.category_name,
    name: c.category_name,
  }));
}

export async function createCategory(categoryCode, categoryName) {
  const code = categoryCode || `CAT-${Date.now().toString().slice(-4)}`;
  const { data, error } = await supabase
    .from("asset_categories")
    .insert({ category_code: String(code).trim(), category_name: String(categoryName).trim() })
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
// Borrow Records (ยืม - คืน ครุภัณฑ์: ตาราง borrow_records)
// ---------------------------------------------------------------------------
export async function listBorrowRecords() {
  const { data, error } = await supabase
    .from("borrow_records")
    .select("*, assets(asset_code, name, color, image_url)")
    .order("borrowed_at", { ascending: false });

  if (error) {
    console.warn("listBorrowRecords error:", error);
    throw error;
  }
  return data || [];
}

export async function borrowAsset(assetCode, borrowerName, borrowerContact, dueDate) {
  const { data: record, error: recordError } = await supabase
    .from("borrow_records")
    .insert({
      asset_code: assetCode,
      borrower_name: borrowerName.trim(),
      borrower_contact: borrowerContact ? borrowerContact.trim() : null,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (recordError) throw recordError;

  await updateAssetStatus(assetCode, "borrowed", `ยืมโดย: ${borrowerName}`);
  return record;
}

export async function returnAsset(assetCode, borrowRecordId) {
  const { error: recordError } = await supabase
    .from("borrow_records")
    .update({ returned_at: new Date().toISOString() })
    .eq("id", borrowRecordId);

  if (recordError) throw recordError;

  await updateAssetStatus(assetCode, "normal", "ส่งคืนเรียบร้อย");
}

export async function getActiveBorrowRecord(assetCode) {
  const { data, error } = await supabase
    .from("borrow_records")
    .select("*")
    .eq("asset_code", assetCode)
    .is("returned_at", null)
    .order("borrowed_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) return null;
  return data;
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
    else if (status.includes("จำหน่าย") || status === "disposed") status = "disposed";
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
