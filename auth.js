// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyDVNqFG5frUKXcy4zB-f5zYZNpWvABxCgE",
    authDomain: "controle-financeiro-8f7e4.firebaseapp.com",
    projectId: "controle-financeiro-8f7e4",
    storageBucket: "controle-financeiro-8f7e4.appspot.com",
    messagingSenderId: "698161065367",
    appId: "1:698161065367:web:8ddea9ba6dcb1b723c68d2"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Configurar autenticação
const auth = firebase.auth();

// Verificar resultado do redirecionamento
auth.getRedirectResult().then((result) => {
    if (result && result.user) {
        console.log('Login redirecionado bem sucedido, verificando UID...');
        if (result.user.uid !== 'GB0bUGXjtgUvNQoXrCsiOW6HXYJ2') {
            console.log('UID não autorizado');
            auth.signOut();
            alert('Acesso não autorizado. Apenas o proprietário pode acessar este aplicativo.');
        }
    }
}).catch((error) => {
    console.error('Erro no redirecionamento:', error);
});

// Função para atualizar a interface com base no estado de autenticação
function updateUI(user) {
    if (user && user.uid === 'GB0bUGXjtgUvNQoXrCsiOW6HXYJ2') {
        console.log('Usuário autorizado:', user.uid);
        document.getElementById('appContent').style.display = 'block';
        document.getElementById('loginBtn').style.display = 'none';
        document.getElementById('logoutBtn').style.display = 'block';
    } else {
        console.log('Usuário não autorizado ou não logado');
        document.getElementById('appContent').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
    }
}

// Adicionar listener para mudanças de autenticação
auth.onAuthStateChanged((user) => {
    console.log('Estado de autenticação mudou:', user ? user.uid : 'nenhum usuário');
    updateUI(user);
});

// Função para fazer login
async function login() {
    try {
        console.log('Iniciando processo de login...');
        const provider = new firebase.auth.GoogleAuthProvider();
        provider.setCustomParameters({
            prompt: 'select_account'
        });
        
        // Usar redirecionamento em vez de popup
        await auth.signInWithRedirect(provider);
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        alert('Erro ao fazer login. Por favor, tente novamente.');
    }
}

// Função para fazer logout
async function logout() {
    try {
        await auth.signOut();
        console.log('Logout realizado com sucesso');
        updateUI(null);
    } catch (error) {
        console.error('Erro ao fazer logout:', error);
        alert('Erro ao fazer logout. Por favor, tente novamente.');
    }
}

// Adicionar eventos aos botões quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

// Exportar funções
window.auth = auth;
window.login = login;
window.logout = logout;

// Função para verificar se o usuário está logado
function checkAuth() {
    return new Promise((resolve) => {
        auth.onAuthStateChanged(user => {
            if (user && user.uid === 'GB0bUGXjtgUvNQoXrCsiOW6HXYJ2') {
                document.getElementById('appContent').style.display = 'block';
                document.getElementById('loginBtn').style.display = 'none';
                document.getElementById('logoutBtn').style.display = 'block';
            } else {
                document.getElementById('appContent').style.display = 'none';
                document.getElementById('loginBtn').style.display = 'block';
                document.getElementById('logoutBtn').style.display = 'none';
            }
            resolve(user);
        });
    });
}

// Função para fazer login
async function login() {
    try {
        const provider = new firebase.auth.GoogleAuthProvider();
        const result = await auth.signInWithPopup(provider);
        if (result.user.uid === 'GB0bUGXjtgUvNQoXrCsiOW6HXYJ2') {
            document.getElementById('appContent').style.display = 'block';
            document.getElementById('loginBtn').style.display = 'none';
            document.getElementById('logoutBtn').style.display = 'block';
        }
        return result.user;
    } catch (error) {
        console.error('Erro ao fazer login:', error);
        throw error;
    }
}

// Função para fazer logout
function logout() {
    auth.signOut().then(() => {
        document.getElementById('appContent').style.display = 'none';
        document.getElementById('loginBtn').style.display = 'block';
        document.getElementById('logoutBtn').style.display = 'none';
    });
}

// Verificar autenticação quando a página carregar
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    
    // Adicionar eventos aos botões
    document.getElementById('loginBtn').addEventListener('click', login);
    document.getElementById('logoutBtn').addEventListener('click', logout);
});

// Exportar funções
window.auth = auth;
window.checkAuth = checkAuth;
window.login = login;
window.logout = logout;
