"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Chip,
  Card,
  CardContent,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Stack,
  Avatar,
  Tooltip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Divider,
  Grid,
  IconButton,
} from "@mui/material";
import ExpandMoreIcon from "@mui/icons-material/ExpandMore";
import LocalShippingIcon from "@mui/icons-material/LocalShipping";
import InventoryIcon from "@mui/icons-material/Inventory";
import PersonIcon from "@mui/icons-material/Person";
import PhoneIcon from "@mui/icons-material/Phone";
import PlaceIcon from "@mui/icons-material/Place";
import InfoIcon from "@mui/icons-material/Info";
import DateRangeIcon from "@mui/icons-material/DateRange";
import ScaleIcon from "@mui/icons-material/Scale";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import {
  getMatches,
  type MatchResponse,
  type LoadMatchGroup,
  type TruckMatchGroup,
  type MatchParams,
} from "@/model/services/match";

// ─── Score badge ───────────────────────────────────────────────────────

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 60 ? "success" : score >= 40 ? "warning" : "default";
  return (
    <Chip
      label={`${score}%`}
      size="small"
      color={color}
      sx={{ fontWeight: 700, minWidth: 52 }}
    />
  );
}

// ─── Load Details Modal ─────────────────────────────────────────────────

type LoadDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  load: any;
};

function LoadDetailsModal({ open, onClose, load }: LoadDetailsModalProps) {
  if (!load) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Load Details: {load.title || "Untitled Load"}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 2 }}>
        <Stack spacing={2}>
          {/* Trip Details */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              📍 Trip Details
            </Typography>
            <Stack spacing={0.8}>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  From (Origin):
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {load.origin || "—"}
                </Typography>
              </Box>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  To (Destination):
                </Typography>
                <Typography variant="body2" fontWeight={600}>
                  {load.destination || "—"}
                </Typography>
              </Box>
              {load.pickupDate && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Pickup Date:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(load.pickupDate).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Load Details */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              📦 Load Information
            </Typography>
            <Stack spacing={0.8}>
              {load.vehicleType && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Vehicle Type:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {load.vehicleType}
                  </Typography>
                </Box>
              )}
              {load.weight && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Weight:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {load.weight} kg
                  </Typography>
                </Box>
              )}
              {load.quantity && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Quantity:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {load.quantity}
                  </Typography>
                </Box>
              )}
              {load.loadType && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Load Type:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {load.loadType}
                  </Typography>
                </Box>
              )}
              {load.description && (
                <Box>
                  <Typography variant="caption" color="text.secondary">
                    Description:
                  </Typography>
                  <Typography variant="body2" sx={{ mt: 0.5 }}>
                    {load.description}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Budget */}
          {load.bidPrice && (
            <Box>
              <Typography variant="subtitle2" fontWeight={700} mb={1}>
                💰 Budget
              </Typography>
              <Box display="flex" justifyContent="space-between">
                <Typography variant="caption" color="text.secondary">
                  Bid Price:
                </Typography>
                <Typography variant="body2" fontWeight={600} color="primary">
                  ₹{load.bidPrice.toLocaleString("en-IN")}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Status */}
          <Divider />
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              Status:
            </Typography>
            <Chip
              label={load.status}
              size="small"
              color="primary"
              sx={{ textTransform: "capitalize" }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Truck Details Modal ────────────────────────────────────────────────

type TruckDetailsModalProps = {
  open: boolean;
  onClose: () => void;
  truck: any;
};

function TruckDetailsModal({ open, onClose, truck }: TruckDetailsModalProps) {
  if (!truck) return null;

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
      <DialogTitle sx={{ fontWeight: 700, pb: 1 }}>
        Truck Details: {truck.registrationNumber || truck.truckType || "Truck"}
      </DialogTitle>
      <Divider />
      <DialogContent sx={{ py: 2 }}>
        <Stack spacing={2}>
          {/* Registration & Basic Info */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              🚚 Truck Information
            </Typography>
            <Stack spacing={0.8}>
              {truck.registrationNumber && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Registration:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.registrationNumber}
                  </Typography>
                </Box>
              )}
              {truck.truckType && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Type:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.truckType}
                  </Typography>
                </Box>
              )}
              {truck.vehicleBodyType && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Body Type:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.vehicleBodyType}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Capacity & Dimensions */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              📊 Capacity & Specifications
            </Typography>
            <Stack spacing={0.8}>
              {truck.capacity && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Capacity:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.capacity}
                  </Typography>
                </Box>
              )}
              {truck.loadCapacity && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Load Capacity:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.loadCapacity} kg
                  </Typography>
                </Box>
              )}
              {truck.length && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Length:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.length} m
                  </Typography>
                </Box>
              )}
              {truck.width && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Width:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.width} m
                  </Typography>
                </Box>
              )}
              {truck.height && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Height:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.height} m
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Location & Availability */}
          <Box>
            <Typography variant="subtitle2" fontWeight={700} mb={1}>
              📍 Location & Availability
            </Typography>
            <Stack spacing={0.8}>
              {truck.currentLocation && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Current Location:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {truck.currentLocation}
                  </Typography>
                </Box>
              )}
              {truck.availableFrom && (
                <Box display="flex" justifyContent="space-between">
                  <Typography variant="caption" color="text.secondary">
                    Available From:
                  </Typography>
                  <Typography variant="body2" fontWeight={600}>
                    {new Date(truck.availableFrom).toLocaleDateString()}
                  </Typography>
                </Box>
              )}
            </Stack>
          </Box>

          <Divider />

          {/* Status */}
          <Box display="flex" justifyContent="space-between">
            <Typography variant="caption" color="text.secondary">
              Status:
            </Typography>
            <Chip
              label={truck.status}
              size="small"
              color="primary"
              sx={{ textTransform: "capitalize" }}
            />
          </Box>
        </Stack>
      </DialogContent>
      <Divider />
      <DialogActions sx={{ p: 2 }}>
        <Button onClick={onClose} variant="outlined">
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}

