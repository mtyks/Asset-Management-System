import { useEffect, useState } from "react";
import { listCategories, createCategory, updateCategory, deleteCategory } from "../lib/queries";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState("");
  const [error, setError] = useState(null);

  function refresh() {
    listCategories().then(setCategories).catch((err) => setError(err.message));
  }

  useEffect(refresh, []);

  async function handleAdd(e) {
    e.preventDefault();
    try {
      await createCategory(name);
      setName("");
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEdit(c) {
    setEditingId(c.id);
    setEditingName(c.category_name);
  }

  async function saveEdit(id) {
    try {
      await updateCategory(id, editingName);
      setEditingId(null);
      refresh();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDelete(c) {
    if (!window.confirm(`ลบประเภท "${c.category_name}" ใช่ไหม? (ครุภัณฑ์ที่ใช้ประเภทนี้อยู่จะยังอยู่ แต่จะไม่มีประเภทกำกับ)`)) {
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
    <div className="page">
      <h1>ประเภทครุภัณฑ์</h1>
      {error && <p className="form-error">{error}</p>}

      <form className="inline-form" onSubmit={handleAdd}>
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
          <li key={c.id} className="editable-row">
            {editingId === c.id ? (
              <span className="inline-edit-row">
                <input value={editingName} onChange={(e) => setEditingName(e.target.value)} autoFocus />
                <button className="btn btn-secondary" onClick={() => saveEdit(c.id)}>
                  บันทึก
                </button>
                <button className="btn btn-ghost-dark" onClick={() => setEditingId(null)}>
                  ยกเลิก
                </button>
              </span>
            ) : (
              <>
                <span>{c.category_name}</span>
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
