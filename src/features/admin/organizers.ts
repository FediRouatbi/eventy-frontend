import {
  getAdminOrganizer,
  listAdminOrganizers,
} from "#/lib/api/admin";
import type { components } from "#/lib/api/generated/schema";

export type OrganizerAdmin = components["schemas"]["OrganizerAdmin"];
export type OrganizerSummary = {
  id: string;
  name: string;
  slug: string;
  admin_count: number;
  event_count: number;
  session_count: number;
  created_at: string;
  updated_at: string;
};
export type OrganizerListItem = OrganizerSummary & {
  admin: OrganizerAdmin | null;
};
export type OrganizerDetailResponse = {
  organizer: OrganizerListItem;
  events: OrganizerManagedEvent[] | null;
};
export type OrganizerManagedEvent = {
  id: string;
  title: string;
  slug: string;
  status: components["schemas"]["Event"]["status"];
  currency: string;
  city: string;
  country: string;
  session_count: number;
  ticket_type_count: number;
  next_session_starts_at?: string;
  created_at: string;
  updated_at: string;
};

export type OrganizerWorkspace = {
  organizer: OrganizerListItem;
  admin: OrganizerAdmin | null;
  events: OrganizerManagedEvent[];
};

export function sortByLabel<T>(items: T[], getLabel: (item: T) => string) {
  return [...items].sort((left, right) =>
    getLabel(left).localeCompare(getLabel(right)),
  );
}

export function statusBadgeVariant(
  status: string,
): "default" | "secondary" | "outline" {
  switch (status) {
    case "published":
    case "scheduled":
      return "default";
    case "draft":
      return "secondary";
    default:
      return "outline";
  }
}

export async function buildOrganizerWorkspaces(accessToken: string) {
  const organizers = await listAdminOrganizers(accessToken);

  const validOrganizers = (organizers ?? []).filter(
    (organizer): organizer is OrganizerListItem =>
      Boolean(organizer) && typeof organizer.name === "string",
  );

  return sortByLabel(validOrganizers, (organizer) => organizer.name).map(
    (organizer) => {
      return {
        organizer,
        admin: organizer.admin ?? null,
        events: [],
      } satisfies OrganizerWorkspace;
    },
  );
}

export async function getOrganizerWorkspaceDetail(
  accessToken: string,
  organizerId: string,
) {
  const organizerDetail = await getAdminOrganizer(accessToken, organizerId);

  return {
    organizer: organizerDetail.organizer,
    admin: organizerDetail.organizer.admin,
    events: sortByLabel(organizerDetail.events ?? [], (event) => event.title),
  } satisfies OrganizerWorkspace;
}
