// Configuração do Firebase
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
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const database = firebase.database();

// Estado da aplicação
let currentUser = null;
let userRole = null;
let chartInstances = {};

// Flags de inicialização de painéis
let directorDashboardInitialized = false;
let supervisorPanelInitialized = false;
let sellerPanelInitialized = false;

// DOM Elements
const loginScreen = document.getElementById('loginScreen');
const mainSystem = document.getElementById('mainSystem');
const loginForm = document.getElementById('loginForm');
const logoutBtn = document.getElementById('logoutBtn');
const userEmail = document.getElementById('userEmail');
const userRoleBadge = document.getElementById('userRoleBadge');

// Painéis
const directorDashboard = document.getElementById('directorDashboard');
const supervisorPanel = document.getElementById('supervisorPanel');
const sellerPanel = document.getElementById('sellerPanel');

// Elementos do Dashboard Diretor
const totalLeadsElement = document.getElementById('totalLeads');
const totalSellersElement = document.getElementById('totalSellers');
const conversionRateElement = document.getElementById('conversionRate');
const visitsThisMonthElement = document.getElementById('visitsThisMonth');
const yearFilter = document.getElementById('yearFilter');
const monthFilter = document.getElementById('monthFilter');

// Configurar listeners de filtro do diretor (apenas uma vez)
if (yearFilter && monthFilter) {
    yearFilter.addEventListener('change', loadDirectorDashboard);
    monthFilter.addEventListener('change', loadDirectorDashboard);
}

// Elementos Supervisor
const addSellerBtn = document.getElementById('addSellerBtn');
const newSellerForm = document.getElementById('newSellerForm');
const sellerForm = document.getElementById('sellerForm');
const cancelSellerBtn = document.getElementById('cancelSellerBtn');
const sellersTable = document.getElementById('sellersTable');

// Elementos Vendedor
const addLeadBtn = document.getElementById('addLeadBtn');
const newLeadForm = document.getElementById('newLeadForm');
const leadForm = document.getElementById('leadForm');
const cancelLeadBtn = document.getElementById('cancelLeadBtn');
const sellerLeadsTable = document.getElementById('sellerLeadsTable');

// Filtros Vendedor
const filterStatus = document.getElementById('filterStatus');
const filterCity = document.getElementById('filterCity');
const filterDate = document.getElementById('filterDate');
const clearFilters = document.getElementById('clearFilters');

// Modal
const editModal = document.getElementById('editModal');
const closeModal = document.querySelector('.close-modal');

// Detectar tipo de usuário baseado no email
function detectUserRole(email) {
    if (email.includes('@diretorglobal.com.br')) {
        return 'diretor';
    } else if (email.includes('@supervisorglobal.com.br')) {
        return 'supervisor';
    } else if (email.includes('@vendedorglobal.com.br')) {
        return 'vendedor';
    }
    return 'vendedor'; // padrão
}

// Criar menu lateral baseado no perfil
function createSidebarMenu(role) {
    const sidebar = document.getElementById('sidebar');
    let menuItems = '';
    
    if (role === 'diretor') {
        menuItems = `
            <div class="sidebar-nav">
                <a href="#" class="sidebar-item active" data-panel="directorDashboard">
                    <i class="fas fa-chart-line"></i> Dashboard
                </a>
                <a href="#" class="sidebar-item" data-panel="supervisorPanel">
                    <i class="fas fa-user-shield"></i> Supervisor
                </a>
            </div>
        `;
    } else if (role === 'supervisor') {
        menuItems = `
            <div class="sidebar-nav">
                <a href="#" class="sidebar-item active" data-panel="supervisorPanel">
                    <i class="fas fa-user-shield"></i> Painel Supervisor
                </a>
                <a href="#" class="sidebar-item" data-panel="sellerPanel">
                    <i class="fas fa-user"></i> Meus Leads
                </a>
            </div>
        `;
    } else if (role === 'vendedor') {
        menuItems = `
            <div class="sidebar-nav">
                <a href="#" class="sidebar-item active" data-panel="sellerPanel">
                    <i class="fas fa-user"></i> Meus Leads
                </a>
            </div>
        `;
    }
    
    sidebar.innerHTML = menuItems;
    
    // Adicionar event listeners aos itens do menu
    document.querySelectorAll('.sidebar-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const panel = item.getAttribute('data-panel');
            showPanel(panel);
            
            // Atualizar estado ativo
            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
            item.classList.add('active');
        });
    });
}

