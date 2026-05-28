import { Op, Transaction } from "sequelize";
import { Allocation } from "../models/Allocation";
import { GlobalConfig, GLOBAL_CONFIG_DEFAULTS } from "../models/GlobalConfig";
import { PassengerRequestDetails } from "../models/PassengerRequestDetails";
import {
  RequestStatus,
  RequestType,
  VehicleRequest,
} from "../models/VehicleRequest";

const ACTIVE_STATUSES = [
  RequestStatus.ALLOCATED,
  RequestStatus.ACCEPTED,
  RequestStatus.ON_GOING,
];

const AVAILABILITY_CONFIG_KEYS = {
  avgSpeedKmh: "availability_avg_speed_kmh",
  defaultDurationMin: "availability_default_duration_min",
  minBufferMin: "availability_min_buffer_min",
  bufferRatio: "availability_buffer_ratio",
  unexpectedBufferMin: "availability_unexpected_buffer_min",
  longDistanceKm: "availability_long_distance_km",
  longDistanceRestMin: "availability_long_distance_rest_min",
};

export type AvailabilityConfig = {
  avgSpeedKmh: number;
  defaultDurationMin: number;
  minBufferMin: number;
  bufferRatio: number;
  unexpectedBufferMin: number;
  longDistanceKm: number;
  longDistanceRestMin: number;
};

const DEFAULT_AVAILABILITY_CONFIG: AvailabilityConfig = {
  avgSpeedKmh: Number(GLOBAL_CONFIG_DEFAULTS[AVAILABILITY_CONFIG_KEYS.avgSpeedKmh] || 35),
  defaultDurationMin: Number(
    GLOBAL_CONFIG_DEFAULTS[AVAILABILITY_CONFIG_KEYS.defaultDurationMin] || 120,
  ),
  minBufferMin: Number(
    GLOBAL_CONFIG_DEFAULTS[AVAILABILITY_CONFIG_KEYS.minBufferMin] || 30,
  ),
  bufferRatio: Number(
    GLOBAL_CONFIG_DEFAULTS[AVAILABILITY_CONFIG_KEYS.bufferRatio] || 0.2,
  ),
  unexpectedBufferMin: Number(
    GLOBAL_CONFIG_DEFAULTS[AVAILABILITY_CONFIG_KEYS.unexpectedBufferMin] || 15,
  ),
  longDistanceKm: Number(
    GLOBAL_CONFIG_DEFAULTS[AVAILABILITY_CONFIG_KEYS.longDistanceKm] || 100,
  ),
  longDistanceRestMin: Number(
    GLOBAL_CONFIG_DEFAULTS[AVAILABILITY_CONFIG_KEYS.longDistanceRestMin] || 60,
  ),
};

export type ScheduleWindow = {
  startAt: Date;
  endAt: Date;
  durationMin: number;
  bufferMin: number;
};

type ConflictCheckOptions = {
  allowTripId?: number | null;
  excludeRequestIds?: number[];
  transaction?: Transaction;
  config?: AvailabilityConfig;
};

const toDateTime = (dateStr?: string | null, timeStr?: string | null) => {
  if (!dateStr || !timeStr) return null;
  const candidate = new Date(`${dateStr}T${timeStr}`);
  if (Number.isNaN(candidate.getTime())) return null;
  return candidate;
};

const parseDistanceKm = (distanceRaw?: string | null) => {
  if (!distanceRaw) return null;
  const match = String(distanceRaw).match(/([0-9]+(\.[0-9]+)?)/);
  if (!match) return null;
  const value = parseFloat(match[1]);
  return Number.isNaN(value) ? null : value;
};

const parseNumberSetting = (value: unknown, fallback: number) => {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return parsed;
};

