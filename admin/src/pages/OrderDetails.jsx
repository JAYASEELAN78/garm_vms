import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Card, CardHeader, CardContent } from '../components/ui/Card';
import { ArrowLeft, Box, Calendar, DollarSign, FileText, MessageSquare, Send, User, Truck } from 'lucide-react';
import StatusBadge from '../components/ui/StatusBadge';
import api from '../services/api';
import toast from 'react-hot-toast';

const WORKFLOW_STEPS = [
    'Pending', 'Payment Confirmation', 'Material Received', 'Processing', 'Quality Check', 'Completed', 'Dispatched', 'Delivered'
];

const OrderTimeline = ({ currentStatus }) => {
    // Rough mapping to handle legacy/mismatched statuses
    const currentIndex = Math.max(0, WORKFLOW_STEPS.indexOf(currentStatus));

    return (
        <div className="py-6">
            <div className="relative flex justify-between">
                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-full h-1 bg-gray-200"></div>
                <div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-1 bg-blue-600 transition-all duration-500"
                    style={{ width: `${(currentIndex / (WORKFLOW_STEPS.length - 1)) * 100}%` }}
                ></div>

                {WORKFLOW_STEPS.map((step, index) => {
                    const isCompleted = index <= currentIndex;
                    const isActive = index === currentIndex;

                    return (
                        <div key={step} className="relative z-10 flex flex-col items-center">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 transition-colors ${isActive ? 'bg-blue-600 border-blue-600 text-white ring-4 ring-blue-100' :
                                isCompleted ? 'bg-blue-600 border-blue-600 text-white' : 'bg-white border-gray-300 text-gray-400'
                                }`}>
                                {index + 1}
                            </div>
                            <span className={`mt-2 text-xs font-medium max-w-[80px] text-center ${isActive ? 'text-blue-700' : isCompleted ? 'text-gray-800' : 'text-gray-400'
                                }`}>
                                {step}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};

const OrderDetailsPage = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [order, setOrder] = useState(null);
    const [loading, setLoading] = useState(true);
    const [updating, setUpdating] = useState(false);
    const [messages, setMessages] = useState([]);
    const [replyText, setReplyText] = useState('');
    const [selectedStatus, setSelectedStatus] = useState('');

    useEffect(() => {
        const fetchOrder = async () => {
            try {
                // Assume API supports getting single order by ID or we filter
                const { data } = await api.get(`/api/orders`);
                const found = data.find(o => o._id === id);
                if (found) {
                    setOrder(found);
                    setSelectedStatus(found.status);
                }
            } catch (error) {
                toast.error('Failed to load order details');
            } finally {
                setLoading(false);
            }
        };
        fetchOrder();
    }, [id]);

    const fetchMessages = async () => {
        try {
            const { data: msgs } = await api.get('/api/messages');
            const orderMsgs = msgs.filter(m => {
                const oid = m.order_id?._id?.toString() || m.order_id?.toString();
                return oid === id;
            });
            setMessages(orderMsgs.reverse());
        } catch (err) { console.error('Message fetch error:', err); }
    };

    useEffect(() => {
        fetchMessages();
        const interval = setInterval(fetchMessages, 5000); // poll every 5s
        return () => clearInterval(interval);
    }, [id]);

    const handleSendReply = async (e) => {
        e.preventDefault();
        if (!replyText.trim()) return;

        const clientId = order.user_id?._id || order.user_id || 
                         messages.find(m => m.sender === 'client')?.client_id?._id || 
                         messages.find(m => m.sender === 'client')?.client_id;

        if (!clientId) {
            return toast.error('Could not identify client ID');
        }

        try {
            const { data } = await api.post('/api/messages/reply', {
                client_id: clientId,
                order_id: id,
                message: replyText
            });
            setMessages(prev => [data, ...prev]);
            setReplyText('');
            toast.success('Message sent to client!');
        } catch (err) { 
            console.error('Send error:', err);
            toast.error('Failed to send'); 
        }
    };

    const handleUpdateStatus = async (newStatus) => {
        if (newStatus !== 'Pending' && newStatus !== 'Cancelled' &&
            order.priceStatus !== 'Confirmed' && order.priceStatus !== 'Finalized') {
            return toast.error('Client must accept the quoted price first.');
        }

        setUpdating(true);
        try {
            await api.put(`/api/orders/${id}`, { status: newStatus });
            setOrder({ ...order, status: newStatus });
            toast.success(`Order status updated to ${newStatus}`);
        } catch (error) {
            toast.error('Failed to update status');
        } finally {
            setUpdating(false);
        }
    };

    if (loading) return <div className="p-8">Loading details...</div>;
    if (!order) return <div className="p-8 text-red-500">Order not found</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center gap-4">
                <button onClick={() => navigate('/orders')} className="p-2 hover:bg-gray-200 rounded-full transition-colors text-gray-600">
                    <ArrowLeft className="w-5 h-5" />
                </button>
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-3">
                        Order {order.order_id} <StatusBadge status={order.status} />
                    </h1>
                    <p className="text-sm text-gray-500 mt-1">From: {order.company_id?.name || 'Unknown Client'}</p>
                </div>
            </div>

            <Card>
                <CardHeader title="Order Workflow Timeline" />
                <CardContent>
                    <OrderTimeline currentStatus={order.status} />

                    <div className="mt-8 flex justify-end gap-3 border-t border-gray-100 pt-6">
                        <span className="text-gray-400 text-sm self-center">Status Update:</span>
                        <select
                            className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none"
                            onChange={(e) => setSelectedStatus(e.target.value)}
                            value={selectedStatus}
                            disabled={updating}
                        >
                            {WORKFLOW_STEPS.map((s, idx) => {
                                const currentIdx = WORKFLOW_STEPS.indexOf(order.status);
                                // Only allow current and forward statuses (no reverting)
                                if (idx < currentIdx) return null;
                                const isDisabled = (s !== 'Pending' && s !== 'Cancelled' && 
                                                 order.priceStatus !== 'Confirmed' && 
                                                 order.priceStatus !== 'Finalized');
                                return (
                                    <option key={s} value={s} disabled={isDisabled}>
                                        {s} {isDisabled ? '(Requires Price Confirmation)' : ''}
                                    </option>
                                );
                            })}
                        </select>
                        <button 
                            disabled={updating} 
                            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-semibold transition-colors disabled:opacity-50"
                            onClick={() => handleUpdateStatus(selectedStatus)}
                        >
                            Update
                        </button>
                    </div>
                </CardContent>
            </Card>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <Card>
                    <CardHeader title="Product Specs" />
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Box className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Product Name</p>
                                <p className="font-semibold text-gray-900">{order.product_name}</p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <FileText className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Quantity</p>
                                <p className="font-semibold text-gray-900">{order.quantity} {order.unit || 'pcs'}</p>
                            </div>
                        </div>
                        {order.description && (
                            <div className="mt-4 p-4 bg-gray-50 rounded-lg text-sm text-gray-700">
                                <span className="font-semibold">Description: </span> {order.description}
                            </div>
                        )}
                    </CardContent>
                </Card>

                <Card>
                    <CardHeader title="Order Information" />
                    <CardContent className="space-y-4">
                        <div className="flex items-start gap-3">
                            <Calendar className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div>
                                <p className="text-sm text-gray-500">Order Date / Delivery Date</p>
                                <p className="font-semibold text-gray-900">
                                    {new Date(order.order_date).toLocaleDateString()} / {order.delivery_date ? new Date(order.delivery_date).toLocaleDateString() : 'TBD'}
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3">
                            <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                            <div className="w-full">
                                <p className="text-sm text-gray-500">Estimated Cost & Price Status</p>

                                <div className="mt-2 flex items-center justify-between">
                                    <span className={`px-2.5 py-1 text-xs font-bold uppercase rounded-md border ${order.priceStatus === 'Confirmed' ? 'bg-green-100 text-green-700 border-green-200' :
                                        order.priceStatus === 'Quoted' ? 'bg-amber-100 text-amber-700 border-amber-200' :
                                            'bg-gray-100 text-gray-500 border-gray-200'
                                        }`}>
                                        {order.priceStatus}
                                    </span>
                                </div>

                                {order.priceStatus !== 'Confirmed' && order.priceStatus !== 'Finalized' ? (
                                    <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-lg">
                                        <p className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Quote Client</p>
                                        <div className="flex gap-2">
                                            <div className="relative flex-1">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                                <input
                                                    type="number"
                                                    className="w-full pl-7 pr-3 py-2 border border-gray-300 rounded-md text-sm outline-none focus:border-blue-500"
                                                    placeholder="Enter cost"
                                                    defaultValue={order.estimatedCost || ''}
                                                    id="quote-input"
                                                />
                                            </div>
                                            <button
                                                onClick={async () => {
                                                    const val = document.getElementById('quote-input').value;
                                                    if (!val) return toast.error('Enter a valid amount');
                                                    setUpdating(true);
                                                    try {
                                                        await api.put(`/api/orders/${order._id}`, { estimatedCost: Number(val), priceStatus: 'Quoted' });
                                                        setOrder({ ...order, estimatedCost: Number(val), priceStatus: 'Quoted' });
                                                        toast.success('Quote sent to client!');
                                                    } catch (e) { toast.error('Failed to send quote'); }
                                                    finally { setUpdating(false); }
                                                }}
                                                disabled={updating}
                                                className="bg-blue-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
                                            >
                                                Send Quote
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="font-semibold text-gray-900 mt-2 text-lg">
                                        ₹{order.estimatedCost?.toLocaleString()}
                                    </p>
                                )}
                            </div>
                        </div>
                        {(order.status === 'Dispatched' || order.status === 'Delivered') && (
                            <div className="flex items-start gap-3 mt-6 pt-4 border-t border-gray-100">
                                <DollarSign className="w-5 h-5 text-gray-400 mt-0.5" />
                                <div className="w-full">
                                    <p className="text-sm text-gray-500">Final Cost & Payment Status</p>

                                    <div className="mt-2 flex items-center justify-between">
                                        <div className="mt-1"><StatusBadge status={order.payment_status || 'Pending'} /></div>
                                    </div>

                                    {order.priceStatus !== 'Finalized' && order.payment_status !== 'Paid' ? (
                                        <div className="mt-4 p-4 bg-red-50 border border-red-100 rounded-lg">
                                            <p className="text-xs font-bold text-red-600 uppercase tracking-wider mb-2">Finalize Payment Amount</p>
                                            <div className="flex gap-2">
                                                <div className="relative flex-1">
                                                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">₹</span>
                                                    <input
                                                        type="number"
                                                        className="w-full pl-7 pr-3 py-2 border border-red-200 rounded-md text-sm outline-none focus:border-red-500"
                                                        placeholder="Final amount"
                                                        defaultValue={order.finalCost || order.estimatedCost || ''}
                                                        id="final-cost-input"
                                                    />
                                                </div>
                                                <button
                                                    onClick={async () => {
                                                        const val = document.getElementById('final-cost-input').value;
                                                        if (!val) return toast.error('Enter a valid amount');
                                                        setUpdating(true);
                                                        try {
                                                            await api.put(`/api/orders/${order._id}`, { finalCost: Number(val), priceStatus: 'Finalized' });
                                                            setOrder({ ...order, finalCost: Number(val), priceStatus: 'Finalized' });
                                                            toast.success('Final payment amount confirmed!');
                                                        } catch (e) { toast.error('Failed to finalize payment'); }
                                                        finally { setUpdating(false); }
                                                    }}
                                                    disabled={updating}
                                                    className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50"
                                                >
                                                    Finalize
                                                </button>
                                            </div>
                                        </div>
                                    ) : (
                                        <p className="font-semibold text-gray-900 mt-2 text-lg">
                                            Final: ₹{order.finalCost?.toLocaleString()}
                                        </p>
                                    )}
                                </div>
                            </div>
                        )}
                    </CardContent>
                </Card>

                {/* Messages Section */}
                <Card>
                    <CardHeader 
                        title="Direct Messages" 
                        subtitle="Communicate with the client about this order"
                        icon={<MessageSquare className="w-5 h-5 text-indigo-600" />}
                    />
                    <CardContent>
                        <div className="space-y-3 max-h-60 overflow-y-auto mb-4 pr-1">
                            {messages.length > 0 ? messages.map((msg, i) => (
                                <div key={i} className={`p-3 rounded-xl max-w-[90%] border ${msg.sender === 'admin' ? 'ml-auto bg-blue-50 border-blue-100' : 'bg-gray-50 border-gray-200'}`}>
                                    <div className="flex items-center gap-2 mb-1">
                                        <div className={`w-5 h-5 rounded-full flex items-center justify-center ${msg.sender === 'admin' ? 'bg-blue-200' : 'bg-orange-100'}`}>
                                            <User className="w-3 h-3 text-gray-600" />
                                        </div>
                                        <span className="text-xs font-semibold text-gray-600">{msg.sender === 'admin' ? 'You (Admin)' : 'Client'}</span>
                                        <span className="text-[10px] text-gray-400">{new Date(msg.createdAt).toLocaleString()}</span>
                                    </div>
                                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{msg.message}</p>
                                </div>
                            )) : <p className="text-gray-400 text-sm text-center py-4">No messages yet. Send a message to start the negotiation!</p>}
                        </div>
                        <form onSubmit={handleSendReply} className="flex gap-3">
                            <input 
                                type="text" 
                                value={replyText} 
                                onChange={(e) => setReplyText(e.target.value)} 
                                className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500" 
                                placeholder="Type your reply to client..." 
                            />
                            <button type="submit" className="bg-blue-600 hover:bg-blue-700 text-white p-2 rounded-lg transition-colors">
                                <Send className="w-5 h-5" />
                            </button>
                        </form>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default OrderDetailsPage;
