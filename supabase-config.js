/* ============================================================
   FIREBASE CONFIG - Nexlance Agency Platform
   ============================================================ */

const firebaseConfig = {
    apiKey: "AIzaSyCv56CN--eQLTCxomNItL2FgLRoIbdsdoM",
    authDomain: "nexlance-df59e.firebaseapp.com",
    projectId: "nexlance-df59e",
    storageBucket: "nexlance-df59e.firebasestorage.app",
    messagingSenderId: "480679982312",
    appId: "1:480679982312:web:2eb0d840f03c81db49055d",
    measurementId: "G-0XG3807L8Q"
};

let auth = null;
let db = null;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db = firebase.firestore();
    }
} catch (e) {
    console.log('Firebase init failed, using sample data:', e.message);
}

const isFirebaseConfigured = db !== null && !firebaseConfig.apiKey.includes('YOUR_');
const isSupabaseConfigured = isFirebaseConfigured;
const PRIVILEGED_EMAILS = [
    'vijaypratap@nexlancedigital.com',
    'mehrahinal113@gmail.com'
];
const EMAILJS_CONFIG = {
    publicKey: '5UAtxwDsYDz1wJJBL',
    serviceId: 'service_9f3cook',
    templateId: 'template_69wbe5g',
    fromName: 'Nexlance',
    otpExpiryMinutes: 10
};

