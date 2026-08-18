import { Home, Search, ClipboardList, Heart, User } from 'lucide-react';
import { Link, useRouter } from '@/contexts/RouterContext';
import { useAuth } from '@/contexts/AuthContext';

export function MobileNav() {
  const { path } = useRouter();
  const { profile } = useAuth();

  if (!profile || profile.role !== 'CUSTOMER') return null;

  const items = [
    { icon: Home, label: 'Home', href: '/' },
    { icon: Search, label: 'Search', href: '/search' },
    { icon: ClipboardList, label: 'Orders', href: '/orders' },
    { icon: Heart, label: 'Favorites', href: '/favorites' },
    { icon: User, label: 'Profile', href: '/profile' },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 glass border-t border-gray-100 sm:hidden">
      <div className="flex items-center justify-around h-16">
        {items.map((item) => {
          const active = path === item.href || (item.href !== '/' && path.startsWith(item.href));
          return (
            <Link
              key={item.href}
              to={item.href}
              className={`flex flex-col items-center gap-0.5 px-3 py-1.5 transition-colors ${
                active ? 'text-[#ff5847]' : 'text-gray-500'
              }`}
            >
              <item.icon size={22} className={active ? 'fill-[#ff5847]/10' : ''} />
              <span className="text-[10px] font-semibold">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
