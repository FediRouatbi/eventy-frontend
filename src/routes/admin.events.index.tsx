import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { LoaderCircle, Plus, Search, Trash2 } from "lucide-react";
import { Controller, useForm } from "react-hook-form";
import { toast } from "sonner";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "#/components/ui/select";
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "#/components/ui/sheet";
import { Textarea } from "#/components/ui/textarea";
import { AdminLoadingGrid } from "#/features/admin/components/AdminSurface";
import {
  type AdminEventListItem,
  createEvent,
  deleteAdminEvent,
  listAdminCategories,
  listAdminEvents,
  listAdminOrganizers,
} from "#/lib/api/admin";
import { isSuperAdminSession } from "#/features/admin/auth";
import { useAuthSession } from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";

type Category = components["schemas"]["Category"];
type OrganizerSummary = components["schemas"]["OrganizerSummary"];

const FIXED_CURRENCY_CODE = "TND";
const FIXED_CURRENCY_LABEL = "TND (Tunisian dinar)";

type EventFormValues = {
  organizer_id: string;
  category_id: string;
  title: string;
  slug: string;
  description: string;
  venue_name: string;
  venue_address: string;
  city: string;
  country: string;
  latitude: string;
  longitude: string;
  banner_url: string;
  poster_url: string;
  status: "draft" | "published" | "cancelled";
  is_featured: "true" | "false";
};

export const Route = createFileRoute("/admin/events/")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
    status:
      search.status === "draft" ||
      search.status === "published" ||
      search.status === "cancelled"
        ? search.status
        : "all",
  }),
  component: AdminEventsPage,
});

function formatDate(isoDate: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(isoDate));
}

