"use client";

import type { ElementType } from "react";
import Box from "@mui/material/Box";
import Tooltip from "@mui/material/Tooltip";
import Typography from "@mui/material/Typography";
import CalendarMonthOutlinedIcon from "@mui/icons-material/CalendarMonthOutlined";
import LocalGasStationOutlinedIcon from "@mui/icons-material/LocalGasStationOutlined";
import SpeedOutlinedIcon from "@mui/icons-material/SpeedOutlined";
import LocationOnOutlinedIcon from "@mui/icons-material/LocationOnOutlined";
import PersonOutlineOutlinedIcon from "@mui/icons-material/PersonOutlineOutlined";
import { PRODUCT_THEME as T } from "@/lib/theme";
import type { VehicleInfoValues } from "./utils";

const VEHICLE_INFO_CONFIG: Array<{
  key: keyof VehicleInfoValues;
  Icon: ElementType;
  label: string;
}> = [
  { key: "year", Icon: CalendarMonthOutlinedIcon, label: "Make Year" },
  { key: "fuelType", Icon: LocalGasStationOutlinedIcon, label: "Fuel Type" },
  { key: "kmDriven", Icon: SpeedOutlinedIcon, label: "KM Driven" },
  { key: "owners", Icon: PersonOutlineOutlinedIcon, label: "Owners" },
  // { key: "location", Icon: LocationOnOutlinedIcon, label: "Location" },
];

type VehicleInfoProps = {
  info: VehicleInfoValues;
};

export function VehicleInfo({ info }: VehicleInfoProps) {
  const items = VEHICLE_INFO_CONFIG
    .map((config) => ({
      ...config,
      value: info[config.key],
    }))
    .filter((item) => Boolean(item.value)) as Array<{
    key: keyof VehicleInfoValues;
    Icon: ElementType;
    label: string;
    value: string;
  }>;

  if (!items.length) return null;

  return (
    <Box
      component="section"
      sx={{
        display: "grid",
        gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
        gap: 1,
        mt: 1.25,
        mb: 0.5,
      }}
    >
      {items.map(({ key, Icon, value, label }) => (
        <Tooltip key={key} title={value} arrow>
          <Box
            sx={{
              display: "flex",
              alignItems: "center",
              gap: 0.75,
              minWidth: 0,
            }}
          >
            <Box
              component="span"
              aria-label={label}
              sx={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 18,
                height: 18,
                color: T.color.textMuted,
                flexShrink: 0,
                "& > svg": {
                  width: 18,
                  height: 18,
                },
              }}
            >
              <Icon />
            </Box>

            <Typography
              sx={{
                fontSize: 13,
                fontWeight: 700,
                color: T.color.textPrimary,
                lineHeight: 1.3,
                minWidth: 0,
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
              }}
              title={value}
            >
              {value}
            </Typography>
          </Box>
        </Tooltip>
      ))}
    </Box>
  );
}
