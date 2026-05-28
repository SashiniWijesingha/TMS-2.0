import { Response } from "express";
import {
  VehicleRequest,
  RequestStatus,
  ProjectStatus,
  RequestType,
} from "../models/VehicleRequest";
import { PassengerRequestDetails } from "../models/PassengerRequestDetails";
import { MaterialRequestDetails } from "../models/MaterialRequestDetails";
import { Approval } from "../models/Approval";
import { Allocation } from "../models/Allocation";
import { RideShareSuggestion } from "../models/RideShareSuggestion";
import { Vehicle } from "../models/Vehicle";
import { Driver } from "../models/Driver";
import { Trip } from "../models/Trip";
import { VehicleType } from "../models/VehicleType";
import { AuthRequest } from "../middleware/authMiddleware";
import { User } from "../models/User";
import { Division } from "../models/Division";
import { SystemConfig } from "../models/SystemConfig";
import { GlobalConfig, GLOBAL_CONFIG_DEFAULTS } from "../models/GlobalConfig";
import { RouteService } from "../services/RouteService";
import { GoogleRouteService } from "../services/GoogleRouteService";
import { NotificationService } from "../services/notificationService";
import {
  buildPassengerSchedule,
  buildTripScheduleFromRequests,
  findVehicleConflictDetails,
  findVehicleConflicts,
  findDriverConflictDetails,
  findDriverConflicts,
  getNextAvailableAt,
  loadAvailabilityConfig,
} from "../services/driverAvailabilityService";
import sequelize from "../config/database";
import fs from "fs";
import path from "path";
import { Op, QueryTypes, UniqueConstraintError } from "sequelize";
import hrisSequelize from "../config/hrisDatabase";

export const getRequestById = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  try {
    const request = await VehicleRequest.findByPk(id, {
      include: [
        { model: User, as: "requester", attributes: ["name", "email"] },
        { model: Division, attributes: ["name"] },
        { model: PassengerRequestDetails },
        { model: MaterialRequestDetails },
        {
          model: Allocation,
          include: [
            {
              model: Vehicle,
              attributes: [
                "id",
                "vehicle_number",
                "specification",
                "vehicle_type_id",
              ],
              include: [{ model: VehicleType, attributes: ["name"] }],
            },
            {
              model: Driver,
              attributes: ["nic_no"],
              include: [{ model: User, attributes: ["name", "mobile"] }],
            },
          ],
        },
        {
          model: Approval,
          include: [{ model: User, as: "approver", attributes: ["name"] }],
        },
      ],
    });

    if (!request) return res.status(404).json({ message: "Request not found" });

    // Access Control
    const role = req.user!.role;
    const userId = req.user!.userId;
    const divisionId = req.user!.divisionId;

    if (
      role === "STAFF" ||
      role === "MCU_USER" ||
      role === "CALL_CENTER" ||
      role === "WAREHOUSE"
    ) {
      if (request.requested_by !== userId) {
        return res
          .status(403)
          .json({ message: "Unauthorized to view this request" });
      }
    } else if (role === "COORDINATOR" || role === "HOD") {
      if (request.division_id !== divisionId) {
        return res
          .status(403)
          .json({
            message: "Unauthorized to view this request from another division",
          });
      }
    } else if (role === "CEO") {
      // CEO can view all requests, so no restriction needed here.
    }

    res.json(request);
  } catch (error) {
    console.error("Get request details error:", error);
    res.status(500).json({ message: "Failed to fetch request details" });
  }
};

