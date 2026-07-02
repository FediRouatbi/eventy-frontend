import { Link, createFileRoute, redirect, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarDays,
  LoaderCircle,
  Mail,
  Pencil,
  ShieldCheck,
  Ticket,
  Trash2,
  UserRoundX,
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
  getOrganizerWorkspaceDetail,
  statusBadgeVariant,
  type OrganizerWorkspace,
} from "#/features/admin/organizers";
import {
  deleteOrganizer,
  deleteOrganizerAdmin,
  updateOrganizer,
  updateOrganizerAdmin,
} from "#/lib/api/admin";
import { getAuthSession, hydrateAuthSession, useAuthSession } from "#/lib/auth";

export const Route = createFileRoute("/admin/organizers/$organizerId")({
  beforeLoad: async () => {
    const session = getAuthSession() ?? (await hydrateAuthSession());

    if (!session) {
      throw redirect({ to: "/login" });
    }

    if (!isSuperAdminSession(session)) {
      throw redirect({ to: "/admin" });
    }
  },
  component: AdminOrganizerDetailPage,
});

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

function InlineError({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5 shadow-none">
      <CardContent className="p-4 text-sm text-destructive">
        {message}
      </CardContent>
    </Card>
  );
}

type EditOrganizerFormValues = {
  organizer_name: string;
  organizer_slug: string;
};

type EditAdminFormValues = {
  admin_name: string;
  admin_email: string;
};

