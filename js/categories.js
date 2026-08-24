// --- CATEGORY MANAGEMENT CONTROLLER ---

let categoryViewMode = 'grid'; // 'grid' or 'table'

function initCategoryPage() {
  renderSidebar('categories');
  renderHeader('หมวดหมู่ครุภัณฑ์');
  renderCategoryView();
  buildIconPicker();
}

function renderCategoryView() {
  const searchInput = document.getElementById('search-category-input');
  const searchTerm = (searchInput ? searchInput.value : '').toLowerCase().trim();
  const sortSelect = document.getElementById('sort-category-select');
  const sortBy = sortSelect ? sortSelect.value : 'code_asc';

  let filtered = categories.filter(c => {
    return c.name.toLowerCase().includes(searchTerm) ||
           c.code.toLowerCase().includes(searchTerm) ||
           (c.desc && c.desc.toLowerCase().includes(searchTerm));
  });

  filtered.sort((a, b) => {
    if (sortBy === 'code_asc') return a.code.localeCompare(b.code);
    if (sortBy === 'count_desc') return b.count - a.count;
    if (sortBy === 'name_asc') return a.name.localeCompare(b.name, 'th');
    return 0;
  });

  // Update KPI Cards
  const totalStat = document.getElementById('cat-stat-total');
  if (totalStat) totalStat.innerHTML = categories.length + ' <span class="text-xs font-normal text-slate-500">หมวด</span>';
  
  let maxCat = categories.reduce((prev, current) => (prev.count > current.count) ? prev : current, categories[0]);
  if (maxCat) {
    const maxStat = document.getElementById('cat-stat-max');
    const maxCountStat = document.getElementById('cat-stat-max-count');
    if (maxStat) maxStat.textContent = maxCat.name;
    if (maxCountStat) maxCountStat.textContent = formatNumber(maxCat.count) + ' ชิ้น';
  }

  let totalItems = categories.reduce((sum, c) => sum + (c.count || 0), 0);
  const totalItemsStat = document.getElementById('cat-stat-total-items');
  if (totalItemsStat) totalItemsStat.innerHTML = formatNumber(totalItems) + ' <span class="text-xs font-normal text-slate-500">ชิ้น</span>';

  // Render Grid View
  const gridContainer = document.getElementById('category-grid-container');
  if (gridContainer) {
    gridContainer.innerHTML = '';
    if (filtered.length === 0) {
      gridContainer.innerHTML = `
        <div class="col-span-full py-16 text-center text-slate-400">
          <i class="ph ph-tag-chevron text-5xl mb-2 block text-slate-300"></i>
          <p class="text-base font-medium">ไม่พบหมวดหมู่ที่ตรงกับการค้นหา</p>
          <p class="text-xs mt-1">ลองเปลี่ยนคำค้นหา หรือกดปุ่ม "เพิ่มหมวดหมู่ใหม่"</p>
        </div>
      `;
    } else {
      filtered.forEach(cat => {
        const colorStyles = getCategoryColorClass(cat.color || 'blue');
        const card = document.createElement('div');
        card.className = "bg-white rounded-2xl border border-slate-200/80 p-5 shadow-sm hover:shadow-md transition flex flex-col justify-between group";
        card.innerHTML = `
          <div>
            <div class="flex items-start justify-between gap-3 mb-3.5">
              <div class="w-12 h-12 rounded-xl ${colorStyles.bg} ${colorStyles.text} flex items-center justify-center text-2xl flex-shrink-0 group-hover:scale-105 transition">
                <i class="ph ${cat.icon || 'ph-tag'}"></i>
              </div>
              <div class="flex items-center gap-1.5">
                <span class="text-xs font-mono font-semibold px-2.5 py-1 rounded-lg bg-slate-100 text-slate-700 border border-slate-200">
                  ${cat.code}
                </span>
                <div class="relative">
                  <button onclick="editCategory(${cat.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition" title="แก้ไข">
                    <i class="ph ph-pencil-simple text-base"></i>
                  </button>
                  <button onclick="deleteCategory(${cat.id})" class="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition" title="ลบ">
                    <i class="ph ph-trash text-base"></i>
                  </button>
                </div>
              </div>
            </div>
            <h3 class="font-bold text-slate-900 text-base leading-snug mb-1 group-hover:text-blue-600 transition">${cat.name}</h3>
            <p class="text-xs text-slate-500 line-clamp-2 mb-4 leading-relaxed">${cat.desc || 'ไม่มีคำอธิบาย'}</p>
          </div>
          <div>
            <div class="flex items-center justify-between p-3 bg-slate-50 rounded-xl border border-slate-100 text-xs mb-3.5">
              <div>
                <span class="text-slate-400 block text-[11px]">จำนวนครุภัณฑ์ในหมวด</span>
                <span class="font-bold text-slate-800 text-sm">${formatNumber(cat.count)} <span class="font-normal text-xs text-slate-500">ชิ้น</span></span>
              </div>
              <span class="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ใช้งาน
              </span>
            </div>
            <a href="assets.html?category=${cat.id}" class="w-full py-2 px-3 rounded-xl bg-slate-100 hover:bg-blue-50 text-slate-700 hover:text-blue-600 font-medium text-xs flex items-center justify-center gap-1.5 transition">
              <span>ดูครุภัณฑ์ในหมวดนี้</span>
              <i class="ph ph-arrow-right"></i>
            </a>
          </div>
        `;
        gridContainer.appendChild(card);
      });
    }
  }

  // Render Table View
  const tableBody = document.getElementById('category-table-body');
  if (tableBody) {
    tableBody.innerHTML = '';
    filtered.forEach(cat => {
      const colorStyles = getCategoryColorClass(cat.color || 'blue');
      const tr = document.createElement('tr');
      tr.className = "hover:bg-blue-50/40 transition";
      tr.innerHTML = `
        <td class="py-3.5 px-4 font-mono font-semibold text-slate-700 text-xs">${cat.code}</td>
        <td class="py-3.5 px-4">
          <div class="flex items-center gap-3">
            <div class="w-8 h-8 rounded-lg ${colorStyles.bg} ${colorStyles.text} flex items-center justify-center text-lg flex-shrink-0">
              <i class="ph ${cat.icon || 'ph-tag'}"></i>
            </div>
            <div>
              <span class="font-semibold text-slate-800 block">${cat.name}</span>
              <span class="text-xs text-slate-400 line-clamp-1">${cat.desc || '-'}</span>
            </div>
          </div>
        </td>
        <td class="py-3.5 px-4 text-center font-semibold text-slate-800">${formatNumber(cat.count)} ชิ้น</td>
        <td class="py-3.5 px-4 text-center">
          <span class="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> ใช้งาน
          </span>
        </td>
        <td class="py-3.5 px-4 text-center">
          <div class="flex items-center justify-center gap-1.5">
            <a href="assets.html?category=${cat.id}" class="px-2 py-1 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 rounded-lg transition" title="ดูครุภัณฑ์">ดู</a>
            <button onclick="editCategory(${cat.id})" class="px-2 py-1 text-xs font-medium bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition" title="แก้ไข">แก้ไข</button>
            <button onclick="deleteCategory(${cat.id})" class="px-2 py-1 text-xs font-medium bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition" title="ลบ">ลบ</button>
          </div>
        </td>
      `;
      tableBody.appendChild(tr);
    });
  }
}