function _snap(querySnap) {
    return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

function normalizeEmail(email) {
    return (email || '').trim().toLowerCase().replace(/\s/g, '');
}

function isPrivilegedEmail(email) {
    return PRIVILEGED_EMAILS.includes(normalizeEmail(email));
}

function getCurrentSessionUser() {
    try {
        return JSON.parse(localStorage.getItem('nexlance_user') || 'null');
    } catch (error) {
        return null;
    }
}

function getStoredTrialRecord() {
    try {
        return JSON.parse(localStorage.getItem('nexlance_trial') || 'null');
    } catch (error) {
        return null;
    }
}

function buildIndividualPlanRecord() {
    return {
        code: 'individual',
        name: 'Individual',
        paid: false,
        price: 0,
        currency: 'EUR',
        startedAt: new Date().toISOString()
    };
}

function buildBusinessPlanRecord() {
    return {
        code: 'business',
        name: 'Business',
        paid: true,
        price: 26,
        currency: 'EUR',
        startedAt: new Date().toISOString()
    };
}

function getStoredPlanRecord() {
    try {
        return JSON.parse(localStorage.getItem('nexlance_plan') || 'null');
    } catch (error) {
        return null;
    }
}

function persistPlanRecord(planRecord) {
    localStorage.setItem('nexlance_plan', JSON.stringify(planRecord));
}

function getCurrentPlanRecord() {
    if (isPrivilegedEmail(getCurrentOwnerKey())) {
        return buildBusinessPlanRecord();
    }
    return getStoredPlanRecord() || buildIndividualPlanRecord();
}

function hasBusinessPlanAccess() {
    const plan = getCurrentPlanRecord();
    return plan.code === 'business' && plan.paid === true;
}

function isIndividualPlanActive() {
    return !hasBusinessPlanAccess();
}

function getCurrentPageName() {
    return window.location.pathname.split('/').pop() || 'index.html';
}

function isFreePlanPageAllowed(pageName = getCurrentPageName()) {
    return ['projects.html', 'project-detail.html', 'developer-info.html'].includes(pageName);
}

function syncPlanRecordToUserStore(planRecord) {
    const currentUser = getCurrentSessionUser();
    const email = normalizeEmail(currentUser && currentUser.email);
    if (!email) return;

    try {
        const users = JSON.parse(localStorage.getItem('nexlance_users') || '[]');
        const userIndex = users.findIndex(user => normalizeEmail(user.email) === email);
        if (userIndex > -1) {
            users[userIndex] = {
                ...users[userIndex],
                currentPlan: planRecord.name,
                planCode: planRecord.code,
                planPaid: planRecord.paid
            };
            localStorage.setItem('nexlance_users', JSON.stringify(users));
        }
    } catch (error) {
        console.error('Could not sync plan to local users:', error);
    }
}

function activateBusinessPlanAccess() {
    const planRecord = buildBusinessPlanRecord();
    persistPlanRecord(planRecord);
    syncPlanRecordToUserStore(planRecord);
    localStorage.setItem('nexlance_trial', JSON.stringify({
        status: 'active',
        label: 'Business plan access',
        permanent: true,
        planName: 'Business',
        startedAt: new Date().toISOString()
    }));
    return planRecord;
}

function activateIndividualPlanAccess() {
    const planRecord = buildIndividualPlanRecord();
    persistPlanRecord(planRecord);
    syncPlanRecordToUserStore(planRecord);
    localStorage.setItem('nexlance_trial', JSON.stringify({
        status: 'free',
        label: 'Individual plan access',
        planName: 'Individual',
        startedAt: new Date().toISOString()
    }));
    return planRecord;
}

function getCurrentOwnerKey() {
    const user = getCurrentSessionUser();
    return normalizeEmail(user && user.email);
}

function isAdminUser() {
    return isPrivilegedEmail(getCurrentOwnerKey());
}

function syncAdminUiVisibility() {
    const isAdmin = isAdminUser() && hasBusinessPlanAccess();
    document.querySelectorAll('a[href="admin.html"]').forEach(link => {
        const profile = link.closest('.profile');
        const navItem = link.closest('li');
        if (isAdmin) {
            if (profile) profile.style.display = '';
            if (navItem) navItem.style.display = '';
            link.style.display = '';
            return;
        }
        if (profile) {
            profile.style.display = 'none';
        } else if (navItem) {
            navItem.style.display = 'none';
        } else {
            link.style.display = 'none';
        }
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncAdminUiVisibility);
} else {
    syncAdminUiVisibility();
}

function isPaidPlanActive() {
    return hasBusinessPlanAccess();
}

function isTrialStillActive() {
    return isIndividualPlanActive();
}

function isUpgradeRequiredForData() {
    return !hasBusinessPlanAccess() && !isFreePlanPageAllowed();
}

function canAccessAccountData() {
    return true;
}

function shouldShowDemoData() {
    return false;
}

function getUpgradeRequiredMessage() {
    return 'Upgrade to the Business plan to unlock this part of the dashboard.';
}

function canAccessEntity(entity) {
    if (hasBusinessPlanAccess()) return true;
    return ['projects', 'tasks'].includes(entity);
}

function syncPlanUiVisibility() {
    const businessAccess = hasBusinessPlanAccess();
    const allowedLinks = businessAccess
        ? ['dashboard.html', 'clients.html', 'team.html', 'projects.html', 'invoices.html', 'services.html', 'access-roles.html', 'developer-info.html']
        : ['projects.html', 'developer-info.html'];

    document.querySelectorAll('.sidebar a[href]').forEach(link => {
        const href = link.getAttribute('href');
        if (href === 'admin.html') return;
        link.parentElement.style.display = allowedLinks.includes(href) ? '' : 'none';
    });
}

function enforcePlanPageAccess() {
    const pageName = getCurrentPageName();
    if (pageName === 'admin.html' && !isAdminUser()) {
        window.location.href = hasBusinessPlanAccess() ? 'dashboard.html' : 'projects.html';
        return;
    }
    if (hasBusinessPlanAccess()) return;
    if (!isFreePlanPageAllowed(pageName) && pageName.endsWith('.html') && ['dashboard.html', 'clients.html', 'team.html', 'invoices.html', 'invoice-create.html', 'services.html', 'access-roles.html', 'reports.html', 'client-detail.html'].includes(pageName)) {
        window.location.href = 'projects.html';
    }
}

function getEntityStorageKey(entity) {
    return `nexlance_${entity}_${getCurrentOwnerKey() || 'guest'}`;
}

function getLocalEntityData(entity) {
    try {
        return JSON.parse(localStorage.getItem(getEntityStorageKey(entity)) || '[]');
    } catch (error) {
        return [];
    }
}

function setLocalEntityData(entity, records) {
    localStorage.setItem(getEntityStorageKey(entity), JSON.stringify(records));
    window.dispatchEvent(new CustomEvent('nexlance-data-changed', { detail: { entity } }));
}

function cloneDemoRecords(records, prefix) {
    return records.map((record, index) => ({
        ...record,
        id: `${prefix}-${index + 1}`,
        is_demo: true
    }));
}

function withOwnerFields(data) {
    const ownerKey = getCurrentOwnerKey();
    return {
        ...data,
        owner_key: ownerKey,
        owner_email: ownerKey,
        updated_at: new Date().toISOString()
    };
}

function createAccessFilteredDataset(entity, demoRecords) {
    if (!canAccessAccountData()) {
        return [];
    }
    const realRecords = getLocalEntityData(entity);
    if (shouldShowDemoData()) {
        return [...realRecords, ...cloneDemoRecords(demoRecords, `demo-${entity}`)];
    }
    return realRecords;
}

async function fetchClients() {
    if (!canAccessEntity('clients')) return [];
    if (!isFirebaseConfigured) return createAccessFilteredDataset('clients', sampleClients);
    try {
        const ownerKey = getCurrentOwnerKey();
        if (!ownerKey) return [];
        const snap = await db.collection('clients').where('owner_key', '==', ownerKey).get();
        return _snap(snap).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch (e) { console.error(e); return getLocalEntityData('clients'); }
}

async function addClient(d) {
    const doc = { ...withOwnerFields(d), created_at: new Date().toISOString() };
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('clients');
        const r = { ...doc, id: 'c' + Date.now() };
        records.unshift(r);
        setLocalEntityData('clients', records);
        return r;
    }
    const ref = await db.collection('clients').add(doc);
    return { id: ref.id, ...doc };
}

async function updateClient(id, d) {
    const doc = withOwnerFields(d);
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('clients');
        const i = records.findIndex(c => c.id === id);
        if (i > -1) {
            records[i] = { ...records[i], ...doc };
            setLocalEntityData('clients', records);
            return records[i];
        }
        return null;
    }
    await db.collection('clients').doc(id).update(doc);
    return { id, ...doc };
}

async function deleteClient(id) {
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('clients').filter(c => c.id !== id);
        setLocalEntityData('clients', records);
        return;
    }
    await db.collection('clients').doc(id).delete();
}

