// Configurar provedor do Google com opções de segurança e compatibilidade
const provider = new firebase.auth.GoogleAuthProvider();
provider.setCustomParameters({
    prompt: 'select_account',
    cookie_policy: 'single_host_origin'
});

// Configurar opções de autenticação com persistência local
firebase.auth().setPersistence(firebase.auth.Auth.Persistence.LOCAL);

// Configurar opções de popup
provider.addScope('https://www.googleapis.com/auth/userinfo.email');
provider.addScope('https://www.googleapis.com/auth/userinfo.profile');

// Configurar opções adicionais para segurança
provider.setCustomParameters({
    hd: 'gmail.com', // Restringir para contas Gmail
    access_type: 'offline',
    login_hint: 'user@example.com' // Substitua pelo email do usuário
});

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
    
    if (user) {
        console.log('Usuário logado:', user.uid);
        mainContent.style.display = 'block';
        logoutBtn.style.display = 'block';
    } else {
        console.log('Usuário não logado');
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
        
        console.log('Usuário logado com sucesso');
        updateUI(result.user);
        
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
