// MyReportsScreen re-exports the unified Report Issues screen with initialTab="Mine"
// ensuring 100% backward compatibility with all existing navigation callers.
import { CampusIssuesScreen } from './CampusIssuesScreen';

export function MyReportsScreen(props: any) {
  const mergedRoute = {
    ...props.route,
    params: {
      ...props.route?.params,
      initialTab: 'Mine',
    },
  };
  return <CampusIssuesScreen {...props} route={mergedRoute} />;
}