async function fetchProjects(clientId = null) {
    if (!canAccessEntity('projects')) return [];
    
    // Fetch template-created projects from localStorage
    let templateProjects = [];
    try {
        templateProjects = JSON.parse(localStorage.getItem('nexlance_projects') || '[]');
    } catch (e) {
        templateProjects = [];
    }
    
    if (!isFirebaseConfigured) {
        const records = createAccessFilteredDataset('projects', sampleProjects);
        const combined = [...records, ...templateProjects];
        return clientId ? combined.filter(p => p.client_id === clientId) : combined;
    }
    try {
        const ownerKey = getCurrentOwnerKey();
        if (!ownerKey) {
            // If no owner key, just return template projects
            return clientId ? templateProjects.filter(p => p.client_id === clientId) : templateProjects;
        }
        let q = db.collection('projects').where('owner_key', '==', ownerKey);
        if (clientId) q = q.where('client_id', '==', clientId);
        const snap = await q.get();
        const firebaseProjects = _snap(snap).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
        // Merge Firebase projects with template projects
        const combined = [...firebaseProjects, ...templateProjects.filter(tp => !firebaseProjects.find(fp => fp.id === tp.id))];
        return combined.sort((a, b) => new Date(b.created_at || b.completedAt || 0) - new Date(a.created_at || a.completedAt || 0));
    } catch (e) {
        console.error(e);
        const records = getLocalEntityData('projects');
        const combined = [...records, ...templateProjects.filter(tp => !records.find(r => r.id === tp.id))];
        return clientId ? combined.filter(p => p.client_id === clientId) : combined;
    }
}

