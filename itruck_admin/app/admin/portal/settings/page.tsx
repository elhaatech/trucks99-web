"use client";

import Typography from "@mui/material/Typography";
import Box from "@mui/material/Box";
import Card from "@mui/material/Card";
import CardContent from "@mui/material/CardContent";
import Switch from "@mui/material/Switch";
import FormControlLabel from "@mui/material/FormControlLabel";
import Divider from "@mui/material/Divider";
import {
  NotificationsOutlined,
  DarkModeOutlined,
  LanguageOutlined,
  SecurityOutlined,
  HelpOutlineOutlined,
} from "@mui/icons-material";
import { alpha, useTheme } from "@mui/material/styles";
import { PageContainer, PageHeader } from "@/components/ui";

function SettingsSection({
  icon,
  title,
  description,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  const theme = useTheme();
  return (
    <Card
      elevation={0}
      sx={{
        mb: 2.5,
        borderRadius: "12px",
        border: "1px solid",
        borderColor: "divider",
        boxShadow: theme.tokens.shadow.card,
      }}
    >
      <CardContent sx={{ p: { xs: 2, sm: 3 } }}>
        <Box sx={{ display: "flex", gap: 2, mb: 2 }}>
          <Box
            sx={{
              width: 44,
              height: 44,
              borderRadius: "12px",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              bgcolor: alpha(theme.palette.primary.main, 0.08),
              color: "primary.main",
              flexShrink: 0,
            }}
          >
            {icon}
          </Box>
          <Box>
            <Typography variant="subtitle1" fontWeight={700}>
              {title}
            </Typography>
            {description ? (
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.25 }}>
                {description}
              </Typography>
            ) : null}
          </Box>
        </Box>
        <Divider sx={{ mb: 2 }} />
        {children}
      </CardContent>
    </Card>
  );
}

function SettingRow({
  label,
  hint,
  control,
}: {
  label: string;
  hint?: string;
  control: React.ReactNode;
}) {
  return (
    <Box
      sx={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        gap: 2,
        py: 1.5,
        "&:not(:last-child)": { borderBottom: "1px solid", borderColor: "divider" },
      }}
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={600}>
          {label}
        </Typography>
        {hint ? (
          <Typography variant="caption" color="text.secondary">
            {hint}
          </Typography>
        ) : null}
      </Box>
      {control}
    </Box>
  );
}

export default function SettingsPage() {
  return (
    <PageContainer maxWidth={720}>
      <PageHeader
        title="Settings"
        subtitle="Manage your preferences, notifications, and account options."
      />

      <SettingsSection
        icon={<NotificationsOutlined />}
        title="Notifications"
        description="Control how you receive alerts and updates."
      >
        <SettingRow
          label="Email notifications"
          hint="Receive updates about loads, bookings, and payments"
          control={<Switch defaultChecked />}
        />
        <SettingRow
          label="Push notifications"
          hint="Browser and mobile push alerts"
          control={<Switch defaultChecked />}
        />
        <SettingRow
          label="Marketing emails"
          hint="Product updates and promotional offers"
          control={<Switch />}
        />
      </SettingsSection>

      <SettingsSection
        icon={<DarkModeOutlined />}
        title="Appearance"
        description="Customize how the portal looks."
      >
        <SettingRow
          label="Compact sidebar"
          hint="Use a narrower navigation rail"
          control={<Switch />}
        />
        <SettingRow
          label="Reduce animations"
          hint="Minimize motion for accessibility"
          control={<Switch />}
        />
      </SettingsSection>

      <SettingsSection
        icon={<LanguageOutlined />}
        title="Regional"
        description="Language and locale preferences."
      >
        <SettingRow
          label="Language"
          hint="English (India)"
          control={
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              English
            </Typography>
          }
        />
        <SettingRow
          label="Currency"
          hint="Display format for prices"
          control={
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              INR (₹)
            </Typography>
          }
        />
      </SettingsSection>

      <SettingsSection
        icon={<SecurityOutlined />}
        title="Privacy & Security"
        description="Account security settings."
      >
        <SettingRow
          label="Two-factor authentication"
          hint="Add an extra layer of security"
          control={<Switch />}
        />
        <SettingRow
          label="Session timeout"
          hint="Auto logout after inactivity"
          control={
            <Typography variant="body2" color="text.secondary" fontWeight={500}>
              30 minutes
            </Typography>
          }
        />
      </SettingsSection>

      <SettingsSection
        icon={<HelpOutlineOutlined />}
        title="Support"
        description="Get help and learn more."
      >
        <SettingRow
          label="Help center"
          hint="Documentation and FAQs"
          control={
            <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ cursor: "pointer" }}>
              Open →
            </Typography>
          }
        />
        <SettingRow
          label="Contact support"
          hint="Reach our support team"
          control={
            <Typography variant="body2" color="primary.main" fontWeight={600} sx={{ cursor: "pointer" }}>
              Contact →
            </Typography>
          }
        />
      </SettingsSection>
    </PageContainer>
  );
}
