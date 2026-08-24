import { supabase, isConfigured } from "../supabaseClient.js";

/**
 * รวม queries ทั้งหมดที่สื่อสารกับ Supabase PostgreSQL & Storage
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
    .select(
      `*,
       asset_categories ( id, category_name ),
       rooms ( id, room_name, floors ( id, floor_number, buildings ( id, name ) ) )`
    )
    .order("created_at", { ascending: false });

  if (filters.status) query = query.eq("status", filters.status);
  if (filters.categoryId) query = query.eq("category_id", filters.categoryId);
  if (filters.roomId) query = query.eq("room_id", filters.roomId);
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

  // 1. ลองค้นหาตรงๆ ด้วย asset_code
  let { data } = await supabase
    .from("assets")
    .select(
      `*,
       asset_categories ( id, category_name ),
       rooms ( id, room_name, floors ( id, floor_number, buildings ( id, name ) ) )`
    )
    .eq("asset_code", decoded)
    .maybeSingle();

  // 2. ถ้าไม่เจอ ลองค้นหาแบบไม่สนตัวพิมพ์เล็กใหญ่ (ilike)
  if (!data) {
    const { data: ilikeData } = await supabase
      .from("assets")
      .select(
        `*,
         asset_categories ( id, category_name ),
         rooms ( id, room_name, floors ( id, floor_number, buildings ( id, name ) ) )`
      )
      .ilike("asset_code", decoded)
      .maybeSingle();
    data = ilikeData;
  }

  // 3. ถ้าไม่เจอ ลองค้นหาด้วย id (UUID) เผื่อกรณีรหัสที่ได้มาเป็น UUID
  if (!data) {
    const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(decoded);
    if (isUuid) {
      const { data: idData } = await supabase
        .from("assets")
        .select(
          `*,
           asset_categories ( id, category_name ),
           rooms ( id, room_name, floors ( id, floor_number, buildings ( id, name ) ) )`
        )
        .eq("id", decoded)
        .maybeSingle();
      data = idData;
    }
  }

  if (!data) {
    throw new Error(`ไม่พบข้อมูลครุภัณฑ์รหัส "${decoded}" ในระบบ`);
  }
  return data;
}

export async function getAssetById(id) {
  const { data, error } = await supabase
    .from("assets")
    .select(
      `*,
       asset_categories ( id, category_name ),
       rooms ( id, room_name, floor_id, floors ( id, floor_number, building_id, buildings ( id, name ) ) )`
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

  if (error) return [];
  return data || [];
}

export async function createAsset(asset) {
  const { data, error } = await supabase.from("assets").insert(asset).select().single();
  if (error) throw error;
  return data;
}

export async function updateAsset(id, updates) {
  const { data, error } = await supabase
    .from("assets")
    .update(updates)
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteAsset(id) {
  const { error } = await supabase.from("assets").delete().eq("id", id);
  if (error) throw error;
  return true;
}

export async function updateAssetStatus(id, newStatus) {
  return updateAsset(id, { status: newStatus });
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
  return data || [];
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
  return data || [];
}

export async function createBuilding(name, code) {
  const { data, error } = await supabase
    .from("buildings")
    .insert({
      name: String(name).trim(),
      code: code && code.trim() !== "" ? code.trim() : null,
    })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateBuilding(id, name, code) {
  const { data, error } = await supabase
    .from("buildings")
    .update({
      name: String(name).trim(),
      code: code && code.trim() !== "" ? code.trim() : null,
    })
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
  let query = supabase.from("floors").select("*, buildings(id, name)").order("floor_number");
  if (buildingId && buildingId !== "") query = query.eq("building_id", buildingId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createFloor(buildingId, floorNumber, floorName) {
  let targetBuildingId = buildingId && buildingId !== "" ? buildingId : null;

  // ถ้ายังไม่มีอาคาร ให้หาหรือสร้างอาคารหลักอัตโนมัติ
  if (!targetBuildingId) {
    const { data: existingBuildings } = await supabase.from("buildings").select("id").limit(1);
    if (existingBuildings && existingBuildings.length > 0) {
      targetBuildingId = existingBuildings[0].id;
    } else {
      const { data: newBuilding, error: bErr } = await supabase
        .from("buildings")
        .insert({ name: "อาคารหลัก", code: "BLD-01" })
        .select()
        .single();
      if (bErr) throw bErr;
      targetBuildingId = newBuilding.id;
    }
  }

  const { data, error } = await supabase
    .from("floors")
    .insert({
      building_id: targetBuildingId,
      floor_number: Number(floorNumber) || 1,
      floor_name: floorName && floorName.trim() !== "" ? floorName.trim() : `ชั้น ${floorNumber || 1}`,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateFloor(id, floorNumber, floorName) {
  const { data, error } = await supabase
    .from("floors")
    .update({
      floor_number: Number(floorNumber) || 1,
      floor_name: floorName && floorName.trim() !== "" ? floorName.trim() : null,
    })
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
  let query = supabase
    .from("rooms")
    .select("*, floors(id, floor_number, buildings(id, name))")
    .order("room_name");
  if (floorId && floorId !== "") query = query.eq("floor_id", floorId);
  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

export async function createRoom(floorId, roomName, roomCode) {
  let targetFloorId = floorId && floorId !== "" ? floorId : null;

  // ถ้ายังไม่มี floorId ที่ส่งมา ให้หาหรือสร้างชั้น/ตึกตั้งต้นอัตโนมัติ
  if (!targetFloorId) {
    const { data: existingFloors } = await supabase.from("floors").select("id").limit(1);
    if (existingFloors && existingFloors.length > 0) {
      targetFloorId = existingFloors[0].id;
    } else {
      let targetBuildingId;
      const { data: existingBuildings } = await supabase.from("buildings").select("id").limit(1);
      if (existingBuildings && existingBuildings.length > 0) {
        targetBuildingId = existingBuildings[0].id;
      } else {
        const { data: newBuilding, error: bErr } = await supabase
          .from("buildings")
          .insert({ name: "อาคารหลัก", code: "BLD-01" })
          .select()
          .single();
        if (bErr) throw bErr;
        targetBuildingId = newBuilding.id;
      }

      const { data: newFloor, error: fErr } = await supabase
        .from("floors")
        .insert({ building_id: targetBuildingId, floor_number: 1, floor_name: "ชั้น 1" })
        .select()
        .single();
      if (fErr) throw fErr;
      targetFloorId = newFloor.id;
    }
  }

  const { data, error } = await supabase
    .from("rooms")
    .insert({
      floor_id: targetFloorId,
      room_name: String(roomName).trim(),
      room_code: roomCode && roomCode.trim() !== "" ? roomCode.trim() : null,
    })
    .select()
    .single();

  if (error) throw error;
  return data;
}

export async function updateRoom(id, roomName, roomCode) {
  const { data, error } = await supabase
    .from("rooms")
    .update({
      room_name: String(roomName).trim(),
      room_code: roomCode && roomCode.trim() !== "" ? roomCode.trim() : null,
    })
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
// Borrow Records (ยืม - คืน ครุภัณฑ์: ตาราง borrow_records)
// ---------------------------------------------------------------------------
export async function listBorrowRecords() {
  const { data, error } = await supabase
    .from("borrow_records")
    .select("*, assets(id, asset_code, name, color, image_url)")
    .order("borrowed_at", { ascending: false });

  if (error) {
    console.warn("listBorrowRecords error:", error);
    throw error;
  }
  return data || [];
}

export async function borrowAsset(assetId, borrowerName, borrowerContact, dueDate) {
  const { data: record, error: recordError } = await supabase
    .from("borrow_records")
    .insert({
      asset_id: assetId,
      borrower_name: borrowerName.trim(),
      borrower_contact: borrowerContact ? borrowerContact.trim() : null,
      due_date: dueDate || null,
    })
    .select()
    .single();

  if (recordError) throw recordError;

  // อัปเดตสถานะของ asset เป็น borrowed
  await updateAssetStatus(assetId, "borrowed");
  return record;
}

export async function returnAsset(assetId, borrowRecordId) {
  const { error: recordError } = await supabase
    .from("borrow_records")
    .update({ returned_at: new Date().toISOString() })
    .eq("id", borrowRecordId);

  if (recordError) throw recordError;

  // อัปเดตสถานะของ asset กลับเป็น normal
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

  if (error) return null;
  return data;
}
