import { useEffect } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useCRM } from "@/store/crmStore";
import { useAuth } from "@/store/authStore";
import { useSiteSettings } from "@/store/siteSettingsStore";
import { useServices } from "@/store/serviceStore";
import { ChatRealtimeSync } from "@/components/ChatRealtimeSync";
import { DataRealtimeSync } from "@/components/DataRealtimeSync";
import { AppErrorBoundary } from "@/components/AppErrorBoundary";
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
import CustomerDetail from "./pages/CustomerDetail.tsx";
import CampaignManagement from "./pages/CampaignManagement.tsx";
import MarketingReport from "./pages/MarketingReport.tsx";
import FinancialReport from "./pages/FinancialReport.tsx";
import PaymentInvoice from "./pages/PaymentInvoice.tsx";
import BookingOverview from "./pages/BookingOverview.tsx";
import OBDashboard from "./pages/OBDashboard.tsx";
import ProvinceHeatmap from "./pages/ProvinceHeatmap.tsx";
import LoginBannerManagement from "./pages/LoginBannerManagement.tsx";
import UsersPage from "./pages/UsersPage.tsx";
import LoginBannerPage from "./pages/LoginBannerPage.tsx";
import AllServicePage from "./pages/AllServicePage.tsx";
import MarketingDashboardPage from "./pages/MarketingDashboardPage.tsx";
import StockDashboard from "./pages/StockDashboard.tsx";
import StockAnalytics from "./pages/StockAnalytics.tsx";
import IncentivePipeline from "./pages/IncentivePipeline.tsx";
import CustomersPage from "./pages/CustomersPage.tsx";
import CampaignsPage from "./pages/CampaignsPage.tsx";
import MarketingReportPage from "./pages/MarketingReportPage.tsx";
import ContentCalendar from "./pages/ContentCalendar.tsx";
import TourContentLink from "./pages/TourContentLink.tsx";
import ContentAssetLibrary from "./pages/ContentAssetLibrary.tsx";
import PostPerformanceTracker from "./pages/PostPerformanceTracker.tsx";
import ContentManagementLayout from "./pages/ContentManagementLayout.tsx";
import ContentPhotoFrame from "./pages/ContentPhotoFrame.tsx";
import AudienceBuilderLayout from "./pages/AudienceBuilderLayout.tsx";
import TeamResourcesLayout from "./pages/TeamResourcesLayout.tsx";
import AudienceLineExport from "./pages/audience/AudienceLineExport.tsx";
import AudienceFacebook from "./pages/audience/AudienceFacebook.tsx";
import AudienceBirthday from "./pages/audience/AudienceBirthday.tsx";
import AudienceColdLead from "./pages/audience/AudienceColdLead.tsx";
import AudienceVIPList from "./pages/audience/AudienceVIPList.tsx";
import AudienceInterestSegment from "./pages/audience/AudienceInterestSegment.tsx";
import Gallery from "./pages/Gallery.tsx";
import GalleryAlbumView from "./pages/GalleryAlbumView.tsx";
import TourPackagePresentation from "./pages/TourPackagePresentation.tsx";
import WebSetting from "./pages/WebSetting.tsx";
import MarketingLeads from "./pages/MarketingLeads.tsx";
import AdsDashboard from "./pages/AdsDashboard.tsx";
import WeeklySalesPlan from "./pages/WeeklySalesPlan.tsx";
import PlanReport from "./pages/PlanReport.tsx";
import CalendarPlan from "./pages/CalendarPlan.tsx";
import MarketingHub from "./pages/MarketingHub.tsx";
import MarketingWorkflow from "./pages/MarketingWorkflow.tsx";
import MarketingOrgChart from "./pages/MarketingOrgChart.tsx";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient();

