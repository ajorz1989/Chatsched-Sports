import { BrowserRouter, Route, Routes } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import HomePage from "./pages/HomePage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import JoinPage from "./pages/JoinPage";
import NotFoundPage from "./pages/NotFoundPage";
import WorkspacePage from "./pages/WorkspacePage";
import AdminPage from "./pages/AdminPage";
import MessagesPage from "./pages/MessagesPage";
import TalentDirectoryPage from "./pages/TalentDirectoryPage";
import TalentProfilePage from "./pages/TalentProfilePage";
import MatchingPage from "./pages/MatchingPage";
import NotificationsPage from "./pages/NotificationsPage";
import ForgotPasswordPage from "./pages/ForgotPasswordPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import AudiencePage from "./pages/AudiencePage";
import OrganisationsPage from "./pages/OrganisationsPage";
import OrganisationProfilePage from "./pages/OrganisationProfilePage";
import TalentSearchPage from "./pages/TalentSearchPage";
import OrganisationInsightsPage from "./pages/OrganisationInsightsPage";
import RepresentationPage from "./pages/RepresentationPage";
import RecruiterHubPage from "./pages/RecruiterHubPage";

export default function App() {
  return (
    <BrowserRouter>
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
    </BrowserRouter>
  );
}
