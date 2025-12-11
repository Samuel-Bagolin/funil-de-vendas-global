// ==================== CONFIGURAÇÃO FIREBASE ====================
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
const app = firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// ==================== VARIÁVEIS GLOBAIS ====================
let currentUser = null;
let currentUserRole = null;
let currentUserId = null;
let statusChart = null;
let sellerChart = null;
let myStatusChart = null;
let myCityChart = null;

// ==================== INICIALIZAÇÃO ====================
document.addEventListener('DOMContentLoaded', function() {
    initApp();
    setupEventListeners();
});

async function initApp() {
    // Monitorar estado de autenticação
    auth.onAuthStateChanged(async (user) => {
        if (user) {
            currentUser = user;
            currentUserId = user.uid;
            await loadUserData();
            showMainScreen();
            setupNavigation();
        } else {
            showLoginScreen();
        }
    });
}

// ==================== AUTENTICAÇÃO ====================
async function setupEventListeners() {
    // Login
    document.getElementById('loginBtn').addEventListener('click', handleLogin);
    
    // Esqueci senha
    document.getElementById('forgotPasswordBtn').addEventListener('click', () => {
        document.getElementById('resetPasswordModal').classList.add('active');
    });
    
    // Enviar reset senha
    document.getElementById('sendResetBtn').addEventListener('click', handleResetPassword);
    
    // Logout
    document.getElementById('logoutBtn').addEventListener('click', handleLogout);
    
    // Fechar modais
    document.querySelectorAll('.modal-close').forEach(closeBtn => {
        closeBtn.addEventListener('click', function() {
            this.closest('.modal').classList.remove('active');
        });
    });
    
    // Fechar modal ao clicar fora
    document.querySelectorAll('.modal').forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

async function handleLogin() {
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const errorElement = document.getElementById('loginError');
    
    if (!email || !password) {
        showError(errorElement, 'Preencha e-mail e senha');
        return;
    }
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        console.log('Login realizado:', userCredential.user.uid);
    } catch (error) {
        console.error('Erro login:', error);
        showError(errorElement, getAuthErrorMessage(error.code));
    }
}

function handleResetPassword() {
    const email = document.getElementById('resetEmail').value;
    const messageElement = document.getElementById('resetMessage');
    
    if (!email) {
        messageElement.textContent = 'Digite seu e-mail';
        messageElement.style.color = '#c33';
        return;
    }
    
    auth.sendPasswordResetEmail(email)
        .then(() => {
            messageElement.textContent = 'Link enviado! Verifique seu e-mail.';
            messageElement.style.color = '#367C2B';
            setTimeout(() => {
                document.getElementById('resetPasswordModal').classList.remove('active');
            }, 2000);
        })
        .catch(error => {
            messageElement.textContent = getAuthErrorMessage(error.code);
            messageElement.style.color = '#c33';
        });
}

async function handleLogout() {
    try {
        await auth.signOut();
    } catch (error) {
        console.error('Erro logout:', error);
    }
}

// ==================== GERENCIAMENTO DE USUÁRIOS ====================
async function loadUserData() {
    try {
        const userRef = database.ref('users/' + currentUserId);
        const snapshot = await userRef.once('value');
        
        if (snapshot.exists()) {
            const userData = snapshot.val();
            currentUserRole = userData.role || 'vendedor';
            
            // Atualizar header
            document.getElementById('userInfo').textContent = 
                `${userData.name || currentUser.email} (${getRoleName(currentUserRole)})`;
        } else {
            // Usuário não existe no DB, criar registro
            currentUserRole = 'vendedor';
            
            // Verificar se é supervisor pelo email
            if (currentUser.email === 'supervisor@global.com.br') {
                currentUserRole = 'supervisor';
            }
            
            await userRef.set({
                name: currentUser.displayName || currentUser.email.split('@')[0],
                email: currentUser.email,
                role: currentUserRole,
                phone: '',
                status: 'ativo',
                createdAt: firebase.database.ServerValue.TIMESTAMP
            });
            
            document.getElementById('userInfo').textContent = 
                `${currentUser.email.split('@')[0]} (${getRoleName(currentUserRole)})`;
        }
    } catch (error) {
        console.error('Erro carregar user:', error);
    }
}

