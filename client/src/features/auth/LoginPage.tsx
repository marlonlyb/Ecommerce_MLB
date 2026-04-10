import { useLocation } from 'react-router-dom';

import { PagePlaceholder } from '../../shared/ui/PagePlaceholder';

interface LoginLocationState {
  from?: string;
}

export function LoginPage() {
  const location = useLocation();
  const state = location.state as LoginLocationState | null;

  return (
    <PagePlaceholder
      title="Login placeholder"
      description="Authentication screens connect in Phase 4."
      aside={
        state?.from ? `Protected routes currently redirect here from ${state.from}.` : undefined
      }
    />
  );
}