export const loadAvailabilityConfig = async (
  transaction?: Transaction,
): Promise<AvailabilityConfig> => {
  const keys = Object.values(AVAILABILITY_CONFIG_KEYS);
  const rows = await GlobalConfig.findAll({
    where: { key: { [Op.in]: keys } },
    transaction,
  });

  const map = new Map<string, string>();
  for (const row of rows) {
    if (row.value != null) {
      map.set(row.key, row.value);
    }
  }

  const getValue = (key: string, fallback: number) =>
    parseNumberSetting(map.get(key) ?? GLOBAL_CONFIG_DEFAULTS[key], fallback);

  return {
    avgSpeedKmh: getValue(
      AVAILABILITY_CONFIG_KEYS.avgSpeedKmh,
      DEFAULT_AVAILABILITY_CONFIG.avgSpeedKmh,
    ),
    defaultDurationMin: getValue(
      AVAILABILITY_CONFIG_KEYS.defaultDurationMin,
      DEFAULT_AVAILABILITY_CONFIG.defaultDurationMin,
    ),
    minBufferMin: getValue(
      AVAILABILITY_CONFIG_KEYS.minBufferMin,
      DEFAULT_AVAILABILITY_CONFIG.minBufferMin,
    ),
    bufferRatio: getValue(
      AVAILABILITY_CONFIG_KEYS.bufferRatio,
      DEFAULT_AVAILABILITY_CONFIG.bufferRatio,
    ),
    unexpectedBufferMin: getValue(
      AVAILABILITY_CONFIG_KEYS.unexpectedBufferMin,
      DEFAULT_AVAILABILITY_CONFIG.unexpectedBufferMin,
    ),
    longDistanceKm: getValue(
      AVAILABILITY_CONFIG_KEYS.longDistanceKm,
      DEFAULT_AVAILABILITY_CONFIG.longDistanceKm,
    ),
    longDistanceRestMin: getValue(
      AVAILABILITY_CONFIG_KEYS.longDistanceRestMin,
      DEFAULT_AVAILABILITY_CONFIG.longDistanceRestMin,
    ),
  };
};

const computeDurationMin = (
  details: PassengerRequestDetails,
  config: AvailabilityConfig,
) => {
  if (details.total_duration_minutes && details.total_duration_minutes > 0) {
    return Math.ceil(details.total_duration_minutes);
  }

  const distanceKm =
    details.total_distance_km ?? parseDistanceKm(details.distance);
  if (distanceKm && distanceKm > 0) {
    return Math.ceil((distanceKm / config.avgSpeedKmh) * 60);
  }

  return config.defaultDurationMin;
};

const computeTrafficBufferMin = (
  durationMin: number,
  config: AvailabilityConfig,
) => {
  const ratioBuffer = Math.ceil(durationMin * config.bufferRatio);
  const base = Math.max(config.minBufferMin, ratioBuffer);
  return base + config.unexpectedBufferMin;
};

const computeDriverRestMin = (
  details: PassengerRequestDetails,
  config: AvailabilityConfig,
) => {
  const distanceKm =
    details.total_distance_km ?? parseDistanceKm(details.distance) ?? 0;
  if (distanceKm > config.longDistanceKm) {
    return config.longDistanceRestMin;
  }
  return 0;
};

export const buildPassengerSchedule = (
  details: PassengerRequestDetails,
  config: AvailabilityConfig = DEFAULT_AVAILABILITY_CONFIG,
  options: { includeDriverRest?: boolean } = {},
): ScheduleWindow | null => {
  const startAt = toDateTime(details.date, details.time);
  if (!startAt) return null;

  const durationMin = computeDurationMin(details, config);
  const trafficBufferMin = computeTrafficBufferMin(durationMin, config);
  const restMin = options.includeDriverRest
    ? computeDriverRestMin(details, config)
    : 0;
  const bufferMin = trafficBufferMin + restMin;
  let endAt = new Date(
    startAt.getTime() + (durationMin + bufferMin) * 60 * 1000,
  );

  const days = Math.max(1, Number(details.no_of_days || 1));
  if (days > 1) {
    endAt = new Date(endAt.getTime() + (days - 1) * 24 * 60 * 60 * 1000);
  }

  return { startAt, endAt, durationMin, bufferMin };
};

export const buildTripScheduleFromRequests = (
  requests: VehicleRequest[],
  config: AvailabilityConfig = DEFAULT_AVAILABILITY_CONFIG,
  options: { includeDriverRest?: boolean } = {},
): ScheduleWindow | null => {
  let earliestStart: Date | null = null;
  let latestEnd: Date | null = null;
  let durationMin = 0;
  let bufferMin = 0;

  for (const req of requests) {
    if (req.request_type !== RequestType.PASSENGER || !req.passengerDetails) {
      continue;
    }

    const schedule = buildPassengerSchedule(
      req.passengerDetails,
      config,
      options,
    );
    if (!schedule) continue;

    if (!earliestStart || schedule.startAt < earliestStart) {
      earliestStart = schedule.startAt;
    }
    if (!latestEnd || schedule.endAt > latestEnd) {
      latestEnd = schedule.endAt;
    }

    durationMin = Math.max(durationMin, schedule.durationMin);
    bufferMin = Math.max(bufferMin, schedule.bufferMin);
  }

  if (!earliestStart || !latestEnd) return null;

  return {
    startAt: earliestStart,
    endAt: latestEnd,
    durationMin,
    bufferMin,
  };
};

