import { Navigate, useLocation } from 'react-router-dom';

export function RequireAuth() {
  const location = useLocation();

  return (
    <Navigate
      replace
      to="/login"
      state={{ from: `${location.pathname}${location.search}${location.hash}` }}
    />
  );
}
