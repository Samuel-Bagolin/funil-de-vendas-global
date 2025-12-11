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

// Estado global da aplicação
const appState = {
  currentUser: null,
  userRole: null,
  currentScreen: 'login-screen',
  currentMonth: null,
  currentYear: null,
  sellers: [],
  leads: [],
  filteredLeads: []
};

// Inicializar gráficos do Google Charts
google.charts.load('current', { packages: ['corechart'] });

// Inicialização da aplicação
document.addEventListener('DOMContentLoaded', function() {
  initializeApp();
  
  // Definir mês e ano atual
  const now = new Date();
  appState.currentMonth = now.getMonth() + 1; // Janeiro é 0
  appState.currentYear = now.getFullYear();
  
  // Configurar eventos
  setupEventListeners();
  
  // Verificar se já está autenticado
  auth.onAuthStateChanged(handleAuthStateChange);
});

// Inicializar elementos da UI
function initializeApp() {
  // Configurar select de meses no dashboard
  const monthSelect = document.getElementById('month-select');
  if (monthSelect) {
    const months = [
      'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
      'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
    ];
    
    for (let i = 0; i < 12; i++) {
      const option = document.createElement('option');
      option.value = i + 1;
      option.textContent = months[i];
      
      if (i + 1 === appState.currentMonth) {
        option.selected = true;
      }
      
      monthSelect.appendChild(option);
    }
  }
}

// Configurar todos os event listeners
function setupEventListeners() {
  // Login
  document.getElementById('login-btn').addEventListener('click', handleLogin);
  document.getElementById('forgot-password-btn').addEventListener('click', showResetPasswordScreen);
  
  // Reset de senha
  document.getElementById('reset-btn').addEventListener('click', handlePasswordReset);
  document.getElementById('back-to-login-btn').addEventListener('click', showLoginScreen);
  
  // Logout
  document.getElementById('logout-btn').addEventListener('click', handleLogout);
  
  // Navegação
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', function(e) {
      e.preventDefault();
      const screen = this.getAttribute('data-screen');
      showScreen(screen);
    });
  });
  
  // Dashboard
  document.getElementById('month-select')?.addEventListener('change', function() {
    appState.currentMonth = parseInt(this.value);
    loadDashboardData();
  });
  
  // Vendedores
  document.getElementById('new-seller-btn')?.addEventListener('click', showNewSellerModal);
  document.getElementById('save-seller-btn')?.addEventListener('click', handleNewSeller);
  document.getElementById('cancel-seller-btn')?.addEventListener('click', hideNewSellerModal);
  
  // Leads
  document.getElementById('save-lead-btn')?.addEventListener('click', handleSaveLead);
  document.getElementById('cancel-lead-btn')?.addEventListener('click', function() {
    showScreen('leads-screen');
  });
  
  // Filtros de leads
  document.getElementById('filter-status')?.addEventListener('change', filterLeads);
  document.getElementById('filter-city')?.addEventListener('input', filterLeads);
  document.getElementById('filter-date')?.addEventListener('change', filterLeads);
  document.getElementById('clear-filters-btn')?.addEventListener('click', clearFilters);
  
  // Modais
  document.querySelectorAll('.close-modal').forEach(btn => {
    btn.addEventListener('click', hideAllModals);
  });
  
  document.getElementById('modal-overlay').addEventListener('click', hideAllModals);
  document.getElementById('close-details-btn')?.addEventListener('click', hideAllModals);
}