const overlaps = (aStart: Date, aEnd: Date, bStart: Date, bEnd: Date) => {
  return aStart < bEnd && aEnd > bStart;
};

export const findDriverConflicts = async (
  driverId: number,
  window: ScheduleWindow,
  options: ConflictCheckOptions = {},
) => {
  const config = options.config ?? (await loadAvailabilityConfig(options.transaction));
  const allocations = await Allocation.findAll({
    where: { driver_id: driverId },
    include: [
      {
        model: VehicleRequest,
        required: true,
        where: {
          status: { [Op.in]: ACTIVE_STATUSES },
          request_type: RequestType.PASSENGER,
        },
        include: [{ model: PassengerRequestDetails, required: true }],
      },
    ],
    transaction: options.transaction,
  });

  const conflicts: Array<{
    requestId: number;
    tripId: number | null;
    startAt: Date;
    endAt: Date;
  }> = [];

  for (const alloc of allocations) {
    const req = alloc.request as VehicleRequest | undefined;
    if (!req || !req.passengerDetails) continue;

    if (options.excludeRequestIds?.includes(req.id)) continue;
    if (options.allowTripId && req.trip_id === options.allowTripId) continue;

    const existing = buildPassengerSchedule(req.passengerDetails, config, {
      includeDriverRest: true,
    });
    if (!existing) continue;

    if (overlaps(window.startAt, window.endAt, existing.startAt, existing.endAt)) {
      conflicts.push({
        requestId: req.id,
        tripId: req.trip_id ?? null,
        startAt: existing.startAt,
        endAt: existing.endAt,
      });
    }
  }

  return conflicts;
};

export const findDriverConflictDetails = async (
  window: ScheduleWindow,
  options: ConflictCheckOptions = {},
) => {
  const config = options.config ?? (await loadAvailabilityConfig(options.transaction));
  const allocations = await Allocation.findAll({
    include: [
      {
        model: VehicleRequest,
        required: true,
        where: {
          status: { [Op.in]: ACTIVE_STATUSES },
          request_type: RequestType.PASSENGER,
        },
        include: [{ model: PassengerRequestDetails, required: true }],
      },
    ],
    transaction: options.transaction,
  });

  const conflicts = new Map<
    number,
    {
      driverId: number;
      requestId: number;
      tripId: number | null;
      startAt: Date;
      endAt: Date;
    }
  >();

  for (const alloc of allocations) {
    const req = alloc.request as VehicleRequest | undefined;
    if (!req || !req.passengerDetails) continue;

    if (options.excludeRequestIds?.includes(req.id)) continue;
    if (options.allowTripId && req.trip_id === options.allowTripId) continue;

    const existing = buildPassengerSchedule(req.passengerDetails, config, {
      includeDriverRest: true,
    });
    if (!existing) continue;

    if (overlaps(window.startAt, window.endAt, existing.startAt, existing.endAt)) {
      const current = conflicts.get(alloc.driver_id);
      if (!current || existing.startAt < current.startAt) {
        conflicts.set(alloc.driver_id, {
          driverId: alloc.driver_id,
          requestId: req.id,
          tripId: req.trip_id ?? null,
          startAt: existing.startAt,
          endAt: existing.endAt,
        });
      }
    }
  }

  return Array.from(conflicts.values());
};

export const findConflictingDriverIds = async (
  window: ScheduleWindow,
  options: ConflictCheckOptions = {},
) => {
  const config = options.config ?? (await loadAvailabilityConfig(options.transaction));
  const allocations = await Allocation.findAll({
    include: [
      {
        model: VehicleRequest,
        required: true,
        where: {
          status: { [Op.in]: ACTIVE_STATUSES },
          request_type: RequestType.PASSENGER,
        },
        include: [{ model: PassengerRequestDetails, required: true }],
      },
    ],
    transaction: options.transaction,
  });

  const conflicts = new Set<number>();

  for (const alloc of allocations) {
    const req = alloc.request as VehicleRequest | undefined;
    if (!req || !req.passengerDetails) continue;

    if (options.excludeRequestIds?.includes(req.id)) continue;
    if (options.allowTripId && req.trip_id === options.allowTripId) continue;

    const existing = buildPassengerSchedule(req.passengerDetails, config, {
      includeDriverRest: true,
    });
    if (!existing) continue;

    if (overlaps(window.startAt, window.endAt, existing.startAt, existing.endAt)) {
      conflicts.add(alloc.driver_id);
    }
  }

  return conflicts;
};

