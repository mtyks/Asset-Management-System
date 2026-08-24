import React, { useEffect, useState } from "react";
import {
  listBuildings,
  createBuilding,
  updateBuilding,
  deleteBuilding,
  listFloors,
  createFloor,
  updateFloor,
  deleteFloor,
  listRooms,
  createRoom,
  updateRoom,
  deleteRoom,
} from "../lib/queries";
import { Building, Plus, Edit, Trash2, MapPin, Layers } from "lucide-react";

export default function Locations() {
  const [activeTab, setActiveTab] = useState("rooms"); // 'rooms' | 'buildings' | 'floors'
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);

  const [newBuilding, setNewBuilding] = useState({ name: "", code: "" });
  const [newFloor, setNewFloor] = useState({ buildingId: "", floorNumber: "", floorName: "" });
  const [newRoom, setNewRoom] = useState({ floorId: "", roomName: "", roomCode: "" });

  function refreshBuildings() {
    listBuildings().then(setBuildings).catch((err) => setError(err.message));
  }
  function refreshFloors() {
    listFloors().then(setFloors).catch((err) => setError(err.message));
  }
  function refreshRooms() {
    listRooms().then(setRooms).catch((err) => setError(err.message));
  }

  useEffect(() => {
    refreshBuildings();
    refreshFloors();
    refreshRooms();
  }, []);

  // --- Add Building ---
  async function handleAddBuilding(e) {
    e.preventDefault();
    try {
      await createBuilding(newBuilding.name, newBuilding.code || null);
      setNewBuilding({ name: "", code: "" });
      refreshBuildings();
    } catch (err) {
      setError(err.message);
    }
  }

  // --- Add Room ---
  async function handleAddRoom(e) {
    e.preventDefault();
    try {
      await createRoom(newRoom.floorId, newRoom.roomName, newRoom.roomCode || null);
      setNewRoom({ floorId: "", roomName: "", roomCode: "" });
      refreshRooms();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page-container">
      <div className="page-heading-row">
        <div className="page-title-group">
          <h1>สถานที่ / อาคาร / ห้อง</h1>
          <p className="page-subtitle">
            จัดการโครงสร้างผังที่ตั้งของครุภัณฑ์ (อาคาร &gt; ชั้น &gt; ห้อง)
          </p>
        </div>
      </div>

      {error && <div className="form-error-banner">{error}</div>}

      {/* Tabs */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "18px" }}>
        <button
          className={`btn ${activeTab === "rooms" ? "btn-primary" : "btn-outline-white"}`}
          onClick={() => setActiveTab("rooms")}
        >
          <MapPin size={16} />
          <span>รายชื่อห้องทั้งหมด ({rooms.length})</span>
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
            <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700 }}>
              + เพิ่มห้อง / จุดประจำใหม่
            </h3>
            <form onSubmit={handleAddRoom} className="form-grid" style={{ alignItems: "flex-end", marginBottom: 0 }}>
              <div className="form-group">
                <label>ชื่อห้อง *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น ห้องธุรการและสารบรรณ"
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
                  placeholder="เช่น LOC-01"
                  value={newRoom.roomCode}
                  onChange={(e) => setNewRoom((r) => ({ ...r, roomCode: e.target.value }))}
                />
              </div>

              <div>
                <button type="submit" className="btn btn-primary" style={{ height: "40px" }}>
                  <Plus size={16} />
                  <span>เพิ่มห้อง</span>
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
                    <th>ชื่อห้อง</th>
                    <th>อาคาร / ชั้น</th>
                  </tr>
                </thead>
                <tbody>
                  {rooms.map((r) => (
                    <tr key={r.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{r.room_code || "-"}</td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>{r.room_name}</td>
                      <td>
                        {r.floors?.buildings?.name
                          ? `${r.floors.buildings.name} (ชั้น ${r.floors.floor_number})`
                          : "อาคารอำนวยการ"}
                      </td>
                    </tr>
                  ))}
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
            <h3 style={{ margin: "0 0 14px", fontSize: "1rem", fontWeight: 700 }}>
              + เพิ่มอาคาร / ตึกใหม่
            </h3>
            <form onSubmit={handleAddBuilding} className="form-grid" style={{ alignItems: "flex-end", marginBottom: 0 }}>
              <div className="form-group">
                <label>ชื่ออาคาร *</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="เช่น อาคารอำนวยการ"
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
              <div>
                <button type="submit" className="btn btn-primary" style={{ height: "40px" }}>
                  <Plus size={16} />
                  <span>เพิ่มอาคาร</span>
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
                    <th>ชื่ออาคาร</th>
                  </tr>
                </thead>
                <tbody>
                  {buildings.map((b) => (
                    <tr key={b.id}>
                      <td style={{ fontWeight: 700, fontFamily: "monospace" }}>{b.code || "-"}</td>
                      <td style={{ fontWeight: 600, color: "#0f172a" }}>{b.name}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
