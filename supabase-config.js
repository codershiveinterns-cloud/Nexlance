/* ============================================================
   FIREBASE CONFIG — Nexlance Agency Platform
   ============================================================
   SETUP INSTRUCTIONS:
   1. Go to https://console.firebase.google.com and create a free project
   2. Click "Add app" → choose Web (</>)
   3. Register app and copy the firebaseConfig object below
   4. In Firebase Console:
      → Authentication → Sign-in method → enable "Email/Password"
      → Firestore Database → Create database (start in test mode for dev)
      → Authentication → Templates → Password reset → Customize action URL
         → set to:  https://your-domain.com/reset-password.html
   ============================================================ */

const firebaseConfig = {
    apiKey:            "AIzaSyCv56CN--eQLTCxomNItL2FgLRoIbdsdoM",
    authDomain:        "nexlance-df59e.firebaseapp.com",
    projectId:         "nexlance-df59e",
    storageBucket:     "nexlance-df59e.firebasestorage.app",
    messagingSenderId: "480679982312",
    appId:             "1:480679982312:web:2eb0d840f03c81db49055d",
    measurementId:     "G-0XG3807L8Q"
};

/* ── Initialize Firebase ── */
let auth = null;
let db   = null;

try {
    if (typeof firebase !== 'undefined') {
        firebase.initializeApp(firebaseConfig);
        auth = firebase.auth();
        db   = firebase.firestore();
    }
} catch (e) {
    console.log('Firebase init failed, using sample data:', e.message);
}

/* Firebase is usable only when SDK loaded AND real credentials are set */
const isFirebaseConfigured = db !== null && !firebaseConfig.apiKey.includes('YOUR_');
/* Backward-compat alias used by dashboard pages */
const isSupabaseConfigured = isFirebaseConfigured;

/* ============================================================
   FIRESTORE SCHEMA — create these collections in Firebase Console
   (or they are created automatically on first write in test mode)

   Collections:
     clients       — client records
     projects      — project records
     tasks         — task records (grouped per project)
     invoices      — invoice records
     services      — service catalogue
     team_members  — team roster
     activity_log  — audit trail

   Firestore Security Rules (paste in Firebase Console → Firestore → Rules):

   rules_version = '2';
   service cloud.firestore {
     match /databases/{database}/documents {
       match /{document=**} {
         allow read, write: if request.auth != null;
       }
     }
   }
   ============================================================ */

/* ============================================================
   HELPER — convert Firestore snapshot to plain object array
   ============================================================ */
function _snap(querySnap) {
    return querySnap.docs.map(d => ({ id: d.id, ...d.data() }));
}

/* ============================================================
   HELPER FUNCTIONS — Clients
   ============================================================ */
async function fetchClients() {
    if (!isFirebaseConfigured) return [...sampleClients];
    try {
        const snap = await db.collection('clients').orderBy('created_at', 'desc').get();
        return _snap(snap);
    } catch (e) { console.error(e); return [...sampleClients]; }
}
async function addClient(d) {
    if (!isFirebaseConfigured) { const r = { ...d, id: 'c' + Date.now() }; sampleClients.unshift(r); return r; }
    const doc = { ...d, created_at: new Date().toISOString() };
    const ref = await db.collection('clients').add(doc);
    return { id: ref.id, ...doc };
}
async function updateClient(id, d) {
    if (!isFirebaseConfigured) { const i = sampleClients.findIndex(c => c.id === id); if (i > -1) sampleClients[i] = { ...sampleClients[i], ...d }; return sampleClients[i]; }
    await db.collection('clients').doc(id).update(d);
    return { id, ...d };
}
async function deleteClient(id) {
    if (!isFirebaseConfigured) { const i = sampleClients.findIndex(c => c.id === id); if (i > -1) sampleClients.splice(i, 1); return; }
    await db.collection('clients').doc(id).delete();
}

/* ============================================================
   HELPER FUNCTIONS — Projects
   ============================================================ */
