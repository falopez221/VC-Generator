import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Header } from "@/src/components/layout/Header";
import { Footer } from "@/src/components/layout/Footer";
import { APPLICATION_CATALOG } from "@/src/applications/catalog";
import { ApplicationDetail } from "@/src/applications/components/ApplicationDetail";
import { SITE_URL } from "@/src/config/site";

export function generateStaticParams() { return APPLICATION_CATALOG.map((application) => ({ slug: application.slug })); }

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const application = APPLICATION_CATALOG.find((item) => item.slug === slug);
  if (!application) return {};
  return { title: `${application.title.en} | Venture Governance`, description: application.description.en, alternates: { canonical: `${SITE_URL}/applications/${application.slug}` } };
}

export default async function ApplicationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const application = APPLICATION_CATALOG.find((item) => item.slug === slug);
  if (!application) notFound();
  return <><a className="skip-link" href="#application-detail">Skip to application</a><Header /><ApplicationDetail application={application} /><Footer /></>;
}
