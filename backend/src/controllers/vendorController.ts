import { Response } from 'express';
import { QueryTypes } from 'sequelize';
import { AuthRequest } from '../middleware/authMiddleware';
import { VehicleRequest, RequestStatus } from '../models/VehicleRequest';
import { NotificationService } from '../services/notificationService';
import hrisSequelize from '../config/hrisDatabase';

/**
 * GET /vendors?q=<search>
 * Returns vendor companies from the HRIS database (payee_name category 2).
 * Supports optional search by vendor code or name (max 100 results; 50 when searching).
 */
export const getVendors = async (req: AuthRequest, res: Response) => {
    const raw = req.query.q;
    const q = typeof raw === 'string' ? raw.trim() : '';

    try {
        let vendors: any[];

        if (q) {
            const search = `%${q}%`;
            vendors = await hrisSequelize.query(
                `SELECT PN.VENDOR_CODE, PN.NAME, VM.MOBILE_NUMBER
                 FROM ${process.env.DB_HDOC || 'Hdoc_FENTONS'}.payee_name PN
                 JOIN ${process.env.DB_HDOC || 'Hdoc_FENTONS'}.vendor_mobile VM
                   ON PN.VENDOR_CODE COLLATE utf8mb4_unicode_ci = VM.VENDOR COLLATE utf8mb4_unicode_ci
                 WHERE PN.CATEGORY = '2'
                   AND (PN.VENDOR_CODE LIKE ? OR PN.NAME LIKE ?)
                 ORDER BY PN.NAME
                 LIMIT 50`,
                { replacements: [search, search], type: QueryTypes.SELECT }
            );
        } else {
            vendors = await hrisSequelize.query(
                `SELECT PN.VENDOR_CODE, PN.NAME, VM.MOBILE_NUMBER
                 FROM ${process.env.DB_HDOC || 'Hdoc_FENTONS'}.payee_name PN
                 JOIN ${process.env.DB_HDOC || 'Hdoc_FENTONS'}.vendor_mobile VM
                   ON PN.VENDOR_CODE COLLATE utf8mb4_unicode_ci = VM.VENDOR COLLATE utf8mb4_unicode_ci
                 WHERE PN.CATEGORY = '2'
                 ORDER BY PN.NAME
                 LIMIT 100`,
                { replacements: [], type: QueryTypes.SELECT }
            );
        }

        res.json(vendors);
    } catch (error: any) {
        console.error('[vendorController] getVendors error:', error);
        res.status(500).json({ message: 'Failed to fetch vendors', error: error.message });
    }
};

/**
 * PUT /requests/:requestId/assign-vendor
 * Transport officer assigns an external vendor company to a request.
 * The request must be in APPROVED status.
 * Sets status to VENDOR_ALLOCATED and notifies the requester.
 */
export const assignVendor = async (req: AuthRequest, res: Response) => {
    const { requestId } = req.params;
    const { vendor_code, vendor_name, vendor_mobile } = req.body;

    if (!vendor_name || !vendor_name.trim()) {
        return res.status(400).json({ message: 'Vendor name is required.' });
    }
    if (!vendor_mobile || !vendor_mobile.trim()) {
        return res.status(400).json({ message: 'Vendor mobile number is required.' });
    }

    try {
        const request = await VehicleRequest.findByPk(requestId);

        if (!request) {
            return res.status(404).json({ message: 'Request not found.' });
        }

        if (request.status !== RequestStatus.APPROVED) {
            return res.status(400).json({
                message: `Request must be in APPROVED status to assign a vendor (current: ${request.status}).`
            });
        }

        // Block if this request is part of a merge group with unapproved siblings
        if (request.merge_group_id) {
            const { VehicleRequest: VR } = require('../models/VehicleRequest');
            const siblings = await VR.findAll({ where: { merge_group_id: request.merge_group_id } });
            const notApproved = siblings.filter((s: any) => s.id !== request.id && s.status !== RequestStatus.APPROVED);
            if (notApproved.length > 0) {
                return res.status(409).json({
                    message: `This request belongs to merge group "${request.merge_group_id}". ${notApproved.length} sibling request(s) are not yet approved.`,
                    groupId: request.merge_group_id,
                    pendingRequestIds: notApproved.map((s: any) => s.id)
                });
            }
        }

        request.vendor_code = vendor_code?.trim() || null;
        request.vendor_name = vendor_name.trim();
        request.vendor_mobile = vendor_mobile.trim();
        request.status = RequestStatus.VENDOR_ALLOCATED;
        await request.save();

        // Notify requester and coordinator with vendor details
        NotificationService.notifyVendorAllocation(request).catch((err: any) =>
            console.error('[vendorController] notifyVendorAllocation error:', err)
        );

        res.json({
            message: 'Vendor assigned successfully.',
            requestId: request.id,
            vendorName: request.vendor_name,
            vendorMobile: request.vendor_mobile,
            status: RequestStatus.VENDOR_ALLOCATED,
        });
    } catch (error: any) {
        console.error('[vendorController] assignVendor error:', error);
        res.status(500).json({ message: 'Failed to assign vendor.', error: error.message });
    }
};
