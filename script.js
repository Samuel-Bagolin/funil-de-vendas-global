// =================================================================================================
// 1. CONFIGURAÇÃO E INICIALIZAÇÃO DO FIREBASE
// =================================================================================================

// Configuração OBRIGATÓRIA fornecida pelo usuário
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

// Inicializa o Firebase
const app = firebase.initializeApp(firebaseConfig);
const auth = app.auth();
const db = app.database();

// Variáveis globais
let currentUserRole = null;
let currentUserId = null;

// =================================================================================================
// 2. SPA ENGINE
// =================================================================================================

/**
 * Exibe a tela solicitada e oculta as demais.
 * @param {string} screenId - O ID da seção a ser exibida.
 */
function showScreen(screenId) {
    document.querySelectorAll('.screen').forEach(screen => {
        screen.classList.remove('active');
    });
    const targetScreen = document.getElementById(screenId);
    if (targetScreen) {
        targetScreen.classList.add('active');
    }
}

/**
 * Atualiza a navegação e exibe a tela inicial com base na função (role) do usuário.
 * @param {string} role - A função do usuário ('supervisor' ou 'vendedor').
 */
function updateUIForRole(role) {
    // Oculta todos os botões de navegação
    document.querySelectorAll('#main-nav .nav-btn').forEach(btn => btn.style.display = 'none');

    // Exibe a navegação principal e o botão de logout
    document.getElementById('main-nav').style.display = 'flex';
    document.getElementById('logout-btn').style.display = 'block';

    if (role === 'supervisor') {
        document.getElementById('nav-dashboard-supervisor').style.display = 'block';
        document.getElementById('nav-manage-sellers').style.display = 'block';
        showScreen('supervisor-dashboard-screen');
        loadSupervisorDashboard();
        loadSellersList();
    } else if (role === 'vendedor') {
        document.getElementById('nav-dashboard-seller').style.display = 'block';
        document.getElementById('nav-add-lead').style.display = 'block';
        document.getElementById('nav-list-leads').style.display = 'block';
        showScreen('seller-dashboard-screen');
        loadSellerDashboard();
        loadLeadsList(); // Carrega a lista de leads na tela de listagem
    } else {
        // Caso a função não seja reconhecida, faz logout
        auth.signOut();
    }
}

// =================================================================================================
// 3. AUTENTICAÇÃO E CONTROLE DE ACESSO (RBAC)
// =================================================================================================

/**
 * Busca a função (role) do usuário no Realtime Database.
 * @param {string} uid - O ID do usuário do Firebase Auth.
 * @returns {Promise<string|null>} A função do usuário ('supervisor', 'vendedor') ou null.
 */
async function getUserRole(uid) {
    try {
        const snapshot = await db.ref('users/' + uid).once('value');
        const userData = snapshot.val();
        return userData ? userData.role : null;
    } catch (error) {
        console.error("Erro ao buscar função do usuário:", error);
        return null;
    }
}

/**
 * Listener de estado de autenticação.
 */
auth.onAuthStateChanged(async (user) => {
    if (user) {
        currentUserId = user.uid;
        currentUserRole = await getUserRole(user.uid);
        if (currentUserRole) {
            updateUIForRole(currentUserRole);
        } else {
            // Usuário autenticado, mas sem função definida (erro ou novo usuário)
            auth.signOut();
        }
    } else {
        // Usuário deslogado
        currentUserId = null;
        currentUserRole = null;
        document.getElementById('main-nav').style.display = 'none';
        document.getElementById('logout-btn').style.display = 'none';
        showScreen('login-screen');
    }
});

/**
 * Função de Login.
 */
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;
    const messageArea = document.getElementById('login-message');
    messageArea.textContent = '';

    try {
        await auth.signInWithEmailAndPassword(email, password);
        // O onAuthStateChanged cuidará da navegação
    } catch (error) {
        messageArea.textContent = 'Erro no login: ' + error.message;
    }
});

/**
 * Função de Logout.
 */
document.getElementById('logout-btn').addEventListener('click', () => {
    auth.signOut();
});

/**
 * Função de Esqueci minha senha.
 */
