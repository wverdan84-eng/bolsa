
import { createClient } from '@supabase/supabase-js';

/**
 * 💡 CONFIGURAÇÃO DO SUPABASE
 * 1. Vá em supabase.com -> Seu Projeto -> Project Settings -> API
 * 2. Copie a 'Project URL' e a 'anon public key'
 * 3. Substitua os valores abaixo:
 */
const SUPABASE_URL = 'https://seu-projeto.supabase.co'; // Deve começar com https://
const SUPABASE_ANON_KEY = 'sua-chave-anon-aqui';

// Função para validar se as chaves foram preenchidas corretamente pelo desenvolvedor
const isConfigured = () => {
  return SUPABASE_URL && 
         SUPABASE_URL.startsWith('https://') && 
         !SUPABASE_URL.includes('seu-projeto.supabase.co') &&
         SUPABASE_ANON_KEY !== 'sua-chave-anon-aqui';
};

// Inicializa o cliente apenas se a URL for válida para evitar o erro "Invalid supabaseUrl"
export const supabase = isConfigured() 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Chave para o fallback local enquanto o banco não está pronto
const LOCAL_STORAGE_KEY = 'bolsamaster_fallback_db';

export async function getTransactions() {
  if (!supabase) {
    console.warn("⚠️ Supabase não configurado em services/supabase.ts. Usando armazenamento local temporário.");
    const localData = localStorage.getItem(LOCAL_STORAGE_KEY);
    return localData ? JSON.parse(localData) : [];
  }

  const { data, error } = await supabase
    .from('transactions')
    .select('*')
    .order('date', { ascending: false });
  
  if (error) throw error;
  return data;
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
    
  if (error) throw error;
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
    
  if (error) throw error;
}
