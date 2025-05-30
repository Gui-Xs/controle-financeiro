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

// Função para formatar data
function formatDate(date) {
    try {
        // Se date for uma string no formato YYYY-MM-DD
        if (typeof date === 'string' && date.match(/^\d{4}-\d{2}-\d{2}$/)) {
            const [year, month, day] = date.split('-');
            return `${day}/${month}/${year}`;
        }

        // Se for uma string em outro formato, tentar converter
        if (typeof date === 'string') {
            // Remover qualquer caractere inválido
            date = date.replace(/[^\d-]/g, '');
            // Se ainda tiver mais de 10 caracteres, pegar os últimos 10
            if (date.length > 10) {
                date = date.slice(-10);
            }
            // Se tiver menos de 10 caracteres, usar data atual
            if (date.length !== 10) {
                date = new Date().toISOString().split('T')[0];
            }
            
            // Agora devemos ter uma string no formato YYYY-MM-DD
            const [year, month, day] = date.split('-');
            return `${day}/${month}/${year}`;
        }

        // Se nada der certo, usar a data atual
        return new Intl.DateTimeFormat('pt-BR').format(new Date());
    } catch (error) {
        console.error('Erro ao formatar data:', error);
        return new Intl.DateTimeFormat('pt-BR').format(new Date());
    }
}

// Variável para controlar o estado de carregamento
window.isSubmitting = false;

// Função para adicionar transação
window.addTransaction = async function(e) {
    if (window.isSubmitting) return;
    
    e.preventDefault();
    window.isSubmitting = true;
    
    try {
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            alert('Por favor, faça login primeiro.');
            window.isSubmitting = false;
            return;
        }

        // Obter os valores do formulário
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const dateInput = document.getElementById('date').value;
        const category = document.getElementById('category').value;
        const type = document.getElementById('type').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        
        // Validar campos obrigatórios
        if (!description || !amount || !category || !type || !paymentMethod) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            window.isSubmitting = false;
            return;
        }

        // Validar valor
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, insira um valor válido.');
            window.isSubmitting = false;
            return;
        }

        // Validar data
        const date = dateInput || new Date().toISOString().split('T')[0];
        if (!date || date.includes('undefined') || date.includes('NaN')) {
            alert('Data inválida. Usando data atual.');
            date = new Date().toISOString().split('T')[0];
        }

        // Criar objeto de transação com ID único
        const transaction = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            description,
            amount: Math.abs(amount),
            category,
            type,
            date,
            paymentMethod: paymentMethod.toLowerCase(),
            frequency: document.getElementById('frequency').value || '',
            endDate: document.getElementById('endDate').value || '',
            timestamp: Date.now()
        };

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Adicionar transação usando set com merge
        await userRef.set({
            transactions: firebase.firestore.FieldValue.arrayUnion(transaction),
            lastSync: Date.now()
        }, { merge: true });

        // Limpar o formulário
        document.getElementById('transactionForm').reset();
        
        // Atualizar tabela
        await updateTransactionsTable();
        
        alert('Transação adicionada com sucesso!');
        window.isSubmitting = false;
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        alert('Erro ao adicionar transação. Por favor, verifique se você está conectado à internet e tente novamente.');
        window.isSubmitting = false;
    }
};

// Adicionar evento de submit quando o conteúdo principal for mostrado
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    if (mainContent.style.display === 'block') {
        const form = document.getElementById('transactionForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                if (window.isSubmitting) return;
                
                e.preventDefault();
                window.isSubmitting = true;
                try {
                    await window.addTransaction(e);
                    window.isSubmitting = false;
                } catch (error) {
                    console.error('Erro ao processar transação:', error);
                    alert('Erro ao processar transação. Por favor, tente novamente.');
                    window.isSubmitting = false;
                }
            });
        }
    } else {
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (mainContent.style.display === 'block') {
                        const form = document.getElementById('transactionForm');
                        if (form) {
                            form.addEventListener('submit', async (e) => {
                                if (window.isSubmitting) return;
                                
                                e.preventDefault();
                                window.isSubmitting = true;
                                try {
                                    await window.addTransaction(e);
                                    window.isSubmitting = false;
                                } catch (error) {
                                    console.error('Erro ao processar transação:', error);
                                    alert('Erro ao processar transação. Por favor, tente novamente.');
                                    window.isSubmitting = false;
                                }
                            });
                        }
                        observer.disconnect();
                    }
                }
            });
        });
        observer.observe(mainContent, { attributes: true });
    }
});

