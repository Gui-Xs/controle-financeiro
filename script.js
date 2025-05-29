// Funções auxiliares
function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

// Mapeamento de categorias para ícones e cores
const categoryColors = {
    'alimentacao': '#FF6B6B',  // Vermelho
    'transporte': '#4ECDC4',   // Verde água
    'moradia': '#FFEEAD',      // Amarelo claro
    'saude': '#8892B0',        // Azul escuro
    'educacao': '#FF9F1C',     // Laranja
    'lazer': '#A8E6CF',        // Verde claro
    'vestuario': '#FF6B81',    // Rosa
    'tecnologia': '#45B7D1',   // Azul claro
    'servicos': '#FF9B9B',     // Vermelho claro
    'investimentos': '#9B59B6', // Roxo
    'viagem': '#4ECDC4',       // Verde água
    'presente': '#FF6B6B',     // Vermelho
    'outros': '#95A5A6'        // Cinza
};

const categoryIcons = {
    'alimentacao': 'utensils',
    'transporte': 'car',
    'moradia': 'home',
    'saude': 'heart',
    'educacao': 'graduation-cap',
    'lazer': 'gamepad',
    'vestuario': 'tshirt',
    'tecnologia': 'laptop',
    'servicos': 'tools',
    'investimentos': 'chart-line',
    'viagem': 'plane',
    'presente': 'gift',
    'outros': 'question-circle'
};

// Função para obter o ícone da categoria
function getCategoryIcon(category) {
    return categoryIcons[category] || categoryIcons['outros'];
}

function formatDate(date) {
    try {
        // Se date for um número (timestamp), converte para Date
        if (typeof date === 'number') {
            date = new Date(date);
        }
        
        // Verifica se é uma data válida
        if (date instanceof Date && !isNaN(date.getTime())) {
            return new Intl.DateTimeFormat('pt-BR').format(date);
        }
        
        // Se não for uma data válida, retorna uma string vazia
        console.warn('Data inválida encontrada:', date);
        return '';
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return '';
    }
}

// Adicionar evento de submit do formulário
const form = document.getElementById('transactionForm');
if (form) {
    form.addEventListener('submit', addTransaction);
    console.log('Evento de submit adicionado ao formulário');
} else {
    console.log('Formulário não encontrado inicialmente');
    
    // Tentar adicionar o evento novamente quando o conteúdo principal for mostrado
    const observer = new MutationObserver((mutations) => {
        mutations.forEach(mutation => {
            if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                const mainContent = document.getElementById('mainContent');
                if (mainContent.style.display === 'block') {
                    const form = document.getElementById('transactionForm');
                    if (form) {
                        form.addEventListener('submit', addTransaction);
                        console.log('Evento de submit adicionado após mostrar conteúdo principal');
                        observer.disconnect(); // Parar de observar após adicionar o evento
                    }
                }
            }
        });
    });
    
    observer.observe(document.getElementById('mainContent'), {
        attributes: true
    });
}

// Função para inicializar o banco de dados
let db = null;

