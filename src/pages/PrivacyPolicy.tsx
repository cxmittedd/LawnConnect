import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate, Link } from 'react-router-dom';

export const PRIVACY_VERSION = '2.0.0';
export const PRIVACY_LAST_UPDATED = '2026-01-05';

export default function PrivacyPolicy() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        <Button 
          variant="ghost" 
          onClick={() => navigate(-1)}
          className="mb-4"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>

        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Version {PRIVACY_VERSION} • Effective Date: {PRIVACY_LAST_UPDATED}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <p>
              This Privacy Policy explains how LawnConnect ("LawnConnect", "we", "our", or "us") collects, uses, discloses, retains, secures, and otherwise processes personal information that you provide or that we collect when you access or use the LawnConnect website, mobile application, APIs, or related services (collectively, the "Service"). By using the Service, you consent to the practices described in this Privacy Policy.
            </p>

            <section>
              <h2 className="text-lg font-semibold">1. Information We Collect</h2>
              
              <h3 className="text-base font-medium mt-3">1.1 Information You Provide Directly</h3>
              <p>We collect personal information that you provide when you register, book services, communicate with us, or use features of the Service:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Account Information:</strong> Name, email address, phone number, username, password.</li>
                <li><strong>Booking Information:</strong> Service details, location, date/time, special instructions.</li>
                <li><strong>Payment Information:</strong> Credit/debit card details or payment tokens (processed securely by a third-party), billing address.</li>
                <li><strong>Communication Data:</strong> Emails, chats, support inquiries, feedback/reviews.</li>
                <li><strong>Profile Details:</strong> Profile photo, business name (for Service Providers), certifications/licenses.</li>
              </ul>

              <h3 className="text-base font-medium mt-3">1.2 Information Collected Automatically</h3>
              <p>When you interact with the Service, we may collect data automatically:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Device Information:</strong> IP address, device type, operating system, browser type.</li>
                <li><strong>Usage Data:</strong> Pages viewed, time spent on pages, features used, clicks.</li>
                <li><strong>Location Data:</strong> Geolocation data if you enable location services (used to match you with nearby Service Providers).</li>
                <li><strong>Cookies and Tracking:</strong> We use cookies, pixel tags, local storage, and similar technologies to enhance your experience, analyze performance, and support advertising and analytics.</li>
              </ul>

              <h3 className="text-base font-medium mt-3">1.3 Information from Third Parties</h3>
              <p>We may receive information about you from trusted third parties:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Payment processors (e.g., card token info).</li>
                <li>Third-party authentication providers (if you sign in via Google, Apple, etc.).</li>
                <li>Publicly available sources and data enrichment services.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Use of Your Information</h2>
              <p>We use your personal information to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide, operate, and maintain the Service.</li>
                <li>Process and fulfill bookings and payments.</li>
                <li>Communicate with you about bookings, updates, support, and promotional offers (where permitted).</li>
                <li>Personalize your experience, including recommending Service Providers.</li>
                <li>Improve and optimize the Service through analytics and performance measurement.</li>
                <li>Detect, prevent, and address fraud, abuse, security, or technical issues.</li>
                <li>Comply with legal obligations and enforce our agreements.</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Sharing and Disclosure of Information</h2>
              <p>We may share your information with:</p>

              <h3 className="text-base font-medium mt-3">3.1 Service Providers and Partners</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Service Providers to fulfill bookings (e.g., provider receives your name, location, contact details necessary to deliver services).</li>
                <li>Payment processors and financial institutions to process payments and refunds.</li>
                <li>Cloud service providers and analytics partners for hosting, storage, and performance monitoring.</li>
              </ul>

              <h3 className="text-base font-medium mt-3">3.2 Legal and Safety Obligations</h3>
              <p>We may disclose information:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>In response to lawful requests by public authorities (e.g., to comply with national security or law enforcement requirements).</li>
                <li>To protect the rights, property, or safety of LawnConnect, our users, or the public.</li>
                <li>In connection with legal proceedings, government investigations, or as required by applicable law.</li>
              </ul>

              <h3 className="text-base font-medium mt-3">3.3 With Your Consent</h3>
              <p>We may share information with third parties when you consent or direct us to do so.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Data Retention</h2>
              <p>We retain information as needed to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide the Service and fulfill bookings.</li>
                <li>Comply with legal and regulatory obligations (including tax and financial reporting).</li>
                <li>Resolve disputes and enforce agreements.</li>
                <li>Conduct analytics and historical reporting.</li>
              </ul>
              <p>When information is no longer needed, we will delete, anonymize, or de-identify it in a secure manner.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. Security</h2>
              <p>
                We implement reasonable administrative, technical, and physical safeguards designed to protect personal information from unauthorized access, use, or disclosure. However, no method of transmission over the internet or storage is 100% secure. You acknowledge that transmission of information is at your own risk.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Children's Privacy</h2>
              <p>
                The Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13. If you become aware that your child has provided us with personal information, please contact us, and we will delete such information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Your Rights and Choices</h2>

              <h3 className="text-base font-medium mt-3">7.1 Access and Correction</h3>
              <p>You may access, update, correct, or request deletion of your personal information by contacting support@connectlawn.com.</p>

              <h3 className="text-base font-medium mt-3">7.2 Marketing Preferences</h3>
              <p>You can opt out of promotional communications at any time by following unsubscribe instructions in emails or contacting support.</p>

              <h3 className="text-base font-medium mt-3">7.3 Data Portability</h3>
              <p>Where applicable, you may request that we provide a copy of your personal data in a structured, machine-readable format.</p>

              <h3 className="text-base font-medium mt-3">7.4 No Retaliation</h3>
              <p>We will not discriminate against you for exercising your privacy rights.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. International Transfers</h2>
              <p>
                Your information may be stored and processed in countries other than your own. LawnConnect will take reasonable steps to ensure that cross-border transfers are subject to appropriate safeguards.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Cookies and Tracking Technologies</h2>
              <p>
                We use cookies, local storage, and similar tracking technologies to improve user experience, analytics, and advertising. You can set your browser to refuse cookies or to alert you when cookies are being sent.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Changes to This Privacy Policy</h2>
              <p>
                We may update this Privacy Policy from time to time. We will notify you of material changes via email or in-Service notice. Changes become effective when posted.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">11. Contact Us</h2>
              <p>
                If you have questions about this Privacy Policy, email: <a href="mailto:support@connectlawn.com" className="text-primary hover:underline">support@connectlawn.com</a>
              </p>
            </section>

            <section className="pt-4 border-t border-border">
              <p className="text-sm text-muted-foreground">
                See also: <Link to="/terms" className="text-primary hover:underline">Terms of Service</Link> | <Link to="/refund-policy" className="text-primary hover:underline">Refund & Cancellation Policy</Link>
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
