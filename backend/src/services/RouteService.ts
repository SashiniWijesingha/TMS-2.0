
import axios from 'axios';
import * as turf from '@turf/turf';
import { PassengerRequestDetails } from '../models/PassengerRequestDetails';
import { MaterialRequestDetails } from '../models/MaterialRequestDetails';
import { RequestStatus, VehicleRequest } from '../models/VehicleRequest';
import { User } from '../models/User';
import { Division } from '../models/Division';
import { Op } from 'sequelize';

// Replace with your preferred OpenRouteService or OSRM URL
// For ORS: 'https://api.openrouteservice.org/v2/directions/driving-car/geojson'
// For OSRM Demo: 'http://router.project-osrm.org/route/v1/driving'
const ROUTING_API_URL = process.env.ROUTING_API_URL || 'https://api.openrouteservice.org/v2/directions/driving-car/geojson';
// You normally need an API Key for ORS. For OSRM demo, you don't.
const API_KEY = process.env.ORS_API_KEY || '';

interface Coordinates {
    lat: number;
    lng: number;
    address?: string;
}

export class RouteService {

    /**
     * Calculate route metrics (distance, duration, geometry) between points.
     * Uses OpenRouteService (GeoJSON format).
     */
    static async calculateRoute(start: Coordinates, end: Coordinates, stops: Coordinates[] = []) {
        try {
            if (!API_KEY) {
                // ORS_API_KEY is missing.
                return null;
            }

            // ORS expects [lng, lat]
            const coordinates = [
                [start.lng, start.lat],
                ...stops.map(s => [s.lng, s.lat]),
                [end.lng, end.lat]
            ];

            // If using OpenRouteService (POST request)
            const response = await axios.post(
                ROUTING_API_URL,
                { coordinates: coordinates },
                {
                    headers: {
                        'Authorization': API_KEY,
                        'Content-Type': 'application/json'
                    }
                }
            );

            // ORS returns a FeatureCollection. We want the first feature (the route).
            const routeFeature = response.data.features[0];
            const { properties, geometry } = routeFeature;

            // properties.summary.distance (meters), properties.summary.duration (seconds)
            const distanceKm = properties.summary.distance / 1000;
            const durationMin = properties.summary.duration / 60;

            return {
                geometry: geometry, // GeoJSON LineString
                distanceKm: parseFloat(distanceKm.toFixed(2)),
                durationMin: parseFloat(durationMin.toFixed(2))
            };

        } catch (error) {
            console.error('Error calculating route:', error);
            // Fallback or re-throw
            return null;
        }
    }

