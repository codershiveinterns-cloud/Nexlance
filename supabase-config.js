/* ============================================================
   SUPABASE CONFIG — Nexlance Agency Platform
   ============================================================
   SETUP INSTRUCTIONS:
   1. Go to https://supabase.com and create a free project
   2. In your Supabase project → Settings → API
   3. Copy your Project URL and anon/public key below
   4. Run the SQL schema at the bottom in your SQL Editor
   ============================================================ */

const SUPABASE_URL = 'https://your-project.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key-here';

// Initialize Supabase client safely (handles offline / CDN load failure)
let db = null;
try {
    if (typeof supabase !== 'undefined') {
        db = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }
} catch(e) {
    console.log('Supabase init failed, using sample data:', e.message);
}

// Supabase is usable only when CDN loaded AND real credentials are set
const isSupabaseConfigured = db !== null && !SUPABASE_URL.includes('your-project');

/* ============================================================
   DATABASE SCHEMA — paste into Supabase SQL Editor
   ============================================================

CREATE TABLE clients (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT,
  phone TEXT,
  company TEXT,
  domain_name TEXT,
  hosting_provider TEXT,
  project_type TEXT,
  platform TEXT,
  hosting_expiry DATE,
  ssl_expiry DATE,
  maintenance_plan TEXT DEFAULT 'None',
  total_contract_value NUMERIC DEFAULT 0,
  paid_amount NUMERIC DEFAULT 0,
  plan_type TEXT DEFAULT 'Basic',
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE projects (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE,
  client_name TEXT,
  start_date DATE,
  deadline DATE,
  status TEXT DEFAULT 'Planning',
  scope_of_work TEXT,
  deliverables TEXT,
  assigned_team TEXT,
  progress INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'todo',
  assignee TEXT,
  priority TEXT DEFAULT 'medium',
  due_date DATE,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE invoices (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  invoice_number TEXT,
  client_id UUID REFERENCES clients(id),
  client_name TEXT,
  project_id UUID REFERENCES projects(id),
  project_name TEXT,
  amount NUMERIC NOT NULL DEFAULT 0,
  gst_percent NUMERIC DEFAULT 18,
  total_amount NUMERIC DEFAULT 0,
  payment_link TEXT,
  due_date DATE,
  paid_date DATE,
  status TEXT DEFAULT 'pending',
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  icon TEXT DEFAULT '🌐',
  pricing NUMERIC DEFAULT 0,
  active_clients INTEGER DEFAULT 0,
  revenue_generated NUMERIC DEFAULT 0,
  avg_delivery_days INTEGER DEFAULT 0,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE team_members (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT DEFAULT 'Developer',
  can_edit_tasks BOOLEAN DEFAULT false,
  can_see_revenue BOOLEAN DEFAULT false,
  can_create_invoices BOOLEAN DEFAULT false,
  can_upload_files BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE activity_log (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  description TEXT NOT NULL,
  user_name TEXT DEFAULT 'Admin',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS (recommended for production)
ALTER TABLE clients       ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects      ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE invoices      ENABLE ROW LEVEL SECURITY;
ALTER TABLE services      ENABLE ROW LEVEL SECURITY;
ALTER TABLE team_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE activity_log  ENABLE ROW LEVEL SECURITY;
*/

/* ============================================================
   HELPER FUNCTIONS — Clients
   ============================================================ */
async function fetchClients() {
    if (!isSupabaseConfigured) return [...sampleClients];
    const { data, error } = await db.from('clients').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return [...sampleClients]; }
    return data;
}
async function addClient(d) {
    if (!isSupabaseConfigured) { const r = { ...d, id: 'c' + Date.now() }; sampleClients.unshift(r); return r; }
    const { data, error } = await db.from('clients').insert([d]).select().single();
    if (error) throw error; return data;
}
async function updateClient(id, d) {
    if (!isSupabaseConfigured) { const i = sampleClients.findIndex(c => c.id === id); if (i > -1) sampleClients[i] = { ...sampleClients[i], ...d }; return sampleClients[i]; }
    const { data, error } = await db.from('clients').update(d).eq('id', id).select().single();
    if (error) throw error; return data;
}
async function deleteClient(id) {
    if (!isSupabaseConfigured) { const i = sampleClients.findIndex(c => c.id === id); if (i > -1) sampleClients.splice(i, 1); return; }
    const { error } = await db.from('clients').delete().eq('id', id);
    if (error) throw error;
}

/* ============================================================
   HELPER FUNCTIONS — Projects
   ============================================================ */
async function fetchProjects(clientId = null) {
    if (!isSupabaseConfigured) return clientId ? sampleProjects.filter(p => p.client_id === clientId) : [...sampleProjects];
    let q = db.from('projects').select('*').order('created_at', { ascending: false });
    if (clientId) q = q.eq('client_id', clientId);
    const { data, error } = await q;
    if (error) { console.error(error); return [...sampleProjects]; }
    return data;
}
async function addProject(d) {
    if (!isSupabaseConfigured) { const r = { ...d, id: 'p' + Date.now() }; sampleProjects.unshift(r); return r; }
    const { data, error } = await db.from('projects').insert([d]).select().single();
    if (error) throw error; return data;
}
async function updateProject(id, d) {
    if (!isSupabaseConfigured) { const i = sampleProjects.findIndex(p => p.id === id); if (i > -1) sampleProjects[i] = { ...sampleProjects[i], ...d }; return sampleProjects[i]; }
    const { data, error } = await db.from('projects').update(d).eq('id', id).select().single();
    if (error) throw error; return data;
}
async function deleteProject(id) {
    if (!isSupabaseConfigured) { const i = sampleProjects.findIndex(p => p.id === id); if (i > -1) sampleProjects.splice(i, 1); return; }
    const { error } = await db.from('projects').delete().eq('id', id);
    if (error) throw error;
}

