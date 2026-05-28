
import axios from 'axios';
import * as turf from '@turf/turf';
import { PassengerRequestDetails } from '../models/PassengerRequestDetails';
import { MaterialRequestDetails } from '../models/MaterialRequestDetails';
import { RequestStatus, VehicleRequest } from '../models/VehicleRequest';
import { User } from '../models/User';
import { Division } from '../models/Division';
import { Op } from 'sequelize';

const GOOGLE_API_KEY = process.env.GOOGLE_MAPS_API_KEY || '';

interface Coordinates {
    lat: number;
    lng: number;
    address?: string;
}

export class GoogleRouteService {

    /**
     * Decode Google Maps encoded polyline algorithm format to GeoJSON LineString coordinates
     */
    private static decodePolyline(encoded: string): number[][] {
        let index = 0, len = encoded.length;
        let lat = 0, lng = 0;
        const coordinates: number[][] = [];

        while (index < len) {
            let b, shift = 0, result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlat = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lat += dlat;

            shift = 0;
            result = 0;
            do {
                b = encoded.charCodeAt(index++) - 63;
                result |= (b & 0x1f) << shift;
                shift += 5;
            } while (b >= 0x20);
            const dlng = ((result & 1) ? ~(result >> 1) : (result >> 1));
            lng += dlng;

            // GeoJSON uses [lng, lat]
            coordinates.push([lng * 1e-5, lat * 1e-5]);
        }
        return coordinates;
    }

    /**
     * Calculate route metrics (distance, duration, geometry) between points using Google Maps Directions API.
     */
    static async calculateRoute(start: Coordinates, end: Coordinates, stops: Coordinates[] = []) {
        try {
            if (!GOOGLE_API_KEY) {
                console.warn('GOOGLE_MAPS_API_KEY is missing. Route calculation skipped.');
                return null;
            }

            // Google Maps expects 'lat,lng' strings or place IDs
            const origin = `${start.lat},${start.lng}`;
            const destination = `${end.lat},${end.lng}`;

            let waypoints = '';
            if (stops.length > 0) {
                waypoints = '&waypoints=' + stops.map(s => `${s.lat},${s.lng}`).join('|');
            }

            const url = `https://maps.googleapis.com/maps/api/directions/json?origin=${origin}&destination=${destination}${waypoints}&key=${GOOGLE_API_KEY}`;

            const response = await axios.get(url);

            if (response.data.status !== 'OK') {
                console.error('Google Maps API Error:', response.data.status, response.data.error_message);
                return null;
            }

            const route = response.data.routes[0];
            const legs = route.legs;
            const overviewPolyline = route.overview_polyline.points;

            // Calculate total distance and duration from legs
            let totalDistanceMeters = 0;
            let totalDurationSeconds = 0;

            for (const leg of legs) {
                totalDistanceMeters += leg.distance.value;
                totalDurationSeconds += leg.duration.value;
            }

            const distanceKm = totalDistanceMeters / 1000;
            const durationMin = totalDurationSeconds / 60;

            const decodedCoordinates = this.decodePolyline(overviewPolyline);

            return {
                geometry: {
                    type: 'LineString',
                    coordinates: decodedCoordinates
                },
                distanceKm: parseFloat(distanceKm.toFixed(2)),
                durationMin: parseFloat(durationMin.toFixed(2))
            };

        } catch (error) {
            console.error('Error calculating route with Google Maps:', error);
            return null;
        }
    }

