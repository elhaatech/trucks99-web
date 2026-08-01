"use client";

import type { ReactNode } from "react";
import { useEffect, useRef, useState } from "react";
import Box from "@mui/material/Box";
import Typography from "@mui/material/Typography";
import TextField from "@mui/material/TextField";
import Button from "@mui/material/Button";
import Alert from "@mui/material/Alert";
import CircularProgress from "@mui/material/CircularProgress";
import IconButton from "@mui/material/IconButton";
import WhatsAppIcon from "@mui/icons-material/WhatsApp";
import EmailOutlinedIcon from "@mui/icons-material/EmailOutlined";
import CallOutlinedIcon from "@mui/icons-material/CallOutlined";
import AttachFileIcon from "@mui/icons-material/AttachFile";
import CloseIcon from "@mui/icons-material/Close";
import { PRODUCT_THEME as T, INFO } from "@/lib/theme";
import { getContactInfo, submitContactForm, type ContactInfo } from "@/model/services/contact";
import { useMarketplaceAuth } from "@/components/marketplace/MarketplaceAuthProvider";

type ChannelCardProps = {
  title: string;
  detail: string;
  href: string;
  icon: ReactNode;
  iconBg: string;
  iconColor: string;
};

function ChannelCard({ title, detail, href, icon, iconBg, iconColor }: ChannelCardProps) {
  return (
    <Box
      component="a"
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      sx={{
        display: "flex",
        alignItems: "center",
        gap: 1.75,
        p: 2,
        borderRadius: T.radius.lg,
        bgcolor: T.color.surface,
        border: `1px solid ${T.color.border}`,
        boxShadow: T.shadow.card,
        textDecoration: "none",
        color: "inherit",
        transition: "border-color 0.15s, transform 0.15s",
        "&:hover": {
          borderColor: INFO,
          transform: "translateY(-1px)",
        },
      }}
    >
      <Box
        sx={{
          width: 48,
          height: 48,
          borderRadius: "50%",
          bgcolor: iconBg,
          color: iconColor,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {icon}
      </Box>
      <Box sx={{ minWidth: 0 }}>
        <Typography sx={{ fontWeight: 700, fontSize: 15, color: T.color.textPrimary }}>
          {title}
        </Typography>
        <Typography sx={{ fontSize: 13, color: T.color.textSecondary, wordBreak: "break-all" }}>
          {detail}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ContactUsPage() {
  const { user } = useMarketplaceAuth();
  const fileRef = useRef<HTMLInputElement>(null);

  const [info, setInfo] = useState<ContactInfo | null>(null);
  const [infoError, setInfoError] = useState("");

  const [name, setName] = useState("");
  const [mobile, setMobile] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [file, setFile] = useState<File | null>(null);

  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    const controller = new AbortController();
    void getContactInfo(controller.signal)
      .then(setInfo)
      .catch((err: unknown) => {
        setInfoError(err instanceof Error ? err.message : "Failed to load contact info");
      });
    return () => controller.abort();
  }, []);

  useEffect(() => {
    if (!user) return;
    if (user.name) setName(user.name);
    if (user.mobile) setMobile(user.mobile);
    if (user.email && !String(user.email).includes("@otp.user")) setEmail(user.email);
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setSubmitting(true);
    try {
      const res = await submitContactForm({
        name: name.trim(),
        mobile: mobile.trim(),
        email: email.trim(),
        message: message.trim(),
        attachmentFile: file,
      });
      setSuccess(res.message || "Message sent successfully.");
      setMessage("");
      setFile(null);
      if (fileRef.current) fileRef.current.value = "";
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to send message");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Box>
      <Typography sx={{ fontWeight: 800, fontSize: { xs: 22, md: 28 }, color: T.color.textPrimary }}>
        Get In Touch
      </Typography>
      <Typography sx={{ color: T.color.textSecondary, mb: 3, mt: 0.5 }}>
        Reach TRUCKS99 support by call, WhatsApp, email — or send us a message below.
      </Typography>

      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: { xs: "1fr", md: "minmax(0, 0.9fr) minmax(0, 1.1fr)" },
          gap: 3,
          alignItems: "start",
        }}
      >
        <Box sx={{ display: "flex", flexDirection: "column", gap: 1.5 }}>
          {infoError ? <Alert severity="warning">{infoError}</Alert> : null}
          <ChannelCard
            title="What's App Now"
            detail={info?.phone || "+91 9150723962"}
            href={info?.whatsappUrl || "https://wa.me/919150723962"}
            icon={<WhatsAppIcon />}
            iconBg="rgba(37, 211, 102, 0.12)"
            iconColor="#128C7E"
          />
          <ChannelCard
            title="Message Us"
            detail={info?.email || "thetrucks99@gmail.com"}
            href={info?.mailtoUrl || "mailto:thetrucks99@gmail.com"}
            icon={<EmailOutlinedIcon />}
            iconBg="rgba(239, 68, 68, 0.1)"
            iconColor="#DC2626"
          />
          <ChannelCard
            title="Call Us"
            detail={info?.phone || "+91 9150723962"}
            href={info?.callUrl || "tel:+919150723962"}
            icon={<CallOutlinedIcon />}
            iconBg="rgba(37, 99, 235, 0.1)"
            iconColor={INFO}
          />
        </Box>

        <Box
          component="form"
          onSubmit={handleSubmit}
          sx={{
            p: { xs: 2, md: 3 },
            borderRadius: T.radius.lg,
            border: `1px solid ${T.color.border}`,
            bgcolor: T.color.surface,
            boxShadow: T.shadow.card,
            display: "flex",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <Typography sx={{ fontWeight: 700, fontSize: 18, color: T.color.textPrimary }}>
            Send a message
          </Typography>

          {error ? <Alert severity="error">{error}</Alert> : null}
          {success ? <Alert severity="success">{success}</Alert> : null}

          <TextField
            label="Name"
            required
            fullWidth
            size="small"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={submitting}
          />
          <TextField
            label="Mobile number"
            required
            fullWidth
            size="small"
            value={mobile}
            onChange={(e) => setMobile(e.target.value)}
            disabled={submitting}
            inputProps={{ inputMode: "tel" }}
          />
          <TextField
            label="Email ID"
            required
            fullWidth
            size="small"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={submitting}
          />
          <TextField
            label="Message"
            required
            fullWidth
            size="small"
            multiline
            minRows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            disabled={submitting}
          />

          <input
            ref={fileRef}
            type="file"
            hidden
            accept="image/*,.pdf,.doc,.docx"
            onChange={(e) => setFile(e.target.files?.[0] || null)}
          />

          <Box sx={{ display: "flex", alignItems: "center", gap: 1, flexWrap: "wrap" }}>
            <Button
              type="button"
              variant="outlined"
              startIcon={<AttachFileIcon />}
              onClick={() => fileRef.current?.click()}
              disabled={submitting}
              sx={{ textTransform: "none" }}
            >
              Attach file
            </Button>
            {file ? (
              <Box sx={{ display: "flex", alignItems: "center", gap: 0.5 }}>
                <Typography sx={{ fontSize: 13, color: T.color.textSecondary }}>{file.name}</Typography>
                <IconButton
                  size="small"
                  aria-label="Remove attachment"
                  onClick={() => {
                    setFile(null);
                    if (fileRef.current) fileRef.current.value = "";
                  }}
                >
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Box>
            ) : (
              <Typography sx={{ fontSize: 12, color: T.color.textMuted }}>
                Optional — image or document
              </Typography>
            )}
          </Box>

          <Button
            type="submit"
            variant="contained"
            disabled={submitting}
            sx={{
              mt: 1,
              alignSelf: { xs: "stretch", sm: "flex-start" },
              textTransform: "none",
              fontWeight: 700,
              bgcolor: INFO,
              px: 3,
            }}
          >
            {submitting ? <CircularProgress size={20} color="inherit" /> : "Send message"}
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
