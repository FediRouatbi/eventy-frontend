import { Outlet, createFileRoute, useLocation, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  LoaderCircle,
  Mail,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "#/components/ui/alert-dialog";
import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import { Card, CardContent } from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "#/components/ui/sheet";
import { isSuperAdminSession } from "#/features/admin/auth";
import {
  AdminEmptyState,
  AdminLoadingGrid,
  AdminPageHeader,
  AdminSectionCard,
} from "#/features/admin/components/AdminSurface";
import {
  buildOrganizerWorkspaces,
  sortByLabel,
  type OrganizerWorkspace,
} from "#/features/admin/organizers";
import {
  createOrganizerAdmin,
  deleteOrganizer,
  updateOrganizer,
} from "#/lib/api/admin";
import { useAuthSession } from "#/lib/auth";

type OrganizerFormValues = {
  organizer_name: string;
  organizer_slug: string;
  admin_name: string;
  admin_email: string;
  admin_password: string;
};

type EditOrganizerFormValues = {
  organizer_name: string;
  organizer_slug: string;
};

export const Route = createFileRoute("/admin/organizers")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: AdminOrganizersPage,
});

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function InlineError({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-none">
      <CardContent className="p-4 text-sm text-destructive">{message}</CardContent>
    </Card>
  );
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function AdminOrganizersPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const session = useAuthSession();
  const [workspaces, setWorkspaces] = useState<OrganizerWorkspace[]>([]);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingWorkspace, setEditingWorkspace] =
    useState<OrganizerWorkspace | null>(null);
  const [workspacePendingDelete, setWorkspacePendingDelete] =
    useState<OrganizerWorkspace | null>(null);
  const [deletingOrganizerId, setDeletingOrganizerId] = useState<string | null>(
    null,
  );

  const organizerForm = useForm<OrganizerFormValues>({
    defaultValues: {
      organizer_name: "",
      organizer_slug: "",
      admin_name: "",
      admin_email: "",
      admin_password: "",
    },
  });
  const editOrganizerForm = useForm<EditOrganizerFormValues>({
    defaultValues: {
      organizer_name: "",
      organizer_slug: "",
    },
  });

  const organizerFormErrors = organizerForm.formState.errors;
  const editOrganizerFormErrors = editOrganizerForm.formState.errors;
  const query = search.q;
  const isSuperAdmin = Boolean(session && isSuperAdminSession(session));
  const {
    data: loadedWorkspaces,
    isLoading,
    error: organizersError,
  } = useQuery({
    queryKey: ["admin-organizers", session?.access_token],
    enabled: Boolean(session?.access_token) && isSuperAdmin,
    queryFn: () => buildOrganizerWorkspaces(session!.access_token),
    refetchOnWindowFocus: true,
  });
  const loadError =
    organizersError instanceof Error ? organizersError.message : "";
  const createOrganizerMutation = useMutation({
    mutationFn: (values: OrganizerFormValues) =>
      createOrganizerAdmin(session!.access_token, {
        organizer_name: values.organizer_name.trim(),
        organizer_slug: values.organizer_slug.trim(),
        admin_name: values.admin_name.trim(),
        admin_email: values.admin_email.trim(),
        admin_password: values.admin_password,
      }),
  });
  const updateOrganizerMutation = useMutation({
    mutationFn: (input: {
      organizerId: string;
      values: EditOrganizerFormValues;
    }) =>
      updateOrganizer(session!.access_token, input.organizerId, {
        organizer_name: input.values.organizer_name.trim(),
        organizer_slug: input.values.organizer_slug.trim(),
      }),
  });
  const deleteOrganizerMutation = useMutation({
    mutationFn: (organizerId: string) =>
      deleteOrganizer(session!.access_token, organizerId),
  });
  const isSubmitting = createOrganizerMutation.isPending;
  const isUpdatingOrganizer = updateOrganizerMutation.isPending;

  const filteredWorkspaces = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return workspaces;
    }

    return workspaces.filter((workspace) =>
      [
        workspace.organizer.name,
        workspace.organizer.slug,
        workspace.admin?.name ?? "",
        workspace.admin?.email ?? "",
      ]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [query, workspaces]);

  function updateQuery(value: string) {
    navigate({
      to: "/admin/organizers",
      search: (previous) => ({
        ...previous,
        q: value || "",
      }),
      replace: true,
    });
  }

  useEffect(() => {
    if (!session) {
      return;
    }

    if (!isSuperAdminSession(session)) {
      navigate({ to: "/admin" });
      return;
    }

  }, [navigate, session]);

  useEffect(() => {
    if (!loadedWorkspaces) {
      return;
    }

    setWorkspaces(loadedWorkspaces);
  }, [loadedWorkspaces]);

  async function handleCreateOrganizer(values: OrganizerFormValues) {
    if (!session) {
      return;
    }

    try {
      const result = await createOrganizerMutation.mutateAsync(values);

      const nextWorkspaces = sortByLabel(
        [
          ...workspaces,
          {
            organizer: {
              ...result.organizer,
              admin_count: 1,
              event_count: 0,
              session_count: 0,
            },
            admin: result.admin,
            events: [],
          },
        ],
        (workspace) => workspace.organizer.name,
      );

      setWorkspaces(nextWorkspaces);
      setIsSheetOpen(false);
      organizerForm.reset();
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizers", session.access_token],
      });
      toast.success("Organizer created", {
        description: `${result.organizer.name} is ready for its first event.`,
      });
      navigate({
        to: "/admin/organizers/$organizerId",
        params: { organizerId: String(result.organizer.id) },
      });
    } catch (error) {
      toast.error("Failed to create organizer", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  function openEditSheet(workspace: OrganizerWorkspace) {
    editOrganizerForm.reset({
      organizer_name: workspace.organizer.name,
      organizer_slug: workspace.organizer.slug,
    });
    setEditingWorkspace(workspace);
  }

  function closeEditSheet() {
    setEditingWorkspace(null);
    editOrganizerForm.reset({
      organizer_name: "",
      organizer_slug: "",
    });
  }

  async function handleUpdateOrganizer(values: EditOrganizerFormValues) {
    if (!session || !editingWorkspace) {
      return;
    }

    try {
      const updatedOrganizer = await updateOrganizerMutation.mutateAsync({
        organizerId: String(editingWorkspace.organizer.id),
        values,
      });

      setWorkspaces((currentWorkspaces) =>
        sortByLabel(
          currentWorkspaces.map((workspace) =>
            workspace.organizer.id === editingWorkspace.organizer.id
              ? {
                  ...workspace,
                  organizer: {
                    ...workspace.organizer,
                    ...updatedOrganizer,
                  },
                }
              : workspace,
          ),
          (workspace) => workspace.organizer.name,
        ),
      );

      toast.success("Organizer updated", {
        description: `${updatedOrganizer.name} has been updated.`,
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizers", session.access_token],
      });
      closeEditSheet();
    } catch (error) {
      toast.error("Failed to update organizer", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleDeleteOrganizer() {
    if (!session || !workspacePendingDelete) {
      return;
    }

    const pendingId = String(workspacePendingDelete.organizer.id);
    setDeletingOrganizerId(pendingId);

    try {
      await deleteOrganizerMutation.mutateAsync(pendingId);
      setWorkspaces((currentWorkspaces) =>
        currentWorkspaces.filter(
          (workspace) => String(workspace.organizer.id) !== pendingId,
        ),
      );
      toast.success("Organizer deleted", {
        description: `${workspacePendingDelete.organizer.name} and all related events were removed.`,
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizers", session.access_token],
      });
      setWorkspacePendingDelete(null);
    } catch (error) {
      toast.error("Failed to delete organizer", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeletingOrganizerId(null);
    }
  }

  if (location.pathname !== "/admin/organizers") {
    return <Outlet />;
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        badge="Organizers"
        title="Organizer workspaces"
        description="See organizers with their assigned admin and open a dedicated detail page."
        actions={
          <Button className="rounded-full" onClick={() => setIsSheetOpen(true)}>
            <Plus className="size-4" />
            New organizer
          </Button>
        }
      />

      {loadError ? <InlineError message={loadError} /> : null}

      <AdminSectionCard
        title="Organizers"
        description="Search by organizer name, slug, or assigned admin."
        actions={
          <div className="relative min-w-[280px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => updateQuery(event.target.value)}
              placeholder="Search organizers or admins"
              className="pl-9"
            />
          </div>
        }
      >
        {isLoading ? (
          <AdminLoadingGrid rows={3} />
        ) : filteredWorkspaces.length === 0 ? (
          <AdminEmptyState
            title={
              workspaces.length === 0
                ? "No organizers yet"
                : "No organizer matches this search"
            }
            description={
              workspaces.length === 0
                ? "Create the first organizer workspace and assign its owner in one step."
                : "Try another organizer name, slug, or owner email."
            }
            action={
              workspaces.length === 0 ? (
                <Button className="rounded-full" onClick={() => setIsSheetOpen(true)}>
                  <Plus className="size-4" />
                  New organizer
                </Button>
              ) : undefined
            }
          />
        ) : (
          filteredWorkspaces.map((workspace) => (
            (() => {
              const eventCount = workspace.organizer.event_count;
              const sessionCount = workspace.organizer.session_count;

              return (
                <div
                  key={workspace.organizer.id}
                  role="button"
                  tabIndex={0}
                  onClick={() =>
                    navigate({
                      to: "/admin/organizers/$organizerId",
                      params: { organizerId: String(workspace.organizer.id) },
                    })
                  }
                  onKeyDown={(event) => {
                    if (event.key === "Enter" || event.key === " ") {
                      event.preventDefault();
                      navigate({
                        to: "/admin/organizers/$organizerId",
                        params: { organizerId: String(workspace.organizer.id) },
                      });
                    }
                  }}
                  aria-label={`Open ${workspace.organizer.name} details`}
                  className="block w-full cursor-pointer rounded-[1.45rem] border border-border/70 bg-background/72 p-5 text-left transition-colors hover:border-primary/25 hover:bg-background"
                >
                  <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="text-lg font-semibold text-foreground">
                        {workspace.organizer.name}
                      </p>
                      <Badge variant="outline" className="rounded-full">
                        {workspace.organizer.slug}
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full"
                        onClick={(event) => {
                          event.stopPropagation();
                          openEditSheet(workspace);
                        }}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={
                          deletingOrganizerId === String(workspace.organizer.id)
                        }
                        onClick={(event) => {
                          event.stopPropagation();
                          setWorkspacePendingDelete(workspace);
                        }}
                      >
                        {deletingOrganizerId === String(workspace.organizer.id) ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div className="space-y-3">
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                        <span className="inline-flex items-center gap-2">
                          <ShieldCheck className="size-4" />
                          {workspace.admin?.name ?? "Owner unavailable"}
                        </span>
                        <span className="inline-flex items-center gap-2">
                          <Mail className="size-4" />
                          {workspace.admin?.email ?? "Admin email unavailable"}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 text-sm text-muted-foreground sm:justify-end">
                      <span className="rounded-full bg-muted px-3 py-1">
                        {eventCount} event{eventCount === 1 ? "" : "s"}
                      </span>
                      <span className="rounded-full bg-muted px-3 py-1">
                        {sessionCount} session{sessionCount === 1 ? "" : "s"}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })()
          ))
        )}
      </AdminSectionCard>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Create organizer admin</SheetTitle>
            <SheetDescription>
              Create the workspace and first admin in one step.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex h-full flex-col"
            onSubmit={organizerForm.handleSubmit(handleCreateOrganizer)}
          >
            <div className="space-y-5 overflow-y-auto py-6 pr-1">
              <div className="space-y-2">
                <Label htmlFor="organizer-name">Organizer name</Label>
                <Input
                  id="organizer-name"
                  className={getInvalidFieldClass(
                    Boolean(organizerFormErrors.organizer_name),
                  )}
                  {...organizerForm.register("organizer_name", {
                    required: "Organizer name is required",
                  })}
                />
                <FieldError message={organizerFormErrors.organizer_name?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="organizer-slug">Organizer slug</Label>
                <Input
                  id="organizer-slug"
                  className={getInvalidFieldClass(
                    Boolean(organizerFormErrors.organizer_slug),
                  )}
                  {...organizerForm.register("organizer_slug", {
                    required: "Organizer slug is required",
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message: "Use lowercase letters, numbers, and hyphens only",
                    },
                  })}
                />
                <FieldError message={organizerFormErrors.organizer_slug?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-name">Admin name</Label>
                <Input
                  id="admin-name"
                  className={getInvalidFieldClass(
                    Boolean(organizerFormErrors.admin_name),
                  )}
                  {...organizerForm.register("admin_name", {
                    required: "Admin name is required",
                  })}
                />
                <FieldError message={organizerFormErrors.admin_name?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-email">Admin email</Label>
                <Input
                  id="admin-email"
                  type="email"
                  className={getInvalidFieldClass(
                    Boolean(organizerFormErrors.admin_email),
                  )}
                  {...organizerForm.register("admin_email", {
                    required: "Admin email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                />
                <FieldError message={organizerFormErrors.admin_email?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password">Admin password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  className={getInvalidFieldClass(
                    Boolean(organizerFormErrors.admin_password),
                  )}
                  {...organizerForm.register("admin_password", {
                    required: "Admin password is required",
                    minLength: {
                      value: 8,
                      message: "Password must be at least 8 characters",
                    },
                  })}
                />
                <FieldError
                  message={organizerFormErrors.admin_password?.message}
                />
              </div>
            </div>

            <SheetFooter className="border-t border-border/70 pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="rounded-full">
                  Cancel
                </Button>
              </SheetClose>
              <Button type="submit" className="rounded-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Creating organizer
                  </>
                ) : (
                  "Create organizer"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <Sheet
        open={Boolean(editingWorkspace)}
        onOpenChange={(open) => !open && closeEditSheet()}
      >
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit organizer</SheetTitle>
            <SheetDescription>
              Update the organizer name and slug from the list page.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex h-full flex-col"
            onSubmit={editOrganizerForm.handleSubmit(handleUpdateOrganizer)}
          >
            <div className="space-y-5 overflow-y-auto py-6 pr-1">
              <div className="space-y-2">
                <Label htmlFor="edit-organizer-name">Organizer name</Label>
                <Input
                  id="edit-organizer-name"
                  className={getInvalidFieldClass(
                    Boolean(editOrganizerFormErrors.organizer_name),
                  )}
                  {...editOrganizerForm.register("organizer_name", {
                    required: "Organizer name is required",
                  })}
                />
                <FieldError
                  message={editOrganizerFormErrors.organizer_name?.message}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-organizer-slug">Organizer slug</Label>
                <Input
                  id="edit-organizer-slug"
                  className={getInvalidFieldClass(
                    Boolean(editOrganizerFormErrors.organizer_slug),
                  )}
                  {...editOrganizerForm.register("organizer_slug", {
                    required: "Organizer slug is required",
                    pattern: {
                      value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                      message: "Use lowercase letters, numbers, and hyphens only",
                    },
                  })}
                />
                <FieldError
                  message={editOrganizerFormErrors.organizer_slug?.message}
                />
              </div>
            </div>

            <SheetFooter className="border-t border-border/70 pt-4">
              <SheetClose asChild>
                <Button type="button" variant="outline" className="rounded-full">
                  Cancel
                </Button>
              </SheetClose>
              <Button
                type="submit"
                className="rounded-full"
                disabled={isUpdatingOrganizer}
              >
                {isUpdatingOrganizer ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving changes
                  </>
                ) : (
                  "Save changes"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog
        open={Boolean(workspacePendingDelete)}
        onOpenChange={(open) => !open && setWorkspacePendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organizer workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              {workspacePendingDelete
                ? `This deletes ${workspacePendingDelete.organizer.name}, its admin account, every related event, all sessions, and all ticket types. This cannot be undone.`
                : "This deletes the organizer workspace and everything under it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteOrganizer}>
              Delete organizer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
