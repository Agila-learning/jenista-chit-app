import { useState, useEffect } from 'react';
import { Plus, Trash2, Edit2, Gavel, Table, Sparkles, Eye, Layers, ShieldCheck } from 'lucide-react';
import { formatCurrency } from '../../utils/format';
import { 
  calculateFixedPlanSchedule, 
  calculateAuctionPlanSchedule, 
  calculateRegularPlanSchedule,
  defaultRegularCategories,
  regularPlanTerms 
} from '../../utils/chitCalculations';

interface CategoryItem {
  id: number;
  value: number;
}

const defaultFixedCategories: CategoryItem[] = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

const defaultAuctionCategories: CategoryItem[] = [
  { id: 1, value: 100000 },
  { id: 2, value: 200000 },
  { id: 3, value: 500000 },
  { id: 4, value: 1000000 },
];

export const ManagePlans = () => {
  const [activeTab, setActiveTab] = useState<'regular' | 'fixed' | 'auction'>('regular');
  
  const [regularCategories, setRegularCategories] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem('mockRegularCategories');
    return saved ? JSON.parse(saved) : defaultRegularCategories;
  });

  const [fixedCategories, setFixedCategories] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem('mockFixedCategories');
    return saved ? JSON.parse(saved) : defaultFixedCategories;
  });

  const [auctionCategories, setAuctionCategories] = useState<CategoryItem[]>(() => {
    const saved = localStorage.getItem('mockAuctionCategories');
    return saved ? JSON.parse(saved) : defaultAuctionCategories;
  });

  const [selectedCategoryValue, setSelectedCategoryValue] = useState<number>(100000);

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState<string>('300000');
  const [modalSchemeType, setModalSchemeType] = useState<'regular' | 'fixed' | 'auction'>('regular');

  // Full Schedule Modal
  const [viewScheduleValue, setViewScheduleValue] = useState<number | null>(null);

  useEffect(() => {
    localStorage.setItem('mockRegularCategories', JSON.stringify(regularCategories));
    localStorage.setItem('mockFixedCategories', JSON.stringify(fixedCategories));
    localStorage.setItem('mockAuctionCategories', JSON.stringify(auctionCategories));
    
    // Also sync mockPlans for backward compatibility
    const syncedPlans = [
      { id: 'regular', title: 'Manage Regular Categories', categories: regularCategories },
      { id: 'fixed', title: 'Manage Fixed Categories', categories: fixedCategories },
      { id: 'auction', title: 'Manage Auction Categories', categories: auctionCategories }
    ];
    localStorage.setItem('mockPlans', JSON.stringify(syncedPlans));
  }, [regularCategories, fixedCategories, auctionCategories]);

  // Keep selected category valid
  const currentCategories = activeTab === 'regular' 
    ? regularCategories 
    : activeTab === 'fixed' 
      ? fixedCategories 
      : auctionCategories;

  useEffect(() => {
    if (currentCategories.length > 0 && !currentCategories.some(c => c.value === selectedCategoryValue)) {
      setSelectedCategoryValue(currentCategories[0].value);
    }
  }, [activeTab, currentCategories]);

  const handleOpenAdd = () => {
    setModalMode('add');
    setModalSchemeType(activeTab);
    setInputValue('300000');
    setEditingId(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: CategoryItem) => {
    setModalMode('edit');
    setModalSchemeType(activeTab);
    setInputValue(item.value.toString());
    setEditingId(item.id);
    setIsModalOpen(true);
  };

  const handleDelete = (id: number) => {
    if (window.confirm('Are you sure you want to delete this category?')) {
      if (activeTab === 'regular') {
        setRegularCategories(regularCategories.filter(c => c.id !== id));
      } else if (activeTab === 'fixed') {
        setFixedCategories(fixedCategories.filter(c => c.id !== id));
      } else {
        setAuctionCategories(auctionCategories.filter(c => c.id !== id));
      }
    }
  };

  const handleSaveModal = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(inputValue, 10);
    if (isNaN(val) || val <= 0) {
      alert('Please enter a valid chit value.');
      return;
    }

    if (modalMode === 'add') {
      const targetList = modalSchemeType === 'regular' 
        ? regularCategories 
        : modalSchemeType === 'fixed' 
          ? fixedCategories 
          : auctionCategories;
      const nextId = targetList.length > 0 ? Math.max(...targetList.map(c => c.id)) + 1 : 1;
      const newItem = { id: nextId, value: val };
      
      if (modalSchemeType === 'regular') {
        setRegularCategories(prev => [...prev.filter(c => c.value !== val), newItem].sort((a,b) => a.value - b.value));
      } else if (modalSchemeType === 'fixed') {
        setFixedCategories(prev => [...prev.filter(c => c.value !== val), newItem].sort((a,b) => a.value - b.value));
      } else {
        setAuctionCategories(prev => [...prev.filter(c => c.value !== val), newItem].sort((a,b) => a.value - b.value));
      }
      setSelectedCategoryValue(val);
    } else if (modalMode === 'edit' && editingId !== null) {
      if (modalSchemeType === 'regular') {
        setRegularCategories(prev => prev.map(c => c.id === editingId ? { ...c, value: val } : c).sort((a,b) => a.value - b.value));
      } else if (modalSchemeType === 'fixed') {
        setFixedCategories(prev => prev.map(c => c.id === editingId ? { ...c, value: val } : c).sort((a,b) => a.value - b.value));
      } else {
        setAuctionCategories(prev => prev.map(c => c.id === editingId ? { ...c, value: val } : c).sort((a,b) => a.value - b.value));
      }
      setSelectedCategoryValue(val);
    }

    setIsModalOpen(false);
  };

  const handleResetDefaults = () => {
    if (window.confirm('Reset categories to default Jenista Chits standard plans?')) {
      setRegularCategories(defaultRegularCategories);
      setFixedCategories(defaultFixedCategories);
      setAuctionCategories(defaultAuctionCategories);
      setSelectedCategoryValue(100000);
    }
  };

  // Preview calculations inside modal
  const previewValue = parseInt(inputValue, 10) || 100000;
  const previewRegular = calculateRegularPlanSchedule(previewValue);
  const previewFixed = calculateFixedPlanSchedule(previewValue);
  const previewAuction = calculateAuctionPlanSchedule(previewValue);

  // Active category calculation for the table
  const activeRegularDetails = calculateRegularPlanSchedule(selectedCategoryValue);
  const activeFixedDetails = calculateFixedPlanSchedule(selectedCategoryValue);
  const activeAuctionDetails = calculateAuctionPlanSchedule(selectedCategoryValue);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-2xl border border-neutral-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-primary-900 tracking-tight">Manage Plans & Schemes</h1>
            <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-800 text-[11px] font-extrabold uppercase rounded-full">
              Auto-Calculated
            </span>
          </div>
          <p className="text-xs md:text-sm text-neutral-500 mt-1">
            Configure Regular, Fixed, and Auction chit values. Schedules and dues are automatically computed across 20 months.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleResetDefaults}
            className="px-3.5 py-2 text-xs font-semibold text-neutral-600 hover:text-neutral-900 bg-neutral-100 hover:bg-neutral-200 rounded-xl transition-colors"
          >
            Reset Defaults
          </button>
          <button
            onClick={handleOpenAdd}
            className="btn-primary flex items-center text-xs md:text-sm font-bold shadow-md hover:scale-[1.02] transition-all"
          >
            <Plus className="w-4 h-4 mr-1.5" /> Add Category
          </button>
        </div>
      </div>

      {/* Scheme Mode Selector Tabs */}
      <div className="flex border-b border-neutral-200 space-x-2 overflow-x-auto pb-1">
        {/* Regular Plans Tab */}
        <button
          onClick={() => setActiveTab('regular')}
          className={`pb-3 px-5 font-bold text-sm border-b-2 flex items-center shrink-0 transition-all ${
            activeTab === 'regular'
              ? 'border-amber-600 text-amber-900 bg-amber-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Layers className="w-4 h-4 mr-2 text-amber-600" />
          Regular Plans ({regularCategories.length} Categories)
          <span className="ml-2 px-2 py-0.5 text-[10px] bg-amber-100 text-amber-800 font-extrabold rounded-full">
            20 Months • Brochure
          </span>
        </button>

        {/* Fixed Plans Tab */}
        <button
          onClick={() => setActiveTab('fixed')}
          className={`pb-3 px-5 font-bold text-sm border-b-2 flex items-center shrink-0 transition-all ${
            activeTab === 'fixed'
              ? 'border-emerald-700 text-emerald-900 bg-emerald-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Table className="w-4 h-4 mr-2 text-emerald-600" />
          Fixed Plans ({fixedCategories.length} Categories)
          <span className="ml-2 px-2 py-0.5 text-[10px] bg-emerald-100 text-emerald-800 font-extrabold rounded-full">
            20 Months
          </span>
        </button>

        {/* Auction Plans Tab */}
        <button
          onClick={() => setActiveTab('auction')}
          className={`pb-3 px-5 font-bold text-sm border-b-2 flex items-center shrink-0 transition-all ${
            activeTab === 'auction'
              ? 'border-purple-700 text-purple-900 bg-purple-50/30'
              : 'border-transparent text-neutral-500 hover:text-neutral-700'
          }`}
        >
          <Gavel className="w-4 h-4 mr-2 text-purple-600" />
          Auction Plans ({auctionCategories.length} Categories)
          <span className="ml-2 px-2 py-0.5 text-[10px] bg-purple-100 text-purple-900 font-extrabold rounded-full">
            20 Months
          </span>
        </button>
      </div>

      {/* Category Cards with Auto-Calculated Highlights */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {currentCategories.map((cat) => {
          const isSelected = selectedCategoryValue === cat.value;
          const regularCalc = calculateRegularPlanSchedule(cat.value);
          const fixedCalc = calculateFixedPlanSchedule(cat.value);
          const auctionCalc = calculateAuctionPlanSchedule(cat.value);

          return (
            <div
              key={cat.id}
              onClick={() => setSelectedCategoryValue(cat.value)}
              className={`p-5 rounded-2xl border-2 transition-all cursor-pointer relative flex flex-col justify-between ${
                isSelected
                  ? activeTab === 'regular'
                    ? 'border-amber-600 bg-amber-50/40 shadow-md ring-2 ring-amber-600/20'
                    : activeTab === 'fixed'
                      ? 'border-emerald-600 bg-emerald-50/40 shadow-md ring-2 ring-emerald-600/20'
                      : 'border-purple-600 bg-purple-50/40 shadow-md ring-2 ring-purple-600/20'
                  : 'border-neutral-200 bg-white hover:border-neutral-300 hover:shadow-sm'
              }`}
            >
              <div>
                <div className="flex justify-between items-start mb-3">
                  <span className={`text-[10px] uppercase font-black px-2 py-0.5 rounded-full ${
                    activeTab === 'regular' 
                      ? 'bg-amber-600 text-white' 
                      : activeTab === 'fixed' 
                        ? 'bg-emerald-700 text-white' 
                        : 'bg-purple-700 text-white'
                  }`}>
                    20 Months
                  </span>

                  <div className="flex items-center space-x-1" onClick={(e) => e.stopPropagation()}>
                    <button
                      onClick={() => handleOpenEdit(cat)}
                      className="p-1.5 text-neutral-400 hover:text-primary-700 hover:bg-neutral-100 rounded-lg transition-colors"
                      title="Edit Category"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(cat.id)}
                      className="p-1.5 text-neutral-400 hover:text-danger hover:bg-danger/10 rounded-lg transition-colors"
                      title="Delete Category"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                <h3 className="text-2xl font-black text-neutral-900">
                  {formatCurrency(cat.value)}
                </h3>

                {/* Auto calculated stats */}
                <div className="mt-4 pt-3 border-t border-neutral-100 space-y-1.5 text-xs">
                  {activeTab === 'regular' ? (
                    <>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Months 2-8 Due:</span>
                        <strong className="text-amber-900 font-bold">{formatCurrency(regularCalc.minDue)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Total 20M Investment:</span>
                        <strong className="text-neutral-900 font-extrabold">{formatCurrency(regularCalc.totalDue)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Min Payout (M2-8):</span>
                        <strong className="text-neutral-900">{formatCurrency(regularCalc.minPayout)} (70%)</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Month 20 Payout:</span>
                        <strong className="text-emerald-700 font-bold">{formatCurrency(regularCalc.maxPayout)} (95%)</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium pt-1 border-t border-neutral-100/60">
                        <span>Total Dividends:</span>
                        <strong className="text-emerald-700">+{formatCurrency(regularCalc.totalDividends)}</strong>
                      </div>
                    </>
                  ) : activeTab === 'fixed' ? (
                    <>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Monthly Due:</span>
                        <strong className="text-neutral-900">{formatCurrency(fixedCalc.monthlyDue)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Post-Draw Due:</span>
                        <strong className="text-amber-800">{formatCurrency(fixedCalc.postDrawTotalDue)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Month 1 Payout:</span>
                        <strong className="text-neutral-900">{formatCurrency(fixedCalc.minPayout)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Month 20 Payout:</span>
                        <strong className="text-emerald-700">{formatCurrency(fixedCalc.maxPayout)} (+14%)</strong>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Gross Due:</span>
                        <strong className="text-neutral-900">{formatCurrency(auctionCalc.grossDue)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Min Net Due:</span>
                        <strong className="text-purple-900">{formatCurrency(auctionCalc.minNetDue)} (30% bid)</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Total Dividends:</span>
                        <strong className="text-emerald-700">~{formatCurrency(auctionCalc.totalDividends)}</strong>
                      </div>
                      <div className="flex justify-between text-neutral-600 font-medium">
                        <span>Max Payout:</span>
                        <strong className="text-neutral-900">{formatCurrency(auctionCalc.maxPayout)}</strong>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-neutral-100 flex items-center justify-between text-xs">
                <span className={`font-bold ${
                  isSelected 
                    ? activeTab === 'regular' 
                      ? 'text-amber-800' 
                      : activeTab === 'fixed' 
                        ? 'text-emerald-800' 
                        : 'text-purple-800'
                    : 'text-neutral-400'
                }`}>
                  {isSelected ? '● Active in Table' : 'Click to inspect'}
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setViewScheduleValue(cat.value);
                  }}
                  className="flex items-center text-[11px] font-bold text-primary-600 hover:text-primary-800"
                >
                  <Eye className="w-3 h-3 mr-1" /> Full 20M
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Auto-Calculated 20-Month Schedule Table for Selected Plan */}
      <div className="bg-white rounded-2xl shadow-sm border border-neutral-200 overflow-hidden">
        <div className={`px-6 py-4 flex flex-col sm:flex-row justify-between sm:items-center gap-3 text-white ${
          activeTab === 'regular' 
            ? 'bg-amber-900' 
            : activeTab === 'fixed' 
              ? 'bg-emerald-900' 
              : 'bg-purple-950'
        }`}>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-white/10 rounded-xl">
              {activeTab === 'regular' ? (
                <Layers className="w-5 h-5 text-amber-300" />
              ) : activeTab === 'fixed' ? (
                <Table className="w-5 h-5" />
              ) : (
                <Gavel className="w-5 h-5 text-amber-300" />
              )}
            </div>
            <div>
              <h3 className="font-extrabold text-base md:text-lg">
                {activeTab === 'regular' 
                  ? 'Regular Plan Auto-Calculated Schedule' 
                  : activeTab === 'fixed' 
                    ? 'Fixed Plan Auto-Calculated Schedule' 
                    : 'Auction Plan Auto-Calculated Schedule'} • {formatCurrency(selectedCategoryValue)}
              </h3>
              <p className="text-xs text-white/80">
                20 Months • 20 Members • {activeTab === 'regular' ? 'Based on Official Jenista Chits Pamphlet' : 'Generated dynamically from formula'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs px-3 py-1 bg-white/10 rounded-full font-bold">
              Formula: {
                activeTab === 'regular' 
                  ? 'M1: 5% (Company) | M2-8: 3.75% Due, 70% Payout | Total: ₹' + activeRegularDetails.totalDue.toLocaleString('en-IN')
                  : activeTab === 'fixed' 
                    ? 'Payout = Value × (95% + (Month-1)×1%)' 
                    : 'Max 30% Bid Cap + 5% Foreman Comm.'
              }
            </span>
          </div>
        </div>

        {/* Schedule Table */}
        <div className="overflow-x-auto">
          {activeTab === 'regular' ? (
            <table className="min-w-full divide-y divide-neutral-200 text-center text-xs md:text-sm font-sans">
              <thead className="bg-amber-50/70 text-amber-950 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 border-r border-neutral-200 w-24">Month</th>
                  <th className="px-4 py-3 border-r border-neutral-200">Due (₹)</th>
                  <th className="px-4 py-3 border-r border-neutral-200 text-amber-900 bg-amber-100/50">Payment / Payout (₹)</th>
                  <th className="px-4 py-3 border-r border-neutral-200 text-emerald-900 bg-emerald-50/50">Dividend Savings</th>
                  <th className="px-4 py-3">Bid Discount %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                {activeRegularDetails.schedule.map((row) => (
                  <tr key={row.month} className="hover:bg-amber-50/30 transition-colors">
                    <td className="py-2.5 px-4 font-bold bg-neutral-50 border-r border-neutral-200">
                      Month {row.month}
                    </td>
                    <td className="py-2.5 px-4 border-r border-neutral-200 font-bold text-neutral-900">
                      {formatCurrency(row.due)}
                    </td>
                    <td className="py-2.5 px-4 border-r border-neutral-200 font-black">
                      {row.isCompany ? (
                        <span className="px-3 py-1 bg-amber-200 text-amber-900 font-black rounded text-xs inline-block">
                          COMPANY
                        </span>
                      ) : (
                        <span className="text-amber-950 font-extrabold">
                          {formatCurrency(row.payment)}
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 border-r border-neutral-200 text-emerald-800 font-bold bg-emerald-50/20">
                      {row.dividend > 0 ? `+ ${formatCurrency(row.dividend)}` : '—'}
                    </td>
                    <td className="py-2.5 px-4 text-neutral-600">
                      {row.isCompany ? (
                        <span className="text-xs text-neutral-400">Foreman Chit</span>
                      ) : (
                        <span className="text-xs font-bold text-neutral-700">{row.bidDiscountPct}%</span>
                      )}
                    </td>
                  </tr>
                ))}
                
                {/* TOTAL ROW matching the pamphlet */}
                <tr className="bg-amber-100/80 font-black text-amber-950 text-sm border-t-2 border-amber-300">
                  <td className="py-3 px-4 uppercase font-black tracking-wider border-r border-amber-200 bg-amber-200/80">
                    TOTAL
                  </td>
                  <td className="py-3 px-4 border-r border-amber-200 text-amber-950 text-base">
                    {formatCurrency(activeRegularDetails.totalDue)}
                  </td>
                  <td className="py-3 px-4 border-r border-amber-200 text-amber-950 text-base">
                    {formatCurrency(activeRegularDetails.maxPayout)}
                  </td>
                  <td className="py-3 px-4 border-r border-amber-200 text-emerald-800 text-base">
                    + {formatCurrency(activeRegularDetails.totalDividends)}
                  </td>
                  <td className="py-3 px-4 text-amber-900 text-xs font-bold">
                    15.65% Total Savings
                  </td>
                </tr>
              </tbody>
            </table>
          ) : activeTab === 'fixed' ? (
            <table className="min-w-full divide-y divide-neutral-200 text-center text-xs md:text-sm font-sans">
              <thead className="bg-neutral-50 text-neutral-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 border-r border-neutral-200 w-20">Month</th>
                  <th className="px-4 py-3 border-r border-neutral-200">Regular Monthly Due</th>
                  <th className="px-4 py-3 border-r border-neutral-200 text-amber-900 bg-amber-50/50">Post-Draw Due (+1%)</th>
                  <th className="px-4 py-3 text-emerald-900 bg-emerald-50/50">Prize Money / Payout</th>
                  <th className="px-4 py-3">Return %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                {activeFixedDetails.schedule.map((row) => {
                  const returnPct = Math.round(95 + (row.month - 1));
                  return (
                    <tr key={row.month} className="hover:bg-neutral-50/70 transition-colors">
                      <td className="py-2.5 px-4 font-bold bg-neutral-100/60 border-r border-neutral-200">
                        Month {row.month}
                      </td>
                      <td className="py-2.5 px-4 border-r border-neutral-200">
                        {formatCurrency(row.due)}
                      </td>
                      <td className="py-2.5 px-4 border-r border-neutral-200 text-amber-900 font-bold bg-amber-50/20">
                        {formatCurrency(activeFixedDetails.postDrawTotalDue)}
                      </td>
                      <td className="py-2.5 px-4 text-emerald-900 font-black bg-emerald-50/20">
                        {formatCurrency(row.payout)}
                      </td>
                      <td className="py-2.5 px-4">
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                          returnPct >= 100 ? 'bg-emerald-100 text-emerald-800' : 'bg-neutral-100 text-neutral-600'
                        }`}>
                          {returnPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <table className="min-w-full divide-y divide-neutral-200 text-center text-xs md:text-sm font-sans">
              <thead className="bg-neutral-50 text-neutral-700 font-bold uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="px-4 py-3 border-r border-neutral-200 w-20">Month</th>
                  <th className="px-4 py-3 border-r border-neutral-200">Bid Discount %</th>
                  <th className="px-4 py-3 border-r border-neutral-200 text-emerald-800 bg-emerald-50/50">Dividend per Member</th>
                  <th className="px-4 py-3 border-r border-neutral-200 text-purple-900 bg-purple-50/50">Net Monthly Due</th>
                  <th className="px-4 py-3 text-indigo-900 font-bold">Prize Money / Payout</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 font-semibold text-neutral-800">
                {activeAuctionDetails.schedule.map((row) => (
                  <tr key={row.month} className="hover:bg-neutral-50/70 transition-colors">
                    <td className="py-2.5 px-4 font-bold bg-neutral-100/60 border-r border-neutral-200">
                      Month {row.month}
                    </td>
                    <td className="py-2.5 px-4 border-r border-neutral-200 text-neutral-700">
                      {row.discountPct}% ({formatCurrency(row.totalDiscount)})
                    </td>
                    <td className="py-2.5 px-4 border-r border-neutral-200 text-emerald-800 font-bold bg-emerald-50/20">
                      + {formatCurrency(row.dividend)}
                    </td>
                    <td className="py-2.5 px-4 border-r border-neutral-200 text-purple-950 font-black bg-purple-50/20">
                      {formatCurrency(row.netDue)}
                    </td>
                    <td className="py-2.5 px-4 text-indigo-950 font-black">
                      {formatCurrency(row.payout)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        {/* Regular Scheme Official Terms & Conditions (Matching bottom of Image 2) */}
        {activeTab === 'regular' && (
          <div className="p-6 bg-gradient-to-r from-amber-50 via-yellow-50 to-amber-50 border-t border-amber-200">
            <div className="flex items-center gap-2 mb-3">
              <ShieldCheck className="w-5 h-5 text-amber-700" />
              <h4 className="font-black text-amber-950 text-base tracking-wide">
                நிபந்தனைகள் (Terms & Conditions)
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
              {regularPlanTerms.map((term) => (
                <div key={term.id} className="p-3 bg-white/90 rounded-xl border border-amber-200/80 shadow-xs flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center shrink-0 mt-0.5">
                    {term.id}
                  </span>
                  <div>
                    <p className="font-bold text-neutral-900 leading-snug">{term.tamil}</p>
                    <p className="text-neutral-500 mt-1 text-[11px] leading-relaxed">{term.english}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-4 pt-3 border-t border-amber-200/60 flex flex-wrap items-center justify-between text-[11px] text-amber-900 font-medium">
              <span>JENISTA CHITS PVT. LTD. • CIN: U67190TZ2020PTC033361</span>
              <span>Branch: Hosur | Head Office: Thoothukudi | Mob: 70942 95556, 70940 45556</span>
            </div>
          </div>
        )}
      </div>

      {/* Add / Edit Category Modal with LIVE Auto-Calculation Preview */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-neutral-200">
            <div className="p-5 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
              <h3 className="font-bold text-neutral-900 text-lg">
                {modalMode === 'add' ? 'Add New Chit Category' : 'Edit Chit Category'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveModal} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Scheme Type
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setModalSchemeType('regular')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      modalSchemeType === 'regular'
                        ? 'border-amber-600 bg-amber-50 text-amber-900 ring-2 ring-amber-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-amber-600" /> Regular Scheme
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalSchemeType('fixed')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      modalSchemeType === 'fixed'
                        ? 'border-emerald-600 bg-emerald-50 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Table className="w-4 h-4 text-emerald-700" /> Fixed Scheme
                  </button>

                  <button
                    type="button"
                    onClick={() => setModalSchemeType('auction')}
                    className={`py-2 px-3 rounded-xl border text-xs font-bold flex flex-col items-center justify-center gap-1 transition-all ${
                      modalSchemeType === 'auction'
                        ? 'border-purple-600 bg-purple-50 text-purple-900 ring-2 ring-purple-500/20'
                        : 'border-neutral-200 text-neutral-600 hover:bg-neutral-50'
                    }`}
                  >
                    <Gavel className="w-4 h-4 text-purple-700" /> Auction Scheme
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase tracking-wide mb-1.5">
                  Total Chit Value (₹)
                </label>
                <div className="relative">
                  <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-neutral-400 font-bold text-sm">
                    ₹
                  </span>
                  <input
                    type="number"
                    step="10000"
                    min="10000"
                    required
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    placeholder="e.g. 300000"
                    className="w-full pl-8 pr-4 py-2.5 border border-neutral-300 rounded-xl text-base font-bold text-neutral-900 focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
                <p className="text-xs text-neutral-500 mt-1">
                  Formatted Value: <strong className="text-primary-900">{formatCurrency(previewValue)}</strong>
                </p>
              </div>

              {/* Live Auto-Calculation Preview Card */}
              <div className={`p-4 rounded-xl border space-y-3 ${
                modalSchemeType === 'regular' 
                  ? 'bg-amber-50/50 border-amber-200'
                  : modalSchemeType === 'fixed' 
                    ? 'bg-emerald-50/50 border-emerald-200' 
                    : 'bg-purple-50/50 border-purple-200'
              }`}>
                <div className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-neutral-700">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500" /> Live Auto-Calculation Preview (20 Months)
                </div>

                {modalSchemeType === 'regular' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                      <span className="text-neutral-500 block">Due (M2-M8):</span>
                      <strong className="text-amber-900 text-sm">{formatCurrency(previewRegular.minDue)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                      <span className="text-neutral-500 block">Total 20M Due:</span>
                      <strong className="text-neutral-900 text-sm">{formatCurrency(previewRegular.totalDue)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                      <span className="text-neutral-500 block">Payout (M2-8):</span>
                      <strong className="text-neutral-900 text-sm">{formatCurrency(previewRegular.minPayout)} (70%)</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-amber-100">
                      <span className="text-neutral-500 block">Payout (M20):</span>
                      <strong className="text-emerald-700 text-sm">{formatCurrency(previewRegular.maxPayout)} (95%)</strong>
                    </div>
                  </div>
                ) : modalSchemeType === 'fixed' ? (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-neutral-500 block">Monthly Due:</span>
                      <strong className="text-neutral-900 text-sm">{formatCurrency(previewFixed.monthlyDue)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-neutral-500 block">Post-Draw Due (+1%):</span>
                      <strong className="text-amber-800 text-sm">{formatCurrency(previewFixed.postDrawTotalDue)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-neutral-500 block">Month 1 Payout:</span>
                      <strong className="text-neutral-900 text-sm">{formatCurrency(previewFixed.minPayout)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-emerald-100">
                      <span className="text-neutral-500 block">Month 20 Payout:</span>
                      <strong className="text-emerald-700 text-sm">{formatCurrency(previewFixed.maxPayout)} (+14%)</strong>
                    </div>
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <span className="text-neutral-500 block">Gross Due:</span>
                      <strong className="text-neutral-900 text-sm">{formatCurrency(previewAuction.grossDue)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <span className="text-neutral-500 block">Min Net Due (30%):</span>
                      <strong className="text-purple-950 text-sm">{formatCurrency(previewAuction.minNetDue)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <span className="text-neutral-500 block">Est. Dividends:</span>
                      <strong className="text-emerald-700 text-sm">~{formatCurrency(previewAuction.totalDividends)}</strong>
                    </div>
                    <div className="bg-white p-2.5 rounded-lg border border-purple-100">
                      <span className="text-neutral-500 block">Max Payout:</span>
                      <strong className="text-neutral-900 text-sm">{formatCurrency(previewAuction.maxPayout)}</strong>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 border border-neutral-300 rounded-xl text-xs font-semibold text-neutral-700 hover:bg-neutral-100 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2 text-xs font-bold shadow-md"
                >
                  {modalMode === 'add' ? 'Save New Category' : 'Update Category'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Full 20M Schedule Modal for a specific card */}
      {viewScheduleValue !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] overflow-hidden flex flex-col shadow-2xl">
            <div className="p-4 border-b border-neutral-200 flex justify-between items-center bg-neutral-50">
              <div>
                <h3 className="font-bold text-neutral-900 text-base">
                  Complete 20 Months Schedule • {formatCurrency(viewScheduleValue)}
                </h3>
                <p className="text-xs text-neutral-500">
                  {activeTab === 'regular' ? 'Regular Plan (Brochure Standard)' : activeTab === 'fixed' ? 'Fixed Plan' : 'Auction Plan'} • 20 Members
                </p>
              </div>
              <button
                onClick={() => setViewScheduleValue(null)}
                className="w-8 h-8 rounded-full bg-neutral-200 hover:bg-neutral-300 flex items-center justify-center text-neutral-700 font-bold transition-colors"
              >
                ✕
              </button>
            </div>

            <div className="p-4 overflow-y-auto max-h-[70vh]">
              {activeTab === 'regular' ? (
                <table className="min-w-full divide-y divide-neutral-200 text-center text-xs">
                  <thead className="bg-amber-100 font-bold text-amber-950 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Monthly Due</th>
                      <th className="py-2.5 px-3 text-amber-900">Payment / Payout</th>
                      <th className="py-2.5 px-3 text-emerald-800">Dividend Savings</th>
                      <th className="py-2.5 px-3">Bid Discount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-semibold">
                    {calculateRegularPlanSchedule(viewScheduleValue).schedule.map(r => (
                      <tr key={r.month} className="hover:bg-amber-50/40">
                        <td className="py-2 px-3 font-bold">Month {r.month}</td>
                        <td className="py-2 px-3 font-bold">{formatCurrency(r.due)}</td>
                        <td className="py-2 px-3">
                          {r.isCompany ? (
                            <span className="px-2 py-0.5 bg-amber-200 text-amber-900 rounded font-black text-[11px]">
                              COMPANY
                            </span>
                          ) : (
                            <span className="font-black text-amber-950">{formatCurrency(r.payment)}</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-emerald-800 font-bold">
                          {r.dividend > 0 ? `+${formatCurrency(r.dividend)}` : '—'}
                        </td>
                        <td className="py-2 px-3 text-neutral-600">
                          {r.isCompany ? 'Foreman' : `${r.bidDiscountPct}%`}
                        </td>
                      </tr>
                    ))}
                    {/* Modal Total Row */}
                    <tr className="bg-amber-100 font-black text-amber-950 border-t-2 border-amber-300">
                      <td className="py-2.5 px-3 uppercase">TOTAL</td>
                      <td className="py-2.5 px-3">{formatCurrency(calculateRegularPlanSchedule(viewScheduleValue).totalDue)}</td>
                      <td className="py-2.5 px-3">{formatCurrency(calculateRegularPlanSchedule(viewScheduleValue).maxPayout)}</td>
                      <td className="py-2.5 px-3 text-emerald-800">+{formatCurrency(calculateRegularPlanSchedule(viewScheduleValue).totalDividends)}</td>
                      <td className="py-2.5 px-3 text-xs">84.35% Due</td>
                    </tr>
                  </tbody>
                </table>
              ) : activeTab === 'fixed' ? (
                <table className="min-w-full divide-y divide-neutral-200 text-center text-xs">
                  <thead className="bg-neutral-100 font-bold text-neutral-700 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Monthly Due</th>
                      <th className="py-2.5 px-3 text-amber-800">Post-Draw Due (+1%)</th>
                      <th className="py-2.5 px-3 text-emerald-800">Prize Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-semibold">
                    {calculateFixedPlanSchedule(viewScheduleValue).schedule.map(r => (
                      <tr key={r.month} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-bold">Month {r.month}</td>
                        <td className="py-2 px-3">{formatCurrency(r.due)}</td>
                        <td className="py-2 px-3 text-amber-900 font-bold">{formatCurrency(r.due + Math.round(viewScheduleValue * 0.01))}</td>
                        <td className="py-2 px-3 text-emerald-900 font-black">{formatCurrency(r.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <table className="min-w-full divide-y divide-neutral-200 text-center text-xs">
                  <thead className="bg-neutral-100 font-bold text-neutral-700 uppercase">
                    <tr>
                      <th className="py-2.5 px-3">Month</th>
                      <th className="py-2.5 px-3">Bid %</th>
                      <th className="py-2.5 px-3 text-emerald-800">Dividend</th>
                      <th className="py-2.5 px-3 text-purple-900">Net Due</th>
                      <th className="py-2.5 px-3 text-indigo-900">Prize Payout</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-100 font-semibold">
                    {calculateAuctionPlanSchedule(viewScheduleValue).schedule.map(r => (
                      <tr key={r.month} className="hover:bg-neutral-50">
                        <td className="py-2 px-3 font-bold">Month {r.month}</td>
                        <td className="py-2 px-3">{r.discountPct}%</td>
                        <td className="py-2 px-3 text-emerald-800 font-bold">+{formatCurrency(r.dividend)}</td>
                        <td className="py-2 px-3 text-purple-900 font-black">{formatCurrency(r.netDue)}</td>
                        <td className="py-2 px-3 text-indigo-900 font-black">{formatCurrency(r.payout)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="p-3 bg-neutral-50 border-t border-neutral-200 flex justify-end">
              <button
                onClick={() => setViewScheduleValue(null)}
                className="px-4 py-2 bg-neutral-200 hover:bg-neutral-300 text-neutral-800 text-xs font-bold rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
