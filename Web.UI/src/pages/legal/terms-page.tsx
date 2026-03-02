import { Link } from 'react-router';
import { usePageTitle } from '@/hooks/use-page-title';
import { FileText, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function Component() {
  usePageTitle('Terms of Service');

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
            <FileText className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground tracking-tight">
              Terms of Service
            </h1>
            <p className="text-sm text-muted-foreground">
              Last updated: March 1, 2026
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="bg-card rounded-xl border border-border shadow-[var(--shadow-card)] p-8 space-y-6 text-card-foreground leading-relaxed">
          <section className="space-y-3">
            <h2 className="text-lg font-semibold">1. Acceptance of Terms</h2>
            <p className="text-sm text-muted-foreground">
              By accessing and using CloudFiles, you accept and agree to be bound
              by the terms and provisions of this agreement. If you do not agree
              to these terms, you should not use this service.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">2. Description of Service</h2>
            <p className="text-sm text-muted-foreground">
              CloudFiles is a multi-cloud file browser and photo migration tool.
              The service allows you to browse and manage files across Azure Blob
              Storage and Google Cloud Storage, and migrate photos to and from
              Google Photos. All operations use your own OAuth tokens.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">3. User Responsibilities</h2>
            <p className="text-sm text-muted-foreground">
              You are responsible for maintaining the confidentiality of your
              account credentials and for all activities that occur under your
              account. You agree to use the service only for lawful purposes and
              in accordance with these terms.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">4. Cloud Provider Access</h2>
            <p className="text-sm text-muted-foreground">
              By connecting your Google or Microsoft Azure accounts, you
              authorize CloudFiles to access your cloud storage resources on your
              behalf. You may revoke this access at any time through the
              Connections page or through your provider's security settings.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">5. Limitation of Liability</h2>
            <p className="text-sm text-muted-foreground">
              CloudFiles is provided "as is" without warranty of any kind. We
              shall not be liable for any data loss, corruption, or unauthorized
              access that occurs through the use of this service. You are
              responsible for maintaining backups of your data.
            </p>
          </section>

          <section className="space-y-3">
            <h2 className="text-lg font-semibold">6. Modifications</h2>
            <p className="text-sm text-muted-foreground">
              We reserve the right to modify these terms at any time. Continued
              use of the service after changes constitutes acceptance of the new
              terms. We will make reasonable efforts to notify users of
              significant changes.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}

export { Component as TermsPage };
export default Component;
