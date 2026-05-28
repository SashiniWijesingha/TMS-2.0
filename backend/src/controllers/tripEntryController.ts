import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../middleware/authMiddleware';
import { Driver } from '../models/Driver';
import { FuelType } from '../models/FuelType';
import { TransportPackage } from '../models/TransportPackage';
import { TripEntry } from '../models/TripEntry';
import { User } from '../models/User';
import { Vehicle } from '../models/Vehicle';

const parseNumber = (value: unknown) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
};

const parseDate = (value: unknown) => {
    if (typeof value !== 'string' || !value.trim()) return null;
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : value;
};

export const createTripEntry = async (req: AuthRequest, res: Response) => {
    try {
        const {
            driverId,
            vehicleId,
            packageId,
            totalKm,
            totalTripDays,
            otHours,
            nightOutCount
        } = req.body;

        if (!driverId || !vehicleId || !packageId) {
            return res.status(400).json({ message: 'driverId, vehicleId, and packageId are required.' });
        }

        const totalKmValue = parseNumber(totalKm);
        const totalTripDaysValue = Math.max(1, parseNumber(totalTripDays) || 1);
        const otHoursValue = Math.max(0, parseNumber(otHours) || 0);
        const nightOutCountValue = Math.max(0, parseNumber(nightOutCount) || 0);

        if (totalKmValue === null || totalKmValue < 0) {
            return res.status(400).json({ message: 'totalKm must be a valid non-negative number.' });
        }

        const transportPackage = await TransportPackage.findByPk(packageId);
        if (!transportPackage) {
            return res.status(404).json({ message: 'Transport package not found.' });
        }

        const startKmValue = 0;
        const endKmValue = totalKmValue;
        const finalTotalKm = totalKmValue;
        const additionalDays = Math.max(0, totalTripDaysValue - 1);

        const baseAmount = Number(transportPackage.base_amount || 0);
        const extraKmRate = Number(transportPackage.extra_km_rate || 0);
        const otRate = Number(transportPackage.ot_rate || 0);
        const nightOutRate = Number(transportPackage.night_out_rate || 0);
        const additionalDayRate = Number(transportPackage.additional_day_rate || 0);
        const kmLimit = transportPackage.km_limit ?? null;
        const additionalDayKmLimit = transportPackage.additional_day_km_limit ?? null;

        const effectiveKmLimit = kmLimit === null
            ? null
            : (kmLimit || 0) + additionalDays * (additionalDayKmLimit || 0);

        const extraKm = effectiveKmLimit === null ? 0 : Math.max(0, finalTotalKm - effectiveKmLimit);

        const baseAmountTotal = transportPackage.package_category === 'PER_KM'
            ? finalTotalKm * extraKmRate
            : baseAmount;

        const extraKmAmount = transportPackage.package_category === 'PER_KM'
            ? 0
            : extraKm * extraKmRate;

        const additionalDayAmount = additionalDays * additionalDayRate;
        const otAmount = otHoursValue * otRate;
        const nightOutAmount = nightOutCountValue * nightOutRate;

        // Fuel adjustment calculation
        const fuelConsumption = Number(transportPackage.fuel_efficiency || 0);
        let fuelAdjustment = 0;
        
        const fuelType = await FuelType.findByPk(transportPackage.fuel_type_id);
        if (fuelType && fuelType.new_price && fuelConsumption > 0) {
            const currentPrice = Number(fuelType.current_price); // This is labeled "New Price" in UI
            const newPrice = Number(fuelType.new_price);       // This is labeled "previous price" in UI
            
            // Adjustment = (New Price - Baseline Price) / Efficiency * KM
            // Labeled "New Price" acts as the baseline for this trip entry
            fuelAdjustment = ((newPrice - currentPrice) / fuelConsumption) * finalTotalKm;
        }

        const finalAmount = baseAmountTotal + extraKmAmount + additionalDayAmount + otAmount + nightOutAmount + fuelAdjustment;

        const entryDate = new Date().toISOString().slice(0, 10);

        const tripEntry = await TripEntry.create({
            driver_id: Number(driverId),
            vehicle_id: Number(vehicleId),
            transport_package_id: Number(packageId),
            entry_date: entryDate,
            start_km: startKmValue,
            end_km: endKmValue,
            total_km: finalTotalKm,
            extra_km: extraKm,
            total_trip_days: totalTripDaysValue,
            ot_hours: otHoursValue,
            night_out_count: nightOutCountValue,
            package_name: transportPackage.package_name,
            package_category: transportPackage.package_category,
            km_limit: kmLimit,
            additional_day_km_limit: additionalDayKmLimit,
            base_amount: baseAmount,
            extra_km_rate: extraKmRate,
            fuel_adjustment: fuelAdjustment,
            additional_day_rate: additionalDayRate,
            ot_rate: otRate,
            night_out_rate: nightOutRate,
            base_amount_total: baseAmountTotal,
            extra_km_amount: extraKmAmount,
            additional_day_amount: additionalDayAmount,
            ot_amount: otAmount,
            night_out_amount: nightOutAmount,
            final_amount: finalAmount
        });

        return res.status(201).json({
            message: 'Trip entry saved successfully.',
            tripEntry
        });
    } catch (error) {
        console.error('Create trip entry error:', error);
        return res.status(500).json({ message: 'Failed to save trip entry.' });
    }
};

