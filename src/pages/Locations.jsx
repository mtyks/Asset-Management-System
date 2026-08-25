import React, { useEffect, useState } from "react";
import {
  listBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../lib/queries";
import { Building, Plus, Trash2, MapPin, Edit, Check, X, AlertTriangle } from "lucide-react";

export default function Locations() {
  const [activeTab, setActiveTab] = useState("rooms"); // 'rooms' | 'buildings'
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);

  // Form State: Add Room
  const [newRoom, setNewRoom] = useState({
    code: "",
    name: "",
    buildingCode: "",
    floorNumber: "1",
  });

  // Form State: Add Building
  const [newBuilding, setNewBuilding] = useState({
    code: "",
    name: "",
  });

  // Edit States
  const [editingBuildingCode, setEditingBuildingCode] = useState(null);
  const [editingBuildingName, setEditingBuildingName] = useState("");
  const [editingRoomCode, setEditingRoomCode] = useState(null);
  const [editingRoom, setEditingRoom] = useState({ floorNumber: "", name: "" });

  const refreshAll = () => {
    setLoading(true);
    Promise.all([
      listBuildings().then(setBuildings).catch((err) => setError(err.message)),
      listRooms().then(setRooms).catch((err) => setError(err.message)),
    ]).finally(() => setLoading(false));
  };

  useEffect(() => {
    refreshAll();
  }, []);

  // --- Add Room ---
  async function handleAddRoom(e) {
    e.preventDefault();
    if (!newRoom.name.trim() || !newRoom.buildingCode) {
      alert("กรุณาระบุชื่อห้องและเลือกอาคาร");
      return;
    }
    setError(null);
    try {
      const code = newRoom.code.trim() || `R-${Date.now().toString().slice(-4)}`;
      await createRoom(
        newRoom.buildingCode,
        Number(newRoom.floorNumber) || 1,
        code,
        newRoom.name.trim()
      );
      setNewRoom({ code: "", name: "", buildingCode: "", floorNumber: "1" });
      refreshAll();
    } catch (err) {
      setError("เพิ่มห้องไม่สำเร็จ: " + err.message);
    }
  }

  // --- Add Building ---
  async function handleAddBuilding(e) {
    e.preventDefault();
    if (!newBuilding.name.trim()) {
      alert("กรุณาระบุชื่ออาคาร");
      return;
    }
    setError(null);
    try {
      const code = newBuilding.code.trim() || `BLD-${Date.now().toString().slice(-4)}`;
      await createBuilding(code, newBuilding.name.trim());
      setNewBuilding({ code: "", name: "" });
      refreshAll();
    } catch (err) {
      setError("เพิ่มอาคารไม่สำเร็จ: " + err.message);
    }
  }

  // --- Edit Handlers ---
  function startEditBuilding(b) {
    setEditingBuildingCode(b.building_code);
    setEditingBuildingName(b.name);
  }

  async function saveEditBuilding(buildingCode) {
    try {
      await updateBuilding(buildingCode, editingBuildingName);
      setEditingBuildingCode(null);
      refreshAll();
    } catch (err) {
      setError("แก้ไขอาคารไม่สำเร็จ: " + err.message);
    }
  }

  function startEditRoom(r) {
    setEditingRoomCode(r.room_code);
    setEditingRoom({ floorNumber: r.floor_number, name: r.room_name });
  }

  async function saveEditRoom(roomCode) {
    try {
      await updateRoom(roomCode, Number(editingRoom.floorNumber), editingRoom.name);
      setEditingRoomCode(null);
      refreshAll();
    } catch (err) {
      setError("แก้ไขห้องไม่สำเร็จ: " + err.message);
    }
  }

  // --- Delete Handlers ---
  async function handleDeleteRoom(roomCode) {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบห้องนี้?")) return;
    try {
      await deleteRoom(roomCode);
      refreshAll();
    } catch (err) {
      alert("ลบห้องไม่สำเร็จ: " + err.message);
    }
  }

  async function handleDeleteBuilding(buildingCode) {
    if (!window.confirm("คุณแน่ใจหรือไม่ว่าต้องการลบอาคารนี้? (ต้องไม่มีห้องที่ผูกกับอาคารนี้)")) return;
    try {
      await deleteBuilding(buildingCode);
      refreshAll();
    } catch (err) {
      alert("ลบอาคารไม่สำเร็จ (อาจมีห้องผูกอยู่): " + err.message);
    }
  }

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>สถานที่ / อาคาร / ห้อง</h1>
          <p className="page-subtitle">
            จัดการโครงสร้างที่ตั้งของครุภัณฑ์ (อาคาร &gt; ชั้น &gt; ห้อง / จุดประจำ)
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
                    value={newRoom.name}
                    onChange={(e) => setNewRoom((r) => ({ ...r, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>รหัสห้อง (Room Code)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น R101, RM-201"
                    value={newRoom.code}
                    onChange={(e) => setNewRoom((r) => ({ ...r, code: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-grid">
                <div className="form-group">
                  <label>อาคาร / ตึก *</label>
                  <select
                    className="form-control"
                    value={newRoom.buildingCode}
                    onChange={(e) =>
                      setNewRoom((r) => ({ ...r, buildingCode: e.target.value }))
                    }
                    required
                  >
                    <option value="">-- เลือกอาคาร --</option>
                    {buildings.map((b) => (
                      <option key={b.building_code} value={b.building_code}>
                        {b.name} ({b.building_code})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="form-group">
                  <label>ชั้น (ตัวเลข เช่น 1, 2, 3)</label>
                  <input
                    type="number"
                    min="1"
                    className="form-control"
                    value={newRoom.floorNumber}
                    onChange={(e) => setNewRoom((r) => ({ ...r, floorNumber: e.target.value }))}
                    required
                  />
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
                      const isEditing = editingRoomCode === r.room_code;
                      const buildingName = r.buildings?.name || r.building_code || "-";

                      return (
                        <tr key={r.room_code}>
                          <td style={{ fontWeight: 700, fontFamily: "monospace" }}>
                            {r.room_code}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="form-control"
                                value={editingRoom.name}
                                onChange={(e) =>
                                  setEditingRoom((er) => ({ ...er, name: e.target.value }))
                                }
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: "#0f291e" }}>{r.room_name}</span>
                            )}
                          </td>
                          <td>
                            <span className="category-pill">{buildingName}</span>
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                type="number"
                                min="1"
                                className="form-control"
                                style={{ width: 80 }}
                                value={editingRoom.floorNumber}
                                onChange={(e) =>
                                  setEditingRoom((er) => ({ ...er, floorNumber: e.target.value }))
                                }
                              />
                            ) : (
                              <span>ชั้น {r.floor_number}</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: "4px 8px" }}
                                  onClick={() => saveEditRoom(r.room_code)}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: "4px 8px" }}
                                  onClick={() => setEditingRoomCode(null)}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  className="action-btn-link"
                                  onClick={() => startEditRoom(r)}
                                >
                                  แก้ไข
                                </button>
                                <button
                                  type="button"
                                  className="action-btn-link danger"
                                  onClick={() => handleDeleteRoom(r.room_code)}
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
                    placeholder="เช่น อาคารอำนวยการ, อาคารปฏิบัติการ"
                    value={newBuilding.name}
                    onChange={(e) => setNewBuilding((b) => ({ ...b, name: e.target.value }))}
                    required
                  />
                </div>

                <div className="form-group">
                  <label>รหัสอาคาร (Building Code)</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="เช่น MAIN, BLD-01"
                    value={newBuilding.code}
                    onChange={(e) => setNewBuilding((b) => ({ ...b, code: e.target.value }))}
                  />
                </div>
              </div>

              <div className="form-actions" style={{ marginTop: 10 }}>
                <button type="submit" className="btn btn-primary">
                  <Plus size={16} />
                  <span>บันทึกอาคารใหม่</span>
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
                  {loading ? (
                    <tr>
                      <td colSpan={3} className="table-empty-row">
                        กำลังโหลดข้อมูลอาคาร...
                      </td>
                    </tr>
                  ) : buildings.length === 0 ? (
                    <tr>
                      <td colSpan={3} className="table-empty-row">
                        ยังไม่มีข้อมูลอาคารในระบบ
                      </td>
                    </tr>
                  ) : (
                    buildings.map((b) => {
                      const isEditing = editingBuildingCode === b.building_code;

                      return (
                        <tr key={b.building_code}>
                          <td style={{ fontWeight: 700, fontFamily: "monospace" }}>
                            {b.building_code}
                          </td>
                          <td>
                            {isEditing ? (
                              <input
                                className="form-control"
                                value={editingBuildingName}
                                onChange={(e) => setEditingBuildingName(e.target.value)}
                                autoFocus
                              />
                            ) : (
                              <span style={{ fontWeight: 600, color: "#0f291e" }}>{b.name}</span>
                            )}
                          </td>
                          <td style={{ textAlign: "right" }}>
                            {isEditing ? (
                              <div style={{ display: "flex", gap: 6, justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  className="btn btn-primary"
                                  style={{ padding: "4px 8px" }}
                                  onClick={() => saveEditBuilding(b.building_code)}
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  type="button"
                                  className="btn btn-secondary"
                                  style={{ padding: "4px 8px" }}
                                  onClick={() => setEditingBuildingCode(null)}
                                >
                                  <X size={14} />
                                </button>
                              </div>
                            ) : (
                              <div className="table-actions" style={{ justifyContent: "flex-end" }}>
                                <button
                                  type="button"
                                  className="action-btn-link"
                                  onClick={() => startEditBuilding(b)}
                                >
                                  แก้ไข
                                </button>
                                <button
                                  type="button"
                                  className="action-btn-link danger"
                                  onClick={() => handleDeleteBuilding(b.building_code)}
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
        </>
      )}
    </div>
  );
}
