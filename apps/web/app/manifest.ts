import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Votero",
    short_name: "Votero",
    description: "QR-code group voting",
    start_url: "/",
    display: "standalone",
    background_color: "#FFF9F6",
    theme_color: "#D41F44",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
}
