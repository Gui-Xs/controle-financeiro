// Inicializar Dexie
const db = new Dexie('controleFinanceiro');
db.version(1).stores({
    transactions: '++id, date, description, amount, type'
});

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

// Função para adicionar transação
async function addTransaction(e) {
    e.preventDefault();
    
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const date = new Date();
    
    if (!description || isNaN(amount)) {
        alert('Por favor, preencha todos os campos corretamente');
        return;
    }
    
    try {
        const transaction = {
            date: date.getTime(),
            description,
            amount,
            type
        };
        
        await db.transactions.add(transaction);
        
        // Atualizar a tabela
        updateTransactionsTable();
        
        // Limpar o formulário
        document.getElementById('transactionForm').reset();
        
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        alert('Erro ao adicionar transação. Por favor, tente novamente.');
    }
}

// Função para atualizar a tabela de transações
async function updateTransactionsTable() {
    try {
        const transactions = await db.transactions.toArray();
        const tableBody = document.getElementById('transactionsTableBody');
        tableBody.innerHTML = '';
        
        transactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(new Date(transaction.date))}</td>
                <td>${transaction.description}</td>
                <td>${formatCurrency(transaction.amount)}</td>
                <td>${transaction.type}</td>
                <td>
                    <button onclick="deleteTransaction(${transaction.id})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tableBody.appendChild(row);
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
        const transactions = await db.transactions.toArray();
        let total = 0;
        
        transactions.forEach(transaction => {
            if (transaction.type === 'receita') {
                total += transaction.amount;
            } else {
                total -= transaction.amount;
            }
        });
        
        document.getElementById('balance').textContent = formatCurrency(total);
    } catch (error) {
        console.error('Erro ao atualizar saldo:', error);
    }
}

// Adicionar eventos quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    // Adicionar evento ao formulário de transação
    const transactionForm = document.getElementById('transactionForm');
    if (transactionForm) {
        transactionForm.addEventListener('submit', addTransaction);
    }
    
    // Atualizar a tabela inicialmente
    updateTransactionsTable();
});
