import React, { useEffect, useState } from "react";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../lib/queries";
import { Tag, Plus, Edit, Trash2, Check, X, Layers } from "lucide-react";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  function refresh() {
    listCategories()
      .then(setCategories)
      .catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await createCategory(name.trim());
      setName("");
      refresh();
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditingName(c.category_name || c.name || "");
  }

  async function saveEdit(id) {
    if (!editingName.trim()) return;
    try {
      await updateCategory(id, editingName.trim());
      setEditingId(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    const catTitle = c.category_name || c.name;
    if (
      !window.confirm(
        `ยืนยันการลบประเภท "${catTitle}" หรือไม่? (ครุภัณฑ์ที่อยู่ในหมวดหมู่นี้จะยังคงอยู่ในระบบ)`
      )
    ) {
      return;
    }
    try {
      await deleteCategory(c.id);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-container" style={{ maxWidth: 840 }}>
      {/* Header */}
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>หมวดหมู่ครุภัณฑ์</h1>
          <p className="page-subtitle">
            จัดการหมวดหมู่และการจำแนกประเภททรัพย์สินทั้งหมดในองค์กร
          </p>
        </div>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      {/* Add Category Form */}
      <div className="form-card">
        <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700 }}>
          + เพิ่มหมวดหมู่ใหม่
        </h3>
        <form
          onSubmit={handleAdd}
          style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}
        >
          <input
            type="text"
            className="form-control"
            style={{ flex: 1, minWidth: "240px" }}
            placeholder="เช่น ครุภัณฑ์สำนักงาน, ครุภัณฑ์คอมพิวเตอร์"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
          />
          <button
            className="btn btn-primary"
            type="submit"
            disabled={submitting}
          >
            <Plus size={16} />
            <span>{submitting ? "กำลังเพิ่ม..." : "เพิ่มหมวดหมู่"}</span>
          </button>
        </form>
      </div>

      {/* Categories Table */}
      <div className="table-card">
        <div className="table-responsive">
          <table className="modern-table">
            <thead>
              <tr>
                <th style={{ width: "60px" }}>#</th>
                <th>ชื่อหมวดหมู่ครุภัณฑ์</th>
                <th style={{ textAlign: "right" }}>จัดการ</th>
              </tr>
            </thead>
            <tbody>
              {categories.length === 0 ? (
                <tr>
                  <td colSpan={3} className="table-empty-row">
                    ยังไม่มีหมวดหมู่ครุภัณฑ์ในระบบ
                  </td>
                </tr>
              ) : (
                categories.map((c, index) => {
                  const catName = c.category_name || c.name;
                  const isEditing = editingId === c.id;

                  return (
                    <tr key={c.id}>
                      <td style={{ color: "#94a3b8" }}>{index + 1}</td>
                      <td>
                        {isEditing ? (
                          <div style={{ display: "flex", gap: "8px", maxWidth: 400 }}>
                            <input
                              className="form-control"
                              value={editingName}
                              onChange={(e) => setEditingName(e.target.value)}
                              autoFocus
                            />
                            <button
                              type="button"
                              className="btn btn-primary"
                              style={{ padding: "6px 10px" }}
                              onClick={() => saveEdit(c.id)}
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-secondary"
                              style={{ padding: "6px 10px" }}
                              onClick={() => setEditingId(null)}
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                            <span className="category-pill">{catName}</span>
                          </div>
                        )}
                      </td>
                      <td style={{ textAlign: "right" }}>
                        {!isEditing && (
                          <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                            <button
                              type="button"
                              className="action-btn-link"
                              onClick={() => startEdit(c)}
                            >
                              แก้ไข
                            </button>
                            <button
                              type="button"
                              className="action-btn-link danger"
                              onClick={() => handleDelete(c)}
                            >
                              ลบ
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
