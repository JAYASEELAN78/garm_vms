import { useState, useEffect } from 'react';
import {
    PieChart, Pie, Cell,
    BarChart, Bar,
    AreaChart, Area,
    XAxis, YAxis, CartesianGrid,
    Tooltip as RechartsTooltip,
    ResponsiveContainer, Legend
} from 'recharts';
import {
    TrendingUp, Download, ShoppingCart, CheckCircle,
    Clock, Package, Users, FileText, Truck
} from 'lucide-react';
import api from '../services/api';
import toast from 'react-hot-toast';

const STATUS_COLORS = {
    Pending: '#f59e0b',
    Processing: '#3b82f6',
    'In Production': '#8b5cf6',
    'Quality Check': '#06b6d4',
    Completed: '#10b981',
    Dispatched: '#6366f1',
    Delivered: '#22c55e',
    Cancelled: '#ef4444'
};
const CHART_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ef4444', '#06b6d4', '#6366f1', '#22c55e'];

const StatCard = ({ icon: Icon, label, value, subtext, color }) => (
    <div className={`bg-white rounded-xl border border-gray-100 p-5 shadow-sm flex items-center gap-4`}>
        <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
            <Icon className="w-6 h-6 text-white" />
        </div>
        <div>
            <p className="text-sm text-gray-500">{label}</p>
            <p className="text-2xl font-bold text-gray-800">{value}</p>
            {subtext && <p className="text-xs text-gray-400 mt-0.5">{subtext}</p>}
        </div>
    </div>
);

const ReportsPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [dateRange, setDateRange] = useState('all');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const { data } = await api.get('/api/orders');
                setOrders(Array.isArray(data) ? data : []);
            } catch {
                toast.error('Failed to load report data');
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, []);

    // Filter by date range
    const filtered = orders.filter(o => {
        if (dateRange === 'all') return true;
        const created = new Date(o.createdAt);
        const now = new Date();
        if (dateRange === '7d') return (now - created) <= 7 * 86400000;
        if (dateRange === '30d') return (now - created) <= 30 * 86400000;
        if (dateRange === '90d') return (now - created) <= 90 * 86400000;
        return true;
    });

    // Stat computations
    const total = filtered.length;
    const delivered = filtered.filter(o => o.status === 'Delivered').length;
    const pending = filtered.filter(o => o.status === 'Pending').length;
    const inProd = filtered.filter(o => ['Processing', 'In Production', 'Quality Check'].includes(o.status)).length;
    const dispatched = filtered.filter(o => o.status === 'Dispatched').length;

    // Status distribution for Pie
    const statusCounts = {};
    filtered.forEach(o => {
        statusCounts[o.status || 'Unknown'] = (statusCounts[o.status || 'Unknown'] || 0) + 1;
    });
    const pieData = Object.entries(statusCounts).map(([name, value]) => ({ name, value }));

    // Priority distribution for Bar
    const priorityCounts = {};
    filtered.forEach(o => {
        priorityCounts[o.priority || 'Normal'] = (priorityCounts[o.priority || 'Normal'] || 0) + 1;
    });
    const barData = Object.entries(priorityCounts).map(([name, value]) => ({ name, value }));

    // Monthly orders trend (last 6 months)
    const monthlyMap = {};
    const now = new Date();
    for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = d.toLocaleString('default', { month: 'short' });
        monthlyMap[key] = 0;
    }
    filtered.forEach(o => {
        const d = new Date(o.createdAt);
        const key = d.toLocaleString('default', { month: 'short' });
        if (monthlyMap[key] !== undefined) monthlyMap[key]++;
    });
    const trendData = Object.entries(monthlyMap).map(([month, orders]) => ({ month, orders }));

    const handleExport = () => {
        const rows = [
            ['Order ID', 'Product', 'Quantity', 'Unit', 'Status', 'Priority', 'Delivery Date', 'Created'],
            ...filtered.map(o => [
                o.order_id, o.product_name, o.quantity, o.unit,
                o.status, o.priority,
                o.delivery_date ? new Date(o.delivery_date).toLocaleDateString() : '',
                new Date(o.createdAt).toLocaleDateString()
            ])
        ];
        const csv = rows.map(r => r.map(c => `"${c ?? ''}"`).join(',')).join('\n');
        const blob = new Blob([csv], { type: 'text/csv' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `VMS_GARMENTS_Report_${new Date().toISOString().slice(0, 10)}.csv`;
        a.click();
        URL.revokeObjectURL(url);
        toast.success('Report exported!');
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <TrendingUp className="w-6 h-6 text-indigo-600" /> Analytics & Reports
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Comprehensive view of business performance.</p>
                </div>
                <div className="flex items-center gap-3">
                    <select
                        value={dateRange}
                        onChange={e => setDateRange(e.target.value)}
                        className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                        <option value="all">All Time</option>
                        <option value="7d">Last 7 Days</option>
                        <option value="30d">Last 30 Days</option>
                        <option value="90d">Last 90 Days</option>
                    </select>
                    <button onClick={handleExport} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
                        <Download className="w-4 h-4" /> Export CSV
                    </button>
                </div>
            </div>

            {loading ? (
                <div className="p-16 text-center text-gray-400">
                    <div className="w-8 h-8 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    Loading report data...
                </div>
            ) : (
                <>
                    {/* Stat Cards */}
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                        <StatCard icon={ShoppingCart} label="Total Orders" value={total} subtext="In selected period" color="bg-blue-500" />
                        <StatCard icon={CheckCircle} label="Delivered" value={delivered} subtext={`${total ? Math.round(delivered / total * 100) : 0}% completion rate`} color="bg-emerald-500" />
                        <StatCard icon={Clock} label="Pending" value={pending} subtext="Awaiting processing" color="bg-amber-500" />
                        <StatCard icon={Package} label="In Production" value={inProd} subtext="Active production" color="bg-purple-500" />
                        <StatCard icon={Truck} label="Dispatched" value={dispatched} subtext="En route to delivery" color="bg-indigo-500" />
                    </div>

                    {/* Charts Row */}
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                        {/* Pie Chart - Order Status */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-base font-semibold text-gray-800 mb-1">Order Status Distribution</h2>
                            <p className="text-xs text-gray-400 mb-4">Breakdown of all orders by status</p>
                            {pieData.length === 0 ? (
                                <div className="h-64 flex items-center justify-center text-gray-400 text-sm">No data to display</div>
                            ) : (
                                <>
                                    <div className="h-60">
                                        <ResponsiveContainer width="100%" height="100%">
                                            <PieChart>
                                                <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={4} dataKey="value">
                                                    {pieData.map((entry, i) => (
                                                        <Cell key={i} fill={STATUS_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length]} />
                                                    ))}
                                                </Pie>
                                                <RechartsTooltip />
                                            </PieChart>
                                        </ResponsiveContainer>
                                    </div>
                                    <div className="flex flex-wrap gap-3 justify-center mt-2">
                                        {pieData.map((entry, i) => (
                                            <div key={entry.name} className="flex items-center gap-1.5 text-xs text-gray-600">
                                                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: STATUS_COLORS[entry.name] || CHART_COLORS[i % CHART_COLORS.length] }} />
                                                {entry.name} ({entry.value})
                                            </div>
                                        ))}
                                    </div>
                                </>
                            )}
                        </div>

                        {/* Bar Chart - Priority */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6">
                            <h2 className="text-base font-semibold text-gray-800 mb-1">Orders by Priority</h2>
                            <p className="text-xs text-gray-400 mb-4">Distribution of order urgency levels</p>
                            <div className="h-72">
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={barData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }} barSize={48}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                                        <RechartsTooltip cursor={{ fill: '#f9fafb' }} />
                                        <Bar dataKey="value" name="Orders" radius={[6, 6, 0, 0]}>
                                            {barData.map((entry, i) => (
                                                <Cell key={i} fill={CHART_COLORS[i % CHART_COLORS.length]} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Area Chart - Monthly Trend */}
                        <div className="bg-white rounded-xl border border-gray-100 shadow-sm p-6 lg:col-span-2">
                            <h2 className="text-base font-semibold text-gray-800 mb-1">Monthly Order Trend</h2>
                            <p className="text-xs text-gray-400 mb-4">Number of orders placed over the last 6 months</p>
                            <div className="h-64">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={trendData} margin={{ top: 5, right: 20, left: 0, bottom: 5 }}>
                                        <defs>
                                            <linearGradient id="colorOrders" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
                                        <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} />
                                        <YAxis axisLine={false} tickLine={false} tick={{ fill: '#6b7280', fontSize: 12 }} allowDecimals={false} />
                                        <RechartsTooltip />
                                        <Area type="monotone" dataKey="orders" stroke="#6366f1" strokeWidth={2.5} fill="url(#colorOrders)" dot={{ r: 4, fill: '#6366f1' }} activeDot={{ r: 6 }} />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    </div>

                    {/* Order Summary Table */}
                    <div className="bg-white rounded-xl border border-gray-100 shadow-sm overflow-hidden">
                        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                            <div>
                                <h2 className="text-base font-semibold text-gray-800 flex items-center gap-2">
                                    <FileText className="w-4 h-4 text-indigo-500" /> Order Summary Table
                                </h2>
                                <p className="text-xs text-gray-400 mt-0.5">{filtered.length} orders in selected period</p>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="bg-gray-50">
                                    <tr>
                                        {['Order ID', 'Product', 'Qty', 'Status', 'Priority', 'Delivery Date', 'Created'].map(h => (
                                            <th key={h} className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-gray-50">
                                    {filtered.slice(0, 20).map(o => (
                                        <tr key={o._id} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-4 py-3 font-mono text-xs text-gray-500">{o.order_id}</td>
                                            <td className="px-4 py-3 font-medium text-gray-800">{o.product_name}</td>
                                            <td className="px-4 py-3 text-gray-600">{o.quantity} {o.unit}</td>
                                            <td className="px-4 py-3">
                                                <span className="px-2.5 py-1 rounded-full text-xs font-semibold"
                                                    style={{ backgroundColor: `${STATUS_COLORS[o.status] || '#6b7280'}20`, color: STATUS_COLORS[o.status] || '#6b7280' }}>
                                                    {o.status}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className={`text-xs font-semibold uppercase ${o.priority === 'urgent' ? 'text-red-600' : o.priority === 'high' ? 'text-orange-500' : 'text-gray-500'}`}>
                                                    {o.priority || '—'}
                                                </span>
                                            </td>
                                            <td className="px-4 py-3 text-gray-600">{o.delivery_date ? new Date(o.delivery_date).toLocaleDateString() : '—'}</td>
                                            <td className="px-4 py-3 text-gray-400 text-xs">{new Date(o.createdAt).toLocaleDateString()}</td>
                                        </tr>
                                    ))}
                                    {filtered.length === 0 && (
                                        <tr><td colSpan="7" className="px-4 py-12 text-center text-gray-400">No orders found in selected period.</td></tr>
                                    )}
                                </tbody>
                            </table>
                            {filtered.length > 20 && (
                                <p className="text-center text-xs text-gray-400 py-3 border-t border-gray-50">
                                    Showing 20 of {filtered.length} orders. Export CSV to see all.
                                </p>
                            )}
                        </div>
                    </div>
                </>
            )}
        </div>
    );
};

export default ReportsPage;
