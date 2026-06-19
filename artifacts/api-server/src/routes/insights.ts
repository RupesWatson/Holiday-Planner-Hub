import { Router, type IRouter } from "express";
import { db, holidaysTable, peopleTable, settingsTable } from "@workspace/db";
import {
  GetCoverageQueryParams,
  GetCoverageResponse,
  GetSummaryResponse,
} from "@workspace/api-zod";
import { toISO, parseISO, eachDay, overlapsRange } from "../lib/dates";

const router: IRouter = Router();

async function getMaxAway(): Promise<number> {
  const [settings] = await db.select().from(settingsTable).limit(1);
  return settings?.maxAway ?? 3;
}

router.get("/coverage", async (req, res): Promise<void> => {
  const query = GetCoverageQueryParams.safeParse(req.query);
  if (!query.success) {
    res.status(400).json({ error: query.error.message });
    return;
  }

  const { from, to } = query.data;
  const maxAway = await getMaxAway();
  const holidays = await db.select().from(holidaysTable);

  const days = eachDay(from, to).map((date) => {
    const personIds = holidays
      .filter((h) => h.startDate <= date && h.endDate >= date)
      .map((h) => h.personId);
    const unique = Array.from(new Set(personIds));
    return {
      date,
      awayCount: unique.length,
      overThreshold: unique.length > maxAway,
      personIds: unique,
    };
  });

  res.json(GetCoverageResponse.parse(days));
});

router.get("/summary", async (_req, res): Promise<void> => {
  const [people, holidays, maxAway] = await Promise.all([
    db.select().from(peopleTable),
    db.select().from(holidaysTable),
    getMaxAway(),
  ]);

  const today = toISO(new Date());

  const weekStart = new Date();
  const weekEnd = new Date();
  weekEnd.setDate(weekEnd.getDate() + 6);
  const weekStartIso = toISO(weekStart);
  const weekEndIso = toISO(weekEnd);

  const awayTodayIds = new Set(
    holidays
      .filter((h) => h.startDate <= today && h.endDate >= today)
      .map((h) => h.personId),
  );

  const awayThisWeekIds = new Set(
    holidays
      .filter((h) => overlapsRange(h.startDate, h.endDate, weekStartIso, weekEndIso))
      .map((h) => h.personId),
  );

  const upcomingBookings = holidays.filter((h) => h.endDate >= today).length;

  const horizonEnd = new Date();
  horizonEnd.setDate(horizonEnd.getDate() + 90);
  let conflictDays = 0;
  for (const date of eachDay(today, toISO(horizonEnd))) {
    const count = new Set(
      holidays
        .filter((h) => h.startDate <= date && h.endDate >= date)
        .map((h) => h.personId),
    ).size;
    if (count > maxAway) conflictDays += 1;
  }

  const countWeekdays = (start: string, end: string): number => {
    let n = 0;
    const s = parseISO(start);
    const e = parseISO(end);
    for (let cur = s; cur <= e; cur.setDate(cur.getDate() + 1)) {
      const day = cur.getDay();
      if (day !== 0 && day !== 6) n += 1;
    }
    return n;
  };

  const year = new Date().getFullYear();
  const yearStart = `${year}-01-01`;
  const yearEnd = `${year}-12-31`;

  const perPerson = people.map((p) => {
    const daysOff = holidays
      .filter((h) => h.personId === p.id && h.type === "annual")
      .reduce((acc, h) => {
        const cs = h.startDate < yearStart ? yearStart : h.startDate;
        const ce = h.endDate > yearEnd ? yearEnd : h.endDate;
        if (cs > ce) return acc;
        return acc + countWeekdays(cs, ce);
      }, 0);
    return {
      personId: p.id,
      name: p.name,
      initials: p.initials,
      daysOff,
    };
  });

  res.json(
    GetSummaryResponse.parse({
      totalPeople: people.length,
      awayToday: awayTodayIds.size,
      awayThisWeek: awayThisWeekIds.size,
      upcomingBookings,
      conflictDays,
      perPerson,
    }),
  );
});

export default router;
