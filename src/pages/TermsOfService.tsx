import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const TERMS_VERSION = '1.0.0';
export const TERMS_LAST_UPDATED = '2024-12-03';

export default function TermsOfService() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-background py-8 px-4">
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
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-muted-foreground">
              Version {TERMS_VERSION} • Last updated: {TERMS_LAST_UPDATED}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold">1. Introduction</h2>
              <p>
                Welcome to LawnConnect ("Platform", "we", "us", or "our"). By creating an account 
                and using our services, you ("User", "you", or "your") agree to be bound by these 
                Terms of Service ("Terms"). These Terms comply with the Jamaica Data Protection Act 
                (JDPA) 2020 and the General Data Protection Regulation (GDPR) where applicable.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Definitions</h2>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>"Customer"</strong> - A user seeking lawn care services</li>
                <li><strong>"Service Provider"</strong> - A user offering lawn care services</li>
                <li><strong>"Job Request"</strong> - A request posted by a Customer for lawn care services</li>
                <li><strong>"Proposal"</strong> - An offer submitted by a Service Provider</li>
                <li><strong>"Personal Data"</strong> - Any information relating to an identified or identifiable individual</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. User Accounts</h2>
              <p>3.1. You must be at least 18 years old to use this Platform.</p>
              <p>3.2. You are responsible for maintaining the confidentiality of your account credentials.</p>
              <p>3.3. You agree to provide accurate and complete information during registration.</p>
              <p>3.4. You must not create accounts for fraudulent purposes or impersonate others.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Platform Services</h2>
              <p>4.1. LawnConnect is a marketplace connecting Customers with Service Providers.</p>
              <p>4.2. We facilitate connections but are not party to agreements between users.</p>
              <p>4.3. Payments are held in escrow until job completion is confirmed.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. User Obligations</h2>
              <h3 className="text-base font-medium mt-3">5.1. All Users must:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Comply with all applicable Jamaican laws and regulations</li>
                <li>Communicate respectfully with other users</li>
                <li>Not engage in fraudulent or deceptive practices</li>
                <li>Report any issues or disputes through proper channels</li>
              </ul>
              
              <h3 className="text-base font-medium mt-3">5.2. Service Providers must:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Perform services professionally and to agreed standards</li>
                <li>Upload completion photos as proof of work</li>
                <li>Have a maximum of 5 active proposals at any time</li>
              </ul>

              <h3 className="text-base font-medium mt-3">5.3. Customers must:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Provide accurate job descriptions and photos</li>
                <li>Pay for services as agreed</li>
                <li>Confirm job completion in good faith</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Payments and Fees</h2>
              <p>6.1. Minimum job price is J$7,000 (Jamaican Dollars).</p>
              <p>6.2. Customers pay upfront; funds are held until job completion.</p>
              <p>6.3. Service Providers receive payment after job completion confirmation.</p>
              <p>6.4. Refunds are processed according to our dispute resolution process.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Dispute Resolution</h2>
              <p>7.1. Users may raise disputes if dissatisfied with service quality.</p>
              <p>7.2. Disputed jobs return to "in progress" status for resolution.</p>
              <p>7.3. Our admin team may intervene in unresolved disputes.</p>
              <p>7.4. Final decisions by LawnConnect are binding.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Limitation of Liability</h2>
              <p>8.1. LawnConnect is not liable for the quality of services provided by Service Providers.</p>
              <p>8.2. We are not responsible for disputes between users beyond facilitating resolution.</p>
              <p>8.3. Our maximum liability shall not exceed the platform fees collected for the disputed transaction.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Intellectual Property</h2>
              <p>9.1. All Platform content and branding are owned by LawnConnect.</p>
              <p>9.2. Users retain ownership of content they upload but grant us license to use it for Platform purposes.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Termination</h2>
              <p>10.1. You may close your account at any time.</p>
              <p>10.2. We may suspend or terminate accounts for Terms violations.</p>
              <p>10.3. Outstanding obligations survive account termination.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">11. Changes to Terms</h2>
              <p>11.1. We may update these Terms with reasonable notice.</p>
              <p>11.2. Continued use after changes constitutes acceptance.</p>
              <p>11.3. Material changes will be communicated via email.</p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">12. Governing Law</h2>
              <p>
                These Terms are governed by the laws of Jamaica. Any disputes shall be 
                resolved in the courts of Jamaica.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">13. Contact Information</h2>
              <p>
                For questions about these Terms, contact us at:<br />
                Email: support@lawnconnect.jm<br />
                Address: Kingston, Jamaica
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
