// --- PUBLIC ASSET DETAIL CONTROLLER (หน้าที่ QR โค้ดชี้มาหา) ---

let currentDetailAsset = null;

function getAssetCodeFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('code');
}

function initAssetDetailPage() {
  renderSidebar('assets');
  renderHeader('รายละเอียดครุภัณฑ์');

  const code = getAssetCodeFromUrl();
  const asset = code ? assets.find(a => a.code === code) : null;

  document.getElementById('loading-state').classList.add('hidden');

  if (!asset) {
    document.getElementById('not-found-state').classList.remove('hidden');
    return;
  }

  currentDetailAsset = asset;
  document.getElementById('asset-detail-content').classList.remove('hidden');
  renderAssetDetail(asset);
  renderQr(asset);
}

function renderAssetDetail(asset) {
  const cat = categories.find(c => c.id === asset.categoryId);

  document.getElementById('detail-name').textContent = asset.name;
  document.getElementById('detail-brand').textContent = asset.brandModel || '-';
  document.getElementById('detail-code').textContent = asset.code;
  document.getElementById('detail-serial').textContent = asset.serial || '-';
  document.getElementById('detail-category').textContent = cat ? cat.name : '-';
  document.getElementById('detail-condition').textContent = asset.condition || '-';
  document.getElementById('detail-location').textContent = asset.location || '-';
  document.getElementById('detail-person').textContent = asset.responsiblePerson || '-';

  const imgBox = document.getElementById('detail-image-box');
  if (asset.image) {
    imgBox.innerHTML = `<img src="${asset.image}" class="w-full h-full object-cover">`;
  } else {
    imgBox.innerHTML = `<i class="ph ${asset.icon || 'ph-cube'} ${asset.iconColor || 'text-blue-500'}"></i>`;
  }

  const statusMap = {
    in_use: { text: 'ใช้งานปกติ', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
    borrowed: { text: 'ยืมใช้งาน', cls: 'bg-blue-50 text-blue-700 border-blue-200' },
    maintenance: { text: 'ส่งซ่อม', cls: 'bg-amber-50 text-amber-700 border-amber-200' },
    disposed: { text: 'จำหน่าย', cls: 'bg-slate-100 text-slate-700 border-slate-200' },
  };
  const s = statusMap[asset.status] || statusMap.in_use;
  document.getElementById('detail-status-badge').innerHTML =
    `<span class="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${s.cls}">${s.text}</span>`;
}

function getQrUrlForAsset(asset) {
  // encode เป็น URL เต็มของหน้านี้เอง เพื่อให้กล้องมือถือทั่วไป (ไม่ใช่แค่ในระบบ) สแกนแล้วเปิดตรงได้เลย
  return window.location.origin + window.location.pathname.replace('asset-detail.html', '') +
    'asset-detail.html?code=' + encodeURIComponent(asset.code);
}

function renderQr(asset) {
  const canvas = document.getElementById('qr-canvas');
  const url = getQrUrlForAsset(asset);
  QRCode.toCanvas(canvas, url, { width: 200, margin: 1 }, (err) => {
    if (err) console.error('[QR] สร้างไม่สำเร็จ:', err);
  });
  document.getElementById('qr-code-label').textContent = asset.code;
}

function downloadQr() {
  const canvas = document.getElementById('qr-canvas');
  const link = document.createElement('a');
  link.download = 'QR-' + (currentDetailAsset ? currentDetailAsset.code : 'asset') + '.png';
  link.href = canvas.toDataURL('image/png');
  link.click();
}

function printQr() {
  const canvas = document.getElementById('qr-canvas');
  const dataUrl = canvas.toDataURL('image/png');
  const w = window.open('', '_blank');
  w.document.write(`
    <html><head><title>QR ${currentDetailAsset ? currentDetailAsset.code : ''}</title></head>
    <body style="text-align:center; font-family: sans-serif; padding: 24px;">
      <img src="${dataUrl}" />
      <p style="font-size:14px; margin-top:8px;">${currentDetailAsset ? currentDetailAsset.name : ''}<br/>${currentDetailAsset ? currentDetailAsset.code : ''}</p>
      <script>window.onload = () => window.print();</script>
    </body></html>
  `);
  w.document.close();
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData();
  initAssetDetailPage();
});
