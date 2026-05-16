import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCRM } from "@/store/crmStore";
import { useAuth } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { useServices } from "@/store/serviceStore";
import { ChatRealtimeSync } from "@/components/ChatRealtimeSync";
import AppLayout from "./components/AppLayout";
import Index from "./pages/Index.tsx";
import Hub from "./pages/Hub.tsx";
import Login from "./pages/Login.tsx";
import { RouteGuard } from "./components/RouteGuard";
import TourPresentation from "./pages/TourPresentation.tsx";
import ContactInfo from "./pages/ContactInfo.tsx";
import Customers from "./pages/Customers.tsx";
import Pipeline from "./pages/Pipeline.tsx";
import FollowUp from "./pages/FollowUp.tsx";
import Targets from "./pages/Targets.tsx";
import ExecutiveDashboard from "./pages/ExecutiveDashboard.tsx";
import Planning from "./pages/Planning.tsx";
import RouteCalendar from "./pages/RouteCalendar.tsx";
import Mission from "./pages/Mission.tsx";
import CompletedRoute from "./pages/CompletedRoute.tsx";
import SalesFollower from "./pages/SalesFollower.tsx";
import SalesTeam from "./pages/SalesTeam.tsx";
import Quotation from "./pages/Quotation.tsx";
import QuotationForm from "./pages/QuotationForm.tsx";
import UserManagement from "./pages/UserManagement.tsx";
import MyProfile from "./pages/MyProfile.tsx";
import AllService from "./pages/AllService.tsx";
import CampaignManagement from "./pages/CampaignManagement.tsx";
import MarketingReport from "./pages/MarketingReport.tsx";
import FinancialReport from "./pages/FinancialReport.tsx";
import PaymentInvoice from "./pages/PaymentInvoice.tsx";
import BookingOverview from "./pages/BookingOverview.tsx";
import LoginBannerManagement from "./pages/LoginBannerManagement.tsx";
import Gallery from "./pages/Gallery.tsx";
import GalleryAlbumView from "./pages/GalleryAlbumView.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Sync customers from Supabase on app mount (no-op if Supabase disabled)
function SupabaseSync() {
  const loadAll = useCRM((s) => s.loadAllFromSupabase);
  const loadUsers = useAuth((s) => s.loadUsersFromSupabase);
  const loadSettings = useSiteSettings((s) => s.loadFromSupabase);
  const loadServices = useServices((s) => s.loadFromSupabase);
  useEffect(() => {
    loadAll();
    loadUsers();
    loadSettings();
    loadServices();
  }, [loadAll, loadUsers, loadSettings, loadServices]);
  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SupabaseSync />
      <ChatRealtimeSync />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tour-presentation" element={<TourPresentation />} />
          <Route path="/contact-info" element={<ContactInfo />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/gallery/:albumId" element={<GalleryAlbumView />} />
          <Route path="/app" element={<RouteGuard><AppLayout /></RouteGuard>}>
            <Route index element={<Index />} />
            <Route path="executive" element={<ExecutiveDashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="targets" element={<Targets />} />
            <Route path="followup" element={<FollowUp />} />
            <Route path="planning" element={<Planning />} />
            <Route path="calendar" element={<RouteCalendar />} />
            <Route path="mission/:routeId" element={<Mission />} />
            <Route path="route-completed" element={<CompletedRoute />} />
            <Route path="route-completed/:routeId" element={<CompletedRoute />} />
            <Route path="sales-mission" element={<SalesFollower />} />
            <Route path="sales-team" element={<SalesTeam />} />
            <Route path="quotation" element={<Quotation />} />
            <Route path="quotation/new/:type" element={<QuotationForm />} />
            <Route path="users" element={<RouteGuard allowedRoles={["Admin"]}><UserManagement /></RouteGuard>} />
            <Route path="login-banner" element={<RouteGuard allowedRoles={["Admin"]}><LoginBannerManagement /></RouteGuard>} />
            <Route path="profile" element={<MyProfile />} />
            <Route path="all-service" element={<AllService />} />
            <Route path="campaigns" element={<CampaignManagement />} />
            <Route path="marketing-report" element={<MarketingReport />} />
            <Route path="financial-report" element={<FinancialReport />} />
            <Route path="payment" element={<PaymentInvoice />} />
            <Route path="booking-overview" element={<BookingOverview />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
