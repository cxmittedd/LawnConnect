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

    console.log("Sending payment request to First Data gateway...");

    const response = await fetch("https://cert.api.firstdata.com/gateway/v2/payment-url", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
      },
      body: JSON.stringify(paymentPayload)
    });

    const responseData = await response.json();
    console.log("Gateway response status:", response.status);
    console.log("Gateway response:", JSON.stringify(responseData));

    if (!response.ok) {
      console.error("Payment gateway error:", responseData);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: responseData.message || "Payment was declined. Please check your card details and try again."
        }),
        { status: response.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const cleanCardNumber = body.cardNumber.replace(/\s/g, '');
    const transactionReference = responseData.ipgTransactionId || responseData.orderId || `TXN-${Date.now()}`;
    const approvalCode = responseData.approvalCode || responseData.processor?.approvalCode || "";

    console.log("Payment processed successfully. Reference:", transactionReference);

    return new Response(
      JSON.stringify({
        success: true,
        transactionReference,
        approvalCode,
        responseCode: responseData.transactionStatus || "APPROVED",
        responseMessage: responseData.transactionState || "Approved",
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
