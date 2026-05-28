import { Request, Response } from 'express';
import { Division } from '../models/Division';
import { SubDivision } from '../models/SubDivision';
import { User } from '../models/User';

export const getDivisions = async (req: Request, res: Response) => {
    try {
        const divisions = await Division.findAll({
            include: [
                {
                    model: SubDivision,
                    include: [User]
                },
                User
            ]
        });
        res.json(divisions);
    } catch (error) {
        console.error('Error fetching divisions:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const createDivision = async (req: Request, res: Response) => {
    try {
        console.log('[Division] Creating division:', req.body);
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'Division name is required' });
        }

        const existing = await Division.findOne({ where: { name } });
        if (existing) {
            return res.status(400).json({ message: 'Division with this name already exists' });
        }

        const division = await Division.create({ name });
        res.status(201).json(division);
    } catch (error) {
        console.error('Error creating division:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateDivision = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const division = await Division.findByPk(id);
        if (!division) {
            return res.status(404).json({ message: 'Division not found' });
        }

        if (name) division.name = name;
        await division.save();

        res.json({ message: 'Division updated', division });
    } catch (error) {
        console.error('Error updating division:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteDivision = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const division = await Division.findByPk(id);

        if (!division) {
            return res.status(404).json({ message: 'Division not found' });
        }

        await division.destroy();
        res.json({ message: 'Division deleted' });
    } catch (error) {
        console.error('Error deleting division:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

// SubDivision Controllers
export const createSubDivision = async (req: Request, res: Response) => {
    try {
        const { divisionId } = req.params;
        const { name } = req.body;

        if (!name) {
            return res.status(400).json({ message: 'SubDivision name is required' });
        }

        const division = await Division.findByPk(divisionId);
        if (!division) {
            return res.status(404).json({ message: 'Division not found' });
        }

        const subDivision = await SubDivision.create({
            name,
            division_id: parseInt(divisionId)
        });

        res.status(201).json(subDivision);
    } catch (error) {
        console.error('Error creating sub-division:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const updateSubDivision = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const { name } = req.body;

        const subDivision = await SubDivision.findByPk(id);
        if (!subDivision) {
            return res.status(404).json({ message: 'SubDivision not found' });
        }

        if (name) subDivision.name = name;
        await subDivision.save();

        res.json({ message: 'SubDivision updated', subDivision });
    } catch (error) {
        console.error('Error updating sub-division:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};

export const deleteSubDivision = async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        const subDivision = await SubDivision.findByPk(id);

        if (!subDivision) {
            return res.status(404).json({ message: 'SubDivision not found' });
        }

        // Unassign users from this subdivision
        await User.update(
            { sub_division_id: null },
            { where: { sub_division_id: id } }
        );

        await subDivision.destroy();
        res.json({ message: 'SubDivision deleted' });
    } catch (error) {
        console.error('Error deleting sub-division:', error);
        res.status(500).json({ message: 'Internal server error' });
    }
};
