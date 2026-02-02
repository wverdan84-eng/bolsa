
import { createClient } from '@supabase/supabase-js';
import { Transaction } from '../types';

// CONFIGURAÇÃO DO SUPABASE
// Certifique-se de usar a URL e a Anon Key corretas do seu painel Supabase
const SUPABASE_URL = 'https://tmkeilhycxqchshbrzgg.supabase.co'; 
const SUPABASE_ANON_KEY = 'sua-chave-anon-real-aqui'; // A chave anterior era inválida para o Supabase

const isConfigured = () => {
  return SUPABASE_URL && 
         SUPABASE_URL.startsWith('https://') && 
         !SUPABASE_URL.includes('seu-projeto.supabase.co') &&
         SUPABASE_ANON_KEY.length > 20; // Validação básica de tamanho de JWT
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
    console.warn("Supabase inacessível ou erro de chave. Usando dados locais.");
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    return localData ? JSON.parse(localData) : [];
  }
}

export async function saveTransaction(transaction: Transaction): Promise<any> {
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
    return [transaction];
  }
}

export async function deleteTransactionFromDb(id: string): Promise<void> {
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