async function addProject(d) {
    const doc = { ...withOwnerFields(d), created_at: new Date().toISOString() };
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('projects');
        const r = { ...doc, id: 'p' + Date.now() };
        records.unshift(r);
        setLocalEntityData('projects', records);
        return r;
    }
    const ref = await db.collection('projects').add(doc);
    return { id: ref.id, ...doc };
}

async function updateProject(id, d) {
    const doc = withOwnerFields(d);
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('projects');
        const i = records.findIndex(p => p.id === id);
        if (i > -1) {
            records[i] = { ...records[i], ...doc };
            setLocalEntityData('projects', records);
            return records[i];
        }
        return null;
    }
    await db.collection('projects').doc(id).update(doc);
    return { id, ...doc };
}

async function deleteProject(id) {
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('projects').filter(p => p.id !== id);
        setLocalEntityData('projects', records);
        return;
    }
    await db.collection('projects').doc(id).delete();
}

async function fetchTasks(projectId) {
    if (!canAccessEntity('tasks')) return [];
    if (!isFirebaseConfigured) {
        return createAccessFilteredDataset('tasks', sampleTasks).filter(t => t.project_id === projectId);
    }
    try {
        const ownerKey = getCurrentOwnerKey();
        if (!ownerKey) return [];
        const snap = await db.collection('tasks')
            .where('owner_key', '==', ownerKey)
            .where('project_id', '==', projectId)
            .get();
        return _snap(snap).sort((a, b) => new Date(a.created_at || 0) - new Date(b.created_at || 0));
    } catch (e) { console.error(e); return []; }
}

async function addTask(d) {
    const doc = { ...withOwnerFields(d), created_at: new Date().toISOString() };
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('tasks');
        const r = { ...doc, id: 't' + Date.now() };
        records.push(r);
        setLocalEntityData('tasks', records);
        return r;
    }
    const ref = await db.collection('tasks').add(doc);
    return { id: ref.id, ...doc };
}

async function updateTask(id, d) {
    const doc = withOwnerFields(d);
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('tasks');
        const i = records.findIndex(t => t.id === id);
        if (i > -1) {
            records[i] = { ...records[i], ...doc };
            setLocalEntityData('tasks', records);
            return records[i];
        }
        return null;
    }
    await db.collection('tasks').doc(id).update(doc);
    return { id, ...doc };
}

async function deleteTask(id) {
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('tasks').filter(t => t.id !== id);
        setLocalEntityData('tasks', records);
        return;
    }
    await db.collection('tasks').doc(id).delete();
}

async function fetchInvoices() {
    if (!canAccessEntity('invoices')) return [];
    if (!isFirebaseConfigured) return createAccessFilteredDataset('invoices', sampleInvoices);
    try {
        const ownerKey = getCurrentOwnerKey();
        if (!ownerKey) return [];
        const snap = await db.collection('invoices').where('owner_key', '==', ownerKey).get();
        return _snap(snap).sort((a, b) => new Date(b.created_at || 0) - new Date(a.created_at || 0));
    } catch (e) { console.error(e); return getLocalEntityData('invoices'); }
}

async function addInvoice(d) {
    const doc = { ...withOwnerFields(d), created_at: new Date().toISOString() };
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('invoices');
        const r = { ...doc, id: 'i' + Date.now() };
        records.unshift(r);
        setLocalEntityData('invoices', records);
        return r;
    }
    const ref = await db.collection('invoices').add(doc);
    return { id: ref.id, ...doc };
}

async function updateInvoiceStatus(id, status, paidDate = null) {
    const upd = withOwnerFields({ status, ...(paidDate ? { paid_date: paidDate } : {}) });
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('invoices');
        const i = records.findIndex(inv => inv.id === id);
        if (i > -1) {
            records[i] = { ...records[i], ...upd };
            setLocalEntityData('invoices', records);
        }
        return;
    }
    await db.collection('invoices').doc(id).update(upd);
}

async function deleteInvoice(id) {
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('invoices').filter(inv => inv.id !== id);
        setLocalEntityData('invoices', records);
        return;
    }
    await db.collection('invoices').doc(id).delete();
}