export const createRequest = async (req: AuthRequest, res: Response) => {
  let transaction;
  try {
    transaction = await sequelize.transaction();

    const {
      requestType,
      subType,
      jobNo,
      projectName,
      passengerDetails,
      materialDetails,
    } = req.body;
    const userId = req.user!.userId;
    let divisionId = req.user!.divisionId;

    // Extract Division Info from payload if available
    let mainDivisionName = "";
    let subDivision = "";

    if (requestType === "PASSENGER" && passengerDetails) {
      mainDivisionName = passengerDetails.main_division;
      subDivision = passengerDetails.sub_division;
    } else if (requestType === "MATERIAL" && materialDetails) {
      mainDivisionName = materialDetails.main_division;
      subDivision = materialDetails.sub_division;
    }

    // Logic: Use selected division if valid, else fallback to user's division, else default.
    if (mainDivisionName) {
      const selectedDiv = await Division.findOne({
        where: { name: mainDivisionName },
      });
      if (selectedDiv) {
        divisionId = selectedDiv.id;
      }
    }

    if (!divisionId) {
      const defaultDiv = await Division.findOne();
      if (defaultDiv) {
        divisionId = defaultDiv.id;
        console.warn(
          `[CreateRequest] User ${userId} has no division_id. Defaulting to Division ${divisionId} (${defaultDiv.name}).`,
        );
      } else {
        throw new Error(
          "System Configuration Error: No divisions found in the database. Cannot process request.",
        );
      }
    }

    // Sanitize date/time fields to prevent 'Invalid date' or empty string errors in database
    const sanitizeDetails = (details: any) => {
      if (!details) return;
      const fields = ["date", "return_date", "time", "return_time"];
      fields.forEach((field) => {
        if (details[field] === "" || details[field] === "Invalid date") {
          details[field] = null;
        }
      });
    };

    if (requestType === "PASSENGER" && passengerDetails) {
      sanitizeDetails(passengerDetails);
    } else if (requestType === "MATERIAL" && materialDetails) {
      sanitizeDetails(materialDetails);
    }

    // ─── Business Rule: Submission Window & Visibility Delay ──────────────────
    const now = new Date();
    const currentDay = now.getDay(); // 0-6
    const currentTime = now.toTimeString().split(" ")[0]; // HH:MM:SS

    const config = await SystemConfig.findOne({
      where: { day_of_week: currentDay },
    });
    let warningMsg = "";

    // Load global visibility settings
    const globalRows = await GlobalConfig.findAll();
    const globalMap: Record<string, string> = { ...GLOBAL_CONFIG_DEFAULTS };
    for (const r of globalRows) {
      globalMap[r.key] = r.value ?? "";
    }
    const delayVisibility = globalMap["delay_visibility"] !== "false";
    const appliesToPassengerNormal =
      globalMap["applies_to_passenger_normal"] !== "false";
    const appliesToPassengerAdhoc =
      globalMap["applies_to_passenger_adhoc"] !== "false";
    const appliesToPassengerSpecial =
      globalMap["applies_to_passenger_special"] !== "false";
    const appliesToMaterial = globalMap["applies_to_material"] !== "false";

    // Determine if submission window restrictions apply to this specific request subtype
    // Default to 'NORMAL' when subType is missing so PASSENGER requests don't bypass the window
    const effectiveSubType =
      subType || (requestType === "PASSENGER" ? "NORMAL" : undefined);
    const windowApplies =
      (requestType === "PASSENGER" &&
        effectiveSubType === "NORMAL" &&
        appliesToPassengerNormal) ||
      (requestType === "PASSENGER" &&
        effectiveSubType === "ADHOC" &&
        appliesToPassengerAdhoc) ||
      (requestType === "PASSENGER" &&
        effectiveSubType === "SPECIAL" &&
        appliesToPassengerSpecial) ||
      (requestType === "MATERIAL" && appliesToMaterial);

    // Determine if we are off-hours right now
    let isOffHours = false;
    if (config && windowApplies) {
      if (!config.is_active) {
        isOffHours = true;
      } else if (
        currentTime < config.start_time ||
        currentTime >= config.end_time
      ) {
        isOffHours = true;
      }
    }

    // Compute visible_from: the next window-open datetime
    let visibleFrom: Date | null = null;
    if (isOffHours && delayVisibility) {
      // Fetch all day configs to find next active window
      const allConfigs = await SystemConfig.findAll();
      const configMap = new Map(
        allConfigs.map((c: any) => [c.day_of_week as number, c]),
      );

      for (let offset = 0; offset <= 7; offset++) {
        const testDate = new Date(now);
        testDate.setDate(testDate.getDate() + offset);
        const dayOfWeek = testDate.getDay();
        const dc = configMap.get(dayOfWeek) as any;
        if (!dc || !dc.is_active) continue;

        if (offset === 0) {
          // Same day: only valid if start_time is still in the future
          if (currentTime < dc.start_time) {
            const [h, m] = dc.start_time.split(":");
            const candidate = new Date(testDate);
            candidate.setHours(parseInt(h), parseInt(m), 0, 0);
            visibleFrom = candidate;
            break;
          }
          // Already past end — skip to next day
          continue;
        }

        // Future active day: set to its start_time
        const [h, m] = dc.start_time.split(":");
        const candidate = new Date(testDate);
        candidate.setHours(parseInt(h), parseInt(m), 0, 0);
        visibleFrom = candidate;
        break;
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    const NON_JOB_SERVICE_CATEGORIES = new Set([
      "PROSPECTIVE",
      "SALES_PROMOTIONS",
      "GENERAL_PURPOSE",
      "TENDER_SUMMATION",
    ]);
    const passengerServiceCategory = String(
      passengerDetails?.service_category || "",
    )
      .trim()
      .toUpperCase();
    const isPassengerNonJobCategory =
      requestType === "PASSENGER" &&
      NON_JOB_SERVICE_CATEGORIES.has(passengerServiceCategory);

    const normalizedJobNo = typeof jobNo === "string" ? jobNo.trim() : "";
    const normalizedProjectName =
      typeof projectName === "string" ? projectName.trim() : "";
    const fallbackJobNo =
      String(passengerDetails?.cost_centre_id || "").trim() || "NON-JOB";
    const fallbackProjectName =
      String(passengerDetails?.cost_centre || "").trim() ||
      "Non-Job Service Request";

    const resolvedJobNo =
      normalizedJobNo || (isPassengerNonJobCategory ? fallbackJobNo : "");
    const resolvedProjectName =
      normalizedProjectName ||
      (isPassengerNonJobCategory ? fallbackProjectName : "");

    // Validate required fields
    if (!requestType || !resolvedJobNo || !resolvedProjectName) {
      await transaction.rollback();
      return res.status(400).json({
        message: "Missing required fields: requestType, jobNo, projectName",
      });
    }

    // ─── Business Rule: Project Status & Budget Validation ─────────────────
    const projectStatus: ProjectStatus =
      req.body.projectStatus || ProjectStatus.ACTIVE;
    const projectBudget: number = parseFloat(req.body.projectBudget) || 0;
    const projectStartDate: string | undefined = req.body.projectStartDate;

    if (!isPassengerNonJobCategory) {
      // Block closed/completed projects entirely
      if (
        projectStatus === ProjectStatus.CLOSED ||
        projectStatus === ProjectStatus.COMPLETED
      ) {
        await transaction.rollback();
        return res.status(403).json({
          message: `Transport request cannot be submitted. Project is ${projectStatus.toLowerCase()} and no longer accepts new requests.`,
        });
      }

      // Block zero / negative budget for project-backed categories
      if (projectBudget <= 0) {
        await transaction.rollback();
        return res.status(403).json({
          message:
            "Transport request cannot be submitted because the project budget is insufficient.",
        });
      }

      // Take-Off projects: also check start date
      if (projectStatus === ProjectStatus.TAKE_OFF) {
        if (projectStartDate) {
          const startDate = new Date(projectStartDate);
          const today = new Date();
          today.setHours(0, 0, 0, 0);
          if (startDate > today) {
            await transaction.rollback();
            return res.status(403).json({
              message: `Transport request cannot be submitted. The project start date (${projectStartDate}) has not been reached yet.`,
            });
          }
        }
      }

      // Low-budget warning (appended to response, not a block)
      const LOW_BUDGET_THRESHOLD = 5000;
      if (projectBudget > 0 && projectBudget < LOW_BUDGET_THRESHOLD) {
        warningMsg =
          "Remaining project budget is low. Please ensure sufficient funds are available.";
      }
    }
    // ─────────────────────────────────────────────────────────────────────

    // Validate request type specific data
    if (requestType === "PASSENGER" && !passengerDetails) {
      await transaction.rollback();
      return res
        .status(400)
        .json({
          message: "Passenger details are required for passenger requests",
        });
    }

    if (requestType === "MATERIAL" && !materialDetails) {
      await transaction.rollback();
      return res
        .status(400)
        .json({
          message: "Material details are required for material requests",
        });
    }

    // Determine initial status based on Role
    // If ADMIN or COORDINATOR submits, they verify it implicitly, so it goes straight to HOD.
    // AD-HOC requests go through the normal approval workflow but with urgent reminders.
    let initialStatus = RequestStatus.PENDING_COORDINATOR;
    const userRole = req.user!.role;

    if (req.body.isSpecial) {
      initialStatus = RequestStatus.PENDING_CEO;
    } else if (userRole === "ADMIN" || userRole === "COORDINATOR") {
      initialStatus = RequestStatus.PENDING_HOD;
    }

    const newRequest = await VehicleRequest.create(
      {
        request_type: requestType,
        requested_by: userId,
        division_id: divisionId,
        sub_division: subDivision,
        job_number: resolvedJobNo,
        project_name: resolvedProjectName,
        status: initialStatus,
        project_budget: isPassengerNonJobCategory
          ? null
          : req.body.projectBudget,
        budget_confirmed: isPassengerNonJobCategory
          ? true
          : req.body.budgetConfirmed,
        project_status: isPassengerNonJobCategory
          ? ProjectStatus.ACTIVE
          : req.body.projectStatus || ProjectStatus.ACTIVE,
        project_start_date: isPassengerNonJobCategory
          ? null
          : req.body.projectStartDate || null,
        submitted_at: now,
        is_special: req.body.isSpecial || false,
        is_adhoc: subType === "ADHOC",
        special_justification: req.body.specialJustification || null,
        visible_from: visibleFrom, // null = visible immediately
        sms_queued: visibleFrom !== null, // true = SMS held until morning reveal
      },
      { transaction },
    );

    let createdPassengerDetails: PassengerRequestDetails | null = null;

    if (requestType === "PASSENGER") {
      // Validate passenger-specific fields
      const {
        date,
        time,
        no_of_days,
        no_of_passengers,
        vehicle_type,
        pickup_location,
        drop_location,
        contact_person_name,
        contact_no,
        reason,
        service_category,
        cost_centre,
        cost_centre_id,
      } = passengerDetails;

      if (
        !date ||
        !time ||
        !no_of_days ||
        !no_of_passengers ||
        !vehicle_type ||
        !pickup_location ||
        !drop_location ||
        !contact_person_name ||
        !contact_no ||
        !reason
      ) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ message: "Missing required passenger details" });
      }

      const isCostCentreRequired = [
        "PROSPECTIVE",
        "SALES_PROMOTIONS",
        "GENERAL_PURPOSE",
        "TENDER_SUMMATION",
      ].includes(service_category || "");
      if (isCostCentreRequired && (!cost_centre || !cost_centre_id)) {
        await transaction.rollback();
        return res
          .status(400)
          .json({
            message:
              "Both Cost Centre and Cost Centre ID are required for the selected service category",
          });
      }

      const pDetails: any = { ...passengerDetails, request_id: newRequest.id };

      // Map flat coordinates for optimization
      if (passengerDetails.pickup_coordinates) {
        pDetails.pickup_lat = passengerDetails.pickup_coordinates.lat;
        pDetails.pickup_lng = passengerDetails.pickup_coordinates.lng;
      }
      if (passengerDetails.drop_coordinates) {
        pDetails.drop_lat = passengerDetails.drop_coordinates.lat;
        pDetails.drop_lng = passengerDetails.drop_coordinates.lng;
      }

      // Calculate Route if coordinates provided
      if (
        passengerDetails.pickup_coordinates &&
        passengerDetails.drop_coordinates
      ) {
        try {
          const routeData = await GoogleRouteService.calculateRoute(
            passengerDetails.pickup_coordinates,
            passengerDetails.drop_coordinates,
            passengerDetails.stops_coordinates || [],
          );
          if (routeData) {
            pDetails.route_geometry = routeData.geometry;
            pDetails.total_distance_km = routeData.distanceKm;
            pDetails.total_duration_minutes = routeData.durationMin;
          }
        } catch (err) {
          console.error(
            "Failed to calculate route for passenger request:",
            err,
          );
        }
      }

      createdPassengerDetails = await PassengerRequestDetails.create(pDetails, {
        transaction,
      });
    } else if (requestType === "MATERIAL") {
      // Validate material-specific fields
      const {
        date,
        time,
        vehicle_type,
        pickup_location_1,
        drop_location_1,
        contact_person_name,
        contact_no,
        reason,
      } = materialDetails;

      if (
        !date ||
        !time ||
        !vehicle_type ||
        !pickup_location_1 ||
        !drop_location_1 ||
        !contact_person_name ||
        !contact_no ||
        !reason
      ) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ message: "Missing required material details" });
      }

      const mDetails: any = { ...materialDetails, request_id: newRequest.id };

      // Calculate Route if coordinates provided
      if (
        materialDetails.pickup_coordinates &&
        materialDetails.drop_coordinates
      ) {
        try {
          const routeData = await GoogleRouteService.calculateRoute(
            materialDetails.pickup_coordinates,
            materialDetails.drop_coordinates,
            materialDetails.stops_coordinates || [],
          );
          if (routeData) {
            mDetails.route_geometry = routeData.geometry;
            mDetails.total_distance_km = routeData.distanceKm;
            mDetails.total_duration_minutes = routeData.durationMin;
          }
        } catch (err) {
          console.error("Failed to calculate route for material request:", err);
        }
      }

      await MaterialRequestDetails.create(mDetails, { transaction });
    }

    // Ride Sharing Logic: Link to existing Trip if tripId provided
    if (req.body.tripId && requestType === "PASSENGER") {
      // tripId corresponds to an existing Allocation ID
      const existingAlloc = await Allocation.findByPk(req.body.tripId, {
        transaction,
      });

      if (existingAlloc && createdPassengerDetails) {
        const availabilityConfig = await loadAvailabilityConfig(transaction);
        const driverSchedule = buildPassengerSchedule(
          createdPassengerDetails,
          availabilityConfig,
          { includeDriverRest: true },
        );
        const vehicleSchedule = buildPassengerSchedule(
          createdPassengerDetails,
          availabilityConfig,
          { includeDriverRest: false },
        );

        const driverConflicts = driverSchedule
          ? await findDriverConflicts(existingAlloc.driver_id, driverSchedule, {
            excludeRequestIds: [existingAlloc.request_id, newRequest.id],
            transaction,
            config: availabilityConfig,
          })
          : [];

        const vehicleConflicts = vehicleSchedule
          ? await findVehicleConflicts(existingAlloc.vehicle_id, vehicleSchedule, {
            excludeRequestIds: [existingAlloc.request_id, newRequest.id],
            transaction,
            config: availabilityConfig,
          })
          : [];

        if (driverConflicts.length > 0 || vehicleConflicts.length > 0) {
          await transaction.rollback();
          const conflictReasons = [] as string[];
          if (driverConflicts.length > 0) conflictReasons.push("DRIVER_UNAVAILABLE");
          if (vehicleConflicts.length > 0) conflictReasons.push("VEHICLE_UNAVAILABLE");
          return res.status(409).json({
            message:
              "Driver and/or vehicle is not available for the requested time window.",
            conflictReasons,
            driverNextAvailableAt: getNextAvailableAt(driverConflicts)?.toISOString() ?? null,
            vehicleNextAvailableAt: getNextAvailableAt(vehicleConflicts)?.toISOString() ?? null,
            driverConflicts: driverConflicts.map((conflict) => ({
              requestId: conflict.requestId,
              tripId: conflict.tripId,
              startAt: conflict.startAt.toISOString(),
              endAt: conflict.endAt.toISOString(),
            })),
            vehicleConflicts: vehicleConflicts.map((conflict) => ({
              requestId: conflict.requestId,
              tripId: conflict.tripId,
              startAt: conflict.startAt.toISOString(),
              endAt: conflict.endAt.toISOString(),
            })),
          });
        }

        // Create a new allocation for this request pointing to the same resources
        await Allocation.create(
          {
            request_id: newRequest.id,
            vehicle_id: existingAlloc.vehicle_id,
            driver_id: existingAlloc.driver_id,
          },
          { transaction },
        );

        newRequest.status = RequestStatus.ALLOCATED;
        await newRequest.save({ transaction });
      }
    }

    await transaction.commit();

    // ---------------------------------------------------------
    // LINKED RETURN TRIP LOGIC: Create Child Request
    // ---------------------------------------------------------
    if (
      (requestType === "PASSENGER" &&
        passengerDetails.return_trip &&
        passengerDetails.return_time) ||
      (requestType === "MATERIAL" &&
        materialDetails.return_materials &&
        materialDetails.return_time)
    ) {
      try {
        const returnTransaction = await sequelize.transaction();

        // Create Linked Child Request (inherit visibility delay from parent)
        const childRequest = await VehicleRequest.create(
          {
            request_type: requestType,
            requested_by: userId,
            division_id: divisionId,
            sub_division: subDivision,
            job_number: resolvedJobNo,
            project_name: `${resolvedProjectName} (Return Leg)`,
            status: initialStatus,
            project_budget: isPassengerNonJobCategory
              ? null
              : req.body.projectBudget,
            budget_confirmed: isPassengerNonJobCategory
              ? true
              : req.body.budgetConfirmed,
            submitted_at: now,
            parent_id: newRequest.id,
            is_return_leg: true,
            visible_from: visibleFrom,
            sms_queued: visibleFrom !== null,
          },
          { transaction: returnTransaction },
        );

        if (requestType === "PASSENGER") {
          const childDetails = {
            ...passengerDetails,
            request_id: childRequest.id,
            date: passengerDetails.return_date || passengerDetails.date,
            time: passengerDetails.return_time,
            pickup_location: passengerDetails.drop_location,
            drop_location: passengerDetails.pickup_location,
            pickup_coordinates: passengerDetails.drop_coordinates,
            drop_coordinates: passengerDetails.pickup_coordinates,
            pickup_lat: passengerDetails.drop_lat,
            pickup_lng: passengerDetails.drop_lng,
            drop_lat: passengerDetails.pickup_lat,
            drop_lng: passengerDetails.pickup_lng,
            return_trip: false, // Stop recursion
          };
          await PassengerRequestDetails.create(childDetails, {
            transaction: returnTransaction,
          });
        } else {
          const childDetails = {
            ...materialDetails,
            request_id: childRequest.id,
            date: materialDetails.return_date || materialDetails.date,
            time: materialDetails.return_time,
            pickup_location_1: materialDetails.drop_location_1,
            drop_location_1: materialDetails.pickup_location_1,
            pickup_coordinates: materialDetails.drop_coordinates,
            drop_coordinates: materialDetails.pickup_coordinates,
            return_materials: false, // Stop recursion
          };
          await MaterialRequestDetails.create(childDetails, {
            transaction: returnTransaction,
          });
        }

        await returnTransaction.commit();
        console.log(
          `[ReturnTrip] Created linked child request #${childRequest.id} for parent #${newRequest.id}`,
        );
      } catch (err) {
        console.error("[ReturnTrip] Failed to create child request:", err);
        // We don't fail the whole parent creation if child fails, but log it.
      }
    }
    // ---------------------------------------------------------

    // Background: Update Cache for Optimization
    const reqDate = passengerDetails?.date || materialDetails?.date;
    if (reqDate) {
      // Trigger background scan for the request date
      GoogleRouteService.scanAndCache(reqDate).catch((err) =>
        console.error("Cache trigger error:", err),
      );
    }

    // Fire NEW_REQUEST notifications immediately if the request is visible right now.
    // If it is held (sms_queued=true), the morning-reveal job will handle it.
    if (!visibleFrom) {
      NotificationService.notifyNewRequest(newRequest).catch((err) =>
        console.error("[Notification] notifyNewRequest error:", err),
      );
    }

    const response: any = {
      message: "Request created successfully",
      requestId: newRequest.id,
    };

    if (warningMsg) {
      response.warning = warningMsg;
    }

    if (visibleFrom) {
      response.visible_from = visibleFrom.toISOString();
      response.visibility_note = `Request will appear in approval dashboards from ${visibleFrom.toLocaleString("en-GB", { timeZone: "Asia/Colombo" })} (next business window).`;
    }

    res.status(201).json(response);
  } catch (error: any) {
    if (transaction) await transaction.rollback();
    console.error("Create request error:", error);

    // Write error to file for debugging
    try {
      const logPath = path.join(__dirname, "../../error_log.txt");
      const errorLog = `Timestamp: ${new Date().toISOString()}\nError: ${error.message}\nStack: ${error.stack}\nDetails: ${JSON.stringify(error, Object.getOwnPropertyNames(error))}\n\n`;
      fs.appendFileSync(logPath, errorLog);
    } catch (logErr) {
      console.error("Failed to write error log:", logErr);
    }

    res
      .status(500)
      .json({ message: "Failed to create request", error: error.message });
  }
};

