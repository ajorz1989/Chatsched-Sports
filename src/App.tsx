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
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="/talent" element={<TalentDirectoryPage />} />
          <Route path="/talent/:athleteId" element={<TalentProfilePage />} />
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
