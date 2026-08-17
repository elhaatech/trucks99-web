"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";
import BuySellForm from "@/app/admin/portal/buysell/_components/buysellcolumnsForm/buysellForm";
import { PageContainer, Spinner, ResultPage, ResultActionButton } from "@/components/ui";
import { userProductRoutes } from "@/lib/userProductRoutes";
import { canEditBuySellProduct } from "@/lib/buySellPermissions";
import { BuySellProduct, getBuySellProduct } from "@/model/services/buysellapi";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";

export default function UserProductEditPage() {
  const params = useParams();
  const router = useRouter();
  const id = typeof params?.id === "string" ? params.id : "";

  const [product, setProduct] = useState<BuySellProduct | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loadingProduct, setLoadingProduct] = useState(true);
  const [loadingUser, setLoadingUser] = useState(true);
  const [productError, setProductError] = useState("");
  const [userError, setUserError] = useState("");

  useEffect(() => {
    if (!id) {
      router.replace(userProductRoutes.list());
      return;
    }
    setLoadingProduct(true);
    getBuySellProduct(id)
      .then(setProduct)
      .catch((err) =>
        setProductError(err instanceof Error ? err.message : "Failed to load listing"),
      )
      .finally(() => setLoadingProduct(false));
  }, [id, router]);

  useEffect(() => {
    setLoadingUser(true);
    getCurrentUser()
      .then(setCurrentUser)
      .catch((err) =>
        setUserError(err instanceof Error ? err.message : "Please log in again."),
      )
      .finally(() => setLoadingUser(false));
  }, []);

  if (!id) return null;

  if (loadingProduct || loadingUser) {
    return (
      <PageContainer maxWidth="100%">
        <Spinner label="Loading listing…" />
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer maxWidth="100%">
        <ResultPage
          variant="error"
          icon={<SearchOffOutlinedIcon sx={{ fontSize: 40 }} />}
          title="Listing not found"
          subtitle={productError || "This listing may have been removed."}
          actions={
            <ResultActionButton onClick={() => router.push(userProductRoutes.list())}>
              Back to list
            </ResultActionButton>
          }
        />
      </PageContainer>
    );
  }

  if (userError || !currentUser) {
    return (
      <PageContainer maxWidth="100%">
        <ResultPage
          variant="error"
          icon={<ErrorOutlineIcon sx={{ fontSize: 40 }} />}
          title="Authentication required"
          subtitle={userError || "Please log in to edit this listing."}
          actions={
            <ResultActionButton onClick={() => router.push("/")}>Login</ResultActionButton>
          }
        />
      </PageContainer>
    );
  }

  if (!canEditBuySellProduct(product, currentUser)) {
    return (
      <PageContainer maxWidth="100%">
        <ResultPage
          variant="warning"
          icon={<LockOutlinedIcon sx={{ fontSize: 40 }} />}
          title="Permission denied"
          subtitle="Only the listing owner can edit this product."
          actions={
            <>
              <ResultActionButton onClick={() => router.push(userProductRoutes.view(id))}>
                View listing
              </ResultActionButton>
              <Button variant="outlined" onClick={() => router.push(userProductRoutes.list())}>
                Back to list
              </Button>
            </>
          }
        />
      </PageContainer>
    );
  }

  return (
    <Box>
      <BuySellForm
        product={product}
        mode="edit"
        onSuccess={() => router.push(userProductRoutes.view(id))}
      />
    </Box>
  );
}
