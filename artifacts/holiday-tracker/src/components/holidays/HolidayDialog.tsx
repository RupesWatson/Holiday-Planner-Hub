import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useCreateHoliday, 
  useUpdateHoliday,
  useDeleteHoliday,
  Holiday,
  Person,
  HolidayInputType,
  getListHolidaysQueryKey,
  getGetCoverageQueryKey,
  getGetSummaryQueryKey
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { formatLocalDate, parseLocalDate } from "@/lib/date-utils";
import { format } from "date-fns";

const holidaySchema = z.object({
  personId: z.coerce.number().min(1, "Person is required"),
  startDate: z.string().min(1, "Start date is required"),
  endDate: z.string().min(1, "End date is required"),
  type: z.enum(["annual", "sick", "public", "other"]),
  notes: z.string().optional(),
}).refine(data => {
  const start = parseLocalDate(data.startDate);
  const end = parseLocalDate(data.endDate);
  return start <= end;
}, {
  message: "End date must be after start date",
  path: ["endDate"]
});

interface HolidayDialogProps {
  holiday?: Holiday;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  people: Person[];
  defaultDate?: string;
  defaultPersonId?: number;
}

export function HolidayDialog({ holiday, open, onOpenChange, people, defaultDate, defaultPersonId }: HolidayDialogProps) {
  const isEditing = !!holiday;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createHoliday = useCreateHoliday();
  const updateHoliday = useUpdateHoliday();
  const deleteHoliday = useDeleteHoliday();

  const form = useForm<z.infer<typeof holidaySchema>>({
    resolver: zodResolver(holidaySchema),
    defaultValues: {
      personId: holiday?.personId || defaultPersonId || (people[0]?.id) || 0,
      startDate: holiday?.startDate || defaultDate || formatLocalDate(new Date()),
      endDate: holiday?.endDate || defaultDate || formatLocalDate(new Date()),
      type: (holiday?.type as "annual" | "sick" | "public" | "other") || "annual",
      notes: holiday?.notes || "",
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      personId: holiday?.personId || defaultPersonId || (people[0]?.id) || 0,
      startDate: holiday?.startDate || defaultDate || formatLocalDate(new Date()),
      endDate: holiday?.endDate || defaultDate || formatLocalDate(new Date()),
      type: (holiday?.type as "annual" | "sick" | "public" | "other") || "annual",
      notes: holiday?.notes || "",
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, holiday?.id, defaultDate, defaultPersonId]);

  const onSubmit = (data: z.infer<typeof holidaySchema>) => {
    const action = isEditing 
      ? updateHoliday.mutateAsync({ id: holiday.id, data })
      : createHoliday.mutateAsync({ data: { ...data, type: data.type as HolidayInputType } });

    action.then(() => {
      queryClient.invalidateQueries({ queryKey: getListHolidaysQueryKey() });
      queryClient.invalidateQueries({ queryKey: ["/api/coverage"] }); // prefix hack if needed or invalidate all
      queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
      
      toast({
        title: isEditing ? "Booking updated" : "Booking created",
        description: `Time off has been ${isEditing ? "updated" : "booked"}.`,
      });
      onOpenChange(false);
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "create"} booking.`,
      });
    });
  };

  const handleDelete = () => {
    if (!holiday) return;
    deleteHoliday.mutate({ id: holiday.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListHolidaysQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/coverage"] });
        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        toast({ title: "Booking deleted" });
        onOpenChange(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Booking" : "Book Time Off"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update existing holiday dates or type." : "Schedule time away for a team member."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            
            <FormField
              control={form.control}
              name="personId"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Team Member</FormLabel>
                  <Select 
                    onValueChange={(val) => field.onChange(parseInt(val))} 
                    value={field.value ? field.value.toString() : undefined}
                    disabled={isEditing}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select person" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {people.map(p => (
                        <SelectItem key={p.id} value={p.id.toString()}>{p.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="startDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="endDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="type"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="annual">Annual Leave</SelectItem>
                      <SelectItem value="sick">Sick Leave</SelectItem>
                      <SelectItem value="public">Public Holiday</SelectItem>
                      <SelectItem value="other">Other / Personal</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="notes"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Notes (Optional)</FormLabel>
                  <FormControl>
                    <Textarea placeholder="E.g., Out of town, limited connectivity..." className="resize-none" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4 flex items-center justify-between sm:justify-between w-full">
              {isEditing ? (
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={deleteHoliday.isPending}>
                  Delete
                </Button>
              ) : (
                <div /> // spacer
              )}
              <div className="flex gap-2">
                <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={createHoliday.isPending || updateHoliday.isPending}>
                  {isEditing ? "Save Changes" : "Book Time Off"}
                </Button>
              </div>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
