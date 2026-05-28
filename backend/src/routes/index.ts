import { Router } from 'express';
import { login, changePassword, verifyOtpAndSetup, requestPasswordReset, resetPasswordWithOtp } from '../controllers/authController';
import { authenticateToken, authorizeRole } from '../middleware/authMiddleware';
import {
    createRequest,
    verifyRequest,
    approveRequest,
    allocateVehicle,
    completeRequest,
    getRequests,
    getRequestById,
    deleteRequest,
    updateRequest,
    getAllocationResources,
    suggestMatches,
    cancelRequest,
    getSharedVehicleSuggestions,
    getRouteOptimizationSuggestions,
    mergeRequests,
    processAutoExpiry,
    declineRequest,
    updateAllocationResource,
    calculateRoute,
    lookupProject,
    searchProjects,
    lookupCostCentre,
    searchCostCentres,
    getMergeGroups,
    approveMergeGroup,
    unmergeGroup
} from '../controllers/requestController';
import {
    createUser,
    getAllUsers,
    getCurrentUserContact,
    getUserById,
    updateUser,
    deleteUser,
    getDivisions
} from '../controllers/userController';

import {
    updateSubmissionRules,
    getSubmissionRules,
    createRole,
    getNotificationConfig,
    updateNotificationConfig,
    getGlobalConfig,
    updateGlobalConfig,
} from '../controllers/adminController';
import {
    getDivisions as getDivisionsController,
    createDivision as createDivisionController,
    updateDivision,
    deleteDivision,
    createSubDivision,
    updateSubDivision,
    deleteSubDivision
} from '../controllers/divisionController';
import { registerDriver } from '../controllers/driverRegistrationController';
import { driverUpload, fuelUpload } from '../middleware/uploadMiddleware';

import {
    getTransportPackages,
    getTransportPackageById,
    createTransportPackage,
    updateTransportPackage,
    updateTransportPackageStatus,
    deleteTransportPackage,
    getPackageHistory
} from '../controllers/transportPackageController';
import { getAllFuelTypes, createFuelType, updateFuelType, deleteFuelType } from '../controllers/fuelTypeController';
import { createTripEntry, getTripEntries, getTripEntryById } from '../controllers/tripEntryController';

const router = Router();

// Auth Routes
router.post('/auth/login', login);
router.post('/auth/verify-otp', verifyOtpAndSetup);
router.post('/auth/change-password', authenticateToken, changePassword);
router.post('/auth/request-password-reset', requestPasswordReset);
router.post('/auth/reset-password', resetPasswordWithOtp);

// User Management Routes (Admin Only)
router.post('/users', authenticateToken, authorizeRole(['ADMIN']), createUser);
router.get('/users', authenticateToken, authorizeRole(['ADMIN']), getAllUsers);
router.get('/users/me/contact', authenticateToken, getCurrentUserContact);
router.get('/users/:id', authenticateToken, authorizeRole(['ADMIN']), getUserById);
router.put('/users/:id', authenticateToken, authorizeRole(['ADMIN']), updateUser);
router.delete('/users/:id', authenticateToken, authorizeRole(['ADMIN']), deleteUser);

// Division Routes
router.get('/divisions', authenticateToken, getDivisionsController);
router.post('/divisions', authenticateToken, authorizeRole(['ADMIN']), createDivisionController);
router.put('/divisions/:id', authenticateToken, authorizeRole(['ADMIN']), updateDivision);
router.delete('/divisions/:id', authenticateToken, authorizeRole(['ADMIN']), deleteDivision);

// SubDivision Routes
router.post('/divisions/:divisionId/sub-divisions', authenticateToken, authorizeRole(['ADMIN']), createSubDivision);
router.put('/sub-divisions/:id', authenticateToken, authorizeRole(['ADMIN']), updateSubDivision);
router.delete('/sub-divisions/:id', authenticateToken, authorizeRole(['ADMIN']), deleteSubDivision);

// System Administration Routes
router.get('/submission-rules', authenticateToken, getSubmissionRules);
router.get('/admin/submission-rules', authenticateToken, authorizeRole(['ADMIN']), getSubmissionRules);
router.put('/admin/submission-rules', authenticateToken, authorizeRole(['ADMIN']), updateSubmissionRules);
router.post('/admin/roles', authenticateToken, authorizeRole(['ADMIN']), createRole);
router.get('/admin/notification-config', authenticateToken, authorizeRole(['ADMIN']), getNotificationConfig);
router.put('/admin/notification-config', authenticateToken, authorizeRole(['ADMIN']), updateNotificationConfig);
router.get('/admin/global-config', authenticateToken, authorizeRole(['ADMIN']), getGlobalConfig);
router.put('/admin/global-config', authenticateToken, authorizeRole(['ADMIN']), updateGlobalConfig);

