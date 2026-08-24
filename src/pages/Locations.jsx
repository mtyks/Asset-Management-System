import { useEffect, useState } from "react";
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

export default function Locations() {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [rooms, setRooms] = useState([]);
  const [error, setError] = useState(null);

  const [newBuilding, setNewBuilding] = useState({ code: "", name: "" });
  const [newFloor, setNewFloor] = useState({ buildingCode: "", floorNumber: "", floorName: "" });
  const [newRoom, setNewRoom] = useState({ floorCode: "", code: "", name: "" });

  const [editingBuildingCode, setEditingBuildingCode] = useState(null);
  const [editingBuildingName, setEditingBuildingName] = useState("");
  const [editingFloorCode, setEditingFloorCode] = useState(null);
  const [editingFloor, setEditingFloor] = useState({ floorNumber: "", floorName: "" });
  const [editingRoomCode, setEditingRoomCode] = useState(null);
  const [editingRoomName, setEditingRoomName] = useState("");

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
    if (!window.confirm(`ลบตึก "${b.name}" (${b.building_code}) ใช่ไหม? (ต้องไม่มีชั้นเหลืออยู่ในตึกนี้)`)) return;
    try {
      await deleteBuilding(b.building_code);
      refreshBuildings();
    } catch (err) {
      setError("ลบไม่สำเร็จ (อาจมีชั้นผูกอยู่กับตึกนี้): " + err.message);
    }
  }

  // --- ชั้น ---
  async function handleAddFloor(e) {
    e.preventDefault();
    try {
      await createFloor(newFloor.buildingCode, Number(newFloor.floorNumber), newFloor.floorName || null);
      setNewFloor({ buildingCode: "", floorNumber: "", floorName: "" });
      refreshFloors();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditFloor(f) {
    setEditingFloorCode(f.floor_code);
    setEditingFloor({ floorNumber: f.floor_number, floorName: f.floor_name || "" });
  }

  async function saveEditFloor(floorCode) {
    try {
      await updateFloor(floorCode, Number(editingFloor.floorNumber), editingFloor.floorName || null);
      setEditingFloorCode(null);
      refreshFloors();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFloor(f) {
    if (!window.confirm(`ลบชั้นนี้ใช่ไหม? (ต้องไม่มีห้องเหลืออยู่ในชั้นนี้)`)) return;
    try {
      await deleteFloor(f.floor_code);
      refreshFloors();
    } catch (err) {
      setError("ลบไม่สำเร็จ (อาจมีห้องผูกอยู่กับชั้นนี้): " + err.message);
    }
  }

  // --- ห้อง ---
  async function handleAddRoom(e) {
    e.preventDefault();
    try {
      await createRoom(newRoom.floorCode, newRoom.code, newRoom.name);
      setNewRoom({ floorCode: "", code: "", name: "" });
      refreshRooms();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditRoom(r) {
    setEditingRoomCode(r.room_code);
    setEditingRoomName(r.room_name);
  }

  async function saveEditRoom(roomCode) {
    try {
      await updateRoom(roomCode, editingRoomName);
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
      <h1>จัดการตึก / ชั้น / ห้อง</h1>
      {error && <p className="form-error">{error}</p>}

      <div className="location-columns">
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
          <h2>ชั้น</h2>
          <form className="inline-form" onSubmit={handleAddFloor}>
            <select
              value={newFloor.buildingCode}
              onChange={(e) => setNewFloor((v) => ({ ...v, buildingCode: e.target.value }))}
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
              value={newFloor.floorNumber}
              onChange={(e) => setNewFloor((v) => ({ ...v, floorNumber: e.target.value }))}
              required
              style={{ maxWidth: 90 }}
            />
            <input
              placeholder="ชื่อชั้น (ถ้ามี)"
              value={newFloor.floorName}
              onChange={(e) => setNewFloor((v) => ({ ...v, floorName: e.target.value }))}
            />
            <button className="btn btn-secondary" type="submit">
              + เพิ่มชั้น
            </button>
          </form>
          <ul className="simple-list">
            {floors.map((f) => (
              <li key={f.floor_code} className="editable-row">
                {editingFloorCode === f.floor_code ? (
                  <span className="inline-edit-row">
                    <input
                      type="number"
                      value={editingFloor.floorNumber}
                      onChange={(e) => setEditingFloor((v) => ({ ...v, floorNumber: e.target.value }))}
                      autoFocus
                      style={{ width: 70 }}
                    />
                    <input
                      value={editingFloor.floorName}
                      onChange={(e) => setEditingFloor((v) => ({ ...v, floorName: e.target.value }))}
                      placeholder="ชื่อชั้น"
                    />
                    <button className="btn btn-secondary" onClick={() => saveEditFloor(f.floor_code)}>
                      บันทึก
                    </button>
                    <button className="btn btn-ghost-dark" onClick={() => setEditingFloorCode(null)}>
                      ยกเลิก
                    </button>
                  </span>
                ) : (
                  <>
                    <span>
                      {f.buildings?.name} — ชั้น {f.floor_number} {f.floor_name || ""}
                    </span>
                    <span className="row-actions">
                      <button className="link inline-edit-btn" onClick={() => startEditFloor(f)}>
                        แก้ไข
                      </button>
                      <button className="link inline-edit-btn danger" onClick={() => handleDeleteFloor(f)}>
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
              value={newRoom.floorCode}
              onChange={(e) => setNewRoom((v) => ({ ...v, floorCode: e.target.value }))}
              required
            >
              <option value="">-- เลือกชั้น --</option>
              {floors.map((f) => (
                <option key={f.floor_code} value={f.floor_code}>
                  {f.buildings?.name} ชั้น {f.floor_number}
                </option>
              ))}
            </select>
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
                      value={editingRoomName}
                      onChange={(e) => setEditingRoomName(e.target.value)}
                      autoFocus
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
                      <span className="code-tag">{r.room_code}</span> {r.floors?.buildings?.name} ชั้น{" "}
                      {r.floors?.floor_number} — {r.room_name}
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
