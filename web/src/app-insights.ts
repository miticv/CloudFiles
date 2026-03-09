import { ApplicationInsights } from '@microsoft/applicationinsights-web';
import { env } from '@/env';

const appInsights = new ApplicationInsights({
  config: {
    connectionString: env.appInsightsConnectionString,
    enableAutoRouteTracking: true,
  },
});

appInsights.loadAppInsights();

export { appInsights };
