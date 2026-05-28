import { Request, Response } from 'express';
import { FuelType } from '../models/FuelType';

export const getAllFuelTypes = async (req: Request, res: Response) => {
    try {
        const fuelTypes = await FuelType.findAll({
            order: [['createdAt', 'DESC']]
        });
        res.status(200).json(fuelTypes);
    } catch (error) {
        console.error('Error fetching fuel types:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createFuelType = async (req: Request, res: Response) => {
    try {
        const { name, current_price, new_price, effective_date, status } = req.body;
        const document_path = req.file ? `uploads/fuel_docs/${req.file.filename}` : null;

        const fuelType = await FuelType.create({
            name,
            current_price: current_price ? parseFloat(current_price) : 0,
            new_price: new_price ? parseFloat(new_price) : 0,
            previous_price: null,
            effective_date,
            document_path,
            status: status || 'ACTIVE'
        });

        res.status(201).json({ message: 'Fuel type created successfully', fuelType });
    } catch (error: any) {
        console.error('Error creating fuel type:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const updateFuelType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name, current_price, new_price, effective_date, status } = req.body;

        const fuelType = await FuelType.findByPk(id);
        if (!fuelType) {
            return res.status(404).json({ message: 'Fuel type not found' });
        }

        // Logic to update data
        const updateData: any = { name, status };

        // Handle numeric fields safely to avoid NaN
        if (new_price !== undefined && new_price !== '') {
            const parsedNewPrice = parseFloat(new_price);
            if (!isNaN(parsedNewPrice)) {
                updateData.new_price = parsedNewPrice;
            }
        } else if (new_price === '') {
            updateData.new_price = 0;
        }

        // If a new document is uploaded, update path
        if (req.file) {
            updateData.document_path = `uploads/fuel_docs/${req.file.filename}`;
        }
        
        // Move current price to previous price if price is being changed
        // We use Number() to ensure we are comparing numeric values (Sequelize might return strings for Decimals)
        if (current_price !== undefined && current_price !== '') {
            const incomingCurrentPrice = parseFloat(current_price);
            const databaseCurrentPrice = Number(fuelType.current_price);

            if (!isNaN(incomingCurrentPrice) && incomingCurrentPrice !== databaseCurrentPrice) {
                updateData.previous_price = databaseCurrentPrice;
                updateData.current_price = incomingCurrentPrice;
                updateData.effective_date = effective_date || new Date().toISOString().split('T')[0];
            } else if (effective_date) {
                updateData.effective_date = effective_date;
            }
        } else if (effective_date) {
            updateData.effective_date = effective_date;
        }

        await fuelType.update(updateData);

        res.status(200).json({ message: 'Fuel type updated successfully', fuelType });
    } catch (error: any) {
        console.error('Error updating fuel type:', error);
        res.status(500).json({ 
            message: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        });
    }
};

export const deleteFuelType = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const fuelType = await FuelType.findByPk(id);
        if (!fuelType) {
            return res.status(404).json({ message: 'Fuel type not found' });
        }
        await fuelType.destroy();
        res.status(200).json({ message: 'Fuel type deleted successfully' });
    } catch (error: any) {
        // Check for Sequelize foreign key constraint error
        if (error.name === 'SequelizeForeignKeyConstraintError') {
            return res.status(400).json({ 
                message: 'Cannot delete this fuel type because it is currently assigned to one or more transport packages.' 
            });
        }

        console.error('Error deleting fuel type:', error);
        
        res.status(500).json({ 
            message: 'Internal server error',
            details: error instanceof Error ? error.message : 'Unknown error'
        });
    }
};
