import { Link, createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useRef, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import {
  ArrowLeft,
  CalendarRange,
  Clock3,
  LoaderCircle,
  MapPin,
  Pencil,
  Plus,
  Ticket,
  Trash2,
} from "lucide-react";

import { Badge } from "#/components/ui/badge";
import { Button } from "#/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "#/components/ui/alert-dialog";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "#/components/ui/card";
import { Form } from "#/components/ui/form";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
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
import {
  createEventSession,
  createTicketType,
  deleteAdminEvent,
  deleteAdminTicketType,
  deleteEventSession,
  getAdminEventById,
  listAdminCategories,
  updateAdminEvent,
  updateEventSession,
  updateTicketType,
  type UpdateAdminEventInput,
} from "#/lib/api/admin";
import { SessionDateTimeRangePicker } from "#/features/admin/components/SessionDateTimeRangePicker";
import {
  AdminDangerZone,
  AdminLoadingGrid,
  AdminStickySectionNav,
} from "#/features/admin/components/AdminSurface";
import { useAuthSession } from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";
import {
  DEFAULT_CURRENCY_CODE,
  DEFAULT_CURRENCY_LABEL,
} from "#/lib/currency";
import { UrlImagePreview } from "#/components/UrlImagePreview";

type Category = components["schemas"]["Category"];
type EventDetail = components["schemas"]["EventDetail"];
type EventSessionDetail = components["schemas"]["EventSessionDetail"];
type TicketType = components["schemas"]["TicketType"];

const FIXED_CURRENCY_CODE = DEFAULT_CURRENCY_CODE;
const FIXED_CURRENCY_LABEL = DEFAULT_CURRENCY_LABEL;

type EventFormValues = {
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

type SessionFormValues = {
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "completed" | "cancelled";
};

type TicketTypeFormValues = {
  name: string;
  description: string;
  price: string;
  quantity: string;
  max_per_order: string;
};

export const Route = createFileRoute("/admin/events/$eventId")({
  validateSearch: (search: Record<string, unknown>) => ({
    section:
      search.section === "overview" ||
      search.section === "sessions" ||
      search.section === "tickets" ||
      search.section === "danger"
        ? search.section
        : "overview",
  }),
  component: AdminEventWorkspacePage,
});

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
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

function AdminEventWorkspacePage() {
  const { eventId } = Route.useParams();
  const search = Route.useSearch();
  const navigate = useNavigate();
  const session = useAuthSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [eventDetail, setEventDetail] = useState<EventDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const hasLoadedRef = useRef(false);
  const [eventSheetOpen, setEventSheetOpen] = useState(false);
  const [sessionSheetOpen, setSessionSheetOpen] = useState(false);
  const [ticketSheetOpen, setTicketSheetOpen] = useState(false);
  const [isEventSubmitting, setIsEventSubmitting] = useState(false);
  const [isSessionSubmitting, setIsSessionSubmitting] = useState(false);
  const [isTicketSubmitting, setIsTicketSubmitting] = useState(false);
  const [isEventDeleting, setIsEventDeleting] = useState(false);
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(
    null,
  );
  const [deletingTicketTypeId, setDeletingTicketTypeId] = useState<
    string | null
  >(null);
  const [sessionPendingDelete, setSessionPendingDelete] =
    useState<EventSessionDetail | null>(null);
  const [ticketPendingDelete, setTicketPendingDelete] = useState<{
    session: EventSessionDetail;
    ticketType: TicketType;
  } | null>(null);
  const [editingSession, setEditingSession] =
    useState<EventSessionDetail | null>(null);
  const [ticketContextSession, setTicketContextSession] =
    useState<EventSessionDetail | null>(null);
  const [editingTicketType, setEditingTicketType] = useState<TicketType | null>(
    null,
  );
  const overviewRef = useRef<HTMLDivElement | null>(null);
  const sessionsRef = useRef<HTMLDivElement | null>(null);
  const ticketsRef = useRef<HTMLDivElement | null>(null);
  const dangerRef = useRef<HTMLDivElement | null>(null);

  const eventForm = useForm<EventFormValues>();
  const sessionForm = useForm<SessionFormValues>({
    defaultValues: {
      starts_at: "",
      ends_at: "",
      status: "scheduled",
    },
  });
  const ticketForm = useForm<TicketTypeFormValues>({
    defaultValues: {
      name: "",
      description: "",
      price: "",
      quantity: "",
      max_per_order: "",
    },
  });
  const eventFormErrors = eventForm.formState.errors;
  const sessionFormErrors = sessionForm.formState.errors;
  const ticketFormErrors = ticketForm.formState.errors;

  useEffect(() => {
    if (!session) {
      navigate({ to: "/login" });
      return;
    }

    let isMounted = true;
    async function loadWorkspace(isPolling = false) {
      const isInitialLoad = !hasLoadedRef.current;
      const shouldBlockUi = isInitialLoad && !isPolling;
      const allowPolling =
        !eventSheetOpen && !sessionSheetOpen && !ticketSheetOpen;

      if (isPolling && !allowPolling) {
        return;
      }

      if (shouldBlockUi) {
        setIsLoading(true);
        setLoadError("");
      }

      try {
        const [categoryData, eventData] = await Promise.all([
          listAdminCategories(session.access_token),
          getAdminEventById(session.access_token, eventId),
        ]);

        if (!isMounted) {
          return;
        }

        hasLoadedRef.current = true;
        setCategories(categoryData);
        setEventDetail(eventData);
      } catch (error) {
        if (!isMounted) {
          return;
        }

        if (!isPolling && !hasLoadedRef.current) {
          setLoadError(
            error instanceof Error
              ? error.message
              : "Failed to load event workspace",
          );
        }
      } finally {
        if (!isMounted) {
          return;
        }

        if (shouldBlockUi) {
          setIsLoading(false);
        }
      }
    }

    loadWorkspace();

    const poll = window.setInterval(() => {
      void loadWorkspace(true);
    }, 5000);

    const handleFocus = () => {
      void loadWorkspace(true);
    };

    window.addEventListener("focus", handleFocus);

    return () => {
      isMounted = false;
      window.clearInterval(poll);
      window.removeEventListener("focus", handleFocus);
    };
  }, [
    eventId,
    eventSheetOpen,
    navigate,
    session,
    sessionSheetOpen,
    ticketSheetOpen,
  ]);

  const currentCategory = useMemo(
    () => categories.find((item) => item.id === eventDetail?.category_id),
    [categories, eventDetail],
  );

  useEffect(() => {
    if (!eventDetail) {
      return;
    }

    eventForm.reset({
      category_id: String(eventDetail.category_id),
      title: eventDetail.title,
      slug: eventDetail.slug,
      description: eventDetail.description,
      venue_name: eventDetail.venue_name,
      venue_address: eventDetail.venue_address,
      city: eventDetail.city,
      country: eventDetail.country,
      latitude:
        typeof eventDetail.latitude === "number"
          ? String(eventDetail.latitude)
          : "",
      longitude:
        typeof eventDetail.longitude === "number"
          ? String(eventDetail.longitude)
          : "",
      banner_url: eventDetail.banner_url ?? "",
      poster_url: eventDetail.poster_url ?? "",
      status: eventDetail.status as EventFormValues["status"],
      is_featured: eventDetail.is_featured ? "true" : "false",
    });
  }, [eventDetail, eventForm]);

  useEffect(() => {
    const sectionMap = {
      overview: overviewRef,
      sessions: sessionsRef,
      tickets: ticketsRef,
      danger: dangerRef,
    } as const;

    const target = sectionMap[search.section]?.current;
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [search.section]);

  if (!session) {
    return null;
  }

  async function reloadEventDetail() {
    try {
      const latest = await getAdminEventById(session.access_token, eventId);
      setEventDetail(latest);
    } catch (error) {
      setLoadError(
        error instanceof Error ? error.message : "Failed to reload event",
      );
    }
  }

  function openCreateSessionSheet() {
    setEditingSession(null);
    sessionForm.reset({
      starts_at: "",
      ends_at: "",
      status: "scheduled",
    });
    setSessionSheetOpen(true);
  }

  function openEditSessionSheet(sessionDetail: EventSessionDetail) {
    setEditingSession(sessionDetail);
    sessionForm.reset({
      starts_at: sessionDetail.starts_at.slice(0, 16),
      ends_at: sessionDetail.ends_at.slice(0, 16),
      status: sessionDetail.status as SessionFormValues["status"],
    });
    setSessionSheetOpen(true);
  }

  function openCreateTicketSheet(sessionDetail: EventSessionDetail) {
    setTicketContextSession(sessionDetail);
    setEditingTicketType(null);
    ticketForm.reset({
      name: "",
      description: "",
      price: "",
      quantity: "",
      max_per_order: "",
    });
    setTicketSheetOpen(true);
  }

  function openEditTicketSheet(
    sessionDetail: EventSessionDetail,
    ticketType: TicketType,
  ) {
    setTicketContextSession(sessionDetail);
    setEditingTicketType(ticketType);
    ticketForm.reset({
      name: ticketType.name,
      description: ticketType.description ?? "",
      price: String(ticketType.price),
      quantity: String(ticketType.quantity),
      max_per_order: String(ticketType.max_per_order),
    });
    setTicketSheetOpen(true);
  }

  async function handleUpdateEvent(values: EventFormValues) {
    setIsEventSubmitting(true);

    const payload: UpdateAdminEventInput = {
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
    };

    try {
      await updateAdminEvent(session.access_token, eventId, payload);
      setEventSheetOpen(false);
      await reloadEventDetail();
      toast.success("Event updated", {
        description: `${payload.title} is saved and ready for publishing changes.`,
      });
    } catch (error) {
      toast.error("Failed to update event", {
        description:
          error instanceof Error
            ? error.message
            : "Please review the form and try again.",
      });
    } finally {
      setIsEventSubmitting(false);
    }
  }

  async function handleUpsertSession(values: SessionFormValues) {
    let hasValidationError = false;

    if (!values.starts_at) {
      sessionForm.setError("starts_at", {
        type: "required",
        message: "Session date and start time are required",
      });
      hasValidationError = true;
    } else {
      sessionForm.clearErrors("starts_at");
    }

    if (!values.ends_at) {
      sessionForm.setError("ends_at", {
        type: "required",
        message: "End time is required",
      });
      hasValidationError = true;
    } else if (values.starts_at && new Date(values.ends_at) <= new Date(values.starts_at)) {
      sessionForm.setError("ends_at", {
        type: "validate",
        message: "End time must be after start time",
      });
      hasValidationError = true;
    } else {
      sessionForm.clearErrors("ends_at");
    }

    if (hasValidationError) {
      return;
    }

    setIsSessionSubmitting(true);

    const payload = {
      starts_at: new Date(values.starts_at).toISOString(),
      ends_at: new Date(values.ends_at).toISOString(),
      status: values.status,
    };

    try {
      const isEditing = Boolean(editingSession);
      if (editingSession) {
        await updateEventSession(
          session.access_token,
          eventId,
          String(editingSession.id),
          payload,
        );
      } else {
        await createEventSession(session.access_token, eventId, payload);
      }

      setSessionSheetOpen(false);
      await reloadEventDetail();
      toast.success(isEditing ? "Session updated" : "Session created", {
        description: isEditing
          ? "The session schedule changes have been saved."
          : "The new session is ready for ticket setup.",
      });
    } catch (error) {
      toast.error("Failed to save session", {
        description:
          error instanceof Error
            ? error.message
            : "Please review the session details and try again.",
      });
    } finally {
      setIsSessionSubmitting(false);
    }
  }

  async function handleUpsertTicketType(values: TicketTypeFormValues) {
    if (!ticketContextSession) {
      toast.error("Choose a session first", {
        description: "Ticket types must be created inside a specific session.",
      });
      return;
    }

    setIsTicketSubmitting(true);

    const payload = {
      name: values.name.trim(),
      description: values.description.trim(),
      price: Number(values.price),
      quantity: Number(values.quantity),
      max_per_order: Number(values.max_per_order),
    };

    try {
      const isEditing = Boolean(editingTicketType);
      if (editingTicketType) {
        await updateTicketType(
          session.access_token,
          eventId,
          String(ticketContextSession.id),
          String(editingTicketType.id),
          payload,
        );
      } else {
        await createTicketType(
          session.access_token,
          eventId,
          String(ticketContextSession.id),
          payload,
        );
      }

      setTicketSheetOpen(false);
      await reloadEventDetail();
      toast.success(isEditing ? "Ticket type updated" : "Ticket type created", {
        description: isEditing
          ? "Pricing and inventory changes have been saved."
          : `${payload.name} is now available in this session.`,
      });
    } catch (error) {
      toast.error("Failed to save ticket type", {
        description:
          error instanceof Error
            ? error.message
            : "Please review the ticket details and try again.",
      });
    } finally {
      setIsTicketSubmitting(false);
    }
  }

  async function handleDeleteEvent() {
    if (!session || !eventDetail) {
      return;
    }

    setIsEventDeleting(true);

    try {
      await deleteAdminEvent(session.access_token, eventId);
      toast.success("Event deleted", {
        description: `${eventDetail.title} and its sessions were removed.`,
      });
      navigate({ to: "/admin/events" });
    } catch (error) {
      toast.error("Failed to delete event", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setIsEventDeleting(false);
    }
  }

  async function handleDeleteSession(sessionDetail: EventSessionDetail) {
    if (!session) {
      return;
    }

    setDeletingSessionId(String(sessionDetail.id));

    try {
      await deleteEventSession(
        session.access_token,
        eventId,
        String(sessionDetail.id),
      );
      await reloadEventDetail();
      toast.success("Session deleted", {
        description: `The ${formatDateTime(sessionDetail.starts_at)} session was removed.`,
      });
      setSessionPendingDelete(null);
    } catch (error) {
      toast.error("Failed to delete session", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeletingSessionId(null);
    }
  }

  async function handleDeleteTicketType(
    sessionDetail: EventSessionDetail,
    ticketType: TicketType,
  ) {
    if (!session) {
      return;
    }

    setDeletingTicketTypeId(String(ticketType.id));

    try {
      await deleteAdminTicketType(
        session.access_token,
        eventId,
        String(sessionDetail.id),
        String(ticketType.id),
      );
      await reloadEventDetail();
      toast.success("Ticket type deleted", {
        description: `${ticketType.name} was removed from this session.`,
      });
      setTicketPendingDelete(null);
    } catch (error) {
      toast.error("Failed to delete ticket type", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeletingTicketTypeId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Button asChild variant="outline" className="rounded-full">
          <Link to="/admin/events">
            <ArrowLeft className="size-4" />
            Back to events
          </Link>
        </Button>
      </div>

      {!isLoading && eventDetail ? (
        <AdminStickySectionNav
          items={[
            {
              id: "overview",
              label: "Overview",
              active: search.section === "overview",
              search: { section: "overview" },
            },
            {
              id: "sessions",
              label: "Sessions",
              active: search.section === "sessions",
              search: { section: "sessions" },
            },
            {
              id: "tickets",
              label: "Tickets",
              active: search.section === "tickets",
              search: { section: "tickets" },
            },
            {
              id: "danger",
              label: "Danger zone",
              active: search.section === "danger",
              search: { section: "danger" },
            },
          ]}
        />
      ) : null}

      {loadError ? <InlineError message={loadError} /> : null}
      {isLoading ? (
        <AdminLoadingGrid rows={3} />
      ) : null}

      {!isLoading && eventDetail ? (
        <>
          <div ref={overviewRef}>
            <Card className="rounded-[2rem] border-border/60 bg-card/95 shadow-[0_24px_60px_-35px_rgba(15,23,42,0.45)]">
            <CardHeader className="gap-4">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="space-y-3">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="rounded-full">
                      Event workspace
                    </Badge>
                    <Badge variant="secondary" className="rounded-full">
                      {eventDetail.status}
                    </Badge>
                    {eventDetail.is_featured ? (
                      <Badge className="rounded-full">Featured</Badge>
                    ) : null}
                  </div>
                  <div className="space-y-1">
                    <CardTitle className="font-serif text-4xl">
                      {eventDetail.title}
                    </CardTitle>
                    <CardDescription className="text-base">
                      {currentCategory?.name ?? "Unknown category"} •{" "}
                      {eventDetail.slug}
                    </CardDescription>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Sheet open={eventSheetOpen} onOpenChange={setEventSheetOpen}>
                    <SheetTrigger asChild>
                      <Button className="rounded-full">
                        <Pencil className="size-4" />
                        Edit event
                      </Button>
                    </SheetTrigger>
                    <SheetContent side="right" className="sm:max-w-2xl">
                      <SheetHeader>
                        <SheetTitle>Edit event</SheetTitle>
                        <SheetDescription>
                          Update event details, publishing state, and discovery
                          settings.
                        </SheetDescription>
                      </SheetHeader>
                      <form
                        className="flex h-full flex-col"
                        onSubmit={eventForm.handleSubmit(handleUpdateEvent)}
                      >
                        <div className="space-y-5 overflow-y-auto py-6 pr-1">
                          <div className="space-y-2">
                            <Label htmlFor="event-category">Category</Label>
                            <Select
                              value={eventForm.watch("category_id")}
                              onValueChange={(value) =>
                                eventForm.setValue("category_id", value, {
                                  shouldValidate: true,
                                })
                              }
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
                              <FieldError
                                message={
                                  eventForm.formState.errors.title?.message
                                }
                              />
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
                                })}
                              />
                              <FieldError
                                message={
                                  eventForm.formState.errors.slug?.message
                                }
                              />
                            </div>
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor="event-description">
                              Description
                            </Label>
                            <Textarea
                              id="event-description"
                              className={`min-h-36 ${getInvalidFieldClass(Boolean(eventFormErrors.description)) ?? ""}`}
                              {...eventForm.register("description", {
                                required: "Description is required",
                              })}
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
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="event-currency">Currency</Label>
                              <Input
                                id="event-currency"
                                value={FIXED_CURRENCY_LABEL}
                                readOnly
                              />
                              <p className="text-sm text-muted-foreground">
                                Event pricing is currently fixed to the default
                                currency.
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
                                {...eventForm.register("banner_url")}
                              />
                              <UrlImagePreview
                                url={eventForm.watch("banner_url")}
                                alt="Banner preview"
                                variant="banner"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="event-poster">Poster URL</Label>
                              <Input
                                id="event-poster"
                                className={getInvalidFieldClass(
                                  Boolean(eventFormErrors.poster_url),
                                )}
                                {...eventForm.register("poster_url")}
                              />
                              <UrlImagePreview
                                url={eventForm.watch("poster_url")}
                                alt="Poster preview"
                                variant="poster"
                                className="max-w-[260px]"
                              />
                            </div>
                          </div>

                          <div className="grid gap-5 sm:grid-cols-2">
                            <div className="space-y-2">
                              <Label htmlFor="event-status">Status</Label>
                              <Select
                                value={eventForm.watch("status")}
                                onValueChange={(value) =>
                                  eventForm.setValue(
                                    "status",
                                    value as EventFormValues["status"],
                                    { shouldValidate: true },
                                  )
                                }
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
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="featured-toggle">Featured</Label>
                              <Select
                                value={eventForm.watch("is_featured")}
                                onValueChange={(value) =>
                                  eventForm.setValue(
                                    "is_featured",
                                    value as EventFormValues["is_featured"],
                                  )
                                }
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
                            disabled={isEventSubmitting}
                          >
                            {isEventSubmitting ? (
                              <>
                                <LoaderCircle className="size-4 animate-spin" />
                                Saving event
                              </>
                            ) : (
                              "Save event"
                            )}
                          </Button>
                        </SheetFooter>
                      </form>
                    </SheetContent>
                  </Sheet>

                  <Button
                    className="rounded-full"
                    onClick={openCreateSessionSheet}
                  >
                    <Plus className="size-4" />
                    New session
                  </Button>
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-3">
                <Card className="bg-background/70 shadow-none">
                  <CardContent className="flex items-start gap-3 p-5">
                    <MapPin className="mt-1 size-4 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Venue
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {eventDetail.venue_name}, {eventDetail.city},{" "}
                        {eventDetail.country}
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-background/70 shadow-none">
                  <CardContent className="flex items-start gap-3 p-5">
                    <CalendarRange className="mt-1 size-4 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Sessions
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {eventDetail.sessions.length} scheduled touchpoints for
                        this event.
                      </p>
                    </div>
                  </CardContent>
                </Card>
                <Card className="bg-background/70 shadow-none">
                  <CardContent className="flex items-start gap-3 p-5">
                    <Ticket className="mt-1 size-4 text-primary" />
                    <div className="space-y-1">
                      <p className="text-sm font-medium text-foreground">
                        Ticket types
                      </p>
                      <p className="text-sm leading-6 text-muted-foreground">
                        {eventDetail.sessions.reduce(
                          (total, sessionDetail) =>
                            total + sessionDetail.ticket_types.length,
                          0,
                        )}{" "}
                        ticket offers across all sessions.
                      </p>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </CardHeader>
            </Card>
          </div>

          <div ref={sessionsRef} className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
            <Card className="rounded-[1.75rem] border-border/70 bg-card/94 shadow-none">
              <CardHeader>
                <CardTitle>Operations flow</CardTitle>
                <CardDescription>
                  Keep this workspace moving in order: review event details,
                  add sessions, then configure ticket inventory.
                </CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 md:grid-cols-3">
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Step 1
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    Review settings
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Step 2
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    Add sessions
                  </p>
                </div>
                <div className="rounded-2xl border border-border/70 bg-background/70 p-4">
                  <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">
                    Step 3
                  </p>
                  <p className="mt-2 font-medium text-foreground">
                    Set ticket inventory
                  </p>
                </div>
              </CardContent>
            </Card>

            <div ref={dangerRef}>
              <AdminDangerZone
                title="Danger zone"
                description="Deleting the event removes every session and ticket type below it."
                action={
                  <div className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      Use this only when you want to permanently remove this whole workspace.
                    </p>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button
                          type="button"
                          variant="destructive"
                          className="rounded-full"
                          disabled={isEventDeleting}
                        >
                          {isEventDeleting ? (
                            <LoaderCircle className="size-4 animate-spin" />
                          ) : (
                            <Trash2 className="size-4" />
                          )}
                          Delete event
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Delete event?</AlertDialogTitle>
                          <AlertDialogDescription>
                            This will permanently remove {eventDetail.title},
                            every session under it, and all related ticket types.
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
                }
              />
            </div>
          </div>

          <div ref={ticketsRef}>
            <Card className="rounded-[1.75rem]">
            <CardHeader>
              <CardTitle>Sessions and ticket operations</CardTitle>
              <CardDescription>
                Manage scheduling and pricing from one event workspace.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {eventDetail.sessions.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No sessions yet. Create the first session to start selling
                  tickets.
                </p>
              ) : (
                eventDetail.sessions.map((sessionDetail) => (
                  <Card
                    key={String(sessionDetail.id)}
                    className="bg-background/70"
                  >
                    <CardHeader className="gap-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div className="space-y-2">
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge variant="outline" className="rounded-full">
                              {sessionDetail.status}
                            </Badge>
                            <Badge variant="secondary" className="rounded-full">
                              {sessionDetail.ticket_types.length} ticket types
                            </Badge>
                          </div>
                          <CardTitle className="text-xl">
                            {formatDateTime(sessionDetail.starts_at)}
                          </CardTitle>
                          <CardDescription>
                            Ends {formatDateTime(sessionDetail.ends_at)}
                          </CardDescription>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          <Button
                            variant="outline"
                            className="rounded-full"
                            onClick={() => openEditSessionSheet(sessionDetail)}
                          >
                            <Pencil className="size-4" />
                            Edit session
                          </Button>
                          <Button
                            className="rounded-full"
                            onClick={() => openCreateTicketSheet(sessionDetail)}
                          >
                            <Plus className="size-4" />
                            Add ticket type
                          </Button>
                          <Button
                            type="button"
                            variant="destructive"
                            className="rounded-full"
                            disabled={
                              deletingSessionId === String(sessionDetail.id)
                            }
                            onClick={() => setSessionPendingDelete(sessionDetail)}
                          >
                            {deletingSessionId === String(sessionDetail.id) ? (
                              <LoaderCircle className="size-4 animate-spin" />
                            ) : (
                              <Trash2 className="size-4" />
                            )}
                            Delete session
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="grid gap-3 md:grid-cols-2">
                        <Card className="bg-muted/30 shadow-none">
                          <CardContent className="flex items-start gap-3 p-4">
                            <Clock3 className="mt-1 size-4 text-primary" />
                            <div className="space-y-1">
                              <p className="text-sm font-medium text-foreground">
                                Session window
                              </p>
                              <p className="text-sm leading-6 text-muted-foreground">
                                {formatDateTime(sessionDetail.starts_at)} to{" "}
                                {formatDateTime(sessionDetail.ends_at)}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      <div className="grid gap-3 lg:grid-cols-2">
                        {sessionDetail.ticket_types.length === 0 ? (
                          <p className="rounded-2xl border border-dashed border-border/70 bg-background/55 p-4 text-sm text-muted-foreground">
                            Next action: add the first ticket type for this session.
                          </p>
                        ) : (
                          sessionDetail.ticket_types.map((ticketType) => (
                            <div
                              key={String(ticketType.id)}
                              className="relative overflow-hidden rounded-[1.25rem] border border-primary/15 bg-[linear-gradient(135deg,rgba(255,247,237,0.98),rgba(255,255,255,0.98))]"
                            >
                              <div className="absolute inset-y-0 right-[7.5rem] hidden border-l border-dashed border-primary/25 md:block" />
                              <div className="absolute -right-2 top-1/2 hidden size-4 -translate-y-1/2 rounded-full bg-background md:block" />
                              <div className="absolute right-[7.5rem] top-0 hidden size-4 -translate-y-1/2 rounded-full bg-background md:block" />
                              <div className="absolute right-[7.5rem] bottom-0 hidden size-4 translate-y-1/2 rounded-full bg-background md:block" />
                              <div className="grid gap-3 p-3 md:grid-cols-[minmax(0,1fr)_6.5rem] md:items-center">
                                <div className="min-w-0 space-y-2">
                                  <div className="flex items-start justify-between gap-3">
                                    <div className="min-w-0">
                                      <p className="text-[10px] font-semibold uppercase tracking-[0.24em] text-primary/70">
                                        Event ticket
                                      </p>
                                      <p className="truncate text-base font-semibold text-foreground">
                                        {ticketType.name}
                                      </p>
                                    </div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      className="h-8 rounded-full px-3"
                                      onClick={() =>
                                        openEditTicketSheet(
                                          sessionDetail,
                                          ticketType,
                                        )
                                      }
                                    >
                                      <Pencil className="size-3.5" />
                                      Edit
                                    </Button>
                                  </div>

                                  {ticketType.description ? (
                                    <p className="line-clamp-2 text-xs leading-5 text-muted-foreground">
                                      {ticketType.description}
                                    </p>
                                  ) : null}

                                  <div className="flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                                    <span className="rounded-full bg-white/80 px-2.5 py-1">
                                      Qty {ticketType.quantity}
                                    </span>
                                    <span className="rounded-full bg-white/80 px-2.5 py-1">
                                      Max {ticketType.max_per_order}/order
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-row items-center justify-between gap-3 rounded-xl bg-white/85 px-3 py-2 md:flex-col md:items-start md:justify-center md:px-4 md:py-3">
                                  <div>
                                    <p className="text-[10px] uppercase tracking-[0.22em] text-primary/60">
                                      Price
                                    </p>
                                    <p className="mt-1 text-lg font-semibold leading-none text-foreground">
                                      {eventDetail.currency} {ticketType.price}
                                    </p>
                                  </div>

                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 rounded-full px-3 text-destructive hover:bg-destructive/10 hover:text-destructive"
                                    disabled={
                                      deletingTicketTypeId ===
                                      String(ticketType.id)
                                    }
                                    onClick={() =>
                                      setTicketPendingDelete({
                                        session: sessionDetail,
                                        ticketType,
                                      })
                                    }
                                  >
                                    {deletingTicketTypeId ===
                                    String(ticketType.id) ? (
                                      <LoaderCircle className="size-3.5 animate-spin" />
                                    ) : (
                                      <Trash2 className="size-3.5" />
                                    )}
                                    Delete
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
            </Card>
          </div>

          <Sheet
            open={sessionSheetOpen}
            onOpenChange={(open) => {
              setSessionSheetOpen(open);
              if (!open) {
                setEditingSession(null);
              }
            }}
          >
            <SheetContent side="right" className="sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>
                  {editingSession ? "Edit session" : "Create session"}
                </SheetTitle>
                <SheetDescription>
                  Set the session date, time range, and operational status.
                </SheetDescription>
              </SheetHeader>
              <Form {...sessionForm}>
                <form
                  className="flex h-full flex-col"
                  onSubmit={sessionForm.handleSubmit(handleUpsertSession)}
                >
                  <div className="space-y-5 overflow-y-auto py-6 pr-1">
                    <SessionDateTimeRangePicker
                      control={sessionForm.control}
                      startName="starts_at"
                      endName="ends_at"
                      hasStartError={Boolean(sessionFormErrors.starts_at)}
                      hasEndError={Boolean(sessionFormErrors.ends_at)}
                    />
                    <FieldError
                      message={
                        sessionFormErrors.starts_at?.message ??
                        sessionFormErrors.ends_at?.message
                      }
                    />

                    <div className="space-y-2">
                      <Label htmlFor="session-status">Status</Label>
                      <Select
                        value={sessionForm.watch("status")}
                        onValueChange={(value) =>
                          sessionForm.setValue(
                            "status",
                            value as SessionFormValues["status"],
                            { shouldValidate: true },
                          )
                        }
                      >
                        <SelectTrigger
                          id="session-status"
                          className={getInvalidFieldClass(
                            Boolean(sessionFormErrors.status),
                          )}
                        >
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="scheduled">Scheduled</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
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
                      disabled={isSessionSubmitting}
                    >
                      {isSessionSubmitting ? (
                        <>
                          <LoaderCircle className="size-4 animate-spin" />
                          Saving session
                        </>
                      ) : editingSession ? (
                        "Save session"
                      ) : (
                        "Create session"
                      )}
                    </Button>
                  </SheetFooter>
                </form>
              </Form>
            </SheetContent>
          </Sheet>

          <Sheet
            open={ticketSheetOpen}
            onOpenChange={(open) => {
              setTicketSheetOpen(open);
              if (!open) {
                setEditingTicketType(null);
                setTicketContextSession(null);
              }
            }}
          >
            <SheetContent side="right" className="sm:max-w-xl">
              <SheetHeader>
                <SheetTitle>
                  {editingTicketType
                    ? "Edit ticket type"
                    : "Create ticket type"}
                </SheetTitle>
                <SheetDescription>
                  {ticketContextSession
                    ? `Working inside the ${formatDateTime(ticketContextSession.starts_at)} session.`
                    : "Add pricing and inventory for a specific session."}
                </SheetDescription>
              </SheetHeader>
              <form
                className="flex h-full flex-col"
                onSubmit={ticketForm.handleSubmit(handleUpsertTicketType)}
              >
                <div className="space-y-5 overflow-y-auto py-6 pr-1">
                  <div className="space-y-2">
                    <Label htmlFor="ticket-name">Name</Label>
                    <Input
                      id="ticket-name"
                      className={getInvalidFieldClass(
                        Boolean(ticketFormErrors.name),
                      )}
                      {...ticketForm.register("name", {
                        required: "Ticket name is required",
                      })}
                    />
                    <FieldError message={ticketFormErrors.name?.message} />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-description">Description</Label>
                    <Textarea
                      id="ticket-description"
                      className={getInvalidFieldClass(
                        Boolean(ticketFormErrors.description),
                      )}
                      {...ticketForm.register("description")}
                    />
                  </div>

                  <div className="grid gap-5 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="ticket-price">Price</Label>
                      <Input
                        id="ticket-price"
                        type="number"
                        step="0.01"
                        min="0"
                        className={getInvalidFieldClass(
                          Boolean(ticketFormErrors.price),
                        )}
                        {...ticketForm.register("price", {
                          required: "Price is required",
                        })}
                      />
                      <FieldError message={ticketFormErrors.price?.message} />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="ticket-quantity">Quantity</Label>
                      <Input
                        id="ticket-quantity"
                        type="number"
                        min="1"
                        className={getInvalidFieldClass(
                          Boolean(ticketFormErrors.quantity),
                        )}
                        {...ticketForm.register("quantity", {
                          required: "Quantity is required",
                        })}
                      />
                      <FieldError
                        message={ticketFormErrors.quantity?.message}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="ticket-max-per-order">Max per order</Label>
                    <Input
                      id="ticket-max-per-order"
                      type="number"
                      min="1"
                      className={getInvalidFieldClass(
                        Boolean(ticketFormErrors.max_per_order),
                      )}
                      {...ticketForm.register("max_per_order", {
                        required: "Max per order is required",
                      })}
                    />
                    <FieldError
                      message={ticketFormErrors.max_per_order?.message}
                    />
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
                    disabled={isTicketSubmitting}
                  >
                    {isTicketSubmitting ? (
                      <>
                        <LoaderCircle className="size-4 animate-spin" />
                        Saving ticket type
                      </>
                    ) : editingTicketType ? (
                      "Save ticket type"
                    ) : (
                      "Create ticket type"
                    )}
                  </Button>
                </SheetFooter>
              </form>
            </SheetContent>
          </Sheet>

          <AlertDialog
            open={Boolean(sessionPendingDelete)}
            onOpenChange={(open) => {
              if (!open) {
                setSessionPendingDelete(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete session?</AlertDialogTitle>
                <AlertDialogDescription>
                  {sessionPendingDelete
                    ? `This will permanently remove the session starting ${formatDateTime(sessionPendingDelete.starts_at)} and all of its ticket types.`
                    : "This will permanently remove the selected session and all of its ticket types."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    sessionPendingDelete
                      ? handleDeleteSession(sessionPendingDelete)
                      : undefined
                  }
                >
                  Delete session
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>

          <AlertDialog
            open={Boolean(ticketPendingDelete)}
            onOpenChange={(open) => {
              if (!open) {
                setTicketPendingDelete(null);
              }
            }}
          >
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete ticket type?</AlertDialogTitle>
                <AlertDialogDescription>
                  {ticketPendingDelete
                    ? `This will permanently remove ${ticketPendingDelete.ticketType.name} from the ${formatDateTime(ticketPendingDelete.session.starts_at)} session.`
                    : "This will permanently remove the selected ticket type from its session."}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={() =>
                    ticketPendingDelete
                      ? handleDeleteTicketType(
                          ticketPendingDelete.session,
                          ticketPendingDelete.ticketType,
                        )
                      : undefined
                  }
                >
                  Delete ticket type
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </div>
  );
}
