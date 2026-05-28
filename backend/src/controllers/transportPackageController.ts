import { Request, Response } from 'express';
import { TransportPackage, TransportPackageStatus } from '../models/TransportPackage';
import { VehicleType } from '../models/VehicleType';
import { FuelType } from '../models/FuelType';
import { Op } from 'sequelize';

export const getTransportPackages = async (req: Request, res: Response) => {
    try {
        const { vehicle_type_id, fuel_type_id, ac_type, package_category, status, search } = req.query;

        const whereClause: any = {};

        if (vehicle_type_id) whereClause.vehicle_type_id = vehicle_type_id;
        if (fuel_type_id) whereClause.fuel_type_id = fuel_type_id;
        if (ac_type) whereClause.ac_type = ac_type;
        if (package_category) whereClause.package_category = package_category;
        if (status) whereClause.status = status;

        if (search) {
            whereClause.package_name = {
                [Op.like]: `%${search}%`
            };
        }

        const packages = await TransportPackage.findAll({
            where: whereClause,
            include: [
                { model: VehicleType, attributes: ['id', 'name', 'category'] },
                { model: FuelType, attributes: ['id', 'name', 'current_price'] }
            ],
            order: [
                ['effective_date', 'DESC'],
                ['createdAt', 'DESC']
            ]
        });

        res.json(packages);
    } catch (error) {
        console.error('Error fetching transport packages:', error);
        res.status(500).json({ message: 'Failed to fetch transport packages' });
    }
};

export const getTransportPackageById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pkg = await TransportPackage.findByPk(id, {
            include: [
                { model: VehicleType, attributes: ['id', 'name', 'category'] },
                { model: FuelType, attributes: ['id', 'name', 'current_price'] }
            ]
        });

        if (!pkg) {
            return res.status(404).json({ message: 'Transport package not found' });
        }

        res.json(pkg);
    } catch (error) {
        console.error('Error fetching transport package:', error);
        res.status(500).json({ message: 'Failed to fetch transport package details' });
    }
};

export const createTransportPackage = async (req: Request, res: Response) => {
    try {
        const {
            vehicle_type_id,
            fuel_type_id,
            ac_type,
            package_name,
            package_category,
            km_limit,
            day_limit,
            base_amount,
            extra_km_rate,
            fuel_efficiency,
            additional_day_rate,
            additional_day_km_limit,
            ot_rate,
            night_out_rate,
            effective_date,
            status
        } = req.body;

        // Basic validation
        if (!vehicle_type_id || !fuel_type_id || !ac_type || !package_name || !package_category || extra_km_rate === undefined || ot_rate === undefined || night_out_rate === undefined || !effective_date) {
            return res.status(400).json({ message: 'Please fill in all required fields' });
        }

        // Validate vehicle type
        const vehicleType = await VehicleType.findByPk(vehicle_type_id);
        if (!vehicleType) {
            return res.status(400).json({ message: 'Invalid vehicle type' });
        }

        // Validate fuel type
        const fuelType = await FuelType.findByPk(fuel_type_id);
        if (!fuelType) {
            return res.status(400).json({ message: 'Invalid fuel type' });
        }

        // Validate vehicle type and fuel type compatibility
        const vtName = vehicleType.name.toLowerCase();
        const ftName = fuelType.name.toLowerCase();
        
        if (['lorry', 'dimo batta', 'bolero', 'crew cab', 'double cab'].includes(vtName) && ftName === 'petrol') {
            return res.status(400).json({ 
                message: `Vehicle type '${vehicleType.name}' is not compatible with fuel type '${fuelType.name}'. Utility and heavy vehicles must use Diesel, Hybrid, or Electric packages.` 
            });
        }

        // Validate mandatory fields for Monthly/Daily packages
        if ((package_category === 'MONTHLY' || package_category === 'DAILY') && (base_amount === undefined || base_amount === null || km_limit === undefined || km_limit === null || day_limit === undefined || day_limit === null)) {
            return res.status(400).json({ message: 'Base amount, KM limit, and Day limit are required for monthly/daily packages' });
        }

        const packageStatus = status || TransportPackageStatus.ACTIVE;

        // Duplicate active package check for the same effective date
        if (packageStatus === TransportPackageStatus.ACTIVE) {
            const existingDuplicate = await TransportPackage.findOne({
                where: {
                    vehicle_type_id,
                    fuel_type_id,
                    ac_type,
                    package_name,
                    package_category,
                    effective_date,
                    status: TransportPackageStatus.ACTIVE
                }
            });

            if (existingDuplicate) {
                return res.status(409).json({
                    message: 'An active package with these matching details already exists for the same Effective Date.'
                });
            }
        }

        const newPackage = await TransportPackage.create({
            vehicle_type_id,
            fuel_type_id,
            ac_type,
            package_name,
            package_category,
            km_limit: km_limit ? parseInt(km_limit) : null,
            day_limit: day_limit ? parseInt(day_limit) : null,
            base_amount: base_amount ? parseFloat(base_amount) : null,
            extra_km_rate: parseFloat(extra_km_rate),
            fuel_efficiency: fuel_efficiency ? parseFloat(fuel_efficiency) : 0,
            additional_day_rate: additional_day_rate ? parseFloat(additional_day_rate) : null,
            additional_day_km_limit: additional_day_km_limit ? parseInt(additional_day_km_limit) : null,
            ot_rate: parseFloat(ot_rate),
            night_out_rate: parseFloat(night_out_rate),
            effective_date,
            status: packageStatus
        });

        res.status(201).json({ message: 'Transport package created successfully', transportPackage: newPackage });
    } catch (error) {
        console.error('Error creating transport package:', error);
        res.status(500).json({ message: 'Failed to create transport package' });
    }
};

