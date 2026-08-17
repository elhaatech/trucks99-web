"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Chip from "@mui/material/Chip";
import Avatar from "@mui/material/Avatar";
import Alert from "@mui/material/Alert";
import Tooltip from "@mui/material/Tooltip";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import EditOutlinedIcon from "@mui/icons-material/EditOutlined";
import VisibilityOutlinedIcon from "@mui/icons-material/VisibilityOutlined";
import ShieldOutlinedIcon from "@mui/icons-material/ShieldOutlined";
import GroupOutlinedIcon from "@mui/icons-material/GroupOutlined";
import InfoOutlinedIcon from "@mui/icons-material/InfoOutlined";
import CheckBoxOutlinedIcon from "@mui/icons-material/CheckBoxOutlined";
import CheckBoxOutlineBlankIcon from "@mui/icons-material/CheckBoxOutlineBlank";
import { alpha, useTheme } from "@mui/material/styles";
import {
  getRoles,
  getRowId,
  getUserAll,
  type Role,
  type User,
} from "@/model/api";
import { routes } from "@/lib/routes";
import { useInvalidIdRedirect } from "@/lib/navigation";
import {
  BackButton,
  DetailField,
  ViewDetailGrid,
  ViewPageSection,
} from "@/components/common";
import { PageContainer, PageHeader, Spinner } from "@/components/ui";

// ── Types ────────────────────────────────────────────────────────────────────

