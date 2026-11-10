import React, { lazy, Suspense } from "react";
import { useLocation } from "react-router-dom";
import LogoLoader from "./components/ui/LogoLoader";
import { Routes, Route, Navigate } from "react-router-dom";

import PublicLayout from "./components/layout/PublicLayout";
import AppLayout from "./components/layout/AppLayout";
import ProtectedRoute from "./components/layout/ProtectedRoute";
import PublicOnlyRoute from "./components/layout/PublicOnlyRoute";
import SettingsLayout from "./components/layout/SettingsLayout";
import AdminRoute from "./components/layout/AdminRoute";
import AdminLayout from "./components/layout/AdminLayout";

const Home = lazy(() => import("./pages/public/Home"));
const About = lazy(() => import("./pages/public/About"));
const Features = lazy(() => import("./pages/public/Features"));
const HowItWorks = lazy(() => import("./pages/public/HowItWorks"));
const Contact = lazy(() => import("./pages/public/Contact"));

const Login = lazy(() => import("./pages/auth/Login"));
const Register = lazy(() => import("./pages/auth/Register"));
const ForgotPassword = lazy(() => import("./pages/auth/ForgotPassword"));
const ResetPassword = lazy(() => import("./pages/auth/ResetPassword"));
const VerifyEmail = lazy(() => import("./pages/auth/VerifyEmail"));

const Dashboard = lazy(() => import("./pages/Dashboard"));
const TransactionsList = lazy(() => import("./pages/transactions/TransactionsList"));
const TransactionNew = lazy(() => import("./pages/transactions/TransactionNew"));
const TransactionDetail = lazy(() => import("./pages/transactions/TransactionDetail"));
const Accounts = lazy(() => import("./pages/Accounts"));
const Loans = lazy(() => import("./pages/Loans"));
const CreditPurchases = lazy(() => import("./pages/CreditPurchases"));
const Budgets = lazy(() => import("./pages/Budgets"));
const Goals = lazy(() => import("./pages/Goals"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Reports = lazy(() => import("./pages/Reports"));
const History = lazy(() => import("./pages/History"));
const AiAssistant = lazy(() => import("./pages/AiAssistant"));
const Profile = lazy(() => import("./pages/Profile"));

const AdminMessages = lazy(() => import("./pages/admin/Messages"));
const AdminUsers = lazy(() => import("./pages/admin/Users"));
const AdminAdmins = lazy(() => import("./pages/admin/Admins"));

const TransactionTypes = lazy(() => import("./pages/settings/TransactionTypes"));
const Categories = lazy(() => import("./pages/settings/Categories"));
const Groups = lazy(() => import("./pages/settings/Groups"));
const Contacts = lazy(() => import("./pages/settings/Contacts"));
const PaymentMethods = lazy(() => import("./pages/settings/PaymentMethods"));
const Priorities = lazy(() => import("./pages/settings/Priorities"));

const PUBLIC_PATH = /^\/(features|how-it-works|about|contact|login|register|forgot-password|reset-password|verify-email)?\/?$/;

/** Shown while a page chunk downloads. The branded loader appears only inside the signed-in app, and only if it takes a moment. */
function PageFallback() {
  const { pathname } = useLocation();
  return PUBLIC_PATH.test(pathname) ? <div className="min-h-[40vh]" /> : <LogoLoader fullscreen />;
}

export default function App() {
  return (
    <Suspense fallback={<PageFallback />}>
    <Routes>
      {/* Public marketing + auth pages */}
      <Route element={<PublicLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/features" element={<Features />} />
        <Route path="/how-it-works" element={<HowItWorks />} />
        <Route path="/contact" element={<Contact />} />

        <Route path="/login" element={<PublicOnlyRoute><Login /></PublicOnlyRoute>} />
        <Route path="/register" element={<PublicOnlyRoute><Register /></PublicOnlyRoute>} />
        <Route path="/forgot-password" element={<PublicOnlyRoute><ForgotPassword /></PublicOnlyRoute>} />
        <Route path="/reset-password" element={<ResetPassword />} />
        <Route path="/verify-email" element={<VerifyEmail />} />
      </Route>

      {/* Authenticated app */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/dashboard" element={<Dashboard />} />

        <Route path="/transactions" element={<TransactionsList />} />
        <Route path="/transactions/new" element={<TransactionNew />} />
        <Route path="/transactions/:code" element={<TransactionDetail />} />

        <Route path="/accounts" element={<Accounts />} />
        <Route path="/loans" element={<Loans />} />
        <Route path="/credit-purchases" element={<CreditPurchases />} />
        <Route path="/budgets" element={<Budgets />} />
        <Route path="/goals" element={<Goals />} />
        <Route path="/analytics" element={<Analytics />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/history" element={<History />} />
        <Route path="/ai-assistant" element={<AiAssistant />} />
        <Route path="/profile" element={<Profile />} />

        <Route path="/settings" element={<SettingsLayout />}>
          <Route index element={<Navigate to="transaction-types" replace />} />
          <Route path="transaction-types" element={<TransactionTypes />} />
          <Route path="categories" element={<Categories />} />
          <Route path="groups" element={<Groups />} />
          <Route path="contacts" element={<Contacts />} />
          <Route path="payment-methods" element={<PaymentMethods />} />
          <Route path="priorities" element={<Priorities />} />
        </Route>
      </Route>

      {/* Admin panel: separate layout + guard, lazy-loaded so regular users never download it */}
      <Route
        path="/admin"
        element={
          <ProtectedRoute>
            <AdminRoute>
              <AdminLayout />
            </AdminRoute>
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="messages" replace />} />
        <Route path="messages/:slug?" element={<AdminMessages />} />
        <Route path="users" element={<AdminUsers />} />
        <Route path="admins" element={<AdminAdmins />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
    </Suspense>
  );
}
