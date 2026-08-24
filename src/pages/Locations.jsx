import React, { useEffect, useState } from "react";
import {
  listBuildings,
  createBuilding,
  deleteBuilding,
  listFloors,
  createFloor,
  deleteFloor,
  listRooms,
  createRoom,
  deleteRoom,
} from "../lib/queries";
import { Building, Plus, Trash2, MapPin, Layers, AlertTriangle } from "lucide-react";

export default function Locations() {
  const [activeTab, setActiveTab] = useState("rooms"); // 'rooms' | 'buildings' | 'floors'
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Forms State
  const [newBuilding, setNewBuilding] = useState({ name: "", code: "" });
  const [newFloor, setNewFloor] = useState({ buildingId: "", floorNumber: "1", floorName: "" });
  const [newRoom, setNewRoom] = useState({ buildingId: "", floorId: "", roomName: "", roomCode: "" });

  const [availableFloorsForRoom, setAvailableFloorsForRoom] = useState([]);
  const [deletingId, setDeletingId] = useState(null);

  const refreshAll = () => {
    setLoading(true);
    Promise.all([
      listBuildings().then(setBuildings).catch((err) => setError(err.message)),
      listFloors().then(setFloors).catch((err) => setError(err.message)),
      listRooms().then(setRooms).catch((err) => setError(err.message)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // Update available floors when room form building changes
  useEffect(() => {
    if (newRoom.buildingId) {
      listFloors(newRoom.buildingId).then(setAvailableFloorsForRoom).catch(() => {});
    } else {
      setAvailableFloorsForRoom(floors);
    }
  }, [newRoom.buildingId, floors]);

  // --- 1. Add Room ---
  async function handleAddRoom(e) {
    e.preventDefault();
    if (!newRoom.roomName.trim()) {
      alert("กรุณาระบุชื่อห้อง");
      return;
    }
    setError(null);
    try {
      await createRoom(
        newRoom.floorId || null,
        newRoom.roomName.trim(),
        newRoom.roomCode.trim() || null
      );
      setNewRoom({ buildingId: "", floorId: "", roomName: "", roomCode: "" });
      refreshAll();
    } catch (err) {
      setError("เพิ่มห้องไม่สำเร็จ: " + err.message);
    }
  }

  // --- 2. Add Building ---
  async function handleAddBuilding(e) {
    e.preventDefault();
    if (!newBuilding.name.trim()) {
      alert("กรุณาระบุชื่ออาคาร");
      return;
    }
    setError(null);
    try {
      await createBuilding(newBuilding.name.trim(), newBuilding.code.trim() || null);
      setNewBuilding({ name: "", code: "" });
      refreshAll();
    } catch (err) {
      setError("เพิ่มอาคารไม่สำเร็จ: " + err.message);
    }
  }

  // --- 3. Add Floor ---
  async function handleAddFloor(e) {
    e.preventDefault();
    setError(null);
    try {
      await createFloor(
        newFloor.buildingId || null,
        newFloor.floorNumber,
        newFloor.floorName.trim() || null
      );
      setNewFloor({ buildingId: "", floorNumber: "1", floorName: "" });
      refreshAll();
    } catch (err) {
      setError("เพิ่มชั้นไม่สำเร็จ: " + err.message);
    }
  }

  // --- Delete handlers ---
  async function handleDeleteRoom(id) {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบห้องนี้?")) return;
    try {
      setDeletingId(id);
      await deleteRoom(id);
      refreshAll();
    } catch (err) {
      alert("ลบห้องไม่สำเร็จ: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteBuilding(id) {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบอาคารนี้? (หากมีห้องอยู่ภายในจะลบไม่ได้)")) return;
    try {
      setDeletingId(id);
      await deleteBuilding(id);
      refreshAll();
    } catch (err) {
      alert("ลบอาคารไม่สำเร็จ: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  async function handleDeleteFloor(id) {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบชั้นนี้? (หากมีห้องอยู่ภายในจะลบไม่ได้)")) return;
    try {
      setDeletingId(id);
      await deleteFloor(id);
      refreshAll();
    } catch (err) {
      alert("ลบชั้นไม่สำเร็จ: " + err.message);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>สถานที่ / อาคาร / ห้อง</h1>
          <p className="page-subtitle">
            จัดการโครงสร้างผังที่ตั้งของครุภัณฑ์ (อาคาร &gt; ชั้น &gt; ห้อง / จุดประจำ)
          </p>
        </div>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px", flexWrap: "wrap" }}>
        <button
          className={`btn ${activeTab === "rooms" ? "btn-primary" : "btn-outline-white"}`}
          onClick={() => setActiveTab("rooms")}
        >
          <MapPin size={16} />
          <span>ห้อง / จุดประจำ ({rooms.length})</span>
        </button>
        <button
          className={`btn ${activeTab === "buildings" ? "btn-primary" : "btn-outline-white"}`}
          onClick={() => setActiveTab("buildings")}
        >
          <Building size={16} />
          <span>อาคาร / ตึก ({buildings.length})</span>
        </button>
        <button
          className={`btn ${activeTab === "floors" ? "btn-primary" : "btn-outline-white"}`}
          onClick={() => setActiveTab("floors")}
        >
          <Layers size={16} />
          <span>ชั้น ({floors.length})</span>
        </button>
      </div>

      {/* Tab 1: Rooms */}
      {activeTab === "rooms" && (
        <>
          <div className="form-card">
            <h3 style={{ margin: "0 0 14px", fontSize: "1.05rem", fontWeight: 700 }}>
              + เพิ่มห้อง / จุดประจำใหม่
            </h3>
            <form onSubmit={handleAddRoom}>
              <div className="form-grid">
                <div className="form-group">
                  <label>ชื่อห้อง / จุดประจำ *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น ห้องธุรการ, ห้องประชุม 1, ห้องคอมพิวเตอร์"
                    value={newRoom.roomName}
                    onChange={(e) => setNewRoom((r) => ({ ...r, roomName: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>รหัสห้อง (Room Code)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น RM-101 หรือ LOC-01"
                    value={newRoom.roomCode}
                    onChange={(e) => setNewRoom((r) => ({ ...r, roomCode: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>อาคาร / ตึก</label>
                  <select
                    className="form-control"
                    value={newRoom.buildingId}
                    onChange={(e) =>
                      setNewRoom((r) => ({ ...r, buildingId: e.target.value, floorId: "" }))
                    }
                  >
                    <option value="">-- ไม่ระบุ (ระบบจะจัดเข้าอาคารหลักอัตโนมัติ) --</option>
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
                    className="form-control"
                    value={newRoom.floorId}
                    onChange={(e) => setNewRoom((r) => ({ ...r, floorId: e.target.value }))}
                  >
                    <option value="">-- ไม่ระบุ (ระบบจะจัดเข้าชั้น 1 อัตโนมัติ) --</option>
                    {availableFloorsForRoom.map((f) => (
                      <option key={f.id} value={f.id}>
                        {f.buildings?.name ? `${f.buildings.name} - ` : ""}
                        {f.floor_name || `ชั้น ${f.floor_number}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>บันทึกห้องใหม่</span>
                </button>
              </div>
            </form>
          </div>

          <div className="table-card">
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>รหัสห้อง</th>
                    <th>ชื่อห้อง / จุดประจำ</th>
                    <th>อาคาร</th>
                    <th>ชั้น</th>
                    <th style={{ textAlign: "right" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={5} className="table-empty-row">
                        กำลังโหลดข้อมูลห้อง...
                      </td>
                    </tr>
                  ) : rooms.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="table-empty-row">
                        ยังไม่มีข้อมูลห้องในระบบ กรุณากรอกแบบฟอร์มด้านบนเพื่อเพิ่มห้องแรก
                      </td>
                    </tr>
                  ) : (
                    rooms.map((r) => {
                      const buildingName = r.floors?.buildings?.name || "อาคารหลัก";
                      const floorName = r.floors?.floor_name || (r.floors?.floor_number ? `ชั้น ${r.floors.floor_number}` : "ชั้น 1");
                      return (
                        <tr key={r.id}>
                          <td style={{ fontWeight: 700, fontFamily: "monospace" }}>
                            {r.room_code || "-"}
                          </td>
                          <td style={{ fontWeight: 600, color: "#0f172a" }}>{r.room_name}</td>
                          <td>
                            <span className="category-pill">{buildingName}</span>
                          </td>
                          <td>{floorName}</td>
                          <td style={{ textAlign: "right" }}>
                            <button
                              type="button"
                              className="action-btn-link danger"
                              onClick={() => handleDeleteRoom(r.id)}
                              disabled={deletingId === r.id}
                            >
                              ลบ
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 2: Buildings */}
      {activeTab === "buildings" && (
        <>
          <div className="form-card">
            <h3 style={{ margin: "0 0 14px", fontSize: "1.05rem", fontWeight: 700 }}>
              + เพิ่มอาคาร / ตึกใหม่
            </h3>
            <form onSubmit={handleAddBuilding}>
              <div className="form-grid">
                <div className="form-group">
                  <label>ชื่ออาคาร / ตึก *</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น อาคารอำนวยการ, อาคาร 1"
                    value={newBuilding.name}
                    onChange={(e) => setNewBuilding((b) => ({ ...b, name: e.target.value }))}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>รหัสอาคาร</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น BLD-01"
                    value={newBuilding.code}
                    onChange={(e) => setNewBuilding((b) => ({ ...b, code: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>บันทึกอาคาร</span>
                </button>
              </div>
            </form>
          </div>

          <div className="table-card">
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>รหัสอาคาร</th>
                    <th>ชื่ออาคาร / ตึก</th>
                    <th style={{ textAlign: "right" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="table-empty-row">
                        ยังไม่มีข้อมูลอาคารในระบบ
                      </td>
                    </tr>
                  ) : (
                    buildings.map((b) => (
                      <tr key={b.id}>
                        <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{b.code || "-"}</td>
                        <td style={{ fontWeight: 600, color: "#0f172a" }}>{b.name}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="action-btn-link danger"
                            onClick={() => handleDeleteBuilding(b.id)}
                            disabled={deletingId === b.id}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* Tab 3: Floors */}
      {activeTab === "floors" && (
        <>
          <div className="form-card">
            <h3 style={{ margin: "0 0 14px", fontSize: "1.05rem", fontWeight: 700 }}>
              + เพิ่มชั้นใหม่
            </h3>
            <form onSubmit={handleAddFloor}>
              <div className="form-grid">
                <div className="form-group">
                  <label>เลือกอาคาร *</label>
                  <select
                    className="form-control"
                    value={newFloor.buildingId}
                    onChange={(e) => setNewFloor((f) => ({ ...f, buildingId: e.target.value }))}
                  >
                    <option value="">-- ไม่ระบุ (จัดเข้าอาคารหลักอัตโนมัติ) --</option>
                    {buildings.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>เลขชั้น (ตัวเลข) *</label>
                  <input
                    type="number"
                    min="1"
                    max="99"
                    className="form-control"
                    value={newFloor.floorNumber}
                    onChange={(e) => setNewFloor((f) => ({ ...f, floorNumber: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>ชื่อเรียกชั้น (ไม่บังคับ)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น ชั้น 1 โถงกลาง"
                    value={newFloor.floorName}
                    onChange={(e) => setNewFloor((f) => ({ ...f, floorName: e.target.value }))}
                  />
                </div>
              </div>
              <div className="form-actions" style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>บันทึกชั้น</span>
                </button>
              </div>
            </form>
          </div>

          <div className="table-card">
            <div className="table-responsive">
              <table className="modern-table">
                <thead>
                  <tr>
                    <th>อาคาร</th>
                    <th>เลขชั้น</th>
                    <th>ชื่อเรียกชั้น</th>
                    <th style={{ textAlign: "right" }}>จัดการ</th>
                  </tr>
                </thead>
                <tbody>
                  {floors.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="table-empty-row">
                        ยังไม่มีข้อมูลชั้นในระบบ
                      </td>
                    </tr>
                  ) : (
                    floors.map((f) => (
                      <tr key={f.id}>
                        <td>
                          <span className="category-pill">{f.buildings?.name || "อาคารหลัก"}</span>
                        </td>
                        <td style={{ fontWeight: 700 }}>ชั้น {f.floor_number}</td>
                        <td>{f.floor_name || "-"}</td>
                        <td style={{ textAlign: "right" }}>
                          <button
                            type="button"
                            className="action-btn-link danger"
                            onClick={() => handleDeleteFloor(f.id)}
                            disabled={deletingId === f.id}
                          >
                            ลบ
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