export const verifyRequest = async (req: AuthRequest, res: Response) => {
  // COORDINATOR ACTION
  const { requestId } = req.params;
  const { status, comment } = req.body; // status: 'VERIFIED' (mapped to PENDING_HOD) or 'RETURNED'

  try {
    const request = await VehicleRequest.findByPk(requestId, {
      include: [PassengerRequestDetails],
    });
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (status === "VERIFIED") {
      request.status = RequestStatus.PENDING_HOD; // Move to HOD
    } else if (status === "RETURNED") {
      request.status = RequestStatus.RETURNED;
    } else {
      return res.status(400).json({ message: "Invalid status" });
    }

    await request.save();

    await Approval.create({
      request_id: request.id,
      approved_by: req.user!.userId,
      role: "COORDINATOR",
      status: status === "VERIFIED" ? "APPROVED" : "RETURNED",
      comment: comment,
    });

    // Notify User
    await NotificationService.notifyRequestVerification(request, status);

    res.json({ message: `Request ${status.toLowerCase()}` });
  } catch (error) {
    console.error("Verify request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const approveRequest = async (req: AuthRequest, res: Response) => {
  // HOD / CEO ACTION
  const { requestId } = req.params;
  const { status, comment } = req.body; // status: 'APPROVED' or 'REJECTED'

  const transaction = await sequelize.transaction();
  try {
    const request = await VehicleRequest.findByPk(requestId, { transaction });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: "Request not found" });
    }

    const userRole = req.user!.role as "HOD" | "CEO";

    if (status === "APPROVED") {
      request.status = RequestStatus.APPROVED;
    } else if (status === "REJECTED") {
      request.status = RequestStatus.REJECTED;
    } else if (status === "RETURNED" && userRole === "CEO") {
      request.status = RequestStatus.RETURNED;
    } else {
      await transaction.rollback();
      return res.status(400).json({ message: "Invalid status" });
    }

    await request.save({ transaction });

    await Approval.create(
      {
        request_id: request.id,
        approved_by: req.user!.userId,
        role: userRole,
        status: status,
        comment: comment,
      },
      { transaction },
    );

    // ── Merge Group Partial-Approval Resolution ──────────────────────────────
    // If this request belongs to a merge group, check whether all siblings have
    // now reached a terminal state (APPROVED or REJECTED).
    let partialResolutionInfo: string | null = null;
    if (request.merge_group_id) {
      const groupId = request.merge_group_id;
      const siblings = await VehicleRequest.findAll({
        where: { merge_group_id: groupId },
        transaction,
      });

      const pending = siblings.filter(
        (s) =>
          s.status === RequestStatus.PENDING_HOD ||
          s.status === RequestStatus.PENDING_CEO,
      );

      // Only act when every sibling has been decided
      if (pending.length === 0) {
        const approved = siblings.filter(
          (s) => s.status === RequestStatus.APPROVED,
        );
        const rejected = siblings.filter(
          (s) => s.status === RequestStatus.REJECTED,
        );

        if (approved.length > 0 && rejected.length > 0) {
          // Mixed result: free the approved ones from the merge group so they
          // can be independently allocated; keep rejected ones unchanged.
          for (const s of approved) {
            s.merge_group_id = null as any;
            s.proposed_vehicle_type_id = null as any;
            s.proposed_attributes = null;
            await s.save({ transaction });
          }
          // Mark the audit log as partially resolved
          await RideShareSuggestion.update(
            { status: "PARTIALLY_APPROVED" },
            { where: { group_id: groupId }, transaction },
          );
          partialResolutionInfo = `Merge group partially resolved: ${approved.length} approved (freed for independent allocation), ${rejected.length} rejected.`;
        } else if (rejected.length === siblings.length) {
          // All rejected: dissolve the group
          for (const s of siblings) {
            s.merge_group_id = null as any;
            s.proposed_vehicle_type_id = null as any;
            s.proposed_attributes = null;
            await s.save({ transaction });
          }
          await RideShareSuggestion.update(
            { status: "REJECTED" },
            { where: { group_id: groupId }, transaction },
          );
          partialResolutionInfo = `Merge group fully rejected and dissolved.`;
        } else if (approved.length === siblings.length) {
          // All approved: update audit log status
          await RideShareSuggestion.update(
            { status: "FULLY_APPROVED" },
            { where: { group_id: groupId }, transaction },
          );
        }
      }
    }
    // ─────────────────────────────────────────────────────────────────────────

    await transaction.commit();

    // Notifications (non-blocking)
    try {
      if (status === "RETURNED") {
        // CEO returning a request should fire REQUEST_RETURNED, not REQUEST_REJECTED
        await NotificationService.notifyRequestVerification(
          request,
          "RETURNED",
        );
      } else {
        await NotificationService.notifyRequestApproval(request, status);
      }
    } catch (_) {
      /* non-fatal */
    }

    const response: Record<string, any> = {
      message: `Request ${status.toLowerCase()}`,
    };
    if (partialResolutionInfo)
      response.mergeGroupResolution = partialResolutionInfo;
    res.json(response);
  } catch (error) {
    await transaction.rollback();
    console.error("Approve request error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
};

export const getAllocationResources = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { type } = req.query; // e.g. 'Car', 'Van'

    if (!type) {
      return res.status(400).json({ message: "Vehicle type is required" });
    }

    // Resolve Type Name to ID
    const vType = await VehicleType.findOne({
      where: { name: type as string },
    });
    if (!vType) {
      return res.json({ vehicles: [], drivers: [] }); // No such type
    }
    const typeId = vType.id;

    // 1. Get Available Vehicles of this type
    const vehicles = await Vehicle.findAll({
      where: {
        vehicle_type_id: typeId,
        availability_status: "AVAILABLE",
      },
      include: [{ model: VehicleType }],
    });

    // 2. Get Drivers who can drive this type
    // fetching all and filtering in-memory
    const allDrivers = await Driver.findAll({
      include: [{ model: User, attributes: ["name", "email"] }],
    });

    const eligibleDrivers = allDrivers.filter((driver) => {
      let allowed: any = driver.allowed_vehicle_type_ids;
      // Handle parsing if needed (though now it should be JSON number array)
      if (typeof allowed === "string") {
        try {
          allowed = JSON.parse(allowed);
        } catch (e) {
          return false;
        }
      }
      return Array.isArray(allowed) && allowed.includes(typeId);
    });

    let filteredDrivers = eligibleDrivers;
    const eligibleDriverIds = new Set(eligibleDrivers.map((d) => d.id));
    let blockedDrivers: Array<{
      driverId: number;
      name: string;
      startAt: string;
      endAt: string;
    }> = [];
    let filteredVehicles = vehicles;
    let blockedVehicles: Array<{
      vehicleId: number;
      vehicleNumber: string;
      startAt: string;
      endAt: string;
    }> = [];

    const applyConflictFiltering = (
      conflictDetails: Array<{
        driverId: number;
        startAt: Date;
        endAt: Date;
      }>,
    ) => {
      const filtered = conflictDetails.filter((detail) =>
        eligibleDriverIds.has(detail.driverId),
      );

      blockedDrivers = filtered.map((detail) => {
        const driver = eligibleDrivers.find((d) => d.id === detail.driverId);
        const name = driver?.user?.name ?? `Driver #${detail.driverId}`;
        return {
          driverId: detail.driverId,
          name,
          startAt: detail.startAt.toISOString(),
          endAt: detail.endAt.toISOString(),
        };
      });

      const blockedDriverIds = new Set(
        blockedDrivers.map((detail) => detail.driverId),
      );
      filteredDrivers = eligibleDrivers.filter(
        (driver) => !blockedDriverIds.has(driver.id),
      );
    };

    const applyVehicleConflictFiltering = (
      conflictDetails: Array<{
        vehicleId: number;
        startAt: Date;
        endAt: Date;
      }>,
    ) => {
      const vehicleIdSet = new Set(vehicles.map((v) => v.id));
      const filtered = conflictDetails.filter((detail) =>
        vehicleIdSet.has(detail.vehicleId),
      );

      blockedVehicles = filtered.map((detail) => {
        const vehicle = vehicles.find((v) => v.id === detail.vehicleId);
        const vehicleNumber = vehicle?.vehicle_number ?? `Vehicle #${detail.vehicleId}`;
        return {
          vehicleId: detail.vehicleId,
          vehicleNumber,
          startAt: detail.startAt.toISOString(),
          endAt: detail.endAt.toISOString(),
        };
      });

      const blockedVehicleIds = new Set(
        blockedVehicles.map((detail) => detail.vehicleId),
      );
      filteredVehicles = vehicles.filter(
        (vehicle) => !blockedVehicleIds.has(vehicle.id),
      );
    };
    const requestIdsRaw = req.query.requestIds;
    const requestIdRaw = req.query.requestId;

    const parsedRequestIds: number[] = Array.isArray(requestIdsRaw)
      ? requestIdsRaw
          .map((id) => parseInt(String(id), 10))
          .filter((id) => !Number.isNaN(id))
      : typeof requestIdsRaw === "string"
        ? requestIdsRaw
            .split(",")
            .map((id) => parseInt(id.trim(), 10))
            .filter((id) => !Number.isNaN(id))
        : [];

    const requestId =
      typeof requestIdRaw === "string" ? parseInt(requestIdRaw, 10) : NaN;

    const availabilityConfig = await loadAvailabilityConfig();

    if (parsedRequestIds.length > 0) {
      const requests = await VehicleRequest.findAll({
        where: { id: parsedRequestIds },
        include: [PassengerRequestDetails],
      });

      if (requests.length !== parsedRequestIds.length) {
        return res.status(404).json({ message: "Request not found" });
      }

      const driverSchedule = buildTripScheduleFromRequests(
        requests,
        availabilityConfig,
        { includeDriverRest: true },
      );
      if (driverSchedule) {
        const conflictDetails = await findDriverConflictDetails(driverSchedule, {
          excludeRequestIds: parsedRequestIds,
          config: availabilityConfig,
        });
        applyConflictFiltering(conflictDetails);
      }

      const vehicleSchedule = buildTripScheduleFromRequests(
        requests,
        availabilityConfig,
        { includeDriverRest: false },
      );
      if (vehicleSchedule) {
        const vehicleConflictDetails = await findVehicleConflictDetails(
          vehicleSchedule,
          {
            excludeRequestIds: parsedRequestIds,
            config: availabilityConfig,
          },
        );
        applyVehicleConflictFiltering(vehicleConflictDetails);
      }
    } else if (!Number.isNaN(requestId)) {
      const request = await VehicleRequest.findByPk(requestId, {
        include: [PassengerRequestDetails],
      });

      if (!request) {
        return res.status(404).json({ message: "Request not found" });
      }

      if (
        request.request_type === RequestType.PASSENGER &&
        request.passengerDetails
      ) {
        const driverSchedule = buildPassengerSchedule(
          request.passengerDetails,
          availabilityConfig,
          { includeDriverRest: true },
        );
        if (driverSchedule) {
          const conflictDetails = await findDriverConflictDetails(driverSchedule, {
            excludeRequestIds: [request.id],
            allowTripId: request.trip_id ?? undefined,
            config: availabilityConfig,
          });
          applyConflictFiltering(conflictDetails);
        }

        const vehicleSchedule = buildPassengerSchedule(
          request.passengerDetails,
          availabilityConfig,
          { includeDriverRest: false },
        );
        if (vehicleSchedule) {
          const vehicleConflictDetails = await findVehicleConflictDetails(
            vehicleSchedule,
            {
              excludeRequestIds: [request.id],
              allowTripId: request.trip_id ?? undefined,
              config: availabilityConfig,
            },
          );
          applyVehicleConflictFiltering(vehicleConflictDetails);
        }
      }
    }

    res.json({
      vehicles: filteredVehicles,
      drivers: filteredDrivers,
      blockedDrivers,
      blockedVehicles,
    });
  } catch (error) {
    console.error("Get allocation resources error:", error);
    res.status(500).json({ message: "Failed to fetch resources" });
  }
};

