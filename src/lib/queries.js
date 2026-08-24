import { supabase } from "../supabaseClient";

/**
 * ไฟล์นี้รวม query ทั้งหมดที่คุยกับ Supabase ไว้ที่เดียว
 * ตั้งแต่ schema v3 เป็นต้นมา ทุกตารางใช้ "code" ที่มนุษย์อ่านออกเป็น primary key
 * แทน uuid — ฟังก์ชันด้านล่างจึงรับ/คืนค่าเป็น code (เช่น asset_code, room_code)
 * แทนที่จะเป็น id เหมือนเดิม
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
      `asset_code, name, color, status, image_url, received_date, responsible_person,
       asset_categories ( category_code, category_name ),
       rooms ( room_code, room_name, floors ( floor_code, floor_number, buildings ( building_code, name ) ) )`
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryCode) query = query.eq("category_code", filters.categoryCode);
  if (filters.roomCode) query = query.eq("room_code", filters.roomCode);
  if (filters.search) query = query.ilike("name", `%${filters.search}%`);

  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function getAssetByCode(assetCode) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `*, asset_categories ( category_code, category_name ),
       rooms ( room_code, room_name, floor_code, floors ( floor_number, building_code, buildings ( name ) ) )`
    )
    .eq("asset_code", assetCode)
    .single();
  if (error) throw error;
  return data;
}

export async function getAssetHistory(assetCode) {
  const { data, error } = await supabase
    .from("asset_status_log")
    .select("*")
    .eq("asset_code", assetCode)
    .order("changed_at", { ascending: false });
  if (error) throw error;
  return data;
}

export async function createAsset(asset) {
  const { data, error } = await supabase.from("assets").insert(asset).select().single();
  if (error) throw error;
  return data;
}

export async function updateAsset(assetCode, updates) {
  const { data, error } = await supabase
    .from("assets")
    .update(updates)
    .eq("asset_code", assetCode)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateAssetStatus(assetCode, newStatus) {
  return updateAsset(assetCode, { status: newStatus });
}

// อัปโหลดรูปภาพครุภัณฑ์ขึ้น Supabase Storage แล้วคืน public URL กลับมา
export async function uploadAssetImage(file, assetCode) {
  const fileExt = file.name.split(".").pop();
  const filePath = `${assetCode.replace(/[^a-zA-Z0-9-]/g, "_")}-${Date.now()}.${fileExt}`;

  const { error: uploadError } = await supabase.storage
    .from("asset-images")
    .upload(filePath, file, { cacheControl: "3600", upsert: false });
  if (uploadError) throw uploadError;

  const { data } = supabase.storage.from("asset-images").getPublicUrl(filePath);
  return data.publicUrl;
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
export async function listCategories() {
  const { data, error } = await supabase.from("asset_categories").select("*").order("category_code");
  if (error) throw error;
  return data;
}

export async function createCategory(categoryCode, categoryName) {
  const { data, error } = await supabase
    .from("asset_categories")
    .insert({ category_code: categoryCode, category_name: categoryName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateCategory(categoryCode, categoryName) {
  const { data, error } = await supabase
    .from("asset_categories")
    .update({ category_name: categoryName })
    .eq("category_code", categoryCode)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteCategory(categoryCode) {
  const { error } = await supabase.from("asset_categories").delete().eq("category_code", categoryCode);
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

export async function createBuilding(buildingCode, name) {
  const { data, error } = await supabase
    .from("buildings")
    .insert({ building_code: buildingCode, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBuilding(buildingCode, name) {
  const { data, error } = await supabase
    .from("buildings")
    .update({ name })
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

function makeFloorCode(buildingCode, floorNumber) {
  return `${buildingCode}-F${floorNumber}`;
}

export async function listFloors(buildingCode) {
  let query = supabase.from("floors").select("*, buildings(name)").order("floor_number");
  if (buildingCode) query = query.eq("building_code", buildingCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createFloor(buildingCode, floorNumber, floorName) {
  const floorCode = makeFloorCode(buildingCode, floorNumber);
  const { data, error } = await supabase
    .from("floors")
    .insert({ floor_code: floorCode, building_code: buildingCode, floor_number: floorNumber, floor_name: floorName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateFloor(floorCode, floorNumber, floorName) {
  const { data, error } = await supabase
    .from("floors")
    .update({ floor_number: floorNumber, floor_name: floorName })
    .eq("floor_code", floorCode)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteFloor(floorCode) {
  const { error } = await supabase.from("floors").delete().eq("floor_code", floorCode);
  if (error) throw error;
}

export async function listRooms(floorCode) {
  let query = supabase.from("rooms").select("*, floors(floor_number, buildings(name))").order("room_name");
  if (floorCode) query = query.eq("floor_code", floorCode);
  const { data, error } = await query;
  if (error) throw error;
  return data;
}

export async function createRoom(floorCode, roomCode, roomName) {
  const { data, error } = await supabase
    .from("rooms")
    .insert({ room_code: roomCode, floor_code: floorCode, room_name: roomName })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateRoom(roomCode, roomName) {
  const { data, error } = await supabase
    .from("rooms")
    .update({ room_name: roomName })
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
// Borrow records
// ---------------------------------------------------------------------------
export async function borrowAsset(assetCode, borrowerName, borrowerContact, dueDate) {
  const { data: record, error: recordError } = await supabase
    .from("borrow_records")
    .insert({
      asset_code: assetCode,
      borrower_name: borrowerName,
      borrower_contact: borrowerContact,
      due_date: dueDate,
    })
    .select()
    .single();
  if (recordError) throw recordError;

  await updateAssetStatus(assetCode, "borrowed");
  return record;
}

export async function returnAsset(assetCode, borrowRecordId) {
  const { error: recordError } = await supabase
    .from("borrow_records")
    .update({ returned_at: new Date().toISOString() })
    .eq("id", borrowRecordId);
  if (recordError) throw recordError;

  await updateAssetStatus(assetCode, "normal");
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
  if (error) throw error;
  return data;
}
