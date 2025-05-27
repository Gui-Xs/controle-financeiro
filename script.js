// Inicializar Dexie
let db;

// Funções auxiliares
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatDate(date) {
    return new Intl.DateTimeFormat('pt-BR').format(date);
}

// Função para inicializar o banco de dados
async function initializeDatabase() {
    try {
        db = new Dexie('controleFinanceiro');
        db.version(1).stores({
            transactions: '++id, date, description, amount, type, category, paymentMethod, installments, isRecurring, frequency, endDate'
        });
        console.log('Banco de dados inicializado com sucesso');
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
    }
}

// Função para adicionar transação
async function addTransaction(e) {
    e.preventDefault();
    
    const description = document.getElementById('description')?.value;
    const amount = parseFloat(document.getElementById('amount')?.value);
    const type = document.getElementById('type')?.value;
    const category = document.getElementById('category')?.value;
    const paymentMethod = document.getElementById('paymentMethod')?.value;
    const installments = parseInt(document.getElementById('installments')?.value) || 1;
    const isRecurring = document.getElementById('isRecurring')?.checked || false;
    const frequency = document.getElementById('frequency')?.value;
    const endDate = document.getElementById('endDate')?.value;
    const date = new Date(document.getElementById('date')?.value || new Date());
    
    if (!description || isNaN(amount)) {
        alert('Por favor, preencha todos os campos corretamente');
        return;
    }
    
    try {
        if (!db) {
            await initializeDatabase();
        }

        const transaction = {
            date: date.getTime(),
            description,
            amount,
            type,
            category,
            paymentMethod,
            installments,
            isRecurring,
            frequency,
            endDate
        };
        
        await db.transactions.add(transaction);
        
        // Atualizar a tabela
        updateTransactionsTable();
        
        // Limpar o formulário
        document.getElementById('transactionForm')?.reset();
        
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        alert('Erro ao adicionar transação. Por favor, tente novamente.');
    }
}

// Função para atualizar a tabela de transações
async function updateTransactionsTable() {
    try {
        if (!db) {
            await initializeDatabase();
        }

        const transactions = await db.transactions.toArray();
        const transactionsList = document.getElementById('transactionsList');
        
        if (!transactionsList) {
            console.error('Elemento transactionsList não encontrado');
            return;
        }

        transactionsList.innerHTML = '';
        
        if (transactions.length === 0) {
            transactionsList.innerHTML = '<p class="no-transactions">Nenhuma transação registrada.</p>';
            return;
        }

        transactions.forEach(transaction => {
            const item = document.createElement('li');
            item.className = 'transaction-item';
            
            const date = new Date(transaction.date);
            item.innerHTML = `
                <div class="transaction-details">
                    <div class="transaction-info">
                        <span class="transaction-date">${formatDate(date)}</span>
                        <span class="transaction-description">${transaction.description}</span>
                    </div>
                    <div class="transaction-amount ${transaction.type}">
                        ${formatCurrency(transaction.amount)}
                    </div>
                </div>
                <div class="transaction-actions">
                    <button onclick="deleteTransaction(${transaction.id})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            transactionsList.appendChild(item);
        });
        
        // Atualizar o saldo
        updateBalance();
    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
    }
}

// Função para deletar transação
async function deleteTransaction(id) {
    if (confirm('Tem certeza que deseja deletar esta transação?')) {
        try {
            if (!db) {
                await initializeDatabase();
            }
            
            await db.transactions.delete(id);
            updateTransactionsTable();
        } catch (error) {
            console.error('Erro ao deletar transação:', error);
            alert('Erro ao deletar transação. Por favor, tente novamente.');
        }
    }
}

// Função para atualizar o saldo
async function updateBalance() {
    try {
        if (!db) {
            await initializeDatabase();
        }

        const transactions = await db.transactions.toArray();
        const totals = {
            receitas: 0,
            despesas: 0,
            total: 0
        };
        
        transactions.forEach(transaction => {
            const amount = transaction.amount || 0;
            
            if (transaction.type === 'receita') {
                totals.receitas += amount;
                totals.total += amount;
            } else {
                totals.despesas += amount;
                totals.total -= amount;
            }
        });
        
        const totalsElement = document.getElementById('totals');
        if (totalsElement) {
            totalsElement.innerHTML = `
                <div class="total-card">
                    <h3>Receitas</h3>
                    <p>${formatCurrency(totals.receitas)}</p>
                </div>
                <div class="total-card">
                    <h3>Despesas</h3>
                    <p>${formatCurrency(totals.despesas)}</p>
                </div>
                <div class="total-card">
                    <h3>Saldo</h3>
                    <p>${formatCurrency(totals.total)}</p>
                </div>
            `;
        }
    } catch (error) {
        console.error('Erro ao atualizar saldo:', error);
    }
}

// Adicionar eventos quando a página carregar
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await initializeDatabase();
        
        // Adicionar evento ao formulário de transação
        const transactionForm = document.getElementById('transactionForm');
        if (transactionForm) {
            transactionForm.addEventListener('submit', addTransaction);
        }
        
        // Atualizar a tabela inicialmente
        updateTransactionsTable();
        
        // Configurar filtro de categoria
        const categoryFilter = document.getElementById('categoryFilter');
        if (categoryFilter) {
            categoryFilter.addEventListener('change', updateTransactionsTable);
        }
        
        // Configurar filtro de mês
        const monthFilter = document.getElementById('monthFilter');
        if (monthFilter) {
            monthFilter.addEventListener('change', updateTransactionsTable);
        }
    } catch (error) {
        console.error('Erro ao inicializar:', error);
    }
});
