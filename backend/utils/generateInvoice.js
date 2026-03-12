const PDFDocument = require('pdfkit');

const generateInvoicePDF = (invoice, stream) => {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });
    doc.pipe(stream);

    // Header
    doc.fontSize(24).font('Helvetica-Bold').text('INVOICE', { align: 'center' });
    doc.moveDown(0.5);
    doc.fontSize(10).font('Helvetica').fillColor('#666')
        .text('V.M.S GARMENTS Order Management System', { align: 'center' });
    doc.moveDown(1);

    // Invoice details
    doc.fillColor('#000').fontSize(11);
    doc.font('Helvetica-Bold').text(`Invoice #: ${invoice.invoiceId}`);
    doc.font('Helvetica').text(`Date: ${new Date(invoice.createdAt).toLocaleDateString('en-IN')}`);
    if (invoice.dueDate) {
        doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString('en-IN')}`);
    }
    doc.moveDown(1);

    // Company details
    if (invoice.company) {
        doc.font('Helvetica-Bold').text('Bill To:');
        doc.font('Helvetica').text(invoice.company.name || '');
        doc.text(invoice.company.address || '');
        doc.text(invoice.company.email || '');
        if (invoice.company.gstNumber) doc.text(`GST: ${invoice.company.gstNumber}`);
    }
    doc.moveDown(1);

    // Table Header
    const tableTop = doc.y;
    doc.font('Helvetica-Bold').fontSize(10);
    doc.rect(50, tableTop - 5, 500, 22).fill('#1a1a2e');
    doc.fillColor('#fff');
    doc.text('#', 55, tableTop, { width: 30 });
    doc.text('Description', 90, tableTop, { width: 220 });
    doc.text('Qty', 310, tableTop, { width: 60, align: 'right' });
    doc.text('Rate', 380, tableTop, { width: 70, align: 'right' });
    doc.text('Amount', 460, tableTop, { width: 80, align: 'right' });
    doc.moveDown();

    // Table Rows
    doc.fillColor('#000').font('Helvetica').fontSize(10);
    let y = tableTop + 25;
    (invoice.items || []).forEach((item, i) => {
        if (i % 2 === 0) {
            doc.rect(50, y - 3, 500, 20).fill('#f5f5f5');
            doc.fillColor('#000');
        }
        doc.text(`${i + 1}`, 55, y, { width: 30 });
        doc.text(item.description || '', 90, y, { width: 220 });
        doc.text(`${item.quantity}`, 310, y, { width: 60, align: 'right' });
        doc.text(`₹${(item.rate || 0).toFixed(2)}`, 380, y, { width: 70, align: 'right' });
        doc.text(`₹${(item.amount || 0).toFixed(2)}`, 460, y, { width: 80, align: 'right' });
        y += 22;
    });

    // Totals
    y += 15;
    doc.font('Helvetica').fontSize(11);
    doc.text(`Subtotal:`, 380, y, { width: 70, align: 'right' });
    doc.text(`₹${(invoice.subtotal || 0).toFixed(2)}`, 460, y, { width: 80, align: 'right' });
    y += 20;
    doc.text(`Tax (${invoice.taxRate || 18}%):`, 380, y, { width: 70, align: 'right' });
    doc.text(`₹${(invoice.tax || 0).toFixed(2)}`, 460, y, { width: 80, align: 'right' });
    if (invoice.discount > 0) {
        y += 20;
        doc.text(`Discount:`, 380, y, { width: 70, align: 'right' });
        doc.text(`-₹${(invoice.discount || 0).toFixed(2)}`, 460, y, { width: 80, align: 'right' });
    }
    y += 25;
    doc.rect(370, y - 5, 175, 25).fill('#1a1a2e');
    doc.fillColor('#fff').font('Helvetica-Bold').fontSize(12);
    doc.text(`Total:`, 380, y, { width: 70, align: 'right' });
    doc.text(`₹${(invoice.total || 0).toFixed(2)}`, 460, y, { width: 80, align: 'right' });

    // Footer
    doc.fillColor('#999').font('Helvetica').fontSize(8);
    doc.text('Thank you for your business!', 50, 750, { align: 'center', width: 500 });

    doc.end();
    return doc;
};

module.exports = { generateInvoicePDF };
