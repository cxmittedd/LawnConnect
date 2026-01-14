import { serve } from "https://deno.land/std@0.190.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface PaymentRequest {
  amount: number;
  currency: string;
  cardNumber: string;
  expiryMonth: string;
  expiryYear: string;
  securityCode: string;
  cardholderName: string;
  orderId: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const body: PaymentRequest = await req.json();
    console.log("Processing test payment for order:", body.orderId, "Amount:", body.amount);

    // Validate required fields
    if (!body.cardNumber || !body.expiryMonth || !body.expiryYear || !body.securityCode) {
      return new Response(
        JSON.stringify({ success: false, error: "Missing required payment fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Simulate payment processing delay
    await new Promise(resolve => setTimeout(resolve, 1000));

    const cleanCardNumber = body.cardNumber.replace(/\s/g, '');
    const transactionReference = `TEST-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;

    console.log("Test payment processed successfully. Reference:", transactionReference);

    return new Response(
      JSON.stringify({
        success: true,
        transactionReference,
        approvalCode: "TEST123",
        responseCode: "APPROVED",
        responseMessage: "Test payment approved",
        lastFour: cleanCardNumber.slice(-4),
        amount: body.amount,
        currency: body.currency || "JMD"
      }),
      { 
        status: 200, 
        headers: { ...corsHeaders, "Content-Type": "application/json" } 
      }
    );

  } catch (error) {
    console.error("Payment processing error:", error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: "Payment processing failed. Please try again." 
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
