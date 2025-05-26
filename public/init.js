async function initializeApp() {
    try {
        console.log('Iniciando aplicativo...');
        
        // Verificar se o DOM está pronto
        if (document.readyState !== 'loading') {
            await initializeFinanceControl();
        } else {
            document.addEventListener('DOMContentLoaded', initializeFinanceControl);
        }
    } catch (error) {
        console.error('Erro ao iniciar o aplicativo:', error);
        alert('Erro ao iniciar o aplicativo. Por favor, recarregue a página.');
    }
}

async function initializeFinanceControl() {
    try {
        // Verificar se o Firebase está inicializado
        if (!window.db) {
            throw new Error('Firebase não inicializado');
        }

        // Inicializar o FinanceControl
        const financeControl = new FinanceControl();
        
        // Aguardar a inicialização completa
        await financeControl.init();
        
        console.log('Aplicativo inicializado com sucesso');
    } catch (error) {
        console.error('Erro na inicialização do FinanceControl:', error);
        throw error;
    }
}

// Iniciar o processo quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', initializeApp);