document.getElementById('forgot-password-btn').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value;
    const messageArea = document.getElementById('login-message');
    messageArea.textContent = '';

    if (!email) {
        messageArea.textContent = 'Por favor, digite seu e-mail no campo de login.';
        return;
    }

    try {
        await auth.sendPasswordResetEmail(email);
        messageArea.textContent = 'E-mail de redefinição de senha enviado para ' + email;
    } catch (error) {
        messageArea.textContent = 'Erro ao enviar e-mail: ' + error.message;
    }
});

// =================================================================================================
// 4. FUNCIONALIDADES DO SUPERVISOR (CRUD de Vendedores)
// =================================================================================================

/**
 * Adiciona um novo vendedor (usuário) ao Firebase Auth e salva o role no DB.
 */
document.getElementById('add-seller-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'supervisor') return;

    const name = document.getElementById('seller-name').value;
    const email = document.getElementById('seller-email').value;
    const password = document.getElementById('seller-password').value;
    const messageArea = document.getElementById('add-seller-message');
    messageArea.textContent = '';

    try {
        // 1. Cria o usuário no Firebase Auth (Atenção: A criação de usuário por e-mail/senha no cliente
        // é limitada e geralmente requer um backend. Como não podemos usar um backend, simularemos
        // a criação no Auth e salvaremos a função no DB, assumindo que o Supervisor tem privilégios
        // de Admin SDK, o que não é o caso em um front-end puro. Para fins de demonstração e
        // seguindo a regra de 3 arquivos, faremos o que é possível no front-end.)
        // No mundo real, esta função seria uma Cloud Function ou API.
        // Como o Firebase Auth não permite a criação de usuários por terceiros no front-end,
        // vamos focar em salvar a informação no DB e assumir que o Auth será feito manualmente
        // ou via um processo de backend que não podemos implementar aqui.

        // **SIMULAÇÃO DE CRIAÇÃO DE USUÁRIO (Apenas salva no DB para RBAC)**
        // Gerar um UID simulado, pois não podemos criar no Auth
        const simulatedUid = 'seller_' + Date.now();

        // 2. Salva o vendedor no Realtime Database com a função 'vendedor'
        await db.ref('users/' + simulatedUid).set({
            name: name,
            email: email,
            role: 'vendedor',
            isActive: true,
            createdAt: firebase.database.ServerValue.TIMESTAMP
        });

        messageArea.textContent = `Vendedor ${name} cadastrado (UID simulado: ${simulatedUid}). Lembre-se que em um ambiente real, a criação no Firebase Auth deve ser feita via Admin SDK.`;
        document.getElementById('add-seller-form').reset();
        loadSellersList();

    } catch (error) {
        messageArea.textContent = 'Erro ao cadastrar vendedor: ' + error.message;
    }
});

/**
 * Carrega e exibe a lista de vendedores.
 */
function loadSellersList() {
    if (currentUserRole !== 'supervisor') return;

    const tableBody = document.querySelector('#sellers-table tbody');
    tableBody.innerHTML = '';

    db.ref('users').orderByChild('role').equalTo('vendedor').once('value', (snapshot) => {
        snapshot.forEach((childSnapshot) => {
            const seller = childSnapshot.val();
            const uid = childSnapshot.key;

            const row = tableBody.insertRow();
            row.insertCell().textContent = seller.name;
            row.insertCell().textContent = seller.email;
            row.insertCell().textContent = seller.isActive ? 'Ativo' : 'Inativo';

            const actionCell = row.insertCell();
            const toggleBtn = document.createElement('button');
            toggleBtn.className = 'btn btn-secondary';
            toggleBtn.textContent = seller.isActive ? 'Desativar' : 'Ativar';
            toggleBtn.addEventListener('click', () => toggleSellerStatus(uid, seller.isActive));
            actionCell.appendChild(toggleBtn);
        });
    });
}

/**
 * Alterna o status de um vendedor.
 * @param {string} uid - O ID do usuário.
 * @param {boolean} currentStatus - O status atual.
 */