    /**
     * Find existing approved/allocated requests that overlap with the new trip.
     * "Overlap" means the new trip's start AND end are within X km of the existing trip's path.
     * (Copied logic from RouteService to maintain feature parity)
     */
    static async findOverlappingRequests(newStart: Coordinates, newEnd: Coordinates) {
        const activeRequests = await VehicleRequest.findAll({
            where: {
                status: {
                    [Op.in]: [RequestStatus.APPROVED, RequestStatus.ALLOCATED, RequestStatus.ON_GOING]
                }
            },
            include: [
                {
                    model: PassengerRequestDetails,
                    as: 'passengerDetails',
                    where: { share_vehicle: true },
                    required: false
                },
                {
                    model: MaterialRequestDetails,
                    as: 'materialDetails',
                    where: { share_vehicle: true },
                    required: false
                }
            ]
        });

        const matches = [];
        const startPoint = turf.point([newStart.lng, newStart.lat]);
        const endPoint = turf.point([newEnd.lng, newEnd.lat]);
        const BUFFER_KM = 2;

        for (const req of activeRequests) {
            const details = req.passengerDetails || req.materialDetails;
            if (!details || !details.route_geometry) continue;

            const routeLineString = details.route_geometry;

            // Check if New Start is near existing route
            const distFromStart = turf.pointToLineDistance(startPoint, routeLineString, { units: 'kilometers' });

            // Check if New End is near existing route
            const distFromEnd = turf.pointToLineDistance(endPoint, routeLineString, { units: 'kilometers' });

            if (distFromStart <= BUFFER_KM && distFromEnd <= BUFFER_KM) {
                matches.push({
                    requestId: req.id,
                    requester: req.requester,
                    details: details,
                    overlapDetail: `Passes within ${Math.max(distFromStart, distFromEnd).toFixed(1)}km of your route.`
                });
            }
        }

        return matches;
    }

    /**
     * Find available vehicles that are already allocated to a trip matching the new route.
     * Checks: Date/Time overlap, Route proximity, Seat Availability.
     * (Copied logic from RouteService)
     */
    static async findSharedVehicles(
        date: string,
        time: string,
        newStart: Coordinates,
        newEnd: Coordinates,
        requiredSeats: number
    ) {
        const { Allocation } = require('../models/Allocation');
        const { Vehicle } = require('../models/Vehicle');
        const { VehicleType } = require('../models/VehicleType');

        const reqTime = new Date(`2000-01-01T${time}`);

        const allocations = await Allocation.findAll({
            include: [
                {
                    model: Vehicle,
                    required: true,
                    include: [VehicleType],
                },
                {
                    model: VehicleRequest,
                    required: true,
                    where: {
                        status: {
                            [Op.in]: [RequestStatus.ALLOCATED, RequestStatus.ON_GOING]
                        }
                    },
                    include: [
                        {
                            model: PassengerRequestDetails,
                            as: 'passengerDetails',
                            required: true,
                            where: {
                                date: date,
                                share_vehicle: true
                            }
                        }
                    ]
                }
            ]
        });

        const matches = [];
        const startPoint = turf.point([newStart.lng, newStart.lat]);
        const endPoint = turf.point([newEnd.lng, newEnd.lat]);
        const BUFFER_KM = 3;

        const vehicleGroups = new Map<number, any[]>();
        for (const alloc of allocations) {
            const vid = alloc.vehicle_id;
            if (!vehicleGroups.has(vid)) vehicleGroups.set(vid, []);
            vehicleGroups.get(vid)!.push(alloc);
        }

        for (const [vehicleId, allocs] of vehicleGroups) {
            const vehicle = allocs[0].vehicle;
            let currentPassengers = 0;
            const validAllocs = [];

            for (const alloc of allocs) {
                const details = alloc.request?.passengerDetails;
                if (!details) continue;

                const tripTime = new Date(`2000-01-01T${details.time}`);
                const diffMin = Math.abs(tripTime.getTime() - reqTime.getTime()) / 60000;

                if (diffMin <= 60) {
                    currentPassengers += details.no_of_passengers;
                    validAllocs.push(alloc);
                }
            }

            if (validAllocs.length === 0) continue;

            let capacity = vehicle.seating_capacity;
            if (!capacity && vehicle.attributes && vehicle.attributes.passenger_capacity) {
                capacity = vehicle.attributes.passenger_capacity;
            }
            capacity = capacity || 4;

            const availableSeats = capacity - currentPassengers;
            if (availableSeats < requiredSeats) continue;

            let bestMatch = null;
            let minDetour = Infinity;

            for (const alloc of validAllocs) {
                const details = alloc.request.passengerDetails;
                let isMatch = false;
                let distStart = 0;
                let distEnd = 0;

                if (details.route_geometry) {
                    const line = details.route_geometry;
                    distStart = turf.pointToLineDistance(startPoint, line, { units: 'kilometers' });
                    distEnd = turf.pointToLineDistance(endPoint, line, { units: 'kilometers' });
                    if (distStart <= BUFFER_KM && distEnd <= BUFFER_KM) isMatch = true;
                } else {
                    const exPickup = turf.point([details.pickup_lng || 0, details.pickup_lat || 0]);
                    if (!details.pickup_lng && details.pickup_coordinates) {
                        exPickup.geometry.coordinates = [details.pickup_coordinates.lng, details.pickup_coordinates.lat];
                    }

                    const exDrop = turf.point([details.drop_lng || 0, details.drop_lat || 0]);
                    if (!details.drop_lng && details.drop_coordinates) {
                        exDrop.geometry.coordinates = [details.drop_coordinates.lng, details.drop_coordinates.lat];
                    }

                    distStart = turf.distance(startPoint, exPickup, { units: 'kilometers' });
                    distEnd = turf.distance(endPoint, exDrop, { units: 'kilometers' });

                    if (distStart <= BUFFER_KM && distEnd <= BUFFER_KM) isMatch = true;
                }

                if (isMatch) {
                    const detour = distStart + distEnd;
                    if (detour < minDetour) {
                        minDetour = detour;
                        bestMatch = alloc;
                    }
                }
            }

            if (bestMatch) {
                matches.push({
                    vehicleId: vehicle.id,
                    vehicleNumber: vehicle.vehicle_number,
                    vehicleType: vehicle.vehicleType?.name || 'Unknown',
                    availableSeats: availableSeats,
                    tripId: bestMatch.id,
                    requestId: bestMatch.request.id,
                    routeMatchScore: (minDetour / 2).toFixed(2),
                    detourKm: minDetour.toFixed(2),
                    existingTripDetails: {
                        pickup: bestMatch.request.passengerDetails.pickup_location,
                        drop: bestMatch.request.passengerDetails.drop_location,
                        time: bestMatch.request.passengerDetails.time
                    }
                });
            }
        }

        return matches;
    }

