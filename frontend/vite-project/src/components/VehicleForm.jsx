import { useState } from "react";

function VehicleForm({ onVehicleCreated }) {
  const [formData, setFormData] = useState({
    vehicleNumber: "",
    vehicleType: "TRUCK",
    cargoType: "",
    priority: "MEDIUM",
    status: "IDLE",
    destination: "",
    longitude: "",
    latitude: ""
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
      ...previous,
      [name]: value
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();

    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "http://localhost:1710/api/vehicles",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify({
            vehicleNumber: formData.vehicleNumber,
            vehicleType: formData.vehicleType,
            cargoType: formData.cargoType,
            priority: formData.priority,
            status: formData.status,
            destination: formData.destination,
            currentLocation: {
              type: "Point",
              coordinates: [
                Number(formData.longitude),
                Number(formData.latitude)
              ]
            }
          })
        }
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || "Failed to create vehicle");
      }

      onVehicleCreated(result.data);

      setFormData({
        vehicleNumber: "",
        vehicleType: "TRUCK",
        cargoType: "",
        priority: "MEDIUM",
        status: "IDLE",
        destination: "",
        longitude: "",
        latitude: ""
      });
    } catch (error) {
      console.error(error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <h2>Add Vehicle</h2>

      <input
        name="vehicleNumber"
        placeholder="Vehicle Number"
        value={formData.vehicleNumber}
        onChange={handleChange}
        required
      />

      <select
        name="vehicleType"
        value={formData.vehicleType}
        onChange={handleChange}
      >
        <option value="TRUCK">Truck</option>
        <option value="VAN">Van</option>
        <option value="AMBULANCE">Ambulance</option>
      </select>

      <input
        name="cargoType"
        placeholder="Cargo Type"
        value={formData.cargoType}
        onChange={handleChange}
        required
      />

      <select
        name="priority"
        value={formData.priority}
        onChange={handleChange}
      >
        <option value="LOW">Low</option>
        <option value="MEDIUM">Medium</option>
        <option value="HIGH">High</option>
        <option value="CRITICAL">Critical</option>
      </select>

      <select
        name="status"
        value={formData.status}
        onChange={handleChange}
      >
        <option value="IDLE">Idle</option>
        <option value="IN_TRANSIT">In Transit</option>
        <option value="DELAYED">Delayed</option>
        <option value="DELIVERED">Delivered</option>
      </select>

      <input
        name="destination"
        placeholder="Destination"
        value={formData.destination}
        onChange={handleChange}
        required
      />

      <input
        name="longitude"
        type="number"
        step="any"
        placeholder="Longitude"
        value={formData.longitude}
        onChange={handleChange}
        required
      />

      <input
        name="latitude"
        type="number"
        step="any"
        placeholder="Latitude"
        value={formData.latitude}
        onChange={handleChange}
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Saving..." : "Add Vehicle"}
      </button>

      {error && <p>{error}</p>}
    </form>
  );
}

export default VehicleForm;