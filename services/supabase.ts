
import { createClient } from '@supabase/supabase-js';

// 1. Substitua os valores abaixo com os dados do seu projeto em Project Settings > API
const SUPABASE_URL =https://tmkeilhycxqchshbrzgg.supabase.co; 
const SUPABASE_ANON_KEY =sb_publishable_V03NUwgy-r8hos471zZhyQ_KQUovBy3;

// Validação mais simples para permitir que o desenvolvedor use URLs reais
const isConfigured = () => {
  return SUPABASE_URL && 
         SUPABASE_URL.startsWith('https://') && 
         !SUPABASE_URL.includes('seu-projeto.supabase.co');
};

export const supabase = isConfigured() 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

const LOCAL_STORAGE_KEY = 'bolsamaster_fallback_db';

export async function getTransactions() {
  if (!supabase) {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    return localData ? JSON.parse(localData) : [];
  }

  try {
    const { data, error } = await supabase
      .from('transactions')
      .select('*')
      .order('date', { ascending: false });
    
    if (error) {
      console.error("Erro Supabase (Get):", error.message);
      throw error;
    }
    return data;
  } catch (err) {
    console.error("Falha ao buscar dados no Supabase:", err);
    return [];
  }
}

export async function saveTransaction(transaction: any) {
  if (!supabase) {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    const transactions = localData ? JSON.parse(localData) : [];
    const updated = [transaction, ...transactions];
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(updated));
    return [transaction];
  }

  const { data, error } = await supabase
    .from('transactions')
    .insert([transaction])
    .select();
    
  if (error) {
    console.error("Erro Supabase (Insert):", error.message);
    throw error;
  }
  return data;
}

export async function deleteTransactionFromDb(id: string) {
  if (!supabase) {
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    if (localData) {
      const transactions = JSON.parse(localData).filter((t: any) => t.id !== id);
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(transactions));
    }
    return;
  }

  const { error } = await supabase
    .from('transactions')
    .delete()
    .eq('id', id);
    
  if (error) {
    console.error("Erro Supabase (Delete):", error.message);
    throw error;
  }
}