    /**
     * PUSH MODEL: Scans a specific date and saves clusters to the database cache.
     * Call this in background whenever a request is created/updated.
     * (Copied logic from RouteService)
     */
    static async scanAndCache(date: string) {
        try {
            const { RideShareSuggestion } = require('../models/RideShareSuggestion');

            const requests = await VehicleRequest.findAll({
                where: {
                    status: { [Op.in]: [RequestStatus.PENDING_COORDINATOR, RequestStatus.RETURNED] }
                },
                include: [
                    {
                        model: PassengerRequestDetails,
                        where: { date: date },
                        required: false
                    },
                    {
                        model: MaterialRequestDetails,
                        where: { date: date },
                        required: false
                    }
                ]
            });

            const validRequests = requests.filter(r => {
                const pDate = r.passengerDetails?.date;
                const mDate = r.materialDetails?.date;
                return pDate === date || mDate === date;
            });

            if (validRequests.length === 0) return;

            // Updated to use the local GoogleRouteService version of findPendingOverlaps
            const result = await this.findPendingOverlaps(validRequests);

            await RideShareSuggestion.destroy({ where: { date: date } });

            if (result.clusters.length > 0) {
                const bulkData = result.clusters.map(c => ({
                    group_id: c.groupId,
                    request_ids: c.requests.map((r: any) => r.id),
                    total_passengers: c.totalPassengers,
                    match_reason: c.matchReason,
                    status: 'PENDING',
                    date: date
                }));
                await RideShareSuggestion.bulkCreate(bulkData);
            }

            console.log(`[GoogleRouteService Cache] Updated ${result.clusters.length} clusters for ${date}`);

        } catch (error) {
            console.error('[GoogleRouteService Cache] Failed to update suggestions:', error);
        }
    }

    static async getCachedSuggestions(startDate: string, endDate: string, divisionId?: number) {
        const { RideShareSuggestion } = require('../models/RideShareSuggestion');

        const cachedGroups = await RideShareSuggestion.findAll({
            where: {
                date: { [Op.between]: [startDate, endDate] }
            }
        });

        const requests = await VehicleRequest.findAll({
            where: {
                status: { [Op.in]: [RequestStatus.PENDING_COORDINATOR, RequestStatus.RETURNED] },
                ...(divisionId ? { division_id: divisionId } : {})
            },
            include: [
                { model: PassengerRequestDetails, required: false },
                { model: MaterialRequestDetails, required: false },
                { model: User, as: 'requester', attributes: ['name', 'email'] },
                { model: Division, attributes: ['name'] }
            ]
        });

        const validRequests = requests.filter(r => {
            const d = r.passengerDetails?.date || r.materialDetails?.date;
            return d >= startDate && d <= endDate;
        });

        const suggestions = [];
        const clusteredIds = new Set<number>();

        for (const group of cachedGroups) {
            const reqIds = group.request_ids as number[];
            const groupRequests = validRequests.filter(r => reqIds.includes(r.id));

            if (groupRequests.length < 2) continue;

            groupRequests.forEach(r => clusteredIds.add(r.id));

            suggestions.push({
                groupId: group.group_id,
                requests: groupRequests,
                totalPassengers: group.total_passengers,
                matchReason: group.match_reason,
                date: group.date
            });
        }

        const unclustered = validRequests.filter(r => !clusteredIds.has(r.id));

        return { suggestions, unclustered };
    }

