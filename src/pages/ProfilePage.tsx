import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, Link } from '@/contexts/RouterContext';
import { useToast } from '@/contexts/ToastContext';
import { User, Mail, Phone, MapPin, Plus, Trash2, LogOut } from 'lucide-react';
import type { Address } from '@/types';
import { getAddresses, addAddress, deleteAddress } from '@/services/orderService';
import { supabase } from '@/lib/supabase';
import { Modal } from '@/components/ui/Modal';

export function ProfilePage() {
  const { profile, signOut, refreshProfile } = useAuth();
  const { navigate } = useRouter();
  const { showToast } = useToast();
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [addingAddress, setAddingAddress] = useState(false);
  const [newAddr, setNewAddr] = useState({ label: 'Home', address_line1: '', city: '', state: '', postal_code: '' });
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({ full_name: '', phone: '' });

  const loadAddresses = useCallback(async () => {
    if (!profile) return;
    try {
      const addrs = await getAddresses(profile.id);
      setAddresses(addrs);
    } catch (err) {
      console.error('Failed to load addresses:', err);
    }
  }, [profile]);

  useEffect(() => {
    if (profile) {
      setProfileForm({ full_name: profile.full_name, phone: profile.phone });
      loadAddresses();
    }
  }, [profile, loadAddresses]);

  async function handleAddAddress() {
    if (!profile || !newAddr.address_line1) return;
    try {
      await addAddress({
        user_id: profile.id,
        label: newAddr.label,
        address_line1: newAddr.address_line1,
        address_line2: '',
        city: newAddr.city,
        state: newAddr.state,
        postal_code: newAddr.postal_code,
        country: 'USA',
        latitude: null,
        longitude: null,
        formatted_address: `${newAddr.address_line1}, ${newAddr.city}, ${newAddr.state}`,
        delivery_instructions: '',
        is_default: addresses.length === 0,
      });
      showToast('Address added!');
      setAddingAddress(false);
      setNewAddr({ label: 'Home', address_line1: '', city: '', state: '', postal_code: '' });
      loadAddresses();
    } catch {
      showToast('Failed to add address', 'error');
    }
  }

  async function handleDeleteAddress(id: string) {
    try {
      await deleteAddress(id);
      loadAddresses();
      showToast('Address removed');
    } catch {
      showToast('Failed to remove address', 'error');
    }
  }

  async function handleSaveProfile() {
    if (!profile) return;
    try {
      const { supabase: sb } = { supabase };
      await sb.from('profiles').update({
        full_name: profileForm.full_name,
        phone: profileForm.phone,
      }).eq('id', profile.id);
      await refreshProfile();
      showToast('Profile updated!');
      setEditingProfile(false);
    } catch {
      showToast('Failed to update profile', 'error');
    }
  }

  if (!profile) {
    navigate('/signin');
    return null;
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <h1 className="text-2xl font-extrabold text-gray-900 mb-6">Profile</h1>

      <div className="card p-5 mb-4">
        <div className="flex items-center gap-4">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} alt={profile.full_name} className="w-16 h-16 rounded-full object-cover" />
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#ff5847] flex items-center justify-center">
              <span className="text-white font-extrabold text-2xl">{profile.full_name.charAt(0)}</span>
            </div>
          )}
          <div className="flex-1">
            <h2 className="font-bold text-lg text-gray-900">{profile.full_name}</h2>
            <p className="text-sm text-gray-500">{profile.email}</p>
            <span className="badge bg-[#ff5847]/10 text-[#ff5847] mt-1">{profile.role}</span>
          </div>
          <button onClick={() => setEditingProfile(true)} className="btn-outline btn-sm">Edit</button>
        </div>
      </div>

      <div className="card p-5 mb-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-bold text-gray-900">Saved Addresses</h2>
          <button onClick={() => setAddingAddress(true)} className="btn-outline btn-sm"><Plus size={16} /> Add</button>
        </div>
        {addresses.length === 0 ? (
          <p className="text-sm text-gray-500">No saved addresses yet.</p>
        ) : (
          <div className="space-y-2">
            {addresses.map((addr) => (
              <div key={addr.id} className="flex items-start gap-3 p-3 rounded-xl bg-gray-50">
                <MapPin size={18} className="text-[#ff5847] mt-0.5" />
                <div className="flex-1">
                  <p className="font-semibold text-sm">{addr.label}</p>
                  <p className="text-sm text-gray-500">{addr.address_line1}, {addr.city}, {addr.state} {addr.postal_code}</p>
                </div>
                <button onClick={() => handleDeleteAddress(addr.id)} className="p-1.5 rounded-lg hover:bg-red-50 text-gray-400 hover:text-red-500">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-2">
        {profile.role === 'CUSTOMER' && (
          <>
            <Link to="/orders" className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <span className="font-semibold text-sm">My Orders</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link to="/favorites" className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <span className="font-semibold text-sm">Favorites</span>
              <span className="text-gray-400">→</span>
            </Link>
            <Link to="/notifications" className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
              <span className="font-semibold text-sm">Notifications</span>
              <span className="text-gray-400">→</span>
            </Link>
          </>
        )}
        {profile.role === 'VENDOR' && (
          <Link to="/vendor" className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <span className="font-semibold text-sm">Vendor Dashboard</span>
            <span className="text-gray-400">→</span>
          </Link>
        )}
        {profile.role === 'RIDER' && (
          <Link to="/rider" className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <span className="font-semibold text-sm">Rider Dashboard</span>
            <span className="text-gray-400">→</span>
          </Link>
        )}
        {profile.role === 'ADMIN' && (
          <Link to="/admin" className="card p-4 flex items-center justify-between hover:shadow-md transition-shadow">
            <span className="font-semibold text-sm">Admin Dashboard</span>
            <span className="text-gray-400">→</span>
          </Link>
        )}
        <button
          onClick={() => { signOut(); navigate('/'); }}
          className="card p-4 w-full flex items-center gap-2 text-red-600 hover:bg-red-50 transition-colors"
        >
          <LogOut size={18} /> <span className="font-semibold text-sm">Sign Out</span>
        </button>
      </div>

      <Modal open={addingAddress} onClose={() => setAddingAddress(false)} title="Add Address">
        <div className="space-y-3">
          <div><label className="label">Label</label><input className="input" value={newAddr.label} onChange={e => setNewAddr({...newAddr, label: e.target.value})} /></div>
          <div><label className="label">Address</label><input className="input" value={newAddr.address_line1} onChange={e => setNewAddr({...newAddr, address_line1: e.target.value})} /></div>
          <div className="grid grid-cols-2 gap-3">
            <div><label className="label">City</label><input className="input" value={newAddr.city} onChange={e => setNewAddr({...newAddr, city: e.target.value})} /></div>
            <div><label className="label">State</label><input className="input" value={newAddr.state} onChange={e => setNewAddr({...newAddr, state: e.target.value})} /></div>
          </div>
          <div><label className="label">Postal Code</label><input className="input" value={newAddr.postal_code} onChange={e => setNewAddr({...newAddr, postal_code: e.target.value})} /></div>
          <button onClick={handleAddAddress} className="btn-primary btn-lg w-full">Add Address</button>
        </div>
      </Modal>

      <Modal open={editingProfile} onClose={() => setEditingProfile(false)} title="Edit Profile">
        <div className="space-y-3">
          <div><label className="label">Full Name</label><input className="input" value={profileForm.full_name} onChange={e => setProfileForm({...profileForm, full_name: e.target.value})} /></div>
          <div><label className="label">Phone</label><input className="input" value={profileForm.phone} onChange={e => setProfileForm({...profileForm, phone: e.target.value})} /></div>
          <button onClick={handleSaveProfile} className="btn-primary btn-lg w-full">Save Changes</button>
        </div>
      </Modal>
    </div>
  );
}
