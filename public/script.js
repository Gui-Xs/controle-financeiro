// Funções auxiliares
function formatCurrency(value) {
    // Mantém o valor absoluto para formatação
    const absValue = Math.abs(value);
    // Formata o valor
    const formatted = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(absValue);
    // Adiciona o sinal se for negativo
    return value < 0 ? `-${formatted}` : formatted;
}

// Mapeamento de categorias para cores
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

// Mapeamento de categorias para ícones Font Awesome
const categoryIcons = {
    'alimentacao': 'fas fa-utensils',
    'transporte': 'fas fa-car',
    'moradia': 'fas fa-home',
    'saude': 'fas fa-heartbeat',
    'educacao': 'fas fa-graduation-cap',
    'lazer': 'fas fa-film',
    'compras': 'fas fa-shopping-bag',
    'servicos': 'fas fa-concierge-bell',
    'salario': 'fas fa-wallet', 
    'investimentos': 'fas fa-chart-line',
    'presentes': 'fas fa-gift',
    'contas': 'fas fa-file-invoice-dollar',
    'outros': 'fas fa-ellipsis-h', 
    // Adicione mais categorias e ícones conforme necessário
};

// Ícone padrão caso a categoria não seja encontrada
const defaultIcon = 'fas fa-question-circle';

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
        const isRecurring = document.getElementById('isRecurring').checked;
        const dueDateValue = document.getElementById('dueDate').value;
        const isBill = document.getElementById('isBill').checked;
        
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
            timestamp: Date.now(),
            dueDate: dueDateValue || null, // Salva como null se não preenchido
            isBill: isBill
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
        document.getElementById('dueDate').value = ''; // Limpa o campo de data de vencimento
        document.getElementById('isBill').checked = false; // Desmarca o checkbox de conta a pagar
        
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

