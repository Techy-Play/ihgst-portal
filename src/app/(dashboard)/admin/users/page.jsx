'use client';
import { useState, useCallback } from 'react';
import { Plus, Edit3, X, Save, Users, Search, UserPlus } from 'lucide-react';
import { useDataFetcher } from '@/lib/useDataFetcher';
import { PageHeader, SkeletonTable, ErrorDisplay } from '@/components/ui/Skeletons';
import CustomDropdown from '@/components/ui/CustomDropdown';
import { useToast } from '@/components/ui/Toast';
import { motion, AnimatePresence } from 'framer-motion';

const roleOptions = [
  { value: 'Employee', label: 'Employee', description: 'Standard employee access' },
  { value: 'Manager', label: 'Manager', description: 'Team review + employee access' },
  { value: 'Admin', label: 'Admin', description: 'Full system access' },
];

const deptOptions = [
  { value: 'Engineering', label: 'Engineering' },
  { value: 'Sales', label: 'Sales' },
  { value: 'Marketing', label: 'Marketing' },
  { value: 'Finance', label: 'Finance' },
  { value: 'HR', label: 'HR' },
  { value: 'Operations', label: 'Operations' },
  { value: 'Product', label: 'Product' },
  { value: 'Design', label: 'Design' },
  { value: 'Support', label: 'Support' },
  { value: 'Legal', label: 'Legal' },
];

