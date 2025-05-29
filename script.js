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
        // Inicializar Dexie
        const db = new Dexie('controleFinanceiro');
        
        // Definir a versão mais recente do banco
        db.version(2).stores({
            transactions: '++id, date, description, amount, type, category, paymentMethod, installments, isRecurring, frequency, endDate'
        });
        
        // Garantir que o banco seja inicializado
        await db.open();
        console.log('Banco de dados inicializado com sucesso');
        
        // Exportar o banco de dados para uso global
        window.db = db;
    } catch (error) {
        console.error('Erro ao inicializar banco de dados:', error);
        throw error;
    }
}

// Função para exportar JSON
async function exportJSON() {
    try {
        if (!db) {
            await initializeDatabase();
        }

        const transactions = await db.transactions.toArray();
        const jsonString = JSON.stringify(transactions, null, 2);
        
        const blob = new Blob([jsonString], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'transacoes.json';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        alert('Arquivo JSON exportado com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        alert('Erro ao exportar JSON. Por favor, tente novamente.');
    }
}

// Função para importar JSON
async function importJSON(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonString = e.target.result;
                const transactions = JSON.parse(jsonString);
                
                if (!db) {
                    await initializeDatabase();
                }
                
                // Adicionar transações
                for (const transaction of transactions) {
                    await db.transactions.add(transaction);
                }
                
                // Atualizar tabela
                updateTransactionsTable();
                
                alert('Transações importadas com sucesso!');
            } catch (error) {
                console.error('Erro ao processar JSON:', error);
                alert('Erro ao processar o JSON. Por favor, tente novamente.');
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Erro ao importar JSON:', error);
        alert('Erro ao importar JSON. Por favor, tente novamente.');
    }
}

// Função para importar comprovante
async function importReceipt(event) {
    try {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = await Tesseract.recognize(
                    e.target.result,
                    'por',
                    {
                        logger: m => console.log(m)
                    }
                );
                
                const content = text.data.text;
                const transactions = parseReceiptContent(content);
                
                if (!db) {
                    await initializeDatabase();
                }
                
                // Adicionar transações
                for (const transaction of transactions) {
                    await db.transactions.add(transaction);
                }
                
                // Atualizar tabela
                updateTransactionsTable();
                
                alert('Transações importadas com sucesso!');
            } catch (error) {
                console.error('Erro ao processar comprovante:', error);
                alert('Erro ao processar o comprovante. Por favor, tente novamente.');
            }
        };
        reader.readAsArrayBuffer(file);
    } catch (error) {
        console.error('Erro ao importar comprovante:', error);
        alert('Erro ao importar comprovante. Por favor, tente novamente.');
    }
}

// Função para parsear conteúdo do comprovante
function parseReceiptContent(text) {
    const transactions = [];
    const lines = text.split('\n');
    
    // Procurar por padrões comuns em comprovantes
    let currentDate;
    let currentDescription;
    let currentAmount;
    
    for (const line of lines) {
        // Tentar encontrar data
        const dateMatch = line.match(/(\d{2}\/\d{2}\/\d{4})/);
        if (dateMatch) {
            currentDate = new Date(dateMatch[1]);
            continue;
        }
        
        // Tentar encontrar valor
        const amountMatch = line.match(/(\d+\.?\d*),\d{2}/);
        if (amountMatch) {
            currentAmount = parseFloat(amountMatch[1].replace(',', '.'));
            continue;
        }
        
        // Se encontrou data e valor, criar transação
        if (currentDate && currentAmount) {
            transactions.push({
                date: currentDate.getTime(),
                description: currentDescription || 'Comprovante',
                amount: currentAmount,
                type: 'despesa',
                category: 'importado',
                paymentMethod: 'importado',
                installments: 1,
                isRecurring: false,
                frequency: '',
                endDate: null
            });
            
            // Resetar valores
            currentDate = null;
            currentAmount = null;
            currentDescription = null;
        }
    }
    
    return transactions;
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

// Adicionando eventos de clique para os botões
document.addEventListener('DOMContentLoaded', () => {
    // Exportar JSON
    document.getElementById('exportData')?.addEventListener('click', exportJSON);
    
    // Exportar PDF
    document.getElementById('exportPDF')?.addEventListener('click', exportToPDF);
    
    // Importar JSON
    const importDataBtn = document.getElementById('importData');
    const fileInput = document.getElementById('fileInput');
    if (importDataBtn && fileInput) {
        importDataBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', importJSON);
    }
    
    // Importar Comprovante
    const importReceiptBtn = document.getElementById('importReceipt');
    const receiptInput = document.getElementById('receiptInput');
    if (importReceiptBtn && receiptInput) {
        importReceiptBtn.addEventListener('click', () => receiptInput.click());
        receiptInput.addEventListener('change', importReceipt);
    }
});

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
            return;
        }

        transactions.forEach(transaction => {
            const item = document.createElement('li');
            item.className = 'transaction-item';
            
            const date = new Date(transaction.date);
            item.innerHTML = `
                <div class="transaction-details">
                    <div class="transaction-icon" data-category="${transaction.category}"></div>
                    <span class="transaction-category">${transaction.category}</span>
                    <span class="transaction-description">${transaction.description}</span>
                    <span class="transaction-date">${formatDate(date)}</span>
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
        
        // Configurar o gráfico
        await configureChart();
        
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

// Função para configurar o gráfico
async function configureChart() {
    try {
        const transactions = await db.transactions.toArray();
        const categories = {};
        
        transactions.forEach(transaction => {
            if (transaction.type === 'despesa') {
                const category = transaction.category || 'outros';
                categories[category] = (categories[category] || 0) + transaction.amount;
            }
        });

        const ctx = document.getElementById('expensesChart').getContext('2d');
        
        if (window.myChart) {
            window.myChart.destroy();
        }

        window.myChart = new Chart(ctx, {
            type: 'pie',
            data: {
                labels: Object.keys(categories),
                datasets: [{
                    data: Object.values(categories),
                    backgroundColor: [
                        '#10b981',
                        '#ef4444',
                        '#f59e0b',
                        '#7c3aed',
                        '#2dd4bf',
                        '#f472b6',
                        '#3b82f6',
                        '#16a34a',
                        '#db2777',
                        '#1e40af',
                        '#8b5cf6'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: 'white'
                        }
                    },
                    title: {
                        display: true,
                        text: 'Distribuição de Gastos por Categoria',
                        color: 'white'
                    }
                }
            }
        });
    } catch (error) {
        console.error('Erro ao configurar gráfico:', error);
    }
}

// Função para atualizar o saldo e o gráfico
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
        
        // Atualizar os totais nos elementos específicos
        document.getElementById('totalReceitas').textContent = formatCurrency(totals.receitas);
        document.getElementById('totalDespesas').textContent = formatCurrency(totals.despesas);
        document.getElementById('saldoTotal').textContent = formatCurrency(totals.total);
        
        // Calcular total do cartão
        const cartaoTotal = transactions.reduce((sum, transaction) => {
            if (transaction.paymentMethod === 'cartao_credito') {
                return sum + (transaction.type === 'despesa' ? transaction.amount : -transaction.amount);
            }
            return sum;
        }, 0);
        document.getElementById('totalCartao').textContent = formatCurrency(cartaoTotal);
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
