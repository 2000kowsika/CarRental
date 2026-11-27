import jsPDF from "jspdf";

export const generateBookingInvoice = (booking, user, currency = "$") => {
    const doc = new jsPDF({
        orientation: "portrait",
        unit: "mm",
        format: "a4",
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    const margin = 18;

    // 1. Primary Header Banner (Dark Navy)
    doc.setFillColor(30, 58, 138); // #1E3A8A Dark Navy
    doc.rect(0, 0, pageWidth, 38, "F");

    // Company Brand Name
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("CAR RENTAL", margin, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(219, 234, 254);
    doc.text("Premium Car Rental Service | Worldwide Fleet", margin, 26);
    doc.text("Support: support@carrental.com | +94 11 234 5678", margin, 31);

    // Invoice Label on Right
    doc.setFont("helvetica", "bold");
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text("INVOICE", pageWidth - margin, 20, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(219, 234, 254);
    const invoiceDate = new Date().toISOString().split("T")[0];
    doc.text(`Invoice Date: ${invoiceDate}`, pageWidth - margin, 27, { align: "right" });
    const refId = booking.bookingId || `#${booking._id?.slice(-8).toUpperCase()}`;
    doc.text(`Booking ID: ${refId}`, pageWidth - margin, 32, { align: "right" });

    // 2. Customer & Booking Details Section
    let currentY = 50;

    // Customer Info Card Box
    doc.setDrawColor(226, 232, 240);
    doc.setFillColor(248, 250, 252);
    doc.roundedRect(margin, currentY, (pageWidth - margin * 2) / 2 - 4, 38, 2, 2, "FD");

    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BILLED TO", margin + 5, currentY + 7);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    const customerDisplayName = booking.customerName || user?.name || "Valued Customer";
    doc.text(customerDisplayName, margin + 5, currentY + 15);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    const customerDisplayEmail = booking.customerEmail || user?.email || "N/A";
    const customerDisplayPhone = booking.customerPhone || user?.phone || "N/A";
    doc.text(`Email: ${customerDisplayEmail}`, margin + 5, currentY + 22);
    doc.text(`Phone: ${customerDisplayPhone}`, margin + 5, currentY + 28);
    doc.text(`Location: ${booking.pickupLocation || booking.car?.location || "Sri Lanka"}`, margin + 5, currentY + 34);

    // Booking Summary Box
    const rightBoxX = margin + (pageWidth - margin * 2) / 2 + 4;
    const rightBoxW = (pageWidth - margin * 2) / 2 - 4;
    doc.roundedRect(rightBoxX, currentY, rightBoxW, 38, 2, 2, "FD");

    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("BOOKING DETAILS", rightBoxX + 5, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Booking ID:`, rightBoxX + 5, currentY + 15);
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.text(`${booking._id}`, rightBoxX + 30, currentY + 15);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Booking Status:`, rightBoxX + 5, currentY + 22);
    const statusText = (booking.status || "pending").toUpperCase();
    if (statusText === "CONFIRMED") {
        doc.setTextColor(22, 101, 52); // green
    } else if (statusText === "CANCELLED") {
        doc.setTextColor(185, 28, 28); // red
    } else {
        doc.setTextColor(202, 138, 4); // yellow/orange
    }
    doc.setFont("helvetica", "bold");
    doc.text(statusText, rightBoxX + 30, currentY + 22);

    doc.setFont("helvetica", "normal");
    doc.setTextColor(71, 85, 105);
    doc.text(`Payment Status:`, rightBoxX + 5, currentY + 29);
    const paymentStatusText = (booking.paymentStatus || "pending").toUpperCase();
    doc.setFont("helvetica", "bold");
    doc.text(paymentStatusText, rightBoxX + 32, currentY + 29);

    if (booking.paymentTransactionId) {
        doc.setFont("helvetica", "normal");
        doc.setTextColor(71, 85, 105);
        doc.text(`Transaction ID: ${booking.paymentTransactionId}`, rightBoxX + 5, currentY + 35);
    }

    // 3. Vehicle Specifications Table
    currentY = 96;

    // Table Header
    doc.setFillColor(30, 58, 138);
    doc.rect(margin, currentY, pageWidth - margin * 2, 8, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("VEHICLE DESCRIPTION", margin + 4, currentY + 5.5);
    doc.text("RENTAL PERIOD", margin + 70, currentY + 5.5);
    doc.text("DAYS", margin + 120, currentY + 5.5);
    doc.text("RATE / DAY", margin + 140, currentY + 5.5);
    doc.text("TOTAL", pageWidth - margin - 4, currentY + 5.5, { align: "right" });

    // Table Content
    currentY += 8;
    doc.setFillColor(255, 255, 255);
    doc.rect(margin, currentY, pageWidth - margin * 2, 22, "F");
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, currentY + 22, pageWidth - margin, currentY + 22);

    // Calculate rental days
    const pickupDateStr = booking.pickupDate ? booking.pickupDate.split("T")[0] : "N/A";
    const returnDateStr = booking.returnDate ? booking.returnDate.split("T")[0] : "N/A";
    const picked = new Date(booking.pickupDate);
    const returned = new Date(booking.returnDate);
    const days = Math.max(1, Math.ceil((returned - picked) / (1000 * 60 * 60 * 24))) || 1;

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.text(`${booking.car?.brand || ""} ${booking.car?.model || "Standard Vehicle"}`, margin + 4, currentY + 7);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.text(
        `Category: ${booking.car?.category || "Sedan"} | Year: ${booking.car?.year || "2024"} | Fuel: ${booking.car?.fuel_type || "Petrol"}`,
        margin + 4,
        currentY + 13
    );
    doc.text(`Pick-up: ${booking.car?.location || "Airport / Hub"}`, margin + 4, currentY + 18);

    doc.setFontSize(9);
    doc.setTextColor(15, 23, 42);
    doc.text(`${pickupDateStr} to`, margin + 70, currentY + 9);
    doc.text(`${returnDateStr}`, margin + 70, currentY + 15);

    doc.text(`${days} day(s)`, margin + 120, currentY + 11);

    const pricePerDay = booking.car?.pricePerDay || Math.round(booking.price / days) || 0;
    doc.text(`${currency}${pricePerDay}`, margin + 140, currentY + 11);

    doc.setFont("helvetica", "bold");
    doc.text(`${currency}${booking.price}`, pageWidth - margin - 4, currentY + 11, { align: "right" });

    // 4. Financial Calculation Summary Table
    currentY += 30;

    const summaryBoxX = pageWidth - margin - 80;
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);

    doc.text("Rental Subtotal:", summaryBoxX, currentY);
    doc.text(`${currency}${booking.price}`, pageWidth - margin - 4, currentY, { align: "right" });

    doc.text("Taxes & Processing Fee (0%):", summaryBoxX, currentY + 6);
    doc.text(`${currency}0`, pageWidth - margin - 4, currentY + 6, { align: "right" });

    doc.setDrawColor(203, 213, 225);
    doc.line(summaryBoxX, currentY + 9, pageWidth - margin, currentY + 9);

    // Total Due / Paid
    doc.setFillColor(241, 245, 249);
    doc.rect(summaryBoxX, currentY + 11, 80, 10, "F");
    doc.setTextColor(30, 58, 138);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(11);
    doc.text("Total Amount:", summaryBoxX + 4, currentY + 17.5);
    doc.text(`${currency}${booking.price}`, pageWidth - margin - 4, currentY + 17.5, { align: "right" });

    // 5. Terms & Signature Footer
    const footerY = 230;
    doc.setDrawColor(226, 232, 240);
    doc.line(margin, footerY, pageWidth - margin, footerY);

    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(9);
    doc.text("Terms & Conditions:", margin, footerY + 6);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(7.5);
    doc.setTextColor(100, 116, 139);
    doc.text("1. Valid Driver's License and National ID must be presented upon vehicle handover.", margin, footerY + 11);
    doc.text("2. Cancellations made prior to pickup date are subject to refund according to our policy.", margin, footerY + 15);
    doc.text("3. Vehicle must be returned with the same fuel level as dispatched.", margin, footerY + 19);
    doc.text("4. For any roadside assistance or extension queries, contact 24/7 helpline: +94 11 234 5678.", margin, footerY + 23);

    // Copyright bar
    doc.setFillColor(248, 250, 252);
    doc.rect(0, 280, pageWidth, 17, "F");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("Thank you for choosing Car Rental. Safe travels!", pageWidth / 2, 288, { align: "center" });

    // Trigger Browser Download
    const filename = `Invoice_${booking._id?.slice(-8).toUpperCase()}_${invoiceDate}.pdf`;
    doc.save(filename);
};
