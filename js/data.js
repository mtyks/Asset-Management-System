// --- DATA STORE & SUPABASE SYNCHRONIZATION ---
//
// ไฟล์นี้แทนที่ localStorage เดิมทั้งหมดด้วย Supabase (PostgreSQL) จริง
// หลักการสำคัญ: คงชื่อตัวแปร/ฟังก์ชัน/รูปร่าง object เดิมทุกอย่างไว้
// (categories, locations, assets, transfers, maintenance และ loadX()/saveX())
// เพื่อไม่ให้ต้องแก้โค้ดหน้าอื่น (assets.js, categories.js, maintenance.js,
// transfers.js, dashboard.js) เกินความจำเป็น — มีแค่ locations.js ที่ต้องเขียนใหม่
// เพราะโครงสร้างที่แท้จริงเปลี่ยนจากตารางเดียวเป็น 3 ระดับ (buildings/floors/rooms)

// Global active in-memory state (ตัวแปรเดิมที่หน้าอื่นอ้างถึงอยู่)
let categories = [];
let locations = [];   // flat view คำนวณจาก buildings+floors+rooms+assets ให้หน้าตาเหมือนเดิม
let assets = [];
let transfers = [];
let maintenance = [];

// สถานะภายในที่หน้า UI ไม่จำเป็นต้องรู้ (ใช้เทียบ diff ก่อน sync ขึ้น Supabase)
let buildings = [];
let floors = [];
let rooms = [];
let _snapshots = { categories: [], rooms: [], assets: [], transfers: [], maintenance: [] };

const availableIcons = [
  'ph-desktop', 'ph-chair', 'ph-wifi-high', 'ph-projector-screen',
  'ph-lightning', 'ph-car', 'ph-flask', 'ph-cooking-pot',
  'ph-wrench', 'ph-plant', 'ph-package', 'ph-printer',
  'ph-camera', 'ph-headphones', 'ph-gear', 'ph-buildings'
];

// ---------------------------------------------------------------------------
// Helper Functions (เหมือนเดิมทุกจุด)
// ---------------------------------------------------------------------------
function formatNumber(num) {
  return Number(num).toLocaleString('th-TH');
}