function toggleSellerStatus(uid, currentStatus) {
    if (currentUserRole !== 'supervisor') return;

    db.ref('users/' + uid + '/isActive').set(!currentStatus)
        .then(() => {
            alert(`Vendedor ${uid} ${currentStatus ? 'desativado' : 'ativado'} com sucesso.`);
            loadSellersList();
        })
        .catch(error => {
            console.error("Erro ao alterar status:", error);
            alert('Erro ao alterar status do vendedor.');
        });
}

/**
 * Carrega os dados para o Dashboard do Supervisor.
 */
function loadSupervisorDashboard() {
    if (currentUserRole !== 'supervisor') return;

    // 1. Métricas de Vendedores Ativos
    db.ref('users').orderByChild('isActive').equalTo(true).once('value', (snapshot) => {
        const activeSellersCount = snapshot.numChildren();
        document.getElementById('metric-active-sellers').textContent = activeSellersCount;
    });

    // 2. Carregar todos os leads para as métricas e gráficos
    db.ref('leads').once('value', (snapshot) => {
        const allLeads = snapshot.val() || {};
        const leadsArray = [];

        // Estrutura: /leads/{ano}/{mes}/{id_do_lead}
        for (const year in allLeads) {
            for (const month in allLeads[year]) {
                for (const leadId in allLeads[year][month]) {
                    leadsArray.push(allLeads[year][month][leadId]);
                }
            }
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1; // Mês atual (1-12)
        const currentYear = now.getFullYear();

        // Filtra leads do mês atual
        const currentMonthLeads = leadsArray.filter(lead => {
            const leadDate = new Date(lead.timestamp);
            return leadDate.getFullYear() === currentYear && (leadDate.getMonth() + 1) === currentMonth;
        });

        // 3. Métrica de Leads no Mês
        document.getElementById('metric-leads-month').textContent = currentMonthLeads.length;

        // 4. Gráfico Leads por Status
        const statusCounts = currentMonthLeads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});
        renderLeadsByStatusChart(statusCounts, 'leads-by-status-chart');

        // 5. Gráfico Leads por Vendedor
        const sellerCounts = currentMonthLeads.reduce((acc, lead) => {
            acc[lead.sellerName] = (acc[lead.sellerName] || 0) + 1;
            return acc;
        }, {});
        renderLeadsBySellerChart(sellerCounts);

        // 6. Gráfico Comparação Mês a Mês
        const monthlyCounts = leadsArray.reduce((acc, lead) => {
            const leadDate = new Date(lead.timestamp);
            const key = `${leadDate.getFullYear()}-${leadDate.getMonth() + 1}`;
            acc[key] = (acc[key] || 0) + 1;
            return acc;
        }, {});
        renderMonthComparisonChart(monthlyCounts);
    });
}

// =================================================================================================
// 5. FUNCIONALIDADES DO VENDEDOR (CRUD de Leads)
// =================================================================================================

/**
 * Carrega os dados para o Dashboard do Vendedor.
 */
function loadSellerDashboard() {
    if (currentUserRole !== 'vendedor') return;

    db.ref('leads').once('value', (snapshot) => {
        const allLeads = snapshot.val() || {};
        const leadsArray = [];

        // Estrutura: /leads/{ano}/{mes}/{id_do_lead}
        for (const year in allLeads) {
            for (const month in allLeads[year]) {
                for (const leadId in allLeads[year][month]) {
                    const lead = allLeads[year][month][leadId];
                    if (lead.sellerId === currentUserId) {
                        leadsArray.push(lead);
                    }
                }
            }
        }

        const now = new Date();
        const currentMonth = now.getMonth() + 1;
        const currentYear = now.getFullYear();

        // Filtra leads do mês atual
        const currentMonthLeads = leadsArray.filter(lead => {
            const leadDate = new Date(lead.timestamp);
            return leadDate.getFullYear() === currentYear && (leadDate.getMonth() + 1) === currentMonth;
        });

        // 1. Métrica de Meus Leads no Mês
        document.getElementById('seller-metric-leads-month').textContent = currentMonthLeads.length;

        // 2. Métrica de Leads em Prospecção
        const prospectingLeads = currentMonthLeads.filter(lead => lead.status === 'Prospecção').length;
        document.getElementById('seller-metric-prospecting').textContent = prospectingLeads;

        // 3. Gráfico Meus Leads por Status
        const statusCounts = currentMonthLeads.reduce((acc, lead) => {
            acc[lead.status] = (acc[lead.status] || 0) + 1;
            return acc;
        }, {});
        renderLeadsByStatusChart(statusCounts, 'seller-leads-by-status-chart');
    });
}

