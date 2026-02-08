import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export default async function DeckLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const session = cookieStore.get("onork_session");

  if (session?.value !== "authenticated") {
    redirect("/pin");
  }

  return <>{children}</>;
}
