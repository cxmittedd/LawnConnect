import { useSearchParams, Link } from 'react-router-dom';
import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { XCircle, RefreshCw, Home, MessageCircle } from 'lucide-react';

export default function PaymentFailure() {
  const [searchParams] = useSearchParams();
  
  const errorMessage = searchParams.get('error') || searchParams.get('message');
  const orderId = searchParams.get('orderId') || searchParams.get('oid');

  return (
    <>
      <Navigation />
      <main className="container mx-auto px-4 py-8">
        <div className="max-w-md mx-auto">
          <Card>
            <CardHeader className="text-center">
              <div className="flex justify-center mb-4">
                <div className="rounded-full bg-destructive/20 p-4">
                  <XCircle className="h-16 w-16 text-destructive" />
                </div>
              </div>
              <CardTitle className="text-destructive">Payment Failed</CardTitle>
              <CardDescription>
                We were unable to process your payment. Please try again or use a different payment method.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {errorMessage && (
                <div className="bg-destructive/10 border border-destructive/30 rounded-lg p-4 text-center">
                  <p className="text-sm text-destructive">{errorMessage}</p>
                </div>
              )}

              {orderId && (
                <div className="bg-muted rounded-lg p-4 text-center">
                  <p className="text-sm text-muted-foreground">Order Reference</p>
                  <p className="font-mono text-sm">{orderId}</p>
                </div>
              )}

              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Common reasons for payment failure:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>Insufficient funds</li>
                  <li>Incorrect card details</li>
                  <li>Card expired or blocked</li>
                  <li>Transaction declined by bank</li>
                </ul>
              </div>

              <div className="flex flex-col gap-3 pt-4">
                <Button asChild className="w-full">
                  <Link to="/post-job">
                    <RefreshCw className="mr-2 h-4 w-4" />
                    Try Again
                  </Link>
                </Button>
                
                <Button variant="outline" asChild className="w-full">
                  <Link to="/dashboard">
                    <Home className="mr-2 h-4 w-4" />
                    Go to Dashboard
                  </Link>
                </Button>

                <Button variant="ghost" asChild className="w-full">
                  <Link to="/contact">
                    <MessageCircle className="mr-2 h-4 w-4" />
                    Contact Support
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </>
  );
}