// Mostrar painel específico (versão idempotente)
function showPanel(panelId) {
    // Esconder todos os painéis
    document.querySelectorAll('.dashboard-section').forEach(panel => {
        panel.classList.remove('active');
    });

    // Mostrar painel selecionado
    const panel = document.getElementById(panelId);
    if (!panel) {
        return;
    }

    panel.classList.add('active');

    // Carregar dados específicos do painel, controlando inicialização
    if (panelId === 'directorDashboard') {
        if (!directorDashboardInitialized) {
            directorDashboardInitialized = true;
        }
        loadDirectorDashboard();
    } else if (panelId === 'supervisorPanel') {
        if (!supervisorPanelInitialized) {
            supervisorPanelInitialized = true;
            loadSupervisorPanel();
        } else {
            // Recarrega apenas dados, sem recriar listeners
            loadSellersList();
            loadSupervisorLeads();
        }
    } else if (panelId === 'sellerPanel') {
        if (!sellerPanelInitialized) {
            sellerPanelInitialized = true;
            loadSellerPanel();
        } else {
            // Recarrega apenas lista de leads do vendedor
            loadSellerLeads();
        }
    }
}

// Login
loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    
    try {
        const userCredential = await auth.signInWithEmailAndPassword(email, password);
        currentUser = userCredential.user;
        userRole = detectUserRole(currentUser.email);
        
        // Atualizar interface
        userEmail.textContent = currentUser.email;
        userRoleBadge.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        
        // Criar menu
        createSidebarMenu(userRole);
        
        // Mostrar sistema e esconder login
        loginScreen.classList.remove('active');
        mainSystem.classList.add('active');
        
        // Mostrar painel inicial
        if (userRole === 'diretor') {
            showPanel('directorDashboard');
        } else if (userRole === 'supervisor') {
            showPanel('supervisorPanel');
        } else {
            showPanel('sellerPanel');
        }
        
        showMessage('Login realizado com sucesso!', 'success');
    } catch (error) {
        showMessage('Erro ao fazer login: ' + error.message, 'error');
    }
});

// Logout
logoutBtn.addEventListener('click', async () => {
    try {
        await auth.signOut();
        currentUser = null;
        userRole = null;
        
        // Resetar formulário
        loginForm.reset();
        
        // Voltar para tela de login
        mainSystem.classList.remove('active');
        loginScreen.classList.add('active');
        
        showMessage('Logout realizado com sucesso!', 'success');
    } catch (error) {
        showMessage('Erro ao fazer logout: ' + error.message, 'error');
    }
});

// Mostrar mensagens
function showMessage(message, type) {
    const messageDiv = document.getElementById('loginMessage');
    messageDiv.textContent = message;
    messageDiv.className = `message ${type}`;
    messageDiv.style.display = 'block';
    
    setTimeout(() => {
        messageDiv.style.display = 'none';
    }, 5000);
}

// Formatar data
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('pt-BR');
}

// Obter ano/mês atual para organização
function getCurrentYearMonth() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    return { year, month };
}

// ========== FUNÇÕES DO DIRETOR ==========

async function loadDirectorDashboard() {
    // Carregar anos disponíveis
    loadYearFilter();
    
    // Carregar dados
    await loadDirectorStats();
    await loadDirectorLeads();
    await loadSellersForDirector();
}

