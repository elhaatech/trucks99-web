"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import Chip from "@mui/material/Chip";
import Link from "@mui/material/Link";
import Typography from "@mui/material/Typography";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import PhoneOutlinedIcon from "@mui/icons-material/PhoneOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import AttachFileOutlinedIcon from "@mui/icons-material/AttachFileOutlined";
import TagOutlinedIcon from "@mui/icons-material/TagOutlined";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import DescriptionOutlinedIcon from "@mui/icons-material/DescriptionOutlined";
import MarkEmailReadOutlinedIcon from "@mui/icons-material/MarkEmailReadOutlined";
import TaskAltOutlinedIcon from "@mui/icons-material/TaskAltOutlined";

import {
  BackButton,
  DetailField,
  ModulePageLayout,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { Skeleton } from "@/components/ui/Skeleton";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect } from "@/lib/navigation";
import { useNotification } from "@/hooks/useNotification";
import { canModuleAction } from "@/lib/permissions";
import { getCurrentUser, type User } from "@/model/api";
import {
  getContactEnquiry,
  resolveContactAttachmentUrl,
  updateContactEnquiryStatus,
  type ContactEnquiry,
} from "@/model/services/contact";

function formatDate(iso?: string) {
  if (!iso) return "Not available";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}

const STATUS_COLOR: Record<string, "warning" | "info" | "success" | "default"> = {
  new: "warning",
  read: "info",
  closed: "success",
};

export default function EnquiryViewPage() {
  const params = useParams();
  const { notify } = useNotification();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.enquiry.list());

  const [item, setItem] = useState<ContactEnquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [currentUser, setCurrentUser] = useState<User | null>(null);

  const load = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    try {
      const enquiry = await getContactEnquiry(id);
      setItem(enquiry);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load");
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
    getCurrentUser()
      .then((u) => setCurrentUser(u as User))
      .catch(() => setCurrentUser(null));
  }, [load]);

  const canEdit = canModuleAction(currentUser?.role, "contact_enquiry", "update");
  const status = String(item?.status || "new").toLowerCase();
  const attachmentUrl = resolveContactAttachmentUrl(item?.attachment);

  const setStatus = async (next: "read" | "closed") => {
    if (!id) return;
    try {
      const updated = await updateContactEnquiryStatus(id, next);
      setItem(updated);
      notify({ type: "success", message: `Enquiry marked as ${next}.` });
    } catch (err) {
      notify({
        type: "error",
        message: err instanceof Error ? err.message : "Status update failed",
      });
    }
  };

  if (!hasValidId) return null;

  if (loading) {
    return (
      <ModulePageLayout
        title="Enquiry"
        subtitle="Loading enquiry details…"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Enquiry", href: routes.enquiry.list() },
          { label: "Details" },
        ]}
        backButton={<BackButton fallback={routes.enquiry.list()} />}
        showAds={false}
      >
        <ViewPageSection title="Enquiry details">
          <ViewDetailGrid>
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} variant="rounded" height={72} />
            ))}
          </ViewDetailGrid>
        </ViewPageSection>
      </ModulePageLayout>
    );
  }

  if (!item) {
    return (
      <ModulePageLayout
        title="Enquiry"
        subtitle="Enquiry not found"
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Enquiry", href: routes.enquiry.list() },
          { label: "Not found" },
        ]}
        backButton={<BackButton fallback={routes.enquiry.list()} />}
        showAds={false}
      >
        <Alert severity="error">Enquiry not found.</Alert>
      </ModulePageLayout>
    );
  }

  return (
    <ModulePageLayout
      title={item.name}
      subtitle="Contact form submission"
      breadcrumbs={[
        { label: "Dashboard", href: routes.dashboard() },
        { label: "Enquiry", href: routes.enquiry.list() },
        { label: item.name },
      ]}
      backButton={<BackButton fallback={routes.enquiry.list()} />}
      error={error}
      onErrorClose={() => setError("")}
      showAds={false}
      action={
        canEdit ? (
          <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap" }}>
            {status !== "read" ? (
              <Button
                variant="outlined"
                startIcon={<MarkEmailReadOutlinedIcon />}
                onClick={() => void setStatus("read")}
              >
                Mark read
              </Button>
            ) : null}
            {status !== "closed" ? (
              <Button
                variant="contained"
                startIcon={<TaskAltOutlinedIcon />}
                onClick={() => void setStatus("closed")}
              >
                Mark closed
              </Button>
            ) : null}
          </Box>
        ) : undefined
      }
    >
      <ViewPageSection title="Contact details">
        <ViewDetailGrid>
          <DetailField
            label="Name"
            icon={<PersonOutlineOutlinedIcon />}
            value={item.name}
          />
          <DetailField
            label="Mobile"
            icon={<PhoneOutlinedIcon />}
            value={
              item.mobile ? (
                <Link href={`tel:${item.mobile}`}>{item.mobile}</Link>
              ) : (
                "—"
              )
            }
          />
          <DetailField
            label="Email"
            icon={<EmailOutlinedIcon />}
            value={
              item.email ? (
                <Link href={`mailto:${item.email}`}>{item.email}</Link>
              ) : (
                "—"
              )
            }
          />
          <DetailField
            label="Status"
            icon={<TagOutlinedIcon />}
            value={
              <Chip
                size="small"
                label={status}
                color={STATUS_COLOR[status] || "default"}
              />
            }
          />
          <DetailField
            label="Submitted"
            icon={<CalendarMonthOutlinedIcon />}
            value={formatDate(item.createdAt)}
          />
          <DetailField
            label="Attachment"
            icon={<AttachFileOutlinedIcon />}
            value={
              attachmentUrl ? (
                <Link href={attachmentUrl} target="_blank" rel="noopener noreferrer">
                  Open attachment
                </Link>
              ) : (
                "None"
              )
            }
          />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection title="Message" subtitle="What the user wrote">
        <Box sx={{ display: "flex", gap: 1.5, alignItems: "flex-start" }}>
          <DescriptionOutlinedIcon color="action" />
          <Typography sx={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>
            {item.message || "—"}
          </Typography>
        </Box>
      </ViewPageSection>
    </ModulePageLayout>
  );
}
