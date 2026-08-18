import { useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, Link } from '@/contexts/RouterContext';
import { useToast } from '@/contexts/ToastContext';
import type { UserRole } from '@/types';
import { UtensilsCrossed, Store, Bike, User, Mail, Lock, ArrowRight } from 'lucide-react';

export function AuthPage({ mode }: { mode: 'signin' | 'signup' }) {
  const { signIn, signUp } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<UserRole>('CUSTOMER');
  const [loading, setLoading] = useState(false);

  const isSignUp = mode === 'signup';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);

    try {
      if (isSignUp) {
        const { error } = await signUp(email, password, fullName, role);
        if (error) {
          showToast(error, 'error');
        } else {
          showToast('Account created! Welcome to FoodHub.');
          navigate('/');
        }
      } else {
        const { error } = await signIn(email, password);
        if (error) {
          showToast(error, 'error');
        } else {
          showToast('Welcome back!');
          navigate('/');
        }
      }
    } catch {
      showToast('An error occurred. Please try again.', 'error');
    } finally {
      setLoading(false);
    }
  }

  const roleOptions = [
    { value: 'CUSTOMER' as UserRole, label: 'Customer', icon: User, desc: 'Order food from restaurants' },
    { value: 'VENDOR' as UserRole, label: 'Restaurant', icon: Store, desc: 'Sell food on FoodHub' },
    { value: 'RIDER' as UserRole, label: 'Rider', icon: Bike, desc: 'Deliver food and earn' },
  ];

  return (
    <div className="min-h-screen flex flex-col lg:flex-row">
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-[#ff5847] to-[#e04335] relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=1200')] bg-cover bg-center opacity-20" />
        <div className="relative z-10 flex flex-col justify-between p-12 text-white">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center">
              <span className="text-[#ff5847] font-extrabold text-xl">F</span>
            </div>
            <span className="font-extrabold text-2xl">FoodHub</span>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold mb-4 text-balance">
              {isSignUp ? 'Join the FoodHub family today' : 'Welcome back to FoodHub'}
            </h1>
            <p className="text-lg text-white/80 max-w-md">
              {isSignUp
                ? 'Order from the best restaurants, become a partner, or start earning as a rider.'
                : 'Sign in to order your favorite food, track deliveries, and manage your account.'}
            </p>
          </div>
          <div className="flex items-center gap-6 text-white/60 text-sm">
            <span>10+ Restaurants</span>
            <span>50+ Food Items</span>
            <span>Fast Delivery</span>
          </div>
        </div>
      </div>

      <div className="flex-1 flex items-center justify-center p-6 bg-gray-50">
        <div className="w-full max-w-md">
          <Link to="/" className="flex items-center gap-2 mb-8 lg:hidden">
            <div className="w-10 h-10 rounded-xl bg-[#ff5847] flex items-center justify-center">
              <UtensilsCrossed size={20} className="text-white" />
            </div>
            <span className="font-extrabold text-2xl text-gray-900">FoodHub</span>
          </Link>

          <h2 className="text-2xl font-extrabold text-gray-900 mb-1">
            {isSignUp ? 'Create your account' : 'Sign in to your account'}
          </h2>
          <p className="text-gray-500 text-sm mb-6">
            {isSignUp ? 'Choose your role and get started' : 'Enter your credentials below'}
          </p>

          {isSignUp && (
            <div className="mb-5">
              <label className="label">I want to join as</label>
              <div className="grid grid-cols-3 gap-2">
                {roleOptions.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setRole(opt.value)}
                    className={`p-3 rounded-xl border-2 transition-all text-center ${
                      role === opt.value
                        ? 'border-[#ff5847] bg-[#ff5847]/5'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                  >
                    <opt.icon size={20} className={role === opt.value ? 'text-[#ff5847]' : 'text-gray-400'} />
                    <p className={`text-xs font-semibold mt-1 ${role === opt.value ? 'text-[#ff5847]' : 'text-gray-600'}`}>
                      {opt.label}
                    </p>
                  </button>
                ))}
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {isSignUp && (
              <div>
                <label className="label">Full Name</label>
                <div className="relative">
                  <User size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="John Doe"
                    className="input pl-10"
                  />
                </div>
              </div>
            )}

            <div>
              <label className="label">Email</label>
              <div className="relative">
                <Mail size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="input pl-10"
                />
              </div>
            </div>

            <div>
              <label className="label">Password</label>
              <div className="relative">
                <Lock size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="password"
                  required
                  minLength={6}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input pl-10"
                />
              </div>
            </div>

            <button type="submit" disabled={loading} className="btn-primary btn-lg w-full">
              {loading ? 'Please wait...' : isSignUp ? 'Create Account' : 'Sign In'}
              {!loading && <ArrowRight size={18} />}
            </button>
          </form>

          <p className="text-center text-sm text-gray-500 mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <Link to={isSignUp ? '/signin' : '/signup'} className="text-[#ff5847] font-semibold hover:underline">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </Link>
          </p>

          <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-100">
            <p className="text-xs text-blue-700 font-semibold mb-1">Demo Accounts (password: demo1234)</p>
            <p className="text-xs text-blue-600">Customer: demo.customer1@foodhub.com</p>
            <p className="text-xs text-blue-600">Vendor: demo.vendor1@foodhub.com</p>
            <p className="text-xs text-blue-600">Rider: demo.rider1@foodhub.com</p>
            <p className="text-xs text-blue-600">Admin: demo.admin@foodhub.com</p>
          </div>
        </div>
      </div>
    </div>
  );
}