function getRoleName(role) {
    return role === 'supervisor' ? 'Supervisor' : 'Vendedor';
}

// ==================== NAVEGAÇÃO SPA ====================
function setupNavigation() {
    const navMenu = document.getElementById('navMenu');
    navMenu.innerHTML = '';
    
    // Itens baseados no role
    if (currentUserRole === 'supervisor') {
        navMenu.innerHTML = `
            <li class="nav-item">
                <a href="#" class="nav-link active" data-section="dashboardSupervisor">
                    <i class="fas fa-chart-line"></i> Dashboard
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link" data-section="sellerRegister">
                    <i class="fas fa-user-plus"></i> Vendedores
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link" data-section="leadsList">
                    <i class="fas fa-list"></i> Todos os Leads
                </a>
            </li>
        `;
        
        // Carregar dashboard supervisor
        loadDashboardSupervisor();
        loadSellersList();
    } else {
        navMenu.innerHTML = `
            <li class="nav-item">
                <a href="#" class="nav-link active" data-section="dashboardSeller">
                    <i class="fas fa-chart-line"></i> Meu Dashboard
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link" data-section="leadRegister">
                    <i class="fas fa-plus-circle"></i> Novo Lead
                </a>
            </li>
            <li class="nav-item">
                <a href="#" class="nav-link" data-section="leadsList">
                    <i class="fas fa-list"></i> Meus Leads
                </a>
            </li>
        `;
        
        // Carregar dashboard vendedor
        loadDashboardSeller();
        loadSellersForSelect();
    }
    
    // Configurar navegação
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', function(e) {
            e.preventDefault();
            
            // Remover active de todos
            document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            
            // Adicionar active ao clicado
            this.classList.add('active');
            const sectionId = this.getAttribute('data-section');
            document.getElementById(sectionId).classList.add('active');
            
            // Carregar dados da seção
            switch(sectionId) {
                case 'dashboardSupervisor':
                    loadDashboardSupervisor();
                    break;
                case 'sellerRegister':
                    loadSellersList();
                    break;
                case 'leadRegister':
                    loadSellersForSelect();
                    setupLeadForm();
                    break;
                case 'leadsList':
                    loadLeadsList();
                    setupFilters();
                    break;
                case 'dashboardSeller':
                    loadDashboardSeller();
                    break;
            }
        });
    });
    
    // Botão voltar
    document.getElementById('backToList').addEventListener('click', () => {
        document.getElementById('leadsList').classList.add('active');
        document.getElementById('leadDetails').classList.remove('active');
        document.querySelector('.nav-link[data-section="leadsList"]').classList.add('active');
        document.querySelector('.nav-link[data-section="leadDetails"]')?.classList.remove('active');
    });
}

// ==================== DASHBOARD SUPERVISOR ====================
async function loadDashboardSupervisor() {
    const month = parseInt(document.getElementById('dashboardMonth').value);
    const year = parseInt(document.getElementById('dashboardYear').value);
    
    try {
        // Carregar leads do mês
        const leadsRef = database.ref(`leads/${year}/${month + 1}`);
        const snapshot = await leadsRef.once('value');
        const leads = snapshot.val() || {};
        
        // Converter para array
        const leadsArray = Object.keys(leads).map(key => ({
            id: key,
            ...leads[key]
        }));
        
        // Atualizar estatísticas
        updateDashboardStats(leadsArray);
        
        // Atualizar gráficos
        updateCharts(leadsArray);
        
        // Atualizar tabela recentes
        updateRecentLeadsTable(leadsArray);
        
    } catch (error) {
        console.error('Erro carregar dashboard:', error);
    }
}

function updateDashboardStats(leads) {
    // Total de leads
    document.getElementById('totalLeads').textContent = leads.length;
    
    // Taxa de conversão (ganhos / total)
    const wonLeads = leads.filter(lead => lead.status === 'ganho').length;
    const conversionRate = leads.length > 0 ? Math.round((wonLeads / leads.length) * 100) : 0;
    document.getElementById('conversionRate').textContent = `${conversionRate}%`;
    
    // Vendedores ativos
    const activeSellers = new Set(leads.map(lead => lead.sellerId)).size;
    document.getElementById('activeSellers').textContent = activeSellers;
    
    // Negócios fechados
    document.getElementById('wonDeals').textContent = wonLeads;
}

