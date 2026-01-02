import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { encode as base64Encode, decode as base64Decode } from "https://deno.land/std@0.190.0/encoding/base64.ts";

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

// Store ID for First Data/Fiserv
const STORE_ID = "72305408";

// Generate HMAC signature for First Data/Fiserv authentication
async function generateHmacSignature(
  apiKey: string,
  apiSecretBase64: string,
  clientRequestId: string,
  timestamp: string,
  payload: string
): Promise<string> {
  // Fiserv signature format: apiKey + clientRequestId + timestamp + payload
  const message = apiKey + clientRequestId + timestamp + payload;
  const encoder = new TextEncoder();
  
  // Try both: first as raw string, the secret may not actually need base64 decoding
  // Some Fiserv implementations use the secret directly as a string
  const keyData = encoder.encode(apiSecretBase64);
  const messageData = encoder.encode(message);
  
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyData,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  
  const signature = await crypto.subtle.sign("HMAC", cryptoKey, messageData);
  return base64Encode(signature);
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const apiKey = Deno.env.get("PAYMENT_GATEWAY_API_KEY");
    const apiSecret = Deno.env.get("PAYMENT_GATEWAY_API_SECRET");
    
    if (!apiKey || !apiSecret) {
      console.error("Payment gateway credentials not configured");
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

    // Construct the payment payload according to First Data API
    const paymentPayload = {
      requestType: "PaymentCardSaleTransaction",
      storeId: STORE_ID,
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

    const payloadString = JSON.stringify(paymentPayload);
    const timestamp = Date.now().toString();
    const clientRequestId = `REQ-${timestamp}-${Math.random().toString(36).substring(2, 11)}`;
    
    // Generate HMAC signature with base64-decoded secret
    const hmacSignature = await generateHmacSignature(apiKey, apiSecret, clientRequestId, timestamp, payloadString);

    console.log("Sending payment request to First Data gateway...");
    console.log("Client Request ID:", clientRequestId);
    console.log("Store ID:", STORE_ID);

    const response = await fetch("https://cert.api.firstdata.com/gateway/v2/payments", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Api-Key": apiKey,
        "Client-Request-Id": clientRequestId,
        "Timestamp": timestamp,
        "Message-Signature": hmacSignature,
      },
      body: payloadString
    });

    const responseData = await response.json();
    console.log("Gateway response status:", response.status);
    console.log("Gateway response:", JSON.stringify(responseData));

    if (!response.ok) {
      console.error("Payment gateway error:", responseData);
      const errorMessage = responseData.error?.message || 
                          responseData.transactionStatus || 
                          "Payment was declined. Please check your card details and try again.";
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: errorMessage
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
