"use client";

import { Fragment, useState, useTransition } from "react";
import { Button, Field, Input, Notice } from "@/components/ui";
import { TableFrame, Td, Th, fmtDate, fmtNumber } from "@/components/admin/parts";
import type { Locale } from "@/i18n/config";
import { adminCopy } from "@/lib/admin/copy";
import { grantPremium, setUserRole } from "@/lib/admin-actions";
import type { AdminUserRow, ChildRow, UserRole } from "@/types/db";
import { cn } from "@/lib/utils";

/**
 * The people list.
 *
 * A row expands into the two things an admin actually needs to do by hand:
 * change someone's role, and grant Premium — for a refund, a reviewer, or a
 * transfer that arrived outside the flow. Both go through functions that check
 * `is_admin()` in Postgres, so an editor's browser gets the same refusal this
 * interface gives them.
 *
 * Children are shown with their names and birth dates. That is a deliberate
 * choice, not an oversight: support cannot answer "the activities are wrong for
 * my daughter" without seeing the age the app is working from.
 */

const SELECT_CLASS =
  "rounded-[12px] border border-line bg-white px-3 py-2 text-[0.9375rem] text-ink focus:border-sage focus:outline-none";

const PLAN_STYLE: Record<string, string> = {
  free: "bg-black/[0.055] text-ink-muted",
  premium: "bg-sage-soft text-sage-dark",
  annual: "bg-sage-soft text-sage-dark",
};