// Função para inicializar o banco de dados
async function initializeDatabase() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return null;
        }

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Garantir que o documento do usuário exista
        await userRef.set({
            transactions: [],
            lastSync: Date.now()
        }, { merge: true });

        console.log('Firebase inicializado com sucesso');
        return userRef;
    } catch (error) {
        console.error('Erro ao inicializar Firebase:', error);
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

        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações do Firebase
        const doc = await userRef.get();
        let transactions = [];
        if (doc.exists) {
            const data = doc.data();
            transactions = data.transactions || [];
        }

        // Criar PDF
        const { jsPDF } = window.jspdf;
        const pdf = new jsPDF('p', 'mm', 'a4');
        
        // Configurar fontes
        pdf.setFont('helvetica');
        pdf.setFontSize(12);

        // Título
        pdf.setFontSize(18);
        pdf.text('Relatório de Transações', 105, 20, { align: 'center' });
        
        // Data
        pdf.setFontSize(10);
        pdf.text(`Gerado em: ${formatDate(new Date())}`, 105, 30, { align: 'center' });
        
        // Cabeçalho da tabela
        const headers = ['Data', 'Descrição', 'Categoria', 'Valor', 'Tipo'];
        const startY = 40;
        let y = startY;
        
        // Adicionar cabeçalho
        pdf.setFontSize(12);
        pdf.setFont('helvetica', 'bold');
        headers.forEach((header, i) => {
            pdf.text(header, 15 + (i * 50), y);
        });
        y += 15;
        
        // Adicionar linhas
        pdf.setFont('helvetica', 'normal');
        transactions.forEach((transaction, index) => {
            const date = formatDate(new Date(transaction.date));
            const amount = formatCurrency(transaction.amount);
            const type = transaction.type === 'receita' ? 'Receita' : 'Despesa';
            
            const row = [date, transaction.description, transaction.category, amount, type];
            
            row.forEach((cell, i) => {
                pdf.text(cell, 15 + (i * 50), y + (index * 10));
            });
        });
        
        // Adicionar rodapé
        y += 10;
        pdf.setFontSize(10);
        pdf.text('Gerado pelo Controle Financeiro', 105, y + 10, { align: 'center' });
        
        // Salvar PDF
        pdf.save('relatorio-transacoes.pdf');
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
                
                const user = firebase.auth().currentUser;
                if (!user) {
                    console.error('Usuário não está logado');
                    return;
                }

                const firestore = firebase.firestore();
                const userRef = firestore.collection('users').doc(user.uid);
                
                // Obter transações existentes
                const doc = await userRef.get();
                let currentTransactions = [];
                if (doc.exists) {
                    const data = doc.data();
                    currentTransactions = data.transactions || [];
                }

                // Adicionar novas transações
                const updatedTransactions = [...currentTransactions, ...transactions];

                // Atualizar o documento
                await userRef.set({
                    transactions: updatedTransactions,
                    lastSync: Date.now()
                }, { merge: true });

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
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Adicionar transação usando set com merge
        await userRef.set({
            transactions: firebase.firestore.FieldValue.arrayUnion(transactionData),
            lastSync: Date.now()
        }, { merge: true });

        // Atualizar tabela
        await updateTransactionsTable();
        
        alert('Transação adicionada com sucesso!');
    } catch (error) {
        console.error('Erro ao importar comprovante:', error);
        alert('Erro ao importar comprovante. Por favor, tente novamente.');
    }
}

// Função para sincronizar transações com o Firebase
async function syncTransactionsWithFirebase() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações existentes do Firebase
        const doc = await userRef.get();
        let firebaseTransactions = [];
        if (doc.exists) {
            const data = doc.data();
            firebaseTransactions = data.transactions || [];
        }

        // Atualizar tabela
        await updateTransactionsTable();
        
        console.log('Sincronização concluída com sucesso');
    } catch (error) {
        console.error('Erro ao sincronizar com Firebase:', error);
        alert('Erro ao sincronizar com o Firebase. Por favor, tente novamente.');
    }
}

// Função para atualizar a tabela de transações
async function updateTransactionsTable() {
    try {
        // Limpar a tabela existente
        const tableBody = document.getElementById('transactionsBody');
        if (tableBody) {
            tableBody.innerHTML = '';
        }

        // Referência para o Firestore
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações do Firebase
        const userDoc = await userRef.get();
        let transactions = [];
        if (userDoc.exists) {
            const data = userDoc.data();
            transactions = data.transactions || [];
        }
        console.log('Atualizando tabela com', transactions.length, 'transações do Firebase');

        // Ordenar transações por data (mais recentes primeiro)
        const sortedTransactions = transactions.sort((a, b) => b.timestamp - a.timestamp);

        // Adicionar cada transação à tabela
        sortedTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(transaction.date)}</td>
                <td>${transaction.description}</td>
                <td style="text-align: right; padding-right: 10px;">${formatCurrency(transaction.amount)}</td>
                <td>${getCategoryIcon(transaction.category)}</td>
                <td>${transaction.type}</td>
                <td>${transaction.paymentMethod}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${transaction.id}')">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Atualizar os totais
        await updateTotals();

        console.log('Tabela atualizada com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
        alert('Erro ao atualizar tabela. Por favor, tente novamente.');
    }
}

