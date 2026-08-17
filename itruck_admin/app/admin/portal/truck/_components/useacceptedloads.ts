import { getLoadAll, Load } from "@/model/services/load";
import { useEffect, useState } from "react";

interface LoadBitRecord {
  _id: string;
  loadId: string;
  bit: number;
  bitReason?: string;
  status: "accept" | "reject" | "pending";
  truckId: string;
  userId: string;
  userName: string;
  userEmail: string;
  id: string;
  createdAt: string;
  updatedAt: string;
  load?: Load;
}

export interface AcceptedLoadData {
  bitRecord: LoadBitRecord;
  load: Load;
  formattedCreatedAt: string;
  formattedUpdatedAt: string;
  formattedPickupTime?: string;
}

/**
 * Utility function to format date to "DD-MM-YYYY"
 */
export const formatDate = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  } catch {
    return dateString;
  }
};

/**
 * Utility function to format date with time to "DD-MM-YYYY HH:MM"
 */
export const formatDateTime = (dateString: string): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, "0");
    const minutes = String(date.getMinutes()).padStart(2, "0");
    return `${day}-${month}-${year} ${hours}:${minutes}`;
  } catch {
    return dateString;
  }
};

/**
 * Hook to fetch and filter accepted loads
 * Returns an array of accepted loads with formatted dates
 */
export const useAcceptedLoads = () => {
  const [acceptedLoads, setAcceptedLoads] = useState<AcceptedLoadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchAcceptedLoads();
  }, []);

  const fetchAcceptedLoads = async () => {
    try {
      setLoading(true);
      const loads = await getLoadAll();

      const filtered: AcceptedLoadData[] = [];

      loads.forEach((load) => {
        if (load.bitRecords && Array.isArray(load.bitRecords)) {
          load.bitRecords.forEach((bitRecord: any) => {
            if (bitRecord.status === "accept") {
              filtered.push({
                bitRecord,
                load,
                formattedCreatedAt: formatDate(bitRecord.createdAt),
                formattedUpdatedAt: formatDateTime(bitRecord.updatedAt),
                formattedPickupTime: load.pickupTime ? formatDateTime(load.pickupTime) : undefined,
              });
            }
          });
        }
      });

      setAcceptedLoads(filtered);
      setError(null);
    } catch (err) {
      console.error("Error fetching accepted loads:", err);
      setError("Failed to load accepted loads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchAcceptedLoads();
  };

  return { acceptedLoads, loading, error, refetch };
};

/**
 * Hook to get accepted loads for a specific truck
 */
export const useAcceptedLoadsByTruck = (truck?: any) => {
  const [acceptedLoads, setAcceptedLoads] = useState<LoadBitRecord[]>([]);

  useEffect(() => {
    if (truck?.loadbitRecords && Array.isArray(truck.loadbitRecords)) {
      const accepted = truck.loadbitRecords
        .filter((record: any) => record.status === "accept")
        .map((record: any) => ({
          ...record,
          formattedCreatedAt: formatDate(record.createdAt),
          formattedUpdatedAt: formatDateTime(record.updatedAt),
          formattedPickupTime: record.load?.pickupTime ? formatDateTime(record.load.pickupTime) : undefined,
        }));
      setAcceptedLoads(accepted);
    }
  }, [truck]);

  return acceptedLoads;
};

/**
 * Hook to get accepted loads for a specific user/driver
 */
export const useAcceptedLoadsByUser = (userId?: string) => {
  const [acceptedLoads, setAcceptedLoads] = useState<AcceptedLoadData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!userId) {
      setAcceptedLoads([]);
      setLoading(false);
      return;
    }

    fetchAcceptedLoadsByUser();
  }, [userId]);

  const fetchAcceptedLoadsByUser = async () => {
    if (!userId) return;

    try {
      setLoading(true);
      const loads = await getLoadAll({ userId });

      const filtered: AcceptedLoadData[] = [];

      loads.forEach((load) => {
        if (load.bitRecords && Array.isArray(load.bitRecords)) {
          load.bitRecords.forEach((bitRecord: any) => {
            if (bitRecord.status === "accept" && bitRecord.userId === userId) {
              filtered.push({
                bitRecord,
                load,
                formattedCreatedAt: formatDate(bitRecord.createdAt),
                formattedUpdatedAt: formatDateTime(bitRecord.updatedAt),
                formattedPickupTime: load.pickupTime ? formatDateTime(load.pickupTime) : undefined,
              });
            }
          });
        }
      });

      setAcceptedLoads(filtered);
      setError(null);
    } catch (err) {
      console.error("Error fetching accepted loads for user:", err);
      setError("Failed to load accepted loads. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchAcceptedLoadsByUser();
  };

  return { acceptedLoads, loading, error, refetch };
};