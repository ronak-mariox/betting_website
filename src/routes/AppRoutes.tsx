import { Navigate, Outlet, Route, Routes } from 'react-router-dom';
import { ROLES, getRole } from '../config/roles';
import type { RoleId } from '../config/roles';
import { useAuth } from '../features/auth/authContext';
import { ForgotPasswordPage } from '../features/auth/ForgotPasswordPage';
import { LoginPage } from '../features/auth/LoginPage';
import { PanelSection } from '../features/panel/PanelSection';
import { PanelLayout } from '../layouts/PanelLayout/PanelLayout';

/** Where a visitor belongs right now: their own panel, or the login screen. */
function useHomePath(): string {
  const { user } = useAuth();
  return user ? getRole(user.roleId).basePath : '/login';
}

/** Blocks a panel for signed-out users and for the wrong role. */
function RequireRole({ roleId }: { roleId: RoleId }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (user.roleId !== roleId) return <Navigate to={getRole(user.roleId).basePath} replace />;
  return <Outlet />;
}

function LoginRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={getRole(user.roleId).basePath} replace />;
  return <LoginPage />;
}

function ForgotPasswordRoute() {
  const { user } = useAuth();
  if (user) return <Navigate to={getRole(user.roleId).basePath} replace />;
  return <ForgotPasswordPage />;
}

function HomeRoute() {
  return <Navigate to={useHomePath()} replace />;
}

/** Routes are generated from ROLES — adding a role adds its whole panel. */
export function AppRoutes() {
  return (
    <Routes>
      <Route path="/login" element={<LoginRoute />} />
      <Route path="/forgot-password" element={<ForgotPasswordRoute />} />

      {ROLES.map((role) => (
        <Route key={role.id} element={<RequireRole roleId={role.id} />}>
          <Route path={role.basePath} element={<PanelLayout />}>
            {role.nav.map((item) =>
              item.segment === '' ? (
                <Route key="home" index element={<PanelSection item={item} />} />
              ) : (
                <Route
                  key={item.segment}
                  path={item.segment}
                  element={<PanelSection item={item} />}
                />
              ),
            )}
          </Route>
        </Route>
      ))}

      <Route path="*" element={<HomeRoute />} />
    </Routes>
  );
}
