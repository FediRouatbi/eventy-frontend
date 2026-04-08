import { formatDateLabel, formatTimeLabel } from "#/features/events/display";

type SessionChipsProps = {
  sessions: Array<{
    id: string;
    starts_at?: string | null;
  }>;
  maxVisible?: number;
  className?: string;
};

export function SessionChips({
  sessions,
  maxVisible = 3,
  className = "",
}: SessionChipsProps) {
  if (sessions.length === 0) {
    return null;
  }

  const visibleSessions = sessions.slice(0, maxVisible);
  const remainingCount = Math.max(sessions.length - visibleSessions.length, 0);

  return (
    <div className={`flex flex-wrap gap-2 ${className}`.trim()}>
      {visibleSessions.map((session) => (
        <span
          key={session.id}
          className="rounded-full border border-border/70 bg-background/85 px-3 py-1.5 text-xs font-medium text-foreground"
          title={`${formatDateLabel(session.starts_at)} at ${formatTimeLabel(
            session.starts_at,
          )}`}
        >
          {formatDateLabel(session.starts_at)}
          <span className="ml-1.5 text-muted-foreground">
            {formatTimeLabel(session.starts_at)}
          </span>
        </span>
      ))}

      {remainingCount > 0 ? (
        <span className="rounded-full border border-dashed border-border/70 bg-background/70 px-3 py-1.5 text-xs font-medium text-muted-foreground">
          +{remainingCount} more sessions
        </span>
      ) : null}
    </div>
  );
}