export const getTripEntries = async (req: AuthRequest, res: Response) => {
    try {
        const query = typeof req.query.q === 'string' ? req.query.q.trim() : '';
        const status = typeof req.query.status === 'string' ? req.query.status.trim().toUpperCase() : '';
        const from = parseDate(req.query.from);
        const to = parseDate(req.query.to);

        if (status && status !== 'SAVED') {
            return res.json([]);
        }

        const where: Record<string, any> = {};
        if (from && to) {
            where.entry_date = { [Op.between]: [from, to] };
        } else if (from) {
            where.entry_date = { [Op.gte]: from };
        } else if (to) {
            where.entry_date = { [Op.lte]: to };
        }

        if (query) {
            (where as any)[Op.or] = [
                { package_name: { [Op.like]: `%${query}%` } },
                { '$vehicle.vehicle_number$': { [Op.like]: `%${query}%` } },
                { '$driver.user.name$': { [Op.like]: `%${query}%` } }
            ];
        }

        const tripEntries = await TripEntry.findAll({
            where,
            include: [
                { model: Vehicle, attributes: ['id', 'vehicle_number'] },
                {
                    model: Driver,
                    include: [{ model: User, attributes: ['id', 'name'] }]
                },
                { model: TransportPackage, attributes: ['id', 'package_name', 'package_category'] }
            ],
            order: [['entry_date', 'DESC'], ['createdAt', 'DESC']],
            subQuery: false
        });

        const response = tripEntries.map((entry: any) => ({
            ...entry.toJSON(),
            status: 'SAVED'
        }));

        return res.json(response);
    } catch (error) {
        console.error('Get trip entries error:', error);
        return res.status(500).json({ message: 'Failed to fetch trip entries.' });
    }
};

export const getTripEntryById = async (req: AuthRequest, res: Response) => {
    try {
        const entry = await TripEntry.findByPk(req.params.id, {
            include: [
                { model: Vehicle, attributes: ['id', 'vehicle_number', 'vehicle_type_id'] },
                {
                    model: Driver,
                    include: [{ model: User, attributes: ['id', 'name'] }]
                },
                { model: TransportPackage }
            ]
        });

        if (!entry) {
            return res.status(404).json({ message: 'Trip entry not found.' });
        }

        return res.json({
            ...entry.toJSON(),
            status: 'SAVED'
        });
    } catch (error) {
        console.error('Get trip entry by id error:', error);
        return res.status(500).json({ message: 'Failed to fetch trip entry.' });
    }
};
