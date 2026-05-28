import { Request, Response } from 'express';
import { VehicleAttribute } from '../models/VehicleAttribute';

export const createAttribute = async (req: Request, res: Response) => {
    try {
        const { vehicle_type_id, key, label, type, options, unit, is_required } = req.body;
        const attr = await VehicleAttribute.create({
            vehicle_type_id, key, label, type, options, unit, is_required
        });
        res.status(201).json(attr);
    } catch (error) {
        console.error('Create attribute error:', error);
        res.status(500).json({ message: 'Failed to create attribute' });
    }
};

export const deleteAttribute = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const attr = await VehicleAttribute.findByPk(id);
        if (attr) {
            await attr.destroy();
            res.json({ message: 'Attribute deleted' });
        } else {
            res.status(404).json({ message: 'Attribute not found' });
        }
    } catch (error) {
        res.status(500).json({ message: 'Failed to delete attribute' });
    }
};

export const updateAttribute = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { label, type, options, unit, is_required, key } = req.body;

        const attr = await VehicleAttribute.findByPk(id);
        if (!attr) return res.status(404).json({ message: 'Attribute not found' });

        if (label) attr.label = label;
        if (key) attr.key = key;
        if (type) attr.type = type;
        if (options !== undefined) attr.options = options;
        if (unit !== undefined) attr.unit = unit;
        if (is_required !== undefined) attr.is_required = is_required;

        await attr.save();
        res.json(attr);
    } catch (error) {
        console.error('Update attribute error:', error);
        res.status(500).json({ message: 'Failed to update attribute' });
    }
};
