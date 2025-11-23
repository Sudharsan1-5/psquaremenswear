import { useState, useEffect } from 'react';
import { Star, ThumbsUp, User, VerifiedIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface Review {
  id: string;
  productId: string;
  userId: string;
  userName: string;
  rating: number;
  comment: string;
  createdAt: string;
  verifiedPurchase: boolean;
  helpful: number;
}

interface ProductReviewsProps {
  productId: string;
  productName: string;
  currentRating: number;
}

export function ProductReviews({ productId, productName, currentRating }: ProductReviewsProps) {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [showWriteReview, setShowWriteReview] = useState(false);
  const [newRating, setNewRating] = useState(5);
  const [newComment, setNewComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);
  const { toast } = useToast();
  const { user } = useAuth();

  useEffect(() => {
    loadReviews();
  }, [productId]);

  const loadReviews = () => {
    // Load reviews from localStorage (in production, this would be from Supabase)
    const storedReviews = localStorage.getItem(`reviews_${productId}`);
    if (storedReviews) {
      setReviews(JSON.parse(storedReviews));
    }
  };

  const handleSubmitReview = () => {
    if (!user) {
      toast({
        title: "Sign in required",
        description: "Please sign in to write a review.",
        variant: "destructive"
      });
      return;
    }

    if (newComment.trim().length < 10) {
      toast({
        title: "Review too short",
        description: "Please write at least 10 characters.",
        variant: "destructive"
      });
      return;
    }

    const review: Review = {
      id: Date.now().toString(),
      productId,
      userId: user.id,
      userName: user.email?.split('@')[0] || 'Anonymous',
      rating: newRating,
      comment: newComment.trim(),
      createdAt: new Date().toISOString(),
      verifiedPurchase: true, // In production, check actual purchase history
      helpful: 0
    };

    const updatedReviews = [review, ...reviews];
    setReviews(updatedReviews);
    localStorage.setItem(`reviews_${productId}`, JSON.stringify(updatedReviews));

    setNewComment('');
    setNewRating(5);
    setShowWriteReview(false);

    toast({
      title: "Review submitted!",
      description: "Thank you for your feedback.",
    });
  };

  const getRatingDistribution = () => {
    const distribution = [0, 0, 0, 0, 0];
    reviews.forEach(review => {
      distribution[review.rating - 1]++;
    });
    return distribution.reverse();
  };

  const averageRating = reviews.length > 0
    ? reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length
    : currentRating;

  const distribution = getRatingDistribution();
  const totalReviews = reviews.length;

  const renderStars = (rating: number, interactive: boolean = false, size: string = 'h-4 w-4') => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`${size} cursor-pointer transition-colors ${
          i < (interactive ? (hoveredRating || rating) : rating)
            ? 'text-accent fill-accent'
            : 'text-muted-foreground'
        }`}
        onClick={() => interactive && setNewRating(i + 1)}
        onMouseEnter={() => interactive && setHoveredRating(i + 1)}
        onMouseLeave={() => interactive && setHoveredRating(0)}
      />
    ));
  };

  return (
    <div className="space-y-6">
      {/* Rating Summary */}
      <Card>
        <CardContent className="p-6">
          <h2 className="text-xl sm:text-2xl font-bold mb-4">Customer Reviews</h2>

          <div className="grid md:grid-cols-2 gap-6">
            {/* Overall Rating */}
            <div className="flex flex-col items-center justify-center text-center p-4 bg-muted/30 rounded-lg">
              <div className="text-4xl sm:text-5xl font-bold mb-2">{averageRating.toFixed(1)}</div>
              <div className="flex items-center gap-1 mb-2">
                {renderStars(Math.round(averageRating), false, 'h-5 w-5')}
              </div>
              <div className="text-sm text-muted-foreground">
                Based on {totalReviews} {totalReviews === 1 ? 'review' : 'reviews'}
              </div>
            </div>

            {/* Rating Distribution */}
            <div className="space-y-2">
              {[5, 4, 3, 2, 1].map((stars, idx) => {
                const count = distribution[idx];
                const percentage = totalReviews > 0 ? (count / totalReviews) * 100 : 0;
                return (
                  <div key={stars} className="flex items-center gap-2">
                    <span className="text-sm w-8">{stars} ★</span>
                    <Progress value={percentage} className="flex-1 h-2" />
                    <span className="text-sm text-muted-foreground w-12 text-right">
                      {count}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          <Separator className="my-4" />

          {/* Write Review Button */}
          {!showWriteReview && (
            <Button onClick={() => setShowWriteReview(true)} className="w-full sm:w-auto">
              Write a Review
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Write Review Form */}
      {showWriteReview && (
        <Card>
          <CardContent className="p-6">
            <h3 className="font-semibold text-lg mb-4">Write Your Review</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-medium mb-2 block">Your Rating</label>
                <div className="flex items-center gap-1">
                  {renderStars(newRating, true, 'h-8 w-8')}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium mb-2 block">Your Review</label>
                <Textarea
                  value={newComment}
                  onChange={(e) => setNewComment(e.target.value)}
                  placeholder={`Share your experience with ${productName}...`}
                  rows={4}
                  className="resize-none"
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Minimum 10 characters ({newComment.length}/10)
                </p>
              </div>

              <div className="flex gap-2">
                <Button onClick={handleSubmitReview} disabled={newComment.trim().length < 10}>
                  Submit Review
                </Button>
                <Button variant="outline" onClick={() => setShowWriteReview(false)}>
                  Cancel
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reviews List */}
      {reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.map((review) => (
            <Card key={review.id}>
              <CardContent className="p-4 sm:p-6">
                <div className="flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                    <User className="h-5 w-5 text-primary" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-semibold">{review.userName}</span>
                      {review.verifiedPurchase && (
                        <span className="flex items-center gap-1 text-xs text-success">
                          <VerifiedIcon className="h-3 w-3" />
                          Verified Purchase
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 mb-2">
                      <div className="flex items-center gap-0.5">
                        {renderStars(review.rating)}
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {new Date(review.createdAt).toLocaleDateString()}
                      </span>
                    </div>

                    <p className="text-sm sm:text-base text-muted-foreground leading-relaxed">
                      {review.comment}
                    </p>

                    <div className="flex items-center gap-4 mt-3">
                      <button className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors">
                        <ThumbsUp className="h-3 w-3" />
                        Helpful ({review.helpful})
                      </button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">
              No reviews yet. Be the first to review this product!
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
