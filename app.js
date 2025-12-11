// Firebase V9 - Modular
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.2/firebase-app.js";
import { 
    getAuth, 
    signInWithEmailAndPassword, 
    signOut, 
    onAuthStateChanged,
    createUserWithEmailAndPassword,
    updatePassword,
    reauthenticateWithCredential,
    EmailAuthProvider
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-auth.js";
import { 
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
    getDocs,
    query,
    where,
    orderBy,
    limit,
    updateDoc,
    addDoc,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/9.22.2/firebase-firestore.js";

// Configuração do Firebase (NÃO ALTERAR)
const firebaseConfig = {
    apiKey: "AIzaSyAuCkAymqWECmPWDShZNXrGoFCnSYbWFSo",
    authDomain: "funil-de-vendas-global.firebaseapp.com",
    databaseURL: "https://funil-de-vendas-global-default-rtdb.firebaseio.com",
    projectId: "funil-de-vendas-global",
    storageBucket: "funil-de-vendas-global.firebasestorage.app",
    messagingSenderId: "318100511712",
    appId: "1:318100511712:web:a266f1629231ab420ee985",
    measurementId: "G-ED5Y456EF2"
};

// Inicializar Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Elementos DOM
const loginScreen = document.getElementById('loginScreen');
const mainScreen = document.getElementById('mainScreen');
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userName = document.getElementById('userName');
const userRole = document.getElementById('userRole');
const loginError = document.getElementById('loginError');

// Variáveis globais
let currentUser = null;
let currentUserData = null;
let statusChart = null;
let temperatureChart = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', initApp);

async function initApp() {
    // Verificar estado de autenticação
    onAuthStateChanged(auth, async (user) => {
        if (user) {
            // Usuário logado
            currentUser = user;
            await loadUserData(user.uid);
            showMainScreen();
            setupEventListeners();
            
            // Redirecionar baseado no tipo de usuário
            redirectBasedOnRole();
        } else {
            // Usuário não logado
            showLoginScreen();
        }
    });
}

// ==================== AUTENTICAÇÃO ====================
loginBtn.addEventListener('click', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    if (!email || !password) {
        showError('Por favor, preencha todos os campos');
        return;
    }
    
    try {
        loginBtn.innerHTML = '<span class="loading"></span> Entrando...';
        loginBtn.disabled = true;
        
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Verificar se é um usuário do sistema (tem registro em /users)
        const userDoc = await getDoc(doc(db, 'users', userCredential.user.uid));
        
        if (!userDoc.exists()) {
            // Se não for usuário registrado, verificar credenciais fixas
            if (email === 'supervisor@global.com.br' || email === 'diretoria@global.com.br') {
                // Criar registro para supervisor/diretoria se não existir
                const userType = email === 'supervisor@global.com.br' ? 'supervisor' : 'diretoria';
                await setDoc(doc(db, 'users', userCredential.user.uid), {
                    nome: userType === 'supervisor' ? 'Supervisor' : 'Diretoria',
                    email: email,
                    tipo: userType,
                    criadoEm: serverTimestamp()
                });
            } else {
                throw new Error('Usuário não autorizado');
            }
        }
        
    } catch (error) {
        console.error('Erro no login:', error);
        showError(error.message);
    } finally {
        loginBtn.innerHTML = '<i class="fas fa-sign-in-alt"></i> Entrar';
        loginBtn.disabled = false;
    }
});

logoutBtn.addEventListener('click', async () => {
    try {
        await signOut(auth);
    } catch (error) {
        console.error('Erro ao sair:', error);
    }
});

// ==================== GERENCIAMENTO DE USUÁRIOS ====================
async function loadUserData(uid) {
    try {
        const userDoc = await getDoc(doc(db, 'users', uid));
        
        if (userDoc.exists()) {
            currentUserData = userDoc.data();
            
            // Atualizar interface
            userName.textContent = currentUserData.nome;
            userRole.textContent = getRoleDisplayName(currentUserData.tipo);
            
            // Mostrar/ocultar menu admin
            const adminMenu = document.querySelector('.admin-only');
            if (currentUserData.tipo === 'diretoria') {
                adminMenu.style.display = 'block';
            } else {
                adminMenu.style.display = 'none';
            }
            
            // Atualizar perfil
            updateProfileInfo();
        }
    } catch (error) {
        console.error('Erro ao carregar dados do usuário:', error);
    }
}

function getRoleDisplayName(role) {
    const roles = {
        'vendedor': 'Vendedor',
        'supervisor': 'Supervisor',
        'diretoria': 'Diretoria',
        'admin': 'Administrador'
    };
    return roles[role] || role;
}

// ==================== GERENCIAMENTO DE LEADS ====================
async function saveLead(leadData) {
    try {
        // Obter data atual para estrutura de pastas
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        // Gerar ID único
        const leadId = Date.now().toString(36) + Math.random().toString(36).substr(2);
        
        // Preparar dados do lead
        const lead = {
            criadoPor: currentUser.uid,
            vendedorNome: currentUserData.nome,
            nome: leadData.nome,
            telefone: leadData.telefone,
            email: leadData.email,
            endereco: leadData.endereco,
            temperatura: leadData.temperatura,
            status: leadData.status,
            dataVisitaISO: leadData.dataVisitaISO,
            dataVisitaFormatada: leadData.dataVisitaFormatada,
            timestampCriacao: serverTimestamp(),
            atualizadoEm: serverTimestamp()
        };
        
        // Salvar no Firestore com estrutura /leads/ano/mes/leadId
        await setDoc(doc(db, 'leads', year.toString(), month, leadId), lead);
        
        return true;
    } catch (error) {
        console.error('Erro ao salvar lead:', error);
        throw error;
    }
}

async function getLeads(filters = {}) {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        // Construir query baseada nas permissões
        let leadsRef = collection(db, 'leads', year.toString(), month);
        let q;
        
        if (currentUserData.tipo === 'vendedor') {
            // Vendedor só vê seus próprios leads
            q = query(leadsRef, where('criadoPor', '==', currentUser.uid));
        } else {
            // Supervisor e Diretoria veem todos os leads
            q = query(leadsRef, orderBy('timestampCriacao', 'desc'));
        }
        
        // Aplicar filtro de status se fornecido
        if (filters.status && filters.status !== 'all') {
            q = query(q, where('status', '==', filters.status));
        }
        
        const querySnapshot = await getDocs(q);
        const leads = [];
        
        querySnapshot.forEach((doc) => {
            leads.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        return leads;
    } catch (error) {
        console.error('Erro ao buscar leads:', error);
        return [];
    }
}

async function updateLead(leadId, updates) {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        const leadRef = doc(db, 'leads', year.toString(), month, leadId);
        await updateDoc(leadRef, {
            ...updates,
            atualizadoEm: serverTimestamp()
        });
        
        return true;
    } catch (error) {
        console.error('Erro ao atualizar lead:', error);
        throw error;
    }
}

// ==================== DASHBOARD ====================
async function loadDashboardData(filter = 'month') {
    try {
        const leads = await getLeads();
        
        // Aplicar filtro de data
        const filteredLeads = filterLeadsByDate(leads, filter);
        
        // Atualizar estatísticas
        updateStats(filteredLeads);
        
        // Atualizar gráficos
        updateCharts(filteredLeads);
        
        // Atualizar tabela de leads recentes
        updateRecentLeadsTable(filteredLeads.slice(0, 10));
        
    } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
    }
}