async function loadYearFilter() {
    try {
        const snapshot = await database.ref('leads').once('value');
        const years = [];
        
        snapshot.forEach(yearSnapshot => {
            years.push(yearSnapshot.key);
        });
        
        // Ordenar anos
        years.sort((a, b) => b - a);
        
        // Atualizar select
        yearFilter.innerHTML = '<option value="all">Todos os anos</option>';
        years.forEach(year => {
            yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
        });
        
        // Selecionar ano atual
        const currentYear = getCurrentYearMonth().year;
        yearFilter.value = currentYear;
    } catch (error) {
        console.error('Erro ao carregar anos:', error);
    }
}

async function loadDirectorStats() {
    try {
        const year = yearFilter.value;
        const month = monthFilter.value;
        
        let totalLeads = 0;
        let totalVisits = 0;
        let soldLeads = 0;
        
        if (year === 'all') {
            const snapshot = await database.ref('leads').once('value');
            snapshot.forEach(yearSnapshot => {
                yearSnapshot.forEach(monthSnapshot => {
                    monthSnapshot.forEach(leadSnapshot => {
                        totalLeads++;
                        const lead = leadSnapshot.val();
                        if (lead.status === 'Vendido') soldLeads++;
                        if (lead.visitDate) totalVisits++;
                    });
                });
            });
        } else if (month === 'all') {
            const snapshot = await database.ref(`leads/${year}`).once('value');
            snapshot.forEach(monthSnapshot => {
                monthSnapshot.forEach(leadSnapshot => {
                    totalLeads++;
                    const lead = leadSnapshot.val();
                    if (lead.status === 'Vendido') soldLeads++;
                    if (lead.visitDate) totalVisits++;
                });
            });
        } else {
            const snapshot = await database.ref(`leads/${year}/${month}`).once('value');
            snapshot.forEach(leadSnapshot => {
                totalLeads++;
                const lead = leadSnapshot.val();
                if (lead.status === 'Vendido') soldLeads++;
                if (lead.visitDate) totalVisits++;
            });
        }
        
        // Atualizar estatísticas
        totalLeadsElement.textContent = totalLeads;
        visitsThisMonthElement.textContent = totalVisits;
        
        const conversionRate = totalLeads > 0 ? Math.round((soldLeads / totalLeads) * 100) : 0;
        conversionRateElement.textContent = `${conversionRate}%`;
        
        // Carregar gráficos
        await loadCharts(year, month);
        
    } catch (error) {
        console.error('Erro ao carregar estatísticas:', error);
    }
}

async function loadDirectorLeads() {
    try {
        const year = yearFilter.value;
        const month = monthFilter.value;
        const tbody = document.querySelector('#directorLeadsTable tbody');
        tbody.innerHTML = '';
        
        let leads = [];
        
        if (year === 'all') {
            const snapshot = await database.ref('leads').once('value');
            snapshot.forEach(yearSnapshot => {
                yearSnapshot.forEach(monthSnapshot => {
                    monthSnapshot.forEach(leadSnapshot => {
                        leads.push({
                            id: leadSnapshot.key,
                            ...leadSnapshot.val()
                        });
                    });
                });
            });
        } else if (month === 'all') {
            const snapshot = await database.ref(`leads/${year}`).once('value');
            snapshot.forEach(monthSnapshot => {
                monthSnapshot.forEach(leadSnapshot => {
                    leads.push({
                        id: leadSnapshot.key,
                        ...leadSnapshot.val()
                    });
                });
            });
        } else {
            const snapshot = await database.ref(`leads/${year}/${month}`).once('value');
            snapshot.forEach(leadSnapshot => {
                leads.push({
                    id: leadSnapshot.key,
                    ...leadSnapshot.val()
                });
            });
        }
        
        // Ordenar por data mais recente
        leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Limitar a 50 leads
        leads = leads.slice(0, 50);
        
        // Preencher tabela
        leads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(lead.timestamp)}</td>
                <td>${lead.name}</td>
                <td>${lead.phone}</td>
                <td>${lead.product}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '-')}">${lead.status}</span></td>
                <td>${lead.sellerName || lead.sellerEmail}</td>
                <td>${lead.city}</td>
                <td>${formatDate(lead.visitDate)}</td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
    }
}

