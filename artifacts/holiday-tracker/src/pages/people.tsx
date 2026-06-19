import { useState } from "react";
import { useListPeople, getListPeopleQueryKey, useDeletePerson, Person, getGetSummaryQueryKey } from "@workspace/api-client-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Plus, Pencil, Trash2, ShieldAlert, Briefcase, CalendarPlus } from "lucide-react";
import { PersonDialog } from "@/components/people/PersonDialog";
import { HolidayDialog } from "@/components/holidays/HolidayDialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";

export default function PeoplePage() {
  const { data: people, isLoading } = useListPeople({ query: { queryKey: getListPeopleQueryKey() } });
  
  const [dialogOpen, setDialogOpen] = useState(false);
  const [selectedPerson, setSelectedPerson] = useState<Person | undefined>(undefined);
  
  const [deleteOpen, setDeleteDialogOpen] = useState(false);
  const [personToDelete, setPersonToDelete] = useState<Person | undefined>(undefined);

  const [bookingOpen, setBookingOpen] = useState(false);
  const [bookingPersonId, setBookingPersonId] = useState<number | undefined>(undefined);

  const deletePerson = useDeletePerson();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleEdit = (person: Person) => {
    setSelectedPerson(person);
    setDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedPerson(undefined);
    setDialogOpen(true);
  };

  const handleDeleteClick = (person: Person) => {
    setPersonToDelete(person);
    setDeleteDialogOpen(true);
  };

  const handleBook = (person: Person) => {
    setBookingPersonId(person.id);
    setBookingOpen(true);
  };

  const confirmDelete = () => {
    if (!personToDelete) return;
    deletePerson.mutate({ id: personToDelete.id }, {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getListPeopleQueryKey() });
        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        toast({ title: "Person removed", description: `${personToDelete.name} has been removed from the roster.` });
        setDeleteDialogOpen(false);
      },
      onError: () => {
        toast({ variant: "destructive", title: "Error", description: "Failed to remove person." });
      }
    });
  };

  const leads = people?.filter(p => p.role === "lead") || [];
  const bankers = people?.filter(p => p.role === "banker") || [];

  return (
    <AppLayout>
      <div className="max-w-5xl mx-auto space-y-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Team Roster</h1>
            <p className="text-muted-foreground mt-1">Manage leads and bankers in the FIG team.</p>
          </div>
          <Button onClick={handleCreate} className="gap-2">
            <Plus className="w-4 h-4" /> Add Team Member
          </Button>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
            <Skeleton className="h-20 w-full" />
          </div>
        ) : (
          <div className="space-y-8">
            <section>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 border-b pb-2">
                <ShieldAlert className="w-5 h-5 text-accent" /> Team Leads ({leads.length})
              </h2>
              {leads.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No team leads configured.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {leads.map(person => (
                    <PersonCard key={person.id} person={person} onEdit={handleEdit} onDelete={handleDeleteClick} onBook={handleBook} />
                  ))}
                </div>
              )}
            </section>

            <section>
              <h2 className="text-lg font-semibold flex items-center gap-2 mb-4 border-b pb-2">
                <Briefcase className="w-5 h-5 text-primary" /> Bankers ({bankers.length})
              </h2>
              {bankers.length === 0 ? (
                <p className="text-muted-foreground text-sm py-4">No bankers configured.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {bankers.map(person => (
                    <PersonCard key={person.id} person={person} onEdit={handleEdit} onDelete={handleDeleteClick} onBook={handleBook} />
                  ))}
                </div>
              )}
            </section>
          </div>
        )}
      </div>

      <PersonDialog 
        person={selectedPerson} 
        open={dialogOpen} 
        onOpenChange={setDialogOpen} 
      />

      <HolidayDialog
        open={bookingOpen}
        onOpenChange={setBookingOpen}
        people={people || []}
        defaultPersonId={bookingPersonId}
      />

      <AlertDialog open={deleteOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove {personToDelete?.name}? This will also delete all of their holiday bookings. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {deletePerson.isPending ? "Removing..." : "Remove"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppLayout>
  );
}

function PersonCard({ person, onEdit, onDelete, onBook }: { person: Person, onEdit: (p: Person) => void, onDelete: (p: Person) => void, onBook: (p: Person) => void }) {
  return (
    <div className="group flex items-center justify-between p-4 bg-card border rounded-lg shadow-sm hover:shadow-md transition-shadow">
      <button
        type="button"
        onClick={() => onBook(person)}
        className="flex items-center gap-3 text-left rounded-md -m-1 p-1 hover:bg-accent/10 transition-colors"
        title={`Book time off for ${person.name}`}
      >
        <Avatar className="w-10 h-10 border-2" style={{ borderColor: person.color }}>
          <AvatarFallback style={{ backgroundColor: `${person.color}20`, color: person.color }} className="font-semibold">
            {person.initials}
          </AvatarFallback>
        </Avatar>
        <div>
          <div className="font-medium">{person.name}</div>
          <div className="text-xs text-muted-foreground capitalize">{person.role}</div>
        </div>
      </button>
      <div className="flex opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onBook(person)} title="Book time off">
          <CalendarPlus className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground" onClick={() => onEdit(person)}>
          <Pencil className="w-4 h-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-destructive" onClick={() => onDelete(person)}>
          <Trash2 className="w-4 h-4" />
        </Button>
      </div>
    </div>
  );
}
