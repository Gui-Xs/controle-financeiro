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

// Função para exportar PDF
async function exportToPDF() {
    try {
        // Verificar se o jsPDF está disponível
        if (typeof window.jspdf === 'undefined') {
            throw new Error('jsPDF não está disponível. Por favor, recarregue a página.');
        }

        // Aguardar a inicialização do jsPDF
        await new Promise((resolve) => setTimeout(resolve, 100));

        if (!db) {
            await initializeDatabase();
        }

        const transactions = await db.transactions.toArray();
        if (transactions.length === 0) {
            alert('Não há transações para exportar!');
            return;
        }

        // Criar PDF
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF('p', 'mm', 'a4');
        
        // Configurar fontes
        doc.setFont('helvetica');
        doc.setFontSize(12);

        // Título
        doc.setFontSize(18);
        doc.text('Relatório de Transações', 105, 20, { align: 'center' });
        
        // Data
        doc.setFontSize(10);
        doc.text(`Gerado em: ${formatDate(new Date())}`, 105, 30, { align: 'center' });
        
        // Cabeçalho da tabela
        const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Tipo'];
        const startY = 40;
        let y = startY;
        
        // Adicionar cabeçalho
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        headers.forEach((header, i) => {
            doc.text(header, 15 + (i * 50), y);
        });
        y += 15;
        
        // Adicionar linhas
        doc.setFont('helvetica', 'normal');
        transactions.forEach((transaction, index) => {
            const date = formatDate(new Date(transaction.date));
            const amount = formatCurrency(transaction.amount);
            const type = transaction.type === 'receita' ? 'Receita' : 'Despesa';
            
            const row = [date, transaction.description, transaction.category, amount, type];
            
            row.forEach((cell, i) => {
                doc.text(cell, 15 + (i * 50), y + (index * 10));
            });
        });
        
        // Adicionar rodapé
        y += 10;
        doc.setFontSize(10);
        doc.text('Gerado pelo Controle Financeiro', 105, y + 10, { align: 'center' });
        
        // Salvar PDF
        doc.save('relatorio-transacoes.pdf');
        alert('PDF gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao exportar PDF:', error);
        alert('Erro ao gerar PDF. Por favor, tente novamente.');
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
                await updateTransactionsTable();
                
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
                // Processar imagem com Tesseract
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
                await updateTransactionsTable();
                
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
    // Exportar PDF
    const exportPDFBtn = document.getElementById('exportPDF');
    if (exportPDFBtn) {
        exportPDFBtn.addEventListener('click', exportToPDF);
    }
    
    // Importar JSON
    const importDataBtn = document.getElementById('importData');
    const fileInput = document.getElementById('fileInput');
    if (importDataBtn && fileInput) {
        importDataBtn.addEventListener('click', () => fileInput.click());
        fileInput.addEventListener('change', (e) => importJSON(e));
    }
    
    // Importar Comprovante
    const importReceiptBtn = document.getElementById('importReceipt');
    const receiptInput = document.getElementById('receiptInput');
    if (importReceiptBtn && receiptInput) {
        importReceiptBtn.addEventListener('click', () => receiptInput.click());
        receiptInput.addEventListener('change', (e) => importReceipt(e));
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
