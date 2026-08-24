import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { listAssets, listCategories } from "../lib/queries";
import StatusBadge from "../components/StatusBadge";

export default function AssetsList() {
  const [assets, setAssets] = useState([]);
  const [categories, setCategories] = useState([]);
  const [filters, setFilters] = useState({ status: "", categoryId: "", search: "" });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    listCategories().then(setCategories).catch((err) => setError(err.message));
  }, []);

  useEffect(() => {
    setLoading(true);
    listAssets(filters)
      .then(setAssets)
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [filters]);

  return (
    <div className="page">
      <div className="page-header">
        <h1>รายการครุภัณฑ์</h1>
        <Link to="/assets/new" className="btn btn-primary">
          + เพิ่มครุภัณฑ์ใหม่
        </Link>
      </div>

      <div className="filter-bar">
        <input
          type="text"
          placeholder="ค้นหาชื่อสิ่งของ..."
          value={filters.search}
          onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value }))}
        />
        <select
          value={filters.status}
          onChange={(e) => setFilters((f) => ({ ...f, status: e.target.value }))}
        >
          <option value="">ทุกสถานะ</option>
          <option value="normal">ปกติ</option>
          <option value="repair">ซ่อม</option>
          <option value="borrowed">ถูกยืม</option>
          <option value="damaged">ชำรุด</option>
          <option value="disposed">รอจำหน่าย</option>
        </select>
        <select
          value={filters.categoryId}
          onChange={(e) => setFilters((f) => ({ ...f, categoryId: e.target.value }))}
        >
          <option value="">ทุกประเภท</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.category_name}
            </option>
          ))}
        </select>
      </div>

      {error && <p className="form-error">โหลดข้อมูลไม่สำเร็จ: {error}</p>}
      {loading ? (
        <div className="page-loading">กำลังโหลด...</div>
      ) : (
        <table className="data-table">
          <thead>
            <tr>
              <th>รูป</th>
              <th>รหัส</th>
              <th>ชื่อ</th>
              <th>ประเภท</th>
              <th>สถานะ</th>
              <th>ตำแหน่ง</th>
              <th>ผู้รับผิดชอบ</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {assets.length === 0 && (
              <tr>
                <td colSpan={8} className="empty-row">
                  ยังไม่มีครุภัณฑ์ตามเงื่อนไขที่เลือก
                </td>
              </tr>
            )}
            {assets.map((a) => (
              <tr key={a.id}>
                <td>
                  {a.image_url ? (
                    <img src={a.image_url} alt={a.name} className="row-thumb" />
                  ) : (
                    <span className="row-thumb-placeholder" />
                  )}
                </td>
                <td>{a.asset_code}</td>
                <td>{a.name}</td>
                <td>{a.asset_categories?.category_name || "-"}</td>
                <td>
                  <StatusBadge status={a.status} />
                </td>
                <td>
                  {a.rooms
                    ? `${a.rooms.floors?.buildings?.name || ""} ชั้น ${a.rooms.floors?.floor_number || ""} ห้อง ${a.rooms.room_name}`
                    : "-"}
                </td>
                <td>{a.responsible_person || "-"}</td>
                <td>
                  <Link to={`/asset/${a.asset_code}`} className="link">
                    ดู
                  </Link>
                  {" · "}
                  <Link to={`/assets/${a.id}/edit`} className="link">
                    แก้ไข
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
