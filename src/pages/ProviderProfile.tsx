import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, MapPin, Phone, Building, CheckCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface ProviderData {
  id: string;
  full_name: string | null;
  company_name: string | null;
  phone_number: string | null;
  address: string | null;
  avatar_url: string | null;
}

interface Review {
  id: string;
  rating: number;
  comment: string | null;
  created_at: string;
  reviewer_name: string | null;
}

interface CompletedJob {
  id: string;
  title: string;
  location: string;
  completed_at: string;
  final_price: number | null;
}

export default function ProviderProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedJobs, setCompletedJobs] = useState<CompletedJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [averageRating, setAverageRating] = useState(0);

  useEffect(() => {
    if (id) {
      loadProviderData();
    }
  }, [id]);

  const loadProviderData = async () => {
    if (!id) return;

    try {
      // Load provider profile
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("id, full_name, company_name, phone_number, address, avatar_url")
        .eq("id", id)
        .maybeSingle();

      if (profileError) throw profileError;
      setProvider(profileData);

      // Load reviews for this provider
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("id, rating, comment, created_at, reviewer_id")
        .eq("reviewee_id", id)
        .order("created_at", { ascending: false });

      if (reviewsError) throw reviewsError;

      // Get reviewer names
      const reviewerIds = reviewsData?.map(r => r.reviewer_id) || [];
      const { data: reviewerProfiles } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", reviewerIds);

      const reviewsWithNames = reviewsData?.map(review => ({
        ...review,
        reviewer_name: reviewerProfiles?.find(p => p.id === review.reviewer_id)?.full_name || "Anonymous"
      })) || [];

      setReviews(reviewsWithNames);

      // Calculate average rating
      if (reviewsWithNames.length > 0) {
        const avg = reviewsWithNames.reduce((sum, r) => sum + r.rating, 0) / reviewsWithNames.length;
        setAverageRating(avg);
      }

      // Load completed jobs for this provider
      const { data: jobsData, error: jobsError } = await supabase
        .from("job_requests")
        .select("id, title, location, completed_at, final_price")
        .eq("accepted_provider_id", id)
        .eq("status", "completed")
        .order("completed_at", { ascending: false })
        .limit(10);

      if (jobsError) throw jobsError;
      setCompletedJobs(jobsData || []);
    } catch (error) {
      console.error("Error loading provider data:", error);
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-4 w-4 ${
              star <= rating ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground"
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <div className="space-y-6">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-64 w-full" />
            <Skeleton className="h-64 w-full" />
          </div>
        </main>
      </div>
    );
  }

  if (!provider) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container mx-auto px-4 py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Provider not found</p>
              <Button variant="outline" className="mt-4" onClick={() => navigate(-1)}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Go Back
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <Button variant="ghost" className="mb-6" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>

        {/* Provider Header */}
        <Card className="mb-6">
          <CardContent className="pt-6">
            <div className="flex flex-col md:flex-row gap-6">
              <div className="flex-shrink-0">
                <div className="h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center">
                  {provider.avatar_url ? (
                    <img
                      src={provider.avatar_url}
                      alt={provider.full_name || "Provider"}
                      className="h-24 w-24 rounded-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl font-bold text-primary">
                      {provider.full_name?.charAt(0) || "P"}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold">
                  {provider.full_name || "Service Provider"}
                </h1>
                {provider.company_name && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <Building className="h-4 w-4" />
                    {provider.company_name}
                  </div>
                )}
                {provider.address && (
                  <div className="flex items-center gap-2 text-muted-foreground mt-1">
                    <MapPin className="h-4 w-4" />
                    {provider.address}
                  </div>
                )}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(averageRating))}
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviews.length} reviews)</span>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {completedJobs.length} jobs completed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid md:grid-cols-2 gap-6">
          {/* Reviews Section */}
          <Card>
            <CardHeader>
              <CardTitle>Reviews</CardTitle>
              <CardDescription>
                What customers are saying about this provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No reviews yet
                </p>
              ) : (
                <div className="space-y-4">
                  {reviews.map((review) => (
                    <div key={review.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{review.reviewer_name}</span>
                        {renderStars(review.rating)}
                      </div>
                      {review.comment && (
                        <p className="text-muted-foreground text-sm">{review.comment}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-2">
                        {format(new Date(review.created_at), "MMM d, yyyy")}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Completed Jobs Portfolio */}
          <Card>
            <CardHeader>
              <CardTitle>Completed Jobs</CardTitle>
              <CardDescription>
                Recent work completed by this provider
              </CardDescription>
            </CardHeader>
            <CardContent>
              {completedJobs.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No completed jobs yet
                </p>
              ) : (
                <div className="space-y-4">
                  {completedJobs.map((job) => (
                    <div key={job.id} className="border-b last:border-0 pb-4 last:pb-0">
                      <h4 className="font-medium">{job.title}</h4>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
                        <MapPin className="h-3 w-3" />
                        {job.location}
                      </div>
                      <div className="flex items-center justify-between mt-2">
                        <span className="text-xs text-muted-foreground">
                          {job.completed_at && format(new Date(job.completed_at), "MMM d, yyyy")}
                        </span>
                        {job.final_price && (
                          <Badge variant="outline">
                            J${job.final_price.toLocaleString()}
                          </Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