async function fetchServices() {
    if (!canAccessEntity('services')) return [];
    if (!isFirebaseConfigured) return createAccessFilteredDataset('services', sampleServices);
    try {
        const ownerKey = getCurrentOwnerKey();
        if (!ownerKey) return [];
        const snap = await db.collection('services').where('owner_key', '==', ownerKey).get();
        return _snap(snap);
    } catch (e) { console.error(e); return getLocalEntityData('services'); }
}

async function addService(d) {
    const doc = { ...withOwnerFields(d), created_at: new Date().toISOString() };
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('services');
        const r = { ...doc, id: 's' + Date.now() };
        records.push(r);
        setLocalEntityData('services', records);
        return r;
    }
    const ref = await db.collection('services').add(doc);
    return { id: ref.id, ...doc };
}

async function updateService(id, d) {
    const doc = withOwnerFields(d);
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('services');
        const i = records.findIndex(s => s.id === id);
        if (i > -1) {
            records[i] = { ...records[i], ...doc };
            setLocalEntityData('services', records);
            return records[i];
        }
        return null;
    }
    await db.collection('services').doc(id).update(doc);
    return { id, ...doc };
}

async function deleteService(id) {
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('services').filter(s => s.id !== id);
        setLocalEntityData('services', records);
        return;
    }
    await db.collection('services').doc(id).delete();
}

async function fetchTeamMembers() {
    if (!canAccessEntity('team')) return [];
    if (!isFirebaseConfigured) return createAccessFilteredDataset('team_members', sampleTeamMembers);
    try {
        const ownerKey = getCurrentOwnerKey();
        if (!ownerKey) return [];
        const snap = await db.collection('team_members').where('owner_key', '==', ownerKey).get();
        return _snap(snap);
    } catch (e) { console.error(e); return getLocalEntityData('team_members'); }
}

async function addTeamMember(d) {
    const doc = { ...withOwnerFields(d), created_at: new Date().toISOString() };
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('team_members');
        const r = { ...doc, id: 'm' + Date.now() };
        records.push(r);
        setLocalEntityData('team_members', records);
        return r;
    }
    const ref = await db.collection('team_members').add(doc);
    return { id: ref.id, ...doc };
}

async function updateTeamMember(id, d) {
    const doc = withOwnerFields(d);
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('team_members');
        const i = records.findIndex(m => m.id === id);
        if (i > -1) {
            records[i] = { ...records[i], ...doc };
            setLocalEntityData('team_members', records);
            return records[i];
        }
        return null;
    }
    await db.collection('team_members').doc(id).update(doc);
    return { id, ...doc };
}

async function deleteTeamMember(id) {
    if (!isFirebaseConfigured) {
        const records = getLocalEntityData('team_members').filter(m => m.id !== id);
        setLocalEntityData('team_members', records);
        return;
    }
    await db.collection('team_members').doc(id).delete();
}

async function logActivity(description, userName = 'Admin') {
    if (!isFirebaseConfigured) return;
    await db.collection('activity_log').add({
        description,
        user_name: userName,
        created_at: new Date().toISOString()
    });
}

const EURO_SYMBOL = '€';
const INR_TO_EUR_RATE = 1 / 90;

function formatCurrency(n) {
    return new Intl.NumberFormat('en-IE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(Number(n) || 0);
}

function convertInrToEur(value) {
    return Math.round((Number(value) || 0) * INR_TO_EUR_RATE);
}

function migrateLocalCurrencyToEuro() {
    const migrationKey = 'nexlance_currency_migrated_to_eur_v1';
    if (localStorage.getItem(migrationKey) === '1') return;

    const migrations = [
        {
            key: 'clients',
            fields: ['total_contract_value', 'paid_amount']
        },
        {
            key: 'invoices',
            fields: ['amount', 'total_amount']
        },
        {
            key: 'services',
            fields: ['pricing', 'revenue_generated']
        }
    ];

    migrations.forEach(({ key, fields }) => {
        const storageKey = getEntityStorageKey(key);
        try {
            const records = JSON.parse(localStorage.getItem(storageKey) || '[]');
            if (!Array.isArray(records) || !records.length) return;

            const migrated = records.map(record => {
                const updatedRecord = { ...record };
                fields.forEach(field => {
                    if (updatedRecord[field] !== undefined && updatedRecord[field] !== null) {
                        updatedRecord[field] = convertInrToEur(updatedRecord[field]);
                    }
                });
                return updatedRecord;
            });

            localStorage.setItem(storageKey, JSON.stringify(migrated));
        } catch (error) {
            console.error(`Currency migration failed for ${key}:`, error);
        }
    });

    localStorage.setItem(migrationKey, '1');
}
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }

