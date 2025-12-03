import React from "react";

interface DriverMapProps {
  driverLat: number;
  driverLng: number;
  passengerLat: number;
  passengerLng: number;
  pickupLocation: string;
  dropoffLocation: string;
}

const DriverMap: React.FC<DriverMapProps> = ({
  driverLat,
  driverLng,
  passengerLat,
  passengerLng,
  pickupLocation,
  dropoffLocation,
}) => {
  return (
    <div className="w-full h-64 bg-muted flex flex-col items-center justify-center rounded-lg border border-primary/30 text-sm text-muted-foreground text-center px-4">
      <p>🗺 Real map will render here later.</p>
      <p className="mt-2">
        <strong>Driver:</strong> {driverLat}, {driverLng}
      </p>
      <p>
        <strong>Passenger:</strong> {passengerLat}, {passengerLng}
      </p>
      <p className="mt-2">
        <strong>Pickup:</strong> {pickupLocation || "—"} <br />
        <strong>Dropoff:</strong> {dropoffLocation || "—"}
      </p>
    </div>
  );
};

export default DriverMap;