export const findVehicleConflicts = async (
  vehicleId: number,
  window: ScheduleWindow,
  options: ConflictCheckOptions = {},
) => {
  const config = options.config ?? (await loadAvailabilityConfig(options.transaction));
  const allocations = await Allocation.findAll({
    where: { vehicle_id: vehicleId },
    include: [
      {
        model: VehicleRequest,
        required: true,
        where: {
          status: { [Op.in]: ACTIVE_STATUSES },
          request_type: RequestType.PASSENGER,
        },
        include: [{ model: PassengerRequestDetails, required: true }],
      },
    ],
    transaction: options.transaction,
  });

  const conflicts: Array<{
    requestId: number;
    tripId: number | null;
    startAt: Date;
    endAt: Date;
  }> = [];

  for (const alloc of allocations) {
    const req = alloc.request as VehicleRequest | undefined;
    if (!req || !req.passengerDetails) continue;

    if (options.excludeRequestIds?.includes(req.id)) continue;
    if (options.allowTripId && req.trip_id === options.allowTripId) continue;

    const existing = buildPassengerSchedule(req.passengerDetails, config, {
      includeDriverRest: false,
    });
    if (!existing) continue;

    if (overlaps(window.startAt, window.endAt, existing.startAt, existing.endAt)) {
      conflicts.push({
        requestId: req.id,
        tripId: req.trip_id ?? null,
        startAt: existing.startAt,
        endAt: existing.endAt,
      });
    }
  }

  return conflicts;
};

export const findVehicleConflictDetails = async (
  window: ScheduleWindow,
  options: ConflictCheckOptions = {},
) => {
  const config = options.config ?? (await loadAvailabilityConfig(options.transaction));
  const allocations = await Allocation.findAll({
    include: [
      {
        model: VehicleRequest,
        required: true,
        where: {
          status: { [Op.in]: ACTIVE_STATUSES },
          request_type: RequestType.PASSENGER,
        },
        include: [{ model: PassengerRequestDetails, required: true }],
      },
    ],
    transaction: options.transaction,
  });

  const conflicts = new Map<
    number,
    {
      vehicleId: number;
      requestId: number;
      tripId: number | null;
      startAt: Date;
      endAt: Date;
    }
  >();

  for (const alloc of allocations) {
    const req = alloc.request as VehicleRequest | undefined;
    if (!req || !req.passengerDetails) continue;

    if (options.excludeRequestIds?.includes(req.id)) continue;
    if (options.allowTripId && req.trip_id === options.allowTripId) continue;

    const existing = buildPassengerSchedule(req.passengerDetails, config, {
      includeDriverRest: false,
    });
    if (!existing) continue;

    if (overlaps(window.startAt, window.endAt, existing.startAt, existing.endAt)) {
      const current = conflicts.get(alloc.vehicle_id);
      if (!current || existing.startAt < current.startAt) {
        conflicts.set(alloc.vehicle_id, {
          vehicleId: alloc.vehicle_id,
          requestId: req.id,
          tripId: req.trip_id ?? null,
          startAt: existing.startAt,
          endAt: existing.endAt,
        });
      }
    }
  }

  return Array.from(conflicts.values());
};

export const findConflictingVehicleIds = async (
  window: ScheduleWindow,
  options: ConflictCheckOptions = {},
) => {
  const config = options.config ?? (await loadAvailabilityConfig(options.transaction));
  const allocations = await Allocation.findAll({
    include: [
      {
        model: VehicleRequest,
        required: true,
        where: {
          status: { [Op.in]: ACTIVE_STATUSES },
          request_type: RequestType.PASSENGER,
        },
        include: [{ model: PassengerRequestDetails, required: true }],
      },
    ],
    transaction: options.transaction,
  });

  const conflicts = new Set<number>();

  for (const alloc of allocations) {
    const req = alloc.request as VehicleRequest | undefined;
    if (!req || !req.passengerDetails) continue;

    if (options.excludeRequestIds?.includes(req.id)) continue;
    if (options.allowTripId && req.trip_id === options.allowTripId) continue;

    const existing = buildPassengerSchedule(req.passengerDetails, config, {
      includeDriverRest: false,
    });
    if (!existing) continue;

    if (overlaps(window.startAt, window.endAt, existing.startAt, existing.endAt)) {
      conflicts.add(alloc.vehicle_id);
    }
  }

  return conflicts;
};

export const getNextAvailableAt = (
  conflicts: Array<{ endAt: Date }>,
): Date | null => {
  if (conflicts.length === 0) return null;
  const latest = Math.max(...conflicts.map((c) => c.endAt.getTime()));
  return new Date(latest);
};
