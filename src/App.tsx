import { BrowserRouter } from 'react-router-dom';
import { AuthProvider } from './features/auth/AuthProvider';
import { PermissionsProvider } from './features/auth/PermissionsProvider';
import { AppConfigProvider } from './lib/appConfig';
import { AppRoutes } from './routes/AppRoutes';

export default function App() {
  return (
    <AuthProvider>
      <AppConfigProvider>
        <PermissionsProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </PermissionsProvider>
      </AppConfigProvider>
    </AuthProvider>
  );
}