async function loadSellersForDirector() {
    try {
        // Nota: Em produção, você teria uma coleção de usuários
        // Por enquanto, vamos contar leads por vendedor
        const snapshot = await database.ref('leads').once('value');
        const sellersMap = new Map();
        
        snapshot.forEach(yearSnapshot => {
            yearSnapshot.forEach(monthSnapshot => {
                monthSnapshot.forEach(leadSnapshot => {
                    const lead = leadSnapshot.val();
                    const sellerEmail = lead.sellerEmail;
                    
                    if (sellerEmail) {
                        if (!sellersMap.has(sellerEmail)) {
                            sellersMap.set(sellerEmail, {
                                name: lead.sellerName || sellerEmail,
                                email: sellerEmail,
                                leadCount: 0
                            });
                        }
                        sellersMap.get(sellerEmail).leadCount++;
                    }
                });
            });
        });
        
        totalSellersElement.textContent = sellersMap.size;
        
    } catch (error) {
        console.error('Erro ao carregar vendedores:', error);
    }
}

async function loadCharts(year, month) {
    try {
        // Leads por Vendedor
        const sellersSnapshot = await database.ref('leads').once('value');
        const sellerData = {};
        
        sellersSnapshot.forEach(yearSnapshot => {
            if (year === 'all' || yearSnapshot.key === year) {
                yearSnapshot.forEach(monthSnapshot => {
                    if (month === 'all' || monthSnapshot.key === month) {
                        monthSnapshot.forEach(leadSnapshot => {
                            const lead = leadSnapshot.val();
                            const seller = lead.sellerEmail || 'Desconhecido';
                            sellerData[seller] = (sellerData[seller] || 0) + 1;
                        });
                    }
                });
            }
        });
        
        // Leads por Status
        const statusSnapshot = await database.ref('leads').once('value');
        const statusData = {};
        
        statusSnapshot.forEach(yearSnapshot => {
            if (year === 'all' || yearSnapshot.key === year) {
                yearSnapshot.forEach(monthSnapshot => {
                    if (month === 'all' || monthSnapshot.key === month) {
                        monthSnapshot.forEach(leadSnapshot => {
                            const lead = leadSnapshot.val();
                            const status = lead.status || 'Desconhecido';
                            statusData[status] = (statusData[status] || 0) + 1;
                        });
                    }
                });
            }
        });
        
        // Destruir gráficos existentes
        if (chartInstances.leadsBySeller) {
            chartInstances.leadsBySeller.destroy();
        }
        if (chartInstances.leadsByStatus) {
            chartInstances.leadsByStatus.destroy();
        }
        
        // Criar gráfico de leads por vendedor
        const sellerCtx = document.getElementById('leadsBySellerChart').getContext('2d');
        chartInstances.leadsBySeller = new Chart(sellerCtx, {
            type: 'bar',
            data: {
                labels: Object.keys(sellerData),
                datasets: [{
                    label: 'Leads por Vendedor',
                    data: Object.values(sellerData),
                    backgroundColor: '#367C2B',
                    borderColor: '#2a5f21',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false
                    }
                }
            }
        });
        
        // Criar gráfico de leads por status
        const statusCtx = document.getElementById('leadsByStatusChart').getContext('2d');
        chartInstances.leadsByStatus = new Chart(statusCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(statusData),
                datasets: [{
                    data: Object.values(statusData),
                    backgroundColor: [
                        '#367C2B',
                        '#FFDE00',
                        '#2196F3',
                        '#9C27B0',
                        '#FF9800',
                        '#4CAF50',
                        '#F44336'
                    ]
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
        
    } catch (error) {
        console.error('Erro ao carregar gráficos:', error);
    }
}

// ========== FUNÇÕES DO SUPERVISOR ==========

function loadSupervisorPanel() {
    // Mostrar/ocultar formulário de novo vendedor
    if (addSellerBtn) {
        addSellerBtn.addEventListener('click', () => {
            newSellerForm.style.display = 'block';
            addSellerBtn.style.display = 'none';
        });
    }
    
    if (cancelSellerBtn) {
        cancelSellerBtn.addEventListener('click', () => {
            newSellerForm.style.display = 'none';
            addSellerBtn.style.display = 'flex';
            sellerForm.reset();
        });
    }
    
    // Formulário de cadastro de vendedor
    if (sellerForm) {
        sellerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const name = document.getElementById('sellerName').value;
            const email = document.getElementById('sellerEmail').value;
            const password = document.getElementById('sellerPassword').value;
            const confirmPassword = document.getElementById('sellerConfirmPassword').value;
            
            if (password !== confirmPassword) {
                showMessage('As senhas não coincidem!', 'error');
                return;
            }
            
            try {
                // Criar usuário no Firebase Authentication
                const userCredential = await auth.createUserWithEmailAndPassword(email, password);
                
                // Aqui você poderia salvar informações adicionais no Realtime Database
                const userId = userCredential.user.uid;
                
                showMessage('Vendedor cadastrado com sucesso!', 'success');
                sellerForm.reset();
                newSellerForm.style.display = 'none';
                addSellerBtn.style.display = 'flex';
                
                // Recarregar lista de vendedores
                loadSellersList();
                
            } catch (error) {
                showMessage('Erro ao cadastrar vendedor: ' + error.message, 'error');
            }
        });
    }
    
    // Carregar lista de vendedores
    loadSellersList();
    
    // Carregar leads do supervisor
    loadSupervisorLeads();
}

async function loadSellersList() {
    try {
        // Nota: Em produção, você teria uma coleção de usuários
        // Por enquanto, vamos listar vendedores baseado nos emails dos leads
        const snapshot = await database.ref('leads').once('value');
        const sellersMap = new Map();
        
        snapshot.forEach(yearSnapshot => {
            yearSnapshot.forEach(monthSnapshot => {
                monthSnapshot.forEach(leadSnapshot => {
                    const lead = leadSnapshot.val();
                    const sellerEmail = lead.sellerEmail;
                    
                    if (sellerEmail && !sellerEmail.includes('@supervisorglobal') && 
                        !sellerEmail.includes('@diretorglobal')) {
                        
                        if (!sellersMap.has(sellerEmail)) {
                            sellersMap.set(sellerEmail, {
                                name: lead.sellerName || sellerEmail.split('@')[0],
                                email: sellerEmail,
                                leadCount: 0,
                                active: true
                            });
                        }
                        sellersMap.get(sellerEmail).leadCount++;
                    }
                });
            });
        });
        
        // Preencher tabela
        const tbody = sellersTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        sellersMap.forEach((seller, email) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${seller.name}</td>
                <td>${seller.email}</td>
                <td>${seller.leadCount}</td>
                <td><span class="status-badge ${seller.active ? 'status-vendido' : 'status-perdido'}">
                    ${seller.active ? 'Ativo' : 'Inativo'}
                </span></td>
                <td>
                    <button class="action-btn edit" onclick="editSeller('${email}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="toggleSellerStatus('${email}', ${seller.active})">
                        <i class="fas fa-${seller.active ? 'ban' : 'check'}"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Erro ao carregar vendedores:', error);
    }
}

async function loadSupervisorLeads() {
    try {
        const tbody = document.querySelector('#supervisorLeadsTable tbody');
        tbody.innerHTML = '';
        
        const snapshot = await database.ref('leads').once('value');
        const leads = [];
        
        snapshot.forEach(yearSnapshot => {
            yearSnapshot.forEach(monthSnapshot => {
                monthSnapshot.forEach(leadSnapshot => {
                    leads.push({
                        id: leadSnapshot.key,
                        ...leadSnapshot.val()
                    });
                });
            });
        });
        
        // Ordenar por data mais recente
        leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Preencher tabela
        leads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(lead.timestamp)}</td>
                <td>${lead.name}</td>
                <td>${lead.phone}</td>
                <td>${lead.product}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '-')}">${lead.status}</span></td>
                <td>${lead.sellerName || lead.sellerEmail}</td>
                <td>
                    <button class="action-btn edit" onclick="editLead('${lead.id}', '${lead.year}', '${lead.month}')">
                        <i class="fas fa-edit"></i> Editar
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Erro ao carregar leads do supervisor:', error);
    }
}