export function UserTable({
  locale,
  users,
  childrenByUser,
  canManage,
  adminCount,
}: {
  locale: Locale;
  users: AdminUserRow[];
  childrenByUser: Record<string, Pick<ChildRow, "id" | "name" | "birth_date">[]>;
  canManage: boolean;
  adminCount: number;
}) {
  const t = adminCopy(locale);
  const [openId, setOpenId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();

  const roleLabel: Record<UserRole, string> = {
    parent: t.users.roleParent,
    editor: t.users.roleEditor,
    admin: t.users.roleAdmin,
  };

  function run(action: (d: FormData) => Promise<{ ok: boolean; message?: string }>) {
    return (data: FormData) => {
      start(async () => {
        const r = await action(data);
        setMessage({ ok: r.ok, text: r.ok ? t.common.saved : r.message ?? "" });
      });
    };
  }

  const submitRole = run(setUserRole);
  const submitGrant = run(grantPremium);

  return (
    <div className="space-y-4">
      {message ? (
        <Notice tone={message.ok ? "neutral" : "care"}>{message.text}</Notice>
      ) : null}

      <TableFrame
        head={
          <tr>
            <Th>{t.users.colName}</Th>
            <Th>{t.users.colEmail}</Th>
            <Th>{t.users.colRole}</Th>
            <Th>{t.users.colPlan}</Th>
            <Th numeric>{t.users.colChildren}</Th>
            <Th numeric>{t.users.colCompletions}</Th>
            <Th>{t.users.colJoined}</Th>
          </tr>
        }
        footer={`${fmtNumber(users.length)} ${t.common.rows}`}
      >
        {users.map((user) => {
          const kids = childrenByUser[user.id] ?? [];
          const open = openId === user.id;
          // Removing the last admin locks everyone out, and the database
          // refuses it, so the option is not offered either.
          const isLastAdmin = user.role === "admin" && adminCount <= 1;

          return (
            <Fragment key={user.id}>
              <tr
                className="cursor-pointer transition-colors hover:bg-black/[0.015]"
                onClick={() => setOpenId(open ? null : user.id)}
              >
                <Td>
                  <span className="font-medium">{user.display_name ?? t.common.none}</span>
                </Td>
                <Td className="text-ink-muted">{user.email ?? t.common.none}</Td>
                <Td>
                  <span
                    className={cn(
                      "text-meta rounded-pill px-2.5 py-1",
                      user.role === "parent"
                        ? "bg-black/[0.055] text-ink-muted"
                        : "bg-sage-soft text-sage-dark",
                    )}
                  >
                    {roleLabel[user.role]}
                  </span>
                </Td>
                <Td>
                  <span
                    className={cn(
                      "text-meta rounded-pill px-2.5 py-1",
                      PLAN_STYLE[user.plan] ?? PLAN_STYLE.free,
                    )}
                  >
                    {user.plan}
                  </span>
                  {user.plan_expires_at ? (
                    <span className="text-meta ml-1.5 text-ink-faint">
                      {fmtDate(user.plan_expires_at, locale)}
                    </span>
                  ) : null}
                </Td>
                <Td numeric className="text-ink-muted">
                  {user.children}
                </Td>
                <Td numeric className="text-ink-muted">
                  {user.completions}
                </Td>
                <Td className="whitespace-nowrap text-ink-faint">
                  {fmtDate(user.created_at, locale)}
                </Td>
              </tr>

              {open ? (
                <tr>
                  <td colSpan={7} className="bg-cream-deep/60 px-4 py-5">
                    <div className="grid gap-6 lg:grid-cols-3">
                      <div>
                        <p className="text-meta mb-2 text-ink-faint">{t.users.children}</p>
                        {kids.length === 0 ? (
                          <p className="text-small text-ink-muted">{t.common.none}</p>
                        ) : (
                          <ul className="space-y-1.5">
                            {kids.map((kid) => (
                              <li key={kid.id} className="text-small">
                                {kid.name}
                                <span className="text-meta ml-2 text-ink-faint">
                                  {fmtDate(kid.birth_date, locale)}
                                </span>
                              </li>
                            ))}
                          </ul>
                        )}
                        <p className="text-meta mt-2 text-ink-faint">
                          {t.users.colLastSeen}: {fmtDate(user.last_seen, locale)}
                        </p>
                      </div>

                      {canManage ? (
                        <>
                          <form action={submitRole} className="space-y-3">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="user_id" value={user.id} />
                            <p className="text-meta text-ink-faint">{t.users.changeRole}</p>
                            {isLastAdmin ? (
                              <p className="text-small text-ink-muted">{t.users.lastAdmin}</p>
                            ) : (
                              <div className="flex flex-wrap items-center gap-2">
                                <select
                                  name="role"
                                  defaultValue={user.role}
                                  className={SELECT_CLASS}
                                  aria-label={t.users.changeRole}
                                >
                                  {(["parent", "editor", "admin"] as UserRole[]).map((r) => (
                                    <option key={r} value={r}>
                                      {roleLabel[r]}
                                    </option>
                                  ))}
                                </select>
                                <Button type="submit" tone="secondary" disabled={pending}>
                                  {t.common.save}
                                </Button>
                              </div>
                            )}
                          </form>

                          <form action={submitGrant} className="space-y-3">
                            <input type="hidden" name="locale" value={locale} />
                            <input type="hidden" name="user_id" value={user.id} />
                            <p className="text-meta text-ink-faint">{t.users.grantPremium}</p>
                            <div className="flex flex-wrap items-center gap-2">
                              <select
                                name="plan"
                                defaultValue="premium"
                                className={SELECT_CLASS}
                                aria-label={t.users.colPlan}
                              >
                                <option value="premium">premium</option>
                                <option value="annual">annual</option>
                              </select>
                              <Input
                                name="months"
                                type="number"
                                min={1}
                                max={36}
                                defaultValue={1}
                                aria-label={t.users.grantMonths}
                                className="w-20"
                              />
                              <Button type="submit" tone="secondary" disabled={pending}>
                                {t.users.grantDo}
                              </Button>
                            </div>
                            <Field label={t.users.grantNote} htmlFor={`note-${user.id}`}>
                              <Input id={`note-${user.id}`} name="note" />
                            </Field>
                          </form>
                        </>
                      ) : (
                        <p className="text-small text-ink-muted lg:col-span-2">
                          {t.common.adminOnly}
                        </p>
                      )}
                    </div>
                  </td>
                </tr>
              ) : null}
            </Fragment>
          );
        })}
      </TableFrame>
    </div>
  );
}
