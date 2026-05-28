import { Response } from 'express';
import { Trip, TripStatus } from '../models/Trip';
import { VehicleRequest, RequestStatus } from '../models/VehicleRequest';
import { AuthRequest } from '../middleware/authMiddleware';
import { Vehicle } from '../models/Vehicle';
import { Driver } from '../models/Driver';
import { PassengerRequestDetails } from '../models/PassengerRequestDetails';
import {
    buildTripScheduleFromRequests,
    findDriverConflicts,
    findVehicleConflicts,
    getNextAvailableAt,
    loadAvailabilityConfig
} from '../services/driverAvailabilityService';
import sequelize from '../config/database';

export const createTrip = async (req: AuthRequest, res: Response) => {
    // COORDINATOR ACTION
    const transaction = await sequelize.transaction();
    try {
        const { vehicleId, driverId, requestIds, date, startTime, routeSummary } = req.body;

        if (!vehicleId || !driverId || !requestIds || !Array.isArray(requestIds) || requestIds.length === 0) {
            return res.status(400).json({ message: 'Missing required fields: vehicleId, driverId, requestIds[]' });
        }

        // Validate Requests
        const requests = await VehicleRequest.findAll({
            where: { id: requestIds },
            include: [PassengerRequestDetails],
            transaction
        });

        if (requests.length !== requestIds.length) {
            await transaction.rollback();
            return res.status(404).json({ message: 'One or more requests not found' });
        }

        // Check Vehicle Capacity
        const vehicle = await Vehicle.findByPk(vehicleId);
        if (!vehicle) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        let totalPassengers = 0;
        for (const req of requests) {
            // Check status
            if (req.status !== RequestStatus.PENDING_COORDINATOR && req.status !== RequestStatus.APPROVED) {
                // Assuming Coordinator can allocate straight from Pending or Approved
            }

            // Check if already in a trip
            if (req.trip_id) {
                await transaction.rollback();
                return res.status(400).json({ message: `Request #${req.id} is already assigned to a trip.` });
            }

            if (req.request_type === 'PASSENGER' && req.passengerDetails) {
                totalPassengers += req.passengerDetails.no_of_passengers;
            }
        }

        const capacity = (vehicle.attributes as any)?.seating_capacity || (vehicle.attributes as any)?.capacity || 4; // Default to 4 pax

        if (totalPassengers > capacity) {
            await transaction.rollback();
            return res.status(400).json({
                message: `Vehicle capacity exceeded. Vehicle: ${capacity}, Required: ${totalPassengers}`
            });
        }

        const availabilityConfig = await loadAvailabilityConfig(transaction);
        const driverSchedule = buildTripScheduleFromRequests(
            requests,
            availabilityConfig,
            { includeDriverRest: true }
        );
        const vehicleSchedule = buildTripScheduleFromRequests(
            requests,
            availabilityConfig,
            { includeDriverRest: false }
        );

        const driverConflicts = driverSchedule
            ? await findDriverConflicts(Number(driverId), driverSchedule, {
                excludeRequestIds: requests.map((req) => req.id),
                transaction,
                config: availabilityConfig
            })
            : [];

        const vehicleConflicts = vehicleSchedule
            ? await findVehicleConflicts(Number(vehicleId), vehicleSchedule, {
                excludeRequestIds: requests.map((req) => req.id),
                transaction,
                config: availabilityConfig
            })
            : [];

        if (driverConflicts.length > 0 || vehicleConflicts.length > 0) {
            await transaction.rollback();
            const conflictReasons: string[] = [];
            if (driverConflicts.length > 0) conflictReasons.push('DRIVER_UNAVAILABLE');
            if (vehicleConflicts.length > 0) conflictReasons.push('VEHICLE_UNAVAILABLE');
            return res.status(409).json({
                message: 'Driver and/or vehicle is not available for the requested trip time window.',
                conflictReasons,
                driverNextAvailableAt: getNextAvailableAt(driverConflicts)?.toISOString() ?? null,
                vehicleNextAvailableAt: getNextAvailableAt(vehicleConflicts)?.toISOString() ?? null,
                driverConflicts: driverConflicts.map((conflict) => ({
                    requestId: conflict.requestId,
                    tripId: conflict.tripId,
                    startAt: conflict.startAt.toISOString(),
                    endAt: conflict.endAt.toISOString()
                })),
                vehicleConflicts: vehicleConflicts.map((conflict) => ({
                    requestId: conflict.requestId,
                    tripId: conflict.tripId,
                    startAt: conflict.startAt.toISOString(),
                    endAt: conflict.endAt.toISOString()
                }))
            });
        }

        // Check Override Requirement
        // If >1 request, it's a shared trip. Check logic.
        if (requests.length > 1) {
            for (const req of requests) {
                if (req.request_type === 'PASSENGER' && req.passengerDetails) {
                    if (!req.passengerDetails.share_vehicle && !req.passengerDetails.is_sharable_override) {
                        // If user said NO to share, and we haven't flagged it as overridden yet...
                        // We must require explicit override action.
                        // However, usually this API is called AFTER the UI confirms override.
                        // So we expect `overrideConfirmed` param or similar, or we check if we are allowed.
                        // For simplicity, we assume this endpoint IS the confirmation action.
                        // But strictly, we should mark 'is_sharable_override' here if provided.
                    }
                }
            }
        }

        // Create Trip
        const newTrip = await Trip.create({
            vehicle_id: vehicleId,
            driver_id: driverId,
            date: date || requests[0].passengerDetails?.date, // Fallback to first request date
            start_time: startTime || requests[0].passengerDetails?.time,
            status: TripStatus.PLANNED,
            route_summary: routeSummary || 'Optimized Route'
        }, { transaction });

        // Update Requests
        for (const req of requests) {
            req.trip_id = newTrip.id;
            req.status = RequestStatus.ALLOCATED; // Directly allocated
            await req.save({ transaction });
        }

        await transaction.commit();

        res.status(201).json({
            message: 'Trip created successfully',
            tripId: newTrip.id,
            requests: requestIds.length
        });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Create trip error:', error);
        res.status(500).json({ message: 'Failed to create trip', error: (error as Error).message });
    }
};