function filterLeadsByDate(leads, filter) {
    const now = new Date();
    
    switch(filter) {
        case 'today':
            const today = now.toDateString();
            return leads.filter(lead => {
                const leadDate = new Date(lead.dataVisitaISO).toDateString();
                return leadDate === today;
            });
            
        case 'week':
            const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
            return leads.filter(lead => new Date(lead.dataVisitaISO) >= weekAgo);
            
        case 'month':
            const monthAgo = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
            return leads.filter(lead => new Date(lead.dataVisitaISO) >= monthAgo);
            
        default:
            return leads;
    }
}

function updateStats(leads) {
    const totalLeads = leads.length;
    const hotLeads = leads.filter(lead => lead.temperatura === 'quente').length;
    const wonLeads = leads.filter(lead => lead.status === 'ganho').length;
    const conversionRate = totalLeads > 0 ? Math.round((wonLeads / totalLeads) * 100) : 0;
    
    document.getElementById('totalLeads').textContent = totalLeads;
    document.getElementById('hotLeads').textContent = hotLeads;
    document.getElementById('wonLeads').textContent = wonLeads;
    document.getElementById('conversionRate').textContent = `${conversionRate}%`;
}

function updateCharts(leads) {
    // Dados para gráfico de status
    const statusData = {
        'aberto': 0,
        'em negociação': 0,
        'proposta enviada': 0,
        'ganho': 0,
        'perdido': 0
    };
    
    // Dados para gráfico de temperatura
    const temperatureData = {
        'frio': 0,
        'morno': 0,
        'quente': 0
    };
    
    leads.forEach(lead => {
        statusData[lead.status]++;
        temperatureData[lead.temperatura]++;
    });
    
    // Atualizar ou criar gráfico de status
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    
    if (statusChart) {
        statusChart.destroy();
    }
    
    statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: Object.keys(statusData),
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: [
                    '#4A90E2', // Aberto - Azul
                    '#FFA726', // Em negociação - Laranja
                    '#AB47BC', // Proposta enviada - Roxo
                    '#66BB6A', // Ganho - Verde
                    '#EF5350'  // Perdido - Vermelho
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
    
    // Atualizar ou criar gráfico de temperatura
    const temperatureCtx = document.getElementById('temperatureChart').getContext('2d');
    
    if (temperatureChart) {
        temperatureChart.destroy();
    }
    
    temperatureChart = new Chart(temperatureCtx, {
        type: 'doughnut',
        data: {
            labels: Object.keys(temperatureData),
            datasets: [{
                data: Object.values(temperatureData),
                backgroundColor: [
                    '#4A90E2', // Frio - Azul
                    '#FFA726', // Morno - Laranja
                    '#EF5350'  // Quente - Vermelho
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'bottom'
                }
            }
        }
    });
}

function updateRecentLeadsTable(leads) {
    const tbody = document.querySelector('#recentLeadsTable tbody');
    tbody.innerHTML = '';
    
    leads.forEach(lead => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${lead.nome}</td>
            <td>${formatPhone(lead.telefone)}</td>
            <td><span class="temperatura-${lead.temperatura} status-tag">${lead.temperatura}</span></td>
            <td><span class="status-${lead.status.replace(' ', '-')} status-tag">${lead.status}</span></td>
            <td>${lead.dataVisitaFormatada}</td>
            <td>${lead.vendedorNome || 'N/A'}</td>
        `;
        
        tbody.appendChild(row);
    });
}

// ==================== FORMULÁRIO DE LEAD ====================
function setupLeadForm() {
    const form = document.getElementById('leadForm');
    const visitDateInput = document.getElementById('leadVisitDate');
    
    // Definir data mínima como hoje
    const today = new Date().toISOString().split('T')[0];
    visitDateInput.min = today;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Validar data
        const visitDate = new Date(visitDateInput.value);
        const todayObj = new Date();
        todayObj.setHours(0, 0, 0, 0);
        
        if (visitDate < todayObj) {
            showMessage('leadMessage', 'A data da visita não pode ser no passado', 'error');
            return;
        }
        
        try {
            // Formatar data
            const formattedDate = formatDate(visitDate);
            
            const leadData = {
                nome: document.getElementById('leadName').value.trim(),
                telefone: document.getElementById('leadPhone').value.trim(),
                email: document.getElementById('leadEmail').value.trim(),
                endereco: document.getElementById('leadAddress').value.trim(),
                temperatura: document.getElementById('leadTemperature').value,
                status: document.getElementById('leadStatus').value,
                dataVisitaISO: visitDate.toISOString(),
                dataVisitaFormatada: formattedDate
            };
            
            // Validar campos obrigatórios
            for (const [key, value] of Object.entries(leadData)) {
                if (!value) {
                    showMessage('leadMessage', `Por favor, preencha o campo: ${key}`, 'error');
                    return;
                }
            }
            
            await saveLead(leadData);
            
            // Limpar formulário e mostrar sucesso
            form.reset();
            showMessage('leadMessage', 'Lead cadastrado com sucesso!', 'success');
            
            // Atualizar listas
            if (document.getElementById('leads').classList.contains('active')) {
                loadLeadsTable();
            }
            
            if (document.getElementById('dashboard').classList.contains('active')) {
                loadDashboardData(document.getElementById('dashboardFilter').value);
            }
            
        } catch (error) {
            showMessage('leadMessage', 'Erro ao salvar lead: ' + error.message, 'error');
        }
    });
}

// ==================== TABELA DE LEADS ====================
async function loadLeadsTable() {
    const filter = document.getElementById('leadsFilter').value;
    const leads = await getLeads({ status: filter });
    const tbody = document.querySelector('#leadsTable tbody');
    
    tbody.innerHTML = '';
    
    leads.forEach(lead => {
        const row = document.createElement('tr');
        
        row.innerHTML = `
            <td>${lead.nome}</td>
            <td>${formatPhone(lead.telefone)}</td>
            <td>${lead.email}</td>
            <td><span class="temperatura-${lead.temperatura} status-tag">${lead.temperatura}</span></td>
            <td><span class="status-${lead.status.replace(' ', '-')} status-tag">${lead.status}</span></td>
            <td>${lead.dataVisitaFormatada}</td>
            <td>
                ${currentUserData.tipo !== 'vendedor' ? 
                    `<button class="btn btn-sm btn-secondary" onclick="editLead('${lead.id}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>` : 
                    `<span class="text-muted">Somente leitura</span>`
                }
            </td>
        `;
        
        tbody.appendChild(row);
    });
}

// ==================== ADMINISTRAÇÃO ====================
function setupAdminForm() {
    const form = document.getElementById('adminForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('adminName').value.trim();
        const email = document.getElementById('adminEmail').value.trim();
        const password = document.getElementById('adminPassword').value;
        const confirmPassword = document.getElementById('adminConfirmPassword').value;
        
        // Validações
        if (password !== confirmPassword) {
            showMessage('adminMessage', 'As senhas não coincidem', 'error');
            return;
        }
        
        if (password.length < 6) {
            showMessage('adminMessage', 'A senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }
        
        try {
            // Criar usuário no Firebase Auth
            const userCredential = await createUserWithEmailAndPassword(auth, email, password);
            
            // Salvar dados no Firestore
            await setDoc(doc(db, 'users', userCredential.user.uid), {
                nome: name,
                email: email,
                tipo: 'vendedor',
                criadoPor: currentUser.uid,
                criadoEm: serverTimestamp()
            });
            
            // Limpar formulário e mostrar sucesso
            form.reset();
            showMessage('adminMessage', 'Vendedor criado com sucesso!', 'success');
            
            // Atualizar lista de usuários
            loadUsersList();
            
        } catch (error) {
            console.error('Erro ao criar vendedor:', error);
            showMessage('adminMessage', 'Erro: ' + error.message, 'error');
        }
    });
}

async function loadUsersList() {
    try {
        const usersRef = collection(db, 'users');
        const q = query(usersRef, where('tipo', '==', 'vendedor'));
        const querySnapshot = await getDocs(q);
        
        const tbody = document.querySelector('#usersTable tbody');
        tbody.innerHTML = '';
        
        querySnapshot.forEach((doc) => {
            const user = doc.data();
            const row = document.createElement('tr');
            
            row.innerHTML = `
                <td>${user.nome}</td>
                <td>${user.email}</td>
                <td><span class="badge badge-info">${getRoleDisplayName(user.tipo)}</span></td>
                <td>${user.criadoEm ? formatFirebaseDate(user.criadoEm) : 'N/A'}</td>
            `;
            
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Erro ao carregar lista de usuários:', error);
    }
}

// ==================== PERFIL E SENHA ====================
function updateProfileInfo() {
    if (!currentUserData) return;
    
    document.getElementById('profileName').textContent = currentUserData.nome;
    document.getElementById('profileEmail').textContent = currentUserData.email;
    document.getElementById('profileRole').textContent = getRoleDisplayName(currentUserData.tipo);
    
    if (currentUser.metadata.creationTime) {
        const creationDate = new Date(currentUser.metadata.creationTime);
        document.getElementById('profileSince').textContent = `Membro desde: ${formatDate(creationDate)}`;
    }
}

function setupPasswordChangeForm() {
    const form = document.getElementById('changePasswordForm');
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('currentPassword').value;
        const newPassword = document.getElementById('newPassword').value;
        const confirmNewPassword = document.getElementById('confirmNewPassword').value;
        
        // Validações
        if (newPassword !== confirmNewPassword) {
            showMessage('passwordMessage', 'As novas senhas não coincidem', 'error');
            return;
        }
        
        if (newPassword.length < 6) {
            showMessage('passwordMessage', 'A nova senha deve ter no mínimo 6 caracteres', 'error');
            return;
        }
        
        try {
            // Reautenticar usuário
            const credential = EmailAuthProvider.credential(currentUser.email, currentPassword);
            await reauthenticateWithCredential(currentUser, credential);
            
            // Atualizar senha
            await updatePassword(currentUser, newPassword);
            
            // Limpar formulário e mostrar sucesso
            form.reset();
            showMessage('passwordMessage', 'Senha alterada com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao alterar senha:', error);
            
            let errorMessage = 'Erro ao alterar senha';
            if (error.code === 'auth/wrong-password') {
                errorMessage = 'Senha atual incorreta';
            } else if (error.code === 'auth/weak-password') {
                errorMessage = 'A nova senha é muito fraca';
            }
            
            showMessage('passwordMessage', errorMessage, 'error');
        }
    });
}

// ==================== MODAL DE EDIÇÃO ====================
window.editLead = async function(leadId) {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = String(now.getMonth() + 1).padStart(2, '0');
        
        const leadDoc = await getDoc(doc(db, 'leads', year.toString(), month, leadId));
        
        if (leadDoc.exists()) {
            const lead = leadDoc.data();
            
            document.getElementById('editLeadId').value = leadId;
            document.getElementById('editTemperature').value = lead.temperatura;
            document.getElementById('editStatus').value = lead.status;
            
            // Mostrar modal
            document.getElementById('editLeadModal').classList.add('active');
        }
    } catch (error) {
        console.error('Erro ao carregar lead para edição:', error);
    }
};

// Configurar modal de edição
function setupEditModal() {
    const modal = document.getElementById('editLeadModal');
    const closeBtn = modal.querySelector('.modal-close');
    const form = document.getElementById('editLeadForm');
    
    // Fechar modal
    closeBtn.addEventListener('click', () => {
        modal.classList.remove('active');
    });
    
    // Fechar ao clicar fora
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.remove('active');
        }
    });
    
    // Submeter edição
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const leadId = document.getElementById('editLeadId').value;
        const temperatura = document.getElementById('editTemperature').value;
        const status = document.getElementById('editStatus').value;
        
        try {
            await updateLead(leadId, { temperatura, status });
            
            // Fechar modal
            modal.classList.remove('active');
            
            // Atualizar tabelas
            loadLeadsTable();
            loadDashboardData(document.getElementById('dashboardFilter').value);
            
            showMessage('leadMessage', 'Lead atualizado com sucesso!', 'success');
            
        } catch (error) {
            console.error('Erro ao atualizar lead:', error);
            alert('Erro ao atualizar lead: ' + error.message);
        }
    });
}

// ==================== UTILITÁRIOS ====================
function formatDate(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatFirebaseDate(timestamp) {
    if (!timestamp) return 'N/A';
    
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return formatDate(date);
}

function formatPhone(phone) {
    // Formatar telefone no padrão brasileiro
    const cleaned = phone.replace(/\D/g, '');
    
    if (cleaned.length === 11) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 7)}-${cleaned.substring(7)}`;
    } else if (cleaned.length === 10) {
        return `(${cleaned.substring(0, 2)}) ${cleaned.substring(2, 6)}-${cleaned.substring(6)}`;
    }
    
    return phone;
}

function showError(message) {
    loginError.textContent = message;
    loginError.style.display = 'block';
    
    // Esconder após 5 segundos
    setTimeout(() => {
        loginError.style.display = 'none';
    }, 5000);
}

function showMessage(elementId, message, type = 'success') {
    const element = document.getElementById(elementId);
    element.textContent = message;
    element.style.display = 'block';
    element.className = type === 'success' ? 'success-message' : 'error-message';
    
    // Esconder após 5 segundos
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

// ==================== CONTROLE DE TELAS ====================
function showLoginScreen() {
    loginScreen.classList.add('active');
    mainScreen.classList.remove('active');
}

function showMainScreen() {
    loginScreen.classList.remove('active');
    mainScreen.classList.add('active');
}

function redirectBasedOnRole() {
    if (!currentUserData) return;
    
    const role = currentUserData.tipo;
    
    // Remover active de todas as seções
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    
    // Redirecionar baseado no papel
    let targetSection = 'dashboard';
    let targetLink = '[data-section="dashboard"]';
    
    switch(role) {
        case 'vendedor':
            targetSection = 'newLead';
            targetLink = '[data-section="newLead"]';
            break;
        case 'supervisor':
            targetSection = 'leads';
            targetLink = '[data-section="leads"]';
            break;
        case 'diretoria':
            targetSection = 'dashboard';
            targetLink = '[data-section="dashboard"]';
            break;
    }
    
    // Ativar seção e link correspondentes
    document.getElementById(targetSection).classList.add('active');
    document.querySelector(targetLink).classList.add('active');
}

// ==================== SETUP EVENT LISTENERS ====================
function setupEventListeners() {
    // Filtro do dashboard
    document.getElementById('dashboardFilter').addEventListener('change', (e) => {
        loadDashboardData(e.target.value);
    });
    
    // Filtro da lista de leads
    document.getElementById('leadsFilter').addEventListener('change', () => {
        loadLeadsTable();
    });
    
    // Botão de exportar (simulado)
    document.getElementById('exportLeadsBtn').addEventListener('click', () => {
        alert('Funcionalidade de exportação será implementada em breve!');
    });
    
    // Formulários
    setupLeadForm();
    setupAdminForm();
    setupPasswordChangeForm();
    setupEditModal();
    
    // Carregar dados iniciais
    loadDashboardData();
    loadLeadsTable();
    loadUsersList();
}

// Exportar funções para uso no HTML
window.editLead = editLead;
