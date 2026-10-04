import { notFound, redirect } from "next/navigation";
import { AuthScreen } from "@/components/AuthScreen";
import { NewPasswordForm } from "@/components/AuthForms";
import { href, isLocale } from "@/i18n/config";
import { getDictionary } from "@/i18n/dictionaries";
import { createClient } from "@/lib/supabase/server";

/**
 * Reached by clicking the reset email, which has already given the visitor a
 * session through /auth/callback. Without one there is nothing to update, so
 * send them back to ask for a fresh link.
 */
export default async function NewPasswordPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const dict = getDictionary(raw);

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect(`${href(raw, "signIn")}?tautan=tidak-valid`);

  return (
    <AuthScreen
      locale={raw}
      title={dict.auth.newPasswordTitle}
      lead={dict.auth.newPasswordLead}
    >
      <NewPasswordForm locale={raw} />
    </AuthScreen>
  );
}