export default function AdminUsersPage() {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', role: 'Employee', department: '', employeeId: '', managerId: '' });
  const [editForm, setEditForm] = useState({});
  const toast = useToast();

  const transform = useCallback((d) => d, []);
  const { data, loading, error, refresh, lastUpdated } = useDataFetcher('/api/admin/users', { transform });

  const users = data?.users || [];
  const managers = users.filter(u => u.role === 'Manager' || u.role === 'Admin');
  const filtered = search
    ? users.filter(u => u.name.toLowerCase().includes(search.toLowerCase()) || u.email.toLowerCase().includes(search.toLowerCase()) || u.department?.toLowerCase().includes(search.toLowerCase()))
    : users;

  const managerOptions = [
    { value: '', label: 'No Manager', description: 'Direct report to org' },
    ...managers.map(m => ({ value: m._id, label: m.name, description: m.email })),
  ];

  const roleColors = { Admin: '#f87171', Manager: '#60a5fa', Employee: '#34d399' };

  const handleCreate = async () => {
    if (!form.name?.trim() || !form.email?.trim() || !form.department?.trim() || !form.employeeId?.trim()) {
      toast('All fields are required.', 'error'); return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await res.json();
      if (res.ok) { toast(`User "${form.name}" created with default password.`, 'success'); setShowAddForm(false); setForm({ name: '', email: '', role: 'Employee', department: '', employeeId: '', managerId: '' }); refresh(); }
      else toast(data.error, 'error');
    } catch { toast('Failed to create user', 'error'); }
    setSaving(false);
  };

  const handleEdit = (user) => {
    setEditingId(user._id);
    setEditForm({ name: user.name, role: user.role, department: user.department, employeeId: user.employeeId, managerId: user.managerId?._id || '' });
  };

  const handleSaveEdit = async () => {
    setSaving(true);
    try {
      const res = await fetch('/api/admin/users', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ userId: editingId, ...editForm }) });
      const data = await res.json();
      if (res.ok) { toast('User updated!', 'success'); setEditingId(null); refresh(); }
      else toast(data.error, 'error');
    } catch { toast('Failed to update user', 'error'); }
    setSaving(false);
  };

  if (error) return (
    <div className="animate-fadeIn">
      <PageHeader title="User Management" subtitle="Manage user accounts, roles, and hierarchy" />
      <ErrorDisplay message={error} onRetry={refresh} />
    </div>
  );

  return (
    <div className="animate-fadeIn">
      <PageHeader title="User Management" subtitle="Manage user accounts, roles, and hierarchy."
        onRefresh={refresh} lastUpdated={lastUpdated} loading={loading}>
        <button className="btn-glow" onClick={() => setShowAddForm(!showAddForm)} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
          <UserPlus size={16} /> Add User
        </button>
      </PageHeader>

      {/* Add User Form */}
      <AnimatePresence>
        {showAddForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
            className="glass-card" style={{ padding: '24px', marginBottom: '20px', overflow: 'hidden' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 600 }}>Add New User</h3>
              <button onClick={() => setShowAddForm(false)} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}><X size={18} /></button>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '12px' }}>
              <div><label className="dropdown-label">Full Name</label><input className="input-dark" value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="John Doe" /></div>
              <div><label className="dropdown-label">Email</label><input className="input-dark" type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="john@company.com" /></div>
              <div><label className="dropdown-label">Employee ID</label><input className="input-dark" value={form.employeeId} onChange={e => setForm(p => ({ ...p, employeeId: e.target.value }))} placeholder="EMP001" /></div>
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '12px', marginBottom: '16px' }}>
              <CustomDropdown label="Role" options={roleOptions} value={form.role} onChange={v => setForm(p => ({ ...p, role: v }))} />
              <CustomDropdown label="Department" options={deptOptions} value={form.department} onChange={v => setForm(p => ({ ...p, department: v }))} />
              <CustomDropdown label="Reporting Manager" options={managerOptions} value={form.managerId} onChange={v => setForm(p => ({ ...p, managerId: v }))} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Default password: Password123!</p>
              <div style={{ display: 'flex', gap: '12px' }}>
                <button onClick={() => setShowAddForm(false)} style={{ padding: '8px 20px', borderRadius: '10px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: '14px' }}>Cancel</button>
                <button className="btn-glow" onClick={handleCreate} disabled={saving} style={{ fontSize: '14px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                  {saving ? 'Creating...' : <><UserPlus size={14} /> Create User</>}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search */}
      <div style={{ marginBottom: '16px', position: 'relative' }}>
        <Search size={16} style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
        <input className="input-dark" placeholder="Search users by name, email, or department..." value={search} onChange={e => setSearch(e.target.value)} style={{ paddingLeft: '38px' }} />
      </div>

      {/* Users Table */}
      {loading && !data ? <SkeletonTable rows={5} cols={7} /> : (
        <div className="glass-card" style={{ overflow: 'auto' }}>
          <table className="table-dark">
            <thead><tr><th>Name</th><th>Email</th><th>Role</th><th>Department</th><th>Manager</th><th>Employee ID</th><th style={{ width: '80px' }}>Actions</th></tr></thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr><td colSpan={7} style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  <Users size={32} style={{ margin: '0 auto 8px', opacity: 0.4 }} />
                  <p>No users found</p>
                </td></tr>
              ) : filtered.map(user => (
                <tr key={user._id}>
                  {editingId === user._id ? (
                    <>
                      <td><input className="input-dark" value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))} style={{ fontSize: '13px', padding: '6px 10px' }} /></td>
                      <td style={{ color: 'var(--text-muted)', fontSize: '13px' }}>{user.email}</td>
                      <td>
                        <select className="input-dark" value={editForm.role} onChange={e => setEditForm(p => ({ ...p, role: e.target.value }))} style={{ fontSize: '12px', padding: '4px 8px' }}>
                          <option value="Employee">Employee</option>
                          <option value="Manager">Manager</option>
                          <option value="Admin">Admin</option>
                        </select>
                      </td>
                      <td>
                        <select className="input-dark" value={editForm.department} onChange={e => setEditForm(p => ({ ...p, department: e.target.value }))} style={{ fontSize: '12px', padding: '4px 8px' }}>
                          {deptOptions.map(d => <option key={d.value} value={d.value}>{d.label}</option>)}
                        </select>
                      </td>
                      <td>
                        <select className="input-dark" value={editForm.managerId} onChange={e => setEditForm(p => ({ ...p, managerId: e.target.value }))} style={{ fontSize: '12px', padding: '4px 8px' }}>
                          <option value="">No Manager</option>
                          {managers.map(m => <option key={m._id} value={m._id}>{m.name}</option>)}
                        </select>
                      </td>
                      <td><input className="input-dark" value={editForm.employeeId} onChange={e => setEditForm(p => ({ ...p, employeeId: e.target.value }))} style={{ fontSize: '13px', padding: '6px 10px' }} /></td>
                      <td>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          <button onClick={handleSaveEdit} disabled={saving} style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.3)', color: '#34d399', cursor: 'pointer', fontSize: '11px' }}><Save size={12} /></button>
                          <button onClick={() => setEditingId(null)} style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(255,255,255,0.04)', border: '1px solid var(--border-color)', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '11px' }}><X size={12} /></button>
                        </div>
                      </td>
                    </>
                  ) : (
                    <>
                      <td style={{ color: 'var(--text-primary)', fontWeight: 500 }}>{user.name}</td>
                      <td>{user.email}</td>
                      <td><span className="badge" style={{ background: `${roleColors[user.role]}15`, color: roleColors[user.role], borderColor: `${roleColors[user.role]}30` }}>{user.role}</span></td>
                      <td>{user.department}</td>
                      <td>{user.managerId?.name || '—'}</td>
                      <td>{user.employeeId || '—'}</td>
                      <td>
                        <button onClick={() => handleEdit(user)} style={{ padding: '4px 8px', borderRadius: '6px', background: 'rgba(99,102,241,0.06)', border: '1px solid rgba(99,102,241,0.15)', color: '#818cf8', cursor: 'pointer' }}>
                          <Edit3 size={12} />
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
