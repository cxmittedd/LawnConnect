import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PRIVACY_VERSION = '1.0.0';
export const PRIVACY_LAST_UPDATED = '2024-12-03';

export default function PrivacyPolicy() {
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
            <CardTitle className="text-2xl">Privacy Policy</CardTitle>
            <p className="text-sm text-muted-foreground">
              Version {PRIVACY_VERSION} • Last updated: {PRIVACY_LAST_UPDATED}
            </p>
          </CardHeader>
          <CardContent className="prose prose-sm dark:prose-invert max-w-none space-y-6">
            <section>
              <h2 className="text-lg font-semibold">1. Introduction</h2>
              <p>
                LawnConnect ("we", "us", or "our") is committed to protecting your personal data 
                in accordance with the Jamaica Data Protection Act (JDPA) 2020 and the General 
                Data Protection Regulation (GDPR) where applicable. This Privacy Policy explains 
                how we collect, use, store, and protect your information.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Data Controller</h2>
              <p>
                LawnConnect is the data controller responsible for your personal data.<br />
                Contact: support@lawnconnect.jm<br />
                Address: Kingston, Jamaica
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Personal Data We Collect</h2>
              <h3 className="text-base font-medium mt-3">3.1. Information you provide:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Full name and email address</li>
                <li>Phone number (optional)</li>
                <li>Physical address for service locations</li>
                <li>Company name (for Service Providers)</li>
                <li>Photos of properties for job requests</li>
                <li>Messages and communications on the platform</li>
              </ul>

              <h3 className="text-base font-medium mt-3">3.2. Information collected automatically:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>IP address and device information</li>
                <li>Browser type and settings</li>
                <li>Usage data and platform interactions</li>
                <li>Timestamps of activities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Legal Basis for Processing (GDPR/JDPA)</h2>
              <p>We process your personal data based on:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Contract Performance:</strong> To provide our marketplace services</li>
                <li><strong>Consent:</strong> For optional features and marketing communications</li>
                <li><strong>Legitimate Interest:</strong> For platform security and fraud prevention</li>
                <li><strong>Legal Obligation:</strong> To comply with Jamaican laws</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. How We Use Your Data</h2>
              <p>We use your personal data to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Create and manage your account</li>
                <li>Facilitate connections between Customers and Service Providers</li>
                <li>Process payments and transactions</li>
                <li>Send transactional notifications (job updates, payment confirmations)</li>
                <li>Resolve disputes and provide customer support</li>
                <li>Improve our platform and services</li>
                <li>Ensure platform security and prevent fraud</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Data Sharing</h2>
              <p>We may share your data with:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Other Users:</strong> Limited profile information to facilitate transactions</li>
                <li><strong>Service Providers:</strong> Email services (Resend) for notifications</li>
                <li><strong>Legal Authorities:</strong> When required by Jamaican law</li>
              </ul>
              <p className="mt-2">
                We do NOT sell your personal data to third parties.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Data Retention</h2>
              <p>We retain your personal data for:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Active accounts:</strong> For the duration of your account</li>
                <li><strong>Transaction records:</strong> 7 years for legal and tax purposes</li>
                <li><strong>Consent records:</strong> Indefinitely for legal compliance</li>
                <li><strong>Deleted accounts:</strong> Data anonymized within 30 days, except where legal retention applies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Your Rights (GDPR/JDPA)</h2>
              <p>You have the right to:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Access:</strong> Request a copy of your personal data</li>
                <li><strong>Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Erasure:</strong> Request deletion of your data ("right to be forgotten")</li>
                <li><strong>Restrict Processing:</strong> Limit how we use your data</li>
                <li><strong>Data Portability:</strong> Receive your data in a portable format</li>
                <li><strong>Object:</strong> Object to processing based on legitimate interests</li>
                <li><strong>Withdraw Consent:</strong> Withdraw consent at any time</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at support@lawnconnect.jm. We will respond 
                within 30 days as required by law.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Data Security</h2>
              <p>We implement appropriate security measures including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encryption of data in transit and at rest</li>
                <li>Row-level security for database access</li>
                <li>Secure authentication mechanisms</li>
                <li>Regular security audits</li>
                <li>Private storage buckets for sensitive files</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. International Data Transfers</h2>
              <p>
                Our services use cloud infrastructure that may process data outside Jamaica. 
                We ensure appropriate safeguards are in place for any international transfers, 
                including standard contractual clauses where required.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">11. Children's Privacy</h2>
              <p>
                Our Platform is not intended for individuals under 18 years of age. We do not 
                knowingly collect data from children. If we become aware of such collection, 
                we will delete it immediately.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">12. Cookies and Tracking</h2>
              <p>
                We use essential cookies for authentication and session management. We do not 
                use third-party tracking cookies for advertising purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">13. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically. We will notify you of material 
                changes via email or platform notification. The "Last updated" date indicates 
                the most recent revision.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">14. Complaints</h2>
              <p>
                If you have concerns about how we handle your data, you may:<br />
                1. Contact us at support@lawnconnect.jm<br />
                2. File a complaint with the Office of the Information Commissioner (Jamaica)<br />
                3. For EU residents: Contact your local Data Protection Authority
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">15. Contact Us</h2>
              <p>
                For privacy-related inquiries:<br />
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