/* ============================================================
   HELPER FUNCTIONS — Tasks
   ============================================================ */
async function fetchTasks(projectId) {
    if (!isSupabaseConfigured) return sampleTasks.filter(t => t.project_id === projectId);
    const { data, error } = await db.from('tasks').select('*').eq('project_id', projectId).order('created_at');
    if (error) { console.error(error); return []; } return data;
}
async function addTask(d) {
    if (!isSupabaseConfigured) { const r = { ...d, id: 't' + Date.now() }; sampleTasks.push(r); return r; }
    const { data, error } = await db.from('tasks').insert([d]).select().single();
    if (error) throw error; return data;
}
async function updateTask(id, d) {
    if (!isSupabaseConfigured) { const i = sampleTasks.findIndex(t => t.id === id); if (i > -1) sampleTasks[i] = { ...sampleTasks[i], ...d }; return sampleTasks[i]; }
    const { data, error } = await db.from('tasks').update(d).eq('id', id).select().single();
    if (error) throw error; return data;
}
async function deleteTask(id) {
    if (!isSupabaseConfigured) { const i = sampleTasks.findIndex(t => t.id === id); if (i > -1) sampleTasks.splice(i, 1); return; }
    const { error } = await db.from('tasks').delete().eq('id', id);
    if (error) throw error;
}

/* ============================================================
   HELPER FUNCTIONS — Invoices
   ============================================================ */
async function fetchInvoices() {
    if (!isSupabaseConfigured) return [...sampleInvoices];
    const { data, error } = await db.from('invoices').select('*').order('created_at', { ascending: false });
    if (error) { console.error(error); return [...sampleInvoices]; } return data;
}
async function addInvoice(d) {
    if (!isSupabaseConfigured) { const r = { ...d, id: 'i' + Date.now() }; sampleInvoices.unshift(r); _saveSampleInvoices(); return r; }
    const { data, error } = await db.from('invoices').insert([d]).select().single();
    if (error) throw error; return data;
}
async function updateInvoiceStatus(id, status, paidDate = null) {
    const upd = { status, ...(paidDate ? { paid_date: paidDate } : {}) };
    if (!isSupabaseConfigured) { const i = sampleInvoices.findIndex(inv => inv.id === id); if (i > -1) { sampleInvoices[i] = { ...sampleInvoices[i], ...upd }; _saveSampleInvoices(); } return; }
    const { error } = await db.from('invoices').update(upd).eq('id', id);
    if (error) throw error;
}

/* ============================================================
   HELPER FUNCTIONS — Services
   ============================================================ */
async function fetchServices() {
    if (!isSupabaseConfigured) return [...sampleServices];
    const { data, error } = await db.from('services').select('*');
    if (error) { console.error(error); return [...sampleServices]; } return data;
}
async function addService(d) {
    if (!isSupabaseConfigured) { const r = { ...d, id: 's' + Date.now() }; sampleServices.push(r); return r; }
    const { data, error } = await db.from('services').insert([d]).select().single();
    if (error) throw error; return data;
}
async function updateService(id, d) {
    if (!isSupabaseConfigured) { const i = sampleServices.findIndex(s => s.id === id); if (i > -1) sampleServices[i] = { ...sampleServices[i], ...d }; return sampleServices[i]; }
    const { data, error } = await db.from('services').update(d).eq('id', id).select().single();
    if (error) throw error; return data;
}
async function deleteService(id) {
    if (!isSupabaseConfigured) { const i = sampleServices.findIndex(s => s.id === id); if (i > -1) sampleServices.splice(i, 1); return; }
    const { error } = await db.from('services').delete().eq('id', id);
    if (error) throw error;
}

/* ============================================================
   HELPER FUNCTIONS — Team
   ============================================================ */
async function fetchTeamMembers() {
    if (!isSupabaseConfigured) return [...sampleTeamMembers];
    const { data, error } = await db.from('team_members').select('*');
    if (error) { console.error(error); return [...sampleTeamMembers]; } return data;
}
async function addTeamMember(d) {
    if (!isSupabaseConfigured) { const r = { ...d, id: 'm' + Date.now() }; sampleTeamMembers.push(r); return r; }
    const { data, error } = await db.from('team_members').insert([d]).select().single();
    if (error) throw error; return data;
}
async function updateTeamMember(id, d) {
    if (!isSupabaseConfigured) { const i = sampleTeamMembers.findIndex(m => m.id === id); if (i > -1) sampleTeamMembers[i] = { ...sampleTeamMembers[i], ...d }; return sampleTeamMembers[i]; }
    const { data, error } = await db.from('team_members').update(d).eq('id', id).select().single();
    if (error) throw error; return data;
}
async function deleteTeamMember(id) {
    if (!isSupabaseConfigured) { const i = sampleTeamMembers.findIndex(m => m.id === id); if (i > -1) sampleTeamMembers.splice(i, 1); return; }
    const { error } = await db.from('team_members').delete().eq('id', id);
    if (error) throw error;
}

async function logActivity(description, userName = 'Admin') {
    if (!isSupabaseConfigured) return;
    await db.from('activity_log').insert([{ description, user_name: userName }]);
}

/* ============================================================
   SHARED UTILITIES
   ============================================================ */
function formatCurrency(n) { return '₹' + Number(n).toLocaleString('en-IN'); }
function formatDate(d) { if (!d) return '—'; return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
function getInitials(name) { return name.split(' ').map(w => w[0]).join('').toUpperCase().slice(0, 2); }

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
   SAMPLE DATA
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
