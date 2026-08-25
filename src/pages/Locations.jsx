import { useEffect, useState } from "react";
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

export default function Locations() {
  const [buildings, setBuildings] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);

  const [newBuilding, setNewBuilding] = useState({ code: "", name: "" });
  const [newRoom, setNewRoom] = useState({ buildingCode: "", floorNumber: "", code: "", name: "" });

  const [editingBuildingCode, setEditingBuildingCode] = useState(null);
  const [editingBuildingName, setEditingBuildingName] = useState("");
  const [editingRoomCode, setEditingRoomCode] = useState(null);
  const [editingRoom, setEditingRoom] = useState({ floorNumber: "", name: "" });

  function refreshBuildings() {
    listBuildings().then(setBuildings).catch((err) => setError(err.message));
  }
  function refreshRooms() {
    listRooms().then(setRooms).catch((err) => setError(err.message));
  }

  useEffect(() => {
    refreshBuildings();
    refreshRooms();
  }, []);

  // --- ตึก ---
  async function handleAddBuilding(e) {
    e.preventDefault();
    try {
      await createBuilding(newBuilding.code, newBuilding.name);
      setNewBuilding({ code: "", name: "" });
      refreshBuildings();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditBuilding(b) {
    setEditingBuildingCode(b.building_code);
    setEditingBuildingName(b.name);
  }

  async function saveEditBuilding(buildingCode) {
    try {
      await updateBuilding(buildingCode, editingBuildingName);
      setEditingBuildingCode(null);
      refreshBuildings();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteBuilding(b) {
    if (!window.confirm(`ลบตึก "${b.name}" (${b.building_code}) ใช่ไหม? (ต้องไม่มีห้องเหลืออยู่ในตึกนี้)`)) return;
    try {
      await deleteBuilding(b.building_code);
      refreshBuildings();
    } catch (err) {
      setError("ลบไม่สำเร็จ (อาจมีห้องผูกอยู่กับตึกนี้): " + err.message);
    }
  }

  // --- ห้อง ---
  async function handleAddRoom(e) {
    e.preventDefault();
    try {
      await createRoom(newRoom.buildingCode, Number(newRoom.floorNumber), newRoom.code, newRoom.name);
      setNewRoom({ buildingCode: "", floorNumber: "", code: "", name: "" });
      refreshRooms();
    } catch (err) {
      setError(err.message);
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
      refreshRooms();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteRoom(r) {
    if (!window.confirm(`ลบห้อง "${r.room_name}" (${r.room_code}) ใช่ไหม? (ครุภัณฑ์ที่อยู่ในห้องนี้จะไม่มีตำแหน่งกำกับ)`)) return;
    try {
      await deleteRoom(r.room_code);
      refreshRooms();
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <h1>จัดการตึก / ห้อง</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="location-columns-2">
        <section className="location-column">
          <h2>ตึก</h2>
          <form className="inline-form" onSubmit={handleAddBuilding}>
            <input
              placeholder="รหัสตึก เช่น MAIN"
              value={newBuilding.code}
              onChange={(e) => setNewBuilding((v) => ({ ...v, code: e.target.value }))}
              required
              style={{ maxWidth: 110 }}
            />
            <input
              placeholder="ชื่อตึก"
              value={newBuilding.name}
              onChange={(e) => setNewBuilding((v) => ({ ...v, name: e.target.value }))}
              required
            />
            <button className="btn btn-secondary" type="submit">
              + เพิ่มตึก
            </button>
          </form>
          <ul className="simple-list">
            {buildings.map((b) => (
              <li key={b.building_code} className="editable-row">
                {editingBuildingCode === b.building_code ? (
                  <span className="inline-edit-row">
                    <input
                      value={editingBuildingName}
                      onChange={(e) => setEditingBuildingName(e.target.value)}
                      autoFocus
                    />
                    <button className="btn btn-secondary" onClick={() => saveEditBuilding(b.building_code)}>
                      บันทึก
                    </button>
                    <button className="btn btn-ghost-dark" onClick={() => setEditingBuildingCode(null)}>
                      ยกเลิก
                    </button>
                  </span>
                ) : (
                  <>
                    <span>
                      <span className="code-tag">{b.building_code}</span> {b.name}
                    </span>
                    <span className="row-actions">
                      <button className="link inline-edit-btn" onClick={() => startEditBuilding(b)}>
                        แก้ไข
                      </button>
                      <button className="link inline-edit-btn danger" onClick={() => handleDeleteBuilding(b)}>
                        ลบ
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>

        <section className="location-column">
          <h2>ห้อง</h2>
          <form className="inline-form" onSubmit={handleAddRoom}>
            <select
              value={newRoom.buildingCode}
              onChange={(e) => setNewRoom((v) => ({ ...v, buildingCode: e.target.value }))}
              required
            >
              <option value="">-- เลือกตึก --</option>
              {buildings.map((b) => (
                <option key={b.building_code} value={b.building_code}>
                  {b.name}
                </option>
              ))}
            </select>
            <input
              type="number"
              placeholder="ชั้นที่"
              value={newRoom.floorNumber}
              onChange={(e) => setNewRoom((v) => ({ ...v, floorNumber: e.target.value }))}
              required
              style={{ maxWidth: 90 }}
            />
            <input
              placeholder="รหัสห้อง เช่น R101"
              value={newRoom.code}
              onChange={(e) => setNewRoom((v) => ({ ...v, code: e.target.value }))}
              required
              style={{ maxWidth: 110 }}
            />
            <input
              placeholder="ชื่อห้อง"
              value={newRoom.name}
              onChange={(e) => setNewRoom((v) => ({ ...v, name: e.target.value }))}
              required
            />
            <button className="btn btn-secondary" type="submit">
              + เพิ่มห้อง
            </button>
          </form>
          <ul className="simple-list">
            {rooms.map((r) => (
              <li key={r.room_code} className="editable-row">
                {editingRoomCode === r.room_code ? (
                  <span className="inline-edit-row">
                    <input
                      type="number"
                      value={editingRoom.floorNumber}
                      onChange={(e) => setEditingRoom((v) => ({ ...v, floorNumber: e.target.value }))}
                      autoFocus
                      style={{ width: 70 }}
                    />
                    <input
                      value={editingRoom.name}
                      onChange={(e) => setEditingRoom((v) => ({ ...v, name: e.target.value }))}
                      placeholder="ชื่อห้อง"
                    />
                    <button className="btn btn-secondary" onClick={() => saveEditRoom(r.room_code)}>
                      บันทึก
                    </button>
                    <button className="btn btn-ghost-dark" onClick={() => setEditingRoomCode(null)}>
                      ยกเลิก
                    </button>
                  </span>
                ) : (
                  <>
                    <span>
                      <span className="code-tag">{r.room_code}</span> {r.buildings?.name} ชั้น {r.floor_number} —{" "}
                      {r.room_name}
                    </span>
                    <span className="row-actions">
                      <button className="link inline-edit-btn" onClick={() => startEditRoom(r)}>
                        แก้ไข
                      </button>
                      <button className="link inline-edit-btn danger" onClick={() => handleDeleteRoom(r)}>
                        ลบ
                      </button>
                    </span>
                  </>
                )}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
