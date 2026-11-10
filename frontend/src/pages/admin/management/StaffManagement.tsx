import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  RefreshCw, 
  KeyRound,
  BadgeCheck
} from 'lucide-react';
import { fetchClient } from '../../../api/client';

interface StaffMember {
  id?: string;
  _id?: string;
  userCode: string;
  name: string;
  phone: string;
  email?: string;
  role: 'STAFF' | 'COLLECTION_AGENT' | 'BRANCH_MANAGER';
  roleName?: string;
  status: 'ACTIVE' | 'INACTIVE';
  lastLoginAt?: string;
  createdAt?: string;
}

const DEFAULT_STAFF: StaffMember[] = [
  {
    id: 'staff-1',
    userCode: 'STF-1001',
    name: 'Ramesh Kumar',
    phone: '9840123456',
    email: 'ramesh.staff@jenistachits.com',
    role: 'STAFF',
    roleName: 'Field Collection Executive',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'staff-2',
    userCode: 'STF-1002',
    name: 'Suresh Babu',
    phone: '9944123456',
    email: 'suresh.agent@jenistachits.com',
    role: 'COLLECTION_AGENT',
    roleName: 'Collection Agent',
    status: 'ACTIVE',
    createdAt: new Date().toISOString(),
  },
];

export const StaffManagement: React.FC = () => {
  const [staffList, setStaffList] = useState<StaffMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STAFF' | 'COLLECTION_AGENT'>('ALL');
  
  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    userCode: '',
    role: 'STAFF' as 'STAFF' | 'COLLECTION_AGENT' | 'BRANCH_MANAGER',
    password: '',
    status: 'ACTIVE' as 'ACTIVE' | 'INACTIVE',
  });
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');
  const [successToast, setSuccessToast] = useState('');

  const loadStaff = async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const res = await fetchClient('/staff');
      if (res && Array.isArray(res.data) && res.data.length > 0) {
        setStaffList(res.data);
        localStorage.setItem('staffMembers', JSON.stringify(res.data));
        return;
      }
    } catch {}

    // Fallback: check localStorage or use default
    try {
      const local = JSON.parse(localStorage.getItem('staffMembers') || 'null');
      if (local && Array.isArray(local) && local.length > 0) {
        setStaffList(local);
      } else {
        setStaffList(DEFAULT_STAFF);
        localStorage.setItem('staffMembers', JSON.stringify(DEFAULT_STAFF));
      }
    } catch {
      setStaffList(DEFAULT_STAFF);
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    loadStaff();
  }, []);

  const showToast = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(''), 3000);
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      phone: '',
      email: '',
      userCode: `STF-${Math.floor(1000 + Math.random() * 9000)}`,
      role: 'STAFF',
      password: '',
      status: 'ACTIVE',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (staff: StaffMember) => {
    setEditingStaff(staff);
    setFormData({
      name: staff.name,
      phone: staff.phone,
      email: staff.email || '',
      userCode: staff.userCode,
      role: staff.role || 'STAFF',
      password: '',
      status: staff.status || 'ACTIVE',
    });
    setFormError('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!formData.name.trim()) {
      setFormError('Staff name is required');
      return;
    }
    if (!formData.phone.trim() || formData.phone.trim().length < 10) {
      setFormError('Please enter a valid 10-digit mobile number');
      return;
    }
    if (!editingStaff && (!formData.password || formData.password.length < 4)) {
      setFormError('Password must be at least 4 characters');
      return;
    }

    setSubmitting(true);

    try {
      if (editingStaff) {
        // Update staff
        const staffId = editingStaff.id || editingStaff._id;
        try {
          await fetchClient(`/staff/${staffId}`, {
            method: 'PUT',
            body: JSON.stringify(formData),
          });
        } catch {}

        setStaffList((prev) =>
          prev.map((s) =>
            (s.id === staffId || s._id === staffId)
              ? {
                  ...s,
                  name: formData.name.trim(),
                  phone: formData.phone.trim(),
                  email: formData.email.trim(),
                  role: formData.role,
                  status: formData.status,
                }
              : s
          )
        );
        showToast('Staff details updated successfully');
      } else {
        // Create new staff
        let createdData: any = null;
        try {
          const res = await fetchClient('/staff', {
            method: 'POST',
            body: JSON.stringify(formData),
          });
          if (res && res.data) {
            createdData = res.data;
          }
        } catch {}

        const newMember: StaffMember = createdData || {
          id: `staff-${Date.now()}`,
          _id: `staff-${Date.now()}`,
          userCode: formData.userCode || `STF-${Math.floor(1000 + Math.random() * 9000)}`,
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim(),
          role: formData.role,
          roleName: formData.role === 'COLLECTION_AGENT' ? 'Collection Agent' : 'Field Staff Member',
          status: formData.status,
          createdAt: new Date().toISOString(),
        };

        setStaffList((prev) => [newMember, ...prev]);
        showToast('New staff member created successfully');
      }

      setIsModalOpen(false);
      localStorage.setItem('staffMembers', JSON.stringify(staffList));
    } catch (err: any) {
      setFormError(err.message || 'Operation failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleStatus = async (staff: StaffMember) => {
    const newStatus = staff.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
    const staffId = staff.id || staff._id;
    try {
      await fetchClient(`/staff/${staffId}`, {
        method: 'PUT',
        body: JSON.stringify({ status: newStatus }),
      });
    } catch {}

    setStaffList((prev) =>
      prev.map((s) => ((s.id === staffId || s._id === staffId) ? { ...s, status: newStatus } : s))
    );
    showToast(`Staff marked as ${newStatus}`);
  };

  const handleDelete = async (staff: StaffMember) => {
    const confirm = window.confirm(
      `Are you sure you want to remove staff member "${staff.name}" (${staff.userCode})?`
    );
    if (!confirm) return;

    const staffId = staff.id || staff._id;
    try {
      await fetchClient(`/staff/${staffId}`, { method: 'DELETE' });
    } catch {}

    setStaffList((prev) => prev.filter((s) => s.id !== staffId && s._id !== staffId));
    showToast('Staff member removed successfully');
  };

  const filteredStaff = staffList.filter((s) => {
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      s.name.toLowerCase().includes(q) ||
      s.phone.includes(q) ||
      (s.email && s.email.toLowerCase().includes(q)) ||
      (s.userCode && s.userCode.toLowerCase().includes(q));

    const matchesRole =
      roleFilter === 'ALL' ||
      s.role === roleFilter ||
      (roleFilter === 'STAFF' && s.role !== 'COLLECTION_AGENT');

    return matchesSearch && matchesRole;
  });

  const totalStaff = staffList.length;
  const activeStaff = staffList.filter((s) => s.status === 'ACTIVE').length;

  return (
    <div className="space-y-6">
      {/* Toast Notification */}
      {successToast && (
        <div className="fixed top-20 right-8 z-50 bg-emerald-700 text-white px-4 py-2.5 rounded-xl shadow-lg flex items-center gap-2 animate-in fade-in duration-200 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Top Banner & Header */}
      <div className="bg-gradient-to-r from-[#102B63] to-[#1E3A8A] text-white p-6 rounded-3xl shadow-sm relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-white/10 backdrop-blur-md flex items-center justify-center text-amber-300 border border-white/15">
            <Users className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight">Staff & Field Executives</h1>
            <p className="text-xs text-blue-100/80 mt-1">
              Create, manage, and assign roles for collection staff and field agents
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          <button
            onClick={() => loadStaff()}
            className="p-2.5 bg-white/10 hover:bg-white/20 text-white rounded-xl transition"
            title="Refresh list"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={handleOpenAdd}
            className="flex-1 sm:flex-initial flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-400 hover:bg-amber-300 text-slate-900 font-bold text-xs rounded-xl shadow-md transition active:scale-95"
          >
            <UserPlus className="w-4 h-4" />
            + Add New Staff
          </button>
        </div>
      </div>

      {/* KPI Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Total Staff</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalStaff}</p>
          <p className="text-[11px] text-slate-500 mt-0.5">Enrolled personnel</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider">Active Executives</p>
          <p className="text-2xl font-black text-emerald-700 mt-1">{activeStaff}</p>
          <p className="text-[11px] text-emerald-600/80 mt-0.5">Ready for field collection</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">Collection Agents</p>
          <p className="text-2xl font-black text-blue-700 mt-1">
            {staffList.filter((s) => s.role === 'COLLECTION_AGENT').length}
          </p>
          <p className="text-[11px] text-blue-600/80 mt-0.5">Doorstep payment desk</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Inactive Staff</p>
          <p className="text-2xl font-black text-slate-600 mt-1">{totalStaff - activeStaff}</p>
          <p className="text-[11px] text-slate-400 mt-0.5">Suspended accounts</p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search by name, phone, or staff ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto">
          <span className="text-xs font-bold text-slate-400 mr-1 hidden sm:inline">Role:</span>
          {(['ALL', 'STAFF', 'COLLECTION_AGENT'] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRoleFilter(r)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
                roleFilter === r
                  ? 'bg-[#102B63] text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {r === 'ALL' ? 'All Roles' : r === 'STAFF' ? 'Field Staff' : 'Collection Agents'}
            </button>
          ))}
        </div>
      </div>

      {/* Staff Members List */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-xs text-slate-400">Loading staff directory...</div>
        ) : filteredStaff.length === 0 ? (
          <div className="p-16 text-center">
            <div className="w-14 h-14 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-3">
              <Users className="w-6 h-6" />
            </div>
            <p className="text-sm font-bold text-slate-800">No staff members found</p>
            <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
              Click "+ Add New Staff" above to register collection executives.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50/80 text-slate-500 font-bold border-b border-slate-200/80">
                <tr>
                  <th className="py-3.5 px-4">Staff Executive</th>
                  <th className="py-3.5 px-4">Staff ID / Code</th>
                  <th className="py-3.5 px-4">Phone / Username</th>
                  <th className="py-3.5 px-4">Designation</th>
                  <th className="py-3.5 px-4">Status</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredStaff.map((staff) => {
                  const initial = (staff.name || 'S')[0].toUpperCase();
                  const isActive = staff.status === 'ACTIVE';

                  return (
                    <tr key={staff.id || staff._id || staff.userCode} className="hover:bg-slate-50/70 transition">
                      {/* Name & Avatar */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#102B63] to-blue-600 text-amber-300 font-black flex items-center justify-center text-xs shadow-xs">
                            {initial}
                          </div>
                          <div>
                            <p className="font-bold text-slate-900">{staff.name}</p>
                            <p className="text-[11px] text-slate-400">{staff.email || 'No email specified'}</p>
                          </div>
                        </div>
                      </td>

                      {/* Staff Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {staff.userCode}
                      </td>

                      {/* Phone */}
                      <td className="py-3.5 px-4">
                        <a
                          href={`tel:${staff.phone}`}
                          className="font-semibold text-slate-700 hover:text-blue-600 flex items-center gap-1.5"
                        >
                          <Phone className="w-3.5 h-3.5 text-slate-400" />
                          <span>{staff.phone}</span>
                        </a>
                      </td>

                      {/* Designation */}
                      <td className="py-3.5 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                            staff.role === 'COLLECTION_AGENT'
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}
                        >
                          <BadgeCheck className="w-3 h-3" />
                          {staff.role === 'COLLECTION_AGENT' ? 'Collection Agent' : 'Field Staff'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
                        <button
                          onClick={() => handleToggleStatus(staff)}
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                            isActive
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-100'
                              : 'bg-slate-100 text-slate-600 border border-slate-200 hover:bg-slate-200'
                          }`}
                          title="Click to toggle status"
                        >
                          <span
                            className={`w-2 h-2 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-400'}`}
                          />
                          {isActive ? 'Active' : 'Inactive'}
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenEdit(staff)}
                            className="p-1.5 text-slate-500 hover:text-blue-700 hover:bg-blue-50 rounded-lg transition"
                            title="Edit staff details"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDelete(staff)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                            title="Delete staff"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Add / Edit Staff Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-5 bg-[#102B63] text-white flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold">
                  {editingStaff ? 'Edit Staff Member' : 'Register New Staff Member'}
                </h3>
                <p className="text-xs text-blue-200 mt-0.5">
                  Assign credentials for field collections & chit portal login
                </p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-white/80 hover:text-white text-lg font-bold p-1"
              >
                ✕
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} className="p-6 space-y-4">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded-xl font-medium">
                  {formError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white"
                />
              </div>

              {/* Phone and Email Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number (Login ID) <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="tel"
                    placeholder="e.g. 9840123456"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                    required
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Email Address (Optional)
                  </label>
                  <input
                    type="email"
                    placeholder="e.g. ramesh@jenistachits.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white"
                  />
                </div>
              </div>

              {/* Staff Code and Role */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Staff Code / Badge ID
                  </label>
                  <input
                    type="text"
                    value={formData.userCode}
                    onChange={(e) => setFormData({ ...formData, userCode: e.target.value })}
                    className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Designation Role <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full px-3 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white"
                  >
                    <option value="STAFF">Field Collection Staff</option>
                    <option value="COLLECTION_AGENT">Collection Agent</option>
                    <option value="BRANCH_MANAGER">Branch Manager</option>
                  </select>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {editingStaff ? 'Reset Password (Leave blank to keep current)' : 'Account Password / PIN'}{' '}
                  {!editingStaff && <span className="text-rose-500">*</span>}
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder={editingStaff ? 'Enter new password if changing' : 'Enter 4+ char password'}
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    required={!editingStaff}
                    className="w-full pl-9 pr-3.5 py-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#102B63] focus:bg-white"
                  />
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              {/* Status Selection */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Status</label>
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'ACTIVE'}
                      onChange={() => setFormData({ ...formData, status: 'ACTIVE' })}
                      className="text-[#102B63]"
                    />
                    Active
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                    <input
                      type="radio"
                      name="status"
                      checked={formData.status === 'INACTIVE'}
                      onChange={() => setFormData({ ...formData, status: 'INACTIVE' })}
                      className="text-[#102B63]"
                    />
                    Inactive
                  </label>
                </div>
              </div>

              {/* Modal Actions */}
              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 text-xs font-bold text-white bg-[#102B63] hover:bg-[#1E3A8A] disabled:opacity-50 rounded-xl shadow-sm transition"
                >
                  {submitting ? 'Saving...' : editingStaff ? 'Save Changes' : 'Create Staff Member'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