function getCategoryColorClass(color) {
  const map = {
    blue: { bg: 'bg-blue-50', text: 'text-blue-600', border: 'border-blue-200', tag: 'bg-blue-100 text-blue-800' },
    amber: { bg: 'bg-amber-50', text: 'text-amber-600', border: 'border-amber-200', tag: 'bg-amber-100 text-amber-800' },
    emerald: { bg: 'bg-emerald-50', text: 'text-emerald-600', border: 'border-emerald-200', tag: 'bg-emerald-100 text-emerald-800' },
    purple: { bg: 'bg-purple-50', text: 'text-purple-600', border: 'border-purple-200', tag: 'bg-purple-100 text-purple-800' },
    cyan: { bg: 'bg-cyan-50', text: 'text-cyan-600', border: 'border-cyan-200', tag: 'bg-cyan-100 text-cyan-800' },
    indigo: { bg: 'bg-indigo-50', text: 'text-indigo-600', border: 'border-indigo-200', tag: 'bg-indigo-100 text-indigo-800' },
    rose: { bg: 'bg-rose-50', text: 'text-rose-600', border: 'border-rose-200', tag: 'bg-rose-100 text-rose-800' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-600', border: 'border-orange-200', tag: 'bg-orange-100 text-orange-800' },
    teal: { bg: 'bg-teal-50', text: 'text-teal-600', border: 'border-teal-200', tag: 'bg-teal-100 text-teal-800' },
    green: { bg: 'bg-green-50', text: 'text-green-600', border: 'border-green-200', tag: 'bg-green-100 text-green-800' },
  };
  return map[color] || map.blue;
}

// ---------------------------------------------------------------------------
// Fail-stop error helper — ไม่ปล่อยให้ error เงียบ ต้องเห็นทันที
// ---------------------------------------------------------------------------
function reportDbError(context, error) {
  console.error(`[Supabase Error] ${context}:`, error);
  if (typeof showToast === 'function') {
    showToast(`เกิดข้อผิดพลาด (${context}): ${error.message || error}`);
  } else {
    alert(`เกิดข้อผิดพลาด (${context}): ${error.message || error}`);
  }
}

// ---------------------------------------------------------------------------
// Generic diff-sync: เทียบ array ปัจจุบันกับ snapshot ล่าสุดที่ sync ไปแล้ว
// แล้ว insert/update/delete เฉพาะส่วนต่าง ไม่เขียนทับทั้งตารางทุกครั้ง
// ---------------------------------------------------------------------------
async function diffAndSyncGeneric(table, snapshot, currentList, toDbRow, matchAfterInsert) {
  const snapshotIds = new Set(snapshot.map(x => x.id));
  const currentIds = new Set(currentList.map(x => x.id));

  const toInsert = currentList.filter(x => !snapshotIds.has(x.id));
  const toDelete = snapshot.filter(x => !currentIds.has(x.id));
  const toUpdate = currentList.filter(x => {
    if (!snapshotIds.has(x.id)) return false;
    const prev = snapshot.find(s => s.id === x.id);
    return JSON.stringify(prev) !== JSON.stringify(x);
  });

  try {
    for (const item of toInsert) {
      const row = toDbRow(item);
      delete row.id;
      const { data, error } = await supabaseClient.from(table).insert(row).select().single();
      if (error) throw error;
      if (matchAfterInsert) matchAfterInsert(item, data);
    }
    for (const item of toUpdate) {
      const row = toDbRow(item);
      delete row.id;
      const { error } = await supabaseClient.from(table).update(row).eq('id', item.id);
      if (error) throw error;
    }
    for (const item of toDelete) {
      const { error } = await supabaseClient.from(table).delete().eq('id', item.id);
      if (error) throw error;
    }
  } catch (error) {
    reportDbError(`บันทึกข้อมูลตาราง ${table}`, error);
    throw error;
  }
}

async function diffAndSync(table, snapshotKey, currentList, toDbRow, matchAfterInsert) {
  await diffAndSyncGeneric(table, _snapshots[snapshotKey], currentList, toDbRow, matchAfterInsert);
  _snapshots[snapshotKey] = JSON.parse(JSON.stringify(currentList));
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------
async function loadCategories() {
  const { data, error } = await supabaseClient.from('asset_categories').select('*').order('code');
  if (error) { reportDbError('โหลดหมวดหมู่', error); return []; }

  const withCounts = data.map(c => ({
    id: c.id,
    code: c.code,
    name: c.name,
    icon: c.icon,
    color: c.color,
    count: assets.filter(a => a.categoryId === c.id).length,
    desc: c.description,
    isActive: c.is_active,
  }));

  _snapshots.categories = JSON.parse(JSON.stringify(withCounts));
  return withCounts;
}

async function saveCategories(list) {
  const toDbRow = (c) => ({
    id: c.id,
    code: c.code,
    name: c.name,
    icon: c.icon,
    color: c.color,
    description: c.desc,
    is_active: c.isActive,
  });
  const matchAfterInsert = (item, dbRow) => { item.id = dbRow.id; };
  await diffAndSync('asset_categories', 'categories', list, toDbRow, matchAfterInsert);
}

// ---------------------------------------------------------------------------
// Locations (buildings -> floors -> rooms), ให้ flat view ชื่อ "locations"
// เหมือนโครงสร้างเดิมของทีม เพื่อไม่ต้องแก้ assets.js / transfers.js
// ---------------------------------------------------------------------------
async function loadLocationHierarchy() {
  const [b, f, r] = await Promise.all([
    supabaseClient.from('buildings').select('*').order('name'),
    supabaseClient.from('floors').select('*').order('floor_number'),
    supabaseClient.from('rooms').select('*').order('room_name'),
  ]);
  if (b.error) reportDbError('โหลดตึก', b.error);
  if (f.error) reportDbError('โหลดชั้น', f.error);
  if (r.error) reportDbError('โหลดห้อง', r.error);

  buildings = b.data || [];
  floors = f.data || [];
  rooms = r.data || [];
  _snapshots.rooms = JSON.parse(JSON.stringify(rooms));

  rebuildFlatLocations();
}

function rebuildFlatLocations() {
  locations = rooms.map(room => {
    const floor = floors.find(f => f.id === room.floor_id);
    const building = floor ? buildings.find(b => b.id === floor.building_id) : null;
    return {
      id: room.id,
      code: room.room_code,
      name: room.room_name,
      building: building ? building.name : '-',
      floor: floor ? `ชั้น ${floor.floor_number}` : '-',
      responsiblePerson: room.responsible_person,
      phone: room.phone,
      count: assets.filter(a => a.location === room.room_name).length,
      desc: room.description,
      isActive: room.is_active,
      // เก็บ id จริงของ floor/building ไว้ใช้ในหน้า locations.js เวอร์ชันใหม่
      _floorId: room.floor_id,
      _buildingId: building ? building.id : null,
    };
  });
}

// locations.js เวอร์ชันใหม่ใช้ฟังก์ชันเหล่านี้จัดการ 3 ระดับโดยตรง
async function saveBuildings(list) {
  const toDbRow = (b) => ({ id: b.id, code: b.code || null, name: b.name });
  const matchAfterInsert = (item, dbRow) => { item.id = dbRow.id; };
  await diffAndSyncGeneric('buildings', buildings, list, toDbRow, matchAfterInsert);
  buildings = JSON.parse(JSON.stringify(list));
}

async function saveFloors(list) {
  const currentAsDb = floors.map(mapFloorToUi);
  const toDbRow = (f) => ({ id: f.id, building_id: f.buildingId, floor_number: f.floorNumber, floor_name: f.floorName || null });
  const matchAfterInsert = (item, dbRow) => { item.id = dbRow.id; };
  await diffAndSyncGeneric('floors', currentAsDb, list, toDbRow, matchAfterInsert);
  floors = list.map(f => ({ id: f.id, building_id: f.buildingId, floor_number: f.floorNumber, floor_name: f.floorName }));
}

function mapFloorToUi(f) {
  return { id: f.id, buildingId: f.building_id, floorNumber: f.floor_number, floorName: f.floor_name };
}

async function saveRoomsDetailed(list) {
  const toDbRow = (r) => ({
    id: r.id,
    floor_id: r.floorId,
    room_code: r.code || null,
    room_name: r.name,
    responsible_person: r.responsiblePerson || null,
    phone: r.phone || null,
    description: r.desc || null,
    is_active: r.isActive !== false,
  });
  const matchAfterInsert = (item, dbRow) => { item.id = dbRow.id; };
  const currentAsUi = rooms.map(mapRoomToUi);
  await diffAndSyncGeneric('rooms', currentAsUi, list, toDbRow, matchAfterInsert);
  rooms = list.map(r => ({
    id: r.id, floor_id: r.floorId, room_code: r.code, room_name: r.name,
    responsible_person: r.responsiblePerson, phone: r.phone, description: r.desc, is_active: r.isActive,
  }));
  rebuildFlatLocations();
}

function mapRoomToUi(r) {
  return {
    id: r.id, floorId: r.floor_id, code: r.room_code, name: r.room_name,
    responsiblePerson: r.responsible_person, phone: r.phone, desc: r.description, isActive: r.is_active,
  };
}

// ฟังก์ชันเดิมที่ transfers.js เรียกหลังปรับ count ของ location — ตอนนี้ count
// คำนวณสดจาก assets เสมอ ไม่ได้เก็บเป็นค่าคงที่แล้ว จึงแค่คำนวณใหม่ ไม่ต้องเขียน DB จริง
async function saveLocations(list) {
  rebuildFlatLocations();
}

// ---------------------------------------------------------------------------
// Assets
// ---------------------------------------------------------------------------
function roomIdByName(name) {
  const room = rooms.find(r => r.room_name === name);
  return room ? room.id : null;
}

async function loadAssets() {
  const { data, error } = await supabaseClient.from('assets').select('*').order('created_at', { ascending: false });
  if (error) { reportDbError('โหลดครุภัณฑ์', error); return []; }

  const mapped = data.map(a => {
    const room = rooms.find(r => r.id === a.room_id);
    return {
      id: a.id,
      code: a.code,
      serial: a.serial,
      name: a.name,
      brandModel: a.brand_model,
      categoryId: a.category_id,
      location: room ? room.room_name : '-',
      responsiblePerson: a.responsible_person,
      status: a.status,
      condition: a.condition,
      icon: a.icon,
      iconColor: a.icon_color,
      image: a.image_url,
    };
  });

  _snapshots.assets = JSON.parse(JSON.stringify(mapped));
  return mapped;
}

async function saveAssets(list) {
  const toDbRow = (a) => ({
    id: a.id,
    code: a.code,
    serial: a.serial,
    name: a.name,
    brand_model: a.brandModel,
    category_id: a.categoryId || null,
    room_id: roomIdByName(a.location),
    responsible_person: a.responsiblePerson,
    status: a.status,
    condition: a.condition,
    icon: a.icon,
    icon_color: a.iconColor,
    image_url: a.image || null,
  });
  const matchAfterInsert = (item, dbRow) => { item.id = dbRow.id; };
  await diffAndSync('assets', 'assets', list, toDbRow, matchAfterInsert);
  rebuildFlatLocations(); // count ต่อห้องอาจเปลี่ยน
}

// ---------------------------------------------------------------------------
// Transfers (ย้าย / ยืม / คืน)
// ---------------------------------------------------------------------------
async function loadTransfers() {
  const { data, error } = await supabaseClient.from('transfers').select('*').order('created_at', { ascending: false });
  if (error) { reportDbError('โหลดรายการย้าย/ยืม/คืน', error); return []; }

  const mapped = data.map(t => {
    const asset = assets.find(a => a.id === t.asset_id);
    const fromRoom = rooms.find(r => r.id === t.from_room_id);
    const toRoom = rooms.find(r => r.id === t.to_room_id);
    return {
      id: t.id,
      docNo: t.doc_no,
      type: t.type,
      assetId: t.asset_id,
      assetCode: asset ? asset.code : '-',
      assetName: asset ? asset.name : '-',
      person: t.person,
      fromLocation: fromRoom ? fromRoom.room_name : '-',
      toLocation: toRoom ? toRoom.room_name : '-',
      startDate: t.start_date,
      dueDate: t.due_date,
      status: t.status,
    };
  });

  _snapshots.transfers = JSON.parse(JSON.stringify(mapped));
  return mapped;
}

async function saveTransfers(list) {
  const toDbRow = (t) => ({
    id: t.id,
    doc_no: t.docNo,
    type: t.type,
    asset_id: t.assetId,
    person: t.person,
    from_room_id: t.fromLocation && t.fromLocation !== '-' ? roomIdByName(t.fromLocation) : null,
    to_room_id: t.toLocation && t.toLocation !== '-' ? roomIdByName(t.toLocation) : null,
    start_date: t.startDate || null,
    due_date: t.dueDate && t.dueDate !== '-' ? t.dueDate : null,
    status: t.status,
  });
  const matchAfterInsert = (item, dbRow) => { item.id = dbRow.id; };
  await diffAndSync('transfers', 'transfers', list, toDbRow, matchAfterInsert);
}

// ---------------------------------------------------------------------------
// Maintenance (ใบแจ้งซ่อม)
// ---------------------------------------------------------------------------
async function loadMaintenance() {
  const { data, error } = await supabaseClient.from('maintenance').select('*').order('created_at', { ascending: false });
  if (error) { reportDbError('โหลดใบแจ้งซ่อม', error); return []; }

  const mapped = data.map(m => {
    const asset = assets.find(a => a.id === m.asset_id);
    return {
      id: m.id,
      repairNo: m.repair_no,
      assetId: m.asset_id,
      assetCode: asset ? asset.code : '-',
      assetName: asset ? asset.name : '-',
      problem: m.problem,
      reporter: m.reporter,
      repairDate: m.repair_date,
      status: m.status,
    };
  });

  _snapshots.maintenance = JSON.parse(JSON.stringify(mapped));
  return mapped;
}

async function saveMaintenance(list) {
  const toDbRow = (m) => ({
    id: m.id,
    repair_no: m.repairNo,
    asset_id: m.assetId,
    problem: m.problem,
    reporter: m.reporter,
    repair_date: m.repairDate || null,
    status: m.status,
  });
  const matchAfterInsert = (item, dbRow) => { item.id = dbRow.id; };
  await diffAndSync('maintenance', 'maintenance', list, toDbRow, matchAfterInsert);
}

// ---------------------------------------------------------------------------
// Bootstrap — โหลดทุกตารางตามลำดับที่พึ่งพากัน แล้วเซ็ตตัวแปร global ทั้งหมด
// ทุกหน้าเรียก await bootstrapData() ก่อน initXxxPage() เสมอ (ดูท้ายไฟล์ควบคุมแต่ละหน้า)
// ---------------------------------------------------------------------------
async function bootstrapData() {
  await loadLocationHierarchy();      // ต้องมาก่อน เพราะ assets ต้อง join กับ rooms
  assets = await loadAssets();        // ต้องมาก่อน categories/locations เพราะต้องนับ count
  categories = await loadCategories();
  rebuildFlatLocations();             // คำนวณ count ของแต่ละห้องใหม่จาก assets ที่โหลดแล้ว
  transfers = await loadTransfers();
  maintenance = await loadMaintenance();
}
