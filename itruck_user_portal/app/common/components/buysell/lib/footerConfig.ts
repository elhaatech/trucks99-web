import type { LucideIcon } from "lucide-react";
import {
  Truck,
  PackageSearch,
  ShoppingBag,
  Users,
  Star,
  ShieldCheck,
  Wallet,
  Percent,
  Headphones,
} from "lucide-react";
import { userProductRoutes } from "@/lib/userProductRoutes";

export interface FooterLink {
  label: string;
  href: string;
}

export interface FooterLinkGroup {
  title: string;
  links: FooterLink[];
}

export interface FooterStat {
  icon: LucideIcon;
  value: string;
  label: string;
}

export interface TrustBadge {
  icon: LucideIcon;
  label: string;
}

export const FOOTER_LINK_GROUPS: FooterLinkGroup[] = [
  {
    title: "Marketplace",
    links: [
      { label: "Buy Vehicles", href: userProductRoutes.dashboard() },
      { label: "Sell Vehicles", href: userProductRoutes.dashboard() },
      // { label: "Trucks", href: userProductRoutes.dashboard() },
      // { label: "Loads", href: userProductRoutes.dashboard() },
      { label: "Featured Vehicles", href: userProductRoutes.dashboard() },
      // { label: "Categories", href: userProductRoutes.dashboard() },
      // { label: "Auctions", href: userProductRoutes.dashboard() },
      // { label: "EMI Calculator", href: userProductRoutes.emi() },
    ],
  },
  // {
  //   title: "Company",
  //   links: [
  //     // { label: "About Us", href: userProductRoutes.dashboard() },
  //     { label: "Contact Us", href: userProductRoutes.contact() },
  //     // { label: "Careers", href: userProductRoutes.dashboard() },
  //     // { label: "Blog", href: userProductRoutes.dashboard() },
  //     // { label: "News", href: userProductRoutes.dashboard() },
  //     // { label: "Become a Dealer", href: userProductRoutes.dashboard() },
  //     // { label: "Advertise With Us", href: userProductRoutes.contact() },
  //   ],
  // },
  {
    title: "Support",
    links: [
      // { label: "Help Center", href: userProductRoutes.contact() },
      // { label: "FAQ", href: userProductRoutes.emi() },
      { label: "Chat Support", href: userProductRoutes.contact() },
      { label: "Privacy Policy", href: userProductRoutes.legal("privacy") },
      { label: "Terms & Conditions", href: userProductRoutes.legal("terms") },
      // { label: "Refund Policy", href: userProductRoutes.legal("refund") },
      // { label: "Shipping Policy", href: userProductRoutes.legal("shipping") },
    ],
  },
];

export const FOOTER_STATS: FooterStat[] = [
  // { icon: Truck, value: "12,400+", label: "Active Trucks" },
  // { icon: PackageSearch, value: "8,900+", label: "Active Loads" },
  { icon: ShoppingBag, value: "21,000+", label: "Buy & Sell Listings" },
  { icon: Users, value: "65,000+", label: "Registered Users" },
  { icon: Star, value: "3,200+", label: "Premium Members" },
];

export const TRUST_BADGES: TrustBadge[] = [
  { icon: ShieldCheck, label: "Verified Listings" },
  { icon: Wallet, label: "Secure Payments" },
  { icon: Percent, label: "EMI Available" },
  { icon: Users, label: "Trusted Sellers" },
  { icon: Headphones, label: "24×7 Customer Support" },
];

export const PAYMENT_METHODS = ["Razorpay", "UPI", "VISA", "Mastercard", "RuPay"] as const;

export const BOTTOM_LINKS: FooterLink[] = [
  { label: "Privacy Policy", href: userProductRoutes.legal("privacy") },
  { label: "Terms of Service", href: userProductRoutes.legal("terms") },
  // { label: "Cookies", href: userProductRoutes.legal("cookies") },
  { label: "Sitemap", href: userProductRoutes.dashboard() },
];
