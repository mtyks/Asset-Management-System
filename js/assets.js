// --- ASSET MANAGEMENT CONTROLLER ---

let currentUploadedImageData = null;

function initAssetPage() {
  renderSidebar('assets');
  renderHeader('รายการครุภัณฑ์');

  // Read URL query params for initial filters
  const urlParams = new URLSearchParams(window.location.search);
  const catParam = urlParams.get('category');
  const locParam = urlParams.get('location');

  updateAssetDropdowns();

  if (catParam) {
    const catSelect = document.getElementById('filter-asset-category');
    if (catSelect) catSelect.value = catParam;
    const cat = categories.find(c => c.id === Number(catParam));
    const catBadge = document.getElementById('active-category-filter-badge');
    if (cat && catBadge) {
      catBadge.textContent = 'หมวด: ' + cat.name;
      catBadge.classList.remove('hidden');
    }
  }

  if (locParam) {
    const locSelect = document.getElementById('filter-asset-location');
    if (locSelect) locSelect.value = locParam;
    const locBadge = document.getElementById('active-location-filter-badge');
    if (locBadge) {
      locBadge.textContent = 'สถานที่: ' + locParam;
      locBadge.classList.remove('hidden');
    }
  }

  renderAssetTable();
}

function updateAssetDropdowns() {
  // Category dropdown in Filter
  const catFilter = document.getElementById('filter-asset-category');
  if (catFilter) {
    const curVal = catFilter.value;
    catFilter.innerHTML = '<option value="">ทุกหมวดหมู่ครุภัณฑ์</option>';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.code + ' - ' + cat.name;
      catFilter.appendChild(opt);
    });
    catFilter.value = curVal;
  }

  // Location dropdown in Filter
  const locFilter = document.getElementById('filter-asset-location');
  if (locFilter) {
    const curVal = locFilter.value;
    locFilter.innerHTML = '<option value="">ทุกสถานที่ / ห้อง</option>';
    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.name;
      opt.textContent = loc.name + ' (' + loc.building + ')';
      locFilter.appendChild(opt);
    });
    locFilter.value = curVal;
  }

  // Category dropdown in Add Modal
  const modalCat = document.getElementById('asset-form-category');
  if (modalCat) {
    modalCat.innerHTML = '';
    categories.forEach(cat => {
      const opt = document.createElement('option');
      opt.value = cat.id;
      opt.textContent = cat.code + ' - ' + cat.name;
      modalCat.appendChild(opt);
    });
  }

  // Location dropdown in Add Modal
  const modalLoc = document.getElementById('asset-form-location');
  if (modalLoc) {
    modalLoc.innerHTML = '';
    locations.forEach(loc => {
      const opt = document.createElement('option');
      opt.value = loc.name;
      opt.textContent = loc.name + ' (' + loc.building + ' ' + loc.floor + ')';
      modalLoc.appendChild(opt);
    });
  }
}

