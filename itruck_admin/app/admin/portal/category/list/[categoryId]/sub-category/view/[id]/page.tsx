// app/admin/portal/category/list/[categoryId]/sub-category/view/[id]/page.tsx

"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Skeleton from "@mui/material/Skeleton";
import Tooltip from "@mui/material/Tooltip";
import IconButton from "@mui/material/IconButton";
import Divider from "@mui/material/Divider";
import Avatar from "@mui/material/Avatar";
import Stack from "@mui/material/Stack";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import ArrowBackOutlinedIcon from "@mui/icons-material/ArrowBackOutlined";
import ContentCopyIcon from "@mui/icons-material/ContentCopy";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import HistoryOutlinedIcon from "@mui/icons-material/HistoryOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import AccountTreeOutlinedIcon from "@mui/icons-material/AccountTreeOutlined";
import CategoryOutlinedIcon from "@mui/icons-material/CategoryOutlined";
import PersonOutlinedIcon from "@mui/icons-material/PersonOutlined";

import {
  type SubCategory,
  getSubCategory,
  getSubCategoryRowId,
} from "@/model/services/sub-category";
import { PageHeader } from "@/components/ui";
import { routes } from "@/lib/routes";

type Props = {
  params: Promise<{ categoryId: string; id: string }>;
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

function CopyText({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
      <Typography
        sx={{
          fontFamily: "monospace",
          fontSize: "0.8rem",
          color: "text.secondary",
          wordBreak: "break-all",
        }}
      >
        {value}
      </Typography>
      <Tooltip title={copied ? "Copied!" : "Copy"}>
        <IconButton size="small" onClick={copy}>
          {copied ? (
            <CheckCircleOutlineIcon
              sx={{ fontSize: 14, color: "success.main" }}
            />
          ) : (
            <ContentCopyIcon sx={{ fontSize: 14, color: "action.disabled" }} />
          )}
        </IconButton>
      </Tooltip>
    </Box>
  );
}

function ProfilePanel({
  item,
  categoryId,
  onEdit,
  onBack,
}: {
  item: SubCategory;
  categoryId: string;
  onEdit: () => void;
  onBack: () => void;
}) {
  const initials = (item.sub_category_name || "S")
    .split(" ")
    .map((w: string) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const statusColor =
    item.status?.toLowerCase() === "active" ? "success" : "default";
  const categoryName = item.category?.category_name || "—";

  return (
    <Box
      sx={{
        width: 280,
        flexShrink: 0,
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
      }}
    >
      <Box
        sx={{
          height: 90,
          background: "linear-gradient(135deg, #be185d 0%, #ec4899 100%)",
          flexShrink: 0,
        }}
      />

      <Box sx={{ px: 3, pb: 3, mt: "-36px" }}>
        <Avatar
          sx={{
            width: 72,
            height: 72,
            bgcolor: "white",
            color: "error.main",
            fontSize: "1.4rem",
            fontWeight: 800,
            border: "3px solid white",
            boxShadow: "0 2px 12px rgba(0,0,0,0.12)",
            mb: 1.5,
          }}
        >
          {initials}
        </Avatar>
        <Typography
          variant="h6"
          fontWeight={700}
          sx={{ lineHeight: 1.3, mb: 0.5 }}
        >
          {item.sub_category_name || "—"}
        </Typography>
        <Chip
          label={item.status || "unknown"}
          color={statusColor as any}
          size="small"
          sx={{ fontWeight: 700, textTransform: "capitalize", borderRadius: 1 }}
        />
      </Box>

      <Divider />

      <Box sx={{ px: 3, py: 2.5, flex: 1 }}>
        <Typography
          variant="caption"
          sx={{
            fontWeight: 700,
            color: "text.disabled",
            textTransform: "uppercase",
            letterSpacing: 0.8,
          }}
        >
          Quick Info
        </Typography>

        <Stack spacing={2} sx={{ mt: 2 }}>
          {[
            { label: "Parent Category", value: categoryName },
            { label: "Created By", value: item.created_by || "—" },
            { label: "Updated By", value: item.updated_by || "—" },
          ].map(({ label, value }) => (
            <Box key={label}>
              <Typography
                variant="caption"
                color="text.disabled"
                fontWeight={600}
                sx={{
                  textTransform: "uppercase",
                  letterSpacing: 0.5,
                  fontSize: "0.65rem",
                }}
              >
                {label}
              </Typography>
              <Typography
                variant="body2"
                fontWeight={600}
                color="text.primary"
                sx={{ mt: 0.25 }}
              >
                {value}
              </Typography>
            </Box>
          ))}
        </Stack>
      </Box>

      <Divider />

      <Box sx={{ p: 2.5, display: "flex", flexDirection: "column", gap: 1 }}>
        <Button
          fullWidth
          variant="contained"
          startIcon={<EditOutlinedIcon />}
          onClick={onEdit}
          size="small"
          sx={{ bgcolor: "#be185d", "&:hover": { bgcolor: "#9d174d" } }}
        >
          Edit Sub-Category
        </Button>
        <Button
          fullWidth
          variant="outlined"
          startIcon={<ArrowBackOutlinedIcon />}
          onClick={onBack}
          size="small"
        >
          Back to List
        </Button>
      </Box>
    </Box>
  );
}

function DetailRow({
  icon,
  label,
  children,
}: {
  icon: React.ReactNode;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: "200px 1fr",
        alignItems: "center",
        py: 2,
        px: 3,
        "&:not(:last-child)": {
          borderBottom: "1px solid",
          borderColor: "divider",
        },
        "&:hover": { bgcolor: "grey.50" },
        transition: "background 0.1s",
        gap: 2,
      }}
    >
      <Box sx={{ display: "flex", alignItems: "center", gap: 1.5 }}>
        <Box sx={{ "& svg": { fontSize: 18, color: "text.disabled" } }}>
          {icon}
        </Box>
        <Typography variant="body2" color="text.secondary" fontWeight={600}>
          {label}
        </Typography>
      </Box>
      <Box>{children}</Box>
    </Box>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        bgcolor: "background.paper",
        border: "1px solid",
        borderColor: "divider",
        borderRadius: 3,
        overflow: "hidden",
        mb: 2.5,
      }}
    >
      <Box
        sx={{
          px: 3,
          py: 2,
          borderBottom: "1px solid",
          borderColor: "divider",
          bgcolor: "grey.50",
        }}
      >
        <Typography variant="subtitle2" fontWeight={700}>
          {title}
        </Typography>
      </Box>
      {children}
    </Box>
  );
}