export const allocateVehicle = async (req: AuthRequest, res: Response) => {
  // TRANSPORT DIVISION ACTION
  const { requestId } = req.params;
  // Accept either IDs (if selecting existing) or Details (if entering new)
  const {
    vehicleId,
    driverId,
    vehicle_number,
    driver_name,
    contact_no,
    nic_no,
  } = req.body;

  const transaction = await sequelize.transaction();
  try {
    const availabilityConfig = await loadAvailabilityConfig(transaction);
    const request = await VehicleRequest.findByPk(requestId, {
      include: [PassengerRequestDetails],
    });
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: "Request not found" });
    }

    if (request.status !== RequestStatus.APPROVED) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Request is not approved for allocation" });
    }

    // Block individual allocation if this request belongs to a merge group with unapproved siblings
    if (request.merge_group_id) {
      const siblings = await VehicleRequest.findAll({
        where: { merge_group_id: request.merge_group_id },
      });
      const notApproved = siblings.filter(
        (s) => s.id !== request.id && s.status !== RequestStatus.APPROVED,
      );
      if (notApproved.length > 0) {
        await transaction.rollback();
        return res.status(409).json({
          message: `This request belongs to merge group "${request.merge_group_id}". ${notApproved.length} sibling request(s) are not yet approved. Approve all requests in the group before allocating.`,
          groupId: request.merge_group_id,
          pendingRequestIds: notApproved.map((s) => s.id),
        });
      }
    }

    let finalVehicleId = vehicleId;
    let finalDriverId = driverId;

    // 1. Handle Vehicle
    if (!finalVehicleId && vehicle_number) {
      // Logic to create vehicle on fly... requires Type ID now.
      // If we don't know the ID of "Lorry" (fallback), we might fail.
      // Let's try to look it up from Request Type.
      const typeName =
        request.request_type === "PASSENGER"
          ? request.passengerDetails?.vehicle_type || "Car"
          : "Lorry";
      let vType = await VehicleType.findOne({ where: { name: typeName } });

      if (!vType) {
        // Auto-create Vehicle Type if it's a custom one from the request
        vType = await VehicleType.create(
          {
            name: typeName,
            category: request.request_type,
          },
          { transaction },
        );
      }

      if (vType) {
        const [vehicle] = await Vehicle.findOrCreate({
          where: { vehicle_number },
          defaults: {
            vehicle_type_id: vType.id,
            availability_status: "AVAILABLE",
          },
          transaction,
        });
        finalVehicleId = vehicle.id;
      }
    }

    // 2. Handle Driver
    // We now enforce selecting a registered driver (via driverId).
    // Dynamic creation by name is removed to ensure data integrity.
    if (!finalDriverId) {
      // If implicit logic was relying on names, it stops here. Ensure UI sends driverId.
    }

    if (finalVehicleId) {
      // Validate Vehicle (Optional checks here)
      const vehicle = await Vehicle.findByPk(finalVehicleId);
    }

    // Validate Driver Capability
    if (finalDriverId && finalVehicleId) {
      const driver = await Driver.findByPk(finalDriverId, { include: [User] });
      const vehicle = await Vehicle.findByPk(finalVehicleId);

      if (!driver) {
        await transaction.rollback();
        return res.status(404).json({ message: "Driver not found" });
      }

      if (vehicle) {
        let allowedIds: any = driver.allowed_vehicle_type_ids || [];
        if (typeof allowedIds === "string")
          try {
            allowedIds = JSON.parse(allowedIds);
          } catch {
            allowedIds = [];
          }

        if (
          Array.isArray(allowedIds) &&
          allowedIds.length > 0 &&
          !allowedIds.includes(vehicle.vehicle_type_id)
        ) {
          await transaction.rollback();
          // Fetch vehicle type name for error msg
          const vType = await VehicleType.findByPk(vehicle.vehicle_type_id);
          return res.status(400).json({
            message: `Driver ${driver.user?.name || "Unknown"} is not authorized to drive ${vType?.name || "this vehicle"}.`,
          });
        }
      }
    }

    if (!finalVehicleId || !finalDriverId) {
      await transaction.rollback();
      return res
        .status(400)
        .json({ message: "Vehicle and Driver details are required." });
    }

    if (
      request.request_type === RequestType.PASSENGER &&
      request.passengerDetails
    ) {
      const driverSchedule = buildPassengerSchedule(
        request.passengerDetails,
        availabilityConfig,
        { includeDriverRest: true },
      );
      const vehicleSchedule = buildPassengerSchedule(
        request.passengerDetails,
        availabilityConfig,
        { includeDriverRest: false },
      );

      const driverConflicts = driverSchedule
        ? await findDriverConflicts(finalDriverId, driverSchedule, {
          excludeRequestIds: [request.id],
          allowTripId: request.trip_id ?? undefined,
          transaction,
          config: availabilityConfig,
        })
        : [];

      const vehicleConflicts = vehicleSchedule
        ? await findVehicleConflicts(finalVehicleId, vehicleSchedule, {
          excludeRequestIds: [request.id],
          allowTripId: request.trip_id ?? undefined,
          transaction,
          config: availabilityConfig,
        })
        : [];

      if (driverConflicts.length > 0 || vehicleConflicts.length > 0) {
        await transaction.rollback();
        const conflictReasons = [] as string[];
        if (driverConflicts.length > 0) conflictReasons.push("DRIVER_UNAVAILABLE");
        if (vehicleConflicts.length > 0) conflictReasons.push("VEHICLE_UNAVAILABLE");
        return res.status(409).json({
          message: "Driver and/or vehicle is not available for the requested time window.",
          conflictReasons,
          driverNextAvailableAt: getNextAvailableAt(driverConflicts)?.toISOString() ?? null,
          vehicleNextAvailableAt: getNextAvailableAt(vehicleConflicts)?.toISOString() ?? null,
          driverConflicts: driverConflicts.map((conflict) => ({
            requestId: conflict.requestId,
            tripId: conflict.tripId,
            startAt: conflict.startAt.toISOString(),
            endAt: conflict.endAt.toISOString(),
          })),
          vehicleConflicts: vehicleConflicts.map((conflict) => ({
            requestId: conflict.requestId,
            tripId: conflict.tripId,
            startAt: conflict.startAt.toISOString(),
            endAt: conflict.endAt.toISOString(),
          })),
        });
      }
    }

    await Allocation.create(
      {
        request_id: request.id,
        vehicle_id: finalVehicleId,
        driver_id: finalDriverId,
      },
      { transaction },
    );

    // Directly set to ALLOCATED — no intermediate coordinator confirmation step
    request.status = RequestStatus.ALLOCATED;
    await request.save({ transaction });

    await transaction.commit();

    // Notify driver and requester immediately
    try {
      const vehicle = await Vehicle.findByPk(finalVehicleId);
      const driver = await Driver.findByPk(finalDriverId);

      if (vehicle && driver) {
        await NotificationService.notifyVehicleAllocation(
          request,
          vehicle,
          driver,
        );
      }
    } catch (nErr) {
      console.error("Notification error:", nErr);
    }

    res.json({
      message: "Vehicle allocated successfully",
      requestId: request.id,
      status: "ALLOCATED",
    });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Allocate vehicle error:", error);
    res.status(500).json({ message: "Failed to allocate vehicle" });
  }
};

export const updateAllocationResource = async (
  req: AuthRequest,
  res: Response,
) => {
  // TRANSPORT/COORDINATOR ACTION
  const { requestId } = req.params;
  const { vehicleId, driverId } = req.body;

  if (!vehicleId || !driverId) {
    return res
      .status(400)
      .json({ message: "Vehicle and Driver IDs are required" });
  }

  const transaction = await sequelize.transaction();

  try {
    const availabilityConfig = await loadAvailabilityConfig(transaction);
    const request = await VehicleRequest.findByPk(requestId);
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: "Request not found" });
    }

    // Logic 1: If Request is part of a Trip
    if (request.trip_id) {
      const { Trip } = require("../models/Trip");
      const trip = await Trip.findByPk(request.trip_id);
      if (trip) {
        const requestsInTrip = await VehicleRequest.findAll({
          where: { trip_id: trip.id },
          include: [PassengerRequestDetails],
          transaction,
        });

        const driverSchedule = buildTripScheduleFromRequests(
          requestsInTrip,
          availabilityConfig,
          { includeDriverRest: true },
        );
        const vehicleSchedule = buildTripScheduleFromRequests(
          requestsInTrip,
          availabilityConfig,
          { includeDriverRest: false },
        );

        const driverConflicts = driverSchedule
          ? await findDriverConflicts(driverId, driverSchedule, {
            allowTripId: trip.id,
            excludeRequestIds: requestsInTrip.map((r) => r.id),
            transaction,
            config: availabilityConfig,
          })
          : [];

        const vehicleConflicts = vehicleSchedule
          ? await findVehicleConflicts(vehicleId, vehicleSchedule, {
            allowTripId: trip.id,
            excludeRequestIds: requestsInTrip.map((r) => r.id),
            transaction,
            config: availabilityConfig,
          })
          : [];

        if (driverConflicts.length > 0 || vehicleConflicts.length > 0) {
          await transaction.rollback();
          const conflictReasons = [] as string[];
          if (driverConflicts.length > 0) conflictReasons.push("DRIVER_UNAVAILABLE");
          if (vehicleConflicts.length > 0) conflictReasons.push("VEHICLE_UNAVAILABLE");
          return res.status(409).json({
            message:
              "Driver and/or vehicle is not available for the requested trip time window.",
            conflictReasons,
            driverNextAvailableAt: getNextAvailableAt(driverConflicts)?.toISOString() ?? null,
            vehicleNextAvailableAt: getNextAvailableAt(vehicleConflicts)?.toISOString() ?? null,
            driverConflicts: driverConflicts.map((conflict) => ({
              requestId: conflict.requestId,
              tripId: conflict.tripId,
              startAt: conflict.startAt.toISOString(),
              endAt: conflict.endAt.toISOString(),
            })),
            vehicleConflicts: vehicleConflicts.map((conflict) => ({
              requestId: conflict.requestId,
              tripId: conflict.tripId,
              startAt: conflict.startAt.toISOString(),
              endAt: conflict.endAt.toISOString(),
            })),
          });
        }

        trip.vehicle_id = vehicleId;
        trip.driver_id = driverId;
        await trip.save({ transaction });

        // Sync Allocation records for all requests in this trip
        for (const r of requestsInTrip) {
          const alloc = await Allocation.findOne({
            where: { request_id: r.id },
            transaction,
          });
          if (alloc) {
            alloc.vehicle_id = vehicleId;
            alloc.driver_id = driverId;
            await alloc.save({ transaction });
          }
        }

        await transaction.commit();
        return res.json({ message: "Trip updated successfully", type: "TRIP" });
      }
    }

    // Logic 2: If Request is Single Allocation
    const alloc = await Allocation.findOne({
      where: { request_id: requestId },
      transaction,
    });
    if (alloc) {
      if (
        request.request_type === RequestType.PASSENGER &&
        request.passengerDetails
      ) {
        const driverSchedule = buildPassengerSchedule(
          request.passengerDetails,
          availabilityConfig,
          { includeDriverRest: true },
        );
        const vehicleSchedule = buildPassengerSchedule(
          request.passengerDetails,
          availabilityConfig,
          { includeDriverRest: false },
        );

        const driverConflicts = driverSchedule
          ? await findDriverConflicts(driverId, driverSchedule, {
            excludeRequestIds: [request.id],
            allowTripId: request.trip_id ?? undefined,
            transaction,
            config: availabilityConfig,
          })
          : [];

        const vehicleConflicts = vehicleSchedule
          ? await findVehicleConflicts(vehicleId, vehicleSchedule, {
            excludeRequestIds: [request.id],
            allowTripId: request.trip_id ?? undefined,
            transaction,
            config: availabilityConfig,
          })
          : [];

        if (driverConflicts.length > 0 || vehicleConflicts.length > 0) {
          await transaction.rollback();
          const conflictReasons = [] as string[];
          if (driverConflicts.length > 0) conflictReasons.push("DRIVER_UNAVAILABLE");
          if (vehicleConflicts.length > 0) conflictReasons.push("VEHICLE_UNAVAILABLE");
          return res.status(409).json({
            message:
              "Driver and/or vehicle is not available for the requested time window.",
            conflictReasons,
            driverNextAvailableAt: getNextAvailableAt(driverConflicts)?.toISOString() ?? null,
            vehicleNextAvailableAt: getNextAvailableAt(vehicleConflicts)?.toISOString() ?? null,
            driverConflicts: driverConflicts.map((conflict) => ({
              requestId: conflict.requestId,
              tripId: conflict.tripId,
              startAt: conflict.startAt.toISOString(),
              endAt: conflict.endAt.toISOString(),
            })),
            vehicleConflicts: vehicleConflicts.map((conflict) => ({
              requestId: conflict.requestId,
              tripId: conflict.tripId,
              startAt: conflict.startAt.toISOString(),
              endAt: conflict.endAt.toISOString(),
            })),
          });
        }
      }

      alloc.vehicle_id = vehicleId;
      alloc.driver_id = driverId;
      await alloc.save({ transaction });
      await transaction.commit();
      return res.json({
        message: "Allocation updated successfully",
        type: "ALLOCATION",
      });
    }

    await transaction.rollback();
    res
      .status(404)
      .json({ message: "No active allocation or trip found to update." });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Update allocation error:", error);
    res.status(500).json({ message: "Failed to update allocation" });
  }
};


