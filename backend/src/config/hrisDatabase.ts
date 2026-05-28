import { Sequelize } from "sequelize";
import dotenv from "dotenv";

dotenv.config();

/*
 Convert escaped newlines from .env
 Example:
 DB_SSL_CA="-----BEGIN CERTIFICATE-----\nMIID...\n-----END CERTIFICATE-----"
*/
const sslCA = process.env.DB_SSL_CA
  ? process.env.DB_SSL_CA.replace(/\\n/g, "\n")
  : undefined;

const hrisSequelize = new Sequelize({
  database: process.env.DB_HRIS,
  dialect: "mysql",
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || "3306"),

  logging: false,

  // Connection pooling to prevent ECONNRESET and ETIMEDOUT errors
  pool: {
    max: 10,
    min: 2,
    acquire: 30000,    // 30s timeout to acquire a connection
    idle: 10000,       // 10s idle timeout before closing
  },

  dialectOptions: {
    connectTimeout: 30000,  // 30s connection timeout
    ...(sslCA && {
      ssl: {
        require: true,
        rejectUnauthorized: true,
        ca: sslCA
      }
    })
  }
});

/*
  Hard read-only guard for the HRIS database.
  This hook fires before EVERY query executed on this connection.
  Write operations (INSERT, UPDATE, DELETE, REPLACE, DROP, TRUNCATE,
  CREATE, ALTER, RENAME, CALL) are rejected immediately.
  MySQL internal connection-setup statements (SET, SHOW, USE) are
  allowed through so Sequelize can maintain its connection pool.
*/
hrisSequelize.addHook("beforeQuery", (_options: any, query: any) => {
  const sql: string = (query?.sql || _options?.sql || "").trim();
  const writePattern = /^\s*(INSERT|UPDATE|DELETE|REPLACE|DROP|TRUNCATE|CREATE|ALTER|RENAME|CALL)\s/i;
  if (writePattern.test(sql)) {
    throw new Error(
      `[HRIS] Write operations are not permitted on the ${process.env.DB_HDOC || 'Hdoc_FENTONS'} database. ` +
      `Blocked statement: ${sql.substring(0, 120)}`
    );
  }
});

export default hrisSequelize;