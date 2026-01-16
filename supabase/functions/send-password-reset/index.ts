import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.86.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface PasswordResetRequest {
  email: string;
  redirectTo: string;
}

const handler = async (req: Request): Promise<Response> => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, redirectTo }: PasswordResetRequest = await req.json();

    if (!email) {
      return new Response(
        JSON.stringify({ error: "Email is required" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email) || email.length > 255) {
      console.error("Invalid email format:", email);
      return new Response(
        JSON.stringify({ error: "Invalid email format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Validate redirectTo is from our domain
    const allowedDomains = ['connectlawn.com', 'lawnconnect.jm', 'localhost', 'lovableproject.com', 'lovable.app'];
    let redirectUrl: URL;
    try {
      redirectUrl = new URL(redirectTo);
      const isAllowedDomain = allowedDomains.some(domain => 
        redirectUrl.hostname === domain || redirectUrl.hostname.endsWith(`.${domain}`)
      );
      if (!isAllowedDomain) {
        console.error("Redirect URL from unauthorized domain:", redirectUrl.hostname);
        return new Response(
          JSON.stringify({ error: "Invalid redirect domain" }),
          {
            status: 400,
            headers: { "Content-Type": "application/json", ...corsHeaders },
          }
        );
      }
    } catch {
      console.error("Invalid redirect URL:", redirectTo);
      return new Response(
        JSON.stringify({ error: "Invalid redirect URL format" }),
        {
          status: 400,
          headers: { "Content-Type": "application/json", ...corsHeaders },
        }
      );
    }

    // Use service role to generate the reset link without sending default email
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate the password reset link using admin API (doesn't send email)
    const { data: linkData, error: linkError } = await supabase.auth.admin.generateLink({
      type: 'recovery',
      email: email,
      options: {
        redirectTo: redirectTo,
      }
    });

    if (linkError) {
      // Don't reveal if email exists or not for security
      console.log("Link generation failed (could be non-existent email):", linkError.message);
      // Return success anyway to not reveal email existence
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    if (!linkData?.properties?.action_link) {
      console.error("No action link generated");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Extract tokens from the Supabase action link and construct our own URL
    const supabaseActionLink = new URL(linkData.properties.action_link);

    // `generateLink` returns a Supabase verify URL like:
    // .../auth/v1/verify?token=...&type=recovery&redirect_to=...
    // We don't want users to ever see a Supabase/Lovable URL, so we construct our own
    // reset URL on the LawnConnect domain and verify the token client-side.
    const tokenHash =
      supabaseActionLink.searchParams.get("token") ??
      supabaseActionLink.searchParams.get("token_hash") ??
      "";
    const linkType = supabaseActionLink.searchParams.get("type") ?? "recovery";

    if (!tokenHash) {
      console.error("No token found in action link");
      return new Response(JSON.stringify({ success: true }), {
        status: 200,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const productionDomain = "https://connectlawn.com";
    const resetLink = `${productionDomain}/reset-password?token_hash=${encodeURIComponent(tokenHash)}&type=${encodeURIComponent(linkType)}`;

    console.log("Sending password reset email to:", email);
    console.log("Reset link constructed:", resetLink);

    const emailResponse = await resend.emails.send({
      from: "LawnConnect <noreply@connectlawn.com>",
      to: [email],
      subject: "Reset Your LawnConnect Password",
      html: `
        <!DOCTYPE html>
        <html lang="en">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Reset Your Password</title>
        </head>
        <body style="margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; background-color: #f4f4f5;">
          <table role="presentation" style="width: 100%; border-collapse: collapse;">
            <tr>
              <td align="center" style="padding: 40px 20px;">
                <table role="presentation" style="width: 100%; max-width: 480px; border-collapse: collapse; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
                  <!-- Header with Logo -->
                  <tr>
                    <td align="center" style="padding: 40px 40px 20px 40px;">
                      <img src="https://connectlawn.com/pwa-512x512.png" alt="LawnConnect" width="100" height="100" style="display: block; border: 0; border-radius: 12px;" />
                    </td>
                  </tr>
                  
                  <!-- Title -->
                  <tr>
                    <td align="center" style="padding: 0 40px 20px 40px;">
                      <h1 style="margin: 0; font-size: 24px; font-weight: 700; color: #18181b;">Reset Your Password</h1>
                    </td>
                  </tr>
                  
                  <!-- Body Text -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <p style="margin: 0 0 16px 0; font-size: 16px; line-height: 24px; color: #52525b;">
                        We received a request to reset the password for your LawnConnect account. Click the button below to set a new password.
                      </p>
                      <p style="margin: 0; font-size: 14px; line-height: 22px; color: #71717a;">
                        If you didn't request this, you can safely ignore this email. Your password will remain unchanged.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- CTA Button -->
                  <tr>
                    <td align="center" style="padding: 0 40px 30px 40px;">
                      <a href="${resetLink}" target="_blank" style="display: inline-block; padding: 14px 32px; background-color: #16a34a; color: #ffffff; text-decoration: none; font-size: 16px; font-weight: 600; border-radius: 8px;">
                        Reset Password
                      </a>
                    </td>
                  </tr>
                  
                  <!-- Alternative Link -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; color: #71717a;">
                        Or copy and paste this link into your browser:
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #16a34a; word-break: break-all;">
                        ${resetLink}
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Expiry Notice -->
                  <tr>
                    <td style="padding: 0 40px 30px 40px; border-top: 1px solid #e4e4e7;">
                      <p style="margin: 20px 0 0 0; font-size: 13px; color: #a1a1aa;">
                        This link will expire in 1 hour for security reasons.
                      </p>
                    </td>
                  </tr>
                  
                  <!-- Footer -->
                  <tr>
                    <td align="center" style="padding: 20px 40px 30px 40px; background-color: #fafafa; border-radius: 0 0 12px 12px;">
                      <p style="margin: 0 0 8px 0; font-size: 14px; font-weight: 600; color: #18181b;">
                        LawnConnect
                      </p>
                      <p style="margin: 0; font-size: 12px; color: #71717a;">
                        Jamaica's Premier Lawn Care Marketplace
                      </p>
                      <p style="margin: 16px 0 0 0; font-size: 11px; color: #a1a1aa;">
                        © ${new Date().getFullYear()} LawnConnect. All rights reserved.
                      </p>
                      <p style="margin: 8px 0 0 0; font-size: 11px; color: #a1a1aa;">
                        Questions? Contact us at <a href="mailto:officiallawnconnect@gmail.com" style="color: #16a34a;">officiallawnconnect@gmail.com</a>
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    });

    console.log("Password reset email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending password reset email:", error);
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
