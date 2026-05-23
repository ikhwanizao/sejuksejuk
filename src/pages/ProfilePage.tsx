import { useAuthStore } from "@/stores/auth";
import { PageHeader } from "@/components/common/PageHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { User, Phone, Mail, Building2 } from "lucide-react";

export default function ProfilePage() {
  const user = useAuthStore((s) => s.user);

  if (!user) return null;

  const roleLabel: Record<string, string> = {
    admin: "Admin",
    manager: "Manager",
    technician: "Technician",
  };

  return (
    <div className="max-w-lg">
      <PageHeader title="My Profile" />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
              <User className="h-6 w-6" />
            </div>
            <div>
              <p className="text-base font-semibold">
                {user.first_name || user.last_name
                  ? `${user.first_name} ${user.last_name}`.trim()
                  : user.username}
              </p>
              <p className="text-sm font-normal text-muted-foreground">
                @{user.username}
              </p>
            </div>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className="capitalize">
              {roleLabel[user.role] ?? user.role}
            </Badge>
          </div>

          {user.email && (
            <div className="flex items-center gap-3 text-sm">
              <Mail className="h-4 w-4 text-muted-foreground" />
              <span>{user.email}</span>
            </div>
          )}

          {user.phone && (
            <div className="flex items-center gap-3 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{user.phone}</span>
            </div>
          )}

          {user.branch && (
            <div className="flex items-center gap-3 text-sm">
              <Building2 className="h-4 w-4 text-muted-foreground" />
              <span>
                {user.branch.name}{" "}
                <span className="text-muted-foreground">
                  ({user.branch.code})
                </span>
              </span>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
