// Usando as referências do firebase.js
const db = window.db;

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
async function addTransaction(e) {
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

        // Verificar se o usuário tem permissão para acessar o conteúdo principal
        const mainContent = document.getElementById('mainContent');
        if (!mainContent || mainContent.style.display !== 'block') {
            console.error('Acesso não autorizado ao conteúdo principal');
            alert('Por favor, faça login novamente.');
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

        console.log('Transação a ser adicionada:', transaction);

        // Referência para o Firestore
        const userRef = db.collection('users').doc(user.uid);
        
        // Verificar se já existem transações
        const doc = await userRef.get();
        const data = doc.data();
        const existingTransactions = data?.transactions || [];
        
        // Verificar se a transação já existe
        const existingTransaction = existingTransactions.find(tx => tx.id === transaction.id);
        if (existingTransaction) {
            console.log('Transação já existe:', transaction.id);
            alert('Esta transação já foi adicionada anteriormente.');
            window.isSubmitting = false;
            return;
        }

        // Adicionar transação usando set com merge
        await userRef.set({
            transactions: firebase.firestore.FieldValue.arrayUnion(transaction),
            lastSync: Date.now()
        }, { merge: true });

        console.log('Transação adicionada com sucesso no Firestore');

        // Limpar o formulário
        document.getElementById('transactionForm').reset();
        
        // Atualizar tabela
        await updateTransactionsTable();
        
        alert('Transação adicionada com sucesso!');
        window.isSubmitting = false;
    } catch (error) {
        console.error('Erro detalhado ao adicionar transação:', error);
        if (error.message) {
            alert(`Erro: ${error.message}`);
        } else {
            alert('Erro ao adicionar transação. Por favor, verifique se você está conectado à internet e tente novamente.');
        }
        window.isSubmitting = false;
    }
}

// Testar conexão com o Firestore
try {
    const testRef = db.collection('test');
    console.log('Firestore connection test successful');
} catch (error) {
    console.error('Firestore connection test failed:', error);
}

// Adicionar evento de submit ao formulário quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    const mainContent = document.getElementById('mainContent');
    const form = document.getElementById('transactionForm');

    // Se o conteúdo principal já estiver visível
    if (mainContent.style.display === 'block' && form) {
        form.addEventListener('submit', addTransaction);
    } else {
        // Se não estiver visível, esperamos pela mutação
        const observer = new MutationObserver((mutations) => {
            mutations.forEach(mutation => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
                    if (mainContent.style.display === 'block') {
                        const form = document.getElementById('transactionForm');
                        if (form) {
                            form.addEventListener('submit', addTransaction);
                        }
                        observer.disconnect();
                    }
                }
            });
        });
        observer.observe(mainContent, { attributes: true });
    }

    // Exportar a função addTransaction para uso global
    window.addTransaction = addTransaction;
});

// Função para exportar PDF
async function exportToPDF() {
    try {
        // Obter as transações
        const transactions = await loadTransactionsFromFirebase();
        if (!transactions || transactions.length === 0) {
            alert('Nenhuma transação encontrada para exportar.');
            return;
        }

        // Criar PDF
        const pdf = new jsPDF('p', 'mm', 'a4');
        const title = 'Relatório de Transações';
        const date = new Date().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        });

        // Adicionar título
        pdf.setFontSize(20);
        pdf.text(title, 105, 20, { align: 'center' });
        pdf.setFontSize(12);
        pdf.text(`Data: ${date}`, 105, 30, { align: 'center' });
        pdf.setLineWidth(0.5);
        pdf.line(10, 35, 200, 35);

        // Adicionar cabeçalho da tabela
        const header = ['Descrição', 'Valor', 'Categoria', 'Tipo', 'Data', 'Forma de Pagamento'];
        const cellWidth = 30;
        const cellHeight = 10;
        const startX = 15;
        const startY = 45;

        // Adicionar cabeçalho
        pdf.setFontSize(10);
        pdf.setFont('helvetica', 'bold');
        header.forEach((text, i) => {
            pdf.text(text, startX + (i * cellWidth), startY);
        });
        pdf.setFont('helvetica', 'normal');

        // Adicionar dados
        let currentY = startY + cellHeight;
        transactions.forEach((transaction, index) => {
            if (currentY > 260) { // Nova página se necessário
                pdf.addPage();
                currentY = 20;
            }

            const row = [
                transaction.description,
                formatCurrency(transaction.amount),
                transaction.category,
                transaction.type,
                formatDate(transaction.date),
                transaction.paymentMethod
            ];

            row.forEach((text, i) => {
                pdf.text(text, startX + (i * cellWidth), currentY);
            });
            currentY += cellHeight;
        });

        // Adicionar totais
        const totals = await updateTotals();
        currentY += 10;
        pdf.setFont('helvetica', 'bold');
        pdf.text(`Total Receitas: ${formatCurrency(totals.receitas)}`, 15, currentY);
        pdf.text(`Total Despesas: ${formatCurrency(totals.despesas)}`, 15, currentY + 10);
        pdf.text(`Saldo: ${formatCurrency(totals.saldo)}`, 15, currentY + 20);

        // Salvar PDF
        pdf.save('relatorio-transacoes.pdf');
        alert('PDF gerado com sucesso!');
    } catch (error) {
        console.error('Erro ao gerar PDF:', error);
        alert('Erro ao gerar PDF. Por favor, tente novamente.');
    }
}

