// --- TRANSFERS, BORROW & RETURN CONTROLLER ---

let currentTab = 'all'; // 'all', 'transfer', 'borrow', 'return'

function initTransferPage() {
  renderSidebar('transfers');
  renderHeader('ย้าย / ยืม / คืน ครุภัณฑ์');
  populateModalDropdowns();
  renderTransferTable();
}

function populateModalDropdowns() {
  // 1. Asset dropdown for Transfer (All assets)
  const transferAssetSelect = document.getElementById('transfer-form-asset');
  if (transferAssetSelect) {
    transferAssetSelect.innerHTML = '<option value="">-- เลือกครุภัณฑ์ --</option>';
    assets.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.code} - ${a.name} (${a.location})`;
      transferAssetSelect.appendChild(opt);
    });
  }

  // 2. New Location dropdown for Transfer
  const transferLocSelect = document.getElementById('transfer-form-newloc');
  if (transferLocSelect) {
    transferLocSelect.innerHTML = '<option value="">-- เลือกสถานที่ปลายทาง --</option>';
    locations.forEach(l => {
      const opt = document.createElement('option');
      opt.value = l.name;
      opt.textContent = `${l.name} (${l.building})`;
      transferLocSelect.appendChild(opt);
    });
  }

  // 3. Asset dropdown for Borrow (Only available 'in_use' assets)
  const borrowAssetSelect = document.getElementById('borrow-form-asset');
  if (borrowAssetSelect) {
    borrowAssetSelect.innerHTML = '<option value="">-- เลือกครุภัณฑ์ที่ต้องการยืม --</option>';
    const availableAssets = assets.filter(a => a.status === 'in_use');
    availableAssets.forEach(a => {
      const opt = document.createElement('option');
      opt.value = a.id;
      opt.textContent = `${a.code} - ${a.name} (${a.location})`;
      borrowAssetSelect.appendChild(opt);
    });
  }
}

function onTransferAssetChange() {
  const assetId = Number(document.getElementById('transfer-form-asset').value);
  const asset = assets.find(a => a.id === assetId);
  const currentLocInput = document.getElementById('transfer-form-curloc');
  if (currentLocInput) {
    currentLocInput.value = asset ? asset.location : '';
  }
}

function setTab(tab) {
  currentTab = tab;
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.classList.remove('bg-white', 'text-blue-600', 'shadow-sm', 'font-semibold');
    btn.classList.add('text-slate-600');
  });

  const activeBtn = document.getElementById('tab-' + tab);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600');
    activeBtn.classList.add('bg-white', 'text-blue-600', 'shadow-sm', 'font-semibold');
  }

  renderTransferTable();
}

function renderTransferTable() {
  const searchInput = document.getElementById('search-transfer-input');
  const search = (searchInput ? searchInput.value : '').toLowerCase().trim();

  let filtered = transfers.filter(t => {
    const matchesTab = currentTab === 'all' || t.type === currentTab;
    const matchesSearch = !search ||
      t.docNo.toLowerCase().includes(search) ||
      t.assetCode.toLowerCase().includes(search) ||
      t.assetName.toLowerCase().includes(search) ||
      t.person.toLowerCase().includes(search);

    return matchesTab && matchesSearch;
  });

  // Update Stats
  const totalCount = transfers.length;
  const borrowCount = transfers.filter(t => t.type === 'borrow' && t.status === 'borrowing').length;
  const transferCount = transfers.filter(t => t.type === 'transfer').length;
  const returnCount = transfers.filter(t => t.type === 'return' || (t.type === 'borrow' && t.status === 'completed')).length;

  document.getElementById('stat-transfer-total').textContent = totalCount + ' รายการ';
  document.getElementById('stat-transfer-borrow').textContent = borrowCount + ' รายการ';
  document.getElementById('stat-transfer-trans').textContent = transferCount + ' รายการ';

  const tbody = document.getElementById('transfer-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <i class="ph ph-arrows-left-right text-4xl mb-2 block text-slate-300"></i>
          <p class="text-sm font-medium">ไม่พบรายการย้าย / ยืม / คืน</p>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(item => {
    let typeBadge = '';
    if (item.type === 'transfer') {
      typeBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-cyan-50 text-cyan-700 border border-cyan-200"><i class="ph ph-arrows-left-right"></i> ย้ายสถานที่</span>';
    } else if (item.type === 'borrow') {
      typeBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><i class="ph ph-arrow-up-right"></i> ยืมใช้งาน</span>';
    } else {
      typeBadge = '<span class="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><i class="ph ph-arrow-down-left"></i> ส่งคืนแล้ว</span>';
    }

    let statusBadge = '';
    let actionBtn = '';

    if (item.type === 'borrow' && item.status === 'borrowing') {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200">กำลังยืม</span>';
      actionBtn = `<button onclick="quickReturn(${item.id})" class="px-3 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition">คืนครุภัณฑ์</button>`;
    } else {
      statusBadge = '<span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-slate-100 text-slate-600">เรียบร้อย</span>';
      actionBtn = `<button onclick="showToast('ใบสำคัญ ${item.docNo}')" class="px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition">ดูเอกสาร</button>`;
    }

    let movementText = '';
    if (item.type === 'transfer') {
      movementText = `<span class="text-xs text-slate-500">${item.fromLocation}</span> <i class="ph ph-arrow-right text-xs text-slate-400 mx-1"></i> <span class="font-medium text-slate-800">${item.toLocation}</span>`;
    } else if (item.type === 'borrow') {
      movementText = `<span class="text-xs text-slate-500">ยืมโดย:</span> <span class="font-medium text-slate-800">${item.person}</span> (กำหนดคืน ${item.dueDate})`;
    } else {
      movementText = `<span class="text-xs text-slate-500">คืนเข้า:</span> <span class="font-medium text-slate-800">${item.toLocation}</span> (โดย ${item.person})`;
    }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/70 transition text-sm";
    tr.innerHTML = `
      <td class="py-3.5 px-4 font-mono font-semibold text-slate-700 text-xs">${item.docNo}</td>
      <td class="py-3.5 px-4">${typeBadge}</td>
      <td class="py-3.5 px-4">
        <span class="font-semibold text-slate-800 block">${item.assetName}</span>
        <span class="text-xs text-slate-400 font-mono">${item.assetCode}</span>
      </td>
      <td class="py-3.5 px-4 text-xs">${movementText}</td>
      <td class="py-3.5 px-4 text-slate-600 text-xs font-mono">${item.startDate}</td>
      <td class="py-3.5 px-4 text-center">${statusBadge}</td>
      <td class="py-3.5 px-4 text-center">${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- MODAL: TRANSFER LOCATION ---
function openTransferModal() {
  populateModalDropdowns();
  document.getElementById('transfer-form-curloc').value = '';
  document.getElementById('transfer-form-person').value = '';
  document.getElementById('transfer-form-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-transfer').classList.remove('hidden');
}

function closeTransferModal() {
  document.getElementById('modal-transfer').classList.add('hidden');
}

function saveTransferAction(e) {
  e.preventDefault();
  const assetId = Number(document.getElementById('transfer-form-asset').value);
  const newLocation = document.getElementById('transfer-form-newloc').value;
  const person = document.getElementById('transfer-form-person').value.trim();
  const date = document.getElementById('transfer-form-date').value;

  const asset = assets.find(a => a.id === assetId);
  if (!asset) return;

  const oldLocation = asset.location;

  // 1. Create transfer record
  const newTransfer = {
    id: Date.now(),
    docNo: "MV-2569-" + String(transfers.length + 1).padStart(3, '0'),
    type: "transfer",
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    person: person || "เจ้าหน้าที่พัสดุ",
    fromLocation: oldLocation,
    toLocation: newLocation,
    startDate: date,
    dueDate: "-",
    status: "completed"
  };

  transfers.unshift(newTransfer);
  saveTransfers(transfers);

  // 2. Update asset's location
  asset.location = newLocation;
  saveAssets(assets);

  // 3. Update location counts
  const oldLoc = locations.find(l => l.name === oldLocation);
  if (oldLoc && oldLoc.count > 0) oldLoc.count--;

  const newLoc = locations.find(l => l.name === newLocation);
  if (newLoc) newLoc.count++;
  saveLocations(locations);

  closeTransferModal();
  renderTransferTable();
  renderSidebar('transfers');
  showToast(`ย้ายครุภัณฑ์ "${asset.name}" ไปยัง "${newLocation}" สำเร็จ`);
}

// --- MODAL: BORROW ASSET ---
function openBorrowModal() {
  populateModalDropdowns();
  document.getElementById('borrow-form-person').value = '';
  document.getElementById('borrow-form-start').value = new Date().toISOString().split('T')[0];
  
  // Default due date +7 days
  const d = new Date();
  d.setDate(d.getDate() + 7);
  document.getElementById('borrow-form-due').value = d.toISOString().split('T')[0];

  document.getElementById('modal-borrow').classList.remove('hidden');
}

function closeBorrowModal() {
  document.getElementById('modal-borrow').classList.add('hidden');
}

function saveBorrowAction(e) {
  e.preventDefault();
  const assetId = Number(document.getElementById('borrow-form-asset').value);
  const person = document.getElementById('borrow-form-person').value.trim();
  const startDate = document.getElementById('borrow-form-start').value;
  const dueDate = document.getElementById('borrow-form-due').value;

  const asset = assets.find(a => a.id === assetId);
  if (!asset) return;

  const newBorrow = {
    id: Date.now(),
    docNo: "MV-2569-" + String(transfers.length + 1).padStart(3, '0'),
    type: "borrow",
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    person: person,
    fromLocation: asset.location,
    toLocation: "-",
    startDate: startDate,
    dueDate: dueDate,
    status: "borrowing"
  };

  transfers.unshift(newBorrow);
  saveTransfers(transfers);

  // Update asset status
  asset.status = "borrowed";
  asset.responsiblePerson = person;
  saveAssets(assets);

  closeBorrowModal();
  renderTransferTable();
  renderSidebar('transfers');
  showToast(`บันทึกการยืม "${asset.name}" โดยคุณ ${person} สำเร็จ`);
}

// --- QUICK RETURN ---
function quickReturn(transferId) {
  const item = transfers.find(t => t.id === transferId);
  if (!item) return;

  if (confirm(`ยืนยันการรับคืนครุภัณฑ์ "${item.assetName}" จากคุณ ${item.person} หรือไม่?`)) {
    // 1. Mark transfer item as completed
    item.status = "completed";

    // 2. Create return record
    const today = new Date().toISOString().split('T')[0];
    const returnRecord = {
      id: Date.now(),
      docNo: "MV-2569-" + String(transfers.length + 1).padStart(3, '0'),
      type: "return",
      assetId: item.assetId,
      assetCode: item.assetCode,
      assetName: item.assetName,
      person: item.person,
      fromLocation: "-",
      toLocation: item.fromLocation || "ห้องธุรการและสารบรรณ",
      startDate: today,
      dueDate: today,
      status: "completed"
    };
    transfers.unshift(returnRecord);
    saveTransfers(transfers);

    // 3. Update asset status back to in_use
    const asset = assets.find(a => a.id === item.assetId);
    if (asset) {
      asset.status = "in_use";
      saveAssets(assets);
    }

    renderTransferTable();
    renderSidebar('transfers');
    showToast(`บันทึกรับคืน "${item.assetName}" เรียบร้อยแล้ว`);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData();
  initTransferPage();
});