export const completeRequest = async (req: AuthRequest, res: Response) => {
  const { requestId } = req.params;

  try {
    const request = await VehicleRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    if (
      request.status !== RequestStatus.ALLOCATED &&
      request.status !== RequestStatus.VENDOR_ALLOCATED
    ) {
      return res.status(400).json({ message: "Request is not allocated" });
    }

    request.status = RequestStatus.COMPLETED;
    await request.save();

    // Fire REQUEST_COMPLETED notification (config-driven)
    NotificationService.notifyRequestCompleted(request).catch((err) =>
      console.error("[Notification] notifyRequestCompleted error:", err),
    );

    res.json({ message: "Request completed successfully" });
  } catch (error) {
    console.error("Complete request error:", error);
    res.status(500).json({ message: "Failed to complete request" });
  }
};

export const getRequests = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;
    const divisionId = req.user!.divisionId;
    const userId = req.user!.userId;
    const mine = req.query.mine === "true";

    let whereClause: any = {};

    // If ?mine=true is passed, always return only the caller's own requests
    // (used by the "My Requests" page for roles that would otherwise see division-wide data)
    if (mine) {
      whereClause = { requested_by: userId };
    } else if (
      role === "STAFF" ||
      role === "MCU_USER" ||
      role === "CALL_CENTER" ||
      role === "WAREHOUSE"
    ) {
      // Staff always see their own requests regardless of visibility window
      whereClause = { requested_by: userId };
    } else if (role === "COORDINATOR") {
      if (!divisionId) {
        console.warn(
          `COORDINATOR ${userId} has no division assigned. Returning empty list.`,
        );
        return res.json([]);
      }
      whereClause = { division_id: divisionId };
    } else if (role === "HOD") {
      if (!divisionId) {
        console.warn(
          `HOD ${userId} has no division assigned. Returning empty list.`,
        );
        return res.json([]);
      }
      whereClause = {
        division_id: divisionId,
        status: [
          RequestStatus.PENDING_HOD,
          RequestStatus.APPROVED,
          RequestStatus.REJECTED,
        ],
      };
    } else if (role === "TRANSPORT") {
      whereClause = {
        status: [
          RequestStatus.APPROVED,
          RequestStatus.ALLOCATED,
          RequestStatus.ON_GOING,
          RequestStatus.COMPLETED,
        ],
      };
    } else if (role === "CEO") {
      // CEO can see everything - no whereClause filter needed
    }

    // ── Visibility Window Filter ──────────────────────────────────────────
    // For all approval/action roles (not STAFF/ADMIN), hide requests that
    // are held until a future window (submitted after office hours).
    // ADMIN always sees everything so they can audit.
    // Also skip when ?mine=true — users should always see their own submitted requests.
    if (
      !mine &&
      role !== "STAFF" &&
      role !== "ADMIN" &&
      role !== "MCU_USER" &&
      role !== "CALL_CENTER" &&
      role !== "WAREHOUSE"
    ) {
      const now = new Date();
      whereClause = {
        ...whereClause,
        [Op.or]: [{ visible_from: null }, { visible_from: { [Op.lte]: now } }],
      };
    }
    // ─────────────────────────────────────────────────────────────────────

    const requests = await VehicleRequest.findAll({
      where: whereClause,
      include: [
        { model: User, as: "requester", attributes: ["name", "email"] },
        { model: Division, attributes: ["name"] },
        { model: PassengerRequestDetails },
        { model: MaterialRequestDetails },
        {
          model: Allocation,
          include: [
            {
              model: Vehicle,
              attributes: [
                "id",
                "vehicle_number",
                "specification",
                "vehicle_type_id",
              ],
              include: [{ model: VehicleType, attributes: ["name"] }],
            },
            {
              model: Driver,
              attributes: ["nic_no"],
              include: [{ model: User, attributes: ["name", "mobile"] }],
            },
          ],
        },
        {
          model: Approval,
          include: [{ model: User, as: "approver", attributes: ["name"] }],
        },
        {
          model: Trip,
          attributes: ["id", "date", "start_time", "status", "route_summary"],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    res.json(requests);
  } catch (error) {
    console.error("Get requests error:", error);
    // Debug
    const logPath = path.join(__dirname, "../../error_logs.txt");
    fs.appendFileSync(
      logPath,
      `\n[${new Date().toISOString()}] Get Requests Error: ${error}\nStack: ${(error as any).stack}\n`,
    );

    res.status(500).json({ message: "Failed to fetch requests" });
  }
};

export const deleteRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  try {
    const request = await VehicleRequest.findByPk(id);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Check ownership
    if (request.requested_by !== userId) {
      return res
        .status(403)
        .json({ message: "Unauthorized to delete this request" });
    }

    // Check status
    if (request.status !== RequestStatus.PENDING_COORDINATOR) {
      return res
        .status(400)
        .json({
          message: "Cannot delete request. It has already been processed.",
        });
    }

    await request.destroy();

    res.json({ message: "Request deleted successfully" });
  } catch (error) {
    console.error("Delete request error:", error);
    res.status(500).json({ message: "Failed to delete request" });
  }
};

export const updateRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;
  const userRole = req.user!.role;
  const {
    requestType,
    jobNo,
    projectName,
    passengerDetails,
    materialDetails,
    status,
  } = req.body;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const request = await VehicleRequest.findByPk(id);
    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: "Request not found" });
    }

    // Access Control:
    if (userRole === "ADMIN") {
      // Admin can edit anything at any time.
    } else {
      // Check ownership or Role
      const isOwner = request.requested_by === userId;
      const isCoordinator = userRole === "COORDINATOR";

      if (!isOwner && !isCoordinator) {
        await transaction.rollback();
        return res
          .status(403)
          .json({ message: "Unauthorized to update this request" });
      }

      // Check status - Allow editing if Pending Coordinator or Returned
      const editableStatuses = [
        RequestStatus.PENDING_COORDINATOR,
        RequestStatus.RETURNED,
      ];
      const isTimeChangeOnly =
        !jobNo &&
        !projectName &&
        !status &&
        ((request.request_type === "PASSENGER" &&
          passengerDetails &&
          Object.keys(passengerDetails).length === 1 &&
          passengerDetails.time) ||
          (request.request_type === "MATERIAL" &&
            materialDetails &&
            Object.keys(materialDetails).length === 1 &&
            materialDetails.time));

      if (!editableStatuses.includes(request.status)) {
        // Special Rule: Time Change
        const allowedTimeChangeStatuses = [
          RequestStatus.APPROVED,
          RequestStatus.ALLOCATED,
        ];
        if (
          allowedTimeChangeStatuses.includes(request.status) &&
          isTimeChangeOnly
        ) {
          // Allowed
          console.log(
            "Time-only update for approved request detected. Proceeding.",
          );
        } else {
          await transaction.rollback();
          return res
            .status(400)
            .json({
              message: "Cannot update request. It has already been processed.",
            });
        }
      }
    }

    // Update core fields
    if (jobNo) request.job_number = jobNo;
    if (projectName) request.project_name = projectName;

    // Admin override status
    if (userRole === "ADMIN" && status) {
      request.status = status;
    }

    await request.save({ transaction });

    if (request.request_type === "PASSENGER" && passengerDetails) {
      await PassengerRequestDetails.update(passengerDetails, {
        where: { request_id: id },
        transaction,
      });
    } else if (request.request_type === "MATERIAL" && materialDetails) {
      await MaterialRequestDetails.update(materialDetails, {
        where: { request_id: id },
        transaction,
      });
    }

    await transaction.commit();
    res.json({ message: "Request updated successfully" });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Update request error:", error);
    res.status(500).json({ message: "Failed to update request" });
  }
};

export const cancelRequest = async (req: AuthRequest, res: Response) => {
  const { id } = req.params;
  const userId = req.user!.userId;

  let transaction;
  try {
    transaction = await sequelize.transaction();

    const request = await VehicleRequest.findByPk(id, {
      include: [{ model: Allocation, include: [Driver] }],
    });

    if (!request) {
      await transaction.rollback();
      return res.status(404).json({ message: "Request not found" });
    }

    // Check ownership (or Admin)
    if (req.user!.role !== "ADMIN" && request.requested_by !== userId) {
      await transaction.rollback();
      return res
        .status(403)
        .json({ message: "Unauthorized to cancel this request" });
    }

    request.status = RequestStatus.CANCELLED;
    await request.save({ transaction });

    await transaction.commit();

    // Notify Coordinator/HOD logic...
    // await NotificationService.notifyRequestCancellation(request);

    res.json({ message: "Request cancelled successfully" });
  } catch (error) {
    if (transaction) await transaction.rollback();
    console.error("Cancel request error:", error);
    res.status(500).json({ message: "Failed to cancel request" });
  }
};

