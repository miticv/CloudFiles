import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-terms-of-service',
    standalone: true,
    imports: [RouterModule],
    template: `
    <div class="legal-page">
        <div class="legal-container">
            <a routerLink="/connections" class="back-link">&larr; Back to CloudFiles</a>
            <h1>Terms of Service</h1>
            <p class="effective-date">Effective Date: February 28, 2026</p>

            <section>
                <h2>1. Acceptance of Terms</h2>
                <p>
                    By accessing or using CloudFiles ("the Application"), you agree to be bound by these
                    Terms of Service ("Terms"). If you do not agree to these Terms, you may not use the
                    Application. These Terms apply to all users of the Application.
                </p>
            </section>

            <section>
                <h2>2. Description of Service</h2>
                <p>
                    CloudFiles is a web-based cloud file management tool that enables users to:
                </p>
                <ul>
                    <li>Browse files stored in Google Cloud Storage and Microsoft Azure Blob Storage.</li>
                    <li>Preview images and documents from their cloud storage accounts.</li>
                    <li>Transfer files between Google Cloud Storage, Google Photos, and Azure Blob Storage.</li>
                    <li>Manage file operations across multiple cloud providers from a single interface.</li>
                </ul>
                <p>
                    The Application acts as an intermediary that connects to your existing cloud provider
                    accounts using your own credentials. CloudFiles does not provide cloud storage itself.
                </p>
            </section>

            <section>
                <h2>3. Account and Authentication</h2>
                <p>
                    To use CloudFiles, you must authenticate with at least one supported cloud provider
                    (Google or Microsoft Azure) using OAuth 2.0. You are responsible for:
                </p>
                <ul>
                    <li>Maintaining the security of your cloud provider accounts and credentials.</li>
                    <li>All activities that occur through your authenticated sessions.</li>
                    <li>Ensuring that your use of CloudFiles complies with your cloud provider's terms of service.</li>
                </ul>
            </section>

            <section>
                <h2>4. Acceptable Use</h2>
                <p>You agree to use CloudFiles only for lawful purposes and in accordance with these Terms. You agree not to:</p>
                <ul>
                    <li>Use the Application to transfer, store, or manage any content that is illegal, harmful,
                        threatening, abusive, defamatory, or otherwise objectionable.</li>
                    <li>Attempt to gain unauthorized access to the Application, other users' accounts, or
                        any systems or networks connected to the Application.</li>
                    <li>Use the Application in any manner that could disable, overburden, or impair the
                        Application or interfere with any other party's use of the Application.</li>
                    <li>Use automated scripts, bots, or other tools to access the Application beyond its
                        intended interface.</li>
                    <li>Reverse-engineer, decompile, or disassemble any part of the Application.</li>
                </ul>
            </section>

            <section>
                <h2>5. Your Data and Content</h2>
                <p>
                    You retain full ownership of all files and data in your cloud storage accounts.
                    CloudFiles does not claim any ownership or license over your content. When you initiate
                    a file transfer, you are directing the Application to move data between your own accounts.
                </p>
                <p>
                    You are solely responsible for the content you access, transfer, and manage through
                    CloudFiles, including ensuring you have the right to transfer such content and that the
                    content complies with applicable laws.
                </p>
            </section>

            <section>
                <h2>6. Third-Party Services</h2>
                <p>
                    CloudFiles integrates with third-party services including Google Cloud Platform, Google
                    Photos, and Microsoft Azure. Your use of these services through CloudFiles is subject to
                    those providers' respective terms of service and privacy policies:
                </p>
                <ul>
                    <li><a href="https://cloud.google.com/terms" target="_blank" rel="noopener noreferrer">Google Cloud Platform Terms of Service</a></li>
                    <li><a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">Google Terms of Service</a></li>
                    <li><a href="https://azure.microsoft.com/en-us/support/legal/" target="_blank" rel="noopener noreferrer">Microsoft Azure Legal Information</a></li>
                </ul>
                <p>
                    We are not responsible for any changes, outages, or issues with these third-party services.
                </p>
            </section>

            <section>
                <h2>7. Disclaimers</h2>
                <p>
                    THE APPLICATION IS PROVIDED "AS IS" AND "AS AVAILABLE" WITHOUT WARRANTIES OF ANY KIND,
                    EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
                    MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT.
                </p>
                <p>
                    We do not warrant that:
                </p>
                <ul>
                    <li>The Application will be uninterrupted, timely, secure, or error-free.</li>
                    <li>File transfers will always complete successfully.</li>
                    <li>The Application will be compatible with all devices or browsers.</li>
                    <li>Any defects in the Application will be corrected.</li>
                </ul>
            </section>

            <section>
                <h2>8. Limitation of Liability</h2>
                <p>
                    TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CLOUDFILES, ITS
                    DEVELOPERS, OR CONTRIBUTORS BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
                    CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING WITHOUT LIMITATION LOSS OF DATA, LOSS
                    OF PROFITS, OR BUSINESS INTERRUPTION, ARISING OUT OF OR IN CONNECTION WITH YOUR USE
                    OF THE APPLICATION, WHETHER BASED ON WARRANTY, CONTRACT, TORT, OR ANY OTHER LEGAL THEORY.
                </p>
                <p>
                    You acknowledge that file transfers between cloud providers carry inherent risks,
                    including potential data loss or corruption, and you use the Application at your own risk.
                </p>
            </section>

            <section>
                <h2>9. Indemnification</h2>
                <p>
                    You agree to indemnify and hold harmless CloudFiles, its developers, and contributors
                    from any claims, damages, losses, liabilities, and expenses (including legal fees)
                    arising out of your use of the Application, your violation of these Terms, or your
                    violation of any rights of a third party.
                </p>
            </section>

            <section>
                <h2>10. Termination</h2>
                <p>
                    You may stop using CloudFiles at any time by disconnecting your cloud provider accounts
                    and closing your browser session. We reserve the right to suspend or terminate access
                    to the Application at any time, without notice, for conduct that we believe violates
                    these Terms or is harmful to other users or the Application.
                </p>
            </section>

            <section>
                <h2>11. Changes to These Terms</h2>
                <p>
                    We reserve the right to modify these Terms at any time. Changes will be posted on this
                    page with an updated effective date. Your continued use of CloudFiles after any
                    modifications constitutes your acceptance of the revised Terms.
                </p>
            </section>

            <section>
                <h2>12. Governing Law</h2>
                <p>
                    These Terms shall be governed by and construed in accordance with applicable law,
                    without regard to conflict of law principles. Any disputes arising from these Terms
                    or your use of the Application shall be resolved in the appropriate courts of the
                    jurisdiction where the Application maintainer resides.
                </p>
            </section>

            <section>
                <h2>13. Contact</h2>
                <p>
                    If you have any questions about these Terms of Service, please
                    <a href="https://github.com/miticv/CloudFiles/issues" target="_blank" rel="noopener noreferrer">open an issue</a>
                    on our GitHub repository.
                </p>
            </section>
        </div>
    </div>
    `,
    styles: [`
        .legal-page {
            min-height: 100vh;
            background: #fafafa;
            padding: 2rem 1rem;
        }
        .legal-container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 3rem;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        .back-link {
            color: #1976d2;
            text-decoration: none;
            font-size: 0.9rem;
            display: inline-block;
            margin-bottom: 1.5rem;
        }
        .back-link:hover { text-decoration: underline; }
        h1 {
            font-size: 2rem;
            font-weight: 600;
            margin-bottom: 0.25rem;
        }
        .effective-date {
            color: #666;
            font-size: 0.9rem;
            margin-bottom: 2rem;
        }
        h2 {
            font-size: 1.25rem;
            font-weight: 600;
            margin-top: 2rem;
            margin-bottom: 0.75rem;
        }
        p { line-height: 1.7; margin-bottom: 0.75rem; color: #333; }
        ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        li { line-height: 1.7; margin-bottom: 0.5rem; color: #333; }
        a { color: #1976d2; }
        section { margin-bottom: 1rem; }
    `]
})
export class TermsOfServiceComponent {}