async function fetchProjects(clientId = null) {
    if (!isFirebaseConfigured) return clientId ? sampleProjects.filter(p => p.client_id === clientId) : [...sampleProjects];
    try {
        let q = db.collection('projects').orderBy('created_at', 'desc');
        if (clientId) q = q.where('client_id', '==', clientId);
        const snap = await q.get();
        return _snap(snap);
    } catch (e) { console.error(e); return [...sampleProjects]; }
}
async function addProject(d) {
    if (!isFirebaseConfigured) { const r = { ...d, id: 'p' + Date.now() }; sampleProjects.unshift(r); return r; }
    const doc = { ...d, created_at: new Date().toISOString() };
    const ref = await db.collection('projects').add(doc);
    return { id: ref.id, ...doc };
}
async function updateProject(id, d) {
    if (!isFirebaseConfigured) { const i = sampleProjects.findIndex(p => p.id === id); if (i > -1) sampleProjects[i] = { ...sampleProjects[i], ...d }; return sampleProjects[i]; }
    await db.collection('projects').doc(id).update(d);
    return { id, ...d };
}
async function deleteProject(id) {
    if (!isFirebaseConfigured) { const i = sampleProjects.findIndex(p => p.id === id); if (i > -1) sampleProjects.splice(i, 1); return; }
    await db.collection('projects').doc(id).delete();
}

/* ============================================================
   HELPER FUNCTIONS — Tasks
   ============================================================ */
async function fetchTasks(projectId) {
    if (!isFirebaseConfigured) return sampleTasks.filter(t => t.project_id === projectId);
    try {
        const snap = await db.collection('tasks').where('project_id', '==', projectId).orderBy('created_at').get();
        return _snap(snap);
    } catch (e) { console.error(e); return []; }
}
async function addTask(d) {
    if (!isFirebaseConfigured) { const r = { ...d, id: 't' + Date.now() }; sampleTasks.push(r); return r; }
    const doc = { ...d, created_at: new Date().toISOString() };
    const ref = await db.collection('tasks').add(doc);
    return { id: ref.id, ...doc };
}
async function updateTask(id, d) {
    if (!isFirebaseConfigured) { const i = sampleTasks.findIndex(t => t.id === id); if (i > -1) sampleTasks[i] = { ...sampleTasks[i], ...d }; return sampleTasks[i]; }
    await db.collection('tasks').doc(id).update(d);
    return { id, ...d };
}
async function deleteTask(id) {
    if (!isFirebaseConfigured) { const i = sampleTasks.findIndex(t => t.id === id); if (i > -1) sampleTasks.splice(i, 1); return; }
    await db.collection('tasks').doc(id).delete();
}

/* ============================================================
   HELPER FUNCTIONS — Invoices
   ============================================================ */
async function fetchInvoices() {
    if (!isFirebaseConfigured) return [...sampleInvoices];
    try {
        const snap = await db.collection('invoices').orderBy('created_at', 'desc').get();
        return _snap(snap);
    } catch (e) { console.error(e); return [...sampleInvoices]; }
}
async function addInvoice(d) {
    if (!isFirebaseConfigured) { const r = { ...d, id: 'i' + Date.now() }; sampleInvoices.unshift(r); _saveSampleInvoices(); return r; }
    const doc = { ...d, created_at: new Date().toISOString() };
    const ref = await db.collection('invoices').add(doc);
    return { id: ref.id, ...doc };
}
async function updateInvoiceStatus(id, status, paidDate = null) {
    const upd = { status, ...(paidDate ? { paid_date: paidDate } : {}) };
    if (!isFirebaseConfigured) { const i = sampleInvoices.findIndex(inv => inv.id === id); if (i > -1) { sampleInvoices[i] = { ...sampleInvoices[i], ...upd }; _saveSampleInvoices(); } return; }
    await db.collection('invoices').doc(id).update(upd);
}

/* ============================================================
   HELPER FUNCTIONS — Services
   ============================================================ */
async function fetchServices() {
    if (!isFirebaseConfigured) return [...sampleServices];
    try {
        const snap = await db.collection('services').get();
        return _snap(snap);
    } catch (e) { console.error(e); return [...sampleServices]; }
}
async function addService(d) {
    if (!isFirebaseConfigured) { const r = { ...d, id: 's' + Date.now() }; sampleServices.push(r); return r; }
    const doc = { ...d, created_at: new Date().toISOString() };
    const ref = await db.collection('services').add(doc);
    return { id: ref.id, ...doc };
}
async function updateService(id, d) {
    if (!isFirebaseConfigured) { const i = sampleServices.findIndex(s => s.id === id); if (i > -1) sampleServices[i] = { ...sampleServices[i], ...d }; return sampleServices[i]; }
    await db.collection('services').doc(id).update(d);
    return { id, ...d };
}
async function deleteService(id) {
    if (!isFirebaseConfigured) { const i = sampleServices.findIndex(s => s.id === id); if (i > -1) sampleServices.splice(i, 1); return; }
    await db.collection('services').doc(id).delete();
}

/* ============================================================
   HELPER FUNCTIONS — Team
   ============================================================ */
