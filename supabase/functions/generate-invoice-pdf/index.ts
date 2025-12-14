import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { jsPDF } from "https://esm.sh/jspdf@2.5.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvoicePdfRequest {
  invoiceId: string;
  invoiceNumber: string;
  jobTitle: string;
  jobLocation: string;
  parish: string;
  lawnSize: string | null;
  amount: number;
  platformFee: number;
  paymentReference: string;
  paymentDate: string;
  customerName?: string;
  customerEmail?: string;
}

const formatCurrency = (amount: number): string => {
  return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: InvoicePdfRequest = await req.json();
    
    console.log("Generating PDF for invoice:", data.invoiceNumber);

    // Create PDF document
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    
    // Colors
    const primaryGreen = [22, 163, 74]; // #16a34a
    const darkGray = [24, 24, 27]; // #18181b
    const mediumGray = [113, 113, 122]; // #71717a
    const lightGray = [244, 244, 245]; // #f4f4f5

    // Header background
    doc.setFillColor(...primaryGreen);
    doc.rect(0, 0, pageWidth, 50, 'F');

    // Header text
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(28);
    doc.setFont('helvetica', 'bold');
    doc.text('INVOICE', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text(data.invoiceNumber, pageWidth / 2, 35, { align: 'center' });

    // LawnConnect branding
    doc.setFontSize(10);
    doc.text('LawnConnect', pageWidth / 2, 45, { align: 'center' });

    // Reset for body content
    let yPos = 70;

    // Invoice details section
    doc.setTextColor(...darkGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    // Left column - Payment info
    doc.setTextColor(...mediumGray);
    doc.text('PAYMENT DATE', 20, yPos);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(formatDate(data.paymentDate), 20, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...mediumGray);
    doc.text('REFERENCE', 20, yPos + 18);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(data.paymentReference, 20, yPos + 24);

    // Right column - Status
    doc.setFillColor(220, 252, 231); // Light green
    doc.roundedRect(pageWidth - 60, yPos - 5, 40, 15, 3, 3, 'F');
    doc.setTextColor(22, 101, 52); // Dark green
    doc.setFontSize(10);
    doc.setFont('helvetica', 'bold');
    doc.text('PAID', pageWidth - 40, yPos + 5, { align: 'center' });

    yPos += 45;

    // Divider line
    doc.setDrawColor(228, 228, 231);
    doc.line(20, yPos, pageWidth - 20, yPos);

    yPos += 15;

    // Service Details header
    doc.setFillColor(...lightGray);
    doc.roundedRect(20, yPos, pageWidth - 40, 12, 2, 2, 'F');
    doc.setTextColor(...mediumGray);
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text('SERVICE DETAILS', 25, yPos + 8);

    yPos += 20;

    // Service details content
    doc.setTextColor(...mediumGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.text('Job Type', 25, yPos);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(data.jobTitle, 25, yPos + 6);

    yPos += 18;

    doc.setTextColor(...mediumGray);
    doc.setFont('helvetica', 'normal');
    doc.text('Location', 25, yPos);
    doc.setTextColor(...darkGray);
    doc.setFont('helvetica', 'bold');
    doc.text(`${data.jobLocation}, ${data.parish}`, 25, yPos + 6);

    if (data.lawnSize) {
      yPos += 18;
      doc.setTextColor(...mediumGray);
      doc.setFont('helvetica', 'normal');
      doc.text('Lawn Size', 25, yPos);
      doc.setTextColor(...darkGray);
      doc.setFont('helvetica', 'bold');
      doc.text(data.lawnSize, 25, yPos + 6);
    }

    yPos += 25;

    // Amount section
    doc.setFillColor(...lightGray);
    doc.roundedRect(20, yPos, pageWidth - 40, 50, 4, 4, 'F');

    yPos += 15;

    // Service amount
    doc.setTextColor(...mediumGray);
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    doc.text('Service Amount', 30, yPos);
    doc.setTextColor(...darkGray);
    doc.text(formatCurrency(data.amount), pageWidth - 30, yPos, { align: 'right' });

    yPos += 10;
    
    // Divider
    doc.setDrawColor(228, 228, 231);
    doc.line(30, yPos, pageWidth - 30, yPos);

    yPos += 12;

    // Total
    doc.setTextColor(...darkGray);
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Total Paid', 30, yPos);
    doc.setTextColor(...primaryGreen);
    doc.setFontSize(18);
    doc.text(formatCurrency(data.amount), pageWidth - 30, yPos, { align: 'right' });

    yPos += 35;

    // Footer note
    doc.setTextColor(...mediumGray);
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    const footerText = 'Thank you for choosing LawnConnect! Your payment is held securely until the job is completed.';
    doc.text(footerText, pageWidth / 2, yPos, { align: 'center', maxWidth: pageWidth - 40 });

    yPos += 20;

    // Contact info
    doc.setFontSize(9);
    doc.text("Jamaica's Lawn Care Marketplace", pageWidth / 2, yPos, { align: 'center' });
    doc.setTextColor(...primaryGreen);
    doc.text('support@lawnconnect.jm', pageWidth / 2, yPos + 6, { align: 'center' });

    // Generate PDF as base64
    const pdfBase64 = doc.output('datauristring').split(',')[1];

    console.log("PDF generated successfully for:", data.invoiceNumber);

    return new Response(JSON.stringify({ pdf: pdfBase64 }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error generating PDF:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
};

serve(handler);
