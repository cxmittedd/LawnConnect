import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export const PRIVACY_VERSION = '1.1.0';
export const PRIVACY_LAST_UPDATED = '2024-12-14';

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
                how we collect, use, store, and protect your information when you use our lawn care 
                marketplace platform ("Platform" or "Service").
              </p>
              <p>
                By using our Platform, you acknowledge that you have read and understood this Privacy 
                Policy. If you do not agree with our practices, please do not use our Service.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">2. Data Controller</h2>
              <p>
                LawnConnect is the data controller responsible for your personal data.<br />
                Contact: support@lawnconnect.jm<br />
                Address: Kingston, Jamaica
              </p>
              <p>
                For data protection inquiries, you may contact our Data Protection Officer at 
                support@lawnconnect.jm.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">3. Personal Data We Collect</h2>
              <h3 className="text-base font-medium mt-3">3.1. Information you provide directly:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Full name (first and last name) and email address</li>
                <li>Phone number</li>
                <li>Physical address for service locations</li>
                <li>Company name (for Service Providers)</li>
                <li>Profile biography and avatar photos</li>
                <li>Photos of properties for job requests</li>
                <li>Messages and communications on the platform</li>
                <li>Payment information and transaction records</li>
              </ul>

              <h3 className="text-base font-medium mt-3">3.2. Identity Verification Data (Service Providers only):</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Government-issued identification documents (Driver's License, Passport, or National ID)</li>
                <li>Selfie photographs for identity verification</li>
                <li>Biometric data derived from facial recognition processing for verification purposes</li>
              </ul>

              <h3 className="text-base font-medium mt-3">3.3. Information collected automatically:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>IP address and device information</li>
                <li>Browser type, version, and settings</li>
                <li>Operating system information</li>
                <li>Usage data and platform interactions</li>
                <li>Timestamps of activities</li>
                <li>Cookies and similar tracking technologies</li>
                <li>User agent information</li>
              </ul>

              <h3 className="text-base font-medium mt-3">3.4. Job and Transaction Data:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Job completion photos (before and after)</li>
                <li>Dispute records and resolution communications</li>
                <li>Ratings and reviews</li>
                <li>Payment history and transaction records</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">4. Legal Basis for Processing (GDPR/JDPA)</h2>
              <p>We process your personal data based on the following legal grounds:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Contract Performance:</strong> Processing necessary to provide our marketplace services, facilitate transactions, and fulfill our contractual obligations to you</li>
                <li><strong>Consent:</strong> For optional features, marketing communications, and collection of biometric data for identity verification</li>
                <li><strong>Legitimate Interest:</strong> For platform security, fraud prevention, service improvement, and dispute resolution</li>
                <li><strong>Legal Obligation:</strong> To comply with Jamaican laws, tax requirements, and respond to lawful requests from authorities</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">5. How We Use Your Data</h2>
              <p>We use your personal data for the following purposes:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Create, manage, and authenticate your account</li>
                <li>Verify Service Provider identities to ensure marketplace safety</li>
                <li>Facilitate connections between Customers and Service Providers</li>
                <li>Process payments and manage transactions</li>
                <li>Send transactional notifications (job updates, payment confirmations, dispute alerts)</li>
                <li>Resolve disputes and provide customer support</li>
                <li>Enforce our Terms of Service and platform policies</li>
                <li>Improve our platform, services, and user experience</li>
                <li>Ensure platform security, prevent fraud, and detect abuse</li>
                <li>Comply with legal and regulatory requirements</li>
                <li>Generate anonymized analytics and statistics</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">6. Biometric Data Processing</h2>
              <p>
                For Service Provider identity verification, we collect and process biometric data 
                including facial geometry derived from selfie photographs. This processing is 
                performed to:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Verify that the person submitting identity documents is the legitimate document holder</li>
                <li>Prevent identity fraud and protect marketplace participants</li>
                <li>Comply with Know Your Customer (KYC) best practices</li>
              </ul>
              <p className="mt-2">
                <strong>Your Rights Regarding Biometric Data:</strong> You may request deletion of 
                your biometric data at any time by contacting support@lawnconnect.jm. However, 
                this may result in revocation of your Service Provider status.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">7. Data Sharing and Third Parties</h2>
              <p>We may share your data with the following categories of recipients:</p>
              
              <h3 className="text-base font-medium mt-3">7.1. Other Platform Users:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Limited profile information to facilitate transactions</li>
                <li>Contact details shared only after job acceptance</li>
                <li>Job photos visible only to relevant parties</li>
                <li>Ratings visible to authenticated users</li>
              </ul>

              <h3 className="text-base font-medium mt-3">7.2. Service Providers and Partners:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Email Services (Resend):</strong> For sending transactional notifications</li>
                <li><strong>Cloud Infrastructure (Supabase):</strong> For data storage and processing</li>
                <li><strong>Payment Processors:</strong> For handling financial transactions</li>
                <li><strong>AI Processing Services:</strong> For face detection in identity verification</li>
              </ul>

              <h3 className="text-base font-medium mt-3">7.3. Legal and Regulatory:</h3>
              <ul className="list-disc pl-6 space-y-1">
                <li>Law enforcement when required by valid legal process</li>
                <li>Regulatory authorities as required by Jamaican law</li>
                <li>Courts in connection with legal proceedings</li>
              </ul>

              <p className="mt-3 font-medium">
                We do NOT sell, rent, or trade your personal data to third parties for marketing purposes.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">8. Data Retention</h2>
              <p>We retain your personal data for the following periods:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Active accounts:</strong> For the duration of your account plus 30 days after deletion request</li>
                <li><strong>Transaction records:</strong> 7 years for legal, tax, and audit purposes</li>
                <li><strong>Identity verification documents:</strong> For the duration of your Service Provider status plus 2 years</li>
                <li><strong>Dispute records:</strong> 7 years from resolution date</li>
                <li><strong>Consent records:</strong> Indefinitely for legal compliance</li>
                <li><strong>Audit logs:</strong> 7 years for legal compliance</li>
                <li><strong>Job completion photos:</strong> 2 years from job completion</li>
                <li><strong>Deleted accounts:</strong> Data anonymized within 30 days, except where legal retention applies</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">9. Your Rights (GDPR/JDPA)</h2>
              <p>Under applicable data protection laws, you have the following rights:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Right of Access:</strong> Request a copy of your personal data we hold</li>
                <li><strong>Right to Rectification:</strong> Correct inaccurate or incomplete data</li>
                <li><strong>Right to Erasure:</strong> Request deletion of your data ("right to be forgotten"), subject to legal retention requirements</li>
                <li><strong>Right to Restrict Processing:</strong> Limit how we use your data in certain circumstances</li>
                <li><strong>Right to Data Portability:</strong> Receive your data in a structured, machine-readable format</li>
                <li><strong>Right to Object:</strong> Object to processing based on legitimate interests or direct marketing</li>
                <li><strong>Right to Withdraw Consent:</strong> Withdraw previously given consent at any time</li>
                <li><strong>Right to Lodge a Complaint:</strong> File a complaint with a supervisory authority</li>
              </ul>
              <p className="mt-2">
                To exercise these rights, contact us at support@lawnconnect.jm. We will respond 
                within 30 days as required by law. We may request identity verification before 
                processing your request.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">10. Data Security</h2>
              <p>We implement appropriate technical and organizational security measures including:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Encryption of data in transit (TLS/SSL) and at rest</li>
                <li>Row-level security (RLS) for database access control</li>
                <li>Secure authentication with password complexity requirements</li>
                <li>Private storage buckets for sensitive files (ID documents, completion photos)</li>
                <li>Regular security audits and vulnerability assessments</li>
                <li>Access controls and role-based permissions</li>
                <li>Admin audit logging for accountability</li>
                <li>Secure session management</li>
              </ul>
              <p className="mt-2">
                While we implement industry-standard security measures, no method of transmission 
                or storage is 100% secure. We cannot guarantee absolute security of your data.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">11. International Data Transfers</h2>
              <p>
                Our services use cloud infrastructure that may process data outside Jamaica, 
                including the United States and European Union. When transferring data internationally, 
                we ensure appropriate safeguards are in place, including:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Standard Contractual Clauses (SCCs) approved by relevant authorities</li>
                <li>Data processing agreements with third-party providers</li>
                <li>Adequacy decisions where applicable</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">12. Children's Privacy</h2>
              <p>
                Our Platform is not intended for individuals under 18 years of age. We do not 
                knowingly collect personal data from children. If you are a parent or guardian 
                and believe your child has provided us with personal data, please contact us 
                immediately. If we become aware of such collection, we will take steps to delete 
                the information promptly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">13. Cookies and Tracking Technologies</h2>
              <p>We use the following types of cookies and similar technologies:</p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Essential Cookies:</strong> Required for authentication, session management, and security</li>
                <li><strong>Functional Cookies:</strong> Remember your preferences and settings</li>
                <li><strong>Analytics:</strong> Help us understand how users interact with our Platform</li>
              </ul>
              <p className="mt-2">
                We do not use third-party tracking cookies for advertising purposes. You can 
                manage cookie preferences through your browser settings, though disabling essential 
                cookies may affect Platform functionality.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">14. Automated Decision-Making</h2>
              <p>
                We use automated processing in the following areas:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li><strong>Face Detection:</strong> Automated verification that selfie photos contain a face</li>
                <li><strong>Auto-Completion:</strong> Automatic job completion after 30 hours if customer doesn't respond</li>
              </ul>
              <p className="mt-2">
                You have the right to request human review of automated decisions that significantly 
                affect you. Contact support@lawnconnect.jm to request a review.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">15. Data Breach Notification</h2>
              <p>
                In the event of a personal data breach that poses a high risk to your rights and 
                freedoms, we will:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Notify the Office of the Information Commissioner (Jamaica) within 72 hours where required</li>
                <li>Notify affected individuals without undue delay</li>
                <li>Document the breach and remediation steps taken</li>
              </ul>
            </section>

            <section>
              <h2 className="text-lg font-semibold">16. Changes to This Policy</h2>
              <p>
                We may update this Privacy Policy periodically to reflect changes in our practices, 
                technologies, legal requirements, or for other operational reasons. When we make 
                material changes, we will:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Update the "Last updated" date at the top of this policy</li>
                <li>Notify you via email or platform notification</li>
                <li>Obtain fresh consent where required by law</li>
              </ul>
              <p className="mt-2">
                Continued use of the Platform after notification constitutes acceptance of the 
                updated Privacy Policy.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">17. Complaints and Disputes</h2>
              <p>
                If you have concerns about how we handle your data, you may:
              </p>
              <ul className="list-disc pl-6 space-y-1">
                <li>Contact us directly at support@lawnconnect.jm</li>
                <li>File a complaint with the Office of the Information Commissioner (Jamaica)</li>
                <li>For EU residents: Contact your local Data Protection Authority</li>
                <li>For UK residents: Contact the Information Commissioner's Office (ICO)</li>
              </ul>
              <p className="mt-2">
                We encourage you to contact us first so we can address your concerns directly.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">18. Governing Law</h2>
              <p>
                This Privacy Policy is governed by the laws of Jamaica. Any disputes arising from 
                or relating to this Privacy Policy shall be resolved in the courts of Jamaica, 
                without prejudice to any rights you may have under applicable data protection laws 
                in your jurisdiction.
              </p>
            </section>

            <section>
              <h2 className="text-lg font-semibold">19. Contact Us</h2>
              <p>
                For privacy-related inquiries, data subject requests, or complaints:<br />
                Email: support@lawnconnect.jm<br />
                Subject Line: "Privacy Request" or "Data Protection Inquiry"<br />
                Address: Kingston, Jamaica
              </p>
              <p className="mt-2">
                We aim to respond to all privacy-related inquiries within 30 days.
              </p>
            </section>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