// Função para deletar transação
async function deleteTransaction(transactionId) {
    if (!confirm('Tem certeza que deseja deletar esta transação?')) {
        return;
    }

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            alert('Por favor, faça login primeiro.');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações existentes
        const userDoc = await userRef.get();
        let currentTransactions = [];
        if (userDoc.exists) {
            const data = userDoc.data();
            currentTransactions = data.transactions || [];
        }

        // Remover a transação
        const updatedTransactions = currentTransactions.filter(tx => tx.id !== transactionId);

        // Atualizar o documento
        await userRef.set({
            transactions: updatedTransactions,
            lastSync: Date.now()
        }, { merge: true });

        // Atualizar tabela
        await updateTransactionsTable();
        
        alert('Transação deletada com sucesso!');
    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        alert('Erro ao deletar transação. Por favor, tente novamente.');
    }
}

// Função para atualizar os totais
async function updateTotals() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações do Firebase
        const userDoc = await userRef.get();
        let transactions = [];
        if (userDoc.exists) {
            const data = userDoc.data();
            transactions = data.transactions || [];
        }

        // Calcular totais
        const totalReceitas = transactions
            .filter(t => t.type === 'receita')
            .reduce((sum, t) => sum + t.amount, 0);

        const totalDespesas = transactions
            .filter(t => t.type === 'despesa')
            .reduce((sum, t) => sum + t.amount, 0);

        const saldo = totalReceitas - totalDespesas;

        // Atualizar elementos na tela
        document.getElementById('totalReceitas').textContent = formatCurrency(totalReceitas);
        document.getElementById('totalDespesas').textContent = formatCurrency(totalDespesas);
        document.getElementById('saldo').textContent = formatCurrency(saldo);

        // Atualizar gráfico
        await updateChart();
    } catch (error) {
        console.error('Erro ao atualizar totais:', error);
    }
}

// Função para atualizar o gráfico
async function updateChart() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações do Firebase
        const userDoc = await userRef.get();
        let transactions = [];
        if (userDoc.exists) {
            const data = userDoc.data();
            transactions = data.transactions || [];
        }

        // Filtrar apenas despesas
        const despesas = transactions
            .filter(t => t.type === 'despesa')
            .map(t => ({
                category: t.category,
                amount: t.amount
            }));

        // Agrupar por categoria
        const grouped = despesas.reduce((acc, t) => {
            if (!acc[t.category]) {
                acc[t.category] = 0;
            }
            acc[t.category] += t.amount;
            return acc;
        }, {});

        // Preparar dados para o gráfico
        const labels = Object.keys(grouped);
        const data = Object.values(grouped);
        const colors = labels.map(label => categoryColors[label] || '#95A5A6');

        // Configuração do gráfico
        const config = {
            type: 'doughnut',
            data: {
                labels: labels,
                datasets: [{
                    data: data,
                    backgroundColor: colors,
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: {
                            color: '#333',
                            font: {
                                size: 12
                            }
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: function(context) {
                                const label = context.label || '';
                                const value = formatCurrency(context.raw);
                                return `${label}: ${value}`;
                            }
                        }
                    }
                }
            }
        };

        // Atualizar o gráfico
        const chartCanvas = document.getElementById('transactionsChart').getContext('2d');
        if (window.chart) {
            window.chart.destroy();
        }
        window.chart = new Chart(chartCanvas, config);
    } catch (error) {
        console.error('Erro ao atualizar gráfico:', error);
    }
}

// Função para carregar transações do Firebase
async function loadTransactionsFromFirebase() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter documento do usuário
        const userDoc = await userRef.get();
        
        if (userDoc.exists) {
            const data = userDoc.data();
            if (data.transactions && Array.isArray(data.transactions)) {
                // Atualizar tabela
                await updateTransactionsTable();
            }
        }
    } catch (error) {
        console.error('Erro ao carregar transações do Firebase:', error);
        alert('Erro ao carregar transações do Firebase. Por favor, tente novamente.');
    }
}

