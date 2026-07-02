import type { ReactNode } from "react";
import { createContext, useContext } from "react";

export type DashboardUser = {
  id: number;
  fullName: string;
  role: string;
  phone: string;
  email?: string | null;
};

const DashboardUserContext = createContext<DashboardUser | null>(null);

export function DashboardUserProvider({
  user,
  children
}: {
  user: DashboardUser;
  children: ReactNode;
}) {
  return (
    <DashboardUserContext.Provider value={user}>
      {children}
    </DashboardUserContext.Provider>
  );
}

export function useDashboardUser(): DashboardUser {
  const user = useContext(DashboardUserContext);
  if (!user) throw new Error("DashboardUserProvider missing");
  return user;
}
