import mongoose from 'mongoose';
import Order from '../models/Order.js';
import User from '../models/User.js';
import { sendOrderStatusUpdateEmail } from '../services/emailService.js';

export const createOrder = async (req, res) => {
    try {
        // Handle fields from both the React Client app and the web app
        const { productName, product_name, quantity, unit, description, deliveryDate, delivery_date, priority, estimatedCost } = req.body;

        const generatedOrderId = `ORD-${Date.now()}`;

        const orderData = {
            order_id: req.body.order_id || generatedOrderId,
            user_id: req.user?._id, // Set by protect middleware
            product_name: productName || product_name,
            quantity: quantity,
            unit,
            description,
            delivery_date: deliveryDate || delivery_date,
            priority,
            estimatedCost,
            designFile: req.file ? `/uploads/${req.file.filename}` : undefined
        };

        const order = new Order({ ...req.body, ...orderData });
        await order.save();
        res.status(201).json(order);
    } catch (err) {
        res.status(400).json({ error: err.message });
    }
};

export const getOrders = async (req, res) => {
    try {
        let query = {};
        if (req.user.role !== 'admin') {
            query.user_id = req.user._id;
        }

        const orders = await Order.find(query)
            .populate('company_id')
            .populate('user_id', 'name email')
            .sort({ createdAt: -1 });
        res.json(orders);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const getOrderById = async (req, res) => {
    try {
        const order = await Order.findById(req.params.id)
            .populate('company_id')
            .populate('user_id', 'name email');
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json(order);
    } catch (err) { res.status(500).json({ error: err.message }); }
};

export const updateOrder = async (req, res) => {
    try {
        const { status } = req.body;
        const currentOrder = await Order.findById(req.params.id);
        
        if (!currentOrder) {
            return res.status(404).json({ error: 'Order not found' });
        }

        const WORKFLOW = ['Pending', 'Payment Confirmation', 'Material Received', 'Processing', 'Quality Check', 'Completed', 'Dispatched', 'Delivered'];

        // Restriction: Prevent reverting to a previous status
        if (status && WORKFLOW.includes(status) && WORKFLOW.includes(currentOrder.status)) {
            const newIdx = WORKFLOW.indexOf(status);
            const currentIdx = WORKFLOW.indexOf(currentOrder.status);
            if (newIdx < currentIdx) {
                return res.status(400).json({ 
                    error: `Cannot revert status from '${currentOrder.status}' to '${status}'. Status can only move forward.` 
                });
            }
        }

        // Restriction: Only allow status change from Pending to others if price is confirmed/finalized
        if (status && status !== 'Pending' && status !== 'Cancelled' && 
            currentOrder.priceStatus !== 'Confirmed' && currentOrder.priceStatus !== 'Finalized') {
            return res.status(400).json({ 
                error: 'Cannot update status to ' + status + '. Client must accept the price quote first.' 
            });
        }

        const oldStatus = currentOrder.status;
        const order = await Order.findByIdAndUpdate(req.params.id, req.body, { new: true });

        // Send email notification to client when status changes
        if (status && status !== oldStatus) {
            try {
                const clientUser = await User.findById(currentOrder.user_id);
                if (clientUser?.email) {
                    sendOrderStatusUpdateEmail(clientUser.email, {
                        orderId: currentOrder.order_id,
                        productName: currentOrder.product_name,
                        oldStatus,
                        newStatus: status,
                        clientName: clientUser.name
                    }).catch(err => console.error('Email notification failed:', err.message));
                }
            } catch (emailErr) {
                console.error('Failed to send status email:', emailErr.message);
            }
        }

        res.json(order);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

export const getOrderStats = async (req, res) => {
    try {
        let matchFilter = {};
        if (req.user.role !== 'admin') {
            matchFilter.user_id = new mongoose.Types.ObjectId(req.user._id);
        }

        const total = await Order.countDocuments(matchFilter);
        const statuses = await Order.aggregate([
            { $match: matchFilter },
            { $group: { _id: '$status', count: { $sum: 1 } } }
        ]);

        const recentOrders = await Order.find(matchFilter)
            .sort({ createdAt: -1 })
            .limit(5);

        res.json({ total, statuses, recentOrders });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
};

export const deleteOrder = async (req, res) => {
    try {
        const order = await Order.findByIdAndDelete(req.params.id);
        if (!order) return res.status(404).json({ error: 'Order not found' });
        res.json({ message: 'Order deleted successfully' });
    } catch (err) { res.status(500).json({ error: err.message }); }
};