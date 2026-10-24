import { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../../../components/common/Button';
import { Input } from '../../../components/common/Input';
import { Search, Filter, Layers, MoreVertical, X, Pencil, Trash2 } from 'lucide-react';
import { formatCurrency } from '../../../utils/format';
import { isMockGroup } from '../../../utils/cleanMockData';

interface ChitGroup {
  id: string;
  name: string;
  type: string;
  value: number;
  duration: number;
  currentMonth: number;
  members: number;
  filled: number;
  status: string;
}

export const ChitGroupList = () => {
  const location = useLocation();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterType, setFilterType] = useState('');
  const [groups, setGroups] = useState<ChitGroup[]>([]);
  
  // Create Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    type: 'AUCTION',
    value: '',
    duration: '',
    members: ''
  });

  // Edit Modal State
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<ChitGroup | null>(null);
  const [editFormData, setEditFormData] = useState({ name: '', type: 'AUCTION', value: '', duration: '', members: '' });

  // 3-dot dropdown
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 });

  useEffect(() => {
    if (location.state && (location.state as any).openCreate) {
      setIsModalOpen(true);
    }
  }, [location.state]);

  useEffect(() => {
    const syncGroups = () => {
      let raw: any[] = [];
      const saved = localStorage.getItem('mockChitGroups');
      if (saved) {
        try {
          const parsed = JSON.parse(saved);
          if (Array.isArray(parsed)) raw = parsed;
        } catch { }
      }

      const groupMap = new Map<string, any>();
      raw.filter((g: any) => !isMockGroup(g)).forEach((g: any) => {
        const key = String(g.id || g.name || '').trim();
        if (key) {
          groupMap.set(key.toLowerCase(), g);
          if (g.name) groupMap.set(String(g.name).trim().toLowerCase(), g);
        }
      });

      // Discover groups from memberships
      let memberships: any[] = [];
      try {
        const mStored = localStorage.getItem('chitGroupMemberships');
        if (mStored) {
          const parsedM = JSON.parse(mStored);
          if (Array.isArray(parsedM)) memberships = parsedM;
        }
      } catch { }

      memberships.forEach((m: any) => {
        const grpKey = String(m.groupId || m.groupName || '').trim();
        const grpName = String(m.groupName || m.groupId || '').trim();
        if (grpKey && !isMockGroup({ id: grpKey, name: grpName })) {
          if (!groupMap.has(grpKey.toLowerCase()) && !groupMap.has(grpName.toLowerCase())) {
            const newG = {
              id: grpKey,
              name: grpName || grpKey,
              type: m.scheme || 'Mixed Schemes',
              value: Number(m.chitValue || 0),
              duration: Number(m.duration || m.months || 20),
              currentMonth: 0,
              members: 20,
              filled: 1,
              status: 'ACTIVE'
            };
            groupMap.set(grpKey.toLowerCase(), newG);
            groupMap.set(grpName.toLowerCase(), newG);
          }
        }
      });

      // Discover groups from customers' active chits
      let customers: any[] = [];
      try {
        const cStored = localStorage.getItem('mockCustomers');
        if (cStored) {
          const parsedC = JSON.parse(cStored);
          if (Array.isArray(parsedC)) customers = parsedC;
        }
      } catch { }

      customers.forEach((c: any) => {
        if (Array.isArray(c.chits)) {
          c.chits.forEach((ch: any) => {
            const grpKey = String(ch.groupId || ch.groupName || '').trim();
            const grpName = String(ch.groupName || ch.groupId || '').trim();
            if (grpKey && !isMockGroup({ id: grpKey, name: grpName })) {
              if (!groupMap.has(grpKey.toLowerCase()) && !groupMap.has(grpName.toLowerCase())) {
                const dur = Number(ch.duration || ch.months || 20);
                const monthly = Number(ch.monthlyInstallment || 0);
                const val = Number(ch.chitValue || (monthly > 0 ? monthly * dur : 0));
                const newG = {
                  id: grpKey,
                  name: grpName || grpKey,
                  type: ch.scheme || 'Mixed Schemes',
                  value: val,
                  duration: dur,
                  currentMonth: 0,
                  members: 20,
                  filled: 1,
                  status: 'ACTIVE'
                };
                groupMap.set(grpKey.toLowerCase(), newG);
                groupMap.set(grpName.toLowerCase(), newG);
              }
            }
          });
        }
      });

      const uniqueList: any[] = [];
      const seen = new Set<string>();
      groupMap.forEach((g) => {
        const k = String(g.id || g.name || '').trim().toLowerCase();
        if (k && !seen.has(k)) {
          seen.add(k);
          if (g.name) seen.add(String(g.name).trim().toLowerCase());
          uniqueList.push(g);
        }
      });

      setGroups(uniqueList);
      localStorage.setItem('mockChitGroups', JSON.stringify(uniqueList));
    };

    syncGroups();
    window.addEventListener('storage', syncGroups);
    return () => window.removeEventListener('storage', syncGroups);
  }, []);

  const handleCreateGroup = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert("Please enter a group name.");
      return;
    }

    const newGroup: ChitGroup = {
      id: `CG-${Math.floor(Math.random() * 900) + 100}-${formData.type.charAt(0)}`,
      name: formData.name.trim(),
      type: formData.type || 'Mixed Schemes',
      value: parseInt(formData.value) || 0,
      duration: parseInt(formData.duration) || 20,
      members: parseInt(formData.members) || 0,
      currentMonth: 0,
      filled: 0,
      status: 'FORMATION'
    };

    const updatedGroups = [newGroup, ...groups];
    setGroups(updatedGroups);
    localStorage.setItem('mockChitGroups', JSON.stringify(updatedGroups));
    
    setIsModalOpen(false);
    setFormData({ name: '', type: 'AUCTION', value: '', duration: '', members: '' });
  };

  const handleEditOpen = (g: ChitGroup) => {
    setEditingGroup(g);
    setEditFormData({ name: g.name, type: g.type, value: String(g.value), duration: String(g.duration), members: String(g.members) });
    setIsEditModalOpen(true);
    setOpenMenuId(null);
  };

  const handleEditSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingGroup) return;
    const updated = groups.map(g =>
      g.id === editingGroup.id
        ? { ...g, name: editFormData.name, type: editFormData.type, value: parseInt(editFormData.value), duration: parseInt(editFormData.duration), members: parseInt(editFormData.members) }
        : g
    );
    setGroups(updated);
    localStorage.setItem('mockChitGroups', JSON.stringify(updated));
    setIsEditModalOpen(false);
    setEditingGroup(null);
  };

  const handleDelete = (id: string) => {
    if (!window.confirm('Are you sure you want to delete this chit group? This action cannot be undone.')) return;
    const updated = groups.filter(g => g.id !== id);
    setGroups(updated);
    localStorage.setItem('mockChitGroups', JSON.stringify(updated));
    setOpenMenuId(null);
  };

  const filteredGroups = groups.filter(g => {
    const matchesSearch = g.id.toLowerCase().includes(searchTerm.toLowerCase()) || g.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType ? g.type === filterType : true;
    return matchesSearch && matchesType;
  });

  // Calculate dynamic stats
  const totalGroups = groups.length;
  const activeGroups = groups.filter(g => g.status === 'ACTIVE').length;
  const formationGroups = groups.filter(g => g.status === 'FORMATION').length;
  const totalActiveValue = groups.filter(g => g.status === 'ACTIVE').reduce((sum, g) => sum + g.value, 0);

  return (
    <div className="space-y-6 relative" onClick={() => setOpenMenuId(null)}>

      {/* FIXED DROPDOWN PORTAL - renders above all overflow containers */}
      {openMenuId && (
        <div
          onClick={e => e.stopPropagation()}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="w-44 bg-white rounded-xl shadow-2xl border border-slate-100 overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          <button
            onClick={() => { const g = groups.find(x => x.id === openMenuId); if (g) handleEditOpen(g); }}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="w-4 h-4 text-primary-500" />
            Edit Group
          </button>
          <div className="border-t border-slate-100" />
          <button
            onClick={() => handleDelete(openMenuId)}
            className="w-full flex items-center gap-3 px-4 py-3 text-sm font-semibold text-rose-600 hover:bg-rose-50 transition-colors"
          >
            <Trash2 className="w-4 h-4" />
            Delete Group
          </button>
        </div>
      )}
      
      {/* EDIT GROUP MODAL */}
      {isEditModalOpen && editingGroup && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300" onClick={e => e.stopPropagation()}>
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Pencil className="w-5 h-5 mr-2 text-primary-600" />
                Edit Chit Group
              </h3>
              <button onClick={() => setIsEditModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleEditSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Group Name *</label>
                <Input placeholder="e.g. Diamond Series B" value={editFormData.name} onChange={e => setEditFormData({...editFormData, name: e.target.value})} required />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scheme / Plan *</label>
                <select className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white font-medium text-slate-700" value={editFormData.type} onChange={e => setEditFormData({...editFormData, type: e.target.value})} required>
                  <option value="REGULAR">Regular (Standard Plan)</option>
                  <option value="FIXED">Fixed (Standard Draw)</option>
                  <option value="AUCTION">Auction (Variable Bid)</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Chit Value (₹) *</label>
                <Input type="number" placeholder="e.g. 500000" value={editFormData.value} onChange={e => setEditFormData({...editFormData, value: e.target.value})} required />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (Months) *</label>
                  <Input type="number" placeholder="e.g. 50" value={editFormData.duration} onChange={e => setEditFormData({...editFormData, duration: e.target.value})} required />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Members Capacity *</label>
                  <Input type="number" placeholder="e.g. 50" value={editFormData.members} onChange={e => setEditFormData({...editFormData, members: e.target.value})} required />
                </div>
              </div>
              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsEditModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CREATE GROUP MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-sm animate-in fade-in duration-300">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-lg font-bold text-slate-800 flex items-center">
                <Layers className="w-5 h-5 mr-2 text-primary-600" />
                Create New Chit Group
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="p-2 text-slate-400 hover:text-slate-700 hover:bg-slate-200 rounded-xl transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleCreateGroup} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Group Name *</label>
                <Input placeholder="e.g. Diamond Series B" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} required />
              </div>
              
              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Scheme / Plan *</label>
                <select 
                  className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white font-medium text-slate-700"
                  value={formData.type}
                  onChange={e => setFormData({...formData, type: e.target.value})}
                  required
                >
                  <option value="REGULAR">Regular (Standard Plan)</option>
                  <option value="FIXED">Fixed (Standard Draw)</option>
                  <option value="AUCTION">Auction (Variable Bid)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Total Chit Value (₹) (Optional)</label>
                <Input type="number" placeholder="e.g. 500000" value={formData.value} onChange={e => setFormData({...formData, value: e.target.value})} />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Duration (Months) (Optional)</label>
                  <Input type="number" placeholder="e.g. 20" value={formData.duration} onChange={e => setFormData({...formData, duration: e.target.value})} />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">Members Capacity (Optional)</label>
                  <Input type="number" placeholder="e.g. 20" value={formData.members} onChange={e => setFormData({...formData, members: e.target.value})} />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end gap-3">
                <Button type="button" variant="secondary" onClick={() => setIsModalOpen(false)}>Cancel</Button>
                <Button type="submit" variant="primary">Create Group</Button>
              </div>
            </form>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-primary-900 tracking-tight">Chit Groups</h1>
          <p className="text-sm text-neutral-500">Manage formations, track active cycles, and monitor group health.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="secondary">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
          <Button variant="primary" onClick={() => setIsModalOpen(true)}>Create Group</Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: 'Total Groups', value: totalGroups.toString(), desc: 'Across all branches' },
          { label: 'Active', value: activeGroups.toString(), desc: 'Currently running' },
          { label: 'In Formation', value: formationGroups.toString(), desc: 'Accepting members' },
          { label: 'Total Value (Active)', value: formatCurrency(totalActiveValue), desc: 'Aggregated active value' }
        ].map((stat, i) => (
          <div key={i} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm relative overflow-hidden group">
            <div className="absolute right-0 top-0 w-24 h-24 bg-primary-50 rounded-bl-full transform transition-transform group-hover:scale-110 -z-0"></div>
            <div className="relative z-10">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{stat.label}</p>
              <h3 className="text-2xl font-black text-slate-800">{stat.value}</h3>
              <p className="text-xs text-slate-400 mt-1">{stat.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1 max-w-md">
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
              <Search className="h-4 w-4 text-slate-400" />
            </div>
            <Input 
              className="pl-10 bg-white" 
              placeholder="Search by group ID or name..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="flex gap-2">
            <select 
              className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 outline-none bg-white text-slate-600"
              value={filterType}
              onChange={(e) => setFilterType(e.target.value)}
            >
              <option value="">All Types</option>
              <option value="AUCTION">Auction</option>
              <option value="FIXED">Fixed</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-slate-100">
            <thead className="bg-slate-50/50">
              <tr>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Group Details</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Chit Value</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Duration</th>
                <th className="px-6 py-4 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">Progress</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Occupancy</th>
                <th className="px-6 py-4 text-left text-xs font-bold text-slate-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-4 text-right text-xs font-bold text-slate-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-slate-50">
              {filteredGroups.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 font-medium">No groups found matching your criteria.</td>
                </tr>
              ) : (
                filteredGroups.map((g) => (
                  <tr key={g.id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-4">
                        <div className={`p-2.5 rounded-xl ${g.type === 'AUCTION' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-600'}`}>
                          <Layers className="w-5 h-5" />
                        </div>
                        <div>
                          <Link to={`/admin/chit-groups/${g.id}`} className="font-bold text-slate-800 hover:text-indigo-600 transition-colors">{g.name}</Link>
                          <div className="text-xs font-medium text-slate-500 mt-0.5">{g.id} • {g.type}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="font-black text-slate-800 text-sm">{formatCurrency(g.value)}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-slate-600 font-medium">{g.duration} Months</td>
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center">
                        <span className="text-xs font-bold text-slate-700">{g.currentMonth} / {g.duration}</span>
                        <div className="w-full bg-slate-100 rounded-full h-1.5 mt-1.5 max-w-[80px]">
                          <div className="bg-indigo-600 h-1.5 rounded-full" style={{ width: `${(g.currentMonth / g.duration) * 100}%` }}></div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center space-x-2">
                        <span className={`text-sm font-bold ${g.filled < g.members ? 'text-amber-600' : 'text-slate-600'}`}>
                          {g.filled} / {g.members}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                        g.status === 'ACTIVE' ? 'bg-green-100 text-green-700 border border-green-200' : 
                        g.status === 'FORMATION' ? 'bg-amber-100 text-amber-800 border border-amber-200' : 
                        'bg-slate-100 text-slate-600 border border-slate-200'
                      }`}>
                        {g.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={e => {
                          e.stopPropagation();
                          if (openMenuId === g.id) { setOpenMenuId(null); return; }
                          const rect = (e.currentTarget as HTMLButtonElement).getBoundingClientRect();
                          setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
                          setOpenMenuId(g.id);
                        }}
                        className="p-2 text-slate-400 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <MoreVertical className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
