
import { createClient } from '@supabase/supabase-js';
import { Transaction } from '../types';
const SUPABASE_URL = 'https://tmkeilhycxqchshbrzgg.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_V03NUwgy-r8hos471zZhyQ_KQUovBy3'; 

const isConfigured = () => {
  return SUPABASE_URL && 
         SUPABASE_URL.startsWith('https://') && 
         !SUPABASE_URL.includes('seu-projeto.supabase.co') &&
         SUPABASE_ANON_KEY.length > 20;
};

export const supabase = isConfigured() 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const LOCAL_STORAGE_KEY = 'bolsamaster_mvp_v1_db';

export async function getTransactions(): Promise<Transaction[]> {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  const localList: Transaction[] = localData ? JSON.parse(localData) : [];

  if (!supabase) return localList;

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    
    // Sincroniza local com remoto (opcional: estratégia de merge)
    if (data && data.length > localList.length) {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(data));
      return data;
    }
    return localList;
  } catch (err) {
    return localList;
  }
}

export async function saveTransaction(transaction: Transaction): Promise<void> {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  const current = localData ? JSON.parse(localData) : [];
  const updated = [transaction, ...current];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));

  if (supabase) {
    try {
      await supabase.from('transactions').insert([transaction]);
    } catch (err) {
      console.warn("Falha ao sincronizar com nuvem. Salvo localmente.");
    }
  }
}

export async function deleteTransactionFromDb(id: string): Promise<void> {
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localData) {
    const updated = JSON.parse(localData).filter((t: Transaction) => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  if (supabase) {
    try {
      await supabase.from('transactions').delete().eq('id', id);
    } catch (err) {
      console.error("Erro ao deletar na nuvem.");
    }
  }
}
