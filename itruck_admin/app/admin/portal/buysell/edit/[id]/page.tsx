"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Button from "@mui/material/Button";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import LockOutlinedIcon from "@mui/icons-material/LockOutlined";
import SearchOffOutlinedIcon from "@mui/icons-material/SearchOffOutlined";

import { routes } from "@/lib/routes";
import { canEditBuySellProduct } from "@/lib/buySellPermissions";
import { BuySellProduct, getBuySellProduct } from "@/model/services/buysellapi";
import { getCurrentUser } from "@/model/services/user";
import type { User } from "@/model/services/user";
import BuySellForm from "../../_components/buysellcolumnsForm/buysellForm";
import { BackButton } from "@/components/common";
import { PageContainer, Spinner, ResultPage, ResultActionButton } from "@/components/ui";

export default function BuySellEditPage() {
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
      router.replace(routes.buysell.list());
      return;
    }

    setLoadingProduct(true);
    setProductError("");

    getBuySellProduct(id)
      .then((loadedProduct) => setProduct(loadedProduct))
      .catch((err) =>
        setProductError(
          err instanceof Error ? err.message : "Failed to load listing",
        ),
      )
      .finally(() => setLoadingProduct(false));
  }, [id, router]);

  useEffect(() => {
    setLoadingUser(true);
    setUserError("");

    getCurrentUser()
      .then((user) => setCurrentUser(user))
      .catch((err) =>
        setUserError(
          err instanceof Error
            ? err.message
            : "Could not verify your account. Please log in again.",
        ),
      )
      .finally(() => setLoadingUser(false));
  }, []);

  if (!id) return null;

  const loading = loadingProduct || loadingUser;

  if (loading) {
    return (
      <PageContainer>
        <Spinner label="Loading listing…" />
      </PageContainer>
    );
  }

  if (!product) {
    return (
      <PageContainer maxWidth={720}>
        <BackButton fallback={routes.buysell.list()} />
        <ResultPage
          variant="error"
          icon={<SearchOffOutlinedIcon sx={{ fontSize: 40 }} />}
          title="Listing not found"
          subtitle={productError || "This listing may have been removed or the link is invalid."}
          actions={
            <ResultActionButton onClick={() => router.push(routes.buysell.list())}>
              Back to list
            </ResultActionButton>
          }
        />
      </PageContainer>
    );
  }

  if (userError || !currentUser) {
    return (
      <PageContainer maxWidth={720}>
        <BackButton fallback={routes.buysell.list()} />
        <ResultPage
          variant="error"
          icon={<ErrorOutlineIcon sx={{ fontSize: 40 }} />}
          title="Authentication required"
          subtitle={userError || "Please log in again to edit this listing."}
          actions={
            <ResultActionButton onClick={() => router.push(routes.buysell.list())}>
              Back to list
            </ResultActionButton>
          }
        />
      </PageContainer>
    );
  }

  if (!canEditBuySellProduct(product, currentUser)) {
    return (
      <PageContainer maxWidth={720}>
        <BackButton fallback={routes.buysell.list()} />
        <ResultPage
          variant="warning"
          icon={<LockOutlinedIcon sx={{ fontSize: 40 }} />}
          title="Permission denied"
          subtitle="Only the listing owner or an admin can edit this product."
          actions={
            <>
              <ResultActionButton onClick={() => router.push(routes.buysell.view(id))}>
                View listing
              </ResultActionButton>
              <Button variant="outlined" onClick={() => router.push(routes.buysell.list())}>
                Back to list
              </Button>
            </>
          }
        />
      </PageContainer>
    );
  }

  return <BuySellForm product={product} mode="edit" />;
}
