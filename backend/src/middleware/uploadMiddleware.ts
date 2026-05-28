import multer from 'multer';
import path from 'path';
import fs from 'fs';

/**
 * CURRENT SYSTEM ANALYSIS:
 * This uses 'multer.diskStorage' which saves files to the local server disk.
 * 
 * ⚠️ LIMITATIONS FOR CLOUD (AZURE/AWS):
 * 1. Ephemeral Storage: If the Azure App Service restarts or redeploys, these files may be DELETED.
 * 2. Scaling: If you run multiple instances of the backend, "Server A" won't see files uploaded to "Server B".
 * 3. Performance: Serving static files from a Node server is less efficient than a dedicated CDN/Blob storage.
 * 
 * ✅ INDUSTRY STANDARD APPROACH:
 * Use a Cloud Provider's Object Storage (like Azure Blob Storage or AWS S3).
 * Instead of 'diskStorage', the file should be streamed directly to Azure.
 */

// Local directory for development/fallback
const driverUploadDir = 'uploads/driver_docs';
if (!fs.existsSync(driverUploadDir)) {
    fs.mkdirSync(driverUploadDir, { recursive: true });
}

const fuelUploadDir = 'uploads/fuel_docs';
if (!fs.existsSync(fuelUploadDir)) {
    fs.mkdirSync(fuelUploadDir, { recursive: true });
}

const driverStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, driverUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fuelStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, fuelUploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, file.fieldname + '-' + uniqueSuffix + ext);
    }
});

const fileFilter = (req: any, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
    // Validates file types for security
    if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
        cb(null, true);
    } else {
        cb(new Error('Only images and PDF files are allowed!'));
    }
};

export const driverUpload = multer({
    storage: driverStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
    },
    fileFilter: fileFilter
});

export const fuelUpload = multer({
    storage: fuelStorage,
    limits: {
        fileSize: 5 * 1024 * 1024 // 5MB limit per file
    },
    fileFilter: fileFilter
});
