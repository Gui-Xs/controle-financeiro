// Configuração do Firebase
const firebaseConfig = {
    apiKey: "AIzaSyA4iBJU8fzFXX0ShQX_Wg6n4TK4vwM2Mh0",
    authDomain: "controle-financeiro-9d7c4.firebaseapp.com",
    projectId: "controle-financeiro-9d7c4",
    storageBucket: "controle-financeiro-9d7c4.firebasestorage.app",
    messagingSenderId: "698161065367",
    appId: "1:698161065367:web:8ddea9ba6dcb1b723c68d2"
};

// Inicializar Firebase
firebase.initializeApp(firebaseConfig);

// Configurar autenticação
const auth = firebase.auth();

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
