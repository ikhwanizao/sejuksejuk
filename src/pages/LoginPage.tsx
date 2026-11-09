import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Thermometer } from "lucide-react";
import { useLogin } from "@/api/auth";
import { useAuthStore } from "@/stores/auth";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import type { User } from "@/types/api";

const schema = z.object({
  username: z.string().min(1, "Username is required"),
  password: z.string().min(1, "Password is required"),
});

type FormValues = z.infer<typeof schema>;

const demoAccounts = [
  { role: "Admin", username: "admin", password: "admin1234" },
  { role: "Manager", username: "manager", password: "manager1234" },
  { role: "Technician", username: "ali", password: "tech1234" },
];

export default function LoginPage() {
  "use no memo";
  const navigate = useNavigate();
  const { setTokens, setUser } = useAuthStore();
  const login = useLogin();

  const {
    register,
    handleSubmit,
    setValue,
    setFocus,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  async function onSubmit(values: FormValues) {
    try {
      const tokens = await login.mutateAsync(values);
      setTokens(tokens.access, tokens.refresh);

      const me = await api.get<User>("/auth/me/");
      setUser(me.data);

      if (me.data.role === "technician") {
        navigate("/jobs", { replace: true });
      } else {
        navigate("/orders", { replace: true });
      }
    } catch {
      toast.error("Invalid username or password");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-muted/40 p-4">
      <Card className="w-full max-w-sm">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-2">
            <Thermometer className="size-8 text-primary" />
          </div>
          <CardTitle className="text-xl">Sejuk Sejuk</CardTitle>
          <CardDescription>Operations System</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                autoComplete="username"
                {...register("username")}
              />
              {errors.username && (
                <p className="text-xs text-destructive">
                  {errors.username.message}
                </p>
              )}
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="text-xs text-destructive">
                  {errors.password.message}
                </p>
              )}
            </div>
            <Button type="submit" className="w-full" disabled={isSubmitting}>
              {isSubmitting ? "Signing in…" : "Sign in"}
            </Button>
          </form>
          <details className="mt-6 rounded-lg border bg-muted/30 p-3">
            <summary className="cursor-pointer rounded-sm text-sm font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              Demo accounts
            </summary>
            <div className="mt-3 space-y-3">
              <p className="text-xs text-muted-foreground">
                Choose a role to fill the login details, then select Sign in.
              </p>
              <div className="space-y-2">
                {demoAccounts.map((account) => (
                  <Button
                    key={account.role}
                    type="button"
                    variant="outline"
                    className="h-auto w-full items-start justify-between gap-2 whitespace-normal py-2 text-left"
                    disabled={isSubmitting}
                    aria-label={`Fill ${account.role.toLowerCase()} demo credentials`}
                    onClick={() => {
                      setValue("username", account.username, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setValue("password", account.password, {
                        shouldDirty: true,
                        shouldValidate: true,
                      });
                      setFocus("username");
                    }}
                  >
                    <span>{account.role}</span>
                    <span className="text-right font-mono text-xs text-muted-foreground">
                      <span className="block">{account.username}</span>
                      <span className="block">{account.password}</span>
                    </span>
                  </Button>
                ))}
              </div>
              <p className="text-xs text-muted-foreground">
                Shared demo environment. Please use fictional information.
              </p>
            </div>
          </details>
        </CardContent>
      </Card>
    </div>
  );
}