    /**
     * Analyzes a list of pending requests and groups them based on route overlap.
     * (Copied logic from RouteService)
     */
    static async findPendingOverlaps(requests: any[]) {
        const groups: any[] = [];
        const visited = new Set<number>();
        const BUFFER_KM = 3;

        const getCoords = (req: any) => {
            const details = req.passengerDetails || req.materialDetails;
            if (!details) return null;

            if (details.pickup_lng == null || details.pickup_lat == null ||
                details.drop_lng == null || details.drop_lat == null) {
                return null;
            }

            return {
                start: [details.pickup_lng, details.pickup_lat],
                end: [details.drop_lng, details.drop_lat],
                time: new Date(`2000-01-01T${details.time}`),
                fullDateTime: new Date(`${details.date}T${details.time}`),
                passengers: details.no_of_passengers || 0,
                geometry: details.route_geometry
            };
        };

        for (let i = 0; i < requests.length; i++) {
            if (visited.has(requests[i].id)) continue;

            const primary = requests[i];
            const pCoords = getCoords(primary);
            if (!pCoords) continue;

            const cluster = [primary];

            for (let j = i + 1; j < requests.length; j++) {
                if (visited.has(requests[j].id)) continue;

                const candidate = requests[j];
                const cCoords = getCoords(candidate);
                if (!cCoords) continue;

                const timeDiff = Math.abs(pCoords.fullDateTime.getTime() - cCoords.fullDateTime.getTime()) / 60000;

                if (timeDiff > 45) continue;

                let isMatch = false;

                const startDist = turf.distance(turf.point(pCoords.start), turf.point(cCoords.start), { units: 'kilometers' });
                const endDist = turf.distance(turf.point(pCoords.end), turf.point(cCoords.end), { units: 'kilometers' });

                if (startDist <= BUFFER_KM && endDist <= BUFFER_KM) {
                    isMatch = true;
                }

                if (!isMatch && pCoords.geometry) {
                    const cStartPoint = turf.point(cCoords.start);
                    const cEndPoint = turf.point(cCoords.end);

                    const distToLineStart = turf.pointToLineDistance(cStartPoint, pCoords.geometry, { units: 'kilometers' });
                    const distToLineEnd = turf.pointToLineDistance(cEndPoint, pCoords.geometry, { units: 'kilometers' });

                    if (distToLineStart <= (BUFFER_KM / 1.5) && distToLineEnd <= (BUFFER_KM / 1.5)) {
                        isMatch = true;
                    }
                }

                if (!isMatch && cCoords.geometry) {
                    const pStartPoint = turf.point(pCoords.start);
                    const pEndPoint = turf.point(pCoords.end);

                    const distToLineStart = turf.pointToLineDistance(pStartPoint, cCoords.geometry, { units: 'kilometers' });
                    const distToLineEnd = turf.pointToLineDistance(pEndPoint, cCoords.geometry, { units: 'kilometers' });

                    if (distToLineStart <= (BUFFER_KM / 1.5) && distToLineEnd <= (BUFFER_KM / 1.5)) {
                        isMatch = true;
                    }
                }

                if (isMatch) {
                    cluster.push(candidate);
                    visited.add(candidate.id);
                }
            }

            if (cluster.length > 1) {
                visited.add(primary.id);
                const totalPassengers = cluster.reduce((sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0), 0);
                groups.push({
                    groupId: `group-${primary.id}`,
                    requests: cluster,
                    totalPassengers,
                    savings: 'High',
                    matchReason: 'Active Route Overlap'
                });
            }
        }

        const unclustered = requests.filter(r => !visited.has(r.id));

        return { clusters: groups, unclustered };
    }
}