    /**
     * Find existing approved/allocated requests that overlap with the new trip.
     * "Overlap" means the new trip's start AND end are within X km of the existing trip's path.
     */
    static async findOverlappingRequests(newStart: Coordinates, newEnd: Coordinates) {
        // 1. Fetch all active requests that are willing to share
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

        // Terminology:
        // "Candidate" = An existing trip in the DB
        // "Query" = The new trip user is planning (Start -> End)

        const startPoint = turf.point([newStart.lng, newStart.lat]);
        const endPoint = turf.point([newEnd.lng, newEnd.lat]);
        const BUFFER_KM = 2; // Distance threshold (e.g. 2km)

        for (const req of activeRequests) {
            const details = req.passengerDetails || req.materialDetails;
            if (!details || !details.route_geometry) continue;

            const routeLineString = details.route_geometry; // Should be GeoJSON LineString

            // Check if New Start is near existing route
            const distFromStart = turf.pointToLineDistance(startPoint, routeLineString, { units: 'kilometers' });

            // Check if New End is near existing route
            const distFromEnd = turf.pointToLineDistance(endPoint, routeLineString, { units: 'kilometers' });

            if (distFromStart <= BUFFER_KM && distFromEnd <= BUFFER_KM) {
                matches.push({
                    requestId: req.id,
                    requester: req.requester, // Use include to get name if needed
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
     */
    /**
     * Find available vehicles that are already allocated to a trip matching the new route.
     * Checks: Date/Time overlap, Route proximity, Seat Availability.
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
                    // We check availability logic manually below because 'IN_USE' is what we are looking for (to share)
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

        // Group allocations by Vehicle ID to calculate total usage per vehicle properly
        const vehicleGroups = new Map<number, any[]>();
        for (const alloc of allocations) {
            const vid = alloc.vehicle_id;
            if (!vehicleGroups.has(vid)) vehicleGroups.set(vid, []);
            vehicleGroups.get(vid)!.push(alloc);
        }

        for (const [vehicleId, allocs] of vehicleGroups) {
            const vehicle = allocs[0].vehicle; // First alloc acts as vehicle ref

            // Check Seat Availability
            let currentPassengers = 0;
            // Filter allocs that overlap in time
            const validAllocs = [];

            for (const alloc of allocs) {
                const details = alloc.request?.passengerDetails;
                if (!details) continue;

                const tripTime = new Date(`2000-01-01T${details.time}`);
                const diffMin = Math.abs(tripTime.getTime() - reqTime.getTime()) / 60000;

                if (diffMin <= 60) { // Only consider trips within hour window
                    currentPassengers += details.no_of_passengers;
                    validAllocs.push(alloc);
                }
            }

            if (validAllocs.length === 0) continue; // No overlapping trips

            // Use new column with fallback
            let capacity = vehicle.seating_capacity;
            if (!capacity && vehicle.attributes && vehicle.attributes.passenger_capacity) {
                capacity = vehicle.attributes.passenger_capacity;
            }
            capacity = capacity || 4;

            const availableSeats = capacity - currentPassengers;
            if (availableSeats < requiredSeats) continue;

            // Check Route Proximity for ANY of the valid allocations
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
                    // Fallback to Point-to-Point check (Cluster Matching)
                    // Check Pickup near Pickup AND Drop near Drop
                    const exPickup = turf.point([details.pickup_lng || 0, details.pickup_lat || 0]); // Assuming DB has these now, else use coordinates json
                    if (!details.pickup_lng && details.pickup_coordinates) {
                        // Fallback to JSON parsing if columns empty (migration safety)
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
                    routeMatchScore: (minDetour / 2).toFixed(2), // Avg distance
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
     */
    static async scanAndCache(date: string) {
        try {
            const { RideShareSuggestion } = require('../models/RideShareSuggestion');

            // 1. Fetch requests for this date
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

            // 2. Run Algorithm
            const result = await this.findPendingOverlaps(validRequests);

            // 3. Clear old cache for this date
            await RideShareSuggestion.destroy({ where: { date: date } });

            // 4. Save new clusters
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

            console.log(`[Cache] Updated ${result.clusters.length} clusters for ${date}`);

        } catch (error) {
            console.error('[Cache] Failed to update suggestions:', error);
        }
    }

    /**
     * PULL MODEL: Reads from cache for fast dashboard loading.
     */
    static async getCachedSuggestions(startDate: string, endDate: string, divisionId?: number) {
        const { RideShareSuggestion } = require('../models/RideShareSuggestion');

        // 1. Fetch Cached Clusters
        // Note: We might want to filter by division if needed, but clusters are usually based on route.
        // If divisionId is passed, we filter requests later.
        const cachedGroups = await RideShareSuggestion.findAll({
            where: {
                date: { [Op.between]: [startDate, endDate] }
            }
        });

        // 2. Fetch ALL Pending Requests (to hydrate clusters + find unclustered)
        const requests = await VehicleRequest.findAll({
            where: {
                status: { [Op.in]: [RequestStatus.PENDING_COORDINATOR, RequestStatus.RETURNED] },
                // division_id might be needed if user only sees their own division?
                // Assuming Coordinator sees all or passed divisionId
                ...(divisionId ? { division_id: divisionId } : {})
            },
            include: [
                { model: PassengerRequestDetails, required: false },
                { model: MaterialRequestDetails, required: false },
                { model: User, as: 'requester', attributes: ['name', 'email'] },
                { model: Division, attributes: ['name'] }
            ]
        });

        // Filter requests by Date Range
        const validRequests = requests.filter(r => {
            const d = r.passengerDetails?.date || r.materialDetails?.date;
            return d >= startDate && d <= endDate;
        });

        // 3. Hydrate Clusters
        const suggestions = [];
        const clusteredIds = new Set<number>();

        for (const group of cachedGroups) {
            const reqIds = group.request_ids as number[]; // JSON array
            const groupRequests = validRequests.filter(r => reqIds.includes(r.id));

            // If requests are missing (deleted/status changed), we might skip this malformed group
            // or show what's left. Safety check:
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

        // 4. Identify Unclustered
        const unclustered = validRequests.filter(r => !clusteredIds.has(r.id));

        return { suggestions, unclustered };
    }

    /**
     * Analyzes a list of pending requests and groups them based on route overlap.
     * Used by Coordinators to optimize fleet usage.
     */
    static async findPendingOverlaps(requests: any[]) {
        const groups: any[] = [];
        const visited = new Set<number>();
        const BUFFER_KM = 3; // 3km radius for clusters & detours

        // Helper to get coordinates
        const getCoords = (req: any) => {
            const details = req.passengerDetails || req.materialDetails;
            if (!details) return null;

            // Validate coordinates exist
            if (details.pickup_lng == null || details.pickup_lat == null ||
                details.drop_lng == null || details.drop_lat == null) {
                return null;
            }

            return {
                start: [details.pickup_lng, details.pickup_lat],
                end: [details.drop_lng, details.drop_lat],
                time: new Date(`2000-01-01T${details.time}`), // Note: This compares TIME only if we don't include date. 
                // However, since we now scan multiple dates, we must include the full DateTime for accurate diff.
                // We will construct a real date object using the request's date string.
                fullDateTime: new Date(`${details.date}T${details.time}`),
                passengers: details.no_of_passengers || 0,
                geometry: details.route_geometry // GeoJSON LineString
            };
        };

        for (let i = 0; i < requests.length; i++) {
            if (visited.has(requests[i].id)) continue;

            const primary = requests[i];
            const pCoords = getCoords(primary);
            if (!pCoords) continue;

            const cluster = [primary];
            // Don't mark visited yet, only if we find matches or decide it is processed

            for (let j = i + 1; j < requests.length; j++) {
                if (visited.has(requests[j].id)) continue;

                const candidate = requests[j];
                const cCoords = getCoords(candidate);
                if (!cCoords) continue;

                // 1. Time Check (within 45 mins - relaxed for manual review suggestion)
                // Use fullDateTime to avoid matching Jan 1st with Jan 2nd
                const timeDiff = Math.abs(pCoords.fullDateTime.getTime() - cCoords.fullDateTime.getTime()) / 60000;

                if (timeDiff > 45) continue;

                let isMatch = false;

                // 2. Logic A: Cluster Match (Start near Start, End near End)
                const startDist = turf.distance(turf.point(pCoords.start), turf.point(cCoords.start), { units: 'kilometers' });
                const endDist = turf.distance(turf.point(pCoords.end), turf.point(cCoords.end), { units: 'kilometers' });

                if (startDist <= BUFFER_KM && endDist <= BUFFER_KM) {
                    isMatch = true;
                }

                // 3. Logic B: En-Route Match (Candidate is along Primary's path)
                if (!isMatch && pCoords.geometry) {
                    const cStartPoint = turf.point(cCoords.start);
                    const cEndPoint = turf.point(cCoords.end);

                    const distToLineStart = turf.pointToLineDistance(cStartPoint, pCoords.geometry, { units: 'kilometers' });
                    const distToLineEnd = turf.pointToLineDistance(cEndPoint, pCoords.geometry, { units: 'kilometers' });

                    if (distToLineStart <= (BUFFER_KM / 1.5) && distToLineEnd <= (BUFFER_KM / 1.5)) {
                        isMatch = true;
                    }
                }

                // 4. Logic C: Reverse En-Route (Primary is along Candidate's path)
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
                // It's a cluster
                visited.add(primary.id); // Now mark primary as visited
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

        // Collect Unclustered
        const unclustered = requests.filter(r => !visited.has(r.id));

        return { clusters: groups, unclustered };
    }
}
