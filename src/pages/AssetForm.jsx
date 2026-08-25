import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  listCategories,
  listBuildings,
  listRooms,
  createAsset,
  updateAsset,
  getAssetByCode,
  uploadAssetImage,
} from "../lib/queries";
import QRCodeDisplay from "../components/QRCodeDisplay";

function generateAssetCode() {
  // รูปแบบ: A-YYYYMMDD-XXXX (XXXX = สุ่ม 4 หลัก) — แก้ไขได้ก่อนบันทึกจริง
  // พี่สามารถแทนที่ด้วยเลขทะเบียนครุภัณฑ์จริงขององค์กรได้เลย (เช่น B1000-41400020000/ผ.53-78)
  const today = new Date();
  const datePart = today.toISOString().slice(0, 10).replace(/-/g, "");
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `A-${datePart}-${randomPart}`;
}

const emptyForm = {
  asset_code: "",
  name: "",
  category_code: "",
  color: "",
  building_code: "",
  room_code: "",
  received_date: new Date().toISOString().slice(0, 10),
  responsible_person: "",
};

export default function AssetForm() {
  const navigate = useNavigate();
  const { assetCode: assetCodeParam } = useParams(); // มีค่าเมื่อเข้าหน้านี้ผ่าน /assets/:assetCode/edit เท่านั้น
  const isEditMode = Boolean(assetCodeParam);

  const [categories, setCategories] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [form, setForm] = useState(() =>
    isEditMode ? emptyForm : { ...emptyForm, asset_code: generateAssetCode() }
  );

  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [savedAsset, setSavedAsset] = useState(null); // ใช้แสดง QR หลังบันทึกสำเร็จ (โหมดเพิ่มใหม่เท่านั้น)
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);

  useEffect(() => {
    listCategories().then(setCategories).catch((err) => setError(err.message));
    listBuildings().then(setBuildings).catch((err) => setError(err.message));
  }, []);

  // โหมดแก้ไข: โหลดข้อมูลครุภัณฑ์เดิมมาเติมในฟอร์ม รวมถึงไล่หา ตึก จาก room เดิม
  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    getAssetByCode(assetCodeParam)
      .then((asset) => {
        if (cancelled) return;
        const room = asset.rooms;
        setForm({
          asset_code: asset.asset_code,
          name: asset.name,
          category_code: asset.category_code || "",
          color: asset.color || "",
          building_code: room?.building_code || "",
          room_code: asset.room_code || "",
          received_date: asset.received_date || "",
          responsible_person: asset.responsible_person || "",
        });
        if (asset.image_url) setImagePreview(asset.image_url);
      })
      .catch((err) => setError(err.message))
      .finally(() => !cancelled && setLoadingExisting(false));
    return () => {
      cancelled = true;
    };
  }, [assetCodeParam, isEditMode]);

  useEffect(() => {
    if (!form.building_code) {
      setRooms([]);
      return;
    }
    listRooms(form.building_code).then(setRooms).catch((err) => setError(err.message));
  }, [form.building_code]);

  function update(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleImageChange(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    let imageUrl = isEditMode ? undefined : null; // undefined = ไม่แตะฟิลด์นี้ตอน update ถ้าไม่ได้เปลี่ยนรูป
    if (imageFile) {
      try {
        imageUrl = await uploadAssetImage(imageFile, form.asset_code);
      } catch (err) {
        setError("อัปโหลดรูปไม่สำเร็จ: " + err.message);
        setSubmitting(false);
        return; // fail-stop: ไม่บันทึกข้อมูลอื่นต่อถ้าอัปโหลดรูปพัง
      }
    }

    const payload = {
      asset_code: form.asset_code,
      name: form.name,
      category_code: form.category_code || null,
      color: form.color || null,
      room_code: form.room_code || null,
      received_date: form.received_date || null,
      responsible_person: form.responsible_person || null,
    };
    if (imageUrl !== undefined) payload.image_url = imageUrl;

    try {
      if (isEditMode) {
        // หมายเหตุ: ถ้าพี่แก้ asset_code ในโหมดนี้ (เปลี่ยนเลขทะเบียน) ระบบจะ cascade
        // เปลี่ยนให้อัตโนมัติในทุกตารางที่อ้างอิงถึง (ตั้งค่าไว้ใน schema แล้ว)
        await updateAsset(assetCodeParam, payload);
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
              setImageFile(null);
              setImagePreview(null);
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
          รหัสครุภัณฑ์ (เลขทะเบียน)
          <input value={form.asset_code} onChange={(e) => update("asset_code", e.target.value)} required />
        </label>

        <label>
          ชื่อสิ่งของ
          <input value={form.name} onChange={(e) => update("name", e.target.value)} required />
        </label>

        <label>
          ประเภท
          <select value={form.category_code} onChange={(e) => update("category_code", e.target.value)}>
            <option value="">-- เลือกประเภท --</option>
            {categories.map((c) => (
              <option key={c.category_code} value={c.category_code}>
                {c.category_name}
              </option>
            ))}
          </select>
        </label>

        <label>
          สี
          <input value={form.color} onChange={(e) => update("color", e.target.value)} />
        </label>

        <label>
          รูปภาพประกอบ
          <input type="file" accept="image/*" onChange={handleImageChange} />
        </label>
        {imagePreview && (
          <img src={imagePreview} alt="ตัวอย่างรูปครุภัณฑ์" className="image-preview" />
        )}

        <div className="form-row-3">
          <label>
            ตึก
            <select value={form.building_code} onChange={(e) => update("building_code", e.target.value)}>
              <option value="">-- เลือกตึก --</option>
              {buildings.map((b) => (
                <option key={b.building_code} value={b.building_code}>
                  {b.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            ห้อง
            <select
              value={form.room_code}
              onChange={(e) => update("room_code", e.target.value)}
              disabled={!form.building_code}
            >
              <option value="">-- เลือกห้อง --</option>
              {rooms.map((r) => (
                <option key={r.room_code} value={r.room_code}>
                  ชั้น {r.floor_number} — {r.room_name}
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
              onClick={() => navigate(`/asset/${assetCodeParam}`)}
            >
              ยกเลิก
            </button>
          )}
        </div>
      </form>
    </div>
  );
}