// Request Routes
router.post('/requests', authenticateToken, authorizeRole(['STAFF', 'COORDINATOR', 'ADMIN', 'CEO']), createRequest);
router.delete('/requests/:id', authenticateToken, authorizeRole(['STAFF', 'COORDINATOR']), deleteRequest);
router.put('/requests/:id', authenticateToken, authorizeRole(['STAFF', 'ADMIN', 'COORDINATOR']), updateRequest);
router.put('/requests/:id/cancel', authenticateToken, authorizeRole(['STAFF', 'ADMIN', 'COORDINATOR']), cancelRequest);
router.post('/requests/suggest-matches', authenticateToken, suggestMatches);
router.get('/requests/shared-vehicles', authenticateToken, getSharedVehicleSuggestions);
router.get('/requests/optimization-suggestions', authenticateToken, authorizeRole(['COORDINATOR', 'TRANSPORT']), getRouteOptimizationSuggestions);
router.post('/requests/calculate-route', authenticateToken, calculateRoute);
router.get('/projects/lookup', authenticateToken, lookupProject);
router.get('/projects/search', authenticateToken, searchProjects);
router.get('/cost-centres/lookup', authenticateToken, lookupCostCentre);
router.get('/cost-centres/search', authenticateToken, searchCostCentres);
router.post('/allocations/merge', authenticateToken, authorizeRole(['COORDINATOR', 'TRANSPORT']), mergeRequests);

// Merge Group Management Routes (must come before /requests/:id)
router.get('/requests/merge-groups', authenticateToken, authorizeRole(['COORDINATOR', 'TRANSPORT', 'HOD', 'CEO']), getMergeGroups);
router.put('/requests/merge-groups/:groupId/approve', authenticateToken, authorizeRole(['HOD', 'CEO']), approveMergeGroup);
router.delete('/requests/merge-groups/:groupId', authenticateToken, authorizeRole(['COORDINATOR', 'TRANSPORT']), unmergeGroup);

router.get('/requests', authenticateToken, getRequests);
router.get('/requests/:id', authenticateToken, getRequestById);

// Vehicle Routes (Admin & Transport)
import {
    createVehicle,
    getAllVehicles,
    getVehicleById,
    updateVehicle,
    deleteVehicle,
    assignDriverToVehicle,
    assignPackageToVehicle
} from '../controllers/vehicleController';
import {
    createVehicleType,
    getVehicleTypes,
    deleteVehicleType,
    updateVehicleType
} from '../controllers/vehicleTypeController';

router.post('/vehicles',
    authenticateToken,
    authorizeRole(['ADMIN', 'TRANSPORT']),
    driverUpload.fields([
        { name: 'revenue_licence', maxCount: 1 },
        { name: 'emission_report', maxCount: 1 },
        { name: 'insurance', maxCount: 1 },
        { name: 'registration_book', maxCount: 1 }
    ]),
    createVehicle as any
);
router.get('/vehicles', authenticateToken, getAllVehicles);
router.get('/vehicles/:id', authenticateToken, getVehicleById);
router.put('/vehicles/:id',
    authenticateToken,
    authorizeRole(['ADMIN', 'TRANSPORT']),
    driverUpload.fields([
        { name: 'revenue_licence', maxCount: 1 },
        { name: 'emission_report', maxCount: 1 },
        { name: 'insurance', maxCount: 1 },
        { name: 'registration_book', maxCount: 1 }
    ]),
    updateVehicle as any
);
router.delete('/vehicles/:id', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), deleteVehicle);
router.post('/vehicles/:id/assign', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), assignDriverToVehicle);
router.post('/vehicles/:id/assign-package', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), assignPackageToVehicle);

// Vehicle Type Routes
router.post('/vehicle-types', authenticateToken, authorizeRole(['ADMIN']), createVehicleType);
router.get('/vehicle-types', authenticateToken, getVehicleTypes);
router.put('/vehicle-types/:id', authenticateToken, authorizeRole(['ADMIN']), updateVehicleType);
router.delete('/vehicle-types/:id', authenticateToken, authorizeRole(['ADMIN']), deleteVehicleType);

// Vehicle Attribute Routes
import { createAttribute, deleteAttribute, updateAttribute } from '../controllers/attributeController';
router.post('/vehicle-attributes', authenticateToken, authorizeRole(['ADMIN']), createAttribute);
router.put('/vehicle-attributes/:id', authenticateToken, authorizeRole(['ADMIN']), updateAttribute);
router.delete('/vehicle-attributes/:id', authenticateToken, authorizeRole(['ADMIN']), deleteAttribute);

// Transport Package Setup Routes
router.get('/transport-packages', authenticateToken, getTransportPackages);
router.get('/transport-packages/history', authenticateToken, getPackageHistory);
router.get('/transport-packages/:id', authenticateToken, getTransportPackageById);
router.post('/transport-packages', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), createTransportPackage);
router.put('/transport-packages/:id', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), updateTransportPackage);
router.patch('/transport-packages/:id/status', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), updateTransportPackageStatus);
router.delete('/transport-packages/:id', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), deleteTransportPackage);