async function fetchTeamMembers() {
    if (!isFirebaseConfigured) return [...sampleTeamMembers];
    try {
        const snap = await db.collection('team_members').get();
        return _snap(snap);
    } catch (e) { console.error(e); return [...sampleTeamMembers]; }
}
async function addTeamMember(d) {
    if (!isFirebaseConfigured) { const r = { ...d, id: 'm' + Date.now() }; sampleTeamMembers.push(r); return r; }
    const doc = { ...d, created_at: new Date().toISOString() };
    const ref = await db.collection('team_members').add(doc);
    return { id: ref.id, ...doc };
}
async function updateTeamMember(id, d) {
    if (!isFirebaseConfigured) { const i = sampleTeamMembers.findIndex(m => m.id === id); if (i > -1) sampleTeamMembers[i] = { ...sampleTeamMembers[i], ...d }; return sampleTeamMembers[i]; }
    await db.collection('team_members').doc(id).update(d);
    return { id, ...d };
}
async function deleteTeamMember(id) {
    if (!isFirebaseConfigured) { const i = sampleTeamMembers.findIndex(m => m.id === id); if (i > -1) sampleTeamMembers.splice(i, 1); return; }
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

/* ============================================================
   SHARED UTILITIES
   ============================================================ */
function formatCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }

