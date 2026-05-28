import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import Layout from './components/Layout';
import LoginPage from './pages/LoginPage';
import StaffDashboard from './pages/StaffDashboard';
import CreateRequest from './pages/CreateRequest';
import MyRequests from './pages/MyRequests';
import EditRequest from './pages/EditRequest';
import CoordinatorDashboard from './pages/CoordinatorDashboard';
import HODApproval from './pages/HODApproval';
import CEODashboard from './pages/CEODashboard';
import TransportAllocation from './pages/TransportAllocation';
import RequestDetails from './pages/RequestDetails';
import AllocationPage from './pages/AllocationPage';
import NotificationsPage from './pages/NotificationsPage';
import ChangePassword from './pages/ChangePassword';
import ForgotPassword from './pages/ForgotPassword';
import AdminDashboard from './pages/AdminDashboard';
import AdminSystemSettings from './pages/AdminSystemSettings';
import CoordinatorRequestReview from './pages/CoordinatorRequestReview';
import { Role } from './types';
import DivisionManagement from './pages/DivisionManagement';
import TransportDashboard from './pages/TransportDashboard';
import TransportAdminPanel from './pages/TransportAdminPanel';
import DriverDashboard from './pages/DriverDashboard';
import DriverHistory from './pages/DriverHistory';
import VehicleList from './pages/admin/VehicleList';
import VehicleRegister from './pages/admin/VehicleRegister';
import VehicleEdit from './pages/admin/VehicleEdit';
import VehicleCategories from './pages/admin/VehicleCategories';
import CoordinatorRouteOptimization from './pages/CoordinatorRouteOptimization';
import CoordinatorAllRequests from './pages/CoordinatorAllRequests';
import TransportRouteOptimization from './pages/TransportRouteOptimization';
import FinalizeAllocationPage from './pages/FinalizeAllocationPage';
import UserManagement from './pages/UserManagement';
import DriverRegister from './pages/admin/DriverRegister';
import TripEntry from './pages/admin/TripEntry';
import TransportBillingHistory from './pages/admin/TransportBillingHistory';
import TransportBillingDetails from './pages/admin/TransportBillingDetails';
import TripList from './pages/TripList';
import PassengerRequestSelection from './pages/PassengerRequestSelection';
import ServiceCategorySelection from './pages/ServiceCategorySelection';
import VendorListPage from './pages/VendorListPage';
import SystemLanding from './pages/SystemLanding';
import { getNewRequestPath } from './utils/systemSelection';
import TransportPackageManagement from './pages/admin/TransportPackageManagement';
import VehiclePackageAssignment from './pages/admin/VehiclePackageAssignment';

