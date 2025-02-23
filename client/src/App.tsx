import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Suspense, lazy, ComponentType } from 'react';
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader2 } from "lucide-react";

// Define prop types for components that need them
interface ClientProfileProps {
  params: { id: string };
}

interface MemberProfileProps {
  params: { id: string };
}

// Lazy load components
const NotFound = lazy(() => import("@/pages/not-found"));
const AuthPage = lazy(() => import("@/pages/auth-page")) as ComponentType;
const Dashboard = lazy(() => import("@/pages/dashboard")) as ComponentType;
const InvoicesPage = lazy(() => import("@/pages/invoices")) as ComponentType;
const GymMembersPage = lazy(() => import("@/pages/gym-members")) as ComponentType;
const TrainingClientsPage = lazy(() => import("@/pages/training-clients")) as ComponentType;
const ClientProfilePage = lazy(() => import("@/pages/client-profile")) as ComponentType<ClientProfileProps>;
const TrainingManagementPage = lazy(() => import("@/pages/training-management")) as ComponentType;
const ExerciseLibrary = lazy(() => import("@/pages/exercise-library")) as ComponentType;
const PricingPage = lazy(() => import("@/pages/pricing")) as ComponentType;
const MemberProfilePage = lazy(() => import("@/pages/member-profile")) as ComponentType<MemberProfileProps>;
const MemberOnboardingPage = lazy(() => import("@/pages/member-onboarding")) as ComponentType;
const BillingPage = lazy(() => import("@/pages/billing")) as ComponentType;
const MealPlansPage = lazy(() => import("@/pages/meal-plans")) as ComponentType;
const SchedulePage = lazy(() => import("@/pages/schedule")) as ComponentType;

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );
}

function Router() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <Switch>
        <Route path="/auth">
          <AuthPage />
        </Route>
        <Route path="/">
          <ProtectedRoute component={Dashboard} />
        </Route>
        <Route path="/gym-members">
          <ProtectedRoute component={GymMembersPage} />
        </Route>
        <Route path="/member-onboarding">
          <ProtectedRoute component={MemberOnboardingPage} />
        </Route>
        <Route path="/training-clients">
          <ProtectedRoute component={TrainingClientsPage} />
        </Route>
        <Route path="/client/:id">
          {(params) => (
            <ProtectedRoute 
              component={() => <ClientProfilePage params={params} />}
            />
          )}
        </Route>
        <Route path="/member/:id/profile">
          {(params) => (
            <ProtectedRoute 
              component={() => <MemberProfilePage params={params} />}
            />
          )}
        </Route>
        <Route path="/training-management">
          <ProtectedRoute component={TrainingManagementPage} />
        </Route>
        <Route path="/invoices">
          <ProtectedRoute component={InvoicesPage} />
        </Route>
        <Route path="/exercise-library">
          <ProtectedRoute component={ExerciseLibrary} />
        </Route>
        <Route path="/pricing">
          <ProtectedRoute component={PricingPage} />
        </Route>
        <Route path="/billing">
          <ProtectedRoute component={BillingPage} />
        </Route>
        <Route path="/meal-plans">
          <ProtectedRoute component={MealPlansPage} />
        </Route>
        <Route path="/schedule">
          <ProtectedRoute component={SchedulePage} />
        </Route>
        <Route>
          <NotFound />
        </Route>
      </Switch>
    </Suspense>
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