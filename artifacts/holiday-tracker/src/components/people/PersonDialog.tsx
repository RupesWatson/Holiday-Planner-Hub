import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { 
  useCreatePerson, 
  useUpdatePerson, 
  Person,
  PersonInputRole
} from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { getListPeopleQueryKey, getGetSummaryQueryKey } from "@workspace/api-client-react";

const personSchema = z.object({
  name: z.string().min(1, "Name is required"),
  initials: z.string().min(1, "Initials are required").max(3, "Max 3 chars"),
  role: z.enum(["lead", "banker"]),
  color: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color (e.g. #FF0000)"),
});

interface PersonDialogProps {
  person?: Person;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COLORS = [
  "#2563eb", // blue
  "#16a34a", // green
  "#dc2626", // red
  "#d97706", // orange
  "#7c3aed", // purple
  "#4f46e5", // violet
  "#0891b2", // indigo
  "#0d9488", // cyan
  "#059669", // emerald
];

export function PersonDialog({ person, open, onOpenChange }: PersonDialogProps) {
  const isEditing = !!person;
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const createPerson = useCreatePerson();
  const updatePerson = useUpdatePerson();

  const form = useForm<z.infer<typeof personSchema>>({
    resolver: zodResolver(personSchema),
    defaultValues: {
      name: person?.name || "",
      initials: person?.initials || "",
      role: (person?.role as "lead" | "banker") || "banker",
      color: person?.color || COLORS[Math.floor(Math.random() * COLORS.length)],
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: person?.name || "",
      initials: person?.initials || "",
      role: (person?.role as "lead" | "banker") || "banker",
      color: person?.color || COLORS[Math.floor(Math.random() * COLORS.length)],
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, person?.id]);

  const onSubmit = (data: z.infer<typeof personSchema>) => {
    const action = isEditing 
      ? updatePerson.mutateAsync({ id: person.id, data })
      : createPerson.mutateAsync({ data: { ...data, role: data.role as PersonInputRole } });

    action.then(() => {
      queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey() });
      queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
      toast({
        title: isEditing ? "Person updated" : "Person added",
        description: `${data.name} has been ${isEditing ? "updated" : "added to the team"}.`,
      });
      onOpenChange(false);
      if (!isEditing) form.reset();
    }).catch(() => {
      toast({
        variant: "destructive",
        title: "Error",
        description: `Failed to ${isEditing ? "update" : "add"} person.`,
      });
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Team Member" : "Add Team Member"}</DialogTitle>
          <DialogDescription>
            {isEditing ? "Update details for this team member." : "Add a new person to the FIG team roster."}
          </DialogDescription>
        </DialogHeader>
        
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Full Name</FormLabel>
                  <FormControl>
                    <Input placeholder="Jane Doe" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="initials"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Initials</FormLabel>
                    <FormControl>
                      <Input placeholder="JD" maxLength={3} {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="role"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Role</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="banker">Banker</SelectItem>
                        <SelectItem value="lead">Team Lead</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="color"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Calendar Color</FormLabel>
                  <FormControl>
                    <div className="flex items-center gap-2">
                      <Input type="color" className="w-12 h-10 p-1 cursor-pointer" {...field} />
                      <Input className="flex-1" {...field} />
                    </div>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter className="pt-4">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createPerson.isPending || updatePerson.isPending}>
                {isEditing ? "Save Changes" : "Add Person"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
