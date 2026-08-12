"use client";

import { useEffect } from "react";

export function usePageTitle(title: string) {
  useEffect(() => {
    document.title = `${title} | ClinOps EMR`;
    return () => {
      document.title = "ClinOps EMR";
    };
  }, [title]);
}