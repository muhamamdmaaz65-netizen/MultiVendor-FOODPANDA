import { Suspense, lazy } from 'react';
import { AuthProvider, useAuth } from '@/contexts/AuthContext';
import { ToastProvider } from '@/contexts/ToastContext';
import { LocationProvider } from '@/contexts/LocationContext';
import { RouterProvider, useRouter, matchRoute, Link } from '@/contexts/RouterContext';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { MobileNav } from '@/components/MobileNav';

import { HomePage } from '@/pages/HomePage';
import { SearchPage } from '@/pages/SearchPage';
import { AuthPage } from '@/pages/AuthPage';
import { RestaurantDetailPage } from '@/pages/RestaurantDetailPage';
import { CartPage } from '@/pages/CartPage';
import { CheckoutPage } from '@/pages/CheckoutPage';
import { OrdersPage } from '@/pages/OrdersPage';
import { OrderTrackingPage } from '@/pages/OrderTrackingPage';
import { VendorDashboard } from '@/pages/VendorDashboard';
import { RiderDashboard } from '@/pages/RiderDashboard';
import { AdminDashboard } from '@/pages/AdminDashboard';
import { ProfilePage } from '@/pages/ProfilePage';
import { FavoritesPage } from '@/pages/FavoritesPage';
import { NotificationsPage } from '@/pages/NotificationsPage';

function AppRoutes() {
  const { path } = useRouter();
  const { profile, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-12 h-12 rounded-full border-4 border-[#ff5847] border-t-transparent animate-spin" />
      </div>
    );
  }

  const pathOnly = path.split('?')[0];

  // Auth pages - no layout
  if (pathOnly === '/signin') return <AuthPage mode="signin" />;
  if (pathOnly === '/signup') return <AuthPage mode="signup" />;

  // Route matching
  const restaurantMatch = matchRoute('/restaurant/:slug', pathOnly);
  const orderMatch = matchRoute('/orders/:orderId', pathOnly);

  let content: React.ReactNode;

  if (pathOnly === '/' || pathOnly === '') {
    content = <HomePage />;
  } else if (pathOnly === '/search') {
    content = <SearchPage />;
  } else if (restaurantMatch) {
    content = <RestaurantDetailPage slug={restaurantMatch.slug} />;
  } else if (pathOnly === '/cart') {
    content = <CartPage />;
  } else if (pathOnly === '/checkout') {
    content = <CheckoutPage />;
  } else if (pathOnly === '/orders') {
    content = <OrdersPage />;
  } else if (orderMatch) {
    content = <OrderTrackingPage orderId={orderMatch.orderId} />;
  } else if (pathOnly === '/vendor') {
    content = <VendorDashboard />;
  } else if (pathOnly === '/rider') {
    content = <RiderDashboard />;
  } else if (pathOnly === '/admin') {
    content = <AdminDashboard />;
  } else if (pathOnly === '/profile') {
    content = <ProfilePage />;
  } else if (pathOnly === '/favorites') {
    content = <FavoritesPage />;
  } else if (pathOnly === '/notifications') {
    content = <NotificationsPage />;
  } else {
    content = (
      <div className="max-w-3xl mx-auto px-4 py-20 text-center">
        <h1 className="text-4xl font-extrabold text-gray-900 mb-2">404</h1>
        <p className="text-gray-500 mb-6">Page not found</p>
        <Link to="/" className="btn-primary btn-md">Go Home</Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[#f8f9fb]">
      <Header />
      <main className="flex-1">{content}</main>
      <Footer />
      <MobileNav />
    </div>
  );
}

function App() {
  return (
    <RouterProvider>
      <AuthProvider>
        <LocationProvider>
          <ToastProvider>
            <AppRoutes />
          </ToastProvider>
        </LocationProvider>
      </AuthProvider>
    </RouterProvider>
  );
}

export default App;
