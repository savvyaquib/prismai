import { auth } from "@clerk/nextjs/server";
import { ReactNode } from "react";

export default async function ProtectedLayout({
  children,
}: {
  children: ReactNode;
}) {
  await auth.protect();

  return <>{children}</>;
}