/* ---- Date Validation ---- */
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
    el.style.boxShadow  = '0 0 0 3px rgba(214,48,49,0.12)';
    el.title = msg;
}
function clearDateError(inputId) {
    const el = document.getElementById(inputId);
    if (!el) return;
    el.style.borderColor = '';
    el.style.boxShadow  = '';
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

/* ============================================================
   SAMPLE DATA (used when Firebase is not yet configured)
   ============================================================ */
const sampleClients = [
    { id: '1', name: 'Rahul Sharma', email: 'rahul@techvision.in', phone: '+91 98765 43210', company: 'TechVision Pvt Ltd', domain_name: 'techvision.in', hosting_provider: 'Hostinger', project_type: 'Business Website', platform: 'WordPress', hosting_expiry: '2025-08-15', ssl_expiry: '2025-08-15', maintenance_plan: 'Monthly', total_contract_value: 45000, paid_amount: 35000, plan_type: 'Premium' },
    { id: '2', name: 'Priya Mehta', email: 'priya@shopkart.in', phone: '+91 87654 32109', company: 'ShopKart India', domain_name: 'shopkart.in', hosting_provider: 'AWS', project_type: 'Ecommerce Website', platform: 'Shopify', hosting_expiry: '2025-12-20', ssl_expiry: '2025-10-10', maintenance_plan: 'Annual', total_contract_value: 85000, paid_amount: 85000, plan_type: 'Premium' },
    { id: '3', name: 'Amit Kumar', email: 'amit@startuphub.com', phone: '+91 76543 21098', company: 'StartupHub', domain_name: 'startuphub.com', hosting_provider: 'GoDaddy', project_type: 'Landing Page', platform: 'Custom', hosting_expiry: '2026-01-30', ssl_expiry: '2026-01-30', maintenance_plan: 'None', total_contract_value: 15000, paid_amount: 15000, plan_type: 'Basic' },
    { id: '4', name: 'Sunita Patel', email: 'sunita@fashionhub.in', phone: '+91 65432 10987', company: 'FashionHub', domain_name: 'fashionhub.in', hosting_provider: 'Bluehost', project_type: 'Ecommerce Website', platform: 'WooCommerce', hosting_expiry: '2025-07-01', ssl_expiry: '2025-07-01', maintenance_plan: 'Monthly', total_contract_value: 65000, paid_amount: 40000, plan_type: 'Custom' },
    { id: '5', name: 'Vikram Singh', email: 'vikram@digitaledge.in', phone: '+91 54321 09876', company: 'Digital Edge', domain_name: 'digitaledge.in', hosting_provider: 'SiteGround', project_type: 'Business Website', platform: 'WordPress', hosting_expiry: '2025-09-15', ssl_expiry: '2025-09-15', maintenance_plan: 'Monthly', total_contract_value: 30000, paid_amount: 15000, plan_type: 'Basic' }
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
    { id: '5', project_id: '1', title: 'Client review — Round 1', description: 'Send mockups to client for feedback', status: 'review', assignee: 'Admin', priority: 'medium', due_date: '2025-02-25' },
    { id: '6', project_id: '1', title: 'SEO & analytics setup', description: 'Meta tags, sitemap, Google Analytics', status: 'todo', assignee: 'Priya', priority: 'medium', due_date: '2025-03-10' },
    { id: '7', project_id: '1', title: 'Mobile responsive testing', description: 'Test across devices', status: 'testing', assignee: 'Rohit', priority: 'high', due_date: '2025-03-05' }
];

const _defaultInvoices = [
    { id: '1', invoice_number: 'INV-2025-001', client_id: '1', client_name: 'TechVision Pvt Ltd', project_name: 'TechVision Corporate Website', amount: 25000, gst_percent: 18, total_amount: 29500, due_date: '2025-02-28', status: 'paid', paid_date: '2025-02-20', notes: 'First milestone payment' },
    { id: '2', invoice_number: 'INV-2025-002', client_id: '2', client_name: 'ShopKart India', project_name: 'ShopKart Ecommerce Platform', amount: 45000, gst_percent: 18, total_amount: 53100, due_date: '2025-03-15', status: 'pending', notes: 'Second milestone' },
    { id: '3', invoice_number: 'INV-2025-003', client_id: '4', client_name: 'FashionHub', project_name: 'FashionHub Store Redesign', amount: 20000, gst_percent: 18, total_amount: 23600, due_date: '2025-02-01', status: 'overdue', notes: 'Design phase completion' },
    { id: '4', invoice_number: 'INV-2025-004', client_id: '1', client_name: 'TechVision Pvt Ltd', project_name: 'Monthly Maintenance — Feb', amount: 5000, gst_percent: 18, total_amount: 5900, due_date: '2025-04-01', status: 'recurring', notes: 'Monthly maintenance plan' },
    { id: '5', invoice_number: 'INV-2025-005', client_id: '5', client_name: 'Digital Edge', project_name: 'Digital Edge Business Site', amount: 15000, gst_percent: 18, total_amount: 17700, due_date: '2025-03-30', status: 'pending', notes: 'Initial payment' }
];
function _loadSampleInvoices() {
    try { const s = localStorage.getItem('nexlance_invoices'); return s ? JSON.parse(s) : [..._defaultInvoices]; } catch(e) { return [..._defaultInvoices]; }
}
function _saveSampleInvoices() {
    try { localStorage.setItem('nexlance_invoices', JSON.stringify(sampleInvoices)); } catch(e) {}
}
let sampleInvoices = _loadSampleInvoices();

const sampleServices = [
    { id: '1', name: 'Business Website', icon: '🏢', pricing: 25000, active_clients: 12, revenue_generated: 300000, avg_delivery_days: 30, description: 'Professional business websites with modern design' },
    { id: '2', name: 'Ecommerce Website', icon: '🛒', pricing: 55000, active_clients: 8, revenue_generated: 440000, avg_delivery_days: 45, description: 'Full-featured online stores with payment gateway' },
    { id: '3', name: 'Landing Page', icon: '📄', pricing: 12000, active_clients: 5, revenue_generated: 60000, avg_delivery_days: 7, description: 'High-converting landing pages for campaigns' },
    { id: '4', name: 'Website Redesign', icon: '🎨', pricing: 18000, active_clients: 4, revenue_generated: 72000, avg_delivery_days: 21, description: 'Modernize existing websites with fresh design' },
    { id: '5', name: 'Maintenance Plan', icon: '🛠️', pricing: 5000, active_clients: 15, revenue_generated: 75000, avg_delivery_days: 0, description: 'Monthly website maintenance and updates' },
    { id: '6', name: 'SEO Add-on', icon: '📈', pricing: 8000, active_clients: 10, revenue_generated: 80000, avg_delivery_days: 0, description: 'Search engine optimization and ranking improvement' },
    { id: '7', name: 'Hosting Setup', icon: '☁️', pricing: 3500, active_clients: 20, revenue_generated: 70000, avg_delivery_days: 2, description: 'Server setup, DNS config, and SSL installation' }
];

const sampleTeamMembers = [
    { id: '1', name: 'Arjun Kapoor', email: 'arjun@nexlance.com', role: 'Developer', can_edit_tasks: true, can_see_revenue: false, can_create_invoices: false, can_upload_files: true },
    { id: '2', name: 'Priya Gupta', email: 'priya@nexlance.com', role: 'Designer', can_edit_tasks: true, can_see_revenue: false, can_create_invoices: false, can_upload_files: true },
    { id: '3', name: 'Rohit Sharma', email: 'rohit@nexlance.com', role: 'Project Manager', can_edit_tasks: true, can_see_revenue: true, can_create_invoices: true, can_upload_files: true },
    { id: '4', name: 'Admin User', email: 'admin@nexlance.com', role: 'Admin', can_edit_tasks: true, can_see_revenue: true, can_create_invoices: true, can_upload_files: true }
];