// Função para importar JSON
function importJSON(event) {
    try {
        const file = event.target.files[0];
        if (!file) {
            alert('Por favor, selecione um arquivo JSON.');
            return;
        }

        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const content = e.target.result;
                const data = JSON.parse(content);

                // Verificar se o usuário está logado
                const user = firebase.auth().currentUser;
                if (!user) {
                    alert('Por favor, faça login primeiro.');
                    return;
                }

                // Referência para o Firestore
                const firestore = firebase.firestore();
                const userRef = firestore.collection('users').doc(user.uid);

                // Adicionar transações
                await userRef.set({
                    transactions: firebase.firestore.FieldValue.arrayUnion(...data),
                    lastSync: Date.now()
                }, { merge: true });

                // Atualizar tabela
                await updateTransactionsTable();
                alert('Transações importadas com sucesso!');
            } catch (error) {
                console.error('Erro ao importar JSON:', error);
                alert('Erro ao importar JSON. Por favor, verifique se o arquivo está no formato correto.');
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
        if (!file) {
            alert('Por favor, selecione uma imagem.');
            return;
        }

        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Por favor, faça login primeiro.');
            return;
        }

        // Processar a imagem com Tesseract.js
        const result = await Tesseract.recognize(
            file,
            'por',
            {
                logger: m => console.log(m)
            }
        );

        const { data: { text } } = result;
        console.log('Texto extraído:', text);

        // Aqui você pode adicionar lógica para processar o texto extraído
        // e criar uma transação com os dados encontrados

        alert('Comprovante processado com sucesso!');
    } catch (error) {
        console.error('Erro ao processar comprovante:', error);
        alert('Erro ao processar comprovante. Por favor, tente novamente.');
    }
}

// Função para sincronizar transações com o Firebase
async function syncTransactionsWithFirebase() {
    try {
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);

        // Obter transações do Firestore
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            if (data && data.transactions) {
                // Atualizar tabela
                await updateTransactionsTable();
                alert('Sincronização concluída com sucesso!');
            }
        } else {
            console.log('Nenhum documento encontrado');
        }
    } catch (error) {
        console.error('Erro ao sincronizar com Firebase:', error);
        alert('Erro ao sincronizar com Firebase. Por favor, tente novamente.');
    }
}

