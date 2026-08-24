// --- GLOBAL SHARED LAYOUT & COMPONENTS ---

function renderSidebar(activePage) {
  const container = document.getElementById('sidebar-container');
  if (!container) return;

  container.innerHTML = `
  <aside class="w-64 bg-[#0f172a] text-slate-300 flex flex-col justify-between flex-shrink-0 h-screen transition-all duration-300 z-30 select-none">
    <div>
      <!-- Brand Logo -->
      <div class="h-16 flex items-center px-6 gap-3 border-b border-slate-800">
        <div class="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white text-xl shadow-lg shadow-blue-500/30">
          <i class="ph-bold ph-package"></i>
        </div>
        <div>
          <h1 class="text-white font-semibold text-base leading-tight">ระบบบริหารจัดการครุภัณฑ์</h1>
        </div>
      </div>

      <!-- Navigation Menu -->
      <nav class="p-4 space-y-1.5 text-sm font-normal">
        <a href="index.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition ${activePage === 'dashboard' ? 'active' : ''}">
          <i class="ph ph-squares-four text-lg"></i>
          <span>Dashboard</span>
        </a>

        <a href="assets.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition ${activePage === 'assets' ? 'active' : ''}">
          <i class="ph-fill ph-folder-notch-open text-lg"></i>
          <span>รายการครุภัณฑ์</span>
        </a>

        <div class="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          จัดการข้อมูล
        </div>

        <a href="categories.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition ${activePage === 'categories' ? 'active' : ''}">
          <i class="ph ph-tag text-lg text-amber-400"></i>
          <span>หมวดหมู่ครุภัณฑ์</span>
        </a>

        <a href="locations.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition ${activePage === 'locations' ? 'active' : ''}">
          <i class="ph ph-map-pin text-lg text-pink-400"></i>
          <span>สถานที่ / ห้อง</span>
        </a>

        <a href="transfers.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition ${activePage === 'transfers' ? 'active' : ''}">
          <i class="ph ph-arrows-left-right text-lg text-cyan-400"></i>
          <span>ย้าย / ยืม / คืน</span>
        </a>

        <a href="maintenance.html" class="nav-item flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition ${activePage === 'maintenance' ? 'active' : ''}">
          <i class="ph ph-wrench text-lg text-orange-400"></i>
          <span>ซ่อมบำรุง</span>
        </a>

        <div class="pt-4 pb-1 px-3 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          ระบบ & ตรวจสอบ
        </div>

        <a href="javascript:void(0)" onclick="showToast('เมนูตั้งค่าระบบ')" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition">
          <i class="ph ph-gear text-lg"></i>
          <span>ตั้งค่าระบบ</span>
        </a>

        <a href="scan.html" class="flex items-center gap-3 px-3 py-2.5 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800/60 transition ${activePage === 'scan' ? 'active' : ''}">
          <i class="ph ph-qr-code text-lg text-emerald-400"></i>
          <span>สแกน QR ครุภัณฑ์</span>
        </a>
      </nav>
    </div>

    <!-- User Profile Footer in Sidebar -->
    <div class="p-4 border-t border-slate-800 flex items-center gap-3">
      <div class="w-9 h-9 rounded-full bg-slate-700 flex items-center justify-center text-white font-medium text-sm">
        ผป
      </div>
      <div class="flex-1 min-w-0">
        <p class="text-sm font-medium text-white truncate">ผู้ดูแลระบบพัสดุ</p>
        <p class="text-xs text-slate-400 truncate">admin@organization.go.th</p>
      </div>
      <button class="text-slate-400 hover:text-red-400 transition" title="ออกจากระบบ">
        <i class="ph ph-sign-out text-lg"></i>
      </button>
    </div>
  </aside>
  `;
}

function renderHeader(breadcrumbTitle) {
  const container = document.getElementById('header-container');
  if (!container) return;

  container.innerHTML = `
  <header class="h-16 bg-white border-b border-slate-200 px-8 flex items-center justify-between sticky top-0 z-20 shadow-sm">
    <div class="flex items-center gap-3 text-sm text-slate-500">
      <a href="index.html" class="hover:text-slate-800 transition">หน้าหลัก</a>
      <i class="ph ph-caret-right text-xs"></i>
      <span class="text-blue-600 font-medium">${breadcrumbTitle}</span>
    </div>

    <div class="flex items-center gap-4">
      <div class="text-xs text-slate-600 bg-slate-100 px-3 py-1.5 rounded-lg border border-slate-200 font-medium">
        ปีงบประมาณ 2569
      </div>
    </div>
  </header>
  `;
}

function showToast(message) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'fixed bottom-6 right-6 z-50 transform translate-y-24 opacity-0 transition-all duration-300 pointer-events-none';
    toast.innerHTML = `
    <div class="bg-slate-900 text-white px-5 py-3 rounded-2xl shadow-xl border border-slate-700 flex items-center gap-3 text-sm">
      <i class="ph-fill ph-check-circle text-emerald-400 text-xl" id="toast-icon"></i>
      <span id="toast-message">${message}</span>
    </div>
    `;
    document.body.appendChild(toast);
  } else {
    document.getElementById('toast-message').textContent = message;
  }

  toast.classList.remove('translate-y-24', 'opacity-0', 'pointer-events-none');
  setTimeout(() => {
    toast.classList.add('translate-y-24', 'opacity-0', 'pointer-events-none');
  }, 3000);
}
