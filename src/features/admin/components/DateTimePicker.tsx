import { useEffect, useState } from "react";
import { CalendarIcon } from "@radix-ui/react-icons";
import { format } from "date-fns";
import type {
  Control,
  ControllerProps,
  FieldPath,
  FieldValues,
  ControllerRenderProps,
} from "react-hook-form";

import { Button } from "#/components/ui/button";
import { Calendar } from "#/components/ui/calendar";
import {
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "#/components/ui/form";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "#/components/ui/popover";
import { cn } from "#/lib/utils";

type DateTimePickerProps<TFieldValues extends FieldValues> = {
  control: Control<TFieldValues>;
  name: FieldPath<TFieldValues>;
  label: string;
  description?: string;
  placeholder?: string;
  disabled?: boolean;
  rules?: ControllerProps<TFieldValues, FieldPath<TFieldValues>>["rules"];
  onValueChange?: (value: string) => void;
  allowClear?: boolean;
  defaultTime?: Date;
};

function parseLocalDateTime(value?: string) {
  if (!value) {
    return undefined;
  }

  const [datePart, timePart = "12:00"] = value.split("T");
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

function setHourKeepingPeriod(date: Date, hour12: number) {
  const isPM = date.getHours() >= 12;
  const normalizedHour = hour12 % 12;
  const nextHour = isPM ? normalizedHour + 12 : normalizedHour;

  date.setHours(nextHour);
}

function getPickerOptionClass(isSelected: boolean) {
  return cn(
    "h-10 shrink-0 rounded-xl px-0 transition-colors",
    isSelected
      ? "bg-foreground text-background hover:bg-foreground hover:text-background"
      : "text-foreground hover:bg-muted hover:text-foreground",
  );
}

type DateTimePickerFieldProps<TFieldValues extends FieldValues> = {
  field: ControllerRenderProps<TFieldValues, FieldPath<TFieldValues>>;
  label: string;
  description?: string;
  placeholder: string;
  disabled: boolean;
  onValueChange?: (value: string) => void;
  allowClear: boolean;
  defaultTime?: Date;
};

function DateTimePickerField<TFieldValues extends FieldValues>({
  field,
  label,
  description,
  placeholder,
  disabled,
  onValueChange,
  allowClear,
  defaultTime,
}: DateTimePickerFieldProps<TFieldValues>) {
  const fieldValue = typeof field.value === "string" ? field.value : "";
  const selectedDate = parseLocalDateTime(fieldValue);
  const [open, setOpen] = useState(false);
  const [draftDate, setDraftDate] = useState<Date | undefined>(selectedDate);

  const fallbackDate = defaultTime ? new Date(defaultTime) : new Date();
  const activeDate = open ? draftDate : selectedDate;

  useEffect(() => {
    if (!open) {
      setDraftDate(selectedDate);
    }
  }, [fieldValue, open]);

  function updateValue(nextDate: Date | undefined) {
    const nextValue = nextDate ? toLocalDateTimeValue(nextDate) : "";
    field.onChange(nextValue);
    onValueChange?.(nextValue);
  }

  function handleOpenChange(nextOpen: boolean) {
    if (!nextOpen) {
      updateValue(draftDate);
    }

    if (nextOpen) {
      setDraftDate(selectedDate);
    }

    setOpen(nextOpen);
  }

  function handleDateSelect(date: Date | undefined) {
    if (!date) {
      setDraftDate(undefined);
      return;
    }

    const nextDate = new Date(draftDate ?? selectedDate ?? fallbackDate);
    nextDate.setFullYear(date.getFullYear(), date.getMonth(), date.getDate());
    setDraftDate(nextDate);
  }

  function handleTimeChange(type: "hour" | "minute" | "ampm", value: string) {
    const currentDate = draftDate
      ? new Date(draftDate)
      : selectedDate
        ? new Date(selectedDate)
        : new Date(fallbackDate);

    if (type === "hour") {
      setHourKeepingPeriod(currentDate, Number(value));
    } else if (type === "minute") {
      currentDate.setMinutes(Number(value));
    } else if (type === "ampm") {
      const hours = currentDate.getHours();

      if (value === "AM" && hours >= 12) {
        currentDate.setHours(hours - 12);
      } else if (value === "PM" && hours < 12) {
        currentDate.setHours(hours + 12);
      }
    }

    setDraftDate(currentDate);
  }

  return (
    <FormItem className="flex flex-col">
      <FormLabel>{label}</FormLabel>
      <Popover open={open} onOpenChange={handleOpenChange}>
        <PopoverTrigger asChild>
          <FormControl>
            <Button
              type="button"
              variant="outline"
              disabled={disabled}
              className={cn(
                "w-full pl-3 text-left font-normal",
                !field.value && "text-muted-foreground",
              )}
            >
              {activeDate ? (
                format(activeDate, "MM/dd/yyyy hh:mm aa")
              ) : (
                <span>{placeholder}</span>
              )}
              <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
            </Button>
          </FormControl>
        </PopoverTrigger>
        <PopoverContent
          className="w-[404px] overflow-hidden rounded-2xl p-0 shadow-xl"
          align="start"
        >
          <div className="flex">
            <Calendar
              className="w-[286px] shrink-0 border-r bg-background"
              classNames={{
                selected:
                  "bg-foreground text-background hover:bg-foreground hover:text-background focus:bg-foreground focus:text-background",
                today: "bg-muted text-foreground",
                day_button: cn(
                  "size-9 rounded-xl p-0 font-normal",
                  "aria-selected:bg-foreground aria-selected:text-background",
                ),
              }}
              mode="single"
              selected={activeDate}
              onSelect={handleDateSelect}
              initialFocus
            />
            <div className="flex h-[322px] shrink-0 bg-background">
              <div className="h-full w-[56px] overflow-y-auto border-r [scrollbar-width:thin]">
                <div className="flex min-h-full flex-col items-center gap-1 px-2 py-3">
                  {Array.from({ length: 12 }, (_, i) => i + 1)
                    .reverse()
                    .map((hour) => (
                      <Button
                        key={hour}
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                          getPickerOptionClass(
                            Boolean(
                              activeDate &&
                                activeDate.getHours() % 12 === hour % 12,
                            ),
                          ),
                          "w-10",
                        )}
                        onClick={() =>
                          handleTimeChange("hour", hour.toString())
                        }
                      >
                        {hour}
                      </Button>
                    ))}
                </div>
              </div>
              <div className="h-full w-[56px] overflow-y-auto border-r [scrollbar-width:thin]">
                <div className="flex min-h-full flex-col items-center gap-1 px-2 py-3">
                  {Array.from({ length: 12 }, (_, i) => i * 5).map(
                    (minute) => (
                      <Button
                        key={minute}
                        type="button"
                        size="icon"
                        variant="ghost"
                        className={cn(
                          getPickerOptionClass(
                            Boolean(
                              activeDate &&
                                activeDate.getMinutes() === minute,
                            ),
                          ),
                          "w-10",
                        )}
                        onClick={() =>
                          handleTimeChange("minute", minute.toString())
                        }
                      >
                        {minute.toString().padStart(2, "0")}
                      </Button>
                    ),
                  )}
                </div>
              </div>
              <div className="flex w-[62px] flex-col items-center gap-2 px-2 py-3">
                  {["AM", "PM"].map((ampm) => (
                    <Button
                      key={ampm}
                      type="button"
                      size="sm"
                      variant="ghost"
                      className={cn(
                        getPickerOptionClass(
                          Boolean(
                            activeDate &&
                              ((ampm === "AM" &&
                                activeDate.getHours() < 12) ||
                                (ampm === "PM" &&
                                  activeDate.getHours() >= 12)),
                          ),
                        ),
                        "w-10 px-0 text-xs",
                      )}
                      onClick={() => handleTimeChange("ampm", ampm)}
                    >
                      {ampm}
                    </Button>
                  ))}
              </div>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      {allowClear && field.value ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit rounded-full text-muted-foreground"
          onClick={() => {
            setDraftDate(undefined);
            updateValue(undefined);
          }}
        >
          Clear
        </Button>
      ) : null}
      {description ? <FormDescription>{description}</FormDescription> : null}
      <FormMessage />
    </FormItem>
  );
}

export function DateTimePicker<TFieldValues extends FieldValues>({
  control,
  name,
  label,
  description,
  placeholder = "MM/DD/YYYY hh:mm aa",
  disabled = false,
  rules,
  onValueChange,
  allowClear = false,
  defaultTime,
}: DateTimePickerProps<TFieldValues>) {
  return (
    <FormField
      control={control}
      name={name}
      rules={rules}
      render={({ field }) => (
        <DateTimePickerField
          field={field}
          label={label}
          description={description}
          placeholder={placeholder}
          disabled={disabled}
          onValueChange={onValueChange}
          allowClear={allowClear}
          defaultTime={defaultTime}
        />
      )}
    />
  );
}
