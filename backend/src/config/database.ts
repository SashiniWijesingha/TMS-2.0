import { Sequelize } from "sequelize-typescript";
import dotenv from "dotenv";

import { User } from "../models/User";
import { Role } from "../models/Role";
import { Division } from "../models/Division";
import { SubDivision } from "../models/SubDivision";
import { VehicleRequest } from "../models/VehicleRequest";
import { PassengerRequestDetails } from "../models/PassengerRequestDetails";
import { MaterialRequestDetails } from "../models/MaterialRequestDetails";
import { Approval } from "../models/Approval";
import { Vehicle } from "../models/Vehicle";
import { Driver } from "../models/Driver";
import { VehicleType } from "../models/VehicleType";
import { Allocation } from "../models/Allocation";
import { Notification } from "../models/Notification";
import { SystemConfig } from "../models/SystemConfig";
import { VehicleAttribute } from "../models/VehicleAttribute";
import { Trip } from "../models/Trip";
import { RideShareSuggestion } from "../models/RideShareSuggestion";
import { NotificationConfig } from "../models/NotificationConfig";
import { GlobalConfig } from "../models/GlobalConfig";
import { PushSubscription } from '../models/PushSubscription';
import { FuelType } from "../models/FuelType";
import { TransportPackage } from "../models/TransportPackage";
import { TripEntry } from "../models/TripEntry";
dotenv.config();

/*
   Convert escaped newline characters from .env
   Example in .env:
   DB_SSL_CA="-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----"
*/
const sslCA = process.env.DB_SSL_CA
  ? process.env.DB_SSL_CA.replace(/\\n/g, "\n")
  : undefined;

const sequelize = new Sequelize({
  database: process.env.DB_TMS,
  dialect: "mysql",
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "3306"),

  logging: false,

  timezone: "+05:30",

  dialectOptions: {
    connectTimeout: 60000,
    timezone: "local",

    ...(sslCA && {
      ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: sslCA,
      },
    }),
  },

  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000,
  },

  models: [
    User,
    Role,
    Division,
    SubDivision,
    VehicleRequest,
    PassengerRequestDetails,
    MaterialRequestDetails,
    Approval,
    Vehicle,
    VehicleType,
    Driver,
    Allocation,
    Notification,
    SystemConfig,
    VehicleAttribute,
    Trip,
    RideShareSuggestion,
    NotificationConfig,
    GlobalConfig,
    PushSubscription,
    FuelType,
    TransportPackage,
    TripEntry,
  ],
});

export default sequelize;