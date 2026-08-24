// --- DASHBOARD CONTROLLER ---

function renderDashboard() {
  renderSidebar('dashboard');
  renderHeader('Dashboard');

  // 1. Render Top Category Distribution Bars
  const catContainer = document.getElementById('dashboard-category-bars');
  if (catContainer) {
    catContainer.innerHTML = '';
    const topCategories = [...categories].sort((a, b) => b.count - a.count).slice(0, 5);
    const maxCount = topCategories[0]?.count || 1;

    topCategories.forEach(cat => {
      const percent = Math.round((cat.count / maxCount) * 100);
      const div = document.createElement('div');
      div.className = "space-y-1.5";
      div.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <span class="font-medium text-slate-700 truncate">${cat.name}</span>
          <span class="text-slate-500 font-semibold">${formatNumber(cat.count)} ชิ้น</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div class="bg-blue-500 h-2 rounded-full" style="width: ${percent}%;"></div>
        </div>
      `;
      catContainer.appendChild(div);
    });
  }

  // 2. Render Top Locations
  const locContainer = document.getElementById('dashboard-location-bars');
  if (locContainer) {
    locContainer.innerHTML = '';
    const topLocations = [...locations].sort((a, b) => b.count - a.count).slice(0, 5);
    const maxLocCount = topLocations[0]?.count || 1;

    topLocations.forEach(loc => {
      const percent = Math.round((loc.count / maxLocCount) * 100);
      const div = document.createElement('div');
      div.className = "space-y-1.5";
      div.innerHTML = `
        <div class="flex items-center justify-between text-xs">
          <span class="font-medium text-slate-700 truncate">${loc.name}</span>
          <span class="text-slate-500 font-semibold">${formatNumber(loc.count)} ชิ้น</span>
        </div>
        <div class="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
          <div class="bg-pink-500 h-2 rounded-full" style="width: ${percent}%;"></div>
        </div>
      `;
      locContainer.appendChild(div);
    });
  }
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData();
  renderDashboard();
});
