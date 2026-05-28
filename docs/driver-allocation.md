# Driver Allocation Flow (Passenger Only)

This document explains how driver allocation works for passenger trips, how availability is computed, and where the enforcement happens in the app.

## Summary

- A driver is considered unavailable if they already have an ALLOCATED, ACCEPTED, or ON_GOING request that overlaps the new request time window.
- A vehicle is considered unavailable if it already has an ALLOCATED, ACCEPTED, or ON_GOING request that overlaps the new request time window.
- The time window is calculated from the passenger request date/time plus estimated duration and buffer time.
- Availability is enforced server-side in allocation and merge flows and is surfaced in the UI as a "driver hidden" hint.

## Request Statuses Used

Active statuses that block driver availability:

- ALLOCATED
- ACCEPTED
- ON_GOING

Completed and other statuses do not block availability.

## How the Time Window Is Calculated

For passenger requests only:

1. Start time = passenger_details.date + passenger_details.time.
2. Duration (minutes):
   - Use passenger_details.total_duration_minutes when available.
   - Else derive from total_distance_km (or distance text) using an average speed.
   - Else default to 120 minutes.
3. Buffer time (minutes):
   - Base buffer = max(30, 20% of duration).
   - Add 15 minutes for unexpected delays.
4. Driver rest time (minutes):
   - Applied only for long-distance trips (distance > 100 km).
   - Adds a fixed 60 minutes after trip completion before the driver is available.
5. End time = start time + duration + buffer (+ driver rest when applicable).
5. If no_of_days > 1, the end time extends by (no_of_days - 1) days.

This produces a single window per request, which is used for overlap checks.

## Where Availability Is Enforced (Backend)

These backend paths perform conflict checks for passenger requests:

- Allocate a single request: requestController.allocateVehicle
- Update an allocation: requestController.updateAllocationResource
- Create a trip: tripController.createTrip
- Finalize merge allocation: requestController.mergeRequests (when transport/admin finalizes)
- Shared allocation on request creation: requestController.createRequest (when tripId is supplied)

If a conflict exists, the API returns HTTP 409 with conflict details, conflict reasons, and next available timestamps for driver/vehicle.

## Allocation Resources Filtering (Backend)

The allocation resources endpoint now returns:

- drivers: filtered list of eligible and available drivers
- blockedDrivers: list of hidden drivers with busy time windows
- blockedVehicles: list of hidden vehicles with busy time windows

The endpoint accepts:

- type: vehicle type name (required)
- requestId: a single request
- requestIds: comma-separated list for merged groups

## UI Behavior (Frontend)

When a vehicle type (or vehicle) is selected, the UI calls the allocation resources endpoint and:

- shows only available drivers
- displays a small hint like:
  "3 driver(s) hidden due to schedule conflicts. Example: Driver A busy Apr 02 02:00 PM - 04:30 PM."

This is implemented in:

- Allocation modal
- Finalize allocation page

## Return Trips

Return trips are created as separate requests (linked child request). They follow the same availability logic because they are independent requests with their own date/time.

## Common Reasons for No Available Drivers

- All drivers have overlapping ALLOCATED or ON_GOING trips.
- All vehicles have overlapping ALLOCATED or ON_GOING trips.
- Passenger route duration is missing and defaults to a long window.
- The request date/time is invalid or not set.

## Troubleshooting Tips

- Ensure passenger_details.total_duration_minutes is populated by route calculation.
- Verify request date/time is valid and in the expected format.
- If conflicts seem wrong, check existing allocations for that driver and their request times.

## Notes

- The availability system is passenger-only. Material requests are intentionally ignored.
- Long-distance and buffer thresholds are configurable via global config keys:
   - availability_avg_speed_kmh
   - availability_default_duration_min
   - availability_min_buffer_min
   - availability_buffer_ratio
   - availability_unexpected_buffer_min
   - availability_long_distance_km
   - availability_long_distance_rest_min
- The backend conflict check is authoritative; the UI only provides a preview.
