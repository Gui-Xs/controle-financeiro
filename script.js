// Inicializar Firestore
const db = firebase.firestore();

// Referência para a coleção de transações
const transactionsRef = db.collection('transactions');

// Função para formatar moeda
function formatCurrency(value) {
    return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

// Função para atualizar os totais
function updateTotals(transactions) {
    let totalReceitas = 0;
    let totalDespesas = 0;
    let totalCartao = 0;

    transactions.forEach(transaction => {
        if (transaction.type === 'receita') {
            totalReceitas += parseFloat(transaction.amount);
        } else {
            totalDespesas += parseFloat(transaction.amount);
            if (transaction.paymentMethod === 'cartao_credito') {
                totalCartao += parseFloat(transaction.amount);
            }
        }
    });

    document.getElementById('totalReceitas').textContent = formatCurrency(totalReceitas);
    document.getElementById('totalDespesas').textContent = formatCurrency(totalDespesas);
    document.getElementById('totalCartao').textContent = formatCurrency(totalCartao);
    document.getElementById('saldoTotal').textContent = formatCurrency(totalReceitas - totalDespesas);
}

// Função para atualizar o gráfico
function updateChart(transactions) {
    const chartContainer = document.querySelector('.chart-container');
    const canvas = document.getElementById('expensesChart');
    
    // Limpar o conteúdo anterior
    chartContainer.innerHTML = '<canvas id="expensesChart"></canvas>';
    
    // Filtrar apenas despesas
    const expenses = transactions.filter(t => t.type === 'despesa');
    const categories = {};

    expenses.forEach(expense => {
        if (categories[expense.category]) {
            categories[expense.category] += parseFloat(expense.amount);
        } else {
            categories[expense.category] = parseFloat(expense.amount);
        }
    });

    const data = {
        labels: Object.keys(categories),
        datasets: [{
            data: Object.values(categories),
            backgroundColor: [
                '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEEAD',
                '#FF6F69', '#6B5B95', '#88B04B', '#F7CAC9', '#92A8D1',
                '#955251', '#B565A7', '#003049', '#D62828', '#F77F00'
            ]
        }]
    };

    const config = {
        type: 'doughnut',
        data: data,
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    };

    new Chart(canvas, config);
}

// Função para adicionar transação
document.getElementById('transactionForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const transaction = {
        description: document.getElementById('description').value,
        amount: document.getElementById('amount').value,
        type: document.getElementById('type').value,
        category: document.getElementById('category').value,
        paymentMethod: document.getElementById('paymentMethod').value,
        date: document.getElementById('date').value,
        isRecurring: document.getElementById('isRecurring').checked,
        frequency: document.getElementById('frequency').value,
        endDate: document.getElementById('endDate').value,
        timestamp: firebase.firestore.FieldValue.serverTimestamp()
    };

    try {
        await transactionsRef.add(transaction);
        alert('Transação adicionada com sucesso!');
        e.target.reset();
        // Atualizar a lista de transações
        loadTransactions();
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        alert('Erro ao adicionar transação. Por favor, tente novamente.');
    }
});

// Função para carregar transações
async function loadTransactions() {
    try {
        const snapshot = await transactionsRef.orderBy('timestamp', 'desc').get();
        const transactions = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        // Atualizar totais
        updateTotals(transactions);
        // Atualizar gráfico
        updateChart(transactions);
        
    } catch (error) {
        console.error('Erro ao carregar transações:', error);
    }
}

// Carregar transações quando o documento estiver pronto
document.addEventListener('DOMContentLoaded', loadTransactions);
