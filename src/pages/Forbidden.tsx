import { Link } from "react-router";
import { Button } from "@/components/ui/button";

export default function Forbidden() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 text-center p-4">
      <h1 className="text-6xl font-bold text-muted-foreground">403</h1>
      <p className="text-xl font-medium">Access denied</p>
      <p className="text-muted-foreground">
        You don't have permission to view this page.
      </p>
      <Button asChild variant="outline">
        <Link to="/">Go home</Link>
      </Button>
    </div>
  );
}
