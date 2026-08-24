// --- LOCATIONS (BUILDINGS / FLOORS / ROOMS) CONTROLLER ---

let currentLocTab = 'buildings';

function initLocationsPage() {
  renderSidebar('locations');
  renderHeader('สถานที่ / ห้อง');
  setLocTab('buildings');
}

function setLocTab(tab) {
  currentLocTab = tab;
  ['buildings', 'floors', 'rooms'].forEach(t => {
    document.getElementById('panel-' + t).classList.toggle('hidden', t !== tab);
    const btn = document.getElementById('tab-btn-' + t);
    if (t === tab) {
      btn.className = 'px-4 py-2 rounded-lg text-sm font-medium bg-white text-slate-900 shadow-sm transition';
    } else {
      btn.className = 'px-4 py-2 rounded-lg text-sm font-medium text-slate-600 hover:text-slate-900 transition';
    }
  });

  if (tab === 'buildings') renderBuildingTable();
  if (tab === 'floors') renderFloorTable();
  if (tab === 'rooms') renderRoomTable();
}

function closeModal(id) {
  document.getElementById(id).classList.add('hidden');
}

// ---------------------------------------------------------------------------
// BUILDINGS
// ---------------------------------------------------------------------------
function renderBuildingTable() {
  const tbody = document.getElementById('building-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (buildings.length === 0) {
    tbody.innerHTML = `<tr><td colspan="4" class="py-8 text-center text-slate-400">ยังไม่มีข้อมูลอาคาร</td></tr>`;
    return;
  }

  buildings.forEach(b => {
    const floorCount = floors.filter(f => f.building_id === b.id).length;
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-100 hover:bg-slate-50';
    tr.innerHTML = `
      <td class="py-3 px-4 text-slate-500 font-mono text-xs">${b.code || '-'}</td>
      <td class="py-3 px-4 font-medium text-slate-800">${b.name}</td>
      <td class="py-3 px-4 text-center">${floorCount}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="editBuilding(${b.id})" class="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">แก้ไข</button>
        <button onclick="deleteBuilding(${b.id})" class="px-2.5 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openAddBuildingModal() {
  document.getElementById('building-form-id').value = '';
  document.getElementById('modal-building-title').textContent = 'เพิ่มอาคาร';
  document.getElementById('building-form-code').value = '';
  document.getElementById('building-form-name').value = '';
  document.getElementById('modal-building').classList.remove('hidden');
}

function editBuilding(id) {
  const b = buildings.find(x => x.id === id);
  if (!b) return;
  document.getElementById('building-form-id').value = b.id;
  document.getElementById('modal-building-title').textContent = 'แก้ไขอาคาร';
  document.getElementById('building-form-code').value = b.code || '';
  document.getElementById('building-form-name').value = b.name;
  document.getElementById('modal-building').classList.remove('hidden');
}

async function saveBuilding(e) {
  e.preventDefault();
  const id = document.getElementById('building-form-id').value;
  const code = document.getElementById('building-form-code').value.trim();
  const name = document.getElementById('building-form-name').value.trim();

  if (id) {
    const b = buildings.find(x => x.id === Number(id));
    if (b) { b.code = code; b.name = name; }
  } else {
    buildings.push({ id: Date.now(), code, name });
  }

  closeModal('modal-building');
  renderBuildingTable();
  showToast('บันทึกอาคารเรียบร้อยแล้ว');

  await saveBuildings(buildings);
  renderBuildingTable(); // re-render เผื่อ id ชั่วคราวถูกแทนที่ด้วย id จริงจาก DB
}

async function deleteBuilding(id) {
  const b = buildings.find(x => x.id === id);
  if (!b) return;
  const hasFloors = floors.some(f => f.building_id === id);
  if (hasFloors) {
    alert('ลบไม่ได้: อาคารนี้ยังมีชั้นอยู่ กรุณาลบชั้นทั้งหมดในอาคารนี้ก่อน');
    return;
  }
  if (!confirm(`ต้องการลบอาคาร "${b.name}" หรือไม่?`)) return;

  buildings = buildings.filter(x => x.id !== id);
  renderBuildingTable();
  await saveBuildings(buildings);
  showToast('ลบอาคารเรียบร้อยแล้ว');
}

// ---------------------------------------------------------------------------
// FLOORS
// ---------------------------------------------------------------------------
function renderFloorTable() {
  const tbody = document.getElementById('floor-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (floors.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="py-8 text-center text-slate-400">ยังไม่มีข้อมูลชั้น</td></tr>`;
    return;
  }

  floors.forEach(f => {
    const building = buildings.find(b => b.id === f.building_id);
    const roomCount = rooms.filter(r => r.floor_id === f.id).length;
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-100 hover:bg-slate-50';
    tr.innerHTML = `
      <td class="py-3 px-4 text-slate-700">${building ? building.name : '-'}</td>
      <td class="py-3 px-4 text-slate-700">ชั้น ${f.floor_number}</td>
      <td class="py-3 px-4 text-slate-500">${f.floor_name || '-'}</td>
      <td class="py-3 px-4 text-center">${roomCount}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="editFloor(${f.id})" class="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">แก้ไข</button>
        <button onclick="deleteFloor(${f.id})" class="px-2.5 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateBuildingSelect(selectEl, selectedId) {
  selectEl.innerHTML = '<option value="">-- เลือกอาคาร --</option>';
  buildings.forEach(b => {
    const opt = document.createElement('option');
    opt.value = b.id;
    opt.textContent = b.name;
    if (selectedId && b.id === selectedId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function openAddFloorModal() {
  document.getElementById('floor-form-id').value = '';
  document.getElementById('modal-floor-title').textContent = 'เพิ่มชั้น';
  populateBuildingSelect(document.getElementById('floor-form-building'));
  document.getElementById('floor-form-number').value = '';
  document.getElementById('floor-form-name').value = '';
  document.getElementById('modal-floor').classList.remove('hidden');
}

function editFloor(id) {
  const f = floors.find(x => x.id === id);
  if (!f) return;
  document.getElementById('floor-form-id').value = f.id;
  document.getElementById('modal-floor-title').textContent = 'แก้ไขชั้น';
  populateBuildingSelect(document.getElementById('floor-form-building'), f.building_id);
  document.getElementById('floor-form-number').value = f.floor_number;
  document.getElementById('floor-form-name').value = f.floor_name || '';
  document.getElementById('modal-floor').classList.remove('hidden');
}

async function saveFloor(e) {
  e.preventDefault();
  const id = document.getElementById('floor-form-id').value;
  const buildingId = Number(document.getElementById('floor-form-building').value);
  const floorNumber = Number(document.getElementById('floor-form-number').value);
  const floorName = document.getElementById('floor-form-name').value.trim();

  const floorsUi = floors.map(f => ({ id: f.id, buildingId: f.building_id, floorNumber: f.floor_number, floorName: f.floor_name }));

  if (id) {
    const idx = floorsUi.findIndex(x => x.id === Number(id));
    if (idx !== -1) floorsUi[idx] = { id: Number(id), buildingId, floorNumber, floorName };
  } else {
    floorsUi.push({ id: Date.now(), buildingId, floorNumber, floorName });
  }

  closeModal('modal-floor');
  await saveFloors(floorsUi);
  renderFloorTable();
  showToast('บันทึกชั้นเรียบร้อยแล้ว');
}

async function deleteFloor(id) {
  const f = floors.find(x => x.id === id);
  if (!f) return;
  const hasRooms = rooms.some(r => r.floor_id === id);
  if (hasRooms) {
    alert('ลบไม่ได้: ชั้นนี้ยังมีห้องอยู่ กรุณาลบห้องทั้งหมดในชั้นนี้ก่อน');
    return;
  }
  if (!confirm('ต้องการลบชั้นนี้หรือไม่?')) return;

  const floorsUi = floors.filter(x => x.id !== id).map(f2 => ({ id: f2.id, buildingId: f2.building_id, floorNumber: f2.floor_number, floorName: f2.floor_name }));
  await saveFloors(floorsUi);
  renderFloorTable();
  showToast('ลบชั้นเรียบร้อยแล้ว');
}

// ---------------------------------------------------------------------------
// ROOMS
// ---------------------------------------------------------------------------
function renderRoomTable() {
  const tbody = document.getElementById('room-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (rooms.length === 0) {
    tbody.innerHTML = `<tr><td colspan="6" class="py-8 text-center text-slate-400">ยังไม่มีข้อมูลห้อง</td></tr>`;
    return;
  }

  rooms.forEach(r => {
    const floor = floors.find(f => f.id === r.floor_id);
    const building = floor ? buildings.find(b => b.id === floor.building_id) : null;
    const assetCount = assets.filter(a => a.location === r.room_name).length;
    const tr = document.createElement('tr');
    tr.className = 'border-t border-slate-100 hover:bg-slate-50';
    tr.innerHTML = `
      <td class="py-3 px-4 text-slate-500 font-mono text-xs">${r.room_code || '-'}</td>
      <td class="py-3 px-4 font-medium text-slate-800">${r.room_name}</td>
      <td class="py-3 px-4 text-slate-500">${building ? building.name : '-'} / ${floor ? 'ชั้น ' + floor.floor_number : '-'}</td>
      <td class="py-3 px-4 text-slate-600">${r.responsible_person || '-'}</td>
      <td class="py-3 px-4 text-center">${assetCount}</td>
      <td class="py-3 px-4 text-center">
        <button onclick="editRoom(${r.id})" class="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">แก้ไข</button>
        <button onclick="deleteRoom(${r.id})" class="px-2.5 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition">ลบ</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function populateFloorSelect(selectEl, selectedId) {
  selectEl.innerHTML = '<option value="">-- เลือกชั้น --</option>';
  floors.forEach(f => {
    const building = buildings.find(b => b.id === f.building_id);
    const opt = document.createElement('option');
    opt.value = f.id;
    opt.textContent = `${building ? building.name : '-'} / ชั้น ${f.floor_number}`;
    if (selectedId && f.id === selectedId) opt.selected = true;
    selectEl.appendChild(opt);
  });
}

function openAddRoomModal() {
  document.getElementById('room-form-id').value = '';
  document.getElementById('modal-room-title').textContent = 'เพิ่มห้อง';
  populateFloorSelect(document.getElementById('room-form-floor'));
  document.getElementById('room-form-code').value = '';
  document.getElementById('room-form-name').value = '';
  document.getElementById('room-form-person').value = '';
  document.getElementById('room-form-phone').value = '';
  document.getElementById('room-form-desc').value = '';
  document.getElementById('modal-room').classList.remove('hidden');
}

function editRoom(id) {
  const r = rooms.find(x => x.id === id);
  if (!r) return;
  document.getElementById('room-form-id').value = r.id;
  document.getElementById('modal-room-title').textContent = 'แก้ไขห้อง (' + r.room_name + ')';
  populateFloorSelect(document.getElementById('room-form-floor'), r.floor_id);
  document.getElementById('room-form-code').value = r.room_code || '';
  document.getElementById('room-form-name').value = r.room_name;
  document.getElementById('room-form-person').value = r.responsible_person || '';
  document.getElementById('room-form-phone').value = r.phone || '';
  document.getElementById('room-form-desc').value = r.description || '';
  document.getElementById('modal-room').classList.remove('hidden');
}

async function saveRoom(e) {
  e.preventDefault();
  const id = document.getElementById('room-form-id').value;
  const floorId = Number(document.getElementById('room-form-floor').value);
  const code = document.getElementById('room-form-code').value.trim();
  const name = document.getElementById('room-form-name').value.trim();
  const person = document.getElementById('room-form-person').value.trim();
  const phone = document.getElementById('room-form-phone').value.trim();
  const desc = document.getElementById('room-form-desc').value.trim();

  const roomsUi = rooms.map(mapRoomToUi);
  const oldRoom = id ? rooms.find(r => r.id === Number(id)) : null;
  const oldName = oldRoom ? oldRoom.room_name : null;

  if (id) {
    const idx = roomsUi.findIndex(x => x.id === Number(id));
    if (idx !== -1) roomsUi[idx] = { id: Number(id), floorId, code, name, responsiblePerson: person, phone, desc, isActive: true };
  } else {
    roomsUi.push({ id: Date.now(), floorId, code, name, responsiblePerson: person, phone, desc, isActive: true });
  }

  closeModal('modal-room');
  await saveRoomsDetailed(roomsUi);

  if (oldName && oldName !== name) {
    assets.forEach(a => { if (a.location === oldName) a.location = name; });
    await saveAssets(assets);
  }

  renderRoomTable();
  showToast('บันทึกห้องเรียบร้อยแล้ว');
}

async function deleteRoom(id) {
  const r = rooms.find(x => x.id === id);
  if (!r) return;
  const hasAssets = assets.some(a => a.location === r.room_name);
  if (hasAssets) {
    alert('ลบไม่ได้: ห้องนี้ยังมีครุภัณฑ์อยู่ กรุณาย้ายครุภัณฑ์ออกก่อนลบห้อง');
    return;
  }
  if (!confirm(`ต้องการลบห้อง "${r.room_name}" หรือไม่?`)) return;

  const roomsUi = rooms.filter(x => x.id !== id).map(mapRoomToUi);
  await saveRoomsDetailed(roomsUi);
  renderRoomTable();
  showToast('ลบห้องเรียบร้อยแล้ว');
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData();
  initLocationsPage();
});