export const suggestMatches = async (req: AuthRequest, res: Response) => {
  try {
    const { pickup_coordinates, drop_coordinates } = req.body;

    if (!pickup_coordinates || !drop_coordinates) {
      return res
        .status(400)
        .json({ message: "Pickup and Drop coordinates are required." });
    }

    const matches = await RouteService.findOverlappingRequests(
      pickup_coordinates,
      drop_coordinates,
    );

    res.json({ matches });
  } catch (error) {
    console.error("Suggest matches error:", error);
    res.status(500).json({ message: "Failed to find matches" });
  }
};

export const getSharedVehicleSuggestions = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const {
      date,
      time,
      pickup_lat,
      pickup_lng,
      drop_lat,
      drop_lng,
      passengers,
    } = req.query;

    if (
      !date ||
      !time ||
      !pickup_lat ||
      !pickup_lng ||
      !drop_lat ||
      !drop_lng
    ) {
      return res
        .status(400)
        .json({
          message:
            "Missing required query parameters: date, time, pickup_lat, pickup_lng, drop_lat, drop_lng",
        });
    }

    const newStart = {
      lat: parseFloat(pickup_lat as string),
      lng: parseFloat(pickup_lng as string),
    };
    const newEnd = {
      lat: parseFloat(drop_lat as string),
      lng: parseFloat(drop_lng as string),
    };
    const requiredSeats = passengers ? parseInt(passengers as string) : 1;

    const suggestions = await RouteService.findSharedVehicles(
      date as string,
      time as string,
      newStart,
      newEnd,
      requiredSeats,
    );

    res.json(suggestions);
  } catch (error) {
    console.error("Get shared vehicle suggestions error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch shared vehicle suggestions" });
  }
};

export const getRouteOptimizationSuggestions = async (
  req: AuthRequest,
  res: Response,
) => {
  try {
    const { date, startDate, endDate, viewAll, divisionScope } = req.query;
    console.log("[getRouteOptimizationSuggestions] Params:", {
      date,
      startDate,
      endDate,
      viewAll,
      divisionScope,
    });

    const role = req.user!.role;
    const divisionId = req.user!.divisionId;

    const parseDateOnly = (value?: string) => {
      if (!value) return null;
      const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
      if (!match) return null;
      const parsed = new Date(`${value}T00:00:00`);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    };

    // Determine Date Range
    const parsedStart = parseDateOnly(startDate as string | undefined);
    const parsedEnd = parseDateOnly(endDate as string | undefined);
    const parsedDate = parseDateOnly(date as string | undefined);

    if ((startDate && !parsedStart) || (endDate && !parsedEnd) || (date && !parsedDate)) {
      return res.status(400).json({
        message: "Invalid date format. Use YYYY-MM-DD for date fields.",
      });
    }

    let start = parsedStart || new Date();
    let end = parsedEnd || new Date();

    if (viewAll === "true") {
      // "Show All" Mode: Scan next 90 days
      start = new Date();
      end = new Date();
      end.setDate(end.getDate() + 90);
    } else if (!endDate && !startDate && !date) {
      // Default: Next 7 days
      end.setDate(end.getDate() + 7);
    }

    // Format to YYYY-MM-DD
    const startStr = start.toISOString().split("T")[0];
    const endStr = end.toISOString().split("T")[0];

    console.log(
      "[getRouteOptimizationSuggestions] Range:",
      startStr,
      "to",
      endStr,
    );

    // Specific Date override
    let finalStart = startStr;
    let finalEnd = endStr;
    if (parsedDate) {
      finalStart = (date as string);
      finalEnd = (date as string);
    }

    if (role === "COORDINATOR") {
      // Updated Cached Logic for Performance
      const cachedResult = await RouteService.getCachedSuggestions(
        finalStart,
        finalEnd,
        divisionId,
      );

      if (!cachedResult) {
        throw new Error(
          "RouteService.getCachedSuggestions returned null/undefined",
        );
      }

      // Separate manually merged groups (Hard Clusters) from strictly unclustered
      const existingGroups: any[] = [];
      const trulyUnclustered: any[] = [];
      const groupMap = new Map<string, any[]>();

      cachedResult.unclustered.forEach((r: any) => {
        if (r.merge_group_id) {
          if (!groupMap.has(r.merge_group_id))
            groupMap.set(r.merge_group_id, []);
          groupMap.get(r.merge_group_id)!.push(r);
        } else {
          trulyUnclustered.push(r);
        }
      });

      groupMap.forEach((reqs, gId) => {
        const totalPassengers = reqs.reduce(
          (sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0),
          0,
        );
        existingGroups.push({
          groupId: gId,
          requests: reqs,
          totalPassengers,
          savings: "Confirmed",
          matchReason: "Coordinator Proposed Group",
          isExisting: true,
        });
      });

      res.json({
        suggestions: [...existingGroups, ...cachedResult.suggestions],
        unclustered: trulyUnclustered,
        totalRequests:
          cachedResult.suggestions.length +
          trulyUnclustered.length +
          existingGroups.length, // approx
      });
      return;
    } else if (role === "TRANSPORT" || role === "ADMIN") {
      // Transport Logic (Allocation-Focused, on existing APPROVED requests) - Keep Realtime or optimize later

      // Reuse existing Date Filter Logic for DB Query
      let dateFilter: any = {};
      if (date) dateFilter = date;
      else {
        const dArray = [];
        let curr = new Date(start);
        // Safety Cap for loop
        const maxLoop = new Date(start);
        maxLoop.setDate(maxLoop.getDate() + 100);

        while (curr <= end && curr <= maxLoop) {
          dArray.push(curr.toISOString().split("T")[0]);
          curr.setDate(curr.getDate() + 1);
        }
        dateFilter = { [Op.in]: dArray };
      }

      const isAllDivisionScope = divisionScope === "all";
      const whereClause: any = {
        status: { [Op.in]: [RequestStatus.APPROVED] },
      };

      // Transport/Admin are expected to optimize globally by default.
      // Keep an opt-in escape hatch for own-division scans via divisionScope=own.
      if (!isAllDivisionScope && divisionId && divisionScope === "own") {
        whereClause.division_id = divisionId;
      }

      const requests = await VehicleRequest.findAll({
        where: whereClause,
        include: [
          { model: PassengerRequestDetails, required: false },
          { model: MaterialRequestDetails, required: false },
          { model: User, as: "requester", attributes: ["name", "email"] },
          { model: Division, attributes: ["name"] },
        ],
      });

      const validRequests = requests.filter((r) => {
        const pDate = r.passengerDetails?.date;
        const mDate = r.materialDetails?.date;
        const targetDates = Array.isArray(dateFilter?.[Op.in])
          ? dateFilter[Op.in]
          : [dateFilter];
        return targetDates.includes(pDate) || targetDates.includes(mDate);
      });

      // Transport: Separate already grouped
      const grouped = validRequests.filter((r) => r.merge_group_id);
      const ungrouped = validRequests.filter((r) => !r.merge_group_id);

      const existingGroups: any[] = [];
      const groupMap = new Map<string, any[]>();
      grouped.forEach((r) => {
        if (!groupMap.has(r.merge_group_id)) groupMap.set(r.merge_group_id, []);
        groupMap.get(r.merge_group_id)!.push(r);
      });

      groupMap.forEach((reqs, gId) => {
        const totalPassengers = reqs.reduce(
          (sum, r) => sum + (r.passengerDetails?.no_of_passengers || 0),
          0,
        );
        const suggestedVid = reqs[0].proposed_vehicle_id;
        existingGroups.push({
          groupId: gId,
          requests: reqs,
          totalPassengers,
          savings: "Confirmed",
          matchReason: "Coordinator Proposed Group",
          proposedVehicleId: suggestedVid,
          isExisting: true,
        });
      });

      const scanResult = await RouteService.findPendingOverlaps(ungrouped);

      res.json({
        suggestions: [...existingGroups, ...scanResult.clusters],
        unclustered: scanResult.unclustered,
        totalRequests: validRequests.length,
      });
    } else {
      res.status(403).json({ message: "Unauthorized" });
    }
  } catch (error: any) {
    console.error("Optimization error:", error);
    try {
      const logPath = path.join(__dirname, "../../error_log.txt");
      const logData = `[${new Date().toISOString()}] Optimization Error: ${error.message}\nStack: ${error.stack}\n\n`;
      fs.appendFileSync(logPath, logData);
    } catch (e) {
      console.error("Log write failed", e);
    }

    res
      .status(500)
      .json({ message: "Failed to get suggestions", details: error.message });
  }
};

