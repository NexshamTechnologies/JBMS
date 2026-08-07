import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";

import { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";
import { UserRole } from "../types";

interface Profile {
  id: string;
  name: string;
  role: UserRole;
}

interface AuthUser {
  user: User;
  profile: Profile;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  userRole: UserRole;

  signIn: (
    email: string,
    password: string
  ) => Promise<{ error: Error | null }>;

  signOut: () => Promise<void>;

  resetPassword: (
    email: string
  ) => Promise<{ error: Error | null }>;
}

const AuthContext = createContext<AuthContextType | undefined>(
  undefined
);

async function getProfile(
  userId: string
): Promise<Profile | null> {

  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (error) {
    console.error(error);
    return null;
  }

  return data as Profile;
}

export const AuthProvider: React.FC<{
  children: ReactNode;
}> = ({ children }) => {

  const [user, setUser] =
    useState<AuthUser | null>(null);

  const [loading, setLoading] =
    useState(true);

  const userRole: UserRole =
    user?.profile.role ?? "Owner";

  // ----------------------------
  // LOGIN
  // ----------------------------

  const signIn = async (
    email: string,
    password: string
  ): Promise<{ error: Error | null }> => {

    const { data, error } =
      await supabase.auth.signInWithPassword({
        email,
        password,
      });

    if (error) {
      return { error };
    }

    if (!data.user) {
      return {
        error: new Error("User not found."),
      };
    }

    const profile =
      await getProfile(data.user.id);

    if (!profile) {
      return {
        error: new Error(
          "Profile not found."
        ),
      };
    }

    setUser({
      user: data.user,
      profile,
    });

    return {
      error: null,
    };
  };

  // ----------------------------
  // LOGOUT
  // ----------------------------

  const signOut = async () => {

    await supabase.auth.signOut();

    setUser(null);

  };

  // ----------------------------
  // RESET PASSWORD
  // ----------------------------

  const resetPassword = async (
    email: string
  ): Promise<{ error: Error | null }> => {

    const { error } =
      await supabase.auth.resetPasswordForEmail(
        email
      );

    return { error };

  };
    // ----------------------------
  // SESSION RESTORE
  // ----------------------------

  useEffect(() => {

    const initialize = async () => {

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (session?.user) {

        const profile =
          await getProfile(session.user.id);

        if (profile) {
          setUser({
            user: session.user,
            profile,
          });
        }

      }

      setLoading(false);

    };

    initialize();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(
      async (_event, session) => {

        if (session?.user) {

          const profile =
            await getProfile(session.user.id);

          if (profile) {

            setUser({
              user: session.user,
              profile,
            });

          }

        } else {

          setUser(null);

        }

      }
    );

    return () => {

      subscription.unsubscribe();

    };

  }, []);
    return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        userRole,
        signIn,
        signOut,
        resetPassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );

};

export function useAuth(): AuthContextType {

  const context =
    useContext(AuthContext);

  if (!context) {

    throw new Error(
      "useAuth must be used inside AuthProvider"
    );

  }

  return context;

}