function renderAssetTable() {
  const searchInput = document.getElementById('filter-asset-search');
  const search = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const catFilter = document.getElementById('filter-asset-category') ? document.getElementById('filter-asset-category').value : '';
  const locFilter = document.getElementById('filter-asset-location') ? document.getElementById('filter-asset-location').value : '';
  const statusFilter = document.getElementById('filter-asset-status') ? document.getElementById('filter-asset-status').value : '';

  const filtered = assets.filter(a => {
    const matchesSearch = !search || 
      a.code.toLowerCase().includes(search) ||
      a.name.toLowerCase().includes(search) ||
      (a.brandModel && a.brandModel.toLowerCase().includes(search)) ||
      (a.responsiblePerson && a.responsiblePerson.toLowerCase().includes(search));

    const matchesCat = !catFilter || a.categoryId === Number(catFilter);
    const matchesLoc = !locFilter || a.location === locFilter;
    const matchesStatus = !statusFilter || a.status === statusFilter;

    return matchesSearch && matchesCat && matchesLoc && matchesStatus;
  });

  const tbody = document.getElementById('asset-table-body');
  if (!tbody) return;
  tbody.innerHTML = '';

  if (filtered.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="9" class="py-12 text-center text-slate-400">
          <i class="ph ph-cube text-4xl mb-2 block text-slate-300"></i>
          <p class="text-sm font-medium">ไม่พบข้อมูลครุภัณฑ์ตามเงื่อนไขที่เลือก</p>
        </td>
      </tr>
    `;
  } else {
    filtered.forEach(item => {
      const cat = categories.find(c => c.id === item.categoryId);
      const catName = cat ? cat.name : 'ทั่วไป';
      const catColor = cat ? cat.color : 'blue';
      const colorStyles = getCategoryColorClass(catColor);

      let statusBadge = '';
      if (item.status === 'in_use') {
        statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200"><span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>ใช้งานปกติ</span>';
      } else if (item.status === 'borrowed') {
        statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-200"><span class="w-1.5 h-1.5 rounded-full bg-blue-500"></span>ยืมใช้งาน</span>';
      } else if (item.status === 'maintenance') {
        statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-50 text-amber-700 border border-amber-200"><span class="w-1.5 h-1.5 rounded-full bg-amber-500"></span>ส่งซ่อม</span>';
      } else {
        statusBadge = '<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-700">จำหน่าย</span>';
      }

      let imgHtml = '';
      if (item.image) {
        imgHtml = `<img src="${item.image}" alt="${item.name}" onclick="viewFullImage('${item.image}', '${item.name.replace(/'/g, "\\'")}', '${item.code}')" class="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-2xs cursor-pointer hover:scale-110 hover:border-blue-400 transition mx-auto" title="คลิกเพื่อดูรูปขนาดเต็ม">`;
      } else {
        imgHtml = `
          <div class="w-10 h-10 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 text-xl overflow-hidden mx-auto">
            <i class="ph ${item.icon || 'ph-cube'} ${item.iconColor || 'text-blue-500'} text-2xl"></i>
          </div>
        `;
      }

      const tr = document.createElement('tr');
      tr.className = "hover:bg-blue-50/40 transition";
      tr.innerHTML = `
        <td class="py-3.5 px-4 text-center">
          ${imgHtml}
        </td>
        <td class="py-3.5 px-4">
          <span class="font-semibold text-slate-900 block">${item.code}</span>
          <span class="text-xs text-slate-400 font-mono">${item.serial || '-'}</span>
        </td>
        <td class="py-3.5 px-4">
          <span class="font-medium text-slate-800 block">${item.name}</span>
          <span class="text-xs text-slate-500">${item.brandModel || '-'}</span>
        </td>
        <td class="py-3.5 px-4">
          <span class="inline-block px-2.5 py-1 rounded-md text-xs font-medium ${colorStyles.bg} ${colorStyles.text} border ${colorStyles.border}">
            ${catName}
          </span>
        </td>
        <td class="py-3.5 px-4 text-slate-600">${item.location}</td>
        <td class="py-3.5 px-4 text-slate-600 font-medium">${item.responsiblePerson || '-'}</td>
        <td class="py-3.5 px-4 text-center">${statusBadge}</td>
        <td class="py-3.5 px-4 text-center">
          <span class="text-xs font-medium ${item.condition.includes('ชำรุด') ? 'text-amber-600' : 'text-slate-700'}">${item.condition}</span>
        </td>
        <td class="py-3.5 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <a href="asset-detail.html?code=${encodeURIComponent(item.code)}" target="_blank" class="px-2.5 py-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg transition inline-flex items-center gap-1">
              <i class="ph-bold ph-qr-code"></i>QR
            </a>
            <button onclick="editAsset(${item.id})" class="px-2.5 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition">แก้ไข</button>
            <button onclick="deleteAsset(${item.id})" class="px-2.5 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition">ลบ</button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  }

  const countText = document.getElementById('asset-table-count-text');
  if (countText) {
    countText.innerHTML = 'แสดงผล <span class="font-semibold text-slate-900">' + filtered.length + '</span> จากทั้งหมด <span class="font-semibold text-slate-900">' + assets.length + '</span> รายการ (รวมฐานข้อมูลจำลอง 1,248 รายการ)';
  }
}

// Image Upload Handlers
function handleImageUpload(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = function(evt) {
    currentUploadedImageData = evt.target.result;
    const previewImg = document.getElementById('asset-image-preview');
    const placeholder = document.getElementById('asset-image-placeholder');
    const removeBtn = document.getElementById('btn-remove-image');

    if (previewImg) {
      previewImg.src = currentUploadedImageData;
      previewImg.classList.remove('hidden');
    }
    if (placeholder) placeholder.classList.add('hidden');
    if (removeBtn) removeBtn.classList.remove('hidden');
  };
  reader.readAsDataURL(file);
}

function removeUploadedImage() {
  currentUploadedImageData = null;
  const fileInput = document.getElementById('asset-form-image-file');
  if (fileInput) fileInput.value = '';
  const previewImg = document.getElementById('asset-image-preview');
  const placeholder = document.getElementById('asset-image-placeholder');
  const removeBtn = document.getElementById('btn-remove-image');

  if (previewImg) {
    previewImg.src = '';
    previewImg.classList.add('hidden');
  }
  if (placeholder) placeholder.classList.remove('hidden');
  if (removeBtn) removeBtn.classList.add('hidden');
}

// Lightbox Handlers
function viewFullImage(src, name, code) {
  const modal = document.getElementById('modal-image-preview');
  const img = document.getElementById('lightbox-img');
  const title = document.getElementById('lightbox-title');
  const codeElem = document.getElementById('lightbox-code');
  if (img) img.src = src;
  if (title) title.textContent = name || 'รูปภาพครุภัณฑ์';
  if (codeElem) codeElem.textContent = code || '';
  if (modal) modal.classList.remove('hidden');
}

function closeFullImage() {
  const modal = document.getElementById('modal-image-preview');
  if (modal) modal.classList.add('hidden');
}

// Modal Handlers
function openAddAssetModal() {
  removeUploadedImage();
  document.getElementById('asset-form-id').value = '';
  document.getElementById('modal-asset-title').textContent = 'เพิ่มรายการครุภัณฑ์ใหม่';
  document.getElementById('asset-form-code').value = 'DEMO-2569-' + String(assets.length + 1).padStart(3, '0');
  document.getElementById('asset-form-name').value = '';
  document.getElementById('asset-form-model').value = '';
  document.getElementById('asset-form-status').value = 'in_use';
  document.getElementById('asset-form-condition').value = 'ดี';
  updateAssetDropdowns();
  if (locations.length > 0) {
    document.getElementById('asset-form-location').value = locations[0].name;
  }
  document.getElementById('asset-form-person').value = '';
  document.getElementById('modal-asset').classList.remove('hidden');
}

function editAsset(id) {
  const asset = assets.find(a => a.id === id);
  if (!asset) return;

  removeUploadedImage();
  updateAssetDropdowns();

  document.getElementById('asset-form-id').value = asset.id;
  document.getElementById('modal-asset-title').textContent = 'แก้ไขครุภัณฑ์ (' + asset.code + ')';
  document.getElementById('asset-form-code').value = asset.code;
  document.getElementById('asset-form-category').value = asset.categoryId;
  document.getElementById('asset-form-name').value = asset.name;
  document.getElementById('asset-form-model').value = asset.brandModel || '';
  document.getElementById('asset-form-location').value = asset.location;
  document.getElementById('asset-form-person').value = asset.responsiblePerson || '';
  document.getElementById('asset-form-status').value = asset.status;
  document.getElementById('asset-form-condition').value = asset.condition;

  // แสดงรูปเดิมถ้ามี (ไม่ต้องอัปโหลดใหม่ก็เก็บรูปเดิมไว้ตอนบันทึก)
  if (asset.image) {
    currentUploadedImageData = asset.image;
    const previewImg = document.getElementById('asset-image-preview');
    const placeholder = document.getElementById('asset-image-placeholder');
    const removeBtn = document.getElementById('btn-remove-image');
    if (previewImg) { previewImg.src = asset.image; previewImg.classList.remove('hidden'); }
    if (placeholder) placeholder.classList.add('hidden');
    if (removeBtn) removeBtn.classList.remove('hidden');
  }

  document.getElementById('modal-asset').classList.remove('hidden');
}

function closeAddAssetModal() {
  document.getElementById('modal-asset').classList.add('hidden');
}

function saveAsset(e) {
  e.preventDefault();
  const id = document.getElementById('asset-form-id').value;
  const code = document.getElementById('asset-form-code').value.trim();
  const name = document.getElementById('asset-form-name').value.trim();
  const categoryId = Number(document.getElementById('asset-form-category').value);
  const model = document.getElementById('asset-form-model').value.trim();
  const location = document.getElementById('asset-form-location').value;
  const person = document.getElementById('asset-form-person').value.trim();
  const status = document.getElementById('asset-form-status').value;
  const condition = document.getElementById('asset-form-condition').value;

  if (id) {
    // --- แก้ไขครุภัณฑ์ที่มีอยู่แล้ว ---
    const asset = assets.find(a => a.id === Number(id));
    if (!asset) return;

    const oldCategoryId = asset.categoryId;
    const oldLocation = asset.location;

    asset.code = code;
    asset.name = name;
    asset.categoryId = categoryId;
    asset.brandModel = model;
    asset.location = location;
    asset.responsiblePerson = person;
    asset.status = status;
    asset.condition = condition;
    if (currentUploadedImageData) asset.image = currentUploadedImageData;

    saveAssets(assets);

    // ปรับ count เฉพาะถ้าหมวดหมู่/ห้องเปลี่ยนจริง (count คำนวณสดจาก assets อยู่แล้ว
    // แต่ปรับตัวแปรในหน่วยความจำให้ตรงทันทีเพื่อ UI ไม่กระพริบรอ sync)
    if (oldCategoryId !== categoryId) {
      const oldCat = categories.find(c => c.id === oldCategoryId);
      if (oldCat && oldCat.count > 0) oldCat.count--;
      const newCat = categories.find(c => c.id === categoryId);
      if (newCat) newCat.count++;
    }
    if (oldLocation !== location) {
      const oldLoc = locations.find(l => l.name === oldLocation);
      if (oldLoc && oldLoc.count > 0) oldLoc.count--;
      const newLoc = locations.find(l => l.name === location);
      if (newLoc) newLoc.count++;
    }

    closeAddAssetModal();
    renderAssetTable();
    showToast('อัปเดตครุภัณฑ์ "' + name + '" สำเร็จ');
    return;
  }

  // --- เพิ่มครุภัณฑ์ใหม่ ---
  const newAsset = {
    id: Date.now(),
    code,
    serial: 'SN-' + Date.now().toString().slice(-6),
    name,
    brandModel: model,
    categoryId,
    location,
    responsiblePerson: person,
    status,
    condition,
    image: currentUploadedImageData,
    icon: 'ph-cube',
    iconColor: 'text-blue-500'
  };

  assets.unshift(newAsset);
  saveAssets(assets);

  // Increase category count
  const cat = categories.find(c => c.id === categoryId);
  if (cat) {
    cat.count++;
    saveCategories(categories);
  }

  // Increase location count
  const loc = locations.find(l => l.name === location);
  if (loc) {
    loc.count++;
    saveLocations(locations);
  }

  closeAddAssetModal();
  renderAssetTable();
  showToast('บันทึกครุภัณฑ์ "' + name + '" เรียบร้อยแล้ว');
}

function deleteAsset(id) {
  const asset = assets.find(a => a.id === id);
  if (!asset) return;
  if (confirm('คุณต้องการลบรายการ "' + asset.name + '" (' + asset.code + ') หรือไม่?')) {
    assets = assets.filter(a => a.id !== id);
    saveAssets(assets);

    const cat = categories.find(c => c.id === asset.categoryId);
    if (cat && cat.count > 0) {
      cat.count--;
      saveCategories(categories);
    }

    const loc = locations.find(l => l.name === asset.location);
    if (loc && loc.count > 0) {
      loc.count--;
      saveLocations(locations);
    }

    renderAssetTable();
    showToast('ลบรายการเรียบร้อยแล้ว');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData();
  initAssetPage();
});
