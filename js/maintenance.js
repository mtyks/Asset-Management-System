// --- MAINTENANCE & REPAIR CONTROLLER ---

let currentMaintTab = 'all'; // 'all', 'pending', 'completed'

function initMaintenancePage() {
  renderSidebar('maintenance');
  renderHeader('ซ่อมบำรุงครุภัณฑ์');
  populateRepairAssetDropdown();
  renderMaintenanceTable();
}

function populateRepairAssetDropdown() {
  const assetSelect = document.getElementById('repair-form-asset');
  if (!assetSelect) return;
  assetSelect.innerHTML = '<option value="">-- เลือกครุภัณฑ์ที่ต้องการแจ้งซ่อม --</option>';
  assets.forEach(a => {
    const opt = document.createElement('option');
    opt.value = a.id;
    opt.textContent = `${a.code} - ${a.name} (${a.location})`;
    assetSelect.appendChild(opt);
  });
}

function setMaintTab(tab) {
  currentMaintTab = tab;
  document.querySelectorAll('.maint-tab-btn').forEach(btn => {
    btn.classList.remove('bg-white', 'text-orange-600', 'shadow-sm', 'font-semibold');
    btn.classList.add('text-slate-600');
  });

  const activeBtn = document.getElementById('tab-maint-' + tab);
  if (activeBtn) {
    activeBtn.classList.remove('text-slate-600');
    activeBtn.classList.add('bg-white', 'text-orange-600', 'shadow-sm', 'font-semibold');
  }

  renderMaintenanceTable();
}

function renderMaintenanceTable() {
  const searchInput = document.getElementById('search-maint-input');
  const search = (searchInput ? searchInput.value : '').toLowerCase().trim();

  let filtered = maintenance.filter(m => {
    const matchesTab = currentMaintTab === 'all' || m.status === currentMaintTab;
    const matchesSearch = !search ||
      m.repairNo.toLowerCase().includes(search) ||
      m.assetCode.toLowerCase().includes(search) ||
      m.assetName.toLowerCase().includes(search) ||
      m.problem.toLowerCase().includes(search) ||
      m.reporter.toLowerCase().includes(search);

    return matchesTab && matchesSearch;
  });

  // Update Stats
  const totalCount = maintenance.length;
  const pendingCount = maintenance.filter(m => m.status === 'pending').length;
  const completedCount = maintenance.filter(m => m.status === 'completed').length;

  document.getElementById('stat-maint-total').textContent = totalCount + ' รายการ';
  document.getElementById('stat-maint-pending').textContent = pendingCount + ' รายการ';
  document.getElementById('stat-maint-completed').textContent = completedCount + ' รายการ';

  const tbody = document.getElementById('maint-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="7" class="py-12 text-center text-slate-400">
          <i class="ph ph-wrench text-4xl mb-2 block text-slate-300"></i>
          <p class="text-sm font-medium">ไม่พบรายการซ่อมบำรุง</p>
        </td>
      </tr>
    `;
    return;
  }

  filtered.forEach(item => {
    let statusBadge = '';
    let actionBtn = '';

    if (item.status === 'pending') {
      statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span> กำลังส่งซ่อม</span>';
      actionBtn = `<button onclick="completeRepair(${item.id})" class="px-3 py-1.5 text-xs font-medium bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-xl border border-emerald-200 transition">ซ่อมเสร็จ</button>`;
    } else {
      statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ซ่อมเสร็จแล้ว</span>';
      actionBtn = `<button onclick="showToast('ใบแจ้งซ่อม ${item.repairNo}')" class="px-3 py-1.5 text-xs font-medium bg-slate-50 hover:bg-slate-100 text-slate-600 rounded-xl transition">ดูเอกสาร</button>`;
    }

    const tr = document.createElement('tr');
    tr.className = "hover:bg-slate-50/70 transition text-sm";
    tr.innerHTML = `
      <td class="py-3.5 px-4 font-mono font-semibold text-slate-700 text-xs">${item.repairNo}</td>
      <td class="py-3.5 px-4">
        <span class="font-semibold text-slate-800 block">${item.assetName}</span>
        <span class="text-xs text-slate-400 font-mono">${item.assetCode}</span>
      </td>
      <td class="py-3.5 px-4 text-xs text-slate-700">${item.problem}</td>
      <td class="py-3.5 px-4 text-xs text-slate-600">${item.reporter}</td>
      <td class="py-3.5 px-4 text-xs font-mono text-slate-600">${item.repairDate}</td>
      <td class="py-3.5 px-4 text-center">${statusBadge}</td>
      <td class="py-3.5 px-4 text-center">${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

// --- MODAL: ADD REPAIR ---
function openAddRepairModal() {
  populateRepairAssetDropdown();
  document.getElementById('repair-form-problem').value = '';
  document.getElementById('repair-form-reporter').value = '';
  document.getElementById('repair-form-date').value = new Date().toISOString().split('T')[0];
  document.getElementById('modal-repair').classList.remove('hidden');
}

function closeAddRepairModal() {
  document.getElementById('modal-repair').classList.add('hidden');
}

function saveRepairAction(e) {
  e.preventDefault();
  const assetId = Number(document.getElementById('repair-form-asset').value);
  const problem = document.getElementById('repair-form-problem').value.trim();
  const reporter = document.getElementById('repair-form-reporter').value.trim();
  const date = document.getElementById('repair-form-date').value;

  const asset = assets.find(a => a.id === assetId);
  if (!asset) return;

  const newRepair = {
    id: Date.now(),
    repairNo: "REP-2569-" + String(maintenance.length + 1).padStart(3, '0'),
    assetId: asset.id,
    assetCode: asset.code,
    assetName: asset.name,
    problem: problem,
    reporter: reporter || "เจ้าหน้าที่",
    repairDate: date,
    status: "pending"
  };

  maintenance.unshift(newRepair);
  saveMaintenance(maintenance);

  // Update asset status to maintenance & condition to ชำรุด (ส่งซ่อม)
  asset.status = "maintenance";
  asset.condition = "ชำรุด (ส่งซ่อม)";
  saveAssets(assets);

  closeAddRepairModal();
  renderMaintenanceTable();
  showToast(`บันทึกแจ้งซ่อม "${asset.name}" เรียบร้อยแล้ว`);
}

// --- QUICK COMPLETE REPAIR ---
function completeRepair(repairId) {
  const item = maintenance.find(m => m.id === repairId);
  if (!item) return;

  if (confirm(`ยืนยันการซ่อมเสร็จสิ้นสำหรับ "${item.assetName}" หรือไม่?`)) {
    item.status = "completed";
    saveMaintenance(maintenance);

    // Update asset status back to in_use & condition to ดี
    const asset = assets.find(a => a.id === item.assetId);
    if (asset) {
      asset.status = "in_use";
      asset.condition = "ดี (ซ่อมแล้ว)";
      saveAssets(assets);
    }

    renderMaintenanceTable();
    showToast(`บันทึกการซ่อมเสร็จสิ้นสำหรับ "${item.assetName}" แล้ว`);
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData();
  initMaintenancePage();
});
