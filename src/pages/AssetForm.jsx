import React, { useEffect, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import {
  listCategories,
  listBuildings,
  listFloors,
  listRooms,
  createAsset,
  updateAsset,
  getAssetById,
  uploadAssetImage,
} from "../lib/queries";
import QRCodeDisplay from "../components/QRCodeDisplay";
import { Plus, Save, ArrowLeft, RefreshCw, CheckCircle, QrCode, Upload, Image as ImageIcon } from "lucide-react";

function generateAssetCode() {
  const currentYear = 2569;
  const randomPart = Math.floor(1000 + Math.random() * 9000);
  return `A-${currentYear}-${randomPart}`;
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
  image_url: "",
};

export default function AssetForm() {
  const navigate = useNavigate();
  const { assetId } = useParams();
  const isEditMode = Boolean(assetId);

  const [categories, setCategories] = useState([]);
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);

  const [form, setForm] = useState(() =>
    isEditMode ? emptyForm : { ...emptyForm, asset_code: generateAssetCode() }
  );

  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState("");
  const [loadingExisting, setLoadingExisting] = useState(isEditMode);
  const [savedAsset, setSavedAsset] = useState(null);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    listCategories().then(setCategories).catch((err) => setError(err.message));
    listBuildings().then(setBuildings).catch((err) => setError(err.message));
  }, []);

  // โหมดแก้ไข
  useEffect(() => {
    if (!isEditMode) return;
    let cancelled = false;
    getAssetById(assetId)
      .then((asset) => {
        if (cancelled) return;
        const room = asset.rooms;
        const floor = room?.floors;
        setForm({
          asset_code: asset.asset_code || asset.code || "",
          name: asset.name || "",
          category_id: asset.category_id || "",
          color: asset.color || "",
          building_id: floor?.building_id || "",
          floor_id: room?.floor_id || "",
          room_id: asset.room_id || "",
          received_date: asset.received_date || "",
          responsible_person: asset.responsible_person || "",
          image_url: asset.image_url || "",
        });
        if (asset.image_url) {
          setImagePreview(asset.image_url);
        }
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

  const handleChange = (e) => {
    const { name, value } = e.target;
    setForm((f) => ({ ...f, [name]: value }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setImageFile(file);
      setImagePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    try {
      let finalImageUrl = form.image_url;

      // อัปโหลดรูปขึ้น Supabase Storage ถ้ามีการเลือกรูปใหม่
      if (imageFile) {
        finalImageUrl = await uploadAssetImage(imageFile, form.asset_code.trim());
      }

      const payload = {
        asset_code: form.asset_code.trim(),
        name: form.name.trim(),
        category_id: form.category_id || null,
        color: form.color.trim() || null,
        room_id: form.room_id || null,
        received_date: form.received_date || null,
        responsible_person: form.responsible_person.trim() || null,
        image_url: finalImageUrl || null,
      };

      if (isEditMode) {
        await updateAsset(assetId, payload);
        navigate(`/asset/${form.asset_code}`);
      } else {
        const created = await createAsset(payload);
        setSavedAsset(created);
      }
    } catch (err) {
      setError("บันทึกไม่สำเร็จ: " + err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <div className="page-container">
        <div className="table-empty-row">กำลังโหลดข้อมูลครุภัณฑ์จาก Supabase...</div>
      </div>
    );
  }

  // แสดงผลสำเร็จ + QR Code
  if (savedAsset) {
    return (
      <div className="page-container" style={{ maxWidth: 640 }}>
        <div className="form-card" style={{ textAlign: "center" }}>
          <div
            style={{
              width: 50,
              height: 50,
              borderRadius: "50%",
              backgroundColor: "#ecfdf5",
              color: "#059669",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
            }}
          >
            <CheckCircle size={28} />
          </div>
          <h2 style={{ margin: "0 0 8px", fontSize: "1.3rem" }}>
            บันทึกครุภัณฑ์ลง Supabase สำเร็จแล้ว!
          </h2>
          <p style={{ color: "#64748b", margin: "0 0 24px", fontSize: "0.9rem" }}>
            รหัสครุภัณฑ์ <strong>{savedAsset.asset_code || savedAsset.code}</strong> ถูกบันทึกขึ้นฐานข้อมูลเรียบร้อย
          </p>

          <div style={{ margin: "0 auto 24px", display: "inline-block" }}>
            <QRCodeDisplay
              value={savedAsset.asset_code || savedAsset.code}
              caption={savedAsset.name}
            />
          </div>

          <div style={{ display: "flex", justifyContent: "center", gap: 12 }}>
            <button
              className="btn btn-secondary"
              onClick={() => {
                setSavedAsset(null);
                setImageFile(null);
                setImagePreview("");
                setForm({ ...emptyForm, asset_code: generateAssetCode() });
              }}
            >
              + เพิ่มรายการถัดไป
            </button>
            <Link to="/assets" className="btn btn-primary">
              กลับสู่รายการครุภัณฑ์
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container" style={{ maxWidth: 960 }}>
      {/* Header */}
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>{isEditMode ? "แก้ไขข้อมูลครุภัณฑ์" : "เพิ่มครุภัณฑ์ใหม่"}</h1>
          <p className="page-subtitle">
            กรอกข้อมูลรายละเอียดครุภัณฑ์ กำหนดหมวดหมู่ สถานที่ตั้ง และรูปภาพ
          </p>
        </div>

        <div className="page-actions-group">
          <Link to="/assets" className="btn btn-outline-white">
            <ArrowLeft size={16} />
            <span>ย้อนกลับ</span>
          </Link>
        </div>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="form-card">
          <h3 style={{ margin: "0 0 18px", fontSize: "1.05rem", fontWeight: 700 }}>
            1. ข้อมูลทั่วไปของครุภัณฑ์
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label>เลขครุภัณฑ์ (Asset Code) *</label>
              <div style={{ display: "flex", gap: 8 }}>
                <input
                  type="text"
                  name="asset_code"
                  className="form-control"
                  value={form.asset_code}
                  onChange={handleChange}
                  required
                />
                {!isEditMode && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    title="สุ่มรหัสใหม่"
                    onClick={() =>
                      setForm((f) => ({ ...f, asset_code: generateAssetCode() }))
                    }
                  >
                    <RefreshCw size={14} />
                  </button>
                )}
              </div>
            </div>

            <div className="form-group">
              <label>ชื่อรายการครุภัณฑ์ *</label>
              <input
                type="text"
                name="name"
                className="form-control"
                placeholder="เช่น โต๊ะทำงานผู้บริหาร, คอมพิวเตอร์ All-in-One"
                value={form.name}
                onChange={handleChange}
                required
              />
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>หมวดหมู่ครุภัณฑ์</label>
              <select
                name="category_id"
                className="form-control"
                value={form.category_id}
                onChange={handleChange}
              >
                <option value="">-- ไม่ระบุหมวดหมู่ --</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.category_name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>รายละเอียด / สี / ยี่ห้อ</label>
              <input
                type="text"
                name="color"
                className="form-control"
                placeholder="เช่น ดำ, เทา, Dell OptiPlex"
                value={form.color}
                onChange={handleChange}
              />
            </div>
          </div>

          {/* Image Upload */}
          <div className="form-group" style={{ marginTop: 12 }}>
            <label>รูปภาพครุภัณฑ์ (อัปโหลดขึ้น Supabase Storage)</label>
            <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
              <input
                type="file"
                accept="image/*"
                onChange={handleImageChange}
                style={{ fontSize: "0.85rem" }}
              />
              {imagePreview && (
                <div
                  style={{
                    width: 60,
                    height: 60,
                    borderRadius: 8,
                    overflow: "hidden",
                    border: "1px solid #e2e8f0",
                  }}
                >
                  <img
                    src={imagePreview}
                    alt="Preview"
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Location & Ownership */}
        <div className="form-card">
          <h3 style={{ margin: "0 0 18px", fontSize: "1.05rem", fontWeight: 700 }}>
            2. สถานที่ตั้ง และผู้รับผิดชอบ
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label>ตึก / อาคาร</label>
              <select
                name="building_id"
                className="form-control"
                value={form.building_id}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    building_id: e.target.value,
                    floor_id: "",
                    room_id: "",
                  }));
                }}
              >
                <option value="">-- เลือกตึก/อาคาร --</option>
                {buildings.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ชั้น</label>
              <select
                name="floor_id"
                className="form-control"
                value={form.floor_id}
                onChange={(e) => {
                  setForm((f) => ({
                    ...f,
                    floor_id: e.target.value,
                    room_id: "",
                  }));
                }}
                disabled={!form.building_id}
              >
                <option value="">-- เลือกชั้น --</option>
                {floors.map((fl) => (
                  <option key={fl.id} value={fl.id}>
                    {fl.floor_name || `ชั้น ${fl.floor_number}`}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ห้อง / จุดประจำ</label>
              <select
                name="room_id"
                className="form-control"
                value={form.room_id}
                onChange={handleChange}
                disabled={!form.floor_id}
              >
                <option value="">-- เลือกห้อง --</option>
                {rooms.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.room_name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="form-grid">
            <div className="form-group">
              <label>ชื่อผู้รับผิดชอบ / ผู้ดูแล</label>
              <input
                type="text"
                name="responsible_person"
                className="form-control"
                placeholder="เช่น สมชาย ใจดี"
                value={form.responsible_person}
                onChange={handleChange}
              />
            </div>

            <div className="form-group">
              <label>วันที่ตรวจรับเข้าคลัง</label>
              <input
                type="date"
                name="received_date"
                className="form-control"
                value={form.received_date}
                onChange={handleChange}
              />
            </div>
          </div>

          <div className="form-actions">
            <Link to="/assets" className="btn btn-secondary">
              ยกเลิก
            </Link>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              <Save size={16} />
              <span>{submitting ? "กำลังบันทึก..." : isEditMode ? "บันทึกการแก้ไข" : "บันทึกครุภัณฑ์"}</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
