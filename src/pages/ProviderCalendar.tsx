import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Navigation } from "@/components/Navigation";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, isSameDay, parseISO, startOfMonth, endOfMonth } from "date-fns";
import { CalendarDays, MapPin, Clock, ChevronRight } from "lucide-react";

interface ScheduledJob {
  id: string;
  title: string;
  parish: string;
  preferred_date: string;
  preferred_time: string | null;
  status: string;
  final_price: number | null;
  base_price: number;
}

const statusColors: Record<string, string> = {
  accepted: "bg-blue-500",
  in_progress: "bg-amber-500",
  pending_completion: "bg-purple-500",
};

const statusLabels: Record<string, string> = {
  accepted: "Accepted",
  in_progress: "In Progress",
  pending_completion: "Pending Completion",
};

export default function ProviderCalendar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());

  const { data: jobs, isLoading } = useQuery({
    queryKey: ["provider-scheduled-jobs", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from("job_requests")
        .select("id, title, parish, preferred_date, preferred_time, status, final_price, base_price")
        .eq("accepted_provider_id", user.id)
        .in("status", ["accepted", "in_progress", "pending_completion"])
        .not("preferred_date", "is", null)
        .order("preferred_date", { ascending: true });

      if (error) throw error;
      return data as ScheduledJob[];
    },
    enabled: !!user?.id,
  });

  // Get dates that have jobs scheduled
  const jobDates = useMemo(() => {
    if (!jobs) return new Set<string>();
    return new Set(jobs.map(job => job.preferred_date));
  }, [jobs]);

  // Get jobs for the selected date
  const selectedDateJobs = useMemo(() => {
    if (!jobs || !selectedDate) return [];
    return jobs.filter(job => 
      isSameDay(parseISO(job.preferred_date), selectedDate)
    );
  }, [jobs, selectedDate]);

  // Get upcoming jobs (next 7 days)
  const upcomingJobs = useMemo(() => {
    if (!jobs) return [];
    const today = new Date();
    const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
    return jobs.filter(job => {
      const jobDate = parseISO(job.preferred_date);
      return jobDate >= today && jobDate <= nextWeek;
    }).slice(0, 5);
  }, [jobs]);

  // Custom day content to show job indicators
  const modifiers = useMemo(() => {
    const hasJob: Date[] = [];
    jobDates.forEach(dateStr => {
      hasJob.push(parseISO(dateStr));
    });
    return { hasJob };
  }, [jobDates]);

  const modifiersStyles = {
    hasJob: {
      position: "relative" as const,
    },
  };

  const calculateProviderCut = (job: ScheduledJob) => {
    const price = job.final_price || job.base_price;
    return Math.round(price * 0.7);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      <Navigation />
      
      <main className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            Job Calendar
          </h1>
          <p className="text-muted-foreground mt-2">
            View your scheduled jobs and manage your availability
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Calendar Section */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Schedule Overview</CardTitle>
              <CardDescription>
                Days with scheduled jobs are highlighted
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <Skeleton className="h-[350px] w-full" />
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={setSelectedDate}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md border p-3 pointer-events-auto"
                  modifiers={modifiers}
                  modifiersStyles={modifiersStyles}
                  components={{
                    DayContent: ({ date }) => {
                      const dateStr = format(date, "yyyy-MM-dd");
                      const hasJobOnDay = jobDates.has(dateStr);
                      return (
                        <div className="relative w-full h-full flex items-center justify-center">
                          <span>{date.getDate()}</span>
                          {hasJobOnDay && (
                            <span className="absolute bottom-0 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-primary" />
                          )}
                        </div>
                      );
                    },
                  }}
                />
              )}

              {/* Selected Date Jobs */}
              {selectedDate && (
                <div className="mt-6 border-t pt-6">
                  <h3 className="font-semibold text-lg mb-4">
                    Jobs on {format(selectedDate, "MMMM d, yyyy")}
                  </h3>
                  {selectedDateJobs.length === 0 ? (
                    <p className="text-muted-foreground text-sm">
                      No jobs scheduled for this date
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {selectedDateJobs.map((job) => (
                        <div
                          key={job.id}
                          className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                          onClick={() => navigate(`/job/${job.id}`)}
                        >
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium">{job.title}</span>
                              <Badge 
                                variant="secondary" 
                                className={`${statusColors[job.status]} text-white text-xs`}
                              >
                                {statusLabels[job.status]}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.parish}
                              </span>
                              {job.preferred_time && (
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3" />
                                  {job.preferred_time}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="font-semibold text-primary">
                              J${calculateProviderCut(job).toLocaleString()}
                            </p>
                            <ChevronRight className="h-4 w-4 text-muted-foreground ml-auto" />
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Upcoming Jobs */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Upcoming Jobs</CardTitle>
                <CardDescription>Next 7 days</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-3">
                    {[1, 2, 3].map((i) => (
                      <Skeleton key={i} className="h-16 w-full" />
                    ))}
                  </div>
                ) : upcomingJobs.length === 0 ? (
                  <p className="text-muted-foreground text-sm">
                    No upcoming jobs scheduled
                  </p>
                ) : (
                  <div className="space-y-3">
                    {upcomingJobs.map((job) => (
                      <div
                        key={job.id}
                        className="p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors cursor-pointer"
                        onClick={() => navigate(`/job/${job.id}`)}
                      >
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-sm truncate max-w-[150px]">
                            {job.title}
                          </span>
                          <Badge 
                            variant="outline" 
                            className={`${statusColors[job.status]} text-white text-xs`}
                          >
                            {statusLabels[job.status]}
                          </Badge>
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(job.preferred_date), "EEE, MMM d")}
                          {job.preferred_time && ` at ${job.preferred_time}`}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Legend */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Status Legend</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {Object.entries(statusLabels).map(([status, label]) => (
                    <div key={status} className="flex items-center gap-2">
                      <span className={`w-3 h-3 rounded-full ${statusColors[status]}`} />
                      <span className="text-sm text-muted-foreground">{label}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/browse-jobs")}
                >
                  Browse Available Jobs
                </Button>
                <Button 
                  variant="outline" 
                  className="w-full justify-start"
                  onClick={() => navigate("/my-jobs")}
                >
                  View All My Jobs
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
