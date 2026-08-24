import { useEffect, useState } from "react";
import {
  listBuildings,
  createBuilding,
  listFloors,
  createFloor,
  listRooms,
  createRoom,
} from "../lib/queries";

export default function Locations() {
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
              <li key={b.id}>{b.name} {b.code ? `(${b.code})` : ""}</li>
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
              <li key={f.id}>
                {f.buildings?.name} — ชั้น {f.floor_number} {f.floor_name || ""}
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
              <li key={r.id}>
                {r.floors?.buildings?.name} ชั้น {r.floors?.floor_number} — {r.room_name}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