// ─── Load match results ─────────────────────────────────────────────────

function LoadMatchResults({ groups }: { groups: LoadMatchGroup[] }) {
  const [selectedTruck, setSelectedTruck] = useState<any | null>(null);
  const [truckDetailOpen, setTruckDetailOpen] = useState(false);

  if (groups.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No matching trucks found for your loads.
      </Alert>
    );
  }

  return (
    <>
      <Box>
        <Typography variant="h6" fontWeight={700} mb={2}>
          <InventoryIcon
            sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }}
          />
          Your Loads → Matched Trucks
        </Typography>
        {groups.map((group) => (
          <Accordion key={group.load._id} sx={{ mb: 1.5 }} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                display="flex"
                alignItems="center"
                gap={2}
                flexWrap="wrap"
                flex={1}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {group.load.title || "Untitled Load"}
                </Typography>
                <Chip
                  icon={<PlaceIcon />}
                  label={`${group.load.origin || "?"} → ${group.load.destination || "?"}`}
                  size="small"
                  variant="outlined"
                />
                <Chip
                  label={group.load.status}
                  size="small"
                  color="primary"
                  sx={{ textTransform: "capitalize" }}
                />
                <Typography variant="caption" color="text.secondary">
                  {group.totalMatches} truck(s) matched
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5}>
                {group.matches.map((pair, i) => (
                  <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                        gap={1}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1.5}
                          flex={1}
                        >
                          <Avatar
                            sx={{ bgcolor: "#1976d2", width: 36, height: 36 }}
                          >
                            <LocalShippingIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="body2" fontWeight={600}>
                              {pair.truck.registrationNumber ||
                                pair.truck.truckType ||
                                "Truck"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {pair.truck.truckNumber &&
                                `${pair.truck.truckNumber} `}

                              {pair.truck.capacity &&
                                `• ${pair.truck.capacity}`}
                            </Typography>
                          </Box>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          {pair.truck.price != null && (
                            <Chip
                              label={`₹${Number(pair.truck.price).toLocaleString("en-IN")}`}
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                          <ScoreBadge score={pair.score} />
                          <Tooltip title="View truck details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedTruck(pair.truck);
                                setTruckDetailOpen(true);
                              }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {pair.matchedOn.length > 0 && (
                        <Stack direction="row" gap={0.5} mt={1} flexWrap="wrap">
                          {pair.matchedOn.map((m, j) => (
                            <Chip
                              key={j}
                              label={m}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.7rem" }}
                            />
                          ))}
                        </Stack>
                      )}

                      {pair.truckOwner && (
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          mt={1}
                          color="text.secondary"
                        >
                          <PersonIcon sx={{ fontSize: 16 }} />
                          <Typography variant="caption">
                            {pair.truckOwner.name || "Unknown"}
                          </Typography>
                          {pair.truckOwner.mobile && (
                            <>
                              <PhoneIcon sx={{ fontSize: 14, ml: 1 }} />
                              <Typography variant="caption">
                                {pair.truckOwner.mobile}
                              </Typography>
                            </>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Truck Details Modal */}
      <TruckDetailsModal
        open={truckDetailOpen}
        onClose={() => setTruckDetailOpen(false)}
        truck={selectedTruck}
      />
    </>
  );
}

// ─── Truck match results ────────────────────────────────────────────────

function TruckMatchResults({ groups }: { groups: TruckMatchGroup[] }) {
  const [selectedLoad, setSelectedLoad] = useState<any | null>(null);
  const [loadDetailOpen, setLoadDetailOpen] = useState(false);

  if (groups.length === 0) {
    return (
      <Alert severity="info" sx={{ mb: 2 }}>
        No matching loads found for your trucks.
      </Alert>
    );
  }

  return (
    <>
      <Box>
        <Typography variant="h6" fontWeight={700} mb={2}>
          <LocalShippingIcon
            sx={{ mr: 1, verticalAlign: "middle", fontSize: 22 }}
          />
          Your Trucks → Matched Loads
        </Typography>
        {groups.map((group) => (
          <Accordion key={group.truck._id} sx={{ mb: 1.5 }} defaultExpanded>
            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
              <Box
                display="flex"
                alignItems="center"
                gap={2}
                flexWrap="wrap"
                flex={1}
              >
                <Typography variant="subtitle1" fontWeight={600}>
                  {group.truck.registrationNumber ||
                    group.truck.truckType ||
                    "Truck"}
                </Typography>
                {group.truck.currentLocation && (
                  <Chip
                    icon={<PlaceIcon />}
                    label={group.truck.currentLocation}
                    size="small"
                    variant="outlined"
                  />
                )}
                <Chip
                  label={group.truck.status}
                  size="small"
                  color="primary"
                  sx={{ textTransform: "capitalize" }}
                />
                <Typography variant="caption" color="text.secondary">
                  {group.totalMatches} load(s) matched
                </Typography>
              </Box>
            </AccordionSummary>
            <AccordionDetails>
              <Stack spacing={1.5}>
                {group.matches.map((pair, i) => (
                  <Card key={i} variant="outlined" sx={{ borderRadius: 2 }}>
                    <CardContent sx={{ py: 1.5, "&:last-child": { pb: 1.5 } }}>
                      <Box
                        display="flex"
                        alignItems="center"
                        justifyContent="space-between"
                        flexWrap="wrap"
                        gap={1}
                      >
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1.5}
                          flex={1}
                        >
                          <Avatar
                            sx={{ bgcolor: "#2e7d32", width: 36, height: 36 }}
                          >
                            <InventoryIcon sx={{ fontSize: 20 }} />
                          </Avatar>
                          <Box flex={1}>
                            <Typography variant="body2" fontWeight={600}>
                              {pair.load.title || "Untitled Load"}
                            </Typography>
                            <Typography
                              variant="caption"
                              color="text.secondary"
                            >
                              {pair.load.loadNumber &&
                                `${pair.load.loadNumber} • `}
                              {pair.load.origin || "?"} →{" "}
                              {pair.load.destination || "?"}
                              {pair.load.vehicleCapacity &&
                                ` • ${pair.load.vehicleCapacity}`}
                            </Typography>
                          </Box>
                        </Box>
                        <Box display="flex" alignItems="center" gap={1}>
                          {pair.load.price != null && (
                            <Chip
                              label={`₹${Number(pair.load.price).toLocaleString("en-IN")}`}
                              size="small"
                              color="default"
                              variant="outlined"
                            />
                          )}
                          <ScoreBadge score={pair.score} />
                          <Tooltip title="View load details">
                            <IconButton
                              size="small"
                              onClick={() => {
                                setSelectedLoad(pair.load);
                                setLoadDetailOpen(true);
                              }}
                            >
                              <InfoIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Box>
                      </Box>

                      {pair.matchedOn.length > 0 && (
                        <Stack direction="row" gap={0.5} mt={1} flexWrap="wrap">
                          {pair.matchedOn.map((m, j) => (
                            <Chip
                              key={j}
                              label={m}
                              size="small"
                              variant="outlined"
                              sx={{ fontSize: "0.7rem" }}
                            />
                          ))}
                        </Stack>
                      )}

                      {pair.loadOwner && (
                        <Box
                          display="flex"
                          alignItems="center"
                          gap={1}
                          mt={1}
                          color="text.secondary"
                        >
                          <PersonIcon sx={{ fontSize: 16 }} />
                          <Typography variant="caption">
                            {pair.loadOwner.name || "Unknown"}
                          </Typography>
                          {pair.loadOwner.mobile && (
                            <>
                              <PhoneIcon sx={{ fontSize: 14, ml: 1 }} />
                              <Typography variant="caption">
                                {pair.loadOwner.mobile}
                              </Typography>
                            </>
                          )}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </Stack>
            </AccordionDetails>
          </Accordion>
        ))}
      </Box>

      {/* Load Details Modal */}
      <LoadDetailsModal
        open={loadDetailOpen}
        onClose={() => setLoadDetailOpen(false)}
        load={selectedLoad}
      />
    </>
  );
}

// ─── Main exported component ────────────────────────────────────────────

export type MatchResultsViewProps = {
  /** "load" = show my loads → matched trucks, "truck" = my trucks → matched loads */
  mode: "load" | "truck";
};

export default function MatchResultsView({ mode }: MatchResultsViewProps) {
  const [data, setData] = useState<MatchResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await getMatches({ mode, page: 1, limit: 50 });
      setData(result);
    } catch (err: any) {
      console.error("Match fetch error:", err);
      setError(err?.message || "Failed to fetch matching results");
    } finally {
      setLoading(false);
    }
  }, [mode]);

  useEffect(() => {
    fetchMatches();
  }, [fetchMatches]);

  if (loading) {
    return (
      <Box
        display="flex"
        justifyContent="center"
        alignItems="center"
        minHeight={300}
      >
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error" sx={{ mb: 2 }}>
        {error}
      </Alert>
    );
  }

  if (!data) return null;

  return (
    <Box>
      {/* Summary */}
      <Box display="flex" gap={2} mb={3} flexWrap="wrap">
        {mode === "load" && (
          <>
            <Chip
              label={`Your Loads: ${data.summary.totalMyLoads}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Matched Groups: ${data.summary.totalLoadMatches}`}
              color="success"
              variant="outlined"
            />
          </>
        )}
        {mode === "truck" && (
          <>
            <Chip
              label={`Your Trucks: ${data.summary.totalMyTrucks}`}
              color="primary"
              variant="outlined"
            />
            <Chip
              label={`Matched Groups: ${data.summary.totalTruckMatches}`}
              color="success"
              variant="outlined"
            />
          </>
        )}
      </Box>

      {/* Results */}
      {mode === "load" && <LoadMatchResults groups={data.loadMatches} />}
      {mode === "truck" && <TruckMatchResults groups={data.truckMatches} />}
    </Box>
  );
}