// Função para exportar dados como JSON
async function exportJSON() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) {
            alert('Por favor, faça login para exportar dados.');
            return;
        }

        const transactions = await loadTransactionsFromFirebase();
        if (!transactions || transactions.length === 0) {
            alert('Não há transações para exportar.');
            return;
        }

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
        alert('Dados exportados para transacoes.json com sucesso!');

    } catch (error) {
        console.error('Erro ao exportar JSON:', error);
        alert('Erro ao exportar dados em JSON. Verifique o console para mais detalhes.');
    }
}

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
        const pdf = new window.jspdf.jsPDF('p', 'mm', 'a4');
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
            } else if (category === 'todos') {
                // Se categoria é 'todos', mantém todas as transações
                filteredTransactions = [...transactions];
            }

            // Aplicar filtro de mês
            if (month && month !== 'todos') {
                filteredTransactions = filteredTransactions.filter(tx => {
                    const txDate = new Date(tx.date);
                    const selectedDate = new Date(month);
                    return txDate.getMonth() === selectedDate.getMonth() && 
                           txDate.getFullYear() === selectedDate.getFullYear();
                });
            } else if (month === 'todos') {
                // Se mês é 'todos', mantém todas as transações
                filteredTransactions = [...transactions];
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
                        <span class="transaction-icon"><i class="fas fa-tag"></i></span> <!-- Ícone genérico para cabeçalho -->
                        <span class="description">Descrição</span>
                        <span class="category">Categoria</span>
                        <span class="date">Data</span>
                        <span class="payment-method">Forma de Pagamento</span>
                        <span class="amount">Valor</span>
                    </div>
                `;
                transactionsList.appendChild(header);

                // Adicionar transações
                filteredTransactions.forEach(transaction => {
                    console.log('Adicionando transação à lista:', transaction);
                    const transactionItem = document.createElement('li');
                    transactionItem.className = `transaction-item transaction ${transaction.type}`;
                    
                    // Criar elementos separadamente para melhor manipulação
                    const detailsDiv = document.createElement('div');
                    detailsDiv.className = 'transaction-details';
                    
                    // Determinar o ícone da categoria
                    const iconClass = categoryIcons[transaction.category] || defaultIcon;
                    const iconHTML = `<i class="${iconClass}"></i>`;

                    detailsDiv.innerHTML = `
                        <span class="transaction-icon">${iconHTML}</span>
                        <span class="description">${transaction.description}</span>
                        <span class="category" style="color: ${categoryColors[transaction.category] || '#ffffff'}">${transaction.category}</span>
                        <span class="date">${formatDate(transaction.date)}</span>
                        <span class="payment-method">${transaction.paymentMethod}</span>
                        <span class="amount ${transaction.type === 'receita' ? 'positive' : 'negative'}">${formatCurrency(transaction.amount)}</span>
                    `;

                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'delete-btn';
                    deleteBtn.innerHTML = '<i class="fas fa-trash"></i>';
                    
                    // Adicionar evento de clique usando addEventListener
                    deleteBtn.addEventListener('click', async () => {
                        await deleteTransaction(transaction.id);
                    });

                    transactionItem.appendChild(detailsDiv);
                    transactionItem.appendChild(deleteBtn);
                    transactionsList.appendChild(transactionItem);
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

// Função para deletar imagem
async function deleteImage(imagePath) {
    try {
        const result = await window.deleteFile(imagePath);
        if (result) {
            alert('Imagem deletada com sucesso!');
        }
    } catch (error) {
        console.error('Erro ao deletar imagem:', error);
        alert('Erro ao deletar imagem. Por favor, tente novamente.');
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

            // Encontrar a transação para deletar
            const transactionToDelete = currentTransactions.find(tx => tx.id === id);
            if (transactionToDelete && transactionToDelete.imagePath) {
                // Deletar a imagem associada
                await deleteImage(transactionToDelete.imagePath);
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
            return { receitas: 0, despesas: 0, saldo: 0 };
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
            return { receitas, despesas, saldo };
        } else {
            console.error('Documento do usuário não encontrado');
            return { receitas: 0, despesas: 0, saldo: 0 };
        }
    } catch (error) {
        console.error('Erro ao atualizar totais:', error);
        alert('Erro ao atualizar totais. Por favor, tente novamente.');
        return { receitas: 0, despesas: 0, saldo: 0 };
    }
}

// Função para atualizar o gráfico de evolução mensal
async function updateMonthlyEvolutionChart() {
    try {
        const user = firebase.auth().currentUser;
        if (!user) return;

        const firestore = firebase.firestore();
        const userRef = firestore.collection('users').doc(user.uid);
        const doc = await userRef.get();

        if (doc.exists) {
            const transactions = doc.data().transactions || [];
            
            // Processar transações para agrupar por mês/ano
            const monthlyData = transactions.reduce((acc, transaction) => {
                const date = new Date(transaction.date + 'T00:00:00'); // Assegura a data correta
                const yearMonth = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`; // Formato YYYY-MM

                if (!acc[yearMonth]) {
                    acc[yearMonth] = { receitas: 0, despesas: 0 };
                }

                if (transaction.type === 'receita') {
                    acc[yearMonth].receitas += transaction.amount;
                } else if (transaction.type === 'despesa') {
                    acc[yearMonth].despesas += transaction.amount;
                }
                return acc;
            }, {});

            const sortedMonths = Object.keys(monthlyData).sort();

            const labels = sortedMonths.map(month => {
                const [year, mon] = month.split('-');
                // Formatar para "Mês Abreviado/Ano"
                const d = new Date(parseInt(year), parseInt(mon) - 1);
                return `${d.toLocaleString('pt-BR', { month: 'short' })}/${year}`;
            });
            const receitaData = sortedMonths.map(month => monthlyData[month].receitas);
            const despesaData = sortedMonths.map(month => monthlyData[month].despesas);

            const canvas = document.getElementById('chartCanvas');
            if (!canvas) {
                console.error('Canvas do gráfico não encontrado');
                return;
            }
            const ctx = canvas.getContext('2d');

            if (window.activeChart) { // Use unified activeChart
                window.activeChart.destroy();
            }

            window.activeChart = new Chart(ctx, { // Assign to unified activeChart
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [
                        {
                            label: 'Receitas',
                            data: receitaData,
                            borderColor: 'rgba(75, 192, 192, 1)',
                            backgroundColor: 'rgba(75, 192, 192, 0.2)',
                            fill: true,
                            tension: 0.1
                        },
                        {
                            label: 'Despesas',
                            data: despesaData,
                            borderColor: 'rgba(255, 99, 132, 1)',
                            backgroundColor: 'rgba(255, 99, 132, 0.2)',
                            fill: true,
                            tension: 0.1
                        }
                    ]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        },
                        x: {
                            ticks: { color: '#ffffff' },
                            grid: { color: 'rgba(255, 255, 255, 0.1)' }
                        }
                    },
                    plugins: {
                        legend: {
                            position: 'top',
                            labels: {
                                color: '#ffffff'
                            }
                        }
                    }
                }
            });
            console.log('Gráfico de evolução mensal atualizado.');
        } else {
            console.error('Documento do usuário não encontrado para gráfico de evolução.');
        }
    } catch (error) {
        console.error('Erro ao atualizar gráfico de evolução mensal:', error);
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
            if (window.activeChart) { // Use unified activeChart
                window.activeChart.destroy();
            }
            window.activeChart = new Chart(ctx, { // Assign to unified activeChart
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

// Função para solicitar permissão de notificação
async function requestNotificationPermission() {
    if (!('Notification' in window)) {
        console.log('Este navegador não suporta notificações desktop.');
        return false;
    }
    if (Notification.permission === 'granted') {
        console.log('Permissão para notificações já concedida.');
        return true;
    }
    if (Notification.permission !== 'denied') {
        const permission = await Notification.requestPermission();
        if (permission === 'granted') {
            console.log('Permissão para notificações concedida.');
            new Notification('Ótimo!', { body: 'Você receberá notificações sobre suas contas agora!' });
            return true;
        }
    }
    console.log('Permissão para notificações não concedida.');
    return false;
}

// Função para carregar transações do Firebase
async function checkUpcomingBills(transactions) {
    if (Notification.permission !== 'granted') {
        console.log('Permissão para notificações não concedida, não é possível checar contas a vencer.');
        return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normaliza para o início do dia
    const sevenDaysFromNow = new Date(today);
    sevenDaysFromNow.setDate(today.getDate() + 7);

    console.log('Checando contas a vencer...');
    transactions.forEach(transaction => {
        if (transaction.isBill && transaction.dueDate) {
            const dueDate = new Date(transaction.dueDate + 'T00:00:00'); // Adiciona T00:00:00 para evitar problemas de fuso horário na conversão
            
            if (dueDate >= today && dueDate <= sevenDaysFromNow) {
                const timeDiff = dueDate.getTime() - today.getTime();
                const daysRemaining = Math.ceil(timeDiff / (1000 * 3600 * 24));

                let message = `Lembrete: A conta '${transaction.description}' (${formatCurrency(transaction.amount)}) `;
                if (daysRemaining === 0) {
                    message += 'vence hoje!';
                } else if (daysRemaining === 1) {
                    message += 'vence amanhã!';
                } else {
                    message += `vence em ${daysRemaining} dias.`;
                }

                new Notification('Conta Próxima do Vencimento!', {
                    body: message,
                    icon: './public/icons/icon-192x192.png' // Opcional: adicione um ícone
                });
                console.log(`Notificação para: ${transaction.description}, vence em ${daysRemaining} dias.`);
            }
        }
    });
}

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
            const transactions = data.transactions || [];
            
            // Ordenar transações por data (do mais recente para o mais antigo)
            return transactions.sort((a, b) => {
                const dateA = new Date(a.date);
                const dateB = new Date(b.date);
                return dateB - dateA; // Retorna positivo se dateB é maior (mais recente)
            });
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
    window.activeChart = null; // Initialize active chart instance
    try {
        // Adicionar listener para mudanças de autenticação
        firebase.auth().onAuthStateChanged(async (user) => {
            if (user) {
                console.log('Usuário logado:', user.uid);
                
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
                // Atualizar gráfico (gráfico de categorias como padrão)
                await updateChart(); 

                // Solicitar permissão de notificação e checar contas a vencer
                await requestNotificationPermission();
                if (transactions && transactions.length > 0) {
                    checkUpcomingBills(transactions);
                }

                // Configurar botões de alternância de gráfico
                const categoryBtn = document.getElementById('showCategoryChartBtn');
                const evolutionBtn = document.getElementById('showEvolutionChartBtn');

                if (categoryBtn && evolutionBtn) {
                    categoryBtn.addEventListener('click', async () => {
                        await updateChart();
                        categoryBtn.classList.add('active-chart-btn');
                        evolutionBtn.classList.remove('active-chart-btn');
                    });

                    evolutionBtn.addEventListener('click', async () => {
                        await updateMonthlyEvolutionChart();
                        evolutionBtn.classList.add('active-chart-btn');
                        categoryBtn.classList.remove('active-chart-btn');
                    });
                } else {
                    console.error('Botões de alternância de gráfico não encontrados.');
                }

                // Configurar eventos de filtro
                const categoryFilterInit = document.getElementById('categoryFilter');
                const monthFilterInit = document.getElementById('monthFilter');
                
                if (categoryFilterInit) {
                    categoryFilterInit.addEventListener('change', updateTransactionsTable);
                }
                if (monthFilterInit) {
                    monthFilterInit.addEventListener('change', updateTransactionsTable);
                }

                // Setup Import/Export Event Listeners
                const exportDataBtn = document.getElementById('exportData');
                const exportPdfBtn = document.getElementById('exportPDF');
                const importDataBtn = document.getElementById('importData');
                const importReceiptBtn = document.getElementById('importReceipt');
                const fileInputEl = document.getElementById('fileInput');
                const receiptInputEl = document.getElementById('receiptInput');

                if (exportDataBtn) {
                    exportDataBtn.addEventListener('click', exportJSON);
                }
                if (exportPdfBtn) {
                    exportPdfBtn.addEventListener('click', exportToPDF);
                }
                if (importDataBtn && fileInputEl) {
                    importDataBtn.addEventListener('click', () => fileInputEl.click());
                }
                if (fileInputEl) {
                    fileInputEl.addEventListener('change', importJSON);
                }
                if (importReceiptBtn && receiptInputEl) {
                    importReceiptBtn.addEventListener('click', () => receiptInputEl.click());
                }
                if (receiptInputEl) {
                    receiptInputEl.addEventListener('change', importReceipt);
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
            } else {
                console.log('Usuário não está logado');
                // Limpar dados e esconder conteúdo principal
                const mainContent = document.getElementById('mainContent');
                if (mainContent) {
                    mainContent.style.display = 'none';
                }
            }
        });
    } catch (error) {
        console.error('Erro na inicialização:', error);
        alert('Erro ao iniciar o aplicativo. Por favor, recarregue a página.');
    }
});

// Fim do script
console.log('Script carregado com sucesso!');
