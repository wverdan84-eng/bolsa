
import { createClient } from '@supabase/supabase-js';
import { Transaction } from '../types';

// CONFIGURAÇÃO REAL DO SUPABASE
const SUPABASE_URL = 'https://tmkeilhycxqchshbrzgg.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_V03NUwgy-r8hos471zZhyQ_KQUovBy3';

const isConfigured = () => {
  return SUPABASE_URL && 
         SUPABASE_URL.startsWith('https://') && 
         !SUPABASE_URL.includes('seu-projeto.supabase.co');
};

export const supabase = isConfigured() 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const LOCAL_STORAGE_KEY = 'bolsamaster_mvp_v1_db';

export async function getTransactions(): Promise<Transaction[]> {
  if (!supabase) {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    return localData ? JSON.parse(localData) : [];
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Supabase Offline. Carregando dados locais.");
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    return localData ? JSON.parse(localData) : [];
  }
}

export async function saveTransaction(transaction: Transaction): Promise<any> {
  // Sempre salva localmente primeiro para garantir persistência imediata (UX)
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  const current = localData ? JSON.parse(localData) : [];
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify([transaction, ...current]));

  if (!supabase) return [transaction];

  try {
    const { data, error } = await supabase
      .from('transactions')
      .insert([transaction])
      .select();
      
    if (error) throw error;
    return data;
  } catch (err) {
    console.error("Falha ao sincronizar com Supabase:", err);
    // Não lançamos erro aqui para não travar a UI, o dado já está no localStorage
    return [transaction];
  }
}

export async function deleteTransactionFromDb(id: string): Promise<void> {
  // Remove do local
  const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
  if (localData) {
    const updated = JSON.parse(localData).filter((t: Transaction) => t.id !== id);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
  }

  if (!supabase) return;

  try {
    const { error } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id);
      
    if (error) throw error;
  } catch (err) {
    console.error("Erro ao deletar na nuvem:", err);
  }
}
