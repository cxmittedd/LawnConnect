import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface ContactEmailRequest {
  name: string;
  email: string;
  subject: string;
  message: string;
}

const handler = async (req: Request): Promise<Response> => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { name, email, subject, message }: ContactEmailRequest = await req.json();

    console.log("Received contact email request:", { name, email, subject });

    // Validate inputs
    if (!name || !email || !subject || !message) {
      console.error("Missing required fields");
      return new Response(
        JSON.stringify({ error: "All fields are required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send email to LawnConnect admin
    console.log("Sending email to admin...");
    const adminEmailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LawnConnect <onboarding@resend.dev>",
        to: ["officiallawnconnect@gmail.com"],
        subject: `Contact Form: ${subject}`,
        reply_to: email,
        html: `
          <h2>New Contact Form Submission</h2>
          <p><strong>From:</strong> ${name}</p>
          <p><strong>Email:</strong> ${email}</p>
          <p><strong>Subject:</strong> ${subject}</p>
          <hr />
          <h3>Message:</h3>
          <p>${message.replace(/\n/g, '<br>')}</p>
        `,
      }),
    });

    const adminResult = await adminEmailResponse.json();
    console.log("Admin email response:", adminResult);

    if (!adminEmailResponse.ok) {
      console.error("Failed to send admin email:", adminResult);
      throw new Error(adminResult.message || "Failed to send email to admin");
    }

    console.log("Contact email sent to admin successfully");

    // Send auto-reply confirmation to user
    console.log("Sending auto-reply to user:", email);
    const autoReplyResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from: "LawnConnect <onboarding@resend.dev>",
        to: [email],
        subject: "We received your message - LawnConnect",
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <div style="background-color: #16a34a; padding: 20px; text-align: center;">
              <h1 style="color: white; margin: 0;">LawnConnect</h1>
            </div>
            <div style="padding: 30px; background-color: #f9fafb;">
              <h2 style="color: #1f2937; margin-top: 0;">Hi ${name},</h2>
              <p style="color: #4b5563; line-height: 1.6;">
                Thank you for contacting LawnConnect! We have received your message and will get back to you as soon as possible.
              </p>
              <div style="background-color: white; border-left: 4px solid #16a34a; padding: 15px; margin: 20px 0;">
                <p style="color: #6b7280; margin: 0 0 10px 0;"><strong>Your message:</strong></p>
                <p style="color: #6b7280; margin: 0 0 5px 0;"><strong>Subject:</strong> ${subject}</p>
                <p style="color: #4b5563; margin: 0; white-space: pre-wrap;">${message}</p>
              </div>
              <p style="color: #4b5563; line-height: 1.6;">
                We typically respond within 24 hours during business days. If your matter is urgent, please don't hesitate to send a follow-up email.
              </p>
              <p style="color: #4b5563; line-height: 1.6; margin-bottom: 0;">
                Best regards,<br/>
                <strong>The LawnConnect Team</strong>
              </p>
            </div>
            <div style="background-color: #e5e7eb; padding: 15px; text-align: center;">
              <p style="color: #6b7280; margin: 0; font-size: 12px;">
                Jamaica's trusted lawn care marketplace
              </p>
            </div>
          </div>
        `,
      }),
    });

    if (!autoReplyResponse.ok) {
      const autoReplyResult = await autoReplyResponse.json();
      console.error("Failed to send auto-reply email:", autoReplyResult);
      // Don't throw here - the main email was sent successfully
    } else {
      console.log("Auto-reply email sent to user successfully");
    }

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error in send-contact-email function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
};

serve(handler);