// Autenticação
function handleAuthStateChange(user) {
  if (user) {
    appState.currentUser = user;
    
    // Obter role do usuário do banco de dados
    database.ref('users/' + user.uid).once('value')
      .then(snapshot => {
        const userData = snapshot.val();
        
        if (userData) {
          appState.userRole = userData.role;
          document.getElementById('user-name').textContent = userData.name || user.email;
          
          // Mostrar menu de supervisor se for supervisor
          if (appState.userRole === 'supervisor') {
            document.getElementById('supervisor-nav').classList.remove('hidden');
            showScreen('dashboard-screen');
            loadDashboardData();
            loadSellers();
          } else {
            document.getElementById('supervisor-nav').classList.add('hidden');
            showScreen('seller-dashboard-screen');
            loadSellerDashboard();
          }
          
          // Mostrar header principal e esconder tela de login
          document.getElementById('main-header').classList.remove('hidden');
          document.getElementById('login-screen').classList.remove('active');
          
          // Carregar dados comuns
          loadLeads();
          populateSellerSelect();
          
          // Se for vendedor, carregar dashboard do vendedor
          if (appState.userRole === 'vendedor') {
            loadSellerDashboard();
          }
        } else {
          // Se não tiver dados no DB, tratar como supervisor padrão
          appState.userRole = 'supervisor';
          document.getElementById('user-name').textContent = user.email;
          document.getElementById('supervisor-nav').classList.remove('hidden');
          showScreen('dashboard-screen');
          loadDashboardData();
          loadSellers();
          
          // Salvar usuário no DB
          database.ref('users/' + user.uid).set({
            uid: user.uid,
            email: user.email,
            role: 'supervisor',
            name: user.email.split('@')[0],
            active: true,
            createdAt: firebase.database.ServerValue.TIMESTAMP
          });
        }
      })
      .catch(error => {
        showMessage('login-message', 'Erro ao carregar dados do usuário: ' + error.message, 'error');
      });
  } else {
    // Usuário não autenticado
    appState.currentUser = null;
    appState.userRole = null;
    
    // Mostrar tela de login e esconder header
    document.getElementById('main-header').classList.add('hidden');
    showScreen('login-screen');
  }
}

// Login
function handleLogin() {
  const email = document.getElementById('login-email').value;
  const password = document.getElementById('login-password').value;
  
  if (!email || !password) {
    showMessage('login-message', 'Por favor, preencha todos os campos.', 'error');
    return;
  }
  
  showMessage('login-message', 'Entrando...', 'info');
  
  auth.signInWithEmailAndPassword(email, password)
    .then(() => {
      showMessage('login-message', 'Login realizado com sucesso!', 'success');
    })
    .catch(error => {
      let errorMessage = 'Erro ao fazer login.';
      
      switch (error.code) {
        case 'auth/user-not-found':
          errorMessage = 'Usuário não encontrado.';
          break;
        case 'auth/wrong-password':
          errorMessage = 'Senha incorreta.';
          break;
        case 'auth/invalid-email':
          errorMessage = 'E-mail inválido.';
          break;
        case 'auth/user-disabled':
          errorMessage = 'Esta conta foi desativada.';
          break;
      }
      
      showMessage('login-message', errorMessage, 'error');
    });
}

// Logout
function handleLogout() {
  auth.signOut()
    .then(() => {
      showMessage('login-message', 'Logout realizado com sucesso.', 'success');
    })
    .catch(error => {
      console.error('Erro ao fazer logout:', error);
    });
}

// Reset de senha
function handlePasswordReset() {
  const email = document.getElementById('reset-email').value;
  
  if (!email) {
    showMessage('reset-message', 'Por favor, informe seu e-mail.', 'error');
    return;
  }
  
  showMessage('reset-message', 'Enviando link de recuperação...', 'info');
  
  auth.sendPasswordResetEmail(email)
    .then(() => {
      showMessage('reset-message', 'Link de recuperação enviado para seu e-mail.', 'success');
    })
    .catch(error => {
      showMessage('reset-message', 'Erro ao enviar link: ' + error.message, 'error');
    });
}

