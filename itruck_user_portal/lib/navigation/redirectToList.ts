import { redirect } from "next/navigation";

/**
 * Server-side redirect for module index routes.
 * Avoids client-side useEffect + router.replace that pollutes browser history.
 */
export function redirectToList(listPath: string): never {
  redirect(listPath);
}
