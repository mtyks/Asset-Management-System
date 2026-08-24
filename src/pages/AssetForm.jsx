import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  listCategories,
  listBuildings,
  listFloors,
  listRooms,
  createAsset,
} from "../lib/queries";
import QRCodeDisplay from "../components/QRCodeDisplay";

function generateAssetCode() {
  // รูปแบบ: A-YYYYMMDD-XXXX (XXXX = สุ่ม 4 หลัก) — แก้ไขได้ก่อนบันทึกจริง
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `A-${datePart}-${randomPart}`;
}

export default function AssetForm() {
  const navigate = useNavigate();

  const [categories, setCategories] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [form, setForm] = useState({
    asset_code: generateAssetCode(),
    name: "",
    category_id: "",
    color: "",
    building_id: "",
    floor_id: "",
    room_id: "",
    received_date: new Date().toISOString().slice(0, 10),
    responsible_person: "",
  });

  const [savedAsset, setSavedAsset] = useState(null); // ใช้แสดง QR หลังบันทึกสำเร็จ
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch((err) => setError(err.message));
    listBuildings().then(setBuildings).catch((err) => setError(err.message));
  }, []);

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
    try {
      const asset = await createAsset({
        asset_code: form.asset_code,
        name: form.name,
        category_id: form.category_id || null,
        color: form.color || null,
        room_id: form.room_id || null,
        received_date: form.received_date || null,
        responsible_person: form.responsible_person || null,
      });
      setSavedAsset(asset);
    } catch (err) {
      // fail-stop: ไม่บันทึกซ้ำอัตโนมัติ ให้ผู้ใช้เห็น error แล้วตัดสินใจเอง (เช่น รหัสซ้ำ)
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
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
              setForm((f) => ({ ...f, asset_code: generateAssetCode(), name: "", color: "" }));
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
      <h1>เพิ่มครุภัณฑ์ใหม่</h1>
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

        <button className="btn btn-primary" type="submit" disabled={submitting}>
          {submitting ? "กำลังบันทึก..." : "บันทึกครุภัณฑ์"}
        </button>
      </form>
    </div>
  );
}