// ========== FUNÇÕES DO VENDEDOR ==========

function loadSellerPanel() {
    // Configurar data atual no campo de visita
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('leadVisitDate').value = today;
    
    // Mostrar/ocultar formulário de novo lead
    if (addLeadBtn) {
        addLeadBtn.addEventListener('click', () => {
            newLeadForm.style.display = 'block';
            addLeadBtn.style.display = 'none';
        });
    }
    
    if (cancelLeadBtn) {
        cancelLeadBtn.addEventListener('click', () => {
            newLeadForm.style.display = 'none';
            addLeadBtn.style.display = 'flex';
            leadForm.reset();
            document.getElementById('leadVisitDate').value = today;
        });
    }
    
    // Formulário de lead
    if (leadForm) {
        leadForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            if (!currentUser) return;
            
            const leadData = {
                name: document.getElementById('leadName').value,
                phone: document.getElementById('leadPhone').value,
                email: document.getElementById('leadEmail').value,
                city: document.getElementById('leadCity').value,
                product: document.getElementById('leadProduct').value,
                status: document.getElementById('leadStatus').value,
                visitDate: document.getElementById('leadVisitDate').value,
                notes: document.getElementById('leadNotes').value,
                sellerEmail: currentUser.email,
                sellerName: currentUser.displayName || currentUser.email.split('@')[0],
                timestamp: new Date().toISOString()
            };
            
            try {
                const { year, month } = getCurrentYearMonth();
                const newLeadRef = database.ref(`leads/${year}/${month}`).push();
                await newLeadRef.set({
                    ...leadData,
                    year,
                    month
                });
                
                showMessage('Lead cadastrado com sucesso!', 'success');
                leadForm.reset();
                document.getElementById('leadVisitDate').value = today;
                newLeadForm.style.display = 'none';
                addLeadBtn.style.display = 'flex';
                
                // Recarregar lista de leads
                loadSellerLeads();
                
            } catch (error) {
                showMessage('Erro ao cadastrar lead: ' + error.message, 'error');
            }
        });
    }
    
    // Configurar filtros (apenas uma vez)
    if (filterStatus && filterCity && filterDate && clearFilters) {
        filterStatus.addEventListener('change', loadSellerLeads);
        filterCity.addEventListener('input', loadSellerLeads);
        filterDate.addEventListener('change', loadSellerLeads);
        
        clearFilters.addEventListener('click', () => {
            filterStatus.value = 'all';
            filterCity.value = '';
            filterDate.value = '';
            loadSellerLeads();
        });
    }
    
    // Carregar leads iniciais
    loadSellerLeads();
}