export const mergeRequests = async (req: AuthRequest, res: Response) => {
  // Action depends on ROLE:
  // COORDINATOR: Proposes Merge (Category Only) -> Status: PENDING_HOD
  // TRANSPORT/ADMIN: Finalizes Merge (Specific Vehicle & Driver) -> Status: ALLOCATED -> Creates Allocation

  const { requestIds, vehicleId, driverId, vehicleTypeId, proposedAttributes } =
    req.body;
  const role = req.user!.role;

  let transaction;
  try {
    transaction = await sequelize.transaction();
    const availabilityConfig = await loadAvailabilityConfig(transaction);

    const requests = await VehicleRequest.findAll({
      where: { id: { [Op.in]: requestIds } },
    });

    if (requests.length !== requestIds.length) {
      await transaction.rollback();
      return res.status(404).json({ message: "Some requests not found" });
    }

    // Pre-flight: for Transport/Admin final allocation, ALL requests must be fully APPROVED
    // if (role === "TRANSPORT" || role === "ADMIN") {
    if (role === "TRANSPORT") {
      const notApproved = requests.filter(
        (r) => r.status !== RequestStatus.APPROVED,
      );
      if (notApproved.length > 0) {
        await transaction.rollback();
        return res.status(409).json({
          message: `Cannot allocate: ${notApproved.length} request(s) in this group are not yet approved. All requests must be fully approved before vehicle allocation.`,
          pendingRequestIds: notApproved.map((r) => r.id),
        });
      }
    }

    const groupId = `merge-${Date.now()}-${req.user!.userId}`;

    // Helper: Calculate Total Passengers, Time Window & Route Summary
    let totalPax = 0;
    let earliestDate = "";
    let earliestTime = "23:59:59";
    const routeLegs: Array<{ time: string; pickup: string; drop: string }> = [];

    for (const req of requests) {
      const pDetails = await PassengerRequestDetails.findOne({
        where: { request_id: req.id },
      });
      if (pDetails) {
        totalPax += pDetails.no_of_passengers;
        // Capture earliest time for Trip
        if (!earliestDate) earliestDate = pDetails.date; // Assume same date for merge
        if (pDetails.time < earliestTime) earliestTime = pDetails.time;
        routeLegs.push({
          time: pDetails.time,
          pickup: pDetails.pickup_location,
          drop: pDetails.drop_location,
        });
      } else {
        // Fallback for Material or missing details
        const mDetails = await MaterialRequestDetails.findOne({
          where: { request_id: req.id },
        });
        if (mDetails) {
          if (!earliestDate) earliestDate = mDetails.date;
          if (mDetails.time < earliestTime) earliestTime = mDetails.time;
        }
      }
    }

    // If no time specific found, default to now or dummy
    if (earliestTime === "23:59:59") earliestTime = "08:00:00";

    // Build route summary from all sub-request legs sorted by departure time
    routeLegs.sort((a, b) => a.time.localeCompare(b.time));
    let routeSummary =
      routeLegs.length > 0
        ? routeLegs.map((l) => `${l.time} ${l.pickup} → ${l.drop}`).join(" | ")
        : "Merged route";

    // Keep within VARCHAR limits used by trips.route_summary.
    if (routeSummary.length > 240) {
      routeSummary = `${routeSummary.slice(0, 237)}...`;
    }

    const isFinalAllocation = role === "TRANSPORT" || role === "ADMIN";

    // Capacity and Validation Checks
    if (isFinalAllocation) {
      if (!vehicleId || !driverId) {
        await transaction.rollback();
        return res
          .status(400)
          .json({
            message: "Vehicle and Driver are required for final allocation.",
          });
      }

      const vehicle = await Vehicle.findByPk(vehicleId);
      if (vehicle) {
        let capacity = vehicle.seating_capacity || 4;
        if (vehicle.attributes?.passenger_capacity)
          capacity = vehicle.attributes.passenger_capacity;

        if (totalPax > capacity) {
          console.warn(
            `[updateAllocationResource] Merged group passenger count (${totalPax}) exceeds vehicle capacity (${capacity})`,
          );
        }
      }

      const scheduleRequests = await VehicleRequest.findAll({
        where: {
          id: { [Op.in]: requestIds },
          request_type: RequestType.PASSENGER,
        },
        include: [PassengerRequestDetails],
        transaction,
      });

      const driverSchedule = buildTripScheduleFromRequests(
        scheduleRequests,
        availabilityConfig,
        { includeDriverRest: true },
      );
      const vehicleSchedule = buildTripScheduleFromRequests(
        scheduleRequests,
        availabilityConfig,
        { includeDriverRest: false },
      );

      const driverConflicts = driverSchedule
        ? await findDriverConflicts(driverId, driverSchedule, {
          excludeRequestIds: requestIds,
          transaction,
          config: availabilityConfig,
        })
        : [];

      const vehicleConflicts = vehicleSchedule
        ? await findVehicleConflicts(vehicleId, vehicleSchedule, {
          excludeRequestIds: requestIds,
          transaction,
          config: availabilityConfig,
        })
        : [];

      if (driverConflicts.length > 0 || vehicleConflicts.length > 0) {
        await transaction.rollback();
        const conflictReasons = [] as string[];
        if (driverConflicts.length > 0) conflictReasons.push("DRIVER_UNAVAILABLE");
        if (vehicleConflicts.length > 0) conflictReasons.push("VEHICLE_UNAVAILABLE");
        return res.status(409).json({
          message:
            "Driver and/or vehicle is not available for the requested trip time window.",
          conflictReasons,
          driverNextAvailableAt: getNextAvailableAt(driverConflicts)?.toISOString() ?? null,
          vehicleNextAvailableAt: getNextAvailableAt(vehicleConflicts)?.toISOString() ?? null,
          driverConflicts: driverConflicts.map((conflict) => ({
            requestId: conflict.requestId,
            tripId: conflict.tripId,
            startAt: conflict.startAt.toISOString(),
            endAt: conflict.endAt.toISOString(),
          })),
          vehicleConflicts: vehicleConflicts.map((conflict) => ({
            requestId: conflict.requestId,
            tripId: conflict.tripId,
            startAt: conflict.startAt.toISOString(),
            endAt: conflict.endAt.toISOString(),
          })),
        });
      }
    } else {
      // Coordinator - Validate Type
      if (!vehicleTypeId) {
        await transaction.rollback();
        return res
          .status(400)
          .json({ message: "Vehicle Category is required for proposal." });
      }
    }

    // Apply Updates
    const createdAllocations = [];
    let newTripId: number | null = null;

    if (isFinalAllocation) {
      // Create the Master Trip Record (The Entity Gap Fix)
      // We need to import Trip model first (Assumed imported or dynamic)
      const { Trip } = require("../models/Trip");
      const newTrip = await Trip.create(
        {
          vehicle_id: vehicleId,
          driver_id: driverId,
          date: earliestDate || new Date().toISOString().split("T")[0],
          start_time: earliestTime,
          status: "PLANNED",
          total_distance_km: 0,
          route_summary: routeSummary,
        },
        { transaction },
      );
      newTripId = newTrip.id;
    }

    for (const requestItem of requests) {
      // Update Merge Info
      requestItem.merge_group_id = groupId;

      if (isFinalAllocation) {
        requestItem.proposed_vehicle_id = parseInt(vehicleId);
        requestItem.status = RequestStatus.ALLOCATED;

        // Link to the Master Trip
        if (newTripId) requestItem.trip_id = newTripId;

        // Create Allocation Record (Legacy/Reporting compliance)
        const existingAlloc = await Allocation.findOne({
          where: { request_id: requestItem.id },
          transaction,
        });

        if (existingAlloc) {
          existingAlloc.vehicle_id = vehicleId;
          existingAlloc.driver_id = driverId;
          await existingAlloc.save({ transaction });
          createdAllocations.push(existingAlloc);
        } else {
          const alloc = await Allocation.create(
            {
              request_id: requestItem.id,
              vehicle_id: vehicleId,
              driver_id: driverId,
            },
            { transaction },
          );
          createdAllocations.push(alloc);
        }
      } else {
        // Proposal Mode (Coordinator)
        requestItem.proposed_vehicle_type_id = parseInt(vehicleTypeId);
        requestItem.proposed_attributes = proposedAttributes; // Save Spec Selection
        requestItem.status = RequestStatus.PENDING_HOD;

        // Create Approval entry for Coordinator Action
        await Approval.create(
          {
            request_id: requestItem.id,
            approved_by: req.user!.userId,
            role: "COORDINATOR",
            status: "APPROVED",
            comment: "Merged Proposal (Category Based) submitted to HOD",
          },
          { transaction },
        );
      }

      await requestItem.save({ transaction });
    }

    // Write merge audit log to RideShareSuggestion
    await RideShareSuggestion.create(
      {
        group_id: groupId,
        request_ids: requestIds,
        total_passengers: totalPax,
        match_reason: isFinalAllocation
          ? "Transport officer final allocation"
          : "Coordinator merge proposal",
        status: isFinalAllocation ? "ALLOCATED" : "PROPOSED",
        date: earliestDate || new Date().toISOString().split("T")[0],
      },
      { transaction },
    );

    await transaction.commit();

    if (isFinalAllocation) {
      // Fire immediate SMS + in-app to driver and requesters for each allocated request
      try {
        const vehicle = await Vehicle.findByPk(vehicleId);
        const driver = await Driver.findByPk(driverId);
        if (vehicle && driver) {
          for (const requestItem of requests) {
            NotificationService.notifyVehicleAllocation(
              requestItem,
              vehicle,
              driver,
            ).catch((err) =>
              console.error(
                "[Notification] merge allocation notify error:",
                err,
              ),
            );
          }
        }
      } catch (nErr) {
        console.error("[Notification] merge allocation notify error:", nErr);
      }

      res.json({
        message: "Requests merged and ALLOCATED successfully",
        allocationIds: createdAllocations.map((a) => a.id),
        tripId: newTripId,
        groupId,
      });
    } else {
      res.json({
        message: "Requests merged and sent to HOD for approval",
        groupId,
      });
    }
  } catch (error: any) {
    if (transaction) await transaction.rollback();
    console.error("Merge error:", error);
    if (error instanceof UniqueConstraintError) {
      return res.status(409).json({
        message:
          "One or more requests were already allocated. Refresh and try again.",
      });
    }
    res
      .status(500)
      .json({ message: "Failed to merge requests", error: error.message });
  }
};

// ------------------------------------------
// Feature: Merge Group Management
// ------------------------------------------

/**
 * GET /requests/merge-groups
 * Returns all active merge groups visible to the caller.
 * HOD → PENDING_HOD groups | CEO → PENDING_CEO | others → all statuses with merge_group_id
 */
export const getMergeGroups = async (req: AuthRequest, res: Response) => {
  try {
    const role = req.user!.role;

    let statuses: string[];
    if (role === "HOD") {
      statuses = [RequestStatus.PENDING_HOD];
    } else if (role === "CEO") {
      statuses = [RequestStatus.PENDING_CEO];
    } else {
      statuses = Object.values(RequestStatus);
    }

    const requests = await VehicleRequest.findAll({
      where: {
        merge_group_id: { [Op.ne]: null },
        status: { [Op.in]: statuses },
      },
      include: [
        { model: PassengerRequestDetails },
        { model: MaterialRequestDetails },
        { model: User, as: "requester", attributes: ["name", "email"] },
        { model: Division, attributes: ["name"] },
        {
          model: Approval,
          include: [{ model: User, as: "approver", attributes: ["name"] }],
        },
      ],
      order: [["createdAt", "DESC"]],
    });

    // Group by merge_group_id
    const groupMap = new Map<string, any>();
    for (const r of requests) {
      const gid = r.merge_group_id!;
      if (!groupMap.has(gid)) {
        groupMap.set(gid, {
          group_id: gid,
          requests: [],
          total_passengers: 0,
          earliest_date: null as string | null,
          earliest_time: null as string | null,
          status: r.status,
          proposed_vehicle_type_id: r.proposed_vehicle_type_id,
          trip_id: r.trip_id,
        });
      }
      const group = groupMap.get(gid)!;
      group.requests.push(r);
      if (r.passengerDetails) {
        group.total_passengers += r.passengerDetails.no_of_passengers;
        const pd = r.passengerDetails;
        if (!group.earliest_date || pd.date < group.earliest_date) {
          group.earliest_date = pd.date;
          group.earliest_time = pd.time;
        }
      }
    }

    const groups = Array.from(groupMap.values()).map((g) => ({
      ...g,
      request_count: g.requests.length,
      approved_count: g.requests.filter(
        (r: any) =>
          r.status === RequestStatus.APPROVED ||
          r.status === RequestStatus.ALLOCATED,
      ).length,
      pending_count: g.requests.filter(
        (r: any) =>
          r.status === RequestStatus.PENDING_HOD ||
          r.status === RequestStatus.PENDING_CEO,
      ).length,
    }));

    res.json(groups);
  } catch (error: any) {
    console.error("Get merge groups error:", error);
    res
      .status(500)
      .json({ message: "Failed to fetch merge groups", error: error.message });
  }
};

/**
 * PUT /requests/merge-groups/:groupId/approve
 * HOD or CEO bulk-approves or bulk-rejects every request in a merge group.
 */
export const approveMergeGroup = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const { status, comment } = req.body; // status: 'APPROVED' or 'REJECTED'
  const userRole = req.user!.role as "HOD" | "CEO";

  if (!["APPROVED", "REJECTED"].includes(status)) {
    return res
      .status(400)
      .json({ message: "Invalid status. Must be APPROVED or REJECTED." });
  }

  const transaction = await sequelize.transaction();
  try {
    const requests = await VehicleRequest.findAll({
      where: { merge_group_id: groupId },
      transaction,
    });

    if (requests.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "Merge group not found" });
    }

    const expectedStatus =
      userRole === "CEO"
        ? RequestStatus.PENDING_CEO
        : RequestStatus.PENDING_HOD;
    const notReady = requests.filter((r) => r.status !== expectedStatus);
    if (notReady.length > 0) {
      await transaction.rollback();
      return res.status(409).json({
        message: `${notReady.length} request(s) in this group are not in the expected approval state (${expectedStatus}).`,
        notReadyIds: notReady.map((r) => r.id),
      });
    }

    for (const request of requests) {
      request.status =
        status === "APPROVED" ? RequestStatus.APPROVED : RequestStatus.REJECTED;
      await request.save({ transaction });

      await Approval.create(
        {
          request_id: request.id,
          approved_by: req.user!.userId,
          role: userRole,
          status,
          comment: comment || `Bulk ${status.toLowerCase()} via merge group`,
        },
        { transaction },
      );
    }

    // Update audit log
    await RideShareSuggestion.update(
      { status: status === "APPROVED" ? "FULLY_APPROVED" : "REJECTED" },
      { where: { group_id: groupId }, transaction },
    );

    await transaction.commit();

    // Notify all requesters (non-blocking)
    for (const request of requests) {
      try {
        await NotificationService.notifyRequestApproval(request, status);
      } catch (_) {
        /* notification failure is non-fatal */
      }
    }

    res.json({
      message: `${requests.length} request(s) in group ${groupId} ${status.toLowerCase()} successfully`,
      groupId,
      requestIds: requests.map((r) => r.id),
    });
  } catch (error: any) {
    if (transaction) await transaction.rollback();
    console.error("Approve merge group error:", error);
    res
      .status(500)
      .json({ message: "Failed to approve merge group", error: error.message });
  }
};

