import { notFound } from "next/navigation";
import { FilterBar } from "@/components/admin/FilterBar";
import { PageHead, QueryError } from "@/components/admin/parts";
import { UserTable } from "@/components/admin/UserTable";
import { EmptyState } from "@/components/ui";
import { isLocale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { getAdminContext } from "@/lib/admin/guard";
import { adminHref } from "@/lib/admin/routes";
import { createClient } from "@/lib/supabase/server";
import type { AdminUserRow, ChildRow } from "@/types/db";

/**
 * People.
 *
 * `admin_users()` does the joining in SQL — plan, child count, completions,
 * last activity — because doing it per row in the page means one query per
 * parent and a list that gets slower as the product succeeds.
 */

export const dynamic = "force-dynamic";

export default async function UsersPage({
  params,
  searchParams,
}: {
  params: Promise<{ locale: string }>;
  searchParams: Promise<{ q?: string; role?: string }>;
}) {
  const { locale: raw } = await params;
  if (!isLocale(raw)) notFound();
  const locale = raw;
  const t = adminCopy(locale);

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const role = sp.role ?? "";

  const ctx = await getAdminContext();
  const supabase = await createClient();

  const [{ data: userRows, error }, { data: childRows }, { count: adminCount }] =
    await Promise.all([
    supabase.rpc("admin_users", { p_search: q || null, p_limit: 100, p_offset: 0 }),
    supabase
      .from("children")
      .select("id, user_id, name, birth_date")
      .eq("is_archived", false),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "admin"),
  ]);

  let users = (userRows ?? []) as AdminUserRow[];
  if (role) users = users.filter((u) => u.role === role);

  const childrenByUser: Record<string, Pick<ChildRow, "id" | "name" | "birth_date">[]> = {};
  for (const child of (childRows ?? []) as (Pick<
    ChildRow,
    "id" | "name" | "birth_date"
  > & { user_id: string })[]) {
    (childrenByUser[child.user_id] ??= []).push({
      id: child.id,
      name: child.name,
      birth_date: child.birth_date,
    });
  }

  return (
    <div>
      <PageHead title={t.users.title} lead={t.users.lead} />

      <FilterBar
        action={adminHref(locale, "users")}
        search={q}
        searchLabel={t.common.search}
        searchPlaceholder={locale === "en" ? "Name or email…" : "Nama atau email…"}
        applyLabel={t.common.search}
        selects={[
          {
            name: "role",
            label: t.users.colRole,
            value: role,
            options: [
              { value: "parent", label: t.users.roleParent },
              { value: "editor", label: t.users.roleEditor },
              { value: "admin", label: t.users.roleAdmin },
            ],
            allLabel: t.common.all,
          },
        ]}
      />

      <QueryError error={error} locale={locale} />

      {users.length === 0 ? (
        <EmptyState title={t.common.noResults} lead={t.common.noResultsLead} />
      ) : (
        <UserTable
          locale={locale}
          users={users}
          childrenByUser={childrenByUser}
          canManage={ctx.isAdmin}
          adminCount={adminCount ?? 1}
        />
      )}
    </div>
  );
}
