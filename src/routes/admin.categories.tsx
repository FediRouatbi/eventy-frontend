import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { LoaderCircle, Pencil, Plus, Search, Tag, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";

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
  AdminEmptyState,
  AdminKpiStrip,
  AdminLoadingGrid,
  AdminPageHeader,
  AdminSectionCard,
} from "#/features/admin/components/AdminSurface";
import { isSuperAdminSession } from "#/features/admin/auth";
import {
  createCategory,
  deleteCategory,
  listAdminCategories,
  updateCategory,
} from "#/lib/api/admin";
import { useAuthSession } from "#/lib/auth";
import type { components } from "#/lib/api/generated/schema";

type Category = components["schemas"]["Category"];

type CategoryFormValues = {
  name: string;
  slug: string;
  description: string;
  image_url: string;
};

export const Route = createFileRoute("/admin/categories")({
  validateSearch: (search: Record<string, unknown>) => ({
    q: typeof search.q === "string" ? search.q : "",
  }),
  component: AdminCategoriesPage,
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

function AdminCategoriesPage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const session = useAuthSession();
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSheetOpen, setIsSheetOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [categoryPendingDelete, setCategoryPendingDelete] = useState<Category | null>(null);
  const [deletingCategoryId, setDeletingCategoryId] = useState<string | null>(null);

  const categoryForm = useForm<CategoryFormValues>({
    mode: "onSubmit",
    defaultValues: {
      name: "",
      slug: "",
      description: "",
      image_url: "",
    },
  });
  const categoryFormErrors = categoryForm.formState.errors;
  const query = search.q;

  useEffect(() => {
    if (!session) {
      return;
    }

    if (!isSuperAdminSession(session)) {
      navigate({ to: "/admin" });
      return;
    }

    async function loadCategories() {
      setIsLoading(true);
      setLoadError("");

      try {
        setCategories(await listAdminCategories(session.access_token));
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to load categories";
        setLoadError(message);
        toast.error("Failed to load categories", {
          description: message,
        });
      } finally {
        setIsLoading(false);
      }
    }

    loadCategories();
  }, [navigate, session]);

  const filteredCategories = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    if (!normalizedQuery) {
      return categories;
    }

    return categories.filter((category) =>
      [category.name, category.slug, category.description ?? ""]
        .join(" ")
        .toLowerCase()
        .includes(normalizedQuery),
    );
  }, [categories, search.q]);

  const categoriesWithImages = categories.filter((category) => category.image_url).length;

  function updateQuery(value: string) {
    navigate({
      to: "/admin/categories",
      search: (previous) => ({
        ...previous,
        q: value || "",
      }),
      replace: true,
    });
  }

  function openCreateSheet() {
    setEditingCategory(null);
    categoryForm.reset({
      name: "",
      slug: "",
      description: "",
      image_url: "",
    });
    setIsSheetOpen(true);
  }

  function openEditSheet(category: Category) {
    setEditingCategory(category);
    categoryForm.reset({
      name: category.name,
      slug: category.slug,
      description: category.description ?? "",
      image_url: category.image_url ?? "",
    });
    setIsSheetOpen(true);
  }

  async function handleUpsertCategory(values: CategoryFormValues) {
    if (!session) {
      return;
    }

    setIsSubmitting(true);

    try {
      const payload = {
        name: values.name.trim(),
        slug: values.slug.trim(),
        description: values.description.trim() || undefined,
        image_url: values.image_url.trim() || undefined,
      };

      if (editingCategory) {
        const updated = await updateCategory(
          session.access_token,
          String(editingCategory.id),
          payload,
        );

        setCategories((current) =>
          [...current]
            .map((category) =>
              String(category.id) === String(updated.id) ? updated : category,
            )
            .sort((left, right) => left.name.localeCompare(right.name)),
        );
        toast.success("Category updated", {
          description: `${updated.name} is saved and ready for discovery.`,
        });
      } else {
        const created = await createCategory(session.access_token, payload);
        setCategories((current) =>
          [created, ...current].sort((left, right) =>
            left.name.localeCompare(right.name),
          ),
        );
        toast.success("Category created", {
          description: `${created.name} is now available for event setup.`,
        });
      }

      setIsSheetOpen(false);
      setEditingCategory(null);
      categoryForm.reset();
    } catch (error) {
      toast.error(
        editingCategory ? "Failed to update category" : "Failed to create category",
        {
          description:
            error instanceof Error ? error.message : "Please try again.",
        },
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteCategory() {
    if (!session || !categoryPendingDelete) {
      return;
    }

    setDeletingCategoryId(String(categoryPendingDelete.id));

    try {
      await deleteCategory(session.access_token, String(categoryPendingDelete.id));
      setCategories((current) =>
        current.filter(
          (category) => String(category.id) !== String(categoryPendingDelete.id),
        ),
      );
      toast.success("Category deleted", {
        description: `${categoryPendingDelete.name} has been removed.`,
      });
      setCategoryPendingDelete(null);
    } catch (error) {
      toast.error("Failed to delete category", {
        description:
          error instanceof Error ? error.message : "Please try again.",
      });
    } finally {
      setDeletingCategoryId(null);
    }
  }

  return (
    <div className="space-y-6 lg:space-y-8">
      <AdminPageHeader
        badge="Categories"
        title="Category management"
        description="Manage discovery categories from one compact surface, with fast editing, cleaner scanning, and URL-persistent filters."
      />

      {loadError ? <InlineError message={loadError} /> : null}

      <AdminKpiStrip
        items={[
          { label: "Total", value: categories.length },
          { label: "With images", value: categoriesWithImages },
          { label: "Search results", value: filteredCategories.length },
        ]}
      />

      <AdminSectionCard
        title="Discovery lanes"
        description="Edit labels, slugs, and artwork without recreating categories."
        actions={
          <>
              <div className="relative min-w-[240px]">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(event) => updateQuery(event.target.value)}
                  placeholder="Search categories"
                  className="pl-9"
                />
              </div>
              <Sheet
                open={isSheetOpen}
                onOpenChange={(open) => {
                  setIsSheetOpen(open);
                  if (!open) {
                    setEditingCategory(null);
                    categoryForm.reset();
                  }
                }}
              >
                <SheetTrigger asChild>
                  <Button className="rounded-full" onClick={openCreateSheet}>
                    <Plus className="size-4" />
                    New category
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="sm:max-w-xl">
                  <SheetHeader>
                    <SheetTitle>
                      {editingCategory ? "Edit category" : "Create category"}
                    </SheetTitle>
                    <SheetDescription>
                      {editingCategory
                        ? "Update discovery copy and presentation details."
                        : "Add a new discovery lane for the client app."}
                    </SheetDescription>
                  </SheetHeader>
                  <form
                    className="flex h-full flex-col"
                    onSubmit={categoryForm.handleSubmit(handleUpsertCategory)}
                  >
                    <div className="space-y-5 overflow-y-auto py-6 pr-1">
                      <div className="space-y-2">
                        <Label htmlFor="category-name">Name</Label>
                        <Input
                          id="category-name"
                          className={getInvalidFieldClass(
                            Boolean(categoryFormErrors.name),
                          )}
                          {...categoryForm.register("name", {
                            required: "Name is required",
                          })}
                        />
                        <FieldError message={categoryFormErrors.name?.message} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category-slug">Slug</Label>
                        <Input
                          id="category-slug"
                          className={getInvalidFieldClass(
                            Boolean(categoryFormErrors.slug),
                          )}
                          {...categoryForm.register("slug", {
                            required: "Slug is required",
                            pattern: {
                              value: /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
                              message:
                                "Use lowercase letters, numbers, and hyphens only",
                            },
                          })}
                        />
                        <FieldError message={categoryFormErrors.slug?.message} />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category-description">Description</Label>
                        <Textarea
                          id="category-description"
                          className="min-h-32"
                          {...categoryForm.register("description")}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="category-image">Image URL</Label>
                        <Input
                          id="category-image"
                          className={getInvalidFieldClass(
                            Boolean(categoryFormErrors.image_url),
                          )}
                          {...categoryForm.register("image_url", {
                            pattern: {
                              value: /^$|^https?:\/\/.+/i,
                              message:
                                "Image URL must start with http:// or https://",
                            },
                          })}
                        />
                        <FieldError
                          message={categoryFormErrors.image_url?.message}
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
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <>
                            <LoaderCircle className="size-4 animate-spin" />
                            {editingCategory ? "Saving category" : "Creating category"}
                          </>
                        ) : editingCategory ? (
                          "Save category"
                        ) : (
                          "Create category"
                        )}
                      </Button>
                    </SheetFooter>
                  </form>
                </SheetContent>
              </Sheet>
          </>
        }
      >
          {isLoading ? (
            <AdminLoadingGrid rows={3} />
          ) : filteredCategories.length === 0 ? (
            <AdminEmptyState
              title={
                categories.length === 0
                  ? "No categories yet"
                  : "No categories match this search"
              }
              description={
                categories.length === 0
                  ? "Create the first discovery category to help people browse events."
                  : "Try a different name, slug, or description search."
              }
            />
          ) : (
            filteredCategories.map((category) => (
              <Card
                key={category.id}
                className="rounded-[1.5rem] border-border/70 bg-background/65 shadow-none"
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 space-y-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="text-lg font-semibold text-foreground">
                          {category.name}
                        </p>
                        <Badge variant="outline" className="rounded-full">
                          {category.slug}
                        </Badge>
                        {category.image_url ? (
                          <Badge variant="secondary" className="rounded-full">
                            Image linked
                          </Badge>
                        ) : null}
                      </div>
                      <p className="max-w-3xl text-sm leading-6 text-muted-foreground">
                        {category.description || "No category description yet."}
                      </p>
                      <div className="flex flex-wrap gap-5 text-sm text-muted-foreground">
                        <span>Created {formatDate(category.created_at)}</span>
                        <span>Updated {formatDate(category.updated_at)}</span>
                      </div>
                    </div>

                    <div className="flex shrink-0 gap-2">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-full"
                        onClick={() => openEditSheet(category)}
                      >
                        <Pencil className="size-4" />
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-full text-destructive hover:bg-destructive/10 hover:text-destructive"
                        disabled={deletingCategoryId === String(category.id)}
                        onClick={() => setCategoryPendingDelete(category)}
                      >
                        {deletingCategoryId === String(category.id) ? (
                          <LoaderCircle className="size-4 animate-spin" />
                        ) : (
                          <Trash2 className="size-4" />
                        )}
                        Delete
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
      </AdminSectionCard>

      <AlertDialog
        open={Boolean(categoryPendingDelete)}
        onOpenChange={(open) => {
          if (!open) {
            setCategoryPendingDelete(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete category?</AlertDialogTitle>
            <AlertDialogDescription>
              {categoryPendingDelete
                ? `This removes ${categoryPendingDelete.name}. If any events still use it, deletion will be blocked.`
                : "This category will be removed if it is no longer used by events."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory}>
              Delete category
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
