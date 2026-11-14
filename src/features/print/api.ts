import { requireSupabase } from '@/lib/supabase';

export type PrintOrder = {
  id: string;
  start_month: string;
  status: 'pending' | 'paid' | 'submitted' | 'failed' | 'shipped' | 'cancelled';
  amount_chf: number;
  discount_percent: number;
  created_at: string;
};

/** Startet die Bezahlung. Gibt die Adresse der Stripe-Bezahlseite zurück. */
export async function startCheckout(startMonth: string, returnUrl: string): Promise<string> {
  const { data, error } = await requireSupabase().functions.invoke('create-print-checkout', {
    body: { start_month: startMonth, return_url: returnUrl },
  });
  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    throw new Error(status === 503 || status === 403 ? 'not_available' : 'failed');
  }
  return (data as { url: string }).url;
}

export async function listOrders(): Promise<PrintOrder[]> {
  const { data, error } = await requireSupabase()
    .from('print_orders' as never)
    .select('id, start_month, status, amount_chf, discount_percent, created_at')
    .order('created_at', { ascending: false })
    .limit(20);
  if (error) throw error;
  return (data ?? []) as PrintOrder[];
}
