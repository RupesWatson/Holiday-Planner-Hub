import { useState, useMemo } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { 
  useGetSummary, getGetSummaryQueryKey,
  useListPeople, getListPeopleQueryKey,
  useGetCoverage, getGetCoverageQueryKey,
  useListHolidays, getListHolidaysQueryKey,
  useGetSettings, getGetSettingsQueryKey,
  Person, Holiday, CoverageDay
} from "@workspace/api-client-react";
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, addDays, differenceInCalendarDays } from "date-fns";
import { formatLocalDate, parseLocalDate } from "@/lib/date-utils";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ChevronLeft, ChevronRight, Upload, Plus, AlertTriangle, CalendarDays, Users, Plane, CalendarClock } from "lucide-react";
import { HolidayDialog } from "@/components/holidays/HolidayDialog";
import { ImportHolidaysDialog } from "@/components/holidays/ImportHolidaysDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

const TYPE_LABELS: Record<string, string> = {
  annual: "Annual leave",
  sick: "Sick leave",
  public: "Public holiday",
  other: "Other",
};

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const fromStr = formatLocalDate(calendarStart);
  const toStr = formatLocalDate(calendarEnd);

  // Fixed horizon for the "Who's away" panel, independent of the viewed month.
  const todayStr = formatLocalDate(new Date());
  const horizonStr = formatLocalDate(addDays(new Date(), 30));

  // Queries
  const { data: summary } = useGetSummary({ query: { queryKey: getGetSummaryQueryKey() } });
  const { data: people } = useListPeople({ query: { queryKey: getListPeopleQueryKey() } });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { data: holidays } = useListHolidays({ from: fromStr, to: toStr }, { query: { queryKey: getListHolidaysQueryKey({ from: fromStr, to: toStr }) } });
  const { data: coverage } = useGetCoverage({ from: fromStr, to: toStr }, { query: { queryKey: getGetCoverageQueryKey({ from: fromStr, to: toStr }) } });
  const { data: upcoming } = useListHolidays({ from: todayStr, to: horizonStr }, { query: { queryKey: getListHolidaysQueryKey({ from: todayStr, to: horizonStr }) } });

  const [bookingOpen, setBookingOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  
  const [selectedDate, setSelectedDate] = useState<string | undefined>(undefined);
  const [selectedPersonId, setSelectedPersonId] = useState<number | undefined>(undefined);
  const [selectedHoliday, setSelectedHoliday] = useState<Holiday | undefined>(undefined);

  const handlePrevMonth = () => setCurrentDate(subMonths(currentDate, 1));
  const handleNextMonth = () => setCurrentDate(addMonths(currentDate, 1));
  const handleToday = () => setCurrentDate(new Date());

  const handleDayClick = (dateStr: string) => {
    setSelectedHoliday(undefined);
    setSelectedPersonId(undefined);
    setSelectedDate(dateStr);
    setBookingOpen(true);
  };

  const handleHolidayClick = (holiday: Holiday, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setSelectedHoliday(holiday);
    setBookingOpen(true);
  };

  const openNewBooking = () => {
    setSelectedHoliday(undefined);
    setSelectedPersonId(undefined);
    setSelectedDate(formatLocalDate(new Date()));
    setBookingOpen(true);
  };

  const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);

  const coverageMap = useMemo(() => {
    if (!coverage) return new Map<string, CoverageDay>();
    const map = new Map<string, CoverageDay>();
    coverage.forEach(c => map.set(c.date, c));
    return map;
  }, [coverage]);

  const peopleMap = useMemo(() => {
    const map = new Map<number, Person>();
    (people || []).forEach(p => map.set(p.id, p));
    return map;
  }, [people]);

  // Who's away today
  const awayToday = useMemo(() => {
    return (upcoming || [])
      .filter(h => h.startDate <= todayStr && h.endDate >= todayStr)
      .sort((a, b) => a.endDate.localeCompare(b.endDate));
  }, [upcoming, todayStr]);

  // Upcoming bookings that start in the future (within the horizon)
  const upcomingSoon = useMemo(() => {
    return (upcoming || [])
      .filter(h => h.startDate > todayStr)
      .sort((a, b) => a.startDate.localeCompare(b.startDate))
      .slice(0, 8);
  }, [upcoming, todayStr]);

  const overThresholdToday = (summary?.awayToday ?? 0) > (settings?.maxAway ?? Infinity);

  return (
    <AppLayout>
      <div className="flex flex-col h-full gap-6">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{settings?.teamName || "FIG Team"} Calendar</h1>
            <p className="text-muted-foreground mt-1">See who's off at a glance and keep coverage healthy.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="bg-card">
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
            <Button onClick={openNewBooking}>
              <Plus className="w-4 h-4 mr-2" /> Book Time Off
            </Button>
          </div>
        </div>

        {/* Out-today hero strip */}
        <div className={`shrink-0 rounded-xl border p-5 ${overThresholdToday ? "border-destructive/40 bg-destructive/5" : "bg-card"}`}>
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className={`w-11 h-11 rounded-lg flex items-center justify-center ${overThresholdToday ? "bg-destructive/15 text-destructive" : "bg-primary/10 text-primary"}`}>
                <Plane className="w-5 h-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wider text-muted-foreground font-medium">Out today</p>
                <p className="text-2xl font-bold leading-tight">
                  {awayToday.length} {awayToday.length === 1 ? "person" : "people"} away
                </p>
              </div>
            </div>

            {awayToday.length > 0 ? (
              <div className="flex flex-wrap items-center gap-2">
                {awayToday.map(h => {
                  const p = peopleMap.get(h.personId);
                  if (!p) return null;
                  return (
                    <button
                      key={h.id}
                      onClick={() => handleHolidayClick(h)}
                      className="flex items-center gap-2 pl-1 pr-3 py-1 rounded-full border bg-background hover:shadow-sm transition-shadow"
                      title={`${p.name} — ${TYPE_LABELS[h.type] ?? h.type}, back ${format(addDays(parseLocalDate(h.endDate), 1), "EEE d MMM")}`}
                    >
                      <Avatar className="w-7 h-7 border-2" style={{ borderColor: p.color }}>
                        <AvatarFallback style={{ backgroundColor: `${p.color}20`, color: p.color }} className="text-[10px] font-semibold">
                          {p.initials}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm font-medium">{p.name}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Everyone's in today. Full coverage.</p>
            )}

            {overThresholdToday && (
              <div className="flex items-center gap-2 text-destructive text-sm font-medium">
                <AlertTriangle className="w-4 h-4" />
                Over the {settings?.maxAway}-person limit
              </div>
            )}
          </div>
        </div>

        {/* Stat chips */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 shrink-0">
          <StatChip icon={<Users className="w-4 h-4" />} label="Away this week" value={summary?.awayThisWeek ?? 0} />
          <StatChip icon={<CalendarClock className="w-4 h-4" />} label="Upcoming bookings" value={summary?.upcomingBookings ?? 0} />
          <StatChip icon={<CalendarDays className="w-4 h-4" />} label="Team members" value={summary?.totalPeople ?? 0} />
          <StatChip
            icon={<AlertTriangle className="w-4 h-4" />}
            label="Conflict days (90d)"
            value={summary?.conflictDays ?? 0}
            danger={!!summary?.conflictDays}
          />
        </div>

        {/* Main: calendar + who's away */}
        <div className="flex-1 grid grid-cols-1 xl:grid-cols-[1fr_320px] gap-6 min-h-0">
          {/* Calendar */}
          <div className="bg-card border rounded-xl overflow-hidden flex flex-col min-h-[520px]">
            <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
              <h2 className="text-lg font-semibold capitalize">{format(currentDate, "MMMM yyyy")}</h2>
              <div className="flex items-center gap-2">
                <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
                <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
                <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 border-b bg-muted/50 text-xs font-medium text-muted-foreground shrink-0">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
                <div key={d} className="py-2 text-center uppercase tracking-wider">{d}</div>
              ))}
            </div>
            
            {/* Grid */}
            <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6">
              {days.map((day) => {
                const dateStr = formatLocalDate(day);
                const isCurrentMonth = isSameMonth(day, currentDate);
                const today = isToday(day);
                const cDay = coverageMap.get(dateStr);
                const overThreshold = cDay?.overThreshold;
                
                const peopleAway = (cDay?.personIds || []).map(id => peopleMap.get(id)).filter(Boolean) as Person[];

                return (
                  <div 
                    key={dateStr}
                    onClick={() => handleDayClick(dateStr)}
                    className={`border-r border-b p-1.5 flex flex-col gap-1 transition-colors hover:bg-muted/30 cursor-pointer ${
                      !isCurrentMonth ? "bg-muted/10 opacity-50" : ""
                    } ${today ? "bg-accent/5 ring-1 ring-inset ring-accent/30" : ""} ${overThreshold ? "bg-destructive/5" : ""}`}
                  >
                    <div className="flex justify-between items-center px-1">
                      <span className={`text-xs font-semibold w-6 h-6 flex items-center justify-center rounded-full ${
                        today ? "bg-accent text-accent-foreground" : "text-muted-foreground"
                      }`}>
                        {format(day, "d")}
                      </span>
                      {overThreshold && (
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <div className="flex items-center gap-0.5 text-destructive">
                              <AlertTriangle className="w-3 h-3" />
                            </div>
                          </TooltipTrigger>
                          <TooltipContent side="top">
                            <p>Conflict: {cDay.awayCount} people away (max {settings?.maxAway})</p>
                          </TooltipContent>
                        </Tooltip>
                      )}
                    </div>
                    
                    <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-1 custom-scrollbar">
                      {peopleAway.map(p => {
                        const holiday = holidays?.find(h => h.personId === p.id && h.startDate <= dateStr && h.endDate >= dateStr);
                        return (
                          <div 
                            key={p.id}
                            onClick={(e) => holiday ? handleHolidayClick(holiday, e) : undefined}
                            className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded truncate font-medium border"
                            style={{ 
                              backgroundColor: `${p.color}15`, 
                              color: p.color,
                              borderColor: `${p.color}30`
                            }}
                          >
                            <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: p.color }} />
                            <span className="truncate">{p.name}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Who's away panel */}
          <div className="flex flex-col gap-6 min-h-0">
            <PanelCard title="Out today" icon={<Plane className="w-4 h-4" />} count={awayToday.length}>
              {awayToday.length === 0 ? (
                <EmptyRow text="Everyone's in today." />
              ) : (
                <div className="space-y-1">
                  {awayToday.map(h => {
                    const p = peopleMap.get(h.personId);
                    if (!p) return null;
                    const back = addDays(parseLocalDate(h.endDate), 1);
                    return (
                      <PersonRow
                        key={h.id}
                        person={p}
                        primary={TYPE_LABELS[h.type] ?? h.type}
                        secondary={`Back ${format(back, "EEE d MMM")}`}
                        onClick={() => handleHolidayClick(h)}
                      />
                    );
                  })}
                </div>
              )}
            </PanelCard>

            <PanelCard title="Coming up" icon={<CalendarClock className="w-4 h-4" />} count={upcomingSoon.length} grow>
              {upcomingSoon.length === 0 ? (
                <EmptyRow text="No bookings in the next 30 days." />
              ) : (
                <div className="space-y-1">
                  {upcomingSoon.map(h => {
                    const p = peopleMap.get(h.personId);
                    if (!p) return null;
                    const start = parseLocalDate(h.startDate);
                    const inDays = differenceInCalendarDays(start, parseLocalDate(todayStr));
                    return (
                      <PersonRow
                        key={h.id}
                        person={p}
                        primary={format(start, "EEE d MMM")}
                        secondary={inDays === 0 ? "Today" : inDays === 1 ? "Tomorrow" : `In ${inDays} days`}
                        onClick={() => handleHolidayClick(h)}
                      />
                    );
                  })}
                </div>
              )}
            </PanelCard>
          </div>
        </div>
      </div>

      <HolidayDialog 
        open={bookingOpen} 
        onOpenChange={setBookingOpen}
        people={people || []}
        holiday={selectedHoliday}
        defaultDate={selectedDate}
        defaultPersonId={selectedPersonId}
      />

      <ImportHolidaysDialog 
        open={importOpen} 
        onOpenChange={setImportOpen} 
      />
    </AppLayout>
  );
}

function StatChip({ icon, label, value, danger = false }: { icon: React.ReactNode; label: string; value: number | string; danger?: boolean }) {
  return (
    <div className="flex items-center gap-3 rounded-xl border bg-card px-4 py-3">
      <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${danger ? "bg-destructive/10 text-destructive" : "bg-muted text-muted-foreground"}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <p className="text-xs text-muted-foreground font-medium truncate">{label}</p>
        <p className={`text-xl font-bold font-mono tracking-tight ${danger ? "text-destructive" : "text-foreground"}`}>{value}</p>
      </div>
    </div>
  );
}

function PanelCard({ title, icon, count, children, grow = false }: { title: string; icon: React.ReactNode; count: number; children: React.ReactNode; grow?: boolean }) {
  return (
    <div className={`bg-card border rounded-xl flex flex-col min-h-0 ${grow ? "flex-1" : ""}`}>
      <div className="flex items-center justify-between px-4 py-3 border-b shrink-0">
        <div className="flex items-center gap-2 text-sm font-semibold">
          <span className="text-muted-foreground">{icon}</span>
          {title}
        </div>
        <span className="text-xs font-mono font-semibold text-muted-foreground bg-muted rounded-full px-2 py-0.5">{count}</span>
      </div>
      <div className="p-2 overflow-y-auto custom-scrollbar">{children}</div>
    </div>
  );
}

function PersonRow({ person, primary, secondary, onClick }: { person: Person; primary: string; secondary: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors text-left"
    >
      <Avatar className="w-9 h-9 border-2 shrink-0" style={{ borderColor: person.color }}>
        <AvatarFallback style={{ backgroundColor: `${person.color}20`, color: person.color }} className="text-xs font-semibold">
          {person.initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{person.name}</p>
        <p className="text-xs text-muted-foreground truncate">{primary}</p>
      </div>
      <span className="text-xs text-muted-foreground whitespace-nowrap">{secondary}</span>
    </button>
  );
}

function EmptyRow({ text }: { text: string }) {
  return <p className="text-sm text-muted-foreground px-2 py-6 text-center">{text}</p>;
}
