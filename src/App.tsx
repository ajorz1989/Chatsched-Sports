import { lazy, Suspense } from "react";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import HomePage from "./pages/HomePage";
const OpportunitiesPage = lazy(() => import("./pages/OpportunitiesPage"));
const OpportunityDetailPage = lazy(() => import("./pages/OpportunityDetailPage"));
const JoinPage = lazy(() => import("./pages/JoinPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));
const WorkspacePage = lazy(() => import("./pages/WorkspacePage"));
const AdminPage = lazy(() => import("./pages/AdminPage"));
const MessagesPage = lazy(() => import("./pages/MessagesPage"));
const TalentDirectoryPage = lazy(() => import("./pages/TalentDirectoryPage"));
const TalentProfilePage = lazy(() => import("./pages/TalentProfilePage"));
const MatchingPage = lazy(() => import("./pages/MatchingPage"));
const NotificationsPage = lazy(() => import("./pages/NotificationsPage"));
const ForgotPasswordPage = lazy(() => import("./pages/ForgotPasswordPage"));
const ResetPasswordPage = lazy(() => import("./pages/ResetPasswordPage"));
const AudiencePage = lazy(() => import("./pages/AudiencePage"));
const OrganisationsPage = lazy(() => import("./pages/OrganisationsPage"));
const OrganisationProfilePage = lazy(() => import("./pages/OrganisationProfilePage"));
const TalentSearchPage = lazy(() => import("./pages/TalentSearchPage"));
const OrganisationInsightsPage = lazy(() => import("./pages/OrganisationInsightsPage"));
const RepresentationPage = lazy(() => import("./pages/RepresentationPage"));
const RecruiterHubPage = lazy(() => import("./pages/RecruiterHubPage"));
const HelpPage = lazy(() => import("./pages/HelpPage"));
const ContactPage = lazy(() => import("./pages/ContactPage"));
const CookiesPage = lazy(() => import("./pages/CookiesPage"));
const VerificationPage = lazy(() => import("./pages/VerificationPage"));
const ReportConcernPage = lazy(() => import("./pages/ReportConcernPage"));
const DataRequestPage = lazy(() => import("./pages/DataRequestPage"));
const StatusPage = lazy(() => import("./pages/StatusPage"));

export default function App() {
  return (
    <BrowserRouter>
      <Suspense fallback={<div className="route-loading" role="status" aria-live="polite"><span className="route-loading-bar"/><span className="sr-only">Loading…</span></div>}>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:opportunityId" element={<OpportunityDetailPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route path="/reset-password" element={<ResetPasswordPage />} />
          <Route path="/about" element={<AudiencePage />} />
          <Route path="/how-it-works" element={<AudiencePage />} />
          <Route path="/for-athletes" element={<AudiencePage />} />
          <Route path="/for-organisations" element={<AudiencePage />} />
          <Route path="/for-partners" element={<AudiencePage />} />
          <Route path="/safeguarding" element={<AudiencePage />} />
          <Route path="/privacy" element={<AudiencePage />} />
          <Route path="/terms" element={<AudiencePage />} />
          <Route path="/help" element={<HelpPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/cookies" element={<CookiesPage />} />
          <Route path="/verification" element={<VerificationPage />} />
          <Route path="/report" element={<ReportConcernPage />} />
          <Route path="/data-request" element={<DataRequestPage />} />
          <Route path="/status" element={<StatusPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/talent" element={<TalentDirectoryPage />} />
          <Route path="/organisations" element={<OrganisationsPage />} />
          <Route path="/organisations/:organisationId" element={<OrganisationProfilePage />} />
          <Route path="/talent/:athleteId" element={<TalentProfilePage />} />
          <Route path="/talent-discover" element={<TalentSearchPage />} />
          <Route path="/recruitment" element={<RecruiterHubPage />} />
          <Route path="/insights" element={<OrganisationInsightsPage />} />
          <Route path="/representation" element={<RepresentationPage />} />
          <Route path="/messages" element={<MessagesPage />} />
          <Route path="/matching" element={<MatchingPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/admin" element={<AdminPage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
