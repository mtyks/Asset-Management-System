// --- QR SCAN CONTROLLER ---

function initScanPage() {
  renderSidebar('scan');
  renderHeader('สแกน QR ครุภัณฑ์');
  startScanner();
}

function startScanner() {
  if (typeof Html5Qrcode === 'undefined') {
    // ไลบรารีอาจโหลดช้ากว่า script นี้เล็กน้อย (โหลดแบบ defer) ลองใหม่อีกครั้ง
    setTimeout(startScanner, 200);
    return;
  }

  const scanner = new Html5Qrcode('qr-reader');
  scanner
    .start(
      { facingMode: 'environment' },
      { fps: 10, qrbox: 240 },
      (decodedText) => {
        scanner.stop().catch(() => {});
        goToAssetFromScan(decodedText);
      },
      () => { /* ไม่เจอ QR ในเฟรมนี้ ไม่ใช่ error จริง ไม่ต้องแสดงอะไร */ }
    )
    .catch((err) => {
      const errBox = document.getElementById('scan-error');
      if (errBox) {
        errBox.textContent = 'เปิดกล้องไม่สำเร็จ กรุณาอนุญาตการใช้กล้อง หรือกรอกเลขครุภัณฑ์ด้านล่างแทน';
        errBox.classList.remove('hidden');
      }
      console.error('[Scan] เปิดกล้องไม่สำเร็จ:', err);
    });
}

function goToAssetFromScan(decodedText) {
  // QR ที่ระบบสร้างจะ encode เป็น URL เต็ม เช่น https://.../asset-detail.html?code=DEMO-2569-001
  // แต่ถ้าเป็น QR รุ่นเก่าที่เก็บแค่รหัสเปล่าๆ ก็รองรับเช่นกัน
  try {
    const url = new URL(decodedText);
    const code = url.searchParams.get('code');
    if (code) {
      window.location.href = 'asset-detail.html?code=' + encodeURIComponent(code);
      return;
    }
  } catch (e) {
    // ไม่ใช่ URL แปลว่าเป็นรหัสเปล่าๆ
  }
  window.location.href = 'asset-detail.html?code=' + encodeURIComponent(decodedText.trim());
}

function submitManualCode(e) {
  e.preventDefault();
  const code = document.getElementById('manual-code-input').value.trim();
  if (code) window.location.href = 'asset-detail.html?code=' + encodeURIComponent(code);
}

window.addEventListener('DOMContentLoaded', async () => {
  await bootstrapData(); // ใช้แค่ให้ layout/sidebar สอดคล้องหน้าอื่น ไม่ได้ใช้ query ข้อมูลในหน้านี้
  initScanPage();
});
