// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4iBJU8fzFXX0ShQX_Wg6n4TK4vwM2Mh0",
  authDomain: "controle-financeiro-9d7c4.firebaseapp.com",
  projectId: "controle-financeiro-9d7c4",
  storageBucket: "controle-financeiro-9d7c4.firebasestorage.app",
  messagingSenderId: "698161065367",
  appId: "1:698161065367:web:8ddea9ba6dcb1b723c68d2"
};

// Export Firebase config
window.firebaseConfig = firebaseConfig;

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Initialize Firebase Storage
const storage = firebase.storage();

// Export Storage reference
window.storage = storage;

// Export Storage reference
window.storage = storage;

// Export Storage functions
window.deleteFile = async (path) => {
    try {
        const fileRef = storage.ref(path);
        await fileRef.delete();
        console.log('Arquivo deletado com sucesso:', path);
        return true;
    } catch (error) {
        console.error('Erro ao deletar arquivo:', error);
        throw error;
    }
};

// Export Storage reference
window.storageRef = (path) => storage.ref(path);

// Test connection
try {
    const testRef = db.collection('test');
    console.log('Firestore connection test successful');
} catch (error) {
    console.error('Firestore connection test failed:', error);
}

// Export functions
window.auth = auth;
window.db = db;
window.transactionsRef = db.collection('transactions');
window.recurringTransactionsRef = db.collection('recurringTransactions');
window.testRef = db.collection('test');

// Export Firestore functions
window.addDoc = (ref, data) => ref.add(data);
window.getDocs = (ref) => ref.get();
window.deleteDoc = (docRef) => docRef.delete();
window.doc = (ref, id) => ref.doc(id);
window.query = (ref, ...conditions) => {
    let q = ref;
    conditions.forEach(condition => {
        q = q.where(...condition);
    });
    return q;
};
window.where = (field, operator, value) => [field, operator, value];