/**
 * Adiciona um novo lead.
 */
document.getElementById('add-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'vendedor') return;

    const form = e.target;
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth() + 1; // 1-12

    // Obter o nome do vendedor (simulado, pois o nome não está no Auth)
    const sellerSnapshot = await db.ref('users/' + currentUserId).once('value');
    const sellerName = sellerSnapshot.val() ? sellerSnapshot.val().name : 'Vendedor Desconhecido';

    const newLead = {
        name: form['lead-name'].value,
        phone: form['lead-phone'].value,
        email: form['lead-email'].value,
        city: form['lead-city'].value,
        product: form['lead-product'].value,
        status: form['lead-status'].value,
        observation: form['lead-observation'].value,
        visitDate: form['lead-visit-date'].value || null, // Opcional
        sellerId: currentUserId,
        sellerName: sellerName,
        timestamp: firebase.database.ServerValue.TIMESTAMP
    };

    try {
        // Salva no caminho obrigatório: /leads/{ano}/{mes}/{id_do_lead}
        const newLeadRef = db.ref(`leads/${year}/${month}`).push();
        await newLeadRef.set(newLead);

        document.getElementById('add-lead-message').textContent = 'Lead cadastrado com sucesso!';
        form.reset();
        loadSellerDashboard(); // Atualiza o dashboard
        loadLeadsList(); // Atualiza a lista
    } catch (error) {
        document.getElementById('add-lead-message').textContent = 'Erro ao cadastrar lead: ' + error.message;
    }
});

/**
 * Carrega e exibe a lista de leads do vendedor atual, aplicando filtros.
 */
function loadLeadsList(filters = {}) {
    if (currentUserRole !== 'vendedor') return;

    const tableBody = document.querySelector('#leads-table tbody');
    tableBody.innerHTML = '<tr><td colspan="5">Carregando leads...</td></tr>';

    db.ref('leads').once('value', (snapshot) => {
        const allLeads = snapshot.val() || {};
        let leadsArray = [];

        // 1. Coleta e filtra por vendedor
        for (const year in allLeads) {
            for (const month in allLeads[year]) {
                for (const leadId in allLeads[year][month]) {
                    const lead = allLeads[year][month][leadId];
                    lead.id = leadId; // Adiciona o ID para uso posterior
                    if (lead.sellerId === currentUserId) {
                        leadsArray.push(lead);
                    }
                }
            }
        }

        // 2. Aplica filtros adicionais
        if (filters.status) {
            leadsArray = leadsArray.filter(lead => lead.status === filters.status);
        }
        if (filters.city) {
            const cityRegex = new RegExp(filters.city, 'i');
            leadsArray = leadsArray.filter(lead => cityRegex.test(lead.city));
        }
        if (filters.dateStart || filters.dateEnd) {
            const start = filters.dateStart ? new Date(filters.dateStart).getTime() : 0;
            const end = filters.dateEnd ? new Date(filters.dateEnd).getTime() : Date.now();
            leadsArray = leadsArray.filter(lead => lead.timestamp >= start && lead.timestamp <= end);
        }

        // 3. Ordena por data de cadastro (mais recente primeiro)
        leadsArray.sort((a, b) => b.timestamp - a.timestamp);

        // 4. Renderiza a tabela
        tableBody.innerHTML = '';
        if (leadsArray.length === 0) {
            tableBody.innerHTML = '<tr><td colspan="5">Nenhum lead encontrado.</td></tr>';
            return;
        }

        leadsArray.forEach((lead) => {
            const row = tableBody.insertRow();
            row.insertCell().textContent = lead.name;
            row.insertCell().textContent = lead.city;
            row.insertCell().textContent = lead.status;
            row.insertCell().textContent = new Date(lead.timestamp).toLocaleDateString();

            const actionCell = row.insertCell();
            const detailsBtn = document.createElement('button');
            detailsBtn.className = 'btn btn-primary btn-small';
            detailsBtn.textContent = 'Detalhes/Editar';
            detailsBtn.addEventListener('click', () => showLeadDetails(lead));
            actionCell.appendChild(detailsBtn);
        });
    });
}