// Função para atualizar a tabela de transações
async function updateTransactionsTable() {
    try {
        console.log('Iniciando atualização da tabela...');
        
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        // Referência para o Firestore
        const userRef = db.collection('users').doc(user.uid);
        console.log('Referência do Firestore:', userRef.path);

        // Obter transações
        const doc = await userRef.get();
        console.log('Resultado da consulta:', doc.exists);
        
        if (doc.exists) {
            const data = doc.data();
            console.log('Dados do documento:', data);
            const transactions = data.transactions || [];
            console.log('Transações encontradas:', transactions.length);

            // Obter filtros ativos
            const categoryFilter = document.getElementById('categoryFilter');
            const monthFilter = document.getElementById('monthFilter');
            const category = categoryFilter ? categoryFilter.value : '';
            const month = monthFilter ? monthFilter.value : '';
            console.log('Filtros ativos:', { category, month });

            // Filtrar transações
            let filteredTransactions = [...transactions];
            console.log('Transações antes do filtro:', filteredTransactions.length);
            
            // Aplicar filtro de categoria
            if (category && category !== 'todos') {
                filteredTransactions = filteredTransactions.filter(tx => tx.category === category);
            }

            // Aplicar filtro de mês
            if (month) {
                filteredTransactions = filteredTransactions.filter(tx => {
                    const txDate = new Date(tx.date);
                    const selectedDate = new Date(month);
                    return txDate.getMonth() === selectedDate.getMonth() && 
                           txDate.getFullYear() === selectedDate.getFullYear();
                });
            }

            console.log('Transações após filtros:', filteredTransactions.length);
            // Ordenar transações por data
            filteredTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));

            // Atualizar lista de transações
            const transactionsContainer = document.querySelector('.transactions-container');
            const transactionsList = document.getElementById('transactionsList');
            
            if (transactionsContainer && transactionsList) {
                console.log('Encontrado container de transações');
                transactionsList.innerHTML = '';

                // Adicionar cabeçalho da tabela
                const header = document.createElement('li');
                header.className = 'transaction-header';
                header.innerHTML = `
                    <div class="transaction-details">
                        <span class="description">Descrição</span>
                        <span class="amount">Valor</span>
                        <span class="category">Categoria</span>
                        <span class="type">Tipo</span>
                        <span class="date">Data</span>
                        <span class="payment-method">Forma de Pagamento</span>
                    </div>
                `;
                transactionsList.appendChild(header);

                // Adicionar transações
                filteredTransactions.forEach(transaction => {
                    console.log('Adicionando transação à lista:', transaction);
                    const listItem = document.createElement('li');
                    listItem.className = 'transaction-item';
                    listItem.innerHTML = `
                        <div class="transaction-details">
                            <span class="description">${transaction.description}</span>
                            <span class="amount">${formatCurrency(transaction.amount)}</span>
                            <span class="category" style="color: ${categoryColors[transaction.category]}">${transaction.category}</span>
                            <span class="type">${transaction.type}</span>
                            <span class="date">${formatDate(transaction.date)}</span>
                            <span class="payment-method">${transaction.paymentMethod}</span>
                        </div>
                        <button onclick="deleteTransaction('${transaction.id}')" class="delete-btn">
                            <i class="fas fa-trash"></i>
                        </button>
                    `;
                    transactionsList.appendChild(listItem);
                });

                console.log('Lista de transações atualizada com sucesso');
                // Atualizar totais
                await updateTotals();
                // Atualizar gráfico
                await updateChart();
            } else {
                console.error('Não foi possível encontrar o container de transações');
            }
        } else {
            console.log('Nenhum documento encontrado');
        }
    } catch (error) {
        console.error('Erro ao atualizar tabela de transações:', error);
        alert('Erro ao atualizar tabela de transações. Por favor, tente novamente.');
    }
}

// Função para deletar transação
async function deleteTransaction(id) {
    if (window.isSubmitting) return;
    
    if (!confirm('Tem certeza que deseja deletar esta transação?')) {
        return;
    }

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

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);

        // Obter transações atuais
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            const currentTransactions = data.transactions || [];

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
        }
    } catch (error) {
        console.error('Erro ao deletar transação:', error);
        alert('Erro ao deletar transação. Por favor, tente novamente.');
    }
    window.isSubmitting = false;
}