// Função para atualizar a tabela de transações
async function updateTransactionsTable() {
    try {
        // Limpar a tabela existente
        const tableBody = document.getElementById('transactionsBody');
        if (tableBody) {
            tableBody.innerHTML = '';
        }

        // Referência para o Firestore
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações do Firebase
        const userDoc = await userRef.get();
        let transactions = [];
        if (userDoc.exists) {
            const data = userDoc.data();
            transactions = data.transactions || [];
        }
        console.log('Atualizando tabela com', transactions.length, 'transações do Firebase');

        // Ordenar transações por data (mais recentes primeiro)
        const sortedTransactions = transactions.sort((a, b) => b.timestamp - a.timestamp);

        // Aplicar filtros
        const categoryFilter = document.getElementById('categoryFilter').value;
        const monthFilter = document.getElementById('monthFilter').value;

        const filteredTransactions = sortedTransactions.filter(tx => {
            if (categoryFilter !== 'todas' && tx.category !== categoryFilter) {
                return false;
            }
            if (monthFilter !== 'todos') {
                const txDate = new Date(tx.date);
                const filterDate = new Date(monthFilter);
                return txDate.getMonth() === filterDate.getMonth() &&
                       txDate.getFullYear() === filterDate.getFullYear();
            }
            return true;
        });

        // Adicionar cada transação à tabela
        filteredTransactions.forEach(transaction => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(transaction.date)}</td>
                <td>${transaction.description}</td>
                <td style="text-align: right; padding-right: 10px;">${formatCurrency(transaction.amount)}</td>
                <td><i class="fas fa-${getCategoryIcon(transaction.category)}" style="color: ${categoryColors[transaction.category]}" title="${transaction.category}"></i></td>
                <td>${transaction.type}</td>
                <td>${transaction.paymentMethod}</td>
                <td>
                    <button class="btn btn-danger btn-sm" onclick="deleteTransaction('${transaction.id}')">Excluir</button>
                </td>
            `;
            tableBody.appendChild(row);
        });

        // Atualizar os totais
        await updateTotals();

        console.log('Tabela atualizada com sucesso');
    } catch (error) {
        console.error('Erro ao atualizar tabela:', error);
        alert('Erro ao atualizar tabela. Por favor, tente novamente.');
    }
}

// Função para deletar transação
async function deleteTransaction(id) {
    if (!confirm('Tem certeza que deseja deletar esta transação?')) {
        return;
    }

    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            alert('Por favor, faça login primeiro.');
            return;
        }

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Obter transações existentes
        const userDoc = await userRef.get();
        let currentTransactions = [];
        if (userDoc.exists) {
            const data = userDoc.data();
            currentTransactions = data.transactions || [];
        }

        // Remover a transação
        const updatedTransactions = currentTransactions.filter(tx => tx.id !== id);

        // Atualizar o documento
        await userRef.set({
            transactions: updatedTransactions,
            lastSync: Date.now()
        }, { merge: true });

        // Atualizar tabela
        await updateTransactionsTable();
        
        alert('Transação deletada com sucesso!');
    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        alert('Erro ao deletar transação. Por favor, tente novamente.');
    }
}

// Função para adicionar transação
window.addTransaction = async function(e) {
    e.preventDefault();
    
    try {
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            alert('Por favor, faça login primeiro.');
            return;
        }

        // Obter os valores do formulário
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const dateInput = document.getElementById('date').value;
        const category = document.getElementById('category').value;
        const type = document.getElementById('type').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        
        // Validar campos obrigatórios
        if (!description || !amount || !category || !type || !paymentMethod) {
            alert('Por favor, preencha todos os campos obrigatórios.');
            return;
        }

        // Validar valor
        if (isNaN(amount) || amount <= 0) {
            alert('Por favor, insira um valor válido.');
            return;
        }

        // Validar data
        const date = dateInput || new Date().toISOString().split('T')[0];
        if (!date || date.includes('undefined') || date.includes('NaN')) {
            alert('Data inválida. Usando data atual.');
            date = new Date().toISOString().split('T')[0];
        }

        // Criar objeto de transação com ID único
        const transaction = {
            id: Date.now() + Math.random().toString(36).substr(2, 9),
            description,
            amount: Math.abs(amount),
            category,
            type,
            date,
            paymentMethod: paymentMethod.toLowerCase(),
            frequency: document.getElementById('frequency').value || '',
            endDate: document.getElementById('endDate').value || '',
            timestamp: Date.now()
        };

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        
        // Adicionar transação usando set com merge
        await userRef.set({
            transactions: firebase.firestore.FieldValue.arrayUnion(transaction),
            lastSync: Date.now()
        }, { merge: true });

        // Limpar o formulário
        document.getElementById('transactionForm').reset();
        
        // Atualizar tabela
        await updateTransactionsTable();
        
        alert('Transação adicionada com sucesso!');
    } catch (error) {
        console.error('Erro ao adicionar transação:', error);
        alert('Erro ao adicionar transação. Por favor, verifique se você está conectado à internet e tente novamente.');
    }
};
