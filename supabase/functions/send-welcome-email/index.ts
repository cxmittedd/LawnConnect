import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  firstName: string;
  userRole: string;
}

// Validate email format
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const createWelcomeEmail = (data: WelcomeEmailRequest): string => {
  const logoUrl = "https://connectlawn.com/pwa-512x512.png";
  const appUrl = "https://connectlawn.com";

  const roleSpecificContent = data.userRole === 'provider' 
    ? {
        headline: "Start Earning with LawnConnect",
        description: "You're now part of Jamaica's premier lawn care marketplace. Complete your profile verification to start receiving job requests from customers in your area.",
        cta: "Complete Verification",
        ctaUrl: `${appUrl}/profile`,
        tips: [
          "Complete your ID verification to unlock job browsing",
          "Add a professional bio and profile photo",
          "Keep your availability updated to receive relevant jobs",
          "Respond quickly to job proposals for better success",
        ]
      }
    : data.userRole === 'both'
    ? {
        headline: "Welcome to LawnConnect",
        description: "You've joined as both a customer and service provider. Post jobs to find lawn care help, or complete your verification to start earning by providing services.",
        cta: "Go to Dashboard",
        ctaUrl: `${appUrl}/dashboard`,
        tips: [
          "Post your first job to find lawn care providers",
          "Complete ID verification to offer services",
          "Use the chat feature to communicate with providers",
          "Leave reviews to help the community",
        ]
      }
    : {
        headline: "Find Quality Lawn Care",
        description: "Welcome to Jamaica's trusted lawn care marketplace. Post your first job and connect with verified local service providers who deliver quality work.",
        cta: "Post Your First Job",
        ctaUrl: `${appUrl}/post-job`,
        tips: [
          "Add clear photos of your property for accurate quotes",
          "Set your preferred date and time for the service",
          "Review provider ratings before accepting proposals",
          "Payment is held securely until you confirm job completion",
        ]
      };

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Welcome to LawnConnect</title>
    </head>
    <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
        <tr>
          <td align="center">
            <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
              <!-- Header -->
              <tr>
                <td style="background: linear-gradient(135deg, #16a34a 0%, #15803d 100%); padding: 40px; text-align: center;">
                  <img src="${logoUrl}" alt="LawnConnect" width="100" height="100" style="display: block; margin: 0 auto 20px auto; border-radius: 12px;">
                  <h1 style="color: #ffffff; margin: 0; font-size: 32px; font-weight: 700;">Welcome, ${data.firstName}!</h1>
                  <p style="color: #bbf7d0; margin: 12px 0 0 0; font-size: 16px;">${roleSpecificContent.headline}</p>
                </td>
              </tr>
              
              <!-- Main Content -->
              <tr>
                <td style="padding: 40px;">
                  <p style="color: #52525b; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                    ${roleSpecificContent.description}
                  </p>
                  
                  <!-- CTA Button -->
                  <div style="text-align: center; margin: 32px 0;">
                    <a href="${roleSpecificContent.ctaUrl}" style="display: inline-block; background-color: #16a34a; color: #ffffff; padding: 16px 32px; border-radius: 8px; text-decoration: none; font-size: 16px; font-weight: 600;">
                      ${roleSpecificContent.cta}
                    </a>
                  </div>
                  
                  <!-- Tips Section -->
                  <div style="background-color: #f0fdf4; border-radius: 12px; padding: 24px; margin-top: 24px;">
                    <h3 style="color: #166534; margin: 0 0 16px 0; font-size: 16px; font-weight: 600;">
                      🌿 Quick Tips to Get Started
                    </h3>
                    <ul style="margin: 0; padding: 0 0 0 20px; color: #15803d;">
                      ${roleSpecificContent.tips.map(tip => `<li style="margin-bottom: 8px; font-size: 14px; line-height: 1.5;">${tip}</li>`).join('')}
                    </ul>
                  </div>
                </td>
              </tr>
              
              <!-- Footer -->
              <tr>
                <td style="background-color: #f4f4f5; padding: 32px; text-align: center;">
                  <p style="color: #71717a; margin: 0 0 8px 0; font-size: 14px;">
                    Need help? We're here for you.
                  </p>
                  <a href="mailto:officiallawnconnect@gmail.com" style="color: #16a34a; text-decoration: none; font-size: 14px; font-weight: 500;">
                    officiallawnconnect@gmail.com
                  </a>
                  <p style="color: #a1a1aa; margin: 24px 0 0 0; font-size: 12px;">
                    LawnConnect • Jamaica's Lawn Care Marketplace
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
    const data: WelcomeEmailRequest = await req.json();
    
    // Validate required fields
    if (!data.email || !data.firstName || !data.userRole) {
      console.error("Missing required fields:", { email: !!data.email, firstName: !!data.firstName, userRole: !!data.userRole });
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate email format
    if (!isValidEmail(data.email)) {
      console.error("Invalid email format:", data.email);
      return new Response(
        JSON.stringify({ error: 'Invalid email format' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Validate userRole
    if (!['customer', 'provider', 'both'].includes(data.userRole)) {
      console.error("Invalid user role:", data.userRole);
      return new Response(
        JSON.stringify({ error: 'Invalid user role' }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Sanitize firstName (basic XSS prevention)
    const sanitizedFirstName = data.firstName.replace(/[<>]/g, '').substring(0, 50);
    
    console.log("Sending welcome email to:", data.email);

    const htmlContent = createWelcomeEmail({
      ...data,
      firstName: sanitizedFirstName
    });

    const emailResponse = await resend.emails.send({
      from: "LawnConnect <welcome@connectlawn.com>",
      to: [data.email],
      subject: `Welcome to LawnConnect, ${sanitizedFirstName}! 🌿`,
      html: htmlContent,
    });

    console.log("Welcome email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending welcome email:", error);
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