async function initializeDatabase() {
    try {
        if (db) {
            console.log('Banco de dados já inicializado');
            return db;
        }

        console.log('Iniciando inicialização do banco de dados...');
        
        // Inicializar Dexie
        db = new Dexie('controleFinanceiro');
        
        // Definir a versão mais recente do banco
        db.version(2).stores({
            transactions: '++id, date, description, amount, type, category, paymentMethod, installments, isRecurring, frequency, endDate'
        });
        
        // Garantir que o banco seja inicializado
        await db.open();
        console.log('Banco de dados inicializado com sucesso');
        
        // Exportar o banco de dados para uso global
        window.db = db;
        return db;
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
        
        console.log('Iniciando importação de comprovante...');
        
        // Verificar se o Tesseract está disponível
        if (!window.Tesseract) {
            throw new Error('Tesseract não está disponível. Por favor, recarregue a página.');
        }
        
        // Criar um elemento de imagem temporário
        const img = new Image();
        img.src = URL.createObjectURL(file);
        
        // Carregar a imagem
        await new Promise((resolve) => {
            img.onload = resolve;
        });
        
        console.log('Iniciando OCR...');
        
        // Processar a imagem com Tesseract
        const result = await Tesseract.recognize(
            img,
            'por',
            {
                logger: (m) => console.log(m),
                lang: 'por',
                tessedit_pageseg_mode: '6', // PSM 6 - Assume a single uniform block of text
                tessedit_char_whitelist: '0123456789.,-abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ ',
            }
        );
        
        console.log('Texto extraído:', result.data.text);
        
        // Processar o texto extraído
        const text = result.data.text.toLowerCase();
        const lines = text.split('\n');
        
        const transactionData = {
            description: '',
            amount: 0,
            date: new Date(),
            type: 'despesa',
            category: 'outros'
        };
        
        // Tentar encontrar a data
        const dateRegex = /\d{2}[/\-]\d{2}[/\-]\d{2,4}/;
        const dateMatch = lines.find(line => dateRegex.test(line));
        if (dateMatch) {
            const dateStr = dateMatch.match(dateRegex)[0];
            transactionData.date = new Date(dateStr.replace(/\D/g, '/'));
        }
        
        // Tentar encontrar o nome do estabelecimento
        const establishmentRegex = /[a-záàâãéèêíìóòôõúùç\s]+/;
        const establishmentMatch = lines.find(line => line.length > 5 && !line.match(/\d/));
        if (establishmentMatch) {
            transactionData.description = establishmentMatch.trim();
        }
        
        // Tentar encontrar o valor
        const amountRegex = /\d+[.,]\d{2}/g;
        const amountMatch = lines.find(line => amountRegex.test(line));
        if (amountMatch) {
            const amountStr = amountMatch.match(amountRegex)[0].replace(',', '.');
            transactionData.amount = parseFloat(amountStr);
        }
        
        console.log('Dados extraídos:', transactionData);
        
        // Adicionar a transação
        if (!db) {
            await initializeDatabase();
        }
        
        await db.transactions.add(transactionData);
        await updateTransactionsTable();
        
        alert('Comprovante importado com sucesso!');
    } catch (error) {
        console.error('Erro ao importar comprovante:', error);
        alert('Erro ao importar comprovante. Por favor, tente novamente.');
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
    
    // Verificar se o usuário está logado
    const user = firebase.auth().currentUser;
    if (!user) {
        console.error('Usuário não está logado');
        alert('Por favor, faça login primeiro.');
        return;
    }

    // Obter os valores do formulário
    const description = document.getElementById('description').value;
    const amount = parseFloat(document.getElementById('amount').value);
    const type = document.getElementById('type').value;
    const category = document.getElementById('category').value;
    const paymentMethod = document.getElementById('paymentMethod').value;
    const installments = parseInt(document.getElementById('installments').value) || 1;
    const isRecurring = document.getElementById('isRecurring').checked;
    const frequency = document.getElementById('frequency').value;
    const endDate = document.getElementById('endDate').value;
    const dateInput = document.getElementById('date').value;

    // Verificar se todos os campos obrigatórios estão preenchidos
    if (!description || isNaN(amount) || !dateInput) {
        alert('Por favor, preencha todos os campos obrigatórios.');
        return;
    }

    try {
        // Inicializar o banco de dados se necessário
        if (!db) {
            await initializeDatabase();
        }

        // Criar a transação
        const transaction = {
            description,
            amount,
            type,
            category,
            paymentMethod,
            date: dateInput, // Salvar como string
            installments,
            isRecurring,
            frequency,
            endDate
        };

        // Adicionar a transação
        await db.transactions.add(transaction);
        
        // Atualizar a tabela
        await updateTransactionsTable();
        
        // Limpar o formulário
        document.getElementById('transactionForm').reset();
        
        // Mostrar mensagem de sucesso
        alert('Transação adicionada com sucesso!');
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
    console.log('Atualizando tabela de transações...');
    
    try {
        if (!db) {
            console.log('Inicializando banco de dados...');
            await initializeDatabase();
        }

        console.log('Buscando transações...');
        const transactions = await db.transactions.toArray();
        console.log('Transações encontradas:', transactions);
        
        const transactionsList = document.getElementById('transactionsList');
        if (!transactionsList) {
            console.error('Elemento transactionsList não encontrado');
            return;
        }

        console.log('Limpando tabela...');
        transactionsList.innerHTML = '';
        
        console.log('Buscando transações...');
        const transactions = await db.transactions.toArray();
        console.log('Transações encontradas:', transactions);
        
        console.log('Criando itens da tabela...');
        if (transactions.length > 0) {
            console.log(`Encontradas ${transactions.length} transações para mostrar`);
            
            transactions.forEach(transaction => {
                console.log('Criando item para transação:', transaction);
                
                const li = document.createElement('li');
                li.className = 'transaction-item';
                
                const date = formatDate(new Date(transaction.date));
                const amount = formatCurrency(transaction.amount);
                const type = transaction.type === 'receita' ? 'Receita' : 'Despesa';
                
                const categoryIcon = getCategoryIcon(transaction.category);
                li.innerHTML = `
                    <div class="transaction-info">
                        <span class="date">${date}</span>
                        <span class="description">${transaction.description}</span>
                        <span class="category-icon">
                            <i class="fas fa-${categoryIcon}"></i>
                        </span>
                        <span class="category">${transaction.category}</span>
                    </div>
                    <div class="transaction-actions">
                        <span class="amount ${transaction.type}">${amount}</span>
                        <button class="edit-btn" onclick="editTransaction(${transaction.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="delete-btn" onclick="deleteTransaction(${transaction.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                `;
                
                console.log('Adicionando item à tabela...');
                transactionsList.appendChild(li);
            });
        } else {
            console.log('Nenhuma transação encontrada');
            const li = document.createElement('li');
            li.className = 'transaction-item empty';
            li.textContent = 'Nenhuma transação encontrada';
            transactionsList.appendChild(li);
        }

        console.log('Atualizando totais...');
        updateTotals();
        
        console.log('Tabela atualizada com sucesso!');
    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
        alert('Erro ao atualizar tabela. Por favor, tente novamente.');
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

// Função para atualizar os totais
async function updateTotals() {
    console.log('Atualizando totais...');
    
    try {
        if (!db) {
            console.log('Inicializando banco de dados...');
            await initializeDatabase();
        }

        const transactions = await db.transactions.toArray();
        console.log('Transações para cálculo de totais:', transactions);

        let totalReceitas = 0;
        let totalDespesas = 0;
        let totalCartao = 0;
        const categoryTotals = {};

        transactions.forEach(transaction => {
            if (transaction.type === 'receita') {
                totalReceitas += transaction.amount;
            } else {
                totalDespesas += transaction.amount;
                if (transaction.paymentMethod === 'cartao_credito') {
                    totalCartao += transaction.amount;
                }

                // Soma por categoria
                if (categoryTotals[transaction.category]) {
                    categoryTotals[transaction.category] += transaction.amount;
                } else {
                    categoryTotals[transaction.category] = transaction.amount;
                }
            }
        });

        const saldo = totalReceitas - totalDespesas;
        console.log('Totais calculados:', {
            receitas: formatCurrency(totalReceitas),
            despesas: formatCurrency(totalDespesas),
            cartao: formatCurrency(totalCartao),
            saldo: formatCurrency(saldo)
        });

        const totalReceitasElement = document.getElementById('totalReceitas');
        const totalDespesasElement = document.getElementById('totalDespesas');
        const totalCartaoElement = document.getElementById('totalCartao');
        const saldoTotalElement = document.getElementById('saldoTotal');

        if (totalReceitasElement) {
            totalReceitasElement.textContent = formatCurrency(totalReceitas);
        } else {
            console.error('Elemento totalReceitas não encontrado');
        }

        if (totalDespesasElement) {
            totalDespesasElement.textContent = formatCurrency(totalDespesas);
        } else {
            console.error('Elemento totalDespesas não encontrado');
        }

        if (totalCartaoElement) {
            totalCartaoElement.textContent = formatCurrency(totalCartao);
        } else {
            console.error('Elemento totalCartao não encontrado');
        }

        if (saldoTotalElement) {
            saldoTotalElement.textContent = formatCurrency(saldo);
        } else {
            console.error('Elemento saldoTotal não encontrado');
        }

        // Atualizar gráfico
        updateChart(categoryTotals);
    } catch (error) {
        console.error('Erro ao atualizar totais:', error);
        alert('Erro ao atualizar totais. Por favor, tente novamente.');
    }
}

// Função para atualizar o gráfico
function updateChart(categoryTotals) {
    const chartCanvas = document.getElementById('chartCanvas');
    if (!chartCanvas) return;

    // Limpar gráfico existente
    if (window.chart) {
        window.chart.destroy();
    }

    // Preparar dados para o gráfico
    const labels = Object.keys(categoryTotals);
    const data = Object.values(categoryTotals);
    const backgroundColors = labels.map(category => categoryColors[category] || categoryColors['outros']);

    // Configuração do gráfico
    const config = {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: backgroundColors,
                hoverOffset: 4,
                borderWidth: 0
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'top',
                    labels: {
                        color: 'white',
                        font: {
                            size: 14
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: (context) => {
                            const label = context.label || '';
                            const value = formatCurrency(context.parsed);
                            return `${label}: ${value}`;
                        }
                    },
                    backgroundColor: 'rgba(0, 0, 0, 0.8)',
                    titleColor: 'white',
                    bodyColor: 'white',
                    borderColor: 'white',
                    borderWidth: 1
                }
            },
            animation: {
                duration: 1000,
                easing: 'easeInOutQuart'
            }
        }
    };

    // Criar novo gráfico
    window.chart = new Chart(chartCanvas, config);
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
