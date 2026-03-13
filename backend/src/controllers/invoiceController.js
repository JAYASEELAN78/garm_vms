import Invoice from '../models/Invoice.js';
import Order from '../models/Order.js';
import PDFDocument from 'pdfkit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

// Number to words helper function
const numberToWords = (num) => {
    const a = ['', 'One ', 'Two ', 'Three ', 'Four ', 'Five ', 'Six ', 'Seven ', 'Eight ', 'Nine ', 'Ten ', 'Eleven ', 'Twelve ', 'Thirteen ', 'Fourteen ', 'Fifteen ', 'Sixteen ', 'Seventeen ', 'Eighteen ', 'Nineteen '];
    const b = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

    if ((num = num.toString()).length > 9) return 'overflow';
    const n = ('000000000' + num).substr(-9).match(/^(\d{2})(\d{2})(\d{2})(\d{1})(\d{2})$/);
    if (!n) return '';
    let str = '';
    str += (n[1] != 0) ? (a[Number(n[1])] || b[n[1][0]] + ' ' + a[n[1][1]]) + 'Crore ' : '';
    str += (n[2] != 0) ? (a[Number(n[2])] || b[n[2][0]] + ' ' + a[n[2][1]]) + 'Lakh ' : '';
    str += (n[3] != 0) ? (a[Number(n[3])] || b[n[3][0]] + ' ' + a[n[3][1]]) + 'Thousand ' : '';
    str += (n[4] != 0) ? (a[Number(n[4])] || b[n[4][0]] + ' ' + a[n[4][1]]) + 'Hundred ' : '';
    str += (n[5] != 0) ? ((str != '') ? 'and ' : '') + (a[Number(n[5])] || b[n[5][0]] + ' ' + a[n[5][1]]) : '';
    return str.trim();
};