// Fuel Type Routes
router.get('/fuel-types', authenticateToken, getAllFuelTypes);
router.post('/admin/fuel-types', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), fuelUpload.single('document'), createFuelType);
router.put('/admin/fuel-types/:id', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), fuelUpload.single('document'), updateFuelType);
router.delete('/admin/fuel-types/:id', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), deleteFuelType);

// Trip Entry Routes
router.post('/trip-entries', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), createTripEntry);
router.get('/trip-entries', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), getTripEntries);
router.get('/trip-entries/:id', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT']), getTripEntryById);

// Workflow Routes
// Coordinator Verification
router.put('/requests/:requestId/verify', authenticateToken, authorizeRole(['COORDINATOR']), verifyRequest);
// Trip Management (Coordinator)
import { createTrip, overrideSharable, getTrips, deleteTrip } from '../controllers/tripController';
router.post('/trips', authenticateToken, authorizeRole(['COORDINATOR']), createTrip);
router.get('/trips', authenticateToken, authorizeRole(['COORDINATOR', 'TRANSPORT']), getTrips);
router.delete('/trips/:id', authenticateToken, authorizeRole(['COORDINATOR', 'TRANSPORT']), deleteTrip);
router.put('/requests/:requestId/override-share', authenticateToken, authorizeRole(['COORDINATOR']), overrideSharable);

// HOD and CEO Approval  
router.put('/requests/:requestId/approve', authenticateToken, authorizeRole(['HOD', 'CEO']), approveRequest);

// Transport Division Actions
router.get('/allocation/resources', authenticateToken, authorizeRole(['TRANSPORT']), getAllocationResources);
router.put('/requests/:requestId/allocate', authenticateToken, authorizeRole(['TRANSPORT']), allocateVehicle);
router.put('/requests/:requestId/update-allocation', authenticateToken, authorizeRole(['COORDINATOR', 'TRANSPORT']), updateAllocationResource);
router.put('/requests/:requestId/complete', authenticateToken, authorizeRole(['TRANSPORT']), completeRequest);

// Vendor Routes (Transport Officer)
import { getVendors, assignVendor } from '../controllers/vendorController';
router.get('/vendors', authenticateToken, authorizeRole(['TRANSPORT', 'ADMIN']), getVendors);
router.put('/requests/:requestId/assign-vendor', authenticateToken, authorizeRole(['TRANSPORT', 'ADMIN']), assignVendor);

// Driver Dashboard Routes
import { getMyAllocations, updateTripStatus, getAllDrivers, updateDriver } from '../controllers/driverController';

router.post('/admin/drivers/register',
    authenticateToken,
    authorizeRole(['ADMIN']),
    driverUpload.fields([
        { name: 'license_photo', maxCount: 1 },
        { name: 'grama_niladhari_cert', maxCount: 1 },
        { name: 'police_report', maxCount: 1 }
    ]),
    registerDriver as any
);

router.put('/admin/drivers/:id',
    authenticateToken,
    authorizeRole(['ADMIN']),
    driverUpload.fields([
        { name: 'license_photo', maxCount: 1 },
        { name: 'grama_niladhari_cert', maxCount: 1 },
        { name: 'police_report', maxCount: 1 }
    ]),
    updateDriver as any
);

router.get('/driver/allocations', authenticateToken, authorizeRole(['DRIVER']), getMyAllocations);
router.put('/driver/requests/:requestId/status', authenticateToken, authorizeRole(['DRIVER']), updateTripStatus);
router.get('/admin/drivers', authenticateToken, authorizeRole(['ADMIN', 'TRANSPORT', 'COORDINATOR']), getAllDrivers);
// Notification Routes
import { getNotifications, markRead, markAllRead, deleteNotification, clearAllNotifications, getVapidPublicKey, subscribePush, unsubscribePush } from '../controllers/notificationController';
import { createMaterialSsoHandoff } from '../controllers/materialSsoController';
router.get('/notifications', authenticateToken, getNotifications);
router.put('/notifications/read-all', authenticateToken, markAllRead);
router.delete('/notifications/clear-all', authenticateToken, clearAllNotifications);
router.put('/notifications/:id/read', authenticateToken, markRead);
router.delete('/notifications/:id', authenticateToken, deleteNotification);
// Web Push
router.get('/notifications/vapid-public-key', authenticateToken, getVapidPublicKey);
router.post('/notifications/push-subscribe', authenticateToken, subscribePush);
router.post('/notifications/push-unsubscribe', authenticateToken, unsubscribePush);

// Material microservice SSO handoff
router.post(
    '/material-sso/handoff',
    authenticateToken,
    authorizeRole(['STAFF', 'COORDINATOR', 'HOD', 'TRANSPORT', 'ADMIN', 'MCU_USER', 'CALL_CENTER', 'WAREHOUSE']),
    createMaterialSsoHandoff
);

export default router;