export const overrideSharable = async (req: AuthRequest, res: Response) => {
    // COORDINATOR ACTION
    const { requestId } = req.params;
    const { reason } = req.body;

    if (!reason || reason.trim().length === 0) {
        return res.status(400).json({ message: 'Override reason is required' });
    }

    try {
        const request = await VehicleRequest.findByPk(requestId, {
            include: [PassengerRequestDetails]
        });

        if (!request || !request.passengerDetails) {
            return res.status(404).json({ message: 'Request details not found' });
        }

        // Check Restrictions (Mocks)
        // e.g. if (request.is_vip) return 403;

        request.passengerDetails.is_sharable_override = true;
        request.passengerDetails.override_reason = reason;

        // Auto-update sharing pref? Or just allow it to be picked.
        // We'll update share_vehicle to true so it shows up in "Shared" pools logically,
        // but keep the override flag to know it was forced.
        request.passengerDetails.share_vehicle = true;

        await request.passengerDetails.save();

        res.json({ message: 'Request override successful. Marked as sharable.' });

    } catch (error) {
        console.error('Override error:', error);
        res.status(500).json({ message: 'Failed to override request' });
    }
};


export const getTrips = async (req: AuthRequest, res: Response) => {
    try {
        const trips = await Trip.findAll({
            include: [
                { model: Vehicle },
                { model: Driver, include: [{ model: sequelize.models.User }] },
                {
                    model: VehicleRequest,
                    include: [PassengerRequestDetails]
                }
            ],
            order: [['date', 'DESC'], ['start_time', 'DESC']]
        });
        res.json(trips);
    } catch (error) {
        console.error('Get trips error:', error);
        res.status(500).json({ message: 'Failed to fetch trips' });
    }
};

export const deleteTrip = async (req: AuthRequest, res: Response) => {
    // COORDINATOR/TRANSPORT ACTION
    const { id } = req.params;
    const transaction = await sequelize.transaction();

    try {
        const trip = await Trip.findByPk(id);
        if (!trip) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Trip not found' });
        }

        // 1. Find all requests linked to this trip
        const requests = await VehicleRequest.findAll({
            where: { trip_id: id },
            transaction
        });

        // Collect merge group IDs before clearing them (for audit log update)
        const mergeGroupIds = new Set(requests.map(r => r.merge_group_id).filter(Boolean) as string[]);

        // 2. Unlink them, clear merge state, and reset status
        for (const req of requests) {
            req.trip_id = null;
            req.merge_group_id = null as any;
            req.proposed_vehicle_id = null as any;
            req.proposed_vehicle_type_id = null as any;
            req.proposed_attributes = null;
            // Revert to APPROVED — requests went through HOD approval before allocation
            req.status = RequestStatus.APPROVED;
            await req.save({ transaction });

            // Destroy any Allocation records linked to this request
            const { Allocation } = require('../models/Allocation');
            await Allocation.destroy({
                where: { request_id: req.id },
                transaction
            });
        }

        // 3. Mark dissolved merge groups in the audit log
        if (mergeGroupIds.size > 0) {
            const { RideShareSuggestion } = require('../models/RideShareSuggestion');
            for (const gid of mergeGroupIds) {
                await RideShareSuggestion.update(
                    { status: 'DISSOLVED' },
                    { where: { group_id: gid }, transaction }
                );
            }
        }

        // 4. Delete the Trip
        await trip.destroy({ transaction });

        await transaction.commit();

        res.json({ message: 'Trip deleted and requests unassigned successfully.' });

    } catch (error) {
        if (transaction) await transaction.rollback();
        console.error('Delete trip error:', error);
        res.status(500).json({ message: 'Failed to delete trip' });
    }
};

