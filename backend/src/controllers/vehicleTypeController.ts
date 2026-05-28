import { Request, Response } from 'express';
import { VehicleType } from '../models/VehicleType';

export const createVehicleType = async (req: Request, res: Response) => {
    try {
        const { name, category } = req.body;
        if (!name) return res.status(400).json({ message: 'Name is required' });

        const type = await VehicleType.create({ name, category });
        res.status(201).json(type);
    } catch (error: any) {
        console.error('Create vehicle type error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Vehicle type with this name already exists' });
        }
        res.status(500).json({ message: 'Failed to create vehicle type' });
    }
};

export const getVehicleTypes = async (req: Request, res: Response) => {
    try {
        const types = await VehicleType.findAll({
            include: ['attributes']
        });
        res.json(types);
    } catch (error) {
        console.error('Get vehicle types error:', error);
        res.status(500).json({ message: 'Failed to fetch vehicle types' });
    }
};

export const deleteVehicleType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const type = await VehicleType.findByPk(id);
        if (!type) return res.status(404).json({ message: 'Vehicle type not found' });

        // Check if in use? Sequelize might throw FK error if vehicles exist.
        await type.destroy();
        res.json({ message: 'Vehicle type deleted' });
    } catch (error: any) {
        console.error('Delete vehicle type error:', error);
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(409).json({ message: 'Cannot delete type because it is assigned to existing vehicles.' });
        }
        res.status(500).json({ message: 'Failed to delete vehicle type' });
    }
};

export const updateVehicleType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, category } = req.body;
        const type = await VehicleType.findByPk(id);

        if (!type) return res.status(404).json({ message: 'Vehicle type not found' });

        if (name) type.name = name;
        if (category) type.category = category;

        await type.save();
        res.json(type);
    } catch (error: any) {
        console.error('Update vehicle type error:', error);
        if (error.name === 'SequelizeUniqueConstraintError') {
            return res.status(409).json({ message: 'Vehicle type with this name already exists' });
        }
        res.status(500).json({ message: 'Failed to update vehicle type' });
    }
};