interface NormalisedPermission {
  display_name: string;
  title_name: string;
  access: {
    view: boolean;
    create: boolean;
    edit: boolean;
    delete: boolean;
    list: boolean;
  };
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function normalisePermissions(permissions: any): NormalisedPermission[] {
  const arr = Array.isArray(permissions)
    ? permissions
    : Array.isArray(permissions?.permissions)
      ? permissions.permissions
      : null;

  if (!arr) return [];

  return arr.map((p: any) => ({
    title_name: p.title_name || "",
    display_name: p.display_name || p.title_name || "Unknown",
    access: {
      create: Boolean(p.access?.create),
      view: Boolean(p.access?.view),
      edit: Boolean(p.access?.edit ?? p.access?.update),
      delete: Boolean(p.access?.delete),
      list: Boolean(p.access?.list),
    },
  }));
}

// ── Permission tick icon ──────────────────────────────────────────────────────

const ACCESS_COLS: {
  key: keyof NormalisedPermission["access"];
  label: string;
  activeColor: string;
  activeBg: string;
}[] = [
  { key: "view",   label: "View",   activeColor: "#1565C0", activeBg: "#E3F2FD" },
  { key: "create", label: "Create", activeColor: "#2E7D32", activeBg: "#E8F5E9" },
  { key: "edit",   label: "Edit",   activeColor: "#E65100", activeBg: "#FFF3E0" },
  { key: "delete", label: "Delete", activeColor: "#B71C1C", activeBg: "#FFEBEE" },
];

function PermIcon({ active, activeColor }: { active: boolean; activeColor: string }) {
  if (active)
    return <CheckBoxOutlinedIcon sx={{ fontSize: 19, color: activeColor }} />;
  return <CheckBoxOutlineBlankIcon sx={{ fontSize: 19, color: "action.disabled" }} />;
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function RoleViewPage() {
  const router = useRouter();
  const theme = useTheme();
  const params = useParams();
  const id = typeof params?.id === "string" ? params.id : "";
  const hasValidId = useInvalidIdRedirect(id, routes.role.list());

  const [role, setRole] = useState<Role | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!id) return;
    Promise.all([getRoles(), getUserAll()])
      .then(([roles, allUsers]) => {
        const r = roles.find((x) => getRowId(x) === id || x._id === id);
        setRole(r ?? null);
        if (r) {
          const roleMongoId = r._id;
          const roleUuid = getRowId(r);
          const matched = allUsers.filter((u) => {
            const roleRef = (u.role ?? u.roleId) as any;
            if (!roleRef) return false;
            if (typeof roleRef === "string") {
              return roleRef === roleMongoId || roleRef === roleUuid;
            }
            return (
              roleRef._id === roleMongoId ||
              roleRef.id === roleUuid ||
              roleRef._id === roleUuid ||
              roleRef.id === roleMongoId
            );
          });
          setUsers(matched);
        }
      })
      .catch((err) =>
        setError(err instanceof Error ? err.message : "Failed to load"),
      )
      .finally(() => setLoading(false));
  }, [id]);

  if (!hasValidId) {
    return null;
  }

  if (loading && !role)
    return (
      <PageContainer>
        <Spinner label="Loading role…" fullHeight />
      </PageContainer>
    );

  if (!role)
    return (
      <PageContainer maxWidth={800}>
        <Alert severity="error" sx={{ mb: 2.5 }}>
          Role not found.
        </Alert>
        <BackButton fallback={routes.role.list()} label="Back to list" />
      </PageContainer>
    );

  const perms = normalisePermissions(role.permissions);
  const totalPermissions = perms.length;
  const activePermissions = perms.filter(
    (p) => p.access.create || p.access.view || p.access.edit || p.access.delete,
  ).length;

  return (
    <PageContainer>
      <PageHeader
        title={role.name}
        subtitle={role.description || "Role details, permissions, and assigned users."}
        breadcrumbs={[
          { label: "Dashboard", href: routes.dashboard() },
          { label: "Roles", href: routes.role.list() },
          { label: role.name },
        ]}
        backButton={<BackButton fallback={routes.role.list()} />}
        action={
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 1, alignItems: "center" }}>
            <Chip
              label={role.status ?? "user"}
              size="small"
              sx={{
                height: 24,
                fontWeight: 700,
                textTransform: "capitalize",
                bgcolor: role.status === "admin" ? "#EDE7F6" : "#E3F2FD",
                color: role.status === "admin" ? "#5E35B1" : "#1565C0",
              }}
            />
            <Button
              variant="contained"
              size="small"
              startIcon={<EditOutlinedIcon />}
              onClick={() => router.push(routes.role.edit(id))}
            >
              Edit Role
            </Button>
          </Box>
        }
      />

      {error && (
        <Alert severity="error" onClose={() => setError("")} sx={{ mb: 2.5, borderRadius: "10px" }}>
          {error}
        </Alert>
      )}

      <ViewPageSection title="Role Details" subtitle="Summary information for this role">
        <ViewDetailGrid columns={{ xs: 1, sm: 2, md: 4 }}>
          <DetailField label="Name" value={role.name} icon={<InfoOutlinedIcon fontSize="inherit" />} />
          <DetailField label="Status" value={role.status ?? "—"} />
          <DetailField label="Total Permissions" value={String(totalPermissions)} icon={<ShieldOutlinedIcon fontSize="inherit" />} />
          <DetailField label="Active Scopes" value={String(activePermissions)} />
          <DetailField label="Assigned Users" value={String(users.length)} icon={<GroupOutlinedIcon fontSize="inherit" />} />
          <DetailField label="Description" value={role.description} fullWidth />
        </ViewDetailGrid>
      </ViewPageSection>

      <ViewPageSection
        title="Permissions"
        subtitle={`${activePermissions} of ${totalPermissions} scopes are active`}
      >
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: "10px",
              boxShadow: "none",
              overflow: "hidden",
              border: "1px solid",
              borderColor: "divider",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "grey.50",
                    "& .MuiTableCell-root": {
                      borderBottom: "1px solid",
                      borderColor: "divider",
                      py: 1.4,
                    },
                  }}
                >
                  <TableCell
                    sx={{
                      fontWeight: 700,
                      fontSize: 11.5,
                      color: "text.secondary",
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      minWidth: 200,
                      pl: 2,
                    }}
                  >
                    Module
                  </TableCell>
                  {ACCESS_COLS.map(({ label, activeBg, activeColor }) => (
                    <TableCell
                      key={label}
                      align="center"
                      sx={{
                        fontWeight: 700,
                        fontSize: 11,
                        color: "text.secondary",
                        textTransform: "uppercase",
                        letterSpacing: "0.06em",
                        minWidth: 72,
                      }}
                    >
                      <Box
                        sx={{
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          px: 1,
                          py: 0.3,
                          borderRadius: "5px",
                          bgcolor: activeBg,
                          color: activeColor,
                          fontSize: 10.5,
                          fontWeight: 700,
                          letterSpacing: "0.05em",
                        }}
                      >
                        {label}
                      </Box>
                    </TableCell>
                  ))}
                </TableRow>
              </TableHead>

              <TableBody>
                {perms.map((perm, index) => {
                  const isActive =
                    perm.access.create || perm.access.view || perm.access.edit || perm.access.delete;
                  return (
                    <TableRow
                      key={index}
                      sx={{
                        "&:last-child td": { border: 0 },
                        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        transition: "background 0.12s ease",
                        opacity: isActive ? 1 : 0.55,
                        "& .MuiTableCell-root": {
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          py: 1.1,
                        },
                      }}
                    >
                      <TableCell sx={{ pl: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                          {isActive ? (
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                bgcolor: theme.palette.primary.main,
                                flexShrink: 0,
                              }}
                            />
                          ) : (
                            <Box
                              sx={{
                                width: 6,
                                height: 6,
                                borderRadius: "50%",
                                bgcolor: "action.disabled",
                                flexShrink: 0,
                              }}
                            />
                          )}
                          <Typography
                            variant="body2"
                            fontWeight={isActive ? 600 : 400}
                            sx={{ fontSize: 13, color: isActive ? "text.primary" : "text.secondary" }}
                          >
                            {perm.display_name}
                          </Typography>
                        </Box>
                      </TableCell>

                      {ACCESS_COLS.map(({ key, activeColor }) => (
                        <TableCell key={key} align="center">
                          <PermIcon active={perm.access[key]} activeColor={activeColor} />
                        </TableCell>
                      ))}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
      </ViewPageSection>

      <ViewPageSection
        title="Assigned Users"
        subtitle="Users currently assigned to this role"
      >
        {users.length === 0 ? (
          <Box
            sx={{
              py: 6,
              textAlign: "center",
              border: "1.5px dashed",
              borderColor: "divider",
              borderRadius: "12px",
              bgcolor: "action.hover",
            }}
          >
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: "14px",
                bgcolor: "background.paper",
                border: "1px solid",
                borderColor: "divider",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mx: "auto",
                mb: 1.5,
              }}
            >
              <GroupOutlinedIcon sx={{ fontSize: 24, color: "text.disabled" }} />
            </Box>
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              No users are assigned to this role yet.
            </Typography>
          </Box>
        ) : (
          <TableContainer
            component={Paper}
            variant="outlined"
            sx={{
              borderRadius: "10px",
              boxShadow: "none",
              border: "1px solid",
              borderColor: "divider",
              overflow: "hidden",
            }}
          >
            <Table size="small">
              <TableHead>
                <TableRow
                  sx={{
                    bgcolor: "grey.50",
                    "& .MuiTableCell-root": {
                      fontWeight: 700,
                      fontSize: 11,
                      textTransform: "uppercase",
                      letterSpacing: "0.06em",
                      color: "text.secondary",
                      py: 1.4,
                      borderBottom: "1px solid",
                      borderColor: "divider",
                    },
                  }}
                >
                  <TableCell sx={{ pl: 2 }}>User</TableCell>
                  <TableCell>Mobile</TableCell>
                  <TableCell>Company</TableCell>
                  <TableCell>Status</TableCell>
                  <TableCell align="right" sx={{ pr: 2 }}></TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {users.map((u) => {
                  const userId = getRowId(u);
                  const initials = u.name?.charAt(0).toUpperCase() ?? "?";
                  return (
                    <TableRow
                      key={userId}
                      hover
                      onClick={() => router.push(routes.user.view(userId))}
                      sx={{
                        cursor: "pointer",
                        "&:last-child td": { border: 0 },
                        "&:hover": { bgcolor: alpha(theme.palette.primary.main, 0.04) },
                        transition: "background 0.1s ease",
                        "& .MuiTableCell-root": {
                          borderBottom: "1px solid",
                          borderColor: "divider",
                          py: 1.2,
                        },
                      }}
                    >
                      <TableCell sx={{ pl: 2 }}>
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1.25 }}>
                          <Avatar
                            src={u.profileImage || undefined}
                            sx={{
                              width: 32,
                              height: 32,
                              bgcolor: alpha(theme.palette.primary.main, 0.1),
                              color: theme.palette.primary.main,
                              fontSize: 13,
                              fontWeight: 700,
                              border: `1.5px solid ${alpha(theme.palette.primary.main, 0.15)}`,
                            }}
                          >
                            {initials}
                          </Avatar>
                          <Box>
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ color: "text.primary", fontSize: 13, lineHeight: 1.3 }}
                            >
                              {u.name || "—"}
                            </Typography>
                            {u.email && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>
                                {u.email}
                              </Typography>
                            )}
                          </Box>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                          {u.mobile || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary" sx={{ fontSize: 13 }}>
                          {u.company_name || "—"}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={u.status === "active" ? "Active" : "Inactive"}
                          size="small"
                          sx={{
                            height: 22,
                            fontSize: 11,
                            fontWeight: 700,
                            borderRadius: "6px",
                            bgcolor: u.status === "active" ? "#E8F5E9" : "action.hover",
                            color: u.status === "active" ? "#2E7D32" : "text.secondary",
                            border: "none",
                          }}
                        />
                      </TableCell>
                      <TableCell align="right" sx={{ pr: 2 }}>
                        <Tooltip title="View user" arrow>
                          <Button
                            size="small"
                            variant="outlined"
                            startIcon={<VisibilityOutlinedIcon sx={{ fontSize: 13 }} />}
                            onClick={(e) => {
                              e.stopPropagation();
                              router.push(routes.user.view(userId));
                            }}
                            sx={{
                              borderRadius: "7px",
                              textTransform: "none",
                              fontWeight: 600,
                              fontSize: 12,
                              px: 1.25,
                              py: 0.4,
                              borderColor: "divider",
                              color: "text.secondary",
                              "&:hover": {
                                borderColor: theme.palette.primary.main,
                                color: theme.palette.primary.main,
                                bgcolor: alpha(theme.palette.primary.main, 0.06),
                              },
                            }}
                          >
                            View
                          </Button>
                        </Tooltip>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </ViewPageSection>
    </PageContainer>
  );
}