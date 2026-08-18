import { Link } from '@/contexts/RouterContext';
import { UtensilsCrossed, Bike, Store, Mail, Phone } from 'lucide-react';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-gray-400 mt-16 pb-20 sm:pb-0">
      <div className="max-w-7xl mx-auto px-6 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          <div className="col-span-2 md:col-span-1">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-9 h-9 rounded-xl bg-[#ff5847] flex items-center justify-center">
                <span className="text-white font-extrabold text-lg">F</span>
              </div>
              <span className="font-extrabold text-xl text-white">FoodHub</span>
            </div>
            <p className="text-sm leading-relaxed">
              Your favorite food, delivered fast. Order from the best restaurants in your city.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 text-sm">Company</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/about" className="hover:text-white transition-colors">About Us</Link></li>
              <li><Link to="/careers" className="hover:text-white transition-colors">Careers</Link></li>
              <li><Link to="/blog" className="hover:text-white transition-colors">Blog</Link></li>
              <li><Link to="/contact" className="hover:text-white transition-colors">Contact</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 text-sm">Partners</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/signup?role=VENDOR" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Store size={14} /> Become a Restaurant
                </Link>
              </li>
              <li>
                <Link to="/signup?role=RIDER" className="flex items-center gap-2 hover:text-white transition-colors">
                  <Bike size={14} /> Become a Rider
                </Link>
              </li>
              <li><Link to="/partners" className="hover:text-white transition-colors">Partner Portal</Link></li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-white mb-3 text-sm">Support</h4>
            <ul className="space-y-2 text-sm">
              <li className="flex items-center gap-2"><Mail size={14} /> support@foodhub.com</li>
              <li className="flex items-center gap-2"><Phone size={14} /> +1-800-FOODHUB</li>
              <li><Link to="/help" className="hover:text-white transition-colors">Help Center</Link></li>
              <li><Link to="/terms" className="hover:text-white transition-colors">Terms & Privacy</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-800 mt-8 pt-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-xs">© 2026 FoodHub. All rights reserved.</p>
          <div className="flex items-center gap-4 text-xs">
            <span>Made with <UtensilsCrossed size={12} className="inline text-[#ff5847]" /></span>
          </div>
        </div>
      </div>
    </footer>
  );
}
