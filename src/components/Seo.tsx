import { useEffect } from "react";
import { applySeo, type SeoParams } from "../lib/seo";

export type SeoProps = SeoParams;

export function Seo({ title, description, image, path, noIndex }: SeoProps) {
  useEffect(() => {
    applySeo({ title, description, image, path, noIndex });
  }, [title, description, image, path, noIndex]);

  return null;
}
