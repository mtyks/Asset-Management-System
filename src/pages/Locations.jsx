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

  const [newBuilding, setNewBuilding] = useState({ name: "", code: "" });
  const [newFloor, setNewFloor] = useState({ buildingId: "", floorNumber: "", floorName: "" });
  const [newRoom, setNewRoom] = useState({ floorId: "", roomName: "", roomCode: "" });

  const [editingBuildingId, setEditingBuildingId] = useState(null);
  const [editingBuilding, setEditingBuilding] = useState({ name: "", code: "" });
  const [editingFloorId, setEditingFloorId] = useState(null);
  const [editingFloor, setEditingFloor] = useState({ floorNumber: "", floorName: "" });
  const [editingRoomId, setEditingRoomId] = useState(null);
  const [editingRoom, setEditingRoom] = useState({ roomName: "", roomCode: "" });

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
      await createBuilding(newBuilding.name, newBuilding.code || null);
      setNewBuilding({ name: "", code: "" });
      refreshBuildings();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditBuilding(b) {
    setEditingBuildingId(b.id);
    setEditingBuilding({ name: b.name, code: b.code || "" });
  }

  async function saveEditBuilding(id) {
    try {
      await updateBuilding(id, editingBuilding.name, editingBuilding.code || null);
      setEditingBuildingId(null);
      refreshBuildings();
      refreshFloors();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteBuilding(b) {
    if (!window.confirm(`ลบตึก "${b.name}" ใช่ไหม? (ต้องไม่มีชั้นเหลืออยู่ในตึกนี้)`)) return;
    try {
      await deleteBuilding(b.id);
      refreshBuildings();
    } catch (err) {
      setError("ลบไม่สำเร็จ (อาจมีชั้นผูกอยู่กับตึกนี้): " + err.message);
    }
  }

  // --- ชั้น ---
  async function handleAddFloor(e) {
    e.preventDefault();
    try {
      await createFloor(newFloor.buildingId, Number(newFloor.floorNumber), newFloor.floorName || null);
      setNewFloor({ buildingId: "", floorNumber: "", floorName: "" });
      refreshFloors();
    } catch (err) {
      setError(err.message);
    }
  }

  function startEditFloor(f) {
    setEditingFloorId(f.id);
    setEditingFloor({ floorNumber: f.floor_number, floorName: f.floor_name || "" });
  }

  async function saveEditFloor(id) {
    try {
      await updateFloor(id, Number(editingFloor.floorNumber), editingFloor.floorName || null);
      setEditingFloorId(null);
      refreshFloors();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteFloor(f) {
    if (!window.confirm(`ลบชั้นนี้ใช่ไหม? (ต้องไม่มีห้องเหลืออยู่ในชั้นนี้)`)) return;
    try {
      await deleteFloor(f.id);
      refreshFloors();
    } catch (err) {
      setError("ลบไม่สำเร็จ (อาจมีห้องผูกอยู่กับชั้นนี้): " + err.message);
    }
  }

  // --- ห้อง ---
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

  function startEditRoom(r) {
    setEditingRoomId(r.id);
    setEditingRoom({ roomName: r.room_name, roomCode: r.room_code || "" });
  }

  async function saveEditRoom(id) {
    try {
      await updateRoom(id, editingRoom.roomName, editingRoom.roomCode || null);
      setEditingRoomId(null);
      refreshRooms();
    } catch (err) {
      setError(err.message);
    }
  }

  async function handleDeleteRoom(r) {
    if (!window.confirm(`ลบห้อง "${r.room_name}" ใช่ไหม? (ครุภัณฑ์ที่อยู่ในห้องนี้จะไม่มีตำแหน่งกำกับ)`)) return;
    try {
      await deleteRoom(r.id);
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
              placeholder="ชื่อตึก"
              value={newBuilding.name}
              onChange={(e) => setNewBuilding((v) => ({ ...v, name: e.target.value }))}
              required
            />
            <input
              placeholder="รหัสตึก (ถ้ามี)"
              value={newBuilding.code}
              onChange={(e) => setNewBuilding((v) => ({ ...v, code: e.target.value }))}
            />
            <button className="btn btn-secondary" type="submit">
              + เพิ่มตึก
            </button>
          </form>
          <ul className="simple-list">
            {buildings.map((b) => (
              <li key={b.id} className="editable-row">
                {editingBuildingId === b.id ? (
                  <span className="inline-edit-row">
                    <input
                      value={editingBuilding.name}
                      onChange={(e) => setEditingBuilding((v) => ({ ...v, name: e.target.value }))}
                      autoFocus
                    />
                    <input
                      value={editingBuilding.code}
                      onChange={(e) => setEditingBuilding((v) => ({ ...v, code: e.target.value }))}
                      placeholder="รหัส"
                    />
                    <button className="btn btn-secondary" onClick={() => saveEditBuilding(b.id)}>
                      บันทึก
                    </button>
                    <button className="btn btn-ghost-dark" onClick={() => setEditingBuildingId(null)}>
                      ยกเลิก
                    </button>
                  </span>
                ) : (
                  <>
                    <span>
                      {b.name} {b.code ? `(${b.code})` : ""}
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
              value={newFloor.buildingId}
              onChange={(e) => setNewFloor((v) => ({ ...v, buildingId: e.target.value }))}
              required
            >
              <option value="">-- เลือกตึก --</option>
              {buildings.map((b) => (
                <option key={b.id} value={b.id}>
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
              <li key={f.id} className="editable-row">
                {editingFloorId === f.id ? (
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
                    <button className="btn btn-secondary" onClick={() => saveEditFloor(f.id)}>
                      บันทึก
                    </button>
                    <button className="btn btn-ghost-dark" onClick={() => setEditingFloorId(null)}>
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
              value={newRoom.floorId}
              onChange={(e) => setNewRoom((v) => ({ ...v, floorId: e.target.value }))}
              required
            >
              <option value="">-- เลือกชั้น --</option>
              {floors.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.buildings?.name} ชั้น {f.floor_number}
                </option>
              ))}
            </select>
            <input
              placeholder="ชื่อห้อง"
              value={newRoom.roomName}
              onChange={(e) => setNewRoom((v) => ({ ...v, roomName: e.target.value }))}
              required
            />
            <input
              placeholder="รหัสห้อง (ถ้ามี)"
              value={newRoom.roomCode}
              onChange={(e) => setNewRoom((v) => ({ ...v, roomCode: e.target.value }))}
            />
            <button className="btn btn-secondary" type="submit">
              + เพิ่มห้อง
            </button>
          </form>
          <ul className="simple-list">
            {rooms.map((r) => (
              <li key={r.id} className="editable-row">
                {editingRoomId === r.id ? (
                  <span className="inline-edit-row">
                    <input
                      value={editingRoom.roomName}
                      onChange={(e) => setEditingRoom((v) => ({ ...v, roomName: e.target.value }))}
                      autoFocus
                    />
                    <input
                      value={editingRoom.roomCode}
                      onChange={(e) => setEditingRoom((v) => ({ ...v, roomCode: e.target.value }))}
                      placeholder="รหัส"
                    />
                    <button className="btn btn-secondary" onClick={() => saveEditRoom(r.id)}>
                      บันทึก
                    </button>
                    <button className="btn btn-ghost-dark" onClick={() => setEditingRoomId(null)}>
                      ยกเลิก
                    </button>
                  </span>
                ) : (
                  <>
                    <span>
                      {r.floors?.buildings?.name} ชั้น {r.floors?.floor_number} — {r.room_name}
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
