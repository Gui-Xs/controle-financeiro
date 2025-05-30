// Configuração do Firebase
console.log('Iniciando configuração do Firebase...');
const firebaseConfig = {
    apiKey: "AIzaSyA4iBJU8fzFXX0ShQX_Wg6n4TK4vwM2Mh0",
    authDomain: "controle-financeiro-9d7c4.firebaseapp.com",
    projectId: "controle-financeiro-9d7c4",
    storageBucket: "controle-financeiro-9d7c4.firebasestorage.app",
    messagingSenderId: "698161065367",
    appId: "1:698161065367:web:8ddea9ba6dcb1b723c68d2",
    cookieFlags: 'SameSite=None; Secure; Partitioned'
};

// Inicializar Firebase
console.log('Iniciando Firebase...');
firebase.initializeApp(firebaseConfig);
const app = firebase.app();
console.log('Firebase inicializado:', app.name);

// Configurar autenticação
const auth = firebase.auth();
console.log('Autenticação configurada:', auth);

// Configurar provedor do Google
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account'
});

// Configurar opções de autenticação
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);

// Configurar opções de popup
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Configurar opções de autenticação
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.SESSION);

console.log('Provedor do Google configurado com configurações de cookie');

// Função para atualizar a interface
function updateUI(user) {
    console.log('Atualizando UI...', user ? user.uid : 'nenhum usuário');
    
    const loginScreen = document.getElementById('loginScreen');
    const mainContent = document.getElementById('mainContent');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    // Verificar se os elementos existem antes de manipulá-los
    if (!loginScreen || !mainContent || !loginBtn || !logoutBtn) {
        console.error('Elementos não encontrados no DOM');
        return;
    }
    
    // Garantir que apenas uma tela seja visível
    loginScreen.style.display = 'none';
    mainContent.style.display = 'none';
    loginBtn.style.display = 'block';
    logoutBtn.style.display = 'none';
    
    if (user && user.uid === 'GB0bUGXjtgUvNQoXrCsiOW6HXYJ2') {
        console.log('Usuário autorizado:', user.uid);
        mainContent.style.display = 'block';
        logoutBtn.style.display = 'block';
        
        // Adicionar evento de submit do formulário após o login bem-sucedido
        const form = document.getElementById('transactionForm');
        if (form) {
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                try {
                    await window.addTransaction(e);
                    console.log('Transação adicionada com sucesso');
                } catch (error) {
                    console.error('Erro ao adicionar transação:', error);
                    alert('Erro ao adicionar transação. Por favor, tente novamente.');
                }
            });
            console.log('Evento de submit adicionado ao formulário após login');
        }
    } else {
        console.log('Usuário não autorizado ou não logado');
        loginScreen.style.display = 'block';
        loginBtn.style.display = 'block';
    }
}

// Função para fazer login
async function login() {
    console.log('Iniciando login...');
    try {
        console.log('Iniciando signInWithPopup...');
        const result = await auth.signInWithPopup(provider);
        console.log('Resultado do login:', result);
        
        if (!result) {
            throw new Error('Resultado do login é nulo');
        }

        if (!result.user) {
            throw new Error('Usuário não encontrado no resultado');
        }

        console.log('UID do usuário:', result.user.uid);
        
        if (result.user.uid === 'GB0bUGXjtgUvNQoXrCsiOW6HXYJ2') {
            console.log('UID autorizado');
            updateUI(result.user);
        } else {
            console.log('UID não autorizado:', result.user.uid);
            throw new Error('Usuário não autorizado');
        }
        
        return result.user;
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Erro ao fazer login: ' + error.message);
        // Limpar qualquer popup pendente
        if (window.opener) {
            window.opener = null;
            alert(error.message || 'Erro ao fazer login. Por favor, tente novamente.');
        }
        throw error;
    }
}

// Função para fazer logout
async function logout() {
    console.log('Iniciando logout...');
    try {
        await auth.signOut();
        console.log('Logout bem sucedido');
        updateUI(null);
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
    }
}

// Adicionar listener para mudanças de autenticação
console.log('Adicionando listener de autenticação...');
auth.onAuthStateChanged(user => {
    console.log('Estado de autenticação mudou:', user ? user.uid : 'nenhum usuário');
    updateUI(user);
});

// Adicionar eventos aos botões quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    console.log('Adicionando eventos aos botões...');
    const loginBtn = document.getElementById('loginBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (loginBtn) {
        loginBtn.addEventListener('click', login);
    } else {
        console.error('Botão de login não encontrado');
    }
    
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    } else {
        console.error('Botão de logout não encontrado');
    }
});

// Exportar funções
window.auth = auth;
window.login = login;
window.logout = logout;