function setCategoryViewMode(mode) {
  categoryViewMode = mode;
  const gridBtn = document.getElementById('btn-view-grid');
  const tableBtn = document.getElementById('btn-view-table');
  const gridEl = document.getElementById('category-grid-container');
  const tableEl = document.getElementById('category-table-container');

  if (mode === 'grid') {
    gridEl.classList.remove('hidden');
    tableEl.classList.add('hidden');
    gridBtn.className = "px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-800 shadow-sm flex items-center gap-1.5 transition";
    tableBtn.className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition";
  } else {
    gridEl.classList.add('hidden');
    tableEl.classList.remove('hidden');
    tableBtn.className = "px-3 py-1.5 rounded-lg text-xs font-medium bg-white text-slate-800 shadow-sm flex items-center gap-1.5 transition";
    gridBtn.className = "px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 hover:text-slate-900 flex items-center gap-1.5 transition";
  }
}

function buildIconPicker(selectedIcon = 'ph-tag') {
  const container = document.getElementById('icon-picker-container');
  if (!container) return;
  container.innerHTML = '';
  availableIcons.forEach(iconClass => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'w-10 h-10 rounded-xl border flex items-center justify-center text-lg transition ' + (selectedIcon === iconClass ? 'border-blue-600 bg-blue-50 text-blue-600 ring-2 ring-blue-500/20' : 'border-slate-200 hover:bg-slate-50 text-slate-600');
    btn.innerHTML = '<i class="ph ' + iconClass + '"></i>';
    btn.onclick = () => {
      document.getElementById('cat-form-icon').value = iconClass;
      buildIconPicker(iconClass);
    };
    container.appendChild(btn);
  });
}