export const updateTransportPackage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const {
            vehicle_type_id,
            fuel_type_id,
            ac_type,
            package_name,
            package_category,
            km_limit,
            day_limit,
            base_amount,
            extra_km_rate,
            fuel_efficiency,
            additional_day_rate,
            additional_day_km_limit,
            ot_rate,
            night_out_rate,
            effective_date,
            status
        } = req.body;

        const pkg = await TransportPackage.findByPk(id);
        if (!pkg) {
            return res.status(404).json({ message: 'Transport package not found' });
        }

        // Validate vehicle type and fuel type compatibility
        const targetVehicleTypeId = vehicle_type_id || pkg.vehicle_type_id;
        const targetFuelTypeId = fuel_type_id || pkg.fuel_type_id;

        const vehicleType = await VehicleType.findByPk(targetVehicleTypeId);
        if (!vehicleType) {
            return res.status(400).json({ message: 'Invalid vehicle type' });
        }

        const fuelType = await FuelType.findByPk(targetFuelTypeId);
        if (!fuelType) {
            return res.status(400).json({ message: 'Invalid fuel type' });
        }

        const vtName = vehicleType.name.toLowerCase();
        const ftName = fuelType.name.toLowerCase();
        if (['lorry', 'dimo batta', 'bolero', 'crew cab', 'double cab'].includes(vtName) && ftName === 'petrol') {
            return res.status(400).json({ 
                message: `Vehicle type '${vehicleType.name}' is not compatible with fuel type '${fuelType.name}'. Utility and heavy vehicles must use Diesel, Hybrid, or Electric packages.` 
            });
        }

        // Validate mandatory fields for Monthly/Daily packages
        const targetCategory = package_category || pkg.package_category;
        if (targetCategory === 'MONTHLY' || targetCategory === 'DAILY') {
            const targetBaseAmount = base_amount !== undefined ? base_amount : pkg.base_amount;
            const targetKmLimit = km_limit !== undefined ? km_limit : pkg.km_limit;
            const targetDayLimit = day_limit !== undefined ? day_limit : pkg.day_limit;
            
            if (targetBaseAmount === null || targetBaseAmount === undefined || 
                targetKmLimit === null || targetKmLimit === undefined || 
                targetDayLimit === null || targetDayLimit === undefined) {
                return res.status(400).json({ message: 'Base amount, KM limit, and Day limit are required for monthly/daily packages' });
            }
        }

        // Determine if rate details are changed
        const ratesChanged = 
            (base_amount !== undefined && parseFloat(base_amount || "0") !== parseFloat(pkg.base_amount?.toString() || "0")) ||
            (extra_km_rate !== undefined && parseFloat(extra_km_rate) !== parseFloat(pkg.extra_km_rate.toString())) ||
            (fuel_efficiency !== undefined && parseFloat(fuel_efficiency || "0") !== parseFloat(pkg.fuel_efficiency?.toString() || "0")) ||
            (additional_day_rate !== undefined && parseFloat(additional_day_rate || "0") !== parseFloat(pkg.additional_day_rate?.toString() || "0")) ||
            (ot_rate !== undefined && parseFloat(ot_rate) !== parseFloat(pkg.ot_rate.toString())) ||
            (night_out_rate !== undefined && parseFloat(night_out_rate) !== parseFloat(pkg.night_out_rate.toString()));

        // Enforce rate history business rule:
        // "old package rates should remain saved; package history should not be overwritten"
        // If rates are changed and the effective date is different from the saved one,
        // create a new version of the package. If the effective date is the same,
        // we update the current record (meaning they are correcting rates for that specific effective date).
        const targetEffectiveDate = effective_date || pkg.effective_date;

        if (ratesChanged && targetEffectiveDate !== pkg.effective_date) {
            // Create a new version as a new package record (leaving old record untouched)
            // Ensure no duplicate active version exists for the new effective date
            const newStatus = status || pkg.status;
            if (newStatus === TransportPackageStatus.ACTIVE) {
                const duplicateActive = await TransportPackage.findOne({
                    where: {
                        vehicle_type_id: vehicle_type_id || pkg.vehicle_type_id,
                        fuel_type_id: fuel_type_id || pkg.fuel_type_id,
                        ac_type: ac_type || pkg.ac_type,
                        package_name: package_name || pkg.package_name,
                        package_category: package_category || pkg.package_category,
                        effective_date: targetEffectiveDate,
                        status: TransportPackageStatus.ACTIVE
                    }
                });

                if (duplicateActive) {
                    return res.status(409).json({
                        message: 'An active package version with these matching details already exists for the new Effective Date.'
                    });
                }
            }

            const newVersion = await TransportPackage.create({
                vehicle_type_id: vehicle_type_id || pkg.vehicle_type_id,
                fuel_type_id: fuel_type_id || pkg.fuel_type_id,
                ac_type: ac_type || pkg.ac_type,
                package_name: package_name || pkg.package_name,
                package_category: package_category || pkg.package_category,
                km_limit: km_limit !== undefined ? (km_limit ? parseInt(km_limit) : null) : pkg.km_limit,
                day_limit: day_limit !== undefined ? (day_limit ? parseInt(day_limit) : null) : pkg.day_limit,
                base_amount: base_amount !== undefined ? (base_amount ? parseFloat(base_amount) : null) : pkg.base_amount,
                extra_km_rate: extra_km_rate !== undefined ? parseFloat(extra_km_rate) : pkg.extra_km_rate,
                fuel_efficiency: fuel_efficiency !== undefined ? parseFloat(fuel_efficiency) : pkg.fuel_efficiency,
                additional_day_rate: additional_day_rate !== undefined ? (additional_day_rate ? parseFloat(additional_day_rate) : null) : pkg.additional_day_rate,
                additional_day_km_limit: additional_day_km_limit !== undefined ? (additional_day_km_limit ? parseInt(additional_day_km_limit) : null) : pkg.additional_day_km_limit,
                ot_rate: ot_rate !== undefined ? parseFloat(ot_rate) : pkg.ot_rate,
                night_out_rate: night_out_rate !== undefined ? parseFloat(night_out_rate) : pkg.night_out_rate,
                effective_date: targetEffectiveDate,
                status: newStatus
            });

            return res.status(201).json({
                message: 'Rates changed. Created a new package rate history version successfully.',
                transportPackage: newVersion,
                historyCreated: true
            });
        }

        // If rates didn't change, or the effective date is the same (modifying current version), update the row
        if (status === TransportPackageStatus.ACTIVE && pkg.status !== TransportPackageStatus.ACTIVE) {
            // Activating package: check duplicate active packages for same date
            const duplicateActive = await TransportPackage.findOne({
                where: {
                    id: { [Op.ne]: pkg.id },
                    vehicle_type_id: vehicle_type_id || pkg.vehicle_type_id,
                    fuel_type_id: fuel_type_id || pkg.fuel_type_id,
                    ac_type: ac_type || pkg.ac_type,
                    package_name: package_name || pkg.package_name,
                    package_category: package_category || pkg.package_category,
                    effective_date: targetEffectiveDate,
                    status: TransportPackageStatus.ACTIVE
                }
            });

            if (duplicateActive) {
                return res.status(409).json({
                    message: 'An active package version with these matching details already exists for this Effective Date.'
                });
            }
        }

        await pkg.update({
            vehicle_type_id: vehicle_type_id || pkg.vehicle_type_id,
            fuel_type_id: fuel_type_id || pkg.fuel_type_id,
            ac_type: ac_type || pkg.ac_type,
            package_name: package_name || pkg.package_name,
            package_category: package_category || pkg.package_category,
            km_limit: km_limit !== undefined ? (km_limit ? parseInt(km_limit) : null) : pkg.km_limit,
            day_limit: day_limit !== undefined ? (day_limit ? parseInt(day_limit) : null) : pkg.day_limit,
            base_amount: base_amount !== undefined ? (base_amount ? parseFloat(base_amount) : null) : pkg.base_amount,
            extra_km_rate: extra_km_rate !== undefined ? parseFloat(extra_km_rate) : pkg.extra_km_rate,
            fuel_efficiency: fuel_efficiency !== undefined ? parseFloat(fuel_efficiency) : pkg.fuel_efficiency,
            additional_day_rate: additional_day_rate !== undefined ? (additional_day_rate ? parseFloat(additional_day_rate) : null) : pkg.additional_day_rate,
            additional_day_km_limit: additional_day_km_limit !== undefined ? (additional_day_km_limit ? parseInt(additional_day_km_limit) : null) : pkg.additional_day_km_limit,
            ot_rate: ot_rate !== undefined ? parseFloat(ot_rate) : pkg.ot_rate,
            night_out_rate: night_out_rate !== undefined ? parseFloat(night_out_rate) : pkg.night_out_rate,
            effective_date: targetEffectiveDate,
            status: status || pkg.status
        });

        res.json({ message: 'Transport package updated successfully', transportPackage: pkg });
    } catch (error) {
        console.error('Error updating transport package:', error);
        res.status(500).json({ message: 'Failed to update transport package' });
    }
};

