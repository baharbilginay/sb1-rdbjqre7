import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNotifications } from '../lib/notifications';

export function useAdmin() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const { addNotification } = useNotifications();

  useEffect(() => {
    let isMounted = true;

    async function checkAdminStatus() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        
        if (!session?.user) {
          setIsAdmin(false);
          setIsLoading(false);
          return;
        }

        const { data, error } = await supabase
          .from('admin_users')
          .select('*')
          .eq('user_id', session.user.id)
          .maybeSingle(); // Use maybeSingle instead of single to handle no rows case

        if (!isMounted) return;

        if (error && error.code !== 'PGRST116') {
          console.error('Admin check error:', error);
          addNotification({
            type: 'error',
            title: 'Hata',
            message: 'Yönetici kontrolü yapılırken bir hata oluştu'
          });
        }

        setIsAdmin(!!data); // Convert to boolean
        setIsLoading(false);
      } catch (error) {
        if (!isMounted) return;
        console.error('Admin status check failed:', error);
        setIsAdmin(false);
        setIsLoading(false);
      }
    }

    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      if (isMounted) {
        checkAdminStatus();
      }
    });

    return () => {
      isMounted = false;
      subscription.unsubscribe();
    };
  }, [addNotification]);

  return { isAdmin, isLoading };
}