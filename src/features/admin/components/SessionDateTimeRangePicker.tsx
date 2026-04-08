import { useMemo, useState } from "react";
import { ChevronDownIcon } from "lucide-react";
import { useController, type Control, type FieldPath, type FieldValues } from "react-hook-form";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import { Input } from "#/components/ui/input";
import { Label } from "#/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { cn } from "#/lib/utils";

type SessionDateTimeRangePickerProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  startName: FieldPath<TFieldValues>;
  endName: FieldPath<TFieldValues>;
  dateLabel?: string;
  fromLabel?: string;
  toLabel?: string;
  disabled?: boolean;
  hasStartError?: boolean;
  hasEndError?: boolean;
};

function parseLocalDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const [datePart, timePart = "00:00"] = value.split("T");
  const [year, month, day] = datePart.split("-").map(Number);
  const [hours, minutes] = timePart.split(":").map(Number);

  if ([year, month, day, hours, minutes].some((part) => Number.isNaN(part))) {
    return undefined;
  }

  return new Date(year, month - 1, day, hours, minutes);
}

function toLocalDateTimeValue(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}T${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function formatButtonDate(date?: Date) {
  return date
    ? date.toLocaleDateString("en-US", {
        month: "2-digit",
        day: "2-digit",
        year: "numeric",
      })
    : "Pick a date";
}

function getTimeValue(date?: Date) {
  if (!date) {
    return "";
  }

  return `${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

function setTime(date: Date, timeValue: string) {
  const [hours, minutes] = timeValue.split(":").map(Number);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) {
    return date;
  }

  const nextDate = new Date(date);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate;
}

export function SessionDateTimeRangePicker<TFieldValues extends FieldValues>({
  control,
  startName,
  endName,
  dateLabel = "Date",
  fromLabel = "From",
  toLabel = "To",
  disabled = false,
  hasStartError = false,
  hasEndError = false,
}: SessionDateTimeRangePickerProps<TFieldValues>) {
  const [open, setOpen] = useState(false);
  const {
    field: startField,
  } = useController({
    control,
    name: startName,
  });
  const {
    field: endField,
  } = useController({
    control,
    name: endName,
  });

  const startDate = parseLocalDateTime(
    typeof startField.value === "string" ? startField.value : "",
  );
  const endDate = parseLocalDateTime(
    typeof endField.value === "string" ? endField.value : "",
  );

  const selectedDate = useMemo(() => startDate ?? endDate, [endDate, startDate]);

  function updateDate(nextDate?: Date) {
    if (!nextDate) {
      startField.onChange("");
      endField.onChange("");
      return;
    }

    const baseStart = startDate ?? new Date(nextDate);
    const baseEnd = endDate ?? new Date(nextDate);

    const nextStart = new Date(baseStart);
    nextStart.setFullYear(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      nextDate.getDate(),
    );

    const nextEnd = new Date(baseEnd);
    nextEnd.setFullYear(
      nextDate.getFullYear(),
      nextDate.getMonth(),
      nextDate.getDate(),
    );

    startField.onChange(toLocalDateTimeValue(nextStart));
    endField.onChange(toLocalDateTimeValue(nextEnd));
    setOpen(false);
  }

  function handleStartTimeChange(value: string) {
    const baseDate = startDate ?? selectedDate ?? new Date();
    startField.onChange(toLocalDateTimeValue(setTime(baseDate, value)));
  }

  function handleEndTimeChange(value: string) {
    const baseDate = endDate ?? selectedDate ?? new Date();
    endField.onChange(toLocalDateTimeValue(setTime(baseDate, value)));
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex w-full flex-col gap-3">
        <Label htmlFor={`${String(startName)}-date`} className="px-1">
          {dateLabel}
        </Label>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              id={`${String(startName)}-date`}
              disabled={disabled}
              className={cn(
                "w-full justify-between font-normal",
                !selectedDate && "text-muted-foreground",
                (hasStartError || hasEndError) &&
                  "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
              )}
            >
              {formatButtonDate(selectedDate)}
              <ChevronDownIcon className="size-4 opacity-70" />
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto overflow-hidden p-0" align="start">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={updateDate}
              initialFocus
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-3">
          <Label htmlFor={`${String(startName)}-time`} className="px-1">
            {fromLabel}
          </Label>
          <Input
            type="time"
            id={`${String(startName)}-time`}
            step="60"
            disabled={disabled}
            value={getTimeValue(startDate)}
            onChange={(event) => handleStartTimeChange(event.target.value)}
            className={cn(
              "bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
              hasStartError &&
                "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            )}
          />
        </div>
        <div className="flex flex-col gap-3">
          <Label htmlFor={`${String(endName)}-time`} className="px-1">
            {toLabel}
          </Label>
          <Input
            type="time"
            id={`${String(endName)}-time`}
            step="60"
            disabled={disabled}
            value={getTimeValue(endDate)}
            onChange={(event) => handleEndTimeChange(event.target.value)}
            className={cn(
              "bg-background appearance-none [&::-webkit-calendar-picker-indicator]:hidden [&::-webkit-calendar-picker-indicator]:appearance-none",
              hasEndError &&
                "border-destructive focus-visible:border-destructive focus-visible:ring-destructive/20",
            )}
          />
        </div>
      </div>
    </div>
  );
}
