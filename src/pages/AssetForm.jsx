import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listCategories,
  listBuildings,
  listFloors,
  listRooms,
  createAsset,
  updateAsset,
  getAssetById,
} from "../lib/queries";
import QRCodeDisplay from "../components/QRCodeDisplay";

function generateAssetCode() {
  // รูปแบบ: A-YYYYMMDD-XXXX (XXXX = สุ่ม 4 หลัก) — แก้ไขได้ก่อนบันทึกจริง
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `A-${datePart}-${randomPart}`;
}

const emptyForm = {
  asset_code: "",
  name: "",
  category_id: "",
  color: "",
  building_id: "",
  floor_id: "",
  room_id: "",
  received_date: new Date().toISOString().slice(0, 10),
  responsible_person: "",
};

export default function AssetForm() {
  const navigate = useNavigate();
  const { assetId } = useParams(); // มีค่าเมื่อเข้าหน้านี้ผ่าน /assets/:assetId/edit เท่านั้น
  const isEditMode = Boolean(assetId);

  const [categories, setCategories] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [form, setForm] = useState(() =>
    isEditMode ? emptyForm : { ...emptyForm, asset_code: generateAssetCode() }
  );

  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [savedAsset, setSavedAsset] = useState(null); // ใช้แสดง QR หลังบันทึกสำเร็จ (โหมดเพิ่มใหม่เท่านั้น)
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch((err) => setError(err.message));
    listBuildings().then(setBuildings).catch((err) => setError(err.message));
  }, []);

  // โหมดแก้ไข: โหลดข้อมูลครุภัณฑ์เดิมมาเติมในฟอร์ม รวมถึงไล่หา ตึก/ชั้น จาก room_id เดิม
  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    getAssetById(assetId)
      .then((asset) => {
        if (cancelled) return;
        const room = asset.rooms;
        const floor = room?.floors;
        setForm({
          asset_code: asset.asset_code,
          name: asset.name,
          category_id: asset.category_id || "",
          color: asset.color || "",
          building_id: floor?.building_id || "",
          floor_id: room?.floor_id || "",
          room_id: asset.room_id || "",
          received_date: asset.received_date || "",
          responsible_person: asset.responsible_person || "",
        });
      })
      .catch((err) => setError(err.message))
      .finally(() => !cancelled && setLoadingExisting(false));
    return () => {
      cancelled = true;
    };
  }, [assetId, isEditMode]);

  useEffect(() => {
    if (!form.building_id) {
      setFloors([]);
      return;
    }
    listFloors(form.building_id).then(setFloors).catch((err) => setError(err.message));
  }, [form.building_id]);

  useEffect(() => {
    if (!form.floor_id) {
      setRooms([]);
      return;
    }
    listRooms(form.floor_id).then(setRooms).catch((err) => setError(err.message));
  }, [form.floor_id]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const payload = {
      asset_code: form.asset_code,
      name: form.name,
      category_id: form.category_id || null,
      color: form.color || null,
      room_id: form.room_id || null,
      received_date: form.received_date || null,
      responsible_person: form.responsible_person || null,
    };
    try {
      if (isEditMode) {
        await updateAsset(assetId, payload);
        navigate(`/asset/${form.asset_code}`);
      } else {
        const asset = await createAsset(payload);
        setSavedAsset(asset);
      }
    } catch (err) {
      // fail-stop: ไม่บันทึกซ้ำอัตโนมัติ ให้ผู้ใช้เห็น error แล้วตัดสินใจเอง (เช่น รหัสซ้ำ)
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (loadingExisting) {
    return <div className="page-loading">กำลังโหลดข้อมูลครุภัณฑ์...</div>;
  }

  if (savedAsset) {
    return (
      <div className="page">
        <h1>บันทึกสำเร็จ</h1>
        <p>เพิ่มครุภัณฑ์ "{savedAsset.name}" เรียบร้อยแล้ว — พิมพ์ QR แล้วนำไปติดที่ตัวครุภัณฑ์ได้เลย</p>
        <QRCodeDisplay assetCode={savedAsset.asset_code} assetName={savedAsset.name} />
        <div className="form-actions">
          <button className="btn btn-secondary" onClick={() => navigate("/assets")}>
            ไปที่รายการครุภัณฑ์
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setSavedAsset(null);
              setForm({ ...emptyForm, asset_code: generateAssetCode() });
            }}
          >
            เพิ่มชิ้นถัดไป
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="page">
      <h1>{isEditMode ? `แก้ไขครุภัณฑ์ (${form.asset_code})` : "เพิ่มครุภัณฑ์ใหม่"}</h1>
      <form className="form-card" onSubmit={handleSubmit}>
        <label>
          รหัสครุภัณฑ์ (แก้ไขได้)
          <input value={form.asset_code} onChange={(e) => update("asset_code", e.target.value)} required />
        </label>

        <label>
          ชื่อสิ่งของ
          <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </label>

        <label>
          ประเภท
          <select value={form.category_id} onChange={(e) => update("category_id", e.target.value)}>
            <option value="">-- เลือกประเภท --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.category_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          สี
          <input value={form.color} onChange={(e) => update("color", e.target.value)} />
        </label>

        <div className="form-row-3">
          <label>
            ตึก
            <select value={form.building_id} onChange={(e) => update("building_id", e.target.value)}>
              <option value="">-- เลือกตึก --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ชั้น
            <select
              value={form.floor_id}
              onChange={(e) => update("floor_id", e.target.value)}
              disabled={!form.building_id}
            >
              <option value="">-- เลือกชั้น --</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  ชั้น {f.floor_number} {f.floor_name || ""}
                </option>
              ))}
            </select>
          </label>
          <label>
            ห้อง
            <select
              value={form.room_id}
              onChange={(e) => update("room_id", e.target.value)}
              disabled={!form.floor_id}
            >
              <option value="">-- เลือกห้อง --</option>
              {rooms.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.room_name}
                </option>
              ))}
            </select>
          </label>
        </div>

        <label>
          วันที่รับเข้า
          <input
            type="date"
            value={form.received_date}
            onChange={(e) => update("received_date", e.target.value)}
          />
        </label>

        <label>
          ชื่อผู้รับผิดชอบ
          <input
            value={form.responsible_person}
            onChange={(e) => update("responsible_person", e.target.value)}
            placeholder="ชื่อผู้ดูแล/รับผิดชอบครุภัณฑ์ชิ้นนี้"
          />
        </label>

        {error && <p className="form-error">บันทึกไม่สำเร็จ: {error}</p>}

        <div className="form-actions">
          <button className="btn btn-primary" type="submit" disabled={submitting}>
            {submitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "บันทึกครุภัณฑ์"}
          </button>
          {isEditMode && (
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => navigate(`/asset/${form.asset_code}`)}
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
