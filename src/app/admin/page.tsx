import { isAdminRequest } from "@/lib/admin/session";
import AdminLogin from "@/components/admin/AdminLogin";
import AdminPanel from "@/components/admin/AdminPanel";

/**
 * The gate is a SERVER check. The panel is never sent to an unauthenticated
 * browser at all - not hidden with CSS, not mounted and conditionally
 * rendered. If the cookie is absent, the client receives the login form and
 * nothing else.
 *
 * force-dynamic because the answer depends on a cookie. Static rendering here
 * would cache one visitor auth state and serve it to everyone.
 */
export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const signedIn = await isAdminRequest();
  if (!signedIn) return <AdminLogin />;
  return <AdminPanel />;
}