function isValidDate(str) {
    if (!str || typeof str !== 'string') return false;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
    const d = new Date(str);
    if (isNaN(d.getTime())) return false;
    return d.toISOString().slice(0, 10) === str;
}

function isDateAfter(strA, strB) {
    if (!isValidDate(strA) || !isValidDate(strB)) return false;
    return new Date(strB) > new Date(strA);
}

function isDateSameOrAfter(strA, strB) {
    if (!isValidDate(strA) || !isValidDate(strB)) return false;
    return new Date(strB) >= new Date(strA);
}

function todayISO() {
    return new Date().toISOString().slice(0, 10);
}

function markDateError(inputId, msg) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.style.borderColor = '#d63031';
    el.style.boxShadow = '0 0 0 3px rgba(214,48,49,0.12)';
    el.title = msg;
}

function clearDateError(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.style.borderColor = '';
    el.style.boxShadow = '';
    el.title = '';
}

function attachDateValidation(inputId, { required = false, minToday = false, label = 'Date' } = {}) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.addEventListener('change', function () {
        const v = this.value;
        if (!v && required) { markDateError(inputId, label + ' is required'); return; }
        if (v && !isValidDate(v)) { markDateError(inputId, label + ': invalid date'); return; }
        if (v && minToday && v < todayISO()) { markDateError(inputId, label + ' must be today or a future date'); return; }
        clearDateError(inputId);
    });
}

function showToast(msg, type = 'info') {
    let container = document.querySelector('.toast-container');
    if (!container) { container = document.createElement('div'); container.className = 'toast-container'; document.body.appendChild(container); }
    const t = document.createElement('div');
    const icons = { success: '✅', error: '❌', info: 'ℹ️' };
    t.className = `toast toast-${type}`;
    t.innerHTML = `${icons[type] || 'ℹ️'} ${msg}`;
    container.appendChild(t);
    setTimeout(() => { t.style.animation = 'toastIn 0.3s ease reverse'; setTimeout(() => t.remove(), 300); }, 3200);
}

const sampleClients = [
    { id: '1', name: 'Rahul Sharma', email: 'rahul@techvision.in', phone: '+91 98765 43210', company: 'TechVision Pvt Ltd', domain_name: 'techvision.in', hosting_provider: 'Hostinger', project_type: 'Business Website', platform: 'WordPress', hosting_expiry: '2025-08-15', ssl_expiry: '2025-08-15', maintenance_plan: 'Monthly', total_contract_value: 500, paid_amount: 389, plan_type: 'Premium' },
    { id: '2', name: 'Priya Mehta', email: 'priya@shopkart.in', phone: '+91 87654 32109', company: 'ShopKart India', domain_name: 'shopkart.in', hosting_provider: 'AWS', project_type: 'Ecommerce Website', platform: 'Shopify', hosting_expiry: '2025-12-20', ssl_expiry: '2025-10-10', maintenance_plan: 'Annual', total_contract_value: 944, paid_amount: 944, plan_type: 'Premium' },
    { id: '3', name: 'Amit Kumar', email: 'amit@startuphub.com', phone: '+91 76543 21098', company: 'StartupHub', domain_name: 'startuphub.com', hosting_provider: 'GoDaddy', project_type: 'Landing Page', platform: 'Custom', hosting_expiry: '2026-01-30', ssl_expiry: '2026-01-30', maintenance_plan: 'None', total_contract_value: 167, paid_amount: 167, plan_type: 'Basic' },
    { id: '4', name: 'Sunita Patel', email: 'sunita@fashionhub.in', phone: '+91 65432 10987', company: 'FashionHub', domain_name: 'fashionhub.in', hosting_provider: 'Bluehost', project_type: 'Ecommerce Website', platform: 'WooCommerce', hosting_expiry: '2025-07-01', ssl_expiry: '2025-07-01', maintenance_plan: 'Monthly', total_contract_value: 722, paid_amount: 444, plan_type: 'Custom' },
    { id: '5', name: 'Vikram Singh', email: 'vikram@digitaledge.in', phone: '+91 54321 09876', company: 'Digital Edge', domain_name: 'digitaledge.in', hosting_provider: 'SiteGround', project_type: 'Business Website', platform: 'WordPress', hosting_expiry: '2025-09-15', ssl_expiry: '2025-09-15', maintenance_plan: 'Monthly', total_contract_value: 333, paid_amount: 167, plan_type: 'Basic' }
];

