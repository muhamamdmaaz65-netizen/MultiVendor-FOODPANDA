import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from '@/contexts/RouterContext';
import { Bell, CheckCheck } from 'lucide-react';
import type { Notification } from '@/types';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/services/orderService';
import { timeAgo } from '@/lib/utils';
import { EmptyState } from '@/components/ui/EmptyState';

export function NotificationsPage() {
  const { profile } = useAuth();
  const { navigate } = useRouter();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!profile) return;
    try {
      const data = await getNotifications(profile.id);
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    } finally {
      setLoading(false);
    }
  }, [profile]);

  useEffect(() => { load(); }, [load]);

  async function handleMarkAll() {
    if (!profile) return;
    await markAllNotificationsRead(profile.id);
    load();
  }

  async function handleClick(notif: Notification) {
    if (!notif.is_read) {
      await markNotificationRead(notif.id);
      load();
    }
    if (notif.data?.order_id) {
      navigate(`/orders/${notif.data.order_id}`);
    }
  }

  if (!profile) { navigate('/signin'); return null; }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-6"><div className="skeleton h-64" /></div>;

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-20 sm:pb-6">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-extrabold text-gray-900">Notifications</h1>
        {unreadCount > 0 && (
          <button onClick={handleMarkAll} className="btn-outline btn-sm">
            <CheckCheck size={16} /> Mark all read
          </button>
        )}
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={<Bell size={32} className="text-gray-400" />}
          title="No notifications"
          description="You'll see order updates and promotions here."
        />
      ) : (
        <div className="space-y-2">
          {notifications.map((notif) => (
            <button
              key={notif.id}
              onClick={() => handleClick(notif)}
              className={`card p-4 w-full text-left flex items-start gap-3 transition-colors ${notif.is_read ? '' : 'border-l-4 border-l-[#ff5847]'}`}
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
                notif.type === 'ORDER' ? 'bg-blue-50' : notif.type === 'PROMOTION' ? 'bg-orange-50' : 'bg-gray-100'
              }`}>
                <Bell size={18} className={notif.type === 'ORDER' ? 'text-blue-600' : notif.type === 'PROMOTION' ? 'text-orange-600' : 'text-gray-500'} />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <p className="font-semibold text-sm text-gray-900">{notif.title}</p>
                  <span className="text-xs text-gray-400 flex-shrink-0">{timeAgo(notif.created_at)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-0.5">{notif.message}</p>
              </div>
              {!notif.is_read && <div className="w-2 h-2 rounded-full bg-[#ff5847] flex-shrink-0 mt-2" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
