import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import PDFDocument from 'pdfkit';

// Create Invoice
export const createInvoice = async (req, res) => {
    try {
        const { orderId, orderNumber, subtotal, total, tax } = req.body;

        const invoiceCount = await Invoice.countDocuments();
        const invoice_id = `INV-${new Date().getFullYear()}-${(invoiceCount + 1).toString().padStart(4, '0')}`;

        const newInvoice = new Invoice({
            invoice_id,
            order_id: orderId,
            amount: subtotal || 0,
            tax: tax || 0,
            total: total || 0,
            date: new Date()
        });

        await newInvoice.save();

        res.status(201).json(newInvoice);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Get All Invoices
export const getInvoices = async (req, res) => {
    try {
        let query = {};

        // If client, only show their invoices
        if (req.user.role === 'client') {
            const clientOrders = await Order.find({ user_id: req.user._id }).select('_id');
            const clientOrderIds = clientOrders.map(o => o._id);
            query.order_id = { $in: clientOrderIds };
        }

        const invoices = await Invoice.find(query)
            .populate({
                path: 'order_id',
                populate: [
                    { path: 'company_id' },
                    { path: 'user_id', select: 'name' }
                ]
            })
            .sort({ createdAt: -1 });

        // Format exactly how the frontend expects it
        const formatted = invoices.map(inv => ({
            _id: inv._id,
            invoiceId: inv.invoice_id,
            orderNumber: inv.order_id ? inv.order_id.order_id : 'UNKNOWN',
            clientName: inv.order_id ? (inv.order_id.company_id?.name || inv.order_id.user_id?.name || 'Unknown Client') : 'Unknown',
            total: inv.total,
            status: 'Paid',
            createdAt: inv.createdAt
        }));
        res.status(200).json(formatted);
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};

// Generate and Stream PDF
export const generateInvoicePDF = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate({
            path: 'order_id',
            populate: [
                { path: 'company_id' },
                { path: 'user_id', select: 'name' }
            ]
        });

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // Security check for clients
        if (req.user.role === 'client') {
            if (!invoice.order_id || invoice.order_id.user_id?.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this invoice' });
            }
        }

        const doc = new PDFDocument({ margin: 50 });

        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=invoice-${invoice.invoice_id}.pdf`);

        doc.pipe(res);

        // Header
        doc.fontSize(20).text('INVOICE', { align: 'center' });
        doc.moveDown();

        doc.fontSize(12)
            .text(`Invoice ID: ${invoice.invoice_id}`)
            .text(`Date: ${new Date(invoice.date).toLocaleDateString()}`)
            .text(`Order ID: ${invoice.order_id ? invoice.order_id.order_id : ''}`);

        doc.moveDown();

        const clientName = invoice.order_id
            ? (invoice.order_id.company_id?.name || invoice.order_id.user_id?.name || 'Valued Client')
            : 'Valued Client';
        doc.text(`Billed To: ${clientName}`);
        doc.moveDown(2);

        // Table Header
        doc.text('Description', 50, doc.y);
        doc.text('Amount', 400, doc.y);
        doc.moveTo(50, doc.y + 5).lineTo(550, doc.y + 5).stroke();
        doc.moveDown(1.5);

        // Table Data
        doc.text('Job Work & Production Services', 50, doc.y);
        doc.text(`Rs. ${invoice.amount}`, 400, doc.y);
        doc.moveDown();

        doc.text('Tax', 50, doc.y);
        doc.text(`${invoice.tax}%`, 400, doc.y);
        doc.moveDown();

        doc.moveTo(50, doc.y).lineTo(550, doc.y).stroke();
        doc.moveDown(0.5);

        doc.font('Helvetica-Bold');
        doc.text('Total', 50, doc.y);
        doc.text(`Rs. ${invoice.total}`, 400, doc.y);

        doc.end();

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
