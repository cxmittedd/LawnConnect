import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface InvoiceRequest {
  jobId: string;
  customerEmail: string;
  customerName: string;
  jobTitle: string;
  jobLocation: string;
  parish: string;
  lawnSize: string | null;
  amount: number;
  platformFee: number;
  paymentReference: string;
  paymentDate: string;
}

const formatCurrency = (amount: number): string => {
  return `J$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
};

const formatDate = (dateString: string): string => {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const generateInvoiceNumber = (jobId: string, paymentDate: string): string => {
  const date = new Date(paymentDate);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const shortId = jobId.substring(0, 8).toUpperCase();
  return `INV-${year}${month}-${shortId}`;
};

const createInvoiceEmail = (data: InvoiceRequest): string => {
  const invoiceNumber = generateInvoiceNumber(data.jobId, data.paymentDate);
  const logoUrl = `${Deno.env.get("SUPABASE_URL")}/storage/v1/object/public/assets/lawnconnect-logo.png`;
  const appUrl = "https://lawnconnect.jm";

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Invoice - ${invoiceNumber}</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 32px; text-align: center;">
                  <img src="${logoUrl}" alt="LawnConnect" width="80" height="80" style="display: block; margin: 0 auto 16px auto; border-radius: 8px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 28px; font-weight: 700;">INVOICE</h1>
                  <p style="color: #bbf7d0; margin: 8px 0 0 0; font-size: 14px;">${invoiceNumber}</p>
                </td>
              </tr>
              
              <!-- Invoice Details -->
              <tr>
                <td style="padding: 32px;">
                  <!-- Customer & Date Info -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <tr>
                      <td width="50%" style="vertical-align: top;">
                        <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Bill To</p>
                        <p style="color: #18181b; margin: 0; font-size: 16px; font-weight: 600;">${data.customerName}</p>
                        <p style="color: #52525b; margin: 4px 0 0 0; font-size: 14px;">${data.customerEmail}</p>
                      </td>
                      <td width="50%" style="vertical-align: top; text-align: right;">
                        <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Payment Date</p>
                        <p style="color: #18181b; margin: 0; font-size: 14px;">${formatDate(data.paymentDate)}</p>
                        <p style="color: #71717a; margin: 12px 0 4px 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px;">Reference</p>
                        <p style="color: #18181b; margin: 0; font-size: 14px; font-family: monospace;">${data.paymentReference}</p>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Divider -->
                  <hr style="border: none; border-top: 1px solid #e4e4e7; margin: 24px 0;">
                  
                  <!-- Service Details -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom: 24px;">
                    <tr>
                      <td style="background-color: #f4f4f5; padding: 12px 16px; border-radius: 8px 8px 0 0;">
                        <p style="color: #71717a; margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.5px; font-weight: 600;">Service Details</p>
                      </td>
                    </tr>
                    <tr>
                      <td style="border: 1px solid #e4e4e7; border-top: none; padding: 16px; border-radius: 0 0 8px 8px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0;">
                              <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px;">Job Type</p>
                              <p style="color: #18181b; margin: 0; font-size: 14px; font-weight: 500;">${data.jobTitle}</p>
                            </td>
                          </tr>
                          <tr>
                            <td style="padding: 8px 0;">
                              <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px;">Location</p>
                              <p style="color: #18181b; margin: 0; font-size: 14px;">${data.jobLocation}, ${data.parish}</p>
                            </td>
                          </tr>
                          ${data.lawnSize ? `
                          <tr>
                            <td style="padding: 8px 0;">
                              <p style="color: #71717a; margin: 0 0 4px 0; font-size: 12px;">Lawn Size</p>
                              <p style="color: #18181b; margin: 0; font-size: 14px;">${data.lawnSize}</p>
                            </td>
                          </tr>
                          ` : ''}
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Amount Breakdown -->
                  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #fafafa; border-radius: 8px; overflow: hidden;">
                    <tr>
                      <td style="padding: 16px;">
                        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                          <tr>
                            <td style="padding: 8px 0; color: #52525b; font-size: 14px;">Service Amount</td>
                            <td style="padding: 8px 0; color: #18181b; font-size: 14px; text-align: right;">${formatCurrency(data.amount)}</td>
                          </tr>
                          <tr>
                            <td colspan="2" style="border-top: 1px solid #e4e4e7;"></td>
                          </tr>
                          <tr>
                            <td style="padding: 12px 0 8px 0; color: #18181b; font-size: 16px; font-weight: 700;">Total Paid</td>
                            <td style="padding: 12px 0 8px 0; color: #16a34a; font-size: 20px; font-weight: 700; text-align: right;">${formatCurrency(data.amount)}</td>
                          </tr>
                        </table>
                      </td>
                    </tr>
                  </table>
                  
                  <!-- Status Badge -->
                  <div style="text-align: center; margin-top: 24px;">
                    <span style="display: inline-block; background-color: #dcfce7; color: #166534; padding: 8px 24px; border-radius: 20px; font-size: 14px; font-weight: 600;">
                      ✓ PAID
                    </span>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f4f4f5; padding: 24px 32px; text-align: center;">
                  <p style="color: #71717a; margin: 0 0 8px 0; font-size: 14px;">
                    Thank you for choosing LawnConnect!
                  </p>
                  <p style="color: #a1a1aa; margin: 0 0 16px 0; font-size: 12px;">
                    Your payment is held securely until the job is completed.
                  </p>
                  <a href="${appUrl}/my-jobs" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-size: 14px; font-weight: 600;">
                    View Your Jobs
                  </a>
                  <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 11px;">
                    LawnConnect • Jamaica's Lawn Care Marketplace<br>
                    <a href="mailto:support@lawnconnect.jm" style="color: #16a34a; text-decoration: none;">support@lawnconnect.jm</a>
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
      </table>
    </body>
    </html>
  `;
};

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const invoiceData: InvoiceRequest = await req.json();
    
    console.log("Sending invoice to:", invoiceData.customerEmail);
    console.log("Invoice data:", JSON.stringify(invoiceData, null, 2));

    const invoiceNumber = generateInvoiceNumber(invoiceData.jobId, invoiceData.paymentDate);
    const htmlContent = createInvoiceEmail(invoiceData);

    const emailResponse = await resend.emails.send({
      from: "LawnConnect <billing@lawnconnect.jm>",
      to: [invoiceData.customerEmail],
      subject: `Invoice ${invoiceNumber} - Payment Confirmation`,
      html: htmlContent,
    });

    console.log("Invoice email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, invoiceNumber }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending invoice:", error);
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
