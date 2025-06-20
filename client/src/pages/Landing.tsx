import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MessageSquare } from "lucide-react";

export default function Landing() {
  const handleLogin = () => {
    window.location.href = "/api/login";
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-50 to-blue-100">
      <div className="max-w-md w-full mx-4">
        <Card className="bg-white rounded-2xl shadow-xl">
          <CardContent className="p-8">
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-primary rounded-xl flex items-center justify-center mx-auto mb-4">
                <MessageSquare className="text-white text-2xl" size={32} />
              </div>
              <h1 className="text-2xl font-bold text-gray-900">FeedbackFlow</h1>
              <p className="text-gray-600 mt-2">Internal Feedback Management System</p>
            </div>

            <div className="space-y-6">
              <p className="text-center text-gray-600">
                Sign in to access your feedback dashboard and collaborate with your team.
              </p>

              <Button 
                onClick={handleLogin}
                className="w-full bg-primary text-white py-3 px-4 rounded-lg font-medium hover:bg-primary-600 transition-colors"
                size="lg"
              >
                Sign In with Replit
              </Button>
            </div>

            <div className="mt-6 text-center">
              <p className="text-sm text-gray-600">Need help? Contact IT Support</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
