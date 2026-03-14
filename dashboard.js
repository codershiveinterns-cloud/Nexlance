document.addEventListener('DOMContentLoaded', () => {
    const VIP_EMAILS = [
        'vijaypratap@nexlancedigital.com',
        'mehrahinal113@gmail.com'
    ];
    const trialBanner = document.getElementById('trialBanner');
    const trialTitle = document.getElementById('trialTitle');
    const trialMessage = document.getElementById('trialMessage');
    const trialCountdown = document.getElementById('trialCountdown');
    const trialTimerLabel = document.getElementById('trialTimerLabel');
    const upgradeControls = document.getElementById('upgradeControls');
    const upgradePlanBtn = document.getElementById('upgradePlanBtn');
    const plansModal = document.getElementById('plansModal');
    const closePlansModal = document.getElementById('closePlansModal');
    const planLinks = Array.from(document.querySelectorAll('[data-plan-name]'));
    const deleteAccountBtn = document.getElementById('deleteAccountBtn');
    const logoutBtn = document.getElementById('logoutBtn');
    const deleteAccountModal = document.getElementById('deleteAccountModal');
    const closeDeleteAccountModal = document.getElementById('closeDeleteAccountModal');
    const cancelDeleteAccountBtn = document.getElementById('cancelDeleteAccountBtn');
    const confirmDeleteAccountBtn = document.getElementById('confirmDeleteAccountBtn');
    const deleteAccountMessage = document.getElementById('deleteAccountMessage');
    const logoutModal = document.getElementById('logoutModal');
    const closeLogoutModal = document.getElementById('closeLogoutModal');
    const cancelLogoutBtn = document.getElementById('cancelLogoutBtn');
    const confirmLogoutBtn = document.getElementById('confirmLogoutBtn');
    const activityFeed = document.getElementById('activityFeed');
    const alertsSection = document.querySelector('.alerts');

    let projectStatusChartInstance = null;
    let revenueChartInstance = null;

    function normalizeEmail(email) {
        return (email || '').trim().toLowerCase();
    }

    function getCurrentUser() {
        try {
            return JSON.parse(localStorage.getItem('nexlance_user') || 'null');
        } catch (error) {
            return null;
        }
    }

    function getDeletedAccountKey(email) {
        return normalizeEmail(email).replace(/[.#$/\[\]]/g, '_');
    }

    function getLocalUsers() {
        try {
            return JSON.parse(localStorage.getItem('nexlance_users') || '[]');
        } catch (error) {
            return [];
        }
    }

    function saveLocalUsers(users) {
        localStorage.setItem('nexlance_users', JSON.stringify(users));
    }

    function getLocalDeletedAccounts() {
        try {
            return JSON.parse(localStorage.getItem('nexlance_deleted_accounts') || '{}');
        } catch (error) {
            return {};
        }
    }

    function saveLocalDeletedAccounts(records) {
        localStorage.setItem('nexlance_deleted_accounts', JSON.stringify(records));
    }

    function buildActiveRecord() {
        return {
            status: 'active',
            label: 'Full access to the website',
            permanent: true,
            startedAt: new Date().toISOString()
        };
    }

    function getStoredTrial() {
        try {
            return JSON.parse(localStorage.getItem('nexlance_trial') || 'null');
        } catch (error) {
            return null;
        }
    }

    function setStoredTrial(trial) {
        localStorage.setItem('nexlance_trial', JSON.stringify(trial));
    }

    function formatRemaining(ms) {
        const totalMinutes = Math.max(0, Math.floor(ms / 60000));
        const days = Math.floor(totalMinutes / 1440);
        const hours = Math.floor((totalMinutes % 1440) / 60);
        const minutes = totalMinutes % 60;
        return `${days}d ${String(hours).padStart(2, '0')}h ${String(minutes).padStart(2, '0')}m`;
    }

    function renderTrialState() {
        if (!trialBanner || !trialCountdown || !trialTimerLabel) return;
        const currentPlan = typeof getCurrentPlanRecord === 'function' ? getCurrentPlanRecord() : { code: 'individual', name: 'Individual' };

        trialBanner.style.display = 'flex';

        if (currentPlan.code === 'business') {
            trialBanner.classList.remove('expired');
            trialBanner.classList.add('active');
            trialTitle.textContent = 'Business plan is active';
            trialMessage.textContent = 'You can access the complete dashboard except the admin panel.';
            trialTimerLabel.textContent = 'Plan';
            trialCountdown.textContent = 'Business';
            if (upgradeControls) upgradeControls.hidden = true;
            return;
        }

        trialBanner.classList.remove('active');
        trialBanner.classList.add('expired');
        trialTitle.textContent = 'Individual plan is active';
        trialMessage.textContent = 'This free plan can access Projects and Support Info only. Upgrade to Business for the full dashboard.';
        trialTimerLabel.textContent = 'Plan';
        trialCountdown.textContent = 'Individual';
        if (upgradeControls) upgradeControls.hidden = false;
    }

    async function activatePaidPlan(planName) {
        const currentUser = getCurrentUser();
        const email = normalizeEmail(currentUser && currentUser.email);
        if (!email) return;

        const upgradedAt = new Date().toISOString();

        if (typeof activateBusinessPlanAccess === 'function') {
            activateBusinessPlanAccess();
        }

        if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser && db) {
            await db.collection('users').doc(firebase.auth().currentUser.uid).set({
                planStatus: 'active',
                fullAccess: true,
                currentPlan: planName,
                planCode: 'business',
                planPaid: true,
                upgradedAt
            }, { merge: true });
        } else {
            const users = getLocalUsers();
            const userIndex = users.findIndex(user => normalizeEmail(user.email) === email);
            if (userIndex > -1) {
                users[userIndex] = {
                    ...users[userIndex],
                    planStatus: 'active',
                    fullAccess: true,
                    currentPlan: planName,
                    planCode: 'business',
                    planPaid: true,
                    upgradedAt
                };
                saveLocalUsers(users);
            }
        }

        setStoredTrial({ ...buildActiveRecord(), planName });
        closeModal();
        renderTrialState();
        await refreshDashboardData();
        if (typeof showToast === 'function') {
            showToast(`${planName} plan activated. Full dashboard access unlocked.`, 'success');
        }
    }

    function openPlansModal() {
        if (!plansModal) return;
        plansModal.classList.add('open');
        plansModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    function closeModal() {
        if (!plansModal) return;
        plansModal.classList.remove('open');
        plansModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }

    function setText(id, value) {
        const element = document.getElementById(id);
        if (element) element.textContent = value;
    }

    function renderRevenueChart(invoices) {
        const revenueChart = document.getElementById('revenueChart');
        if (!revenueChart || typeof Chart === 'undefined') return;

        const monthLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        const monthlyTotals = new Array(12).fill(0);

        invoices
            .filter(invoice => invoice.status === 'paid' && invoice.paid_date)
            .forEach(invoice => {
                const paidDate = new Date(invoice.paid_date);
                if (!Number.isNaN(paidDate.getTime())) {
                    monthlyTotals[paidDate.getMonth()] += Number(invoice.total_amount || 0);
                }
            });

        if (revenueChartInstance) revenueChartInstance.destroy();
        revenueChartInstance = new Chart(revenueChart.getContext('2d'), {
            type: 'line',
            data: {
                labels: monthLabels,
                datasets: [{
                    label: 'Revenue (EUR)',
                    data: monthlyTotals,
                    borderColor: '#6c5ce7',
                    backgroundColor: 'rgba(108,92,231,0.1)',
                    fill: true,
                    tension: 0.35
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { display: false }
                }
            }
        });
    }

    function renderProjectStatusChart(projects) {
        const projectStatusChart = document.getElementById('projectStatusChart');
        if (!projectStatusChart || typeof Chart === 'undefined') return;

        const labels = ['Planning', 'Design', 'Development', 'Testing', 'Live', 'On Hold'];
        const counts = labels.map(label => projects.filter(project => project.status === label).length);

        if (projectStatusChartInstance) projectStatusChartInstance.destroy();
        projectStatusChartInstance = new Chart(projectStatusChart.getContext('2d'), {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data: counts,
                    backgroundColor: ['#a29bfe', '#6c5ce7', '#4b3fbf', '#b2bec3', '#00b894', '#fab1a0']
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'bottom' }
                }
            }
        });
    }

    function renderActivity(clients, projects, invoices) {
        if (!activityFeed) return;

        if (isUpgradeRequiredForData()) {
            activityFeed.innerHTML = `<li>${getUpgradeRequiredMessage()}</li>`;
            return;
        }

        const items = [];
        const recentPaid = invoices
            .filter(invoice => invoice.status === 'paid')
            .sort((a, b) => new Date(b.paid_date || b.updated_at || 0) - new Date(a.paid_date || a.updated_at || 0))
            .slice(0, 2);
        recentPaid.forEach(invoice => items.push(`Payment received from ${invoice.client_name || 'a client'} for ${formatCurrency(invoice.total_amount || 0)}`));

        projects
            .filter(project => project.status === 'Live')
            .slice(0, 2)
            .forEach(project => items.push(`${project.name} is marked live`));

        clients
            .slice(0, 2)
            .forEach(client => items.push(`${client.name} is in your client list`));

        activityFeed.innerHTML = (items.length ? items : ['No recent real activity yet.']).map(item => `<li>${item}</li>`).join('');
    }

    function renderAlerts(clients, projects, invoices) {
        if (!alertsSection) return;

        if (isUpgradeRequiredForData()) {
            alertsSection.innerHTML = `<h3>Urgent Alerts</h3><div class="alert danger">${getUpgradeRequiredMessage()}</div>`;
            return;
        }

        const alerts = [];
        const delayedProjects = projects.filter(project => {
            if (!project.deadline || project.status === 'Live') return false;
            return new Date(project.deadline) < new Date();
        });
        if (delayedProjects.length) {
            alerts.push(`<div class="alert danger">${delayedProjects.length} project${delayedProjects.length > 1 ? 's are' : ' is'} past deadline</div>`);
        }

        const expiringHosts = clients.filter(client => {
            if (!client.hosting_expiry) return false;
            const days = (new Date(client.hosting_expiry) - new Date()) / 86400000;
            return days >= 0 && days <= 30;
        });
        if (expiringHosts.length) {
            alerts.push(`<div class="alert warning">${expiringHosts.length} hosting renewal${expiringHosts.length > 1 ? 's are' : ' is'} due within 30 days</div>`);
        }

        const outstanding = invoices.filter(invoice => ['pending', 'overdue'].includes(invoice.status));
        if (outstanding.length) {
            alerts.push(`<div class="alert danger">${outstanding.length} unpaid invoice${outstanding.length > 1 ? 's' : ''} need follow-up</div>`);
        }

        alertsSection.innerHTML = `<h3>Urgent Alerts</h3>${alerts.join('') || '<div class="alert warning">No urgent real-data alerts right now.</div>'}`;
    }

    async function refreshDashboardData() {
        try {
            const [clients, projects, invoices] = await Promise.all([
                fetchClients(),
                fetchProjects(),
                fetchInvoices()
            ]);

            const paidInvoices = invoices.filter(invoice => invoice.status === 'paid');
            const pendingInvoices = invoices.filter(invoice => ['pending', 'overdue'].includes(invoice.status));
            const activeProjects = projects.filter(project => !['Live', 'On Hold'].includes(project.status));
            const planningProjects = projects.filter(project => project.status === 'Planning');
            const overdueProjects = projects.filter(project => {
                if (!project.deadline || project.status === 'Live') return false;
                return new Date(project.deadline) < new Date();
            });

            setText('dRevenue', formatCurrency(paidInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)));
            setText('dProjects', String(activeProjects.length));
            setText('dApprovals', String(planningProjects.length));
            setText('dOverdue', String(overdueProjects.length));
            setText('dPending', formatCurrency(pendingInvoices.reduce((sum, invoice) => sum + Number(invoice.total_amount || 0), 0)));

            renderProjectStatusChart(projects);
            renderRevenueChart(invoices);
            renderActivity(clients, projects, invoices);
            renderAlerts(clients, projects, invoices);
        } catch (error) {
            console.error('Dashboard refresh failed:', error);
        }
    }

    if (upgradePlanBtn) {
        upgradePlanBtn.addEventListener('click', openPlansModal);
    }

    if (closePlansModal) {
        closePlansModal.addEventListener('click', closeModal);
    }

    if (plansModal) {
        plansModal.addEventListener('click', event => {
            if (event.target === plansModal) closeModal();
        });
    }

    planLinks.forEach(link => {
        link.addEventListener('click', async event => {
            event.preventDefault();
            const planName = link.getAttribute('data-plan-name');
            if (!planName) return;
            try {
                await activatePaidPlan(planName);
            } catch (error) {
                console.error('Plan activation failed:', error);
            }
        });
    });

    function openDeleteAccountModal() {
        if (!deleteAccountModal) return;
        deleteAccountModal.classList.add('open');
        deleteAccountModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
        if (deleteAccountMessage) {
            deleteAccountMessage.textContent = '';
            deleteAccountMessage.className = 'form-message';
        }
    }

    function closeDeleteModal() {
        if (!deleteAccountModal) return;
        deleteAccountModal.classList.remove('open');
        deleteAccountModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }

    function openLogoutModal() {
        if (!logoutModal) return;
        logoutModal.classList.add('open');
        logoutModal.setAttribute('aria-hidden', 'false');
        document.body.classList.add('modal-open');
    }

    function closeLogoutModalDialog() {
        if (!logoutModal) return;
        logoutModal.classList.remove('open');
        logoutModal.setAttribute('aria-hidden', 'true');
        document.body.classList.remove('modal-open');
    }

    async function logoutCurrentUser() {
        if (confirmLogoutBtn) {
            confirmLogoutBtn.disabled = true;
            confirmLogoutBtn.textContent = 'Logging out...';
        }

        try {
            if (typeof firebase !== 'undefined' && firebase.auth) {
                await firebase.auth().signOut();
            }
        } catch (error) {
            console.error('Logout error:', error);
        } finally {
            localStorage.removeItem('nexlance_auth');
            localStorage.removeItem('nexlance_user');
            localStorage.removeItem('nexlance_trial');
            window.location.href = 'index.html';
        }
    }

    async function deleteCurrentAccount() {
        const currentUser = getCurrentUser();
        const email = normalizeEmail(currentUser && currentUser.email);

        if (!email) {
            if (deleteAccountMessage) {
                deleteAccountMessage.textContent = 'No signed-in account found.';
                deleteAccountMessage.className = 'form-message error';
            }
            return;
        }

        if (confirmDeleteAccountBtn) {
            confirmDeleteAccountBtn.disabled = true;
            confirmDeleteAccountBtn.textContent = 'Deleting...';
        }

        try {
            const deletedRecord = {
                email,
                deletedAt: new Date().toISOString(),
                trialUsed: true
            };

            if (typeof firebase !== 'undefined' && firebase.auth && firebase.auth().currentUser) {
                const authUser = firebase.auth().currentUser;
                await db.collection('deleted_accounts').doc(getDeletedAccountKey(email)).set(deletedRecord);
                await db.collection('users').doc(authUser.uid).delete();
                await authUser.delete();
            } else {
                const users = getLocalUsers().filter(user => normalizeEmail(user.email) !== email);
                saveLocalUsers(users);
                const deletedAccounts = getLocalDeletedAccounts();
                deletedAccounts[email] = deletedRecord;
                saveLocalDeletedAccounts(deletedAccounts);
            }

            localStorage.removeItem('nexlance_auth');
            localStorage.removeItem('nexlance_user');
            localStorage.removeItem('nexlance_trial');
            window.location.href = 'login.html';
        } catch (error) {
            if (deleteAccountMessage) {
                deleteAccountMessage.textContent = error.code === 'auth/requires-recent-login'
                    ? 'Please log in again, then delete the account.'
                    : 'Could not delete the account. Please try again.';
                deleteAccountMessage.className = 'form-message error';
            }
            if (confirmDeleteAccountBtn) {
                confirmDeleteAccountBtn.disabled = false;
                confirmDeleteAccountBtn.textContent = 'Yes, delete account';
            }
        }
    }

    if (deleteAccountBtn) deleteAccountBtn.addEventListener('click', openDeleteAccountModal);
    if (logoutBtn) logoutBtn.addEventListener('click', openLogoutModal);
    if (closeDeleteAccountModal) closeDeleteAccountModal.addEventListener('click', closeDeleteModal);
    if (cancelDeleteAccountBtn) cancelDeleteAccountBtn.addEventListener('click', closeDeleteModal);
    if (confirmDeleteAccountBtn) confirmDeleteAccountBtn.addEventListener('click', deleteCurrentAccount);
    if (closeLogoutModal) closeLogoutModal.addEventListener('click', closeLogoutModalDialog);
    if (cancelLogoutBtn) cancelLogoutBtn.addEventListener('click', closeLogoutModalDialog);
    if (confirmLogoutBtn) confirmLogoutBtn.addEventListener('click', logoutCurrentUser);

    if (deleteAccountModal) {
        deleteAccountModal.addEventListener('click', event => {
            if (event.target === deleteAccountModal) closeDeleteModal();
        });
    }

    if (logoutModal) {
        logoutModal.addEventListener('click', event => {
            if (event.target === logoutModal) closeLogoutModalDialog();
        });
    }

    document.addEventListener('keydown', event => {
        if (event.key === 'Escape' && plansModal && plansModal.classList.contains('open')) closeModal();
        if (event.key === 'Escape' && deleteAccountModal && deleteAccountModal.classList.contains('open')) closeDeleteModal();
        if (event.key === 'Escape' && logoutModal && logoutModal.classList.contains('open')) closeLogoutModalDialog();
    });

    const currentUser = getCurrentUser();
    if (VIP_EMAILS.includes(normalizeEmail(currentUser && currentUser.email))) {
        setStoredTrial(buildActiveRecord());
    }

    renderTrialState();
    refreshDashboardData();

    window.setInterval(renderTrialState, 60000);
    window.addEventListener('focus', refreshDashboardData);
    window.addEventListener('nexlance-data-changed', refreshDashboardData);
    window.addEventListener('nexlance-project-updated', refreshDashboardData);
    window.addEventListener('nexlance-project-completed', refreshDashboardData);
    document.addEventListener('visibilitychange', () => {
        if (!document.hidden) refreshDashboardData();
    });
});