// Sync customers from Supabase on app mount (no-op if Supabase disabled)
function SupabaseSync() {
  const loadAll = useCRM((s) => s.loadAllFromSupabase);
  const loadUsers = useAuth((s) => s.loadUsersFromSupabase);
  const loadSettings = useSiteSettings((s) => s.loadFromSupabase);
  const loadServices = useServices((s) => s.loadFromSupabase);
  // Watch JWT — re-load ข้อมูลทั้งหมดเมื่อ JWT เปลี่ยน (หลัง login หรือหลัง rehydrate)
  // แก้ปัญหา: SupabaseSync วิ่งครั้งเดียวตอน mount → JWT ยังไม่มี → RLS block → ข้อมูลว่าง
  const jwtToken = useAuth((s) => s.jwtToken);

  // Mount: โหลด users + settings + services (ไม่ต้องการ JWT)
  useEffect(() => {
    loadUsers();
    loadSettings();
    loadServices();
  }, [loadUsers, loadSettings, loadServices]);

  // JWT เปลี่ยน (ตอน login หรือ restore จาก localStorage) → reload ข้อมูลที่ต้อง auth
  useEffect(() => {
    loadAll();
  }, [loadAll, jwtToken]);

  return null;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <SupabaseSync />
      <ChatRealtimeSync />
      <DataRealtimeSync />
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Hub />} />
          <Route path="/login" element={<Login />} />
          <Route path="/tour-presentation" element={<TourPresentation />} />
          <Route path="/tour-packages" element={<TourPackagePresentation />} />
          <Route path="/contact-info" element={<ContactInfo />} />
          <Route path="/gallery" element={<Gallery />} />
          <Route path="/gallery/:albumId" element={<GalleryAlbumView />} />
          <Route path="/teams" element={<RouteGuard><SalesTeam /></RouteGuard>} />
          <Route path="/profile" element={<RouteGuard><MyProfile /></RouteGuard>} />
          <Route path="/users" element={<RouteGuard><UsersPage /></RouteGuard>} />
          <Route path="/login-banner" element={<RouteGuard><LoginBannerPage /></RouteGuard>} />
          <Route path="/web-setting" element={<RouteGuard><WebSetting /></RouteGuard>} />
          <Route path="/ads-dashboard" element={<RouteGuard><AdsDashboard /></RouteGuard>} />
          <Route path="/service-stock" element={<RouteGuard><AllServicePage /></RouteGuard>} />
          <Route path="/marketing-dashboard" element={<RouteGuard><MarketingDashboardPage /></RouteGuard>} />
          <Route path="/marketing-customers" element={<RouteGuard><CustomersPage /></RouteGuard>} />
          <Route path="/marketing-campaigns" element={<RouteGuard><CampaignsPage /></RouteGuard>} />
          <Route path="/marketing-report" element={<RouteGuard><MarketingReportPage /></RouteGuard>} />
          <Route path="/marketing-contents" element={<RouteGuard><ContentManagementLayout /></RouteGuard>}>
            <Route path="calendar"     element={<ContentCalendar />} />
            <Route path="tour-link"    element={<TourContentLink />} />
            <Route path="assets"       element={<ContentAssetLibrary />} />
            <Route path="performance"  element={<PostPerformanceTracker />} />
            <Route path="photo-frame"  element={<ContentPhotoFrame />} />
          </Route>
          <Route path="/audience-builder" element={<RouteGuard><AudienceBuilderLayout /></RouteGuard>}>
            <Route path="line-export" element={<AudienceLineExport />} />
            <Route path="facebook"    element={<AudienceFacebook />} />
            <Route path="birthday"    element={<AudienceBirthday />} />
            <Route path="cold-lead"   element={<AudienceColdLead />} />
            <Route path="vip"         element={<AudienceVIPList />} />
            <Route path="interest"    element={<AudienceInterestSegment />} />
          </Route>
          <Route path="/team-resources" element={<RouteGuard><TeamResourcesLayout /></RouteGuard>}>
            <Route path="workflow"   element={<MarketingWorkflow />} />
            <Route path="org-chart" element={<MarketingOrgChart />} />
          </Route>
          <Route path="/app" element={<AppErrorBoundary><RouteGuard><AppLayout /></RouteGuard></AppErrorBoundary>}>
            <Route index element={<Index />} />
            <Route path="executive" element={<ExecutiveDashboard />} />
            <Route path="customers" element={<Customers />} />
            <Route path="customers/:customerId" element={<CustomerDetail />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="targets" element={<Targets />} />
            <Route path="followup" element={<FollowUp />} />
            <Route path="planning" element={<Planning />} />
            <Route path="calendar" element={<RouteCalendar />} />
            <Route path="mission/:routeId" element={<Mission />} />
            <Route path="route-completed" element={<CompletedRoute />} />
            <Route path="route-completed/:routeId" element={<CompletedRoute />} />
            <Route path="sales-mission" element={<SalesFollower />} />

            <Route path="quotation" element={<Quotation />} />
            <Route path="quotation/new/:type" element={<QuotationForm />} />
            <Route path="users" element={<RouteGuard allowedRoles={["Admin"]}><UserManagement /></RouteGuard>} />
            <Route path="login-banner" element={<RouteGuard allowedRoles={["Admin"]}><LoginBannerManagement /></RouteGuard>} />
            <Route path="profile" element={<Navigate to="/profile" replace />} />
            <Route path="all-service" element={<AllService />} />
            <Route path="campaigns" element={<CampaignManagement />} />
            <Route path="marketing-report" element={<MarketingReport />} />
            <Route path="audience/cold-lead" element={<AudienceColdLead />} />
            <Route path="audience/vip"       element={<AudienceVIPList />} />
            <Route path="audience/interest"  element={<AudienceInterestSegment />} />
            <Route path="financial-report" element={<FinancialReport />} />
            <Route path="payment" element={<PaymentInvoice />} />
            <Route path="booking-overview" element={<BookingOverview />} />
            <Route path="ob-dashboard" element={<OBDashboard />} />
            <Route path="heatmap" element={<ProvinceHeatmap />} />
            <Route path="marketing-leads" element={<MarketingLeads />} />
            <Route path="weekly-plan" element={<WeeklySalesPlan />} />
            <Route path="plan-report" element={<PlanReport />} />
            <Route path="calendar-plan" element={<CalendarPlan />} />
            <Route path="stock-dashboard" element={<StockDashboard />} />
            <Route path="stock-analytics" element={<StockAnalytics />} />
            <Route path="incentive-pipeline" element={<IncentivePipeline />} />
            <Route path="marketing-hub" element={<MarketingHub />} />
            {/* redirect เก่า → team-resources layout */}
            <Route path="marketing-workflow" element={<Navigate to="/team-resources/workflow" replace />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