// Mostrar/Esconder telas
function showScreen(screenId) {
  // Esconder todas as telas
  document.querySelectorAll('.screen').forEach(screen => {
    screen.classList.remove('active');
    screen.classList.add('hidden');
  });
  
  // Mostrar a tela desejada
  const targetScreen = document.getElementById(screenId);
  if (targetScreen) {
    targetScreen.classList.remove('hidden');
    targetScreen.classList.add('active');
    appState.currentScreen = screenId;
    
    // Ativar link no menu
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      if (link.getAttribute('data-screen') === screenId) {
        link.classList.add('active');
      }
    });
    
    // Carregar dados específicos da tela
    if (screenId === 'leads-screen') {
      loadLeads();
    } else if (screenId === 'sellers-screen' && appState.userRole === 'supervisor') {
      loadSellers();
    } else if (screenId === 'new-lead-screen') {
      populateSellerSelect();
      resetLeadForm();
    } else if (screenId === 'seller-dashboard-screen' && appState.userRole === 'vendedor') {
      loadSellerDashboard();
    }
  }
}

function showLoginScreen() {
  showScreen('login-screen');
}

function showResetPasswordScreen() {
  showScreen('reset-password-screen');
}

// Gerenciamento de Vendedores
function showNewSellerModal() {
  document.getElementById('new-seller-modal').classList.remove('hidden');
  document.getElementById('modal-overlay').classList.remove('hidden');
  document.getElementById('seller-message').innerHTML = '';
}

function hideNewSellerModal() {
  document.getElementById('new-seller-modal').classList.add('hidden');
  document.getElementById('modal-overlay').classList.add('hidden');
}

function handleNewSeller() {
  const name = document.getElementById('seller-name').value;
  const email = document.getElementById('seller-email').value;
  const password = document.getElementById('seller-password').value;
  
  if (!name || !email || !password) {
    showMessage('seller-message', 'Por favor, preencha todos os campos.', 'error');
    return;
  }
  
  if (password.length < 6) {
    showMessage('seller-message', 'A senha deve ter pelo menos 6 caracteres.', 'error');
    return;
  }
  
  showMessage('seller-message', 'Criando vendedor...', 'info');
  
  // Criar usuário no Firebase Auth
  auth.createUserWithEmailAndPassword(email, password)
    .then((userCredential) => {
      const user = userCredential.user;
      
      // Salvar dados no Realtime Database
      return database.ref('users/' + user.uid).set({
        uid: user.uid,
        email: email,
        name: name,
        role: 'vendedor',
        active: true,
        createdAt: firebase.database.ServerValue.TIMESTAMP,
        createdBy: appState.currentUser.uid
      });
    })
    .then(() => {
      showMessage('seller-message', 'Vendedor criado com sucesso!', 'success');
      
      // Limpar formulário
      document.getElementById('seller-name').value = '';
      document.getElementById('seller-email').value = '';
      document.getElementById('seller-password').value = '';
      
      // Atualizar lista de vendedores
      loadSellers();
      populateSellerSelect();
      
      // Fechar modal após 2 segundos
      setTimeout(() => {
        hideNewSellerModal();
      }, 2000);
    })
    .catch(error => {
      let errorMessage = 'Erro ao criar vendedor.';
      
      if (error.code === 'auth/email-already-in-use') {
        errorMessage = 'Este e-mail já está em uso.';
      } else if (error.code === 'auth/invalid-email') {
        errorMessage = 'E-mail inválido.';
      }
      
      showMessage('seller-message', errorMessage, 'error');
    });
}

function loadSellers() {
  database.ref('users').orderByChild('role').equalTo('vendedor').once('value')
    .then(snapshot => {
      const sellers = [];
      snapshot.forEach(childSnapshot => {
        const seller = childSnapshot.val();
        seller.id = childSnapshot.key;
        sellers.push(seller);
      });
      
      appState.sellers = sellers;
      renderSellersTable(sellers);
    })
    .catch(error => {
      console.error('Erro ao carregar vendedores:', error);
      document.getElementById('sellers-table-body').innerHTML = 
        '<tr><td colspan="6">Erro ao carregar vendedores.</td></tr>';
    });
}

