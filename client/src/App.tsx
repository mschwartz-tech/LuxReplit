import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Suspense, lazy, ComponentType } from 'react';
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader2 } from "lucide-react";

// Lazy load components with proper typing
const NotFound = lazy(() => import("@/pages/not-found")) as ComponentType;
const AuthPage = lazy(() => import("@/pages/auth-page")) as ComponentType;
const Dashboard = lazy(() => import("@/pages/dashboard")) as ComponentType;
const InvoicesPage = lazy(() => import("@/pages/invoices")) as ComponentType;
const GymMembersPage = lazy(() => import("@/pages/gym-members")) as ComponentType;
const TrainingClientsPage = lazy(() => import("@/pages/training-clients")) as ComponentType;
const ClientProfilePage = lazy(() => import("@/pages/client-profile")) as ComponentType;
const TrainingManagementPage = lazy(() => import("@/pages/training-management")) as ComponentType;
const ExerciseLibrary = lazy(() => import("@/pages/exercise-library")) as ComponentType;
const PricingPage = lazy(() => import("@/pages/pricing")) as ComponentType;
const MemberProfilePage = lazy(() => import("@/pages/member-profile")) as ComponentType;
const MemberOnboardingPage = lazy(() => import("@/pages/member-onboarding")) as ComponentType;

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
        <Route path="/auth" component={AuthPage} />
        <ProtectedRoute path="/" component={Dashboard} />
        <ProtectedRoute path="/gym-members" component={GymMembersPage} />
        <ProtectedRoute path="/member-onboarding" component={MemberOnboardingPage} />
        <ProtectedRoute path="/training-clients" component={TrainingClientsPage} />
        <ProtectedRoute path="/client/:id" component={ClientProfilePage} />
        <ProtectedRoute path="/member/:id/profile" component={MemberProfilePage} />
        <ProtectedRoute path="/training-management" component={TrainingManagementPage} />
        <ProtectedRoute path="/invoices" component={InvoicesPage} />
        <ProtectedRoute path="/exercise-library" component={ExerciseLibrary} />
        <ProtectedRoute path="/pricing" component={PricingPage} />
        <Route component={NotFound} />
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