function updateCharts(leads) {
    // Gráfico por status
    const statusData = {
        'novo': 0,
        'contatado': 0,
        'qualificado': 0,
        'proposta': 0,
        'negociacao': 0,
        'ganho': 0,
        'perdido': 0
    };
    
    leads.forEach(lead => {
        statusData[lead.status]++;
    });
    
    const statusCtx = document.getElementById('statusChart').getContext('2d');
    if (statusChart) statusChart.destroy();
    
    statusChart = new Chart(statusCtx, {
        type: 'pie',
        data: {
            labels: ['Novo', 'Contatado', 'Qualificado', 'Proposta', 'Negociação', 'Ganho', 'Perdido'],
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: [
                    '#4A90E2', '#FFA726', '#66BB6A', '#AB47BC', 
                    '#FF7043', '#43A047', '#E53935'
                ]
            }]
        }
    });
    
    // Gráfico por vendedor
    const sellerData = {};
    leads.forEach(lead => {
        const seller = lead.sellerName || 'Desconhecido';
        sellerData[seller] = (sellerData[seller] || 0) + 1;
    });
    
    const sellerCtx = document.getElementById('sellerChart').getContext('2d');
    if (sellerChart) sellerChart.destroy();
    
    sellerChart = new Chart(sellerCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(sellerData),
            datasets: [{
                label: 'Leads',
                data: Object.values(sellerData),
                backgroundColor: '#367C2B'
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

function updateRecentLeadsTable(leads) {
    const tbody = document.querySelector('#recentLeadsTable tbody');
    tbody.innerHTML = '';
    
    // Ordenar por data mais recente
    const recentLeads = leads
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 10);
    
    recentLeads.forEach(lead => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lead.name}</td>
            <td>${formatPhone(lead.phone)}</td>
            <td>${lead.city}</td>
            <td><span class="status-tag status-${lead.status}">${lead.status}</span></td>
            <td>${lead.sellerName || 'N/A'}</td>
            <td>${formatDate(new Date(lead.visitDate))}</td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== CADASTRO DE VENDEDORES ====================
async function loadSellersList() {
    try {
        const sellersRef = database.ref('users');
        const snapshot = await sellersRef.once('value');
        const sellers = snapshot.val() || {};
        
        const tbody = document.querySelector('#sellersTable tbody');
        tbody.innerHTML = '';
        
        Object.keys(sellers).forEach(userId => {
            const seller = sellers[userId];
            if (seller.role === 'vendedor') {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${seller.name || 'N/A'}</td>
                    <td>${seller.email}</td>
                    <td>${seller.phone || 'N/A'}</td>
                    <td><span class="status-tag ${seller.status === 'ativo' ? 'status-qualificado' : 'status-perdido'}">
                        ${seller.status || 'ativo'}
                    </span></td>
                    <td class="table-actions">
                        <button class="action-btn disable" onclick="toggleSellerStatus('${userId}', '${seller.status || 'ativo'}')">
                            <i class="fas fa-power-off"></i>
                            ${seller.status === 'inativo' ? 'Ativar' : 'Desativar'}
                        </button>
                    </td>
                `;
                tbody.appendChild(row);
            }
        });
        
        // Configurar formulário de cadastro
        setupSellerForm();
        
    } catch (error) {
        console.error('Erro carregar vendedores:', error);
    }
}

function setupSellerForm() {
    const form = document.getElementById('sellerForm');
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        const name = document.getElementById('sellerName').value;
        const email = document.getElementById('sellerEmail').value;
        const phone = document.getElementById('sellerPhone').value;
        const password = document.getElementById('sellerPassword').value;
        
        if (!name || !email || !phone || !password) {
            alert('Preencha todos os campos');
            return;
        }
        
        try {
            // Criar usuário no Firebase Auth
            const userCredential = await auth.createUserWithEmailAndPassword(email, password);
            
            // Salvar no Realtime Database
            await database.ref('users/' + userCredential.user.uid).set({
                name: name,
                email: email,
                phone: phone,
                role: 'vendedor',
                status: 'ativo',
                createdAt: firebase.database.ServerValue.TIMESTAMP,
                createdBy: currentUserId
            });
            
            // Limpar formulário
            form.reset();
            
            // Recarregar lista
            loadSellersList();
            
            alert('Vendedor cadastrado com sucesso!');
            
        } catch (error) {
            console.error('Erro cadastrar vendedor:', error);
            alert(getAuthErrorMessage(error.code));
        }
    });
}

async function toggleSellerStatus(userId, currentStatus) {
    const newStatus = currentStatus === 'ativo' ? 'inativo' : 'ativo';
    
    try {
        await database.ref('users/' + userId + '/status').set(newStatus);
        loadSellersList();
    } catch (error) {
        console.error('Erro alterar status:', error);
        alert('Erro ao alterar status');
    }
}

// ==================== CADASTRO DE LEADS ====================
async function loadSellersForSelect() {
    try {
        const sellersRef = database.ref('users');
        const snapshot = await sellersRef.once('value');
        const sellers = snapshot.val() || {};
        
        const select = document.getElementById('leadSeller');
        select.innerHTML = '<option value="">Selecione...</option>';
        
        Object.keys(sellers).forEach(userId => {
            const seller = sellers[userId];
            if (seller.role === 'vendedor' && seller.status !== 'inativo') {
                const option = document.createElement('option');
                option.value = userId;
                option.textContent = seller.name || seller.email;
                select.appendChild(option);
            }
        });
        
        // Se for vendedor, selecionar ele mesmo
        if (currentUserRole === 'vendedor') {
            select.value = currentUserId;
            select.disabled = true;
        }
        
    } catch (error) {
        console.error('Erro carregar vendedores para select:', error);
    }
}

function setupLeadForm() {
    const form = document.getElementById('leadForm');
    const visitDate = document.getElementById('leadVisitDate');
    
    // Definir data mínima como hoje
    const today = new Date().toISOString().split('T')[0];
    visitDate.min = today;
    visitDate.value = today;
    
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        
        // Coletar dados
        const leadData = {
            name: document.getElementById('leadName').value,
            phone: document.getElementById('leadPhone').value,
            email: document.getElementById('leadEmail').value,
            city: document.getElementById('leadCity').value,
            product: document.getElementById('leadProduct').value,
            status: document.getElementById('leadStatus').value,
            notes: document.getElementById('leadNotes').value,
            visitDate: document.getElementById('leadVisitDate').value,
            sellerId: document.getElementById('leadSeller').value,
            sellerName: document.getElementById('leadSeller').options[document.getElementById('leadSeller').selectedIndex]?.textContent || '',
            createdAt: firebase.database.ServerValue.TIMESTAMP,
            createdBy: currentUserId,
            createdByName: currentUser.email.split('@')[0]
        };
        
        // Validar campos obrigatórios
        const required = ['name', 'phone', 'email', 'city', 'product', 'status', 'visitDate', 'sellerId'];
        const missing = required.filter(field => !leadData[field]);
        
        if (missing.length > 0) {
            alert(`Preencha os campos obrigatórios: ${missing.join(', ')}`);
            return;
        }
        
        try {
            // Obter data para estrutura de pastas
            const visitDateObj = new Date(leadData.visitDate);
            const year = visitDateObj.getFullYear();
            const month = visitDateObj.getMonth() + 1; // 1-12
            
            // Gerar ID único
            const leadId = generateId();
            
            // Salvar no Realtime Database com estrutura /leads/ano/mes/id
            await database.ref(`leads/${year}/${month}/${leadId}`).set(leadData);
            
            // Limpar formulário
            form.reset();
            visitDate.value = today;
            
            alert('Lead cadastrado com sucesso!');
            
            // Redirecionar para lista
            document.getElementById('leadsList').classList.add('active');
            document.getElementById('leadRegister').classList.remove('active');
            document.querySelector('.nav-link[data-section="leadsList"]').classList.add('active');
            document.querySelector('.nav-link[data-section="leadRegister"]').classList.remove('active');
            
            loadLeadsList();
            
        } catch (error) {
            console.error('Erro salvar lead:', error);
            alert('Erro ao salvar lead: ' + error.message);
        }
    });
}

// ==================== LISTAGEM DE LEADS ====================
async function loadLeadsList() {
    try {
        // Obter data atual para buscar leads
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const leadsRef = database.ref(`leads/${year}/${month}`);
        const snapshot = await leadsRef.once('value');
        const leads = snapshot.val() || {};
        
        // Converter para array
        let leadsArray = Object.keys(leads).map(key => ({
            id: key,
            year: year,
            month: month,
            ...leads[key]
        }));
        
        // Se for vendedor, filtrar apenas seus leads
        if (currentUserRole === 'vendedor') {
            leadsArray = leadsArray.filter(lead => lead.sellerId === currentUserId);
        }
        
        updateLeadsTable(leadsArray);
        
    } catch (error) {
        console.error('Erro carregar leads:', error);
    }
}

function setupFilters() {
    const filterStatus = document.getElementById('filterStatus');
    const filterCity = document.getElementById('filterCity');
    const filterDate = document.getElementById('filterDate');
    const clearBtn = document.getElementById('clearFilters');
    
    // Configurar filtros
    [filterStatus, filterCity, filterDate].forEach(filter => {
        filter.addEventListener('change', applyFilters);
    });
    
    // Botão limpar
    clearBtn.addEventListener('click', () => {
        filterStatus.value = '';
        filterCity.value = '';
        filterDate.value = '';
        loadLeadsList();
    });
}

async function applyFilters() {
    try {
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const leadsRef = database.ref(`leads/${year}/${month}`);
        const snapshot = await leadsRef.once('value');
        const leads = snapshot.val() || {};
        
        // Converter para array
        let leadsArray = Object.keys(leads).map(key => ({
            id: key,
            year: year,
            month: month,
            ...leads[key]
        }));
        
        // Filtrar por role
        if (currentUserRole === 'vendedor') {
            leadsArray = leadsArray.filter(lead => lead.sellerId === currentUserId);
        }
        
        // Aplicar filtros
        const statusFilter = document.getElementById('filterStatus').value;
        const cityFilter = document.getElementById('filterCity').value.toLowerCase();
        const dateFilter = document.getElementById('filterDate').value;
        
        if (statusFilter) {
            leadsArray = leadsArray.filter(lead => lead.status === statusFilter);
        }
        
        if (cityFilter) {
            leadsArray = leadsArray.filter(lead => 
                lead.city.toLowerCase().includes(cityFilter)
            );
        }
        
        if (dateFilter) {
            leadsArray = leadsArray.filter(lead => 
                lead.visitDate === dateFilter
            );
        }
        
        updateLeadsTable(leadsArray);
        
    } catch (error) {
        console.error('Erro aplicar filtros:', error);
    }
}

function updateLeadsTable(leads) {
    const tbody = document.querySelector('#leadsTable tbody');
    tbody.innerHTML = '';
    
    if (leads.length === 0) {
        tbody.innerHTML = `
            <tr>
                <td colspan="8" style="text-align: center; padding: 40px;">
                    Nenhum lead encontrado
                </td>
            </tr>
        `;
        return;
    }
    
    leads.forEach(lead => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${lead.name}</td>
            <td>${formatPhone(lead.phone)}</td>
            <td>${lead.email}</td>
            <td>${lead.city}</td>
            <td>${lead.product}</td>
            <td><span class="status-tag status-${lead.status}">${lead.status}</span></td>
            <td>${formatDate(new Date(lead.visitDate))}</td>
            <td class="table-actions">
                <button class="action-btn view" onclick="viewLeadDetails('${lead.id}', ${lead.year}, ${lead.month})">
                    <i class="fas fa-eye"></i>
                </button>
                ${currentUserRole === 'supervisor' || lead.createdBy === currentUserId ? `
                <button class="action-btn edit" onclick="editLead('${lead.id}', ${lead.year}, ${lead.month})">
                    <i class="fas fa-edit"></i>
                </button>
                ` : ''}
            </td>
        `;
        tbody.appendChild(row);
    });
}

// ==================== DETALHES E EDIÇÃO DE LEADS ====================
async function viewLeadDetails(leadId, year, month) {
    try {
        const leadRef = database.ref(`leads/${year}/${month}/${leadId}`);
        const snapshot = await leadRef.once('value');
        const lead = snapshot.val();
        
        if (!lead) {
            alert('Lead não encontrado');
            return;
        }
        
        // Exibir detalhes
        const detailsContent = document.getElementById('leadDetailsContent');
        detailsContent.innerHTML = `
            <div class="detail-item">
                <h4>Informações do Lead</h4>
                <p><strong>Nome:</strong> ${lead.name}</p>
                <p><strong>Telefone:</strong> ${formatPhone(lead.phone)}</p>
                <p><strong>E-mail:</strong> ${lead.email}</p>
                <p><strong>Cidade:</strong> ${lead.city}</p>
                <p><strong>Produto:</strong> ${lead.product}</p>
                <p><strong>Status:</strong> <span class="status-tag status-${lead.status}">${lead.status}</span></p>
            </div>
            
            <div class="detail-item">
                <h4>Visita e Vendedor</h4>
                <p><strong>Data da Visita:</strong> ${formatDate(new Date(lead.visitDate))}</p>
                <p><strong>Vendedor:</strong> ${lead.sellerName || 'N/A'}</p>
                <p><strong>Cadastrado por:</strong> ${lead.createdByName || 'N/A'}</p>
                <p><strong>Data cadastro:</strong> ${formatDate(new Date(lead.createdAt))}</p>
            </div>
            
            <div class="detail-item">
                <h4>Observações</h4>
                <p>${lead.notes || 'Nenhuma observação registrada.'}</p>
            </div>
        `;
        
        // Navegar para detalhes
        document.getElementById('leadsList').classList.remove('active');
        document.getElementById('leadDetails').classList.add('active');
        
        // Atualizar navegação
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        
    } catch (error) {
        console.error('Erro carregar detalhes:', error);
        alert('Erro ao carregar detalhes do lead');
    }
}

async function editLead(leadId, year, month) {
    try {
        const leadRef = database.ref(`leads/${year}/${month}/${leadId}`);
        const snapshot = await leadRef.once('value');
        const lead = snapshot.val();
        
        if (!lead) {
            alert('Lead não encontrado');
            return;
        }
        
        // Preencher formulário de edição
        document.getElementById('editLeadId').value = leadId;
        document.getElementById('editLeadYear').value = year;
        document.getElementById('editLeadMonth').value = month;
        document.getElementById('editLeadStatus').value = lead.status;
        document.getElementById('editLeadNotes').value = lead.notes || '';
        
        // Mostrar modal
        document.getElementById('editLeadModal').classList.add('active');
        
    } catch (error) {
        console.error('Erro editar lead:', error);
        alert('Erro ao carregar lead para edição');
    }
}

// Configurar formulário de edição
document.getElementById('editLeadForm').addEventListener('submit', async function(e) {
    e.preventDefault();
    
    const leadId = document.getElementById('editLeadId').value;
    const year = parseInt(document.getElementById('editLeadYear').value);
    const month = parseInt(document.getElementById('editLeadMonth').value);
    const status = document.getElementById('editLeadStatus').value;
    const notes = document.getElementById('editLeadNotes').value;
    
    try {
        const leadRef = database.ref(`leads/${year}/${month}/${leadId}`);
        
        // Atualizar apenas status e notas
        await leadRef.update({
            status: status,
            notes: notes,
            updatedAt: firebase.database.ServerValue.TIMESTAMP,
            updatedBy: currentUserId
        });
        
        // Fechar modal
        document.getElementById('editLeadModal').classList.remove('active');
        
        // Recarregar listas
        loadLeadsList();
        if (currentUserRole === 'supervisor') {
            loadDashboardSupervisor();
        } else {
            loadDashboardSeller();
        }
        
        alert('Lead atualizado com sucesso!');
        
    } catch (error) {
        console.error('Erro atualizar lead:', error);
        alert('Erro ao atualizar lead');
    }
});

// ==================== DASHBOARD VENDEDOR ====================
async function loadDashboardSeller() {
    try {
        // Obter data atual
        const now = new Date();
        const year = now.getFullYear();
        const month = now.getMonth() + 1;
        
        const leadsRef = database.ref(`leads/${year}/${month}`);
        const snapshot = await leadsRef.once('value');
        const leads = snapshot.val() || {};
        
        // Converter para array e filtrar por vendedor
        let leadsArray = Object.keys(leads).map(key => ({
            id: key,
            ...leads[key]
        })).filter(lead => lead.sellerId === currentUserId);
        
        // Atualizar estatísticas
        updateSellerStats(leadsArray);
        
        // Atualizar gráficos
        updateSellerCharts(leadsArray);
        
    } catch (error) {
        console.error('Erro carregar dashboard vendedor:', error);
    }
}

function updateSellerStats(leads) {
    // Total de leads
    document.getElementById('myTotalLeads').textContent = leads.length;
    
    // Leads qualificados
    const qualified = leads.filter(lead => 
        lead.status === 'qualificado' || lead.status === 'proposta' || lead.status === 'negociacao'
    ).length;
    document.getElementById('myQualifiedLeads').textContent = qualified;
    
    // Leads ganhos
    const won = leads.filter(lead => lead.status === 'ganho').length;
    document.getElementById('myWonLeads').textContent = won;
    
    // Taxa de conversão
    const conversion = leads.length > 0 ? Math.round((won / leads.length) * 100) : 0;
    document.getElementById('myConversion').textContent = `${conversion}%`;
}

function updateSellerCharts(leads) {
    // Gráfico por status
    const statusData = {
        'novo': 0,
        'contatado': 0,
        'qualificado': 0,
        'proposta': 0,
        'negociacao': 0,
        'ganho': 0,
        'perdido': 0
    };
    
    leads.forEach(lead => {
        statusData[lead.status]++;
    });
    
    const myStatusCtx = document.getElementById('myStatusChart').getContext('2d');
    if (myStatusChart) myStatusChart.destroy();
    
    myStatusChart = new Chart(myStatusCtx, {
        type: 'doughnut',
        data: {
            labels: ['Novo', 'Contatado', 'Qualificado', 'Proposta', 'Negociação', 'Ganho', 'Perdido'],
            datasets: [{
                data: Object.values(statusData),
                backgroundColor: [
                    '#4A90E2', '#FFA726', '#66BB6A', '#AB47BC', 
                    '#FF7043', '#43A047', '#E53935'
                ]
            }]
        }
    });
    
    // Gráfico por cidade
    const cityData = {};
    leads.forEach(lead => {
        cityData[lead.city] = (cityData[lead.city] || 0) + 1;
    });
    
    const myCityCtx = document.getElementById('myCityChart').getContext('2d');
    if (myCityChart) myCityChart.destroy();
    
    myCityChart = new Chart(myCityCtx, {
        type: 'bar',
        data: {
            labels: Object.keys(cityData),
            datasets: [{
                label: 'Leads por Cidade',
                data: Object.values(cityData),
                backgroundColor: '#367C2B'
            }]
        },
        options: {
            scales: {
                y: { beginAtZero: true }
            }
        }
    });
}

// ==================== UTILITÁRIOS ====================
function showLoginScreen() {
    document.getElementById('loginScreen').classList.add('active');
    document.getElementById('mainScreen').classList.remove('active');
}

function showMainScreen() {
    document.getElementById('loginScreen').classList.remove('active');
    document.getElementById('mainScreen').classList.add('active');
}

function showError(element, message) {
    element.textContent = message;
    element.style.display = 'block';
    setTimeout(() => {
        element.style.display = 'none';
    }, 5000);
}

function getAuthErrorMessage(code) {
    const messages = {
        'auth/invalid-email': 'E-mail inválido',
        'auth/user-disabled': 'Usuário desativado',
        'auth/user-not-found': 'Usuário não encontrado',
        'auth/wrong-password': 'Senha incorreta',
        'auth/email-already-in-use': 'E-mail já cadastrado',
        'auth/weak-password': 'Senha muito fraca',
        'auth/too-many-requests': 'Muitas tentativas. Tente mais tarde.'
    };
    return messages[code] || 'Erro na autenticação';
}

function formatDate(date) {
    return date.toLocaleDateString('pt-BR');
}

function formatPhone(phone) {
    const cleaned = phone.replace(/\D/g, '');
    if (cleaned.length === 11) {
        return cleaned.replace(/^(\d{2})(\d{5})(\d{4}).*/, '($1) $2-$3');
    } else if (cleaned.length === 10) {
        return cleaned.replace(/^(\d{2})(\d{4})(\d{4}).*/, '($1) $2-$3');
    }
    return phone;
}

function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

// ==================== EXPORT FUNCTIONS ====================
window.toggleSellerStatus = toggleSellerStatus;
window.viewLeadDetails = viewLeadDetails;
window.editLead = editLead;