function FieldError({ message }: { message?: string }) {
  return message ? <p className="text-sm text-destructive">{message}</p> : null;
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function AdminOrganizerDetailPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { organizerId } = Route.useParams();
  const session = useAuthSession();
  const [workspace, setWorkspace] = useState<OrganizerWorkspace | null>(null);
  const [isEditSheetOpen, setIsEditSheetOpen] = useState(false);
  const [isAdminSheetOpen, setIsAdminSheetOpen] = useState(false);
  const [workspacePendingDelete, setWorkspacePendingDelete] =
    useState<OrganizerWorkspace | null>(null);
  const [adminPendingDelete, setAdminPendingDelete] = useState(false);
  const [deletingOrganizerId, setDeletingOrganizerId] = useState<string | null>(
    null,
  );
  const editOrganizerForm = useForm<EditOrganizerFormValues>({
    defaultValues: {
      organizer_name: "",
      organizer_slug: "",
    },
  });
  const editOrganizerFormErrors = editOrganizerForm.formState.errors;
  const editAdminForm = useForm<EditAdminFormValues>({
    defaultValues: {
      admin_name: "",
      admin_email: "",
    },
  });
  const editAdminFormErrors = editAdminForm.formState.errors;
  const isSuperAdmin = Boolean(session && isSuperAdminSession(session));
  const {
    data: loadedWorkspace,
    isLoading,
    error: workspaceError,
  } = useQuery({
    queryKey: ["admin-organizer-detail", session?.access_token, organizerId],
    enabled: Boolean(session?.access_token) && isSuperAdmin,
    queryFn: () =>
      getOrganizerWorkspaceDetail(session!.access_token, organizerId),
    refetchOnWindowFocus: true,
  });
  const loadError =
    workspaceError instanceof Error ? workspaceError.message : "";
  const updateOrganizerMutation = useMutation({
    mutationFn: (values: EditOrganizerFormValues) =>
      updateOrganizer(session!.access_token, String(workspace!.organizer.id), {
        organizer_name: values.organizer_name.trim(),
        organizer_slug: values.organizer_slug.trim(),
      }),
  });
  const updateOrganizerAdminMutation = useMutation({
    mutationFn: (values: EditAdminFormValues) =>
      updateOrganizerAdmin(
        session!.access_token,
        String(workspace!.organizer.id),
        String(workspace!.admin!.id),
        {
          admin_name: values.admin_name.trim(),
          admin_email: values.admin_email.trim(),
        },
      ),
  });
  const deleteOrganizerMutation = useMutation({
    mutationFn: (targetOrganizerId: string) =>
      deleteOrganizer(session!.access_token, targetOrganizerId),
  });
  const deleteOrganizerAdminMutation = useMutation({
    mutationFn: () =>
      deleteOrganizerAdmin(
        session!.access_token,
        String(workspace!.organizer.id),
        String(workspace!.admin!.id),
      ),
  });
  const isUpdatingOrganizer = updateOrganizerMutation.isPending;
  const isUpdatingAdmin = updateOrganizerAdminMutation.isPending;
  const isDeletingAdmin = deleteOrganizerAdminMutation.isPending;

  useEffect(() => {
    if (!loadedWorkspace) {
      return;
    }

    setWorkspace(loadedWorkspace);
  }, [loadedWorkspace]);

  async function handleDeleteOrganizer() {
    if (!session || !workspacePendingDelete) {
      return;
    }

    const pendingId = String(workspacePendingDelete.organizer.id);
    setDeletingOrganizerId(pendingId);

    try {
      await deleteOrganizerMutation.mutateAsync(pendingId);
      toast.success("Organizer deleted", {
        description: `${workspacePendingDelete.organizer.name} and all related events were removed.`,
      });
      setWorkspacePendingDelete(null);
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizers", session.access_token],
      });
      navigate({ to: "/admin/organizers" });
    } catch (error) {
      toast.error("Failed to delete organizer", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeletingOrganizerId(null);
    }
  }

  function openEditSheet() {
    if (!workspace) {
      return;
    }

    editOrganizerForm.reset({
      organizer_name: workspace.organizer.name,
      organizer_slug: workspace.organizer.slug,
    });
    setIsEditSheetOpen(true);
  }

  async function handleUpdateOrganizer(values: EditOrganizerFormValues) {
    if (!session || !workspace) {
      return;
    }

    try {
      const updatedOrganizer = await updateOrganizerMutation.mutateAsync(values);

      setWorkspace((currentWorkspace) =>
        currentWorkspace
          ? {
              ...currentWorkspace,
              organizer: {
                ...currentWorkspace.organizer,
                ...updatedOrganizer,
              },
            }
          : currentWorkspace,
      );
      setIsEditSheetOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizers", session.access_token],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizer-detail", session.access_token, organizerId],
      });
      toast.success("Organizer updated", {
        description: `${updatedOrganizer.name} has been updated.`,
      });
    } catch (error) {
      toast.error("Failed to update organizer", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  function openAdminSheet() {
    if (!workspace?.admin) {
      return;
    }

    editAdminForm.reset({
      admin_name: workspace.admin.name,
      admin_email: workspace.admin.email,
    });
    setIsAdminSheetOpen(true);
  }

  async function handleUpdateAdmin(values: EditAdminFormValues) {
    if (!session || !workspace?.admin) {
      return;
    }

    try {
      const updatedAdmin = await updateOrganizerAdminMutation.mutateAsync(values);

      setWorkspace((currentWorkspace) =>
        currentWorkspace
          ? {
              ...currentWorkspace,
              admin: updatedAdmin,
              organizer: {
                ...currentWorkspace.organizer,
                admin: updatedAdmin,
              },
            }
          : currentWorkspace,
      );
      setIsAdminSheetOpen(false);
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizers", session.access_token],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizer-detail", session.access_token, organizerId],
      });
      toast.success("Admin updated", {
        description: `${updatedAdmin.name} has been updated.`,
      });
    } catch (error) {
      toast.error("Failed to update admin", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  async function handleDeleteAdmin() {
    if (!session || !workspace?.admin) {
      return;
    }

    if (workspace.organizer.admin_count <= 1) {
      toast.error("Cannot delete the last organizer admin", {
        description:
          "Update this admin account instead. Every organizer must keep at least one admin.",
      });
      return;
    }

    try {
      await deleteOrganizerAdminMutation.mutateAsync();
      setWorkspace((currentWorkspace) =>
        currentWorkspace
          ? {
              ...currentWorkspace,
              admin: null,
              organizer: {
                ...currentWorkspace.organizer,
                admin: null,
                admin_count: 0,
              },
            }
          : currentWorkspace,
      );
      setAdminPendingDelete(false);
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizers", session.access_token],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-organizer-detail", session.access_token, organizerId],
      });
      toast.success("Admin deleted", {
        description: "The organizer no longer has a linked admin account.",
      });
    } catch (error) {
      toast.error("Failed to delete admin", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <div className="flex items-center">
        <Button
          asChild
          variant="ghost"
          className="rounded-full px-0 hover:bg-transparent"
        >
          <Link to="/admin/organizers">
            <ArrowLeft className="size-4" />
            Back to organizers
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <AdminLoadingGrid rows={3} />
      ) : loadError ? (
        <InlineError message={loadError} />
      ) : !workspace || !workspace.organizer ? (
        <AdminEmptyState
          title="Organizer not found"
          description="The organizer you requested could not be found."
          action={
            <Button asChild className="rounded-full">
              <Link to="/admin/organizers">Back to organizers</Link>
            </Button>
          }
        />
      ) : (
        <>
          <AdminPageHeader
            badge="Organizer details"
            title={workspace.organizer.name}
            description={`${workspace.organizer.slug} - Created ${formatDate(
              workspace.organizer.created_at,
            )}`}
            actions={
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="rounded-full"
                  onClick={openEditSheet}
                >
                  <Pencil className="size-4" />
                  Edit organizer
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                  onClick={() => setWorkspacePendingDelete(workspace)}
                  disabled={deletingOrganizerId === organizerId}
                >
                  {deletingOrganizerId === organizerId ? (
                    <LoaderCircle className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete organizer
                </Button>
              </div>
            }
          />

          <AdminSectionCard
            title="Organizer details"
            description="Assigned admin information and workspace totals."
          >
            <Card className="rounded-[1.35rem] border-border/70 bg-background/80 shadow-none">
              <CardContent className="space-y-3 p-5">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    {workspace.admin?.name ?? "Owner unavailable"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="size-4" />
                    {workspace.admin?.email ?? "Admin email unavailable"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <CalendarDays className="size-4" />
                    Updated {formatDate(workspace.organizer.updated_at)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                  <span className="rounded-full bg-muted px-3 py-1">
                    {workspace.organizer.event_count} event
                    {workspace.organizer.event_count === 1 ? "" : "s"}
                  </span>
                  <span className="rounded-full bg-muted px-3 py-1">
                    {workspace.organizer.session_count} session
                    {workspace.organizer.session_count === 1 ? "" : "s"}
                  </span>
                </div>
              </CardContent>
            </Card>
          </AdminSectionCard>

          <AdminSectionCard
            title="Admin account"
            description="Manage the linked organizer admin account."
          >
            <Card className="rounded-[1.35rem] border-border/70 bg-background/80 shadow-none">
              <CardContent className="space-y-4 p-5">
                <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                  <span className="inline-flex items-center gap-2">
                    <ShieldCheck className="size-4" />
                    {workspace.admin?.name ?? "No linked admin"}
                  </span>
                  <span className="inline-flex items-center gap-2">
                    <Mail className="size-4" />
                    {workspace.admin?.email ?? "No admin email"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-full"
                    onClick={openAdminSheet}
                    disabled={!workspace.admin}
                  >
                    <Pencil className="size-4" />
                    Edit admin
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                    onClick={() => setAdminPendingDelete(true)}
                    disabled={
                      !workspace.admin ||
                      isDeletingAdmin ||
                      workspace.organizer.admin_count <= 1
                    }
                  >
                    {isDeletingAdmin ? (
                      <LoaderCircle className="size-4 animate-spin" />
                    ) : (
                      <UserRoundX className="size-4" />
                    )}
                    Delete admin
                  </Button>
                </div>
                {workspace.organizer.admin_count <= 1 ? (
                  <p className="text-sm text-muted-foreground">
                    This organizer currently has one admin. Deleting the last admin is blocked.
                  </p>
                ) : null}
              </CardContent>
            </Card>
          </AdminSectionCard>

          <AdminSectionCard
            title="Events"
            description="All events under this organizer workspace."
          >
            {workspace.events.length === 0 ? (
              <AdminEmptyState
                title="No events yet"
                description="This organizer does not have any events yet."
              />
            ) : (
              workspace.events.map((event) => {
                return (
                  <Link
                    key={event.id}
                    to="/admin/events/$eventId"
                    params={{ eventId: String(event.id) }}
                    className="block rounded-[1.35rem] border border-border/70 bg-background/82 transition-colors hover:border-primary/30 hover:bg-primary/5"
                  >
                    <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                      <div className="space-y-3">
                        <div className="flex flex-wrap items-center gap-2">
                          <p className="font-semibold text-foreground">
                            {event.title}
                          </p>
                          <Badge variant={statusBadgeVariant(event.status)}>
                            {event.status}
                          </Badge>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span>
                            {event.city}, {event.country}
                          </span>
                          <span>{event.currency}</span>
                          <span>Created {formatDate(event.created_at)}</span>
                        </div>
                        <div className="flex flex-wrap gap-2 text-sm text-muted-foreground">
                          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                            <CalendarDays className="size-4" />
                            {event.session_count} sessions
                          </span>
                          <span className="inline-flex items-center gap-2 rounded-full bg-muted px-3 py-1">
                            <Ticket className="size-4" />
                            {event.ticket_type_count} ticket types
                          </span>
                        </div>
                      </div>

                      <div className="space-y-2 text-sm text-muted-foreground lg:text-right">
                        {event.next_session_starts_at ? (
                          <p>
                            Next session {formatDateTime(event.next_session_starts_at)}
                          </p>
                        ) : (
                          <p>No sessions yet</p>
                        )}
                      </div>
                    </div>
                  </Link>
                );
              })
            )}
          </AdminSectionCard>
        </>
      )}

      <AlertDialog
        open={Boolean(workspacePendingDelete)}
        onOpenChange={(open) => !open && setWorkspacePendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organizer workspace?</AlertDialogTitle>
            <AlertDialogDescription>
              {workspacePendingDelete
                ? `This deletes ${workspacePendingDelete.organizer.name}, its owner account, every related event, all sessions, and all ticket types. This cannot be undone.`
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

      <AlertDialog
        open={adminPendingDelete}
        onOpenChange={setAdminPendingDelete}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete organizer admin?</AlertDialogTitle>
            <AlertDialogDescription>
              {workspace?.admin
                ? `This deletes ${workspace.admin.name}'s admin account. The organizer workspace will stay, but it must keep at least one admin account.`
                : "This deletes the linked organizer admin account."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteAdmin}>
              Delete admin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Sheet open={isEditSheetOpen} onOpenChange={setIsEditSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit organizer</SheetTitle>
            <SheetDescription>
              Update the organizer name and slug for this workspace.
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

      <Sheet open={isAdminSheetOpen} onOpenChange={setIsAdminSheetOpen}>
        <SheetContent side="right" className="sm:max-w-xl">
          <SheetHeader>
            <SheetTitle>Edit admin</SheetTitle>
            <SheetDescription>
              Update the linked admin name and email address.
            </SheetDescription>
          </SheetHeader>
          <form
            className="flex h-full flex-col"
            onSubmit={editAdminForm.handleSubmit(handleUpdateAdmin)}
          >
            <div className="space-y-5 overflow-y-auto py-6 pr-1">
              <div className="space-y-2">
                <Label htmlFor="edit-admin-name">Admin name</Label>
                <Input
                  id="edit-admin-name"
                  className={getInvalidFieldClass(
                    Boolean(editAdminFormErrors.admin_name),
                  )}
                  {...editAdminForm.register("admin_name", {
                    required: "Admin name is required",
                  })}
                />
                <FieldError message={editAdminFormErrors.admin_name?.message} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="edit-admin-email">Admin email</Label>
                <Input
                  id="edit-admin-email"
                  type="email"
                  className={getInvalidFieldClass(
                    Boolean(editAdminFormErrors.admin_email),
                  )}
                  {...editAdminForm.register("admin_email", {
                    required: "Admin email is required",
                    pattern: {
                      value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                      message: "Enter a valid email address",
                    },
                  })}
                />
                <FieldError
                  message={editAdminFormErrors.admin_email?.message}
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
                disabled={isUpdatingAdmin}
              >
                {isUpdatingAdmin ? (
                  <>
                    <LoaderCircle className="size-4 animate-spin" />
                    Saving admin
                  </>
                ) : (
                  "Save admin"
                )}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>
    </div>
  );
}
