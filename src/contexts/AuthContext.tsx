import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';

import { UserRole } from '../types';

// ---------------------------------------------------------
// FRONTEND-ONLY USER
// Temporary authentication model.
// Real authentication will be connected later.
// ---------------------------------------------------------

interface FrontendUser {
  id: string;
  email: string;
  fullName: string;
  role: UserRole;
}

export interface AuthContextValue {
  user: FrontendUser | null;
  loading: boolean;
  userRole: UserRole;

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;

  resetPassword: (
    email: string
  ) => Promise<{ error: Error | null }>;

  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// ---------------------------------------------------------
// AUTH PROVIDER
// ---------------------------------------------------------

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FrontendUser | null>(null);

  const loading = false;

  const userRole: UserRole = user?.role ?? 'Owner';

  // -------------------------------------------------------
  // TEMPORARY FRONTEND LOGIN
  //
  // No database.
  // No Supabase.
  // Any non-empty email/password is accepted.
  //
  // Role selection:
  // rahul@anything.com       -> Rahul
  // accountant@anything.com  -> Accountant
  // anything else            -> Owner
  // -------------------------------------------------------

  const signIn = useCallback(
    async (
      email: string,
      password: string
    ): Promise<{ error: Error | null }> => {
      if (!email.trim() || !password.trim()) {
        return {
          error: new Error('Please enter email and password.'),
        };
      }

      const prefix = email.split('@')[0].toLowerCase();

      let role: UserRole = 'Owner';

      if (prefix === 'rahul') {
        role = 'Rahul';
      } else if (prefix === 'accountant') {
        role = 'Accountant';
      }

      const frontendUser: FrontendUser = {
        id: `frontend-${Date.now()}`,
        email,
        fullName:
          role === 'Rahul'
            ? 'Rahul Chauhan'
            : role === 'Accountant'
            ? 'Accountant'
            : 'Owner',
        role,
      };

      setUser(frontendUser);

      return {
        error: null,
      };
    },
    []
  );

  // -------------------------------------------------------
  // TEMPORARY PASSWORD RESET
  // -------------------------------------------------------

  const resetPassword = useCallback(
    async (
      email: string
    ): Promise<{ error: Error | null }> => {
      if (!email.trim()) {
        return {
          error: new Error('Please enter your email address.'),
        };
      }

      return {
        error: null,
      };
    },
    []
  );

  // -------------------------------------------------------
  // LOGOUT
  // -------------------------------------------------------

  const signOut = useCallback(async () => {
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userRole,
        signIn,
        resetPassword,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

// ---------------------------------------------------------
// AUTH HOOK
// ---------------------------------------------------------

export const useAuth = (): AuthContextValue => {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error(
      'useAuth must be used inside <AuthProvider>'
    );
  }

  return context;
};