function slugify(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function toOptionalNumber(value: string) {
  if (!value.trim()) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isNaN(parsed) ? undefined : parsed;
}

function InlineError({ message }: { message: string }) {
  return (
    <Card className="border-destructive/30 bg-destructive/5">
      <CardContent className="p-4 text-sm text-destructive">
        {message}
      </CardContent>
    </Card>
  );
}

function FieldError({ message }: { message?: string }) {
  if (!message) {
    return null;
  }

  return <p className="text-sm text-destructive">{message}</p>;
}

function getInvalidFieldClass(hasError?: boolean) {
  return hasError
    ? "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20"
    : undefined;
}

function AdminEventsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const search = Route.useSearch();
  const session = useAuthSession();
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [eventPendingDelete, setEventPendingDelete] =
    useState<AdminEventListItem | null>(null);
  const isSuperAdmin = isSuperAdminSession(session);

  const eventForm = useForm<EventFormValues>({
    mode: "onSubmit",
    defaultValues: {
      organizer_id: "",
      category_id: "",
      title: "",
      slug: "",
      description: "",
      venue_name: "",
      venue_address: "",
      city: "",
      country: "",
      latitude: "",
      longitude: "",
      banner_url: "",
      poster_url: "",
      status: "draft",
      is_featured: "false",
    },
  });

  const eventFormErrors = eventForm.formState.errors;
  const query = search.q;
  const statusFilter = search.status as "all" | AdminEventListItem["status"];
  const {
    data: events = [],
    isLoading: isEventsLoading,
    error: eventsError,
  } = useQuery({
    queryKey: ["admin-events", session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => listAdminEvents(session!.access_token),
  });
  const {
    data: categories = [],
    isLoading: isCategoriesLoading,
    error: categoriesError,
  } = useQuery({
    queryKey: ["admin-categories", session?.access_token],
    enabled: Boolean(session?.access_token),
    queryFn: () => listAdminCategories(session!.access_token),
  });
  const { data: organizers = [] } = useQuery({
    queryKey: ["admin-organizers", session?.access_token],
    enabled: Boolean(session?.access_token && isSuperAdmin),
    queryFn: () => listAdminOrganizers(session!.access_token),
  });
  const isLoading = isEventsLoading || isCategoriesLoading;
  const loadError = [eventsError, categoriesError].find(Boolean);
  const errorMessage =
    loadError instanceof Error
      ? loadError.message
      : loadError
        ? "Failed to load events"
        : "";

  const filteredEvents = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return events.filter((event) => {
      const matchesQuery =
        !normalizedQuery ||
        [
          event.title,
          event.slug,
          event.city,
          event.country,
          event.category_name,
          event.organizer_name,
        ]
          .join(" ")
          .toLowerCase()
          .includes(normalizedQuery);

      const matchesStatus =
        statusFilter === "all" ? true : event.status === statusFilter;

      return matchesQuery && matchesStatus;
    });
  }, [events, query, statusFilter]);

  function updateSearch(
    values: Partial<{ q: string; status: "all" | AdminEventListItem["status"] }>,
  ) {
    navigate({
      to: "/admin/events",
      search: (previous) => ({
        ...previous,
        q: values.q ?? previous.q ?? "",
        status: values.status ?? previous.status ?? "all",
      }),
      replace: true,
    });
  }

  const createEventMutation = useMutation({
    mutationFn: async (values: EventFormValues) => {
      if (!session) {
        throw new Error("Unauthorized");
      }

      return createEvent(session.access_token, {
        organizer_id:
          isSuperAdmin && values.organizer_id.trim()
            ? values.organizer_id.trim()
            : undefined,
        category_id: values.category_id,
        title: values.title.trim(),
        slug: values.slug.trim(),
        description: values.description.trim(),
        venue_name: values.venue_name.trim(),
        venue_address: values.venue_address.trim(),
        city: values.city.trim(),
        country: values.country.trim(),
        latitude: toOptionalNumber(values.latitude),
        longitude: toOptionalNumber(values.longitude),
        banner_url: values.banner_url.trim() || undefined,
        poster_url: values.poster_url.trim() || undefined,
        status: values.status,
        currency: FIXED_CURRENCY_CODE,
        is_featured: values.is_featured === "true",
      });
    },
    onSuccess: async (event) => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-events", session?.access_token],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-overview", session?.access_token],
      });
      setIsSheetOpen(false);
      eventForm.reset({
        organizer_id: "",
        category_id: "",
        title: "",
        slug: "",
        description: "",
        venue_name: "",
        venue_address: "",
        city: "",
        country: "",
        latitude: "",
        longitude: "",
        banner_url: "",
        poster_url: "",
        status: "draft",
        is_featured: "false",
      });
      toast.success("Event created", {
        description: `${event.title} is ready for session and ticket setup.`,
      });
    },
    onError: (error) => {
      toast.error("Failed to create event", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  const deleteEventMutation = useMutation({
    mutationFn: async (eventId: string) => {
      if (!session) {
        throw new Error("Unauthorized");
      }

      await deleteAdminEvent(session.access_token, eventId);
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ["admin-events", session?.access_token],
      });
      await queryClient.invalidateQueries({
        queryKey: ["admin-overview", session?.access_token],
      });
      if (eventPendingDelete) {
        toast.success("Event deleted", {
          description: `${eventPendingDelete.title} and its nested data were removed.`,
        });
      }
      setEventPendingDelete(null);
    },
    onError: (error) => {
      toast.error("Failed to delete event", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    },
  });

  async function handleCreateEvent(values: EventFormValues) {
    await createEventMutation.mutateAsync(values);
  }

  async function handleDeleteEvent() {
    if (!eventPendingDelete) {
      return;
    }

    await deleteEventMutation.mutateAsync(String(eventPendingDelete.id));
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <Card className="rounded-[2rem] border-border/60 bg-card/95 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.45)]">
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="space-y-2">
            <Badge variant="outline" className="w-fit rounded-full">
              Events
            </Badge>
            <CardTitle className="font-serif text-4xl">
              Event operations
            </CardTitle>
            <CardDescription className="max-w-3xl text-base leading-8">
              Create events, review event status, and move into each event
              workspace for sessions and ticket setup.
            </CardDescription>
          </div>
          <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
            <SheetTrigger asChild>
              <Button className="rounded-full">
                <Plus className="size-4" />
                New event
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="sm:max-w-2xl">
              <SheetHeader>
                <SheetTitle>Create event</SheetTitle>
                <SheetDescription>
                  Start a new event record inside the admin app.
                </SheetDescription>
              </SheetHeader>
              <form
                className="flex h-full flex-col"
                onSubmit={eventForm.handleSubmit(handleCreateEvent)}
              >
                <div className="space-y-5 overflow-y-auto py-6 pr-1">
                  {isSuperAdmin ? (
                    <div className="space-y-2">
                      <Label htmlFor="organizer-id">Organizer</Label>
                      <Controller
                        control={eventForm.control}
                        name="organizer_id"
                        rules={{
                          validate: (value) =>
                            !isSuperAdmin || value.trim()
                              ? true
                              : "Organizer is required",
                        }}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id="organizer-id"
                              className={getInvalidFieldClass(
                                Boolean(eventFormErrors.organizer_id),
                              )}
                            >
                              <SelectValue placeholder="Select organizer" />
                            </SelectTrigger>
                            <SelectContent>
                              {organizers.map((organizer) => (
                                <SelectItem
                                  key={organizer.id}
                                  value={String(organizer.id)}
                                >
                                  {organizer.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError
                        message={eventFormErrors.organizer_id?.message}
                      />
                    </div>
                  ) : null}

                  <div className="space-y-2">
                    <Label htmlFor="event-category">Category</Label>
                    <Controller
                      control={eventForm.control}
                      name="category_id"
                      rules={{ required: "Category is required" }}
                      render={({ field }) => (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                        >
                          <SelectTrigger
                            id="event-category"
                            className={getInvalidFieldClass(
                              Boolean(eventFormErrors.category_id),
                            )}
                          >
                            <SelectValue placeholder="Select category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((category) => (
                              <SelectItem
                                key={category.id}
                                value={String(category.id)}
                              >
                                {category.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    />
                    <FieldError
                      message={eventFormErrors.category_id?.message}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-title">Title</Label>
                      <Input
                        id="event-title"
                        className={getInvalidFieldClass(
                          Boolean(eventFormErrors.title),
                        )}
                        {...eventForm.register("title", {
                          required: "Title is required",
                         
                        })}
                      />
                      <FieldError message={eventFormErrors.title?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-slug">Slug</Label>
                      <Input
                        id="event-slug"
                        className={getInvalidFieldClass(
                          Boolean(eventFormErrors.slug),
                        )}
                        {...eventForm.register("slug", {
                          required: "Slug is required",
                          pattern: {
                            value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                            message:
                              "Use lowercase letters, numbers, and hyphens only",
                          },
                        })}
                      />
                      <FieldError message={eventFormErrors.slug?.message} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="event-description">Description</Label>
                    <Textarea
                      id="event-description"
                      className={`min-h-32 ${getInvalidFieldClass(Boolean(eventFormErrors.description)) ?? ""}`}
                      {...eventForm.register("description", {
                        required: "Description is required",
                      })}
                    />
                    <FieldError
                      message={eventFormErrors.description?.message}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="venue-name">Venue name</Label>
                      <Input
                        id="venue-name"
                        className={getInvalidFieldClass(
                          Boolean(eventFormErrors.venue_name),
                        )}
                        {...eventForm.register("venue_name", {
                          required: "Venue name is required",
                        })}
                      />
                      <FieldError
                        message={eventFormErrors.venue_name?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-city">City</Label>
                      <Input
                        id="event-city"
                        className={getInvalidFieldClass(
                          Boolean(eventFormErrors.city),
                        )}
                        {...eventForm.register("city", {
                          required: "City is required",
                        })}
                      />
                      <FieldError message={eventFormErrors.city?.message} />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="venue-address">Venue address</Label>
                    <Input
                      id="venue-address"
                      className={getInvalidFieldClass(
                        Boolean(eventFormErrors.venue_address),
                      )}
                      {...eventForm.register("venue_address", {
                        required: "Venue address is required",
                      })}
                    />
                    <FieldError
                      message={eventFormErrors.venue_address?.message}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-country">Country</Label>
                      <Input
                        id="event-country"
                        className={getInvalidFieldClass(
                          Boolean(eventFormErrors.country),
                        )}
                        {...eventForm.register("country", {
                          required: "Country is required",
                        })}
                      />
                      <FieldError message={eventFormErrors.country?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-currency">Currency</Label>
                      <Input
                        id="event-currency"
                        value={FIXED_CURRENCY_LABEL}
                        readOnly
                      />
                      <p className="text-sm text-muted-foreground">
                        All events are currently created in Tunisia's currency.
                      </p>
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-latitude">Latitude</Label>
                      <Input
                        id="event-latitude"
                        {...eventForm.register("latitude")}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-longitude">Longitude</Label>
                      <Input
                        id="event-longitude"
                        {...eventForm.register("longitude")}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-banner">Banner URL</Label>
                      <Input
                        id="event-banner"
                        className={getInvalidFieldClass(
                          Boolean(eventFormErrors.banner_url),
                        )}
                        {...eventForm.register("banner_url", {
                          pattern: {
                            value: /^$|^https?:\/\/.+/i,
                            message:
                              "Banner URL must start with http:// or https://",
                          },
                        })}
                      />
                      <FieldError
                        message={eventFormErrors.banner_url?.message}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="event-poster">Poster URL</Label>
                      <Input
                        id="event-poster"
                        className={getInvalidFieldClass(
                          Boolean(eventFormErrors.poster_url),
                        )}
                        {...eventForm.register("poster_url", {
                          pattern: {
                            value: /^$|^https?:\/\/.+/i,
                            message:
                              "Poster URL must start with http:// or https://",
                          },
                        })}
                      />
                      <FieldError
                        message={eventFormErrors.poster_url?.message}
                      />
                    </div>
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="event-status">Status</Label>
                      <Controller
                        control={eventForm.control}
                        name="status"
                        rules={{ required: "Status is required" }}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id="event-status"
                              className={getInvalidFieldClass(
                                Boolean(eventFormErrors.status),
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="published">
                                Published
                              </SelectItem>
                              <SelectItem value="cancelled">
                                Cancelled
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError message={eventFormErrors.status?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="featured-toggle">Featured</Label>
                      <Controller
                        control={eventForm.control}
                        name="is_featured"
                        rules={{ required: "Featured state is required" }}
                        render={({ field }) => (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <SelectTrigger
                              id="featured-toggle"
                              className={getInvalidFieldClass(
                                Boolean(eventFormErrors.is_featured),
                              )}
                            >
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="false">
                                Not featured
                              </SelectItem>
                              <SelectItem value="true">Featured</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      <FieldError
                        message={eventFormErrors.is_featured?.message}
                      />
                    </div>
                  </div>
                </div>

                <SheetFooter className="border-t border-border/70 pt-4">
                  <SheetClose asChild>
                    <Button
                      type="button"
                      variant="outline"
                      className="rounded-full"
                    >
                      Cancel
                    </Button>
                  </SheetClose>
                  <Button
                    type="submit"
                    className="rounded-full"
                    disabled={createEventMutation.isPending}
                  >
                    {createEventMutation.isPending ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Creating event
                      </>
                    ) : (
                      "Create event"
                    )}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>
        </CardHeader>
      </Card>

      {errorMessage ? <InlineError message={errorMessage} /> : null}

      {isLoading ? (
        <AdminLoadingGrid rows={3} />
      ) : null}

      {!isLoading ? (
        <div className="grid gap-4 md:grid-cols-3">
          <Card className="rounded-[1.5rem] border-border/70 bg-card/92 shadow-none">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Events
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {events.length}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-border/70 bg-card/92 shadow-none">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Published
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {events.filter((event) => event.status === "published").length}
              </p>
            </CardContent>
          </Card>
          <Card className="rounded-[1.5rem] border-border/70 bg-card/92 shadow-none">
            <CardContent className="p-5">
              <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                Search results
              </p>
              <p className="mt-2 text-2xl font-semibold text-foreground">
                {filteredEvents.length}
              </p>
            </CardContent>
          </Card>
        </div>
      ) : null}

      {!isLoading ? (
        <Card className="rounded-[1.75rem] border-border/60 bg-card/96 shadow-[0_24px_60px_-40px_rgba(15,23,42,0.35)]">
          <CardHeader className="gap-4">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle>All events in scope</CardTitle>
                <CardDescription>
                  {isSuperAdmin
                    ? "Platform-wide event visibility for super admins."
                    : "Only the organizer-owned events available to this admin."}
                </CardDescription>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <div className="relative min-w-[240px]">
                  <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    value={query}
                    onChange={(event) => updateSearch({ q: event.target.value })}
                    placeholder="Search events"
                    className="pl-9"
                  />
                </div>
                <Select
                  value={statusFilter}
                  onValueChange={(value) =>
                    updateSearch({
                      status: value as "all" | AdminEventListItem["status"],
                    })
                  }
                >
                  <SelectTrigger className="w-full sm:w-[170px]">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="published">Published</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6 pt-4">
            {filteredEvents.length === 0 ? (
              <p className="text-sm text-muted-foreground">No events yet.</p>
            ) : (
              filteredEvents.map((event) => {
                const sessionCount = event.session_count;
                const ticketTypeCount = event.ticket_type_count;
                const hasTicketsGap =
                  event.has_sessions_without_tickets && sessionCount > 0;

                return (
                  <Card
                    key={event.id}
                    role="link"
                    tabIndex={0}
                    onClick={() =>
                      navigate({
                        to: "/admin/events/$eventId",
                        params: { eventId: String(event.id) },
                      })
                    }
                    onKeyDown={(keyboardEvent) => {
                      if (
                        keyboardEvent.key === "Enter" ||
                        keyboardEvent.key === " "
                      ) {
                        keyboardEvent.preventDefault();
                        navigate({
                          to: "/admin/events/$eventId",
                          params: { eventId: String(event.id) },
                        });
                      }
                    }}
                    className="group cursor-pointer rounded-[1.5rem] border-border/70 bg-background/72 shadow-none transition-colors duration-200 hover:border-primary/35 hover:bg-background/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/30"
                  >
                    <CardContent className="space-y-5 p-5 sm:p-6">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1.5">
                          <p className="text-lg font-medium text-foreground">
                            {event.title}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {event.slug}
                          </p>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">{event.status}</Badge>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(mouseEvent) => {
                              mouseEvent.stopPropagation();
                              setEventPendingDelete(event);
                            }}
                            onKeyDown={(keyboardEvent) => {
                              keyboardEvent.stopPropagation();
                            }}
                            className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                            disabled={
                              deleteEventMutation.isPending &&
                              String(eventPendingDelete?.id) === String(event.id)
                            }
                          >
                            {deleteEventMutation.isPending &&
                            String(eventPendingDelete?.id) === String(event.id) ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div className="grid gap-4 text-sm text-muted-foreground lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1fr)_auto] lg:items-end">
                        <div className="space-y-2">
                          <p>{event.category_name}</p>
                          <p>Updated {formatDate(event.updated_at)}</p>
                        </div>
                        <div className="space-y-2">
                          <p>
                            {event.venue_name}, {event.city}, {event.country}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Badge variant="secondary" className="rounded-full">
                              {sessionCount} sessions
                            </Badge>
                            <Badge variant="secondary" className="rounded-full">
                              {ticketTypeCount} ticket types
                            </Badge>
                            <Badge
                              variant="secondary"
                              className="rounded-full"
                            >
                              {event.currency}
                            </Badge>
                          </div>
                        </div>
                        <div className="space-y-2 text-right">
                          {isSuperAdmin ? <p>{event.organizer_name}</p> : null}
                          <p>Created {formatDate(event.created_at)}</p>
                        </div>
                      </div>
                      {sessionCount === 0 ? (
                        <p className="rounded-2xl border border-dashed border-border/70 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                          Next action: add the first session to make this event bookable.
                        </p>
                      ) : hasTicketsGap ? (
                        <p className="rounded-2xl border border-dashed border-border/70 bg-background/65 px-4 py-3 text-sm text-muted-foreground">
                          Next action: finish ticket setup for sessions that still have no ticket types.
                        </p>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })
            )}
          </CardContent>
        </Card>
      ) : null}

      <AlertDialog
        open={Boolean(eventPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setEventPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete event?</AlertDialogTitle>
            <AlertDialogDescription>
              {eventPendingDelete
                ? `This will permanently remove ${eventPendingDelete.title}, its sessions, and all ticket types under it.`
                : "This will permanently remove the event, its sessions, and all ticket types under it."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteEvent}>
              Delete event
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
