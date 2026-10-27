import { sql } from "drizzle-orm";
import {
  type AnyPgColumn,
  boolean,
  check,
  date,
  index,
  integer,
  pgEnum,
  pgTable,
  primaryKey,
  smallint,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

export const roleEnum = pgEnum("person_role", ["employee", "manager", "hr_admin"]);
export const reminderKindEnum = pgEnum("reminder_kind", ["weekly_reminder", "at_risk_digest"]);

export const organizations = pgTable("organizations", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name").notNull(),
  timezone: text("timezone").notNull().default("America/New_York"),
  /** JS day numbering: 0 = Sunday, 1 = Monday. ISO weeks → 1. */
  weekStartDay: smallint("week_start_day").notNull().default(1),
  minGroupSize: smallint("min_group_size").notNull().default(5),
  /** Open question in the spec: lets an org hide individual scores from managers. */
  managersSeeIndividualScores: boolean("managers_see_individual_scores").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export const departments = pgTable(
  "departments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
  },
  (t) => [uniqueIndex("departments_org_name_idx").on(t.orgId, t.name)],
);

export const teams = pgTable(
  "teams",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    departmentId: uuid("department_id")
      .notNull()
      .references(() => departments.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    managerId: uuid("manager_id").references((): AnyPgColumn => people.id, {
      onDelete: "set null",
    }),
  },
  (t) => [
    uniqueIndex("teams_department_name_idx").on(t.departmentId, t.name),
    index("teams_manager_idx").on(t.managerId),
  ],
);

export const people = pgTable(
  "people",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orgId: uuid("org_id")
      .notNull()
      .references(() => organizations.id, { onDelete: "cascade" }),
    teamId: uuid("team_id").references((): AnyPgColumn => teams.id, { onDelete: "set null" }),
    employeeCode: varchar("employee_code", { length: 32 }).notNull(),
    name: text("name").notNull(),
    /** Stored lowercase; matched against the Auth.js user email on sign-in. */
    email: text("email").notNull(),
    role: roleEnum("role").notNull().default("employee"),
    active: boolean("active").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("people_org_code_idx").on(t.orgId, t.employeeCode),
    uniqueIndex("people_email_idx").on(t.email),
    index("people_team_idx").on(t.teamId),
  ],
);

const score = (name: string) => smallint(name).notNull();

export const checkins = pgTable(
  "checkins",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    mood: score("mood"),
    energy: score("energy"),
    stress: score("stress"),
    workload: score("workload"),
    belonging: score("belonging"),
    note: text("note").notNull().default(""),
    noteShared: boolean("note_shared").notNull().default(true),
    submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    uniqueIndex("checkins_person_week_idx").on(t.personId, t.weekStart),
    index("checkins_week_idx").on(t.weekStart),
    check("checkins_mood_range", sql`${t.mood} between 1 and 5`),
    check("checkins_energy_range", sql`${t.energy} between 1 and 5`),
    check("checkins_stress_range", sql`${t.stress} between 1 and 5`),
    check("checkins_workload_range", sql`${t.workload} between 1 and 5`),
    check("checkins_belonging_range", sql`${t.belonging} between 1 and 5`),
    check("checkins_note_length", sql`char_length(${t.note}) <= 1000`),
  ],
);

export const remindersLog = pgTable(
  "reminders_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    personId: uuid("person_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    weekStart: date("week_start").notNull(),
    kind: reminderKindEnum("kind").notNull(),
    sentAt: timestamp("sent_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("reminders_log_once_idx").on(t.personId, t.weekStart, t.kind)],
);

export const auditLog = pgTable(
  "audit_log",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    actorId: uuid("actor_id")
      .notNull()
      .references(() => people.id, { onDelete: "cascade" }),
    subjectId: uuid("subject_id").references(() => people.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [index("audit_log_subject_idx").on(t.subjectId), index("audit_log_actor_idx").on(t.actorId)],
);

// ---- Auth.js (NextAuth v5) tables, shaped for @auth/drizzle-adapter ----

export const users = pgTable("users", {
  id: text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID()),
  name: text("name"),
  email: text("email").unique(),
  emailVerified: timestamp("email_verified", { mode: "date" }),
  image: text("image"),
});

export const accounts = pgTable(
  "accounts",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    provider: text("provider").notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    refresh_token: text("refresh_token"),
    access_token: text("access_token"),
    expires_at: integer("expires_at"),
    token_type: text("token_type"),
    scope: text("scope"),
    id_token: text("id_token"),
    session_state: text("session_state"),
  },
  (t) => [primaryKey({ columns: [t.provider, t.providerAccountId] })],
);

export const sessions = pgTable("sessions", {
  sessionToken: text("session_token").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  expires: timestamp("expires", { mode: "date" }).notNull(),
});

export const verificationTokens = pgTable(
  "verification_tokens",
  {
    identifier: text("identifier").notNull(),
    token: text("token").notNull(),
    expires: timestamp("expires", { mode: "date" }).notNull(),
  },
  (t) => [primaryKey({ columns: [t.identifier, t.token] })],
);

export type Organization = typeof organizations.$inferSelect;
export type Person = typeof people.$inferSelect;
export type Checkin = typeof checkins.$inferSelect;
export type Role = (typeof roleEnum.enumValues)[number];
