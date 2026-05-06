import { Helmet } from "react-helmet-async";

const SITE_URL = "https://piotrtarach.dev";
const SITE_NAME = "PIOTR_TARACH | SIGNAL_NOISE";
const DEFAULT_DESCRIPTION =
  "Personal technical blog and portfolio by Piotr Tarach";

interface SeoProps {
  title?: string;
  description?: string;
  path?: string;
  type?: "website" | "article";
  publishedTime?: string;
  tags?: string[];
}

export default function Seo({
  title,
  description = DEFAULT_DESCRIPTION,
  path = "/",
  type = "website",
  publishedTime,
  tags,
}: SeoProps) {
  const fullTitle = title ? `${title} | ${SITE_NAME}` : SITE_NAME;
  const url = `${SITE_URL}${path}`;

  return (
    <Helmet>
      <title>{fullTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={url} />
      <meta property="og:title" content={fullTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:url" content={url} />
      <meta property="og:type" content={type} />
      {publishedTime && (
        <meta property="article:published_time" content={publishedTime} />
      )}
      {tags?.map((tag) => (
        <meta key={tag} property="article:tag" content={tag} />
      ))}
    </Helmet>
  );
}
