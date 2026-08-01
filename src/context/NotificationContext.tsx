import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { supabase } from '@/lib/supabase';
import { useAuth } from './AuthContext';
import type { Notification } from '@/lib/supabase';

interface NotificationContextValue {
  notifications: Notification[];
  unreadCount: number;
  markAllRead: () => Promise<void>;
  refresh: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextValue | undefined>(undefined);

export function NotificationProvider({ children }: { children: ReactNode }) {
  const { session } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { i18n } = useTranslation();

  const refresh = async () => {
    if (!session) {
      setNotifications([]);
      return;
    }
    const { data } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', session.user.id)
      .order('created_at', { ascending: false })
      .limit(20);
    setNotifications((data as Notification[]) ?? []);
  };

  useEffect(() => {
    refresh();
    if (!session) return;
    const channel = supabase
      .channel('notifications')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${session.user.id}` },
        () => refresh()
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [session, i18n.language]);

  const markAllRead = async () => {
    if (!session) return;
    await supabase
      .from('notifications')
      .update({ is_read: true })
      .eq('user_id', session.user.id)
      .eq('is_read', false);
    refresh();
  };

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  return (
    <NotificationContext.Provider value={{ notifications, unreadCount, markAllRead, refresh }}>
      {children}
    </NotificationContext.Provider>
  );
}

export function useNotifications() {
  const ctx = useContext(NotificationContext);
  if (!ctx) throw new Error('useNotifications must be used within NotificationProvider');
  return ctx;
}