function openAddCategoryModal() {
  document.getElementById('cat-form-id').value = '';
  document.getElementById('modal-category-title').textContent = 'เพิ่มหมวดหมู่ครุภัณฑ์ใหม่';
  document.getElementById('cat-form-code').value = 'CAT-' + String(categories.length + 1).padStart(2, '0');
  document.getElementById('cat-form-name').value = '';
  document.getElementById('cat-form-color').value = 'blue';
  document.getElementById('cat-form-desc').value = '';
  document.getElementById('cat-form-icon').value = 'ph-tag';
  buildIconPicker('ph-tag');

  document.getElementById('modal-category').classList.remove('hidden');
}

function editCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  document.getElementById('cat-form-id').value = cat.id;
  document.getElementById('modal-category-title').textContent = 'แก้ไขหมวดหมู่ (' + cat.code + ')';
  document.getElementById('cat-form-code').value = cat.code;
  document.getElementById('cat-form-name').value = cat.name;
  document.getElementById('cat-form-color').value = cat.color || 'blue';
  document.getElementById('cat-form-desc').value = cat.desc || '';
  document.getElementById('cat-form-icon').value = cat.icon || 'ph-tag';
  buildIconPicker(cat.icon || 'ph-tag');

  document.getElementById('modal-category').classList.remove('hidden');
}

function closeCategoryModal() {
  document.getElementById('modal-category').classList.add('hidden');
}

function saveCategory(e) {
  e.preventDefault();
  const id = document.getElementById('cat-form-id').value;
  const code = document.getElementById('cat-form-code').value.trim();
  const name = document.getElementById('cat-form-name').value.trim();
  const color = document.getElementById('cat-form-color').value;
  const icon = document.getElementById('cat-form-icon').value;
  const desc = document.getElementById('cat-form-desc').value.trim();

  if (id) {
    const index = categories.findIndex(c => c.id === Number(id));
    if (index !== -1) {
      categories[index] = {
        ...categories[index],
        code,
        name,
        color,
        icon,
        desc
      };
      saveCategories(categories);
      showToast('อัปเดตหมวดหมู่ "' + name + '" สำเร็จ');
    }
  } else {
    const newCat = {
      id: Date.now(),
      code,
      name,
      color,
      icon,
      count: 0,
      desc,
      isActive: true
    };
    categories.push(newCat);
    saveCategories(categories);
    showToast('เพิ่มหมวดหมู่ "' + name + '" เรียบร้อยแล้ว');
  }

  closeCategoryModal();
  renderCategoryView();
  renderSidebar('categories');
}

function deleteCategory(id) {
  const cat = categories.find(c => c.id === id);
  if (!cat) return;

  if (confirm('คุณแน่ใจหรือไม่ว่าต้องการลบหมวดหมู่ "' + cat.name + '"?')) {
    categories = categories.filter(c => c.id !== id);
    saveCategories(categories);
    renderCategoryView();
    renderSidebar('categories');
    showToast('ลบหมวดหมู่ "' + cat.name + '" แล้ว');
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData();
  initCategoryPage();
});