async function loadSellerLeads() {
    if (!currentUser) return;
    
    try {
        const tbody = sellerLeadsTable.querySelector('tbody');
        tbody.innerHTML = '';
        
        const statusFilter = filterStatus ? filterStatus.value : 'all';
        const cityFilter = filterCity ? filterCity.value.toLowerCase() : '';
        const dateFilter = filterDate ? filterDate.value : '';
        
        const snapshot = await database.ref('leads').once('value');
        const leads = [];
        
        snapshot.forEach(yearSnapshot => {
            yearSnapshot.forEach(monthSnapshot => {
                monthSnapshot.forEach(leadSnapshot => {
                    const lead = leadSnapshot.val();
                    
                    // Filtrar apenas leads do vendedor atual
                    if (lead.sellerEmail === currentUser.email) {
                        // Aplicar filtros
                        if (statusFilter !== 'all' && lead.status !== statusFilter) return;
                        if (cityFilter && !lead.city.toLowerCase().includes(cityFilter)) return;
                        if (dateFilter && lead.visitDate !== dateFilter) return;
                        
                        leads.push({
                            id: leadSnapshot.key,
                            year: yearSnapshot.key,
                            month: monthSnapshot.key,
                            ...lead
                        });
                    }
                });
            });
        });
        
        // Ordenar por data mais recente
        leads.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        // Preencher tabela
        leads.forEach(lead => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${formatDate(lead.timestamp)}</td>
                <td>${lead.name}</td>
                <td>${lead.phone}</td>
                <td>${lead.product}</td>
                <td><span class="status-badge status-${lead.status.toLowerCase().replace(' ', '-')}">${lead.status}</span></td>
                <td>${lead.city}</td>
                <td>${formatDate(lead.visitDate)}</td>
                <td>
                    <button class="action-btn edit" onclick="editLead('${lead.id}', '${lead.year}', '${lead.month}')">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="deleteLead('${lead.id}', '${lead.year}', '${lead.month}')">
                        <i class="fas fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
        
    } catch (error) {
        console.error('Erro ao carregar leads:', error);
    }
}

// ========== FUNÇÕES GLOBAIS ==========

async function editLead(leadId, year, month) {
    try {
        const snapshot = await database.ref(`leads/${year}/${month}/${leadId}`).once('value');
        const lead = snapshot.val();
        
        if (!lead) return;
        
        // Preencher modal com formulário de edição
        const modalBody = document.querySelector('.modal-body');
        modalBody.innerHTML = `
            <form id="editLeadForm">
                <div class="form-row">
                    <div class="form-group">
                        <label>Nome Completo</label>
                        <input type="text" id="editLeadName" value="${lead.name}" required>
                    </div>
                    <div class="form-group">
                        <label>Telefone</label>
                        <input type="tel" id="editLeadPhone" value="${lead.phone}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>E-mail</label>
                        <input type="email" id="editLeadEmail" value="${lead.email || ''}">
                    </div>
                    <div class="form-group">
                        <label>Cidade</label>
                        <input type="text" id="editLeadCity" value="${lead.city}" required>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Produto</label>
                        <select id="editLeadProduct" required>
                            <option value="Trator" ${lead.product === 'Trator' ? 'selected' : ''}>Trator</option>
                            <option value="Colheitadeira" ${lead.product === 'Colheitadeira' ? 'selected' : ''}>Colheitadeira</option>
                            <option value="Pulverizador" ${lead.product === 'Pulverizador' ? 'selected' : ''}>Pulverizador</option>
                            <option value="Plantadeira" ${lead.product === 'Plantadeira' ? 'selected' : ''}>Plantadeira</option>
                            <option value="Implementos" ${lead.product === 'Implementos' ? 'selected' : ''}>Implementos</option>
                            <option value="Peças" ${lead.product === 'Peças' ? 'selected' : ''}>Peças</option>
                            <option value="Outros" ${lead.product === 'Outros' ? 'selected' : ''}>Outros</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <label>Status</label>
                        <select id="editLeadStatus" required>
                            <option value="Novo" ${lead.status === 'Novo' ? 'selected' : ''}>Novo</option>
                            <option value="Contatado" ${lead.status === 'Contatado' ? 'selected' : ''}>Contatado</option>
                            <option value="Visita Agendada" ${lead.status === 'Visita Agendada' ? 'selected' : ''}>Visita Agendada</option>
                            <option value="Visita Realizada" ${lead.status === 'Visita Realizada' ? 'selected' : ''}>Visita Realizada</option>
                            <option value="Negociação" ${lead.status === 'Negociação' ? 'selected' : ''}>Negociação</option>
                            <option value="Vendido" ${lead.status === 'Vendido' ? 'selected' : ''}>Vendido</option>
                            <option value="Perdido" ${lead.status === 'Perdido' ? 'selected' : ''}>Perdido</option>
                        </select>
                    </div>
                </div>
                <div class="form-row">
                    <div class="form-group">
                        <label>Data da Visita</label>
                        <input type="date" id="editLeadVisitDate" value="${lead.visitDate}" required>
                    </div>
                    <div class="form-group">
                        <label>Observações</label>
                        <textarea id="editLeadNotes" rows="3">${lead.notes || ''}</textarea>
                    </div>
                </div>
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-save"></i> Salvar Alterações
                    </button>
                    <button type="button" class="btn btn-outline close-modal">
                        Cancelar
                    </button>
                </div>
            </form>
        `;
        
        // Mostrar modal
        editModal.classList.add('active');
        
        // Configurar submit do formulário
        const editForm = document.getElementById('editLeadForm');
        editForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const updatedLead = {
                ...lead,
                name: document.getElementById('editLeadName').value,
                phone: document.getElementById('editLeadPhone').value,
                email: document.getElementById('editLeadEmail').value,
                city: document.getElementById('editLeadCity').value,
                product: document.getElementById('editLeadProduct').value,
                status: document.getElementById('editLeadStatus').value,
                visitDate: document.getElementById('editLeadVisitDate').value,
                notes: document.getElementById('editLeadNotes').value
            };
            
            try {
                await database.ref(`leads/${year}/${month}/${leadId}`).update(updatedLead);
                showMessage('Lead atualizado com sucesso!', 'success');
                editModal.classList.remove('active');
                
                // Recarregar leads
                if (userRole === 'vendedor') {
                    loadSellerLeads();
                } else if (userRole === 'supervisor') {
                    loadSupervisorLeads();
                }
                
            } catch (error) {
                showMessage('Erro ao atualizar lead: ' + error.message, 'error');
            }
        });
        
    } catch (error) {
        console.error('Erro ao carregar lead para edição:', error);
    }
}