/**
 * Aplica os filtros da tela de listagem.
 */
document.getElementById('filter-leads-form').addEventListener('submit', (e) => {
    e.preventDefault();
    const form = e.target;
    const filters = {
        dateStart: form['filter-date-start'].value,
        dateEnd: form['filter-date-end'].value,
        city: form['filter-city'].value,
        status: form['filter-status'].value
    };
    loadLeadsList(filters);
});

/**
 * Limpa os filtros da tela de listagem.
 */
document.getElementById('clear-filters-btn').addEventListener('click', () => {
    document.getElementById('filter-leads-form').reset();
    loadLeadsList({});
});

/**
 * Exibe a tela de detalhes/edição de um lead.
 * @param {object} lead - O objeto lead.
 */
function showLeadDetails(lead) {
    // Preenche o formulário de edição
    document.getElementById('edit-lead-id').value = lead.id;
    document.getElementById('edit-lead-name').value = lead.name;
    document.getElementById('edit-lead-phone').value = lead.phone;
    document.getElementById('edit-lead-email').value = lead.email;
    document.getElementById('edit-lead-city').value = lead.city;
    document.getElementById('edit-lead-product').value = lead.product;
    document.getElementById('edit-lead-status').value = lead.status;
    document.getElementById('edit-lead-observation').value = lead.observation;
    document.getElementById('edit-lead-visit-date').value = lead.visitDate || '';

    // Exibe informações não editáveis
    document.getElementById('details-seller-name').textContent = lead.sellerName;
    document.getElementById('details-timestamp').textContent = new Date(lead.timestamp).toLocaleString();

    showScreen('lead-details-screen');
}

/**
 * Salva as alterações de um lead.
 */
document.getElementById('edit-lead-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    if (currentUserRole !== 'vendedor') return;

    const form = e.target;
    const leadId = form['edit-lead-id'].value;
    const messageArea = document.getElementById('edit-lead-message');
    messageArea.textContent = '';

    // Encontrar o caminho completo do lead (ano/mes)
    // Isso é ineficiente, mas necessário devido à estrutura de dados obrigatória
    const leadsSnapshot = await db.ref('leads').once('value');
    let leadPath = null;

    leadsSnapshot.forEach(yearSnapshot => {
        yearSnapshot.forEach(monthSnapshot => {
            if (monthSnapshot.hasChild(leadId)) {
                leadPath = `leads/${yearSnapshot.key}/${monthSnapshot.key}/${leadId}`;
            }
        });
    });

    if (!leadPath) {
        messageArea.textContent = 'Erro: Lead não encontrado no banco de dados.';
        return;
    }

    const updatedLeadData = {
        name: form['edit-lead-name'].value,
        phone: form['edit-lead-phone'].value,
        email: form['edit-lead-email'].value,
        city: form['edit-lead-city'].value,
        product: form['edit-lead-product'].value,
        status: form['edit-lead-status'].value,
        observation: form['edit-lead-observation'].value,
        visitDate: form['edit-lead-visit-date'].value || null,
        // Não altera sellerId, sellerName ou timestamp
    };

    try {
        await db.ref(leadPath).update(updatedLeadData);
        messageArea.textContent = 'Lead atualizado com sucesso!';
        loadLeadsList(); // Recarrega a lista
    } catch (error) {
        messageArea.textContent = 'Erro ao atualizar lead: ' + error.message;
    }
});

/**
 * Volta para a lista de leads.
 */
document.getElementById('back-to-list-btn').addEventListener('click', () => {
    showScreen('list-leads-screen');
});

// =================================================================================================
// 6. GRÁFICOS (Chart.js)
// =================================================================================================

let statusChartInstance = null;
let sellerChartInstance = null;
let monthChartInstance = null;

/**
 * Renderiza o gráfico de Leads por Status.
 * @param {object} data - Objeto com status e contagens.
 * @param {string} canvasId - O ID do canvas.
 */