export default function SubCategoryViewPage({ params }: Props) {
  const { categoryId, id } = use(params);
  const router = useRouter();

  const [item, setItem] = useState<SubCategory | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id || !categoryId) {
      router.replace(routes.subCategory.list(categoryId));
      return;
    }
    getSubCategory(id)
      .then(setItem)
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id, categoryId, router]);

  if (loading) {
    return (
      <Box>
        <Box sx={{ mb: 3 }}>
          <Skeleton width={200} height={36} />
          <Skeleton width={120} height={20} sx={{ mt: 0.5 }} />
        </Box>
        <Box sx={{ display: "flex", gap: 3 }}>
          <Skeleton
            variant="rounded"
            width={280}
            height={460}
            sx={{ borderRadius: 3, flexShrink: 0 }}
          />
          <Box sx={{ flex: 1 }}>
            <Skeleton
              variant="rounded"
              height={180}
              sx={{ borderRadius: 3, mb: 2.5 }}
            />
            <Skeleton variant="rounded" height={200} sx={{ borderRadius: 3 }} />
          </Box>
        </Box>
      </Box>
    );
  }

  if (!item)
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error" sx={{ mb: 2 }}>
          {error || "Sub-category not found."}
        </Alert>
        <Button
          startIcon={<ArrowBackOutlinedIcon />}
          variant="outlined"
          onClick={() => router.push(routes.subCategory.list(categoryId))}
        >
          Back to list
        </Button>
      </Box>
    );

  const rowId = getSubCategoryRowId(item);
  const statusColor =
    item.status?.toLowerCase() === "active" ? "success" : "default";

  return (
    <Box>
      <PageHeader
        title={item.sub_category_name}
        subtitle="Sub-category details"
        action={
          <Box sx={{ display: "flex", gap: 1 }}>
            <Button
              variant="contained"
              startIcon={<EditOutlinedIcon />}
              sx={{ bgcolor: "#be185d", "&:hover": { bgcolor: "#9d174d" } }}
              onClick={() =>
                router.push(routes.subCategory.edit(categoryId, rowId))
              }
            >
              Edit
            </Button>
            <Button
              variant="outlined"
              startIcon={<ArrowBackOutlinedIcon />}
              onClick={() => router.push(routes.subCategory.list(categoryId))}
            >
              Back
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      <Box sx={{ display: "flex", gap: 3, alignItems: "flex-start" }}>
        <ProfilePanel
          item={item}
          categoryId={categoryId}
          onEdit={() => router.push(routes.subCategory.edit(categoryId, rowId))}
          onBack={() => router.push(routes.subCategory.list(categoryId))}
        />

        <Box sx={{ flex: 1, minWidth: 0 }}>
          <Section title="Sub-Category Details">
            <DetailRow
              icon={<AccountTreeOutlinedIcon />}
              label="Sub-Category Name"
            >
              <Typography variant="body2" fontWeight={700}>
                {item.sub_category_name}
              </Typography>
            </DetailRow>
            <DetailRow icon={<CategoryOutlinedIcon />} label="Parent Category">
              <Typography variant="body2" fontWeight={600}>
                {item.category?.category_name || item.category_id || "—"}
              </Typography>
            </DetailRow>
            <DetailRow icon={<TagOutlinedIcon />} label="Status">
              <Chip
                size="small"
                label={item.status || "unknown"}
                color={statusColor as any}
                sx={{
                  fontWeight: 700,
                  textTransform: "capitalize",
                  borderRadius: 1,
                }}
              />
            </DetailRow>
          </Section>

          <Section title="Audit Information">
            <DetailRow icon={<PersonOutlinedIcon />} label="Created By">
              <Typography variant="body2" fontWeight={600}>
                {item.created_by || "—"}
              </Typography>
            </DetailRow>
            <DetailRow icon={<PersonOutlinedIcon />} label="Updated By">
              <Typography variant="body2" fontWeight={600}>
                {item.updated_by || "—"}
              </Typography>
            </DetailRow>
            <DetailRow icon={<CalendarMonthOutlinedIcon />} label="Created At">
              <Typography variant="body2" fontWeight={600}>
                {formatDate(item.createdAt)}
              </Typography>
            </DetailRow>
            <DetailRow icon={<HistoryOutlinedIcon />} label="Last Updated">
              <Typography variant="body2" fontWeight={600}>
                {formatDate(item.updatedAt)}
              </Typography>
            </DetailRow>
          </Section>

          <Section title="Record Information">
            <DetailRow icon={<TagOutlinedIcon />} label="Record ID">
              <CopyText value={item.id || item.uuid || item._id || "—"} />
            </DetailRow>
            <DetailRow icon={<TagOutlinedIcon />} label="Internal ID">
              <CopyText value={item._id || "—"} />
            </DetailRow>
          </Section>
        </Box>
      </Box>
    </Box>
  );
}
