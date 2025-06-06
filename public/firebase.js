// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyA4iBJU8fzFXX0ShQX_Wg6n4TK4vwM2Mh0",
  authDomain: "controle-financeiro-9d7c4.firebaseapp.com",
  projectId: "controle-financeiro-9d7c4",
  storageBucket: "controle-financeiro-9d7c4.firebasestorage.app",
  messagingSenderId: "698161065367",
  appId: "1:698161065367:web:8ddea9ba6dcb1b723c68d2"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

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
window.getDoc = (docRef) => docRef.get();

// Test connection
try {
    const testRef = db.collection('test');
    console.log('Firestore connection test successful');
} catch (error) {
    console.error('Firestore connection test failed:', error);
}

// Garantir que o Firebase está inicializado antes de exportar
if (!db) {
    console.error('Firebase não inicializado');
    throw new Error('Firebase não inicializado');
}