// Protected Route Component
const ProtectedRoute = ({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: Role[] }) => {
  const token = localStorage.getItem('token');
  const userStr = localStorage.getItem('user');
  const user = userStr ? JSON.parse(userStr) : null;
  const location = useLocation();

  if (!token || !user) {
    return <Navigate to="/passenger-login" state={{ from: location }} replace />;
  }

  const userRole = (user.role || '').toUpperCase();

  if (allowedRoles) {
    // Ensure allowedRoles are compared against uppercase user role
    // We assume allowedRoles (enum) values are already compliant or we verify simply
    const hasPermission = allowedRoles.some(role => role === userRole);
    if (!hasPermission) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
};

const NewRequestRedirect = () => {
  const destination = getNewRequestPath();
  return <Navigate to={destination} replace />;
};

function App() {
  const [userRole, setUserRole] = useState<Role | undefined>(undefined);

  useEffect(() => {
    const checkAuth = () => {
      const userStr = localStorage.getItem('user');
      if (userStr) {
        const user = JSON.parse(userStr);
        setUserRole((user.role || '').toUpperCase() as Role);
      } else {
        setUserRole(undefined);
      }
    };

    checkAuth();

    window.addEventListener('auth-change', checkAuth);
    return () => window.removeEventListener('auth-change', checkAuth);
  }, []);

  return (
    <Router>
      <Routes>
        <Route path="/" element={<SystemLanding />} />
        <Route path="/passenger-login" element={<LoginPage />} />
        {/* <Route path="/login" element={<Navigate to="/passenger-login" replace />} /> */}
        <Route path="/forgot-password" element={<ForgotPassword />} />

        <Route element={<Layout userRole={userRole} />}>
          {/* Alias route for STAFF users - redirect /new-request based on system selection */}
          <Route path="/new-request" element={<NewRequestRedirect />} />

          <Route path="/passenger-selection" element={
            // Render without auth wrapper so the selection UI is visible during development/testing.
            <PassengerRequestSelection />
          } />

          <Route path="/service-selection" element={
            <ProtectedRoute allowedRoles={[Role.STAFF, Role.COORDINATOR, Role.HOD, Role.TRANSPORT, Role.ADMIN, Role.MCU_USER, Role.CALL_CENTER, Role.WAREHOUSE]}>
              <ServiceCategorySelection />
            </ProtectedRoute>
          } />

          {/* Common Dashboards (Role protected inside logic or component) */}
          <Route path="/dashboard" element={
            <ProtectedRoute>
              {userRole === Role.ADMIN ? <AdminDashboard /> :
                userRole === Role.CEO ? <CEODashboard /> :
                  userRole === Role.COORDINATOR ? <CoordinatorDashboard /> :
                    userRole === Role.TRANSPORT ? <TransportDashboard /> :
                      userRole === Role.DRIVER ? <DriverDashboard /> :
                        <StaffDashboard />}
            </ProtectedRoute>
          } />

          {/* Request Creation */}
          <Route path="/driver/history" element={
            <ProtectedRoute allowedRoles={[Role.DRIVER]}>
              <DriverHistory />
            </ProtectedRoute>
          } />

          <Route path="/create-request" element={
            <ProtectedRoute allowedRoles={[Role.STAFF, Role.COORDINATOR, Role.HOD, Role.TRANSPORT, Role.ADMIN, Role.MCU_USER, Role.CALL_CENTER, Role.WAREHOUSE]}>
              <CreateRequest />
            </ProtectedRoute>
          } />

          {/* My Requests */}
          <Route path="/my-requests" element={
            <ProtectedRoute allowedRoles={[Role.STAFF, Role.HOD, Role.COORDINATOR, Role.TRANSPORT, Role.ADMIN, Role.MCU_USER, Role.CALL_CENTER, Role.WAREHOUSE]}>
              <MyRequests />
            </ProtectedRoute>
          } />

          <Route path="/requests/:id/edit" element={
            <ProtectedRoute allowedRoles={[Role.STAFF]}>
              <EditRequest />
            </ProtectedRoute>
          } />

          {/* Request Details (Accessible by all involved) */}
          <Route path="/requests/:id" element={
            <ProtectedRoute>
              <RequestDetails />
            </ProtectedRoute>
          } />

          <Route path="/notifications" element={
            <ProtectedRoute>
              <NotificationsPage />
            </ProtectedRoute>
          } />

          <Route path="/change-password" element={
            <ProtectedRoute>
              <ChangePassword />
            </ProtectedRoute>
          } />



          {/* Coordinator Routes */}
          <Route path="/coordinator/requests" element={
            <ProtectedRoute allowedRoles={[Role.COORDINATOR, Role.ADMIN]}>
              <CoordinatorDashboard />
            </ProtectedRoute>
          } />
          <Route path="/coordinator/all-requests" element={
            <ProtectedRoute allowedRoles={[Role.COORDINATOR, Role.ADMIN]}>
              <CoordinatorAllRequests />
            </ProtectedRoute>
          } />
          <Route path="/coordinator/requests/:id/review" element={
            <ProtectedRoute allowedRoles={[Role.COORDINATOR, Role.ADMIN]}>
              <CoordinatorRequestReview />
            </ProtectedRoute>
          } />
          <Route path="/coordinator/optimization" element={
            <ProtectedRoute allowedRoles={[Role.COORDINATOR, Role.TRANSPORT]}>
              <CoordinatorRouteOptimization />
            </ProtectedRoute>
          } />

          {/* HOD Routes */}
          <Route path="/hod/approvals" element={
            <ProtectedRoute allowedRoles={[Role.HOD, Role.ADMIN]}>
              <HODApproval />
            </ProtectedRoute>
          } />

          {/* Transport Routes */}
          <Route path="/transport/allocations" element={
            <ProtectedRoute allowedRoles={[Role.TRANSPORT, Role.ADMIN]}>
              <TransportAllocation />
            </ProtectedRoute>
          } />
          <Route path="/requests/:id/allocate" element={
            <ProtectedRoute allowedRoles={[Role.TRANSPORT]}>
              <AllocationPage />
            </ProtectedRoute>
          } />
          <Route path="/transport/admin" element={
            <ProtectedRoute allowedRoles={[Role.TRANSPORT]}>
              <TransportAdminPanel />
            </ProtectedRoute>
          } />

          <Route path="/transport/route-optimization" element={
            <ProtectedRoute allowedRoles={[Role.TRANSPORT]}>
              <TransportRouteOptimization />
            </ProtectedRoute>
          } />
          <Route path="/transport/finalize-allocation" element={
            <ProtectedRoute allowedRoles={[Role.TRANSPORT]}>
              <FinalizeAllocationPage />
            </ProtectedRoute>
          } />
          <Route path="/transport/trips" element={
            <ProtectedRoute allowedRoles={[Role.TRANSPORT, Role.ADMIN]}>
              <TripList />
            </ProtectedRoute>
          } />
          <Route path="/transport/vendors" element={
            <ProtectedRoute allowedRoles={[Role.TRANSPORT, Role.ADMIN]}>
              <VendorListPage />
            </ProtectedRoute>
          } />



          {/* Admin Routes */}
          <Route path="/admin/users" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <UserManagement />
            </ProtectedRoute>
          } />


          <Route path="/admin/divisions" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <DivisionManagement />
            </ProtectedRoute>
          } />

          <Route path="/admin/system-config" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <AdminSystemSettings />
            </ProtectedRoute>
          } />

          {/* Vehicle Management Routes */}
          <Route path="/admin/vehicles" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <VehicleList />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicles/new" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <VehicleRegister />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicles/:id/edit" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <VehicleEdit />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicle-categories" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <VehicleCategories />
            </ProtectedRoute>
          } />
          <Route path="/admin/trip-entry" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN]}>
              <TripEntry />
            </ProtectedRoute>
          } />
          <Route path="/admin/transport-billing" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <TransportBillingHistory />
            </ProtectedRoute>
          } />
          <Route path="/admin/transport-billing/:id" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <TransportBillingDetails />
            </ProtectedRoute>
          } />
          <Route path="/admin/driver-register" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <DriverRegister />
            </ProtectedRoute>
          } />
          <Route path="/admin/vendors" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <VendorListPage />
            </ProtectedRoute>
          } />
          <Route path="/admin/packages" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <TransportPackageManagement />
            </ProtectedRoute>
          } />
          <Route path="/admin/vehicle-assignments" element={
            <ProtectedRoute allowedRoles={[Role.ADMIN, Role.TRANSPORT]}>
              <VehiclePackageAssignment />
            </ProtectedRoute>
          } />

        </Route>

        <Route path="*" element={<Navigate to="/passenger-login" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
