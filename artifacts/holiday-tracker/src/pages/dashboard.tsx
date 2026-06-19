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
import { format, addMonths, subMonths, startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, isSameMonth, isToday, isSameDay } from "date-fns";
import { formatLocalDate } from "@/lib/date-utils";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Upload, Plus } from "lucide-react";
import { HolidayDialog } from "@/components/holidays/HolidayDialog";
import { ImportHolidaysDialog } from "@/components/holidays/ImportHolidaysDialog";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

export default function DashboardPage() {
  const [currentDate, setCurrentDate] = useState(new Date());
  
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 }); // Start on Monday
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const fromStr = formatLocalDate(calendarStart);
  const toStr = formatLocalDate(calendarEnd);

  // Queries
  const { data: summary } = useGetSummary({ query: { queryKey: getGetSummaryQueryKey() } });
  const { data: people } = useListPeople({ query: { queryKey: getListPeopleQueryKey() } });
  const { data: settings } = useGetSettings({ query: { queryKey: getGetSettingsQueryKey() } });
  const { data: holidays } = useListHolidays({ from: fromStr, to: toStr }, { query: { queryKey: getListHolidaysQueryKey({ from: fromStr, to: toStr }) } });
  const { data: coverage } = useGetCoverage({ from: fromStr, to: toStr }, { query: { queryKey: getGetCoverageQueryKey({ from: fromStr, to: toStr }) } });

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

  const handleHolidayClick = (holiday: Holiday, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedHoliday(holiday);
    setBookingOpen(true);
  };

  const days = useMemo(() => eachDayOfInterval({ start: calendarStart, end: calendarEnd }), [calendarStart, calendarEnd]);

  const coverageMap = useMemo(() => {
    if (!coverage) return new Map<string, CoverageDay>();
    const map = new Map<string, CoverageDay>();
    coverage.forEach(c => map.set(c.date, c));
    return map;
  }, [coverage]);

  return (
    <AppLayout>
      <div className="flex flex-col h-full space-y-6">
        {/* Header & Actions */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 shrink-0">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">{settings?.teamName || "FIG Team"} Calendar</h1>
            <p className="text-muted-foreground mt-1">Shared time-off tracker and coverage overview.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setImportOpen(true)} className="bg-card">
              <Upload className="w-4 h-4 mr-2" /> Import
            </Button>
            <Button onClick={() => { setSelectedHoliday(undefined); setSelectedDate(formatLocalDate(new Date())); setBookingOpen(true); }}>
              <Plus className="w-4 h-4 mr-2" /> Book Time Off
            </Button>
          </div>
        </div>

        {/* Summary Dashboard */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 shrink-0">
          <SummaryCard title="Away Today" value={summary?.awayToday ?? 0} />
          <SummaryCard title="Away This Week" value={summary?.awayThisWeek ?? 0} />
          <SummaryCard title="Upcoming Bookings" value={summary?.upcomingBookings ?? 0} />
          <SummaryCard 
            title="Conflict Days (Next 90)" 
            value={summary?.conflictDays ?? 0} 
            valueClass={summary?.conflictDays ? "text-destructive" : "text-foreground"} 
          />
        </div>

        {/* Calendar Controls */}
        <div className="flex items-center justify-between shrink-0 pt-2">
          <h2 className="text-xl font-semibold capitalize">{format(currentDate, "MMMM yyyy")}</h2>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleToday}>Today</Button>
            <Button variant="outline" size="icon" onClick={handlePrevMonth}><ChevronLeft className="w-4 h-4" /></Button>
            <Button variant="outline" size="icon" onClick={handleNextMonth}><ChevronRight className="w-4 h-4" /></Button>
          </div>
        </div>

        {/* Calendar Grid */}
        <div className="flex-1 bg-card border rounded-xl overflow-hidden flex flex-col min-h-[500px]">
          {/* Days of week header */}
          <div className="grid grid-cols-7 border-b bg-muted/50 text-xs font-medium text-muted-foreground shrink-0">
            {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(d => (
              <div key={d} className="py-2 text-center uppercase tracking-wider">{d}</div>
            ))}
          </div>
          
          {/* Grid */}
          <div className="flex-1 grid grid-cols-7 grid-rows-5 lg:grid-rows-6">
            {days.map((day, i) => {
              const dateStr = formatLocalDate(day);
              const isCurrentMonth = isSameMonth(day, currentDate);
              const today = isToday(day);
              const cDay = coverageMap.get(dateStr);
              const overThreshold = cDay?.overThreshold;
              
              // Get holidays starting or happening on this day. 
              // For a simple view, we just list people who are away on this day
              // We use the coverage data which gives us personIds.
              const peopleAway = (cDay?.personIds || []).map(id => people?.find(p => p.id === id)).filter(Boolean) as Person[];

              return (
                <div 
                  key={dateStr}
                  onClick={() => handleDayClick(dateStr)}
                  className={`border-r border-b p-1.5 flex flex-col gap-1 transition-colors hover:bg-muted/30 cursor-pointer ${
                    !isCurrentMonth ? "bg-muted/10 opacity-50" : ""
                  } ${today ? "bg-accent/5" : ""} ${overThreshold ? "bg-destructive/5" : ""}`}
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
                          <div className="w-2 h-2 rounded-full bg-destructive mr-1 animate-pulse" />
                        </TooltipTrigger>
                        <TooltipContent side="top">
                          <p>Conflict: {cDay.awayCount} people away (Max {settings?.maxAway})</p>
                        </TooltipContent>
                      </Tooltip>
                    )}
                  </div>
                  
                  <div className="flex-1 overflow-y-auto space-y-1 mt-1 pr-1 custom-scrollbar">
                    {peopleAway.map(p => {
                      // Find the specific holiday record to allow editing
                      const holiday = holidays?.find(h => h.personId === p.id && h.startDate <= dateStr && h.endDate >= dateStr);
                      return (
                        <div 
                          key={p.id}
                          onClick={(e) => holiday ? handleHolidayClick(holiday, e) : null}
                          className="text-[10px] px-1.5 py-0.5 rounded truncate font-medium border"
                          style={{ 
                            backgroundColor: `${p.color}15`, 
                            color: p.color,
                            borderColor: `${p.color}30`
                          }}
                        >
                          {p.name}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
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

function SummaryCard({ title, value, valueClass = "" }: { title: string, value: number | string, valueClass?: string }) {
  return (
    <Card className="bg-card hover-elevate shadow-sm">
      <CardContent className="p-4 flex flex-col items-center justify-center text-center">
        <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider mb-1">{title}</p>
        <p className={`text-3xl font-bold font-mono tracking-tight ${valueClass}`}>{value}</p>
      </CardContent>
    </Card>
  );
}
