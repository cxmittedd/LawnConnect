import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const TERMS_VERSION = '2.0.0';
export const TERMS_LAST_UPDATED = '2026-01-05';

export default function TermsOfService() {
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
            <CardTitle className="text-2xl">LawnConnect Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Effective Date: January 5, 2026
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p>
              Welcome to LawnConnect ("LawnConnect", "we", "us" or "our"). These Terms of Service ("Terms") govern your access to and use of the LawnConnect platform, including the website, mobile applications, APIs, payment integrations, and all related services (collectively, the "Service"). By accessing or using the Service in any manner, you agree to be bound by these Terms. If you do not agree, you should not use the Service.
            </p>

            <section>
              <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
              <p>1.1 By registering for an account, accessing, browsing, or using the Service, you agree to comply with and be bound by these Terms.</p>
              <p>1.2 These Terms constitute a legally binding agreement between you and LawnConnect.</p>
              <p>1.3 You confirm that you have the legal capacity to enter into these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Definitions</h2>
              <p>For clarity, in these Terms:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account:</strong> A registered profile on LawnConnect.</li>
                <li><strong>Homeowner/Client:</strong> A user seeking lawn care and yard services through the Service.</li>
                <li><strong>Service Provider/Provider:</strong> A third-party individual or business offering lawn care or yard services through LawnConnect.</li>
                <li><strong>Booking:</strong> A confirmed request by a Homeowner for services from a Service Provider.</li>
                <li><strong>Payment Processor:</strong> A third-party entity that facilitates payment collection and processing.</li>
                <li><strong>Content:</strong> All text, graphics, logos, images, audio, and software available through the Service.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Eligibility and Account Registration</h2>
              <p>3.1 You must be at least 18 years old and capable of entering into a legally binding contract to use the Service.</p>
              <p>3.2 Homeowners must provide accurate, current, and complete information during registration and keep it updated.</p>
              <p>3.3 Service Providers must provide all required credentials, licenses, business information, and verify eligibility to perform the services they offer.</p>
              <p>3.4 You are responsible for safeguarding your account credentials and activities conducted through your account. You agree not to share your login credentials with others.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Platform Role and Independent Contractors</h2>
              <p>4.1 LawnConnect is a marketplace platform connecting Homeowners and Service Providers — it does not directly employ Service Providers.</p>
              <p>4.2 All service agreements/contracts are strictly between Homeowners and Service Providers.</p>
              <p>4.3 LawnConnect is not responsible for the conduct, performance, actions, or omissions of Service Providers, including quality, timeliness, or safety of work.</p>
              <p>4.4 LawnConnect does not guarantee availability, pricing accuracy, performance standards, or legal compliance of Service Providers.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Booking Process and Service Obligations</h2>
              <p>5.1 A Booking is considered confirmed when a Service Provider accepts a Homeowner's request through the Service and payment authorization is completed.</p>
              <p>5.2 Homeowners agree to provide accurate service details, locations, and timing to facilitate proper fulfillment.</p>
              <p>5.3 Service Providers agree to deliver services in a professional manner, compliant with all applicable laws, licenses, and safety standards.</p>
              <p>5.4 Any changes to a confirmed booking (time, scope, date) must be communicated through the Service and consented to by both parties.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Payments and Financial Terms</h2>
              <p>6.1 The Service uses Payment Processors to securely collect and process payments. LawnConnect does not hold customer funds or act as a financial institution.</p>
              <p>6.2 Homeowners authorize LawnConnect to collect payments on behalf of Service Providers and to deduct LawnConnect fees as applicable.</p>
              <p>6.3 Payment confirmation may occur at the time of booking or completion of services, as structured in the checkout flow.</p>
              <p>6.4 You agree that LawnConnect and its Payment Processor may store and transmit your payment information in accordance with their respective privacy and security standards.</p>
              <p>6.5 All fees, prices, and charges are quoted in the currency specified at checkout and may include processing fees.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Chargebacks, Disputes, and Refunds</h2>
              <p>7.1 Homeowners agree to first raise complaints and disputes through LawnConnect's internal support process before initiating chargebacks with a bank or card issuer.</p>
              <p>7.2 Unilateral chargebacks without prior notification to LawnConnect may lead to account suspension, restrictions, or collection actions.</p>
              <p>7.3 LawnConnect may retain fees and costs associated with chargebacks, including administrative charges.</p>
              <p>7.4 If a chargeback is reversed in LawnConnect's favor after a dispute/appeal, LawnConnect may reinstate fees or pursue collection.</p>
              <p>7.5 LawnConnect's <Link to="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</Link> governs refund eligibility and is incorporated herein by reference.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Service Provider Requirements and Conduct</h2>
              <p>8.1 Service Providers must maintain all required permits, licenses, registrations, insurance, and qualifications required by local law.</p>
              <p>8.2 Service Providers must comply with all applicable workplace safety, labor, and tax laws.</p>
              <p>8.3 Providers must accurately represent their services, pricing, and availability.</p>
              <p>8.4 LawnConnect may verify credentials and qualifications, and may suspend or disable accounts of Providers that fail to provide required documentation or violate these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. User Conduct and Prohibited Activities</h2>
              <p>9.1 You agree not to use the Service to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Engage in fraudulent activities;</li>
                <li>Transmit unlawful, defamatory, or harmful content;</li>
                <li>Harass, threaten, or harm another user;</li>
                <li>Circumvent payment processes or manipulate ratings.</li>
              </ul>
              <p>9.2 LawnConnect reserves the right to terminate or suspend accounts and access for violations of these Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Intellectual Property Rights</h2>
              <p>10.1 LawnConnect owns all rights, title, and interest in and to the Service, including software, designs, logos, and trademarks ("LawnConnect IP").</p>
              <p>10.2 You may not copy, reproduce, distribute, modify, or create derivative works of LawnConnect IP without express written permission.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">11. Privacy and Data Protection</h2>
              <p>11.1 Your use of personal data is governed by the LawnConnect Privacy Policy. By using the Service, you consent to the collection, use, and disclosure of personal information as described therein.</p>
              <p>11.2 LawnConnect implements reasonable technical and organizational measures to protect personal data, but no system is completely secure.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">12. Limitation of Liability</h2>
              <p>12.1 To the fullest extent permitted by law, LawnConnect and its affiliates, officers, directors, employees, agents, and licensors will not be liable for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Any indirect, incidental, consequential, punitive, or exemplary damages;</li>
                <li>Loss of revenue, profits, or data;</li>
                <li>Claims arising from a Homeowner's contract with a Service Provider.</li>
              </ul>
              <p>12.2 LawnConnect's total cumulative liability arising out of or related to these Terms or the Service will not exceed the total amount paid by you to LawnConnect in the six (6) months prior to the event giving rise to liability.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">13. Warranty Disclaimer</h2>
              <p>13.1 The Service is provided "as is" and "as available" without warranty of any kind, whether express, implied, statutory, or otherwise, including but not limited to merchantability, fitness for a particular purpose, or non-infringement.</p>
              <p>13.2 LawnConnect makes no warranty that the Service will be uninterrupted, error-free, or secure from unauthorized access.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">14. Indemnification</h2>
              <p>14.1 You agree to indemnify, defend, and hold harmless LawnConnect and its officers, directors, employees, agents, affiliates, and licensors from any claims, demands, losses, liabilities, damages, costs, or expenses (including reasonable legal fees) arising from:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Your use of the Service;</li>
                <li>Your violation of these Terms;</li>
                <li>Your breach of applicable laws;</li>
                <li>Claims relating to services provided by Service Providers.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">15. Dispute Resolution and Governing Law</h2>
              <p>15.1 <strong>Informal Resolution:</strong> Before initiating arbitration, you agree to first attempt to resolve disputes by contacting LawnConnect's support team.</p>
              <p>15.2 <strong>Arbitration:</strong> Any dispute that cannot be resolved informally shall be decided by binding arbitration in Jamaica under mutually agreed rules.</p>
              <p>15.3 <strong>Governing Law:</strong> These Terms are governed by the laws of Jamaica, without regard to conflict of laws principles.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">16. Changes to Terms</h2>
              <p>16.1 LawnConnect may modify these Terms at any time.</p>
              <p>16.2 We will provide notice of material changes via email or prominent notice on the Service.</p>
              <p>16.3 Continued use after changes constitutes acceptance of updated Terms.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">17. Contact Information</h2>
              <p>
                If you have any questions or concerns about these Terms, please contact:<br />
                <strong>LawnConnect</strong><br />
                Email: officiallawnconnect@gmail.com
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
