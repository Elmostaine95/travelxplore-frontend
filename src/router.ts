import { createRouter, createWebHistory } from "vue-router";
import MainExperience from "./pages/MainExperience.vue";
import BookingPage from "./pages/BookingPage.vue";
import BookingPaymentReturn from "./pages/BookingPaymentReturn.vue";
import AboutPage from "./pages/AboutPage.vue";
import ContactPage from "./pages/ContactPage.vue";
import SignUpPage from "./pages/SignUpPage.vue";
import SignInPage from "./pages/SignInPage.vue";
import ForgotPasswordPage from "./pages/ForgotPasswordPage.vue";
import ResetPasswordPage from "./pages/ResetPasswordPage.vue";
import VerifyEmailPage from "./pages/VerifyEmailPage.vue";
import AccountPage from "./pages/AccountPage.vue";
import MyBookingsPage from "./pages/MyBookingsPage.vue";
import BookingDetailPage from "./pages/BookingDetailPage.vue";
import { useAuthStore } from "./stores/auth";

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: "/", name: "home", component: MainExperience },
    { path: "/about", name: "about", component: AboutPage },
    { path: "/contact", name: "contact", component: ContactPage },
    { path: "/sign-up", name: "signup", component: SignUpPage },
    { path: "/sign-in", name: "signin", component: SignInPage },
    { path: "/forgot-password", name: "forgot-password", component: ForgotPasswordPage },
    { path: "/reset-password", name: "reset-password", component: ResetPasswordPage },
    { path: "/verify-email", name: "verify-email", component: VerifyEmailPage },
    {
      path: "/account",
      name: "account",
      component: AccountPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/my-bookings/:bookingId",
      name: "booking-detail",
      component: BookingDetailPage,
      meta: { requiresAuth: true },
    },
    {
      path: "/my-bookings",
      name: "my-bookings",
      component: MyBookingsPage,
      meta: { requiresAuth: true },
    },
    { path: "/bookings", redirect: "/my-bookings" },
    {
      path: "/booking/:hotelId/payment-return",
      name: "booking-payment-return",
      component: BookingPaymentReturn,
      props: true,
    },
    { path: "/booking/:hotelId", name: "booking", component: BookingPage, props: true },
  ],
});

router.beforeEach((to) => {
  if (to.meta.requiresAuth) {
    const auth = useAuthStore();
    if (!auth.isAuthenticated) {
      return {
        name: "signin",
        query: { redirect: to.fullPath },
      };
    }
  }
  return true;
});

export default router;
