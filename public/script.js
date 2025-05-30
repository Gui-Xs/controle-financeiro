// Função global para adicionar transação
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

// Classe principal
class FinanceControl {
    constructor() {
        console.log('Initializing FinanceControl');
        this.form = document.getElementById('transactionForm');
        this.transactionsList = [];
        
        // Test Firestore connection before proceeding
        if (!window.db) {
            console.error('Firebase not initialized');
            alert('Erro: Firebase não inicializado. Por favor, verifique as configurações do Firebase.');
            return;
        }
        
        this.transactionsRef = window.transactionsRef;
        this.recurringTransactionsRef = window.recurringTransactionsRef;
        
        // Test Firestore connection
        this.testFirestoreConnection()
            .then(() => {
                console.log('Construtor FinanceControl inicializado com sucesso');
            })
            .catch(error => {
                console.error('Erro na conexão com o Firestore:', error);
                alert('Erro na conexão com o Firestore. Por favor, verifique as configurações do Firebase.');
            });
    }

    async testFirestoreConnection() {
        try {
            console.log('Testing Firestore connection...');
            const testDoc = {
                test: 'connection test',
                timestamp: new Date().toISOString()
            };
            
            const docRef = await window.addDoc(window.testRef, testDoc);
            console.log('Test document added successfully:', docRef.id);
            
            // Delete test document
            await window.deleteDoc(window.doc(window.testRef, docRef.id));
            console.log('Test document deleted successfully');
            return true;
        } catch (error) {
            console.error('Firestore connection test failed:', error);
            alert('Erro na conexão com o Firestore. Por favor, verifique as configurações do Firebase.');
            throw error;
        }
    }

    async getAllTransactions() {
        try {
            const querySnapshot = await window.getDocs(this.transactionsRef);
            return querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
        } catch (error) {
            console.error('Error getting all transactions:', error);
            throw new Error('Falha ao carregar transações');
        }
    }

    async addTransaction(transaction) {
        try {
            const docRef = await window.addDoc(this.transactionsRef, transaction);
            console.log('Transaction added successfully:', docRef.id);
            return docRef.id;
        } catch (error) {
            console.error('Error adding transaction:', error);
            throw new Error('Falha ao adicionar transação');
        }
    }



    async deleteTransaction(id) {
        try {
            console.log('Tentando deletar transação com ID:', id);
            const docRef = window.doc(this.transactionsRef, id);
            console.log('DocRef criado:', docRef);
            const docSnap = await window.getDoc(docRef);
            console.log('DocSnap recebido:', docSnap);
            
            // Verificar se o documento existe usando o método correto do Firestore
            if (!docSnap.exists) {
                throw new Error('Transação não encontrada');
            }

            const transaction = docSnap.data();
            console.log('Transação encontrada:', transaction);
            const formattedAmount = new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL'
            }).format(transaction.amount);

            const message = `Deseja realmente excluir esta transação?\n\nDescrição: ${transaction.description}\nValor: ${formattedAmount}\nData: ${new Date(transaction.date).toLocaleDateString()}`;

