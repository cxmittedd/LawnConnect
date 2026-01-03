import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { AuthProvider, ProtectedRoute } from "./lib/auth";
import { AdminRoute } from "./lib/adminRoute";
import { ThemeProvider } from "./hooks/useTheme";
import { CookieConsent } from "./components/CookieConsent";
import ErrorBoundary from "./components/ErrorBoundary";
import { AcceptedJobPopup } from "./components/AcceptedJobPopup";
import Index from "./pages/Index";
import Auth from "./pages/Auth";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import PostJob from "./pages/PostJob";
import BrowseJobs from "./pages/BrowseJobs";
import MyJobs from "./pages/MyJobs";
import JobDetails from "./pages/JobDetails";
import Profile from "./pages/Profile";
import ProviderEarnings from "./pages/ProviderEarnings";
import ProviderCalendar from "./pages/ProviderCalendar";
import ProviderProfile from "./pages/ProviderProfile";
import AdminDashboard from "./pages/AdminDashboard";
import AdminDisputes from "./pages/AdminDisputes";
import AdminVerifications from "./pages/AdminVerifications";
import About from "./pages/About";
import Contact from "./pages/Contact";
import Install from "./pages/Install";
import TermsOfService from "./pages/TermsOfService";
import PrivacyPolicy from "./pages/PrivacyPolicy";
import RefundPolicy from "./pages/RefundPolicy";
import Invoices from "./pages/Invoices";
import PaymentSuccess from "./pages/PaymentSuccess";
import PaymentFailure from "./pages/PaymentFailure";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

const App = () => (
  <ErrorBoundary>
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Index />} />
              <Route path="/auth" element={<Auth />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/about" element={<About />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/install" element={<Install />} />
              <Route path="/terms" element={<TermsOfService />} />
              <Route path="/privacy" element={<PrivacyPolicy />} />
              <Route path="/refund-policy" element={<RefundPolicy />} />
              <Route path="/payment-success" element={<PaymentSuccess />} />
              <Route path="/payment-failure" element={<PaymentFailure />} />
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <Dashboard />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/post-job"
                element={
                  <ProtectedRoute>
                    <PostJob />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/browse-jobs"
                element={
                  <ProtectedRoute>
                    <BrowseJobs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/my-jobs"
                element={
                  <ProtectedRoute>
                    <MyJobs />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/job/:id"
                element={
                  <ProtectedRoute>
                    <JobDetails />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/profile"
                element={
                  <ProtectedRoute>
                    <Profile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/earnings"
                element={
                  <ProtectedRoute>
                    <ProviderEarnings />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/calendar"
                element={
                  <ProtectedRoute>
                    <ProviderCalendar />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/invoices"
                element={
                  <ProtectedRoute>
                    <Invoices />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/provider/:id"
                element={
                  <ProtectedRoute>
                    <ProviderProfile />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/admin/dashboard"
                element={
                  <AdminRoute>
                    <AdminDashboard />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/disputes"
                element={
                  <AdminRoute>
                    <AdminDisputes />
                  </AdminRoute>
                }
              />
              <Route
                path="/admin/verifications"
                element={
                  <AdminRoute>
                    <AdminVerifications />
                  </AdminRoute>
                }
              />
              {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
              <Route path="*" element={<NotFound />} />
            </Routes>
            <AcceptedJobPopup />
          </AuthProvider>
          <CookieConsent />
        </BrowserRouter>
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  </ErrorBoundary>
);

export default App;
