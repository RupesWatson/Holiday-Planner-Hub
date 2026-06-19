import { useState } from "react";
import { useImportHolidays, HolidayImportRow, HolidayImportRowType, getListHolidaysQueryKey, getGetSummaryQueryKey } from "@workspace/api-client-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import * as XLSX from "xlsx";
import { formatLocalDate } from "@/lib/date-utils";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Info, Upload, CheckCircle2, AlertCircle } from "lucide-react";

export function ImportHolidaysDialog({ open, onOpenChange }: { open: boolean, onOpenChange: (o: boolean) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [rows, setRows] = useState<HolidayImportRow[]>([]);
  const [parsing, setParsing] = useState(false);
  const [result, setResult] = useState<{ imported: number, skipped: number, unmatched: string[] } | null>(null);
  
  const importHolidays = useImportHolidays();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) {
      setFile(f);
      parseFile(f);
    }
  };

  const parseFile = (file: File) => {
    setParsing(true);
    setResult(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: "binary", cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json<any>(worksheet);

        const parsedRows: HolidayImportRow[] = json.map((row: any) => {
          // Attempt to map common column names
          const name = row.Name || row.name || row.Initials || row.initials || "";
          
          // Handle Excel dates or string dates
          let startDate = "";
          let endDate = "";
          
          if (row.StartDate || row["Start Date"] || row.Start) {
            const sd = row.StartDate || row["Start Date"] || row.Start;
            startDate = sd instanceof Date ? formatLocalDate(sd) : new Date(sd).toISOString().split('T')[0];
          }
          if (row.EndDate || row["End Date"] || row.End) {
            const ed = row.EndDate || row["End Date"] || row.End;
            endDate = ed instanceof Date ? formatLocalDate(ed) : new Date(ed).toISOString().split('T')[0];
          }

          let type: HolidayImportRowType = "annual";
          const rawType = (row.Type || row.type || "").toLowerCase();
          if (rawType.includes("sick")) type = "sick";
          else if (rawType.includes("public")) type = "public";
          else if (rawType.includes("other")) type = "other";

          return {
            name: String(name).trim(),
            startDate,
            endDate,
            type,
            notes: String(row.Notes || row.notes || "").trim()
          };
        }).filter(r => r.name && r.startDate && r.endDate);

        setRows(parsedRows);
      } catch (err) {
        toast({ variant: "destructive", title: "Parsing failed", description: "Could not read the spreadsheet. Check the format." });
      } finally {
        setParsing(false);
      }
    };
    reader.readAsBinaryString(file);
  };

  const handleImport = () => {
    importHolidays.mutate({ data: { rows } }, {
      onSuccess: (res) => {
        setResult(res);
        queryClient.invalidateQueries({ queryKey: getListHolidaysQueryKey() });
        queryClient.invalidateQueries({ queryKey: ["/api/coverage"] });
        queryClient.invalidateQueries({ queryKey: getGetSummaryQueryKey() });
        toast({ title: "Import complete", description: `Successfully imported ${res.imported} records.` });
      },
      onError: () => {
        toast({ variant: "destructive", title: "Import failed", description: "There was an error communicating with the server." });
      }
    });
  };

  const handleClose = () => {
    setFile(null);
    setRows([]);
    setResult(null);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Import Holidays</DialogTitle>
          <DialogDescription>
            Upload a CSV or Excel file containing holiday bookings.
          </DialogDescription>
        </DialogHeader>

        {!result ? (
          <div className="space-y-4">
            <Alert>
              <Info className="h-4 w-4" />
              <AlertTitle>Expected Format</AlertTitle>
              <AlertDescription className="text-xs">
                Your spreadsheet should have headers: <strong>Name, StartDate, EndDate, Type, Notes</strong>. 
                Dates must be valid. Name will be matched against current team members.
              </AlertDescription>
            </Alert>

            <div>
              <Input type="file" accept=".csv, .xlsx, .xls" onChange={handleFileChange} disabled={parsing || importHolidays.isPending} />
            </div>

            {rows.length > 0 && (
              <div className="bg-muted p-3 rounded-md border text-sm">
                <p className="font-medium">Found {rows.length} valid rows to import.</p>
                <div className="mt-2 max-h-32 overflow-y-auto space-y-1">
                  {rows.slice(0,3).map((r, i) => (
                    <div key={i} className="flex justify-between text-muted-foreground text-xs">
                      <span>{r.name}</span>
                      <span>{r.startDate} to {r.endDate}</span>
                    </div>
                  ))}
                  {rows.length > 3 && <div className="text-xs text-center pt-1 italic">...and {rows.length - 3} more</div>}
                </div>
              </div>
            )}

            <DialogFooter>
              <Button variant="outline" onClick={handleClose}>Cancel</Button>
              <Button onClick={handleImport} disabled={rows.length === 0 || importHolidays.isPending}>
                <Upload className="w-4 h-4 mr-2" />
                {importHolidays.isPending ? "Importing..." : "Run Import"}
              </Button>
            </DialogFooter>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 text-green-600 mb-2">
              <CheckCircle2 className="w-8 h-8" />
              <div>
                <h3 className="font-semibold text-lg">Import Complete</h3>
                <p className="text-sm text-muted-foreground">{result.imported} records successfully imported.</p>
              </div>
            </div>
            
            {result.skipped > 0 && (
              <Alert variant="destructive" className="mt-4">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Skipped {result.skipped} records</AlertTitle>
                <AlertDescription className="text-xs">
                  {result.unmatched.length > 0 ? (
                    <div>
                      Could not match these names to the roster:
                      <ul className="list-disc pl-4 mt-1 font-mono">
                        {result.unmatched.map((n, i) => <li key={i}>{n}</li>)}
                      </ul>
                    </div>
                  ) : "Records were skipped due to invalid data or overlapping dates."}
                </AlertDescription>
              </Alert>
            )}

            <DialogFooter>
              <Button onClick={handleClose}>Done</Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
