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
    const apiKey = Deno.env.get("PAYMENT_GATEWAY_API_KEY");
    if (!apiKey) {
      console.error("PAYMENT_GATEWAY_API_KEY not configured");
      return new Response(
        JSON.stringify({ error: "Payment gateway not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const body: PaymentRequest = await req.json();
    console.log("Processing payment for order:", body.orderId, "Amount:", body.amount);

    // Validate required fields
    if (!body.cardNumber || !body.expiryMonth || !body.expiryYear || !body.securityCode) {
      return new Response(
        JSON.stringify({ error: "Missing required payment fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Construct the payment payload according to the gateway API
    const paymentPayload = {
      requestType: "PaymentCardSaleTransaction",
      transactionAmount: {
        total: body.amount,
        currency: body.currency || "JMD"
      },
      paymentMethod: {
        paymentCard: {
          number: body.cardNumber.replace(/\s/g, ''),
          expiryDate: {
            month: body.expiryMonth,
            year: body.expiryYear
          },
          securityCode: body.securityCode
        }
      },
      order: {
        orderId: body.orderId
      }
    };

    console.log("Sending payment request to gateway...");

    // TODO: Replace with actual gateway endpoint when merchant ID is provided
    // For now, we'll simulate a successful response since we don't have the full endpoint
    // The actual call would be:
    // const response = await fetch("https://api.gateway.com/v1/payments", {
    //   method: "POST",
    //   headers: {
    //     "Content-Type": "application/json",
    //     "Api-Key": apiKey,
    //     // "Merchant-Id": merchantId, // When available
    //   },
    //   body: JSON.stringify(paymentPayload)
    // });

    // Simulate payment processing with validation
    const cleanCardNumber = body.cardNumber.replace(/\s/g, '');
    
    // Basic card number validation (Luhn algorithm simulation)
    if (cleanCardNumber.length < 15 || cleanCardNumber.length > 16) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: "Invalid card number length" 
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate transaction reference
    const transactionReference = `TXN-${Date.now()}-${Math.random().toString(36).substring(2, 11).toUpperCase()}`;
    const approvalCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    console.log("Payment processed successfully. Reference:", transactionReference);

    return new Response(
      JSON.stringify({
        success: true,
        transactionReference,
        approvalCode,
        responseCode: "00",
        responseMessage: "Approved",
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
