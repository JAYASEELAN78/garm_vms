import Dispatch from '../models/Dispatch.js';
import Order from '../models/Order.js';

export const createDispatch = async (req, res) => {
    try {
        const dispatch = new Dispatch(req.body);
        await dispatch.save();

        // Sync order status
        if (dispatch.order_id) {
            await Order.findByIdAndUpdate(dispatch.order_id, { status: 'Dispatched' });
        }

        const populated = await Dispatch.findById(dispatch._id).populate({
            path: 'order_id',
            populate: [
                { path: 'company_id' },
                { path: 'user_id', select: 'name' }
            ]
        });
        res.status(201).json(populated);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

export const updateDispatchStatus = async (req, res) => {
    try {
        const { delivery_status } = req.body;
        const dispatch = await Dispatch.findByIdAndUpdate(
            req.params.id, 
            { delivery_status }, 
            { new: true }
        ).populate({
            path: 'order_id',
            populate: [
                { path: 'company_id' },
                { path: 'user_id', select: 'name' }
            ]
        });

        // If delivered, sync order status too
        if (delivery_status === 'Delivered' && dispatch.order_id) {
            const oid = dispatch.order_id._id || dispatch.order_id;
            await Order.findByIdAndUpdate(oid, { status: 'Delivered' });
        }

        res.json(dispatch);
    } catch (err) { res.status(400).json({ error: err.message }); }
};

export const getDispatches = async (req, res) => {
    try {
        const dispatches = await Dispatch.find().populate({
            path: 'order_id',
            populate: [
                { path: 'company_id' },
                { path: 'user_id', select: 'name' }
            ]
        });
        res.json(dispatches);
    } catch (err) { res.status(500).json({ error: err.message }); }
};