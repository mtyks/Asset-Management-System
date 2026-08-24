import { useEffect, useState } from "react";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../lib/queries";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [editingCode, setEditingCode] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState(null);

  function refresh() {
    listCategories().then(setCategories).catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await createCategory(code, name);
      setCode("");
      setName("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingCode(c.category_code);
    setEditingName(c.category_name);
  }

  async function saveEdit(categoryCode) {
    try {
      await updateCategory(categoryCode, editingName);
      setEditingCode(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`ลบประเภท "${c.category_name}" (${c.category_code}) ใช่ไหม? (ครุภัณฑ์ที่ใช้ประเภทนี้อยู่จะยังอยู่ แต่จะไม่มีประเภทกำกับ)`)) {
      return;
    }
    try {
      await deleteCategory(c.category_code);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>ประเภทครุภัณฑ์</h1>
      {error && <p className="form-error">{error}</p>}

      <form className="inline-form" onSubmit={handleAdd}>
        <input
          placeholder="รหัสประเภท เช่น CAT-01"
          value={code}
          onChange={(e) => setCode(e.target.value)}
          required
          style={{ maxWidth: 140 }}
        />
        <input
          placeholder="ชื่อประเภท เช่น เฟอร์นิเจอร์"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
        />
        <button className="btn btn-secondary" type="submit">
          + เพิ่มประเภท
        </button>
      </form>

      <ul className="simple-list">
        {categories.map((c) => (
          <li key={c.category_code} className="editable-row">
            {editingCode === c.category_code ? (
              <span className="inline-edit-row">
                <input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                <button className="btn btn-secondary" onClick={() => saveEdit(c.category_code)}>
                  บันทึก
                </button>
                <button className="btn btn-ghost-dark" onClick={() => setEditingCode(null)}>
                  ยกเลิก
                </button>
              </span>
            ) : (
              <>
                <span>
                  <span className="code-tag">{c.category_code}</span> {c.category_name}
                </span>
                <span className="row-actions">
                  <button className="link inline-edit-btn" onClick={() => startEdit(c)}>
                    แก้ไข
                  </button>
                  <button className="link inline-edit-btn danger" onClick={() => handleDelete(c)}>
                    ลบ
                  </button>
                </span>
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