// Função para atualizar os totais
async function updateTotals() {
    try {
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);

        // Obter transações
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            const transactions = data.transactions || [];

            // Calcular totais
            let receitas = 0;
            let despesas = 0;
            let despesasCartao = 0;

            transactions.forEach(transaction => {
                if (transaction.type === 'receita') {
                    receitas += transaction.amount;
                } else {
                    despesas += transaction.amount;
                    if (transaction.paymentMethod === 'cartao_credito') {
                        despesasCartao += transaction.amount;
                    }
                }
            });

            // Calcular saldo
            const saldo = receitas - despesas;

            // Verificar se os elementos existem antes de atualizar
            const totalReceitas = document.getElementById('totalReceitas');
            const totalDespesas = document.getElementById('totalDespesas');
            const totalCartao = document.getElementById('totalCartao');
            const saldoTotal = document.getElementById('saldoTotal');

            if (totalReceitas && totalDespesas && totalCartao && saldoTotal) {
                // Atualizar elementos
                totalReceitas.textContent = formatCurrency(receitas);
                totalDespesas.textContent = formatCurrency(despesas);
                totalCartao.textContent = formatCurrency(despesasCartao);
                saldoTotal.textContent = formatCurrency(saldo);
                console.log('Totais atualizados com sucesso');
            } else {
                console.error('Elementos para totais não encontrados');
            }
        } else {
            console.error('Documento do usuário não encontrado');
        }
    } catch (error) {
        console.error('Erro ao atualizar totais:', error);
        alert('Erro ao atualizar totais. Por favor, tente novamente.');
    }
}

// Função para atualizar o gráfico
async function updateChart() {
    try {
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);

        // Obter transações
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            const transactions = data.transactions || [];

            // Filtrar apenas despesas
            const despesas = transactions.filter(tx => tx.type === 'despesa');

            // Agrupar por categoria
            const categorias = {};
            despesas.forEach(tx => {
                if (categorias[tx.category]) {
                    categorias[tx.category] += tx.amount;
                } else {
                    categorias[tx.category] = tx.amount;
                }
            });

            // Criar dados para o gráfico
            const labels = Object.keys(categorias);
            const values = Object.values(categorias);

            // Verificar se o canvas existe antes de criar o gráfico
            const canvas = document.getElementById('chartCanvas');
            if (!canvas) {
                console.error('Canvas do gráfico não encontrado');
                return;
            }

            // Atualizar gráfico
            const ctx = canvas.getContext('2d');
            if (window.myChart) {
                window.myChart.destroy();
            }
            window.myChart = new Chart(ctx, {
                type: 'pie',
                data: {
                    labels: labels,
                    datasets: [{
                        data: values,
                        backgroundColor: Object.values(categoryColors)
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    }
                }
            });

            console.log('Gráfico atualizado com sucesso');
        } else {
            console.error('Documento do usuário não encontrado');
        }
    } catch (error) {
        console.error('Erro ao atualizar gráfico:', error);
        alert('Erro ao atualizar gráfico. Por favor, tente novamente.');
    }
}

// Função para carregar transações do Firebase
async function loadTransactionsFromFirebase() {
    try {
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return [];
        }

        // Referência para o Firestore
        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);

        // Obter transações
        const doc = await userRef.get();
        if (doc.exists) {
            const data = doc.data();
            return data.transactions || [];
        }
        return [];
    } catch (error) {
        console.error('Erro ao carregar transações:', error);
        alert('Erro ao carregar transações. Por favor, tente novamente.');
        return [];
    }
}

// Inicialização do aplicativo
document.addEventListener('DOMContentLoaded', async () => {
    try {
        // Verificar se o usuário está logado
        const user = firebase.auth().currentUser;
        if (!user) {
            console.error('Usuário não está logado');
            return;
        }

        // Carregar transações iniciais
        const transactions = await loadTransactionsFromFirebase();
        console.log('Transações carregadas:', transactions);

        // Verificar se o conteúdo principal está visível
        const mainContent = document.getElementById('mainContent');
        if (!mainContent || mainContent.style.display !== 'block') {
            console.error('Acesso não autorizado ao conteúdo principal');
            return;
        }

        // Atualizar tabela
        await updateTransactionsTable();
        // Atualizar totais
        await updateTotals();
        // Atualizar gráfico
        await updateChart();

        // Configurar eventos de filtro
        const categoryFilterInit = document.getElementById('categoryFilter');
        const monthFilterInit = document.getElementById('monthFilter');
        
        if (categoryFilterInit) {
            categoryFilterInit.addEventListener('change', updateTransactionsTable);
        }
        if (monthFilterInit) {
            monthFilterInit.addEventListener('change', updateTransactionsTable);
        }

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

// Fim do script
console.log('Script carregado com sucesso!');
