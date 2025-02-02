import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

// Supabase client configuration with optimized settings
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storage: localStorage,
    storageKey: 'supabase.auth.token',
    flowType: 'pkce',
    debug: false
  },
  realtime: {
    params: {
      eventsPerSecond: 10
    }
  },
  global: {
    headers: {
      'x-application-name': 'stratejiyatirim'
    }
  },
  db: {
    schema: 'public'
  }
});

// Optimize channel management with connection pooling
class ChannelManager {
  private channels = new Map<string, ReturnType<typeof supabase.channel>>();
  private subscriptions = new Map<string, Set<string>>();

  getChannel(name: string, subscriptionId: string) {
    const channelKey = `${name}:${subscriptionId}`;
    let channel = this.channels.get(name);
    
    if (!channel) {
      channel = supabase.channel(name, {
        config: {
          broadcast: { ack: true },
          presence: { key: subscriptionId }
        }
      });

      this.channels.set(name, channel);
    }

    const subs = this.subscriptions.get(name) || new Set();
    subs.add(subscriptionId);
    this.subscriptions.set(name, subs);

    return channel;
  }

  removeSubscription(channelName: string, subscriptionId: string) {
    const subs = this.subscriptions.get(channelName);
    if (subs) {
      subs.delete(subscriptionId);
      
      if (subs.size === 0) {
        const channel = this.channels.get(channelName);
        if (channel) {
          channel.unsubscribe();
          this.channels.delete(channelName);
        }
        this.subscriptions.delete(channelName);
      }
    }
  }

  cleanup() {
    this.channels.forEach(channel => {
      channel.unsubscribe();
    });
    this.channels.clear();
    this.subscriptions.clear();
  }
}

export const channelManager = new ChannelManager();

// Add connection health check
const CONNECTION_CACHE_TIME = 30000; // 30 seconds
let lastConnectionCheck: number | null = null;
let cachedConnectionStatus = true;

export async function checkConnection(): Promise<boolean> {
  const now = Date.now();
  
  if (lastConnectionCheck && (now - lastConnectionCheck < CONNECTION_CACHE_TIME)) {
    return cachedConnectionStatus;
  }

  try {
    const { error } = await supabase.from('profiles').select('id').limit(1);
    cachedConnectionStatus = !error;
    lastConnectionCheck = now;
    return cachedConnectionStatus;
  } catch (err) {
    console.error('Supabase connection check failed:', err);
    cachedConnectionStatus = false;
    lastConnectionCheck = now;
    return false;
  }
}

// Add reconnection logic
let reconnectAttempt = 0;
const maxReconnectAttempts = 5;
const baseReconnectDelay = 1000;

export function setupReconnection() {
  const channel = channelManager.getChannel('system', 'reconnection');
  
  channel
    .on('system', { event: 'disconnected' }, () => {
      console.log('Disconnected from Supabase');
      
      if (reconnectAttempt < maxReconnectAttempts) {
        const delay = Math.min(baseReconnectDelay * Math.pow(2, reconnectAttempt), 30000);
        
        setTimeout(async () => {
          const isConnected = await checkConnection();
          
          if (isConnected) {
            console.log('Reconnected successfully');
            channel.subscribe();
            reconnectAttempt = 0;
          } else {
            reconnectAttempt++;
            if (reconnectAttempt < maxReconnectAttempts) {
              setupReconnection();
            } else {
              console.error('Max reconnection attempts reached');
            }
          }
        }, delay);
      }
    })
    .subscribe();

  return () => {
    channelManager.removeSubscription('system', 'reconnection');
  };
}

// Initialize reconnection handling
setupReconnection();