export const updateTransportPackageStatus = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { status } = req.body;

        if (!status || !Object.values(TransportPackageStatus).includes(status)) {
            return res.status(400).json({ message: 'Invalid status' });
        }

        const pkg = await TransportPackage.findByPk(id);
        if (!pkg) {
            return res.status(404).json({ message: 'Transport package not found' });
        }

        if (status === TransportPackageStatus.ACTIVE) {
            // Check for duplicate active packages on the same effective date
            const duplicateActive = await TransportPackage.findOne({
                where: {
                    id: { [Op.ne]: pkg.id },
                    vehicle_type_id: pkg.vehicle_type_id,
                    fuel_type_id: pkg.fuel_type_id,
                    ac_type: pkg.ac_type,
                    package_name: pkg.package_name,
                    package_category: pkg.package_category,
                    effective_date: pkg.effective_date,
                    status: TransportPackageStatus.ACTIVE
                }
            });

            if (duplicateActive) {
                return res.status(409).json({
                    message: 'Cannot activate. Another active package version already exists for the same Effective Date.'
                });
            }
        }

        pkg.status = status;
        await pkg.save();

        res.json({ message: `Transport package status updated to ${status}`, transportPackage: pkg });
    } catch (error) {
        console.error('Error updating transport package status:', error);
        res.status(500).json({ message: 'Failed to update transport package status' });
    }
};

export const deleteTransportPackage = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const pkg = await TransportPackage.findByPk(id);
        if (!pkg) {
            return res.status(404).json({ message: 'Transport package not found' });
        }

        await pkg.destroy();
        res.json({ message: 'Transport package deleted successfully' });
    } catch (error) {
        console.error('Error deleting transport package:', error);
        res.status(500).json({ message: 'Failed to delete transport package' });
    }
};

export const getPackageHistory = async (req: Request, res: Response) => {
    try {
        const { vehicle_type_id, fuel_type_id, ac_type, package_name, package_category } = req.query;

        if (!vehicle_type_id || !fuel_type_id || !ac_type || !package_name || !package_category) {
            return res.status(400).json({ message: 'Missing query parameters to identify the package group' });
        }

        const history = await TransportPackage.findAll({
            where: {
                vehicle_type_id,
                fuel_type_id,
                ac_type,
                package_name,
                package_category
            },
            include: [
                { model: VehicleType, attributes: ['name'] },
                { model: FuelType, attributes: ['name'] }
            ],
            order: [['effective_date', 'DESC']]
        });

        res.json(history);
    } catch (error) {
        console.error('Error fetching package history:', error);
        res.status(500).json({ message: 'Failed to fetch package history' });
    }
};
