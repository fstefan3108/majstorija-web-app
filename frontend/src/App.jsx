import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import Home from './pages/Home';
import ContactUs from './pages/ContactUs';
import Login from './pages/Login';
import Register from './pages/Register';
import BrowseTasks from './pages/BrowseTasks';
import BrowseCategories from './pages/BrowseCategories';
import BrowseSubcategories from './pages/BrowseSubcategories';
import BrowseCraftsmen from './pages/BrowseCraftsmen';
import AboutUs from './pages/AboutUs';
import CraftsmenByCategory from './pages/CraftsmenByCategory';
import Chat from './pages/Chat';
import Checkout from './pages/Checkout';
import PaymentSuccess from './pages/PaymentSuccess';
import PaymentCancel from './pages/PaymentCancel';
import ProfileSettings from './pages/ProfileSettings';
import CraftsmanProfile from './pages/CraftsmanProfile';
import UserProfile from './pages/UserProfile';
import Dashboard from './pages/Dashboard';
import JobTimer from './pages/JobTimer';
import JobRequestPage from './pages/JobRequestPage';
import FAQ from './pages/FAQ';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import EmailVerificationPending from './pages/EmailVerificationPending';
import VerifyEmail from './pages/VerifyEmail';
import ScrollToTop from './components/ScrollToTop';

const GOOGLE_CLIENT_ID = "432202911287-rm1iq2ifogskv0t7d2n22rv9rpmu78e2.apps.googleusercontent.com";

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <BrowserRouter>
        <ScrollToTop />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/about" element={<AboutUs />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/browse-tasks" element={<BrowseTasks />} />
          <Route path="/browse" element={<BrowseCategories />} />
          <Route path="/browse/:categorySlug" element={<BrowseSubcategories />} />
          <Route path="/browse/:categorySlug/:subcategorySlug" element={<BrowseCraftsmen />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/workers/dashboard" element={<Dashboard />} />
          <Route path="/users/dashboard" element={<Dashboard />} />
          <Route path="/workers/chat" element={<Chat />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="/craftsmen/:category" element={<CraftsmenByCategory />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/payment-success" element={<PaymentSuccess />} />
          <Route path="/payment-cancel" element={<PaymentCancel />} />
          <Route path="/profile/settings" element={<ProfileSettings />} />
          <Route path="/craftsman/:id" element={<CraftsmanProfile />} />
          <Route path="/user/:id" element={<UserProfile />} />
          <Route path="/job-timer/:jobId" element={<JobTimer />} />
          <Route path="/job-request/:id" element={<JobRequestPage />} />
          <Route path="/faq" element={<FAQ />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email-pending" element={<EmailVerificationPending />} />
          <Route path="/verify-email/confirm" element={<VerifyEmail />} />
        </Routes>
      </BrowserRouter>
    </GoogleOAuthProvider>
  );
}

export default App;