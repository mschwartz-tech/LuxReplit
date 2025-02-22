import { QueryClientProvider } from "@tanstack/react-query";
import { Switch, Route } from "wouter";
import { Suspense, lazy } from 'react';
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from "@/hooks/use-auth";
import { ProtectedRoute } from "./lib/protected-route";
import { Loader2 } from "lucide-react";

// Lazy load components
const NotFound = lazy(() => import("@/pages/not-found"));
const AuthPage = lazy(() => import("@/pages/auth-page"));
const Dashboard = lazy(() => import("@/pages/dashboard"));
const InvoicesPage = lazy(() => import("@/pages/invoices"));
const GymMembersPage = lazy(() => import("@/pages/gym-members"));
const TrainingClientsPage = lazy(() => import("@/pages/training-clients"));
const ClientProfilePage = lazy(() => import("@/pages/client-profile"));
const TrainingManagementPage = lazy(() => import("@/pages/training-management"));
const ExerciseLibrary = lazy(() => import("@/pages/exercise-library"));
const PricingPage = lazy(() => import("@/pages/pricing"));
const MemberProfilePage = lazy(() => import("@/pages/member-profile"));
const MemberOnboardingPage = lazy(() => import("@/pages/member-onboarding"));
const BillingPage = lazy(() => import("@/pages/billing"));

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
        <ProtectedRoute path="/billing" component={BillingPage} />
        <Route path="*" component={NotFound} />
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