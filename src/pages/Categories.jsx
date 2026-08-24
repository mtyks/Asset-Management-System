import { useEffect, useState } from "react";
import { listCategories, createCategory } from "../lib/queries";

export default function Categories() {
  const [categories, setCategories] = useState([]);
  const [name, setName] = useState("");
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
          <li key={c.id}>{c.category_name}</li>
        ))}
      </ul>
    </div>
  );
}