function renderSellersTable(sellers) {
  const tbody = document.getElementById('sellers-table-body');
  
  if (sellers.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6">Nenhum vendedor cadastrado.</td></tr>';
    return;
  }
  
  let html = '';
  
  sellers.forEach(seller => {
    const createdAt = seller.createdAt ? new Date(seller.createdAt).toLocaleDateString('pt-BR') : 'N/A';
    
    html += `
      <tr>
        <td>${seller.name || 'N/A'}</td>
        <td>${seller.email}</td>
        <td>
          <span class="status-badge ${seller.active ? 'status-fechado' : 'status-perdido'}">
            ${seller.active ? 'Ativo' : 'Inativo'}
          </span>
        </td>
        <td>0</td>
        <td>${createdAt}</td>
        <td class="actions">
          <button class="action-btn delete" onclick="toggleSellerStatus('${seller.id}', ${!seller.active})">
            ${seller.active ? 'Desativar' : 'Ativar'}
          </button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

function toggleSellerStatus(sellerId, newStatus) {
  database.ref('users/' + sellerId).update({ active: newStatus })
    .then(() => {
      loadSellers();
      populateSellerSelect();
    })
    .catch(error => {
      console.error('Erro ao alterar status do vendedor:', error);
      alert('Erro ao alterar status do vendedor.');
    });
}

// Gerenciamento de Leads
function handleSaveLead(e) {
  e.preventDefault();
  
  const name = document.getElementById('lead-name').value;
  const phone = document.getElementById('lead-phone').value;
  const email = document.getElementById('lead-email').value;
  const city = document.getElementById('lead-city').value;
  const product = document.getElementById('lead-product').value;
  const status = document.getElementById('lead-status').value;
  const visitDate = document.getElementById('lead-visit-date').value;
  const sellerId = document.getElementById('lead-seller').value || appState.currentUser.uid;
  const notes = document.getElementById('lead-notes').value;
  
  // Validação básica
  if (!name || !phone || !email || !city || !product || !status) {
    showMessage('lead-message', 'Por favor, preencha todos os campos obrigatórios.', 'error');
    return;
  }
  
  showMessage('lead-message', 'Salvando lead...', 'info');
  
  // Determinar vendedor responsável
  let sellerName = appState.currentUser.email.split('@')[0];
  if (sellerId !== appState.currentUser.uid) {
    const seller = appState.sellers.find(s => s.id === sellerId);
    if (seller) {
      sellerName = seller.name;
    }
  }
  
  // Criar objeto lead
  const leadId = generateLeadId();
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  const leadData = {
    id: leadId,
    name: name,
    phone: phone,
    email: email,
    city: city,
    product: product,
    status: status,
    visitDate: visitDate || null,
    sellerId: sellerId,
    sellerName: sellerName,
    notes: notes || '',
    createdAt: firebase.database.ServerValue.TIMESTAMP,
    createdBy: appState.currentUser.uid,
    updatedAt: firebase.database.ServerValue.TIMESTAMP
  };
  
  // Salvar no caminho obrigatório /leads/{ano}/{mes}/{id}
  database.ref(`leads/${year}/${month}/${leadId}`).set(leadData)
    .then(() => {
      showMessage('lead-message', 'Lead salvo com sucesso!', 'success');
      
      // Limpar formulário
      resetLeadForm();
      
      // Atualizar listas
      if (appState.userRole === 'supervisor') {
        loadDashboardData();
      } else {
        loadSellerDashboard();
      }
      
      loadLeads();
      
      // Redirecionar para lista de leads após 2 segundos
      setTimeout(() => {
        showScreen('leads-screen');
      }, 2000);
    })
    .catch(error => {
      showMessage('lead-message', 'Erro ao salvar lead: ' + error.message, 'error');
    });
}

function resetLeadForm() {
  document.getElementById('lead-form').reset();
  
  // Definir data de visita para amanhã
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  document.getElementById('lead-visit-date').value = tomorrow.toISOString().split('T')[0];
  
  // Definir vendedor padrão
  if (appState.userRole === 'vendedor') {
    document.getElementById('lead-seller').value = appState.currentUser.uid;
  }
}

function generateLeadId() {
  return 'lead_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
}

function loadLeads() {
  const now = new Date();
  const month = appState.currentMonth || now.getMonth() + 1;
  const year = appState.currentYear || now.getFullYear();
  
  // Construir referência para leads
  let leadsRef = database.ref(`leads/${year}/${month}`);
  
  // Se for vendedor, filtrar apenas seus leads
  if (appState.userRole === 'vendedor') {
    leadsRef = leadsRef.orderByChild('sellerId').equalTo(appState.currentUser.uid);
  }
  
  leadsRef.once('value')
    .then(snapshot => {
      const leads = [];
      snapshot.forEach(childSnapshot => {
        const lead = childSnapshot.val();
        lead.id = childSnapshot.key;
        leads.push(lead);
      });
      
      // Ordenar por data de criação (mais recente primeiro)
      leads.sort((a, b) => {
        return (b.createdAt || 0) - (a.createdAt || 0);
      });
      
      appState.leads = leads;
      appState.filteredLeads = [...leads];
      renderLeadsTable(leads);
    })
    .catch(error => {
      console.error('Erro ao carregar leads:', error);
      document.getElementById('leads-table-body').innerHTML = 
        '<tr><td colspan="7">Erro ao carregar leads.</td></tr>';
    });
}

function renderLeadsTable(leads) {
  const tbody = document.getElementById('leads-table-body');
  
  if (leads.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7">Nenhum lead encontrado.</td></tr>';
    return;
  }
  
  let html = '';
  
  leads.forEach(lead => {
    const visitDate = lead.visitDate ? new Date(lead.visitDate).toLocaleDateString('pt-BR') : 'Não agendada';
    const statusClass = `status-${lead.status.toLowerCase().replace(' ', '-')}`;
    
    html += `
      <tr>
        <td>${lead.name}</td>
        <td>${lead.phone}</td>
        <td>${lead.city}</td>
        <td>${lead.product}</td>
        <td><span class="status-badge ${statusClass}">${lead.status}</span></td>
        <td>${visitDate}</td>
        <td class="actions">
          <button class="action-btn view" onclick="showLeadDetails('${lead.id}')">Ver</button>
        </td>
      </tr>
    `;
  });
  
  tbody.innerHTML = html;
}

function filterLeads() {
  const statusFilter = document.getElementById('filter-status').value;
  const cityFilter = document.getElementById('filter-city').value.toLowerCase();
  const dateFilter = document.getElementById('filter-date').value;
  
  let filtered = [...appState.leads];
  
  // Filtrar por status
  if (statusFilter) {
    filtered = filtered.filter(lead => lead.status === statusFilter);
  }
  
  // Filtrar por cidade
  if (cityFilter) {
    filtered = filtered.filter(lead => lead.city.toLowerCase().includes(cityFilter));
  }
  
  // Filtrar por data de visita
  if (dateFilter) {
    filtered = filtered.filter(lead => lead.visitDate === dateFilter);
  }
  
  appState.filteredLeads = filtered;
  renderLeadsTable(filtered);
}

function clearFilters() {
  document.getElementById('filter-status').value = '';
  document.getElementById('filter-city').value = '';
  document.getElementById('filter-date').value = '';
  
  appState.filteredLeads = [...appState.leads];
  renderLeadsTable(appState.leads);
}

function showLeadDetails(leadId) {
  const now = new Date();
  const month = appState.currentMonth || now.getMonth() + 1;
  const year = appState.currentYear || now.getFullYear();
  
  database.ref(`leads/${year}/${month}/${leadId}`).once('value')
    .then(snapshot => {
      const lead = snapshot.val();
      
      if (!lead) {
        document.getElementById('lead-details-content').innerHTML = 
          '<p>Lead não encontrado.</p>';
      } else {
        const createdAt = lead.createdAt ? new Date(lead.createdAt).toLocaleString('pt-BR') : 'N/A';
        const visitDate = lead.visitDate ? new Date(lead.visitDate).toLocaleDateString('pt-BR') : 'Não agendada';
        const statusClass = `status-${lead.status.toLowerCase().replace(' ', '-')}`;
        
        document.getElementById('lead-details-content').innerHTML = `
          <div class="lead-detail">
            <label>Nome:</label>
            <p>${lead.name}</p>
          </div>
          
          <div class="lead-detail">
            <label>Telefone:</label>
            <p>${lead.phone}</p>
          </div>
          
          <div class="lead-detail">
            <label>E-mail:</label>
            <p>${lead.email}</p>
          </div>
          
          <div class="lead-detail">
            <label>Cidade:</label>
            <p>${lead.city}</p>
          </div>
          
          <div class="lead-detail">
            <label>Produto de Interesse:</label>
            <p>${lead.product}</p>
          </div>
          
          <div class="lead-detail">
            <label>Status:</label>
            <p><span class="status-badge ${statusClass}">${lead.status}</span></p>
          </div>
          
          <div class="lead-detail">
            <label>Vendedor Responsável:</label>
            <p>${lead.sellerName || 'N/A'}</p>
          </div>
          
          <div class="lead-detail">
            <label>Data da Visita:</label>
            <p>${visitDate}</p>
          </div>
          
          <div class="lead-detail">
            <label>Observações:</label>
            <p>${lead.notes || 'Nenhuma observação.'}</p>
          </div>
          
          <div class="lead-detail">
            <label>Cadastrado em:</label>
            <p>${createdAt}</p>
          </div>
        `;
      }
      
      // Mostrar modal
      document.getElementById('lead-details-modal').classList.remove('hidden');
      document.getElementById('modal-overlay').classList.remove('hidden');
    })
    .catch(error => {
      console.error('Erro ao carregar detalhes do lead:', error);
      document.getElementById('lead-details-content').innerHTML = 
        '<p>Erro ao carregar detalhes do lead.</p>';
      
      document.getElementById('lead-details-modal').classList.remove('hidden');
      document.getElementById('modal-overlay').classList.remove('hidden');
    });
}

function populateSellerSelect() {
  const select = document.getElementById('lead-seller');
  
  if (!select) return;
  
  // Limpar opções existentes (exceto a primeira)
  while (select.options.length > 1) {
    select.remove(1);
  }
  
  // Se for supervisor, adicionar todos os vendedores ativos
  if (appState.userRole === 'supervisor') {
    const activeSellers = appState.sellers.filter(seller => seller.active);
    
    activeSellers.forEach(seller => {
      const option = document.createElement('option');
      option.value = seller.id;
      option.textContent = seller.name || seller.email;
      select.appendChild(option);
    });
  }
}

// Dashboard
function loadDashboardData() {
  const month = appState.currentMonth;
  const year = appState.currentYear;
  
  // Carregar leads do mês
  database.ref(`leads/${year}/${month}`).once('value')
    .then(snapshot => {
      const leads = [];
      let leadCount = 0;
      const statusCount = {};
      const sellerCount = {};
      let scheduledVisits = 0;
      let closedLeads = 0;
      
      snapshot.forEach(childSnapshot => {
        const lead = childSnapshot.val();
        leads.push(lead);
        leadCount++;
        
        // Contar por status
        statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
        
        // Contar por vendedor
        sellerCount[lead.sellerName] = (sellerCount[lead.sellerName] || 0) + 1;
        
        // Contar visitas agendadas
        if (lead.visitDate) {
          scheduledVisits++;
        }
        
        // Contar leads fechados
        if (lead.status === 'Fechado') {
          closedLeads++;
        }
      });
      
      // Atualizar estatísticas
      document.getElementById('month-leads').textContent = leadCount;
      document.getElementById('scheduled-visits').textContent = scheduledVisits;
      
      // Calcular taxa de conversão
      const conversionRate = leadCount > 0 ? Math.round((closedLeads / leadCount) * 100) : 0;
      document.getElementById('conversion-rate').textContent = conversionRate + '%';
      
      // Atualizar contador de vendedores ativos
      const activeSellers = appState.sellers.filter(s => s.active).length;
      document.getElementById('active-sellers').textContent = activeSellers;
      
      // Renderizar gráficos
      renderStatusChart(statusCount);
      renderSellerChart(sellerCount);
      loadRecentLeads(leads);
    })
    .catch(error => {
      console.error('Erro ao carregar dados do dashboard:', error);
    });
}

function renderStatusChart(statusData) {
  const data = new google.visualization.DataTable();
  data.addColumn('string', 'Status');
  data.addColumn('number', 'Quantidade');
  
  const rows = [];
  for (const status in statusData) {
    rows.push([status, statusData[status]]);
  }
  
  data.addRows(rows);
  
  const options = {
    title: 'Leads por Status',
    titleTextStyle: { color: '#367C2B', fontSize: 16, bold: true },
    colors: ['#367C2B', '#FFDE00', '#3498db', '#e74c3c', '#9b59b6', '#2ecc71'],
    backgroundColor: '#F5F5F5',
    legend: { position: 'labeled', textStyle: { color: '#333', fontSize: 12 } },
    pieSliceText: 'value',
    chartArea: { width: '90%', height: '80%' }
  };
  
  const chart = new google.visualization.PieChart(document.getElementById('status-chart'));
  chart.draw(data, options);
}

function renderSellerChart(sellerData) {
  const data = new google.visualization.DataTable();
  data.addColumn('string', 'Vendedor');
  data.addColumn('number', 'Leads');
  
  const rows = [];
  for (const seller in sellerData) {
    rows.push([seller, sellerData[seller]]);
  }
  
  data.addRows(rows);
  
  const options = {
    title: 'Leads por Vendedor',
    titleTextStyle: { color: '#367C2B', fontSize: 16, bold: true },
    colors: ['#367C2B'],
    backgroundColor: '#F5F5F5',
    legend: { position: 'none' },
    hAxis: { textStyle: { color: '#333', fontSize: 12 } },
    vAxis: { textStyle: { color: '#333', fontSize: 12 } },
    chartArea: { width: '85%', height: '75%' }
  };
  
  const chart = new google.visualization.BarChart(document.getElementById('seller-chart'));
  chart.draw(data, options);
}

function loadRecentLeads(leads) {
  const container = document.getElementById('recent-leads-content');
  
  // Ordenar por data (mais recentes primeiro)
  const recentLeads = leads
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);
  
  if (recentLeads.length === 0) {
    container.innerHTML = '<p>Nenhum lead cadastrado este mês.</p>';
    return;
  }
  
  let html = '<div class="recent-leads-list">';
  
  recentLeads.forEach(lead => {
    const date = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : 'N/A';
    const statusClass = `status-${lead.status.toLowerCase().replace(' ', '-')}`;
    
    html += `
      <div class="recent-lead-item">
        <div class="recent-lead-info">
          <strong>${lead.name}</strong>
          <span class="status-badge ${statusClass}">${lead.status}</span>
        </div>
        <div class="recent-lead-details">
          <span>${lead.product} • ${lead.city}</span>
          <span>${date}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Dashboard do Vendedor
function loadSellerDashboard() {
  const now = new Date();
  const month = now.getMonth() + 1;
  const year = now.getFullYear();
  
  database.ref(`leads/${year}/${month}`)
    .orderByChild('sellerId')
    .equalTo(appState.currentUser.uid)
    .once('value')
    .then(snapshot => {
      const leads = [];
      let leadCount = 0;
      const statusCount = {};
      let scheduledVisits = 0;
      let closedLeads = 0;
      
      snapshot.forEach(childSnapshot => {
        const lead = childSnapshot.val();
        leads.push(lead);
        leadCount++;
        
        // Contar por status
        statusCount[lead.status] = (statusCount[lead.status] || 0) + 1;
        
        // Contar visitas agendadas
        if (lead.visitDate) {
          scheduledVisits++;
        }
        
        // Contar leads fechados
        if (lead.status === 'Fechado') {
          closedLeads++;
        }
      });
      
      // Atualizar estatísticas
      document.getElementById('my-month-leads').textContent = leadCount;
      document.getElementById('my-scheduled-visits').textContent = scheduledVisits;
      
      // Calcular taxa de conversão
      const conversionRate = leadCount > 0 ? Math.round((closedLeads / leadCount) * 100) : 0;
      document.getElementById('my-conversion-rate').textContent = conversionRate + '%';
      
      // Renderizar gráfico de status
      renderMyStatusChart(statusCount);
      loadMyRecentLeads(leads);
    })
    .catch(error => {
      console.error('Erro ao carregar dashboard do vendedor:', error);
    });
}

function renderMyStatusChart(statusData) {
  const data = new google.visualization.DataTable();
  data.addColumn('string', 'Status');
  data.addColumn('number', 'Quantidade');
  
  const rows = [];
  for (const status in statusData) {
    rows.push([status, statusData[status]]);
  }
  
  data.addRows(rows);
  
  const options = {
    title: 'Meus Leads por Status',
    titleTextStyle: { color: '#367C2B', fontSize: 16, bold: true },
    colors: ['#367C2B', '#FFDE00', '#3498db', '#e74c3c', '#9b59b6', '#2ecc71'],
    backgroundColor: '#F5F5F5',
    legend: { position: 'labeled', textStyle: { color: '#333', fontSize: 12 } },
    pieSliceText: 'value',
    chartArea: { width: '90%', height: '80%' }
  };
  
  const chart = new google.visualization.PieChart(document.getElementById('my-status-chart'));
  chart.draw(data, options);
}

function loadMyRecentLeads(leads) {
  const container = document.getElementById('my-recent-leads-content');
  
  // Ordenar por data (mais recentes primeiro)
  const recentLeads = leads
    .sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0))
    .slice(0, 5);
  
  if (recentLeads.length === 0) {
    container.innerHTML = '<p>Nenhum lead cadastrado este mês.</p>';
    return;
  }
  
  let html = '<div class="recent-leads-list">';
  
  recentLeads.forEach(lead => {
    const date = lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('pt-BR') : 'N/A';
    const statusClass = `status-${lead.status.toLowerCase().replace(' ', '-')}`;
    
    html += `
      <div class="recent-lead-item">
        <div class="recent-lead-info">
          <strong>${lead.name}</strong>
          <span class="status-badge ${statusClass}">${lead.status}</span>
        </div>
        <div class="recent-lead-details">
          <span>${lead.product} • ${lead.city}</span>
          <span>${date}</span>
        </div>
      </div>
    `;
  });
  
  html += '</div>';
  container.innerHTML = html;
}

// Utilitários
function showMessage(elementId, message, type) {
  const element = document.getElementById(elementId);
  
  if (!element) return;
  
  element.textContent = message;
  element.className = 'message ' + type;
  
  // Auto-esconder mensagens de sucesso após 5 segundos
  if (type === 'success') {
    setTimeout(() => {
      element.textContent = '';
      element.className = 'message';
    }, 5000);
  }
}

function hideAllModals() {
  document.querySelectorAll('.modal').forEach(modal => {
    modal.classList.add('hidden');
  });
  
  document.getElementById('modal-overlay').classList.add('hidden');
}