/**
 * DELETE /requests/merge-groups/:groupId
 * Dissolves a merge group: clears merge_group_id on all requests, destroys any linked Trip
 * and Allocation records, and reverts each request to APPROVED status.
 * Accessible to COORDINATOR, TRANSPORT, ADMIN.
 */
export const unmergeGroup = async (req: AuthRequest, res: Response) => {
  const { groupId } = req.params;
  const transaction = await sequelize.transaction();

  try {
    const requests = await VehicleRequest.findAll({
      where: { merge_group_id: groupId },
      transaction,
    });

    if (requests.length === 0) {
      await transaction.rollback();
      return res.status(404).json({ message: "Merge group not found" });
    }

    // Destroy shared Trip records (if the group was already allocated)
    const tripIds = [
      ...new Set(requests.map((r) => r.trip_id).filter(Boolean)),
    ] as number[];
    if (tripIds.length > 0) {
      const { Trip } = require("../models/Trip");
      // Destroy allocations for all requests in this group
      await Allocation.destroy({
        where: { request_id: requests.map((r) => r.id) },
        transaction,
      });
      await Trip.destroy({ where: { id: tripIds }, transaction });
    }

    // Clear merge state and revert each request to APPROVED
    for (const request of requests) {
      request.merge_group_id = null as any;
      request.trip_id = null as any;
      request.proposed_vehicle_type_id = null as any;
      request.proposed_vehicle_id = null as any;
      request.proposed_attributes = null;
      request.status = RequestStatus.APPROVED;
      await request.save({ transaction });
    }

    // Mark audit log as dissolved
    await RideShareSuggestion.update(
      { status: "DISSOLVED" },
      { where: { group_id: groupId }, transaction },
    );

    await transaction.commit();

    res.json({
      message: `Merge group ${groupId} dissolved. ${requests.length} request(s) reverted to APPROVED.`,
      groupId,
      requestIds: requests.map((r) => r.id),
    });
  } catch (error: any) {
    if (transaction) await transaction.rollback();
    console.error("Unmerge group error:", error);
    res
      .status(500)
      .json({ message: "Failed to unmerge group", error: error.message });
  }
};

// ------------------------------------------
// Feature: "Past is Dead" (Auto-Expiry)
// ------------------------------------------
export const processAutoExpiry = async (req: AuthRequest, res: Response) => {
  // This is intended to be called by a CRON job or manually by Admin to "Clean Up"
  // Logic: If Request Date < Today AND Status is NOT Allocated/Completed -> EXPIRED
  try {
    const today = new Date().toISOString().split("T")[0];

    // Find Candidates (Pending/Approved requests in the past)
    const candidates = await VehicleRequest.findAll({
      where: {
        status: {
          [Op.notIn]: [
            RequestStatus.ALLOCATED,
            RequestStatus.COMPLETED,
            RequestStatus.CANCELLED,
            RequestStatus.REJECTED,
            RequestStatus.RETURNED,
            RequestStatus.EXPIRED,
            RequestStatus.DECLINED,
          ],
        },
      },
      include: [
        { model: PassengerRequestDetails, required: false },
        { model: MaterialRequestDetails, required: false },
      ],
    });

    let expireCount = 0;
    const transaction = await sequelize.transaction();

    try {
      for (const r of candidates) {
        const pDate = r.passengerDetails?.date;
        const mDate = r.materialDetails?.date;
        const reqDate = pDate || mDate;

        if (reqDate && reqDate < today) {
          r.status = RequestStatus.EXPIRED;
          await r.save({ transaction });
          expireCount++;
        }
      }
      await transaction.commit();
      res.json({
        message: "Auto-expiry process completed",
        expiredCount: expireCount,
      });
    } catch (txError) {
      await transaction.rollback();
      throw txError;
    }
  } catch (error) {
    console.error("Auto-expiry error:", error);
    res.status(500).json({ message: "Failed to process auto-expiry" });
  }
};

// ------------------------------------------
// Feature: "Inbox Zero" (Manual Decline)
// ------------------------------------------
export const declineRequest = async (req: AuthRequest, res: Response) => {
  // TRANSPORT OFFICER ACTION
  // "I cannot fulfill this request (No vehicles, etc)"

  const { requestId } = req.params;
  const { reason } = req.body; // e.g., "Full capacity"

  try {
    const request = await VehicleRequest.findByPk(requestId);
    if (!request) return res.status(404).json({ message: "Request not found" });

    // Allowed states to decline from: APPROVED (Waiting for allocation)
    if (request.status !== RequestStatus.APPROVED) {
      return res
        .status(400)
        .json({
          message: "Can only decline APPROVED requests waiting for allocation.",
        });
    }

    request.status = RequestStatus.DECLINED;
    await request.save();

    // Create Approval/Audit Log entry for the Decline
    await Approval.create({
      request_id: request.id,
      approved_by: req.user!.userId,
      role: "TRANSPORT",
      status: "DECLINED", // Reuse enum or string
      comment: reason || "Privately declined by Transport Officer",
    });

    // Notify User (Essential for Inbox Zero contract)
    const NotificationService =
      require("../services/notificationService").NotificationService;
    await NotificationService.notifyRequestDeclined(request, reason);

    res.json({ message: "Request declined successfully" });
  } catch (error) {
    console.error("Decline request error:", error);
    res.status(500).json({ message: "Failed to decline request" });
  }
};

export const calculateRoute = async (req: AuthRequest, res: Response) => {
  try {
    const { pickup, drop, stops } = req.body;

    if (!pickup || !drop) {
      return res
        .status(400)
        .json({ message: "Pickup and Drop coordinates are required" });
    }

    const routeData = await RouteService.calculateRoute(
      pickup,
      drop,
      stops || [],
    );

    if (!routeData) {
      return res
        .status(500)
        .json({ message: "Failed to calculate route data" });
    }

    res.json(routeData);
  } catch (error) {
    console.error("Calculate route error:", error);
    res
      .status(500)
      .json({ message: "Internal server error while calculating route" });
  }
};

export const lookupProject = async (req: AuthRequest, res: Response) => {
  const { wbs } = req.query;
  if (!wbs || typeof wbs !== "string") {
    return res.status(400).json({ message: "WBS element is required" });
  }
  try {
    const results: any[] = await hrisSequelize.query(
      "SELECT available_budget, status, name FROM Hdoc_FENTONS.projects WHERE wbs_element = ? LIMIT 1",
      { replacements: [wbs.trim()], type: QueryTypes.SELECT },
    );
    if (!results || results.length === 0) {
      return res
        .status(404)
        .json({ message: "No project found for the given WBS element" });
    }
    const row = results[0];
    // available_budget may be stored as a comma-formatted string e.g. "17,141.98"
    // Normalise to a plain numeric string so the client can parseFloat() it correctly.
    const rawBudget = String(row.available_budget ?? "").replace(/,/g, "");
    res.json({ ...row, available_budget: rawBudget });
  } catch (error) {
    console.error("Project lookup error:", error);
    res.status(500).json({ message: "Failed to lookup project" });
  }
};

/**
 * Search projects by WBS or project name with autocomplete suggestions.
 * Query string: q (search term) - searches both wbs_element and name
 * Returns up to 10 results sorted by name
 */
export const searchProjects = async (req: AuthRequest, res: Response) => {
  const { q } = req.query;
  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return res.status(400).json({ message: "Search query (q) is required" });
  }
  
  try {
    const searchTerm = `%${q.trim()}%`;
    const results: any[] = await hrisSequelize.query(
      `SELECT wbs_element, name, available_budget, status 
       FROM Hdoc_FENTONS.projects 
       WHERE wbs_element LIKE ? OR name LIKE ? 
       ORDER BY name ASC 
       LIMIT 15`,
      { 
        replacements: [searchTerm, searchTerm], 
        type: QueryTypes.SELECT,
        raw: true 
      },
    );
    
    if (!results || results.length === 0) {
      return res.json([]);
    }
    
    // Normalize budget formatting (remove commas)
    const normalized = results.map((row: any) => ({
      wbs_element: row.wbs_element,
      name: row.name,
      available_budget: String(row.available_budget ?? "").replace(/,/g, ""),
      status: row.status
    }));
    
    res.json(normalized);
  } catch (error) {
    console.error("Project search error:", error);
    res.status(500).json({ message: "Failed to search projects" });
  }
};

/**
 * Retry helper with exponential backoff for transient database connection errors.
 * Retries on ECONNRESET, ETIMEDOUT, PROTOCOL_CONNECTION_LOST, etc.
 */
async function executeWithRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelayMs: number = 100
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      lastError = error;
      
      // Only retry on transient connection errors
      const isTransient =
        error?.code === 'ECONNRESET' ||
        error?.code === 'ETIMEDOUT' ||
        error?.code === 'PROTOCOL_CONNECTION_LOST' ||
        error?.code === 'PROTOCOL_ENQUEUE_AFTER_FATAL_ERROR' ||
        (error?.message?.includes?.('ECONNRESET')) ||
        (error?.message?.includes?.('ETIMEDOUT'));
      
      if (!isTransient) {
        throw error; // Don't retry on permanent errors
      }
      
      if (attempt < maxRetries - 1) {
        const delay = baseDelayMs * Math.pow(2, attempt); // Exponential backoff: 100ms, 200ms, 400ms
        console.warn(
          `[Cost Centre Query] Transient error on attempt ${attempt + 1}/${maxRetries}. ` +
          `Retrying in ${delay}ms...`,
          error.code || error.message
        );
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  throw lastError; // All retries failed
}

export const lookupCostCentre = async (req: AuthRequest, res: Response) => {
  const { cost_id, name } = req.query;
  try {
    let query = "";
    let params: any[] = [];
    if (cost_id && typeof cost_id === "string") {
      query =
        "SELECT cost_id, name FROM Hdoc_FENTONS.cost_centers WHERE cost_id = ? LIMIT 1";
      params = [cost_id.trim()];
    } else if (name && typeof name === "string") {
      query =
        "SELECT cost_id, name FROM Hdoc_FENTONS.cost_centers WHERE name LIKE ? LIMIT 1";
      params = [`%${name.trim()}%`];
    } else {
      return res
        .status(400)
        .json({
          message: "Either cost_id or name query parameter is required",
        });
    }
    
    const results: any[] = await executeWithRetry(
      () => hrisSequelize.query(query, {
        replacements: params,
        type: QueryTypes.SELECT,
      })
    );
    
    if (!results || results.length === 0) {
      return res.status(404).json({ message: "Cost centre not found" });
    }
    res.json(results[0]);
  } catch (error) {
    console.error("Cost centre lookup error:", error);
    res.status(500).json({ message: "Failed to lookup cost centre" });
  }
};

export const searchCostCentres = async (req: AuthRequest, res: Response) => {
  const { q, field } = req.query;
  if (!q || typeof q !== "string" || q.trim().length === 0) {
    return res.json([]);
  }
  try {
    let query: string;
    let params: any[];
    if (field === "id") {
      query =
        "SELECT cost_id, name FROM Hdoc_FENTONS.cost_centers WHERE cost_id LIKE ? LIMIT 10";
      params = [`%${q.trim()}%`];
    } else {
      query =
        "SELECT cost_id, name FROM Hdoc_FENTONS.cost_centers WHERE name LIKE ? LIMIT 10";
      params = [`%${q.trim()}%`];
    }
    
    const results: any[] = await executeWithRetry(
      () => hrisSequelize.query(query, {
        replacements: params,
        type: QueryTypes.SELECT,
      })
    );
    
    res.json(results || []);
  } catch (error) {
    console.error("Cost centre search error:", error);
    res.status(500).json({ message: "Failed to search cost centres" });
  }
};