const sampleProjects = [
    { id: '1', name: 'TechVision Corporate Website', client_id: '1', client_name: 'TechVision Pvt Ltd', start_date: '2025-01-15', deadline: '2025-03-15', status: 'Development', assigned_team: 'Arjun, Priya', progress: 65 },
    { id: '2', name: 'ShopKart Ecommerce Platform', client_id: '2', client_name: 'ShopKart India', start_date: '2025-02-01', deadline: '2025-05-01', status: 'Testing', assigned_team: 'Dev Team', progress: 85 },
    { id: '3', name: 'StartupHub Landing Page', client_id: '3', client_name: 'StartupHub', start_date: '2025-03-01', deadline: '2025-03-30', status: 'Live', assigned_team: 'Rahul', progress: 100 },
    { id: '4', name: 'FashionHub Store Redesign', client_id: '4', client_name: 'FashionHub', start_date: '2025-03-15', deadline: '2025-06-15', status: 'Design', assigned_team: 'Design Team', progress: 30 },
    { id: '5', name: 'Digital Edge Business Site', client_id: '5', client_name: 'Digital Edge', start_date: '2025-04-01', deadline: '2025-06-30', status: 'Planning', assigned_team: 'Unassigned', progress: 10 }
];

const sampleTasks = [
    { id: '1', project_id: '1', title: 'Homepage wireframe', description: 'Create wireframes for homepage layout', status: 'completed', assignee: 'Arjun', priority: 'high', due_date: '2025-02-01' },
    { id: '2', project_id: '1', title: 'Header & navigation design', description: 'Design sticky header with dropdown', status: 'completed', assignee: 'Priya', priority: 'medium', due_date: '2025-02-05' },
    { id: '3', project_id: '1', title: 'Homepage development', description: 'Build homepage in WordPress', status: 'development', assignee: 'Arjun', priority: 'high', due_date: '2025-02-20' },
    { id: '4', project_id: '1', title: 'Contact form setup', description: 'Setup contact form with email notifications', status: 'todo', assignee: 'Arjun', priority: 'low', due_date: '2025-03-01' },
    { id: '5', project_id: '1', title: 'Client review - Round 1', description: 'Send mockups to client for feedback', status: 'review', assignee: 'Admin', priority: 'medium', due_date: '2025-02-25' },
    { id: '6', project_id: '1', title: 'SEO & analytics setup', description: 'Meta tags, sitemap, Google Analytics', status: 'todo', assignee: 'Priya', priority: 'medium', due_date: '2025-03-10' },
    { id: '7', project_id: '1', title: 'Mobile responsive testing', description: 'Test across devices', status: 'testing', assignee: 'Rohit', priority: 'high', due_date: '2025-03-05' }
];

