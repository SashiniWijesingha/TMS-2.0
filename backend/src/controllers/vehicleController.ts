import { Request, Response } from 'express';
import { Vehicle, VehicleAvailabilityStatus } from '../models/Vehicle';
import { VehicleType } from '../models/VehicleType';
import { Driver } from '../models/Driver';
import { User } from '../models/User';
import { TransportPackage } from '../models/TransportPackage';
import { FuelType } from '../models/FuelType';
import fs from 'fs';

interface MulterRequest extends Request {
    files?: { [fieldname: string]: Express.Multer.File[] } | Express.Multer.File[];
}

export const createVehicle = async (req: MulterRequest, res: Response) => {
    try {
        const { vehicle_number, vehicle_type_id, specification, availability_status, ownership } = req.body;

        const existingVehicle = await Vehicle.findOne({ where: { vehicle_number } });
        if (existingVehicle) {
            return res.status(400).json({ message: 'Vehicle already exists with this number' });
        }

        // Handle Documents
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const documents: any = {};

        const docFields = ['revenue_licence', 'emission_report', 'insurance', 'registration_book'];
        docFields.forEach(field => {
            if (files && files[field] && files[field][0]) {
                documents[field] = {
                    path: files[field][0].path,
                    expiry: req.body[`${field}_expiry`] || null
                };
            }
        });

        const newVehicle = await Vehicle.create({
            vehicle_number,
            vehicle_type_id,
            specification,
            availability_status: availability_status || VehicleAvailabilityStatus.AVAILABLE,
            ownership: ownership || 'COMPANY',
            seating_capacity: req.body.seating_capacity || 4,
            attributes: typeof req.body.attributes === 'string' ? JSON.parse(req.body.attributes) : req.body.attributes,
            documents: Object.keys(documents).length > 0 ? documents : null
        });

        res.status(201).json({ message: 'Vehicle created successfully', vehicle: newVehicle });
    } catch (error) {
        console.error('Error creating vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getAllVehicles = async (req: Request, res: Response) => {
    try {
        const vehicles = await Vehicle.findAll({
            include: [
                { model: VehicleType },
                { model: Driver, include: [{ model: User, attributes: ['name'] }] },
                { model: TransportPackage, include: [{ model: FuelType, attributes: ['id', 'name', 'current_price'] }] }
            ]
        });
        res.json(vehicles);
    } catch (error) {
        console.error('Error fetching vehicles:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const getVehicleById = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const vehicle = await Vehicle.findByPk(id);

        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        res.json(vehicle);
    } catch (error) {
        console.error('Error fetching vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateVehicle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { vehicle_number, vehicle_type_id, specification, availability_status } = req.body;

        const vehicle = await Vehicle.findByPk(id);
        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        if (vehicle_number) vehicle.vehicle_number = vehicle_number;
        if (vehicle_type_id) vehicle.vehicle_type_id = vehicle_type_id;
        if (specification) vehicle.specification = specification;
        if (availability_status) vehicle.availability_status = availability_status;
        if (req.body.ownership) vehicle.ownership = req.body.ownership;

        if (req.body.attributes) {
            vehicle.attributes = typeof req.body.attributes === 'string' ? JSON.parse(req.body.attributes) : req.body.attributes;
        }

        // Handle Documents update
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const currentDocuments = vehicle.documents || {};
        const docFields = ['revenue_licence', 'emission_report', 'insurance', 'registration_book'];

        docFields.forEach(field => {
            if (files && files[field] && files[field][0]) {
                // Delete old file if exists
                if (currentDocuments[field] && fs.existsSync(currentDocuments[field].path)) {
                    fs.unlinkSync(currentDocuments[field].path);
                }
                currentDocuments[field] = {
                    path: files[field][0].path,
                    expiry: req.body[`${field}_expiry`] || null
                };
            } else if (req.body[`${field}_expiry`]) {
                // Just update expiry if no new file
                if (currentDocuments[field]) {
                    currentDocuments[field].expiry = req.body[`${field}_expiry`];
                }
            }
        });

        if (Object.keys(currentDocuments).length > 0) {
            vehicle.documents = currentDocuments;
            vehicle.changed('documents', true);
        }

        await vehicle.save();

        res.json({ message: 'Vehicle updated successfully', vehicle });
    } catch (error) {
        console.error('Error updating vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteVehicle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const vehicle = await Vehicle.findByPk(id);

        if (!vehicle) {
            return res.status(404).json({ message: 'Vehicle not found' });
        }

        await vehicle.destroy();
        res.json({ message: 'Vehicle deleted successfully' });
    } catch (error) {
        console.error('Error deleting vehicle:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const assignDriverToVehicle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { driverId } = req.body; // driverId of the Driver model

        const vehicle = await Vehicle.findByPk(id);
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        if (!driverId) {
            // Unassign
            vehicle.assigned_driver_id = null as any;
            await vehicle.save();
            return res.json({ message: 'Driver unassigned' });
        }

        const driver = await Driver.findByPk(driverId, { include: [User] });
        if (!driver) return res.status(404).json({ message: 'Driver not found' });

        // Check compatibility
        const allowedIds = driver.allowed_vehicle_type_ids || [];
        if (!allowedIds.includes(vehicle.vehicle_type_id)) {
            const vType = await VehicleType.findByPk(vehicle.vehicle_type_id);
            return res.status(400).json({
                message: `Driver ${driver.user?.name || 'Unknown'} is not authorized to drive ${vType?.name || 'this vehicle type'}`
            });
        }

        vehicle.assigned_driver_id = driver.id; // @ts-ignore
        await vehicle.save();

        res.json({ message: 'Driver assigned permanently', vehicle });

    } catch (error) {
        console.error('Assign driver error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const assignPackageToVehicle = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { packageId } = req.body;

        const vehicle = await Vehicle.findByPk(id, {
            include: [{ model: VehicleType }]
        });
        if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });

        if (!packageId) {
            // Unassign package
            vehicle.active_package_id = null as any;
            await vehicle.save();
            return res.json({ message: 'Package unassigned from vehicle successfully' });
        }

        const pkg = await TransportPackage.findByPk(packageId, {
            include: [{ model: VehicleType }]
        });
        if (!pkg) return res.status(404).json({ message: 'Transport package not found' });

        // Validate: package vehicle type must match vehicle's vehicle type
        if (pkg.vehicle_type_id !== vehicle.vehicle_type_id) {
            return res.status(400).json({
                message: `Package vehicle type '${pkg.vehicleType?.name}' does not match vehicle type '${vehicle.vehicleType?.name}'. Please select a compatible package.`
            });
        }

        // Validate: package must be ACTIVE
        if (pkg.status !== 'ACTIVE') {
            return res.status(400).json({
                message: 'Cannot assign an inactive package. Please activate the package first.'
            });
        }

        vehicle.active_package_id = pkg.id;
        await vehicle.save();

        res.json({ message: `Package '${pkg.package_name}' assigned to vehicle '${vehicle.vehicle_number}' successfully`, vehicle });
    } catch (error) {
        console.error('Assign package error:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
