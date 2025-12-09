import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Star, Building, CheckCircle, ArrowLeft } from "lucide-react";
import { format } from "date-fns";

interface ProviderData {
  id: string;
  full_name: string | null;
  company_name: string | null;
  avatar_url: string | null;
  bio: string | null;
  user_role: string | null;
}

interface Review {
  id: string;
  rating: number;
  created_at: string;
  reviewer_name: string | null;
}

export default function ProviderProfile() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [provider, setProvider] = useState<ProviderData | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [completedJobsCount, setCompletedJobsCount] = useState(0);
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
      // Load provider profile using secure RPC function (only returns public info)
      const { data: profileData, error: profileError } = await supabase
        .rpc("get_public_provider_profile", { provider_id: id });

      if (profileError) throw profileError;
      // RPC returns an array, get the first result
      const profile = Array.isArray(profileData) ? profileData[0] : profileData;
      setProvider(profile || null);

      // Load reviews for this provider
      const { data: reviewsData, error: reviewsError } = await supabase
        .from("reviews")
        .select("id, rating, created_at, reviewer_id")
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

      // Get completed jobs count using secure function
      const { data: countData } = await supabase
        .rpc("get_provider_completed_jobs_count", { provider_id: id });
      
      setCompletedJobsCount(countData || 0);
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
                {provider.bio && (
                  <p className="text-muted-foreground mt-2 text-sm">
                    {provider.bio}
                  </p>
                )}
                <div className="flex items-center gap-4 mt-4">
                  <div className="flex items-center gap-2">
                    {renderStars(Math.round(averageRating))}
                    <span className="font-semibold">{averageRating.toFixed(1)}</span>
                    <span className="text-muted-foreground">({reviews.length} reviews)</span>
                  </div>
                  <Badge variant="secondary">
                    <CheckCircle className="h-3 w-3 mr-1" />
                    {completedJobsCount} jobs completed
                  </Badge>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

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
                    <p className="text-xs text-muted-foreground mt-2">
                      {format(new Date(review.created_at), "MMM d, yyyy")}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
