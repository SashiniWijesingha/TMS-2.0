import { Trip, TripStatus } from '../models/Trip';
import { VehicleRequest } from '../models/VehicleRequest';
import { PassengerRequestDetails } from '../models/PassengerRequestDetails';
import { Vehicle } from '../models/Vehicle';
import { Op } from 'sequelize';
import * as turf from '@turf/turf';

export class RideMatchingService {

    /**
     * Find trips that match the criteria for ride sharing.
     * Criteria: Same Date, Sufficient Capacity, Nearby Pickup & Drop locations.
     */
    static async findMatches(
        date: string,
        pickup: { lat: number; lng: number },
        drop: { lat: number; lng: number },
        passengers: number,
        radiusKm: number = 3 // increased slightly for better matching
    ) {
        // 1. Find active trips on the date
        const trips = await Trip.findAll({
            where: {
                date: date,
                status: { [Op.or]: [TripStatus.PLANNED, TripStatus.ON_GOING] }
            },
            include: [
                {
                    model: Vehicle,
                    attributes: ['id', 'seating_capacity', 'vehicle_number', 'specification', 'attributes']
                },
                {
                    model: VehicleRequest,
                    include: [{ model: PassengerRequestDetails }]
                }
            ]
        });

        const matches = [];

        for (const trip of trips) {
            // Calculate Capacity
            let usedSeats = 0;
            const routePoints: any[] = [];

            for (const req of trip.requests) {
                if (req.passengerDetails) {
                    usedSeats += req.passengerDetails.no_of_passengers;

                    if (req.passengerDetails.pickup_lat !== null && req.passengerDetails.pickup_lng !== null) {
                        routePoints.push({
                            type: 'PICKUP',
                            pt: turf.point([req.passengerDetails.pickup_lng, req.passengerDetails.pickup_lat])
                        });
                    }
                    if (req.passengerDetails.drop_lat !== null && req.passengerDetails.drop_lng !== null) {
                        routePoints.push({
                            type: 'DROP',
                            pt: turf.point([req.passengerDetails.drop_lng, req.passengerDetails.drop_lat])
                        });
                    }
                }
            }

            // Safety check for dynamic attribute fallback
            let capacity = trip.vehicle.seating_capacity;
            if (!capacity && trip.vehicle.attributes && trip.vehicle.attributes.passenger_capacity) {
                capacity = trip.vehicle.attributes.passenger_capacity;
            }
            capacity = capacity || 4; // Default to 4 if unknown

            if (capacity - usedSeats < passengers) {
                continue; // Not enough seats
            }

            // Geospatial Matching
            const newPickupPt = turf.point([pickup.lng, pickup.lat]);
            const newDropPt = turf.point([drop.lng, drop.lat]);

            let isNearbyPickup = false;
            let isNearbyDrop = false;

            // Check against all existing points in the trip
            // Simplistic Match: If any existing pickup is near new pickup AND any existing drop is near new drop
            // This assumes "Cluster" based matching (e.g. Everyone from Office -> Home Area)

            for (const point of routePoints) {
                if (point.type === 'PICKUP') {
                    const d = turf.distance(newPickupPt, point.pt, { units: 'kilometers' });
                    if (d <= radiusKm) isNearbyPickup = true;
                }
                if (point.type === 'DROP') {
                    const d = turf.distance(newDropPt, point.pt, { units: 'kilometers' });
                    if (d <= radiusKm) isNearbyDrop = true;
                }
            }

            // Also check if the route is passing through?
            // That's harder without actual path geometry. 
            // For now, "Cluster Matching" (Pooling) is the standard MVP.

            if (isNearbyPickup && isNearbyDrop) {
                matches.push({
                    trip_id: trip.id,
                    vehicle_number: trip.vehicle.vehicle_number,
                    specification: trip.vehicle.specification,
                    total_capacity: capacity,
                    available_seats: capacity - usedSeats,
                    current_passengers: usedSeats,
                    match_type: 'CLUSTER_POOLING'
                });
            }
        }

        return matches;
    }
}