async function deleteLead(leadId, year, month) {
    if (!confirm('Tem certeza que deseja excluir este lead?')) return;
    
    try {
        await database.ref(`leads/${year}/${month}/${leadId}`).remove();
        showMessage('Lead excluído com sucesso!', 'success');
        
        // Recarregar leads
        if (userRole === 'vendedor') {
            loadSellerLeads();
        } else if (userRole === 'supervisor') {
            loadSupervisorLeads();
        }
        
    } catch (error) {
        showMessage('Erro ao excluir lead: ' + error.message, 'error');
    }
}

// Fechar modal
if (closeModal) {
    closeModal.addEventListener('click', () => {
        editModal.classList.remove('active');
    });
}

if (editModal) {
    editModal.addEventListener('click', (e) => {
        if (e.target === editModal) {
            editModal.classList.remove('active');
        }
    });
}

// ========== FUNÇÕES PLACEHOLDER PARA EVITAR ERROS ==========

// Placeholder para edição de vendedor (evita erro caso o botão seja clicado)
function editSeller(email) {
    console.warn('Edit seller was triggered for:', email);
    alert('Edição de vendedor ainda não foi implementada nesta versão.');
}

// Placeholder para ativar/desativar vendedor (evita erro e mantém app estável)
function toggleSellerStatus(email, isActive) {
    console.warn('Toggle seller status was triggered for:', email, 'current active:', isActive);
    alert('Ativação/desativação de vendedor ainda não foi implementada nesta versão.');
}

// Observar estado de autenticação
auth.onAuthStateChanged((user) => {
    if (user) {
        currentUser = user;
        userRole = detectUserRole(user.email);
        
        // Atualizar interface
        userEmail.textContent = user.email;
        userRoleBadge.textContent = userRole.charAt(0).toUpperCase() + userRole.slice(1);
        
        // Criar menu
        createSidebarMenu(userRole);
        
        // Mostrar sistema
        loginScreen.classList.remove('active');
        mainSystem.classList.add('active');
        
        // Mostrar painel inicial
        if (userRole === 'diretor') {
            showPanel('directorDashboard');
        } else if (userRole === 'supervisor') {
            showPanel('supervisorPanel');
        } else {
            showPanel('sellerPanel');
        }
    }
});

// Inicializar data atual no campo de data da visita
window.addEventListener('load', () => {
    const today = new Date().toISOString().split('T')[0];
    if (document.getElementById('leadVisitDate')) {
        document.getElementById('leadVisitDate').value = today;
    }
});
