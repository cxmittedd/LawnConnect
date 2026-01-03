import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const REFUND_POLICY_VERSION = '1.0.0';
export const REFUND_POLICY_LAST_UPDATED = '2026-01-05';

export default function RefundPolicy() {
  const navigate = useNavigate();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/auth');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={handleBack}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Refund & Cancellation Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Version {REFUND_POLICY_VERSION} • Effective Date: {REFUND_POLICY_LAST_UPDATED}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p>
              This Refund & Cancellation Policy explains LawnConnect's terms regarding cancellations, refunds, and dispute resolution for services booked through the LawnConnect platform. This Policy works alongside the <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> and applies to all users — Homeowners and Service Providers.
            </p>

            <section>
              <h2 className="text-lg font-semibold">1. Overview</h2>
              <p>
                LawnConnect facilitates service bookings between Homeowners and independent Service Providers. Because services may vary by provider, and some statutory rights may apply, refunds are granted under the terms below and in accordance with applicable law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Cancellations by Homeowners</h2>

              <h3 className="text-base font-medium mt-3">2.1 Before the Scheduled Service</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>More than 24 hours before service start time:</strong> Homeowners may cancel a booking and ordinarily receive a full refund of the service amount (minus applicable payment processing fees and LawnConnect service fees) if cancellation is done through the Service.</li>
                <li><strong>Within 24 hours of service start time:</strong> Cancellations made within 24 hours of the scheduled time may be subject to partial refund or no refund, depending on the specific Provider's terms. LawnConnect will notify you of any applicable terms at the time of booking.</li>
              </ul>

              <h3 className="text-base font-medium mt-3">2.2 No-Shows</h3>
              <p>If the Homeowner fails to show up at the scheduled location and time, no refund is issued.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Provider Cancellations</h2>
              <p>If a Service Provider cancels a confirmed booking:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Before service time:</strong> Homeowner is eligible for a full refund of the service fee.</li>
                <li><strong>After arrival but refusal to provide service:</strong> Homeowner may receive a partial or full refund, depending on the circumstances.</li>
              </ul>
              <p>LawnConnect reserves the right to compensate a Homeowner for inconvenience or hardship at its discretion.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Service Not Rendered or Quality Issues</h2>
              <p>If a Service Provider fails to deliver reasonable service or delivers substantially different services than described:</p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Homeowner must contact <a href="mailto:officiallawnconnect@gmail.com" className="text-primary hover:underline">officiallawnconnect@gmail.com</a> within 48 hours of the scheduled service.</li>
                <li>Provide evidence (photos, messages, descriptions).</li>
                <li>LawnConnect will conduct an investigation.</li>
              </ol>
              <p>If approved, LawnConnect may issue a full or partial refund as appropriate.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Statutory Rights</h2>
              <p>
                Consumers may have rights under applicable law that cannot be waived by agreement (for example, statutory cancellation rights). This Policy does not limit rights afforded by consumer protection or electronic transaction laws in jurisdictions where you use the Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. How to Request a Refund</h2>
              <p>To request a refund:</p>
              <ol className="list-decimal pl-6 space-y-1">
                <li>Email <a href="mailto:officiallawnconnect@gmail.com" className="text-primary hover:underline">officiallawnconnect@gmail.com</a> with your booking reference and reasons.</li>
                <li>Include supporting evidence where applicable.</li>
                <li>LawnConnect will review and respond within 10 business days.</li>
              </ol>
              <p>Requests submitted after applicable deadlines may be considered at LawnConnect's discretion.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Refund Processing Timeline</h2>
              <p>
                Approved refunds are typically issued back to the original payment method within 14 business days of approval. Your payment processor's policies may affect the timing.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Dispute Resolution Before Chargebacks</h2>
              <p>8.1 Homeowners must attempt resolution through this refund process before initiating any chargebacks with banks or card issuers.</p>
              <p>8.2 Unilateral chargebacks without first using LawnConnect's refund process may lead to account suspension, fees, or denial of future refunds.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Fees and Withholdings</h2>
              <p>Refunds may be reduced by:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Payment processor fees</li>
                <li>LawnConnect service fees (non-refundable)</li>
                <li>Administrative costs incurred in processing disputes or refunds</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Contact</h2>
              <p>
                For refund or cancellation inquiries, email: <a href="mailto:officiallawnconnect@gmail.com" className="text-primary hover:underline">officiallawnconnect@gmail.com</a>
              </p>
            </section>

            <section className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                See also: <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> | <Link to="/privacy" className="text-primary hover:underline">Privacy Policy</Link>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
