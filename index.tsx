
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';

const mountApp = () => {
  const rootElement = document.getElementById('root');
  if (!rootElement) {
    console.error("Não foi possível encontrar o elemento root.");
    return;
  }

  try {
    const root = ReactDOM.createRoot(rootElement);
    root.render(
      <React.StrictMode>
        <App />
      </React.StrictMode>
    );
  } catch (error) {
    console.error("Erro fatal durante a renderização:", error);
    rootElement.innerHTML = `
      <div style="padding: 20px; text-align: center; font-family: sans-serif;">
        <h1 style="color: #e11d48;">Erro ao Carregar</h1>
        <p>Houve um problema técnico ao iniciar a aplicação.</p>
        <pre style="background: #f1f5f9; padding: 10px; border-radius: 8px; font-size: 12px; display: inline-block;">${error instanceof Error ? error.message : String(error)}</pre>
      </div>
    `;
  }
};

// Garantir que o DOM está pronto
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp);
} else {
  mountApp();
}
