import { Link } from 'react-router';
import { usePageTitle } from '@/hooks/use-page-title';
import { Shield, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Component() {
  usePageTitle('Privacy Policy');

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-indigo-50">
      <div className="max-w-3xl mx-auto px-4 py-16">
        {/* Back link */}
        <div className="mb-8">
          <Button variant="ghost" size="sm" asChild>
            <Link to="/login">
              <ArrowLeft className="w-4 h-4 mr-1" />
              Back to Login
            </Link>
          </Button>
        </div>

        {/* Header */}
        <div className="flex items-center gap-3 mb-8">
          <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-indigo-100">
            <Shield className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Privacy Policy
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: March 1, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border shadow-[var(--shadow-card)] p-8 space-y-6 text-card-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Information We Collect</h2>
            <p className="text-sm text-muted-foreground">
              CloudFiles collects minimal information necessary to provide our
              cloud file management service. This includes your email address,
              display name, and OAuth tokens for the cloud providers you connect.
              We do not store your cloud files on our servers.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. How We Use Your Information</h2>
            <p className="text-sm text-muted-foreground">
              Your information is used solely to authenticate you with cloud
              providers and facilitate file browsing and migration operations.
              OAuth tokens are used only for the duration of your session and are
              never shared with third parties.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. Data Storage and Security</h2>
            <p className="text-sm text-muted-foreground">
              We store minimal user account data in encrypted Azure Table Storage.
              All communication between your browser and our servers is encrypted
              using TLS. We do not retain copies of your cloud files at any time.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Third-Party Services</h2>
            <p className="text-sm text-muted-foreground">
              CloudFiles integrates with Google Cloud Platform and Microsoft Azure.
              When you connect these services, their respective privacy policies
              also apply. We encourage you to review Google's and Microsoft's
              privacy policies.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Your Rights</h2>
            <p className="text-sm text-muted-foreground">
              You can disconnect your cloud providers at any time through the
              Connections page. You may request deletion of your account and all
              associated data by contacting us. We will comply with your request
              within 30 days.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Contact</h2>
            <p className="text-sm text-muted-foreground">
              If you have questions about this privacy policy or your personal
              data, please reach out to us through the application's support
              channel.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export { Component as PrivacyPage };
export default Component;