const sampleInvoices = [
    { id: '1', invoice_number: 'INV-2025-001', client_id: '1', client_name: 'TechVision Pvt Ltd', project_name: 'TechVision Corporate Website', amount: 278, gst_percent: 18, total_amount: 328, due_date: '2025-02-28', status: 'paid', paid_date: '2025-02-20', notes: 'First milestone payment' },
    { id: '2', invoice_number: 'INV-2025-002', client_id: '2', client_name: 'ShopKart India', project_name: 'ShopKart Ecommerce Platform', amount: 500, gst_percent: 18, total_amount: 590, due_date: '2025-03-15', status: 'pending', notes: 'Second milestone' },
    { id: '3', invoice_number: 'INV-2025-003', client_id: '4', client_name: 'FashionHub', project_name: 'FashionHub Store Redesign', amount: 222, gst_percent: 18, total_amount: 262, due_date: '2025-02-01', status: 'overdue', notes: 'Design phase completion' },
    { id: '4', invoice_number: 'INV-2025-004', client_id: '1', client_name: 'TechVision Pvt Ltd', project_name: 'Monthly Maintenance - Feb', amount: 56, gst_percent: 18, total_amount: 66, due_date: '2025-04-01', status: 'recurring', notes: 'Monthly maintenance plan' },
    { id: '5', invoice_number: 'INV-2025-005', client_id: '5', client_name: 'Digital Edge', project_name: 'Digital Edge Business Site', amount: 167, gst_percent: 18, total_amount: 197, due_date: '2025-03-30', status: 'pending', notes: 'Initial payment' }
];

const sampleServices = [
    { id: '1', name: 'Business Website', icon: '🏢', pricing: 278, active_clients: 12, revenue_generated: 3333, avg_delivery_days: 30, description: 'Professional business websites with modern design' },
    { id: '2', name: 'Ecommerce Website', icon: '🛒', pricing: 611, active_clients: 8, revenue_generated: 4889, avg_delivery_days: 45, description: 'Full-featured online stores with payment gateway' },
    { id: '3', name: 'Landing Page', icon: '📄', pricing: 133, active_clients: 5, revenue_generated: 667, avg_delivery_days: 7, description: 'High-converting landing pages for campaigns' },
    { id: '4', name: 'Website Redesign', icon: '🎨', pricing: 200, active_clients: 4, revenue_generated: 800, avg_delivery_days: 21, description: 'Modernize existing websites with fresh design' },
    { id: '5', name: 'Maintenance Plan', icon: '🛠️', pricing: 56, active_clients: 15, revenue_generated: 833, avg_delivery_days: 0, description: 'Monthly website maintenance and updates' },
    { id: '6', name: 'SEO Add-on', icon: '📈', pricing: 89, active_clients: 10, revenue_generated: 889, avg_delivery_days: 0, description: 'Search engine optimization and ranking improvement' },
    { id: '7', name: 'Hosting Setup', icon: '☁️', pricing: 39, active_clients: 20, revenue_generated: 778, avg_delivery_days: 2, description: 'Server setup, DNS config, and SSL installation' }
];

const sampleTeamMembers = [
    { id: '1', name: 'Arjun Kapoor', email: 'vijaypratap@nexlancedigital.com', role: 'Developer', can_edit_tasks: true, can_see_revenue: false, can_create_invoices: false, can_upload_files: true },
    { id: '2', name: 'Priya Gupta', email: 'vijaypratap@nexlancedigital.com', role: 'Designer', can_edit_tasks: true, can_see_revenue: false, can_create_invoices: false, can_upload_files: true },
    { id: '3', name: 'Rohit Sharma', email: 'vijaypratap@nexlancedigital.com', role: 'Project Manager', can_edit_tasks: true, can_see_revenue: true, can_create_invoices: true, can_upload_files: true },
    { id: '4', name: 'Admin User', email: 'vijaypratap@nexlancedigital.com', role: 'Admin', can_edit_tasks: true, can_see_revenue: true, can_create_invoices: true, can_upload_files: true }
];

document.addEventListener("DOMContentLoaded", () => {
    migrateLocalCurrencyToEuro();
    if (!getStoredPlanRecord()) {
        activateIndividualPlanAccess();
    }
    syncPlanUiVisibility();
    syncAdminUiVisibility();
    enforcePlanPageAccess();
    if (typeof emailjs !== 'undefined' && EMAILJS_CONFIG && EMAILJS_CONFIG.publicKey) {
        try { emailjs.init(EMAILJS_CONFIG.publicKey); } catch (e) { /* will use per-call key */ }
    }
});
