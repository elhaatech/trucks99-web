import {
  Box,
  Card,
  CardContent,
  Grid,
  Typography,
  Chip,
  Alert,
  useTheme,
  useMediaQuery,
} from "@mui/material";
import CheckCircleIcon from "@mui/icons-material/CheckCircle";
import CalendarTodayIcon from "@mui/icons-material/CalendarToday";
import LocationOnIcon from "@mui/icons-material/LocationOn";

interface Props {
  loadBitRecords: any[];
}

export default function LoadAccepted({ loadBitRecords }: Props) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down("sm"));

  const acceptedLoads = loadBitRecords.filter(
    (record) => record.status === "accept"
  );

  if (acceptedLoads.length === 0) {
    return (
      <Alert
        severity="info"
        icon={<CheckCircleIcon />}
        sx={{
          borderRadius: 2,
          backgroundColor: `rgba(16, 185, 129, 0.08)`,
          borderLeft: `4px solid ${theme.palette.success.main}`,
        }}
      >
        No accepted loads yet. When you accept a load bid, it will appear here.
      </Alert>
    );
  }

  return (
    <Box sx={{ p: isMobile ? 1.5 : 2 }}>
      {/* Header */}
      <Box sx={{ mb: 3 }}>
        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 0.5 }}>
          <CheckCircleIcon
            sx={{ fontSize: 28, color: theme.palette.success.main }}
          />
          <Typography
            variant="h4"
            sx={{
              fontWeight: 500,
              fontSize: isMobile ? "1.5rem" : "1.75rem",
            }}
          >
            Accepted loads
          </Typography>
        </Box>
        <Typography
          variant="body2"
          sx={{
            color: theme.palette.text.secondary,
            ml: 4,
            fontSize: "0.9rem",
          }}
        >
          {acceptedLoads.length} confirmed
        </Typography>
      </Box>

      {/* Cards Grid — use CSS grid directly; no MUI Grid needed at the outer level */}
      <Box
        sx={{
          display: "grid",
          gridTemplateColumns: `repeat(auto-fit, minmax(${isMobile ? "100%" : "300px"}, 1fr))`,
          gap: 2,
        }}
      >
        {acceptedLoads.map((record) => (
          <Card
            key={record._id}
            sx={{
              height: "100%",
              display: "flex",
              flexDirection: "column",
              borderRadius: 2,
              border: `0.5px solid ${theme.palette.divider}`,
              backgroundColor: theme.palette.background.paper,
              overflow: "hidden",
            }}
          >
            {/* Main Content */}
            <CardContent
              sx={{
                flex: 1,
                pb: 0,
                borderBottom: `0.5px solid ${theme.palette.divider}`,
                "&:last-child": { pb: 0 },
              }}
            >
              {/* Header: Load Number + Badge */}
              <Box
                sx={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  mb: 1.5,
                }}
              >
                <Typography
                  sx={{
                    fontFamily: "'Courier New', monospace",
                    fontSize: "1.4rem",
                    fontWeight: 500,
                    color: theme.palette.text.primary,
                  }}
                >
                  {record.load.loadNumber}
                </Typography>
                <Chip
                  label="Accepted"
                  size="small"
                  sx={{
                    backgroundColor:
                      theme.palette.mode === "dark"
                        ? "rgba(16, 185, 129, 0.2)"
                        : "rgba(220, 252, 231, 1)",
                    color: theme.palette.success.dark,
                    fontWeight: 600,
                    fontSize: "0.7rem",
                    textTransform: "uppercase",
                    height: 26,
                  }}
                />
              </Box>

              {/* Route Section */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1.5,
                  mb: 1.5,
                  p: 1.5,
                  borderRadius: 1.5,
                  backgroundColor: `rgba(16, 185, 129, ${
                    theme.palette.mode === "dark" ? "0.1" : "0.08"
                  })`,
                  border: `0.5px solid rgba(16, 185, 129, 0.2)`,
                }}
              >
                <LocationOnIcon
                  sx={{
                    fontSize: 18,
                    color: theme.palette.success.main,
                    flexShrink: 0,
                  }}
                />
                <Box sx={{ flex: 1, minWidth: 0 }}>
                  <Typography
                    variant="body2"
                    sx={{
                      fontWeight: 500,
                      fontSize: "0.9rem",
                      color: theme.palette.text.primary,
                    }}
                  >
                    {record.load.origin} → {record.load.destination}
                  </Typography>
                  <Typography
                    variant="caption"
                    sx={{
                      fontSize: "0.75rem",
                      color: theme.palette.text.secondary,
                      fontWeight: 400,
                      mt: 0.25,
                      display: "block",
                    }}
                  >
                    Tamil Nadu, India
                  </Typography>
                </Box>
              </Box>

              {/* Material & Capacity — Grid v2: size prop, no item prop */}
              <Grid container spacing={1.5} sx={{ mb: 1.5 }}>
                <Grid size={6}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: theme.palette.action.hover,
                      borderRadius: 1.5,
                      border: `0.5px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: theme.palette.text.secondary,
                        display: "block",
                        mb: 0.75,
                      }}
                    >
                      Material
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        fontSize: "0.95rem",
                        color: theme.palette.text.primary,
                      }}
                    >
                      {record.load.material}
                    </Typography>
                  </Box>
                </Grid>

                <Grid size={6}>
                  <Box
                    sx={{
                      p: 1.5,
                      backgroundColor: theme.palette.action.hover,
                      borderRadius: 1.5,
                      border: `0.5px solid ${theme.palette.divider}`,
                    }}
                  >
                    <Typography
                      variant="caption"
                      sx={{
                        fontSize: "0.7rem",
                        fontWeight: 600,
                        textTransform: "uppercase",
                        color: theme.palette.text.secondary,
                        display: "block",
                        mb: 0.75,
                      }}
                    >
                      Capacity
                    </Typography>
                    <Typography
                      variant="body2"
                      sx={{
                        fontWeight: 500,
                        fontSize: "0.95rem",
                        color: theme.palette.text.primary,
                      }}
                    >
                      {record.load.loadCapacity}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>

              {/* Date */}
              <Box
                sx={{
                  display: "flex",
                  alignItems: "center",
                  gap: 1,
                  fontSize: "0.85rem",
                  color: theme.palette.text.secondary,
                }}
              >
                <CalendarTodayIcon sx={{ fontSize: 16 }} />
                {new Date(record.createdAt).toLocaleDateString("en-IN", {
                  year: "numeric",
                  month: "short",
                  day: "numeric",
                })}
              </Box>
            </CardContent>

            {/* Bid Amount Footer */}
            <Box
              sx={{
                p: 1.5,
                backgroundColor: `rgba(16, 185, 129, ${
                  theme.palette.mode === "dark" ? "0.12" : "0.08"
                })`,
                mt: "auto",
              }}
            >
              <Typography
                variant="caption"
                sx={{
                  fontSize: "0.7rem",
                  fontWeight: 600,
                  textTransform: "uppercase",
                  color: theme.palette.text.secondary,
                  display: "block",
                  mb: 0.5,
                }}
              >
                Bid amount
              </Typography>
              <Typography
                sx={{
                  fontSize: "1.5rem",
                  fontWeight: 500,
                  color: theme.palette.text.primary,
                }}
              >
                ₹{record.bit.toLocaleString("en-IN")}
              </Typography>
            </Box>
          </Card>
        ))}
      </Box>
    </Box>
  );
}