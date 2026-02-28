import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';

@Component({
    selector: 'app-privacy-statement',
    standalone: true,
    imports: [RouterModule],
    template: `
    <div class="legal-page">
        <div class="legal-container">
            <a routerLink="/sessions/signin" class="back-link">&larr; Back to CloudFiles</a>
            <h1>Privacy Policy</h1>
            <p class="effective-date">Effective Date: February 28, 2026</p>

            <section>
                <h2>1. Introduction</h2>
                <p>
                    CloudFiles ("we", "our", or "the Application") is a cloud file management tool that allows
                    users to browse, preview, and transfer files across Google Cloud Storage, Google Photos,
                    and Microsoft Azure Blob Storage. This Privacy Policy explains how we collect, use, and
                    protect your information when you use CloudFiles.
                </p>
            </section>

            <section>
                <h2>2. Information We Collect</h2>
                <h3>2.1 Authentication Tokens</h3>
                <p>
                    When you sign in through Google or Microsoft Azure, we receive OAuth 2.0 access tokens.
                    These tokens are used solely to interact with the respective cloud services on your behalf.
                    We do not store these tokens on any server; they are held only in your browser session and
                    are discarded when you sign out or close your browser.
                </p>

                <h3>2.2 Cloud File Metadata</h3>
                <p>
                    When you browse your cloud storage, we retrieve file and folder metadata (names, paths,
                    sizes, content types) directly from your cloud provider. This data is displayed in your
                    browser and is not stored or cached on our servers.
                </p>

                <h3>2.3 Google User Data</h3>
                <p>
                    CloudFiles accesses the following Google user data through authorized OAuth scopes:
                </p>
                <ul>
                    <li><strong>Google Cloud Storage:</strong> Bucket listings and file metadata for browsing and transferring files.</li>
                    <li><strong>Google Photos (via Picker API):</strong> Selected photo metadata and media content for transferring photos to Azure Blob Storage.</li>
                </ul>
                <p>
                    CloudFiles' use and transfer to any other app of information received from Google APIs
                    will adhere to the
                    <a href="https://developers.google.com/terms/api-services-user-data-policy"
                       target="_blank" rel="noopener noreferrer">Google API Services User Data Policy</a>,
                    including the Limited Use requirements.
                </p>

                <h3>2.4 Microsoft Azure Data</h3>
                <p>
                    When connected to Azure, we access your subscription information, resource groups,
                    storage accounts, and blob containers solely for the purpose of browsing and transferring
                    files as directed by you.
                </p>

                <h3>2.5 No Personal Data Collection</h3>
                <p>
                    We do not collect, store, or process personal information such as names, email addresses,
                    phone numbers, or payment information. We do not use cookies for tracking purposes. The
                    Application does not have a backend database that stores user data.
                </p>
            </section>

            <section>
                <h2>3. How We Use Your Information</h2>
                <p>We use the information described above exclusively to:</p>
                <ul>
                    <li>Authenticate your identity with Google and Microsoft Azure.</li>
                    <li>List and display your cloud storage files and folders.</li>
                    <li>Transfer files between cloud providers at your explicit request.</li>
                    <li>Display transfer progress and results.</li>
                </ul>
                <p>
                    We do not use your data for advertising, analytics, profiling, or any purpose other than
                    providing the file management functionality you have requested.
                </p>
            </section>

            <section>
                <h2>4. Data Sharing and Disclosure</h2>
                <p>
                    We do not sell, rent, share, or disclose your data to any third parties. Your cloud storage
                    data is transferred directly between your cloud provider accounts as instructed by you.
                    All API calls are made directly from the Application to the respective cloud provider APIs
                    using your own access tokens.
                </p>
            </section>

            <section>
                <h2>5. Data Retention</h2>
                <p>
                    CloudFiles does not retain any user data. Access tokens exist only for the duration of
                    your browser session. File metadata is fetched on-demand and is not cached or stored
                    beyond what is needed to display it in your browser. When a file transfer process
                    completes, the process status is managed by Azure Durable Functions and is subject to
                    the standard Azure Functions retention policy.
                </p>
            </section>

            <section>
                <h2>6. Data Security</h2>
                <p>
                    All communication between your browser and the Application, as well as between the
                    Application and cloud provider APIs, is encrypted using HTTPS/TLS. OAuth 2.0 tokens are
                    transmitted securely and are never exposed in URLs or logs. We follow industry best
                    practices to protect the security of your data in transit.
                </p>
            </section>

            <section>
                <h2>7. Your Rights and Choices</h2>
                <ul>
                    <li><strong>Revoke Access:</strong> You can disconnect any cloud provider at any time from
                        the Connections page. You can also revoke CloudFiles' access from your
                        <a href="https://myaccount.google.com/permissions" target="_blank" rel="noopener noreferrer">Google Account permissions</a>
                        or Azure portal.</li>
                    <li><strong>Data Deletion:</strong> Since we do not store your data, there is nothing to delete.
                        Disconnecting your account immediately removes all access.</li>
                    <li><strong>Data Portability:</strong> Your files remain in your own cloud storage accounts at
                        all times. CloudFiles does not create copies of your data on our infrastructure.</li>
                </ul>
            </section>

            <section>
                <h2>8. Children's Privacy</h2>
                <p>
                    CloudFiles is not intended for use by children under the age of 13. We do not knowingly
                    collect data from children.
                </p>
            </section>

            <section>
                <h2>9. Changes to This Policy</h2>
                <p>
                    We may update this Privacy Policy from time to time. Any changes will be reflected on this
                    page with an updated effective date. Your continued use of CloudFiles after any changes
                    constitutes your acceptance of the updated policy.
                </p>
            </section>

            <section>
                <h2>10. Contact</h2>
                <p>
                    If you have any questions about this Privacy Policy or your data, please open an issue on
                    our GitHub repository or contact the application maintainer.
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
        h3 {
            font-size: 1.05rem;
            font-weight: 600;
            margin-top: 1.25rem;
            margin-bottom: 0.5rem;
        }
        p { line-height: 1.7; margin-bottom: 0.75rem; color: #333; }
        ul { padding-left: 1.5rem; margin-bottom: 0.75rem; }
        li { line-height: 1.7; margin-bottom: 0.5rem; color: #333; }
        a { color: #1976d2; }
        section { margin-bottom: 1rem; }
    `]
})
export class PrivacyStatementComponent {}
