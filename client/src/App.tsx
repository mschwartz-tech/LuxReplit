import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import NotFound from "@/pages/not-found";
import AuthPage from "@/pages/auth-page";
import Dashboard from "@/pages/dashboard";
import InvoicesPage from "@/pages/invoices";
import GymMembersPage from "@/pages/gym-members";
import TrainingClientsPage from "@/pages/training-clients";
import ClientProfilePage from "@/pages/client-profile";
import TrainingManagementPage from "@/pages/training-management";
import ExerciseLibrary from "@/pages/exercise-library";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";

function Router() {
  return (
    <Switch>
      <Route path="/auth" component={AuthPage} />
      <ProtectedRoute path="/" component={Dashboard} />
      <ProtectedRoute path="/gym-members" component={GymMembersPage} />
      <ProtectedRoute path="/training-clients" component={TrainingClientsPage} />
      <ProtectedRoute path="/client/:id" component={ClientProfilePage} />
      <ProtectedRoute path="/training-management" component={TrainingManagementPage} />
      <ProtectedRoute path="/invoices" component={InvoicesPage} />
      <ProtectedRoute path="/exercise-library" component={ExerciseLibrary} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;