            if (confirm(message)) {
                console.log('Iniciando exclusão...', docRef);
                try {
                    await window.deleteDoc(docRef);
                    console.log('Exclusão bem-sucedida, recarregando transações...');
                    await this.loadTransactions();
                } catch (deleteError) {
                    console.error('Erro ao excluir documento:', deleteError);
                    throw deleteError;
                }
            }
        } catch (error) {
            console.error('Error deleting transaction:', error);
            alert('Falha ao excluir transação');
        }
    }

    async getTransactionsByMonth(month) {
        if (month === '') return await this.getAllTransactions();
        
        const startDate = new Date(new Date().getFullYear(), parseInt(month), 1);
        const endDate = new Date(new Date().getFullYear(), parseInt(month) + 1, 0);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];
        
        const query = window.query(this.transactionsRef, 
            window.where('date', '>=', startStr),
            window.where('date', '<=', endStr)
        );
        
        const docs = await window.getDocs(query);
        return docs.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
        
        const querySnapshot = await window.getDocs(query);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async getTransactionsByCategory(category) {
        const query = window.query(this.transactionsRef, 
            window.where('category', '==', category)
        );
        
        const querySnapshot = await window.getDocs(query);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async getRecurringTransactions() {
        const querySnapshot = await window.getDocs(this.recurringTransactionsRef);
        return querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));
    }

    async exportData() {
        try {
            const transactions = await this.getAllTransactions();
            const recurringTransactions = await this.getRecurringTransactions();
            
            const data = {
                transactions,
                recurringTransactions,
                exportDate: new Date().toISOString(),
                version: '1.0'
            };

            const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            
            const a = document.createElement('a');
            a.href = url;
            a.download = `financas_${new Date().toISOString().split('T')[0]}.json`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        } catch (error) {
            console.error('Error exporting data:', error);
            alert('Erro ao exportar dados');
        }
    }

    async handleFileImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const text = await file.text();
            const data = JSON.parse(text);

            if (!data.version || !data.transactions) {
                throw new Error('Formato de arquivo inválido');
            }

            if (!confirm('Isso substituirá todos os dados existentes. Deseja continuar?')) {
                return;
            }

            // Limpar dados existentes
            const transactionDocs = await window.getDocs(this.transactionsRef);
            const recurringDocs = await window.getDocs(this.recurringTransactionsRef);
            
            // Excluir todas as transações existentes
            await Promise.all(transactionDocs.docs.map(doc => window.deleteDoc(doc.ref)));
            await Promise.all(recurringDocs.docs.map(doc => window.deleteDoc(doc.ref)));

            // Importar transações
            if (data.transactions.length > 0) {
                await Promise.all(data.transactions.map(transaction => 
                    window.addDoc(this.transactionsRef, transaction)
                ));
            }

            // Importar transações recorrentes
            if (data.recurringTransactions && data.recurringTransactions.length > 0) {
                await Promise.all(data.recurringTransactions.map(recurring => 
                    window.addDoc(this.recurringTransactionsRef, recurring)
                ));
            }

            await this.loadTransactions();
            alert('Dados importados com sucesso!');
        } catch (error) {
            console.error('Error importing data:', error);
            alert('Erro ao importar dados. Verifique se o arquivo está no formato correto.');
        } finally {
            event.target.value = ''; // Limpar input
        }
    }

    async exportPDF() {
        try {
            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const transactions = await this.getAllTransactions();

            // Título
            doc.setFontSize(20);
            doc.text('Relatório Financeiro', 105, 15, { align: 'center' });
            doc.setFontSize(12);
            doc.text(`Gerado em: ${new Date().toLocaleDateString()}`, 105, 25, { align: 'center' });

            // Resumo
            doc.setFontSize(16);
            doc.text('Resumo', 20, 40);
            doc.setFontSize(12);
            doc.text(`Total Receitas: R$ ${document.getElementById('totalReceitas').textContent}`, 20, 50);
            doc.text(`Total Despesas: R$ ${document.getElementById('totalDespesas').textContent}`, 20, 57);
            doc.text(`Saldo: R$ ${document.getElementById('saldoTotal').textContent}`, 20, 64);

            // Tabela de Transações
            doc.setFontSize(16);
            doc.text('Transações', 20, 80);
            doc.setFontSize(10);

            let y = 90;
            const pageHeight = doc.internal.pageSize.height;

            // Cabeçalho da tabela
            doc.text('Data', 20, y);
            doc.text('Descrição', 45, y);
            doc.text('Categoria', 95, y);
            doc.text('Valor', 140, y);
            doc.text('Tipo', 170, y);
            y += 7;

            // Linhas da tabela
            for (const transaction of transactions) {
                if (y > pageHeight - 20) {
                    doc.addPage();
                    y = 20;
                }

                const date = new Date(transaction.date).toLocaleDateString();
                const amount = new Intl.NumberFormat('pt-BR', {
                    style: 'currency',
                    currency: 'BRL'
                }).format(transaction.amount);

                doc.text(date, 20, y);
                doc.text(transaction.description.substring(0, 25), 45, y);
                doc.text(transaction.category, 95, y);
                doc.text(amount, 140, y);
                doc.text(transaction.type === 'receita' ? 'Receita' : 'Despesa', 170, y);

                y += 7;
            }

            doc.save(`relatorio_financeiro_${new Date().toISOString().split('T')[0]}.pdf`);
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Erro ao exportar PDF');
        }
    }

    async handleReceiptImport(event) {
        const file = event.target.files[0];
        if (!file) return;

        try {
            const loadingMessage = document.createElement('div');
            loadingMessage.className = 'loading-message';
            loadingMessage.textContent = 'Processando comprovante...';
            document.body.appendChild(loadingMessage);

            const result = await Tesseract.recognize(file, 'por', {
                logger: m => console.log(m)
            });

            document.body.removeChild(loadingMessage);

            // Extrair informações do texto
            const text = result.data.text;
            console.log('Texto extraído:', text);

            // Tentar encontrar o valor
            const valorMatch = text.match(/R\$\s*(\d+[.,]\d{2})/i);
            const valor = valorMatch ? parseFloat(valorMatch[1].replace(',', '.')) : 0;

            // Tentar encontrar a data
            const dataMatch = text.match(/(\d{2}[\/\-]\d{2}[\/\-]\d{2,4})/i);
            const data = dataMatch ? dataMatch[1] : new Date().toISOString().split('T')[0];

            // Preencher o formulário
            document.getElementById('amount').value = valor;
            document.getElementById('date').value = this.formatDateForInput(data);
            document.getElementById('type').value = 'despesa';

            alert('Comprovante processado! Por favor, verifique e ajuste as informações se necessário.');
        } catch (error) {
            console.error('Error processing receipt:', error);
            alert('Erro ao processar comprovante');
        } finally {
            event.target.value = '';
        }
    }

    formatDateForInput(dateStr) {
        try {
            const parts = dateStr.split(/[\/\-]/);
            if (parts.length !== 3) return new Date().toISOString().split('T')[0];

            let [day, month, year] = parts;
            if (year.length === 2) year = '20' + year;
            
            return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
        } catch (error) {
            return new Date().toISOString().split('T')[0];
        }
    }

    async init() {
        try {
            console.log('Initializing application...');
            
            // Verificar se o Firebase está inicializado
            if (!window.db) {
                throw new Error('Firebase não inicializado');
            }
            
            // Testar conexão com Firestore
            await this.testFirestoreConnection();
            
            // Carregar transações
            await this.loadTransactions();
            
            // Configurar listeners
            this.setupEventListeners();
            
            // Verificar transações recorrentes
            setInterval(() => this.checkRecurringTransactions(), 24 * 60 * 60 * 1000);
            
            console.log('Application initialized successfully');
        } catch (error) {
            console.error('Application error:', error);
            alert('Erro ao inicializar o aplicativo: ' + error.message);
            throw error; // Propagar o erro para o init.js
        }
    }

    async loadTransactions() {
        try {
            console.log('Loading transactions...');
            const transactions = await window.getDocs(this.transactionsRef);
            this.transactionsList = transactions.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            console.log('Loaded transactions:', this.transactionsList);
            
            await this.renderTransactions();
            this.updateTotals();
            
            // Atualizar o gráfico usando o método da própria classe
            this.updateChart(this.transactionsList);
        } catch (error) {
            console.error('Error loading transactions:', error);
            throw new Error('Falha ao carregar transações');
        }
    }

    async checkRecurringTransactions() {
        const today = new Date();
        const querySnapshot = await window.getDocs(this.recurringTransactionsRef);
        const recurringTransactions = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }));

        for (const recurring of recurringTransactions) {
            const lastGenerated = recurring.lastGenerated ? new Date(recurring.lastGenerated) : new Date(recurring.startDate);
            const endDate = recurring.endDate ? new Date(recurring.endDate) : null;

            if (endDate && today > endDate) continue;

            let nextDate = this.calculateNextDate(lastGenerated, recurring.frequency);
            while (nextDate <= today) {
                if (endDate && nextDate > endDate) break;

                await this.createSingleTransaction(
                    recurring.description,
                    recurring.amount,
                    recurring.type,
                    recurring.category,
                    recurring.paymentMethod,
                    nextDate.toISOString().split('T')[0],
                    null,
                    recurring.id
                );

                nextDate = this.calculateNextDate(nextDate, recurring.frequency);
            }

            await this.updateRecurringTransaction(recurring.id, {
                lastGenerated: today.toISOString().split('T')[0]
            });
        }
    }

    calculateNextDate(date, frequency) {
        const nextDate = new Date(date);
        switch (frequency) {
            case 'weekly':
                nextDate.setDate(nextDate.getDate() + 7);
                break;
            case 'monthly':
                nextDate.setMonth(nextDate.getMonth() + 1);
                break;
            case 'yearly':
                nextDate.setFullYear(nextDate.getFullYear() + 1);
                break;
        }
        return nextDate;
    }

    setupEventListeners() {
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleTransactionSubmit();
        });

        document.getElementById('paymentMethod').addEventListener('change', (e) => {
            const installmentsGroup = document.getElementById('installmentsGroup');
            installmentsGroup.style.display = 
                (e.target.value === 'cartao_credito') ? 'block' : 'none';
            document.getElementById('installments').required = (e.target.value === 'cartao_credito');
        });

        document.getElementById('isRecurring').addEventListener('change', (e) => {
            const recurringOptions = document.getElementById('recurringOptions');
            recurringOptions.style.display = e.target.checked ? 'block' : 'none';
        });

        document.getElementById('exportData').addEventListener('click', () => this.exportData());
        document.getElementById('exportPDF').addEventListener('click', () => this.exportPDF());
        document.getElementById('importData').addEventListener('click', () => document.getElementById('fileInput').click());
        document.getElementById('importReceipt').addEventListener('click', () => document.getElementById('receiptInput').click());
        document.getElementById('fileInput').addEventListener('change', (e) => this.handleFileImport(e));
        document.getElementById('receiptInput').addEventListener('change', (e) => this.handleReceiptImport(e));

        document.getElementById('categoryFilter').addEventListener('change', () => this.filterTransactions());
        document.getElementById('monthFilter').addEventListener('change', () => this.filterTransactions());
        document.getElementById('themeToggle').addEventListener('change', () => this.toggleTheme());

        const monthFilter = document.getElementById('monthFilter');
        const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 
                       'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
        months.forEach((month, index) => {
            const option = document.createElement('option');
            option.value = index;
            option.textContent = month;
            monthFilter.appendChild(option);
        });
    }

    async handleTransactionSubmit() {
        const description = document.getElementById('description').value;
        const amount = parseFloat(document.getElementById('amount').value);
        const type = document.getElementById('type').value;
        const category = document.getElementById('category').value;
        const paymentMethod = document.getElementById('paymentMethod').value;
        const date = document.getElementById('date').value;
        const installments = parseInt(document.getElementById('installments').value);
        const isRecurring = document.getElementById('isRecurring').checked;

        try {
            if (isRecurring) {
                const frequency = document.getElementById('frequency').value;
                const endDate = document.getElementById('endDate').value || null;

                const recurringData = {
                    description,
                    amount,
                    type,
                    category,
                    paymentMethod,
                    frequency,
                    startDate: date,
                    endDate,
                    lastGenerated: null
                };

                const docRef = await addDoc(this.recurringTransactionsRef, recurringData);
                const recurringId = docRef.id;

                await this.createSingleTransaction(
                    description,
                    amount,
                    type,
                    category,
                    paymentMethod,
                    date,
                    null,
                    recurringId
                );
            } else if (paymentMethod === 'cartao_credito' && installments > 1) {
                await this.addInstallmentTransactions(description, amount, category, paymentMethod, date, installments);
            } else {
                await this.createSingleTransaction(description, amount, type, category, paymentMethod, date);
            }

            this.form.reset();
            document.getElementById('recurringOptions').style.display = 'none';
            await this.loadTransactions();
        } catch (error) {
            console.error('Error submitting transaction:', error);
            alert('Erro ao adicionar transação');
        }
    }

    async createSingleTransaction(description, amount, type, category, paymentMethod, date, installments = null, recurringId = null) {
        const transaction = {
            description,
            amount,
            type,
            category,
            paymentMethod,
            date,
            installments: installments || null,
            recurringId: recurringId || null,
            createdAt: new Date().toISOString()
        };

        // Verificar se todos os campos obrigatórios estão definidos
        const requiredFields = ['description', 'amount', 'type', 'category', 'paymentMethod', 'date'];
        for (const field of requiredFields) {
            if (!transaction[field]) {
                throw new Error(`Campo obrigatório não definido: ${field}`);
            }
        }

        await window.addDoc(this.transactionsRef, transaction);
    }

    async updateRecurringTransaction(id, data) {
        try {
            const docRef = window.doc(this.recurringTransactionsRef, id);
            await window.setDoc(docRef, data, { merge: true });
        } catch (error) {
            console.error('Error updating recurring transaction:', error);
            throw error;
            throw new Error('Falha ao adicionar transação');
        }
    }

    async addInstallmentTransactions(description, amount, category, paymentMethod, startDate, installments) {
        const installmentAmount = amount / parseInt(installments);
        const startMonth = new Date(startDate);

        try {
            for (let i = 0; i < installments; i++) {
                const currentDate = new Date(startMonth);
                currentDate.setMonth(startMonth.getMonth() + i);

                const installmentInfo = {
                    currentInstallment: i + 1,
                    totalInstallments: parseInt(installments)
                };

                await this.createSingleTransaction(
                    `${description} (${i + 1}/${installments})`,
                    installmentAmount,
                    'despesa',
                    category,
                    paymentMethod,
                    currentDate.toISOString().split('T')[0],
                    installmentInfo
                );
            }
        } catch (error) {
            console.error('Error adding installment transactions:', error);
            throw new Error('Falha ao adicionar parcelas');
        }
    }

    async filterTransactions() {
        const categoryFilter = document.getElementById('categoryFilter').value;
        const monthFilter = document.getElementById('monthFilter').value;

        let filteredTransactions = [];

        try {
            if (monthFilter === 'todos') {
                filteredTransactions = await this.getAllTransactions();
            } else {
                filteredTransactions = await this.getTransactionsByMonth(monthFilter);
            }

            if (categoryFilter !== 'todas') {
                filteredTransactions = filteredTransactions.filter(t => t.category === categoryFilter);
            }

            await this.renderTransactions(filteredTransactions);
            this.updateTotals(filteredTransactions);
            this.updateChart(filteredTransactions);
        } catch (error) {
            console.error('Error filtering transactions:', error);
            alert('Erro ao filtrar transações');
        }
    }

    async renderTransactions(transactions = null) {
        const transactionsList = document.getElementById('transactionsList');
        const noTransactionsMessage = document.querySelector('.no-transactions');
        const data = transactions || this.transactionsList;

        transactionsList.innerHTML = '';

        if (data.length === 0) {
            noTransactionsMessage.style.display = 'block';
            return;
        }

        noTransactionsMessage.style.display = 'none';

        data.sort((a, b) => new Date(b.date) - new Date(a.date));

        data.forEach(transaction => {
            const li = document.createElement('li');
            li.className = `transaction ${transaction.type}`;

            const installmentInfo = transaction.installmentInfo
                ? `<span class="installment-info">${transaction.installmentInfo.currentInstallment}/${transaction.installmentInfo.totalInstallments}</span>`
                : '';

            li.innerHTML = `
                <div class="transaction-info">
                    <span class="date">${new Date(transaction.date).toLocaleDateString()}</span>
                    <div class="description-group">
                        <i class="${this.getCategoryIcon(transaction.category)}"></i>
                        <span class="description">${transaction.description}</span>
                    </div>
                    <div class="payment-method">
                        <i class="${this.getPaymentIcon(transaction.paymentMethod)}"></i>
                        <span class="method-name">${this.getPaymentMethodName(transaction.paymentMethod)}</span>
                    </div>
                    ${installmentInfo}
                </div>
                <div class="transaction-amount">
                    <span class="amount">R$ ${transaction.amount.toFixed(2)}</span>
                    <button class="delete-btn" data-id="${transaction.id}">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;

            const deleteBtn = li.querySelector('.delete-btn');
            deleteBtn.addEventListener('click', () => this.deleteTransaction(transaction.id));

            transactionsList.appendChild(li);
        });
    }

    updateTotals(transactions = null) {
        const data = transactions || this.transactionsList;
        let totalIncome = 0;
        let totalExpenses = 0;
        let totalCard = 0;

        data.forEach(transaction => {
            const amount = transaction.amount;
            if (transaction.type === 'receita') {
                totalIncome += amount;
            } else {
                totalExpenses += amount;
                if (transaction.paymentMethod === 'cartao_credito') {
                    totalCard += amount;
                }
            }
        });

        document.getElementById('totalReceitas').textContent = totalIncome.toFixed(2);
        document.getElementById('totalDespesas').textContent = totalExpenses.toFixed(2);
        document.getElementById('totalCartao').textContent = totalCard.toFixed(2);
        document.getElementById('saldoTotal').textContent = (totalIncome - totalExpenses).toFixed(2);
    }

    toggleTheme() {
        document.body.classList.toggle('light-theme');
    }

    updateChart(transactions = null) {
        try {
            const ctx = document.getElementById('expensesChart').getContext('2d');
            
            // Destruir o gráfico existente se houver
            if (this.chart) {
                this.chart.destroy();
            }

            // Limpar o canvas
            ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);

            const data = transactions || this.transactionsList;
            const categoryTotals = {};
            let totalExpenses = 0;

            // Calcular totais por categoria
            data
                .filter(t => t.type === 'despesa')
                .forEach(t => {
                    categoryTotals[t.category] = (categoryTotals[t.category] || 0) + t.amount;
                    totalExpenses += t.amount;
                });

            // Se não houver despesas, apenas limpar o canvas
            if (Object.keys(categoryTotals).length === 0) {
                return;
            }

            // Preparar dados para o gráfico
            const labels = Object.keys(categoryTotals).map(category => {
                const amount = categoryTotals[category];
                const percentage = ((amount / totalExpenses) * 100).toFixed(1);
                return `${this.getCategoryName(category)} (${percentage}%)`;
            });

            const chartData = {
                labels,
                datasets: [{
                    data: Object.values(categoryTotals),
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40'
                    ]
                }]
            };

            // Criar novo gráfico
            this.chart = new Chart(ctx, {
                type: 'pie',
                data: chartData,
                options: {
                    animation: {
                        duration: 300
                    },
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: {
                                color: '#ffffff',
                                padding: 10,
                                font: {
                                    size: 12
                                }
                            }
                        }
                    }
                }
            });
        } catch (error) {
            console.error('Error updating chart:', error);
            throw error;
        }
    }

    getCategoryName(category) {
        const categoryNames = {
            'alimentacao': 'Alimentação',
            'transporte': 'Transporte',
            'moradia': 'Moradia',
            'saude': 'Saúde',
            'educacao': 'Educação',
            'lazer': 'Lazer',
            'vestuario': 'Vestuário',
            'tecnologia': 'Tecnologia',
            'servicos': 'Serviços',
            'investimentos': 'Investimentos',
            'viagem': 'Viagem',
            'presente': 'Presentes',
            'outros': 'Outros'
        };
        return categoryNames[category] || category;
    }

    getPaymentMethodName(method) {
        const methodNames = {
            'dinheiro': 'Dinheiro',
            'cartao_credito': 'Cartão de Crédito',
            'cartao_debito': 'Cartão de Débito',
            'pix': 'PIX',
            'boleto': 'Boleto',
            'transferencia': 'Transferência',
            'vale': 'Vale Refeição/Alimentação',
            'cripto': 'Criptomoeda'
        };
        return methodNames[method] || method;
    }

    getCategoryIcon(category) {
        const categoryIcons = {
            'alimentacao': 'fas fa-utensils',
            'transporte': 'fas fa-bus',
            'moradia': 'fas fa-home',
            'saude': 'fas fa-heartbeat',
            'educacao': 'fas fa-graduation-cap',
            'lazer': 'fas fa-gamepad',
            'vestuario': 'fas fa-tshirt',
            'tecnologia': 'fas fa-laptop',
            'servicos': 'fas fa-tools',
            'investimentos': 'fas fa-chart-line',
            'viagem': 'fas fa-plane',
            'presente': 'fas fa-gift',
            'outros': 'fas fa-question-circle'
        };
        return categoryIcons[category] || 'fas fa-question-circle';
    }

    getPaymentIcon(method) {
        const methodIcons = {
            'dinheiro': 'fas fa-money-bill-wave',
            'cartao_credito': 'fas fa-credit-card',
            'cartao_debito': 'fas fa-credit-card',
            'pix': 'fas fa-mobile-alt',
            'boleto': 'fas fa-barcode',
            'transferencia': 'fas fa-exchange-alt',
            'vale': 'fas fa-ticket-alt',
            'cripto': 'fab fa-bitcoin'
        };
        return methodIcons[method] || 'fas fa-money-check';
    }
}

// Initialize app after DOM and scripts are loaded
window.addEventListener('load', () => {
    const financeControl = new FinanceControl();
});
