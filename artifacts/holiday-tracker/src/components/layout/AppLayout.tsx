import { ReactNode } from "react";
import { Link, useLocation } from "wouter";
import { Calendar, Users, Settings as SettingsIcon, Hexagon } from "lucide-react";

export function AppLayout({ children }: { children: ReactNode }) {
  const [location] = useLocation();

  const nav = [
    { href: "/", label: "Calendar", icon: Calendar },
    { href: "/people", label: "Team", icon: Users },
    { href: "/settings", label: "Settings", icon: SettingsIcon },
  ];

  return (
    <div className="flex h-screen w-full bg-background overflow-hidden text-foreground">
      <div className="w-64 border-r border-border bg-sidebar flex flex-col hidden md:flex">
        <div className="h-16 flex items-center px-6 border-b border-sidebar-border text-sidebar-primary font-semibold tracking-tight gap-2">
          <Hexagon className="w-5 h-5 text-accent" fill="currentColor" />
          <span>FIG Tracker</span>
        </div>
        <nav className="flex-1 py-4 px-3 space-y-1">
          {nav.map((item) => {
            const isActive = location === item.href;
            const Icon = item.icon;
            return (
              <Link 
                key={item.href} 
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                  isActive 
                    ? "bg-sidebar-accent text-sidebar-accent-foreground" 
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50 hover:text-sidebar-accent-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="p-4 text-xs text-muted-foreground border-t border-sidebar-border">
          FIG Capital Markets
        </div>
      </div>
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Mobile Header */}
        <div className="h-16 border-b border-border flex items-center px-4 md:hidden shrink-0 bg-card">
          <Hexagon className="w-5 h-5 text-accent mr-2" fill="currentColor" />
          <span className="font-semibold">FIG Tracker</span>
        </div>
        <main className="flex-1 overflow-y-auto p-4 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
