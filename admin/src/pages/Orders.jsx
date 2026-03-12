import { useState, useEffect } from 'react';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { Table, TableHead, TableHeader, TableBody, TableRow, TableCell } from '../components/ui/Table';
import { ShoppingCart, Search, Filter, Eye, Edit2, Trash2 } from 'lucide-react';
import api from '../services/api';
import StatusBadge from '../components/ui/StatusBadge';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';

const OrdersPage = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const navigate = useNavigate();

    useEffect(() => {
        const fetchOrders = async () => {
            try {
                const { data } = await api.get('/api/orders');
                setOrders(data);
            } catch (error) {
                console.error('Failed to load orders', error);
            } finally {
                // Set loading false only on initial render
                setLoading(false);
            }
        };
        fetchOrders();

        const intervalId = setInterval(fetchOrders, 10000);
        return () => clearInterval(intervalId);
    }, []);

    const handleDelete = async (id) => {
        if (!window.confirm('Are you sure you want to delete this order?')) return;
        try {
            await api.delete(`/api/orders/${id}`);
            setOrders(prev => prev.filter(o => o._id !== id));
            toast.success('Order deleted.');
        } catch {
            toast.error('Failed to delete order.');
        }
    };

    const filteredOrders = orders.filter(o =>
        o.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        o.product_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (o.company_id?.name || o.user_id?.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <ShoppingCart className="w-6 h-6 text-blue-600" /> Orders Management
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">Track and manage all job work orders.</p>
                </div>
            </div>

            <Card>
                <CardHeader
                    title="Recent Orders"
                    action={
                        <div className="flex gap-3">
                            <div className="relative">
                                <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                                <input
                                    type="text"
                                    placeholder="Search orders..."
                                    value={searchTerm}
                                    onChange={(e) => setSearchTerm(e.target.value)}
                                    className="pl-9 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-blue-500 w-64"
                                />
                            </div>
                            <button className="btn-secondary">
                                <Filter className="w-4 h-4" /> Filter
                            </button>
                        </div>
                    }
                />
                <CardContent className="p-0">
                    {loading ? (
                        <div className="p-8 text-center text-gray-500">Loading orders...</div>
                    ) : (
                        <Table>
                            <TableHead>
                                <TableHeader>Order ID</TableHeader>
                                <TableHeader>Client</TableHeader>
                                <TableHeader>Product</TableHeader>
                                <TableHeader>Date</TableHeader>
                                <TableHeader>Status</TableHeader>
                                <TableHeader>Action</TableHeader>
                            </TableHead>
                            <TableBody>
                                {filteredOrders.length === 0 ? (
                                    <TableRow>
                                        <TableCell colSpan="6" className="text-center text-gray-500 py-8">
                                            No orders found.
                                        </TableCell>
                                    </TableRow>
                                ) : filteredOrders.map((order) => (
                                    <TableRow key={order._id}>
                                        <TableCell>
                                            <span className="font-semibold text-gray-900">{order.order_id}</span>
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm font-medium text-gray-900">
                                                {order.company_id?.name || order.user_id?.name || 'Unknown Client'}
                                            </div>
                                            {order.user_id?.name && order.company_id?.name && (
                                                <div className="text-xs text-gray-500">{order.user_id.name}</div>
                                            )}
                                        </TableCell>
                                        <TableCell>
                                            <div className="text-sm text-gray-900">{order.product_name}</div>
                                            <div className="text-xs text-gray-500">{order.quantity} {order.unit || 'pcs'}</div>
                                        </TableCell>
                                        <TableCell className="text-sm text-gray-500">
                                            {new Date(order.order_date).toLocaleDateString()}
                                        </TableCell>
                                        <TableCell>
                                            <StatusBadge status={order.status} />
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    title="View Details"
                                                    onClick={() => navigate(`/orders/${order._id}`)}
                                                    className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                                >
                                                    <Eye className="w-4 h-4" />
                                                </button>
                                                <button
                                                    title="Edit Order"
                                                    onClick={() => navigate(`/orders/${order._id}`)}
                                                    className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                                                >
                                                    <Edit2 className="w-4 h-4" />
                                                </button>
                                                <button
                                                    title="Delete Order"
                                                    onClick={() => handleDelete(order._id)}
                                                    className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    )}
                </CardContent>
            </Card>
        </div>
    );
};

export default OrdersPage;