// Generate and Stream PDF
export const generateInvoicePDF = async (req, res) => {
    try {
        const invoice = await Invoice.findById(req.params.id).populate({
            path: 'order_id',
            populate: [
                { path: 'company_id' },
                { path: 'user_id' }
            ]
        });

        if (!invoice) return res.status(404).json({ message: 'Invoice not found' });

        // Security check for clients
        if (req.user.role === 'client') {
            const orderUserId = invoice.order_id?.user_id?._id || invoice.order_id?.user_id;
            if (!invoice.order_id || !orderUserId || orderUserId.toString() !== req.user._id.toString()) {
                return res.status(403).json({ message: 'Not authorized to view this invoice' });
            }
        }

        const doc = new PDFDocument({ margin: 30, size: 'A4' });

        res.setHeader('Content-Type', 'application/pdf');
        // res.setHeader('Content-Disposition', `attachment; filename="invoice-${invoice.invoice_id}.pdf"`); // Removed to prevent IDM interception during Ajax/Blob download

        doc.pipe(res);

        // --- Document Layout & Borders ---
        const startX = 30;
        const endX = 565; // A4 width (595.28) - 30 margin
        const startY = 30;
        const endY = 810; // A4 height (841.89) - ~30 margin

        // Draw Outer Border
        doc.rect(startX, startY, endX - startX, endY - startY).stroke();

        // --- Header Section ---
        // Header Image (V.M.S GARMENTS Banner)
        const headerImagePath = path.join(__dirname, '../../public/invoice-header.png');
        try {
            // Using precise sizing and centering
            doc.image(headerImagePath, startX + 5, startY + 5, {
                width: endX - startX - 10,
                height: 75
            });
        } catch (err) {
            console.error('Missing invoice header image:', err);
            // Fallback header
            doc.font('Helvetica-Bold').fontSize(24).fillColor('#1d4ed8').text('V.M.S GARMENTS', startX + 50, startY + 15);
            doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text('GSTIN: 33AZRPM4425F2ZA', 400, startY + 20);
        }

        // Header Divider Line (shifted down to accommodate image)
        const contentStartY = startY + 85;
        doc.moveTo(startX, contentStartY).lineTo(endX, contentStartY).stroke();

        // --- Office Details & Invoice Details ---
        doc.fillColor('#000'); // Reset color
        doc.font('Helvetica').fontSize(8);
        doc.text('OFF : 61C9, Anupparpalayam Puthur, Tirupur. 641652', startX + 5, contentStartY + 5);
        doc.text('Email: vmsgarments@gmail.com', startX + 5, contentStartY + 20);
        doc.text('Mob: 9080573831', startX + 5, contentStartY + 35);

        // Vertical divider for Invoice Details
        doc.moveTo(350, contentStartY).lineTo(350, contentStartY + 60).stroke();

        doc.font('Helvetica-Bold').text('Invoice Number', 360, contentStartY + 5);
        doc.text(`: ${invoice.invoice_id}`, 450, contentStartY + 5);

        doc.font('Helvetica-Bold').text('Invoice Date', 360, contentStartY + 20);
        doc.font('Helvetica').text(`: ${new Date(invoice.date).toLocaleDateString('en-GB')}`, 450, contentStartY + 20);

        // Tax Invoice Title Divider
        doc.moveTo(startX, contentStartY + 60).lineTo(endX, contentStartY + 60).stroke();
        doc.font('Helvetica-Bold').fontSize(14).fillColor('#1e40af')
            .text('TAX INVOICE', startX, contentStartY + 65, { align: 'center', underline: true });
        doc.fillColor('#000');
        // Another divider below Tax Invoice
        doc.moveTo(startX, contentStartY + 85).lineTo(endX, contentStartY + 85).stroke();

        // --- Consignee Details ---
        const clientCompany = invoice.client_id?.company?.companyName || '';
        const clientName = invoice.client_id?.name || 'Cash Customer';
        const clientEmail = invoice.client_id?.email || '';
        const clientPhone = invoice.client_id?.phone || '';

        doc.font('Helvetica-Oblique').fontSize(8).text('Consignee Copy', startX + 5, contentStartY + 90);

        doc.font('Helvetica-Bold').fontSize(9).text('BUYER:', startX + 5, contentStartY + 105);
        doc.font('Helvetica').text(clientCompany || clientName, startX + 70, contentStartY + 105);

        // Fetch Buyer Address/GST properly from company details later if needed, assuming here simplified
        doc.font('Helvetica-Bold').text('STATE:', startX + 5, contentStartY + 120);
        doc.font('Helvetica').text('TAMILNADU', startX + 70, contentStartY + 120); // Placeholder

        if (invoice.client_id?.company?.gstNumber) {
            doc.font('Helvetica-Bold').text('GSTIN:', startX + 5, contentStartY + 135);
            doc.font('Helvetica').text(invoice.client_id.company.gstNumber, startX + 70, contentStartY + 135);
        }

        doc.font('Helvetica-Bold').text('TRANSPORT:', startX + 5, contentStartY + 150);

        // Vertical Divider for Buyer Details
        doc.moveTo(350, contentStartY + 85).lineTo(350, contentStartY + 165).stroke();

        doc.font('Helvetica-Bold').text('MOB:', 360, contentStartY + 105);
        doc.font('Helvetica').text(clientPhone || 'N/A', 410, contentStartY + 105);

        doc.font('Helvetica-Bold').text('EMAIL:', 360, contentStartY + 120);
        doc.font('Helvetica').text(clientEmail || 'N/A', 410, contentStartY + 120);

        doc.font('Helvetica-Bold').text('NOTE:', 360, contentStartY + 135);
        doc.font('Helvetica').text('-', 410, contentStartY + 135);

        doc.font('Helvetica-Bold').text('PAYMENT:', 360, contentStartY + 150);
        doc.font('Helvetica').text('Immediate', 410, contentStartY + 150);

        // End Consignee Header Line
        doc.moveTo(startX, contentStartY + 165).lineTo(endX, contentStartY + 165).stroke();

        // --- Table Headers ---
        const tableHeaderY = contentStartY + 165;
        doc.font('Helvetica-Bold').fontSize(8);

        // Define Columns: S.No (30), Product (100), HSN (50), Sizes (55), RatePP (60), PcsPack (40), RatePack (60), NoPacks (50), Amount (90)
        // Total = 535
        const cols = [
            { x: startX, w: 30, text: 'S.No' },
            { x: startX + 30, w: 100, text: 'Product' },
            { x: startX + 130, w: 50, text: 'HSN\nCode' },
            { x: startX + 180, w: 55, text: 'Sizes/\nPieces' },
            { x: startX + 235, w: 60, text: 'Rate Per\nPiece' },
            { x: startX + 295, w: 40, text: 'Pcs in\nPack' },
            { x: startX + 335, w: 60, text: 'Rate Per\nPack' },
            { x: startX + 395, w: 50, text: 'No Of\nPacks' },
            { x: startX + 445, w: 90, text: 'Amount\nRs.' }
        ];

        // Draw Headers & Vertical Lines
        cols.forEach((col, i) => {
            if (i > 0) doc.moveTo(col.x, tableHeaderY).lineTo(col.x, endY - 200).stroke();
            doc.text(col.text, col.x, tableHeaderY + 5, { width: col.w, align: 'center' });
        });

        // Line under table headers
        doc.moveTo(startX, tableHeaderY + 25).lineTo(endX, tableHeaderY + 25).stroke();

        // --- Table Data ---
        const order = invoice.order_id;
        const productName = order ? order.product_name : 'Job Work / Service';
        const qty = order ? order.quantity : 1;
        const amount = invoice.amount;

        const rowY = tableHeaderY + 35;
        doc.font('Helvetica').fontSize(9);

        doc.text('1', cols[0].x, rowY, { width: cols[0].w, align: 'center' });
        doc.text(productName, cols[1].x + 5, rowY, { width: cols[1].w - 10, align: 'left' });
        doc.text('6104', cols[2].x, rowY, { width: cols[2].w, align: 'center' }); // Example HSN
        doc.text('Multiple', cols[3].x, rowY, { width: cols[3].w, align: 'center' });
        doc.text((amount / qty).toFixed(2), cols[4].x, rowY, { width: cols[4].w, align: 'center' });
        doc.text('1', cols[5].x, rowY, { width: cols[5].w, align: 'center' }); // Pcs in pack
        doc.text((amount / qty).toFixed(2), cols[6].x, rowY, { width: cols[6].w, align: 'center' });
        doc.text(`${qty}`, cols[7].x, rowY, { width: cols[7].w, align: 'center' });
        doc.text(`${amount.toFixed(2)}`, cols[8].x, rowY, { width: cols[8].w, align: 'center' });

        // --- Footer Box (Bottom 200pt) ---
        const footerY = endY - 200;
        const middleY = footerY + 80;
        doc.moveTo(startX, footerY).lineTo(endX, footerY).stroke(); // Top line
        doc.moveTo(startX, middleY).lineTo(endX, middleY).stroke(); // Single middle straight line

        // Bottom Vertical Grid Lines
        doc.moveTo(250, footerY).lineTo(250, middleY).stroke();
        doc.moveTo(400, footerY).lineTo(400, middleY).stroke();
        doc.moveTo(endX, footerY).lineTo(endX, middleY).stroke(); // Enclose the right box

        // Calculations for Footer
        const taxBase = amount;
        const discount = 0;
        const taxableAmt = taxBase - discount;
        const cgst = taxableAmt * 0.025; // 2.5%
        const sgst = taxableAmt * 0.025; // 2.5%
        const finalTotal = taxableAmt + cgst + sgst;
        const amountInWords = numberToWords(Math.round(finalTotal));

        // Summary details box (Left Side)
        doc.font('Helvetica-Bold').fontSize(9);
        doc.text('Total Packs', startX + 5, footerY + 10);
        doc.text(`: ${qty}`, startX + 80, footerY + 10);

        doc.text('Bill Amount', startX + 5, footerY + 28);
        doc.text(`: ${finalTotal.toFixed(2)}`, startX + 80, footerY + 28);

        doc.text('In words', startX + 5, footerY + 46);
        doc.font('Helvetica-Oblique').fontSize(8);
        doc.text(`: Rupees ${amountInWords ? amountInWords + ' Only' : 'Zero Only'}`, startX + 80, footerY + 46, { width: 135 });

        // Middle Section (Bundles and Total GST)
        doc.font('Helvetica-Bold').fontSize(8);
        doc.text('NUM OF BUNDLES :', 255, footerY + 10);
        doc.fontSize(10).text('1', 370, footerY + 10); // default

        // Total GST Box
        doc.rect(255, footerY + 45, 135, 25).stroke('red');
        doc.fillColor('red').fontSize(9).text('TOTAL GST', 260, footerY + 53);
        doc.text(`${amount > 0 ? (amount * 0.05).toFixed(0) : 0}`, 350, footerY + 53, { width: 35, align: 'right' });
        doc.fillColor('#000').stroke('#000'); // Reset colors

        // Right Section (Tax Breakdown)
        doc.font('Helvetica').fontSize(8);
        let taxY = footerY + 8;
        doc.text('Product Amt', 405, taxY); doc.font('Helvetica-Bold').text(`${taxBase.toFixed(2)}`, 490, taxY, { width: 70, align: 'right' });
        taxY += 14;
        doc.font('Helvetica').text('Discount', 405, taxY); doc.font('Helvetica-Bold').text(`${discount.toFixed(2)}`, 490, taxY, { width: 70, align: 'right' });
        taxY += 14;
        doc.fillColor('red');
        doc.font('Helvetica').text('CGST @ 2.5%', 405, taxY); doc.font('Helvetica-Bold').text(`${cgst.toFixed(2)}`, 490, taxY, { width: 70, align: 'right' });
        taxY += 14;
        doc.font('Helvetica').text('SGST @ 2.5%', 405, taxY); doc.font('Helvetica-Bold').text(`${sgst.toFixed(2)}`, 490, taxY, { width: 70, align: 'right' });
        taxY += 14;
        doc.fillColor('#000');
        doc.font('Helvetica').text('Round Off', 405, taxY); doc.font('Helvetica-Bold').text('0.00', 490, taxY, { width: 70, align: 'right' });

        // --- Lower Footer (Terms, Bank, Total Amt, Signature) ---
        const lowerY = middleY + 5;

        // Terms And Conditions
        doc.font('Helvetica-Bold').fontSize(9).fillColor('#1d4ed8').text('Terms And Conditions', startX + 5, lowerY, { underline: true });
        doc.fillColor('#000').font('Helvetica').fontSize(7);
        doc.text('Subject to Tirupur Jurisdiction.', startX + 5, lowerY + 12);
        doc.text('Payment by Cheque/DD only, payable at Tirupur.', startX + 5, lowerY + 20);
        doc.text('Cheques made in favour of V.M.S GARMENTS to be sent to Tirupur Address', startX + 5, lowerY + 28);

        // Total Amount Box (Right Side)
        const totalBoxY = middleY + 30;
        doc.moveTo(400, totalBoxY).lineTo(endX, totalBoxY).stroke(); // horizontal top
        doc.moveTo(400, totalBoxY + 25).lineTo(endX, totalBoxY + 25).stroke(); // horizontal bottom
        doc.moveTo(400, middleY).lineTo(400, totalBoxY + 25).stroke(); // vertical left
        doc.moveTo(endX, middleY).lineTo(endX, totalBoxY + 25).stroke(); // vertical right

        doc.font('Helvetica-Bold').fontSize(11);
        doc.text('Total Amt', 405, totalBoxY + 8);
        doc.text(`${finalTotal.toFixed(2)}`, 490, totalBoxY + 8, { width: 70, align: 'right' });

        // Bank Details Box
        const bankY = lowerY + 45;
        doc.rect(startX + 5, bankY, 330, 50).stroke('#d97706');
        doc.font('Helvetica-Bold').fillColor('red').fontSize(8).text('Bank Details:', startX + 10, bankY + 5);
        doc.fontSize(8).fillColor('#1d4ed8').text('ACC NAME : V.M.S GARMENTS', startX + 10, bankY + 15);
        doc.text('BANK : SOUTH INDIAN BANK', startX + 10, bankY + 25);
        doc.fillColor('#d97706').text('ACC NUM: 0338073000002328    BRANCH: TIRUPUR    IFSC: SIBL0000338', startX + 10, bankY + 37);

        // Signature Section
        const sigY = bankY + 5;
        doc.font('Helvetica-Oblique').fillColor('#000').fontSize(8);
        doc.text('Certified that above particulars are true', 370, sigY, { width: 200, align: 'center' });
        doc.text('and correct', 370, sigY + 10, { width: 200, align: 'center' });

        doc.font('Helvetica-Bold').fontSize(10).fillColor('#1d4ed8');
        doc.text('For V.M.S GARMENTS', 370, sigY + 35, { width: 200, align: 'center' });

        doc.end();

    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};