function renderLeadsByStatusChart(data, canvasId) {
    const ctx = document.getElementById(canvasId).getContext('2d');
    const labels = Object.keys(data);
    const counts = Object.values(data);

    // Destrói a instância anterior se existir
    if (canvasId === 'leads-by-status-chart' && statusChartInstance) {
        statusChartInstance.destroy();
    } else if (canvasId === 'seller-leads-by-status-chart' && sellerChartInstance) {
        sellerChartInstance.destroy();
    }

    const newChartInstance = new Chart(ctx, {
        type: 'pie',
        data: {
            labels: labels,
            datasets: [{
                data: counts,
                backgroundColor: [
                    '#367C2B', // Verde
                    '#FFDE00', // Amarelo
                    '#000000', // Preto
                    '#F5F5F5', // Cinza
                    '#D9534F'  // Vermelho (para perdido)
                ],
                hoverOffset: 4
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: 'top',
                },
                title: {
                    display: true,
                    text: 'Leads por Status'
                }
            }
        }
    });

    if (canvasId === 'leads-by-status-chart') {
        statusChartInstance = newChartInstance;
    } else if (canvasId === 'seller-leads-by-status-chart') {
        sellerChartInstance = newChartInstance;
    }
}

/**
 * Renderiza o gráfico de Leads por Vendedor (Supervisor).
 * @param {object} data - Objeto com nomes de vendedores e contagens.
 */
function renderLeadsBySellerChart(data) {
    const ctx = document.getElementById('leads-by-seller-chart').getContext('2d');
    const labels = Object.keys(data);
    const counts = Object.values(data);

    if (sellerChartInstance) {
        sellerChartInstance.destroy();
    }

    sellerChartInstance = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Leads no Mês',
                data: counts,
                backgroundColor: '#367C2B',
                borderColor: '#FFDE00',
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                legend: {
                    display: false
                },
                title: {
                    display: true,
                    text: 'Leads por Vendedor (Mês Atual)'
                }
            }
        }
    });
}

/**
 * Renderiza o gráfico de Comparação Mês a Mês (Supervisor).
 * @param {object} data - Objeto com chaves 'YYYY-M' e contagens.
 */
function renderMonthComparisonChart(data) {
    const sortedKeys = Object.keys(data).sort();
    const labels = sortedKeys.map(key => {
        const [year, month] = key.split('-');
        return `${month}/${year}`;
    });
    const counts = sortedKeys.map(key => data[key]);

    const ctx = document.getElementById('month-comparison-chart').getContext('2d');

    if (monthChartInstance) {
        monthChartInstance.destroy();
    }

    monthChartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels,
            datasets: [{
                label: 'Total de Leads',
                data: counts,
                borderColor: '#FFDE00',
                backgroundColor: 'rgba(54, 124, 43, 0.2)', // Verde com transparência
                tension: 0.1,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            },
            plugins: {
                title: {
                    display: true,
                    text: 'Comparação de Leads Mês a Mês'
                }
            }
        }
    });
}

// =================================================================================================
// 7. EVENT LISTENERS DE NAVEGAÇÃO
// =================================================================================================

document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const screenId = e.target.getAttribute('data-screen');
        if (screenId) {
            showScreen(screenId);
            // Recarrega dados ao navegar para dashboards/listas
            if (screenId === 'supervisor-dashboard-screen') loadSupervisorDashboard();
            if (screenId === 'seller-dashboard-screen') loadSellerDashboard();
            if (screenId === 'list-leads-screen') loadLeadsList({});
        }
    });
});

// =================================================================================================
// 8. INICIALIZAÇÃO
// =================================================================================================

// O onAuthStateChanged cuida da inicialização da tela.
// Para fins de teste inicial, se não houver usuário logado, a tela de login é exibida.
// Se o usuário logar, a tela apropriada será exibida.
// Para simular o primeiro acesso do Supervisor, você precisará criar o usuário
// 'supervisor@funil.com' com a role 'supervisor' no Realtime Database manualmente
// (ou via console do Firebase) e logar com ele.

// Exemplo de estrutura de DB para o Supervisor (users/{uid_supervisor}):
// {
//   "name": "Supervisor Master",
//   "email": "supervisor@funil.com",
//   "role": "supervisor",
//   "isActive": true
// }

