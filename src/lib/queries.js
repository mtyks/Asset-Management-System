import { supabase } from "../supabaseClient";

/**
 * ไฟล์นี้รวม query ทั้งหมดที่คุยกับ Supabase ไว้ที่เดียว
 * หน้า UI (pages/components) ไม่ควรเรียก supabase.from() ตรงๆ
 * เพื่อให้แก้ logic การดึงข้อมูลได้จุดเดียว ไม่ต้องไล่แก้ทุกหน้าจอ
 */

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------
export async function getDashboardCounts() {
  const { data, error } = await supabase.from("assets").select("status");
  if (error) throw error;

  const counts = { total: data.length, normal: 0, repair: 0, borrowed: 0, damaged: 0, disposed: 0 };
  for (const row of data) {
    counts[row.status] = (counts[row.status] || 0) + 1;
  }
  return counts;
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
export async function listAssets(filters = {}) {
  let query = supabase
    .from("assets")
    .select(
      `id, asset_code, name, color, status, image_url, received_date, responsible_person,
       asset_categories ( id, category_name ),
       rooms ( id, room_name, floors ( id, floor_number, buildings ( id, name ) ) )`
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.roomId) query = query.eq("room_id", filters.roomId);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAssetByCode(assetCode) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `*, asset_categories ( category_name ),
       rooms ( room_name, floors ( floor_number, buildings ( name ) ) )`
    )
    .eq("asset_code", assetCode)
    .single();
  if (error) throw error;
  return data;
}

export async function getAssetById(id) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `*, rooms ( id, room_name, floor_id, floors ( id, floor_number, building_id ) )`
    )
    .eq("id", id)
    .single();
  if (error) throw error;
  return data;
}

export async function getAssetHistory(assetId) {
  const { data, error } = await supabase
    .from("asset_status_log")
    .select("*")
    .eq("asset_id", assetId)
    .order("changed_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAsset(asset) {
  const { data, error } = await supabase.from("assets").insert(asset).select().single();
  if (error) throw error;
  return data;
}

// อัปโหลดรูปภาพครุภัณฑ์ขึ้น Supabase Storage แล้วคืน public URL กลับมา
// ตั้งชื่อไฟล์ด้วยรหัสครุภัณฑ์ + timestamp กันชื่อไฟล์ซ้ำ
export async function uploadAssetImage(file, assetCode) {
  const fileExt = file.name.split(".").pop();
  const filePath = `${assetCode}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("asset-images")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("asset-images").getPublicUrl(filePath);
  return data.publicUrl;
}

export async function updateAsset(id, updates) {
  const { data, error } = await supabase.from("assets").update(updates).eq("id", id).select().single();
  if (error) throw error;
  return data;
}

export async function updateAssetStatus(id, newStatus) {
  return updateAsset(id, { status: newStatus });
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function listCategories() {
  const { data, error } = await supabase.from("asset_categories").select("*").order("category_name");
  if (error) throw error;
  return data;
}

export async function createCategory(categoryName) {
  const { data, error } = await supabase
    .from("asset_categories")
    .insert({ category_name: categoryName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(id, categoryName) {
  const { data, error } = await supabase
    .from("asset_categories")
    .update({ category_name: categoryName })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(id) {
  const { error } = await supabase.from("asset_categories").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Locations: buildings / floors / rooms
// ---------------------------------------------------------------------------
export async function listBuildings() {
  const { data, error } = await supabase.from("buildings").select("*").order("name");
  if (error) throw error;
  return data;
}

export async function createBuilding(name, code) {
  const { data, error } = await supabase.from("buildings").insert({ name, code }).select().single();
  if (error) throw error;
  return data;
}

export async function updateBuilding(id, name, code) {
  const { data, error } = await supabase
    .from("buildings")
    .update({ name, code })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteBuilding(id) {
  const { error } = await supabase.from("buildings").delete().eq("id", id);
  if (error) throw error;
}

export async function listFloors(buildingId) {
  let query = supabase.from("floors").select("*, buildings(name)").order("floor_number");
  if (buildingId) query = query.eq("building_id", buildingId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createFloor(buildingId, floorNumber, floorName) {
  const { data, error } = await supabase
    .from("floors")
    .insert({ building_id: buildingId, floor_number: floorNumber, floor_name: floorName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFloor(id, floorNumber, floorName) {
  const { data, error } = await supabase
    .from("floors")
    .update({ floor_number: floorNumber, floor_name: floorName })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFloor(id) {
  const { error } = await supabase.from("floors").delete().eq("id", id);
  if (error) throw error;
}

export async function listRooms(floorId) {
  let query = supabase.from("rooms").select("*, floors(floor_number, buildings(name))").order("room_name");
  if (floorId) query = query.eq("floor_id", floorId);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createRoom(floorId, roomName, roomCode) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ floor_id: floorId, room_name: roomName, room_code: roomCode })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoom(id, roomName, roomCode) {
  const { data, error } = await supabase
    .from("rooms")
    .update({ room_name: roomName, room_code: roomCode })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteRoom(id) {
  const { error } = await supabase.from("rooms").delete().eq("id", id);
  if (error) throw error;
}

// ---------------------------------------------------------------------------
// Borrow records
// ---------------------------------------------------------------------------
export async function borrowAsset(assetId, borrowerName, borrowerContact, dueDate) {
  const { data: record, error: recordError } = await supabase
    .from("borrow_records")
    .insert({
      asset_id: assetId,
      borrower_name: borrowerName,
      borrower_contact: borrowerContact,
      due_date: dueDate,
    })
    .select()
    .single();
  if (recordError) throw recordError;

  await updateAssetStatus(assetId, "borrowed");
  return record;
}

export async function returnAsset(assetId, borrowRecordId) {
  const { error: recordError } = await supabase
    .from("borrow_records")
    .update({ returned_at: new Date().toISOString() })
    .eq("id", borrowRecordId);
  if (recordError) throw recordError;

  await updateAssetStatus(assetId, "normal");
}

export async function getActiveBorrowRecord(assetId) {
  const { data, error } = await supabase
    .from("borrow_records")
    .select("*")
    .eq("asset_id", assetId)
    .is("returned_at", null)
    .order("borrowed_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}
