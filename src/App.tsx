import { BrowserRouter, Route, Routes } from "react-router-dom";
import SiteLayout from "./components/SiteLayout";
import HomePage from "./pages/HomePage";
import OpportunitiesPage from "./pages/OpportunitiesPage";
import OpportunityDetailPage from "./pages/OpportunityDetailPage";
import JoinPage from "./pages/JoinPage";
import NotFoundPage from "./pages/NotFoundPage";
import WorkspacePage from "./pages/WorkspacePage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<SiteLayout />}>
          <Route path="/" element={<HomePage />} />
          <Route path="/opportunities" element={<OpportunitiesPage />} />
          <Route path="/opportunities/:opportunityId" element={<OpportunityDetailPage />} />
          <Route path="/join" element={<JoinPage />} />
          <Route path="/workspace" element={<WorkspacePage />} />
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}
